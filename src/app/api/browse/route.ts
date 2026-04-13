import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ teachers: [], reviews: [], offline: true });
    }

    const adminSupabase = supabase as any;
    const { data: teacherRows, error: teacherError } = await adminSupabase
      .from("teacher_profiles")
      .select("id,user_id,photo_url,bio,subjects,grades,boards,locality,price_per_month,teaches_at,availability,experience_years,status,is_founding_member,created_at")
      .eq("status", "verified");

    if (teacherError || !teacherRows) {
      return NextResponse.json({ teachers: [], reviews: [], offline: true });
    }

    const userIds = teacherRows.map((row: any) => row.user_id).filter(Boolean);
    const teacherIds = teacherRows.map((row: any) => row.id).filter(Boolean);

    const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
      userIds.length ? adminSupabase.from("profiles").select("id,name").in("id", userIds) : Promise.resolve({ data: [] }),
      teacherIds.length ? adminSupabase.from("reviews").select("id,teacher_id,parent_id,rating,comment,created_at").in("teacher_id", teacherIds) : Promise.resolve({ data: [] }),
    ]);

    const namesByUserId = new Map<string, string>(
      ((profileRows ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const normalizedReviews = ((reviewRows ?? []) as any[]).map((row) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      parent_id: row.parent_id,
      parent_name: "Parent",
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
    }));

    const ratingsByTeacherId = new Map<string, { total: number; count: number }>();
    for (const review of normalizedReviews) {
      const aggregate = ratingsByTeacherId.get(review.teacher_id) ?? { total: 0, count: 0 };
      aggregate.total += review.rating;
      aggregate.count += 1;
      ratingsByTeacherId.set(review.teacher_id, aggregate);
    }

    const teachers = (teacherRows as any[]).map((row) => {
      const aggregate = ratingsByTeacherId.get(row.id);
      const reviewsCount = aggregate?.count ?? 0;
      const rating = reviewsCount ? Math.round((aggregate!.total / reviewsCount) * 10) / 10 : 0;

      return {
        id: row.id,
        user_id: row.user_id,
        created_at: row.created_at,
        name: namesByUserId.get(row.user_id) ?? "Tutor",
        photo_url: row.photo_url ?? "",
        bio: row.bio ?? "",
        subjects: row.subjects ?? [],
        grades: row.grades ?? [],
        boards: row.boards ?? [],
        locality: row.locality ?? "",
        price_per_month: row.price_per_month ?? 0,
        teaches_at: row.teaches_at,
        availability: row.availability ?? [],
        experience_years: row.experience_years ?? 0,
        whatsapp_number: "",
        status: row.status,
        public_status: row.status,
        is_founding_member: Boolean(row.is_founding_member),
        is_resubmission: false,
        rating,
        reviews_count: reviewsCount,
        reviewCount: reviewsCount,
      };
    });

    return NextResponse.json({ teachers, reviews: normalizedReviews, offline: false });
  } catch {
    return NextResponse.json({ teachers: [], reviews: [], offline: true });
  }
}
