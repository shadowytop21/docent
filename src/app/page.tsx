import Link from "next/link";
import { TeacherCard } from "@/components/teacher-card";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";
import {
  boardOptions,
  computeFilteredTeachers,
  gradeOptions,
  localityOptions,
  seedReviews,
  seedTeachers,
  subjectOptions,
  subjectSearchSuggestions,
} from "@/lib/data";

const featuredTeachers = computeFilteredTeachers(seedTeachers, {}, seedReviews).slice(0, 6);

const parentSteps = [
  "Search by subject, grade, locality, or board.",
  "Open a teacher profile and check ratings, experience, and badges.",
  "Message the teacher on WhatsApp and start tuition quickly.",
];

const teacherSteps = [
  "Complete the three-step profile form with your details and subjects.",
  "Submit for verification and get a pending status instantly.",
  "First 50 teachers earn a founding member badge automatically.",
];

const whyTutorNest = [
  "Hyperlocal discovery tuned for Mathura neighborhoods.",
  "Warm, trustworthy profiles with real badges and reviews.",
  "Fast WhatsApp-first communication, not clunky lead forms.",
  "Built for both tuition quality and local convenience.",
];

const subjects = [
  "Maths",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "Sanskrit",
  "Computer Science",
  "Economics",
  "Accountancy",
];

export default function HomePage() {
  return (
    <div className="fade-in">
      <section className="hero-shell lotus-pattern border-b border-[var(--border)]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="pill badge-founding w-fit">Mathura's home tuition marketplace</span>
            <h1 className="mt-6 max-w-4xl font-display text-[2.25rem] font-extrabold leading-tight text-[var(--foreground)] lg:text-[4rem]">
              Find the right home tutor for your child, right in your neighborhood.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              TutorNest helps parents discover verified home tutors in Mathura, while teachers build a local profile that gets found by the right families.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <form action="/browse" className="flex-1">
                <div className="soft-shadow flex flex-col gap-3 rounded-full bg-white p-2 pl-5 sm:min-h-[52px] sm:flex-row sm:items-center">
                  <input
                    name="subject"
                    className="w-full border-none bg-transparent py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
                    placeholder="Search subject, grade, or locality"
                  />
                  <button type="submit" className="btn-primary px-6 py-3">
                    Search tutors
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/browse" className="btn-primary px-6 py-3 text-sm">
                Browse tutors
              </Link>
              {/* Use centralized role-aware join flow so all entry points behave consistently. */}
              <JoinAsTeacherAction className="btn-secondary px-6 py-3 text-sm">
                Join as teacher
              </JoinAsTeacherAction>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
              {subjectSearchSuggestions.map((suggestion) => (
                <Link key={suggestion} href={`/browse?subject=${encodeURIComponent(suggestion.split(" ")[0])}`} className="pill pill-inactive no-underline">
                  {suggestion}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card-surface rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Featured today</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[var(--foreground)]">Verified teachers in Mathura</p>
                </div>
                <span className="pill badge-verified">Live</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[var(--primary-soft)] p-4">
                  <p className="text-sm text-[var(--muted)]">Parents</p>
                  <p className="mt-1 font-display text-3xl font-bold text-[var(--foreground)]">Browse</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Search by subject, grade, locality, board, price, and availability.</p>
                </div>
                <div className="rounded-3xl bg-[var(--success-soft)] p-4">
                  <p className="text-sm text-[var(--muted)]">Teachers</p>
                  <p className="mt-1 font-display text-3xl font-bold text-[var(--foreground)]">Apply</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Create a clean profile and get found by nearby families.</p>
                </div>
              </div>
            </div>

            <div className="card-soft rounded-[2rem] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Popular searches</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {subjectOptions.slice(0, 6).map((subject) => (
                  <Link key={subject} href={`/browse?subject=${encodeURIComponent(subject)}`} className="pill pill-inactive no-underline">
                    {subject}
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {gradeOptions.slice(0, 3).map((grade) => (
                  <Link key={grade} href={`/browse?grade=${encodeURIComponent(grade)}`} className="pill pill-inactive no-underline">
                    {grade}
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {localityOptions.slice(0, 5).map((locality) => (
                  <Link key={locality} href={`/browse?locality=${encodeURIComponent(locality)}`} className="pill pill-inactive no-underline">
                    {locality}
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {boardOptions.map((board) => (
                  <Link key={board} href={`/browse?board=${encodeURIComponent(board)}`} className="pill pill-inactive no-underline">
                    {board}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card-surface rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">How it works for parents</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Simple, local, and trust-first.</h2>
            <div className="mt-6 space-y-4">
              {parentSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-3xl bg-[rgba(255,251,245,0.92)] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-[var(--muted)]">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">How it works for teachers</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">A polished profile that can actually convert.</h2>
            <div className="mt-6 space-y-4">
              {teacherSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-3xl bg-[rgba(255,251,245,0.92)] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success)] font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-[var(--muted)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[rgba(247,243,238,0.52)] py-16 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Subject categories</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Browse by subject</h2>
            </div>
            <Link href="/browse" className="btn-secondary hidden px-5 py-3 text-sm sm:inline-flex">
              See all tutors
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subjects.map((subject) => (
              <Link
                key={subject}
                href={`/browse?subject=${encodeURIComponent(subject)}`}
                className="card-soft group rounded-[1.75rem] p-5 no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(27,43,75,0.12)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-2xl font-bold text-[var(--foreground)]">{subject}</p>
                  <span className="pill badge-founding">Explore</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  Find local {subject.toLowerCase()} tutors with verified profiles and WhatsApp contact.
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Featured verified teachers</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Top-rated teachers in Mathura</h2>
          </div>
          <Link href="/browse" className="btn-secondary hidden px-5 py-3 text-sm sm:inline-flex">
            Browse all
          </Link>
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          {featuredTeachers.length ? (
            featuredTeachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))
          ) : (
            <div className="card-surface col-span-full rounded-[2rem] p-8 text-center">
              <p className="font-display text-3xl font-bold text-[var(--foreground)]">No verified teachers yet</p>
              <p className="mt-3 text-[var(--muted)]">As soon as local tutors are verified, they will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[rgba(247,243,238,0.58)] py-16 lg:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Why TutorNest?</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Built to feel trustworthy from the first glance.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--muted)]">
              The platform is designed for parents who want speed and clarity, and for teachers who want a profile that looks premium instead of generic.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {whyTutorNest.map((point) => (
              <div key={point} className="card-surface rounded-[1.75rem] p-5">
                <p className="font-display text-xl font-semibold text-[var(--foreground)]">Trust signal</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
