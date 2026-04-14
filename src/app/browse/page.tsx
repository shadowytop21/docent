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

const categoryChips = ["All", ...teacherSubjects];
const PAGE_SIZE = 12;

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { pushToast } = useToast();
  const [query, setQuery] = useState(searchParams.get("q") ?? searchParams.get("subject") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") ?? searchParams.get("subject") ?? "");
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
  }, [debouncedQuery, subject, grade, locality, board, availability, priceMax]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadRemoteCatalog() {
      if (currentPage === 1) {
        setCatalogLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (subject) params.set("subject", subject);
      if (grade) params.set("grade", grade);
      if (locality) params.set("locality", locality);
      if (board) params.set("board", board);
      if (availability) params.set("availability", availability);
      if (priceMax < 5000) params.set("priceMax", String(priceMax));

      try {
        const response = await fetch(`/api/browse?${params.toString()}`, { signal: controller.signal });
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
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        if (currentPage === 1) {
          setRemoteTeachers(null);
          setRemoteTotal(0);
        }
        setCatalogLoaded(true);
        setIsLoadingMore(false);
      }
    }

    loadRemoteCatalog();

    return () => {
      active = false;
      controller.abort();
    };
  }, [availability, board, currentPage, debouncedQuery, grade, locality, priceMax, subject]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const cards = Array.from(document.querySelectorAll(".teacher-card"));
    if (!cards.length) {
      return;
    }

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.animationPlayState = "running";
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cards.forEach((card) => {
      (card as HTMLElement).style.animationPlayState = "paused";
      revealObs.observe(card);
    });

    return () => {
      revealObs.disconnect();
    };
  }, [catalogLoaded, currentPage]);

  useEffect(() => {
    const current = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) current.set("q", debouncedQuery); else current.delete("q");
    if (subject) current.set("subject", subject); else current.delete("subject");
    if (grade) current.set("grade", grade); else current.delete("grade");
    if (locality) current.set("locality", locality); else current.delete("locality");
    if (board) current.set("board", board); else current.delete("board");
    if (availability) current.set("availability", availability); else current.delete("availability");
    if (priceMax < 5000) current.set("priceMax", String(priceMax)); else current.delete("priceMax");
    const next = current.toString();
    const path = next ? `${pathname}?${next}` : pathname;
    router.replace(path, { scroll: false });
  }, [availability, board, debouncedQuery, grade, locality, pathname, priceMax, router, searchParams, subject]);

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
  const catalogPool = fallbackSnapshot.teachers ?? [];

  const counts = useMemo(() => {
    const subjectMap = new Map<string, number>();
    const gradeMap = new Map<string, number>();
    const localityMap = new Map<string, number>();
    const boardMap = new Map<string, number>();
    const availabilityMap = new Map<string, number>();

    catalogPool.forEach((teacher) => {
      teacher.subjects.forEach((value) => subjectMap.set(value, (subjectMap.get(value) ?? 0) + 1));
      teacher.grades.forEach((value) => gradeMap.set(value, (gradeMap.get(value) ?? 0) + 1));
      localityMap.set(teacher.locality, (localityMap.get(teacher.locality) ?? 0) + 1);
      teacher.boards.forEach((value) => boardMap.set(value, (boardMap.get(value) ?? 0) + 1));
      teacher.availability.forEach((value) => availabilityMap.set(value, (availabilityMap.get(value) ?? 0) + 1));
    });

    return { subjectMap, gradeMap, localityMap, boardMap, availabilityMap };
  }, [catalogPool]);

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
          Loading shared teachers...
        </section>
      ) : null}

      <section className="card-surface overflow-hidden rounded-[1rem]">
        <div className="browse-hero">
          <h1 className="browse-title">Find tutors in <em>Mathura</em></h1>
          <p className="browse-sub">{totalCount} verified teachers · Filter by subject, grade, locality and more</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-white px-6 py-5 lg:px-8">
          {categoryChips.map((item) => (
            <button key={item} type="button" onClick={() => applyCategory(item)} className={`filter-pill ${subject === item || (item === "All" && !subject) ? "active" : ""}`}>
              {item}
            </button>
          ))}
          <div className="ml-auto text-sm text-[var(--muted)]">Sort by: <strong className="text-[var(--navy)]">Best Match</strong></div>
        </div>

        <div className="grid min-h-[600px] lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-[var(--border)] bg-white p-8">
            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Search</p>
              <input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tutors, locality..." />
            </div>

            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Subject</p>
              <div className="flex flex-col gap-2">
                {subjectOptions.map((value) => (
                  <button key={value} type="button" onClick={() => setSubject(subject === value ? "" : value)} className={`filter-option ${subject === value ? "selected" : ""}`}>
                    <span>{value}</span>
                    <span className="filter-count">{counts.subjectMap.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Grade</p>
              <div className="flex flex-col gap-2">
                {gradeOptions.map((value) => (
                  <button key={value} type="button" onClick={() => setGrade(grade === value ? "" : value)} className={`filter-option ${grade === value ? "selected" : ""}`}>
                    <span>{value}</span>
                    <span className="filter-count">{counts.gradeMap.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Locality</p>
              <div className="flex flex-col gap-2">
                {localityOptions.map((value) => (
                  <button key={value} type="button" onClick={() => setLocality(locality === value ? "" : value)} className={`filter-option ${locality === value ? "selected" : ""}`}>
                    <span>{value}</span>
                    <span className="filter-count">{counts.localityMap.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Board</p>
              <div className="flex flex-col gap-2">
                {boardOptions.map((value) => (
                  <button key={value} type="button" onClick={() => setBoard(board === value ? "" : value)} className={`filter-option ${board === value ? "selected" : ""}`}>
                    <span>{value}</span>
                    <span className="filter-count">{counts.boardMap.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Availability</p>
              <div className="flex flex-col gap-2">
                {availabilityOptions.map((value) => (
                  <button key={value} type="button" onClick={() => setAvailability(availability === value ? "" : value)} className={`filter-option ${availability === value ? "selected" : ""}`}>
                    <span>{value}</span>
                    <span className="filter-count">{counts.availabilityMap.get(value) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Price range</p>
              <label className="mb-2 block text-sm text-[var(--muted)]">Max: ₹{priceMax}</label>
              <input className="w-full accent-[var(--saffron)]" type="range" min="0" max="5000" step="100" value={priceMax} onChange={(event) => setPriceMax(Number(event.target.value))} />
            </div>

            <button type="button" onClick={resetFilters} className="btn-secondary mt-6 w-full px-4 py-3 text-sm">Clear all filters</button>
          </aside>

          <section className="teacher-grid">
            {teachers.length ? (
              teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)
            ) : (
              <div className="card-surface col-span-full rounded-[1rem] p-10 text-center">
                <h2 className="font-display text-3xl font-medium text-[var(--foreground)]">No teachers found for these filters.</h2>
                <p className="mt-3 text-base text-[var(--muted)]">Try adjusting your subject, locality, or price range.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <button type="button" onClick={resetFilters} className="btn-primary px-6 py-3 text-sm">Clear all filters</button>
                  <JoinAsTeacherAction className="btn-secondary px-6 py-3 text-sm">Add a teacher profile</JoinAsTeacherAction>
                </div>
              </div>
            )}
          </section>
        </div>
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
