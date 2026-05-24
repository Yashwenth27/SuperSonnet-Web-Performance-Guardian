import React, { useState } from 'react';
import { Settings as SettingsIcon, Terminal, Copy, Check, Chrome, ShieldAlert, Cpu } from 'lucide-react';

export default function Settings() {
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [lcpTarget, setLcpTarget] = useState(2500);
  const [clsTarget, setClsTarget] = useState(0.10);
  const [fidTarget, setFidTarget] = useState(100);

  const sdkCode = `<script src="http://localhost:8000/sdk/perf-sdk.js" defer></script>`;

  const handleCopySdk = () => {
    navigator.clipboard.writeText(sdkCode);
    setCopiedSdk(true);
    setTimeout(() => setCopiedSdk(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Description */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Auditor Configuration & Integrations</h3>
          <p className="text-xs text-slate-400">Configure target metrics thresholds and integrate performance monitoring everywhere.</p>
        </div>
      </div>

      {/* Grid: Threshold configs + Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Vitals Targets Thresholds */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-indigo-400" /> Core Web Vitals targets
          </h4>
          
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Largest Contentful Paint (LCP) Limit</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={lcpTarget} 
                  onChange={(e) => setLcpTarget(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 w-28 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500">ms (Green threshold)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cumulative Layout Shift (CLS) Limit</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="0.01"
                  value={clsTarget} 
                  onChange={(e) => setClsTarget(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 w-28 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500">(Green threshold)</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">First Input Delay (FID) Limit</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={fidTarget} 
                  onChange={(e) => setFidTarget(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 w-28 text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-500">ms (Green threshold)</span>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => alert("Configurations updated locally (demo session).")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Save Thresholds
              </button>
            </div>
          </div>
        </div>

        {/* Drop-in SDK Snippet */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-indigo-400" /> Drop-in HTML SDK
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitor <b>any website</b> by dropping this single line of code into your HTML template. It automatically starts piping LCP, CLS, FID, and JavaScript errors directly into this local instance.
          </p>

          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-center justify-between font-mono text-[10px] text-slate-300">
            <code className="truncate max-w-[280px]">{sdkCode}</code>
            <button
              onClick={handleCopySdk}
              className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Copy SDK code"
            >
              {copiedSdk ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-300 leading-normal">
            💡 The script registers observers in the window scope, so it incurs zero performance overhead and avoids affecting Lighthouse scores.
          </div>
        </div>
      </div>

      {/* Chrome Extension Load Guide */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Chrome className="h-4 w-4 text-indigo-400" /> Chrome Extension Integration (Load anywhere)
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Monitor performance metrics on <b>any website you browse</b> (like Production systems, SaaS platforms, or staging environments) without editing code. Load our pre-compiled Chrome Extension in developer mode:
        </p>

        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
          <li>Open Google Chrome and navigate to <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 font-semibold font-mono text-[10px]">chrome://extensions/</code></li>
          <li>Turn on the <b>Developer Mode</b> toggle switch in the top-right corner of the Extensions dashboard.</li>
          <li>Click the <b>"Load unpacked"</b> button in the top-left area.</li>
          <li>Browse to your local directory and select the folder:
            <code className="bg-slate-950 p-1.5 rounded text-slate-400 font-mono text-[10px] block mt-1">
              C:\Users\yashw\.gemini\antigravity\scratch\compliance_agent_ai\extension
            </code>
          </li>
          <li>Pin the extension! Click the extension popup icon when browsing any web page to see live Core Web Vitals overlays and sync metrics to this dashboard automatically.</li>
        </ol>
      </div>
    </div>
  );
}
