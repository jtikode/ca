import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold text-white">
          Tim<span className="text-amber-400">Hr</span>
        </h1>
        <Card>
          <h2 className="mb-1 text-lg font-bold text-white">Reset password</h2>
          {token ? (
            <>
              <p className="mb-4 text-sm text-slate-400">Choose a new password for your account.</p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-red-400">
              Missing reset token — use the link from your email, or{" "}
              <Link href="/forgot-password" className="font-semibold text-amber-400 hover:underline">
                request a new one
              </Link>
              .
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
