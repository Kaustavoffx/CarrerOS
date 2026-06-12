import type { Metadata, Viewport } from "next";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { AppAtmosphere } from "@/components/app-atmosphere";
import { CareerOSBackground } from "@/components/careeros-background";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { RouteTransitionProvider } from "@/components/route-transition-provider";
import { BootSequence } from "@/components/boot-sequence";
import { geom } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS | Private Career Workspace",
  description: "A Supabase-backed career workspace with auth, onboarding, persistent roadmaps, and a premium dashboard experience.",
  metadataBase: new URL("https://careeros.local"),
  icons: {
    icon: "/icons/favicon-32.png",
    shortcut: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="careeros-dark scroll-smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('careeros-theme') || 'careeros-dark';
                document.documentElement.className = theme + ' scroll-smooth';
              })();
            `,
          }}
        />
      </head>
      <body className={`${geom.variable} text-white antialiased`}>
        <ThemeProvider>
          <CareerOSBackground />
          <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
              <AuthProvider>
                <RouteTransitionProvider>
                  <AppAtmosphere />
                  <BootSequence>
                    {children}
                  </BootSequence>
                </RouteTransitionProvider>
              </AuthProvider>
            </LazyMotion>
          </MotionConfig>
        </ThemeProvider>
      </body>
    </html>
  );
}