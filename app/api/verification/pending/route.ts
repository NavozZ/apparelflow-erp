
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

export async function GET() {
  try {
    await requireRole(["cutting_verifier"]);

    const orders = await prisma.cuttingOrder.findMany({
      where: {
        status: "PENDING_VERIFICATION",
      },
      select: {
        id: true,
        orderNo: true,
        targetQty: true,
        fabricRollId: true,
        createdAt: true,
        recipe: {
          select: {
            recipeCode: true,
            name: true,
          },
        },
        verificationItems: {
          select: {
            id: true,
            actualQty: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      total: orders.length,
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        targetQty: order.targetQty,
        fabricRollId: order.fabricRollId,
        createdAt: order.createdAt,
        recipe: order.recipe,
        totalComponents: order.verificationItems.length,
        recordedComponents: order.verificationItems.filter(
          (item) => item.actualQty !== null
        ).length,
        hasShortage: order.verificationItems.some(
          (item) => item.status === "RED"
        ),
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
      "Pending verification lookup failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
