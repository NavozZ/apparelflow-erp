
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const user = await requireRole(["cutting_supervisor"]);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid cutting order ID" },
        { status: 400 }
      );
    }

    // Conditional update prevents invalid status transitions.
    const result = await prisma.cuttingOrder.updateMany({
      where: {
        id,
        createdBy: user.id,
        status: "CUTTING_IN_PROGRESS",
        verificationItems: {
          some: {},
        },
      },
      data: {
        status: "PENDING_VERIFICATION",
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          error:
            "Order not found, not owned by you, or cannot be submitted",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Cutting order submitted for verification",
      orderId: id,
      status: "PENDING_VERIFICATION",
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    console.error(
      "Submit for verification failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
