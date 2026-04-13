import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

export function SiteFooter() {
  return (
    <footer className="border-t border-borderWarm bg-[linear-gradient(180deg,rgba(238,242,255,0.45),rgba(250,250,250,0.95))]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-[0_14px_45px_rgba(15,15,26,0.08)] lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/docent-logo.png" alt="Docent logo" width={220} height={48} className="h-8 w-auto" />
              <div className="text-xl font-bold text-navy font-display">Docent</div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-7 text-mutedText">
              Verified local experts for every need — starting with education
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mutedText">Built for local trust, not anonymous listings</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="pill pill-inactive">Verified Profiles</span>
              <span className="pill pill-inactive">Local-First Search</span>
              <span className="pill pill-inactive">Direct Contact</span>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-mutedText sm:grid-cols-2">
            <Link href="/browse" className="rounded-xl border border-transparent bg-white/70 px-3 py-2 transition hover:border-borderWarm hover:text-[var(--accent)]">
              Browse Experts
            </Link>
            {/* Use centralized role-aware join flow so all entry points behave consistently. */}
            <JoinAsTeacherAction className="rounded-xl border border-transparent bg-white/70 px-3 py-2 text-left transition hover:border-borderWarm hover:text-[var(--accent)]">
              Join as Expert
            </JoinAsTeacherAction>
            <Link href="/auth" className="rounded-xl border border-transparent bg-white/70 px-3 py-2 transition hover:border-borderWarm hover:text-[var(--accent)]">
              Login
            </Link>
            <a href="mailto:docentsupport@gmail.com" className="rounded-xl border border-transparent bg-white/70 px-3 py-2 transition hover:border-borderWarm hover:text-[var(--accent)]">
              docentsupport@gmail.com
            </a>
          </div>
        </div>
        <p className="mt-6 text-xs text-mutedText">© {new Date().getFullYear()} Docent. All rights reserved.</p>
      </div>
    </footer>
  );
}
