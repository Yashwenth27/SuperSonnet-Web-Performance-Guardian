import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Terminal, 
  MessageSquare, 
  FileText, 
  Settings as SettingsIcon, 
  Activity,
  AlertTriangle,
  FileCode
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import CodeAuditor from './components/CodeAuditor';
import AgentChat from './components/AgentChat';
import ReportList from './components/ReportList';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReportId, setActiveReportId] = useState(null); // For linking directly to auditor
  const [unreadErrorsCount, setUnreadErrorsCount] = useState(0);

  // Check URL params for direct link routing (e.g. from Chrome extension)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const reportParam = params.get('report_id');
    
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (reportParam) {
      setActiveReportId(parseInt(reportParam));
      setActiveTab('auditor');
    }
  }, []);

  // Poll JS error counts to update notification badges
  useEffect(() => {
    const fetchErrorCount = () => {
      fetch('/api/errors')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUnreadErrorsCount(data.filter(e => !e.resolved).length);
          }
        })
        .catch(err => console.debug("Failed fetching errors count", err));
    };

    fetchErrorCount();
    const interval = setInterval(fetchErrorCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'auditor':
        return <CodeAuditor reportId={activeReportId} setReportId={setActiveReportId} />;
      case 'chat':
        return <AgentChat />;
      case 'reports':
        return <ReportList setActiveTab={setActiveTab} setActiveReportId={setActiveReportId} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Telemetry Dashboard', icon: BarChart3 },
    { id: 'auditor', label: 'AI Code Auditor', icon: FileCode },
    { id: 'chat', label: 'Agent Workspace', icon: MessageSquare },
    { id: 'reports', label: 'Audit Reports', icon: FileText },
    { id: 'settings', label: 'Rules & Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-10">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-white tracking-wide">ComplianceAgent</h1>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Perf Auditor</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== 'auditor') setActiveReportId(null);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 gap-3 group relative ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-300 border-l-[3px] border-indigo-500 rounded-l-none' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                  <span>{item.label}</span>

                  {/* JS Errors badge */}
                  {item.id === 'dashboard' && unreadErrorsCount > 0 && (
                    <span className="ml-auto bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold pulse-red">
                      {unreadErrorsCount} Err
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-850">
          <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/40">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse pulse-green" />
            <div>
              <div className="text-xs font-semibold text-slate-300">Local Daemon</div>
              <div className="text-[10px] text-slate-500">Connected to :8000</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Core Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-wide uppercase text-slate-200">
            {activeTab === 'dashboard' && 'Telemetry Monitoring Dashboard'}
            {activeTab === 'auditor' && 'AI Source Code Auditor'}
            {activeTab === 'chat' && 'LangChain Agent Workspace'}
            {activeTab === 'reports' && 'Compliance Risk Reports'}
            {activeTab === 'settings' && 'System Rules & Configurations'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md text-slate-400">
              Environment: <span className="font-semibold text-slate-300">Localhost</span>
            </div>
            <a 
              href="/sdk/perf-sdk.js" 
              download="perf-sdk.js"
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-md transition-all duration-150 flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
            >
              <Terminal className="h-3 w-3" /> Download Drop-in SDK
            </a>
          </div>
        </header>

        {/* View Component Wrapper */}
        <div className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
