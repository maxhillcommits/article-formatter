import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Article Formatter",
  description: "Paste a URL or text, get a book-style printable article.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
