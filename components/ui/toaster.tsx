"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-left"
      toastOptions={{
        className: "!bg-card !text-card-foreground !border !border-border",
        duration: 4000,
      }}
    />
  );
}
