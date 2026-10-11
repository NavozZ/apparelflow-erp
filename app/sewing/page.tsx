
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import StartSewingButton from "@/components/sewing/StartSewingButton";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";

async function SewingQueueContent() {
  try {
    await requireRole(["sewing_supervisor"]);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    if (error instanceof AuthorizationError) {
      return (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-6 text-red-700"
        >
          Access denied. Sewing Supervisor role required.
        </p>
      );
    }

    throw error;
  }

  const orders = await prisma.cuttingOrder.findMany({
    where: {
      status: "VERIFIED",
      verificationLogs: {
        some: {
          decision: "APPROVED",
        },
      },
    },
    select: {
      id: true,
      orderNo: true,
      targetQty: true,
      fabricRollId: true,
      updatedAt: true,
      recipe: {
        select: {
          name: true,
          recipeCode: true,
        },
      },
      verificationLogs: {
        where: {
          decision: "APPROVED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          wastagePct: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No Verified Batches in Queue
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Batches appear here after Cutting Verification approval.
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const approval = order.verificationLogs[0];

          return (
            <div
              key={order.id}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {order.recipe.name}
                  </h2>

                  <p className="break-all text-xs text-slate-500">
                    {order.orderNo}
                  </p>

                  <p className="text-sm text-slate-700">
                    Recipe: {order.recipe.recipeCode}
                  </p>

                  <p className="text-sm text-slate-700">
                    Target Quantity: {order.targetQty} garments
                  </p>

                  <p className="text-sm text-slate-700">
                    Fabric Roll: {order.fabricRollId}
                  </p>

                  <p className="text-sm text-slate-700">
                    Wastage:{" "}
                    {approval?.wastagePct?.toString() ?? "N/A"}%
                  </p>

                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    VERIFIED
                  </span>
                </div>

                <StartSewingButton orderId={order.id} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function SewingPage() {
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
            Sewing Queue
          </h1>

          <p className="mt-2 text-slate-600">
            Manage approved cutting batches ready for sewing.
          </p>
        </header>

        <Suspense
          fallback={
            <div
              role="status"
              className="rounded-xl bg-white p-8 text-slate-600"
            >
              Loading verified cutting batches...
            </div>
          }
        >
          <SewingQueueContent />
        </Suspense>
      </div>
    </main>
  );
}
