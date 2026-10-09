
type StatCardProps = {
  title: string;
  value: number;
  color: string;
};

export default function StatCard({
  title,
  value,
  color,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-medium text-slate-600">
        {title}
      </h2>

      <p className={`mt-3 text-3xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}
