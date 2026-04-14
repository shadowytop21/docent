"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import type { AppSnapshot } from "@/lib/mock-db";
import {
  defaultHomepageShowcaseConfig,
  loadAppState,
  loadHomepageShowcaseConfig,
  saveHomepageShowcaseConfig,
  setTeacherStatus,
  type HomepageShowcaseConfig,
} from "@/lib/mock-db";

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
  const [showcaseConfig, setShowcaseConfig] = useState<HomepageShowcaseConfig>(defaultHomepageShowcaseConfig);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [accountRoleFilter, setAccountRoleFilter] = useState<"all" | "teacher" | "parent">("all");

  const loadModerationSnapshot = useCallback(async () => {
    const response = await fetch("/api/admin/moderation", { cache: "no-store" });
    if (!response.ok) {
      setSnapshot(loadAppState());
      setIsRemoteData(false);
      return;
    }

    const data = (await response.json()) as AppSnapshot & { offline?: boolean };
    if (data.offline) {
      setSnapshot(loadAppState());
      setIsRemoteData(false);
      return;
    }

    setSnapshot(data);
    setIsRemoteData(true);
  }, []);

  useEffect(() => {
    loadModerationSnapshot();
    setShowcaseConfig(loadHomepageShowcaseConfig());
  }, [loadModerationSnapshot]);

  async function logoutAdmin() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
    router.replace("/admin/login");
  }

  async function approveTeacher(teacherId: string) {
    if (!isRemoteData) {
      setTeacherStatus(teacherId, "verified");
      setSnapshot(loadAppState());
      pushToast({ tone: "success", title: "Teacher approved" });
      return;
    }

    const response = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "verified" }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      pushToast({ tone: "error", title: payload.message ?? "Approve failed." });
      return;
    }

    await loadModerationSnapshot();
    pushToast({ tone: "success", title: "Teacher approved" });
  }

  async function rejectTeacher(teacherId: string) {
    if (!isRemoteData) {
      setTeacherStatus(teacherId, "rejected");
      setSnapshot(loadAppState());
      pushToast({ tone: "warning", title: "Teacher rejected" });
      return;
    }

    const response = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      pushToast({ tone: "error", title: payload.message ?? "Reject failed." });
      return;
    }

    await loadModerationSnapshot();
    pushToast({ tone: "warning", title: "Teacher rejected" });
  }

  async function toggleFoundingMember(teacherId: string, nextValue: boolean) {
    if (!isRemoteData) {
      pushToast({ tone: "warning", title: "Founding member toggle needs server mode." });
      return;
    }

    const response = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_founding_member: nextValue }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      pushToast({ tone: "error", title: payload.message ?? "Unable to update founding member status." });
      return;
    }

    await loadModerationSnapshot();
    pushToast({ tone: "success", title: nextValue ? "Marked as founding member" : "Removed founding member badge" });
  }

  async function deleteReview(reviewId: string) {
    if (!isRemoteData) {
      pushToast({ tone: "warning", title: "Review deletion needs server mode." });
      return;
    }

    const confirmed = window.confirm("Delete this review permanently?");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      pushToast({ tone: "error", title: payload.message ?? "Unable to delete review." });
      return;
    }

    await loadModerationSnapshot();
    pushToast({ tone: "success", title: "Review deleted" });
  }

  async function deleteAccount(profileId: string, name: string) {
    if (!isRemoteData) {
      pushToast({ tone: "warning", title: "Account deletion needs server mode." });
      return;
    }

    const confirmed = window.confirm(`Delete account for ${name}? This action is permanent.`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/accounts/${profileId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      pushToast({ tone: "error", title: payload.message ?? "Unable to delete account." });
      return;
    }

    await loadModerationSnapshot();
    pushToast({ tone: "warning", title: "Account deleted" });
  }

  const stats = {
    totalTeachers: snapshot.teachers.length,
    pendingTeachers: snapshot.teachers.filter((teacher) => teacher.status === "pending").length,
    verifiedTeachers: snapshot.teachers.filter((teacher) => teacher.status === "verified").length,
    totalParents: snapshot.profiles.filter((profile) => profile.role === "parent").length,
  };

  const pendingTeachers = snapshot.teachers.filter((teacher) => teacher.status === "pending");

  const visibleTeachers = useMemo(() => {
    const normalizedQuery = teacherSearch.trim().toLowerCase();
    return snapshot.teachers.filter((teacher) => {
      const statusMatch = teacherStatusFilter === "all" ? true : teacher.status === teacherStatusFilter;
      if (!statusMatch) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [teacher.name, teacher.locality, teacher.bio, ...teacher.subjects].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [snapshot.teachers, teacherSearch, teacherStatusFilter]);

  const visibleProfiles = useMemo(() => {
    return snapshot.profiles.filter((profile) => (accountRoleFilter === "all" ? true : profile.role === accountRoleFilter));
  }, [snapshot.profiles, accountRoleFilter]);

  const recentReviews = useMemo(() => {
    return [...snapshot.reviews]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 10);
  }, [snapshot.reviews]);

  function updateShowcaseCard(index: number, key: "initials" | "name" | "locality" | "price" | "rating" | "tags", value: string) {
    setShowcaseConfig((prev) => {
      const cards = [...prev.cards];
      const target = { ...cards[index] };

      if (key === "tags") {
        target.tags = value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3);
      } else if (key === "price") {
        target.price = Number(value || 0);
      } else if (key === "rating") {
        target.rating = Number(value || 0);
      } else if (key === "initials") {
        target.initials = value.toUpperCase().slice(0, 2);
      } else {
        target[key] = value;
      }

      cards[index] = target;
      return { ...prev, cards };
    });
  }

  function updateShowcaseStat(index: number, key: "label" | "value", value: string) {
    setShowcaseConfig((prev) => {
      const stats = [...prev.stats];
      stats[index] = { ...stats[index], [key]: value };
      return { ...prev, stats };
    });
  }

  function saveShowcase() {
    saveHomepageShowcaseConfig(showcaseConfig);
    pushToast({ tone: "success", title: "Homepage featured panel updated" });
  }

  return (
    <div className="page-section">
      <span className="page-label">Admin Panel</span>
      <div className="admin-page">
        <div className="admin-header">
          <div className="admin-title">Docent Admin</div>
          <div className="flex items-center gap-2">
            <div className="admin-badge">ADMIN</div>
            <button type="button" onClick={logoutAdmin} className="btn-outline px-3 py-1 text-xs">Logout</button>
          </div>
        </div>

        <div className="admin-stats">
          <div className="admin-stat"><div className="admin-stat-num">{stats.totalTeachers}</div><div className="admin-stat-label">Total Teachers</div></div>
          <div className="admin-stat"><div className="admin-stat-num text-[var(--saffron)]">{stats.pendingTeachers}</div><div className="admin-stat-label">Pending Verification</div></div>
          <div className="admin-stat"><div className="admin-stat-num text-[var(--green)]">{stats.verifiedTeachers}</div><div className="admin-stat-label">Verified Teachers</div></div>
          <div className="admin-stat"><div className="admin-stat-num">{stats.totalParents}</div><div className="admin-stat-label">Total Parents</div></div>
        </div>

        <div className="admin-table-section">
          <div className="mb-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 lg:grid-cols-[1.6fr_1fr_1fr]">
            <input
              className="form-input"
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder="Search teachers by name, subject, or locality"
            />
            <select className="form-input" value={teacherStatusFilter} onChange={(event) => setTeacherStatusFilter(event.target.value as typeof teacherStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={loadModerationSnapshot}>Refresh Admin Data</button>
          </div>

          <div className="admin-table-title">Pending Verification Requests</div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>Teacher</span>
              <span>Subjects</span>
              <span>Locality</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {(teacherStatusFilter === "pending" ? pendingTeachers : visibleTeachers).slice(0, 15).map((teacher) => (
              <div key={teacher.id} className="admin-table-row">
                <div>
                  <div className="admin-teacher-name">{teacher.name}</div>
                  <div className="admin-teacher-sub">{teacher.bio.slice(0, 62)}{teacher.bio.length > 62 ? "..." : ""}</div>
                </div>
                <div className="text-[13px] text-[var(--navy)]">{teacher.subjects.join(", ")}</div>
                <div className="text-[13px] text-[var(--navy)]">{teacher.locality}</div>
                <span className={`status-badge ${teacher.status === "verified" ? "status-verified" : "status-pending"}`}>{teacher.status === "verified" ? "Verified" : "Pending"}</span>
                <div className="admin-actions">
                  <button type="button" onClick={() => approveTeacher(teacher.id)} className="btn-approve">Verify</button>
                  <button type="button" onClick={() => rejectTeacher(teacher.id)} className="btn-reject">Reject</button>
                  <button type="button" onClick={() => toggleFoundingMember(teacher.id, !teacher.is_founding_member)} className="btn-secondary px-3 py-1 text-xs">
                    {teacher.is_founding_member ? "Remove Founder" : "Set Founder"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Data source: {isRemoteData ? "Supabase" : "Local browser storage"}</p>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="admin-table-title mb-0">Account Management</p>
              <select className="form-input max-w-[220px]" value={accountRoleFilter} onChange={(event) => setAccountRoleFilter(event.target.value as typeof accountRoleFilter)}>
                <option value="all">All accounts</option>
                <option value="teacher">Teacher accounts</option>
                <option value="parent">Parent accounts</option>
              </select>
            </div>

            <div className="admin-table">
              <div className="admin-table-row admin-table-head">
                <span>Name</span>
                <span>Role</span>
                <span>Phone</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>
              {visibleProfiles.slice(0, 20).map((profile) => (
                <div key={profile.id} className="admin-table-row">
                  <div>
                    <div className="admin-teacher-name">{profile.name}</div>
                    <div className="admin-teacher-sub">{profile.id.slice(0, 8)}...</div>
                  </div>
                  <div className="text-[13px] text-[var(--navy)] capitalize">{profile.role}</div>
                  <div className="text-[13px] text-[var(--navy)]">{profile.phone || "-"}</div>
                  <div className="text-[13px] text-[var(--navy)]">{new Date(profile.created_at).toLocaleDateString()}</div>
                  <div className="admin-actions">
                    <button type="button" onClick={() => deleteAccount(profile.id, profile.name)} className="btn-reject">Delete Account</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5">
            <p className="admin-table-title mb-4">Recent Review Moderation</p>
            <div className="admin-table">
              <div className="admin-table-row admin-table-head">
                <span>Reviewer</span>
                <span>Teacher ID</span>
                <span>Rating</span>
                <span>Comment</span>
                <span>Actions</span>
              </div>
              {recentReviews.map((review) => (
                <div key={review.id} className="admin-table-row">
                  <div className="text-[13px] text-[var(--navy)]">{review.parent_name}</div>
                  <div className="text-[13px] text-[var(--navy)]">{review.teacher_id.slice(0, 8)}...</div>
                  <div className="text-[13px] text-[var(--navy)]">{review.rating}/5</div>
                  <div className="text-[13px] text-[var(--navy)]">{review.comment.slice(0, 60)}{review.comment.length > 60 ? "..." : ""}</div>
                  <div className="admin-actions">
                    <button type="button" onClick={() => deleteReview(review.id)} className="btn-reject">Delete Review</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5">
            <p className="admin-table-title mb-4">Homepage Featured Panel Editor</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {showcaseConfig.cards.map((card, index) => (
                <div key={`card-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--ivory)] p-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--navy)]">Card {index + 1}</p>
                  <div className="grid gap-2">
                    <input className="form-input" value={card.initials} onChange={(e) => updateShowcaseCard(index, "initials", e.target.value)} placeholder="Initials" />
                    <input className="form-input" value={card.name} onChange={(e) => updateShowcaseCard(index, "name", e.target.value)} placeholder="Name" />
                    <input className="form-input" value={card.locality} onChange={(e) => updateShowcaseCard(index, "locality", e.target.value)} placeholder="Locality" />
                    <input className="form-input" value={card.tags.join(", ")} onChange={(e) => updateShowcaseCard(index, "tags", e.target.value)} placeholder="Tags (comma separated)" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="form-input" type="number" value={card.price} onChange={(e) => updateShowcaseCard(index, "price", e.target.value)} placeholder="Price" />
                      <input className="form-input" type="number" step="0.1" min="0" max="5" value={card.rating} onChange={(e) => updateShowcaseCard(index, "rating", e.target.value)} placeholder="Rating" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {showcaseConfig.stats.map((stat, index) => (
                <div key={`stat-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--ivory)] p-4">
                  <input className="form-input mb-2" value={stat.label} onChange={(e) => updateShowcaseStat(index, "label", e.target.value)} placeholder="Label" />
                  <input className="form-input" value={stat.value} onChange={(e) => updateShowcaseStat(index, "value", e.target.value)} placeholder="Value" />
                </div>
              ))}
            </div>

            <button type="button" onClick={saveShowcase} className="btn-fill mt-5">Save Homepage Panel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
