"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined" || !isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
        background: "rgba(28, 28, 28, 0.18)",
        backdropFilter: "blur(8px)",
      }}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(1280px, calc(100vw - 48px))",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          background: "rgba(252, 251, 248, 0.98)",
          border: "1px solid rgba(236, 234, 228, 0.92)",
          borderRadius: "22px",
          boxShadow: "0 28px 80px rgba(34, 28, 22, 0.22)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
