import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ComplianceGap } from "@/lib/compliance";

const SERVICES_BASE_URL = "https://timhr.in/services";

export function ComplianceGapsWidget({ gaps }: { gaps: ComplianceGap[] }) {
  if (gaps.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Compliance gaps</h3>
            <p className="text-xs text-slate-500">Nothing flagged right now.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
          <ShieldAlert size={18} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Compliance gaps</h3>
          <p className="text-xs text-slate-500">Based on headcount and certificates on file</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {gaps.map((gap) => (
          <li key={gap.key} className="rounded-xl border border-slate-800 bg-ink-950/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{gap.title}</div>
                <p className="mt-0.5 text-xs text-slate-400">{gap.detail}</p>
              </div>
              <Badge tone={gap.severity === "danger" ? "danger" : "warning"}>
                {gap.severity === "danger" ? "Act soon" : "Heads up"}
              </Badge>
            </div>
            <a
              href={`${SERVICES_BASE_URL}/${gap.serviceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-amber-400 hover:underline"
            >
              Talk to someone about this →
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        These are indicative flags, not a legal determination — confirm applicability with your CA.
      </p>
    </Card>
  );
}
