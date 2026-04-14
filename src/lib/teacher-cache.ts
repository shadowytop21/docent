import { localStorageKeys, type TeacherRecord } from "@/lib/data";

const MAX_CACHED_TEACHERS = 120;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readTeacherCache(): TeacherRecord[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(localStorageKeys.teacherCatalog);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as TeacherRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => Boolean(item?.id));
  } catch {
    return [];
  }
}

export function getTeacherFromCache(teacherId: string): TeacherRecord | null {
  const cached = readTeacherCache();
  return cached.find((item) => item.id === teacherId) ?? null;
}

export function upsertTeachersToCache(incoming: TeacherRecord[]) {
  if (!canUseStorage() || !incoming.length) {
    return;
  }

  const byId = new Map<string, TeacherRecord>();
  for (const teacher of readTeacherCache()) {
    byId.set(teacher.id, teacher);
  }

  for (const teacher of incoming) {
    byId.set(teacher.id, teacher);
  }

  const trimmed = Array.from(byId.values()).slice(-MAX_CACHED_TEACHERS);
  window.localStorage.setItem(localStorageKeys.teacherCatalog, JSON.stringify(trimmed));
}
