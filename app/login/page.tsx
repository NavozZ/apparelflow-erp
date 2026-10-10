
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";


export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const { error } = await searchParams;
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  

  async function loginAction(formData: FormData) {
    "use server";

    const email = formData.get("email");
    const password = formData.get("password");

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      redirect("/login?error=invalid");
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=invalid");
      }

      throw error;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-bold text-slate-900">
          ApparelFlow ERP
        </h1>

        <p className="mt-2 text-slate-600">
          Sign in to your account
        </p>
        {error === "invalid" && (
  <div
    role="alert"
    className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
  >
    Invalid email or password. Please try again.
  </div>
)}

        <form action={loginAction} className="mt-8 space-y-5">
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
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
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
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
