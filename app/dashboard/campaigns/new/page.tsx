'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bodyToHtml } from '@/lib/body-to-html';

const steps = ['Details', 'Sequence', 'Schedule', 'Review'];

type RealAccount = {
  id: string;
  email: string;
  type: string;
  daily_limit?: number;
  remaining_today?: number;
  sent_today_real?: number;
};

type LeadList = { id: string; name: string; count: number };

const MOCK_TEMPLATES = [
  {
    id: 1, name: 'The Problem Solver', category: 'Cold Outreach',
    subject: "Quick question about {{company}}'s growth",
    body: `Hi {{first_name}},\n\nI was looking at {{company}} and noticed most teams in {{industry}} struggle with {{pain_point}}.\n\nWe helped similar companies solve this — they went from stuck to scaling in just 60 days.\n\nWorth a 15-min call to see if we can do the same for you?\n\n[Your Name]`,
  },
  {
    id: 2, name: 'The Compliment Hook', category: 'Cold Outreach',
    subject: 'Loved your post on {{topic}}',
    body: `Hi {{first_name}},\n\nSaw your LinkedIn post about {{topic}} — really resonated with our team.\n\nThat made me think you'd appreciate what we're building — we [One-line value prop].\n\nWould you be open to a quick chat?\n\nBest,\n[Your Name]`,
  },
  {
    id: 3, name: 'The Gentle Nudge', category: 'Follow-up',
    subject: 'Re: my last email',
    body: `Hi {{first_name}},\n\nJust wanted to bump this up in case it got buried.\n\nDid you get a chance to look at my previous email? I know inboxes get hectic.\n\nHappy to keep it to 10 minutes if that's easier.\n\n[Your Name]`,
  },
  {
    id: 4, name: 'The Value Add', category: 'Follow-up',
    subject: 'Something useful for {{company}}',
    body: `Hi {{first_name}},\n\nI put together a quick breakdown of how companies like {{company}} are solving {{pain_point}}.\n\n[Link to resource / case study]\n\nNo strings attached — thought it might be useful.\n\n[Your Name]`,
  },
  {
    id: 5, name: 'The Direct Ask', category: 'Meeting Request',
    subject: '15 mins this week?',
    body: `Hi {{first_name}},\n\nI'll keep this short — I think we can help {{company}} with {{pain_point}}.\n\nWe've done it for [Company A] and [Company B].\n\n15 mins this week to show you how? [Calendly Link]\n\n[Your Name]`,
  },
  {
    id: 6, name: 'The Permission Email', category: 'Break-up',
    subject: 'Should I close your file?',
    body: `Hi {{first_name}},\n\nI've reached out a few times but haven't heard back — which usually means one of two things:\n\n1. The timing is off\n2. This isn't a priority right now\n\nEither way, totally fine. Should I close your file?\n\n[Your Name]`,
  },
  {
    id: 7, name: 'The Check-In', category: 'Re-engagement',
    subject: 'Still relevant for {{company}}?',
    body: `Hi {{first_name}},\n\nWe spoke a while back about {{topic}}. I wanted to check in — a lot has changed on our end.\n\nWe've improved [area] that specifically addresses what we discussed.\n\nWould it make sense to reconnect?\n\n[Your Name]`,
  },
];

