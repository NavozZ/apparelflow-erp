
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerificationItem = {
  id: string;
  expectedQty: number;
  actualQty: number | null;
  status: "GREEN" | "YELLOW" | "RED" | null;
  component: {
    componentName: string;
    piecesPerGarment: number;
  };
};

type Props = {
  orderId: string;
  orderNo: string;
  recipeName: string;
  targetQty: number;
  items: VerificationItem[];
};

export default function VerificationForm({
  orderId,
  orderNo,
  recipeName,
  targetQty,
  items,
}: Props) {
  const router = useRouter();

  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        item.actualQty === null ? "" : String(item.actualQty),
      ])
    )
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function saveComponent(item: VerificationItem) {
    const raw = quantities[item.id]?.trim() ?? "";
    const value = Number(raw);

    if (
      raw === "" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 2147483647
    ) {
      setError("Enter a valid non-negative whole number.");
      return;
    }

    setSaving(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/cutting-orders/${orderId}/verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            actualQty: value,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not save component.");
        return;
      }

      setSuccess(`${item.component.componentName} saved.`);
      router.refresh();
    } catch {
      setError("Network error while saving component.");
    } finally {
      setSaving(null);
    }
  }

  async function submitDecision(decision: "approve" | "reject") {
    if (processing || saving !== null) return;

    if (decision === "reject" && reason.trim().length < 5) {
      setError("Please provide a rejection reason (at least 5 characters).");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/cutting-orders/${orderId}/${decision}`,
        {
          method: "POST",
          ...(decision === "reject"
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason.trim() }),
              }
            : {}),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Could not process decision.");
        return;
      }

      router.push("/verification");
      router.refresh();
    } catch {
      setError("Network error while processing decision.");
    } finally {
      setProcessing(false);
    }
  }

  // Display is indicative; the backend makes final approval decisions.
  const allRecorded = items.every(
    (item) => quantities[item.id]?.trim() !== ""
  );

  const hasShortage = items.some((item) => {
    const raw = quantities[item.id]?.trim() ?? "";
    return raw !== "" && Number(raw) < item.expectedQty;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {recipeName}
        </h2>
        <p className="mt-1 break-all text-xs text-slate-500">
          {orderNo}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Target: {targetQty} garments
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const raw = quantities[item.id]?.trim() ?? "";
          const entered = raw !== "";
          const numericQty = Number(raw);
          const valid = entered &&
            Number.isInteger(numericQty) &&
            numericQty >= 0 &&
            numericQty <= 2147483647;

          const previewStatus = !valid
            ? null
            : numericQty < item.expectedQty
              ? "RED"
              : numericQty > item.expectedQty
                ? "YELLOW"
                : "GREEN";

          const statusClasses = {
            GREEN: "bg-green-100 text-green-800",
            YELLOW: "bg-yellow-100 text-yellow-800",
            RED: "bg-red-100 text-red-800",
          };

          const changed =
            raw !==
            (item.actualQty === null ? "" : String(item.actualQty));

          return (
            <div
              key={item.id}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {item.component.componentName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Expected: {item.expectedQty} pieces
                  </p>
                </div>

                {previewStatus && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClasses[previewStatus]
                    }`}
                  >
                    {previewStatus}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  aria-label={`Actual quantity for ${item.component.componentName}`}
                  type="number"
                  min="0"
                  max="2147483647"
                  step="1"
                  value={quantities[item.id] ?? ""}
                  onChange={(event) =>
                    setQuantities((previous) => ({
                      ...previous,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-900"
                  placeholder="Actual quantity"
                />

                <button
                  type="button"
                  onClick={() => saveComponent(item)}
                  disabled={saving !== null || processing || !valid || !changed}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving === item.id ? "Saving..." : "Save Count"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Verification Decision
        </h2>

        {!allRecorded && (
          <p className="mt-2 text-sm text-amber-700">
            Record all component quantities before approval.
          </p>
        )}

        {hasShortage && (
          <p className="mt-2 text-sm text-red-700">
            Shortage detected. Approval is not allowed.
          </p>
        )}

        <button
          type="button"
          onClick={() => submitDecision("approve")}
          disabled={
            processing ||
            saving !== null ||
            !allRecorded ||
            hasShortage
          }
          className="mt-4 w-full rounded-lg bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          Approve Cutting Order
        </button>

        <label
          htmlFor="rejection-reason"
          className="mt-6 block text-sm font-medium text-slate-700"
        >
          Rejection Reason
        </label>

        <textarea
          id="rejection-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Describe the quality issue or shortage..."
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-slate-900"
        />

        <button
          type="button"
          onClick={() => submitDecision("reject")}
          disabled={processing || saving !== null || reason.trim().length < 5}
          className="mt-3 w-full rounded-lg bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          Reject Cutting Order
        </button>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}
      </div>
    </div>
  );
}
