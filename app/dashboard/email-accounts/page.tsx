'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

type Account = {
  id: string;
  email: string;
  type: 'gmail-oauth' | 'gmail-app' | 'imap' | 'smtp';
  status: 'active' | 'warming' | 'error';
  health_score: number;
  sent_today: number;
  daily_limit: number;
  sent_today_real?: number;
  remaining_today?: number;
};

const TYPE_LABELS: Record<Account['type'], string> = {
  'gmail-oauth': 'Gmail OAuth',
  'gmail-app': 'Gmail App Password',
  'imap': 'IMAP',
  'smtp': 'Custom SMTP',
};

const TYPE_COLORS: Record<Account['type'], string> = {
  'gmail-oauth': 'text-red-600 bg-red-50 border-red-100',
  'gmail-app': 'text-orange-600 bg-orange-50 border-orange-100',
  'imap': 'text-violet-600 bg-violet-50 border-violet-100',
  'smtp': 'text-gray-600 bg-gray-100 border-gray-200',
};

type ConnectStep = null | 'choose' | 'gmail-oauth' | 'gmail-app' | 'imap' | 'smtp';

function SmtpForm({ onBack, onConnect, connecting }: { onBack: () => void; onConnect: (email: string, extra?: Record<string, string>) => void; connecting?: boolean }) {
  const [form, setForm] = useState({ email: '', host: '', port: '587', user: '', pass: '', imapHost: '', imapPort: '993' });
  const [showImap, setShowImap] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.email && form.host && form.user && form.pass;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-2">Works with Titan, Zoho, Mailgun, SendGrid, and any non-Gmail provider.</p>
      {[
        { label: 'From Email', key: 'email', placeholder: 'you@yourdomain.com', type: 'email' },
        { label: 'SMTP Host', key: 'host', placeholder: 'smtp.titan.email', type: 'text' },
        { label: 'SMTP Username', key: 'user', placeholder: 'Same as email usually', type: 'text' },
        { label: 'SMTP Password', key: 'pass', placeholder: '••••••••', type: 'password' },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} value={String(form[f.key as keyof typeof form])}
            onChange={e => set(f.key as keyof typeof form, e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
      ))}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Port</label>
        <select value={form.port} onChange={e => set('port', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
          {['25', '465', '587', '2525'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Optional IMAP for reply detection */}
      <button type="button" onClick={() => setShowImap(v => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 transition-colors">
        <span>+ Add IMAP credentials (enables reply detection)</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${showImap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {showImap && (
        <div className="space-y-3 border border-blue-100 bg-blue-50 rounded-xl p-3">
          <p className="text-[11px] text-blue-600">Without IMAP, replies won't be detected. Titan: imap.titan.email:993</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Host</label>
              <input placeholder="imap.titan.email" value={form.imapHost} onChange={e => set('imapHost', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Port</label>
              <select value={form.imapPort} onChange={e => set('imapPort', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                {['993', '143'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Back</button>
        <button disabled={!valid || connecting} onClick={() => {
          const extra: Record<string, string> = { smtp_host: form.host, smtp_port: form.port, smtp_user: form.user, smtp_pass: form.pass };
          if (showImap && form.imapHost) { extra.imap_host = form.imapHost; extra.imap_port = form.imapPort; }
          onConnect(form.email, extra);
        }}
          className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {connecting ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Connecting…</>
          ) : 'Connect Account'}
        </button>
      </div>
    </div>
  );
}

function ImapForm({ onBack, onConnect, connecting }: { onBack: () => void; onConnect: (email: string, extra?: Record<string, string>) => void; connecting?: boolean }) {
  const [form, setForm] = useState({ email: '', imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '465', pass: '' });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.email && form.imapHost && form.smtpHost && form.pass;
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-2">Works with Titan, Zoho, Yahoo, Fastmail, and most providers. Enables both sending and reply detection. Not for Gmail — use OAuth above.</p>
      {[
        { label: 'Email Address', key: 'email', placeholder: 'you@yourprovider.com', type: 'email' },
        { label: 'Password', key: 'pass', placeholder: '••••••••', type: 'password' },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} value={form[f.key as keyof typeof form]}
            onChange={e => set(f.key as keyof typeof form, e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Host</label>
          <input placeholder="imap.yourprovider.com" value={form.imapHost} onChange={e => set('imapHost', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Port</label>
          <select value={form.imapPort} onChange={e => set('imapPort', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
            {['993', '143'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Host</label>
          <input placeholder="smtp.yourprovider.com" value={form.smtpHost} onChange={e => set('smtpHost', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Port</label>
          <select value={form.smtpPort} onChange={e => set('smtpPort', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
            {['465', '587', '25'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Back</button>
        <button disabled={!valid || connecting} onClick={() => onConnect(form.email, { smtp_host: form.smtpHost, smtp_port: form.smtpPort, smtp_user: form.email, smtp_pass: form.pass, imap_host: form.imapHost, imap_port: form.imapPort })}
          className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {connecting ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Connecting…</>
          ) : 'Connect Account'}
        </button>
      </div>
    </div>
  );
}

function GmailAppForm({ onBack, onConnect, connecting }: { onBack: () => void; onConnect: (email: string, pass: string) => void; connecting?: boolean }) {
  const [email, setEmail] = useState('');
  const [appPass, setAppPass] = useState('');
  const valid = email && appPass.length >= 16;
  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
        <p className="font-bold mb-1">How to get an App Password:</p>
        <ol className="list-decimal list-inside space-y-0.5 text-amber-600">
          <li>Go to your Google Account → Security</li>
          <li>Enable 2-Step Verification</li>
          <li>Search "App Passwords" and create one for "Mail"</li>
          <li>Paste the 16-character code below</li>
        </ol>
      </div>
      {[
        { label: 'Gmail Address', ph: 'you@gmail.com', val: email, set: setEmail, type: 'email' },
        { label: 'App Password (16 chars)', ph: 'xxxx xxxx xxxx xxxx', val: appPass, set: setAppPass, type: 'text' },
      ].map(f => (
        <div key={f.label}>
          <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
          <input type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Back</button>
        <button disabled={!valid || connecting} onClick={() => onConnect(email, appPass.replace(/\s/g, ''))}
          className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {connecting ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Connecting…</>
          ) : 'Connect Account'}
        </button>
      </div>
    </div>
  );
}

type CredDetails = {
  id: string; email: string; type: Account['type'];
  smtp_host: string | null; smtp_port: number | null;
  smtp_user: string | null; smtp_pass: string | null;
  imap_host: string | null; imap_port: number | null;
};

function EditCredentialsModal({ accountId, onClose, onSaved }: {
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [creds, setCreds] = useState<CredDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showImap, setShowImap] = useState(false);

  useEffect(() => {
    fetch(`/api/email-accounts/${accountId}`)
      .then(r => r.json())
      .then(d => {
        setCreds(d);
        setShowImap(!!(d.imap_host));
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  const set = (k: keyof CredDetails, v: string) =>
    setCreds(c => c ? { ...c, [k]: v } : c);

  const save = async () => {
    if (!creds) return;
    setSaving(true);
    setError('');
    const updates: Record<string, unknown> = {};
    if (creds.type === 'gmail-app') {
      updates.smtp_pass = creds.smtp_pass;
    } else if (creds.type === 'imap') {
      updates.smtp_host = creds.smtp_host;
      updates.smtp_port = Number(creds.smtp_port) || 465;
      updates.smtp_pass = creds.smtp_pass;
      updates.imap_host = creds.imap_host;
      updates.imap_port = Number(creds.imap_port) || 993;
    } else if (creds.type === 'smtp') {
      updates.smtp_host = creds.smtp_host;
      updates.smtp_port = Number(creds.smtp_port) || 587;
      updates.smtp_user = creds.smtp_user;
      updates.smtp_pass = creds.smtp_pass;
      if (showImap && creds.imap_host) {
        updates.imap_host = creds.imap_host;
        updates.imap_port = Number(creds.imap_port) || 993;
      }
    }
    const patchRes = await fetch(`/api/email-accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!patchRes.ok) {
      const d = await patchRes.json().catch(() => ({}));
      setError(d.error || 'Save failed');
      setSaving(false);
      return;
    }
    // Verify with a test
    const testRes = await fetch(`/api/email-accounts/${accountId}/test`, { method: 'POST' });
    setSaving(false);
    if (!testRes.ok) {
      const d = await testRes.json().catch(() => ({}));
      setError(d.error || 'Credentials saved but connection test failed');
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit Credentials</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-3">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading…</p>}
          {!loading && creds && (
            <>
              <div className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                {creds.email} — <span className="capitalize">{creds.type}</span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">{error}</div>
              )}

              {creds.type === 'gmail-oauth' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">OAuth credentials are managed by Google. If this account shows an error, use the Re-auth button on the accounts list.</p>
                  <a href="/api/email-accounts/oauth/google"
                    className="block w-full text-center py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors">
                    Re-authorise with Google
                  </a>
                </div>
              )}

              {creds.type === 'gmail-app' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New App Password (16 chars)</label>
                  <input type="text" placeholder="xxxx xxxx xxxx xxxx"
                    value={creds.smtp_pass || ''} onChange={e => set('smtp_pass', e.target.value.replace(/\s/g, ''))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                  <p className="text-[11px] text-gray-400 mt-1">IMAP/SMTP servers are set automatically for Gmail.</p>
                </div>
              )}

              {creds.type === 'imap' && (
                <>
                  {[
                    { label: 'IMAP Host', key: 'imap_host' as const, ph: 'imap.titan.email' },
                    { label: 'SMTP Host', key: 'smtp_host' as const, ph: 'smtp.titan.email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                      <input placeholder={f.ph} value={String(creds[f.key] || '')} onChange={e => set(f.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Port</label>
                      <select value={String(creds.imap_port || 993)} onChange={e => set('imap_port', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                        {['993', '143'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Port</label>
                      <select value={String(creds.smtp_port || 465)} onChange={e => set('smtp_port', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                        {['465', '587', '25'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                    <input type="password" placeholder="••••••••" value={creds.smtp_pass || ''} onChange={e => set('smtp_pass', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                  </div>
                </>
              )}

              {creds.type === 'smtp' && (
                <>
                  {[
                    { label: 'SMTP Host', key: 'smtp_host' as const, ph: 'smtp.titan.email' },
                    { label: 'SMTP Username', key: 'smtp_user' as const, ph: 'Same as email usually' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                      <input placeholder={f.ph} value={String(creds[f.key] || '')} onChange={e => set(f.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Port</label>
                      <select value={String(creds.smtp_port || 587)} onChange={e => set('smtp_port', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                        {['587', '465', '25', '2525'].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Password</label>
                      <input type="password" placeholder="••••••••" value={creds.smtp_pass || ''} onChange={e => set('smtp_pass', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowImap(v => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 transition-colors">
                    <span>{showImap ? '− Remove' : '+ Add'} IMAP credentials (reply detection / warmup receive)</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${showImap ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  {showImap && (
                    <div className="space-y-2 border border-blue-100 bg-blue-50 rounded-xl p-3">
                      <p className="text-[11px] text-blue-600">Titan: imap.titan.email:993 · Zoho: imap.zoho.com:993</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Host</label>
                          <input placeholder="imap.titan.email" value={creds.imap_host || ''} onChange={e => set('imap_host', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">IMAP Port</label>
                          <select value={String(creds.imap_port || 993)} onChange={e => set('imap_port', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                            {['993', '143'].map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {creds.type !== 'gmail-oauth' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                  <button disabled={saving} onClick={save}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                    {saving ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Saving & Testing…</> : 'Save & Test'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const CONNECT_OPTIONS = [
  {
    id: 'gmail-oauth' as const,
    name: 'Gmail / Google Workspace',
    desc: 'One-click OAuth — no password needed',
    tag: 'Recommended',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
        <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/>
        <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/>
        <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/>
      </svg>
    ),
  },
  {
    id: 'gmail-app' as const,
    name: 'Gmail App Password',
    desc: 'Use a 16-character Google app password',
    tag: null,
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
        <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z"/>
        <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21z"/>
        <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/>
      </svg>
    ),
  },
  {
    id: 'imap' as const,
    name: 'IMAP / Any Email',
    desc: 'Titan, Zoho, Yahoo, Fastmail — sending + reply detection',
    tag: null,
    icon: (
      <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
  },
  {
    id: 'smtp' as const,
    name: 'Custom SMTP',
    desc: 'Titan, Zoho, Mailgun — add IMAP for reply detection',
    tag: null,
    icon: (
      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
  },
];

export default function EmailAccountsPage() {
  const router = useRouter();
  const [step, setStep] = useState<ConnectStep>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [addError, setAddError] = useState('');
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editCredId, setEditCredId] = useState<string | null>(null);

  const fetchAccounts = useCallback(() => {
    fetch('/api/email-accounts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAccounts();
    const pollId = setInterval(fetchAccounts, 10000);
    return () => clearInterval(pollId);
  }, [fetchAccounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const err = params.get('error');
    if (connected === 'gmail') {
      setToast('Gmail account connected successfully!');
      router.replace('/dashboard/email-accounts');
    } else if (connected === 'gmail_refreshed') {
      setToast('Gmail credentials refreshed — account updated.');
      router.replace('/dashboard/email-accounts');
    } else if (err === 'oauth_failed') {
      setToast('Google OAuth failed. Try Gmail App Password instead.');
      router.replace('/dashboard/email-accounts');
    }
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setAddError(''); }, [step]);

  const [connecting, setConnecting] = useState(false);

  const addAccount = async (type: Account['type'], email: string, extra?: Record<string, string>) => {
    setAddError('');
    setConnecting(true);

    // Step 1: save account to DB
    const res = await fetch('/api/email-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email, ...extra }),
    });
    const data = await res.json();

    if (!res.ok) {
      setConnecting(false);
      setAddError(data.error || 'Failed to connect account');
      return;
    }

    // Step 2: test connection immediately (skip OAuth — verified via redirect)
    if (type !== 'gmail-oauth') {
      const testRes = await fetch(`/api/email-accounts/${data.id}/test`, { method: 'POST' });
      const testData = await testRes.json();
      if (!testRes.ok) {
        // Remove the account — bad credentials should not appear in dashboard
        await fetch(`/api/email-accounts/${data.id}`, { method: 'DELETE' });
        setConnecting(false);
        setAddError(testData.error || 'Connection test failed — check your credentials.');
        return;
      }
      data.status = 'active';
    }

    setConnecting(false);
    setAccounts(prev => prev.some(a => a.id === data.id) ? prev : [data, ...prev]);
    setToast('Account connected and verified!');
    setStep(null);
  };

  const totalAccounts = accounts.length;
  const warming = accounts.filter(a => a.status === 'warming').length;
  const avgHealth = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + (a.health_score || 0), 0) / accounts.length)
    : 0;

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.includes('success') || toast.includes('connected') ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Accounts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Connect sending accounts — rotate across multiple for better deliverability.</p>
        </div>
        <button onClick={() => setStep('choose')}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Connect Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Accounts', value: String(totalAccounts) },
          { label: 'Warming Up', value: String(warming) },
          { label: 'Avg Health Score', value: totalAccounts ? `${avgHealth}%` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 mb-3">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Duplicate warning */}
      {(() => {
        const seen = new Map<string, number>();
        accounts.forEach(a => { const k = `${a.email}::${a.type}`; seen.set(k, (seen.get(k) || 0) + 1); });
        const dupes = accounts.filter(a => (seen.get(`${a.email}::${a.type}`) || 0) > 1);
        if (!dupes.length) return null;
        const emails = [...new Set(dupes.map(a => a.email))];
        return (
          <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div>
              <p className="text-xs font-bold text-amber-700 mb-0.5">Duplicate accounts detected</p>
              <p className="text-xs text-amber-600">{emails.join(', ')} — remove the extra {dupes.length > 1 ? 'entries' : 'entry'} using the delete button.</p>
            </div>
          </div>
        );
      })()}

      {accounts.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 grid grid-cols-[2fr_1fr_1fr_1fr_150px_auto] gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[750px]">
            <span className="pl-11">Account</span><span>Type</span><span>Status</span><span>Health</span><span>Today / Limit</span><span></span>
          </div>
          {accounts.map((acc, i) => (
            <div key={acc.id} className="px-6 py-4 border-b border-gray-100 last:border-0 grid grid-cols-[2fr_1fr_1fr_1fr_150px_auto] gap-4 items-center min-w-[750px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{acc.email}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{acc.status}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 border w-fit ${TYPE_COLORS[acc.type]}`}>
                {TYPE_LABELS[acc.type]}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${acc.status === 'active' ? 'bg-emerald-400' : acc.status === 'warming' ? 'bg-amber-400' : 'bg-red-400'}`}/>
                <span className="text-xs text-gray-600 capitalize">{acc.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 max-w-[60px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${(acc.health_score || 0) >= 80 ? 'bg-emerald-500' : (acc.health_score || 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${acc.health_score || 0}%` }}/>
                </div>
                <span className="text-xs font-semibold text-gray-700">{acc.health_score || 0}%</span>
              </div>
              {/* Today / Limit — inline-editable limit, real-time sent display */}
              <div className="flex flex-col gap-1 min-w-0">
                {(() => {
                  const limit = acc.daily_limit || 50;
                  const sent = acc.sent_today_real ?? 0;
                  const pct = Math.min(100, Math.round((sent / limit) * 100));
                  const atLimit = sent >= limit;
                  return (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${atLimit ? 'text-red-600' : 'text-gray-800'}`}>
                          {sent}
                        </span>
                        <span className="text-[10px] text-gray-400">of</span>
                        {editingLimitId === acc.id ? (
                          <input
                            autoFocus
                            type="number"
                            min="1"
                            max="2000"
                            value={limitDraft}
                            onChange={e => setLimitDraft(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                const newLimit = parseInt(limitDraft);
                                if (e.key === 'Enter' && newLimit > 0) {
                                  await fetch(`/api/email-accounts/${acc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_limit: newLimit }) });
                                  setAccounts(p => p.map(a => a.id === acc.id ? { ...a, daily_limit: newLimit } : a));
                                }
                                setEditingLimitId(null);
                              }
                            }}
                            onBlur={async () => {
                              const newLimit = parseInt(limitDraft);
                              if (newLimit > 0) {
                                await fetch(`/api/email-accounts/${acc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_limit: newLimit }) });
                                setAccounts(p => p.map(a => a.id === acc.id ? { ...a, daily_limit: newLimit } : a));
                              }
                              setEditingLimitId(null);
                            }}
                            className="w-14 border border-blue-300 rounded-md px-1.5 py-0.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingLimitId(acc.id); setLimitDraft(String(acc.daily_limit || 50)); }}
                            title="Click to edit daily send limit"
                            className="group flex items-center gap-0.5 text-xs font-semibold text-gray-500 hover:text-blue-600 rounded-md px-1 py-0.5 hover:bg-blue-50 transition-all">
                            {limit}
                            <svg className="w-2.5 h-2.5 text-gray-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                        )}
                        {atLimit && <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5 shrink-0">AT LIMIT</span>}
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-400'}`}
                          style={{ width: `${pct}%` }}/>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1">
                {acc.type === 'gmail-oauth' && acc.status === 'error' && (
                  <a href="/api/email-accounts/oauth/google"
                    title="OAuth token revoked — click to re-authorise"
                    className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1 hover:bg-red-100 transition-colors whitespace-nowrap">
                    Re-auth
                  </a>
                )}
                <button
                  disabled={testingId === acc.id}
                  onClick={async () => {
                    setTestingId(acc.id);
                    setTestResult(r => ({ ...r, [acc.id]: { ok: false, msg: '' } }));
                    const res = await fetch(`/api/email-accounts/${acc.id}/test`, { method: 'POST' });
                    const d = await res.json();
                    setTestResult(r => ({ ...r, [acc.id]: { ok: res.ok, msg: res.ok ? (d.sentTo ? `Sent to ${d.sentTo}` : 'Credentials verified — account active') : d.error } }));
                    setTestingId(null);
                    if (res.ok) fetchAccounts();
                  }}
                  title="Send a test email to verify this account works"
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 hover:bg-blue-100 transition-colors whitespace-nowrap disabled:opacity-50">
                  {testingId === acc.id ? '…' : 'Test'}
                </button>
                <button onClick={() => setEditCredId(acc.id)}
                  title="Edit credentials (SMTP/IMAP host, password)"
                  className="text-gray-300 hover:text-blue-500 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => setConfirmDeleteId(acc.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
              {testResult[acc.id]?.msg && (
                <div className={`col-span-full mt-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg ${testResult[acc.id].ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  {testResult[acc.id].ok ? '✓ ' : '✗ '}{testResult[acc.id].msg}
                </div>
              )}
            </div>
          ))}
          </div>{/* /overflow-x-auto */}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">No email accounts connected</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
            Connect Gmail (OAuth or App Password), IMAP, or Custom SMTP. Rotate across multiple accounts for better deliverability.
          </p>
          <button onClick={() => setStep('choose')}
            className="bg-blue-600 text-white text-sm font-semibold rounded-xl px-6 py-3 hover:bg-blue-700 transition-colors">
            + Connect First Account
          </button>
        </div>
      )}

      {confirmDeleteId && (() => {
        const acc = accounts.find(a => a.id === confirmDeleteId);
        return (
          <ConfirmModal
            title="Remove email account?"
            message={`${acc?.email ?? 'This account'} will be removed from all campaigns and permanently deleted. Emails already sent are kept for records.`}
            confirmLabel="Remove Account"
            onCancel={() => setConfirmDeleteId(null)}
            onConfirm={async () => {
              const deleteId = confirmDeleteId!;
              setConfirmDeleteId(null);
              const res = await fetch(`/api/email-accounts/${deleteId}`, { method: 'DELETE' });
              if (res.ok) {
                setAccounts(p => p.filter(a => a.id !== deleteId));
              } else {
                const d = await res.json().catch(() => ({}));
                setToast(d.error || 'Delete failed — try again');
              }
            }}
          />
        );
      })()}

      {editCredId && (
        <EditCredentialsModal
          accountId={editCredId}
          onClose={() => setEditCredId(null)}
          onSaved={() => { fetchAccounts(); setToast('Credentials updated & verified!'); }}
        />
      )}

      {step && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setStep(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {step === 'choose' ? 'Connect Email Account' : CONNECT_OPTIONS.find(o => o.id === step)?.name}
              </h2>
              <button onClick={() => setStep(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              {addError && (
                <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">{addError}</div>
              )}

              {step === 'choose' && (
                <div className="space-y-2.5">
                  {CONNECT_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setStep(opt.id)}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                      <span className="shrink-0">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{opt.name}</p>
                          {opt.tag && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">{opt.tag}</span>}
                        </div>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </button>
                  ))}
                </div>
              )}

              {step === 'gmail-oauth' && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                    {CONNECT_OPTIONS[0].icon}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">You'll be redirected to Google to authorise access.</p>
                  <p className="text-xs text-gray-400 mb-6">We only request permission to send email on your behalf.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setStep('choose')} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Back</button>
                    <a href="/api/email-accounts/oauth/google" target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors text-center">
                      Connect with Google
                    </a>
                  </div>
                </div>
              )}

              {step === 'gmail-app' && (
                <GmailAppForm onBack={() => setStep('choose')} connecting={connecting} onConnect={(email, pass) => addAccount('gmail-app', email, { smtp_user: email, smtp_pass: pass })} />
              )}

              {step === 'imap' && (
                <ImapForm onBack={() => setStep('choose')} connecting={connecting} onConnect={(email, extra) => addAccount('imap', email, extra)} />
              )}

              {step === 'smtp' && (
                <SmtpForm onBack={() => setStep('choose')} connecting={connecting} onConnect={(email, extra) => addAccount('smtp', email, extra)} />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
