"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast-provider";
import { clearSession, loadAppState, saveSession, updateProfile } from "@/lib/mock-db";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const roleParam = searchParams.get("role");
  const preferredRole: "teacher" | "parent" | null = roleParam === "teacher" || roleParam === "parent" ? roleParam : null;
  const [selectedRole, setSelectedRole] = useState<"teacher" | "parent">(preferredRole ?? "parent");
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

    const response = await fetch("/api/account/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        role: selectedRole,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; userId?: string };
    if (!response.ok || !payload.userId) {
      pushToast({ tone: "error", title: payload.message ?? "Account creation failed." });
      return;
    }

    saveSession({
      id: payload.userId,
      phone: phone.trim(),
      name: name.trim(),
      email: email.trim(),
      role: selectedRole,
    });

    updateProfile({
      id: payload.userId,
      role: selectedRole,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      created_at: new Date().toISOString(),
    });

    pushToast({ tone: "success", title: "Signed in", description: selectedRole === "teacher" ? "Continue to teacher profile setup." : "You can now contact and review teachers." });
    router.push(selectedRole === "teacher" ? (returnTo && returnTo.startsWith("/") ? returnTo : "/teacher/setup") : resolvePostLoginRoute("parent"));
  }

  if (!loaded) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-[var(--muted)]">Loading login...</div>;
  }

  return (
    <div className="page-section">
      <span className="page-label">Login / Sign Up</span>
      <div className="auth-page">
        <div className="auth-left">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Image src="/docent-mark-v2.png?v=4" alt="Docent logo" width={22} height={22} priority className="h-[22px] w-[22px] invert" />
            </div>
            <div className="font-mono text-[15px] tracking-[0.06em] text-white">Docent</div>
          </div>
          <h2 className="auth-headline">The best tutors in<br />Mathura are on<br /><em>Docent.</em></h2>
          <div className="auth-benefits">
            <div className="auth-benefit"><div className="auth-benefit-dot" />Verified tutors only</div>
            <div className="auth-benefit"><div className="auth-benefit-dot" />Filter by locality</div>
            <div className="auth-benefit"><div className="auth-benefit-dot" />Review before contacting</div>
            <div className="auth-benefit"><div className="auth-benefit-dot" />Direct WhatsApp contact</div>
          </div>
        </div>

        <div className="auth-right">
          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-sub">Free to join. Takes less than 2 minutes.</p>

          {hasSession ? (
            <div className="mb-5 rounded-xl bg-[var(--ivory2)] p-3 text-sm text-[var(--navy)]">
              <p>You already have an active session in this browser.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={continueSession} className="btn-primary px-4 py-2 text-xs">Continue</button>
                <button type="button" onClick={signOutCurrentSession} className="btn-secondary px-4 py-2 text-xs">Sign out</button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="role-toggle">
              <button type="button" className={`role-btn ${selectedRole === "parent" ? "active" : ""}`} onClick={() => setSelectedRole("parent")}>👨‍👩‍👧 I&apos;m a Parent</button>
              <button type="button" className={`role-btn ${selectedRole === "teacher" ? "active" : ""}`} onClick={() => setSelectedRole("teacher")}>👨‍🏫 I&apos;m a Teacher</button>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunita Sharma" required />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98xxxxxx" required />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Min. 8 characters" required />
            </div>

            <button type="submit" className="btn-primary mt-2 w-full rounded-xl py-3 text-sm">Create Account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
