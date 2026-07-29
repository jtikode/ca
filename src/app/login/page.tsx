import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold text-slate-900">Payroll</h1>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Sign in</h2>
          <LoginForm />
        </Card>
        <p className="text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-blue-700 hover:underline">
            Create a company account
          </Link>
        </p>
      </div>
    </div>
  );
}
