import { requirePlatformSession } from "@/lib/platformPermissions";
import { platformLogout } from "@/actions/platformActions";

export default async function PlatformConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformSession();

  return (
    <div className="flex flex-1 flex-col bg-ink-950">
      <header className="border-b border-slate-800 bg-ink-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">
              Tim<span className="text-amber-400">Hr</span>
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              Platform Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{session.name}</span>
            <form action={platformLogout}>
              <button type="submit" className="text-sm font-semibold text-slate-400 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
