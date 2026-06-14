import type { MaskedValueCategory } from "@/lib/masking/masking.types";

function isPhoneNumber(str: string): boolean {
  const digits = str.replace(/[\s+\-()]/g, "");
  if (str.includes("/") || str.includes(":")) return false;
  if (!/^\d{7,15}$/.test(digits)) return false;
  if (str.startsWith("+")) return true;
  if (/[\s\-()]/.test(str)) return true;
  if (/^\d{10,11}$/.test(str)) return true;
  return false;
}

function isCurrency(str: string): boolean {
  if (/^[₹$€£¥]\s?\d/.test(str)) return true;
  if (/^\d[\d,.]*\s*(USD|EUR|GBP|JPY|SGD|MYR|RM)\b/i.test(str)) return true;
  if (/^(RM|MYR|USD|EUR|GBP|SGD|JPY)\s+\d/i.test(str)) return true;
  if (/^\d{1,3}(,\d{3})+(\.\d{2})?$/.test(str)) return true;
  return false;
}

function isDateLike(str: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) return true;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2},?\s\d{4}$/i.test(str)) return true;
  if (/^\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}$/i.test(str)) return true;
  if (!Number.isNaN(Date.parse(str))) return true;
  return false;
}

function isGovernmentID(str: string): boolean {
  if (/^[STFG]\d{7}[A-Z]$/i.test(str)) return true;
  if (/^\d{6}-\d{2}-\d{4}$/.test(str)) return true;
  return false;
}

export function classifyCellValue(value: unknown): { category: MaskedValueCategory; masked: string } {
  if (value === null || value === undefined || value === "") {
    return { category: "empty", masked: "<EMPTY>" };
  }

  const str = String(value).trim();
  if (!str) return { category: "empty", masked: "<EMPTY>" };

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    return { category: "email", masked: "<EMAIL>" };
  }

  if (isGovernmentID(str)) {
    return { category: "government_id", masked: "<GOVERNMENT_ID>" };
  }

  if (/^[A-Za-z]{1,2}\d{7,8}$/.test(str)) {
    return { category: "government_id", masked: "<GOVERNMENT_ID>" };
  }

  const digitsOnly = str.replace(/,/g, "");
  if (!Number.isNaN(Number(digitsOnly)) && digitsOnly.trim().length > 0) {
    return { category: "number", masked: "<NUMBER>" };
  }

  if (isCurrency(str)) {
    return { category: "currency", masked: "<CURRENCY_AMOUNT>" };
  }

  if (/^[A-Za-z]{2,8}[-_]?\d{2,10}$/.test(str)) {
    return { category: "code", masked: "<CODE>" };
  }

  if (isDateLike(str)) {
    return { category: "date", masked: "<DATE>" };
  }

  if (isPhoneNumber(str)) {
    return { category: "phone", masked: "<PHONE>" };
  }

  if (str.length > 80) {
    return { category: "free_text", masked: "<FREE_TEXT>" };
  }

  if (/^(true|false|yes|no)$/i.test(str)) {
    return { category: "boolean", masked: str.toLowerCase() };
  }

  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(str) && str.length >= 2 && str.length <= 50) {
    return { category: "person_name", masked: "<PERSON_NAME>" };
  }

  return { category: "unknown", masked: "<VALUE>" };
}

export function maskCellValue(value: unknown): string {
  return classifyCellValue(value).masked;
}
