'use server';/**
 * @fileOverview A flow for generating email responses based on lead profile and history.
 *
 * - generateEmailResponse - A function that handles the email response generation process.
 * - AIGeneratedEmailInput - The input type for the generateEmailResponse function.
 * - AIGeneratedEmailOutput - The return type for the generateEmailResponse function.
 */import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIGeneratedEmailInputSchema = z.object({
  leadProfile: z
    .string()
    .describe('The profile of the lead, including their background and interests.'),
  interactionHistory: z
    .string()
    .describe('The history of interactions with the lead.'),
  previousEmail: z.string().describe('The content of the previous email sent.'),
});
export type AIGeneratedEmailInput = z.infer<typeof AIGeneratedEmailInputSchema>;

const AIGeneratedEmailOutputSchema = z.object({
  response: z.string().describe('The AI-generated email response.'),
});
export type AIGeneratedEmailOutput = z.infer<typeof AIGeneratedEmailOutputSchema>;

export async function generateEmailResponse(
  input: AIGeneratedEmailInput
): Promise<AIGeneratedEmailOutput> {
  return generateEmailResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiGeneratedEmailResponsePrompt',
  input: {schema: AIGeneratedEmailInputSchema},
  output: {schema: AIGeneratedEmailOutputSchema},
  prompt: `You are an AI assistant helping a sales representative generate an email response to a lead.\n\nGiven the lead's profile, the interaction history, and the previous email, generate a personalized email response that nurtures the relationship and progresses them toward a sale.\n\nLead Profile: {{{leadProfile}}}\nInteraction History: {{{interactionHistory}}}\nPrevious Email: {{{previousEmail}}}\n\nResponse:`,
});

const generateEmailResponseFlow = ai.defineFlow(
  {
    name: 'generateEmailResponseFlow',
    inputSchema: AIGeneratedEmailInputSchema,
    outputSchema: AIGeneratedEmailOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);