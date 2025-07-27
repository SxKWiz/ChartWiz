
'use server';

/**
 * @fileOverview A simple text-based chat flow.
 *
 * - textChat - A function that handles general text questions.
 * - TextChatInput - The input type for the textChat function.
 * - TextChatOutput - The return type for the textChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TextChatInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
});
export type TextChatInput = z.infer<typeof TextChatInputSchema>;

const TextChatOutputSchema = z.object({
  answer: z.string().describe('The AI\'s answer to the question.'),
});
export type TextChatOutput = z.infer<typeof TextChatOutputSchema>;

export async function textChat(input: TextChatInput): Promise<TextChatOutput> {
  return textChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'textChatPrompt',
  input: {schema: TextChatInputSchema},
  output: {schema: TextChatOutputSchema},
  prompt: `You are Wizz, a helpful AI assistant specializing in cryptocurrency and trading. Answer the user's question comprehensively and accurately.

**Your Expertise:**
- Cryptocurrency markets and trading
- Technical analysis and chart patterns
- Market sentiment and trends
- Trading strategies and risk management
- Blockchain technology and DeFi
- General financial and investment topics

**Response Guidelines:**
- Provide detailed, accurate information
- Use emojis and formatting to make responses engaging
- Include practical insights and actionable advice when appropriate
- Be educational and explain complex concepts clearly
- If asked about current prices, mention that real-time data is available through the crypto price analysis feature

Question: {{{question}}}
`,
});

const textChatFlow = ai.defineFlow(
  {
    name: 'textChatFlow',
    inputSchema: TextChatInputSchema,
    outputSchema: TextChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
