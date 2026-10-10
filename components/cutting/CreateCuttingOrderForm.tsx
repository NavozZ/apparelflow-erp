
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Recipe = {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: string;
  wastageCap: string;
};

type Props = {
  recipes: Recipe[];
};

export default function CreateCuttingOrderForm({
  recipes,
}: Props) {
  const router = useRouter();

  const [recipeId, setRecipeId] = useState(
    recipes[0]?.id ?? ""
  );
  const [targetQty, setTargetQty] = useState("100");
  const [fabricRollId, setFabricRollId] = useState("");
  const [actualFabricYds, setActualFabricYds] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRecipe = recipes.find(
    (recipe) => recipe.id === recipeId
  );

  const estimatedFabric =
    Number(selectedRecipe?.stdFabricYards ?? 0) *
    Number(targetQty || 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/cutting-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId,
          targetQty: Number(targetQty),
          fabricRollId: fabricRollId.trim(),
          actualFabricYds: Number(actualFabricYds),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Unable to create cutting order");
        return;
      }

      setSuccess(
        `Cutting order ${result.order.orderNo} created successfully.`
      );

      setFabricRollId("");
      setActualFabricYds("");

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="recipe"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Garment Recipe
        </label>

        <select
          id="recipe"
          value={recipeId}
          onChange={(event) => setRecipeId(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
        >
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.recipeCode} — {recipe.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="targetQty"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Target Garment Quantity
        </label>

        <input
          id="targetQty"
          type="number"
          min="1"
          max="100000"
          step="1"
          value={targetQty}
          onChange={(event) => setTargetQty(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
        />
      </div>

      <div>
        <label
          htmlFor="fabricRollId"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Fabric Roll ID
        </label>

        <input
          id="fabricRollId"
          type="text"
          maxLength={100}
          value={fabricRollId}
          onChange={(event) => setFabricRollId(event.target.value)}
          placeholder="ROLL-001"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
        />
      </div>

      <div>
        <label
          htmlFor="actualFabricYds"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Actual Fabric Used (Yards)
        </label>

        <input
          id="actualFabricYds"
          type="number"
          min="0"
          step="0.01"
          value={actualFabricYds}
          onChange={(event) => setActualFabricYds(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
        />
      </div>

      {selectedRecipe && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p>
            <strong>Estimated Standard Fabric:</strong>{" "}
            {estimatedFabric.toFixed(2)} yards
          </p>
          <p className="mt-1">
            <strong>Allowed Wastage Cap:</strong>{" "}
            {selectedRecipe.wastageCap}%
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || recipes.length === 0}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating Order..." : "Create Cutting Order"}
      </button>
    </form>
  );
}
