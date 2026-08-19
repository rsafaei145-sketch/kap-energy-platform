import React from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { MX_REGISTERS } from '../../engine/loadControlEngine.js';
import { Shield, Zap, AlertTriangle, Power } from 'lucide-react';

const PRIORITY_CONFIG = {
  1: { label: 'اولویت ۱ · قابل خاموشی',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: Power },
  2: { label: 'اولویت ۲ · نیمه‌بحرانی',    color: '#eab308', bg: 'rgba(234,179,8,0.1)',  icon: Zap },
  3: { label: 'اولویت ۳ · ایمنی حیاتی',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: Shield },
};

export default function MobileSimulator() {
  const loadState       = useKapStore(s => s.loadState);
  const gvlState        = useKapStore(s => s.gvlState);
  const actual_Power_W  = useKapStore(s => s.actual_Power_W);
  const simulatedHour   = useKapStore(s => s.simulatedHour);
  const alertState      = useKapStore(s => s.alertState);
  const toggleLoadSwitch = useKapStore(s => s.toggleLoadSwitch);

  const inPeak = simulatedHour >= 17 && simulatedHour < 22;
  const loads  = Object.entries(loadState);

  const byPriority = [1, 2, 3].map(p => ({
    priority: p,
    loads: loads.filter(([, l]) => l.priority === p),
  }));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Mobile Frame */}
      <div className="mobile-frame w-[280px]">
        {/* Notch */}
        <div className="mobile-notch" />

        {/* Screen Content */}
        <div className="p-4 space-y-3 min-h-[480px]">
          {/* Status Header */}
          <div className={`rounded-xl p-3 text-center border ${
            inPeak ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-[#1e2d45] bg-[#111827]'
          }`}>
            <div className="text-[10px] text-[#94a3b8] mb-0.5 font-['Inter']">
              KAP Mobile Control
            </div>
            <div className="text-lg font-bold text-white font-['JetBrains_Mono']">
              {(actual_Power_W / 1000).toFixed(1)} kW
            </div>
            {inPeak && (
              <div className="text-[10px] text-yellow-400 font-bold animate-pulse">
                ⚡ پنجره اوج مصرف فعال
              </div>
            )}
          </div>

          {/* Load Switches */}
          {byPriority.map(({ priority, loads: pLoads }) => {
            const cfg = PRIORITY_CONFIG[priority];
            return (
              <div key={priority}>
                <div className="text-[9px] font-bold mb-1.5 px-1" style={{ color: cfg.color }}>
                  {cfg.label}
                </div>
                <div className="space-y-1.5">
                  {pLoads.map(([addr, load]) => {
                    const label = gvlState[addr]?.farsiLabel ?? addr;
                    const isOn  = load.state === 'ON';
                    const locked = load.isLifeSafety;

                    return (
                      <div
                        key={addr}
                        className="flex items-center justify-between rounded-lg px-3 py-2 border"
                        style={{
                          background: isOn ? cfg.bg : 'rgba(17,24,39,0.8)',
                          borderColor: isOn ? cfg.color + '40' : '#1e2d45',
                        }}
                      >
                        <div>
                          <div className="text-xs text-white font-['Vazirmatn']">{label}</div>
                          <div className="text-[9px] text-[#475569] font-['JetBrains_Mono']">
                            {addr} · {(load.power_W / 1000).toFixed(1)} kW
                            {locked && ' · 🔒'}
                          </div>
                        </div>

                        {locked ? (
                          <div className="text-[9px] text-green-400 font-bold flex items-center gap-1">
                            <Shield size={10} /> محافظت
                          </div>
                        ) : (
                          <label className="toggle-switch" title={locked ? 'غیر قابل خاموش کردن' : ''}>
                            <input
                              type="checkbox"
                              checked={isOn}
                              onChange={e => toggleLoadSwitch(addr, e.target.checked ? 'ON' : 'OFF')}
                              disabled={locked}
                            />
                            <span className="toggle-slider" />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Pre-shutdown log */}
          <div className="border-t border-[#1e2d45] pt-2">
            <div className="text-[9px] text-[#475569] mb-1 font-['JetBrains_Mono']">Pre-shutdown Log</div>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {loads
                .filter(([, l]) => l.preShutdownPower_W != null)
                .map(([addr, l]) => (
                  <div key={addr} className="text-[9px] font-['JetBrains_Mono'] text-[#475569]">
                    {addr}: {(l.preShutdownPower_W / 1000).toFixed(1)}kW @ {l.postShutdownVoltage_V?.toFixed(0)}V
                  </div>
                ))}
              {loads.every(([, l]) => l.preShutdownPower_W == null) && (
                <div className="text-[9px] text-[#334155]">// هنوز خاموشی ثبت نشده</div>
              )}
            </div>
          </div>
        </div>

        {/* Home bar */}
        <div className="flex justify-center py-3">
          <div className="w-20 h-1 bg-[#334155] rounded-full" />
        </div>
      </div>

      {/* Command Log Panel */}
      <div className="w-[280px] glass-card p-3">
        <div className="section-header mb-2">دستورات شبکه · Shared Memory Commands</div>
        <div className="space-y-1">
          {loads
            .filter(([, l]) => l.lastToggleTime != null)
            .slice(-5)
            .reverse()
            .map(([addr, l]) => (
              <div key={addr} className="text-[10px] font-['JetBrains_Mono'] text-[#94a3b8] flex justify-between">
                <span>{addr} → {l.state}</span>
                <span className="text-[#475569]">
                  {new Date(l.lastToggleTime).toLocaleTimeString('fa-IR', { hour12: false })}
                </span>
              </div>
            ))}
          {loads.every(([, l]) => l.lastToggleTime == null) && (
            <div className="text-[10px] text-[#334155] font-['JetBrains_Mono']">// منتظر دستور</div>
          )}
        </div>
      </div>
    </div>
  );
}
