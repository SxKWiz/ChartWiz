
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Mic, Send, X, Loader2, SlidersHorizontal, Plus, MoreVertical, Edit, Trash2, Upload, Sparkles, Zap, Bot } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Message, Persona } from '@/lib/types';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { optimizedInputHandler, optimizeImageLoading, safeExecute } from '@/lib/performance-booster';

interface PersonaManagerProps {
  personas: Persona[];
  onPersonasChange: (personas: Persona[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PersonaManager({ personas, onPersonasChange, open, onOpenChange }: PersonaManagerProps) {
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [personaName, setPersonaName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const customPersonas = personas.filter(p => p.isCustom);

  const handleAddNew = () => {
    setCurrentPersona(null);
    setPersonaName('');
    setPersonaDescription('');
    setDialogMode('add');
  };

  const handleEdit = (persona: Persona) => {
    setCurrentPersona(persona);
    setPersonaName(persona.name);
    setPersonaDescription(persona.description);
    setDialogMode('edit');
  };

  const handleDelete = (persona: Persona) => {
    setCurrentPersona(persona);
    setDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (currentPersona) {
      onPersonasChange(personas.filter(p => p.id !== currentPersona.id));
    }
    setDeleteAlertOpen(false);
    setCurrentPersona(null);
  }

  const handleSave = () => {
    if (!personaName.trim() || !personaDescription.trim()) return;

    if (dialogMode === 'add') {
      const newPersona: Persona = {
        id: nanoid(),
        name: personaName,
        description: personaDescription,
        isCustom: true,
      };
      onPersonasChange([...personas, newPersona]);
    } else if (dialogMode === 'edit' && currentPersona) {
      onPersonasChange(personas.map(p => p.id === currentPersona.id ? { ...p, name: personaName, description: personaDescription } : p));
    }

    setDialogMode(null);
    setPersonaName('');
    setPersonaDescription('');
    setCurrentPersona(null);
  };

  const generatePersonaDescription = async () => {
    if (!personaName.trim()) return;
    
    setIsGenerating(true);
    try {
      // Simulate AI generation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const generatedDescription = `A specialized trading persona focused on ${personaName.toLowerCase()} strategies with emphasis on technical analysis and risk management.`;
      setPersonaDescription(generatedDescription);
    } catch (error) {
      console.error('Failed to generate description:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] glass-effect">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Manage Trading Personas
            </DialogTitle>
            <DialogDescription>
              Create and manage custom trading personas to tailor analysis to your trading style.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Custom Personas</h4>
              <Button onClick={handleAddNew} size="sm" className="btn-hover-lift">
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>
            {customPersonas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No custom personas yet</p>
                <p className="text-sm">Create your first persona to get started</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customPersonas.map((persona) => (
                  <div key={persona.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors duration-200">
                    <div className="flex-1">
                      <p className="font-medium">{persona.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{persona.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(persona)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(persona)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? 'Create New Persona' : 'Edit Persona'}
            </DialogTitle>
            <DialogDescription>
              Define the trading style and analysis approach for this persona.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="persona-name">Persona Name</Label>
              <Input
                id="persona-name"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="e.g., Aggressive Scalper, Conservative Swing Trader"
                className="focus-ring"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="persona-description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePersonaDescription}
                  disabled={!personaName.trim() || isGenerating}
                  className="btn-hover-lift"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                id="persona-description"
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                placeholder="Describe the trading style, timeframes, risk tolerance, and analysis approach..."
                className="min-h-[100px] focus-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!personaName.trim() || !personaDescription.trim()}
              className="btn-hover-lift"
            >
              {dialogMode === 'add' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="glass-effect">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Persona</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentPersona?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ChatInputProps {
  personas: Persona[];
  activePersonaId: string;
  onPersonaChange: (personaId: string) => void;
  onPersonasChange: (personas: Persona[]) => void;
  onMessageSubmit: (message: Message) => void;
  isLoading: boolean;
}

const defaultPersonas: Persona[] = [
  { id: 'default', name: 'Default', description: 'A balanced, general technical analyst suitable for swing trading.', isCustom: false },
  { id: 'wizz', name: 'Wizz', description: 'Advanced AI trading assistant with enhanced pattern recognition and intelligent risk management. Optimized for all timeframes with smart entry/exit strategies.', isCustom: false },
  { id: 'scalper', name: 'Scalper', description: 'Focuses on very short timeframes (1-15 mins), micro-patterns, and quick profits with tight stop-losses.', isCustom: false },
  { id: 'day_trader', name: 'Day Trader', description: 'Focuses on hourly and 4-hour charts for intraday trends. Trades are opened and closed within the same day.', isCustom: false },
  { id: 'swing_trader', name: 'Swing Trader', description: 'Focuses on daily and weekly charts to identify multi-day or multi-week trends.', isCustom: false },
  { id: 'position_trader', name: 'Position Trader', description: 'Focuses on weekly and monthly charts for long-term macroeconomic trends, ignoring short-term noise.', isCustom: false },
];

export function ChatInput({ personas, activePersonaId, onPersonaChange, onPersonasChange, onMessageSubmit, isLoading }: ChatInputProps) {
  const [question, setQuestion] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [personaManagerOpen, setPersonaManagerOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const customPersonas = personas.filter(p => p.isCustom);
  const activePersona = personas.find(p => p.id === activePersonaId);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(prev => prev + ' ' + transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast({ title: 'Speech Recognition Error', description: 'Could not recognize speech. Please try again.', variant: 'destructive' });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [toast]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      toast({ title: 'Invalid Files', description: 'Please select only image files.', variant: 'destructive' });
    }

    const totalFiles = imageFiles.length + validFiles.length;
    if (totalFiles > 2) {
      toast({ title: 'Too Many Files', description: 'You can upload a maximum of 2 images.', variant: 'destructive' });
      return;
    }

    try {
      // Use performance-optimized image loading
      const newPreviews = await Promise.all(
        validFiles.map(file => optimizeImageLoading(file))
      );
      
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setImageFiles(prev => [...prev, ...validFiles]);
      
      console.log('⚡ Images optimized for faster AI processing');
    } catch (error) {
      console.error('Image optimization failed, using fallback:', error);
      
      // Fallback to original method
      const newPreviews: string[] = [];
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === validFiles.length) {
              setImagePreviews(prev => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      });
      
      setImageFiles(prev => [...prev, ...validFiles]);
    }
    
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!question.trim() && imageFiles.length === 0) || isLoading) return;

    const message: Message = {
      id: nanoid(),
      role: 'user',
      content: question.trim() || 'Please analyze this chart.',
      imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      imagePreviews: imagePreviews.length > 0 ? imagePreviews : undefined,
      personaDescription: activePersona?.description,
    };

    onMessageSubmit(message);
    setQuestion('');
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
         if (imageFiles.length > 0) {
       // Create a proper file input event
       const fileList = new DataTransfer();
       imageFiles.forEach(file => fileList.items.add(file));
       
       const mockEvent = {
         target: { files: fileList.files, value: '' }
       } as React.ChangeEvent<HTMLInputElement>;
       handleImageChange(mockEvent);
     }
  };

  return (
    <>
      <PersonaManager
        personas={personas}
        onPersonasChange={onPersonasChange}
        open={personaManagerOpen}
        onOpenChange={setPersonaManagerOpen}
      />
      <div
        className="relative w-full rounded-2xl border border-border/50 bg-gradient-to-br from-background/80 to-muted/20 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl focus-within:shadow-xl focus-within:border-primary/50 animate-fade-in"
        onDrop={handleDrop}
        onDragOver={handleDragEvents}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 rounded-2xl border-2 border-dashed border-primary animate-scale-in">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-semibold text-primary mb-2">Drop images here</p>
                <p className="text-sm text-muted-foreground">Upload up to 2 chart images</p>
            </div>
        )}
        <form onSubmit={handleSubmit} className={cn("relative", isDragging && 'pointer-events-none')}>
          {imagePreviews.length > 0 && (
            <div className="p-4 flex gap-3 border-b border-border/50 bg-muted/20 rounded-t-2xl">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-28 h-20 group">
                  <Image 
                    src={preview} 
                    alt={`Selected chart ${index + 1}`} 
                    fill
                    className="rounded-xl object-cover shadow-md group-hover:shadow-lg transition-all duration-200 border border-border/30" 
                    data-ai-hint="chart graph" 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    onClick={() => removeImage(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex w-full items-end p-4">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 btn-hover-lift"
                    title="Select trading persona"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    <span className="sr-only">Persona Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 glass-effect">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Trading Persona
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={activePersonaId} onValueChange={onPersonaChange}>
                    {defaultPersonas.map(p => (
                      <DropdownMenuRadioItem key={p.id} value={p.id} className="hover:bg-accent/70">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">{p.description}</span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  {customPersonas.length > 0 && <DropdownMenuSeparator />}
                  {customPersonas.length > 0 && (
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Custom Personas
                    </DropdownMenuLabel>
                  )}
                  <DropdownMenuRadioGroup value={activePersonaId} onValueChange={onPersonaChange}>
                     {customPersonas.map(p => (
                      <DropdownMenuRadioItem key={p.id} value={p.id} className="hover:bg-accent/70">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">{p.description}</span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setPersonaManagerOpen(true)} className="hover:bg-accent/70">
                    <Plus className="mr-2 h-4 w-4" /> Manage Personas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || imageFiles.length >= 2}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 btn-hover-lift"
                title="Attach chart images"
              >
                <Paperclip className="h-5 w-5" />
                <span className="sr-only">Attach image</span>
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Ask a question or upload a chart to analyze..."
              value={question}
              onChange={(e) => {
                // Use optimized input handler for smoother performance
                optimizedInputHandler(() => setQuestion(e.target.value));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="pl-28 pr-28 min-h-[52px] max-h-48 flex-1 resize-none self-center border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                  type="button"
                  size="icon"
                  variant={isListening ? 'destructive' : 'ghost'}
                  onClick={handleToggleListening}
                  disabled={!recognitionRef.current || isLoading}
                  className={cn(
                    "transition-all duration-200 btn-hover-lift",
                    isListening 
                      ? "text-destructive-foreground animate-pulse" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  )}
                  title="Voice input"
                >
                  <Mic className="h-5 w-5" />
                  <span className="sr-only">Ask by voice</span>
                </Button>
              <Button 
                type="submit" 
                size="icon" 
                disabled={(!question.trim() && imageFiles.length === 0) || isLoading}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 btn-hover-lift glow-effect"
                title="Send message"
              >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  <span className="sr-only">Send message</span>
                </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
