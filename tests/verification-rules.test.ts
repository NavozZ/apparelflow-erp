
import { describe, expect, it } from "vitest";

import {
  getComponentStatus,
  validateComponentCounts,
  calculateWastagePercentage,
  isWastageWithinCap,
} from "../lib/verification-rules";

describe("Component status calculation", () => {
  it("returns GREEN when actual equals expected", () => {
    expect(getComponentStatus(50, 50)).toBe("GREEN");
  });

  it("returns YELLOW when actual exceeds expected", () => {
    expect(getComponentStatus(50, 53)).toBe("YELLOW");
  });

  it("returns RED when actual is below expected", () => {
    expect(getComponentStatus(50, 45)).toBe("RED");
  });
});

describe("Component approval validation", () => {
  it("blocks approval when there are no components", () => {
    expect(validateComponentCounts([]).allowed).toBe(false);
  });

  it("blocks approval when a quantity is missing", () => {
    const result = validateComponentCounts([
      { expectedQty: 50, actualQty: 50 },
      { expectedQty: 100, actualQty: null },
    ]);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      "All component quantities must be recorded"
    );
  });

  it("blocks approval when a component has a shortage", () => {
    const result = validateComponentCounts([
      { expectedQty: 50, actualQty: 50 },
      { expectedQty: 50, actualQty: 45 },
    ]);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("shortages");
  });

  it("allows approval for GREEN and YELLOW components", () => {
    const result = validateComponentCounts([
      { expectedQty: 50, actualQty: 50 },
      { expectedQty: 50, actualQty: 53 },
    ]);

    expect(result.allowed).toBe(true);
  });

  it("rejects negative component counts", () => {
    expect(
      validateComponentCounts([
        { expectedQty: 50, actualQty: -1 },
      ]).allowed
    ).toBe(false);
  });
});

describe("Fabric wastage validation", () => {
  it("calculates wastage for 50 Crop Tops", () => {
    const wastage = calculateWastagePercentage(
      57,
      1.1,
      50
    );

    expect(wastage).toBeCloseTo(3.63636, 4);
  });

  it("allows wastage within the recipe cap", () => {
    expect(isWastageWithinCap(3.64, 8)).toBe(true);
  });

  it("blocks wastage above the recipe cap", () => {
    expect(isWastageWithinCap(10, 8)).toBe(false);
  });

  it("rejects invalid fabric quantities", () => {
    expect(() =>
      calculateWastagePercentage(57, 0, 50)
    ).toThrow("Invalid fabric quantities");
  });
});
