'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle, TrendingUp, Brain, Target, Timer } from 'lucide-react';
import type { 
  EnhancedConfidenceAnalysisOutput, 
  IntelligentTimingAnalysisOutput, 
  TradingKnowledgeResponse 
} from '@/ai/flows/enhanced-confidence-ai-brain';

interface EnhancedAiResponseProps {
  enhancedConfidenceAnalysis?: EnhancedConfidenceAnalysisOutput;
  timingAnalysis?: IntelligentTimingAnalysisOutput;
  tradingKnowledge?: TradingKnowledgeResponse;
  needsFollowUp?: boolean;
  followUpRequest?: string;
  estimatedWaitTime?: string;
  onFollowUpRequest?: () => void;
}

export function EnhancedAiResponse({
  enhancedConfidenceAnalysis,
  timingAnalysis,
  tradingKnowledge,
  needsFollowUp,
  followUpRequest,
  estimatedWaitTime,
  onFollowUpRequest
}: EnhancedAiResponseProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);

  if (!enhancedConfidenceAnalysis && !timingAnalysis && !tradingKnowledge) {
    return null;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      {/* Confidence Assessment */}
      {enhancedConfidenceAnalysis && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              Confidence Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(enhancedConfidenceAnalysis.confidenceAssessment.overallConfidence)}`}>
                  {enhancedConfidenceAnalysis.confidenceAssessment.overallConfidence}%
                </div>
                <div className="text-sm text-gray-600">Overall Confidence</div>
                <Progress 
                  value={enhancedConfidenceAnalysis.confidenceAssessment.overallConfidence} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(enhancedConfidenceAnalysis.confidenceAssessment.technicalConfidence)}`}>
                  {enhancedConfidenceAnalysis.confidenceAssessment.technicalConfidence}%
                </div>
                <div className="text-sm text-gray-600">Technical</div>
                <Progress 
                  value={enhancedConfidenceAnalysis.confidenceAssessment.technicalConfidence} 
                  className="mt-2"
                />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(enhancedConfidenceAnalysis.confidenceAssessment.timingConfidence)}`}>
                  {enhancedConfidenceAnalysis.confidenceAssessment.timingConfidence}%
                </div>
                <div className="text-sm text-gray-600">Timing</div>
                <Progress 
                  value={enhancedConfidenceAnalysis.confidenceAssessment.timingConfidence} 
                  className="mt-2"
                />
              </div>
            </div>

            {enhancedConfidenceAnalysis.confidenceAssessment.requiresConfirmation && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Additional Confirmation Required:</strong> The AI has identified uncertainty factors that require your attention before proceeding.
                </AlertDescription>
              </Alert>
            )}

            {enhancedConfidenceAnalysis.confidenceAssessment.uncertaintyFactors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uncertainty Factors:</h4>
                <ul className="text-sm space-y-1">
                  {enhancedConfidenceAnalysis.confidenceAssessment.uncertaintyFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timing Analysis */}
      {timingAnalysis && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-purple-500" />
              Timing Optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Entry Timing Recommendation</div>
                <div className="text-sm text-gray-600">
                  {timingAnalysis.timingRecommendation.entryTiming.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <Badge variant={
                timingAnalysis.timingRecommendation.entryTiming === 'immediate' ? 'default' :
                timingAnalysis.timingRecommendation.entryTiming === 'avoid_now' ? 'destructive' : 'secondary'
              }>
                {timingAnalysis.timingRecommendation.confidence}% Confidence
              </Badge>
            </div>

            <div className="text-sm text-gray-700">
              {timingAnalysis.timingRecommendation.reasoning}
            </div>

            {timingAnalysis.followUpRequest.needsFollowUp && (
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Follow-up Required:</strong> {timingAnalysis.followUpRequest.followUpReason}
                  {timingAnalysis.followUpRequest.estimatedWaitMinutes && (
                    <div className="mt-2 font-semibold">
                      Estimated wait time: {timingAnalysis.followUpRequest.estimatedWaitMinutes} minutes
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Detailed Timing Analysis
            </Button>

            {showDetails && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Risk Assessment:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">Early Entry Risk: 
                        <Badge variant="outline" className="ml-2">
                          {timingAnalysis.timingRecommendation.riskOfEarlyEntry.level}
                        </Badge>
                      </div>
                      <div className="text-gray-600">
                        {timingAnalysis.timingRecommendation.riskOfEarlyEntry.potentialLoss}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Delayed Entry Risk:
                        <Badge variant="outline" className="ml-2">
                          {timingAnalysis.timingRecommendation.riskOfDelayedEntry.level}
                        </Badge>
                      </div>
                      <div className="text-gray-600">
                        {timingAnalysis.timingRecommendation.riskOfDelayedEntry.potentialMissedGain}
                      </div>
                    </div>
                  </div>
                </div>

                {timingAnalysis.contingencyPlans.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Contingency Plans:</h4>
                    <div className="space-y-2">
                      {timingAnalysis.contingencyPlans.map((plan, index) => (
                        <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{plan.scenario}</div>
                          <div className="text-gray-600">{plan.action}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Trigger: {plan.triggerLevel} | Timeframe: {plan.timeframe}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trading Knowledge Response */}
      {tradingKnowledge && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Trading Knowledge & Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tradingKnowledge.keyConceptsExplained.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Concepts:</h4>
                <div className="space-y-2">
                  {tradingKnowledge.keyConceptsExplained.map((concept, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="font-medium text-sm">{concept.concept}</div>
                      <div className="text-sm text-gray-700 mt-1">{concept.definition}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <strong>Application:</strong> {concept.application}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tradingKnowledge.commonMistakes.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Common Mistakes to Avoid:</h4>
                <div className="space-y-2">
                  {tradingKnowledge.commonMistakes.map((mistake, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="font-medium text-sm text-red-800">{mistake.mistake}</div>
                      <div className="text-sm text-red-700 mt-1">{mistake.why}</div>
                      <div className="text-xs text-red-600 mt-1">
                        <strong>How to avoid:</strong> {mistake.howToAvoid}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tradingKnowledge.actionableAdvice.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Actionable Advice:</h4>
                <ul className="space-y-1">
                  {tradingKnowledge.actionableAdvice.map((advice, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tradingKnowledge.riskWarnings.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Risk Warnings:</strong>
                  <ul className="mt-2 space-y-1">
                    {tradingKnowledge.riskWarnings.map((warning, index) => (
                      <li key={index} className="text-sm">• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Request */}
      {needsFollowUp && followUpRequest && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Additional Analysis Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              {followUpRequest}
            </div>
            
            {estimatedWaitTime && (
              <Badge variant="outline" className="text-orange-700">
                <Clock className="h-3 w-3 mr-1" />
                Wait time: {estimatedWaitTime}
              </Badge>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={onFollowUpRequest}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Upload Additional Charts
              </Button>
              <Button variant="outline">
                Proceed with Current Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Acknowledgment */}
      {(enhancedConfidenceAnalysis?.riskFactors.length || 0) > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {enhancedConfidenceAnalysis?.riskFactors.map((risk, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm text-red-800">{risk.factor}</div>
                    <Badge variant={
                      risk.severity === 'critical' ? 'destructive' :
                      risk.severity === 'high' ? 'destructive' :
                      risk.severity === 'medium' ? 'secondary' : 'outline'
                    }>
                      {risk.severity} ({risk.probability}%)
                    </Badge>
                  </div>
                  <div className="text-sm text-red-700">{risk.mitigation}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="acknowledge-risks"
                checked={acknowledgedRisks}
                onChange={(e) => setAcknowledgedRisks(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="acknowledge-risks" className="text-sm text-gray-700">
                I acknowledge and understand these risk factors
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}