'use client';

import { useState, useRef } from 'react';

export default function SmtpTestPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    result: 'valid' | 'invalid' | 'unknown';
    verdict: string;
    dialog: string[];
    duration_ms: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    const e = email.trim();
    if (!e) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/smtp-test?email=${encodeURIComponent(e)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ result: 'unknown', verdict: 'Fetch error — check console', dialog: [], duration_ms: 0 });
    } finally {
      setLoading(false);
    }
  };

  const verdictColor =
    result?.result === 'valid' ? 'text-emerald-400' :
    result?.result === 'invalid' ? 'text-red-400' :
    'text-yellow-400';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-lg font-bold text-white">SMTP Port 25 Test</h1>
          <p className="text-xs text-gray-400 mt-1">Routes through Hetzner SOCKS5 (157.180.121.10:1080) → domain:25 directly</p>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && run()}
            placeholder="email@domain.com"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={run}
            disabled={loading || !email.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? 'Testing…' : 'Test'}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-gray-400 animate-pulse">
            Connecting via Hetzner SOCKS5 → port 25…
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Verdict banner */}
            <div className={`border rounded-xl px-4 py-3 text-sm font-bold ${
              result.result === 'valid'   ? 'border-emerald-700 bg-emerald-950' :
              result.result === 'invalid' ? 'border-red-800 bg-red-950' :
                                            'border-yellow-700 bg-yellow-950'
            }`}>
              <span className={verdictColor}>{result.verdict}</span>
              <span className="ml-3 text-xs font-normal text-gray-400">{result.duration_ms}ms</span>
            </div>

            {/* SMTP dialog */}
            {result.dialog.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto">
                {result.dialog.map((line, i) => {
                  const isOut = line.startsWith('→');
                  const isIn  = line.startsWith('←');
                  const isErr = line.startsWith('ERROR');
                  return (
                    <div key={i} className={
                      isOut ? 'text-cyan-400' :
                      isIn  ? 'text-gray-200' :
                      isErr ? 'text-red-400' :
                              'text-gray-500'
                    }>
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-600">Temp test page — remove after verifying proxy works.</p>
      </div>
    </div>
  );
}
