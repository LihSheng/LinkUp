import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./messages/en.json";

const LOCALE_KEY = "linkup:locale";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: "en",
    lng: "en",
    interpolation: { escapeValue: false },
    detection: {
      lookupLocalStorage: LOCALE_KEY,
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export function setLanguage(lng: string) {
  try {
    localStorage.setItem(LOCALE_KEY, lng);
  } catch {}
  void i18n.changeLanguage(lng);
}

export { LOCALE_KEY };

export default i18n;
