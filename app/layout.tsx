import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sema",
  description: "A streaming AI chat product.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
