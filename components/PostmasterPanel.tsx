'use client';

import { useEffect, useState } from 'react';

type DomainStats = {
  domain: string;
  date: string | null;
  userReportedSpamRatio: number | null;
  domainReputation: string | null;
  ipReputations: { reputation: string; ipCount: number }[];
  spfSuccessRatio: number | null;
  dkimSuccessRatio: number | null;
  dmarcSuccessRatio: number | null;
  inboundEncryptionRatio: number | null;
  outboundEncryptionRatio: number | null;
};

type Status = {
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  domains?: DomainStats[];
  error?: string;
};

const REPUTATION_COLOR: Record<string, string> = {
  HIGH: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-orange-700 bg-orange-50 border-orange-200',
  BAD: 'text-red-700 bg-red-50 border-red-200',
};

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function ReputationBadge({ value }: { value: string | null }) {
  if (!value || value === 'REPUTATION_CATEGORY_UNSPECIFIED') {
    return <span className="text-[10px] font-bold rounded-full px-2.5 py-1 border text-gray-400 bg-gray-50 border-gray-200">No data</span>;
  }
  return (
    <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border capitalize ${REPUTATION_COLOR[value] || 'text-gray-500 bg-gray-50 border-gray-200'}`}>
      {value.toLowerCase()}
    </span>
  );
}

export default function PostmasterPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = () => {
    fetch('/api/postmaster/domains')
      .then(r => r.json())
      .then(d => setStatus(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    await fetch('/api/postmaster/domains', { method: 'DELETE' });
    setStatus({ connected: false });
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-6 animate-pulse">
        <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
        <div className="h-3 w-80 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Google Postmaster Tools</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Free, official Gmail reputation data for domains you own and have verified in Postmaster Tools. Personal @gmail.com sending accounts aren&apos;t covered — only custom domains.
          </p>
        </div>
        {status?.connected ? (
          <button onClick={disconnect} disabled={disconnecting}
            className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors px-3 py-2 border border-gray-200 rounded-xl shrink-0 disabled:opacity-50">
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <a href="/api/postmaster/oauth/google"
            className="flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm w-fit shrink-0">
            Connect Google Account
          </a>
        )}
      </div>

      {status?.error === 'not_migrated' && (
        <p className="text-xs text-amber-600 font-semibold mt-3">
          Setup incomplete: run migration <code className="bg-amber-50 px-1 rounded">20260716_postmaster_tools.sql</code> in Supabase → SQL Editor, then reload this page.
        </p>
      )}

      {status?.connected && status.error && status.error !== 'not_migrated' && (
        <p className="text-xs text-red-500 font-semibold mt-3">Couldn&apos;t load reputation data: {status.error}</p>
      )}

      {status?.connected && !status.error && (status.domains?.length ?? 0) === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Connected as {status.googleEmail}, but no verified domains found. Add and verify a domain at{' '}
          <a href="https://postmaster.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">postmaster.google.com</a>{' '}
          first — data only starts appearing once you send meaningful volume to Gmail from it.
        </p>
      )}

      {status?.connected && (status.domains?.length ?? 0) > 0 && (
        <div className="overflow-x-auto mt-4 -mx-1">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <th className="px-3 py-2 text-left">Domain</th>
                <th className="px-3 py-2 text-left">Reputation</th>
                <th className="px-3 py-2 text-left">Spam Rate</th>
                <th className="px-3 py-2 text-left">SPF</th>
                <th className="px-3 py-2 text-left">DKIM</th>
                <th className="px-3 py-2 text-left">DMARC</th>
                <th className="px-3 py-2 text-left">As of</th>
              </tr>
            </thead>
            <tbody>
              {status.domains!.map(d => (
                <tr key={d.domain} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white">{d.domain}</td>
                  <td className="px-3 py-3"><ReputationBadge value={d.domainReputation} /></td>
                  <td className="px-3 py-3 text-sm">
                    {d.userReportedSpamRatio === null ? '—' : (
                      <span className={d.userReportedSpamRatio > 0.003 ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-200'}>
                        {(d.userReportedSpamRatio * 100).toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{pct(d.spfSuccessRatio)}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{pct(d.dkimSuccessRatio)}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{pct(d.dmarcSuccessRatio)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">{d.date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 px-3">
            Google&apos;s own guidance: keep spam rate under 0.3% — above that, Gmail meaningfully throttles or spam-folders mail from that domain.
          </p>
        </div>
      )}
    </div>
  );
}
