
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, MonitorPlay } from 'lucide-react';
import { ChatHistory } from './chat-history';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import type { ChatSession, Message, Persona } from '@/lib/types';
import { nanoid } from 'nanoid';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { getSummaryTitleForHistory, getAiResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons/logo';


const defaultPersonas: Persona[] = [
  { id: 'default', name: 'Default', description: 'A balanced, general technical analyst suitable for swing trading.', isCustom: false },
  { id: 'scalper', name: 'Scalper', description: 'Focuses on very short timeframes (1-15 mins), micro-patterns, and quick profits with tight stop-losses.', isCustom: false },
  { id: 'day_trader', name: 'Day Trader', description: 'Focuses on hourly and 4-hour charts for intraday trends. Trades are opened and closed within the same day.', isCustom: false },
  { id: 'swing_trader', name: 'Swing Trader', description: 'Focuses on daily and weekly charts to identify multi-day or multi-week trends.', isCustom: false },
  { id: 'position_trader', name: 'Position Trader', description: 'Focuses on weekly and monthly charts for long-term macroeconomic trends, ignoring short-term noise.', isCustom: false },
];

const initialSession: ChatSession = {
  id: '1',
  title: 'BTC/USD Analysis',
  messages: [
    { id: nanoid(), role: 'assistant', content: "Hello! I'm ChartWiz. Upload a crypto chart and I'll analyze it for you." },
  ],
  personaId: 'default'
};

function ChatLayoutContent() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>(defaultPersonas);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load data from local storage on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        if (parsedSessions.length > 0) {
            setActiveSessionId(localStorage.getItem('activeSessionId') || parsedSessions[0].id);
        } else {
          const newSession = { ...initialSession, id: nanoid(), title: 'New Chat' };
          setSessions([newSession]);
          setActiveSessionId(newSession.id);
        }
      } else {
        const newInitialSession = {...initialSession, id: nanoid()};
        setSessions([newInitialSession]);
        setActiveSessionId(newInitialSession.id);
      }

      const savedPersonas = localStorage.getItem('customPersonas');
      if (savedPersonas) {
        const customPersonas: Persona[] = JSON.parse(savedPersonas);
        setPersonas([...defaultPersonas, ...customPersonas]);
      }

    } catch (error) {
      console.error("Failed to load data from local storage:", error);
      const newInitialSession = {...initialSession, id: nanoid()};
      setSessions([newInitialSession]);
      setActiveSessionId(newInitialSession.id);
      setPersonas(defaultPersonas);
    }
  }, []);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    } else {
      localStorage.removeItem('chatSessions');
    }
  }, [sessions]);

  // Save active session id to local storage
  useEffect(() => {
    if (activeSessionId) {
        localStorage.setItem('activeSessionId', activeSessionId);
    }
  }, [activeSessionId]);

  // Save custom personas to local storage
  useEffect(() => {
      const customPersonas = personas.filter(p => p.isCustom);
      localStorage.setItem('customPersonas', JSON.stringify(customPersonas));
  }, [personas]);


  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    setSessions(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id === sessionId) {
          return { ...session, messages: [...session.messages, message] };
        }
        return session;
      });
      return newSessions;
    });
  }, []);
  
  const handleMessageSubmit = (message: Message) => {
    if (!activeSessionId) return;
    addMessageToSession(activeSessionId, message);
  };

  // This effect triggers the AI response and title generation
  useEffect(() => {
    if (!activeSession || isLoading) return;

    const lastMessage = activeSession.messages[activeSession.messages.length - 1];

    const getResponseAndTitle = async () => {
      if (!lastMessage || lastMessage.role !== 'user') return;
      
      setIsLoading(true);
      
      const messagesForApi = activeSession.messages;

      const titleNeedsUpdate = activeSession.title === 'New Chat';
      if (titleNeedsUpdate && messagesForApi.length > 1) {
        const newTitle = await getSummaryTitleForHistory(messagesForApi);
        setSessions(prev => 
          prev.map(s => s.id === activeSession.id ? { ...s, title: newTitle.substring(0, 25) } : s)
        );
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
      
      setIsLoading(false);
    };

    getResponseAndTitle();
  // We want this effect to run ONLY when a new user message is added.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.messages.filter(m => m.role === 'user').length, activeSession?.id]);


  const createNewChat = () => {
    const newSession: ChatSession = {
      id: nanoid(),
      title: 'New Chat',
      messages: [{ id: nanoid(), role: 'assistant', content: "Hello! I'm Wizz. Upload a crypto chart and I'll analyze it for you." }],
      personaId: 'default',
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(prev => 
      prev.map(session => session.id === id ? { ...session, title: newTitle.substring(0, 25) } : session)
    );
  };

  const deleteSession = (id: string) => {
    setSessions(prevSessions => {
      const newSessions = prevSessions.filter(session => session.id !== id);
      
      if (newSessions.length === 0) {
        const newSession: ChatSession = {
          id: nanoid(),
          title: 'New Chat',
          messages: [{ id: nanoid(), role: 'assistant', content: "Hello! I'm Wizz. Upload a crypto chart and I'll analyze it for you." }],
          personaId: 'default',
        };
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[0].id);
      }
      
      return newSessions;
    });
  };

  const setSessionPersonaId = (personaId: string) => {
    if (!activeSessionId) return;
    setSessions(prev => 
      prev.map(session => session.id === activeSessionId ? { ...session, personaId: personaId } : session)
    );
  };

  const handlePersonasChange = (newPersonas: Persona[]) => {
    setPersonas(newPersonas);
    if (activeSession && !newPersonas.find(p => p.id === activeSession.personaId)) {
        setSessionPersonaId('default');
    }
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
           <div className="flex items-center justify-between p-2">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton className="!h-12 !p-3 !bg-transparent hover:!bg-sidebar-accent" asChild>
                      <div className="flex items-center gap-2">
                         <Logo />
                         <span className="group-data-[collapsible=icon]:hidden">Wizz</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
                 <div className="group-data-[collapsible=icon]:hidden">
                    <SidebarTrigger />
                 </div>
           </div>
        </SidebarHeader>
        <SidebarContent>
           <div className="flex items-center justify-between p-2">
            <h2 className="text-base font-semibold group-data-[collapsible=icon]:hidden">Chat History</h2>
            <Button variant="ghost" size="icon" onClick={createNewChat} className="group-data-[collapsible=icon]:hidden">
              <Plus className="h-5 w-5" />
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
          <ChatHistory
            sessions={sessions}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            renameSession={renameSession}
            deleteSession={deleteSession}
          />
        </SidebarContent>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/share">
                <SidebarMenuButton>
                  <MonitorPlay />
                  <span>Live Analysis</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex items-center p-4 border-b">
          <SidebarTrigger/>
          <h1 className="text-xl font-semibold ml-4">{activeSession?.title || 'Wizz'}</h1>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages messages={activeSession?.messages || []} />
        </div>
        <div className="p-4 border-t bg-transparent">
          <div className="max-w-4xl mx-auto">
             {activeSession && (
                <ChatInput 
                  personas={personas}
                  activePersonaId={activeSession.personaId}
                  onPersonaChange={setSessionPersonaId}
                  onPersonasChange={handlePersonasChange}
                  onMessageSubmit={handleMessageSubmit}
                  isLoading={isLoading}
                />
            )}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}


export function ChatLayout() {
  return (
    <SidebarProvider>
      <ChatLayoutContent />
    </SidebarProvider>
  )
}
