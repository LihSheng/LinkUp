"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { t } = useTranslation();
  const errorCode = error.digest ?? crypto.randomUUID();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    console.error("[linkup][page-error]", errorCode, error.message, error.stack);
  }, [error, errorCode]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #fbf8f1 0%, #f7f4ed 58%, #f4efe5 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "460px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "#1c1c1c",
            color: "#fcfbf8",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            fontSize: "1.25rem",
            margin: "0 auto 28px",
          }}
        >
          L
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#1c1c1c",
            fontWeight: 600,
            margin: "0 0 12px",
          }}
        >
          {t("errors.page.title")}
        </h1>

        <p
          style={{
            color: "#5f5f5d",
            fontSize: "1rem",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          {t("errors.page.description")}
        </p>

        <button
          onClick={unstable_retry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "1px solid #1c1c1c",
            background: "#1c1c1c",
            color: "#fcfbf8",
            fontSize: "0.95rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow:
              "0 0 0 0 rgba(0,0,0,0), inset 0 0.5px 0 rgba(255,255,255,0.2), inset 0 0 0 0.5px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {t("errors.page.retry")}
        </button>

        <p
          style={{
            marginTop: "32px",
            fontSize: "0.75rem",
            color: "#5f5f5d",
            fontFamily: "var(--font-mono)",
            wordBreak: "break-all",
          }}
        >
          {t("errors.page.reference", { code: errorCode })}
        </p>
      </div>
    </div>
  );
}
