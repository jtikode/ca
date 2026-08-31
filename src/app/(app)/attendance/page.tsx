import { requireSession } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AttendanceUploadForm } from "@/components/attendance/AttendanceUploadForm";
import { MONTH_NAMES, daysInMonth } from "@/lib/dates";

export default async function AttendancePage() {
  const session = await requireSession(["SUPERADMIN", "HR_MANAGER"]);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const totalDays = daysInMonth(month, year);
  const monthStart = new Date(year, month - 1, 1);
  const monthEndExclusive = new Date(year, month, 1);

  const hourlyEmployees = await db.employee.findMany({
    where: { orgId: session.orgId, status: "ACTIVE", payMode: { in: ["HOURLY_ATTENDANCE", "WAGE_BASED"] } },
    orderBy: { name: "asc" },
  });

  const summaries = await Promise.all(
    hourlyEmployees.map(async (employee) => {
      const [presentCount, rowCount] = await Promise.all([
        db.attendance.count({
          where: { employeeId: employee.id, present: true, date: { gte: monthStart, lt: monthEndExclusive } },
        }),
        db.attendance.count({
          where: { employeeId: employee.id, date: { gte: monthStart, lt: monthEndExclusive } },
        }),
      ]);
      return { employee, presentCount, rowCount };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Attendance</h1>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-white">Upload attendance</h2>
        <p className="mb-4 text-sm text-slate-400">
          Daily present/absent rows exported (or copied) from your biometric machine — one row per employee per
          day. Re-uploading corrects earlier data for the same dates.
        </p>
        <AttendanceUploadForm />
      </Card>

      {hourlyEmployees.length > 0 && (
        <Card className="overflow-x-auto">
          <h2 className="mb-1 text-lg font-bold text-white">
            Hourly/attendance-based &amp; wage-based employees — {MONTH_NAMES[month - 1]} {year}
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Days present so far this month, out of {totalDays}. A short row count usually means the upload for this
            month is incomplete — missing days are treated as absent when payroll is run.
          </p>
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Days present</th>
                <th className="py-2 pr-4">Attendance rows uploaded</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(({ employee, presentCount, rowCount }) => (
                <tr key={employee.id} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4">
                    {employee.name} ({employee.employeeCode})
                  </td>
                  <td className="py-2 pr-4">
                    {presentCount} / {totalDays}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={rowCount < totalDays ? "warning" : "success"}>
                      {rowCount} / {totalDays}
                      {rowCount < totalDays ? " — incomplete" : ""}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
