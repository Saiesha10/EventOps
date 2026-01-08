import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "./components/NavbarWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EventOps",
  description: "Real-time Event Management and Coordination Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-[#0b0714] text-gray-100`}>
        <NavbarWrapper />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
