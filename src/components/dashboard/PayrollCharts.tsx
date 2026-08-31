"use client";

import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COST_COLORS = ["#f59e0b", "#1d4ed8", "#0891b2", "#7c3aed", "#dc2626"];
const AXIS_TICK = { fontSize: 12, fill: "#94a3b8" };
const TOOLTIP_STYLE = {
  contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#fff" },
  itemStyle: { color: "#e2e8f0" },
  labelStyle: { color: "#94a3b8" },
};

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
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Latest run — cost breakdown</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={costBreakdown}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              label={(d) => d.name}
              labelLine={{ stroke: "#475569" }}
            >
              {costBreakdown.map((_, i) => (
                <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => inr(Number(v))} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Month-wise salary disbursed</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthlyTotals}>
            <XAxis dataKey="label" tick={AXIS_TICK} stroke="#334155" />
            <YAxis tick={AXIS_TICK} stroke="#334155" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => inr(Number(v))} {...TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
