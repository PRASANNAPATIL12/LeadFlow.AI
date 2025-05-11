'use server';/**
 * @fileOverview A lead scoring summary AI agent.
 *
 * - leadScoringSummary - A function that handles the lead scoring summary process.
 * - LeadScoringSummaryInput - The input type for the leadScoringSummary function.
 * - LeadScoringSummaryOutput - The return type for the leadScoringSummary function.
 */import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LeadScoringSummaryInputSchema = z.object({
  leadName: z.string().describe("The name of the lead."),
  company: z.string().describe("The lead's company."),
  title: z.string().describe("The lead's title."),
  industry: z.string().describe("The lead's industry."),
  engagementHistory: z.string().describe('A summary of the lead\'s engagement history.'),
});
export type LeadScoringSummaryInput = z.infer<
  typeof LeadScoringSummaryInputSchema
>;

const LeadScoringSummaryOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the lead\'s key attributes and engagement history.'),
});
export type LeadScoringSummaryOutput = z.infer<
  typeof LeadScoringSummaryOutputSchema
>;

export async function leadScoringSummary(
  input: LeadScoringSummaryInput
): Promise<LeadScoringSummaryOutput> {
  return leadScoringSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'leadScoringSummaryPrompt',
  input: {schema: LeadScoringSummaryInputSchema},
  output: {schema: LeadScoringSummaryOutputSchema},
  prompt: `You are a sales assistant. Summarize the lead provided in order to quickly understand their potential and tailor your approach.

Lead Name: {{{leadName}}}
Company: {{{company}}}
Title: {{{title}}}
Industry: {{{industry}}}
Engagement History: {{{engagementHistory}}}

Summary: `,
});

const leadScoringSummaryFlow = ai.defineFlow(
  {
    name: 'leadScoringSummaryFlow',
    inputSchema: LeadScoringSummaryInputSchema,
    outputSchema: LeadScoringSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
