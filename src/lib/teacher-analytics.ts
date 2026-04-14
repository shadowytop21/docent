type TeacherAnalyticsEvent = {
  teacherId: string;
  at: string;
};

type TeacherAnalyticsStore = {
  views: TeacherAnalyticsEvent[];
  contacts: TeacherAnalyticsEvent[];
  savedByTeacher: Record<string, string[]>;
};

export type TeacherAnalyticsSummary = {
  viewsLast7Days: number;
  contactsLast7Days: number;
  savedCount: number;
  lastViewedAt: string | null;
  lastContactedAt: string | null;
  lastSavedAt: string | null;
};

const STORAGE_KEY = "docent.teacher-analytics.v1";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 500;

function canUseStorage() {
  return typeof window !== "undefined";
}

function emptyStore(): TeacherAnalyticsStore {
  return {
    views: [],
    contacts: [],
    savedByTeacher: {},
  };
}

function trimEvents(events: TeacherAnalyticsEvent[]) {
  return events.slice(-MAX_EVENTS);
}

function readStore(): TeacherAnalyticsStore {
  if (!canUseStorage()) {
    return emptyStore();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TeacherAnalyticsStore>;
    return {
      views: Array.isArray(parsed.views) ? parsed.views.filter((item) => Boolean(item?.teacherId && item?.at)) : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts.filter((item) => Boolean(item?.teacherId && item?.at)) : [],
      savedByTeacher: parsed.savedByTeacher && typeof parsed.savedByTeacher === "object" ? parsed.savedByTeacher : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: TeacherAnalyticsStore) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("docent-teacher-analytics-change"));
}

function recordEvent(kind: "views" | "contacts", teacherId: string) {
  const store = readStore();
  const nextEvent = { teacherId, at: new Date().toISOString() };
  store[kind] = trimEvents([...(store[kind] ?? []), nextEvent]);
  writeStore(store);
}

export function recordTeacherProfileView(teacherId: string) {
  if (!teacherId || !canUseStorage()) {
    return;
  }

  recordEvent("views", teacherId);
}

export function recordTeacherContact(teacherId: string) {
  if (!teacherId || !canUseStorage()) {
    return;
  }

  recordEvent("contacts", teacherId);
}

export function isTeacherSaved(teacherId: string, parentId: string) {
  if (!teacherId || !parentId || !canUseStorage()) {
    return false;
  }

  const store = readStore();
  return (store.savedByTeacher[teacherId] ?? []).includes(parentId);
}

export function toggleTeacherSaved(teacherId: string, parentId: string) {
  if (!teacherId || !parentId || !canUseStorage()) {
    return false;
  }

  const store = readStore();
  const current = new Set(store.savedByTeacher[teacherId] ?? []);
  const nextSaved = !current.has(parentId);

  if (nextSaved) {
    current.add(parentId);
  } else {
    current.delete(parentId);
  }

  store.savedByTeacher[teacherId] = Array.from(current);
  writeStore(store);
  return nextSaved;
}

export function getTeacherAnalyticsSummary(teacherId: string): TeacherAnalyticsSummary {
  const store = readStore();
  const now = Date.now();
  const inWindow = (timestamp: string) => now - new Date(timestamp).getTime() <= SEVEN_DAYS_MS;

  const views = store.views.filter((entry) => entry.teacherId === teacherId && inWindow(entry.at));
  const contacts = store.contacts.filter((entry) => entry.teacherId === teacherId && inWindow(entry.at));
  const savedCount = store.savedByTeacher[teacherId]?.length ?? 0;

  return {
    viewsLast7Days: views.length,
    contactsLast7Days: contacts.length,
    savedCount,
    lastViewedAt: views.at(-1)?.at ?? null,
    lastContactedAt: contacts.at(-1)?.at ?? null,
    lastSavedAt: null,
  };
}
