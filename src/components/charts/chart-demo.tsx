'use client';

import React, { useState } from 'react';
import { InteractiveChartOverlay, type AIDrawingData, type ChartPoint } from './interactive-chart-overlay';
import { generateChartDrawingAnalysis } from '@/app/actions';
import { convertAIAnalysisToDrawingData } from '@/lib/chart-drawing-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sample chart image data URI (simple candlestick chart pattern)
const SAMPLE_CHART_DATA_URI = 'data:image/svg+xml;base64,' + btoa(`
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .background { fill: #1a1a1a; }
      .grid { stroke: #333; stroke-width: 1; }
      .axis { stroke: #666; stroke-width: 2; }
      .candle-up { fill: #22c55e; stroke: #22c55e; }
      .candle-down { fill: #ef4444; stroke: #ef4444; }
      .text { fill: #ccc; font-family: Arial; font-size: 12px; }
      .volume { fill: #666; opacity: 0.6; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect class="background" width="800" height="600"/>
  
  <!-- Grid -->
  <g class="grid">
    <!-- Horizontal grid lines -->
    <line x1="80" y1="100" x2="750" y2="100"/>
    <line x1="80" y1="150" x2="750" y2="150"/>
    <line x1="80" y1="200" x2="750" y2="200"/>
    <line x1="80" y1="250" x2="750" y2="250"/>
    <line x1="80" y1="300" x2="750" y2="300"/>
    <line x1="80" y1="350" x2="750" y2="350"/>
    <line x1="80" y1="400" x2="750" y2="400"/>
    
    <!-- Vertical grid lines -->
    <line x1="150" y1="80" x2="150" y2="420"/>
    <line x1="250" y1="80" x2="250" y2="420"/>
    <line x1="350" y1="80" x2="350" y2="420"/>
    <line x1="450" y1="80" x2="450" y2="420"/>
    <line x1="550" y1="80" x2="550" y2="420"/>
    <line x1="650" y1="80" x2="650" y2="420"/>
  </g>
  
  <!-- Axes -->
  <line class="axis" x1="80" y1="80" x2="80" y2="420"/>
  <line class="axis" x1="80" y1="420" x2="750" y2="420"/>
  
  <!-- Price labels -->
  <text class="text" x="70" y="105" text-anchor="end">52000</text>
  <text class="text" x="70" y="155" text-anchor="end">51000</text>
  <text class="text" x="70" y="205" text-anchor="end">50000</text>
  <text class="text" x="70" y="255" text-anchor="end">49000</text>
  <text class="text" x="70" y="305" text-anchor="end">48000</text>
  <text class="text" x="70" y="355" text-anchor="end">47000</text>
  <text class="text" x="70" y="405" text-anchor="end">46000</text>
  
  <!-- Sample candlesticks forming an uptrend -->
  <!-- Candle 1 -->
  <line class="candle-up" x1="120" y1="380" x2="120" y2="320" stroke-width="1"/>
  <rect class="candle-up" x="115" y="340" width="10" height="30"/>
  
  <!-- Candle 2 -->
  <line class="candle-down" x1="140" y1="360" x2="140" y2="310" stroke-width="1"/>
  <rect class="candle-down" x="135" y="330" width="10" height="20"/>
  
  <!-- Candle 3 -->
  <line class="candle-up" x1="160" y1="340" x2="160" y2="280" stroke-width="1"/>
  <rect class="candle-up" x="155" y="300" width="10" height="30"/>
  
  <!-- Candle 4 -->
  <line class="candle-up" x1="180" y1="320" x2="180" y2="260" stroke-width="1"/>
  <rect class="candle-up" x="175" y="280" width="10" height="30"/>
  
  <!-- Candle 5 (Doji) -->
  <line class="candle-up" x1="200" y1="300" x2="200" y2="240" stroke-width="1"/>
  <rect class="candle-up" x="195" y="270" width="10" height="2"/>
  
  <!-- Candle 6 -->
  <line class="candle-up" x1="220" y1="280" x2="220" y2="220" stroke-width="1"/>
  <rect class="candle-up" x="215" y="240" width="10" height="30"/>
  
  <!-- Volume bars -->
  <rect class="volume" x="115" y="450" width="10" height="30"/>
  <rect class="volume" x="135" y="460" width="10" height="20"/>
  <rect class="volume" x="155" y="440" width="10" height="40"/>
  <rect class="volume" x="175" y="445" width="10" height="35"/>
  <rect class="volume" x="195" y="470" width="10" height="10"/>
  <rect class="volume" x="215" y="430" width="10" height="50"/>
  
  <!-- Title -->
  <text class="text" x="400" y="30" text-anchor="middle" font-size="16" font-weight="bold">BTC/USD - Sample Chart</text>
</svg>
`);

interface ChartDemoProps {
  onClose?: () => void;
}

export function ChartDemo({ onClose }: ChartDemoProps) {
  const [aiDrawingData, setAiDrawingData] = useState<AIDrawingData | undefined>(undefined);

  const handleAnalysis = async (clickPoint: ChartPoint): Promise<AIDrawingData> => {
    try {
      const analysisResult = await generateChartDrawingAnalysis(
        SAMPLE_CHART_DATA_URI,
        clickPoint,
        800,
        600,
        'comprehensive'
      );
      
      const drawingData = convertAIAnalysisToDrawingData(analysisResult);
      setAiDrawingData(drawingData);
      
      return drawingData;
    } catch (error) {
      console.error('Demo analysis failed:', error);
      // Return sample drawing data for demo purposes
      const sampleDrawingData: AIDrawingData = {
        patterns: [],
        keyLevels: {
          support: [47000, 48500],
          resistance: [50000, 51500]
        },
        trendLines: {
          uptrend: [[
            { x: 120, y: 380, price: 47000 },
            { x: 220, y: 220, price: 50500 }
          ]],
          downtrend: []
        },
        zones: {},
        fibonacci: {},
        annotations: [{
          text: 'Demo Support Level',
          position: { x: clickPoint.x, y: clickPoint.y },
          type: 'info',
          color: '#22c55e'
        }]
      };
      
      setAiDrawingData(sampleDrawingData);
      return sampleDrawingData;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Interactive Chart Drawing Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <InteractiveChartOverlay
            imageUrl={SAMPLE_CHART_DATA_URI}
            aiDrawingData={aiDrawingData}
            onRequestAnalysis={handleAnalysis}
            enableInteraction={true}
          />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAiDrawingData(undefined)}
            >
              Clear Drawings
            </Button>
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close Demo
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}