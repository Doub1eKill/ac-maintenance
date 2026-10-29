import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AC Maintenance System | ระบบบริหารจัดการและแจ้งซ่อมเครื่องปรับอากาศ",
  description: "ระบบบริหารจัดการเครื่องปรับอากาศ และการแจ้งซ่อมบำรุงระดับมหาวิทยาลัย",
};

import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { WebVitalsReporter } from "@/components/shared/web-vitals-reporter";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The per-request nonce src/proxy.ts put in the CSP. Next.js stamps it on its
  // own scripts by itself; next-themes writes an inline script too, which the
  // policy blocks unless it carries the nonce. Reading headers() is also what
  // makes every page render per request — a page prerendered at build time
  // would ship scripts without this response's nonce and be blocked.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="th"
      // suppressHydrationWarning: next-themes sets the class/style attribute
      // on <html> before hydration via an inline script, which legitimately
      // differs from the server-rendered markup for one frame — this is the
      // documented way to silence that specific (harmless) mismatch warning
      // without suppressing real ones, since it only applies to this element.
      suppressHydrationWarning
      className={cn("h-full", "antialiased", notoSansThai.variable, geistSans.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {/* Field LCP for the TTACON 2026 paper; temporary (src/lib/web-vitals.ts). */}
        <WebVitalsReporter />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
