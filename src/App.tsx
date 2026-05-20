import { useState } from 'react';
import { Header } from './components/Header';
import { IntakeForm } from './components/IntakeForm';
import { ConversationView } from './components/ConversationView';
import { EmailPreview } from './components/EmailPreview';
import { callTrailhead } from './lib/api';
import type { ComposedEmail, Turn } from './lib/types';

type Phase = 'idle' | 'awaiting-guest' | 'loading' | 'composed' | 'error';

export default function App() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [email, setEmail] = useState<ComposedEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const advance = async (nextTurns: Turn[]) => {
    setPhase('loading');
    setError(null);
    try {
      const res = await callTrailhead(nextTurns, 'next');
      if (res.type === 'question') {
        setTurns([...nextTurns, { role: 'assistant', question: res.question }]);
        setPhase('awaiting-guest');
      } else {
        setEmail(res.email);
        setPhase('composed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('error');
    }
  };

  const onGuestSubmit = (text: string) => {
    const nextTurns: Turn[] = [...turns, { role: 'guest', text }];
    setTurns(nextTurns);
    void advance(nextTurns);
  };

  const onRegenerate = async (assistantIdx: number) => {
    setRegeneratingIndex(assistantIdx);
    setError(null);
    try {
      const historyUpToQuestion = turns.slice(0, assistantIdx);
      const res = await callTrailhead(historyUpToQuestion, 'regenerate_question');
      if (res.type === 'question') {
        const updated = [...turns];
        updated[assistantIdx] = { role: 'assistant', question: res.question };
        setTurns(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not regenerate question.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const reset = () => {
    setTurns([]);
    setEmail(null);
    setPhase('idle');
    setError(null);
  };

  const inputDisabled = phase === 'loading';

  return (
    <div className="min-h-full bg-slate-50">
      <Header />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {phase !== 'composed' && (
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              Send a Contact Us message
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Type a question the way a guest would. Trailhead will ask smart follow-ups, then hand
              your front desk a clean, routed request.
            </p>
          </div>
        )}

        {phase === 'composed' && email ? (
          <EmailPreview email={email} onReset={reset} />
        ) : (
          <div className="space-y-5">
            <ConversationView
              turns={turns}
              regeneratingIndex={regeneratingIndex}
              onRegenerate={onRegenerate}
            />

            {phase === 'loading' && (
              <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-glacier-500" />
                Trailhead is thinking…
              </div>
            )}

            <IntakeForm
              placeholder={
                turns.length === 0
                  ? "e.g. I'm wondering about ski lessons for my two kids next weekend."
                  : 'Type your answer…'
              }
              submitLabel={turns.length === 0 ? 'Send to resort' : 'Send answer'}
              disabled={inputDisabled}
              onSubmit={onGuestSubmit}
            />

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-10 text-center text-xs text-slate-400">
        Trailhead for Email · A Get Ski Bots product
      </footer>
    </div>
  );
}
