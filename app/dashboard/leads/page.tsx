'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  title: string | null;
  website: string | null;
  phone: string | null;
  linkedin: string | null;
  status: string | null;
  created_at: string;
};

type LeadList = {
  id: string;
  name: string;
  count: number;
};

const EMPTY_FORM = { email: '', first_name: '', last_name: '', company: '', title: '', website: '', phone: '' };
const FORM_FIELDS = [
  { key: 'email', label: 'Email *', type: 'email', ph: 'john@company.com' },
  { key: 'first_name', label: 'First Name', type: 'text', ph: 'John' },
  { key: 'last_name', label: 'Last Name', type: 'text', ph: 'Smith' },
  { key: 'company', label: 'Company', type: 'text', ph: 'Acme Inc.' },
  { key: 'title', label: 'Job Title', type: 'text', ph: 'CEO' },
  { key: 'website', label: 'Website', type: 'url', ph: 'https://acme.com' },
  { key: 'phone', label: 'Phone', type: 'text', ph: '+1234567890' },
];

export default function LeadsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ list: LeadList; x: number; y: number } | null>(null);
  const [renamingList, setRenamingList] = useState<LeadList | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // List picker modal — shown before Add Lead or Import when no list is selected
  const [showPicker, setShowPicker] = useState(false);
  const [pickerListId, setPickerListId] = useState('');
  const [pickerNewName, setPickerNewName] = useState('');
  const [pickerShowNew, setPickerShowNew] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);

  const fetchLists = useCallback(() => {
    fetch('/api/lead-lists').then(r => r.json()).then(d => { if (Array.isArray(d)) setLists(d); });
  }, []);

  const fetchLeads = useCallback((q: string, listId: string | null) => {
    setLoading(true);
    const p = new URLSearchParams({ search: q });
    if (listId) p.set('list_id', listId);
    fetch(`/api/leads?${p}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setLeads(d);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLists();
    fetchLeads('', null);
    fetch('/api/leads?search=').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTotalCount(d.length);
    });
  }, [fetchLists, fetchLeads]);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const selectList = (id: string | null) => {
    setSelectedList(id);
    setSelected(new Set());
    setSearch('');
    fetchLeads('', id);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearch(q);
    clearTimeout((window as any)._lSearch);
    (window as any)._lSearch = setTimeout(() => fetchLeads(q, selectedList), 350);
  };

  // ── List Picker helpers ──────────────────────────────────────────────
  const openPicker = () => {
    setPickerListId('');
    setPickerNewName('');
    setPickerShowNew(lists.length === 0);
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    setPickerListId('');
    setPickerNewName('');
    setPickerShowNew(false);
  };

  const handlePickerConfirm = async () => {
    setPickerSaving(true);
    let listId = pickerListId;

    if (pickerShowNew && pickerNewName.trim()) {
      const res = await fetch('/api/lead-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pickerNewName.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setLists(p => [...p, d]);
        listId = d.id;
      } else {
        showMsg(`Error: ${d.error}`);
        setPickerSaving(false);
        return;
      }
    }

    if (!listId) {
      showMsg('Please select or create a list first');
      setPickerSaving(false);
      return;
    }

    closePicker();
    setPickerSaving(false);
    selectList(listId);
    // User lands on the empty list page — they choose to Import or Add Manually from there
  };

  // ── Import ────────────────────────────────────────────────────────────
  const handleImport = async (file: File) => {
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    // Always pass the currently selected list
    if (selectedList) fd.append('list_id', selectedList);

    const res = await fetch('/api/leads/import', { method: 'POST', body: fd });
    const d = await res.json();
    if (res.ok) {
      const parts = [`✓ Imported ${d.imported} new leads`];
      if (d.already_in_db > 0) parts.push(`${d.already_in_db} already exist`);
      if (d.duplicates_in_file > 0) parts.push(`${d.duplicates_in_file} file duplicates`);
      if (d.list_id) parts.push(`added to list`);
      showMsg(parts.join(' · '));
      fetchLeads('', selectedList);
      fetchLists();
      fetch('/api/leads?search=').then(r => r.json()).then(data => { if (Array.isArray(data)) setTotalCount(data.length); });
    } else {
      showMsg(`Error: ${d.error}`);
    }
    setImporting(false);
  };

  // ── Add / Edit buttons ────────────────────────────────────────────────
  const handleAddClick = () => {
    if (selectedList) {
      setEditingLead(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
    } else {
      openPicker();
    }
  };

  const handleImportClick = () => {
    if (selectedList) {
      fileRef.current?.click();
    } else {
      openPicker();
    }
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ email: lead.email, first_name: lead.first_name || '', last_name: lead.last_name || '', company: lead.company || '', title: lead.title || '', website: lead.website || '', phone: lead.phone || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.email) return;
    setSaving(true);
    if (editingLead) {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, first_name: form.first_name || null, last_name: form.last_name || null, company: form.company || null, title: form.title || null, website: form.website || null, phone: form.phone || null }),
      });
      const d = await res.json();
      if (res.ok) { setLeads(p => p.map(l => l.id === editingLead.id ? d : l)); setShowForm(false); }
      else showMsg(`Error: ${d.error}`);
    } else {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, first_name: form.first_name || null, last_name: form.last_name || null, company: form.company || null, title: form.title || null, website: form.website || null, phone: form.phone || null }),
      });
      const d = await res.json();
      if (res.ok) {
        // Always add to current list (picker ensures a list is selected)
        if (selectedList) {
          await fetch(`/api/lead-lists/${selectedList}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_ids: [d.id] }),
          });
          fetchLists();
        }
        setLeads(p => [d, ...p]);
        setTotalCount(c => c + 1);
        setForm(EMPTY_FORM);
        setShowForm(false);
        showMsg('✓ Lead added');
      } else showMsg(`Error: ${d.error}`);
    }
    setSaving(false);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    setLeads(p => p.filter(l => l.id !== leadId));
    setSelected(p => { const n = new Set(p); n.delete(leadId); return n; });
    setTotalCount(c => Math.max(0, c - 1));
    fetchLists();
  };

  const handleBulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}? Cannot be undone.`)) return;
    setDeleting(true);
    await Promise.all([...selected].map(id => fetch(`/api/leads/${id}`, { method: 'DELETE' })));
    setLeads(p => p.filter(l => !selected.has(l.id)));
    setTotalCount(c => Math.max(0, c - selected.size));
    setSelected(new Set());
    setDeleting(false);
    fetchLists();
  };

  const handleAddToList = async (listId: string) => {
    await fetch(`/api/lead-lists/${listId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: [...selected] }) });
    setShowAddToList(false);
    showMsg(`✓ Added ${selected.size} lead${selected.size !== 1 ? 's' : ''} to list`);
    setSelected(new Set());
    fetchLists();
  };

  const handleRemoveFromList = async () => {
    if (!selectedList || !selected.size) return;
    await fetch(`/api/lead-lists/${selectedList}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: [...selected] }) });
    setLeads(p => p.filter(l => !selected.has(l.id)));
    setSelected(new Set());
    fetchLists();
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    const res = await fetch('/api/lead-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newListName.trim() }) });
    const d = await res.json();
    if (res.ok) { setLists(p => [...p, d]); setNewListName(''); setShowNewList(false); }
  };

  const deleteList = async (id: string) => {
    await fetch(`/api/lead-lists/${id}`, { method: 'DELETE' });
    setLists(p => p.filter(l => l.id !== id));
    if (selectedList === id) selectList(null);
    setCtxMenu(null);
  };

  const saveRename = async () => {
    if (!renamingList || !renameVal.trim()) return;
    const res = await fetch(`/api/lead-lists/${renamingList.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: renameVal.trim() }) });
    if (res.ok) { setLists(p => p.map(l => l.id === renamingList.id ? { ...l, name: renameVal.trim() } : l)); }
    setRenamingList(null);
    setCtxMenu(null);
  };

  const toggleAll = () => selected.size === leads.length ? setSelected(new Set()) : setSelected(new Set(leads.map(l => l.id)));
  const toggleOne = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const currentList = selectedList ? lists.find(l => l.id === selectedList) : null;

  return (
    <main className="flex-1 flex flex-col overflow-hidden h-full">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {currentList ? `${currentList.name} · ${leads.length} leads` : `All leads · ${totalCount} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/leads/template" download
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Template
          </a>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }}/>
          <button onClick={handleImportClick} disabled={importing}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button onClick={handleAddClick}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold rounded-xl px-3 py-2 hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mx-6 mb-3 rounded-xl px-4 py-2.5 text-sm font-medium ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {msg}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 gap-5 px-6 pb-6 overflow-hidden min-h-0">

        {/* Lists sidebar */}
        <div className="w-52 shrink-0 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1.5">Lists</p>

          <button onClick={() => selectList(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${!selectedList ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            All Leads
          </button>

          {lists.map(list => (
            <div key={list.id} className="group relative">
              {renamingList?.id === list.id ? (
                <div className="px-1">
                  <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenamingList(null); }}
                    onBlur={saveRename}
                    className="w-full text-sm border border-blue-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              ) : (
                <button onClick={() => selectList(list.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedList === list.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <span className="truncate">{list.name}</span>
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); setCtxMenu({ list, x: e.clientX, y: e.clientY }); }}
                className="absolute right-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 transition-all rounded-md hover:bg-gray-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="2" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="14" r="1.5"/></svg>
              </button>
            </div>
          ))}

          <div className="mt-1">
            {showNewList ? (
              <div className="px-1">
                <input autoFocus value={newListName} placeholder="List name…"
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') { setShowNewList(false); setNewListName(''); } }}
                  onBlur={() => { if (newListName.trim()) createList(); else { setShowNewList(false); setNewListName(''); } }}
                  className="w-full text-sm border border-blue-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            ) : (
              <button onClick={() => setShowNewList(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New List
              </button>
            )}
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input value={search} onChange={handleSearch} placeholder="Search leads…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
            </div>
            {currentList && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                {currentList.name}
              </span>
            )}
          </div>

          <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" className="rounded border-gray-300 accent-blue-600"
                        checked={leads.length > 0 && selected.size === leads.length}
                        onChange={toggleAll}/>
                    </th>
                    {['Name', 'Email', 'Company', 'Title', 'Status', 'Added', ''].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-5 py-16 text-center text-sm text-gray-400">Loading…</td></tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">{currentList ? `No leads in "${currentList.name}"` : 'No leads yet'}</p>
                          <p className="text-xs text-gray-400 mb-5">
                            {currentList ? 'Add or import leads to this list.' : 'Select a list from the sidebar, then add or import leads.'}
                          </p>
                          {currentList && (
                            <div className="flex gap-2">
                              <button onClick={handleImportClick} className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">Import File →</button>
                              <button onClick={handleAddClick} className="text-xs font-bold border border-gray-200 text-gray-700 rounded-xl px-5 py-2.5 hover:bg-gray-50 transition-colors">+ Add Manually</button>
                            </div>
                          )}
                          {!currentList && lists.length === 0 && (
                            <button onClick={() => openPicker()} className="text-xs font-bold bg-blue-600 text-white rounded-xl px-5 py-2.5 hover:bg-blue-700 transition-colors">Create First List →</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : leads.map(l => (
                    <tr key={l.id} className={`border-b border-gray-100 last:border-0 transition-colors ${selected.has(l.id) ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300 accent-blue-600"
                          checked={selected.has(l.id)} onChange={() => toggleOne(l.id)}/>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {[l.first_name, l.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{l.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{l.company || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{l.title || '—'}</td>
                      <td className="px-4 py-3">
                        {(!l.status || l.status === 'active') ? (
                          <span className="text-xs text-gray-400">Active</span>
                        ) : l.status === 'bounced' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 inline-block"/>Bounced
                          </span>
                        ) : l.status === 'unsubscribed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 inline-block"/>Opted out
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{l.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(l)} title="Edit"
                            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteLead(l.id)} title="Delete"
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
                <p className="text-xs text-gray-400">{leads.length} lead{leads.length !== 1 ? 's' : ''}{selected.size > 0 ? ` · ${selected.size} selected` : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 text-sm font-semibold whitespace-nowrap">
          <span className="text-gray-400 font-normal">{selected.size} selected</span>
          <div className="w-px h-4 bg-gray-700"/>
          <div className="relative">
            <button onClick={() => setShowAddToList(v => !v)} className="flex items-center gap-2 hover:text-blue-300 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              Add to List
            </button>
            {showAddToList && (
              <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 z-50">
                {lists.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-gray-400">Create a list first.</p>
                ) : lists.map(list => (
                  <button key={list.id} onClick={() => handleAddToList(list.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    {list.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedList && (
            <button onClick={handleRemoveFromList} className="hover:text-orange-300 transition-colors">Remove from List</button>
          )}
          <button onClick={handleBulkDelete} disabled={deleting}
            className="flex items-center gap-1.5 hover:text-red-300 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-1 text-gray-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* List context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)}/>
          <div className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-44"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}>
            <button onClick={() => { setRenamingList(ctxMenu.list); setRenameVal(ctxMenu.list.name); setCtxMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Rename
            </button>
            <button onClick={() => deleteList(ctxMenu.list.id)}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              Delete List
            </button>
          </div>
        </>
      )}

      {/* ── List Picker Modal ──────────────────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add Leads to…</h2>
              <button onClick={closePicker} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {lists.length === 0 && !pickerShowNew && (
                <p className="text-sm text-gray-400 text-center py-2">No lists yet — create one below.</p>
              )}
              {!pickerShowNew && lists.map(list => (
                <label key={list.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition-all ${pickerListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                  <input type="radio" name="picker_list" value={list.id}
                    checked={pickerListId === list.id}
                    onChange={() => setPickerListId(list.id)}
                    className="accent-blue-600"/>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{list.name}</p>
                    <p className="text-xs text-gray-400">{list.count} lead{list.count !== 1 ? 's' : ''}</p>
                  </div>
                  {pickerListId === list.id && (
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  )}
                </label>
              ))}

              {pickerShowNew ? (
                <div className="flex items-center gap-2 px-1">
                  <input autoFocus value={pickerNewName} placeholder="List name…"
                    onChange={e => setPickerNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && pickerNewName.trim()) handlePickerConfirm(); if (e.key === 'Escape') { setPickerShowNew(false); setPickerNewName(''); } }}
                    className="flex-1 border border-blue-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                  {lists.length > 0 && (
                    <button onClick={() => { setPickerShowNew(false); setPickerNewName(''); }} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={() => { setPickerShowNew(true); setPickerListId(''); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-dashed border-blue-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Create new list
                </button>
              )}
            </div>

            <div className="px-4 pb-4 flex gap-2">
              <button onClick={closePicker}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                disabled={pickerSaving || (!pickerListId && !pickerNewName.trim())}
                onClick={handlePickerConfirm}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {pickerSaving ? 'Creating…' : 'Go to List →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lead modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{editingLead ? 'Edit Lead' : 'Add Lead'}</h2>
                {!editingLead && currentList && (
                  <p className="text-xs text-gray-400 mt-0.5">Adding to: <span className="font-semibold text-blue-600">{currentList.name}</span></p>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {FORM_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} placeholder={f.ph}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    disabled={f.key === 'email' && !!editingLead}
                    className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${f.key === 'email' && editingLead ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}/>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50">Cancel</button>
              <button disabled={!form.email || saving} onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? 'Saving…' : editingLead ? 'Save Changes' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
