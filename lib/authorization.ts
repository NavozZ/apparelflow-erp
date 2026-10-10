
import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import type { UserRole } from "@/generated/prisma/client";

export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions");
    this.name = "AuthorizationError";
  }
}

export async function requireUser() {
  const session = await auth();

  if (
    !session?.user?.id ||
    !session.user.email ||
    !session.user.role
  ) {
    throw new AuthenticationError();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (
    !user ||
    user.email !== session.user.email ||
    user.role !== session.user.role
  ) {
    throw new AuthenticationError();
  }

  return user;
}

export async function requireRole(
  allowedRoles: UserRole[]
) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError();
  }

  return user;
}
