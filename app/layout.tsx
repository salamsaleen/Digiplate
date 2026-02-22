import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DigiPlate",
  description: "Digital Canteen Coupon System",
  manifest: "/manifest.json?v=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DigiPlate",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-512x512.png?v=5",
    apple: "/icons/icon-192x192.png?v=5",
  },
};
export const viewport = {
  themeColor: "#0b121e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
