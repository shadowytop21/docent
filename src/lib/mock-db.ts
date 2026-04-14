import {
  buildTeacherView,
  type ProfileRecord,
  type ReviewRecord,
  type SessionRecord,
  type TeacherRecord,
  type TeacherStatus,
} from "@/lib/data";
import { createId } from "@/lib/utils";

export interface AppSnapshot {
  profiles: ProfileRecord[];
  teachers: TeacherRecord[];
  reviews: ReviewRecord[];
  session: SessionRecord | null;
}

const STORAGE_KEY = "docent.app-state.v1";
const ADMIN_STORAGE_KEY = "docent.admin-auth.v1";
const HOMEPAGE_SHOWCASE_KEY = "docent.homepage-showcase.v1";
const REVIEW_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

export type HomepageFeaturedCard = {
  initials: string;
  name: string;
  locality: string;
  tags: string[];
  price: number;
  rating: number;
  tone?: "default" | "green";
};

export type HomepageShowcaseConfig = {
  cards: HomepageFeaturedCard[];
  stats: Array<{ label: string; value: string }>;
};

export const defaultHomepageShowcaseConfig: HomepageShowcaseConfig = {
  cards: [
    {
      initials: "PS",
      name: "Priya Sharma",
      locality: "Civil Lines, Mathura",
      tags: ["Maths", "Physics", "Class 9-12"],
      price: 1200,
      rating: 4.9,
      tone: "default",
    },
    {
      initials: "RM",
      name: "Rahul Mehta",
      locality: "Vrindavan, Mathura",
      tags: ["Chemistry", "Biology", "NEET"],
      price: 1500,
      rating: 4.8,
      tone: "green",
    },
  ],
  stats: [
    { label: "Tutors", value: "50+" },
    { label: "Subjects", value: "12" },
    { label: "Areas", value: "15" },
  ],
};

export type AppSecurityErrorCode =
  | "TEACHER_REVIEW_FORBIDDEN"
  | "SELF_REVIEW_FORBIDDEN"
  | "REVIEW_DUPLICATE"
  | "REVIEW_RATE_LIMIT"
  | "TEACHER_NOT_FOUND"
  | "TEACHER_NOT_PUBLIC"
  | "PROFILE_ALREADY_EXISTS"
  | "PHONE_ALREADY_REGISTERED";

export class AppSecurityError extends Error {
  code: AppSecurityErrorCode;
  status: number;

  constructor(code: AppSecurityErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type AdminAuthRecord = {
  email: string;
  authenticatedAt: string;
};

function seedState(): AppSnapshot {
  return {
    profiles: [],
    teachers: [],
    reviews: [],
    session: null,
  };
}

function isTeacherPublic(teacher: TeacherRecord) {
  // Show both verified and pending teachers (but not rejected)
  return teacher.status !== "rejected" && teacher.status !== undefined;
}

function refreshTeacherAggregates(teachers: TeacherRecord[], reviews: ReviewRecord[]) {
  return teachers.map((teacher) => {
    const teacherReviews = reviews.filter((item) => item.teacher_id === teacher.id);
    const rating = teacherReviews.length
      ? Math.round((teacherReviews.reduce((total, item) => total + item.rating, 0) / teacherReviews.length) * 10) / 10
      : 0;

    return {
      ...teacher,
      rating,
      reviews_count: teacherReviews.length,
      reviewCount: teacherReviews.length,
    };
  });
}

function sanitizeSnapshot(parsed: Partial<AppSnapshot>): AppSnapshot {
  const teachers = (parsed.teachers ?? []).filter((teacher) => Boolean(teacher.user_id));
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));

  return {
    profiles: parsed.profiles ?? [],
    teachers,
    reviews: (parsed.reviews ?? []).filter((review) => teacherIds.has(review.teacher_id)),
    session: parsed.session ?? null,
  };
}

function readStorage(): AppSnapshot {
  if (typeof window === "undefined") {
    return seedState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as AppSnapshot;
    const sanitized = sanitizeSnapshot(parsed);
    writeStorage(sanitized);
    return sanitized;
  } catch {
    const initial = seedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeStorage(snapshot: AppSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function notifySessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("docent-session-change"));
}

function readAdminStorage(): AdminAuthRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminAuthRecord;
  } catch {
    return null;
  }
}

function writeAdminStorage(auth: AdminAuthRecord | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(auth));
}

export function loadAppState() {
  return readStorage();
}

