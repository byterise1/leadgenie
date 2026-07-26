'use client';

import { useMemo, useState } from 'react';
import { checkDeliverability, riskLabel } from '@/lib/deliverability-check';
import { domainFromEmail } from '@/lib/personal-webmail';

type SenderAccount = { email: string };

const TONE_COLOR: Record<string, string> = {
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  moderate: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-red-700 bg-red-50 border-red-200',
};

export default function DeliverabilityCheckPanel({
  subject,
  body,
  includeTracking,
  senderAccounts,
}: {
  subject: string;
  body: string;
  includeTracking: boolean;
  senderAccounts: SenderAccount[];
}) {
  const [open, setOpen] = useState(false);

  const result = useMemo(() => {
    const senderDomains = senderAccounts.map(a => domainFromEmail(a.email)).filter((d): d is string => !!d);
    return checkDeliverability({ subject, body, includeTracking, senderDomains });
  }, [subject, body, includeTracking, senderAccounts]);

  const risk = riskLabel(result.score);

  return (
    <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Check Deliverability</span>
        <span className="flex items-center gap-2">
          <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border ${TONE_COLOR[risk.tone]}`}>
            {result.score}% — {risk.text}
          </span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {result.flags.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No risk factors found in this content or sending setup.</p>
          ) : (
            result.flags.map((flag, i) => (
              <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="font-semibold text-gray-700 dark:text-gray-200">{flag.label} <span className="text-gray-400 font-normal">(−{flag.penalty})</span></p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{flag.detail}</p>
              </div>
            ))
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">This is informational only — based on real A/B tests, not a guarantee. Nothing here blocks sending.</p>
        </div>
      )}
    </div>
  );
}
