import { memo } from "react";
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

function TeacherCardImpl({ teacher }: { teacher: TeacherProfile }) {
  function prewarmTeacherProfile() {
    void fetch(`/api/teacher/${teacher.id}`, { cache: "force-cache" });
  }

  const initials = teacher.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="teacher-card group">
      <div className="card-header">
        <div className="card-badges">
          {teacher.status === "verified" ? <Badge tone="green">Verified</Badge> : null}
          {teacher.status === "pending" ? <Badge>Pending</Badge> : null}
        </div>

        <div className="card-teacher-row">
          <div className="card-avatar relative">
            <span className="font-display text-base font-semibold text-[var(--navy)]">{initials}</span>
            <span className={`absolute -right-0.5 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-white ${teacher.status === "verified" ? "bg-[var(--success)]" : teacher.status === "pending" ? "bg-slate-400" : "bg-rose-500"}`} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-semibold text-[var(--foreground)] font-display">{teacher.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{teacher.bio}</p>
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="subject-pills">
          {teacher.subjects.slice(0, 4).map((subject) => (
            <span key={subject} className="subject-pill">
              {subject}
            </span>
          ))}
        </div>

        <div className="card-details text-sm">
          <div className="card-detail">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Grades</div>
            <div className="mt-1 font-semibold text-[var(--foreground)]">{teacher.grades.join(", ")}</div>
          </div>
          <div className="card-detail">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Locality</div>
            <div className="mt-1 font-semibold text-[var(--foreground)]">{teacher.locality}</div>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <div className="min-w-0">
          <div className="text-sm text-[var(--muted)]">From</div>
          <div className="card-price">₹{teacher.price_per_month}</div>
        </div>

        <div className="text-right text-sm text-[var(--muted)] min-w-0">
          <div className="font-semibold text-[var(--foreground)]">{teacher.experience_years}+ years</div>
          <div>{teacher.rating.toFixed(1)} rating</div>
        </div>

        <Link
          href={`/teacher/${teacher.id}`}
          className="card-btn inline-flex items-center justify-center text-sm"
          onMouseEnter={prewarmTeacherProfile}
          onFocus={prewarmTeacherProfile}
        >
          View Profile
        </Link>
      </div>
    </article>
  );
}

export const TeacherCard = memo(TeacherCardImpl);
