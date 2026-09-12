import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { PwaServiceWorker } from "@/components/pwa/PwaServiceWorker";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#166534",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          {children}
          <PwaServiceWorker />
          <InstallPwaPrompt />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#0f172a",
                color: "#fff",
                borderRadius: "999px",
                padding: "10px 18px",
                fontSize: "0.875rem",
              },
              success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
              error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
