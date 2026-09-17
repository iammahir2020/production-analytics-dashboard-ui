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
  title: "Khata",
  description: "Khata — a production analytics dashboard for a Bangladesh e-commerce business",
  // Two variants of the same mark (public/icon-{light,dark}.svg), picked by
  // the OS/browser's own color-scheme preference via the `media` field —
  // a favicon is loaded by browser chrome, outside the page's DOM/CSS
  // entirely, so it can't read the app's live theme-toggle state the way
  // the in-page header icon does; prefers-color-scheme is the equivalent
  // browser-chrome-level signal, and is what a favicon can actually see.
  icons: {
    icon: [
      { url: "/icon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
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
          {/* max-w-7xl (was 6xl) — on a real wide monitor the tighter cap
              left a lot of unused side margin, which made the whole page
              read smaller than it needed to (see the density recalibration
              note in learn.md). */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
