"use client";

import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COST_COLORS = ["#1d4ed8", "#0891b2", "#7c3aed", "#d97706", "#dc2626"];

export interface CostBreakdownSlice {
  name: string;
  value: number;
}

export interface MonthlyTotal {
  label: string;
  total: number;
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PayrollCharts({
  costBreakdown,
  monthlyTotals,
}: {
  costBreakdown: CostBreakdownSlice[];
  monthlyTotals: MonthlyTotal[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Latest run — cost breakdown</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={costBreakdown} dataKey="value" nameKey="name" outerRadius={90} label={(d) => d.name}>
              {costBreakdown.map((_, i) => (
                <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => inr(Number(v))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Month-wise salary disbursed</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyTotals}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => inr(Number(v))} />
            <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
