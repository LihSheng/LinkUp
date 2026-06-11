"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[1280px] sm:max-w-[calc(100vw-48px)] w-full max-h-[calc(100vh-32px)] p-0 gap-0 overflow-hidden rounded-[22px]"
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