type EmailStep = { subject: string; body: string; delay: number; templateId: string | null; includeUnsub: boolean; threadMode: 'reply' | 'new_thread' };
const DEFAULT_EMAIL: EmailStep = { subject: '', body: '', delay: 0, templateId: null, includeUnsub: false, threadMode: 'new_thread' };

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}/>
    </button>
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [realAccounts, setRealAccounts] = useState<RealAccount[]>([]);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Step 0
  const [name, setName] = useState('');
  const [fromName, setFromName] = useState('');
  const [goal, setGoal] = useState('Book a Meeting');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [allAccounts, setAllAccounts] = useState(false);
  const [dailyLimitStr, setDailyLimitStr] = useState('50');
  const [selectedListId, setSelectedListId] = useState('');
  const dailyLimit = Math.max(1, parseInt(dailyLimitStr) || 1);

  // Step 1
  const [emails, setEmails] = useState<EmailStep[]>([{ ...DEFAULT_EMAIL }]);
  const [templatePickerIdx, setTemplatePickerIdx] = useState<number | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState<string>('All');
  const [apiTemplates, setApiTemplates] = useState<{ id: string; name: string; category: string; subject: string; body: string; source_builtin_id?: number | null }[]>([]);
  const [previewSteps, setPreviewSteps] = useState<Set<number>>(new Set());

  // Step 2
  const [instantStart, setInstantStart] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [fromTime, setFromTime] = useState('08:00');
  const [toTime, setToTime] = useState('18:00');
  const [activeDays, setActiveDays] = useState([true, true, true, true, true, false, false]);
  const [timezone, setTimezone] = useState('UTC');
  const [minDelayStr, setMinDelayStr] = useState('1');
  const [maxDelayStr, setMaxDelayStr] = useState('5');

  const timeWindowValid = instantStart || fromTime < toTime;

  // Lead list count — needed by capacity helpers below
  const selectedListData = leadLists.find(l => l.id === selectedListId);
  const listLeadCount = selectedListData?.count || 0;

  const parsedMinDelay = Math.max(1, parseInt(minDelayStr) || 1);
  const parsedMaxDelay = Math.max(parsedMinDelay + 1, parseInt(maxDelayStr) || 5);
  const delayOrderValid = (parseInt(minDelayStr) || 1) < (parseInt(maxDelayStr) || 5);

  // Schedule capacity helpers
  const schedWindowMins = (() => {
    if (instantStart) return 24 * 60;
    if (!timeWindowValid) return 0;
    const [fh, fm] = fromTime.split(':').map(Number);
    const [th, tm] = toTime.split(':').map(Number);
    return (th * 60 + tm) - (fh * 60 + fm);
  })();
  const avgDelayMins = (parsedMinDelay + parsedMaxDelay) / 2;
  const emailsPerWindowPerAccount = schedWindowMins > 0 ? Math.max(1, Math.floor(schedWindowMins / avgDelayMins)) : 0;
  const numSelectedAccounts = allAccounts ? realAccounts.length : selectedAccounts.length;
  const emailsPerDay = Math.min(dailyLimit, emailsPerWindowPerAccount * Math.max(1, numSelectedAccounts));
  const activeDayCount = activeDays.filter(Boolean).length;
  const daysToComplete = emailsPerDay > 0 && listLeadCount > 0 ? Math.ceil(listLeadCount / emailsPerDay) : null;

  const validateStep = (s: number): string[] => {
    const errs: string[] = [];
    if (s === 0) {
      if (!name.trim()) errs.push('Campaign name is required.');
      if (activeAccountCount === 0) errs.push('Select at least one sending account.');
      if (!selectedListId && leadLists.length > 0) errs.push('Select a lead list.');
    }
    if (s === 1) {
      emails.forEach((e, i) => {
        const needsSubject = i === 0 || e.threadMode === 'new_thread';
        if (needsSubject && !e.subject.trim()) errs.push(`Email ${i + 1}: subject line is required.`);
        if (!e.body.trim()) errs.push(`Email ${i + 1}: body is required.`);
      });
    }
    if (s === 2) {
      if (!instantStart && !timeWindowValid) errs.push('"From" time must be earlier than "To" time.');
      if (!instantStart && !activeDays.some(d => d)) errs.push('Select at least one active sending day.');
    }
    return errs;
  };

  // Merge user templates (from API) with built-ins not overridden by user edits
  const overriddenBuiltinIds = new Set(apiTemplates.filter(t => t.source_builtin_id != null).map(t => t.source_builtin_id!));
  const allTemplates = [
    ...apiTemplates.map(t => ({ id: String(t.id), name: t.name, category: t.category, subject: t.subject, body: t.body })),
    ...MOCK_TEMPLATES.filter(t => !overriddenBuiltinIds.has(t.id)).map(t => ({ id: String(t.id), name: t.name, category: t.category, subject: t.subject, body: t.body })),
  ];
  const templateCategories = ['All', ...Array.from(new Set(allTemplates.map(t => t.category)))];
  const filteredTemplates = allTemplates.filter(t => {
    const matchCat = templateCategory === 'All' || t.category === templateCategory;
    const q = templateSearch.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  useEffect(() => {
    // Pre-fill from template when coming via "Use →" on templates page
    try {
      const prefill = localStorage.getItem('prefill_template');
      if (prefill) {
        const t = JSON.parse(prefill);
        setEmails([{ subject: t.subject || '', body: t.body || '', delay: 0, templateId: t.templateId || null, includeUnsub: false, threadMode: 'new_thread' }]);
        localStorage.removeItem('prefill_template');
      }
    } catch {}

    fetch('/api/email-accounts').then(r => r.json()).then(d => { if (Array.isArray(d)) setRealAccounts(d); });
    fetch('/api/lead-lists').then(r => r.json()).then(d => { if (Array.isArray(d)) setLeadLists(d); });
    fetch('/api/templates').then(r => r.json()).then(d => { if (Array.isArray(d)) setApiTemplates(d); });
    fetch('/api/profile').then(r => r.json()).then(d => { if (d?.default_from_name) setFromName(d.default_from_name); });
  }, []);

  const toggleDay = (i: number) => setActiveDays(d => d.map((v, idx) => idx === i ? !v : v));

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setAllAccounts(false);
  };
  const toggleAllAccounts = () => {
    if (allAccounts) { setAllAccounts(false); setSelectedAccounts([]); }
    else { setAllAccounts(true); setSelectedAccounts(realAccounts.map(a => a.id)); }
  };

  const applyTemplate = (idx: number, t: { id: string; subject: string; body: string }) => {
    setEmails(prev => prev.map((e, i) => i === idx ? { ...e, subject: t.subject, body: t.body, templateId: t.id } : e));
    setTemplatePickerIdx(null);
  };

  const updateEmail = (idx: number, key: keyof EmailStep, val: unknown) =>
    setEmails(em => em.map((x, i) => i === idx ? { ...x, [key]: val } : x));

  const activeAccountCount = allAccounts ? realAccounts.length : selectedAccounts.length;

  // Capacity calculation for review step
  const activeAccountIds = allAccounts ? realAccounts.map(a => a.id) : selectedAccounts;
  const selectedAccountData = realAccounts.filter(a => activeAccountIds.includes(a.id));
  const totalRemainingToday = selectedAccountData.reduce((sum, a) => sum + (a.remaining_today ?? a.daily_limit ?? 50), 0);

  return (
    <main className="flex-1 p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/campaigns" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Campaign</h1>
            <p className="text-sm text-gray-400">Set up your cold email sequence</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <button onClick={() => { if (i < step) { setStepErrors([]); setStep(i); } else if (i === step + 1) { const errs = validateStep(step); if (errs.length) { setStepErrors(errs); } else { setStepErrors([]); setStep(i); } } }} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg> : i + 1}
                </span>
                <span className={`text-sm font-semibold ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
              </button>
              {i < steps.length - 1 && <div className={`w-12 h-0.5 mx-2 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">

        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SaaS Founders Q3 Outreach"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Sender Name <span className="font-normal text-gray-400">(what recipients see)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                This is the name shown in the inbox — e.g. <span className="font-semibold text-gray-600">John at Acme</span>. It overrides whatever name is on your Gmail/SMTP account.
              </p>
              <input
                value={fromName}
                onChange={e => setFromName(e.target.value)}
                placeholder="e.g. John at Acme, or ByteRise Team"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {fromName && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Recipients will see: <span className="font-semibold text-gray-700">{fromName} &lt;your@gmail.com&gt;</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {['Book a Meeting', 'Demo Request', 'Partnership', 'Product Trial', 'Content Share', 'Event Invite'].map(g => (
                  <button key={g} type="button" onClick={() => setGoal(g)}
                    className={`border rounded-xl py-2.5 text-xs font-semibold transition-all ${goal === g ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Lead List — required */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Lead List</label>
                <Link href="/dashboard/leads" className="text-xs font-bold text-blue-600 hover:underline">Manage lists →</Link>
              </div>
              {leadLists.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-400 mb-2">No lists yet — create one first</p>
                  <Link href="/dashboard/leads" className="text-xs font-bold text-blue-600 hover:underline">+ Create a lead list →</Link>
                </div>
              ) : (
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="">— Select a list —</option>
                  {leadLists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.count} lead{list.count !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sending accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Sending Accounts</label>
                <span className="text-xs text-gray-400">Round-robin rotation</span>
              </div>
              {realAccounts.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-400 mb-2">No accounts connected yet</p>
                  <Link href="/dashboard/email-accounts" className="text-xs font-bold text-blue-600 hover:underline">+ Connect account →</Link>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input type="checkbox" checked={allAccounts} onChange={toggleAllAccounts} className="w-4 h-4 rounded accent-blue-600"/>
                    <span className="text-sm font-semibold text-gray-700">All accounts ({realAccounts.length})</span>
                  </label>
                  {realAccounts.map(acc => (
                    <label key={acc.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={allAccounts || selectedAccounts.includes(acc.id)} onChange={() => toggleAccount(acc.id)} className="w-4 h-4 rounded accent-blue-600"/>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 font-medium">{acc.email}</p>
                        <p className="text-xs text-gray-400">{acc.type}</p>
                      </div>
                      {acc.remaining_today !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.remaining_today === 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {acc.remaining_today}/{acc.daily_limit ?? 50} left
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Daily limit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Daily Email Limit</label>
                <span className="text-xs text-gray-400">Across all selected accounts</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" value={dailyLimitStr}
                  onChange={e => setDailyLimitStr(e.target.value)}
                  onBlur={() => setDailyLimitStr(String(Math.max(1, parseInt(dailyLimitStr) || 1)))}
                  className="w-36 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                <span className="text-sm text-gray-400">emails / day</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Recommended: 50–200/day per account to protect deliverability.</p>
            </div>
          </div>
        )}

        {/* ── Step 1: Sequence ── */}
        {step === 1 && (
          <div className="space-y-4">
            {emails.map((email, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                    <span className="text-sm font-bold text-gray-900">{idx === 0 ? 'Initial Email' : `Follow-up ${idx}`}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {idx > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>Send after</span>
                        <select value={email.delay} onChange={e => updateEmail(idx, 'delay', Number(e.target.value))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-400">
                          {/* TEST MODE: units are minutes. Change label to "days" and update instrumentation.ts for production */}
                          {[1,2,3,5,10,15].map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                      </div>
                    )}
                    {idx > 0 && (
                      <button onClick={() => setEmails(em => em.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                <button type="button" onClick={() => setTemplatePickerIdx(idx)}
                  className="w-full flex items-center gap-2 border border-dashed border-gray-200 rounded-xl px-4 py-2.5 mb-3 text-xs font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all text-left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  {email.templateId ? `Template: ${allTemplates.find(t => t.id === email.templateId)?.name ?? 'Custom'} — change` : 'Pick from template library (optional)'}
                </button>

                <div className="space-y-3">
                  {/* Thread mode toggle — only for follow-up steps */}
                  {idx > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateEmail(idx, 'threadMode', email.threadMode === 'reply' ? 'new_thread' : 'reply')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          email.threadMode === 'reply'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                        }`}>
                        {email.threadMode === 'reply' ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                            Reply in thread
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            New thread
                          </>
                        )}
                      </button>
                      <span className="text-[10px] text-gray-400">
                        {email.threadMode === 'reply'
                          ? 'Sends as a reply to Step 1 — appears in same inbox thread'
                          : 'Sends as a separate email with its own subject line'}
                      </span>
                    </div>
                  )}

                  {/* Subject — hidden for reply-mode follow-ups */}
                  {(idx === 0 || email.threadMode === 'new_thread') && (
                    <input placeholder="Subject line" value={email.subject}
                      onChange={e => updateEmail(idx, 'subject', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                  )}
                  {idx > 0 && email.threadMode === 'reply' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                      <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                      <span className="text-xs text-blue-600">In thread with Step 1 — no subject needed</span>
                    </div>
                  )}

                  {/* Body — Edit / Preview tabs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-gray-500">Body</p>
                      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                        {(['Edit', 'Preview'] as const).map(t => (
                          <button key={t} type="button"
                            onClick={() => setPreviewSteps(prev => {
                              const n = new Set(prev);
                              if (t === 'Preview') n.add(idx); else n.delete(idx);
                              return n;
                            })}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${(t === 'Preview') === previewSteps.has(idx) ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    {previewSteps.has(idx) ? (
                      <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[160px]">
                        {email.body ? (
                          <iframe
                            srcDoc={bodyToHtml(email.body, 'To unsubscribe, click here: {{unsubscribe_link}}', email.includeUnsub)}
                            className="w-full min-h-[200px] border-0"
                            title="Email preview"
                            sandbox="allow-same-origin"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-32 text-sm text-gray-300">No body yet</div>
                        )}
                      </div>
                    ) : (
                      <textarea rows={6} placeholder={`Hi {{first_name}},\n\nWrite your email here...\n\n[Your Name]`}
                        value={email.body} onChange={e => updateEmail(idx, 'body', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none font-mono"/>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-400">Variables: <span className="font-mono">{'{{first_name}}'}</span>, <span className="font-mono">{'{{company}}'}</span>, <span className="font-mono">{'{{title}}'}</span></p>

                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Include unsubscribe footer</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Adds opt-out link at the bottom of this email</p>
                    </div>
                    <Toggle on={email.includeUnsub} onToggle={() => updateEmail(idx, 'includeUnsub', !email.includeUnsub)}/>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setEmails(e => [...e, { ...DEFAULT_EMAIL, delay: 3, threadMode: 'reply' }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
              + Add Follow-up Step
            </button>
          </div>
        )}

        {/* ── Step 2: Schedule ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

            {/* Instant Start toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${instantStart ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <p className="text-sm font-bold text-gray-900">Instant Start</p>
                <p className="text-xs text-gray-400 mt-0.5">Send immediately — no scheduled window or date</p>
              </div>
              <Toggle on={instantStart} onToggle={() => setInstantStart(v => !v)}/>
            </div>

            {!instantStart && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white transition"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sending Window</label>
                  <p className="text-xs text-gray-400 mb-2 -mt-1">Emails are only sent within this time range in the selected timezone.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'From', val: fromTime, set: setFromTime },
                      { label: 'To', val: toTime, set: setToTime },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                        <input type="time" value={f.val} onChange={e => f.set(e.target.value)}
                          className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition ${!timeWindowValid ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'}`}/>
                      </div>
                    ))}
                  </div>
                  {!timeWindowValid && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      "From" time must be earlier than "To" time
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delay Between Emails</label>
              <p className="text-xs text-gray-400 mb-2">Randomised gap to simulate human behaviour and avoid spam flags.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Min delay (mins)', val: minDelayStr, set: setMinDelayStr },
                  { label: 'Max delay (mins)', val: maxDelayStr, set: setMaxDelayStr },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                    <input type="number" min="0" step="1" value={f.val}
                      onChange={e => f.set(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                  </div>
                ))}
              </div>
              {!delayOrderValid && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  Min delay must be less than max delay
                </p>
              )}
              {!instantStart && schedWindowMins > 0 && schedWindowMins < parsedMinDelay && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  Sending window ({schedWindowMins} min) is shorter than your min delay ({parsedMinDelay} min) — only 1 email will send per window
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1.5">Recommended: 1–5 min for warm accounts, 3–10 min for cold.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Active Days</label>
              <div className="flex gap-2">
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${activeDays[i] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                {['UTC', 'US/Eastern (EST)', 'US/Pacific (PST)', 'Europe/London (GMT)', 'Asia/Karachi (PKT)', 'Asia/Dubai (GST)'].map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>

            {/* ── Schedule Capacity Preview ── */}
            {(schedWindowMins > 0 || instantStart) && (
              <div className={`rounded-xl border p-4 space-y-3 ${
                schedWindowMins > 0 && schedWindowMins < parsedMinDelay
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <span className="text-sm font-bold text-blue-800">Schedule Capacity</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Window</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {instantStart ? '24 hrs' : `${Math.floor(schedWindowMins / 60) > 0 ? `${Math.floor(schedWindowMins / 60)}h ` : ''}${schedWindowMins % 60 > 0 ? `${schedWindowMins % 60}m` : ''}`}
                    </p>
                    <p className="text-[10px] text-gray-400">{activeDayCount} day{activeDayCount !== 1 ? 's' : ''}/week</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Max / Window</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">~{emailsPerWindowPerAccount} email{emailsPerWindowPerAccount !== 1 ? 's' : ''}</p>
                    <p className="text-[10px] text-gray-400">capacity per account</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Per Day</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">~{emailsPerDay} emails</p>
                    <p className="text-[10px] text-gray-400">limit: {dailyLimit}/day</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completes In</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {listLeadCount === 0 ? '—' : daysToComplete === null ? '∞' : `~${daysToComplete} day${daysToComplete !== 1 ? 's' : ''}`}
                    </p>
                    <p className="text-[10px] text-gray-400">{listLeadCount > 0 ? `${listLeadCount} leads` : 'no list yet'}</p>
                  </div>
                </div>
                {listLeadCount > 0 && daysToComplete !== null && daysToComplete > 30 && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    Campaign will take {daysToComplete} days. Increase daily limit or shorten delay to finish sooner.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h3 className="font-bold text-gray-900">Campaign Summary</h3>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Campaign Name', value: name || '—' },
                  { label: 'Goal', value: goal },
                  { label: 'Lead List', value: selectedListData ? `${selectedListData.name} (${listLeadCount} leads)` : '⚠️ No list selected' },
                  { label: 'Sending Accounts', value: activeAccountCount > 0 ? `${activeAccountCount} account${activeAccountCount > 1 ? 's' : ''}` : '⚠️ None selected' },
                  { label: 'Daily Limit', value: `${dailyLimit} emails/day` },
                  { label: 'Sending Window', value: `${fromTime} – ${toTime}` },
                  { label: 'Email Delay', value: `${minDelayStr}–${maxDelayStr} min (randomised)` },
                  { label: 'Email Steps', value: `${emails.length} email${emails.length > 1 ? 's' : ''} in sequence` },
                  { label: 'Sending Days', value: ['Mo','Tu','We','Th','Fr','Sa','Su'].filter((_, i) => activeDays[i]).join(', ') || '—' },
                  { label: 'Timezone', value: timezone },
                  { label: 'Start Date', value: startDate || 'Immediately' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className={`text-sm font-semibold ${r.value?.startsWith('⚠️') ? 'text-amber-600' : 'text-gray-900'}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capacity estimate */}
            {activeAccountCount > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <span className="text-sm font-bold text-blue-800">Campaign Capacity Estimate</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Window</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {instantStart ? '24 hrs' : schedWindowMins > 0 ? `${Math.floor(schedWindowMins/60) > 0 ? `${Math.floor(schedWindowMins/60)}h ` : ''}${schedWindowMins%60 > 0 ? `${schedWindowMins%60}m` : ''}` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400">{activeDayCount} active day{activeDayCount !== 1 ? 's' : ''}/week</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Max / Window</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">~{emailsPerWindowPerAccount}/account</p>
                    <p className="text-[10px] text-gray-400">capacity, {avgDelayMins.toFixed(1)} min avg gap</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Per Day</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">~{emailsPerDay} emails</p>
                    <p className="text-[10px] text-gray-400">{activeAccountCount} account{activeAccountCount !== 1 ? 's' : ''} × limit {dailyLimit}</p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Completes In</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {listLeadCount === 0 ? '—' : daysToComplete === null ? '∞' : `~${daysToComplete} day${daysToComplete !== 1 ? 's' : ''}`}
                    </p>
                    <p className="text-[10px] text-gray-400">{listLeadCount > 0 ? `${listLeadCount} leads` : 'no list selected'}</p>
                  </div>
                </div>
                {listLeadCount > 0 && daysToComplete !== null && daysToComplete > 30 && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    Will take ~{daysToComplete} days. Increase daily limit or shorten delay to complete sooner.
                  </p>
                )}
                <div className="pt-2 border-t border-blue-200 space-y-1">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Today</p>
                  {selectedAccountData.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between">
                      <span className="text-xs text-blue-700 truncate max-w-[180px]">{acc.email}</span>
                      <span className={`text-xs font-bold ${(acc.remaining_today ?? 0) === 0 ? 'text-red-600' : 'text-blue-800'}`}>
                        {acc.remaining_today ?? acc.daily_limit ?? 50} / {acc.daily_limit ?? 50} remaining
                        {(acc.remaining_today ?? 0) === 0 ? ' — AT LIMIT' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!name.trim() && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-red-600 font-medium">⚠️ Campaign name is required.</span>
                <button onClick={() => { setStepErrors([]); setStep(0); }} className="text-xs font-bold text-red-600 underline ml-3">Fix →</button>
              </div>
            )}
            {!selectedListId && leadLists.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-amber-700 font-medium">⚠️ No lead list selected.</span>
                <button onClick={() => { setStepErrors([]); setStep(0); }} className="text-xs font-bold text-amber-700 underline ml-3">Fix →</button>
              </div>
            )}
            {activeAccountCount === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-amber-700 font-medium">⚠️ No sending account selected.</span>
                <button onClick={() => { setStepErrors([]); setStep(0); }} className="text-xs font-bold text-amber-700 underline ml-3">Fix →</button>
              </div>
            )}
            {emails.some((e, i) => !e.body.trim() || ((i === 0 || e.threadMode === 'new_thread') && !e.subject.trim())) && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-amber-700 font-medium">⚠️ Some email steps are missing subject or body.</span>
                <button onClick={() => { setStepErrors([]); setStep(1); }} className="text-xs font-bold text-amber-700 underline ml-3">Fix →</button>
              </div>
            )}
            {launchError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">{launchError}</div>
            )}
            <button
              disabled={activeAccountCount === 0 || (!selectedListId && leadLists.length > 0) || !name.trim() || emails.some((e, i) => !e.body.trim() || ((i === 0 || e.threadMode === 'new_thread') && !e.subject.trim())) || launching}
              onClick={async () => {
                setLaunching(true);
                setLaunchError('');
                try {
                  const accountIds = allAccounts ? realAccounts.map(a => a.id) : selectedAccounts;
                  const res = await fetch('/api/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name,
                      goal,
                      from_name: fromName.trim() || null,
                      daily_limit: dailyLimit,
                      from_hour: instantStart ? '00:00' : fromTime,
                      to_hour: instantStart ? '23:59' : toTime,
                      min_delay_secs: Math.max(1, parseInt(minDelayStr) || 1) * 60,
                      max_delay_secs: Math.max(Math.max(1, parseInt(minDelayStr) || 1) + 1, parseInt(maxDelayStr) || 5) * 60,
                      active_days: activeDays,
                      timezone,
                      start_date: startDate || null,
                      list_id: selectedListId || null,
                      steps: emails.map(e => ({ subject: e.subject, body: e.body, delay: e.delay, includeUnsub: e.includeUnsub, templateId: e.templateId, threadMode: e.threadMode })),
                      account_ids: accountIds,
                    }),
                  });
                  const campaign = await res.json();
                  if (!res.ok) throw new Error(campaign.error || 'Failed to create campaign');

                  const startRes = await fetch(`/api/campaigns/${campaign.id}/start`, { method: 'POST' });
                  const startData = await startRes.json();
                  if (!startRes.ok) throw new Error(startData.error || 'Failed to start campaign');

                  router.push('/dashboard/campaigns');
                } catch (err: any) {
                  setLaunchError(err.message);
                  setLaunching(false);
                }
              }}
              className="w-full bg-blue-600 text-white font-bold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {launching ? 'Launching…' : 'Launch Campaign →'}
            </button>
          </div>
        )}

        {/* Step errors */}
        {stepErrors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
            {stepErrors.map((e, i) => (
              <p key={i} className="flex items-start gap-2 text-xs text-red-600 font-medium">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                {e}
              </p>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => { setStepErrors([]); setStep(s => Math.max(0, s - 1)); }} disabled={step === 0}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Back
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => {
              const errs = validateStep(step);
              if (errs.length) { setStepErrors(errs); return; }
              setStepErrors([]);
              setStep(s => s + 1);
            }}
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* Template picker modal */}
      {templatePickerIdx !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setTemplatePickerIdx(null); setTemplateSearch(''); setTemplateCategory('All'); } }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">Choose a Template</h2>
              <button onClick={() => { setTemplatePickerIdx(null); setTemplateSearch(''); setTemplateCategory('All'); }}
                className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Search */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input
                  type="text"
                  placeholder="Search templates…"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              </div>
            </div>
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 px-4 pb-3 shrink-0">
              {templateCategories.map(cat => (
                <button key={cat} onClick={() => setTemplateCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${templateCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2 min-h-0">
              {filteredTemplates.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No templates match your search.</p>
              ) : filteredTemplates.map(t => (
                <button key={t.id} onClick={() => { applyTemplate(templatePickerIdx, t); setTemplateSearch(''); setTemplateCategory('All'); }}
                  className="w-full flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{t.category}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">Subject: {t.subject}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => { setTemplatePickerIdx(null); setTemplateSearch(''); setTemplateCategory('All'); }}
                className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
