
export type ComponentStatus = "GREEN" | "YELLOW" | "RED";

export type ComponentCount = {
  expectedQty: number;
  actualQty: number | null;
};

export function getComponentStatus(
  expectedQty: number,
  actualQty: number
): ComponentStatus {
  if (actualQty < expectedQty) return "RED";
  if (actualQty > expectedQty) return "YELLOW";
  return "GREEN";
}

export function validateComponentCounts(
  items: ComponentCount[]
): {
  allowed: boolean;
  reason: string | null;
} {
  if (items.length === 0) {
    return {
      allowed: false,
      reason: "No verification components found",
    };
  }

  if (
    items.some(
      (item) =>
        item.actualQty === null ||
        !Number.isSafeInteger(item.actualQty) ||
        item.actualQty < 0
    )
  ) {
    return {
      allowed: false,
      reason: "All component quantities must be recorded",
    };
  }

  if (
    items.some(
      (item) =>
        item.actualQty !== null &&
        item.actualQty < item.expectedQty
    )
  ) {
    return {
      allowed: false,
      reason:
        "Approval blocked: one or more components have shortages",
    };
  }

  return { allowed: true, reason: null };
}

export function calculateWastagePercentage(
  actualFabricYards: number,
  standardFabricYards: number,
  targetQty: number
): number {
  const expectedFabric = standardFabricYards * targetQty;

  if (
    !Number.isFinite(expectedFabric) ||
    expectedFabric <= 0 ||
    !Number.isFinite(actualFabricYards) ||
    actualFabricYards < 0
  ) {
    throw new Error("Invalid fabric quantities");
  }

  return (
    ((actualFabricYards - expectedFabric) / expectedFabric) * 100
  );
}

export function isWastageWithinCap(
  wastagePercentage: number,
  wastageCap: number
): boolean {
  return (
    Number.isFinite(wastagePercentage) &&
    Number.isFinite(wastageCap) &&
    wastagePercentage <= wastageCap
  );
}