export function saveAppState(snapshot: AppSnapshot) {
  writeStorage(snapshot);
}

export function resetAppState() {
  const snapshot = seedState();
  writeStorage(snapshot);
  return snapshot;
}

export function mutateAppState(mutator: (snapshot: AppSnapshot) => AppSnapshot) {
  const snapshot = mutator(readStorage());
  writeStorage(snapshot);
  return snapshot;
}

export function saveSession(session: SessionRecord) {
  const snapshot = mutateAppState((current) => ({
    ...current,
    session,
  }));

  notifySessionChange();
  return snapshot;
}

export function clearSession() {
  const snapshot = mutateAppState((current) => ({
    ...current,
    session: null,
  }));

  notifySessionChange();
  return snapshot;
}

export function loadAdminAuth() {
  return readAdminStorage();
}

export function saveAdminAuth(email: string) {
  const auth: AdminAuthRecord = {
    email: email.trim().toLowerCase(),
    authenticatedAt: new Date().toISOString(),
  };

  writeAdminStorage(auth);
  return auth;
}

export function clearAdminAuth() {
  writeAdminStorage(null);
}

export function loadHomepageShowcaseConfig(): HomepageShowcaseConfig {
  if (typeof window === "undefined") {
    return defaultHomepageShowcaseConfig;
  }

  const raw = window.localStorage.getItem(HOMEPAGE_SHOWCASE_KEY);
  if (!raw) {
    return defaultHomepageShowcaseConfig;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HomepageShowcaseConfig>;
    if (!parsed.cards?.length || !parsed.stats?.length) {
      return defaultHomepageShowcaseConfig;
    }

    return {
      cards: parsed.cards.slice(0, 2).map((card, index) => ({
        initials: card.initials?.slice(0, 2).toUpperCase() || defaultHomepageShowcaseConfig.cards[index]?.initials || "NA",
        name: card.name || defaultHomepageShowcaseConfig.cards[index]?.name || "Teacher",
        locality: card.locality || defaultHomepageShowcaseConfig.cards[index]?.locality || "Mathura",
        tags: (card.tags ?? defaultHomepageShowcaseConfig.cards[index]?.tags ?? []).slice(0, 3),
        price: Number(card.price ?? defaultHomepageShowcaseConfig.cards[index]?.price ?? 1000),
        rating: Number(card.rating ?? defaultHomepageShowcaseConfig.cards[index]?.rating ?? 4.5),
        tone: card.tone === "green" ? "green" : "default",
      })),
      stats: parsed.stats.slice(0, 3).map((stat, index) => ({
        label: stat.label || defaultHomepageShowcaseConfig.stats[index]?.label || "Metric",
        value: stat.value || defaultHomepageShowcaseConfig.stats[index]?.value || "0",
      })),
    };
  } catch {
    return defaultHomepageShowcaseConfig;
  }
}

export function saveHomepageShowcaseConfig(config: HomepageShowcaseConfig) {
  if (typeof window === "undefined") {
    return defaultHomepageShowcaseConfig;
  }

  window.localStorage.setItem(HOMEPAGE_SHOWCASE_KEY, JSON.stringify(config));
  return config;
}

export function isAdminAuthValid(adminEmail: string) {
  const auth = readAdminStorage();
  return Boolean(auth && auth.email === adminEmail.trim().toLowerCase());
}

export function getProfilesByPhone(phone: string) {
  const normalized = phone.trim();
  if (!normalized) {
    return [];
  }

  return readStorage().profiles.filter((entry) => entry.phone.trim() === normalized);
}

export function findProfileByPhone(phone: string) {
  return getProfilesByPhone(phone)[0] ?? null;
}

export function findTeacherByUserId(userId: string) {
  return readStorage().teachers.find((teacher) => teacher.user_id === userId) ?? null;
}

export function updateProfile(profile: ProfileRecord) {
  return mutateAppState((snapshot) => {
    const existingIndex = snapshot.profiles.findIndex((entry) => entry.id === profile.id);
    const profiles = [...snapshot.profiles];

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.unshift(profile);
    }

    return {
      ...snapshot,
      profiles,
    };
  });
}

export function upsertTeacherProfile(teacher: TeacherRecord) {
  return mutateAppState((snapshot) => {
    const existingIndex = snapshot.teachers.findIndex((entry) => entry.id === teacher.id);
    const teachers = [...snapshot.teachers];

    if (existingIndex >= 0) {
      teachers[existingIndex] = teacher;
    } else {
      teachers.unshift(teacher);
    }

    return {
      ...snapshot,
      teachers,
    };
  });
}

