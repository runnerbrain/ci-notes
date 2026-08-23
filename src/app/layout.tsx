import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import SignInButton from "@/components/SignInButton";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CI Notes - Protected Workspace",
  description: "Secure notes application restricted to authorized access.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} ${inter.className}`}>
        <Providers>
          {session ? (
            children
          ) : (
            <div className="gate-container">
              <div className="gate-card">
                <h1 className="gate-title">EI/HA notes</h1>
                <p className="gate-subtitle">Sign in to access your dashboard</p>
                <div className="gate-body">
                  <SignInButton />
                </div>
              </div>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
