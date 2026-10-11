
"use client";

import { useState } from "react";

const demoRoles = [
  {
    role: "Cutting Supervisor",
    email: "cutting.supervisor@example.com",
    description: "Create and submit cutting batches",
  },
  {
    role: "Cutting Verifier",
    email: "cutting.verifier@example.com",
    description: "Verify component quantities and approve batches",
  },
  {
    role: "Sewing Supervisor",
    email: "sewing.supervisor@example.com",
    description: "Manage approved sewing batches",
  },
] as const;

export default function DemoRoleSelector() {
  const [selectedEmail, setSelectedEmail] = useState<string>(
    demoRoles[0].email
  );

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="demo-roles-heading"
        className="rounded-xl border border-blue-200 bg-blue-50 p-4"
      >
        <h2
          id="demo-roles-heading"
          className="text-base font-semibold text-slate-900"
        >
          Demo Role Selection
        </h2>

        <p className="mt-1 text-sm text-slate-700">
          Select a role to fill in its demo email.
          Authentication is still required.
        </p>

        <div className="mt-4 space-y-2">
          {demoRoles.map((demo) => {
            const selected = selectedEmail === demo.email;

            return (
              <button
                key={demo.email}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedEmail(demo.email)}
                className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selected
                    ? "border-blue-600 bg-white"
                    : "border-slate-300 bg-slate-50 hover:bg-white"
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {demo.role}
                </span>

                <span className="mt-1 block text-xs text-slate-600">
                  {demo.description}
                </span>

                <span className="mt-1 block break-all text-xs text-blue-700">
                  {demo.email}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={selectedEmail}
          onChange={(event) => setSelectedEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Sign In
      </button>
    </div>
  );
}
