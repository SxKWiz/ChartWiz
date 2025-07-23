
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
  prompt: `You are Wizz, a helpful AI assistant specializing in cryptocurrency. Answer the user's question concisely.

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
