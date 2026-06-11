'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  { id: 1, name: 'The Problem Solver', category: 'Cold Outreach', subject: "Quick question about {{company}}'s growth", body: `Hi {{first_name}},\n\nI was looking at {{company}} and noticed most teams in {{industry}} struggle with {{pain_point}}.\n\nWorth a 15-min call?\n\n[Your Name]` },
  { id: 2, name: 'The Compliment Hook', category: 'Cold Outreach', subject: 'Loved your post on {{topic}}', body: `Hi {{first_name}},\n\nSaw your post about {{topic}} — really resonated.\n\nWould you be open to a quick chat?\n\nBest,\n[Your Name]` },
  { id: 3, name: 'The Gentle Nudge', category: 'Follow-up', subject: 'Re: my last email', body: `Hi {{first_name}},\n\nJust bumping this up in case it got buried.\n\n[Your Name]` },
  { id: 4, name: 'The Direct Ask', category: 'Meeting Request', subject: '15 mins this week?', body: `Hi {{first_name}},\n\nI'll keep this short — can we chat for 15 mins?\n\n[Calendly Link]\n\n[Your Name]` },
];

type EmailStep = { subject: string; body: string; delay: number; templateId: number | null; includeUnsub: boolean };
const DEFAULT_EMAIL: EmailStep = { subject: '', body: '', delay: 3, templateId: null, includeUnsub: false };

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

  // Step 0
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('Book a Meeting');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [allAccounts, setAllAccounts] = useState(false);
  const [dailyLimitStr, setDailyLimitStr] = useState('50');
  const [selectedListId, setSelectedListId] = useState('');
  const dailyLimit = Math.max(1, parseInt(dailyLimitStr) || 1);

  // Step 1
  const [emails, setEmails] = useState<EmailStep[]>([{ ...DEFAULT_EMAIL }]);
  const [templatePickerIdx, setTemplatePickerIdx] = useState<number | null>(null);

  // Step 2
  const [startDate, setStartDate] = useState('');
  const [fromTime, setFromTime] = useState('08:00');
  const [toTime, setToTime] = useState('18:00');
  const [activeDays, setActiveDays] = useState([true, true, true, true, true, false, false]);
  const [timezone, setTimezone] = useState('UTC');
  const [minDelayStr, setMinDelayStr] = useState('1');
  const [maxDelayStr, setMaxDelayStr] = useState('5');

  useEffect(() => {
    fetch('/api/email-accounts').then(r => r.json()).then(d => { if (Array.isArray(d)) setRealAccounts(d); });
    fetch('/api/lead-lists').then(r => r.json()).then(d => { if (Array.isArray(d)) setLeadLists(d); });
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

  const applyTemplate = (idx: number, tId: number) => {
    const t = MOCK_TEMPLATES.find(t => t.id === tId);
    if (!t) return;
    setEmails(prev => prev.map((e, i) => i === idx ? { ...e, subject: t.subject, body: t.body, templateId: tId } : e));
    setTemplatePickerIdx(null);
  };

  const updateEmail = (idx: number, key: keyof EmailStep, val: unknown) =>
    setEmails(em => em.map((x, i) => i === idx ? { ...x, [key]: val } : x));

  const activeAccountCount = allAccounts ? realAccounts.length : selectedAccounts.length;

  // Capacity calculation for review step
  const activeAccountIds = allAccounts ? realAccounts.map(a => a.id) : selectedAccounts;
  const selectedAccountData = realAccounts.filter(a => activeAccountIds.includes(a.id));
  const totalRemainingToday = selectedAccountData.reduce((sum, a) => sum + (a.remaining_today ?? a.daily_limit ?? 50), 0);
  const selectedListData = leadLists.find(l => l.id === selectedListId);
  const listLeadCount = selectedListData?.count || 0;

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
              <button onClick={() => setStep(i)} className="flex items-center gap-2">
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
                <div className="grid grid-cols-1 gap-1.5">
                  {leadLists.map(list => (
                    <label key={list.id}
                      className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all ${selectedListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                      <input type="radio" name="lead_list" value={list.id}
                        checked={selectedListId === list.id}
                        onChange={() => setSelectedListId(list.id)}
                        className="accent-blue-600"/>
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{list.name}</p>
                        <p className="text-xs text-gray-400">{list.count} lead{list.count !== 1 ? 's' : ''}</p>
                      </div>
                      {selectedListId === list.id && (
                        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      )}
                    </label>
                  ))}
                </div>
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
                          {[1,2,3,5,7,14].map(d => <option key={d} value={d}>{d} days</option>)}
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
                  {email.templateId ? `Template: ${MOCK_TEMPLATES.find(t => t.id === email.templateId)?.name} — change` : 'Pick from template library (optional)'}
                </button>

                <div className="space-y-3">
                  <input placeholder="Subject line" value={email.subject}
                    onChange={e => updateEmail(idx, 'subject', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                  <textarea rows={6} placeholder={`Hi {{first_name}},\n\nWrite your email here...\n\n[Your Name]`}
                    value={email.body} onChange={e => updateEmail(idx, 'body', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none font-mono"/>
                  <p className="text-[10px] text-gray-400">Variables: <span className="font-mono">{'{{first_name}}'}</span>, <span className="font-mono">{'{{company}}'}</span>, <span className="font-mono">{'{{title}}'}</span></p>

                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Include unsubscribe footer</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Adds opt-out link at the bottom of this email</p>
                    </div>
                    <Toggle on={email.includeUnsub} onToggle={() => updateEmail(idx, 'includeUnsub', !email.includeUnsub)}/>
                  </div>
                  {email.includeUnsub && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-400 font-mono border border-gray-100">
                      To unsubscribe: {'{{unsubscribe_link}}'}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button onClick={() => setEmails(e => [...e, { ...DEFAULT_EMAIL, delay: 3 }])}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
              + Add Follow-up Step
            </button>
          </div>
        )}

        {/* ── Step 2: Schedule ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
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
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                  </div>
                ))}
              </div>
            </div>

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

            {/* Capacity info box */}
            {activeAccountCount > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span className="text-sm font-bold text-blue-800">Today's Send Capacity</span>
                </div>
                <div className="space-y-1.5">
                  {selectedAccountData.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between">
                      <span className="text-xs text-blue-700 truncate max-w-[180px]">{acc.email}</span>
                      <span className={`text-xs font-bold ${(acc.remaining_today ?? 0) === 0 ? 'text-red-600' : 'text-blue-800'}`}>
                        {(acc.remaining_today ?? acc.daily_limit ?? 50)} / {acc.daily_limit ?? 50} remaining
                        {(acc.remaining_today ?? 0) === 0 ? ' — AT LIMIT' : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Today:</strong>{' '}
                    {totalRemainingToday === 0
                      ? 'All accounts are at their daily limit. Emails will start tomorrow.'
                      : listLeadCount === 0
                      ? `${totalRemainingToday} emails can send today (select a list to see lead count).`
                      : totalRemainingToday >= listLeadCount
                      ? `All ${listLeadCount} emails can send today.`
                      : `${totalRemainingToday} of ${listLeadCount} emails will send today. The remaining ${listLeadCount - totalRemainingToday} will be spread over the following days.`
                    }
                  </p>
                </div>
              </div>
            )}

            {!selectedListId && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 font-medium">
                ⚠️ Select a lead list before launching. Go back to Step 1 to choose one.
              </div>
            )}
            {activeAccountCount === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 font-medium">
                ⚠️ Select at least one email account to launch.
              </div>
            )}
            {launchError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">{launchError}</div>
            )}
            <button
              disabled={activeAccountCount === 0 || !selectedListId || launching}
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
                      daily_limit: dailyLimit,
                      from_hour: fromTime,
                      to_hour: toTime,
                      min_delay_secs: Math.max(10, parseInt(minDelayStr) || 1) * 60,
                      max_delay_secs: Math.max(30, parseInt(maxDelayStr) || 5) * 60,
                      active_days: activeDays,
                      timezone,
                      start_date: startDate || null,
                      list_id: selectedListId || null,
                      steps: emails.map(e => ({ subject: e.subject, body: e.body, delay: e.delay, includeUnsub: e.includeUnsub })),
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

        {/* Nav */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Back
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => setStep(s => s + 1)}
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              Continue →
            </button>
          )}
        </div>
      </div>

      {/* Template picker modal */}
      {templatePickerIdx !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setTemplatePickerIdx(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Choose a Template</h2>
              <button onClick={() => setTemplatePickerIdx(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {MOCK_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(templatePickerIdx, t.id)}
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
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={() => setTemplatePickerIdx(null)} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
