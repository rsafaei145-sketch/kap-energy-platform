import React, { useState } from 'react';
import { useKapStore } from '../store/kapStore.js';
import DataMakerPanel   from '../components/dataMaker/DataMakerPanel.jsx';
import GVLMappingEditor from '../components/mapping/GVLMappingEditor.jsx';
import AlertStateMachine from '../components/alerts/AlertStateMachine.jsx';
import {
  Terminal, GitBranch, Settings, Wifi, Radio,
  Network, Shield, ChevronRight, Copy, Check
} from 'lucide-react';

const TABS = [
  { id: 'datamaker', label: 'Data Maker',   icon: Radio },
  { id: 'gvl',       label: 'GVL Mapping',  icon: GitBranch },
  { id: 'alerts',    label: 'Alert Engine', icon: Shield },
  { id: 'network',   label: 'Network/Comms', icon: Network },
  { id: 'settings',  label: 'Settings',     icon: Settings },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded text-[#475569] hover:text-blue-400 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function TechnicianDashboard() {
  const [activeTab, setActiveTab] = useState('datamaker');

  const hexStream     = useKapStore(s => s.hexStream);
  const rawFrame      = useKapStore(s => s.rawFrame);
  const lastQuality   = useKapStore(s => s.lastQuality);
  const payloadSizeKB = useKapStore(s => s.payloadSizeKB);
  const actual_Power_W = useKapStore(s => s.actual_Power_W);
  const deviation_W   = useKapStore(s => s.deviation_W);
  const alertState    = useKapStore(s => s.alertState);
  const season        = useKapStore(s => s.season);

  // Network settings (static demo values)
  const networkConfig = {
    ip: '192.168.1.47',
    port: '4502',
    protocol: 'Modbus TCP',
    rssi: '-68 dBm',
    band: '2.4 GHz',
    ssid: 'KAP_Field_Net',
    sim: 'MCI (Hamrah Aval)',
    signal: '4G / RSRP: -95',
    heartbeat: '10s',
    aggInterval: '15min',
  };

  return (
    <div className="space-y-4">
      {/* Technician Header Bar */}
      <div className="flex items-center gap-3 bg-[#020c03] border border-[#166534] rounded-xl p-3 font-['JetBrains_Mono'] text-xs overflow-x-auto">
        <Terminal size={14} className="text-green-400 shrink-0" />
        <span className="text-green-500">KAP TECH TERMINAL</span>
        <span className="text-[#166534]">|</span>
        <span className="text-[#94a3b8]">season=<span className="text-green-300">{season}</span></span>
        <span className="text-[#166534]">|</span>
        <span className="text-[#94a3b8]">state=<span style={{ color: alertState === 'NORMAL' ? '#22c55e' : '#ef4444' }}>{alertState}</span></span>
        <span className="text-[#166534]">|</span>
        <span className="text-[#94a3b8]">quality=<span className="text-yellow-300">{lastQuality}</span></span>
        <span className="text-[#166534]">|</span>
        <span className="text-[#94a3b8]">payload=<span className="text-blue-300">{payloadSizeKB}KB</span></span>
        <span className="text-[#166534]">|</span>
        <span className="text-[#94a3b8]">Δ=<span style={{ color: deviation_W > 0 ? '#ef4444' : '#22c55e' }}>
          {deviation_W > 0 ? '+' : ''}{deviation_W.toFixed(0)}W
        </span></span>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-[#0d1526] border border-[#1e2d45] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap font-['JetBrains_Mono'] ${
              activeTab === id
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'text-[#475569] hover:text-white'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'datamaker' && <DataMakerPanel />}

        {activeTab === 'gvl' && <GVLMappingEditor />}

        {activeTab === 'alerts' && <AlertStateMachine />}

        {activeTab === 'network' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* PLC Connection */}
            <div className="glass-card p-4 space-y-3">
              <div className="section-header">PLC / RTU Connection</div>
              {[
                ['IP Address', networkConfig.ip],
                ['Port', networkConfig.port],
                ['Protocol', networkConfig.protocol],
                ['Heartbeat Interval', networkConfig.heartbeat],
                ['Aggregation Interval', networkConfig.aggInterval],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e2d45] last:border-0">
                  <span className="text-[11px] text-[#94a3b8] font-['Inter']">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold font-['JetBrains_Mono'] text-green-300">{val}</span>
                    <CopyButton text={val} />
                  </div>
                </div>
              ))}
            </div>

            {/* Wi-Fi / GSM */}
            <div className="glass-card p-4 space-y-3">
              <div className="section-header">Wi-Fi / GSM Settings</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <Wifi size={18} className="text-blue-400 mx-auto mb-1" />
                  <div className="text-[10px] text-blue-400 font-bold font-['JetBrains_Mono']">Wi-Fi</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                  <Network size={18} className="text-orange-400 mx-auto mb-1" />
                  <div className="text-[10px] text-orange-400 font-bold font-['JetBrains_Mono']">GSM/4G</div>
                </div>
              </div>
              {[
                ['SSID', networkConfig.ssid],
                ['RSSI', networkConfig.rssi],
                ['Band', networkConfig.band],
                ['SIM Carrier', networkConfig.sim],
                ['Signal', networkConfig.signal],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e2d45] last:border-0">
                  <span className="text-[11px] text-[#94a3b8] font-['Inter']">{label}</span>
                  <span className="text-[11px] font-bold font-['JetBrains_Mono'] text-blue-300">{val}</span>
                </div>
              ))}
            </div>

            {/* Raw Frame JSON Dump */}
            <div className="xl:col-span-2 glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="section-header">Raw Frame Dump · JSON</div>
                <CopyButton text={JSON.stringify(rawFrame, null, 2)} />
              </div>
              <pre className="hex-terminal text-[11px] overflow-auto max-h-48">
                {JSON.stringify(rawFrame, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-card p-4 space-y-4">
            <div className="section-header">System Configuration</div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {[
                { label: 'Sample Rate', value: '10 seconds', desc: 'Raw telemetry sampling interval' },
                { label: 'Aggregation', value: '15 minutes', desc: 'Decision aggregation window' },
                { label: 'Dwell (Enter)', value: 'N = 3', desc: 'Consecutive samples before ALARM' },
                { label: 'Dwell (Error)', value: 'N = 5', desc: 'ALARM samples before ERROR' },
                { label: 'Dwell (Trip)', value: 'N = 10', desc: 'ERROR samples before TRIP' },
                { label: 'Hysteresis', value: '0.7×', desc: 'Exit = Enter × 0.7' },
                { label: 'Peak Window', value: '17:00 – 22:00', desc: 'Peak tariff window (daily)' },
                { label: 'Pattern Baseline', value: '300 kWh', desc: 'Monthly tariff pattern baseline' },
              ].map(({ label, value, desc }) => (
                <div key={label} className="bg-[#111827] border border-[#1e2d45] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#94a3b8] font-['Inter']">{label}</span>
                    <span className="text-xs font-bold font-['JetBrains_Mono'] text-blue-400">{value}</span>
                  </div>
                  <div className="text-[10px] text-[#475569] font-['Inter']">{desc}</div>
                </div>
              ))}
            </div>

            {/* Absolute Difference Formula Display */}
            <div className="bg-[#020c03] border border-[#166534] rounded-xl p-4 font-['JetBrains_Mono']">
              <div className="text-[10px] text-green-600 mb-3">// ROCKET-SAFE ABSOLUTE DIFFERENCE — No exact equality checks</div>
              <div className="text-xs text-green-300 space-y-1">
                <div><span className="text-green-600">// Breach check (enter):</span></div>
                <div>deviation = Actual_Power_W <span className="text-yellow-400">-</span> Target_Power_W</div>
                <div>isAboveThreshold = deviation <span className="text-yellow-400">&gt;</span> 0 <span className="text-yellow-400">&&</span> Math.abs(deviation) <span className="text-yellow-400">&gt;</span> enterThreshold</div>
                <div className="mt-2 text-green-600">// Exit check:</div>
                <div>isBelowExit = deviation <span className="text-yellow-400">&lt;=</span> 0 <span className="text-yellow-400">||</span> Math.abs(deviation) <span className="text-yellow-400">&lt;=</span> exitThreshold</div>
                <div className="mt-2 text-green-600">// exitThreshold = enterThreshold × {'{'}hysteresisFactor: 0.7{'}'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
