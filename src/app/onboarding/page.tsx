"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { getProfilesByPhone, loadAppState, saveSession, updateProfile } from "@/lib/mock-db";

export default function OnboardingPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const snapshot = loadAppState();
    if (!snapshot.session) {
      router.replace("/auth");
      return;
    }

    if (snapshot.session.role === "teacher") {
      router.replace("/teacher/dashboard");
      return;
    }

    if (snapshot.session.role === "parent") {
      router.replace("/browse");
      return;
    }

    setLoaded(true);
  }, [router]);

  async function chooseRole(role: "teacher" | "parent") {
    const snapshot = loadAppState();
    if (!snapshot.session) {
      router.push("/auth");
      return;
    }

    if (!snapshot.session.email || !snapshot.session.name || !snapshot.session.phone) {
      pushToast({ tone: "error", title: "Missing session details." });
      return;
    }

    const response = await fetch("/api/account/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: snapshot.session.email,
        name: snapshot.session.name,
        phone: snapshot.session.phone,
        role,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; userId?: string };

    if (!response.ok || !payload.userId) {
      pushToast({ tone: "error", title: payload.message ?? "Profile save failed." });
      return;
    }


    const conflictingPhoneProfile = getProfilesByPhone(snapshot.session.phone).find(
      (profile) => profile.id !== snapshot.session?.id && profile.role !== role,
    );

    if (conflictingPhoneProfile) {
      pushToast({
        tone: "error",
        title: "This number is already registered. Please login instead.",
      });
      return;
    }

    const session = { ...snapshot.session, id: payload.userId, role };
    saveSession(session);
    updateProfile({
      id: session.id,
      role,
      name: session.name,
      phone: session.phone,
      email: session.email,
      created_at: new Date().toISOString(),
    });

    pushToast({
      tone: "success",
      title: role === "teacher" ? "Teacher role saved" : "Parent role saved",
      description: role === "teacher" ? "Let's build your profile next." : "You can start browsing tutors now.",
    });

    router.push(role === "teacher" ? "/teacher/setup" : "/browse");
  }

  if (!loaded) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading role selection...</div>;
  }

  const snapshot = loadAppState();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
      <div className="card-surface rounded-[2rem] p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Who are you?</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">Choose your role</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          We already have your session. Now choose the path that matches what you want to do on TutorNest.
        </p>
        <div className="mt-6 rounded-3xl bg-[rgba(255,251,245,0.9)] p-5 text-sm text-[var(--muted)]">
          Signed in as <span className="font-semibold text-[var(--foreground)]">{snapshot.session?.name}</span> · {snapshot.session?.phone}
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseRole("parent")}
            className="card-soft rounded-[2rem] border border-transparent p-6 text-left transition-all hover:-translate-y-1 hover:border-[var(--primary)]"
          >
            <span className="pill badge-verified">Parent</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)]">I want to find a tutor</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Save your name, land on the browse page, and start discovering verified local tutors.
            </p>
          </button>

          <button
            type="button"
            onClick={() => chooseRole("teacher")}
            className="card-soft rounded-[2rem] border border-transparent p-6 text-left transition-all hover:-translate-y-1 hover:border-[var(--primary)]"
          >
            <span className="pill badge-founding">Teacher</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-[var(--foreground)]">I want students to find me</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Continue to the profile builder and submit your teaching profile for verification.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
