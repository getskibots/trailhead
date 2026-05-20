import { useState } from 'react';

type Props = {
  placeholder?: string;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (text: string) => void;
};

export function IntakeForm({ placeholder, submitLabel, disabled, onSubmit }: Props) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <textarea
        className="block w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink-900 placeholder:text-slate-400 focus:border-glacier-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-glacier-500/20"
        rows={4}
        placeholder={placeholder ?? 'Type your message…'}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">Press ⌘/Ctrl + Enter to send</span>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="rounded-lg bg-glacier-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-glacier-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
