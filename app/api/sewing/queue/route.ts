
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

export async function GET() {

  await connection();
  try {
    // Only Sewing Supervisors may access this queue.
    await requireRole(["sewing_supervisor"]);

    const orders = await prisma.cuttingOrder.findMany({
      where: {
        status: "VERIFIED",
      },
      select: {
        id: true,
        orderNo: true,
        targetQty: true,
        fabricRollId: true,
        status: true,
        updatedAt: true,
        recipe: {
          select: {
            recipeCode: true,
            name: true,
          },
        },
        verificationLogs: {
          where: {
            decision: "APPROVED",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
            wastagePct: true,
            verifier: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    return NextResponse.json({
      total: orders.length,
      orders: orders.map((order) => ({
        ...order,
        verificationLogs: order.verificationLogs.map((log) => ({
          ...log,
          wastagePct: log.wastagePct?.toString() ?? null,
        })),
      })),
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
      "Sewing queue lookup failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
