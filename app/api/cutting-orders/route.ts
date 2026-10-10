
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

const createOrderSchema = z.object({
  recipeId: z.string().min(1),
  targetQty: z.number().int().positive().max(100000),
  fabricRollId: z.string().trim().min(1).max(100),
  actualFabricYds: z.number().finite().nonnegative(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication and server-side RBAC
    const user = await requireRole(["cutting_supervisor"]);

    // 2. Parse and validate incoming JSON
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request" },
        { status: 400 }
      );
    }

    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid order details",
          issues: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      recipeId,
      targetQty,
      fabricRollId,
      actualFabricYds,
    } = parsed.data;

    // 3. Load the trusted recipe and its components
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { components: true },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    if (recipe.components.length === 0) {
      return NextResponse.json(
        { error: "Recipe has no components" },
        { status: 422 }
      );
    }

    // 4. Calculate required component quantities
    const verificationItems = recipe.components.map(
      (component) => ({
        componentId: component.id,
        expectedQty: targetQty * component.piecesPerGarment,
      })
    );

    if (
      verificationItems.some(
        (item) => !Number.isSafeInteger(item.expectedQty)
      )
    ) {
      return NextResponse.json(
        { error: "Calculated component quantity is too large" },
        { status: 422 }
      );
    }

    // 5. Save order and verification items atomically
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.cuttingOrder.create({
        data: {
          orderNo: `CO-${crypto.randomUUID()}`,
          recipeId,
          targetQty,
          fabricRollId,
          actualFabricYds: actualFabricYds.toString(),
          createdBy: user.id,
          status: "CUTTING_IN_PROGRESS",
          verificationItems: {
            create: verificationItems,
          },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          targetQty: true,
          createdAt: true,
        },
      });

      return createdOrder;
    });

    return NextResponse.json(
      { message: "Cutting order created", order },
      { status: 201 }
    );

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
      "Cutting order creation failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
