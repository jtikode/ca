import { PlatformLoginForm } from "@/components/platform/PlatformLoginForm";

export default function PlatformLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-sm font-bold text-white">TimHr</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Internal</p>
          <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <PlatformLoginForm />
        </div>
      </div>
    </div>
  );
}
