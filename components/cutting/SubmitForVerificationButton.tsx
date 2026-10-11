
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
};

export default function SubmitForVerificationButton({
  orderId,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (loading) return;

    const confirmed = window.confirm(
      "Submit this cutting order for verification?"
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/cutting-orders/${encodeURIComponent(orderId)}/submit`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Unable to submit cutting order.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit for Verification"}
      </button>

      {error && (
        <p role="alert" className="max-w-48 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
