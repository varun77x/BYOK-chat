import "./globals.css";
import type { Metadata } from "next";
import {
  Inter,
  Manrope,
  Poppins,
  IBM_Plex_Sans,
  Merriweather,
  Megrim,
  JetBrains_Mono,
  Fira_Code,
  IBM_Plex_Mono,
} from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";
import { ScreenGuard } from "@/components/ScreenGuard";
import { Toaster } from "@/components/Toaster";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});
const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["400", "700"],
  display: "swap",
});
// Megrim is a display face that ships a single weight, so `weight` is required.
const megrim = Megrim({
  subsets: ["latin"],
  variable: "--font-megrim",
  weight: "400",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

const fontVars = [
  inter.variable,
  manrope.variable,
  poppins.variable,
  plexSans.variable,
  merriweather.variable,
  megrim.variable,
  jetbrains.variable,
  firaCode.variable,
  plexMono.variable,
].join(" ");

export const metadata: Metadata = {
  title: "BYOK",
  description: "Bring your own key. Chat with any OpenAI-compatible model.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <body>
        <ThemeProvider>
          <ScreenGuard>
            <AppShell>{children}</AppShell>
          </ScreenGuard>
          <Toaster />
          <ConfirmDialog />
        </ThemeProvider>
      </body>
    </html>
  );
}
