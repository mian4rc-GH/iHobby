import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "iHobbyWorld - RC marketplace",
  description: "RC vehicles and components marketplace for auctions, seller tools, buyer workflows, and moderation."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const document = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    return <ClerkProvider>{document}</ClerkProvider>;
  }

  return document;
}
