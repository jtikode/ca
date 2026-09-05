import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold text-white">
          Tim<span className="text-amber-400">Hr</span>
        </h1>
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Forgot password</h2>
          <p className="mb-4 text-sm text-slate-400">Enter your account email and we&apos;ll send a reset link.</p>
          <ForgotPasswordForm />
        </Card>
        <p className="text-center text-sm text-slate-400">
          <Link href="/login" className="font-semibold text-amber-400 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
