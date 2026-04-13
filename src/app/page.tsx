import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";

const expertCategories = [
  { name: "Tutors", detail: "Math, science, language, and exam prep from trusted local educators." },
  { name: "Plumbers", detail: "Quick fixes, installations, and emergency plumbing support nearby." },
  { name: "Electricians", detail: "Verified professionals for wiring, appliances, and safety checks." },
  { name: "Carpenters", detail: "Furniture repairs, custom woodwork, and practical home solutions." },
  { name: "Cleaners", detail: "Reliable home and office cleaning with flexible scheduling." },
  { name: "Appliance Repair", detail: "Local experts for AC, fridge, washing machine, and more." },
];

const trustSignals = [
  "Verified profiles with clear identity and service details",
  "Local-first matching so responses are faster and practical",
  "Transparent ratings and parent/customer feedback",
  "WhatsApp-first communication for real conversations",
];

const howItWorks = [
  {
    title: "Tell us what you need",
    description: "Search by service, locality, and budget to discover nearby verified experts.",
  },
  {
    title: "Compare with confidence",
    description: "Review profiles, experience, pricing, and feedback before you contact anyone.",
  },
  {
    title: "Connect and get it done",
    description: "Message directly and finalize quickly without long forms or lead brokers.",
  },
];

export default function HomePage() {
  return (
    <div className="fade-in">
      <section className="hero-shell relative overflow-hidden border-b border-[var(--border)]">
        <div className="hero-rings" aria-hidden="true" />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center stage-reveal">
            <span className="pill badge-founding w-fit">Local Services, Verified Experts</span>
            <h1 className="mt-6 max-w-4xl font-display text-[2.25rem] font-extrabold leading-tight text-[var(--foreground)] lg:text-[4rem]">
              Find trusted local experts right in your neighbourhood
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Docent connects you with verified tutors, plumbers, electricians and more — all local, all trusted
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <form action="/browse" className="flex-1">
                <div className="soft-shadow flex flex-col gap-3 rounded-full bg-white p-2 pl-5 sm:min-h-[52px] sm:flex-row sm:items-center">
                  <input
                    name="q"
                    className="w-full border-none bg-transparent py-3 text-[15px] outline-none placeholder:text-[var(--muted)]"
                    placeholder="Search tutors, plumbers, electricians..."
                  />
                  <button type="submit" className="btn-primary px-6 py-3">
                    Browse Experts
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/browse" className="btn-primary px-6 py-3 text-sm">
                Browse Experts
              </Link>
              <JoinAsTeacherAction className="btn-secondary px-6 py-3 text-sm">
                Join as Expert
              </JoinAsTeacherAction>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {trustSignals.slice(0, 3).map((signal) => (
                <span key={signal} className="pill pill-inactive">{signal.split(" ").slice(0, 3).join(" ")}</span>
              ))}
            </div>
          </div>

          <div className="premium-hero-visual stage-reveal stage-delay-1">
            <div className="hero-shape hero-shape-a" />
            <div className="hero-shape hero-shape-b" />
            <div className="hero-layer-card stage-reveal stage-delay-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Live in your area</p>
              <p className="mt-2 font-display text-2xl font-bold text-[var(--foreground)]">120+ verified experts</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">From tutoring to home repairs, discover profiles people nearby already trust.</p>
            </div>
            <div className="hero-layer-card stage-reveal stage-delay-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Fastest growing categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {expertCategories.slice(0, 4).map((item) => (
                  <span key={item.name} className="pill pill-inactive">{item.name}</span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">A premium local marketplace designed for credibility over noise.</p>
            </div>
          </div>
        </div>
        <div className="hero-rail">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-4 text-sm sm:px-6 lg:px-8">
            <span className="font-semibold text-[var(--foreground)]">Popular near you:</span>
            {expertCategories.map((item) => (
              <span key={item.name} className="pill pill-inactive">{item.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="card-soft rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">How Docent Works</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Simple, local, and trust-first</h2>
            <div className="mt-6 space-y-4">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-[var(--border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Step {index + 1}</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-surface rounded-[2rem] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Why People Choose Docent</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">Built for neighbourhood confidence.</h2>
            <div className="mt-6 space-y-3">
              {trustSignals.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl bg-[var(--accent-light)] p-4">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">✓</span>
                  <p className="text-sm leading-6 text-[var(--foreground)]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[rgba(238,242,255,0.45)] py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--border)] bg-white p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">For Providers</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-[var(--foreground)]">A profile that gets you found locally</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Start with tutoring now. Add more verified service categories as the platform expands.
              </p>
            </div>
            <JoinAsTeacherAction className="btn-primary px-6 py-3 text-sm">
              Create Expert Profile
            </JoinAsTeacherAction>
          </div>
        </div>
      </section>
    </div>
  );
}
