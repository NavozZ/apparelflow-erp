
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";



export async function GET() {
  try {
    const recipeCount = await prisma.recipe.count();

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      recipeCount,
    });
  } catch (error) {
    console.error(
      "Database health check failed",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
