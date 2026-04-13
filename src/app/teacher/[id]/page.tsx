"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { AppSecurityError, isTeacherVisiblePublicly, loadAppState, submitReview as submitReviewSecure } from "@/lib/mock-db";
import { formatCurrency, formatDate, whatsappLink } from "@/lib/utils";
import { TeacherCard } from "@/components/teacher-card";
import type { ReviewRecord, TeacherRecord } from "@/lib/data";

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pushToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [parentName, setParentName] = useState("");
  const [editingReview, setEditingReview] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [remoteTeachers, setRemoteTeachers] = useState<TeacherRecord[] | null>(null);
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[] | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadRemoteCatalog() {
      setCatalogLoaded(false);
      const response = await fetch("/api/browse", { cache: "no-store" });
      if (!response.ok) {
        setCatalogLoaded(true);
        return;
      }

      const payload = (await response.json()) as { teachers?: TeacherRecord[]; reviews?: ReviewRecord[] };
      setRemoteTeachers(payload.teachers ?? []);
      setRemoteReviews(payload.reviews ?? []);
      setCatalogLoaded(true);
    }

    loadRemoteCatalog();
  }, []);

  const fallbackSnapshot = useMemo(() => loadAppState(), [mounted, rating, editingReview, refreshKey]);
  const mergedTeachers = useMemo(() => {
    const byId = new Map<string, TeacherRecord>();

    for (const item of remoteTeachers ?? []) {
      byId.set(item.id, item);
    }

    for (const item of fallbackSnapshot.teachers) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return Array.from(byId.values());
  }, [remoteTeachers, fallbackSnapshot.teachers]);

  const mergedReviews = useMemo(() => {
    const byId = new Map<string, ReviewRecord>();

    for (const item of remoteReviews ?? []) {
      byId.set(item.id, item);
    }

    for (const item of fallbackSnapshot.reviews) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return Array.from(byId.values());
  }, [remoteReviews, fallbackSnapshot.reviews]);

  const snapshot = {
    teachers: mergedTeachers,
    reviews: mergedReviews,
    session: fallbackSnapshot.session,
    profiles: fallbackSnapshot.profiles,
  };
  const teacher = snapshot.teachers.find((item) => item.id === params.id);
  const teacherReviews = snapshot.reviews.filter((item) => item.teacher_id === params.id);
  const session = snapshot.session;

  if (!mounted) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading profile...</div>;
  }

  if (!catalogLoaded) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading profile...</div>;
  }

  if (!teacher) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">Teacher not found</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">The tutor you are looking for may not exist or may not be public yet.</p>
        <button type="button" onClick={() => router.push("/browse")} className="btn-primary mt-8 px-6 py-3 text-sm">Back to browse</button>
      </div>
    );
  }

  const currentTeacher = teacher;
  const isPublicProfileVisible = isTeacherVisiblePublicly(currentTeacher);
  const isRejected = currentTeacher.status === "rejected" && !isPublicProfileVisible;
  const isPendingReview = currentTeacher.status === "pending" && !isPublicProfileVisible;

  if (isRejected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">Teacher not found</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">The tutor you are looking for may not exist or may not be public yet.</p>
        <button type="button" onClick={() => router.push("/browse")} className="btn-primary mt-8 px-6 py-3 text-sm">Back to browse</button>
      </div>
    );
  }

  if (isPendingReview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">This profile is under review</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">Please check back later after verification.</p>
      </div>
    );
  }

  const isParent = session?.role === "parent";
  const isSelfTeacher = Boolean(session?.id && currentTeacher.user_id === session.id);
  const existingReview = isParent
    ? teacherReviews.find((review) => review.parent_id === session?.id) ?? null
    : null;

  function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !isParent) {
      router.push("/auth");
      return;
    }

    const actualParentName = parentName || session.name || "Parent";

    try {
      submitReviewSecure({
        teacherId: currentTeacher.id,
        parentId: session.id,
        parentName: actualParentName,
        rating,
        comment,
        allowEdit: Boolean(existingReview),
      });
      setEditingReview(false);
      setRefreshKey((value) => value + 1);
      pushToast({ tone: "success", title: existingReview ? "Review updated" : "Review posted" });
    } catch (error) {
      if (error instanceof AppSecurityError) {
        pushToast({ tone: "error", title: error.message });
        return;
      }

      pushToast({ tone: "error", title: "Unable to submit review" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <TeacherCard teacher={currentTeacher} />
        <div className="space-y-4">
          <div className="card-surface rounded-[2rem] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Public profile</p>
                <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">{currentTeacher.name}</h1>
                <p className="mt-3 text-lg leading-8 text-[var(--muted)]">{currentTeacher.bio}</p>
              </div>
              <div className="rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Price</p>
                <p className="font-display text-2xl font-bold text-[var(--foreground)]">{formatCurrency(currentTeacher.price_per_month)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-[rgba(255,251,245,0.9)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Locality</p>
                <p className="mt-1 font-medium text-[var(--foreground)]">{currentTeacher.locality}</p>
              </div>
              <div className="rounded-3xl bg-[rgba(255,251,245,0.9)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Experience</p>
                <p className="mt-1 font-medium text-[var(--foreground)]">{currentTeacher.experience_years} years</p>
              </div>
              <div className="rounded-3xl bg-[rgba(255,251,245,0.9)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Teaches at</p>
                <p className="mt-1 font-medium text-[var(--foreground)] capitalize">{currentTeacher.teaches_at.replace("_", " ")}</p>
              </div>
              <div className="rounded-3xl bg-[rgba(255,251,245,0.9)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Reviews</p>
                <p className="mt-1 font-medium text-[var(--foreground)]">{teacherReviews.length} reviews</p>
              </div>
            </div>

            {isParent ? (
              <a
                href={whatsappLink(
                  currentTeacher.whatsapp_number,
                  "Hi, I found your profile on TutorNest and I'm interested in home tuition for my child.",
                )}
                target="_blank"
                rel="noreferrer"
                className="whatsapp-pulse btn-primary mt-6 w-full rounded-full bg-[#25D366] px-6 py-4 text-base"
              >
                Message on WhatsApp
              </a>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/auth")}
                className="btn-secondary mt-6 w-full px-6 py-4 text-base"
              >
                Login to Contact
              </button>
            )}
          </div>

          <div className="card-soft rounded-[2rem] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">About the tutor</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {currentTeacher.subjects.map((item) => <span key={item} className="pill pill-inactive">{item}</span>)}
              {currentTeacher.grades.map((item) => <span key={item} className="pill pill-inactive">{item}</span>)}
              {currentTeacher.boards.map((item) => <span key={item} className="pill pill-inactive">{item}</span>)}
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Availability: {currentTeacher.availability.join(", ")}.
            </p>
            {currentTeacher.created_at ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Joined on {formatDate(currentTeacher.created_at)}.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="card-surface rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Parent reviews</p>
          <div className="mt-4 space-y-4">
            {teacherReviews.length ? (
              teacherReviews.map((review) => (
                <div key={review.id} className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{review.parent_name}</p>
                    <p className="text-sm text-[var(--muted)]">{review.rating} / 5</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{review.comment}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatDate(review.created_at)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4 text-sm text-[var(--muted)]">
                No reviews yet. Be the first parent to leave feedback.
              </div>
            )}
          </div>
        </div>

        {isParent && !isSelfTeacher ? (
          existingReview && !editingReview ? (
            <div className="card-surface rounded-[2rem] p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Your review</p>
              <div className="mt-4 rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--foreground)]">{existingReview.parent_name}</p>
                  <p className="text-sm text-[var(--muted)]">{existingReview.rating} / 5</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{existingReview.comment}</p>
              </div>
              <button
                type="button"
                className="btn-secondary mt-4 w-full px-5 py-3"
                onClick={() => {
                  setParentName(existingReview.parent_name);
                  setRating(existingReview.rating);
                  setComment(existingReview.comment);
                  setEditingReview(true);
                }}
              >
                Edit review
              </button>
            </div>
          ) : (
            <form className="card-surface rounded-[2rem] p-6" onSubmit={handleReviewSubmit}>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">{existingReview ? "Edit your review" : "Leave a review"}</p>
              {existingReview ? <p className="mt-2 text-sm text-[var(--muted)]">You've already reviewed this teacher.</p> : null}
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Your name</label>
                  <input className="field" value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="Parent name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Rating</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" onClick={() => setRating(value)} className={`pill ${rating === value ? "pill-active" : "pill-inactive"}`}>
                        {value} star{value > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Comment</label>
                  <textarea className="textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write one short line about your experience" required />
                </div>
                <button type="submit" className="btn-primary w-full px-5 py-3">{existingReview ? "Update review" : "Post review"}</button>
              </div>
            </form>
          )
        ) : (
          <div className="card-surface rounded-[2rem] p-6 text-sm text-[var(--muted)]">
            {isSelfTeacher
              ? "You cannot review your own profile."
              : "Reviews can only be submitted by logged-in parents."}
          </div>
        )}
      </section>
    </div>
  );
}
