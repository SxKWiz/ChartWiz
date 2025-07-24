
'use client';

import React, { useEffect, useRef, useMemo, memo } from 'react';
import Image from 'next/image';
import type { Message, Recommendation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Volume2, VolumeX, AlertTriangle, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, CircleDot } from 'lucide-react';
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

// Memoized recommendation card component
const RecommendationCard = memo(({ recommendation }: { recommendation: Recommendation }) => (
  <TooltipProvider>
    <Card className="bg-background/30 border-border/50">
      <CardHeader className="pb-4 flex-row items-center justify-between">
        <CardTitle className="text-base">Trade Recommendation</CardTitle>
        {recommendation.riskRewardRatio && (
           <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-2 text-xs">
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
      <CardContent className="text-sm space-y-4">
        
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-green-500 mb-1">Entry Price</div>
            <div className="font-mono text-green-500">{recommendation.entryPrice.value}</div>
            <div className="text-muted-foreground mt-1">{recommendation.entryPrice.reason}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-blue-500 mb-2">Take Profit Targets</div>
            <div className="space-y-2">
              {recommendation.takeProfit.map((tp, index) => (
                <div key={index} className="border-l-2 border-blue-500/30 pl-3">
                  <div className="font-mono text-blue-500">Target {index + 1}: {tp.value}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">{tp.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-red-500 mb-1">Stop Loss</div>
            <div className="font-mono text-red-500">{recommendation.stopLoss.value}</div>
            <div className="text-muted-foreground mt-1">{recommendation.stopLoss.reason}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </TooltipProvider>
));

RecommendationCard.displayName = 'RecommendationCard';

// Memoized alternative scenario component
const AlternativeScenario = memo(({ scenario }: { scenario: string }) => (
  <Alert className="border-amber-500/50 bg-amber-500/5">
    <AlertTriangle className="h-4 w-4 text-amber-500" />
    <AlertTitle className="text-amber-500">Alternative Scenario</AlertTitle>
    <AlertDescription className="text-amber-700 dark:text-amber-300">
      {scenario}
    </AlertDescription>
  </Alert>
));

AlternativeScenario.displayName = 'AlternativeScenario';

// Memoized message component
const MessageComponent = memo(({ message, index }: { message: Message; index: number }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {typeof message.content === 'string' ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            message.content
          )}
          
          {message.imagePreviews && message.imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={preview}
                    alt={`Uploaded image ${idx + 1}`}
                    width={200}
                    height={200}
                    className="rounded-md object-cover"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Ss6EtJYXTtxvN0+F1KkjHm9N4xvFvnLcXNJHKwiRGhRCyRKQqjHCgYAx7jYRUQ4ixTHc7f+9XPJKUVV8HhqxvBgPxX9Hx+MtgwQhGCCGCgEYwR5BBGMg7g8gggjqDqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZKqzZHJCGCgEYwR5BBGMg7g8gggjqDrqEYZ/9k="
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {!isUser && message.recommendation && (
          <RecommendationCard recommendation={message.recommendation} />
        )}
        
        {!isUser && message.alternativeScenario && (
          <AlternativeScenario scenario={message.alternativeScenario} />
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
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
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No messages yet. Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messageElements}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;
