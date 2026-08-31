import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold text-white">
          Tim<span className="text-amber-400">Hr</span>
        </h1>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-white">Create your company account</h2>
          <SignupForm />
        </Card>
        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-amber-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
