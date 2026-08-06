import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { FlowdekDataProvider } from "@/providers/FlowdekDataProvider";

if (typeof window === 'undefined') {
  try {
    const originalUseContext = React.useContext;
    if (originalUseContext && !((originalUseContext as unknown as { __isSafePatch?: boolean }).__isSafePatch)) {
      const safeUseContext = function (Context: unknown) {
        try {
          const internals = (React as unknown as { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: { ReactCurrentDispatcher?: { current?: unknown } } }).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
          if (!internals?.ReactCurrentDispatcher?.current) {
            return null;
          }
          return originalUseContext(Context as never);
        } catch {
          return null;
        }
      };
      (safeUseContext as unknown as { __isSafePatch: boolean }).__isSafePatch = true;
      (React as unknown as { useContext: typeof safeUseContext }).useContext = safeUseContext;
    }
  } catch {
    // ignore
  }
}

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
        <FlowdekDataProvider>
          {children}
        </FlowdekDataProvider>
      </body>
    </html>
  );
}