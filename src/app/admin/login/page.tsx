"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        pushToast({
          tone: "error",
          title: payload.message ?? "Admin login failed",
        });
        return;
      }

      pushToast({ tone: "success", title: "Admin login successful" });
      router.replace("/admin");
      router.refresh();

      // Force full navigation so server-side cookie checks run immediately.
      window.location.href = "/admin";
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-10 sm:px-6 lg:px-8 lg:py-20">
      <form className="card-surface w-full rounded-[2rem] p-8" onSubmit={handleSubmit}>
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Hidden admin login</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-[var(--foreground)]">Admin access</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
          Enter the admin email and password to open the moderation panel.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Email</label>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Password</label>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <p className="mt-2 text-xs text-[var(--muted)]">Use the admin password configured in server environment variables.</p>
          </div>
          <button type="submit" className="btn-primary w-full px-5 py-3" disabled={submitting}>{submitting ? "Signing in..." : "Open admin panel"}</button>
        </div>
      </form>
    </div>
  );
}