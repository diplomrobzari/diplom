import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Analytics } from "../components/Analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nastarte.ru";
const siteName = "НаСтарте.ru";
const siteDescription =
  "Платформа для публикации спортивных и тематических соревнований, регистрации участников, модерации объявлений, результатов и отзывов об организаторах.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} - соревнования рядом с вами`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "соревнования",
    "спортивные события",
    "турниры",
    "регистрация на соревнования",
    "организация соревнований",
    "результаты соревнований",
    "отзывы об организаторах",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName,
    title: `${siteName} - соревнования рядом с вами`,
    description: siteDescription,
    images: [
      {
        url: "/images/carousel/slide1.png",
        width: 1200,
        height: 630,
        alt: "Участники соревнования на платформе НаСтарте.ru",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - соревнования рядом с вами`,
    description: siteDescription,
    images: ["/images/carousel/slide1.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#7D39EB",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    inLanguage: "ru-RU",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/competitions?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <Analytics />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
