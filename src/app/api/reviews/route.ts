import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

type ReviewRequest = {
  teacherId?: string;
  parentId?: string;
  parentName?: string;
  rating?: number;
  comment?: string;
  allowEdit?: boolean;
};

const REVIEW_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`reviews:${ip}`, 15, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: "Too many review attempts. Please try again later." }, { status: 429 });
    }

    const payload = (await request.json().catch(() => null)) as ReviewRequest | null;
    if (!payload?.teacherId || !payload?.parentId || payload?.rating === undefined || !payload?.comment) {
      return NextResponse.json({ message: "Missing review fields." }, { status: 400 });
    }

    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const comment = payload.comment.trim();
    if (comment.length < 5 || comment.length > 500) {
      return NextResponse.json({ message: "Comment must be between 5 and 500 characters." }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ message: "Server database is not configured." }, { status: 503 });
    }

    const adminSupabase = supabase as any;
    const { data: teacher, error: teacherError } = await adminSupabase
      .from("teacher_profiles")
      .select("id,user_id,status")
      .eq("id", payload.teacherId)
      .maybeSingle();

    if (teacherError) {
      return NextResponse.json({ message: teacherError.message }, { status: 500 });
    }

    if (!teacher) {
      return NextResponse.json({ message: "Teacher not found." }, { status: 404 });
    }

    if (teacher.status !== "verified") {
      return NextResponse.json({ message: "This profile is under review." }, { status: 403 });
    }

    if (teacher.user_id === payload.parentId) {
      return NextResponse.json({ message: "You cannot review your own profile." }, { status: 403 });
    }

    const { data: parentProfile, error: parentError } = await adminSupabase
      .from("profiles")
      .select("id,role")
      .eq("id", payload.parentId)
      .maybeSingle();

    if (parentError) {
      return NextResponse.json({ message: parentError.message }, { status: 500 });
    }

    if (!parentProfile || parentProfile.role !== "parent") {
      return NextResponse.json({ message: "Only parents can submit reviews." }, { status: 403 });
    }

    const { data: reviewerTeacher, error: reviewerTeacherError } = await adminSupabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", payload.parentId)
      .maybeSingle();

    if (reviewerTeacherError) {
      return NextResponse.json({ message: reviewerTeacherError.message }, { status: 500 });
    }

    if (reviewerTeacher) {
      return NextResponse.json({ message: "Teachers cannot submit reviews." }, { status: 403 });
    }

    const { data: existingReview, error: existingError } = await adminSupabase
      .from("reviews")
      .select("id,created_at")
      .eq("teacher_id", payload.teacherId)
      .eq("parent_id", payload.parentId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ message: existingError.message }, { status: 500 });
    }

    const canEdit = Boolean(payload.allowEdit);
    if (existingReview && !canEdit) {
      return NextResponse.json({ message: "You've already reviewed this teacher." }, { status: 409 });
    }

    if (!existingReview) {
      const { data: latestReview, error: latestError } = await adminSupabase
        .from("reviews")
        .select("created_at")
        .eq("parent_id", payload.parentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        return NextResponse.json({ message: latestError.message }, { status: 500 });
      }

      if (latestReview?.created_at && Date.now() - +new Date(latestReview.created_at) < REVIEW_RATE_LIMIT_MS) {
        return NextResponse.json({ message: "You can only submit one review per day." }, { status: 429 });
      }
    }

    if (existingReview?.id) {
      const { data: updated, error: updateError } = await adminSupabase
        .from("reviews")
        .update({ rating, comment })
        .eq("id", existingReview.id)
        .select("id,teacher_id,parent_id,rating,comment,created_at")
        .single();

      if (updateError) {
        return NextResponse.json({ message: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        review: {
          ...updated,
          parent_name: payload.parentName?.trim() || "Parent",
        },
      });
    }

    const { data: inserted, error: insertError } = await adminSupabase
      .from("reviews")
      .insert({
        teacher_id: payload.teacherId,
        parent_id: payload.parentId,
        rating,
        comment,
      })
      .select("id,teacher_id,parent_id,rating,comment,created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ message: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      review: {
        ...inserted,
        parent_name: payload.parentName?.trim() || "Parent",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit review.";
    return NextResponse.json({ message }, { status: 500 });
  }
}