export function createTeacherProfile(payload: {
  profileId: string;
  name: string;
  photoUrl: string;
  bio: string;
  subjects: string[];
  grades: string[];
  boards: string[];
  locality: string;
  pricePerMonth: number;
  teachesAt: TeacherRecord["teaches_at"];
  availability: string[];
  experienceYears: number;
  whatsappNumber: string;
}) {
  return mutateAppState((snapshot) => {
    const existingTeacher = snapshot.teachers.find((entry) => entry.user_id === payload.profileId);
    if (existingTeacher) {
      throw new AppSecurityError("PROFILE_ALREADY_EXISTS", 409, "Teacher profile already exists");
    }

    const teacherId = createId("teacher");
    const teacherRole: ProfileRecord["role"] = "teacher";
    const createdAt = new Date().toISOString();
    const teacher: TeacherRecord = {
      id: teacherId,
      user_id: payload.profileId,
      name: payload.name,
      photo_url: payload.photoUrl,
      bio: payload.bio,
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
      public_status: "pending",
      is_resubmission: false,
      is_founding_member: snapshot.teachers.length < 50,
      created_at: createdAt,
      rating: 0,
      reviews_count: 0,
      reviewCount: 0,
    };

    const profiles: ProfileRecord[] = snapshot.profiles.some((profile) => profile.id === payload.profileId)
      ? snapshot.profiles.map((profile) =>
          profile.id === payload.profileId
            ? {
                ...profile,
                role: teacherRole,
                name: payload.name,
                phone: payload.whatsappNumber,
              }
            : profile,
        )
      : [
          {
            id: payload.profileId,
            role: teacherRole,
            name: payload.name,
            phone: payload.whatsappNumber,
            created_at: createdAt,
          },
          ...snapshot.profiles,
        ];

    return {
      ...snapshot,
      profiles,
      teachers: [teacher, ...snapshot.teachers],
    };
  });
}

export function updateTeacherProfile(payload: {
  profileId: string;
  name: string;
  photoUrl: string;
  bio: string;
  subjects: string[];
  grades: string[];
  boards: string[];
  locality: string;
  pricePerMonth: number;
  teachesAt: TeacherRecord["teaches_at"];
  availability: string[];
  experienceYears: number;
  whatsappNumber: string;
}) {
  return mutateAppState((snapshot) => {
    const existingTeacher = snapshot.teachers.find((entry) => entry.user_id === payload.profileId);
    if (!existingTeacher) {
      throw new AppSecurityError("TEACHER_NOT_FOUND", 404, "Teacher profile not found");
    }

    const teachers: TeacherRecord[] = snapshot.teachers.map((entry) => {
      if (entry.id !== existingTeacher.id) {
        return entry;
      }

      const wasVerified = entry.status === "verified" || (entry.public_status ?? "pending") === "verified";

      return {
        ...entry,
        name: payload.name,
        photo_url: payload.photoUrl,
        bio: payload.bio,
        subjects: payload.subjects,
        grades: payload.grades,
        boards: payload.boards,
        locality: payload.locality,
        price_per_month: payload.pricePerMonth,
        teaches_at: payload.teachesAt,
        availability: payload.availability,
        experience_years: payload.experienceYears,
        whatsapp_number: payload.whatsappNumber,
        status: "pending" as const,
        public_status: wasVerified ? "verified" : "pending",
        is_resubmission: wasVerified,
      };
    });

    const profiles: ProfileRecord[] = snapshot.profiles.map((profile) =>
      profile.id === payload.profileId
        ? {
            ...profile,
            role: "teacher" as const,
            name: payload.name,
            phone: payload.whatsappNumber,
          }
        : profile,
    );

    return {
      ...snapshot,
      profiles,
      teachers,
    };
  });
}

export function addReview(payload: {
  teacherId: string;
  parentId: string;
  parentName: string;
  rating: number;
  comment: string;
}) {
  return submitReview(payload);
}

