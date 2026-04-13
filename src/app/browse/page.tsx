"use client";

import { useEffect, useMemo, useState } from "react";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";
import { TeacherCard } from "@/components/teacher-card";
import { useToast } from "@/components/toast-provider";
import {
  availabilityOptions,
  boardOptions,
  computeFilteredTeachers,
  gradeOptions,
  localityOptions,
  subjectOptions,
  teacherSubjects,
  type ReviewRecord,
  type TeacherRecord,
} from "@/lib/data";
import { loadAppState } from "@/lib/mock-db";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const categoryChips = ["All", ...teacherSubjects.slice(0, 6)];
const PAGE_SIZE = 12;

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
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [remoteTeachers, setRemoteTeachers] = useState<TeacherRecord[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, subject, grade, locality, board, availability, priceMax]);

  useEffect(() => {
    let active = true;

    async function loadRemoteCatalog() {
      if (currentPage === 1) {
        setCatalogLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));
      if (query) params.set("q", query);
      if (subject) params.set("subject", subject);
      if (grade) params.set("grade", grade);
      if (locality) params.set("locality", locality);
      if (board) params.set("board", board);
      if (availability) params.set("availability", availability);
      if (priceMax < 5000) params.set("priceMax", String(priceMax));

      const response = await fetch(`/api/browse?${params.toString()}`, { cache: "no-store" });
      if (!active) {
        return;
      }

      if (!response.ok) {
        if (currentPage === 1) {
          setRemoteTeachers(null);
          setRemoteTotal(0);
        }
        setCatalogLoaded(true);
        setIsLoadingMore(false);
        return;
      }

      const payload = (await response.json()) as {
        teachers?: TeacherRecord[];
        total?: number;
        offline?: boolean;
      };

      if (payload.offline) {
        if (currentPage === 1) {
          setRemoteTeachers(null);
          setRemoteTotal(0);
        }
        setCatalogLoaded(true);
        setIsLoadingMore(false);
        return;
      }

      const incoming = payload.teachers ?? [];
      if (currentPage === 1) {
        setRemoteTeachers(incoming);
      } else {
        setRemoteTeachers((existing) => {
          const merged = [...(existing ?? []), ...incoming];
          const uniqueById = new Map<string, TeacherRecord>();
          for (const teacher of merged) {
            uniqueById.set(teacher.id, teacher);
          }
          return Array.from(uniqueById.values());
        });
      }

      setRemoteTotal(payload.total ?? 0);
      setCatalogLoaded(true);
      setIsLoadingMore(false);
    }

    loadRemoteCatalog();

    return () => {
      active = false;
    };
  }, [availability, board, currentPage, grade, locality, priceMax, query, subject]);

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

  const fallbackSnapshot = mounted ? loadAppState() : { teachers: [], reviews: [] as ReviewRecord[] };
  const localTeachers = useMemo(
    () =>
      computeFilteredTeachers(
        fallbackSnapshot.teachers ?? [],
        {
          query,
          subject: subject || undefined,
          grade: grade || undefined,
          locality: locality || undefined,
          board: board || undefined,
          availability: availability || undefined,
          priceMax,
          includePending: true,
        },
        fallbackSnapshot.reviews ?? [],
      ),
    [availability, board, fallbackSnapshot.reviews, fallbackSnapshot.teachers, grade, locality, priceMax, query, subject],
  );

  const localVisible = localTeachers.slice(0, currentPage * PAGE_SIZE);
  const teachers = remoteTeachers ?? localVisible;
  const totalCount = remoteTeachers !== null ? remoteTotal : localTeachers.length;
  const hasMore = teachers.length < totalCount;

  function resetFilters() {
    setQuery("");
    setSubject("");
    setGrade("");
    setLocality("");
    setBoard("");
    setAvailability("");
    setPriceMax(5000);
    setCurrentPage(1);
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
      {!catalogLoaded ? (
        <section className="card-surface rounded-[2rem] p-10 text-center text-[var(--muted)]">
          Loading shared experts...
        </section>
      ) : null}

      <section className="card-surface rounded-[2rem] p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Browse Experts</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">Find experts in your area</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Search by service, locality, availability, and budget. Verified experts appear first.
            </p>
          </div>
          <JoinAsTeacherAction className="btn-primary px-6 py-3 text-sm">
            Join as Expert
          </JoinAsTeacherAction>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[rgba(255,251,245,0.92)] p-4">
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Search</label>
            <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tutors, electricians, locality..." />
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
          <p>{totalCount} experts found</p>
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
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)]">No experts found for these filters. Try adjusting your search.</h2>
            <p className="mt-3 text-lg leading-8 text-[var(--muted)]">You can broaden category, locality, or price to discover more results.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={resetFilters} className="btn-primary px-6 py-3 text-sm">Clear all filters</button>
              <JoinAsTeacherAction className="btn-secondary px-6 py-3 text-sm">Add an expert profile</JoinAsTeacherAction>
            </div>
          </div>
        )}
      </section>

      {teachers.length && hasMore ? (
        <div className="mt-8 flex justify-center">
          <button type="button" className="btn-primary px-6 py-3 text-sm" onClick={() => setCurrentPage((value) => value + 1)} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
