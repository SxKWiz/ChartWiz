
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
import { Loader2, Mic, MonitorPlay, Wand2, X, Camera, Image as ImageIcon, Sparkles, ScanLine, AlertCircle, Target, Brain, Zap, TrendingUp, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeChartImage } from '@/ai/flows/analyze-chart-image';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import { scanScreenForPatterns, detectTradeOpportunity, monitorTradeProgress, generateChartDrawingAnalysis } from '@/app/actions';
import { ChatMessages } from '@/components/chat/chat-messages';
import type { Message } from '@/lib/types';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { InteractiveChartOverlay, type AIDrawingData, type ChartPoint } from '@/components/charts/interactive-chart-overlay';
import { convertAIAnalysisToDrawingData, generateAnalysisSummary } from '@/lib/chart-drawing-utils';
import { ChartDemo } from '@/components/charts/chart-demo';

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

  // AI Trade Detector state
  const [isTradeDetecting, setIsTradeDetecting] = useState(false);
  const [tradeDetectionInterval, setTradeDetectionInterval] = useState(15); // in seconds
  const [lastTradeDetectionTime, setLastTradeDetectionTime] = useState<Date | null>(null);
  const [tradeDetectorStatus, setTradeDetectorStatus] = useState('Idle');
  const [previousAnalysis, setPreviousAnalysis] = useState<string>('');
  const [tradeOpportunities, setTradeOpportunities] = useState<any[]>([]);
  const [scanMode, setScanMode] = useState<'light' | 'detailed'>('light');
  
  // Active Trade Monitoring state
  const [isMonitoringActiveTrade, setIsMonitoringActiveTrade] = useState(false);
  const [activeTrade, setActiveTrade] = useState<any>(null);
  const [tradeUpdateInterval, setTradeUpdateInterval] = useState(10); // in seconds
  const [lastTradeUpdateTime, setLastTradeUpdateTime] = useState<Date | null>(null);
  const [tradeMonitoringStatus, setTradeMonitoringStatus] = useState('Idle');
  const [tradeUpdates, setTradeUpdates] = useState<any[]>([]);


  const [chart1, setChart1] = useState<string | null>(null);
  const [chart2, setChart2] = useState<string | null>(null);
  
  // Interactive chart drawing state
  const [aiDrawingData, setAiDrawingData] = useState<AIDrawingData | undefined>(undefined);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const scannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradeDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradeMonitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Handle interactive chart analysis
  const handleChartAnalysis = useCallback(async (clickPoint: ChartPoint, chartImageUri: string): Promise<AIDrawingData> => {
    try {
      // For this example, we'll use a reasonable image size. In a real app, you'd get this from the actual image
      const imageWidth = 800;
      const imageHeight = 600;
      
      const analysisResult = await generateChartDrawingAnalysis(
        chartImageUri,
        clickPoint,
        imageWidth,
        imageHeight,
        'comprehensive'
      );
      
      const drawingData = convertAIAnalysisToDrawingData(analysisResult);
      
      // Create a message for the chat showing the analysis
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: `Interactive chart analysis at coordinates (${Math.round(clickPoint.x)}, ${Math.round(clickPoint.y)})`,
        imagePreviews: [chartImageUri],
      };
      
      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: generateAnalysisSummary(analysisResult, drawingData),
      };
      
      setAnalysisResult(prev => [...prev, userMessage, assistantMessage]);
      
      return drawingData;
    } catch (error) {
      console.error('Interactive chart analysis failed:', error);
      throw error;
    }
  }, []);

  const handleChartClick = useCallback(async (clickPoint: ChartPoint) => {
    const chartToAnalyze = chart1 || (chart2 ? chart2 : null);
    if (!chartToAnalyze) return;
    
    try {
      const drawingData = await handleChartAnalysis(clickPoint, chartToAnalyze);
      setAiDrawingData(drawingData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the chart at the clicked location.',
      });
    }
  }, [chart1, chart2, handleChartAnalysis, toast]);

  // Clear drawings when charts change
  useEffect(() => {
    setAiDrawingData(undefined);
  }, [chart1, chart2]);


  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      
      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
            toast({ title: "Voice Recognition Error", description: event.error, variant: 'destructive' });
        }
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
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
    if (isTradeDetecting) stopTradeDetection();
    if (isMonitoringActiveTrade) stopTradeMonitoring();
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

  // Trade Monitoring and Detection Callbacks (order matters!)
  const stopTradeDetection = useCallback(() => {
    setIsTradeDetecting(false);
    setTradeDetectorStatus('Idle');
    if (tradeDetectionIntervalRef.current) {
        clearInterval(tradeDetectionIntervalRef.current);
        tradeDetectionIntervalRef.current = null;
    }
    toast({ title: "AI Trade Detector Deactivated" });
  }, [toast]);

  const runTradeMonitoring = useCallback(async () => {
    if (!activeTrade) return;
    
    setTradeMonitoringStatus('Analyzing trade progress...');
    const frame = captureFrame();
    if (!frame) {
        setTradeMonitoringStatus('Error: Could not capture screen.');
        return;
    }

    try {
        const result = await monitorTradeProgress(frame, activeTrade, tradeUpdates.length > 0 ? tradeUpdates[tradeUpdates.length - 1].marketAnalysis : undefined);
        setLastTradeUpdateTime(new Date());

        const update = {
            ...result.tradeUpdate,
            timestamp: new Date(),
            screenshot: frame,
            marketAnalysis: result.marketAnalysis,
        };
        
        setTradeUpdates(prev => [...prev, update]);
        
        // Create a message for the chat
        const userMessage: Message = {
            id: nanoid(),
            role: 'user',
            content: `Trade monitoring update: ${result.tradeUpdate.recommendation}`,
            imagePreviews: [frame],
        };
        
        const assistantMessage: Message = {
            id: nanoid(),
            role: 'assistant',
            content: `📊 **TRADE UPDATE** 📊

**Current Price:** ${result.tradeUpdate.currentPrice}
**Price Change:** ${result.tradeUpdate.priceChange}
**P&L:** ${result.tradeUpdate.profitLoss}
**Risk Level:** ${result.tradeUpdate.riskLevel.toUpperCase()}
**Position Status:** ${result.tradeUpdate.positionStatus.toUpperCase()}
**Stop Loss Distance:** ${result.tradeUpdate.stopLossDistance}

**Take Profit Progress:**
${result.tradeUpdate.takeProfitProgress.map(tp => `- ${tp.target}: ${tp.progress} (${tp.distance} away)`).join('\n')}

**Recommendation:** ${result.tradeUpdate.recommendation.toUpperCase().replace('_', ' ')}
**Urgency:** ${result.tradeUpdate.urgency.toUpperCase()}

**Reasoning:** ${result.tradeUpdate.reasoning}

**Market Analysis:** ${result.marketAnalysis}

**Key Levels:** ${result.tradeUpdate.keyLevels?.join(', ') || 'N/A'}
**Volume Analysis:** ${result.tradeUpdate.volumeAnalysis || 'N/A'}`,
        };
        
        setAnalysisResult(prev => [...prev, userMessage, assistantMessage]);
        
        // Show toast for urgent updates
        if (result.tradeUpdate.urgency === 'immediate' || result.tradeUpdate.urgency === 'high') {
            toast({
                title: `🚨 Trade Update: ${result.tradeUpdate.recommendation.toUpperCase().replace('_', ' ')}`,
                description: `${result.tradeUpdate.reasoning}`,
                duration: 10000,
            });
        }
        
        setTradeMonitoringStatus(`Last Update: ${new Date().toLocaleTimeString()}`);
        
        // Update monitoring interval based on AI recommendation
        if (result.nextUpdateIn !== tradeUpdateInterval) {
            setTradeUpdateInterval(result.nextUpdateIn);
        }
        
    } catch (error) {
        console.error('Trade monitoring failed:', error);
        setTradeMonitoringStatus('Error: Trade monitoring failed.');
        toast({
            title: 'Trade Monitoring Error',
            description: 'Failed to analyze trade progress.',
            variant: 'destructive',
        });
    }
  }, [captureFrame, activeTrade, tradeUpdates, toast, tradeUpdateInterval]);

  const startTradeMonitoring = useCallback(() => {
    if (!activeTrade) return;
    
    setIsMonitoringActiveTrade(true);
    setTradeMonitoringStatus('Starting trade monitoring...');
    toast({ title: "Trade Monitoring Activated", description: `Monitoring trade every ${tradeUpdateInterval} seconds.`});
    
    // Run first monitoring immediately
    runTradeMonitoring();

    tradeMonitoringIntervalRef.current = setInterval(runTradeMonitoring, tradeUpdateInterval * 1000);
  }, [tradeUpdateInterval, toast, activeTrade]);

  const stopTradeMonitoring = useCallback(() => {
    setIsMonitoringActiveTrade(false);
    setTradeMonitoringStatus('Idle');
    setActiveTrade(null);
    setTradeUpdates([]);
    if (tradeMonitoringIntervalRef.current) {
        clearInterval(tradeMonitoringIntervalRef.current);
        tradeMonitoringIntervalRef.current = null;
    }
    toast({ title: "Trade Monitoring Stopped" });
  }, [toast]);

  // AI Trade Detection Functions
  const runTradeDetection = useCallback(async () => {
    // Guard: If monitoring is active, do not detect new trades
    if (isMonitoringActiveTrade) {
      setTradeDetectorStatus('Trade monitoring active - detection paused');
      return;
    }
    setTradeDetectorStatus('Analyzing...');
    const frame = captureFrame();
    if (!frame) {
        setTradeDetectorStatus('Error: Could not capture screen.');
        return;
    }

    try {
        const result = await detectTradeOpportunity(frame, previousAnalysis, scanMode);
        setLastTradeDetectionTime(new Date());

        if (result.tradeOpportunity.opportunityFound && !isMonitoringActiveTrade) {
            // Stop trade detection before any state changes
            stopTradeDetection();
            
            const opportunity = {
                ...result.tradeOpportunity,
                timestamp: new Date(),
                screenshot: frame,
                analysis: result.screenshotAnalysis,
                recommendation: result.recommendation,
            };
            
            setTradeOpportunities(prev => [opportunity, ...prev.slice(0, 4)]); // Keep last 5 opportunities
            
            // Create a message for the chat
            const userMessage: Message = {
                id: nanoid(),
                role: 'user',
                content: `AI detected a trade opportunity: ${result.tradeOpportunity.patternName || 'Pattern'}`,
                imagePreviews: [frame],
            };
            
            const assistantMessage: Message = {
                id: nanoid(),
                role: 'assistant',
                content: `🚨 **TRADE OPPORTUNITY DETECTED!** 🚨

**Pattern:** ${result.tradeOpportunity.patternName || 'Technical Pattern'}
**Type:** ${result.tradeOpportunity.tradeType.toUpperCase()}
**Confidence:** ${result.tradeOpportunity.confidence}%
**Urgency:** ${result.tradeOpportunity.urgency.toUpperCase()}

**Entry Price:** ${result.tradeOpportunity.entryPrice || 'N/A'}
**Take Profit:** ${result.tradeOpportunity.takeProfit?.join(', ') || 'N/A'}
**Stop Loss:** ${result.tradeOpportunity.stopLoss || 'N/A'}
**Risk/Reward:** ${result.tradeOpportunity.riskRewardRatio || 'N/A'}

**Reasoning:** ${result.tradeOpportunity.reasoning}

**Recommendation:** ${result.recommendation}

**Key Levels:** ${result.tradeOpportunity.keyLevels?.join(', ') || 'N/A'}
**Volume Analysis:** ${result.tradeOpportunity.volumeAnalysis || 'N/A'}`,
                recommendation: result.tradeOpportunity.entryPrice ? {
                    entryPrice: { value: result.tradeOpportunity.entryPrice, reason: result.tradeOpportunity.reasoning },
                    takeProfit: result.tradeOpportunity.takeProfit?.map(tp => ({ value: tp, reason: 'Take profit target' })) || [],
                    stopLoss: { value: result.tradeOpportunity.stopLoss || 'N/A', reason: 'Stop loss level' },
                    riskRewardRatio: result.tradeOpportunity.riskRewardRatio,
                } : undefined,
            };
            
            setAnalysisResult(prev => [...prev, userMessage, assistantMessage]);
            setPreviousAnalysis(result.screenshotAnalysis);
            
            toast({
                title: `🎯 Trade Opportunity Found!`,
                description: `${result.tradeOpportunity.tradeType.toUpperCase()} - ${result.tradeOpportunity.patternName || 'Pattern'} (${result.tradeOpportunity.confidence}% confidence)`,
                duration: 10000,
            });
            
            setTradeDetectorStatus(`Opportunity Found: ${result.tradeOpportunity.patternName}`);
            
            // Set the active trade and start monitoring
            const activeTradeData = {
                entryPrice: result.tradeOpportunity.entryPrice || 'N/A',
                takeProfit: result.tradeOpportunity.takeProfit || [],
                stopLoss: result.tradeOpportunity.stopLoss || 'N/A',
                tradeType: result.tradeOpportunity.tradeType,
                patternName: result.tradeOpportunity.patternName,
                entryTime: new Date().toISOString(),
                reasoning: result.tradeOpportunity.reasoning,
            };
            
            setActiveTrade(activeTradeData);
            
            // Start monitoring after detection is stopped
            startTradeMonitoring();
            
        } else if (isMonitoringActiveTrade) {
            setTradeDetectorStatus('Trade monitoring active - detection paused');
        } else {
            setTradeDetectorStatus('No trade opportunities found. Continuing to monitor...');
            setScanMode('light'); // Switch back to light mode
        }
        
        // Update scan interval based on AI recommendation
        if (result.nextScanIn !== tradeDetectionInterval) {
            setTradeDetectionInterval(result.nextScanIn);
        }
        
    } catch (error) {
        console.error('Trade detection failed:', error);
        setTradeDetectorStatus('Error: Trade detection failed.');
        toast({
            title: 'Trade Detection Error',
            description: 'Failed to analyze chart for trade opportunities.',
            variant: 'destructive',
        });
    }
  }, [captureFrame, previousAnalysis, scanMode, toast, tradeDetectionInterval, isMonitoringActiveTrade, stopTradeDetection, startTradeMonitoring]);

  const startTradeDetection = useCallback(() => {
    setIsTradeDetecting(true);
    setTradeDetectorStatus('Starting...');
    toast({ title: "AI Trade Detector Activated", description: `Will scan every ${tradeDetectionInterval} seconds for perfect entry opportunities.`});
    
    // Run first detection immediately
    runTradeDetection();

    tradeDetectionIntervalRef.current = setInterval(runTradeDetection, tradeDetectionInterval * 1000);
  }, [tradeDetectionInterval, toast, runTradeDetection]);

  useEffect(() => {
    return () => {
        if (scannerIntervalRef.current) {
            clearInterval(scannerIntervalRef.current);
        }
        if (tradeDetectionIntervalRef.current) {
            clearInterval(tradeDetectionIntervalRef.current);
        }
        if (tradeMonitoringIntervalRef.current) {
            clearInterval(tradeMonitoringIntervalRef.current);
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
            <h1 className="text-xl font-semibold ml-4">AI-Powered Live Analysis</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Screen Control</CardTitle>
                    <CardDescription>Share your screen to enable AI-powered trade detection and chart analysis.</CardDescription>
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
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-blue-500" />
                                AI Trade Detector
                            </CardTitle>
                            <CardDescription>Intelligent AI constantly monitors your screen for perfect entry opportunities with minimal token usage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor='trade-detection-interval'>Detection Frequency: {tradeDetectionInterval} seconds</Label>
                                <Slider 
                                    id="trade-detection-interval"
                                    min={10}
                                    max={60}
                                    step={5}
                                    value={[tradeDetectionInterval]}
                                    onValueChange={(value) => setTradeDetectionInterval(value[0])}
                                    disabled={isTradeDetecting}
                                />
                           </div>
                           <div className="flex items-center space-x-2">
                                <Switch
                                    id="scan-mode"
                                    checked={scanMode === 'detailed'}
                                    onCheckedChange={(checked) => setScanMode(checked ? 'detailed' : 'light')}
                                    disabled={isTradeDetecting}
                                />
                                <Label htmlFor="scan-mode" className="flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Detailed Analysis Mode
                                </Label>
                           </div>
                           <Button onClick={isTradeDetecting ? stopTradeDetection : startTradeDetection} className="w-full" variant={isTradeDetecting ? "secondary" : "default"}>
                                {isTradeDetecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                                {isTradeDetecting ? 'Stop AI Detection' : 'Start AI Detection'}
                           </Button>
                           <div className="text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border flex items-center gap-2">
                                <AlertCircle className="h-4 w-4"/>
                                <div>
                                    <span className='font-semibold'>Status:</span> {tradeDetectorStatus} <br/>
                                    <span className='font-semibold'>Last Detection:</span> {lastTradeDetectionTime ? lastTradeDetectionTime.toLocaleTimeString() : 'N/A'}
                                </div>
                           </div>
                        </CardContent>
                    </Card>
                    {activeTrade && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-orange-500" />
                                    Active Trade Monitor
                                </CardTitle>
                                <CardDescription>Monitoring active trade for updates and recommendations.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">
                                            {activeTrade.patternName || 'Active Trade'}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            activeTrade.tradeType === 'long' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {activeTrade.tradeType.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div>Entry: {activeTrade.entryPrice}</div>
                                        <div>TP: {activeTrade.takeProfit.join(', ')}</div>
                                        <div>SL: {activeTrade.stopLoss}</div>
                                        <div className="text-xs">
                                            Started: {new Date(activeTrade.entryTime).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor='trade-update-interval'>Update Frequency: {tradeUpdateInterval} seconds</Label>
                                    <Slider 
                                        id="trade-update-interval"
                                        min={5}
                                        max={60}
                                        step={5}
                                        value={[tradeUpdateInterval]}
                                        onValueChange={(value) => setTradeUpdateInterval(value[0])}
                                        disabled={isMonitoringActiveTrade}
                                    />
                                </div>
                                
                                <Button 
                                    onClick={isMonitoringActiveTrade ? stopTradeMonitoring : startTradeMonitoring} 
                                    className="w-full" 
                                    variant={isMonitoringActiveTrade ? "destructive" : "default"}
                                >
                                    {isMonitoringActiveTrade ? (
                                        <>
                                            <StopCircle className="mr-2 h-4 w-4" />
                                            Stop Monitoring
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="mr-2 h-4 w-4" />
                                            Start Monitoring
                                        </>
                                    )}
                                </Button>
                                
                                <div className="text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4"/>
                                    <div>
                                        <span className='font-semibold'>Status:</span> {tradeMonitoringStatus} <br/>
                                        <span className='font-semibold'>Last Update:</span> {lastTradeUpdateTime ? lastTradeUpdateTime.toLocaleTimeString() : 'N/A'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ScanLine className="h-5 w-5 text-green-500" />
                                Pattern Scanner
                            </CardTitle>
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
                            <CardTitle>Chart Analysis</CardTitle>
                             <CardDescription>Capture charts and choose your analysis mode.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="interactive-mode"
                                    checked={isInteractiveMode}
                                    onCheckedChange={setIsInteractiveMode}
                                />
                                <Label htmlFor="interactive-mode" className="flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    Interactive Drawing Mode
                                </Label>
                            </div>
                            
                            {isInteractiveMode && (chart1 || chart2) ? (
                                <div className="space-y-4">
                                    <InteractiveChartOverlay
                                        imageUrl={chart1 || chart2!}
                                        aiDrawingData={aiDrawingData}
                                        onChartClick={handleChartClick}
                                        onRequestAnalysis={(clickPoint) => handleChartAnalysis(clickPoint, chart1 || chart2!)}
                                        enableInteraction={true}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAiDrawingData(undefined)}
                                        >
                                            Clear Drawings
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsInteractiveMode(false)}
                                        >
                                            Switch to Regular Analysis
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
                        </CardContent>
                    </Card>
                  </>
                )}
              </div>
              <div className="flex flex-col">
                  {showDemo ? (
                    <ChartDemo onClose={() => setShowDemo(false)} />
                  ) : analysisResult.length > 0 ? (
                    <div className="flex-1 overflow-y-auto h-[75vh]">
                      <ChatMessages 
                        messages={analysisResult} 
                        isSoundEnabled={isSoundEnabled}
                        onSoundToggle={setIsSoundEnabled}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-4">
                                             {tradeOpportunities.length > 0 && (
                         <Card>
                           <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                               <Target className="h-5 w-5 text-orange-500" />
                               Recent Trade Opportunities
                             </CardTitle>
                           </CardHeader>
                           <CardContent>
                             <div className="space-y-3">
                               {tradeOpportunities.slice(0, 3).map((opportunity, index) => (
                                 <div key={index} className="p-3 rounded-lg border bg-muted/30">
                                   <div className="flex items-center justify-between mb-2">
                                     <span className="font-semibold text-sm">
                                       {opportunity.patternName || 'Pattern'}
                                     </span>
                                     <span className={`text-xs px-2 py-1 rounded ${
                                       opportunity.tradeType === 'long' ? 'bg-green-100 text-green-800' :
                                       opportunity.tradeType === 'short' ? 'bg-red-100 text-red-800' :
                                       'bg-gray-100 text-gray-800'
                                     }`}>
                                       {opportunity.tradeType.toUpperCase()}
                                     </span>
                                   </div>
                                   <div className="text-xs text-muted-foreground space-y-1">
                                     <div>Confidence: {opportunity.confidence}%</div>
                                     <div>Entry: {opportunity.entryPrice || 'N/A'}</div>
                                     <div>TP: {opportunity.takeProfit?.join(', ') || 'N/A'}</div>
                                     <div>SL: {opportunity.stopLoss || 'N/A'}</div>
                                     <div className="text-xs">
                                       {opportunity.timestamp.toLocaleTimeString()}
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       )}
                       {tradeUpdates.length > 0 && (
                         <Card>
                           <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                               <TrendingUp className="h-5 w-5 text-blue-500" />
                               Recent Trade Updates
                             </CardTitle>
                           </CardHeader>
                           <CardContent>
                             <div className="space-y-3">
                               {tradeUpdates.slice(-3).map((update, index) => (
                                 <div key={index} className="p-3 rounded-lg border bg-muted/30">
                                   <div className="flex items-center justify-between mb-2">
                                     <span className="font-semibold text-sm">
                                       {update.recommendation.toUpperCase().replace('_', ' ')}
                                     </span>
                                     <span className={`text-xs px-2 py-1 rounded ${
                                       update.urgency === 'immediate' ? 'bg-red-100 text-red-800' :
                                       update.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                       update.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                       'bg-green-100 text-green-800'
                                     }`}>
                                       {update.urgency.toUpperCase()}
                                     </span>
                                   </div>
                                   <div className="text-xs text-muted-foreground space-y-1">
                                     <div>P&L: {update.profitLoss}</div>
                                     <div>Risk: {update.riskLevel.toUpperCase()}</div>
                                     <div>Status: {update.positionStatus.toUpperCase()}</div>
                                     <div className="text-xs">
                                       {update.timestamp.toLocaleTimeString()}
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       )}
                      <Card className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground space-y-4">
                            <Wand2 className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Analysis will appear here</h3>
                            <p className="mt-2 text-sm">
                              Use the AI Trade Detector for automatic alerts or capture charts manually to begin.
                            </p>
                            <Button 
                              onClick={() => setShowDemo(true)}
                              variant="outline"
                              className="mt-4"
                            >
                              <Target className="mr-2 h-4 w-4" />
                              Try Interactive Drawing Demo
                            </Button>
                        </div>
                      </Card>
                    </div>
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
