import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

export function SiteFooter() {
  return (
    <footer className="border-t border-borderWarm bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <div className="text-xl font-bold text-navy font-display">TutorNest</div>
          <p className="mt-3 max-w-xl text-sm leading-7 text-mutedText">
            Hyperlocal home tuition discovery for parents and teachers in Mathura,
            built to feel warm, clear, and trustworthy.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-mutedText sm:grid-cols-2">
          <Link href="/browse" className="transition hover:text-saffron">
            Browse tutors
          </Link>
          {/* Use centralized role-aware join flow so all entry points behave consistently. */}
          <JoinAsTeacherAction className="text-left transition hover:text-saffron">
            Join as teacher
          </JoinAsTeacherAction>
          <Link href="/auth" className="transition hover:text-saffron">
            Login
          </Link>
          <a href="mailto:hello@tutornest.in" className="transition hover:text-saffron">
            hello@tutornest.in
          </a>
        </div>
      </div>
    </footer>
  );
}
