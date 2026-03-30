import Anthropic from '@anthropic-ai/sdk';
import { ConversationMessage, ReminderCategory, CategorySettings } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const BASE_SYSTEM = `You are CallMe, a warm and energetic AI buddy calling to check in on someone's task.

TONE:
- Casual, upbeat, like a coach who genuinely cares
- Use contractions: "you've", "didn't", "let's", "I'll"
- Short punchy sentences — this is a phone call, not an email
- Celebrate wins! Be understanding about setbacks
- Never robotic, never formal

CALL FLOW:
1. User says yes/done → Celebrate! Ask the category-specific follow-up (if any). Then wrap up warmly.
2. User says no/not yet → Stay encouraging. Offer: "Do it now", "Remind you in 15 minutes", "Pick a new time", or "Cancel it"
3. Handle their choice and close the call.

ALWAYS end your message with exactly one state tag (never spoken aloud):
- Still in conversation: [STATE:ongoing]
- Task completed: [STATE:completed]
- Snoozed 15 min: [STATE:snoozed]
- In progress: [STATE:in_progress]
- Rescheduled: [STATE:rescheduled]
- Cancelled: [STATE:cancelled]`;

function buildCategoryInstructions(
  category: ReminderCategory,
  settings: CategorySettings,
  budgetContext?: { runningTotal: number; dailyLimit: number; checkinsLeft: number },
): string {
  switch (category) {
    case 'workout':
      if (settings.trackWorkouts === false) {
        return 'When user confirms completion: congratulate them briefly and end the call. Do NOT ask for exercise details.';
      }
      return 'When user confirms completion: ask what exercises they did (e.g. "Nice! What did you work on today?"). Log their answer, then end the call warmly.';

    case 'medication':
      if (settings.askMedication) {
        return 'When user confirms they took their medication: ask which medication it was. Log their answer, then end the call.';
      }
      return 'When user confirms they took their medication: just congratulate them and end the call. Do NOT ask which medication (privacy preference).';

    case 'study':
      return 'When user confirms completion: ask two quick questions — what subject they studied, and roughly how long. Then end the call. Example: "Great! What were you studying, and how long did you go for?"';

    case 'budget':
      if (budgetContext) {
        const { runningTotal, dailyLimit, checkinsLeft } = budgetContext;
        const remaining = dailyLimit - runningTotal;
        return `This is a budget check-in call. Daily limit: $${dailyLimit}. Amount spent so far today: $${runningTotal}. Remaining budget: $${remaining}. Check-ins remaining after this one: ${checkinsLeft}.
Ask how much they've spent since the last check-in. After they answer, tell them their new running total and how much they have left for the day. Be encouraging if they're on track, gently cautionary if they're close to the limit.
When done logging their spend, end the call with [STATE:completed].`;
      }
      return 'Ask how much they have spent today. Log the amount, then end the call.';

    case 'general':
    default:
      return 'When user confirms completion: ask if they have any notes to log. Keep it brief.';
  }
}

export async function generateVoiceResponse(
  messages: ConversationMessage[],
  taskName: string,
  scheduledTime: string,
  category: ReminderCategory = 'general',
  settings: CategorySettings = {},
  budgetContext?: { runningTotal: number; dailyLimit: number; checkinsLeft: number },
): Promise<{ text: string; state: string }> {
  const categoryInstructions = buildCategoryInstructions(category, settings, budgetContext);

  const system = `${BASE_SYSTEM}

Reminder: ${taskName} (${scheduledTime})
Category: ${category}

Category-specific instructions:
${categoryInstructions}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const fullText = response.content[0].type === 'text' ? response.content[0].text : '';
  const stateMatch = fullText.match(/\[STATE:(\w+)\]/);
  const state = stateMatch ? stateMatch[1] : 'ongoing';
  const spokenText = fullText.replace(/\[STATE:\w+\]/g, '').trim();

  console.log(`[claude] category=${category} state=${state} text="${spokenText}"`);
  return { text: spokenText, state };
}

/** Extract a dollar amount from free-form speech */
export function extractSpendAmount(speech: string): number | null {
  const match = speech.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : null;
}
