import { listPresets } from "@/data/presets";
import IngestForm from "./IngestForm";

export const dynamic = "force-dynamic";

export default function IngestPage() {
  const presets = listPresets();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New ingestion</h1>
        <p className="mt-1 text-sm text-slate-400">
          Point Trailhead at a resort. It detects the sitemap, reads each page, and
          categorizes URLs against the chosen preset.
        </p>
      </div>
      <IngestForm presets={presets} />
    </div>
  );
}
