import React, { useState } from 'react';
import { useKapStore } from '../../store/kapStore.js';
import { exportGVLMap } from '../../engine/gvlMappingEngine.js';
import { GitBranch, Download, RefreshCw, CheckCircle, Edit3 } from 'lucide-react';

export default function GVLMappingEditor() {
  const gvlState       = useKapStore(s => s.gvlState);
  const loadState      = useKapStore(s => s.loadState);
  const applyGVLMapping = useKapStore(s => s.applyGVLMapping);
  const resetGVLMapping = useKapStore(s => s.resetGVLMapping);

  const [editingAddr, setEditingAddr]   = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [saved, setSaved] = useState(null);

  const handleEdit = (addr) => {
    setEditingAddr(addr);
    setEditingLabel(gvlState[addr].customFarsiLabel ?? gvlState[addr].farsiLabel);
  };

  const handleSave = (addr) => {
    applyGVLMapping(addr, editingLabel);
    setEditingAddr(null);
    setSaved(addr);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleExport = () => {
    const json = exportGVLMap(gvlState);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'kap_gvl_map.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const entries = Object.entries(gvlState);

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <GitBranch size={14} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">GVL Mapping Editor</h3>
            <p className="text-[11px] text-[#94a3b8]">نقشه‌برداری رجیسترهای MX به برچسب‌های فارسی</p>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#1e2d45] text-[#94a3b8] hover:text-white hover:border-[#2d4a6e] transition-all">
          <Download size={12} /> خروجی JSON
        </button>
      </div>

      {/* Principle Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-[11px] text-blue-300" dir="rtl">
        <strong>اصل کمینه‌سازی:</strong> در شبکه، فقط آدرس‌های کوتاه MX منتقل می‌شود.
        برچسب‌های فارسی فقط در لایه رندر UI اعمال می‌شوند.
      </div>

      {/* Mapping Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e2d45]">
              <th className="text-left py-2 px-2 text-[#475569] font-['Inter'] font-medium">Address</th>
              <th className="text-right py-2 px-2 text-[#475569] font-['Vazirmatn'] font-medium">برچسب فارسی</th>
              <th className="text-left py-2 px-2 text-[#475569] font-['Inter'] font-medium">Type</th>
              <th className="text-right py-2 px-2 text-[#475569] font-['Vazirmatn'] font-medium">محدوده</th>
              <th className="text-center py-2 px-2 text-[#475569] font-['Inter'] font-medium">Source</th>
              <th className="text-center py-2 px-2 text-[#475569] font-['Inter'] font-medium">Status</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map(([addr, entry]) => {
              const load = loadState[addr];
              const isOn = load?.state === 'ON';
              const isEditing = editingAddr === addr;
              const isSaved   = saved === addr;

              return (
                <tr key={addr} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                  {/* Address */}
                  <td className="py-2 px-2">
                    <span className="font-['JetBrains_Mono'] font-bold text-blue-400">{addr}</span>
                  </td>

                  {/* Farsi Label */}
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          dir="rtl"
                          className="kap-input w-36 text-xs"
                          value={editingLabel}
                          onChange={e => setEditingLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSave(addr)}
                          autoFocus
                        />
                        <button onClick={() => handleSave(addr)} className="btn-primary text-[10px] px-2 py-1">
                          ذخیره
                        </button>
                      </div>
                    ) : (
                      <span className="text-white font-['Vazirmatn']">
                        {entry.customFarsiLabel ?? entry.farsiLabel}
                        {isSaved && <CheckCircle size={10} className="inline mr-1 text-green-400" />}
                      </span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-2 px-2">
                    <span className="text-[#94a3b8] font-['Inter']">{entry.type}</span>
                  </td>

                  {/* Area */}
                  <td className="py-2 px-2 text-right">
                    <span className="text-[#94a3b8] font-['Vazirmatn']">{entry.area}</span>
                  </td>

                  {/* Source Badge */}
                  <td className="py-2 px-2 text-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-['JetBrains_Mono'] ${
                      entry.source === 'MANUAL'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {entry.source}
                    </span>
                  </td>

                  {/* Active Status */}
                  <td className="py-2 px-2 text-center">
                    <div className={`status-dot mx-auto ${isOn ? 'healthy' : 'text-gray-500'}`}
                      style={!isOn ? { background: '#374151', boxShadow: 'none' } : {}} />
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleEdit(addr)}
                        className="p-1 rounded text-[#475569] hover:text-blue-400 transition-colors"
                        title="ویرایش"
                      >
                        <Edit3 size={12} />
                      </button>
                      {entry.source === 'MANUAL' && (
                        <button
                          onClick={() => resetGVLMapping(addr)}
                          className="p-1 rounded text-[#475569] hover:text-orange-400 transition-colors"
                          title="بازنشانی به AUTO"
                        >
                          <RefreshCw size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-[#334155] font-['JetBrains_Mono'] border-t border-[#1e2d45] pt-2">
        {entries.filter(([, e]) => e.source === 'MANUAL').length} manual override(s) active
        · {entries.filter(([, e]) => e.active).length} registers active
      </div>
    </div>
  );
}
