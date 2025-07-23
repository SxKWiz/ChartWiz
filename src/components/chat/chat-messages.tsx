
'use client';

import React, { useEffect, useRef } from 'react';
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

const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => (
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
            <CircleDot className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="font-medium">Entry Price: {recommendation.entryPrice.value}</span>
            <p className="text-xs text-muted-foreground">{recommendation.entryPrice.reason}</p>
          </div>
        </div>

        <div>
          <div className="flex items-start gap-3 mb-2">
             <div className="pt-0.5">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <span className="font-medium">Take Profit Targets</span>
          </div>
          <div className="space-y-3 pl-7">
            {recommendation.takeProfit.map((tp, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="pt-0.5">
                   <div className="w-4 h-4 text-xs flex items-center justify-center rounded-full bg-green-400/20 text-green-500 font-bold">{index+1}</div>
                </div>
                <div>
                   <span className="font-medium text-foreground">{tp.value}</span>
                  <p className="text-xs text-muted-foreground">{tp.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <span className="font-medium">Stop Loss: {recommendation.stopLoss.value}</span>
            <p className="text-xs text-muted-foreground">{recommendation.stopLoss.reason}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  </TooltipProvider>
);

export function ChatMessages({ messages, isSoundEnabled, onSoundToggle }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === 'assistant' &&
      lastMessage.audioDataUri &&
      lastMessage.isSoundEnabled &&
      audioRef.current
    ) {
      audioRef.current.src = lastMessage.audioDataUri;
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
    }
  }, [messages]);

  return (
    <div ref={scrollAreaRef} className="h-full overflow-y-auto">
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex items-start gap-4',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                <AvatarFallback>
                  <Bot />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={cn(
              'max-w-2xl rounded-2xl group relative',
              message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none',
              (message.content || !message.imagePreviews) && 'p-4'
            )}>
              <div className="space-y-4">
                 {message.imagePreviews && (
                  <div className={cn("flex flex-wrap gap-2", !message.content && "p-2")}>
                    {message.imagePreviews.map((preview, idx) => (
                       <div key={idx} className="relative w-36 h-auto">
                        <Image
                          src={preview}
                          alt="Chart preview"
                          width={144}
                          height={90}
                          className="rounded-lg object-cover"
                          data-ai-hint="chart graph"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {message.content && typeof message.content === 'string' && <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>}
                {message.recommendation && (
                  <RecommendationCard recommendation={message.recommendation} />
                )}
                 {message.alternativeScenario && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Alternative Scenario</AlertTitle>
                    <AlertDescription>
                      {message.alternativeScenario}
                    </AlertDescription>
                  </Alert>
                 )}
                 {index === messages.length - 1 && onSoundToggle && message.role === 'assistant' && typeof message.content === 'string' && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSoundToggle(!isSoundEnabled)}>
                            {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSoundEnabled ? 'Disable audio response' : 'Enable audio response'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>

            {message.role === 'user' && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>
      <audio ref={audioRef} />
    </div>
  );
}
