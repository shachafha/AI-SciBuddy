import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI SciBuddy",
  description: "Literature QC and experiment planning for scientific hypotheses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
