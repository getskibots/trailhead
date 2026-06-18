import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trailhead",
  description: "Auto-categorize resort website URLs into omni-odin knowledge presets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-850/40">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
                <span>🥾</span>
                <span>Trailhead</span>
                <span className="text-sm font-normal text-slate-500">URL categorizer</span>
              </Link>
              <Link href="/ingest" className="btn-primary">
                + New ingestion
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
