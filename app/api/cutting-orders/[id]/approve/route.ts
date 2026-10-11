
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
  constructor(
    message: string,
    public readonly statusCode: 404 | 409 | 422 = 409
  ) {
    super(message);
    this.name = "ApprovalBlockedError";
  }
}

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    // Only Cutting Verifiers can approve orders.
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
        // Lock the parent cutting order.
        // Component PATCH and rejection transactions
        // also use this lock.
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
            "Cutting order not found",
            404
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

        // Only pending orders can be approved.
        if (!order || order.status !== "PENDING_VERIFICATION") {
          throw new ApprovalBlockedError(
            "Order is not pending verification",
            409
          );
        }

        // Prevent approval when the order has no components.
        if (order.verificationItems.length === 0) {
          throw new ApprovalBlockedError(
            "No verification components found",
            422
          );
        }

        // Every component must have a recorded actual count.
        const incomplete = order.verificationItems.some(
          (item) => item.actualQty === null
        );

        if (incomplete) {
          throw new ApprovalBlockedError(
            "All component quantities must be recorded",
            422
          );
        }

        // A single shortage must block approval.
        const shortages = order.verificationItems.filter(
          (item) =>
            item.actualQty === null ||
            item.actualQty < item.expectedQty
        );

        if (shortages.length > 0) {
          throw new ApprovalBlockedError(
            "Approval blocked: one or more components have shortages",
            422
          );
        }

        // Calculate the fabric requirement with Prisma Decimal
        // to avoid floating-point precision problems.
        const standardFabric = new Prisma.Decimal(
          order.recipe.stdFabricYards
        ).mul(order.targetQty);

        if (standardFabric.lte(0)) {
          throw new ApprovalBlockedError(
            "Invalid standard fabric quantity",
            422
          );
        }

        const wastagePct = new Prisma.Decimal(
          order.actualFabricYds
        )
          .minus(standardFabric)
          .div(standardFabric)
          .mul(100);

        // Block approval if the recipe's wastage cap is exceeded.
        if (wastagePct.gt(order.recipe.wastageCap)) {
          throw new ApprovalBlockedError(
            "Approval blocked: fabric wastage exceeds recipe cap",
            422
          );
        }

        // Capture the verified component counts and variances.
        const variances = order.verificationItems.map(
          (item) => ({
            componentId: item.componentId,
            componentName: item.component.componentName,
            expectedQty: item.expectedQty,
            actualQty: item.actualQty,
            variance:
              (item.actualQty ?? 0) - item.expectedQty,
            status: item.status,
          })
        );

        // Audit log and status transition occur within
        // the same transaction.
        const log = await tx.verificationLog.create({
          data: {
            orderId,
            verifierId: verifier.id,
            decision: "APPROVED",
            wastagePct: wastagePct.toDecimalPlaces(2),
            countVariances: variances,
          },
        });

        const updatedOrder = await tx.cuttingOrder.update({
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
          order: updatedOrder,
          logId: log.id,
          wastagePct: wastagePct
            .toDecimalPlaces(2)
            .toString(),
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.ReadCommitted,
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
        { status: error.statusCode }
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
