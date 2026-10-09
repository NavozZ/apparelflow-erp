import StatCard from "@/components/dashboard/StatCard";
import OrdersTable, {
  type CuttingOrder,
} from "@/components/dashboard/OrdersTable";

type DashboardStat = {
  title: string;
  value: number;
  color: string;
};

const stats: DashboardStat[] = [
  {
    title: "Total Batches",
    value: 24,
    color: "text-blue-600",
  },
  {
    title: "Pending Verification",
    value: 8,
    color: "text-amber-600",
  },
  {
    title: "Verified Batches",
    value: 13,
    color: "text-green-600",
  },
  {
    title: "Rejected Batches",
    value: 3,
    color: "text-red-600",
  },
];

const orders: CuttingOrder[] = [
  {
    id: "CUT-001",
    recipe: "Casual Blouse",
    quantity: 50,
    status: "PENDING_VERIFICATION",
  },
  {
    id: "CUT-002",
    recipe: "Crop Top",
    quantity: 100,
    status: "VERIFIED",
  },
  {
    id: "CUT-003",
    recipe: "Casual Blouse",
    quantity: 75,
    status: "REJECTED",
  },
];

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
            UI Prototype — Sample Data
          </p>
        </header>
      
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

      </div>
    </main>
  );
}
