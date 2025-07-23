
'use client';

import React, { useState } from 'react';
import type { ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2 } from 'lucide-react';

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

  return (
    <>
      <ScrollArea className="h-full px-2">
        <SidebarMenu>
          {sessions.map((session) => (
            <ContextMenu key={session.id}>
              <ContextMenuTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveSessionId(session.id)}
                    isActive={activeSessionId === session.id}
                    className="w-full text-left justify-start"
                  >
                    <span className="truncate">{session.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleRenameClick(session)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Rename</span>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => handleDeleteClick(session)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </SidebarMenu>
      </ScrollArea>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new chat title"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              maxLength={25}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat session "{sessionToEdit?.title}". This action cannot be undone.
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
    </>
  );
}
