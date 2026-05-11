import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { AppShell } from "@/components/AppShell";

const cormorant = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const sourceSans = Source_Sans_3({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "Lumen | CARIPRIP - Collaborative Integrated Program Intelligence Platform",
  description: "Program management intelligence for faith-based humanitarian networks",
};

const GA_MEASUREMENT_ID = "G-G3FBPTPLCK";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <LocaleProvider>
          <AuthProvider>
            <TenantProvider>
              <AppShell>{children}</AppShell>
            </TenantProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
