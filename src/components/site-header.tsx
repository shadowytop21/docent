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
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
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
    };
  }, []);

  function signOut() {
    clearSession();
    setSessionName(null);
    setSessionRole(null);
    router.push("/auth");
  }

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(253,250,244,0.97)] px-4 lg:px-16 ${isScrolled ? "shadow-[0_4px_24px_rgba(26,39,68,0.1)]" : "shadow-[0_1px_0_rgba(26,39,68,0.06)]"}`}>
      <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--navy)] p-2">
            <Image src="/docent-mark-v2.png?v=4" alt="Docent logo" width={22} height={22} quality={80} priority className="h-[22px] w-[22px] invert" />
          </div>
          <div className="font-mono text-[15px] font-medium tracking-[0.06em] text-[var(--navy)]">Docent</div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/browse" className="text-sm text-[var(--muted)] transition hover:text-[var(--navy)]">
            Browse Teachers
          </Link>
          <Link href="/#subjects" className="text-sm text-[var(--muted)] transition hover:text-[var(--navy)]">
            Subjects
          </Link>
          <Link href="/#how-it-works" className="text-sm text-[var(--muted)] transition hover:text-[var(--navy)]">
            How it Works
          </Link>
          <JoinAsTeacherAction className="text-sm text-[var(--muted)] transition hover:text-[var(--navy)]">
            Join as Teacher
          </JoinAsTeacherAction>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {sessionName ? (
            <>
              <div className="hidden rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[13px] text-[var(--navy)] lg:block">
                {sessionName} · {sessionRole ?? "member"}
              </div>
              <Link href={sessionRole === "teacher" ? "/teacher/dashboard" : "/browse"} className="btn-secondary px-5 py-2 text-[13px]">
                Dashboard
              </Link>
              <button type="button" onClick={signOut} className="btn-primary px-5 py-2 text-[13px]">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn-secondary px-5 py-2 text-[13px]">
                Login
              </Link>
              <JoinAsTeacherAction className="btn-primary px-5 py-2 text-[13px]">
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
