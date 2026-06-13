'use client';

import { useState, useEffect, useRef } from 'react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  { id: 'sending', label: 'Sending Defaults', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> },
  { id: 'notifications', label: 'Notifications', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg> },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}/>
    </button>
  );
}

const TIMEZONES = ['UTC', 'US/Eastern (EST)', 'US/Pacific (PST)', 'Europe/London (GMT)', 'Asia/Karachi (PKT)', 'Asia/Dubai (GST)'];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const NOTIF_KEY = 'lg_notif_prefs';
  const defaultNotifs = { new_reply: true, campaign_complete: true, warmup_alert: false, lead_open: false, weekly_report: true, unsubscribe: false };
  const [notifs, setNotifs] = useState(defaultNotifs);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      if (saved) setNotifs({ ...defaultNotifs, ...JSON.parse(saved) });
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setFullName(data.full_name || '');
          setEmail(data.email || '');
          setCompany(data.company || '');
          setWebsite(data.website || '');
          setTimezone(data.timezone || 'UTC');
          setAvatarUrl(data.avatar_url || '');
        }
      })
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, company, website, timezone }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveMsg('Saved successfully');
    } else {
      setSaveMsg(data.error || 'Save failed');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <main className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-8">
        <nav className="w-52 shrink-0 space-y-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              <span className={tab === t.id ? 'text-blue-600' : 'text-gray-400'}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 max-w-xl">

          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Profile Information</h2>

              <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                <div className="relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-16 h-16 rounded-2xl object-cover"/>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold select-none">
                      {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <button onClick={() => avatarRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    const fd = new FormData();
                    fd.append('avatar', file);
                    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
                    const d = await res.json();
                    if (res.ok) { setAvatarUrl(d.avatar_url); setSaveMsg('Photo updated'); setTimeout(() => setSaveMsg(''), 3000); }
                    else setSaveMsg(d.error || 'Upload failed');
                    setAvatarUploading(false);
                    e.target.value = '';
                  }}/>
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-2xl bg-white/80 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{fullName || 'Your Name'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{email}</p>
                  <button onClick={() => avatarRef.current?.click()} className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-1">
                    Change photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} disabled placeholder="you@company.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-gray-50 text-gray-400 cursor-not-allowed"/>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Update via Supabase auth.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Inc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
                </select>
              </div>

              {saveMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${saveMsg.includes('success') || saveMsg === 'Saved successfully' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {saveMsg}
                </div>
              )}

              <button onClick={saveProfile} disabled={saving}
                className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {tab === 'sending' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="text-base font-bold text-gray-900">Sending Defaults</h2>
              <p className="text-sm text-gray-400 -mt-2">These apply to all new campaigns unless overridden.</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default "From" Name</label>
                <input placeholder="John at Acme" type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Daily Email Limit</label>
                  <input type="number" defaultValue={50} min={1} max={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Delay (mins)</label>
                  <input type="number" defaultValue={5} min={1}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sending Hours</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'From', val: '08:00' }, { label: 'To', val: '18:00' }].map(t => (
                    <div key={t.label}>
                      <p className="text-xs text-gray-400 mb-1">{t.label}</p>
                      <input type="time" defaultValue={t.val}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Active Days</p>
                <div className="flex gap-2">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
                    <button key={d} className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${i < 5 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white font-semibold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
                Save Defaults
              </button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-1">
              <h2 className="text-base font-bold text-gray-900 mb-4">Notification Preferences</h2>
              {[
                { key: 'new_reply', label: 'New reply received', desc: 'When a prospect replies to any campaign' },
                { key: 'campaign_complete', label: 'Campaign completed', desc: 'When a campaign finishes sending' },
                { key: 'warmup_alert', label: 'Warmup health alert', desc: 'When warmup score drops below 80%' },
                { key: 'lead_open', label: 'Lead opens email', desc: 'Real-time open tracking notification' },
                { key: 'weekly_report', label: 'Weekly performance report', desc: 'Summary email every Monday morning' },
                { key: 'unsubscribe', label: 'Unsubscribe received', desc: 'When a lead unsubscribes from your list' },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                  </div>
                  <Toggle
                    on={notifs[n.key as keyof typeof notifs]}
                    onToggle={() => setNotifs(p => {
                      const next = { ...p, [n.key]: !p[n.key as keyof typeof p] };
                      try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch {}
                      return next;
                    })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
