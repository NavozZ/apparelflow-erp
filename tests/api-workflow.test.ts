
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

// Mock database operations before importing API handlers.
const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/authorization", () => {
  class AuthenticationError extends Error {
    constructor() {
      super("Authentication required");
    }
  }

  class AuthorizationError extends Error {
    constructor() {
      super("Forbidden");
    }
  }

  return {
    AuthenticationError,
    AuthorizationError,
    requireRole: mocks.requireRole,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    cuttingOrder: {
      findMany: mocks.findMany,
    },
  },
}));

// The Sewing Queue uses Next.js connection().
// Mock only this runtime dependency.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("next/server")
  >();

  return {
    ...actual,
    connection: vi.fn(async () => {}),
  };
});

import { AuthorizationError } from "@/lib/authorization";

import { POST as approveOrder } from
  "@/app/api/cutting-orders/[id]/approve/route";

import { POST as rejectOrder } from
  "@/app/api/cutting-orders/[id]/reject/route";

import { GET as getSewingQueue } from
  "@/app/api/sewing/queue/route";

const ORDER_ID = "test-order-001";

const context = {
  params: Promise.resolve({ id: ORDER_ID }),
};

function makeOrder(actualQty: number) {
  return {
    id: ORDER_ID,
    orderNo: "CUT-TEST-001",
    status: "PENDING_VERIFICATION",
    targetQty: 50,
    actualFabricYds: new Prisma.Decimal("91"),
    recipe: {
      stdFabricYards: new Prisma.Decimal("1.8"),
      wastageCap: new Prisma.Decimal("5"),
    },
    verificationItems: [
      {
        componentId: "component-1",
        component: {
          componentName: "Front Body Panel",
        },
        expectedQty: 50,
        actualQty,
        status:
          actualQty < 50 ? "RED" : "GREEN",
      },
    ],
  };
}

function createTransactionMock(order = makeOrder(50)) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([
      { id: ORDER_ID },
    ]),

    cuttingOrder: {
      findUnique: vi.fn().mockResolvedValue(order),

      update: vi.fn().mockResolvedValue({
        id: ORDER_ID,
        orderNo: "CUT-TEST-001",
        status: "VERIFIED",
      }),
    },

    verificationLog: {
      create: vi.fn().mockResolvedValue({
        id: "audit-log-001",
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.requireRole.mockResolvedValue({
    id: "verifier-001",
    role: "cutting_verifier",
  });
});

describe("Webtezza mandatory API scenarios", () => {
  it("1. Authenticated Verifier can approve a GREEN order", async () => {
    const tx = createTransactionMock(makeOrder(50));

    mocks.transaction.mockImplementation(
      async (callback) => callback(tx)
    );

    const response = await approveOrder(
      new Request("http://localhost/api/approve", {
        method: "POST",
      }),
      context
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.status).toBe("VERIFIED");

    expect(tx.verificationLog.create)
      .toHaveBeenCalledOnce();

    expect(tx.cuttingOrder.update)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "VERIFIED" },
        })
      );

    expect(mocks.requireRole)
      .toHaveBeenCalledWith(["cutting_verifier"]);
  });

  it("2. RED shortage blocks approval with HTTP 422", async () => {
    const tx = createTransactionMock(makeOrder(45));

    mocks.transaction.mockImplementation(
      async (callback) => callback(tx)
    );

    const response = await approveOrder(
      new Request("http://localhost/api/approve", {
        method: "POST",
      }),
      context
    );

    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toContain("shortages");

    expect(tx.verificationLog.create)
      .not.toHaveBeenCalled();

    expect(tx.cuttingOrder.update)
      .not.toHaveBeenCalled();
  });

  it("3. Rejection without a reason is rejected", async () => {
    const response = await rejectOrder(
      new Request("http://localhost/api/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
      context
    );

    expect(response.status).toBe(400);

    // Validation must happen before any database write.
    expect(mocks.transaction)
      .not.toHaveBeenCalled();
  });

  it("4. Cutting Supervisor cannot approve an order", async () => {
    mocks.requireRole.mockRejectedValue(
      new AuthorizationError()
    );

    const response = await approveOrder(
      new Request("http://localhost/api/approve", {
        method: "POST",
      }),
      context
    );

    expect(response.status).toBe(403);

    expect(mocks.transaction)
      .not.toHaveBeenCalled();
  });

  it("5. Sewing Queue query excludes unverified orders", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "sewing-001",
      role: "sewing_supervisor",
    });

    // Mock database returns no verified orders.
    mocks.findMany.mockResolvedValue([]);

    const response = await getSewingQueue();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual([]);
    expect(body.total).toBe(0);

    // Critical: verify the filter is enforced
    // in the database query, not only the UI.
    expect(mocks.findMany)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "VERIFIED",
          },
        })
      );

    expect(mocks.requireRole)
      .toHaveBeenCalledWith(["sewing_supervisor"]);
  });
});