export function submitReview(payload: {
  teacherId: string;
  parentId: string;
  parentName: string;
  rating: number;
  comment: string;
  allowEdit?: boolean;
}) {
  return mutateAppState((snapshot) => {
    const reviewerProfile = snapshot.profiles.find((entry) => entry.id === payload.parentId);
    const reviewerTeacher = snapshot.teachers.find((entry) => entry.user_id === payload.parentId);

    if (reviewerProfile?.role === "teacher" || reviewerTeacher) {
      throw new AppSecurityError("TEACHER_REVIEW_FORBIDDEN", 403, "Teachers cannot submit reviews");
    }

    const teacher = snapshot.teachers.find((entry) => entry.id === payload.teacherId);
    if (!teacher) {
      throw new AppSecurityError("TEACHER_NOT_FOUND", 404, "Teacher not found");
    }

    if (!isTeacherPublic(teacher)) {
      throw new AppSecurityError("TEACHER_NOT_PUBLIC", 403, "This profile is under review");
    }

    if (teacher.user_id === payload.parentId) {
      throw new AppSecurityError("SELF_REVIEW_FORBIDDEN", 403, "You cannot review your own profile");
    }

    const now = new Date().toISOString();
    const existingReview = snapshot.reviews.find(
      (entry) => entry.teacher_id === payload.teacherId && entry.parent_id === payload.parentId,
    );

    if (existingReview && !payload.allowEdit) {
      throw new AppSecurityError("REVIEW_DUPLICATE", 409, "You've already reviewed this teacher");
    }

    if (!existingReview) {
      const latestByParent = snapshot.reviews
        .filter((entry) => entry.parent_id === payload.parentId)
        .sort((left, right) => +new Date(right.created_at) - +new Date(left.created_at))[0];

      if (latestByParent && Date.now() - +new Date(latestByParent.created_at) < REVIEW_RATE_LIMIT_MS) {
        throw new AppSecurityError("REVIEW_RATE_LIMIT", 429, "You can only submit one review per day");
      }
    }

    const reviews = existingReview
      ? snapshot.reviews.map((entry) =>
          entry.id === existingReview.id
            ? {
                ...entry,
                parent_name: payload.parentName,
                rating: payload.rating,
                comment: payload.comment,
                created_at: now,
              }
            : entry,
        )
      : [
          {
            id: createId("review"),
            teacher_id: payload.teacherId,
            parent_id: payload.parentId,
            parent_name: payload.parentName,
            rating: payload.rating,
            comment: payload.comment,
            created_at: now,
          },
          ...snapshot.reviews,
        ];

    const teachers = refreshTeacherAggregates(snapshot.teachers, reviews);

    return {
      ...snapshot,
      reviews,
      teachers,
    };
  });
}

export function setTeacherStatus(teacherId: string, status: TeacherStatus) {
  return mutateAppState((snapshot) => ({
    ...snapshot,
    teachers: snapshot.teachers.map((teacher) => {
      if (teacher.id !== teacherId) {
        return teacher;
      }

      if (status === "verified") {
        return {
          ...teacher,
          status: "verified",
          public_status: "verified",
          is_resubmission: false,
        };
      }

      if (status === "rejected" && teacher.is_resubmission && teacher.public_status === "verified") {
        return {
          ...teacher,
          status: "verified",
          public_status: "verified",
          is_resubmission: false,
        };
      }

      return {
        ...teacher,
        status,
        public_status: status,
      };
    }),
  }));
}

export function toggleFoundingMember(teacherId: string) {
  return mutateAppState((snapshot) => ({
    ...snapshot,
    teachers: snapshot.teachers.map((teacher) =>
      teacher.id === teacherId
        ? { ...teacher, is_founding_member: !teacher.is_founding_member }
        : teacher,
    ),
  }));
}

export function getTeacherById(teacherId: string) {
  const snapshot = readStorage();
  const teacher = snapshot.teachers.find((entry) => entry.id === teacherId);
  return teacher ? buildTeacherView(teacher, snapshot.reviews) : null;
}

export function getReviewByParentForTeacher(parentId: string, teacherId: string) {
  return readStorage().reviews.find((entry) => entry.parent_id === parentId && entry.teacher_id === teacherId) ?? null;
}

export function deleteReviewById(reviewId: string) {
  return mutateAppState((snapshot) => {
    const reviews = snapshot.reviews.filter((review) => review.id !== reviewId);

    return {
      ...snapshot,
      reviews,
      teachers: refreshTeacherAggregates(snapshot.teachers, reviews),
    };
  });
}

export function isTeacherVisiblePublicly(teacher: TeacherRecord) {
  return isTeacherPublic(teacher);
}
