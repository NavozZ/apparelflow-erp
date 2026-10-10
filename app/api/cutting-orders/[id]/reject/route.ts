
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const rejectionSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
}).strict();

class RejectionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectionBlockedError";
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const verifier = await requireRole(["cutting_verifier"]);
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request" },
        { status: 400 }
      );
    }

    const parsed = rejectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Rejection reason must contain 5–1000 characters" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock order before checking its status.
        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM public.cutting_orders
          WHERE id = ${orderId}
          FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new RejectionBlockedError("Order not found");
        }

        const order = await tx.cuttingOrder.findUnique({
          where: { id: orderId },
          include: {
            verificationItems: {
              include: {
                component: true,
              },
            },
            recipe: true,
          },
        });

        if (!order || order.status !== "PENDING_VERIFICATION") {
          throw new RejectionBlockedError(
            "Only pending orders can be rejected"
          );
        }

        const variances = order.verificationItems.map(
          (item) => ({
            componentId: item.componentId,
            componentName: item.component.componentName,
            expectedQty: item.expectedQty,
            actualQty: item.actualQty,
            variance:
              item.actualQty === null
                ? null
                : item.actualQty - item.expectedQty,
            status: item.status,
          })
        );

        const standardFabric = new Prisma.Decimal(
          order.recipe.stdFabricYards
        ).mul(order.targetQty);

        const wastagePct = standardFabric.gt(0)
          ? new Prisma.Decimal(order.actualFabricYds)
              .minus(standardFabric)
              .div(standardFabric)
              .mul(100)
              .toDecimalPlaces(2)
          : null;

        const log = await tx.verificationLog.create({
          data: {
            orderId,
            verifierId: verifier.id,
            decision: "REJECTED",
            rejectionNote: parsed.data.reason,
            wastagePct,
            countVariances: variances,
          },
          select: {
            id: true,
          },
        });

        const updatedOrder = await tx.cuttingOrder.update({
          where: { id: orderId },
          data: {
            status: "REJECTED",
          },
          select: {
            id: true,
            orderNo: true,
            status: true,
          },
        });

        return {
          order: updatedOrder,
          logId: log.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return NextResponse.json({
      message: "Cutting order rejected",
      reason: parsed.data.reason,
      ...result,
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

    if (error instanceof RejectionBlockedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error(
      "Order rejection failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
