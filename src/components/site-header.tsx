import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-borderWarm bg-[rgba(250,250,252,0.78)] backdrop-blur-2xl">
      <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-6 py-4 shadow-[0_10px_35px_rgba(15,15,26,0.08)] lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/docent-logo.png" alt="Docent logo" width={220} height={48} className="h-9 w-auto" />
          <div>
            <div className="text-lg font-bold tracking-tight text-navy font-display">Docent</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              Neighbourhood Trust Network
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          <Link href="/browse" className="rounded-full px-4 py-2 text-sm font-semibold text-navy transition hover:bg-[var(--accent-light)] hover:text-[var(--accent)]">
            Browse Experts
          </Link>
          {/* Use centralized role-aware join flow so all entry points behave consistently. */}
          <JoinAsTeacherAction className="rounded-full px-4 py-2 text-sm font-semibold text-navy transition hover:bg-[var(--accent-light)] hover:text-[var(--accent)]">
            Join as Expert
          </JoinAsTeacherAction>
          <Link href="/auth" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]">
            Sign In
          </Link>
        </nav>

        <div className="md:hidden">
          <Link
            href="/browse"
            className="inline-flex h-11 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white"
          >
            Browse
          </Link>
        </div>
      </div>
    </header>
  );
}
