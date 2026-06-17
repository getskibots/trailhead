import type { GuestProfile, LambdaRequest, LambdaResponse, Turn } from './types';
import { mockLambda } from './mock';

const API_URL = import.meta.env.VITE_TRAILHEAD_API_URL as string | undefined;

const useMock = () => {
  if (!API_URL) return true;
  if (typeof window !== 'undefined' && window.location.search.includes('mock=1')) return true;
  return false;
};

export async function callTrailhead(
  guest: GuestProfile,
  conversationHistory: Turn[],
  action: 'next' | 'regenerate_question' = 'next',
): Promise<LambdaResponse> {
  if (useMock()) {
    return mockLambda(guest, conversationHistory, action);
  }

  const body: LambdaRequest = { guest, conversationHistory, action };
  const res = await fetch(API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Trailhead API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as LambdaResponse;
}
