import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  Activity, Gauge, ShieldAlert, Cpu, 
  RefreshCw, Play, Square, Eye, CheckCircle2, AlertOctagon, Trash2 
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [metrics, setMetrics] = useState([]);
  const [errors, setErrors] = useState([]);
  const [activeUrl, setActiveUrl] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTimer, setStreamTimer] = useState(null);

  // Load telemetry metrics and errors on startup
  const fetchData = async () => {
    try {
      const [mRes, eRes] = await Promise.all([
        fetch('/api/metrics?limit=500'),
        fetch('/api/errors?limit=500&include_resolved=true')
      ]);
      const mData = await mRes.json();
      const eData = await eRes.json();
      
      if (Array.isArray(mData)) setMetrics(mData);
      if (Array.isArray(eData)) setErrors(eData);
    } catch (err) {
      console.error("Failed to load dashboard logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Traffic Stream Simulator: posts metrics and random errors periodically
  const toggleStreaming = () => {
    if (isStreaming) {
      clearInterval(streamTimer);
      setIsStreaming(false);
      setStreamTimer(null);
    } else {
      setIsStreaming(true);
      const urls = [
        'http://localhost:3000/home',
        'http://localhost:3000/pricing',
        'http://localhost:3000/checkout',
        'http://localhost:3000/dashboard'
      ];
      
      const timer = setInterval(async () => {
        // Generate random performance metrics
        const targetUrl = urls[Math.floor(Math.random() * urls.length)];
        const isAnomaly = Math.random() > 0.8; // 20% chance of regression
        
        const payload = {
          url: targetUrl,
          lcp: isAnomaly ? 3800 + Math.random() * 1200 : 1200 + Math.random() * 900,
          cls: isAnomaly ? 0.28 + Math.random() * 0.15 : 0.02 + Math.random() * 0.05,
          fid: isAnomaly ? 240 + Math.random() * 100 : 25 + Math.random() * 30,
          fcp: isAnomaly ? 2200 + Math.random() * 800 : 800 + Math.random() * 400,
          load_time: isAnomaly ? 4500 + Math.random() * 2000 : 1800 + Math.random() * 1000
        };

        try {
          await fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          // Random JavaScript Error injection (10% chance)
          if (Math.random() > 0.9) {
            const errorTypes = [
              { message: "TypeError: Cannot read properties of undefined (reading 'map')", stack: "TypeError: Cannot read properties of undefined (reading 'map')\n  at UserList.jsx:24:18\n  at commitHookEffectListMount (react-dom.development.js:23150)" },
              { message: "ReferenceError: process is not defined", stack: "ReferenceError: process is not defined\n  at config.js:4:12\n  at bootstrap.js:14:1" },
              { message: "Unhandled Rejection (Error): API Request failed with status 503", stack: "Error: API Request failed with status 503\n  at api.js:12:15\n  at async loadUserData (UserList.jsx:8:14)" }
            ];
            const err = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            
            await fetch('/api/errors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: targetUrl,
                message: err.message,
                stack_trace: err.stack,
                browser_info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0"
              })
            });
          }

          fetchData();
        } catch (e) {
          console.debug("Failed streaming mock event:", e);
        }
      }, 2000);
      
      setStreamTimer(timer);
    }
  };

  useEffect(() => {
    return () => {
      if (streamTimer) clearInterval(streamTimer);
    };
  }, [streamTimer]);

  const resolveError = async (id) => {
    try {
      await fetch(`/api/errors/${id}/resolve`, { method: 'PUT' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Clear ALL metrics and errors? This resets the dashboard to a clean state.')) return;
    try {
      await Promise.all([
        fetch('/api/metrics', { method: 'DELETE' }),
        fetch('/api/errors', { method: 'DELETE' })
      ]);
      setMetrics([]);
      setErrors([]);
      setActiveUrl('All');
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  };

  // Filter metrics & calculate stats
  const uniqueUrls = ['All', ...new Set(metrics.map(m => m.url))];
  const filteredMetrics = activeUrl === 'All' 
    ? metrics 
    : metrics.filter(m => m.url === activeUrl);

  const calculateAverages = () => {
    if (filteredMetrics.length === 0) return { lcp: 0, cls: 0, fid: 0, load: 0, score: 100 };
    
    let sumLcp = 0, sumCls = 0, sumFid = 0, sumLoad = 0;
    let countsLcp = 0, countsCls = 0, countsFid = 0, countsLoad = 0;

    filteredMetrics.forEach(m => {
      if (m.lcp) { sumLcp += m.lcp; countsLcp++; }
      if (m.cls !== null) { sumCls += m.cls; countsCls++; }
      if (m.fid) { sumFid += m.fid; countsFid++; }
      if (m.load_time) { sumLoad += m.load_time; countsLoad++; }
    });

    const avgLcp = countsLcp ? sumLcp / countsLcp : 0;
    const avgCls = countsCls ? sumCls / countsCls : 0;
    const avgFid = countsFid ? sumFid / countsFid : 0;
    const avgLoad = countsLoad ? sumLoad / countsLoad : 0;

    // Standard scoring logic (Lighthouse weightings approximation)
    // LCP (40%), CLS (40%), FID (20%)
    let lcpScore = avgLcp <= 2500 ? 100 : avgLcp >= 4000 ? 40 : 100 - ((avgLcp - 2500) / 1500) * 60;
    let clsScore = avgCls <= 0.1 ? 100 : avgCls >= 0.25 ? 40 : 100 - ((avgCls - 0.1) / 0.15) * 60;
    let fidScore = avgFid <= 100 ? 100 : avgFid >= 300 ? 40 : 100 - ((avgFid - 100) / 200) * 60;

    const finalScore = Math.round((lcpScore * 0.4) + (clsScore * 0.4) + (fidScore * 0.2));

    return {
      lcp: Math.round(avgLcp),
      cls: parseFloat(avgCls.toFixed(3)),
      fid: Math.round(avgFid),
      load: Math.round(avgLoad),
      score: Math.max(10, Math.min(100, finalScore))
    };
  };

  const stats = calculateAverages();

  // Status mapping
  const getRiskStatus = (score) => {
    if (score >= 90) return { label: 'GREEN', text: 'Good / Compliant', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10', dot: 'bg-emerald-500 pulse-green' };
    if (score >= 60) return { label: 'AMBER', text: 'Needs Improvement', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', dot: 'bg-amber-500 pulse-amber' };
    return { label: 'RED', text: 'High Risk / Non-Compliant', color: 'text-rose-400 border-rose-500/20 bg-rose-500/10', dot: 'bg-rose-500 pulse-red' };
  };

  const risk = getRiskStatus(stats.score);

  // Group metrics chronologically for Recharts (limit to last 15 items for readability)
  const chartData = [...filteredMetrics]
    .reverse()
    .slice(-15)
    .map(m => ({
      name: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      LCP: m.lcp ? Math.round(m.lcp) : null,
      CLS: m.cls !== null ? parseFloat((m.cls * 10000).toFixed(0)) / 10000 : null, // scaled for readability
      Load: m.load_time ? Math.round(m.load_time) : null
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Simulation and Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Live Stream Controller</h3>
            <p className="text-xs text-slate-400">Generate simulated user clicks to test the metric pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active filter */}
          <select 
            value={activeUrl}
            onChange={(e) => setActiveUrl(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs px-3 py-2 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {uniqueUrls.map(u => (
              <option key={u} value={u}>{u.replace('http://localhost:3000', '')}</option>
            ))}
          </select>

          <button
            onClick={toggleStreaming}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-all duration-200 ${
              isStreaming 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/15'
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="h-3 w-3 fill-rose-400" /> Stop Simulator
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-white" /> Start Traffic Stream
              </>
            )}
          </button>
          
          <button 
            onClick={fetchData}
            className="p-2 border border-slate-800 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button 
            onClick={clearAllData}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Clear All Data"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>
      </div>

      {/* Grid: Overview Risk Badge + Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Score & Risk Audit Card */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between h-[210px] ${risk.color} transition-all duration-300 relative overflow-hidden`}>
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
            <Cpu className="h-32 w-32" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Compliance Audit Status</span>
            <h4 className="text-3xl font-extrabold tracking-tight mt-1 text-white">{stats.score}<span className="text-sm font-medium text-slate-400">/100</span></h4>
            <div className="flex items-center gap-2 mt-2">
              <span className={`h-2.5 w-2.5 rounded-full ${risk.dot}`} />
              <span className="text-xs font-bold uppercase tracking-wider">{risk.text}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-500/10">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Overall score computed against Core Web Vitals targets. Run audits on source code to generate optimization patches.
            </p>
          </div>
        </div>

        {/* Metric Gauge Cards */}
        {[
          { label: 'Largest Contentful Paint', value: stats.lcp ? `${(stats.lcp / 1000).toFixed(2)}s` : '--', sub: 'LCP (Target <= 2.5s)', target: stats.lcp, maxG: 2500, maxA: 4000 },
          { label: 'Cumulative Layout Shift', value: stats.cls !== undefined ? stats.cls : '--', sub: 'CLS (Target <= 0.10)', target: stats.cls, maxG: 0.10, maxA: 0.25 },
          { label: 'First Input Delay', value: stats.fid ? `${stats.fid}ms` : stats.fcp ? `~${(stats.fcp * 0.05).toFixed(0)}ms` : '--', sub: 'Est. FID (Target <= 100ms)', target: stats.fid || (stats.fcp ? stats.fcp * 0.05 : null), maxG: 100, maxA: 300 },
        ].map((g, idx) => {
          let dotColor = 'bg-slate-500';
          if (g.target !== null && g.target !== undefined) {
            if (g.target <= g.maxG) dotColor = 'bg-emerald-500 pulse-green';
            else if (g.target <= g.maxA) dotColor = 'bg-amber-500 pulse-amber';
            else dotColor = 'bg-rose-500 pulse-red';
          }
          return (
            <div key={idx} className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between h-[210px] glass-card-hover">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{g.label}</span>
                  <div className="text-2xl font-black mt-2 text-white">{g.value}</div>
                  <span className="text-[10px] text-slate-500 mt-1 block">{g.sub}</span>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-4">
                <div 
                  className={`h-full rounded-full ${
                    dotColor.includes('green') ? 'bg-emerald-500' : dotColor.includes('amber') ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ 
                    width: g.target 
                      ? `${Math.min(100, (g.target / (g.maxA * 1.5)) * 100)}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Charts & Errors */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Telemetry Charts */}
        <div className="xl:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-sm text-white">Core Web Vitals Trend</h3>
              <p className="text-xs text-slate-400">Captured load times & rendering shift trends over time</p>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-semibold uppercase">
              15-Event Window
            </span>
          </div>

          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No telemetry recorded. Start the Traffic Stream to feed charts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLCP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="LCP" stroke="#6366F1" fillOpacity={1} fill="url(#colorLCP)" name="LCP (ms)" />
                  <Area type="monotone" dataKey="Load" stroke="#A855F7" fillOpacity={1} fill="url(#colorLoad)" name="Load Time (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Exceptions Log */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div>
              <h3 className="font-bold text-sm text-white">JS Runtime Errors</h3>
              <p className="text-xs text-slate-400">Captured exceptions from window.onerror listener</p>
            </div>
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {errors.filter(e => !e.resolved).length} Unresolved
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {errors.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
                <span className="text-xs">No exceptions recorded. The application execution threads are error-free.</span>
              </div>
            ) : (
              errors.map((err) => (
                <div 
                  key={err.id} 
                  className={`p-3.5 rounded-xl border text-xs relative ${
                    err.resolved 
                      ? 'bg-slate-900/40 border-slate-900 text-slate-500' 
                      : 'bg-rose-500/5 border-rose-500/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`font-mono font-bold tracking-tight break-all ${err.resolved ? 'text-slate-500 line-through' : 'text-rose-400'}`}>
                      {err.message}
                    </span>
                    {!err.resolved && (
                      <button 
                        onClick={() => resolveError(err.id)}
                        className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 px-2 py-0.5 rounded-md transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-500 flex justify-between items-center mt-2 pt-2 border-t border-slate-800/60 font-mono">
                    <span className="truncate max-w-[150px]">{err.url.replace('http://localhost:3000', '')}</span>
                    <span>{new Date(err.created_at).toLocaleTimeString()}</span>
                  </div>

                  {!err.resolved && err.stack_trace && (
                    <pre className="mt-2 p-2 bg-slate-950/60 border border-slate-900 rounded font-mono text-[9px] overflow-x-auto text-slate-400 leading-normal max-h-24">
                      {err.stack_trace}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
