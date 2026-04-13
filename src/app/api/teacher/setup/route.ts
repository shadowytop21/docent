import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type TeacherSetupRequest = {
  email?: string;
  name?: string;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  subjects?: string[];
  grades?: string[];
  boards?: string[];
  locality?: string;
  pricePerMonth?: number;
  teachesAt?: "student_home" | "teacher_home" | "both";
  availability?: string[];
  experienceYears?: number;
  whatsappNumber?: string;
};

async function getOrCreateUserId(email: string, name: string, phone: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is missing." };
  }

  const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = existing.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { userId: existingUser.id, error: null };
  }

  const created = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `Temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    user_metadata: { name, phone },
  });

  if (created.error || !created.data.user) {
    return { error: created.error?.message ?? "Unable to create auth user." };
  }

  return { userId: created.data.user.id, error: null };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as TeacherSetupRequest | null;
  if (!payload?.email || !payload?.name || !payload?.phone || !payload?.photoUrl || !payload?.bio || !payload?.subjects?.length || !payload?.grades?.length || !payload?.boards?.length || !payload?.locality || !payload?.pricePerMonth || !payload?.teachesAt || !payload?.availability?.length || !payload?.experienceYears || !payload?.whatsappNumber) {
    return NextResponse.json({ message: "Missing teacher setup fields." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ message: "Server Supabase service role is not configured." }, { status: 500 });
  }

  const adminSupabase = supabase as any;

  const userResult = await getOrCreateUserId(payload.email, payload.name, payload.phone);
  if (userResult.error || !userResult.userId) {
    return NextResponse.json({ message: userResult.error ?? "Unable to create auth user." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const profileResult = await adminSupabase.from("profiles").upsert(
    {
      id: userResult.userId,
      role: "teacher",
      name: payload.name,
      phone: payload.whatsappNumber,
      created_at: now,
    },
    { onConflict: "id" },
  );

  if (profileResult.error) {
    return NextResponse.json({ message: profileResult.error.message }, { status: 500 });
  }

  const teacherPayload = {
    user_id: userResult.userId,
    photo_url: payload.photoUrl,
    bio: payload.bio.slice(0, 200),
    subjects: payload.subjects,
    grades: payload.grades,
    boards: payload.boards,
    locality: payload.locality,
    price_per_month: payload.pricePerMonth,
    teaches_at: payload.teachesAt,
    availability: payload.availability,
    experience_years: payload.experienceYears,
    whatsapp_number: payload.whatsappNumber,
    status: "pending",
  };

  const teacherResult = await adminSupabase.from("teacher_profiles").upsert(teacherPayload, { onConflict: "user_id" }).select();

  if (teacherResult.error) {
    return NextResponse.json({ message: teacherResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: userResult.userId, teacher: teacherResult.data?.[0] ?? null });
}
