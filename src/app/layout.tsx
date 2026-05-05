import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HOLY CLUB",
  description: "Sistema de gestión — Holy Club",
  applicationName: "HOLY CLUB",

  // 🔥 PWA
  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "HOLY",
    statusBarStyle: "black-translucent",
  },

  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${orbitron.variable} font-sans bg-background text-text-primary antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}