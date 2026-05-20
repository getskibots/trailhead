export type Turn =
  | { role: 'guest'; text: string }
  | { role: 'assistant'; question: string };

export type Priority = 'High' | 'Medium' | 'Low';

export type KnownDetail = { label: string; value: string };

export type ComposedEmail = {
  subject: string;
  recommendedDepartment: string;
  priority: Priority;
  revenueOpportunity: boolean;
  requestSummary: string;
  knownDetails: KnownDetail[];
  additionalInfoNeeded: string[];
  originalGuestMessage: string;
  suggestedResponse: string;
};

export type LambdaResponse =
  | { type: 'question'; question: string }
  | { type: 'compose'; email: ComposedEmail };

export type LambdaAction = 'next' | 'regenerate_question';

export type LambdaRequest = {
  conversationHistory: Turn[];
  action?: LambdaAction;
};
