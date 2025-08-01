
'use client';

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, MonitorPlay, Sparkles, Zap } from 'lucide-react';
import { ChatHistory } from './chat-history';
import { ChatMessages } from './chat-messages';
import Link from 'next/link';
import { getSummaryTitleForHistory, getAiResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';
import type { ChatSession, Message, Persona } from '@/lib/types';
import { nanoid } from 'nanoid';

// Lazy load the chat input component to reduce initial bundle size
const ChatInput = lazy(() => import('./chat-input').then(module => ({ default: module.ChatInput })));

// Enhanced loading component with modern design
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-6">
    <div className="flex items-center space-x-3 animate-fade-in">
      <div className="relative">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-primary/50 rounded-full animate-spin" style={{ animationDelay: '0.1s' }}></div>
      </div>
      <span className="text-sm text-muted-foreground font-medium">Loading...</span>
    </div>
  </div>
);

const defaultPersonas: Persona[] = [
  { id: 'default', name: 'Default', description: 'A balanced, general technical analyst suitable for swing trading.', isCustom: false },
  { id: 'wizz', name: 'Wizz', description: 'Advanced AI trading assistant with enhanced pattern recognition and intelligent risk management. Optimized for all timeframes with smart entry/exit strategies.', isCustom: false },
  { id: 'scalper', name: 'Optimized Scalper', description: 'Ultra-fast 1-15m timeframe analysis with enhanced entry precision and smart stop-loss optimization. Perfect for high-frequency trading.', isCustom: false },
  { id: 'day_trader', name: 'Optimized Day Trader', description: 'Advanced intraday analysis with session-based entries and dynamic profit targets. Optimized for 30m-4h charts with enhanced risk management.', isCustom: false },
  { id: 'swing_trader', name: 'Optimized Swing Trader', description: 'Multi-day trend analysis with pullback optimization and probability-based targets. Enhanced 4h-1d chart analysis with improved win rates.', isCustom: false },
  { id: 'position_trader', name: 'Optimized Position Trader', description: 'Long-term macro analysis with weekly-monthly charts. Enhanced with institutional-level insights and maximum profit optimization.', isCustom: false },
  { id: 'wizz_ultra', name: '🔮 Wizz Ultra AI', description: '⚡ PREMIUM ⚡ Revolutionary quantum probability analysis with institutional-grade precision. The most advanced AI brain for maximum win rates and profitability. Premium subscription required.', isCustom: false },
];

// Create a stable initial session without dynamic values
const createInitialSession = (): ChatSession => ({
  id: 'initial-session',
  title: 'BTC/USD Analysis',
  messages: [
    { id: 'initial-message', role: 'assistant', content: "Hello! I'm ChartWiz. Upload a crypto chart and I'll analyze it for you." },
  ],
  personaId: 'default',
  timestamp: 0 // Will be set after hydration
});

// Memoized session operations
const useSessionOperations = () => {
  return useMemo(() => ({
    createNewSession: (): ChatSession => ({
      id: nanoid(),
      title: 'New Chat',
      messages: [{ id: nanoid(), role: 'assistant', content: "Hello! I'm Wizz. Upload a crypto chart and I'll analyze it for you." }],
      personaId: 'default',
      timestamp: Date.now(),
    }),
    
    updateSessionTitle: (sessions: ChatSession[], sessionId: string, newTitle: string): ChatSession[] =>
      sessions.map(session => 
        session.id === sessionId 
          ? { ...session, title: newTitle } 
          : session
      ),
      
    addMessageToSession: (sessions: ChatSession[], sessionId: string, message: Message): ChatSession[] =>
      sessions.map(session =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      ),
  }), []);
};

// Memoized local storage operations
const useLocalStorage = () => {
  return useMemo(() => ({
    loadSessions: (): ChatSession[] => {
      if (typeof window === 'undefined') return [];
      try {
        const saved = localStorage.getItem('chatSessions');
        if (!saved) return [];
        
        const sessions = JSON.parse(saved);
        // Migrate sessions without timestamps
        return sessions.map((session: ChatSession, index: number) => ({
          ...session,
          timestamp: session.timestamp || (Date.now() - (index * 1000 * 60 * 60)) // Assign descending timestamps for old sessions
        }));
      } catch {
        return [];
      }
    },
    
    saveSessions: (sessions: ChatSession[]) => {
      if (typeof window === 'undefined') return;
      try {
        if (sessions.length > 0) {
          localStorage.setItem('chatSessions', JSON.stringify(sessions));
        } else {
          localStorage.removeItem('chatSessions');
        }
      } catch (error) {
        console.error('Failed to save sessions:', error);
      }
    },
    
    loadActiveSessionId: (): string | null => {
      if (typeof window === 'undefined') return null;
      try {
        return localStorage.getItem('activeSessionId');
      } catch {
        return null;
      }
    },
    
    saveActiveSessionId: (sessionId: string) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem('activeSessionId', sessionId);
      } catch (error) {
        console.error('Failed to save active session ID:', error);
      }
    },
    
    loadCustomPersonas: (): Persona[] => {
      if (typeof window === 'undefined') return [];
      try {
        const saved = localStorage.getItem('customPersonas');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },
    
    saveCustomPersonas: (personas: Persona[]) => {
      if (typeof window === 'undefined') return;
      try {
        const customPersonas = personas.filter(p => p.isCustom);
        localStorage.setItem('customPersonas', JSON.stringify(customPersonas));
      } catch (error) {
        console.error('Failed to save custom personas:', error);
      }
    },
  }), []);
};

