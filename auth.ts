
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        // Step 1: Validate input types
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }

        // Step 2: Normalize email
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        if (!email || !password) {
          return null;
        }

        // Step 3: Find user in PostgreSQL
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            passwordHash: true,
          },
        });

        if (!user) {
          return null;
        }

        // Step 4: Verify Argon2id password hash
        const isValidPassword = await verifyPassword(
          user.passwordHash,
          password
        );

        if (!isValidPassword) {
          return null;
        }

        // Step 5: Return safe user information
        
        return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
       };
      },
    }),
  ],


callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.userId = user.id;
      token.role = user.role;
    }

    return token;
  },

  async session({ session, token }) {
    if (
      typeof token.userId === "string" &&
      (
        token.role === "cutting_supervisor" ||
        token.role === "cutting_verifier" ||
        token.role === "sewing_supervisor"
      )
    ) {
      session.user.id = token.userId;
      session.user.role = token.role;
    }

    return session;
  },
},



  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },

  pages: {
    signIn: "/login",
  },
});
