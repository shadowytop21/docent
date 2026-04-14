"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";
import { clearSession, loadAppState } from "@/lib/mock-db";
import { useRouter } from "next/navigation";

export function SiteHeader() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<"teacher" | "parent" | null>(null);

  useEffect(() => {
    let rafId = 0;

    const onScroll = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const next = window.scrollY > 20;
        setIsScrolled((current) => (current === next ? current : next));
      });
    };

    const refreshSession = () => {
      const snapshot = loadAppState();
      setSessionName(snapshot.session?.name ?? null);
      setSessionRole(snapshot.session?.role ?? null);
    };

    refreshSession();

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("docent-session-change", refreshSession);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("docent-session-change", refreshSession);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  function signOut() {
    clearSession();
    setSessionName(null);
    setSessionRole(null);
    router.push("/auth");
  }

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(253,250,244,0.9)] backdrop-blur-md px-3 sm:px-4 lg:px-8 ${isScrolled ? "shadow-[0_10px_30px_rgba(26,39,68,0.09)]" : "shadow-[0_1px_0_rgba(26,39,68,0.04)]"}`}>
      <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between gap-2 rounded-full">
        <Link href="/" className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/90 px-2.5 py-1.5 shadow-[0_1px_0_rgba(26,39,68,0.03)] transition hover:-translate-y-0.5 hover:border-[var(--border2)]">
          <div className="rounded-full bg-[var(--navy)] p-1.5">
            <Image src="/docent-mark-v2.png?v=4" alt="Docent logo" width={18} height={18} quality={80} priority className="h-[18px] w-[18px] invert" />
          </div>
          <div className="font-mono text-[14px] font-medium tracking-[0.08em] text-[var(--navy)]">Docent</div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/browse" className="rounded-full px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--ivory2)] hover:text-[var(--navy)]">
            Browse Teachers
          </Link>
          <Link href="/#subjects" className="rounded-full px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--ivory2)] hover:text-[var(--navy)]">
            Subjects
          </Link>
          <Link href="/#how-it-works" className="rounded-full px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--ivory2)] hover:text-[var(--navy)]">
            How it Works
          </Link>
          <JoinAsTeacherAction className="rounded-full px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--ivory2)] hover:text-[var(--navy)]">
            Join as Teacher
          </JoinAsTeacherAction>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {sessionName ? (
            <>
              <div className="hidden rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[13px] text-[var(--navy)] lg:block">
                {sessionName} · {sessionRole ?? "member"}
              </div>
              <Link href={sessionRole === "teacher" ? "/teacher/dashboard" : "/browse"} className="btn-secondary px-4 py-2 text-[13px]">
                Dashboard
              </Link>
              <button type="button" onClick={signOut} className="btn-primary px-4 py-2 text-[13px]">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn-secondary px-4 py-2 text-[13px]">
                Login
              </Link>
              <JoinAsTeacherAction className="btn-primary px-4 py-2 text-[13px]">
                Join Free
              </JoinAsTeacherAction>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Link href={sessionRole === "teacher" ? "/teacher/dashboard" : "/browse"} className="btn-primary inline-flex h-10 items-center px-4 text-sm">
            {sessionName ? "Dashboard" : "Browse"}
          </Link>
        </div>
      </div>
    </header>
  );
}
