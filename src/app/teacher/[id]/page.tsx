"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { isTeacherVisiblePublicly, loadAppState, submitReview } from "@/lib/mock-db";
import { getTeacherFromCache, upsertTeachersToCache } from "@/lib/teacher-cache";
import { isTeacherSaved, recordTeacherContact, recordTeacherProfileView, toggleTeacherSaved } from "@/lib/teacher-analytics";
import { formatCurrency, formatDate, whatsappLink } from "@/lib/utils";
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
  const whatsappButtonRef = useRef<HTMLButtonElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [remoteTeachers, setRemoteTeachers] = useState<TeacherRecord[] | null>(null);
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[] | null>(null);
  const [isRemoteLoading, setIsRemoteLoading] = useState(true);
  const [localSnapshot, setLocalSnapshot] = useState(() => loadAppState());
  const [cachedTeacher, setCachedTeacher] = useState<TeacherRecord | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [isSavedByParent, setIsSavedByParent] = useState(false);
  const viewedTeacherIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setCachedTeacher(getTeacherFromCache(params.id));
  }, []);

  const loadRemoteCatalog = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/teacher/${params.id}`, { signal });
      if (!response.ok) {
        setIsRemoteLoading(false);
        return;
      }

      const payload = (await response.json()) as { teacher?: TeacherRecord | null; reviews?: ReviewRecord[]; offline?: boolean };
      if (payload.offline) {
        setIsRemoteLoading(false);
        return;
      }

      if (payload.teacher) {
        upsertTeachersToCache([payload.teacher]);
        setCachedTeacher(payload.teacher);
      }

      setRemoteTeachers(payload.teacher ? [payload.teacher] : []);
      setRemoteReviews(payload.reviews ?? []);
      setIsRemoteLoading(false);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setIsRemoteLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const waButton = whatsappButtonRef.current;
    if (!waButton || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      waButton.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
    }, { threshold: 0.5 });

    observer.observe(waButton);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      setLocalSnapshot(loadAppState());
    }
  }, [mounted, refreshKey]);

  const fallbackSnapshot = useMemo(() => localSnapshot, [localSnapshot]);
  const mergedTeachers = useMemo(() => {
    const byId = new Map<string, TeacherRecord>();

    for (const item of remoteTeachers ?? []) {
      byId.set(item.id, item);
    }

    if (cachedTeacher && !byId.has(cachedTeacher.id)) {
      byId.set(cachedTeacher.id, cachedTeacher);
    }

    for (const item of fallbackSnapshot.teachers) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    return Array.from(byId.values());
  }, [cachedTeacher, remoteTeachers, fallbackSnapshot.teachers]);

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
  const hasLocalTeacher = Boolean(cachedTeacher) || fallbackSnapshot.teachers.some((item) => item.id === params.id);

  useEffect(() => {
    const controller = new AbortController();
    if (hasLocalTeacher) {
      setIsRemoteLoading(false);
    }

    loadRemoteCatalog(controller.signal);
    return () => {
      controller.abort();
    };
  }, [hasLocalTeacher, loadRemoteCatalog]);

  const showLoading = !teacher && isRemoteLoading;

  if (!mounted || showLoading) {
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
  const isRejected = currentTeacher.status === "rejected";

  if (isRejected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">Teacher not found</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">The tutor you are looking for may not exist or may not be public yet.</p>
        <button type="button" onClick={() => router.push("/browse")} className="btn-primary mt-8 px-6 py-3 text-sm">Back to browse</button>
      </div>
    );
  }

  const isParent = session?.role === "parent";
  const isTeacherSession = session?.role === "teacher";
  const isSelfTeacher = Boolean(session?.id && currentTeacher.user_id === session.id);
  const existingReview = isParent
    ? teacherReviews.find((review) => review.parent_id === session?.id) ?? null
    : null;
  const initials = currentTeacher.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!mounted || !currentTeacher) {
      return;
    }

    if (viewedTeacherIdRef.current === currentTeacher.id) {
      return;
    }

    viewedTeacherIdRef.current = currentTeacher.id;
    recordTeacherProfileView(currentTeacher.id);
  }, [currentTeacher]);

  useEffect(() => {
    if (!isParent || !session?.id) {
      setIsSavedByParent(false);
      return;
    }

    setIsSavedByParent(isTeacherSaved(currentTeacher.id, session.id));
  }, [currentTeacher.id, isParent, session?.id]);

  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !isParent) {
      router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`);
      return;
    }

    const actualParentName = parentName || session.name || "Parent";

    try {
      submitReview({
        teacherId: currentTeacher.id,
        parentId: session.id,
        parentName: actualParentName,
        rating,
        comment,
        allowEdit: Boolean(existingReview),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit review";
      pushToast({ tone: "error", title: message });
      return;
    }

    await loadRemoteCatalog();
    setEditingReview(false);
    setRefreshKey((value) => value + 1);
    setLocalSnapshot(loadAppState());
    pushToast({ tone: "success", title: existingReview ? "Review updated" : "Review posted" });
  }

  async function handleContactTeacher() {
    if (!session) {
      setShowContactLoginModal(true);
      return;
    }

    if (isTeacherSession) {
      pushToast({ tone: "neutral", title: "Teachers cannot contact their own profile." });
      return;
    }

    if (!isParent) {
      setShowContactLoginModal(true);
      return;
    }

    if (!currentTeacher.whatsapp_number) {
      pushToast({ tone: "error", title: "WhatsApp number is not available for this teacher." });
      return;
    }

    setIsContactLoading(true);
    recordTeacherContact(currentTeacher.id);
    window.open(
      whatsappLink(currentTeacher.whatsapp_number, "Hi, I found your profile on Docent and I'm interested in home tuition for my child."),
      "_blank",
      "noopener,noreferrer",
    );
    setIsContactLoading(false);
  }

  function handleSaveProfile() {
    if (!session) {
      router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`);
      return;
    }

    if (!isParent || !session.id) {
      pushToast({ tone: "neutral", title: "Only parents can save tutor profiles." });
      return;
    }

    const nextSaved = toggleTeacherSaved(currentTeacher.id, session.id);
    setIsSavedByParent(nextSaved);
    pushToast({ tone: "success", title: nextSaved ? "Profile saved" : "Profile removed from saved list" });
  }

  return (
    <div className="page-section">
      <span className="page-label">Teacher Profile Page</span>
      <div className="profile-page">
        <div className="profile-main">
          <div className="profile-top">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {currentTeacher.photo_url && !photoFailed ? (
                  <img
                    src={currentTeacher.photo_url}
                    alt={currentTeacher.name}
                    className="profile-avatar-image"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="profile-online" />
            </div>
            <div className="profile-name-section">
              <h1 className="profile-name">{currentTeacher.name}</h1>
              <p className="profile-tagline">{currentTeacher.subjects.join(" & ")} Tutor · {currentTeacher.locality}</p>
              <div className="profile-badges">
                <span className="pill badge-verified">Verified</span>
                <span className="pill pill-inactive">{currentTeacher.experience_years} years experience</span>
              </div>
              <div className="profile-stats-row">
                <div className="pstat"><div className="pstat-num">{currentTeacher.rating.toFixed(1)}</div><div className="pstat-label">Rating</div></div>
                <div className="pstat"><div className="pstat-num">{teacherReviews.length}</div><div className="pstat-label">Reviews</div></div>
                <div className="pstat"><div className="pstat-num">{currentTeacher.experience_years} years</div><div className="pstat-label">Experience</div></div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">About</div>
            <p className="profile-bio">{currentTeacher.bio}</p>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">Subjects</div>
            <div className="profile-subjects">
              {currentTeacher.subjects.map((item) => <span key={item} className="profile-subject">{item}</span>)}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">Details</div>
            <div className="profile-details-grid">
              <div className="profile-detail-box"><div className="pdbox-label">Grades</div><div className="pdbox-val">{currentTeacher.grades.join(", ")}</div></div>
              <div className="profile-detail-box"><div className="pdbox-label">Board</div><div className="pdbox-val">{currentTeacher.boards.join(", ")}</div></div>
              <div className="profile-detail-box"><div className="pdbox-label">Teaches at</div><div className="pdbox-val capitalize">{currentTeacher.teaches_at.replace("_", " ")}</div></div>
              <div className="profile-detail-box"><div className="pdbox-label">Availability</div><div className="pdbox-val">{currentTeacher.availability.join(", ")}</div></div>
              <div className="profile-detail-box"><div className="pdbox-label">Locality</div><div className="pdbox-val">{currentTeacher.locality}</div></div>
              <div className="profile-detail-box"><div className="pdbox-label">Price</div><div className="pdbox-val">{formatCurrency(currentTeacher.price_per_month)}</div></div>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-title">Write a Review</div>
            {isParent ? (
              <form onSubmit={handleReviewSubmit} className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="form-label" htmlFor="review-parent-name">Your name</label>
                    <input id="review-parent-name" className="form-input" value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="Parent name" />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="review-rating">Rating</label>
                    <select id="review-rating" className="form-input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="review-comment">Review</label>
                  <textarea id="review-comment" className="form-input min-h-[120px]" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write about the teaching quality, punctuality, and clarity..." />
                </div>
                <button type="submit" className="btn-primary w-fit px-5 py-3 text-sm">{existingReview ? "Update review" : "Post review"}</button>
              </form>
            ) : (
              <div className="review-card">
                <p className="text-sm text-[var(--muted)]">Login as a parent to leave a review for this teacher.</p>
                <button type="button" onClick={() => router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`)} className="btn-primary mt-4 px-5 py-3 text-sm">Login to review</button>
              </div>
            )}
          </div>

          <div className="profile-section">
            <div className="profile-section-title">Parent Reviews ({teacherReviews.length})</div>
            {teacherReviews.length ? (
              teacherReviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-top">
                    <div className="reviewer">
                      <div className="reviewer-avatar">PR</div>
                      <div>
                        <div className="reviewer-name">{review.parent_name}</div>
                        <div className="reviewer-date">{formatDate(review.created_at)}</div>
                      </div>
                    </div>
                    <div className="review-stars">{review.rating.toFixed(1)} / 5</div>
                  </div>
                  <p className="review-text">{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="review-card">No reviews yet.</div>
            )}
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="contact-card">
            <div className="contact-price">{formatCurrency(currentTeacher.price_per_month)} <span>/ month</span></div>
            <div className="contact-price-note">Per student</div>
            {isParent ? (
              <button
                type="button"
                onClick={handleContactTeacher}
                disabled={isContactLoading}
                ref={whatsappButtonRef}
                className="btn-whatsapp"
              >
                {isContactLoading ? "Fetching contact..." : "Contact on WhatsApp"}
              </button>
            ) : isTeacherSession ? (
              <button type="button" disabled className="btn-whatsapp opacity-80">Contact unavailable to teachers</button>
            ) : (
              <button type="button" onClick={() => setShowContactLoginModal(true)} className="btn-whatsapp">Login to Contact</button>
            )}
            {isParent ? (
              <button type="button" onClick={handleSaveProfile} className="btn-save">
                {isSavedByParent ? "Saved" : "Save Profile"}
              </button>
            ) : isTeacherSession ? (
              <button type="button" onClick={() => router.push("/teacher/dashboard")} className="btn-save">Open Dashboard</button>
            ) : (
              <button type="button" onClick={() => router.push(`/auth?role=parent&next=/teacher/${currentTeacher.id}`)} className="btn-save">Login to Save</button>
            )}
          </div>

          <div className="sidebar-detail"><div className="sd-icon sd-icon-location" aria-hidden="true" /><div><div className="sd-label">Location</div><div className="sd-val">{currentTeacher.locality}</div></div></div>
          <div className="sidebar-detail"><div className="sd-icon sd-icon-availability" aria-hidden="true" /><div><div className="sd-label">Availability</div><div className="sd-val">{currentTeacher.availability.join(" & ")}</div></div></div>
          <div className="sidebar-detail"><div className="sd-icon sd-icon-response" aria-hidden="true" /><div><div className="sd-label">Response time</div><div className="sd-val">No response data yet</div></div></div>
          <div className="sidebar-detail"><div className="sd-icon sd-icon-contact" aria-hidden="true" /><div><div className="sd-label">Parents contacted</div><div className="sd-val">Real contacts are tracked here</div></div></div>
        </div>
      </div>

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
    </div>
  );
}
