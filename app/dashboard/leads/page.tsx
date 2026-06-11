'use client';

import { useState, useEffect, useRef } from 'react';

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  title: string | null;
  created_at: string;
};

const tabs = ['All Leads', 'Contacted', 'Replied', 'Unsubscribed'];

const EMPTY_FORM = { email: '', first_name: '', last_name: '', company: '', title: '', website: '', phone: '' };

export default function LeadsPage() {
  const [tab, setTab] = useState('All Leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchLeads = (q = '') => {
    setLoading(true);
    fetch(`/api/leads?search=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setLeads(data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    clearTimeout((window as any)._leadSearch);
    (window as any)._leadSearch = setTimeout(() => fetchLeads(e.target.value), 400);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportMsg('');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/leads/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      const parts = [`✓ Imported ${data.imported} new leads`];
      if (data.already_in_db > 0) parts.push(`${data.already_in_db} already in list (skipped)`);
      if (data.duplicates_in_file > 0) parts.push(`${data.duplicates_in_file} duplicate rows in file`);
      setImportMsg(parts.join(' · '));
      fetchLeads(search);
    } else {
      setImportMsg(`Error: ${data.error}`);
    }
    setImporting(false);
  };

  const handleManualAdd = async () => {
    if (!form.email) return;
    setAdding(true);
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim(),
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        company: form.company || null,
        title: form.title || null,
        website: form.website || null,
        phone: form.phone || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setLeads(prev => [data, ...prev]);
      setForm(EMPTY_FORM);
      setShowManual(false);
      setImportMsg('✓ Lead added');
      setTimeout(() => setImportMsg(''), 3000);
    } else {
      setImportMsg(`Error: ${data.error}`);
    }
    setAdding(false);
  };

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your prospect list.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/leads/template" download
            className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Template
          </a>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }}/>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            {importing ? 'Importing…' : 'Import CSV / XLS'}
          </button>
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {importMsg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${importMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {importMsg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={handleSearch} placeholder="Search leads..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Email', 'Company', 'Title', 'Added'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">No leads yet</p>
                      <p className="text-xs text-gray-400 mb-5">Import a CSV/XLS or add leads manually.</p>
                      <div className="flex gap-2">
                        <button onClick={() => fileRef.current?.click()} className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">
                          Import File →
                        </button>
                        <button onClick={() => setShowManual(true)} className="text-xs font-bold border border-gray-200 text-gray-700 rounded-xl px-5 py-2.5 hover:bg-gray-50 transition-colors">
                          + Add Manually
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : leads.map(l => (
                <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{l.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{l.company || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{l.title || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>

      {showManual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowManual(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Lead Manually</h2>
              <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { key: 'email', label: 'Email *', type: 'email', ph: 'john@company.com' },
                { key: 'first_name', label: 'First Name', type: 'text', ph: 'John' },
                { key: 'last_name', label: 'Last Name', type: 'text', ph: 'Smith' },
                { key: 'company', label: 'Company', type: 'text', ph: 'Acme Inc.' },
                { key: 'title', label: 'Job Title', type: 'text', ph: 'CEO' },
                { key: 'website', label: 'Website', type: 'url', ph: 'https://acme.com' },
                { key: 'phone', label: 'Phone', type: 'text', ph: '+1234567890' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.ph}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setShowManual(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button disabled={!form.email || adding} onClick={handleManualAdd}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {adding ? 'Adding…' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
