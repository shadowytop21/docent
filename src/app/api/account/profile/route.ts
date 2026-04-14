import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

type ProfileRequest = {
  email?: string;
  name?: string;
  phone?: string;
  role?: "teacher" | "parent";
};

async function getOrCreateUserId(email: string, name: string, phone: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const auth = supabase.auth.admin;
  const existing = await auth.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existing.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { userId: existingUser.id, error: null };
  }

  const created = await auth.createUser({
    email,
    email_confirm: true,
    password: `Temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    user_metadata: {
      name,
      phone,
    },
  });

  if (created.error || !created.data.user) {
    return { error: created.error?.message ?? "Unable to create auth user." };
  }

  return { userId: created.data.user.id, error: null };
}

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`account-profile:${ip}`, 10, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: "Too many account attempts. Please try again later." }, { status: 429 });
    }

    const payload = (await request.json().catch(() => null)) as ProfileRequest | null;
    if (!payload?.email || !payload?.name || !payload?.phone || !payload?.role) {
      return NextResponse.json({ message: "Missing profile fields." }, { status: 400 });
    }

    const email = payload.email.trim().toLowerCase();
    const name = payload.name.trim();
    const role = payload.role === "teacher" ? "teacher" : payload.role === "parent" ? "parent" : null;
    const phone = payload.phone.trim().replace(/[^+0-9]/g, "");

    if (!role) {
      return NextResponse.json({ message: "Invalid role value." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return NextResponse.json({ message: "Invalid email address." }, { status: 400 });
    }

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ message: "Name must be between 2 and 80 characters." }, { status: 400 });
    }

    if (phone.length < 8 || phone.length > 16) {
      return NextResponse.json({ message: "Invalid phone number." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ message: "Server database is not configured." }, { status: 503 });
    }

    const adminSupabase = supabase as any;

    const userResult = await getOrCreateUserId(email, name, phone);
    if (userResult.error || !userResult.userId) {
      return NextResponse.json({ message: userResult.error ?? "Unable to create user." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: profileError } = await adminSupabase.from("profiles").upsert(
      {
        id: userResult.userId,
        role,
        name,
        phone,
        created_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: userResult.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
