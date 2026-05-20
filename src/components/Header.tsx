export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900 text-white text-lg">
            <span aria-hidden>⛰</span>
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-ink-900">
              Trailhead <span className="text-glacier-600">for Email</span>
            </div>
            <div className="text-xs text-slate-500">AI guest intake by Get Ski Bots</div>
          </div>
        </div>
        <div className="hidden text-xs text-slate-500 sm:block">
          Vague Contact Us submissions → clear, routed, ready-to-answer requests.
        </div>
      </div>
    </header>
  );
}
