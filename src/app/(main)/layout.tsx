import AppLayout from "@/components/layout/AppLayout";
import type React from "react";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
