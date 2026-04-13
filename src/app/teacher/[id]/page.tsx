"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { isTeacherVisiblePublicly, loadAppState } from "@/lib/mock-db";
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
  const [showContactLoginModal, setShowContactLoginModal] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [remoteTeachers, setRemoteTeachers] = useState<TeacherRecord[] | null>(null);
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[] | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadRemoteCatalog = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadRemoteCatalog();
  }, [loadRemoteCatalog]);

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

  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !isParent) {
      router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`);
      return;
    }

    const actualParentName = parentName || session.name || "Parent";

    // Server endpoint is the source of truth for duplicate/rate-limit and role checks.
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherId: currentTeacher.id,
        parentId: session.id,
        parentName: actualParentName,
        rating,
        comment,
        allowEdit: Boolean(existingReview),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      pushToast({ tone: "error", title: payload.message ?? "Unable to submit review" });
      return;
    }

    await loadRemoteCatalog();
    setEditingReview(false);
    setRefreshKey((value) => value + 1);
    pushToast({ tone: "success", title: existingReview ? "Review updated" : "Review posted" });
  }

  async function handleContactTeacher() {
    if (!session || !isParent) {
      setShowContactLoginModal(true);
      return;
    }

    const openWhatsApp = (number: string) => {
      window.open(
        whatsappLink(number, "Hi, I found your profile on TutorNest and I'm interested in home tuition for my child."),
        "_blank",
        "noopener,noreferrer",
      );
    };

    if (contactNumber) {
      openWhatsApp(contactNumber);
      return;
    }

    setIsContactLoading(true);
    const response = await fetch("/api/teacher/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherId: currentTeacher.id,
        parentId: session.id,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; whatsappNumber?: string };
    setIsContactLoading(false);

    if (!response.ok || !payload.whatsappNumber) {
      pushToast({ tone: "error", title: payload.message ?? "Unable to fetch contact details." });
      return;
    }

    setContactNumber(payload.whatsappNumber);
    openWhatsApp(payload.whatsappNumber);
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
              <button
                type="button"
                onClick={handleContactTeacher}
                disabled={isContactLoading}
                className="whatsapp-pulse btn-primary mt-6 w-full rounded-full bg-[#25D366] px-6 py-4 text-base disabled:opacity-60"
              >
                {isContactLoading ? "Fetching contact..." : "Message on WhatsApp"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowContactLoginModal(true)}
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

      {showContactLoginModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="card-surface w-full max-w-md rounded-[1.5rem] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Contact teacher</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-[var(--foreground)]">Login as parent to continue</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Only logged-in parents can contact teachers directly on WhatsApp.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="btn-secondary w-full px-4 py-3 text-sm"
                onClick={() => setShowContactLoginModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary w-full px-4 py-3 text-sm"
                onClick={() => router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`)}
              >
                Login as Parent
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
