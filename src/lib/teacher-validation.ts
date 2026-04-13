export function normalizeTeacherName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function validateTeacherName(value: string) {
  const normalized = normalizeTeacherName(value);
  if (!normalized) {
    return "Full name is required";
  }

  if (normalized.length < 3 || normalized.length > 60) {
    return "Full name must be between 3 and 60 characters";
  }

  if (!/^[A-Za-z .'-]+$/.test(normalized)) {
    return "Full name can only include letters, spaces, apostrophes, dots, and hyphens";
  }

  return null;
}

export function validateTeacherBio(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "Bio is required";
  }

  if (normalized.length < 30 || normalized.length > 200) {
    return "Bio must be between 30 and 200 characters";
  }

  return null;
}

export function parseExperienceYears(value: number | string | null | undefined) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 50) {
    return {
      value: null,
      error: "Experience must be a whole number between 0 and 50",
    };
  }

  return {
    value: numeric,
    error: null,
  };
}

export function normalizeWhatsappNumber(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return digitsOnly.slice(1);
  }

  return digitsOnly;
}

export function validateWhatsappNumber(value: string) {
  const normalized = normalizeWhatsappNumber(value);
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return {
      value: null,
      error: "Enter a valid 10-digit WhatsApp number",
    };
  }

  return {
    value: normalized,
    error: null,
  };
}