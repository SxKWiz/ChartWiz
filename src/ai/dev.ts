import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-chart-image.ts';
import '@/ai/flows/summarize-chat-history.ts';
import '@/ai/flows/text-chat-flow.ts';
import '@/ai/flows/text-to-speech-flow.ts';
import '@/ai/flows/scan-for-patterns-flow.ts';
