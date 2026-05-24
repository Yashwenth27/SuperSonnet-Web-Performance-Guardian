import React, { useState, useEffect } from 'react';
import { 
  FileCode, Play, CheckCircle, AlertTriangle, 
  HelpCircle, Sparkles, Code, ChevronRight, ArrowRight
} from 'lucide-react';

export default function CodeAuditor({ reportId, setReportId }) {
  const [code, setCode] = useState(
`import React from 'react';

export default function HeroBanner() {
  return (
    <div className="hero-container">
      {/* Visual layout shifts might occur here */}
      <img src="https://example.com/banner.jpg" />
      
      <h1>Welcome to ComplianceAgent AI</h1>
      <p>Analyze Core Web Vitals automatically.</p>
    </div>
  );
}`
  );
  
  const [filename, setFilename] = useState('HeroBanner.jsx');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  // Load report by ID if passed from parent
  useEffect(() => {
    if (reportId) {
      loadReportById(reportId);
    }
  }, [reportId]);

  const loadReportById = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${id}`);
      if (res.ok) {
        const data = await res.ok ? await res.json() : null;
        if (data) {
          setReport(data);
          // Set simulated repo path as filename if it exists
          if (data.repo_path) setFilename(data.repo_path);
        }
      }
    } catch (err) {
      console.error("Failed to load audit report:", err);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    setLoading(true);
    setReport(null);
    try {
      const response = await fetch('/api/audits/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_snippet: code,
          filename: filename
        })
      });
      const data = await response.json();
      setReport(data);
    } catch (e) {
      console.error(e);
      alert("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyles = (risk) => {
    switch (risk) {
      case 'GREEN':
        return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-500 pulse-green', text: 'Compliant' };
      case 'AMBER':
        return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', dot: 'bg-amber-500 pulse-amber', text: 'Needs Tuning' };
      case 'RED':
        return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', dot: 'bg-rose-500 pulse-red', text: 'Non-Compliant' };
      default:
        return { bg: 'bg-slate-800 border-slate-700 text-slate-400', dot: 'bg-slate-400', text: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner explaining code auditor */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">AI Optimization Auditor</h3>
          <p className="text-xs text-slate-400">Pasted components are audited against Core Web Vitals standards to suggest instant, side-by-side code corrections.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Block */}
        <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-indigo-400" />
              <input 
                value={filename} 
                onChange={(e) => setFilename(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-200 border-none outline-none focus:ring-1 focus:ring-slate-850 px-1 py-0.5 rounded w-44"
              />
            </div>
            
            <button
              onClick={runAudit}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4.5 py-1.5 rounded-lg shadow-md shadow-indigo-600/15 transition-all"
            >
              {loading ? (
                <span>Auditing...</span>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-white" /> Audit Code
                </>
              )}
            </button>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-6 bg-slate-950 font-mono text-xs leading-relaxed text-slate-300 outline-none resize-none border-none overflow-y-auto"
            placeholder="Paste code or React components here..."
          />
        </div>

        {/* Audit Results Panel */}
        <div className="h-[600px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="h-10 w-10 border-4 border-t-indigo-500 border-r-indigo-500/20 border-b-indigo-500/20 border-l-indigo-500/20 rounded-full animate-spin mb-4" />
              <h4 className="text-sm font-semibold text-white">Compliance Auditor Running</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                Scanning AST tags, checking layout width/height properties, evaluating dependency imports, and compiling optimization patches...
              </p>
            </div>
          ) : report ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl">
              {/* Header: Score and status */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Performance Compliance Score</span>
                  <div className="text-2xl font-black mt-1 text-white">
                    {report.score}<span className="text-xs font-semibold text-slate-400">/100</span>
                  </div>
                </div>
                
                {(() => {
                  const s = getRiskStyles(report.risk_level);
                  return (
                    <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 ${s.bg}`}>
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">{s.text}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Scrollable Results */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Issues List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detected Regressions</h4>
                  <div className="space-y-3">
                    {report.issues.map((issue, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-850">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <span className="font-bold text-slate-200 text-xs">{issue.title}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                            issue.impact === 'High' 
                              ? 'bg-rose-500/10 border-rose-550/20 text-rose-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {issue.impact} Impact
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">{issue.description}</p>
                        <span className="inline-block mt-2 text-[9px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-md font-semibold uppercase">
                          {issue.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proposed Diffs */}
                {report.code_fixes && report.code_fixes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Suggested Code Corrections</h4>
                    <div className="space-y-4">
                      {report.code_fixes.map((fix, idx) => (
                        <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                          <div className="p-3 bg-slate-900 border-b border-slate-850">
                            <span className="text-[11px] font-semibold text-indigo-400 block">{fix.description}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 text-[10px] font-mono leading-relaxed divide-y md:divide-y-0 md:divide-x divide-slate-850">
                            <div className="p-4">
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block mb-2">Original</span>
                              <pre className="bg-rose-950/20 border border-rose-900/30 p-3 rounded overflow-x-auto text-slate-400 whitespace-pre">
                                {fix.original_code}
                              </pre>
                            </div>
                            
                            <div className="p-4">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">Optimized</span>
                              <pre className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded overflow-x-auto text-slate-200 whitespace-pre">
                                {fix.replacement_code}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
              <FileCode className="h-10 w-10 text-slate-500 mb-3" />
              <h4 className="text-sm font-semibold text-white font-medium">Ready to Audit</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                Paste or modify your React/HTML source code in the editor pane and click 'Audit Code' to trigger the LangChain advisor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
