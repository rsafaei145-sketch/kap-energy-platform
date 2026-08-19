import React, { useEffect, useRef } from 'react';
import { useKapStore } from './store/kapStore.js';
import TopBar from './components/layout/TopBar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import EndUserDashboard    from './pages/EndUserDashboard.jsx';
import ExpertDashboard     from './pages/ExpertDashboard.jsx';
import TechnicianDashboard from './pages/TechnicianDashboard.jsx';
import './index.css';

const TICK_INTERVAL_MS   = 2000;   // Telemetry every 2 seconds
const CLOCK_INTERVAL_MS  = 1000;   // Clock ticks every second

export default function App() {
  const persona      = useKapStore(s => s.persona);
  const running      = useKapStore(s => s.running);
  const telemetryTick = useKapStore(s => s.telemetryTick);
  const tickClock     = useKapStore(s => s.tickClock);

  // Telemetry simulator interval
  useEffect(() => {
    if (!running) return;
    const id = setInterval(telemetryTick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running, telemetryTick]);

  // Simulated clock
  useEffect(() => {
    const id = setInterval(tickClock, CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tickClock]);

  const dashboards = {
    user:       <EndUserDashboard />,
    expert:     <ExpertDashboard />,
    technician: <TechnicianDashboard />,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#070b14]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="animate-fade-in">
            {dashboards[persona] ?? <ExpertDashboard />}
          </div>
        </main>
      </div>
    </div>
  );
}
