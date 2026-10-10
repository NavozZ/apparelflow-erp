
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

export async function GET() {
  try {
    // Only cutting supervisors can load recipes
    // for the order creation form.
    await requireRole(["cutting_supervisor"]);

    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        recipeCode: true,
        name: true,
        category: true,
        stdFabricYards: true,
        wastageCap: true,
      },
      orderBy: {
        recipeCode: "asc",
      },
    });

    return NextResponse.json({
      recipes: recipes.map((recipe) => ({
        id: recipe.id,
        recipeCode: recipe.recipeCode,
        name: recipe.name,
        category: recipe.category,
        stdFabricYards: recipe.stdFabricYards.toString(),
        wastageCap: recipe.wastageCap.toString(),
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
      "Recipe lookup failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
