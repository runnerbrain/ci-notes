import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user }) {
      const allowedEnv = process.env.ALLOWED_EMAILS || process.env.ALLOWED_EMAIL;
      
      if (!allowedEnv) {
        console.error('ALLOWED_EMAILS environment variable is not configured.');
        return false;
      }
      
      const allowedEmails = allowedEnv
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      
      if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
        return true;
      }
      
      console.warn(`Access denied for: ${user.email} (not in ALLOWED_EMAILS)`);
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/', // Redirect back to homepage on sign-in errors
  },
};
