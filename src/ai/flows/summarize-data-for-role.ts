'use server';

/**
 * @fileOverview A Genkit flow that provides a tailored summary of financial data based on user role.
 *
 * - summarizeDataForRole - A function that generates a financial data summary.
 * - SummarizeDataForRoleInput - The input type for the summarizeDataForRole function.
 * - SummarizeDataForRoleOutput - The return type for the summarizeDataForRole function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDataForRoleInputSchema = z.object({
  role: z
    .enum(['Admin', 'Member', 'Finance Professional'])
    .describe('The role of the user requesting the summary.'),
  totalFunds: z.number().describe('The total funds available.'),
  totalExpenditures: z.number().describe('The total expenditures for the current month.'),
  totalContributions: z.number().describe('The total contributions for the current month.'),
  projectCompletionPercentage: z
    .number()
    .describe('The percentage of project completion.'),
  overdueContributionsCount: z
    .number()
    .describe('The number of members with overdue contributions.'),
});
export type SummarizeDataForRoleInput = z.infer<typeof SummarizeDataForRoleInputSchema>;

const SummarizeDataForRoleOutputSchema = z.object({
  summary: z.string().describe('A tailored summary of financial data.'),
});
export type SummarizeDataForRoleOutput = z.infer<typeof SummarizeDataForRoleOutputSchema>;

export async function summarizeDataForRole(input: SummarizeDataForRoleInput): Promise<SummarizeDataForRoleOutput> {
  return summarizeDataForRoleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDataForRolePrompt',
  input: {schema: SummarizeDataForRoleInputSchema},
  output: {schema: SummarizeDataForRoleOutputSchema},
  prompt: `You are an expert financial analyst. Generate a concise financial data summary tailored to the user's role.

  Role: {{{role}}}

  Here's the financial data:
  - Total Funds: {{{totalFunds}}}
  - Total Expenditures (Current Month): {{{totalExpenditures}}}
  - Total Contributions (Current Month): {{{totalContributions}}}
  - Project Completion: {{{projectCompletionPercentage}}}%
  - Overdue Contributions Count: {{{overdueContributionsCount}}}

  {{#equal role "Admin"}}
  Focus on overall financial health, project progress, and potential issues like overdue contributions. Highlight key metrics and trends.
  {{/equal}}

  {{#equal role "Member"}}
  Focus on contributions, project progress, and the overall financial status of the investment.
  {{/equal}}

  {{#equal role "Finance Professional"}}
  Provide a detailed summary, including all data points. Analyze financial performance, identify trends, and suggest areas for improvement.
  {{/equal}}
  \n  Summary:
  `,
});

const summarizeDataForRoleFlow = ai.defineFlow(
  {
    name: 'summarizeDataForRoleFlow',
    inputSchema: SummarizeDataForRoleInputSchema,
    outputSchema: SummarizeDataForRoleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
