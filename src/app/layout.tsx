import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "FlowDeck - AI-Powered Workflow Manager",
  description: "Modern AI-powered workflow and task management application built with Next.js, TypeScript, and Tailwind CSS.",
  keywords: ["FlowDeck", "workflow", "task management", "Next.js", "TypeScript", "Tailwind CSS", "AI"],
  authors: [{ name: "FlowDeck Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FlowDeck",
    description: "AI-powered workflow and task management",
    url: "https://chat.z.ai",
    siteName: "FlowDeck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowDeck",
    description: "AI-powered workflow and task management",
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
        <Toaster />
      </body>
    </html>
  );
}