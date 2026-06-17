import type { GuestProfile, LambdaResponse, Turn } from './types';

const FOLLOWUPS_BY_TURN: string[] = [
  'Could you share the date or weekend you have in mind?',
  'How old are the children, and do they have any prior ski experience?',
  'Would you prefer a private lesson or a group lesson? And do you need rentals or lift tickets included?',
];

const REGEN_FOLLOWUPS_BY_TURN: string[] = [
  'What dates are you considering for the visit?',
  'Are your kids beginners or do they already have some lessons under their belt?',
  'Group lessons are more affordable; private lessons move faster — any preference? Also let us know about rental and lift ticket needs.',
];

const ASSISTANT_TURNS = (history: Turn[]) =>
  history.filter((t) => t.role === 'assistant').length;

const GUEST_TURNS = (history: Turn[]) =>
  history.filter((t) => t.role === 'guest').length;

// Small artificial delay so the UI feels real during demos.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockLambda(
  guest: GuestProfile,
  history: Turn[],
  action: 'next' | 'regenerate_question',
): Promise<LambdaResponse> {
  await sleep(700);
  void guest;

  const assistantCount = ASSISTANT_TURNS(history);
  const guestCount = GUEST_TURNS(history);

  if (action === 'regenerate_question') {
    const idx = Math.max(0, assistantCount - 1);
    const alt = REGEN_FOLLOWUPS_BY_TURN[idx % REGEN_FOLLOWUPS_BY_TURN.length];
    return { type: 'question', question: alt };
  }

  // Ask up to 3 clarifying questions, then compose.
  if (assistantCount < 3 && guestCount <= 3) {
    const next = FOLLOWUPS_BY_TURN[assistantCount % FOLLOWUPS_BY_TURN.length];
    return { type: 'question', question: next };
  }

  const original = history.find((t) => t.role === 'guest')?.text ?? '';
  return {
    type: 'compose',
    email: {
      subject: 'Ski School: Kids Lesson Inquiry — Date Needed',
      recommendedDepartment: 'Ski School',
      priority: 'High',
      revenueOpportunity: true,
      requestSummary:
        'Guest is asking about ski lessons for two children next weekend and needs help confirming options, availability, and next steps.',
      knownDetails: [
        { label: 'Category', value: 'Ski School' },
        { label: 'Guest Count', value: '2 children' },
        { label: 'Desired Timing', value: 'Next weekend' },
        { label: 'Lesson Type', value: 'Not yet confirmed' },
        { label: 'Ability Level', value: 'Not yet provided' },
        { label: 'Rentals Needed', value: 'Not yet confirmed' },
        { label: 'Lift Tickets Needed', value: 'Not yet confirmed' },
      ],
      additionalInfoNeeded: [
        'Exact visit date',
        "Children's ages",
        'Ability levels',
        'Private or group lesson preference',
        'Whether rentals are needed',
        'Whether lift tickets are needed',
      ],
      originalGuestMessage: original,
      suggestedResponse:
        "Thanks for reaching out. We'd be happy to help with lesson options for your kids. Could you please share their ages, ability levels, your preferred visit date, and whether you're looking for private or group lessons?",
    },
  };
}
