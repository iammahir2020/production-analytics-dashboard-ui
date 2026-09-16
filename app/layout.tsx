import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppHeader } from "@/components/shared/app-header";
import "./globals.css";

// Khata direction: one grotesk family, weight-driven hierarchy — see
// .interface-design/system.md. Replaces shadcn's Geist default from init.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Production Analytics Dashboard",
  description: "Analytics dashboard for a Bangladesh e-commerce business",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // via a blocking inline script before React hydrates, so the
    // server-rendered class intentionally won't match the client's first
    // render — without this, React logs a false-positive mismatch warning.
    <html
      lang="en"
      className={`${hankenGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
