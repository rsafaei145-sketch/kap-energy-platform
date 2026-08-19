import React, { useState } from 'react';
import { useKapStore } from '../../store/kapStore.js';
import {
  LayoutDashboard, Radio, Map, Cpu, FileText,
  MessageSquare, Settings, ChevronLeft, ChevronRight,
  GitBranch, BarChart3, Sliders
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'داشبورد',        icon: LayoutDashboard },
  { id: 'datamaker',   label: 'شبیه‌ساز داده',   icon: Radio },
  { id: 'dispatching', label: 'نمای دیسپچینگ',  icon: Map },
  { id: 'pilot',       label: 'پایلوت اتاق',    icon: Cpu },
  { id: 'mobile',      label: 'کنترل موبایل',   icon: Sliders },
  { id: 'mapping',     label: 'نقشه‌برداری GVL', icon: GitBranch },
  { id: 'report',      label: 'گزارش M&V',       icon: FileText },
  { id: 'ai',          label: 'مشاور هوشمند',    icon: MessageSquare },
  { id: 'settings',    label: 'تنظیمات',         icon: Settings },
];

export default function Sidebar({ activeSection, onSectionChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive]       = useState('dashboard');

  const persona = useKapStore(s => s.persona);
  const alertState = useKapStore(s => s.alertState);

  // Filter nav based on persona
  const visibleItems = NAV_ITEMS.filter(item => {
    if (persona === 'user') return ['dashboard', 'report', 'ai'].includes(item.id);
    if (persona === 'expert') return ['dashboard', 'dispatching', 'pilot', 'mobile', 'report', 'ai'].includes(item.id);
    return true; // technician sees all
  });

  const handleClick = (id) => {
    setActive(id);
    onSectionChange?.(id);
  };

  return (
    <aside
      className={`flex flex-col border-r border-[#1e2d45] bg-[#0d1526] shrink-0 transition-all duration-300 overflow-hidden ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-end p-3 text-[#475569] hover:text-white transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-2 flex-1 overflow-y-auto pb-4">
        {visibleItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`sidebar-item w-full text-right justify-start ${active === id ? 'active' : ''}`}
            title={collapsed ? label : ''}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
            {/* Alert badge on dashboard item */}
            {id === 'dashboard' && alertState !== 'NORMAL' && !collapsed && (
              <span className={`mr-auto text-[10px] font-bold px-1.5 rounded font-['JetBrains_Mono'] ${
                alertState === 'TRIP'  ? 'bg-red-500/20 text-red-400' :
                alertState === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {alertState}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom version */}
      {!collapsed && (
        <div className="p-3 border-t border-[#1e2d45]">
          <div className="text-[10px] text-[#475569] font-['JetBrains_Mono']">KAP v1.0.0-MVP</div>
          <div className="text-[10px] text-[#334155] font-['JetBrains_Mono']">West Tehran DC</div>
        </div>
      )}
    </aside>
  );
}
