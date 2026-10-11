
import SubmitForVerificationButton from "@/components/cutting/SubmitForVerificationButton";

export type CuttingOrder = {
  id: string;
  orderNo: string;
  recipe: string;
  quantity: number;
  createdBy: string;
  status:
    | "CUTTING_IN_PROGRESS"
    | "PENDING_VERIFICATION"
    | "VERIFIED"
    | "REJECTED"
    | "SEWING_IN_PROGRESS";
};

type OrdersTableProps = {
  orders: CuttingOrder[];
  currentUserId: string;
  currentUserRole: string;
};

const statusColors: Record<CuttingOrder["status"], string> = {
  CUTTING_IN_PROGRESS: "bg-slate-100 text-slate-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-900",
  VERIFIED: "bg-green-100 text-green-900",
  REJECTED: "bg-red-100 text-red-900",
  SEWING_IN_PROGRESS: "bg-blue-100 text-blue-900",
};

export default function OrdersTable({
  orders,
  currentUserId,
  currentUserRole,
}: OrdersTableProps) {
  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-slate-900">
        Recent Cutting Orders
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-sm text-slate-600">
              <th className="p-3">Order Number</th>
              <th className="p-3">Recipe</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => {
              const canSubmit =
                currentUserRole === "cutting_supervisor" &&
                currentUserId === order.createdBy &&
                order.status === "CUTTING_IN_PROGRESS";

              return (
                <tr
                  key={order.id}
                  className="border-b border-slate-100"
                >
                  <td className="p-3 text-sm text-slate-900">
                    {order.orderNo}
                  </td>

                  <td className="p-3 text-sm text-slate-700">
                    {order.recipe}
                  </td>

                  <td className="p-3 text-sm text-slate-700">
                    {order.quantity}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status]}`}
                    >
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="p-3">
                    {canSubmit ? (
                      <SubmitForVerificationButton
                        orderId={order.id}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <p className="py-6 text-center text-slate-500">
            No cutting orders found.
          </p>
        )}
      </div>
    </section>
  );
}
