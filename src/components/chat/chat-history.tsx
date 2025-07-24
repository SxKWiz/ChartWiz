
'use client';

import React, { useState } from 'react';
import type { ChatSession } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
}

export function ChatHistory({
  sessions,
  activeSessionId,
  setActiveSessionId,
  renameSession,
  deleteSession,
}: ChatHistoryProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<ChatSession | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleRenameClick = (session: ChatSession) => {
    setSessionToEdit(session);
    setNewTitle(session.title);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (sessionToEdit && newTitle.trim()) {
      renameSession(sessionToEdit.id, newTitle.trim());
      setRenameDialogOpen(false);
      setSessionToEdit(null);
    }
  };

  const handleDeleteClick = (session: ChatSession) => {
    setSessionToEdit(session);
    setDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (sessionToEdit) {
      deleteSession(sessionToEdit.id);
      setDeleteAlertOpen(false);
      setSessionToEdit(null);
    }
  };

  // Format relative time for session
  const formatRelativeTime = (sessionId: string) => {
    // Simple time formatting - in a real app, you'd use the actual timestamp
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === 0) return 'Now';
    if (index < 3) return `${index}h ago`;
    return `${index}d ago`;
  };

  return (
    <>
      <ScrollArea className="h-full">
        <SidebarMenu className="gap-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground animate-fade-in">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs opacity-70">Start a new conversation</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <SidebarMenuItem key={session.id} className="group animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <SidebarMenuButton
                  onClick={() => setActiveSessionId(session.id)}
                  isActive={activeSessionId === session.id}
                  className={cn(
                    "w-full text-left justify-start p-3 rounded-xl transition-all duration-200 hover:bg-sidebar-accent/70 group-hover:shadow-md",
                    activeSessionId === session.id && "bg-sidebar-accent shadow-lg ring-1 ring-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3 w-full min-w-0">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0 transition-colors duration-200",
                      activeSessionId === session.id 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "truncate font-medium text-sm transition-colors duration-200",
                          activeSessionId === session.id 
                            ? "text-sidebar-primary" 
                            : "text-sidebar-foreground/90 group-hover:text-sidebar-primary"
                        )}>
                          {session.title}
                        </span>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all duration-200 gap-1">
                          <div
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-sidebar-accent hover:text-primary transition-colors duration-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameClick(session);
                            }}
                            title="Rename chat"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </div>
                          <div
                            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(session);
                            }}
                            title="Delete chat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground/80">
                          {formatRelativeTime(session.id)}
                        </span>
                        <span className="text-xs text-muted-foreground/60">•</span>
                        <span className="text-xs text-muted-foreground/80">
                          {session.messages.length} messages
                        </span>
                      </div>
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </ScrollArea>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Rename Chat
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new chat title"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              maxLength={25}
              className="focus-ring"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {newTitle.length}/25 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRenameSubmit} 
              disabled={!newTitle.trim()}
              className="btn-hover-lift"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="glass-effect">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Chat
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sessionToEdit?.title}"? This will permanently remove all messages in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 btn-hover-lift"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
