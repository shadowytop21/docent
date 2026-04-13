"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { clearSession, findProfileByPhone, getProfilesByPhone, loadAppState, saveSession } from "@/lib/mock-db";
import { createId } from "@/lib/utils";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const roleParam = searchParams.get("role");
  const preferredRole: "teacher" | "parent" | null = roleParam === "teacher" || roleParam === "parent" ? roleParam : null;
  const returnTo = searchParams.get("next");

  function resolvePostLoginRoute(role?: "teacher" | "parent") {
    if (returnTo && returnTo.startsWith("/")) {
      return returnTo;
    }

    if (role === "teacher") {
      return "/teacher/dashboard";
    }

    if (role === "parent") {
      return "/browse";
    }

    return "/onboarding";
  }

  useEffect(() => {
    const snapshot = loadAppState();
    setHasSession(Boolean(snapshot.session));
    setLoaded(true);
  }, []);

  function continueSession() {
    const snapshot = loadAppState();
    const role = snapshot.session?.role;

    if (!snapshot.session) {
      setHasSession(false);
      return;
    }

    router.push(resolvePostLoginRoute(role));
  }

  function signOutCurrentSession() {
    clearSession();
    setHasSession(false);
    pushToast({ tone: "success", title: "Signed out" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const profilesForPhone = getProfilesByPhone(phone);
    const uniqueRoles = Array.from(new Set(profilesForPhone.map((profile) => profile.role)));

    if (uniqueRoles.length > 1) {
      pushToast({
        tone: "error",
        title: "This number is already registered. Please login instead.",
      });
      return;
    }

    const existingProfile = findProfileByPhone(phone);
    if (existingProfile?.role) {
      saveSession({
        id: existingProfile.id,
        phone: existingProfile.phone,
        name: existingProfile.name,
        email: email.trim() || existingProfile.email || "",
        role: existingProfile.role,
      });

      pushToast({ tone: "success", title: "Welcome back" });
      router.push(resolvePostLoginRoute(existingProfile.role));
      return;
    }

    const newSession = {
      id: createId("session"),
      phone,
      name,
      email,
      role: preferredRole ?? undefined,
    };
    saveSession(newSession);

    if (preferredRole === "teacher") {
      pushToast({ tone: "success", title: "Signed in", description: "Continue to teacher profile setup." });
      router.push(returnTo && returnTo.startsWith("/") ? returnTo : "/teacher/setup");
      return;
    }

    if (preferredRole === "parent") {
      pushToast({ tone: "success", title: "Signed in", description: "You can now contact and review teachers." });
      router.push(resolvePostLoginRoute("parent"));
      return;
    }

    pushToast({ tone: "success", title: "Signed in", description: "Your session is ready. Pick a role next." });
    router.push("/onboarding");
  }

  if (!loaded) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading login...</div>;
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
      <section className="card-surface rounded-[2rem] p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Parent and teacher sign up</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">Sign up for TutorNest</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--muted)]">
          New users should sign up with their phone number and email. Existing users can continue with the same details.
        </p>

        {hasSession ? (
          <div className="mt-6 rounded-2xl bg-[var(--primary-soft)] p-4 text-sm text-[var(--foreground)]">
            <p>You already have an active session in this browser.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={continueSession} className="btn-primary px-4 py-2 text-xs">
                Continue current session
              </button>
              <button type="button" onClick={signOutCurrentSession} className="btn-secondary px-4 py-2 text-xs">
                Sign out and switch account
              </button>
            </div>
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Full name</label>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Phone number</label>
            <input className="field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98xxxxxx" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Email</label>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </div>
          <button type="submit" className="btn-primary w-full px-5 py-3">Sign up and continue</button>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="card-soft rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Need admin access?</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p>Admin moderation has a separate hidden login page.</p>
            <Link href="/admin/login" className="btn-secondary px-4 py-2 text-xs">
              Open admin login
            </Link>
          </div>
        </div>
        <div className="card-soft rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Why this flow works</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p>Simple verification keeps the parent and teacher flows lightweight.</p>
            <p>The next screen asks for role so each user sees a focused experience.</p>
            <p>Teacher profile creation and parent browsing both stay tied to the same local session.</p>
          </div>
        </div>
        <div className="card-surface rounded-[2rem] p-6">
          <p className="font-display text-2xl font-bold text-[var(--foreground)]">A cleaner first impression</p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            TutorNest feels like a funded startup: warm, polished, and built to turn a local search into a real conversation.
          </p>
        </div>
      </aside>
    </div>
  );
}
