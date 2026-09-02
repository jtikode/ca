import { Card } from "@/components/ui/Card";
import { toggleEmployeeStatutory } from "@/actions/employeeActions";

function ToggleCell({
  employeeId,
  field,
  value,
}: {
  employeeId: string;
  field: "pfApplicable" | "esiApplicable";
  value: boolean;
}) {
  return (
    <form action={toggleEmployeeStatutory.bind(null, employeeId, field, !value)}>
      <button
        type="submit"
        className={
          value
            ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
            : "rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-700"
        }
      >
        {value ? "On" : "Off"}
      </button>
    </form>
  );
}

export function StatutoryWidget({
  employees,
}: {
  employees: { id: string; name: string; pfApplicable: boolean; esiApplicable: boolean }[];
}) {
  return (
    <Card className="overflow-x-auto">
      <h2 className="mb-1 text-lg font-bold text-white">PF / ESI applicability</h2>
      <p className="mb-4 text-sm text-slate-400">
        Click On/Off to change an employee&apos;s statutory applicability. This affects deduction calculations on
        payroll runs from now on — confirm with your CA before relying on a change.
      </p>
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500">
            <th className="py-2 pr-4">Employee</th>
            <th className="py-2 pr-4">PF</th>
            <th className="py-2 pr-4">ESI</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="border-b border-slate-800">
              <td className="py-2 pr-4 font-medium text-white">{emp.name}</td>
              <td className="py-2 pr-4">
                <ToggleCell employeeId={emp.id} field="pfApplicable" value={emp.pfApplicable} />
              </td>
              <td className="py-2 pr-4">
                <ToggleCell employeeId={emp.id} field="esiApplicable" value={emp.esiApplicable} />
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-slate-400">
                No active employees.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
