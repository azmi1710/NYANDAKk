import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const pjs = localFont({
  src: [
    { path: "../fonts/PJS-400.ttf", weight: "400", style: "normal" },
    { path: "../fonts/PJS-500.ttf", weight: "500", style: "normal" },
    { path: "../fonts/PJS-600.ttf", weight: "600", style: "normal" },
    { path: "../fonts/PJS-700.ttf", weight: "700", style: "normal" },
    { path: "../fonts/PJS-800.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-pjs",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NYANDAK — Beliin, antarin, beres.",
  description:
    "Jasa suruh warga Sirampog & sekitarnya: dititip belanja, diantar barang, titip bayar. Kurir orang sekitar, bayar cash.",
  applicationName: "NYANDAK",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NYANDAK" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#C75B2B",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${pjs.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
