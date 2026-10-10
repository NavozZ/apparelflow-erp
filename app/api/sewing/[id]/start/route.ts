
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
    await requireRole(["sewing_supervisor"]);

    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid cutting order ID" },
        { status: 400 }
      );
    }

    // Atomic conditional update:
    // only a VERIFIED batch can enter sewing.
    const result = await prisma.cuttingOrder.updateMany({
      where: {
        id: orderId,
        status: "VERIFIED",
        verificationLogs: {
          some: {
            decision: "APPROVED",
          },
        },
      },
      data: {
        status: "SEWING_IN_PROGRESS",
      },
    });

    if (result.count !== 1) {
      return NextResponse.json(
        {
          error:
            "Order is not verified, has no approval record, or sewing has already started",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Sewing started successfully",
      orderId,
      status: "SEWING_IN_PROGRESS",
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
      "Start sewing failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
