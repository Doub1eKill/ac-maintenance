"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { AlertCircle, TrendingDown, TrendingUp, Building2, Wrench, CheckCircle2 } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const COLORS = ["#0284c7", "#f59e0b", "#10b981", "#64748b"];

export function FinancialDashboardView({ data }: { data: any }) {
  const { financialMetrics } = data;
  if (!financialMetrics) return null;

  const {
    ytdSpend,
    avgCostPerRepair,
    topExpensiveBuilding,
    totalCompleted,
    monthlyExpenses,
    costBreakdown,
    topExpensiveAcs,
    detailedLedger,
  } = financialMetrics;

  return (
    <div className="space-y-6 animate-fade-in fade-in zoom-in-95 duration-300">
      
      {/* Top KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-slate-500">ยอดใช้จ่ายซ่อมบำรุงสะสม (ปีนี้)</h3>
            <AnimatedIcon icon={TrendingUp} size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(ytdSpend)}</div>
          <p className="text-xs font-medium text-slate-500 mt-1">ยอดรวมสำหรับปีปัจจุบัน</p>
        </div>
        
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-slate-500">ต้นทุนซ่อมบำรุงเฉลี่ยต่อครั้ง</h3>
            <AnimatedIcon icon={Wrench} size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(avgCostPerRepair)}</div>
          <p className="text-xs font-medium text-slate-500 mt-1">จากใบงานที่สำเร็จทั้งหมด {totalCompleted} งาน</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-slate-500">อาคารที่มีค่าซ่อมบำรุงสูงสุด</h3>
            <AnimatedIcon icon={Building2} size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 truncate" title={topExpensiveBuilding.name}>
            {topExpensiveBuilding.name}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">ใช้จ่ายไปแล้ว {formatCurrency(topExpensiveBuilding.cost)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-semibold text-slate-500">จำนวนใบงานซ่อมบำรุงทั้งหมด</h3>
            <AnimatedIcon icon={CheckCircle2} size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCompleted}</div>
          <p className="text-xs font-medium text-slate-500 mt-1">ใบงานที่สำเร็จในปีนี้</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <div className="p-6 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">แนวโน้มค่าซ่อมบำรุงรายเดือน</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">แนวโน้มยอดใช้จ่ายสะสมแต่ละเดือน</p>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
            {monthlyExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenses}>
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#64748b"
                    tickFormatter={(value) => `฿${value}`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), "ค่าใช้จ่าย"]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                ไม่มีข้อมูลรายเดือน
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <div className="p-6 pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">สัดส่วนค่าใช้จ่าย</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">แบ่งตามประเภทการซ่อมบำรุงหลัก</p>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
             {costBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {costBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value) || 0)} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
                ไม่มีข้อมูลสัดส่วนค่าใช้จ่าย
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 Expensive ACs */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <div className="p-6 pb-4 border-b border-slate-100">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <AnimatedIcon icon={AlertCircle} size={18} className="text-amber-500" animation="wiggle" />
              10 อันดับแอร์ที่มีค่าซ่อมบำรุงสูงสุด
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1 ml-6">เครื่องปรับอากาศที่ใช้งบซ่อมบำรุงมากที่สุด</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-semibold">รหัสแอร์</th>
                  <th className="px-6 py-3 font-semibold">สถานที่</th>
                  <th className="px-6 py-3 font-semibold text-right">ค่าใช้จ่ายรวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topExpensiveAcs.map((ac: any, index: number) => (
                  <tr key={ac.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {ac.acCode}
                      {index < 3 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/20">
                          ระดับสูง
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500 truncate max-w-[150px]">
                      {ac.location}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-right">
                      {formatCurrency(ac.cost)}
                    </td>
                  </tr>
                ))}
                {topExpensiveAcs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center font-medium text-slate-500">
                      ไม่มีข้อมูลแอร์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Ledger */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col">
          <div className="p-6 pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">บัญชีรายการซ่อมบำรุงล่าสุด</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">รายละเอียดค่าใช้จ่ายใบงานที่สำเร็จ</p>
          </div>
          <div className="p-0 flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-semibold">เลขที่ใบงาน</th>
                  <th className="px-6 py-3 font-semibold">รหัสแอร์</th>
                  <th className="px-6 py-3 font-semibold text-right">ค่าใช้จ่าย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detailedLedger.slice(0, 20).map((ledger: any) => (
                  <tr key={ledger.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{ledger.workOrderId}</div>
                      <div className="text-xs font-medium text-slate-400 mt-0.5">{ledger.technician}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {ledger.acCode}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-right">
                      {formatCurrency(ledger.cost)}
                    </td>
                  </tr>
                ))}
                {detailedLedger.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center font-medium text-slate-500">
                      ไม่มีข้อมูลรายการซ่อมบำรุง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
