'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Trash2, 
  Download, 
  RefreshCw,
  Target,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChartPoint {
  x: number;
  y: number;
  price?: number;
  timestamp?: number;
}

export interface PatternAnnotation {
  id: string;
  type: 'support' | 'resistance' | 'trendline' | 'pattern' | 'fibonacci' | 'volume' | 'signal';
  name: string;
  description: string;
  confidence: number;
  points: ChartPoint[];
  style: {
    color: string;
    strokeWidth: number;
    strokeDasharray?: string;
    fillOpacity?: number;
  };
  visible: boolean;
  aiGenerated: boolean;
  metadata?: {
    patternType?: string;
    direction?: 'bullish' | 'bearish' | 'neutral';
    strength?: number;
    timeframe?: string;
    priceTargets?: number[];
  };
}

export interface AIDrawingData {
  patterns: PatternAnnotation[];
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  trendLines: {
    uptrend: ChartPoint[][];
    downtrend: ChartPoint[][];
  };
  zones: {
    accumulation?: { start: ChartPoint; end: ChartPoint };
    distribution?: { start: ChartPoint; end: ChartPoint };
    demand?: ChartPoint[][];
    supply?: ChartPoint[][];
  };
  fibonacci: {
    retracement?: {
      start: ChartPoint;
      end: ChartPoint;
      levels: { level: number; price: number; point: ChartPoint }[];
    };
    extension?: {
      start: ChartPoint;
      end: ChartPoint;
      levels: { level: number; price: number; point: ChartPoint }[];
    };
  };
  annotations: {
    text: string;
    position: ChartPoint;
    type: 'entry' | 'exit' | 'warning' | 'opportunity';
    color: string;
  }[];
}

interface InteractiveChartOverlayProps {
  imageUrl: string;
  aiDrawingData?: AIDrawingData;
  onChartClick?: (point: ChartPoint) => void;
  onRequestAnalysis?: (clickPoint: ChartPoint) => Promise<AIDrawingData>;
  className?: string;
  enableInteraction?: boolean;
}

