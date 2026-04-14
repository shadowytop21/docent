import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeReviews = searchParams.get("includeReviews") === "1";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") ?? "12")));
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const query = (searchParams.get("q") ?? "").trim().toLowerCase();
    const subject = (searchParams.get("subject") ?? "").trim();
    const grade = (searchParams.get("grade") ?? "").trim();
    const locality = (searchParams.get("locality") ?? "").trim();
    const board = (searchParams.get("board") ?? "").trim();
    const availability = (searchParams.get("availability") ?? "").trim();
    const priceMax = Number(searchParams.get("priceMax") ?? "0");

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ teachers: [], reviews: [], total: 0, page, pageSize: limit, offline: true });
    }

    const adminSupabase = supabase as any;
    let teacherQuery = adminSupabase
      .from("teacher_profiles")
      .select("id,user_id,photo_url,bio,subjects,grades,boards,locality,price_per_month,teaches_at,availability,experience_years,whatsapp_number,status,is_founding_member,created_at", { count: "exact" })
      .neq("status", "rejected")
      .order("status", { ascending: false })
      .range(start, end);

    if (subject) {
      teacherQuery = teacherQuery.contains("subjects", [subject]);
    }
    if (grade) {
      teacherQuery = teacherQuery.contains("grades", [grade]);
    }
    if (board) {
      teacherQuery = teacherQuery.contains("boards", [board]);
    }
    if (availability) {
      teacherQuery = teacherQuery.contains("availability", [availability]);
    }
    if (locality) {
      teacherQuery = teacherQuery.eq("locality", locality);
    }
    if (Number.isFinite(priceMax) && priceMax > 0) {
      teacherQuery = teacherQuery.lte("price_per_month", priceMax);
    }

    const { data: teacherRows, error: teacherError, count } = await teacherQuery;

    if (teacherError || !teacherRows) {
      return NextResponse.json({ teachers: [], reviews: [], total: 0, page, pageSize: limit, offline: true });
    }

    const userIds = teacherRows.map((row: any) => row.user_id).filter(Boolean);
    const teacherIds = teacherRows.map((row: any) => row.id).filter(Boolean);

    const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
      userIds.length ? adminSupabase.from("profiles").select("id,name").in("id", userIds) : Promise.resolve({ data: [] }),
      teacherIds.length
        ? includeReviews
          ? adminSupabase.from("reviews").select("id,teacher_id,parent_id,rating,comment,created_at").in("teacher_id", teacherIds)
          : adminSupabase.from("reviews").select("teacher_id,rating").in("teacher_id", teacherIds)
        : Promise.resolve({ data: [] }),
    ]);

    const namesByUserId = new Map<string, string>(
      ((profileRows ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
    );

    const normalizedReviews = includeReviews
      ? ((reviewRows ?? []) as any[]).map((row) => ({
        id: row.id,
        teacher_id: row.teacher_id,
        parent_id: row.parent_id,
        parent_name: "Parent",
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
      }))
      : [];

    const ratingRows = (reviewRows ?? []) as Array<{ teacher_id: string; rating: number }>;

    const ratingsByTeacherId = new Map<string, { total: number; count: number }>();
    for (const review of ratingRows) {
      const aggregate = ratingsByTeacherId.get(review.teacher_id) ?? { total: 0, count: 0 };
      aggregate.total += Number(review.rating ?? 0);
      aggregate.count += 1;
      ratingsByTeacherId.set(review.teacher_id, aggregate);
    }

    const teachers = (teacherRows as any[])
      .map((row) => {
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
        whatsapp_number: row.whatsapp_number ?? "",
        status: row.status,
        public_status: row.status,
        is_founding_member: Boolean(row.is_founding_member),
        is_resubmission: false,
        rating,
        reviews_count: reviewsCount,
        reviewCount: reviewsCount,
      };
      })
      .filter((teacher) => {
        if (!query) {
          return true;
        }

        const searchable = [teacher.name, teacher.bio, teacher.locality, ...teacher.subjects, ...teacher.grades]
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });

    const response = NextResponse.json({ teachers, reviews: normalizedReviews, total: count ?? 0, page, pageSize: limit, offline: false });
    response.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch {
    return NextResponse.json({ teachers: [], reviews: [], total: 0, page: 1, pageSize: 12, offline: true });
  }
}
