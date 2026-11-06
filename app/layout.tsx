import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/auth/auth-provider";
import { serializePublicConfig, serverPublicConfig } from "@/lib/public-env";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Speaky - AI Interview & English Communication Coach",
  description: "Master HR interviews, technical voice discussions, academic vivas, and conversational English fluency with real-time AI voice feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimeConfig = serializePublicConfig(serverPublicConfig());

  return (
    <html lang="en">
      <body className={inter.className}>
        <Script id="speakready-config" strategy="beforeInteractive">
          {`window.__SPEAKREADY__=${runtimeConfig}`}
        </Script>
        <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-muted-foreground">Loading Speaky...</p>}>
          <AuthProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            <Footer />
            <Toaster />
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
