'use client';

import { useEffect, useState } from 'react';

type Event = {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  plan_id: string | null;
  amount: number;
  amount_dollars: string;
  status: string;
  description: string | null;
  created_at: string;
};

type ActiveUser = {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  created_at: string;
};

type Stats = {
  revenueThisMonth: number;
  refundsThisMonth: number;
  totalRevenue: number;
  activePayingUsers: number;
  freeUsers: number;
  planBreakdown: Record<string, number>;
  activeUsersList: ActiveUser[];
  recentEvents: Event[];
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-violet-50 text-violet-700',
  agency: 'bg-amber-50 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  refunded: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-600',
  pending: 'bg-gray-100 text-gray-500',
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const border = color === 'green' ? 'border-t-2 border-t-emerald-500' :
    color === 'blue' ? 'border-t-2 border-t-blue-500' :
    color === 'red' ? 'border-t-2 border-t-red-400' :
    color === 'purple' ? 'border-t-2 border-t-violet-500' : '';
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${border}`}>
      <p className="text-xs font-semibold text-gray-400 mb-3">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminBillingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'transactions' | 'users'>('transactions');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = () => {
    setLoading(true);
    fetch('/api/admin/billing/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);


  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Revenue, active subscriptions, and refunds.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-4"/>
              <div className="h-7 w-16 bg-gray-100 rounded animate-pulse"/>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Revenue This Month" value={`$${stats.revenueThisMonth.toFixed(2)}`} sub="Paid invoices" color="green"/>
            <StatCard label="Refunds This Month" value={`$${stats.refundsThisMonth.toFixed(2)}`} sub="Processed refunds" color="red"/>
            <StatCard label="All-Time Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} sub="Since launch" color="blue"/>
            <StatCard label="Paying Users" value={String(stats.activePayingUsers)} sub={`${stats.freeUsers} on free plan`} color="purple"/>
          </div>

          {/* Plan breakdown */}
          {Object.keys(stats.planBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Active Plan Breakdown</h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <div key={plan} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}>
                    <span className="capitalize">{plan}</span>
                    <span className="opacity-70">· {count} user{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['transactions', 'users'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'transactions' ? 'Recent Transactions' : 'Active Subscribers'}
              </button>
            ))}
          </div>

          {tab === 'transactions' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['User', 'Description', 'Amount', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.recentEvents.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">No transactions yet.</td></tr>
                    ) : stats.recentEvents.map(ev => (
                      <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700 max-w-[160px] truncate">{ev.user_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-600 capitalize">{ev.description || ev.plan_id || ev.type}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900">${ev.amount_dollars}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-300">—</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['User', 'Email', 'Plan', 'Since'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.activeUsersList.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-400">No paying users yet.</td></tr>
                    ) : stats.activeUsersList.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{u.full_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 capitalize ${PLAN_COLORS[u.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400">Failed to load billing data.</p>
      )}
    </main>
  );
}
