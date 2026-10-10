
import { NextResponse } from "next/server";
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

class ApprovalBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalBlockedError";
  }
}

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const verifier = await requireRole(["cutting_verifier"]);
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid cutting order ID" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock this order while checking and approving it.
        // Competing approval requests cannot bypass the checks.
        const lockedRows = await tx.$queryRaw<
          { id: string }[]
        >`
          SELECT id
          FROM public.cutting_orders
          WHERE id = ${orderId}
          FOR UPDATE
        `;

        if (lockedRows.length === 0) {
          throw new ApprovalBlockedError(
            "Cutting order not found"
          );
        }

        const order = await tx.cuttingOrder.findUnique({
          where: { id: orderId },
          include: {
            recipe: true,
            verificationItems: {
              include: {
                component: true,
              },
            },
          },
        });

        if (!order || order.status !== "PENDING_VERIFICATION") {
          throw new ApprovalBlockedError(
            "Order is not pending verification"
          );
        }

        if (order.verificationItems.length === 0) {
          throw new ApprovalBlockedError(
            "No verification components found"
          );
        }

        const incomplete = order.verificationItems.some(
          (item) => item.actualQty === null
        );

        if (incomplete) {
          throw new ApprovalBlockedError(
            "All component quantities must be recorded"
          );
        }

        const shortages = order.verificationItems.filter(
          (item) =>
            item.actualQty === null ||
            item.actualQty < item.expectedQty
        );

        if (shortages.length > 0) {
          throw new ApprovalBlockedError(
            "Approval blocked: one or more components have shortages"
          );
        }

        const standardFabric = new Prisma.Decimal(
          order.recipe.stdFabricYards
        ).mul(order.targetQty);

        if (standardFabric.lte(0)) {
          throw new ApprovalBlockedError(
            "Invalid standard fabric quantity"
          );
        }

        const wastagePct = new Prisma.Decimal(
          order.actualFabricYds
        )
          .minus(standardFabric)
          .div(standardFabric)
          .mul(100);

        if (wastagePct.gt(order.recipe.wastageCap)) {
          throw new ApprovalBlockedError(
            "Approval blocked: fabric wastage exceeds recipe cap"
          );
        }

        const variances = order.verificationItems.map(
          (item) => ({
            componentId: item.componentId,
            componentName: item.component.componentName,
            expectedQty: item.expectedQty,
            actualQty: item.actualQty,
            variance: item.actualQty! - item.expectedQty,
            status: item.status,
          })
        );

        // Record approval decision and status change atomically.
        const log = await tx.verificationLog.create({
          data: {
            orderId,
            verifierId: verifier.id,
            decision: "APPROVED",
            wastagePct: wastagePct.toDecimalPlaces(2),
            countVariances: variances,
          },
        });

        const updated = await tx.cuttingOrder.update({
          where: { id: orderId },
          data: {
            status: "VERIFIED",
          },
          select: {
            id: true,
            orderNo: true,
            status: true,
          },
        });

        return {
          order: updated,
          logId: log.id,
          wastagePct: wastagePct.toDecimalPlaces(2).toString(),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return NextResponse.json({
      message: "Cutting order approved successfully",
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

    if (error instanceof ApprovalBlockedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error(
      "Cutting order approval failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
