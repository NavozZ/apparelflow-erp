
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import StatCard from "@/components/dashboard/StatCard";
import OrdersTable, {
  type CuttingOrder,
} from "@/components/dashboard/OrdersTable";

import { prisma } from "@/lib/prisma";
import {
  requireUser,
  AuthenticationError,
} from "@/lib/authorization";

// Dynamic dashboard content: authentication + database queries
async function DashboardContent() {
  let currentUser: Awaited<ReturnType<typeof requireUser>>;

  try {
    currentUser = await requireUser();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      redirect("/login");
    }

    throw error;
  }

  // Fetch live statistics and recent orders from PostgreSQL
  const [
    totalBatches,
    pendingBatches,
    verifiedBatches,
    rejectedBatches,
    databaseOrders,
  ] = await Promise.all([
    prisma.cuttingOrder.count(),

    prisma.cuttingOrder.count({
      where: {
        status: "PENDING_VERIFICATION",
      },
    }),

    prisma.cuttingOrder.count({
      where: {
        status: "VERIFIED",
      },
    }),

    prisma.cuttingOrder.count({
      where: {
        status: "REJECTED",
      },
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

  // Keep the database ID separate from the visible order number.
  // Submit API requires the actual database ID.
  const orders: CuttingOrder[] = databaseOrders.map(
    (order) => ({
      id: order.id,
      orderNo: order.orderNo,
      recipe: order.recipe.name,
      quantity: order.targetQty,
      createdBy: order.createdBy,
      status: order.status,
    })
  );

  return (
    <>
      {/* Role-based navigation */}
      <nav className="mb-8 flex flex-wrap gap-3">
        {currentUser.role === "cutting_supervisor" && (
          <Link
            href="/cutting-orders/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Cutting Order
          </Link>
        )}

        {currentUser.role === "cutting_verifier" && (
          <Link
            href="/verification"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Pending Verifications
          </Link>
        )}

        {currentUser.role === "sewing_supervisor" && (
          <Link
            href="/sewing"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sewing Queue
          </Link>
        )}
      </nav>

      {/* Dashboard statistics */}
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

      {/* Recent cutting orders with role-based actions */}
      <OrdersTable
        orders={orders}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
      />
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
