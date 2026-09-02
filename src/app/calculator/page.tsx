import Link from "next/link";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";

export const metadata = {
  title: "CTC Calculator | TimHr",
  description: "Calculate actual cost to company from a basic salary — PF, ESI, PT, and field allowances included.",
};

export default function CalculatorPage() {
  return (
    <div className="flex flex-1 justify-center p-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-white">
            Tim<span className="text-amber-400">Hr</span>
          </Link>
          <h1 className="mt-3 text-xl font-bold text-white">Cost to company calculator</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter a basic salary and we&apos;ll work out PF, ESI, and Professional Tax to show the real monthly and
            annual cost — the same statutory math TimHr uses for real payroll runs.
          </p>
        </div>
        <CalculatorForm />
      </div>
    </div>
  );
}
