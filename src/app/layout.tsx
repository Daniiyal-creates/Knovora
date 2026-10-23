import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knovora",
  description: "No-code AI chatbot builder trained on your own knowledge.",
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
