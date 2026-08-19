import React, { useState } from 'react';
import { useKapStore } from '../store/kapStore.js';
import RealtimePowerChart  from '../components/charts/RealtimePowerChart.jsx';
import PeakWindowGauge     from '../components/charts/PeakWindowGauge.jsx';
import AlertStateMachine   from '../components/alerts/AlertStateMachine.jsx';
import DispatchingMap      from '../components/dispatching/DispatchingMap.jsx';
import MobileSimulator     from '../components/controls/MobileSimulator.jsx';
import AIAdvisoryPanel     from '../components/ai/AIAdvisoryPanel.jsx';
import MVReport            from '../components/reports/MVReport.jsx';
import {
  Activity, Wifi, Users, Server, ChevronRight,
  Sliders, Map, BarChart3, MessageSquare, FileText
} from 'lucide-react';

const TABS = [
  { id: 'overview',    label: 'نمای کلی',        icon: Activity },
  { id: 'dispatching', label: 'دیسپچینگ',        icon: Map },
  { id: 'control',     label: 'کنترل موبایل',    icon: Sliders },
  { id: 'report',      label: 'گزارش M&V',        icon: FileText },
  { id: 'ai',          label: 'مشاور هوشمند',     icon: MessageSquare },
];

export default function ExpertDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const actual_Power_W  = useKapStore(s => s.actual_Power_W);
  const target_Power_W  = useKapStore(s => s.target_Power_W);
  const baseline_Power_W = useKapStore(s => s.baseline_Power_W);
  const deviation_W     = useKapStore(s => s.deviation_W);
  const alertState      = useKapStore(s => s.alertState);
  const lastQuality     = useKapStore(s => s.lastQuality);
  const payloadSizeKB   = useKapStore(s => s.payloadSizeKB);
  const onlineClients   = useKapStore(s => s.onlineClients);
  const connectedFleets = useKapStore(s => s.connectedFleets);
  const season          = useKapStore(s => s.season);
  const simulatedHour   = useKapStore(s => s.simulatedHour);
  const simulatedMinute = useKapStore(s => s.simulatedMinute);
  const setTarget       = useKapStore(s => s.setTarget);

  const inPeak = simulatedHour >= 17 && simulatedHour < 22;

  return (
    <div className="space-y-4">
      {/* Expert KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            icon: Server, color: '#3b82f6', label: 'Connected Fleets',
            value: connectedFleets, sub: 'فلیت‌های متصل',
          },
          {
            icon: Users, color: '#22c55e', label: 'Online Clients',
            value: onlineClients, sub: 'کلاینت‌های فعال',
          },
          {
            icon: Wifi, color: '#f59e0b', label: 'Payload Size',
            value: `${payloadSizeKB} KB`, sub: 'اندازه بسته داده',
          },
          {
            icon: Activity, color: deviation_W > 0 ? '#ef4444' : '#22c55e',
            label: 'Deviation_W',
            value: `${deviation_W > 0 ? '+' : ''}${deviation_W.toFixed(0)} W`,
            sub: 'انحراف از هدف',
          },
        ].map(({ icon: Icon, color, label, value, sub }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#475569]">{label}</span>
            </div>
            <div className="text-xl font-bold font-['JetBrains_Mono'] tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[11px] text-[#94a3b8] mt-1 font-['Vazirmatn']">{sub}</div>
          </div>
        ))}
      </div>

      {/* Target DSM Slider */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="section-header">تنظیم هدف DSM · Remote Target Adjustment</div>
          <span className="text-sm font-bold font-['JetBrains_Mono'] text-green-400">
            Target: {(target_Power_W / 1000).toFixed(1)} kW
          </span>
        </div>
        <input
          type="range"
          min={10000}
          max={50000}
          step={500}
          value={target_Power_W}
          onChange={e => setTarget(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-[#475569] font-['JetBrains_Mono'] mt-1">
          <span>10 kW (حداقل)</span>
          <span>Baseline: {(baseline_Power_W / 1000).toFixed(0)} kW</span>
          <span>50 kW (حداکثر)</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#111827] border border-[#1e2d45] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Icon size={13} />
            <span className="font-['Vazirmatn']">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 glass-card p-4">
                <div className="section-header mb-3">نمودار قدرت لحظه‌ای</div>
                <RealtimePowerChart />
              </div>
              <div className="glass-card p-4 flex flex-col items-center justify-center">
                <div className="section-header mb-4 self-start">گیج تقاضا</div>
                <PeakWindowGauge size={200} />
              </div>
            </div>
            <AlertStateMachine />
          </div>
        )}

        {activeTab === 'dispatching' && <DispatchingMap />}

        {activeTab === 'control' && (
          <div className="flex justify-center">
            <MobileSimulator />
          </div>
        )}

        {activeTab === 'report' && <MVReport />}

        {activeTab === 'ai' && <AIAdvisoryPanel />}
      </div>
    </div>
  );
}
