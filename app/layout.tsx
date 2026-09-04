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
  title: "La Nuit des Retrouvailles",
  description: "Achetez vos billets en ligne pour La Nuit des Retrouvailles.",
  openGraph: {
    title: "La Nuit des Retrouvailles",
    description: "Achetez vos billets en ligne pour La Nuit des Retrouvailles.",
    url: "https://www.lanuitdesretrouvailles.com",
    siteName: "La Nuit des Retrouvailles",
    images: [
      {
        url: "/flyer.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}