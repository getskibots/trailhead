import { useState } from 'react';
import type { GuestProfile } from '../lib/types';

type Props = {
  disabled?: boolean;
  onSubmit: (guest: GuestProfile, message: string) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({ disabled, onSubmit }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);

  const errors = {
    firstName: !firstName.trim() ? 'Required' : '',
    lastName: !lastName.trim() ? 'Required' : '',
    email: !email.trim() ? 'Required' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email' : '',
    message: !message.trim() ? 'Tell us a bit about what you need' : '',
  };

  const hasError = Object.values(errors).some(Boolean);

  const submit = () => {
    setTouched(true);
    if (hasError || disabled) return;
    onSubmit(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      },
      message.trim(),
    );
  };

  const showError = (field: keyof typeof errors) => touched && errors[field];

  const inputClass = (field: keyof typeof errors) =>
    `block w-full rounded-lg border px-4 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-glacier-500/20 ${
      showError(field)
        ? 'border-danger/40 bg-danger/5 focus:border-danger'
        : 'border-slate-200 bg-slate-50 focus:border-glacier-500 focus:bg-white'
    }`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">First name</label>
          <input
            type="text"
            autoComplete="given-name"
            className={inputClass('firstName')}
            placeholder="Brandon"
            value={firstName}
            disabled={disabled}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {showError('firstName') && (
            <div className="mt-1 text-xs text-danger">{errors.firstName}</div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Last name</label>
          <input
            type="text"
            autoComplete="family-name"
            className={inputClass('lastName')}
            placeholder="Quinn"
            value={lastName}
            disabled={disabled}
            onChange={(e) => setLastName(e.target.value)}
          />
          {showError('lastName') && (
            <div className="mt-1 text-xs text-danger">{errors.lastName}</div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-slate-600">Email address</label>
        <input
          type="email"
          autoComplete="email"
          className={inputClass('email')}
          placeholder="you@example.com"
          value={email}
          disabled={disabled}
          onChange={(e) => setEmail(e.target.value)}
        />
        {showError('email') && <div className="mt-1 text-xs text-danger">{errors.email}</div>}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Question / message
        </label>
        <textarea
          rows={5}
          className={`${inputClass('message')} resize-none`}
          placeholder="e.g. I'm wondering about ski lessons for my two kids next weekend."
          value={message}
          disabled={disabled}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {showError('message') && <div className="mt-1 text-xs text-danger">{errors.message}</div>}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-slate-400">Press ⌘/Ctrl + Enter to send</span>
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="rounded-lg bg-glacier-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-glacier-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          Send to resort
        </button>
      </div>
    </div>
  );
}
