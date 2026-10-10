
import { Suspense } from "react";

import StatCard from "@/components/dashboard/StatCard";
import OrdersTable, {
  type CuttingOrder,
} from "@/components/dashboard/OrdersTable";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  requireUser,
  AuthenticationError,
} from "@/lib/authorization";

// Dynamic Server Component

async function DashboardContent() {
  // Verify the user's session on the server.
  
try {
  await requireUser();
} catch (error) {
  if (error instanceof AuthenticationError) {
    redirect("/login");
  }

  throw error;
}


  // Existing Prisma queries continue below.
  const [
    totalBatches,
    pendingBatches,
    verifiedBatches,
    rejectedBatches,
    databaseOrders,
  ] = await Promise.all([
    prisma.cuttingOrder.count(),

    prisma.cuttingOrder.count({
      where: { status: "PENDING_VERIFICATION" },
    }),

    prisma.cuttingOrder.count({
      where: { status: "VERIFIED" },
    }),

    prisma.cuttingOrder.count({
      where: { status: "REJECTED" },
    }),

    prisma.cuttingOrder.findMany({
      include: {
        recipe: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
  ]);

  const stats = [
    {
      title: "Total Batches",
      value: totalBatches,
      color: "text-blue-600",
    },
    {
      title: "Pending Verification",
      value: pendingBatches,
      color: "text-amber-600",
    },
    {
      title: "Verified Batches",
      value: verifiedBatches,
      color: "text-green-600",
    },
    {
      title: "Rejected Batches",
      value: rejectedBatches,
      color: "text-red-600",
    },
  ];

  const orders: CuttingOrder[] = databaseOrders.map(
    (order) => ({
      id: order.orderNo,
      recipe: order.recipe.name,
      quantity: order.targetQty,
      status: order.status,
    })
  );

  return (
    <>
      <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            color={stat.color}
          />
        ))}
      </section>

      <OrdersTable orders={orders} />
    </>
  );
}

// Static page shell
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">
            ApparelFlow ERP
          </h1>

          <p className="mt-2 text-slate-600">
            Production Operations Dashboard
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Database-Driven Dashboard
          </p>
        </header>

        <Suspense
          fallback={
            <div
              role="status"
              className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600"
            >
              Loading production dashboard...
            </div>
          }
        >
          <DashboardContent />
        </Suspense>

      </div>
    </main>
  );
}
