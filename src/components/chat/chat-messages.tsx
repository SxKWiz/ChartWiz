
'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import type { Message, Recommendation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Volume2, VolumeX, AlertTriangle, Scale, TrendingUp, TrendingDown, CircleDot, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ChatMessagesProps {
  messages: Message[];
  isSoundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
}

// Enhanced recommendation card component with modern design
const RecommendationCard = memo(({ recommendation }: { recommendation: Recommendation }) => (
  <TooltipProvider>
    <Card className="bg-gradient-to-br from-card/80 to-card/40 border border-border/50 shadow-lg backdrop-blur-sm animate-scale-in hover:shadow-xl transition-all duration-300 group">
      <CardHeader className="pb-4 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">Trade Recommendation</CardTitle>
        </div>
        {recommendation.riskRewardRatio && (
           <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-primary/30 hover:border-primary/50 transition-colors duration-200">
                <Scale className="h-3 w-3" />
                <span>R/R: {recommendation.riskRewardRatio}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Risk/Reward Ratio</p>
            </TooltipContent>
          </Tooltip>
        )}
      </CardHeader>
      <CardContent className="text-sm space-y-6">
        
        <div className="flex items-start gap-4 p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors duration-200">
          <div className="p-2 rounded-full bg-green-500/10">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-green-500 mb-2 flex items-center gap-2">
              Entry Price
              <Sparkles className="h-3 w-3 animate-pulse" />
            </div>
            <div className="font-mono text-lg text-green-600 dark:text-green-400 mb-2">{recommendation.entryPrice.value}</div>
            <div className="text-muted-foreground text-xs leading-relaxed">{recommendation.entryPrice.reason}</div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors duration-200">
          <div className="p-2 rounded-full bg-blue-500/10">
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-blue-500 mb-3 flex items-center gap-2">
              Take Profit Targets
              <Badge variant="secondary" className="text-xs px-2 py-0.5">{recommendation.takeProfit.length}</Badge>
            </div>
            <div className="space-y-3">
              {recommendation.takeProfit.map((tp, index) => (
                <div key={index} className="relative pl-4 pb-3 last:pb-0">
                  <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-blue-500"></div>
                  {index < recommendation.takeProfit.length - 1 && (
                    <div className="absolute left-0.5 top-3 w-0.5 h-full bg-blue-500/30"></div>
                  )}
                  <div className="font-mono text-base text-blue-600 dark:text-blue-400 font-medium">
                    Target {index + 1}: {tp.value}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1 leading-relaxed">{tp.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors duration-200">
          <div className="p-2 rounded-full bg-red-500/10">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-red-500 mb-2 flex items-center gap-2">
              Stop Loss
              <AlertTriangle className="h-3 w-3" />
            </div>
            <div className="font-mono text-lg text-red-600 dark:text-red-400 mb-2">{recommendation.stopLoss.value}</div>
            <div className="text-muted-foreground text-xs leading-relaxed">{recommendation.stopLoss.reason}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </TooltipProvider>
));

RecommendationCard.displayName = 'RecommendationCard';

// Enhanced alternative scenario component
const AlternativeScenario = memo(({ scenario }: { scenario: string }) => (
  <Alert className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 animate-slide-up hover:shadow-md transition-all duration-200">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-full bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </div>
      <AlertTitle className="text-amber-600 dark:text-amber-400 font-semibold">Alternative Scenario</AlertTitle>
    </div>
    <AlertDescription className="text-amber-700 dark:text-amber-300 mt-3 leading-relaxed">
      {scenario}
    </AlertDescription>
  </Alert>
));

AlternativeScenario.displayName = 'AlternativeScenario';

// Enhanced message component with improved styling
const MessageComponent = memo(({ message, index }: { message: Message; index: number }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex gap-4 p-6 animate-fade-in', isUser ? 'justify-end' : 'justify-start')} style={{ animationDelay: `${index * 0.1}s` }}>
      {!isUser && (
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex flex-col gap-3 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-5 py-3 text-sm shadow-sm transition-all duration-200 hover:shadow-md',
            isUser
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto'
              : 'bg-gradient-to-br from-muted/80 to-muted/40 text-foreground border border-border/50 backdrop-blur-sm'
          )}
        >
          {typeof message.content === 'string' ? (
            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
          ) : (
            message.content
          )}
          
          {message.imagePreviews && message.imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {message.imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative group">
                  <Image
                    src={preview}
                    alt={`Uploaded image ${idx + 1}`}
                    width={220}
                    height={220}
                    className="rounded-xl object-cover shadow-md group-hover:shadow-lg transition-all duration-200 border border-border/30"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Ss6EtJYXTtxvN0+F1KkjHm9N4xvFvnLcXNJHKwiRGhRCyRKQqjHCgYAx7jYRUQ4ixTHc7f+9XPJKUVV8HhqxvBgPxX9Hx+MtgwQhGCCGCgEYwR5BBGMg7g8gggjqDqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZ/9k="
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {!isUser && message.recommendation && (
          <div className="w-full max-w-2xl">
            <RecommendationCard recommendation={message.recommendation} />
          </div>
        )}
        
        {!isUser && message.alternativeScenario && (
          <div className="w-full max-w-2xl">
            <AlternativeScenario scenario={message.alternativeScenario} />
          </div>
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-secondary/20 hover:ring-secondary/40 transition-all duration-200">
          <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-lg">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

MessageComponent.displayName = 'MessageComponent';

export const ChatMessages = memo(({ messages, isSoundEnabled, onSoundToggle }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize the messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Optimize rendering for large message lists
  const messageElements = useMemo(() => 
    memoizedMessages.map((message, index) => (
      <MessageComponent key={message.id} message={message} index={index} />
    )), 
    [memoizedMessages]
  );

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <Bot className="h-16 w-16 mx-auto opacity-50" />
            <div className="absolute inset-0 h-16 w-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm opacity-70">Start a conversation by uploading a chart or asking a question!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-4">
          {messageElements}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;
