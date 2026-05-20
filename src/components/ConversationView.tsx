import type { Turn } from '../lib/types';

type Props = {
  turns: Turn[];
  regeneratingIndex: number | null;
  onRegenerate: (assistantTurnIndex: number) => void;
};

export function ConversationView({ turns, regeneratingIndex, onRegenerate }: Props) {
  if (turns.length === 0) return null;

  return (
    <div className="space-y-3">
      {turns.map((turn, idx) => {
        if (turn.role === 'guest') {
          return (
            <div key={idx} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink-900 px-4 py-3 text-sm text-white shadow-card">
                {turn.text}
              </div>
            </div>
          );
        }

        const isRegenerating = regeneratingIndex === idx;

        return (
          <div key={idx} className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-ink-900 shadow-card">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-glacier-600">
                <span>Trailhead</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">Clarifying question</span>
              </div>
              <div className={isRegenerating ? 'opacity-40' : ''}>{turn.question}</div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRegenerate(idx)}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-glacier-500 hover:text-glacier-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Generate a different clarifying question"
                >
                  <span aria-hidden>↻</span>
                  {isRegenerating ? 'Regenerating…' : 'Regenerate question'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
