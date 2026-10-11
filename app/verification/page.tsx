
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

async function PendingOrdersContent() {
  try {
    await requireRole(["cutting_verifier"]);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    if (error instanceof AuthorizationError) {
      return (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-6 text-red-700"
        >
          Access denied. Cutting Verifier role required.
        </div>
      );
    }

    throw error;
  }

  const orders = await prisma.cuttingOrder.findMany({
    where: {
      status: "PENDING_VERIFICATION",
    },
    include: {
      recipe: {
        select: {
          recipeCode: true,
          name: true,
        },
      },
      verificationItems: {
        select: {
          actualQty: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No Pending Orders
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            All submitted cutting orders have been processed.
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const recorded = order.verificationItems.filter(
            (item) => item.actualQty !== null
          ).length;

          const hasShortage = order.verificationItems.some(
            (item) => item.status === "RED"
          );

          return (
            <div
              key={order.id}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {order.recipe.name}
                  </h2>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    {order.orderNo}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Quantity: {order.targetQty} garments
                  </p>

                  <p className="text-sm text-slate-600">
                    Fabric Roll: {order.fabricRollId}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Components Recorded: {recorded}/
                    {order.verificationItems.length}
                  </p>

                  {hasShortage && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      Component shortage detected
                    </p>
                  )}
                </div>

                <Link
                  href={`/verification/${order.id}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Verify Components
                </Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <header className="my-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Cutting Verification
          </h1>

          <p className="mt-2 text-slate-600">
            Review pending cutting orders and component counts.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-xl bg-white p-8 text-slate-600">
              Loading pending cutting orders...
            </div>
          }
        >
          <PendingOrdersContent />
        </Suspense>
      </div>
    </main>
  );
}
