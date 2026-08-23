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
                <div className="gate-header">
                  <div className="logo-badge">CI</div>
                  <h1>CI Notes</h1>
                  <p>Restricted Workspace</p>
                </div>
                <div className="gate-body">
                  <p className="gate-warning">
                    This application is private. Access is limited strictly to the designated email address. Attempting to log in with an unauthorized Google account will be rejected.
                  </p>
                  <SignInButton />
                </div>
                <div className="gate-footer">
                  <p>© 2026 CI Notes. Secure Auth Gate.</p>
                </div>
              </div>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
