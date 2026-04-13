import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { normalizeTeacherName, parseExperienceYears, validateTeacherBio, validateTeacherName, validateWhatsappNumber } from "@/lib/teacher-validation";

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

const ALLOWED_PHOTO_PREFIXES = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];
const MAX_PHOTO_URL_LENGTH = 2_900_000;

async function getOrCreateUserId(email: string, name: string, phone: string) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { error: "Server database is not configured." };
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
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`teacher-setup:${ip}`, 12, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: "Too many submissions. Please try again shortly." }, { status: 429 });
    }

    const payload = (await request.json().catch(() => null)) as TeacherSetupRequest | null;
    if (!payload?.email || !payload?.name || !payload?.phone || !payload?.photoUrl || !payload?.bio || !payload?.subjects?.length || !payload?.grades?.length || !payload?.boards?.length || !payload?.locality || payload?.pricePerMonth === undefined || !payload?.teachesAt || !payload?.availability?.length || payload?.experienceYears === undefined || !payload?.whatsappNumber) {
      return NextResponse.json({ message: "Missing teacher setup fields." }, { status: 400 });
    }

    // Mirror client validation on the server so malformed direct requests are rejected.
    const nameError = validateTeacherName(payload.name);
    if (nameError) {
      return NextResponse.json({ message: nameError }, { status: 400 });
    }

    const bioError = validateTeacherBio(payload.bio);
    if (bioError) {
      return NextResponse.json({ message: bioError }, { status: 400 });
    }

    const experienceResult = parseExperienceYears(payload.experienceYears);
    if (experienceResult.error || experienceResult.value === null) {
      return NextResponse.json({ message: experienceResult.error ?? "Invalid experience years." }, { status: 400 });
    }

    const whatsappResult = validateWhatsappNumber(payload.whatsappNumber);
    if (whatsappResult.error || !whatsappResult.value) {
      return NextResponse.json({ message: whatsappResult.error ?? "Invalid WhatsApp number." }, { status: 400 });
    }

    if (payload.subjects.length > 6 || payload.grades.length > 4) {
      return NextResponse.json({ message: "Too many subjects or grades selected." }, { status: 400 });
    }

    const parsedPrice = Number(payload.pricePerMonth);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 500 || parsedPrice > 10000) {
      return NextResponse.json({ message: "Price must be between ₹500 and ₹10,000." }, { status: 400 });
    }

    const sanitizedName = normalizeTeacherName(payload.name);
    const sanitizedBio = payload.bio.trim().slice(0, 200);

    const hasAllowedPhotoPrefix = ALLOWED_PHOTO_PREFIXES.some((prefix) => payload.photoUrl!.startsWith(prefix));
    if (!hasAllowedPhotoPrefix || payload.photoUrl.length > MAX_PHOTO_URL_LENGTH) {
      return NextResponse.json({ message: "Photo must be JPG, PNG, or WebP and under 2MB." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ message: "Server database is not configured." }, { status: 503 });
    }

    const adminSupabase = supabase as any;

    const userResult = await getOrCreateUserId(payload.email, sanitizedName, payload.phone);
    if (userResult.error || !userResult.userId) {
      return NextResponse.json({ message: userResult.error ?? "Unable to create auth user." }, { status: 500 });
    }

    const now = new Date().toISOString();
    const profileResult = await adminSupabase.from("profiles").upsert(
      {
        id: userResult.userId,
        role: "teacher",
        name: sanitizedName,
        phone: whatsappResult.value,
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
      bio: sanitizedBio,
      subjects: payload.subjects,
      grades: payload.grades,
      boards: payload.boards,
      locality: payload.locality,
      price_per_month: parsedPrice,
      teaches_at: payload.teachesAt,
      availability: payload.availability,
      experience_years: experienceResult.value,
      whatsapp_number: whatsappResult.value,
      status: "pending",
    };

    const existingTeacherResult = await adminSupabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", userResult.userId)
      .maybeSingle();

    if (existingTeacherResult.error) {
      return NextResponse.json({ message: existingTeacherResult.error.message }, { status: 500 });
    }

    if (existingTeacherResult.data?.id) {
      const updateResult = await adminSupabase
        .from("teacher_profiles")
        .update(teacherPayload)
        .eq("id", existingTeacherResult.data.id)
        .select()
        .single();

      if (updateResult.error) {
        return NextResponse.json({ message: updateResult.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, userId: userResult.userId, teacher: updateResult.data ?? null });
    }

    const insertResult = await adminSupabase.from("teacher_profiles").insert(teacherPayload).select().single();
    if (insertResult.error) {
      return NextResponse.json({ message: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: userResult.userId, teacher: insertResult.data ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save teacher profile.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
