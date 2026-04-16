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
  title: "Kalshi Temperature +EV Finder",
  description:
    "Compare Kalshi temperature markets against weather forecasts to find +EV opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-foreground/10 px-6 py-4">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Kalshi Temp +EV
              </h1>
              <p className="text-sm text-foreground/50">
                Weather forecast vs. prediction market analysis
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
        <footer className="border-t border-foreground/10 px-6 py-3 text-center text-xs text-foreground/30">
          Gaussian model with Open-Meteo forecasts. Not financial advice.
        </footer>
      </body>
    </html>
  );
}
