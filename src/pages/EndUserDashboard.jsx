import React from 'react';
import { useKapStore } from '../store/kapStore.js';
import RealtimePowerChart from '../components/charts/RealtimePowerChart.jsx';
import PeakWindowGauge    from '../components/charts/PeakWindowGauge.jsx';
import AIAdvisoryPanel    from '../components/ai/AIAdvisoryPanel.jsx';
import MVReport           from '../components/reports/MVReport.jsx';
import { formatRial }     from '../engine/mvEngine.js';
import { TrendingDown, Zap, Sun, DollarSign, Power, Leaf } from 'lucide-react';

export default function EndUserDashboard() {
  const mvReport        = useKapStore(s => s.mvReport);
  const actual_Power_W  = useKapStore(s => s.actual_Power_W);
  const target_Power_W  = useKapStore(s => s.target_Power_W);
  const alertState      = useKapStore(s => s.alertState);
  const loadState       = useKapStore(s => s.loadState);
  const gvlState        = useKapStore(s => s.gvlState);
  const simulatedHour   = useKapStore(s => s.simulatedHour);
  const season          = useKapStore(s => s.season);

  const inPeak = simulatedHour >= 17 && simulatedHour < 22;

  const savings    = mvReport?.totalSaving_kWh   ?? 0;
  const peakRed    = mvReport?.peakReduction_kW  ?? 0;
  const moneySaved = mvReport?.monetarySaving_R  ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1e2d45]"
        style={{ background: 'linear-gradient(135deg, #0d1a35 0%, #061020 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'radial-gradient(circle at 30% 50%, #3b82f6 0%, transparent 60%)' }} />
        <div className="relative p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-1 font-['Vazirmatn']">
              خوش آمدید به پلتفرم مدیریت انرژی KAP
            </h1>
            <p className="text-sm text-[#94a3b8] font-['Vazirmatn']">
              {inPeak
                ? '⚡ هم‌اکنون در پنجره اوج مصرف قرار دارید — صرفه‌جویی اهمیت حیاتی دارد'
                : 'سیستم در حال پایش و کنترل مصرف انرژی شما است'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              {season === 'SUMMER' ? <Sun size={24} className="text-white" /> : <Zap size={24} className="text-white" />}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Leaf size={18} className="text-green-400" />
            </div>
            <span className="text-[10px] text-[#475569] font-['JetBrains_Mono']">Saving_Energy_kWh</span>
          </div>
          <div className="text-2xl font-bold text-green-400 font-['JetBrains_Mono'] tabular-nums">
            {savings.toFixed(2)}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1 font-['Vazirmatn']">کیلووات‌ساعت صرفه‌جویی</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <DollarSign size={18} className="text-yellow-400" />
            </div>
            <span className="text-[10px] text-[#475569] font-['JetBrains_Mono']">Rial_Savings</span>
          </div>
          <div className="text-xl font-bold text-yellow-400 font-['JetBrains_Mono'] tabular-nums" dir="ltr">
            {new Intl.NumberFormat('fa-IR').format(Math.round(moneySaved))}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1 font-['Vazirmatn']">ریال صرفه‌جویی مالی</div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <TrendingDown size={18} className="text-blue-400" />
            </div>
            <span className="text-[10px] text-[#475569] font-['JetBrains_Mono']">Peak_Reduction_kW</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-['JetBrains_Mono'] tabular-nums">
            {peakRed.toFixed(1)}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1 font-['Vazirmatn']">کیلووات کاهش پیک</div>
        </div>

        <div className="kpi-card"
          style={alertState !== 'NORMAL' ? {
            borderColor: alertState === 'TRIP' ? '#ef4444' : alertState === 'ERROR' ? '#f97316' : '#eab308',
          } : {}}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Power size={18} className="text-purple-400" />
            </div>
            <span className="text-[10px] text-[#475569] font-['JetBrains_Mono']">Actual_Power_W</span>
          </div>
          <div className="text-2xl font-bold text-white font-['JetBrains_Mono'] tabular-nums">
            {(actual_Power_W / 1000).toFixed(1)}
          </div>
          <div className="text-xs text-[#94a3b8] mt-1 font-['Vazirmatn']">
            کیلووات مصرف جاری | هدف: {(target_Power_W/1000).toFixed(1)} kW
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="xl:col-span-2 glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="section-header">نمودار مصرف لحظه‌ای · Real-time Power</div>
            <div className={`text-[10px] px-2 py-1 rounded-full font-['JetBrains_Mono'] border ${
              inPeak
                ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                : 'border-[#1e2d45] text-[#475569]'
            }`}>
              {inPeak ? '⚡ پنجره اوج' : 'خارج از پیک'}
            </div>
          </div>
          <RealtimePowerChart />
        </div>

        {/* Gauge */}
        <div className="glass-card p-4 flex flex-col items-center justify-center">
          <div className="section-header mb-4 self-start">گیج مصرف · Demand Gauge</div>
          <PeakWindowGauge size={200} />
        </div>
      </div>

      {/* Device Status Grid */}
      <div className="glass-card p-4">
        <div className="section-header mb-3">وضعیت دستگاه‌ها · Device Status</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {Object.entries(loadState).map(([addr, load]) => {
            const label = gvlState[addr]?.farsiLabel ?? addr;
            const isOn  = load.state === 'ON';
            return (
              <div
                key={addr}
                className={`rounded-xl p-3 border transition-all ${
                  isOn
                    ? 'border-green-500/30 bg-green-500/8'
                    : 'border-[#1e2d45] bg-[#111827]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`status-dot ${isOn ? 'healthy' : ''}`}
                    style={!isOn ? { background: '#374151', boxShadow: 'none' } : {}} />
                  <span className="text-[9px] font-['JetBrains_Mono'] text-[#334155]">{addr}</span>
                </div>
                <div className="text-xs text-white font-['Vazirmatn'] mb-1 leading-tight">{label}</div>
                <div className="text-[11px] font-['JetBrains_Mono']" style={{ color: isOn ? '#22c55e' : '#475569' }}>
                  {isOn ? 'روشن' : 'خاموش'}
                  {load.isLifeSafety && ' 🔒'}
                </div>
                {isOn && (
                  <div className="text-[9px] text-[#475569] font-['JetBrains_Mono'] mt-1">
                    {(load.power_W / 1000).toFixed(1)} kW
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Advisory */}
      <AIAdvisoryPanel />
    </div>
  );
}
