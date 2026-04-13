import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

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
  const payload = (await request.json().catch(() => null)) as ProfileRequest | null;
  if (!payload?.email || !payload?.name || !payload?.phone || !payload?.role) {
    return NextResponse.json({ message: "Missing profile fields." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Server Supabase service role is not configured." }, { status: 500 });
  }

  const adminSupabase = supabase as any;

  const userResult = await getOrCreateUserId(payload.email, payload.name, payload.phone);
  if (userResult.error || !userResult.userId) {
    return NextResponse.json({ message: userResult.error ?? "Unable to create user." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: profileError } = await adminSupabase.from("profiles").upsert(
    {
      id: userResult.userId,
      role: payload.role,
      name: payload.name,
      phone: payload.phone,
      created_at: now,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: userResult.userId });
}
