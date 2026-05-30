'use client';

import { motion } from 'framer-motion';

export function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="card-surface overflow-hidden rounded-[40px] border border-slate-200/75 p-6 shadow-glow"
    >
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
          <div className="mb-6 flex items-center justify-between text-sm uppercase tracking-[0.24em] text-slate-300">
            <span>Performance dashboard</span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-white">Realtime</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold">92.7%</p>
              <p className="mt-2 text-sm text-slate-400">Inbox placement prediction</p>
            </div>
            <div className="rounded-3xl bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-200">+21% QoQ</div>
          </div>
          <div className="mt-10 h-[220px] rounded-[28px] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Leads captured</span>
              <span>Last 30 days</span>
            </div>
            <div className="relative mt-6 h-full">
              <div className="absolute left-0 top-0 h-full w-full rounded-[24px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_45%)]" />
              <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-white/10" />
              <div className="absolute left-4 bottom-6 flex h-3 gap-2">
                <span className="block h-full w-10 rounded-full bg-slate-300/70" />
                <span className="block h-full w-14 rounded-full bg-slate-300/80" />
                <span className="block h-full w-8 rounded-full bg-slate-300/50" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[32px] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
              <span>Connected accounts</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em]">stable</span>
            </div>
            <div className="mt-6 grid gap-4 divide-y divide-slate-200">
              {['Google Ads', 'Sales CRM', 'AI Lead Engine'].map((item) => (
                <div key={item} className="flex items-center justify-between py-4">
                  <span className="font-semibold text-slate-900">{item}</span>
                  <span className="text-sm text-slate-500">active</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
              <span>Campaign status</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em]">live</span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: 'Pipeline velocity', value: '1.8x', tone: 'text-slate-950' },
                { label: 'Auto follow-up', value: 'enabled', tone: 'text-slate-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-3xl bg-slate-50 px-4 py-4">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.tone}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
