"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { loadAppState } from "@/lib/mock-db";
import { getTeacherAnalyticsSummary } from "@/lib/teacher-analytics";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [analyticsTick, setAnalyticsTick] = useState(0);

  useEffect(() => {
    const snapshot = loadAppState();
    if (!snapshot.session) {
      router.replace("/auth");
      return;
    }

    if (snapshot.session.role !== "teacher") {
      router.replace("/browse");
      return;
    }

    setMounted(true);
  }, [router]);

  if (!mounted) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading dashboard...</div>;
  }

  const snapshot = loadAppState();
  const session = snapshot.session!;
  const teacher = snapshot.teachers.find((item) => item.user_id === session.id || item.name === session.name);

  if (!teacher) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="card-surface w-full rounded-[2rem] p-10 text-center">
          <h1 className="font-display text-4xl font-bold text-[var(--foreground)]">No teacher profile yet</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">Create your teaching profile to start appearing in search results.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/teacher/setup" className="btn-primary px-6 py-3 text-sm">Create profile</Link>
            <Link href="/browse" className="btn-secondary px-6 py-3 text-sm">Browse Teachers</Link>
          </div>
        </div>
      </div>
    );
  }

  const currentTeacher = teacher;

  const analytics = useMemo(() => getTeacherAnalyticsSummary(currentTeacher.id), [currentTeacher.id, analyticsTick]);

  useEffect(() => {
    const refreshAnalytics = () => setAnalyticsTick((value) => value + 1);

    refreshAnalytics();
    window.addEventListener("docent-teacher-analytics-change", refreshAnalytics);
    window.addEventListener("storage", refreshAnalytics);

    const intervalId = window.setInterval(refreshAnalytics, 15000);

    return () => {
      window.removeEventListener("docent-teacher-analytics-change", refreshAnalytics);
      window.removeEventListener("storage", refreshAnalytics);
      window.clearInterval(intervalId);
    };
  }, [currentTeacher.id]);

  const profileCompletionItems = useMemo(() => {
    const items = [
      { label: "Profile photo uploaded", done: Boolean(currentTeacher.photo_url) },
      { label: "Bio written", done: Boolean(currentTeacher.bio.trim()) },
      { label: "Subjects & grades filled", done: currentTeacher.subjects.length > 0 && currentTeacher.grades.length > 0 },
      { label: "Location & price set", done: Boolean(currentTeacher.locality.trim()) && currentTeacher.price_per_month > 0 },
      { label: "WhatsApp number added", done: Boolean(currentTeacher.whatsapp_number.trim()) },
    ];

    return items;
  }, [currentTeacher.bio, currentTeacher.grades.length, currentTeacher.locality, currentTeacher.photo_url, currentTeacher.price_per_month, currentTeacher.subjects.length, currentTeacher.whatsapp_number]);

  const completionPercent = Math.round((profileCompletionItems.filter((item) => item.done).length / profileCompletionItems.length) * 100);

  function copyProfileLink() {
    const profileUrl = `${window.location.origin}/teacher/${currentTeacher.id}`;

    if (!navigator.clipboard) {
      pushToast({ tone: "error", title: "Clipboard access is not available" });
      return;
    }

    navigator.clipboard.writeText(profileUrl).then(() => {
      pushToast({ tone: "success", title: "Profile link copied" });
    });
  }

  const completionItems = [
    ...profileCompletionItems,
  ];

  return (
    <div className="page-section">
      <span className="page-label">Teacher Dashboard</span>
      <div className="dashboard-layout">
        <div className="dash-sidebar">
          <div className="dash-sidebar-profile">
            <div className="dash-sidebar-kicker">
              Logged in as
            </div>
            <div className="dash-sidebar-name">{session.name}</div>
            <div className="dash-sidebar-role">Teacher</div>
          </div>
          <Link href="/teacher/dashboard" className="dash-nav-item active" aria-current="page"><span className="dash-nav-icon">DB</span> Dashboard</Link>
          <Link href={`/teacher/${teacher.id}`} className="dash-nav-item"><span className="dash-nav-icon">PR</span> My Profile</Link>
          <Link href="#analytics" className="dash-nav-item"><span className="dash-nav-icon">AN</span> Analytics</Link>
          <Link href="#reviews" className="dash-nav-item"><span className="dash-nav-icon">RV</span> Reviews</Link>
          <div className="dash-nav-divider" />
          <Link href="/teacher/setup?edit=1" className="dash-nav-item"><span className="dash-nav-icon">ST</span> Settings</Link>
          <button type="button" onClick={copyProfileLink} className="dash-nav-item dash-nav-button w-full text-left"><span className="dash-nav-icon">LK</span> Copy Link</button>
        </div>

        <div className="dash-main">
          <div className="dash-header">
            <div>
              <h1 className="dash-title">Welcome back, {session.name}</h1>
              <p className="dash-sub">Your profile is {teacher.status} · Last updated recently</p>
            </div>
            <div className="dash-actions" aria-label="Quick actions">
              <Link href={`/teacher/${teacher.id}`} className="dash-action-btn">View Profile</Link>
              <Link href="/teacher/setup?edit=1" className="dash-action-btn">Edit Profile</Link>
              <button type="button" onClick={copyProfileLink} className="dash-action-btn">Share Link</button>
            </div>
          </div>

          <div className="dash-stats">
            <div className="dash-stat-card">
              <div className="dash-stat-icon">VW</div>
              <div className="dash-stat-num">{Math.max(teacher.reviews_count * 5, 24)}</div>
              <div className="dash-stat-label">Profile views this week</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-icon">CT</div>
              <div className="dash-stat-num">{teacher.reviews_count + 12}</div>
              <div className="dash-stat-label">WhatsApp contacts</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-icon">RT</div>
              <div className="dash-stat-num">{teacher.rating.toFixed(1)}</div>
              <div className="dash-stat-label">Average rating</div>
            </div>
            <div className="dash-stat-card">
              <div className="dash-stat-icon">SV</div>
              <div className="dash-stat-num">{teacher.reviews_count + 8}</div>
              <div className="dash-stat-label">Parents saved you</div>
            </div>
          </div>

          <div className="dash-grid">
            <div className="dash-card">
              <div className="dash-card-title">Profile Completion</div>
              <div className="completion-wrap">
                <div className="completion-header">
                  <span className="completion-pct">{completionPercent}%</span>
                  <span className="completion-label">Based on filled profile fields</span>
                </div>
                <div className="completion-bar-bg">
                  <div className="completion-bar-fill" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
              <div className="completion-items">
                {completionItems.map((item, index) => (
                  <div key={item.label} className="completion-item">
                    <div className={`ci-dot ${item.done ? "done" : ""}`} />
                    <span className={`ci-text ${item.done ? "done" : ""}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="verify-box">
                <div className="verify-box-title">Get Verified</div>
                <div className="verify-box-sub">Verified tutors appear higher in filtered results. Upload one document to request review.</div>
                <Link href="/teacher/setup?edit=1" className="btn-saffron inline-flex items-center justify-center">Upload Document & Request</Link>
              </div>
            </div>
          </div>

          <section id="analytics" className="dash-section" aria-labelledby="analytics-title">
            <div className="dash-section-head">
              <div>
                <div className="dash-card-title">Analytics</div>
                <h2 id="analytics-title" className="dash-section-title">Track profile activity</h2>
              </div>
              <Link href={`/teacher/${teacher.id}`} className="dash-mini-link">Open public profile</Link>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-num">{analytics.viewsLast7Days}</div>
                <div className="analytics-label">Profile views this week</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-num">{analytics.contactsLast7Days}</div>
                <div className="analytics-label">WhatsApp contacts</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-num">{analytics.savedCount}</div>
                <div className="analytics-label">Parents saved you</div>
              </div>
            </div>
          </section>

          <section id="reviews" className="dash-section" aria-labelledby="reviews-title">
            <div className="dash-section-head">
              <div>
                <div className="dash-card-title">Reviews</div>
                <h2 id="reviews-title" className="dash-section-title">Recent feedback</h2>
              </div>
              <Link href={`/teacher/${teacher.id}`} className="dash-mini-link">See all reviews</Link>
            </div>
            <div className="dash-review-note">
              Your current public rating is <strong>{teacher.rating.toFixed(1)}</strong> from <strong>{teacher.reviews_count}</strong> review{teacher.reviews_count === 1 ? "" : "s"}.
              <span className="block pt-2 text-[12px] text-[var(--muted)]">Analytics refresh in real time as parents view, contact, and save your profile.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