function ChatLayoutContent() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>(defaultPersonas);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const sessionOps = useSessionOperations();
  const localStorage = useLocalStorage();

  // Memoized active session
  const activeSession = useMemo(() => 
    sessions.find((s) => s.id === activeSessionId), 
    [sessions, activeSessionId]
  );

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load data from local storage only after component is mounted (client-side)
  useEffect(() => {
    if (!isMounted) return;
    
    const savedSessions = localStorage.loadSessions();
    const savedActiveId = localStorage.loadActiveSessionId();
    const savedPersonas = localStorage.loadCustomPersonas();
    
    if (savedSessions.length > 0) {
      setSessions(savedSessions);
      setActiveSessionId(savedActiveId || savedSessions[0].id);
    } else {
      const newSession = sessionOps.createNewSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    }
    
    setPersonas([...defaultPersonas, ...savedPersonas]);
  }, [isMounted, localStorage, sessionOps]);

  // Save sessions to local storage whenever they change (only after mounted)
  useEffect(() => {
    if (!isMounted) return;
    localStorage.saveSessions(sessions);
  }, [sessions, localStorage, isMounted]);

  // Save active session id to local storage (only after mounted)
  useEffect(() => {
    if (!isMounted || !activeSessionId) return;
    localStorage.saveActiveSessionId(activeSessionId);
  }, [activeSessionId, localStorage, isMounted]);

  // Save custom personas to local storage (only after mounted)
  useEffect(() => {
    if (!isMounted) return;
    localStorage.saveCustomPersonas(personas);
  }, [personas, localStorage, isMounted]);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    setSessions(prevSessions => sessionOps.addMessageToSession(prevSessions, sessionId, message));
  }, [sessionOps]);
  
  const handleMessageSubmit = useCallback((message: Message) => {
    if (!activeSessionId) return;
    addMessageToSession(activeSessionId, message);
  }, [activeSessionId, addMessageToSession]);

  // This effect triggers the AI response and title generation
  useEffect(() => {
    if (!activeSession || isLoading || !isMounted) return;

    const lastMessage = activeSession.messages[activeSession.messages.length - 1];

    const getResponseAndTitle = async () => {
      if (!lastMessage || lastMessage.role !== 'user') return;
      
      setIsLoading(true);
      
      const messagesForApi = activeSession.messages;

      const titleNeedsUpdate = activeSession.title === 'New Chat';
      if (titleNeedsUpdate && messagesForApi.length > 1) {
        try {
          const newTitle = await getSummaryTitleForHistory(messagesForApi);
          setSessions(prev => sessionOps.updateSessionTitle(prev, activeSession.id, newTitle));
        } catch (error) {
          console.error('Failed to generate title:', error);
        }
      }
      
      const formData = new FormData();
      if(lastMessage.content && typeof lastMessage.content === 'string') {
        formData.append('question', lastMessage.content);
      }
      if (lastMessage.personaDescription) {
        formData.append('persona', lastMessage.personaDescription);
      }
      if (lastMessage.imageFiles) {
          lastMessage.imageFiles.forEach((file) => {
            formData.append('images', file);
          });
      }
      
      try {
        const result = await getAiResponse(formData);

        if (result.error) {
          toast({ title: 'AI Analysis Error', description: result.error, variant: 'destructive' });
          const errorMessage: Message = {
            id: nanoid(),
            role: 'assistant',
            content: `Sorry, there was an error: ${result.error}`,
          };
          addMessageToSession(activeSession.id, errorMessage);
        } else if (result.answer) {
          const assistantMessage: Message = {
            id: nanoid(),
            role: 'assistant',
            content: result.answer.analysis,
            recommendation: result.answer.recommendation,
            alternativeScenario: result.answer.alternativeScenario,
          };
          addMessageToSession(activeSession.id, assistantMessage);
        }
      } catch (error) {
        console.error('Failed to get AI response:', error);
        toast({ title: 'AI Analysis Error', description: 'Failed to get AI response', variant: 'destructive' });
      }
      
      setIsLoading(false);
    };

    getResponseAndTitle();
  // We want this effect to run ONLY when a new user message is added.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.messages.filter(m => m.role === 'user').length, activeSession?.id, isMounted]);

  const createNewChat = useCallback(() => {
    const newSession = sessionOps.createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [sessionOps]);

  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions(prev => sessionOps.updateSessionTitle(prev, id, newTitle));
  }, [sessionOps]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prevSessions => {
      const newSessions = prevSessions.filter(session => session.id !== id);
      
      if (newSessions.length === 0) {
        const newSession = sessionOps.createNewSession();
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[0].id);
      }
      
      return newSessions;
    });
  }, [activeSessionId, sessionOps]);

  const setSessionPersonaId = useCallback((personaId: string) => {
    if (!activeSessionId) return;
    setSessions(prev => 
      prev.map(session => session.id === activeSessionId ? { ...session, personaId: personaId } : session)
    );
  }, [activeSessionId]);

  const handlePersonasChange = useCallback((newPersonas: Persona[]) => {
    setPersonas(newPersonas);
    if (activeSession && !newPersonas.find(p => p.id === activeSession.personaId)) {
        setSessionPersonaId('default');
    }
  }, [activeSession, setSessionPersonaId]);

  // Use initial session data when not mounted, actual data when mounted
  const displaySessions = isMounted ? sessions : [createInitialSession()];
  const displayActiveSessionId = isMounted ? activeSessionId : 'initial-session';
  const displayActiveSession = isMounted ? activeSession : createInitialSession();

  return (
    <>
      <Sidebar collapsible="icon" className="glass-effect border-r border-border/50">
        <SidebarHeader className="border-b border-border/50">
           <div className="flex items-center justify-between p-3">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="!h-14 !p-4 !bg-transparent hover:!bg-sidebar-accent/70 transition-all duration-200 group" asChild>
                      <div className="flex items-center gap-3">
                         <div className="relative">
                           <Logo />
                           <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                         </div>
                         <span className="group-data-[collapsible=icon]:hidden font-bold text-lg gradient-text">Wizz</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
                 <div className="group-data-[collapsible=icon]:hidden">
                    <SidebarTrigger className="hover:bg-sidebar-accent/70 transition-colors duration-200" />
                 </div>
           </div>
        </SidebarHeader>
        <SidebarContent className="p-3">
           <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold group-data-[collapsible=icon]:hidden text-sidebar-foreground/90">Chat History</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={isMounted ? createNewChat : undefined}
              disabled={!isMounted}
              className="group-data-[collapsible=icon]:hidden btn-hover-lift hover:bg-sidebar-accent/70 hover:glow-effect transition-all duration-200"
              title="Start new chat"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
          <ChatHistory
            sessions={displaySessions}
            activeSessionId={displayActiveSessionId}
            setActiveSessionId={isMounted ? setActiveSessionId : () => {}}
            renameSession={isMounted ? renameSession : () => {}}
            deleteSession={isMounted ? deleteSession : () => {}}
          />
        </SidebarContent>
        <SidebarHeader className="border-t border-border/50 p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/share">
                <SidebarMenuButton className="btn-hover-lift hover:bg-sidebar-accent/70 transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <MonitorPlay className="h-5 w-5" />
                      <Zap className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
                    </div>
                    <span className="font-medium">Live Analysis</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center p-4 border-b border-border/50 glass-effect backdrop-blur-sm">
          <SidebarTrigger className="hover:bg-accent/70 transition-colors duration-200"/>
          <div className="flex items-center gap-3 ml-4">
            <Sparkles className="h-5 w-5 text-primary animate-pulse-slow" />
            <h1 className="text-xl font-bold gradient-text">{displayActiveSession?.title || 'Wizz'}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto animate-fade-in">
          <ChatMessages messages={displayActiveSession?.messages || []} />
        </div>
        <div className="p-4 border-t border-border/50 glass-effect backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
             {isMounted && displayActiveSession ? (
                <Suspense fallback={<ComponentLoader />}>
                  <ChatInput 
                    personas={personas}
                    activePersonaId={displayActiveSession.personaId}
                    onPersonaChange={setSessionPersonaId}
                    onPersonasChange={handlePersonasChange}
                    onMessageSubmit={handleMessageSubmit}
                    isLoading={isLoading}
                  />
                </Suspense>
            ) : (
              <ComponentLoader />
            )}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export const ChatLayout = React.memo(() => {
  return (
    <SidebarProvider>
      <ChatLayoutContent />
    </SidebarProvider>
  );
});
