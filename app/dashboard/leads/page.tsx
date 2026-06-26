'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Skeleton } from '@/components/Skeleton';
import type { EmailResult, JobSummary, EmailDecision } from '@/lib/score-engine';

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  title: string | null;
  website: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
};

type LeadList = {
  id: string;
  name: string;
  count: number;
};

type ImportJob = {
  id: string;
  status: 'processing' | 'done' | 'failed' | 'imported';
  progress: number;
  total_emails: number;
  filename: string | null;
  list_id: string | null;
  list_name: string | null;
  results: EmailResult[] | null;
  summary: JobSummary | null;
  created_at: string;
  completed_at: string | null;
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

function decisionStyle(d: EmailDecision) {
  if (d === 'safe')        return { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', score: 'text-emerald-700', label: 'Safe' };
  if (d === 'likely_safe') return { badge: 'bg-teal-100 text-teal-700',       bar: 'bg-teal-500',    score: 'text-teal-700',    label: 'Likely Safe' };
  if (d === 'risky')       return { badge: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-400',   score: 'text-amber-600',   label: 'Risky' };
  if (d === 'suppressed')  return { badge: 'bg-orange-100 text-orange-700',   bar: 'bg-orange-400',  score: 'text-orange-600',  label: 'Suppressed' };
  if (d === 'unsafe')      return { badge: 'bg-red-100 text-red-600',         bar: 'bg-red-400',     score: 'text-red-500',     label: 'Unsafe' };
  return                          { badge: 'bg-red-100 text-red-600',         bar: 'bg-red-500',     score: 'text-red-600',     label: 'Invalid' };
}

export default function LeadsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ list: LeadList; x: number; y: number } | null>(null);
  const [renamingList, setRenamingList] = useState<LeadList | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const [validating, setValidating] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Job-based validation state ─────────────────────────────────────
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [includeRisky, setIncludeRisky] = useState(true);
  const [includeCrossListJob, setIncludeCrossListJob] = useState(true);
  const [jobFilter, setJobFilter] = useState<'all' | 'importable' | 'blocked' | 'dupes' | EmailDecision>('all');
  // Note: 'catchall' and 'unknown' no longer exist as EmailDecision types — all map to 'risky'
  const [executing, setExecuting] = useState(false);
  const [pendingLead, setPendingLead] = useState<typeof EMPTY_FORM | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasProcessingRef = useRef(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddToList, setShowAddToList] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel?: string; onConfirm: () => void; secondLabel?: string; onSecond?: () => void } | null>(null);

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

  const loadJobById = useCallback(async (id: string): Promise<ImportJob | null> => {
    const res = await fetch(`/api/leads/import-jobs/${id}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.job || null;
  }, []);

  const loadActiveJob = useCallback(async (listId: string | null) => {
    // Clear previous job immediately so switching lists never shows the wrong job's banner
    setActiveJob(null);
    setShowJobModal(false);
    const p = listId ? `?list_id=${listId}` : '';
    const res = await fetch(`/api/leads/import-jobs${p}`);
    if (!res.ok) return;
    const d = await res.json();
    const jobs: ImportJob[] = d.jobs || [];
    const pending = jobs.find(j => j.status === 'processing' || j.status === 'done');
    if (pending) setActiveJob(pending);
  }, []);

  // On mount: check URL for ?job= (from notification link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId) {
      loadJobById(jobId).then(job => {
        if (job) { setActiveJob(job); if (job.status === 'done') setShowJobModal(true); }
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadJobById]);

  // Load active jobs when selected list changes
  useEffect(() => {
    loadActiveJob(selectedList);
  }, [selectedList, loadActiveJob]);

  // Poll when job is processing; auto-open modal on completion; auto-dismiss if stuck >5 min
  useEffect(() => {
    if (activeJob?.status === 'processing') wasProcessingRef.current = true;
    if (activeJob?.status === 'done' && wasProcessingRef.current) {
      wasProcessingRef.current = false;
      setShowJobModal(true);
    }
  }, [activeJob?.status]);

  useEffect(() => {
    if (activeJob?.status !== 'processing') return;
    if (pollRef.current) clearInterval(pollRef.current);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 5 * 60 * 1000) {
        clearInterval(pollRef.current!);
        fetch(`/api/leads/import-jobs/${activeJob.id}`, { method: 'DELETE' }).catch(() => {});
        setActiveJob(null);
        showMsg('Validation timed out — please try again.');
        return;
      }
      const job = await loadJobById(activeJob.id);
      if (!job) return;
      setActiveJob(job);
      if (job.status !== 'processing') clearInterval(pollRef.current!);
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeJob?.id, activeJob?.status, loadJobById]);

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

  // ── Job-computed values ────────────────────────────────────────────
  const filteredResults = useMemo(() => {
    if (!activeJob?.results) return [];
    let arr: typeof activeJob.results;
    if (jobFilter === 'all') arr = activeJob.results;
    else if (jobFilter === 'dupes') arr = activeJob.results.filter(r => r.reasons.some(s => s.includes('Duplicate')) || r.is_dupe_this_list);
    else if (jobFilter === 'importable') arr = activeJob.results.filter(r => ['safe','likely_safe','risky'].includes(r.decision));
    else if (jobFilter === 'blocked') arr = activeJob.results.filter(r => ['unsafe','invalid','suppressed'].includes(r.decision));
    else arr = activeJob.results.filter(r => r.decision === jobFilter);
    return arr.slice(0, 200);
  }, [activeJob?.results, jobFilter]);

  const importCount = useMemo(() => {
    if (!activeJob?.results) return 0;
    return activeJob.results.filter(r => {
      if (!['safe','likely_safe','risky'].includes(r.decision)) return false;
      if (r.decision === 'risky' && !includeRisky) return false;
      if (r.dupe_lists.length > 0 && !includeCrossListJob) return false;
      return true;
    }).length;
  }, [activeJob?.results, includeRisky, includeCrossListJob]);

  // ── Import (validate → job) ────────────────────────────────────────
  const handleImport = async (file: File, isSingleLead = false) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      showMsg(`Unsupported file type ".${ext}". Please upload a CSV or Excel file (.csv, .xlsx, .xls).`);
      return;
    }
    setValidating(true);
    const fd = new FormData();
    fd.append('file', file);
    if (selectedList) fd.append('list_id', selectedList);
    try {
      const res = await fetch('/api/leads/validate', { method: 'POST', body: fd });
      const d = await res.json();
      if (res.ok) {
        const job: ImportJob = {
          id: d.job_id,
          status: d.status,
          progress: d.status === 'done' ? 100 : 0,
          total_emails: d.quick_summary?.total ?? 0,
          filename: file.name,
          list_id: selectedList,
          list_name: null,
          results: d.results ?? null,
          summary: d.summary ?? null,
          created_at: new Date().toISOString(),
          completed_at: d.status === 'done' ? new Date().toISOString() : null,
        };
        setActiveJob(job);
        setJobFilter('all');
        setIncludeRisky(true);
        setIncludeCrossListJob(true);
        // Auto-open modal for sync results or single lead
        if (d.status === 'done') setShowJobModal(true);
      } else {
        showMsg(`Error: ${d.error}`);
        setPendingLead(null);
      }
    } catch {
      showMsg('Validation failed. Please try again.');
      setPendingLead(null);
    }
    setValidating(false);
  };

  const retryBlocked = async () => {
    if (!activeJob || activeJob.status !== 'done') return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/leads/import-jobs/${activeJob.id}/retry`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setActiveJob(j => j ? { ...j, results: d.results, summary: d.summary } : j);
        if (d.retried === 0) showMsg('No retryable blocked emails found.');
        else showMsg(`Re-checked ${d.retried} blocked email${d.retried !== 1 ? 's' : ''} — results updated.`);
      }
    } catch { showMsg('Retry failed. Please try again.'); }
    setRetrying(false);
  };

  const executeImport = async () => {
    if (!activeJob || activeJob.status !== 'done') return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/leads/import-jobs/${activeJob.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_risky: includeRisky, include_catchall: true, include_cross_list: includeCrossListJob }),
      });
      const d = await res.json();
      if (res.ok) {
        const count = d.imported || 0;
        showMsg(pendingLead
          ? (count > 0 ? '✓ Lead added' : '✗ Email is blocked — not added')
          : `✓ ${count} lead${count !== 1 ? 's' : ''} imported`
        );
        setActiveJob(null);
        setShowJobModal(false);
        setPendingLead(null);
        fetchLeads('', selectedList);
        fetchLists();
        fetch('/api/leads?search=').then(r => r.json()).then(data => {
          if (Array.isArray(data)) setTotalCount(data.length);
        });
      } else {
        showMsg(`Error: ${d.error}`);
      }
    } catch {
      showMsg('Import failed. Please try again.');
    }
    setExecuting(false);
  };

  const dismissJob = async () => {
    if (!activeJob) return;
    await fetch(`/api/leads/import-jobs/${activeJob.id}`, { method: 'DELETE' });
    setActiveJob(null);
    setShowJobModal(false);
    setPendingLead(null);
  };

  // ── List Picker ────────────────────────────────────────────────────
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

    if (!listId) { showMsg('Please select or create a list first'); setPickerSaving(false); return; }

    closePicker();
    setPickerSaving(false);
    selectList(listId);
  };

  // ── Add / Edit Lead ────────────────────────────────────────────────
  const handleAddClick = () => {
    if (selectedList) { setEditingLead(null); setForm(EMPTY_FORM); setShowForm(true); }
    else openPicker();
  };

  const handleImportClick = () => {
    if (selectedList) fileRef.current?.click();
    else openPicker();
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
      setSaving(false);
    } else {
      // Single lead: wrap as CSV → validate → job modal
      const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
      const csvContent = [
        'email,first_name,last_name,company,title,website,phone',
        [form.email, form.first_name, form.last_name, form.company, form.title, form.website, form.phone].map(esc).join(','),
      ].join('\n');
      const csvFile = new File([new Blob([csvContent], { type: 'text/csv' })], `lead_${Date.now()}.csv`);
      setSaving(false);
      setShowForm(false);
      setPendingLead(form);
      await handleImport(csvFile, true);
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setConfirmModal({
      title: 'Delete lead?',
      message: 'This lead will be permanently removed.',
      onConfirm: () => {
        setConfirmModal(null);
        setLeads(p => p.filter(l => l.id !== leadId));
        setSelected(p => { const n = new Set(p); n.delete(leadId); return n; });
        setTotalCount(c => Math.max(0, c - 1));
        fetch(`/api/leads/${leadId}`, { method: 'DELETE' }).then(() => fetchLists());
      },
    });
  };

  const handleBulkDelete = () => {
    if (!selected.size) return;
    setConfirmModal({
      title: `Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}?`,
      message: `${selected.size} lead${selected.size !== 1 ? 's' : ''} will be permanently removed.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setDeleting(true);
        await Promise.all([...selected].map(id => fetch(`/api/leads/${id}`, { method: 'DELETE' })));
        setLeads(p => p.filter(l => !selected.has(l.id)));
        setTotalCount(c => Math.max(0, c - selected.size));
        setSelected(new Set());
        setDeleting(false);
        fetchLists();
      },
    });
  };

  const handleAddToList = async (listId: string) => {
    await fetch(`/api/lead-lists/${listId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: [...selected] }) });
    setShowAddToList(false);
    showMsg(`✓ Added ${selected.size} lead${selected.size !== 1 ? 's' : ''} to list`);
    setSelected(new Set());
    fetchLists();
  };

  const handleRemoveFromList = () => {
    if (!selectedList || !selected.size) return;
    const list = lists.find(l => l.id === selectedList);
    setConfirmModal({
      title: `Remove ${selected.size} lead${selected.size !== 1 ? 's' : ''} from list?`,
      message: `${selected.size} lead${selected.size !== 1 ? 's' : ''} will be removed from "${list?.name ?? 'this list'}".`,
      onConfirm: async () => {
        setConfirmModal(null);
        await fetch(`/api/lead-lists/${selectedList}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: [...selected] }) });
        setLeads(p => p.filter(l => !selected.has(l.id)));
        setSelected(new Set());
        fetchLists();
      },
    });
  };

  const createList = async () => {
    if (!newListName.trim() || creatingList) return;
    setCreatingList(true);
    const res = await fetch('/api/lead-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newListName.trim() }) });
    const d = await res.json();
    if (res.ok) { setLists(p => [...p, d]); setNewListName(''); setShowNewList(false); }
    setCreatingList(false);
  };

  const deleteList = (id: string) => {
    const list = lists.find(l => l.id === id);
    setCtxMenu(null);
    setConfirmModal({
      title: 'Delete list?',
      message: `"${list?.name ?? 'This list'}" and leads only in this list will be permanently deleted.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        setConfirmModal(null);
        setLists(p => p.filter(l => l.id !== id));
        if (selectedList === id) { setSelectedList(null); setLeads([]); setTotalCount(0); }
        fetch(`/api/lead-lists/${id}`, { method: 'DELETE' });
      },
    });
  };

  const saveRename = async () => {
    if (!renamingList || !renameVal.trim()) return;
    const res = await fetch(`/api/lead-lists/${renamingList.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: renameVal.trim() }) });
    if (res.ok) setLists(p => p.map(l => l.id === renamingList.id ? { ...l, name: renameVal.trim() } : l));
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
          <a href={selectedList ? `/api/leads/export?list_id=${selectedList}` : '/api/leads/export'} download
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export
          </a>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = ''; }}/>
          <button onClick={handleImportClick} disabled={validating}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Accepts CSV or Excel files (.csv, .xlsx, .xls)">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            {validating ? 'Validating…' : 'Import CSV / Excel'}
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

      {/* ── Import job banner ────────────────────────────────────────── */}
      {activeJob && !showJobModal && (
        <div className={`mx-6 mb-3 rounded-xl border px-4 py-3 flex items-center gap-3 ${
          activeJob.status === 'processing' ? 'bg-blue-50 border-blue-100' :
          activeJob.status === 'done' ? 'bg-emerald-50 border-emerald-100' :
          'bg-red-50 border-red-100'
        }`}>
          {activeJob.status === 'processing' ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"/>
          ) : activeJob.status === 'done' ? (
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          )}
          <div className="flex-1 min-w-0">
            {activeJob.status === 'processing' ? (
              <>
                <p className="text-sm font-semibold text-blue-800">
                  Validating {activeJob.total_emails} emails{activeJob.filename ? ` from "${activeJob.filename}"` : ''}…
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden w-40">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${activeJob.progress}%` }}/>
                  </div>
                  <span className="text-xs text-blue-500 font-semibold tabular-nums">{activeJob.progress}%</span>
                </div>
              </>
            ) : activeJob.status === 'done' ? (
              <p className="text-sm font-semibold text-emerald-800">
                Validation complete
                {activeJob.summary && ` — ${activeJob.summary.importable ?? activeJob.summary.safe} importable, ${(activeJob.summary.invalid ?? 0) + (activeJob.summary.suppressed ?? 0) + (activeJob.summary.unsafe ?? 0)} blocked`}
                {activeJob.filename && <span className="font-normal text-emerald-700"> · {activeJob.filename}</span>}
              </p>
            ) : (
              <div>
                <p className="text-sm font-semibold text-red-700">Validation failed — the email checker timed out or hit an error.</p>
                <p className="text-xs text-red-500 mt-0.5">Dismiss and try uploading the file again.</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeJob.status === 'done' && (
              <button onClick={async () => {
                // If results weren't loaded (e.g. from list-route which omitted them), fetch full job first
                if (!activeJob.results) {
                  const full = await loadJobById(activeJob.id);
                  if (full) setActiveJob(full);
                }
                setShowJobModal(true);
              }} className="text-xs font-bold bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors">
                View Results →
              </button>
            )}
            <button
              onClick={() => activeJob?.status === 'done' ? setShowDiscardConfirm(true) : dismissJob()}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
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
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5"><Skeleton className={`h-3 ${j === 0 ? 'w-5' : j === 1 ? 'w-24' : j === 2 ? 'w-32' : 'w-16'}`}/></td>
                        ))}
                      </tr>
                    ))
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
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Rename</button>
            <button onClick={() => deleteList(ctxMenu.list.id)}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Delete List</button>
          </div>
        </>
      )}

      {/* List Picker Modal */}
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
                    checked={pickerListId === list.id} onChange={() => setPickerListId(list.id)} className="accent-blue-600"/>
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
              <button onClick={closePicker} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button disabled={pickerSaving || (!pickerListId && !pickerNewName.trim())} onClick={handlePickerConfirm}
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
              <button disabled={!form.email || saving || validating} onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? 'Saving…' : validating && !editingLead ? 'Checking email…' : editingLead ? 'Save Changes' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          secondLabel={confirmModal.secondLabel}
          onSecond={confirmModal.onSecond}
        />
      )}

      {/* ── Import Job Results Modal ────────────────────────────────── */}
      {showJobModal && activeJob && activeJob.status === 'done' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    {pendingLead ? 'Add Lead — Validation Result' : 'Import Results'}
                  </h2>
                  <button onClick={() => setShowHelp(true)} title="What do these statuses mean?"
                    className="w-5 h-5 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 text-[11px] font-bold flex items-center justify-center transition-colors shrink-0">
                    ?
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {activeJob.filename && <span className="font-medium text-gray-500">{activeJob.filename}</span>}
                  {activeJob.list_name && <span> → {activeJob.list_name}</span>}
                  {activeJob.summary && (
                    <span className="ml-2">{activeJob.summary.total} emails scanned</span>
                  )}
                </p>
              </div>
              <button onClick={() => { setShowJobModal(false); if (!pendingLead) setPendingLead(null); }}
                className="text-gray-400 hover:text-gray-700 transition-colors ml-4 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Summary cards */}
            {activeJob.summary && (
              <div className="px-6 pt-4 pb-3 grid grid-cols-4 gap-2 shrink-0">
                {[
                  { key: 'safe',        label: 'Safe',        count: activeJob.summary.safe,                                              cls: 'text-emerald-600', active: 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' },
                  { key: 'likely_safe', label: 'Likely Safe', count: activeJob.summary.likely_safe,                                       cls: 'text-teal-600',    active: 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' },
                  { key: 'risky',       label: 'Risky',       count: activeJob.summary.risky,                                             cls: 'text-amber-600',   active: 'bg-amber-50 border-amber-300 ring-1 ring-amber-400' },
                  { key: 'blocked',     label: 'Blocked',     count: (activeJob.summary.invalid ?? 0) + (activeJob.summary.suppressed ?? 0) + (activeJob.summary.unsafe ?? 0), cls: 'text-red-500', active: 'bg-red-50 border-red-300 ring-1 ring-red-400' },
                ].map(card => (
                  <button key={card.key}
                    onClick={() => setJobFilter(f => f === card.key as any ? 'all' : card.key as any)}
                    className={`rounded-xl border p-3 text-left transition-all ${jobFilter === card.key ? card.active : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <p className={`text-2xl font-bold ${card.cls}`}>{card.count}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">{card.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="px-6 pb-3 flex items-center gap-4 shrink-0 flex-wrap">
              <button type="button" onClick={() => setIncludeRisky(v => !v)}
                className="flex items-center gap-2 cursor-pointer select-none group">
                <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${includeRisky ? 'bg-amber-400' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${includeRisky ? 'left-4' : 'left-0.5'}`}/>
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-800">Include Risky</span>
              </button>
              {activeJob.results?.some(r => r.dupe_lists.length > 0) && (
                <button type="button" onClick={() => setIncludeCrossListJob(v => !v)}
                  className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${includeCrossListJob ? 'bg-blue-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${includeCrossListJob ? 'left-4' : 'left-0.5'}`}/>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-800">Include cross-list dupes</span>
                </button>
              )}
              <div className="ml-auto flex items-center gap-1">
                {([
                  { key: 'all',        label: 'All',        count: null },
                  { key: 'importable', label: 'Importable', count: activeJob.results?.filter(r => ['safe','likely_safe','risky'].includes(r.decision)).length ?? 0 },
                  { key: 'blocked',    label: 'Blocked',    count: activeJob.results?.filter(r => ['unsafe','invalid','suppressed'].includes(r.decision)).length ?? 0 },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setJobFilter(f.key)}
                    className={`text-[11px] font-bold rounded-lg px-2.5 py-1 transition-all ${jobFilter === f.key ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                    {f.label}
                    {f.count !== null && <span className="ml-1 opacity-60">{f.count}</span>}
                  </button>
                ))}
                {activeJob.results && activeJob.results.some(r => r.reasons.includes('Duplicate in uploaded file') || r.is_dupe_this_list) && (
                  <button onClick={() => setJobFilter(f => f === 'dupes' ? 'all' : 'dupes')}
                    className={`text-[11px] font-bold rounded-lg px-2.5 py-1 transition-all ${jobFilter === 'dupes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                    Dupes
                    <span className="ml-1 opacity-60">
                      {activeJob.results.filter(r => r.reasons.includes('Duplicate in uploaded file') || r.is_dupe_this_list).length}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Results table */}
            <div className="flex-1 overflow-auto border-t border-gray-100 min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Score</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Decision</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">Provider</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No emails in this category</td></tr>
                  ) : filteredResults.map((r, i) => {
                    const style = decisionStyle(r.decision);
                    return (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800 text-xs truncate max-w-[200px]">{r.email}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-7 text-right ${style.score}`}>{r.score}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-14">
                              <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${r.score}%` }}/>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex text-[10px] font-bold rounded-full px-2 py-0.5 ${style.badge}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] text-gray-500 font-medium">{r.provider}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-gray-500 truncate max-w-[220px]" title={r.reasons[0]}>
                          {r.reasons[0] ?? '—'}
                          {r.dupe_lists.length > 0 && (
                            <span className="ml-1 text-amber-500 font-semibold">· in {r.dupe_lists.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {activeJob.results && filteredResults.length < (jobFilter === 'all' ? activeJob.results.length : activeJob.results.filter(r => r.decision === jobFilter).length) && (
                <p className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
                  Showing first 200 of {jobFilter === 'all' ? activeJob.results.length : activeJob.results.filter(r => r.decision === jobFilter).length} — use filters to narrow down
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={dismissJob} className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                  Dismiss
                </button>
                {activeJob?.results?.some(r => r.decision === 'invalid' && r.smtp === 'invalid' && !r.pre_fail && !r.is_bounce && !r.is_unsub && !r.is_dupe_this_list) && (
                  <button
                    onClick={retryBlocked}
                    disabled={retrying}
                    className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    {retrying && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/>}
                    {retrying ? 'Retrying…' : 'Retry Blocked'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400 font-medium">
                  {importCount} email{importCount !== 1 ? 's' : ''} will be imported
                </p>
                <button
                  onClick={executeImport}
                  disabled={executing || importCount === 0}
                  className="py-2.5 px-6 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  {executing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                  {pendingLead
                    ? (importCount > 0 ? 'Add Lead' : 'Email Blocked')
                    : (importCount === 0 ? 'Nothing to Import' : `Import ${importCount} Lead${importCount !== 1 ? 's' : ''}`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validating overlay */}
      {validating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 max-w-xs w-full">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">Validating emails…</p>
              <p className="text-xs text-gray-400 mt-1">Checking syntax, bounces, SMTP & duplicates</p>
              <p className="text-xs text-blue-500 mt-2 font-medium">Please wait, this may take a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Help Modal ───────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-bold text-gray-900">Email Status Guide</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {([
                {
                  badge: 'bg-emerald-100 text-emerald-700', label: 'Safe',
                  score: '80–100', icon: '✓',
                  what: 'SMTP confirmed the mailbox exists. Business domain. Highest confidence.',
                  factors: ['Valid MX records (+20)', 'Not disposable (+10)', 'No bounce history (+10)', 'Business domain (+10)', 'SMTP 250 accepted (+30)'],
                  missing: 'Nothing significant — send freely.',
                },
                {
                  badge: 'bg-teal-100 text-teal-700', label: 'Likely Safe',
                  score: '65–79', icon: '✓',
                  what: 'Major provider (Outlook, Yahoo, Gmail confirmed 250) or strong signals. Very good to send.',
                  factors: ['Valid MX (+20)', 'Not disposable (+10)', 'No bounce (+10)', 'Major provider trust (+10)', 'MX confirmed / SMTP accepted (+20–30)'],
                  missing: 'Can\'t 100% verify the specific mailbox (e.g. Outlook blocks probes), but the provider is trusted.',
                },
                {
                  badge: 'bg-amber-100 text-amber-700', label: 'Risky',
                  score: '45–64', icon: '~',
                  what: 'Covers three scenarios: (1) Catch-All — domain accepts all addresses, can\'t verify your specific mailbox. (2) Unknown probe — SMTP blocked/timeout, or Gmail/consumer 550 (which are unreliable). (3) Scored risky — weak SMTP signal.',
                  factors: ['Valid MX (+20)', 'Not disposable (+10)', 'No bounce (+10)', 'Catch-all or probe blocked = 45'],
                  missing: 'No confirmed mailbox acceptance. Toggle "Include Risky" to import these (default ON). Expect higher bounce rate than Safe/Likely Safe.',
                },
                {
                  badge: 'bg-orange-100 text-orange-700', label: 'Suppressed',
                  score: '0', icon: '✕',
                  what: 'Previously hard-bounced in one of your campaigns, or the contact unsubscribed.',
                  factors: [],
                  missing: 'Cannot contact — email regulations (CAN-SPAM, GDPR) require you to honour bounces and unsubscribes.',
                },
                {
                  badge: 'bg-red-100 text-red-600', label: 'Invalid',
                  score: '0', icon: '✕',
                  what: 'Hard failure. Business SMTP returned 550 (no such user), OR bad syntax, OR disposable/temporary domain.',
                  factors: [],
                  missing: 'Sending will hard-bounce and damage your sender reputation. Do not import.',
                },
                {
                  badge: 'bg-red-100 text-red-500', label: 'Unsafe',
                  score: '0–49', icon: '✕',
                  what: 'Very low confidence. Domain may exist but mailbox extremely uncertain.',
                  factors: [],
                  missing: 'Multiple signals failed. High bounce risk.',
                },
              ] as const).map(s => (
                <div key={s.label} className="flex gap-3">
                  <div className="shrink-0 pt-0.5">
                    <span className={`inline-flex text-[10px] font-bold rounded-full px-2 py-0.5 ${s.badge}`}>{s.label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold text-gray-900">{s.what}</p>
                      <span className="text-[10px] font-bold text-gray-400 shrink-0">Score: {s.score}</span>
                    </div>
                    {s.factors.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.factors.map(f => (
                          <span key={f} className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">{f}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{s.missing}</p>
                  </div>
                </div>
              ))}

              {/* Duplicates */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-900 mb-2">Duplicates</p>
                <div className="space-y-2 text-xs text-gray-600">
                  <p><span className="font-semibold text-purple-700">In-List Dupe</span> — this email already exists in the list you&apos;re importing to. It will be skipped to avoid duplicates.</p>
                  <p><span className="font-semibold text-blue-600">Cross-List Dupe</span> — this email is in one of your other lists. Toggle &ldquo;Include cross-list dupes&rdquo; to import it here too.</p>
                  <p><span className="font-semibold text-gray-700">File Dupe</span> — the same email appeared more than once in your uploaded CSV/XLSX. Only the first occurrence is kept.</p>
                </div>
              </div>

              {/* Tip */}
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-blue-800 mb-1">Import strategy</p>
                <p className="text-xs text-blue-700">Safe + Likely Safe = highest deliverability, send freely. Risky = worth sending to but watch bounce rates. Blocked = never import. Toggle "Include Risky" ON (default) to maximise reach; OFF for safest-only lists.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard confirmation modal */}
      {showDiscardConfirm && activeJob && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Validation Complete</p>
              {activeJob.summary && (
                <p className="text-sm text-gray-600 mt-1">
                  {activeJob.summary.importable ?? activeJob.summary.safe} leads ready to import,{' '}
                  {(activeJob.summary.invalid ?? 0) + (activeJob.summary.suppressed ?? 0) + (activeJob.summary.unsafe ?? 0)} blocked.
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">Do you want to import the leads or discard this report?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDiscardConfirm(false); setShowJobModal(true); }}
                className="flex-1 bg-blue-600 text-white text-sm font-bold rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors">
                Import Leads
              </button>
              <button
                onClick={() => { setShowDiscardConfirm(false); dismissJob(); }}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
