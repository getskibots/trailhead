import { useState } from 'react';
import type { ComposedEmail } from '../lib/types';

type Props = {
  email: ComposedEmail;
  onReset: () => void;
};

const PRIORITY_STYLE: Record<ComposedEmail['priority'], string> = {
  High: 'bg-danger/10 text-danger',
  Medium: 'bg-summit-500/10 text-summit-500',
  Low: 'bg-success/10 text-success',
};

function buildPlaintext(email: ComposedEmail) {
  const known = email.knownDetails.map((d) => `- ${d.label}: ${d.value}`).join('\n');
  const missing = email.additionalInfoNeeded.map((m) => `- ${m}`).join('\n');
  return `New Trailhead for Email Submission

Recommended Department:
${email.recommendedDepartment}

Priority:
${email.priority}

Revenue Opportunity:
${email.revenueOpportunity ? 'Yes' : 'No'}

Request Summary:
${email.requestSummary}

Known Details:
${known}

Additional Information Needed:
${missing}

Original Guest Message:
"${email.originalGuestMessage}"

Suggested Response:
${email.suggestedResponse}
`;
}

export function EmailPreview({ email, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(buildPlaintext(email));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-glacier-600">
          Staff-facing email preview
        </div>
        <div className="mt-1 text-sm font-semibold text-ink-900">{email.subject}</div>
      </div>

      <div className="space-y-5 px-5 py-5 text-sm text-ink-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-glacier-50 px-2 py-1 text-xs font-medium text-glacier-700">
            {email.recommendedDepartment}
          </span>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${PRIORITY_STYLE[email.priority]}`}>
            Priority: {email.priority}
          </span>
          {email.revenueOpportunity && (
            <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
              Revenue opportunity
            </span>
          )}
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Request summary
          </div>
          <div className="mt-1 leading-relaxed">{email.requestSummary}</div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Known details
            </div>
            <ul className="mt-2 space-y-1">
              {email.knownDetails.map((d) => (
                <li key={d.label} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">{d.label}</span>
                  <span className="text-right text-ink-900">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Additional info needed
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-900">
              {email.additionalInfoNeeded.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Original guest message
          </div>
          <blockquote className="mt-1 border-l-2 border-glacier-500 pl-3 text-sm italic text-slate-600">
            "{email.originalGuestMessage}"
          </blockquote>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Suggested response
          </div>
          <div className="mt-1 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-ink-900">
            {email.suggestedResponse}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-slate-600 hover:text-ink-900"
        >
          ← Start a new intake
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-ink-800"
        >
          {copied ? 'Copied ✓' : 'Copy to clipboard'}
        </button>
      </div>
    </div>
  );
}
