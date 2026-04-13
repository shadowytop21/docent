"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TeacherCard } from "@/components/teacher-card";
import { useToast } from "@/components/toast-provider";
import {
  availabilityOptions,
  boardOptions,
  computeFilteredTeachers,
  type ReviewRecord,
  type TeacherRecord,
  gradeOptions,
  localityOptions,
  subjectOptions,
  teacherSubjects,
} from "@/lib/data";
import { loadAppState } from "@/lib/mock-db";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const categoryChips = ["All", ...teacherSubjects.slice(0, 6)];

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { pushToast } = useToast();
  const [query, setQuery] = useState(searchParams.get("q") ?? searchParams.get("subject") ?? "");
  const [subject, setSubject] = useState(searchParams.get("subject") ?? "");
  const [grade, setGrade] = useState(searchParams.get("grade") ?? "");
  const [locality, setLocality] = useState(searchParams.get("locality") ?? "");
  const [board, setBoard] = useState(searchParams.get("board") ?? "");
  const [availability, setAvailability] = useState(searchParams.get("availability") ?? "");
  const [priceMax, setPriceMax] = useState(Number(searchParams.get("priceMax") ?? 5000));
  const [mounted, setMounted] = useState(false);
  const [remoteTeachers, setRemoteTeachers] = useState<TeacherRecord[] | null>(null);
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[] | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadRemoteCatalog() {
      const client = getSupabaseBrowserClient();
      if (!client) {
        return;
      }

      const supabase = client as any;

      const { data: teacherRows, error: teacherError } = await supabase
        .from("teacher_profiles")
        .select("id,user_id,photo_url,bio,subjects,grades,boards,locality,price_per_month,teaches_at,availability,experience_years,whatsapp_number,status,is_founding_member,created_at")
        .eq("status", "verified");

      if (teacherError || !teacherRows) {
        return;
      }

      const userIds = teacherRows.map((row: any) => row.user_id).filter(Boolean);
      const teacherIds = teacherRows.map((row: any) => row.id).filter(Boolean);

      const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id,name").in("id", userIds)
          : Promise.resolve({ data: [] }),
        teacherIds.length
          ? supabase.from("reviews").select("id,teacher_id,parent_id,rating,comment,created_at").in("teacher_id", teacherIds)
          : Promise.resolve({ data: [] }),
      ]);

      const namesByUserId = new Map<string, string>(
        ((profileRows ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
      );

      const normalizedReviews: ReviewRecord[] = ((reviewRows ?? []) as any[]).map((row) => ({
        id: row.id,
        teacher_id: row.teacher_id,
        parent_id: row.parent_id,
        parent_name: "Parent",
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
      }));

      const ratingsByTeacherId = new Map<string, { total: number; count: number }>();
      for (const review of normalizedReviews) {
        const aggregate = ratingsByTeacherId.get(review.teacher_id) ?? { total: 0, count: 0 };
        aggregate.total += review.rating;
        aggregate.count += 1;
        ratingsByTeacherId.set(review.teacher_id, aggregate);
      }

      const normalizedTeachers: TeacherRecord[] = (teacherRows as any[]).map((row) => {
        const aggregate = ratingsByTeacherId.get(row.id);
        const reviewsCount = aggregate?.count ?? 0;
        const rating = reviewsCount ? Math.round((aggregate!.total / reviewsCount) * 10) / 10 : 0;

        return {
          id: row.id,
          user_id: row.user_id,
          created_at: row.created_at,
          name: namesByUserId.get(row.user_id) ?? "Tutor",
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
          whatsapp_number: row.whatsapp_number ?? "",
          status: row.status,
          public_status: row.status,
          is_founding_member: Boolean(row.is_founding_member),
          is_resubmission: false,
          rating,
          reviews_count: reviewsCount,
          reviewCount: reviewsCount,
        };
      });

      setRemoteTeachers(normalizedTeachers);
      setRemoteReviews(normalizedReviews);
    }

    loadRemoteCatalog();
  }, []);

  useEffect(() => {
    const current = new URLSearchParams(searchParams.toString());
    if (query) current.set("q", query); else current.delete("q");
    if (subject) current.set("subject", subject); else current.delete("subject");
    if (grade) current.set("grade", grade); else current.delete("grade");
    if (locality) current.set("locality", locality); else current.delete("locality");
    if (board) current.set("board", board); else current.delete("board");
    if (availability) current.set("availability", availability); else current.delete("availability");
    if (priceMax < 5000) current.set("priceMax", String(priceMax)); else current.delete("priceMax");
    const next = current.toString();
    const path = next ? `${pathname}?${next}` : pathname;
    router.replace(path, { scroll: false });
  }, [availability, board, grade, locality, pathname, priceMax, query, router, searchParams, subject]);

  const fallbackSnapshot = mounted ? loadAppState() : { teachers: [], reviews: [] };
  const snapshot = {
    teachers: remoteTeachers ?? fallbackSnapshot.teachers,
    reviews: remoteReviews ?? fallbackSnapshot.reviews,
  };
  const teachers = useMemo(
    () =>
      computeFilteredTeachers((snapshot.teachers ?? []).filter((teacher) => teacher.status === "verified" || teacher.public_status === "verified"), {
        query,
        subject: subject || undefined,
        grade: grade || undefined,
        locality: locality || undefined,
        board: board || undefined,
        availability: availability || undefined,
        priceMax,
      },
      snapshot.reviews ?? []),
    [availability, board, grade, locality, priceMax, query, snapshot.reviews, snapshot.teachers, subject],
  );

  function resetFilters() {
    setQuery("");
    setSubject("");
    setGrade("");
    setLocality("");
    setBoard("");
    setAvailability("");
    setPriceMax(5000);
    pushToast({ tone: "neutral", title: "Filters cleared" });
  }

  function applyCategory(value: string) {
    setSubject(value === "All" ? "" : value);
    if (value !== "All") {
      setQuery(value);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
      <section className="card-surface rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Browse tutors</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">Find tutors in Mathura</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Search by subject, grade, locality, board, price, or availability. Verified teachers appear first.
            </p>
          </div>
          <Link href="/teacher/setup" className="btn-primary px-6 py-3 text-sm">
            Join as teacher
          </Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Search</label>
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Maths, Civil Lines, Class 9..." />
          </div>
          <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Price max: ₹{priceMax}</label>
            <input className="w-full accent-[var(--primary)]" type="range" min="0" max="5000" step="100" value={priceMax} onChange={(event) => setPriceMax(Number(event.target.value))} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categoryChips.map((item) => (
            <button key={item} type="button" onClick={() => applyCategory(item)} className={`pill ${subject === item || (item === "All" && !subject) ? "pill-active" : "pill-inactive"}`}>
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <select className="select" value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="">Subject</option>
            {subjectOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="select" value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">Grade</option>
            {gradeOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="select" value={locality} onChange={(event) => setLocality(event.target.value)}>
            <option value="">Locality</option>
            {localityOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="select" value={board} onChange={(event) => setBoard(event.target.value)}>
            <option value="">Board</option>
            {boardOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="select" value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="">Availability</option>
            {availabilityOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
          <p>{teachers.length} tutors found</p>
          <button type="button" onClick={resetFilters} className="btn-ghost px-4 py-2 text-sm font-semibold">
            Clear all filters
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        {teachers.length ? (
          teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
        ) : (
          <div className="card-surface col-span-full rounded-[2rem] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-soft)] text-3xl">🌿</div>
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)]">No tutors found for these filters. Try adjusting your search.</h2>
            <p className="mt-3 text-lg leading-8 text-[var(--muted)]">You can broaden subject, board, locality, or price to discover more tutors.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={resetFilters} className="btn-primary px-6 py-3 text-sm">Clear all filters</button>
              <Link href="/teacher/setup" className="btn-secondary px-6 py-3 text-sm">Add a tutor profile</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
