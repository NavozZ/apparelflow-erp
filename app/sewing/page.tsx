
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
  // Only the Sewing Supervisor can access this page.
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

  // Only approved and verified orders can enter the queue.
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

      // Component-level verification information.
      verificationItems: {
        select: {
          id: true,
          expectedQty: true,
          actualQty: true,
          status: true,
          component: {
            select: {
              componentName: true,
            },
          },
        },
      },

      // Approval audit details.
      verificationLogs: {
        where: {
          decision: "APPROVED",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          wastagePct: true,
          createdAt: true,
          countVariances: true,
          verifier: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  return (
    <div className="space-y-5">
      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No Verified Batches in Queue
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Batches appear here only after approval by an
            authorized Cutting Verifier.
          </p>
        </div>
      ) : (
        orders.map((order) => {
          const approval = order.verificationLogs[0];

          return (
            <article
              key={order.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {order.recipe.name}
                  </h2>

                  <p className="break-all text-xs text-slate-500">
                    Order: {order.orderNo}
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

                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    VERIFIED
                  </span>
                </div>

                <StartSewingButton orderId={order.id} />
              </div>

              {/* Verification audit information */}
              <section
                aria-label="Verification audit details"
                className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  Verification Audit
                </h3>

                <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium text-slate-600">
                      Verified By
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {approval?.verifier.fullName ??
                        "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-slate-600">
                      Verification Time
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {approval?.createdAt
                        ? new Date(
                            approval.createdAt
                          ).toLocaleString("en-GB", {
                            timeZone: "UTC",
                          })
                        : "Not available"}
                      {approval?.createdAt ? " UTC" : ""}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-slate-600">
                      Fabric Wastage
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-900">
                      {approval?.wastagePct?.toString() ??
                        "N/A"}
                      %
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Verified garment components */}
              <section
                aria-label="Verified component counts"
                className="mt-6"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  Verified Component Counts
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Expected and actual quantities recorded
                  during cutting quality control.
                </p>

                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-115 text-left text-sm">
                    <thead className="bg-slate-100 text-slate-800">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          Component
                        </th>

                        <th scope="col" className="px-4 py-3">
                          Expected
                        </th>

                        <th scope="col" className="px-4 py-3">
                          Actual
                        </th>

                        <th scope="col" className="px-4 py-3">
                          Variance
                        </th>

                        <th scope="col" className="px-4 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {order.verificationItems.map((item) => {
                        const variance =
                          item.actualQty === null
                            ? null
                            : item.actualQty -
                              item.expectedQty;

                        const statusStyles =
                          item.status === "GREEN"
                            ? "bg-green-100 text-green-800"
                            : item.status === "YELLOW"
                              ? "bg-amber-100 text-amber-900"
                              : item.status === "RED"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700";

                        return (
                          <tr
                            key={item.id}
                            className="border-t border-slate-200 text-slate-800"
                          >
                            <td className="px-4 py-3 font-medium">
                              {
                                item.component
                                  .componentName
                              }
                            </td>

                            <td className="px-4 py-3">
                              {item.expectedQty}
                            </td>

                            <td className="px-4 py-3">
                              {item.actualQty ?? "—"}
                            </td>

                            <td className="px-4 py-3">
                              {variance === null
                                ? "—"
                                : variance > 0
                                  ? `+${variance}`
                                  : variance}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles}`}
                              >
                                {item.status ?? "PENDING"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </article>
          );
        })
      )}
    </div>
  );
}

export default function SewingPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <header className="my-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Sewing Queue
          </h1>

          <p className="mt-2 text-slate-600">
            Review verified cutting batches, component
            inspection results, and approval audit details
            before starting sewing assembly.
          </p>
        </header>

        <Suspense
          fallback={
            <div
              role="status"
              className="rounded-xl bg-white p-8 text-slate-700"
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
