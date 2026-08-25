import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flowdek - Workflow & Task Management",
  description: "Modern workflow and task management application built with Next.js, TypeScript, and Tailwind CSS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}