
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import VerificationForm from "@/components/verification/VerificationForm";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authorization";


export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
};

async function VerificationDetails({
  orderId,
}: {
  orderId: string;
}) {
  try {
    await requireRole(["cutting_verifier"]);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    if (error instanceof AuthorizationError) {
      return (
        <p role="alert" className="rounded-xl bg-red-50 p-6 text-red-700">
          Access denied. Cutting Verifier role required.
        </p>
      );
    }

    throw error;
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      targetQty: true,
      status: true,
      recipe: {
        select: {
          name: true,
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
            },
          },
        },
      },
    },
  });

  if (!order) {
    return (
      <p className="rounded-xl bg-white p-6 text-slate-700">
        Cutting order not found.
      </p>
    );
  }

  if (order.status !== "PENDING_VERIFICATION") {
    return (
      <p className="rounded-xl bg-white p-6 text-slate-700">
        This cutting order is no longer pending verification.
      </p>
    );
  }

  return (
    <VerificationForm
      key={JSON.stringify(
        order.verificationItems.map((item) => [
          item.id,
          item.actualQty,
        ])
      )}
      orderId={order.id}
      orderNo={order.orderNo}
      recipeName={order.recipe.name}
      targetQty={order.targetQty}
      items={order.verificationItems}
    />
  );
}

export default async function VerificationDetailPage({
  params,
}: Props) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/verification"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Pending Orders
        </Link>

        <header className="my-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Component Verification
          </h1>

          <p className="mt-2 text-slate-600">
            Record actual cut-piece quantities and make a decision.
          </p>
        </header>

        <Suspense
          fallback={
            <p className="rounded-xl bg-white p-6 text-slate-600">
              Loading verification details...
            </p>
          }
        >
          <VerificationDetails orderId={id} />
        </Suspense>
      </div>
    </main>
  );
}
