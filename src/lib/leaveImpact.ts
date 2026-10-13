import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Approved UNPAID (loss of pay) leave days per employee for one month.
 * Company holidays inside a leave span are not counted as lost pay days.
 * Weekly offs are not modeled in this app, so a leave spanning a weekend
 * counts those days; HR can adjust days paid on the run if needed. */
export async function unpaidLeaveDaysByEmployee(
  orgId: string,
  month: number,
  year: number,
): Promise<Map<string, number>> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0)); // last day, inclusive

  const [requests, holidays] = await Promise.all([
    db.leaveRequest.findMany({
      where: {
        orgId,
        type: "UNPAID",
        status: "APPROVED",
        fromDate: { lte: monthEnd },
        toDate: { gte: monthStart },
      },
      select: { employeeId: true, fromDate: true, toDate: true },
    }),
    db.holiday.findMany({ where: { orgId, date: { gte: monthStart, lte: monthEnd } }, select: { date: true } }),
  ]);

  const holidayKeys = new Set(holidays.map((h) => dayKey(h.date)));
  const countedByEmployee = new Map<string, Set<string>>();

  for (const r of requests) {
    const start = Math.max(r.fromDate.getTime(), monthStart.getTime());
    const end = Math.min(r.toDate.getTime(), monthEnd.getTime());
    const set = countedByEmployee.get(r.employeeId) ?? new Set<string>();
    for (let t = start; t <= end; t += DAY_MS) {
      const key = dayKey(new Date(t));
      if (!holidayKeys.has(key)) set.add(key); // a Set, so overlapping requests never double count
    }
    countedByEmployee.set(r.employeeId, set);
  }

  return new Map([...countedByEmployee].map(([id, set]) => [id, set.size]));
}
