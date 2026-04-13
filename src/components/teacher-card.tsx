import Image from "next/image";
import Link from "next/link";
import { type TeacherProfile } from "@/lib/data";

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "saffron" }) {
  const styles =
    tone === "green"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : tone === "saffron"
        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
        : "bg-[var(--surface-alt)] text-[var(--foreground)]";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

export function TeacherCard({ teacher }: { teacher: TeacherProfile }) {
  return (
    <article className="group rounded-[1.6rem] border border-[var(--border)] bg-white p-5 shadow-[0_4px_24px_rgba(79,70,229,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(79,70,229,0.16)]">
      <div className="flex items-start gap-4">
        <div className="relative h-18 w-18 shrink-0">
          <Image
            src={teacher.photo_url}
            alt={teacher.name}
            width={72}
            height={72}
            quality={80}
            loading="lazy"
            unoptimized
            className={`h-18 w-18 rounded-full object-cover ring-4 ${teacher.status === "verified" ? "ring-[rgba(79,70,229,0.4)]" : "ring-[var(--border)]"}`}
          />
          <span className={`absolute -right-1 bottom-0 h-4 w-4 rounded-full border-2 border-white ${teacher.status === "verified" ? "bg-[var(--success)]" : teacher.status === "pending" ? "bg-slate-400" : "bg-rose-500"}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold text-[var(--foreground)] font-display">{teacher.name}</h3>
            {teacher.status === "verified" ? <Badge tone="green">✓ Verified</Badge> : null}
            {teacher.is_founding_member ? <Badge tone="saffron">★ Founding Member</Badge> : null}
            {teacher.status === "pending" ? <Badge>Pending</Badge> : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{teacher.bio}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {teacher.subjects.slice(0, 4).map((subject) => (
          <span key={subject} className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            {subject}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-[var(--surface-alt)] p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Grades</div>
          <div className="mt-1 font-semibold text-[var(--foreground)]">{teacher.grades.join(", ")}</div>
        </div>
        <div className="rounded-2xl bg-[var(--surface-alt)] p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Locality</div>
          <div className="mt-1 font-semibold text-[var(--foreground)]">{teacher.locality}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-[var(--muted)]">From</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">₹{teacher.price_per_month}</div>
        </div>
        <div className="text-right text-sm text-[var(--muted)]">
          <div className="font-semibold text-[var(--foreground)]">{teacher.experience_years}+ yrs</div>
          <div>{teacher.rating.toFixed(1)} rating</div>
        </div>
      </div>

      <div className="mt-5">
        <Link
          href={`/teacher/${teacher.id}`}
          className="inline-flex w-full items-center justify-center rounded-full border border-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
