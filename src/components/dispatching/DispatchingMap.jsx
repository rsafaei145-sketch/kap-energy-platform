import React, { useState } from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { Map, Wifi, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

const STATUS_CONFIG = {
  healthy:  { label: 'سالم',    color: '#22c55e', icon: CheckCircle, cls: 'healthy'  },
  warning:  { label: 'هشدار',   color: '#eab308', icon: AlertTriangle, cls: 'warning' },
  critical: { label: 'بحرانی',  color: '#ef4444', icon: XCircle,     cls: 'critical' },
};

export default function DispatchingMap() {
  const zones = useKapStore(s => s.zones);
  const [selectedZone, setSelectedZone] = useState(null);

  const counts = {
    healthy:  zones.filter(z => z.status === 'healthy').length,
    warning:  zones.filter(z => z.status === 'warning').length,
    critical: zones.filter(z => z.status === 'critical').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
          <Map size={16} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white" dir="rtl">نمای دیسپچینگ غرب تهران</h2>
          <p className="text-[11px] text-[#94a3b8] font-['Inter']">West Tehran Dispatching Center · Control Room View</p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div
              key={status}
              className="flex items-center gap-3 bg-[#111827] border border-[#1e2d45] rounded-xl p-3"
              style={{ borderLeftColor: cfg.color, borderLeftWidth: '3px' }}
            >
              <Icon size={20} style={{ color: cfg.color }} />
              <div>
                <div className="text-lg font-bold font-['JetBrains_Mono']" style={{ color: cfg.color }}>{count}</div>
                <div className="text-[11px] text-[#94a3b8] font-['Vazirmatn']">{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zone Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {zones.map(zone => {
          const cfg = STATUS_CONFIG[zone.status];
          const Icon = cfg.icon;
          const isSelected = selectedZone === zone.id;

          return (
            <div
              key={zone.id}
              className={`zone-card ${zone.status} cursor-pointer select-none`}
              style={isSelected ? {
                borderColor: cfg.color,
                boxShadow: `0 0 20px ${cfg.color}30`,
              } : {}}
              onClick={() => setSelectedZone(isSelected ? null : zone.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-white font-['Vazirmatn']" dir="rtl">{zone.name}</div>
                  <div className="text-[10px] text-[#475569] font-['JetBrains_Mono']">{zone.id}</div>
                </div>
                <div className={`status-dot ${zone.status}`} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] text-[#475569] font-['Inter']">Devices</div>
                  <div className="text-sm font-bold font-['JetBrains_Mono'] text-white">{zone.devices}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#475569] font-['Inter']">Load</div>
                  <div className="text-sm font-bold font-['JetBrains_Mono']" style={{ color: cfg.color }}>
                    {zone.load_kW} kW
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-[#475569] mb-1">
                  <span>0</span>
                  <span style={{ color: cfg.color }}>{zone.status.toUpperCase()}</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, (zone.load_kW / 80) * 100)}%`,
                      background: cfg.color,
                    }}
                  />
                </div>
              </div>

              {/* Expanded Detail */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-[#1e2d45] animate-fade-in">
                  <div className="text-[10px] text-[#94a3b8] space-y-1 font-['JetBrains_Mono']">
                    <div className="flex justify-between">
                      <span>Capacity</span>
                      <span>80 kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Utilization</span>
                      <span style={{ color: cfg.color }}>{((zone.load_kW / 80) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Online</span>
                      <span className="text-green-400">{zone.devices} / {zone.devices}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="flex items-center gap-4 text-[10px] text-[#475569] font-['JetBrains_Mono']">
        <span>کلیک روی زون برای جزئیات بیشتر</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`status-dot ${key}`} />
            <span style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
