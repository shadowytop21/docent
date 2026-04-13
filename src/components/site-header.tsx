import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-borderWarm bg-[rgba(255,251,245,0.86)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy text-lg font-bold text-white shadow-lg shadow-navy/10">
            T
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-navy font-display">TutorNest</div>
            <div className="text-xs font-medium uppercase tracking-[0.25em] text-saffron">
              Mathura tutoring
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/browse" className="text-sm font-semibold text-navy transition hover:text-saffron">
            Browse Tutors
          </Link>
          {/* Use centralized role-aware join flow so all entry points behave consistently. */}
          <JoinAsTeacherAction className="text-sm font-semibold text-navy transition hover:text-saffron">
            Join as Teacher
          </JoinAsTeacherAction>
          <Link href="/auth" className="text-sm font-semibold text-navy transition hover:text-saffron">
            Login
          </Link>
        </nav>

        <div className="md:hidden">
          <Link
            href="/browse"
            className="inline-flex h-11 items-center rounded-full bg-saffron px-4 text-sm font-semibold text-white"
          >
            Browse
          </Link>
        </div>
      </div>
    </header>
  );
}
