import { db } from "@/lib/db";
import type { PayslipLine, Employee, PayrollRun } from "@/generated/prisma/client";
import type { MonthYear } from "@/lib/dates";
import type { OtherAllowanceItem } from "@/lib/statutory";

export type LineWithContext = PayslipLine & { employee: Employee; payrollRun: PayrollRun };

export interface EmployeePeriodTotals {
  employeeId: string;
  employee: Employee;
  grossEarnings: number;
  /** Summed from earnings.basic/earnings.hra across lines — needed to reuse
   * the HRA-exemption formula on actual (not estimated) figures. */
  basicTotal: number;
  hraTotal: number;
  pfWages: number;
  pfEmployee: number;
  pfEmployer: number;
  pfEps: number;
  pfEdli: number;
  esiWages: number;
  esiEmployee: number;
  esiEmployer: number;
  ptAmount: number;
  tdsAmount: number;
  netPay: number;
  /** Raw per-month rows, for quarter breakup / month-by-month display. */
  lines: LineWithContext[];
}

export interface PeriodAggregationResult {
  employeeTotals: Map<string, EmployeePeriodTotals>;
  /** Requested periods that had at least one FINALIZED run. */
  periodsFound: MonthYear[];
  /** Requested periods with no FINALIZED run (none created, or still DRAFT). */
  periodsMissing: MonthYear[];
}

function periodKey(p: MonthYear): string {
  return `${p.year}-${p.month}`;
}

function newTotals(employeeId: string, employee: Employee): EmployeePeriodTotals {
  return {
    employeeId,
    employee,
    grossEarnings: 0,
    basicTotal: 0,
    hraTotal: 0,
    pfWages: 0,
    pfEmployee: 0,
    pfEmployer: 0,
    pfEps: 0,
    pfEdli: 0,
    esiWages: 0,
    esiEmployee: 0,
    esiEmployer: 0,
    ptAmount: 0,
    tdsAmount: 0,
    netPay: 0,
    lines: [],
  };
}

function addLine(totals: EmployeePeriodTotals, line: LineWithContext) {
  const earnings = line.earnings as unknown as {
    basic?: number;
    hra?: number;
    otherAllowances?: OtherAllowanceItem[];
  } | null;

  totals.grossEarnings += Number(line.grossEarnings);
  totals.basicTotal += Number(earnings?.basic ?? 0);
  totals.hraTotal += Number(earnings?.hra ?? 0);
  totals.pfWages += Number(line.pfWages);
  totals.pfEmployee += Number(line.pfEmployee);
  totals.pfEmployer += Number(line.pfEmployer);
  totals.pfEps += Number(line.pfEps);
  totals.pfEdli += Number(line.pfEdli);
  totals.esiWages += Number(line.esiWages);
  totals.esiEmployee += Number(line.esiEmployee);
  totals.esiEmployer += Number(line.esiEmployer);
  totals.ptAmount += Number(line.ptAmount);
  totals.tdsAmount += Number(line.tdsAmount);
  totals.netPay += Number(line.netPay);
  totals.lines.push(line);
}

/** Org-wide: sums all FINALIZED PayrollRuns' PayslipLines in `orgId` whose
 * (month, year) is in `periods`, grouped per employee. */
export async function aggregateOrgPayslipLines(orgId: string, periods: MonthYear[]): Promise<PeriodAggregationResult> {
  const runs = await db.payrollRun.findMany({
    where: {
      orgId,
      status: "FINALIZED",
      OR: periods.map((p) => ({ month: p.month, year: p.year })),
    },
    include: { payslipLines: { include: { employee: true } } },
  });

  const employeeTotals = new Map<string, EmployeePeriodTotals>();
  const foundKeys = new Set<string>();

  for (const run of runs) {
    foundKeys.add(periodKey({ month: run.month, year: run.year }));
    for (const line of run.payslipLines) {
      const lineWithContext: LineWithContext = { ...line, payrollRun: run };
      let totals = employeeTotals.get(line.employeeId);
      if (!totals) {
        totals = newTotals(line.employeeId, line.employee);
        employeeTotals.set(line.employeeId, totals);
      }
      addLine(totals, lineWithContext);
    }
  }

  const periodsFound = periods.filter((p) => foundKeys.has(periodKey(p)));
  const periodsMissing = periods.filter((p) => !foundKeys.has(periodKey(p)));

  return { employeeTotals, periodsFound, periodsMissing };
}

/** Single-employee variant — filters at the DB query level so a single
 * Form 16 download doesn't pay for a full-org query. Returns null if the
 * employee doesn't exist in this org (zero finalized lines still returns a
 * valid all-zero EmployeePeriodTotals, not null). */
export async function aggregateEmployeePayslipLines(
  orgId: string,
  employeeId: string,
  periods: MonthYear[],
): Promise<EmployeePeriodTotals | null> {
  const employee = await db.employee.findFirst({ where: { id: employeeId, orgId } });
  if (!employee) return null;

  const runs = await db.payrollRun.findMany({
    where: {
      orgId,
      status: "FINALIZED",
      OR: periods.map((p) => ({ month: p.month, year: p.year })),
    },
    include: { payslipLines: { where: { employeeId }, include: { employee: true } } },
  });

  const totals = newTotals(employeeId, employee);
  for (const run of runs) {
    for (const line of run.payslipLines) {
      addLine(totals, { ...line, payrollRun: run });
    }
  }

  return totals;
}