export function InteractiveChartOverlay({
  imageUrl,
  aiDrawingData,
  onChartClick,
  onRequestAnalysis,
  className,
  enableInteraction = true
}: InteractiveChartOverlayProps) {
  const [annotations, setAnnotations] = useState<PatternAnnotation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update annotations when AI drawing data changes
  useEffect(() => {
    if (aiDrawingData) {
      const newAnnotations: PatternAnnotation[] = [];

      // Convert support/resistance levels to annotations
      aiDrawingData.keyLevels.support.forEach((price, index) => {
        newAnnotations.push({
          id: `support-${index}`,
          type: 'support',
          name: `Support Level`,
          description: `Key support at $${price.toLocaleString()}`,
          confidence: 85,
          points: [
            { x: 0, y: priceToY(price), price },
            { x: imageDimensions.width, y: priceToY(price), price }
          ],
          style: {
            color: '#22c55e',
            strokeWidth: 2,
            strokeDasharray: '5,5'
          },
          visible: true,
          aiGenerated: true,
          metadata: {
            direction: 'bullish',
            strength: 85
          }
        });
      });

      aiDrawingData.keyLevels.resistance.forEach((price, index) => {
        newAnnotations.push({
          id: `resistance-${index}`,
          type: 'resistance',
          name: `Resistance Level`,
          description: `Key resistance at $${price.toLocaleString()}`,
          confidence: 85,
          points: [
            { x: 0, y: priceToY(price), price },
            { x: imageDimensions.width, y: priceToY(price), price }
          ],
          style: {
            color: '#ef4444',
            strokeWidth: 2,
            strokeDasharray: '5,5'
          },
          visible: true,
          aiGenerated: true,
          metadata: {
            direction: 'bearish',
            strength: 85
          }
        });
      });

      // Convert trendlines
      aiDrawingData.trendLines.uptrend.forEach((line, index) => {
        newAnnotations.push({
          id: `uptrend-${index}`,
          type: 'trendline',
          name: 'Uptrend Line',
          description: 'AI-identified upward trend',
          confidence: 90,
          points: line,
          style: {
            color: '#3b82f6',
            strokeWidth: 3
          },
          visible: true,
          aiGenerated: true,
          metadata: {
            direction: 'bullish',
            strength: 90
          }
        });
      });

      aiDrawingData.trendLines.downtrend.forEach((line, index) => {
        newAnnotations.push({
          id: `downtrend-${index}`,
          type: 'trendline',
          name: 'Downtrend Line',
          description: 'AI-identified downward trend',
          confidence: 90,
          points: line,
          style: {
            color: '#f59e0b',
            strokeWidth: 3
          },
          visible: true,
          aiGenerated: true,
          metadata: {
            direction: 'bearish',
            strength: 90
          }
        });
      });

      // Convert Fibonacci levels
      if (aiDrawingData.fibonacci.retracement) {
        const fib = aiDrawingData.fibonacci.retracement;
        fib.levels.forEach((level) => {
          newAnnotations.push({
            id: `fib-${level.level}`,
            type: 'fibonacci',
            name: `Fibonacci ${level.level}`,
            description: `${level.level} retracement at $${level.price.toLocaleString()}`,
            confidence: 80,
            points: [
              { x: 0, y: level.point.y, price: level.price },
              { x: imageDimensions.width, y: level.point.y, price: level.price }
            ],
            style: {
              color: '#8b5cf6',
              strokeWidth: 1,
              strokeDasharray: '2,2',
              fillOpacity: 0.1
            },
            visible: true,
            aiGenerated: true,
            metadata: {
              patternType: 'fibonacci',
              strength: 80
            }
          });
        });
      }

      setAnnotations(newAnnotations);
    }
  }, [aiDrawingData, imageDimensions]);

  // Helper function to convert price to Y coordinate (simplified)
  const priceToY = useCallback((price: number) => {
    // This would need actual chart data to work properly
    // For now, return a placeholder value
    return imageDimensions.height * 0.5;
  }, [imageDimensions]);

  // Handle canvas click
  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enableInteraction || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickPoint: ChartPoint = { x, y };
    
    onChartClick?.(clickPoint);

    if (onRequestAnalysis) {
      setIsAnalyzing(true);
      try {
        const analysisResult = await onRequestAnalysis(clickPoint);
        // The analysisResult will be handled by the aiDrawingData prop update
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [enableInteraction, onChartClick, onRequestAnalysis]);

  // Draw annotations on canvas
  const drawAnnotations = useCallback(() => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw visible annotations
    annotations.filter(annotation => annotation.visible).forEach(annotation => {
      ctx.strokeStyle = annotation.style.color;
      ctx.lineWidth = annotation.style.strokeWidth;
      
      if (annotation.style.strokeDasharray) {
        const dashArray = annotation.style.strokeDasharray.split(',').map(Number);
        ctx.setLineDash(dashArray);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      
      if (annotation.points.length >= 2) {
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
      }
      
      ctx.stroke();

      // Draw pattern areas with fill
      if (annotation.style.fillOpacity && annotation.points.length > 2) {
        ctx.fillStyle = annotation.style.color + Math.floor(annotation.style.fillOpacity * 255).toString(16);
        ctx.fill();
      }

      // Draw confidence indicator
      if (annotation.aiGenerated) {
        const firstPoint = annotation.points[0];
        ctx.fillStyle = annotation.style.color;
        ctx.font = '12px Arial';
        ctx.fillText(`${annotation.confidence}%`, firstPoint.x + 5, firstPoint.y - 5);
      }
    });

    // Draw analysis indicator if analyzing
    if (isAnalyzing) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.font = '16px Arial';
      ctx.fillText('AI Analyzing...', canvas.width / 2 - 50, canvas.height / 2);
    }
  }, [annotations, imageLoaded, isAnalyzing]);

  // Redraw when annotations change
  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    
    setImageDimensions({
      width: img.clientWidth,
      height: img.clientHeight
    });
    
    setImageLoaded(true);
  }, []);

  const toggleAnnotationVisibility = (id: string) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, visible: !ann.visible } : ann
      )
    );
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
  };

  const getAnnotationIcon = (type: PatternAnnotation['type']) => {
    switch (type) {
      case 'support':
      case 'resistance':
        return <Activity className="h-4 w-4" />;
      case 'trendline':
        return <TrendingUp className="h-4 w-4" />;
      case 'pattern':
        return <Target className="h-4 w-4" />;
      case 'signal':
        return <Zap className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Chart Display */}
      <div ref={containerRef} className="relative border rounded-lg overflow-hidden bg-background">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Trading chart"
          className="w-full h-auto display-block"
          onLoad={handleImageLoad}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          onClick={handleCanvasClick}
          style={{ pointerEvents: enableInteraction ? 'auto' : 'none' }}
        />
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-background rounded-lg p-4 shadow-lg">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium">AI Drawing Analysis...</p>
            </div>
          </div>
        )}
      </div>

      {/* Annotation Controls */}
      {annotations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5" />
                AI Pattern Annotations ({annotations.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllAnnotations}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors",
                  selectedAnnotation === annotation.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-4 h-4 rounded border-2"
                    style={{ backgroundColor: annotation.style.color + '40', borderColor: annotation.style.color }}
                  />
                  {getAnnotationIcon(annotation.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{annotation.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {annotation.confidence}%
                      </Badge>
                      {annotation.aiGenerated && (
                        <Badge variant="outline" className="text-xs">
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {annotation.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAnnotationVisibility(annotation.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {annotation.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {enableInteraction && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Click anywhere on the chart for AI pattern analysis and technical drawings</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}