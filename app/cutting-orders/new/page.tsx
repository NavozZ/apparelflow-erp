
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import CreateCuttingOrderForm from "@/components/cutting/CreateCuttingOrderForm";
import { prisma } from "@/lib/prisma";

import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

async function CuttingOrderContent() {
  // 1. Verify session and current database role
  try {
    await requireRole(["cutting_supervisor"]);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    if (error instanceof AuthorizationError) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"
        >
          Access denied. Only Cutting Supervisors can create
          cutting orders.
        </div>
      );
    }

    throw error;
  }

  // 2. Load trusted recipe data from PostgreSQL
  const databaseRecipes = await prisma.recipe.findMany({
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

  // 3. Convert Prisma Decimal values for the Client Component
  const recipes = databaseRecipes.map((recipe) => ({
    id: recipe.id,
    recipeCode: recipe.recipeCode,
    name: recipe.name,
    category: recipe.category,
    stdFabricYards: recipe.stdFabricYards.toString(),
    wastageCap: recipe.wastageCap.toString(),
  }));

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">
        New Cutting Order
      </h2>

      {recipes.length > 0 ? (
        <CreateCuttingOrderForm recipes={recipes} />
      ) : (
        <p className="text-slate-600">
          No garment recipes available.
        </p>
      )}
    </div>
  );
}

export default function NewCuttingOrderPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            ApparelFlow ERP
          </h1>

          <p className="mt-2 text-slate-600">
            Cutting Order Management
          </p>
        </header>

        <Suspense
          fallback={
            <div
              role="status"
              className="rounded-xl bg-white p-8 text-slate-600"
            >
              Loading cutting order form...
            </div>
          }
        >
          <CuttingOrderContent />
        </Suspense>
      </div>
    </main>
  );
}
