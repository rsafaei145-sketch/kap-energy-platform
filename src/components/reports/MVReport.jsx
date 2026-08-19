import React from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { exportReportCSV, formatRial, TARIFF_TIERS } from '../../engine/mvEngine.js';
import { FileText, Download, TrendingDown, Zap, Database, BarChart3, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function MVReport() {
  const mvReport        = useKapStore(s => s.mvReport);
  const history         = useKapStore(s => s.history);
  const recomputeMVReport = useKapStore(s => s.recomputeMVReport);

  const handleDownload = () => {
    if (!mvReport) return;
    const csv  = exportReportCSV(mvReport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `KAP_MV_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mvReport) {
    return (
      <div className="glass-card p-8 text-center">
        <FileText size={40} className="mx-auto mb-3 text-[#475569]" />
        <p className="text-[#94a3b8] text-sm mb-4">گزارش M&V هنوز آماده نشده است</p>
        <button onClick={recomputeMVReport} className="btn-primary">محاسبه گزارش</button>
      </div>
    );
  }

  const kpiCards = [
    {
      icon: TrendingDown,
      label: 'انرژی صرفه‌جویی‌شده',
      value: `${mvReport.totalSaving_kWh.toFixed(2)} kWh`,
      sub: 'Saving_Energy_kWh',
      color: '#22c55e',
    },
    {
      icon: Zap,
      label: 'کاهش پیک مصرف',
      value: `${mvReport.peakReduction_kW.toFixed(1)} kW`,
      sub: 'Peak Reduction',
      color: '#3b82f6',
    },
    {
      icon: FileText,
      label: 'صرفه‌جویی مالی',
      value: formatRial(mvReport.monetarySaving_R),
      sub: `${mvReport.rialPerKwh.toLocaleString()} ریال/کیلووات`,
      color: '#f59e0b',
    },
    {
      icon: Database,
      label: 'پوشش داده GOOD',
      value: `${mvReport.dataCoverage_pct}%`,
      sub: `${mvReport.goodSamples}/${mvReport.sampleCount} نمونه`,
      color: mvReport.dataCoverage_pct >= 80 ? '#22c55e' : '#f97316',
    },
  ];

  // Hourly bar chart from intervalLog
  const hourlyData = {};
  (mvReport.intervalLog ?? []).forEach(r => {
    const h = r.hour;
    if (!hourlyData[h]) hourlyData[h] = { hour: h, saving: 0, count: 0 };
    hourlyData[h].saving += r.saving_kWh;
    hourlyData[h].count++;
  });
  const barData = Object.values(hourlyData)
    .sort((a, b) => a.hour - b.hour)
    .map(d => ({ ...d, saving: parseFloat(d.saving.toFixed(3)) }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <BarChart3 size={16} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" dir="rtl">گزارش اندازه‌گیری و راستی‌آزمایی · M&V Report</h2>
            <p className="text-[11px] text-[#94a3b8] font-['Inter']">
              Generated: {new Date(mvReport.generatedAt).toLocaleString('fa-IR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={recomputeMVReport} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#1e2d45] text-[#94a3b8] hover:text-white rounded-lg transition-all">
            <RefreshCw size={12} /> بروزرسانی
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-xs btn-primary">
            <Download size={12} /> دانلود CSV
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="text-[10px] font-['JetBrains_Mono'] text-[#475569]">{sub}</div>
            </div>
            <div className="text-lg font-bold font-['JetBrains_Mono'] tabular-nums" style={{ color }} dir="ltr">
              {value}
            </div>
            <div className="text-xs text-[#94a3b8] mt-1 font-['Vazirmatn']" dir="rtl">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Hourly savings bar chart */}
        <div className="glass-card p-4">
          <div className="section-header mb-3">صرفه‌جویی ساعتی · Hourly Savings (kWh)</div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,45,69,0.5)" />
                <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }} unit=" kWh" />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [`${v} kWh`, 'صرفه‌جویی']}
                  labelFormatter={h => `ساعت ${h}:00`}
                />
                <Bar dataKey="saving" radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.hour >= 17 && d.hour < 22 ? '#eab308' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-[#475569] font-['JetBrains_Mono']">
            <span><span className="inline-block w-3 h-2 bg-yellow-500 rounded mr-1 align-middle" />پیک (۱۷-۲۲)</span>
            <span><span className="inline-block w-3 h-2 bg-blue-500 rounded mr-1 align-middle" />خارج پیک</span>
          </div>
        </div>

        {/* Tariff Info + Baseline vs Actual */}
        <div className="glass-card p-4 space-y-3">
          <div className="section-header">ساختار تعرفه · Tariff Structure</div>

          <div className="space-y-2">
            {TARIFF_TIERS.map((tier, i) => {
              const isActive = mvReport.rialPerKwh === tier.rialPerKwh;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-all ${
                    isActive
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-[#1e2d45] bg-[#111827]'
                  }`}
                >
                  <span className="text-xs font-['Inter']" style={{ color: isActive ? '#f59e0b' : '#94a3b8' }}>
                    {tier.label}
                  </span>
                  <span className="text-xs font-bold font-['JetBrains_Mono']" style={{ color: isActive ? '#f59e0b' : '#475569' }}>
                    {tier.rialPerKwh.toLocaleString()} ریال/kWh
                    {isActive && ' ✓'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Consumption ratio */}
          <div className="border-t border-[#1e2d45] pt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#94a3b8] font-['Vazirmatn']" dir="rtl">خط پایه کل</span>
              <span className="font-['JetBrains_Mono'] text-white">{mvReport.totalBaseline_kWh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94a3b8] font-['Vazirmatn']" dir="rtl">مصرف واقعی</span>
              <span className="font-['JetBrains_Mono'] text-blue-400">{mvReport.totalActual_kWh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#94a3b8] font-['Vazirmatn']" dir="rtl">نسبت مصرف / الگو</span>
              <span className="font-['JetBrains_Mono'] text-amber-400">{mvReport.consumptionRatio.toFixed(2)}×</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
