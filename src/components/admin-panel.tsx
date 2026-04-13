"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import type { AppSnapshot } from "@/lib/mock-db";
import {
  deleteReviewById,
  loadAppState,
  setTeacherStatus,
  toggleFoundingMember,
} from "@/lib/mock-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

export function AdminPanel() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [snapshot, setSnapshot] = useState<AppSnapshot>({
    profiles: [],
    teachers: [],
    reviews: [],
    session: null,
  });
  const [isRemoteData, setIsRemoteData] = useState(false);

  const stats = {
    totalTeachers: snapshot.teachers.length,
    pendingTeachers: snapshot.teachers.filter((teacher) => teacher.status === "pending").length,
    verifiedTeachers: snapshot.teachers.filter((teacher) => teacher.status === "verified").length,
    totalParents: snapshot.profiles.filter((profile) => profile.role === "parent").length,
  };

  const loadModerationSnapshot = useCallback(async () => {
    const localSnapshot = loadAppState();
    const client = getSupabaseBrowserClient();

    if (!client) {
      setSnapshot(localSnapshot);
      setIsRemoteData(false);
      return;
    }

    const supabase = client as any;
    const [teacherResponse, profileResponse, reviewResponse] = await Promise.all([
      supabase
        .from("teacher_profiles")
        .select("id,user_id,photo_url,bio,subjects,grades,boards,locality,price_per_month,teaches_at,availability,experience_years,whatsapp_number,status,is_founding_member,created_at"),
      supabase.from("profiles").select("id,role,name,phone,created_at"),
      supabase.from("reviews").select("id,teacher_id,parent_id,rating,comment,created_at"),
    ]);

    if (teacherResponse.error || profileResponse.error || reviewResponse.error) {
      setSnapshot(localSnapshot);
      setIsRemoteData(false);
      return;
    }

    const teacherRows = (teacherResponse.data ?? []) as any[];
    const profileRows = (profileResponse.data ?? []) as any[];
    const reviewRows = (reviewResponse.data ?? []) as any[];

    const profileById = new Map<string, { name: string; phone: string; role: "teacher" | "parent"; created_at: string }>(
      profileRows.map((row) => [
        row.id,
        {
          name: row.name ?? "",
          phone: row.phone ?? "",
          role: row.role,
          created_at: row.created_at ?? new Date().toISOString(),
        },
      ]),
    );

    const reviewByTeacherId = new Map<string, { total: number; count: number }>();
    for (const review of reviewRows) {
      const aggregate = reviewByTeacherId.get(review.teacher_id) ?? { total: 0, count: 0 };
      aggregate.total += review.rating;
      aggregate.count += 1;
      reviewByTeacherId.set(review.teacher_id, aggregate);
    }

    const teachers = teacherRows.map((row) => {
      const profile = profileById.get(row.user_id);
      const aggregate = reviewByTeacherId.get(row.id);
      const reviewsCount = aggregate?.count ?? 0;
      const rating = reviewsCount ? Math.round((aggregate!.total / reviewsCount) * 10) / 10 : 0;

      return {
        id: row.id,
        user_id: row.user_id,
        name: profile?.name ?? "Tutor",
        photo_url: row.photo_url ?? "",
        bio: row.bio ?? "",
        subjects: row.subjects ?? [],
        grades: row.grades ?? [],
        boards: row.boards ?? [],
        locality: row.locality ?? "",
        price_per_month: row.price_per_month ?? 0,
        teaches_at: row.teaches_at,
        availability: row.availability ?? [],
        experience_years: row.experience_years ?? 0,
        whatsapp_number: row.whatsapp_number ?? profile?.phone ?? "",
        status: row.status,
        public_status: row.status,
        is_resubmission: false,
        is_founding_member: Boolean(row.is_founding_member),
        created_at: row.created_at ?? new Date().toISOString(),
        rating,
        reviews_count: reviewsCount,
        reviewCount: reviewsCount,
      };
    });

    const profiles = profileRows.map((row) => ({
      id: row.id,
      role: row.role,
      name: row.name ?? "",
      phone: row.phone ?? "",
      created_at: row.created_at ?? new Date().toISOString(),
    }));

    const reviews = reviewRows.map((row) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      parent_id: row.parent_id,
      parent_name: profileById.get(row.parent_id)?.name ?? "Parent",
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
    }));

    setSnapshot({
      profiles,
      teachers,
      reviews,
      session: localSnapshot.session,
    });
    setIsRemoteData(true);
  }, []);

  useEffect(() => {
    loadModerationSnapshot();
  }, [loadModerationSnapshot]);

  async function logoutAdmin() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
    router.replace("/admin/login");
  }

  async function approveTeacher(teacherId: string) {
    const client = getSupabaseBrowserClient();
    if (client) {
      const supabase = client as any;
      const { error } = await supabase.from("teacher_profiles").update({ status: "verified" }).eq("id", teacherId);
      if (error) {
        pushToast({ tone: "error", title: `Approve failed: ${error.message}` });
        return;
      }

      await loadModerationSnapshot();
      pushToast({ tone: "success", title: "Teacher approved" });
      return;
    }

    setTeacherStatus(teacherId, "verified");
    setSnapshot(loadAppState());
    pushToast({ tone: "success", title: "Teacher approved" });
  }

  async function rejectTeacher(teacherId: string) {
    const client = getSupabaseBrowserClient();
    if (client) {
      const supabase = client as any;
      const { error } = await supabase.from("teacher_profiles").update({ status: "rejected" }).eq("id", teacherId);
      if (error) {
        pushToast({ tone: "error", title: `Reject failed: ${error.message}` });
        return;
      }

      await loadModerationSnapshot();
      pushToast({ tone: "warning", title: "Teacher rejected" });
      return;
    }

    setTeacherStatus(teacherId, "rejected");
    setSnapshot(loadAppState());
    pushToast({ tone: "warning", title: "Teacher rejected" });
  }

  async function toggleFounder(teacherId: string) {
    const client = getSupabaseBrowserClient();
    if (client) {
      const current = snapshot.teachers.find((teacher) => teacher.id === teacherId);
      if (!current) {
        return;
      }

      const supabase = client as any;
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ is_founding_member: !current.is_founding_member })
        .eq("id", teacherId);

      if (error) {
        pushToast({ tone: "error", title: `Update failed: ${error.message}` });
        return;
      }

      await loadModerationSnapshot();
      pushToast({ tone: "success", title: "Founding badge updated" });
      return;
    }

    toggleFoundingMember(teacherId);
    setSnapshot(loadAppState());
    pushToast({ tone: "success", title: "Founding badge updated" });
  }

  async function removeReview(reviewId: string) {
    const client = getSupabaseBrowserClient();
    if (client) {
      const supabase = client as any;
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) {
        pushToast({ tone: "error", title: `Delete failed: ${error.message}` });
        return;
      }

      await loadModerationSnapshot();
      pushToast({ tone: "success", title: "Review deleted" });
      return;
    }

    deleteReviewById(reviewId);
    setSnapshot(loadAppState());
    pushToast({ tone: "success", title: "Review deleted" });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="card-surface rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Admin panel</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">TutorNest moderation</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">Approve teachers, reject incomplete submissions, and manage the founding member badge.</p>
            <p className="mt-3 text-sm text-[var(--muted)]">Data source: {isRemoteData ? "Supabase (shared across devices)" : "Local browser storage"}</p>
          </div>
          <button type="button" onClick={logoutAdmin} className="btn-secondary px-5 py-3 text-sm">Logout admin</button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total teachers" value={stats.totalTeachers} />
          <Stat label="Pending" value={stats.pendingTeachers} />
          <Stat label="Verified" value={stats.verifiedTeachers} />
          <Stat label="Parents" value={stats.totalParents} />
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="card-soft rounded-[2rem] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Pending teachers</p>
            <div className="mt-5 space-y-4">
              {snapshot.teachers.filter((teacher) => teacher.status === "pending").length ? (
                snapshot.teachers.filter((teacher) => teacher.status === "pending").map((teacher) => (
                  <div key={teacher.id} className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-2xl font-bold text-[var(--foreground)]">{teacher.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{teacher.locality} · {teacher.experience_years} years</p>
                      </div>
                      <span className="pill badge-pending">{teacher.is_resubmission ? "Re-submission" : "Pending"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{teacher.bio}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                      <span className="pill pill-inactive">{formatCurrency(teacher.price_per_month)}</span>
                      {teacher.subjects.slice(0, 3).map((subject) => <span key={subject} className="pill pill-inactive">{subject}</span>)}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button type="button" onClick={() => approveTeacher(teacher.id)} className="btn-primary flex-1 px-4 py-3 text-sm">Approve</button>
                      <button type="button" onClick={() => rejectTeacher(teacher.id)} className="btn-secondary flex-1 px-4 py-3 text-sm">Reject</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-5 text-sm text-[var(--muted)]">No pending teachers right now.</div>
              )}
            </div>
          </div>

          <div className="card-soft rounded-[2rem] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">All teachers</p>
            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[rgba(255,251,245,0.92)] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Founding</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{teacher.name}</td>
                      <td className="px-4 py-3 capitalize text-[var(--muted)]">{teacher.status}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{teacher.is_founding_member ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => toggleFounder(teacher.id)} className="btn-ghost px-3 py-2 text-xs font-semibold">
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8 card-soft rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Reviews</p>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgba(255,251,245,0.92)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.reviews.length ? (
                  snapshot.reviews.map((review) => {
                    const teacher = snapshot.teachers.find((entry) => entry.id === review.teacher_id);

                    return (
                      <tr key={review.id} className="border-t border-[var(--border)] align-top">
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{review.parent_name}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{teacher?.name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{review.rating} / 5</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{review.comment}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">{formatDate(review.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeReview(review.id)}
                            className="btn-secondary px-3 py-2 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-[var(--muted)]" colSpan={6}>No reviews available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
