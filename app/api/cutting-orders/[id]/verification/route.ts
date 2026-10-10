
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    await requireRole(["cutting_verifier"]);

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid cutting order ID" },
        { status: 400 }
      );
    }

    const order = await prisma.cuttingOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNo: true,
        targetQty: true,
        actualFabricYds: true,
        status: true,
        recipe: {
          select: {
            recipeCode: true,
            name: true,
            stdFabricYards: true,
            wastageCap: true,
          },
        },
        verificationItems: {
          select: {
            id: true,
            expectedQty: true,
            actualQty: true,
            status: true,
            component: {
              select: {
                componentName: true,
                piecesPerGarment: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Cutting order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING_VERIFICATION") {
      return NextResponse.json(
        { error: "Order is not pending verification" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      order: {
        ...order,
        actualFabricYds: order.actualFabricYds.toString(),
        recipe: {
          ...order.recipe,
          stdFabricYards:
            order.recipe.stdFabricYards.toString(),
          wastageCap: order.recipe.wastageCap.toString(),
        },
      },
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
      "Verification items lookup failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const updateComponentSchema = z.object({
  itemId: z.string().min(1),
  actualQty: z.number().int().min(0).max(2147483647),
}).strict();

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    await requireRole(["cutting_verifier"]);

    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Invalid cutting order ID" },
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

    const parsed = updateComponentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid component quantity",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { itemId, actualQty } = parsed.data;

    
const result = await prisma.$transaction(async (tx) => {
  // Lock the parent order before reading or updating
  // verification items. Approval uses the same lock.
  const lockedOrders = await tx.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM public.cutting_orders
    WHERE id = ${orderId}
    FOR UPDATE
  `;

  if (lockedOrders.length === 0) {
    return {
      error: "Order not found",
      statusCode: 404,
    };
  }

  // Read the status after acquiring the lock.
  const order = await tx.cuttingOrder.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

      if (!order) {
        return { error: "Order not found", statusCode: 404 };
      }

      if (order.status !== "PENDING_VERIFICATION") {
        return {
          error: "Order is not pending verification",
          statusCode: 409,
        };
      }

      // Find the component belonging to this order.
      const item = await tx.verificationItem.findFirst({
        where: {
          id: itemId,
          orderId,
        },
        select: {
          id: true,
          expectedQty: true,
        },
      });

      if (!item) {
        return {
          error: "Verification item not found",
          statusCode: 404,
        };
      }

      const status =
        actualQty < item.expectedQty
          ? "RED"
          : actualQty > item.expectedQty
            ? "YELLOW"
            : "GREEN";

      const updated = await tx.verificationItem.update({
        where: { id: item.id },
        data: {
          actualQty,
          status,
        },
        select: {
          id: true,
          expectedQty: true,
          actualQty: true,
          status: true,
        },
      });

      return { item: updated };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      message: "Component quantity recorded",
      item: result.item,
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
      "Component update failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
