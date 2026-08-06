import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Flowdek - Workflow & Task Management",
  description: "Modern workflow and task management application built with Next.js, TypeScript, and Tailwind CSS.",
  keywords: ["Flowdek", "workflow", "task management", "Next.js", "TypeScript", "Tailwind CSS"],
  authors: [{ name: "Flowdek Team" }],
  openGraph: {
    title: "Flowdek",
    description: "Workflow and task management",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flowdek",
    description: "Workflow and task management",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}