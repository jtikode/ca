import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { AddHolidayForm } from "@/components/common/InlineForms";
import { deleteHoliday } from "@/actions/holidayActions";

export default async function HolidaysPage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const holidays = await db.holiday.findMany({
    where: { orgId: session.orgId, date: { gte: startOfYear } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Holiday calendar</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Add a holiday</h2>
        <p className="mb-4 text-sm text-slate-400">
          Employees see these on their Leaves page. The calendar is for planning and display; it does not change days
          paid on a payroll run.
        </p>
        <AddHolidayForm />
      </Card>

      <Card className="overflow-x-auto">
        <h2 className="mb-4 text-lg font-bold text-white">This year and later</h2>
        {holidays.length === 0 ? (
          <p className="text-sm text-slate-400">No holidays added yet.</p>
        ) : (
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Holiday</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4">
                    {h.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-2 pr-4 font-medium text-white">{h.name}</td>
                  <td className="py-2 pr-4">
                    <form action={deleteHoliday.bind(null, h.id)}>
                      <button type="submit" className="text-sm font-semibold text-red-400 hover:underline">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
