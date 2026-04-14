import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const teacherId = (context.params.id ?? "").trim();
    if (!teacherId) {
      return NextResponse.json({ message: "Teacher id is required" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ teacher: null, reviews: [], offline: true }, { status: 200 });
    }

    const adminSupabase = supabase as any;

    const { data: teacherRow, error: teacherError } = await adminSupabase
      .from("teacher_profiles")
      .select("id,user_id,photo_url,bio,subjects,grades,boards,locality,price_per_month,teaches_at,availability,experience_years,whatsapp_number,status,is_founding_member,created_at")
      .eq("id", teacherId)
      .neq("status", "rejected")
      .maybeSingle();

    if (teacherError || !teacherRow) {
      return NextResponse.json({ teacher: null, reviews: [], offline: false }, { status: 404 });
    }

    const [{ data: profileRow }, { data: reviewRows }] = await Promise.all([
      teacherRow.user_id
        ? adminSupabase.from("profiles").select("id,name").eq("id", teacherRow.user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      adminSupabase
        .from("reviews")
        .select("id,teacher_id,parent_id,rating,comment,created_at")
        .eq("teacher_id", teacherRow.id),
    ]);

    const normalizedReviews = ((reviewRows ?? []) as any[]).map((row) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      parent_id: row.parent_id,
      parent_name: "Parent",
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
    }));

    const reviewsCount = normalizedReviews.length;
    const rating = reviewsCount
      ? Math.round((normalizedReviews.reduce((total, row) => total + Number(row.rating ?? 0), 0) / reviewsCount) * 10) / 10
      : 0;

    const teacher = {
      id: teacherRow.id,
      user_id: teacherRow.user_id,
      created_at: teacherRow.created_at,
      name: profileRow?.name ?? "Tutor",
      photo_url: teacherRow.photo_url ?? "",
      bio: teacherRow.bio ?? "",
      subjects: teacherRow.subjects ?? [],
      grades: teacherRow.grades ?? [],
      boards: teacherRow.boards ?? [],
      locality: teacherRow.locality ?? "",
      price_per_month: teacherRow.price_per_month ?? 0,
      teaches_at: teacherRow.teaches_at,
      availability: teacherRow.availability ?? [],
      experience_years: teacherRow.experience_years ?? 0,
      whatsapp_number: teacherRow.whatsapp_number ?? "",
      status: teacherRow.status,
      public_status: teacherRow.status,
      is_founding_member: Boolean(teacherRow.is_founding_member),
      is_resubmission: false,
      rating,
      reviews_count: reviewsCount,
      reviewCount: reviewsCount,
    };

    const response = NextResponse.json({ teacher, reviews: normalizedReviews, offline: false });
    response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch {
    return NextResponse.json({ teacher: null, reviews: [], offline: true }, { status: 200 });
  }
}
