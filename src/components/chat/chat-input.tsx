
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Mic, Send, X, Loader2, SlidersHorizontal, Plus, MoreVertical, Edit, Trash2, Upload, Sparkles } from 'lucide-react';
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
import { textChat } from '@/ai/flows/text-chat-flow';

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
  };

  const generatePersona = async () => {
    if (!personaDescription.trim()) return;
    setIsGenerating(true);
    try {
        const result = await textChat({
            question: `Create a concise, descriptive name for a trading persona with these rules: "${personaDescription}". The name should be 2-3 words max. Then, based on these rules, write a detailed, systematic description for this trading persona that the ChartWiz AI can follow. The description should be a clear set of instructions.

            Respond in this exact format:
            NAME: [Generated Name]
            DESCRIPTION: [Generated Description]`
        });
        
        const answer = result.answer;
        const nameMatch = answer.match(/NAME: (.*)/);
        const descriptionMatch = answer.match(/DESCRIPTION: ([\s\S]*)/);

        if (nameMatch && nameMatch[1]) {
            setPersonaName(nameMatch[1].trim());
        }
        if (descriptionMatch && descriptionMatch[1]) {
            setPersonaDescription(descriptionMatch[1].trim());
        }

    } catch (e) {
        // handle error
    } finally {
        setIsGenerating(false);
    }
  };

  const personaDialog = (
     <Dialog open={!!dialogMode} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Create' : 'Edit'} Custom Persona</DialogTitle>
            <DialogDescription>
                Define the rules and strategies for your custom AI assistant. You can describe it in your own words and have the AI generate a structured persona for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={personaName} onChange={(e) => setPersonaName(e.target.value)} className="col-span-3" placeholder="e.g., 'Conservative Scalper'"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                 <div className="col-span-3 space-y-2">
                    <Textarea id="description" value={personaDescription} onChange={(e) => setPersonaDescription(e.target.value)} className="min-h-[120px]" placeholder="e.g., 'I want to grow my account slowly but safely. Only take trades with at least 3:1 R/R, and avoid holding positions over the weekend...'"/>
                    <Button onClick={generatePersona} disabled={isGenerating || !personaDescription.trim()} size="sm" className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                        Generate with AI
                    </Button>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Persona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );

  const deleteDialog = (
    <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the custom persona "{currentPersona?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {personaDialog}
      {deleteDialog}
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Persona Management</DialogTitle>
          <DialogDescription>
            Manage your default and custom trading personas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {customPersonas.length > 0 ? (
                customPersonas.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-md">{p.description}</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEdit(p)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    You haven't created any custom personas yet.
                </div>
            )}
        </div>
        <DialogFooter className="flex-row justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> Add New Persona</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export function ChatInput({ personas, activePersonaId, onPersonaChange, onPersonasChange, onMessageSubmit, isLoading }: ChatInputProps) {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [personaManagerOpen, setPersonaManagerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const activePersona = personas.find(p => p.id === activePersonaId);
  const customPersonas = personas.filter(p => p.isCustom);
  const defaultPersonas = personas.filter(p => !p.isCustom);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        toast({ title: "Voice Recognition Error", description: event.error, variant: 'destructive' });
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  const processFiles = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      const newFiles = [...imageFiles, ...fileArray].slice(0, 2);
      setImageFiles(newFiles);

      const newPreviews: string[] = [];
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === newFiles.length) {
            setImagePreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    // Use a timeout to prevent flickering when dragging over child elements
    setTimeout(() => {
        setIsDragging(false);
    }, 50);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!question.trim() && imageFiles.length === 0) || isLoading) {
      return;
    }

    const userMessageContent = question.trim() ? question : (imageFiles.length > 1 ? 'Analyze these two charts.' : 'Analyze this chart.');
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: userMessageContent,
      imageFiles,
      imagePreviews: imageFiles.length > 0 ? imagePreviews : undefined,
      personaDescription: activePersona?.description,
    };
    
    onMessageSubmit(userMessage);

    setQuestion('');
    setImageFiles([]);
    setImagePreviews([]);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    
    if(fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <PersonaManager 
        personas={personas}
        onPersonasChange={onPersonasChange}
        open={personaManagerOpen}
        onOpenChange={setPersonaManagerOpen}
      />
      <div 
        className="rounded-2xl border bg-background/60 p-2 shadow-lg relative"
        onDrop={handleDrop}
        onDragOver={handleDragEvents}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 rounded-2xl border-2 border-dashed border-primary">
                <Upload className="h-10 w-10 text-primary" />
                <p className="mt-2 text-sm font-medium text-primary">Drop images here</p>
            </div>
        )}
        <form onSubmit={handleSubmit} className={cn("relative", isDragging && 'pointer-events-none')}>
          {imagePreviews.length > 0 && (
            <div className="p-2 flex gap-2 border-b mb-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative w-24 h-16">
                  <Image src={preview} alt={`Selected chart ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="chart graph" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeImage(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex w-full items-end">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
                    <SlidersHorizontal className="h-5 w-5" />
                    <span className="sr-only">Persona Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Trading Persona</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={activePersonaId} onValueChange={onPersonaChange}>
                    {defaultPersonas.map(p => (
                      <DropdownMenuRadioItem key={p.id} value={p.id}>{p.name}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  {customPersonas.length > 0 && <DropdownMenuSeparator />}
                  {customPersonas.length > 0 && <DropdownMenuLabel>Custom Personas</DropdownMenuLabel>}
                  <DropdownMenuRadioGroup value={activePersonaId} onValueChange={onPersonaChange}>
                     {customPersonas.map(p => (
                      <DropdownMenuRadioItem key={p.id} value={p.id}>{p.name}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setPersonaManagerOpen(true)}>
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
                className="text-muted-foreground hover:text-foreground"
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
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="pl-24 pr-24 min-h-[52px] max-h-48 flex-1 resize-none self-center border-none bg-transparent shadow-none focus-visible:ring-0"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                  type="button"
                  size="icon"
                  variant={isListening ? 'destructive' : 'ghost'}
                  onClick={handleToggleListening}
                  disabled={!recognitionRef.current || isLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Mic className="h-5 w-5" />
                  <span className="sr-only">Ask by voice</span>
                </Button>
              <Button type="submit" size="icon" disabled={(!question.trim() && imageFiles.length === 0) || isLoading}>
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
