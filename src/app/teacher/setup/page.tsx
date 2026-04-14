"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import {
  availabilityOptions,
  boardOptions,
  gradeOptions,
  localityOptions,
  subjectOptions,
} from "@/lib/data";
import { createTeacherProfile, findTeacherByUserId, loadAppState, saveSession, updateTeacherProfile } from "@/lib/mock-db";
import { parseExperienceYears, validateTeacherBio, validateTeacherName, validateWhatsappNumber } from "@/lib/teacher-validation";
import { createId } from "@/lib/utils";

const steps = ["Personal info", "Teaching details", "Location & pricing"];
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

export default function TeacherSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [step1Errors, setStep1Errors] = useState<{
    fullName?: string;
    bio?: string;
    experienceYears?: string;
    whatsappNumber?: string;
  }>({});
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [step2Errors, setStep2Errors] = useState<{
    subjects?: string;
    grades?: string;
    boards?: string;
    teachesAt?: string;
    availability?: string;
  }>({});
  const [step2Attempted, setStep2Attempted] = useState(false);
  const sectionRefs = useRef<{
    subjects: HTMLDivElement | null;
    grades: HTMLDivElement | null;
    boards: HTMLDivElement | null;
    teachesAt: HTMLDivElement | null;
    availability: HTMLDivElement | null;
  }>({
    subjects: null,
    grades: null,
    boards: null,
    teachesAt: null,
    availability: null,
  });
  const [profilePhoto, setProfilePhoto] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    bio: "",
    experienceYears: "",
    whatsappNumber: "",
    subjects: [] as string[],
    grades: [] as string[],
    boards: [] as string[],
    teachesAt: "both",
    availability: [] as string[],
    locality: "",
    pricePerMonth: "",
  });

  useEffect(() => {
    const snapshot = loadAppState();
    const session = snapshot.session;

    if (!session) {
      router.replace("/auth");
      return;
    }

    if (session.role === "parent") {
      router.replace("/browse");
      return;
    }

    if (!session.role) {
      // Backup guard: ensure teacher setup can continue for role-pending sessions.
      saveSession({
        ...session,
        role: "teacher",
      });
    }

    const existingTeacher = findTeacherByUserId(session.id);
    const editMode = searchParams.get("edit") === "1";

    if (existingTeacher && !editMode) {
      router.replace("/teacher/dashboard");
      return;
    }

    if (existingTeacher && editMode) {
      setIsEditing(true);
      setProfilePhoto(existingTeacher.photo_url);
      setForm({
        fullName: existingTeacher.name,
        bio: existingTeacher.bio,
        experienceYears: String(existingTeacher.experience_years),
        whatsappNumber: existingTeacher.whatsapp_number,
        subjects: existingTeacher.subjects,
        grades: existingTeacher.grades,
        boards: existingTeacher.boards,
        teachesAt: existingTeacher.teaches_at,
        availability: existingTeacher.availability,
        locality: existingTeacher.locality,
        pricePerMonth: String(existingTeacher.price_per_month),
      });
    }

    setMounted(true);
  }, [router, searchParams]);

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep]);

  function toggleItem(key: "subjects" | "grades" | "boards" | "availability", value: string) {
    if (key === "subjects" && !form.subjects.includes(value) && form.subjects.length >= 6) {
      pushToast({ tone: "warning", title: "You can select up to 6 subjects" });
      return;
    }

    if (key === "grades" && !form.grades.includes(value) && form.grades.length >= 4) {
      pushToast({ tone: "warning", title: "You can select up to 4 grade levels" });
      return;
    }

    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      } as typeof current;
    });

    if (step2Attempted) {
      setStep2Errors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function handlePhotoUpload(file: File | null) {
    if (!file) {
      setProfilePhoto("");
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      pushToast({ tone: "error", title: "Use JPG, PNG, or WebP image only." });
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      pushToast({ tone: "error", title: "Image size must be 2MB or less." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function validateStep2() {
    const errors: typeof step2Errors = {};

    if (form.subjects.length === 0) {
      errors.subjects = "Please select at least one subject";
    }

    if (form.grades.length === 0) {
      errors.grades = "Please select at least one grade";
    }

    if (form.boards.length === 0) {
      errors.boards = "Please select at least one board";
    }

    if (!form.teachesAt) {
      errors.teachesAt = "Please select one teaching mode";
    }

    if (form.availability.length === 0) {
      errors.availability = "Please select at least one availability slot";
    }

    setStep2Errors(errors);

    const firstErrorKey = (Object.keys(errors)[0] ?? null) as keyof typeof sectionRefs.current | null;
    if (firstErrorKey && sectionRefs.current[firstErrorKey]) {
      sectionRefs.current[firstErrorKey]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(errors).length === 0;
  }

  function validateStep1() {
    // Keep step-one rules explicit so users get immediate guidance before progressing.
    const errors: typeof step1Errors = {};

    const nameError = validateTeacherName(form.fullName);
    if (nameError) {
      errors.fullName = nameError;
    }

    const bioError = validateTeacherBio(form.bio);
    if (bioError) {
      errors.bio = bioError;
    }

    const experienceResult = parseExperienceYears(form.experienceYears);
    if (experienceResult.error) {
      errors.experienceYears = experienceResult.error;
    }

    const whatsappResult = validateWhatsappNumber(form.whatsappNumber);
    if (whatsappResult.error) {
      errors.whatsappNumber = whatsappResult.error;
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  }

  function goNext() {
    if (currentStep === 0) {
      setStep1Attempted(true);
      const valid = validateStep1();
      if (!valid) {
        return;
      }
    }

    if (currentStep === 1) {
      setStep2Attempted(true);
      const valid = validateStep2();
      if (!valid) {
        return;
      }
    }

    if (currentStep < 2) {
      setCurrentStep((step) => step + 1);
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    const snapshot = loadAppState();
    const session = snapshot.session;
    if (!session) {
      router.push("/auth");
      return;
    }

    if (!profilePhoto || !form.fullName || !form.bio || !form.experienceYears || !form.whatsappNumber || !form.locality || !form.pricePerMonth) {
      pushToast({ tone: "error", title: "Complete the form", description: "Please fill in all required fields before submitting." });
      return;
    }

    const validStep1 = validateStep1();
    setStep1Attempted(true);
    if (!validStep1) {
      pushToast({ tone: "error", title: "Please fix personal info errors before submitting." });
      return;
    }

    const parsedExperience = parseExperienceYears(form.experienceYears);
    const parsedWhatsapp = validateWhatsappNumber(form.whatsappNumber);
    if (parsedExperience.value === null || !parsedWhatsapp.value) {
      pushToast({ tone: "error", title: "Please provide valid experience and WhatsApp number." });
      return;
    }

    const parsedPrice = Number(form.pricePerMonth);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 500 || parsedPrice > 10000) {
      setPriceError("Please enter a price between ₹500 and ₹10,000");
      return;
    }

    setPriceError("");

    if (!session.email) {
      const message = "Missing email in current session.";
      setSubmitError(message);
      pushToast({ tone: "error", title: message });
      return;
    }

    const response = await fetch("/api/teacher/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: session.email,
        name: form.fullName,
        phone: session.phone,
        photoUrl: profilePhoto,
        bio: form.bio.slice(0, 200),
        subjects: form.subjects,
        grades: form.grades,
        boards: form.boards,
        locality: form.locality,
        pricePerMonth: parsedPrice,
        teachesAt: form.teachesAt as "student_home" | "teacher_home" | "both",
        availability: form.availability,
        experienceYears: parsedExperience.value,
        whatsappNumber: parsedWhatsapp.value,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; userId?: string };
    if (!response.ok || !payload.userId) {
      const message = payload.message ?? "Teacher profile save failed.";
      setSubmitError(message);
      pushToast({ tone: "error", title: message });
      return;
    }

    if (isEditing) {
      updateTeacherProfile({
        profileId: payload.userId,
        name: form.fullName,
        photoUrl: profilePhoto,
        bio: form.bio.slice(0, 200),
        subjects: form.subjects,
        grades: form.grades,
        boards: form.boards,
        locality: form.locality,
        pricePerMonth: parsedPrice,
        teachesAt: form.teachesAt as "student_home" | "teacher_home" | "both",
        availability: form.availability,
        experienceYears: parsedExperience.value,
        whatsappNumber: parsedWhatsapp.value,
      });
      pushToast({
        tone: "warning",
        title: "Profile re-submitted",
        description: "Your updated profile is under review. Your current profile remains visible until approved.",
      });
    } else {
      createTeacherProfile({
        profileId: payload.userId,
        name: form.fullName,
        photoUrl: profilePhoto,
        bio: form.bio.slice(0, 200),
        subjects: form.subjects,
        grades: form.grades,
        boards: form.boards,
        locality: form.locality,
        pricePerMonth: parsedPrice,
        teachesAt: form.teachesAt as "student_home" | "teacher_home" | "both",
        availability: form.availability,
        experienceYears: parsedExperience.value,
        whatsappNumber: parsedWhatsapp.value,
      });
      pushToast({ tone: "success", title: "Profile submitted", description: "We'll notify you on WhatsApp once verified." });
    }

    saveSession({ ...session, role: "teacher", id: payload.userId || session.id || createId("session") });
    setSubmitted(true);
  }

  if (!mounted) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading setup...</div>;
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="card-surface w-full rounded-[2rem] p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success-soft)] text-xl font-semibold text-[var(--success)]">Done</div>
          <h1 className="mt-6 font-display text-4xl font-bold text-[var(--foreground)]">{isEditing ? "Profile re-submitted!" : "Profile submitted!"}</h1>
          <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
            {isEditing
              ? "Your updated profile is under review. Your current profile remains visible until approved."
              : "We'll notify you on WhatsApp once verified. Your profile is now awaiting review."}
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button type="button" onClick={() => router.push("/teacher/dashboard")} className="btn-primary px-6 py-3 text-sm">Go to dashboard</button>
            <button type="button" onClick={() => router.push("/browse")} className="btn-secondary px-6 py-3 text-sm">Browse Teachers</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
      <div className="card-surface rounded-[2rem] p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Teacher onboarding</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-[var(--foreground)]">Build your profile</h1>
          </div>
          <span className="pill badge-founding">Step {currentStep + 1} of 3</span>
        </div>

        <div className="mt-6 h-3 rounded-full bg-[var(--surface-alt)]">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <span key={step} className={`pill ${index === currentStep ? "pill-active" : "pill-inactive"}`}>{step}</span>
          ))}
        </div>

        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          {currentStep === 0 ? (
            <div className="slide-step grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <label className="block rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[rgba(255,251,245,0.9)] p-6 text-center">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhotoUpload(event.target.files?.[0] ?? null)} />
                  <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-soft)] text-lg font-semibold text-[var(--primary)]">
                    {profilePhoto ? (
                      <Image src={profilePhoto} alt="Profile preview" width={112} height={112} quality={80} loading="lazy" unoptimized className="h-full w-full object-cover" />
                    ) : "Upload"}
                  </div>
                  <span className="btn-secondary px-4 py-2 text-sm">Choose profile photo</span>
                </label>
                <p className="text-sm text-[var(--muted)]">PNG or JPG. This photo appears on the teacher card and profile page.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Full name</label>
                  <input
                    className="field"
                    value={form.fullName}
                    onChange={(event) => {
                      setForm({ ...form, fullName: event.target.value });
                      if (step1Attempted) {
                        setStep1Errors((current) => ({ ...current, fullName: undefined }));
                      }
                    }}
                    required
                  />
                  {step1Attempted && step1Errors.fullName ? <p className="mt-2 text-sm text-red-600">{step1Errors.fullName}</p> : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Short bio</label>
                  <textarea
                    className="textarea"
                    maxLength={200}
                    value={form.bio}
                    onChange={(event) => {
                      setForm({ ...form, bio: event.target.value });
                      if (step1Attempted) {
                        setStep1Errors((current) => ({ ...current, bio: undefined }));
                      }
                    }}
                    required
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">{form.bio.length}/200 characters</p>
                  {step1Attempted && step1Errors.bio ? <p className="mt-2 text-sm text-red-600">{step1Errors.bio}</p> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Years of experience</label>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={form.experienceYears}
                      onChange={(event) => {
                        setForm({ ...form, experienceYears: event.target.value.replace(/[^0-9]/g, "") });
                        if (step1Attempted) {
                          setStep1Errors((current) => ({ ...current, experienceYears: undefined }));
                        }
                      }}
                      required
                    />
                    {step1Attempted && step1Errors.experienceYears ? <p className="mt-2 text-sm text-red-600">{step1Errors.experienceYears}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">WhatsApp number</label>
                    <input
                      className="field"
                      inputMode="tel"
                      value={form.whatsappNumber}
                      onChange={(event) => {
                        setForm({ ...form, whatsappNumber: event.target.value });
                        if (step1Attempted) {
                          setStep1Errors((current) => ({ ...current, whatsappNumber: undefined }));
                        }
                      }}
                      required
                    />
                    {step1Attempted && step1Errors.whatsappNumber ? <p className="mt-2 text-sm text-red-600">{step1Errors.whatsappNumber}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="slide-step space-y-6">
              <div ref={(node) => { sectionRefs.current.subjects = node; }}>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {subjectOptions.map((item) => (
                    <button key={item} type="button" onClick={() => toggleItem("subjects", item)} className={`pill ${form.subjects.includes(item) ? "pill-active" : "pill-inactive"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                {step2Attempted && step2Errors.subjects ? <p className="mt-2 text-sm text-red-600">{step2Errors.subjects}</p> : null}
              </div>
              <div ref={(node) => { sectionRefs.current.grades = node; }}>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Grades</p>
                <div className="flex flex-wrap gap-2">
                  {gradeOptions.map((item) => (
                    <button key={item} type="button" onClick={() => toggleItem("grades", item)} className={`pill ${form.grades.includes(item) ? "pill-active" : "pill-inactive"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                {step2Attempted && step2Errors.grades ? <p className="mt-2 text-sm text-red-600">{step2Errors.grades}</p> : null}
              </div>
              <div ref={(node) => { sectionRefs.current.boards = node; }}>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Boards</p>
                <div className="flex flex-wrap gap-2">
                  {boardOptions.map((item) => (
                    <button key={item} type="button" onClick={() => toggleItem("boards", item)} className={`pill ${form.boards.includes(item) ? "pill-active" : "pill-inactive"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                {step2Attempted && step2Errors.boards ? <p className="mt-2 text-sm text-red-600">{step2Errors.boards}</p> : null}
              </div>
              <div ref={(node) => { sectionRefs.current.teachesAt = node; }}>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Teaches at</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Student's home", value: "student_home" },
                    { label: "My home", value: "teacher_home" },
                    { label: "Both", value: "both" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, teachesAt: item.value });
                        if (step2Attempted) {
                          setStep2Errors((current) => ({ ...current, teachesAt: undefined }));
                        }
                      }}
                      className={`pill ${form.teachesAt === item.value ? "pill-active" : "pill-inactive"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {step2Attempted && step2Errors.teachesAt ? <p className="mt-2 text-sm text-red-600">{step2Errors.teachesAt}</p> : null}
              </div>
              <div ref={(node) => { sectionRefs.current.availability = node; }}>
                <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Availability</p>
                <div className="flex flex-wrap gap-2">
                  {availabilityOptions.map((item) => (
                    <button key={item} type="button" onClick={() => toggleItem("availability", item)} className={`pill ${form.availability.includes(item) ? "pill-active" : "pill-inactive"}`}>
                      {item}
                    </button>
                  ))}
                </div>
                {step2Attempted && step2Errors.availability ? <p className="mt-2 text-sm text-red-600">{step2Errors.availability}</p> : null}
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="slide-step grid gap-6 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Locality</label>
                <select className="select" value={form.locality} onChange={(event) => setForm({ ...form, locality: event.target.value })} required>
                  <option value="">Select locality</option>
                  {localityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Price per month (₹)</label>
                <input
                  className="field"
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  inputMode="numeric"
                  value={form.pricePerMonth}
                  onChange={(event) => {
                    setForm({ ...form, pricePerMonth: event.target.value.replace(/[^0-9]/g, "") });
                    setPriceError("");
                  }}
                  required
                />
                {priceError ? <p className="mt-2 text-sm text-red-600">{priceError}</p> : null}
              </div>
              <div className="lg:col-span-2 rounded-[1.5rem] bg-[rgba(255,251,245,0.9)] p-5 text-sm leading-6 text-[var(--muted)]">
                Profiles are submitted with a pending status. First 50 teachers are automatically marked as founding members.
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
            {submitError ? <p className="mr-auto text-sm text-red-600">{submitError}</p> : null}
            <button type="button" onClick={goBack} disabled={currentStep === 0} className="btn-ghost px-5 py-3 text-sm disabled:opacity-40">
              Back
            </button>
            {currentStep < 2 ? (
              <button type="button" onClick={goNext} className="btn-primary px-5 py-3 text-sm">Continue</button>
            ) : (
              <button type="submit" className="btn-primary px-5 py-3 text-sm">Submit profile</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
