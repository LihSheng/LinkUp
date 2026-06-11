"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className:
          "rounded-[18px] border border-[var(--color-border)] bg-white/96 text-[var(--color-ink)] shadow-[0_16px_42px_rgba(28,28,28,0.12)] backdrop-blur-md",
        descriptionClassName: "text-[#6f726f]",
      }}
      {...props}
    />
  );
}

export { Toaster, Sonner };
export { toast } from "sonner";
