
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Loader2, Mic, MonitorPlay, Wand2, X, Camera, Image as ImageIcon, Sparkles, ScanLine, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeChartImage } from '@/ai/flows/analyze-chart-image';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import { scanScreenForPatterns } from '@/app/actions';
import { ChatMessages } from '@/components/chat/chat-messages';
import type { Message } from '@/lib/types';
import { nanoid } from 'nanoid';
import Link from 'next/link';

export default function SharePage() {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Message[]>([]);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanInterval, setScanInterval] = useState(30); // in seconds
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scannerStatus, setScannerStatus] = useState('Idle');


  const [chart1, setChart1] = useState<string | null>(null);
  const [chart2, setChart2] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const scannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const captureFrame = useCallback((setter?: (dataUri: string) => void) => {
    if (!videoRef.current) {
        toast({ variant: 'destructive', title: 'Video feed not found.' });
        return null;
    }
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg');
    if (setter) {
        setter(dataUri);
    }
    return dataUri;
  }, [toast]);

  const analyzeCharts = useCallback(async () => {
    if (!chart1) {
      toast({
        variant: 'destructive',
        title: 'Please capture at least one chart.',
      });
      return;
    }
    
    setIsLoading(true);
    if (isListening) {
        recognitionRef.current?.stop();
    }

    try {
      const imagePreviews = [chart1];
      if (chart2) imagePreviews.push(chart2);
      
      const userMessageContent = question.trim() || 'Analyze the captured chart(s).';
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: userMessageContent,
        imagePreviews: imagePreviews,
      };
      setAnalysisResult((prev) => [...prev, userMessage]);

      const analysisQuestion = question.trim() || (chart2 ? 'Analyze these two charts. Perform a multi-timeframe or correlation analysis.' : 'Analyze this chart and provide a full trade recommendation.');
      const result = await analyzeChartImage({
        chartImageUri1: chart1,
        chartImageUri2: chart2 || undefined,
        question: analysisQuestion,
      });

      let audioDataUri: string | undefined = undefined;
      if (isSoundEnabled && result.analysis) {
        try {
          const ttsResult = await textToSpeech({ text: result.analysis });
          audioDataUri = ttsResult.audioDataUri;
        } catch (ttsError) {
          console.error("TTS conversion failed:", ttsError);
          toast({
            variant: 'destructive',
            title: 'Audio Generation Failed',
            description: 'Could not generate audio for the response.',
          });
        }
      }

      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: result.analysis,
        recommendation: result.recommendation,
        alternativeScenario: result.alternativeScenario,
        audioDataUri,
        isSoundEnabled,
      };
      setAnalysisResult((prev) => [...prev, assistantMessage]);
      setQuestion('');
      setChart1(null);
      setChart2(null);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: error,
      });
      const errorMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: `Sorry, I couldn't analyze the chart(s). Error: ${error}`,
      };
      setAnalysisResult((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [chart1, chart2, question, isListening, isSoundEnabled, toast]);


  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isHandsFreeMode && !isLoading) {
            recognition.start();
        }
      };
      
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
            toast({ title: "Voice Recognition Error", description: event.error, variant: 'destructive' });
        }
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        const command = finalTranscript.toLowerCase().trim();
        if (!isHandsFreeMode || !command) return;


        if (command.includes("capture chart one") || command.includes("capture chart 1")) {
          toast({ title: "Voice Command", description: "Capturing chart one..." });
          captureFrame(setChart1);
          recognition.stop(); 
        } else if (command.includes("capture chart two") || command.includes("capture chart 2")) {
          toast({ title: "Voice Command", description: "Capturing chart two..." });
          captureFrame(setChart2);
          recognition.stop();
        } else if (command.includes("analyze now")) {
           if (chart1) {
            toast({ title: "Voice Command", description: "Starting analysis..." });
            analyzeCharts(); // This will stop recognition via isLoading flag
           } else {
             toast({ title: "Voice Command Failed", description: "Please capture chart one first.", variant: 'destructive' });
             recognition.stop();
           }
        } else if (finalTranscript) {
          setQuestion(q => q + finalTranscript);
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [toast, isHandsFreeMode, chart1, isLoading, analyzeCharts, captureFrame]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleHandsFreeToggle = (checked: boolean) => {
    setIsHandsFreeMode(checked);
    if (checked) {
      if (!isListening) {
        recognitionRef.current?.start();
      }
      toast({
        title: "Hands-Free Mode Enabled",
        description: "Say 'capture chart one', 'capture chart two', or 'analyze now'.",
      });
    } else {
      if (isListening) {
        recognitionRef.current?.stop();
      }
      toast({ title: "Hands-Free Mode Disabled" });
    }
  };

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setStream(displayStream);
      setIsSharing(true);
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare(displayStream);
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast({
        variant: 'destructive',
        title: 'Screen Share Failed',
        description: 'Could not start screen sharing. Please check browser permissions.',
      });
    } finally {
        setPermissionDialogOpen(false);
    }
  };

  const stopScreenShare = (streamToStop?: MediaStream) => {
    (streamToStop || stream)?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsSharing(false);
    if (isHandsFreeMode) handleHandsFreeToggle(false);
    if (isScanning) stopScanning();
  };
  

  // Scanner Functions
  const runScan = useCallback(async () => {
      setScannerStatus('Scanning...');
      const frame = captureFrame();
      if (!frame) {
          setScannerStatus('Error: Could not capture screen.');
          return;
      }

      const result = await scanScreenForPatterns(frame);
      setLastScanTime(new Date());

      if (result.patternFound) {
          toast({
              title: `Pattern Found: ${result.patternName || 'Unnamed'}`,
              description: result.description,
              duration: 10000,
          });
          setScannerStatus(`Pattern Found: ${result.patternName}`);
          stopScanning();
      } else {
          setScannerStatus('No significant patterns found. Waiting for next scan...');
      }
  }, [captureFrame, toast]);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setScannerStatus('Starting...');
    toast({ title: "Scanner Activated", description: `Will scan every ${scanInterval} seconds.`});
    
    // Run first scan immediately
    runScan();

    scannerIntervalRef.current = setInterval(runScan, scanInterval * 1000);
  }, [scanInterval, toast, runScan]);


  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setScannerStatus('Idle');
    if (scannerIntervalRef.current) {
        clearInterval(scannerIntervalRef.current);
        scannerIntervalRef.current = null;
    }
    toast({ title: "Scanner Deactivated" });
  }, [toast]);

  useEffect(() => {
    return () => {
        if (scannerIntervalRef.current) {
            clearInterval(scannerIntervalRef.current);
        }
    }
  }, []);

  const ChartCaptureSlot = ({ chart, onCapture, onClear, number }: { chart: string | null; onCapture: () => void; onClear: () => void; number: number }) => (
    <div className="relative border-2 border-dashed rounded-lg p-2 min-h-[150px] flex flex-col items-center justify-center space-y-2">
      {!chart ? (
        <>
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chart {number}</p>
          <Button size="sm" onClick={onCapture} disabled={!isSharing || isLoading} variant="secondary">
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
        </>
      ) : (
        <>
          <Image src={chart} alt={`Chart ${number} preview`} width={200} height={112} className="rounded-md object-contain" data-ai-hint="chart graph"/>
          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onClear} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="flex h-screen bg-background">
        <div className="flex flex-1 flex-col">
          <header className="flex items-center p-4 border-b">
            <Button variant="ghost" size="sm" asChild>
                  <Link href="/">
                      <X className="h-4 w-4 mr-2" />
                      <span>Close</span>
                  </Link>
            </Button>
            <h1 className="text-xl font-semibold ml-4">Live Screen Analysis</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Screen Control</CardTitle>
                    <CardDescription>Share your screen to begin capturing charts for analysis or scanning.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isSharing ? (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                        <MonitorPlay className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Share your screen to start analysis.</p>
                        <Button onClick={() => setPermissionDialogOpen(true)} className="mt-4">
                          Start Sharing Screen
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-md overflow-hidden border">
                          <video ref={videoRef} className="w-full h-full object-contain bg-black" autoPlay muted />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="hands-free-mode"
                                    checked={isHandsFreeMode}
                                    onCheckedChange={handleHandsFreeToggle}
                                    disabled={!isSharing || isLoading}
                                />
                                <Label htmlFor="hands-free-mode" className="flex items-center gap-2">
                                    <Sparkles className={`h-4 w-4 transition-colors ${isHandsFreeMode ? 'text-accent-foreground' : 'text-muted-foreground'}`}/>
                                    Hands-Free Mode
                                </Label>
                            </div>
                            <Button onClick={() => stopScreenShare()} variant="destructive">
                                Stop Sharing
                            </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isSharing && (
                  <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Automated Pattern Scanner</CardTitle>
                            <CardDescription>Proactively scan your screen for high-probability trading patterns.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor='scan-interval'>Scan Frequency: {scanInterval} seconds</Label>
                                <Slider 
                                    id="scan-interval"
                                    min={15}
                                    max={60}
                                    step={5}
                                    value={[scanInterval]}
                                    onValueChange={(value) => setScanInterval(value[0])}
                                    disabled={isScanning}
                                />
                           </div>
                           <Button onClick={isScanning ? stopScanning : startScanning} className="w-full" variant={isScanning ? "secondary" : "default"}>
                                {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                                {isScanning ? 'Stop Scanning' : 'Start Scanning'}
                           </Button>
                           <div className="text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border flex items-center gap-2">
                                <AlertCircle className="h-4 w-4"/>
                                <div>
                                    <span className='font-semibold'>Status:</span> {scannerStatus} <br/>
                                    <span className='font-semibold'>Last Scan:</span> {lastScanTime ? lastScanTime.toLocaleTimeString() : 'N/A'}
                                </div>
                           </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Analysis</CardTitle>
                             <CardDescription>Capture up to two charts, ask a question, and analyze.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ChartCaptureSlot chart={chart1} onCapture={() => captureFrame(setChart1)} onClear={() => setChart1(null)} number={1} />
                                <ChartCaptureSlot chart={chart2} onCapture={() => captureFrame(setChart2)} onClear={() => setChart2(null)} number={2} />
                            </div>

                            <div className="flex items-start gap-2">
                                 <div className="relative flex-1">
                                    <Textarea
                                    placeholder="Ask a question about the captured chart(s)..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    className="resize-none pr-10"
                                    rows={2}
                                    disabled={isLoading || isHandsFreeMode}
                                    />
                                    <Button
                                    type="button"
                                    size="icon"
                                    variant={isListening ? 'destructive' : 'ghost'}
                                    onClick={toggleListening}
                                    disabled={!recognitionRef.current || isLoading || isHandsFreeMode}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    >
                                    <Mic className="h-4 w-4" />
                                    <span className="sr-only">Ask by voice</span>
                                    </Button>
                                </div>
                                <Button
                                    onClick={analyzeCharts}
                                    disabled={isLoading || !chart1}
                                    className="h-auto"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Wand2 className="mr-2 h-4 w-4" />
                                    )}
                                    Analyze
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                  </>
                )}
              </div>
              <div className="flex flex-col">
                  {analysisResult.length > 0 ? (
                    <div className="flex-1 overflow-y-auto h-[75vh]">
                      <ChatMessages 
                        messages={analysisResult} 
                        isSoundEnabled={isSoundEnabled}
                        onSoundToggle={setIsSoundEnabled}
                      />
                    </div>
                  ) : (
                    <Card className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                          <Wand2 className="mx-auto h-12 w-12" />
                          <h3 className="mt-4 text-lg font-semibold">Analysis will appear here</h3>
                          <p className="mt-2 text-sm">
                            Use the scanner for automatic alerts or capture charts manually to begin.
                          </p>
                      </div>
                    </Card>
                  )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <AlertDialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share Your Screen for Analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              To analyze a chart, ChartWiz needs permission to view your screen.
              Your screen is not recorded. Screenshots are captured only when you use the capture/scan features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startScreenShare}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
