'use client';

import { useEffect, useRef, useState } from 'react';
import { bodyToHtml } from '@/lib/body-to-html';

const CATEGORIES = ['Cold Outreach', 'Follow-up', 'Meeting Request', 'Break-up', 'Re-engagement'];
const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}', '{{website}}', '{{unsubscribe_link}}'];
const DEFAULT_UNSUB = 'To unsubscribe, click here: {{unsubscribe_link}}\n{{company_address}}';

type Template = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  unsub_text: string;
  open_rate: string | null;
  reply_rate: string | null;
  sort_order: number;
  active: boolean;
};

function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: Partial<Template>;
  onSave: (t: Omit<Template, 'id' | 'sort_order' | 'active'>) => void;
  onClose: () => void;
}) {
  const isEdit = !!template.id;
  const [name, setName] = useState(template.name ?? '');
  const [category, setCategory] = useState(template.category ?? CATEGORIES[0]);
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body ?? '');
  const [unsubText, setUnsubText] = useState(template.unsub_text ?? DEFAULT_UNSUB);
  const [openRate, setOpenRate] = useState(template.open_rate ?? '');
  const [replyRate, setReplyRate] = useState(template.reply_rate ?? '');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const isSubject = activeField === 'subject';
    const ref = isSubject ? subjectRef.current : bodyRef.current;
    const text = isSubject ? subject : body;
    const setter = isSubject ? setSubject : setBody;
    if (!ref) { setter(text + v); return; }
    const s = ref.selectionStart ?? text.length;
    const e = ref.selectionEnd ?? text.length;
    setter(text.slice(0, s) + v + text.slice(e));
    setTimeout(() => { ref.focus(); ref.setSelectionRange(s + v.length, s + v.length); }, 0);
  };

  const valid = name.trim() && subject.trim() && body.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Template' : 'New Prebuilt Template'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Template Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Problem Solver"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Open Rate (display)</label>
              <input value={openRate} onChange={e => setOpenRate(e.target.value)} placeholder="e.g. 67%"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Reply Rate (display)</label>
              <input value={replyRate} onChange={e => setReplyRate(e.target.value)} placeholder="e.g. 18%"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Variables</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button key={v} type="button" onClick={() => insertVar(v)}
                  className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-100">
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['edit', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'edit' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject Line</label>
                <input ref={subjectRef} value={subject} onChange={e => setSubject(e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="e.g. Quick question about {{company}}"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Body</label>
                <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
                  onFocus={() => setActiveField('body')}
                  rows={10}
                  placeholder={`Hi {{first_name}},\n\nWrite your template here...\n\n[Your Name]`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Unsubscribe Footer</label>
                <textarea value={unsubText} onChange={e => setUnsubText(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"/>
              </div>
            </>
          )}

          {tab === 'preview' && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Subject</p>
                <p className="text-sm font-medium text-gray-900">{subject || <span className="text-gray-300">No subject</span>}</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Body</p>
                <iframe srcDoc={bodyToHtml(body, unsubText, true)} className="w-full min-h-[220px] border-0 rounded-xl"
                  title="Preview" sandbox="allow-same-origin"/>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => valid && onSave({ name, category, subject, body, unsub_text: unsubText, open_rate: openRate || null, reply_rate: replyRate || null })}
            disabled={!valid}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40">
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/admin/templates')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTemplates(d); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (data: Omit<Template, 'id' | 'sort_order' | 'active'>) => {
    if (editTarget) {
      const res = await fetch(`/api/admin/templates/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, category: data.category, subject: data.subject, body: data.body, unsub_text: data.unsub_text, open_rate: data.open_rate, reply_rate: data.reply_rate }),
      });
      const updated = await res.json();
      if (updated.id) {
        setTemplates(prev => prev.map(t => t.id === editTarget.id ? updated : t));
        showToast('Template updated');
      }
    } else {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, category: data.category, subject: data.subject, body: data.body, unsub_text: data.unsub_text, open_rate: data.open_rate, reply_rate: data.reply_rate }),
      });
      const created = await res.json();
      if (created.id) {
        setTemplates(prev => [...prev, created]);
        showToast('Template created — users can now see it');
      }
    }
    setCreateOpen(false);
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prebuilt template? Users will no longer see it.')) return;
    await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast('Template deleted');
  };

  const allCats = ['All', ...CATEGORIES];
  const filtered = templates.filter(t =>
    (filterCat === 'All' || t.category === filterCat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Prebuilt Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage templates shown to all users. Changes reflect immediately on user dashboards.</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New Template
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {allCats.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCat === c ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"/>
              <div className="h-3 bg-gray-100 rounded animate-pulse w-full"/>
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col hover:shadow-md hover:border-blue-100 transition-all">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">{t.category}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{t.name}</h3>
              <p className="text-xs text-gray-500 font-medium mb-1 truncate">Subject: {t.subject}</p>
              <p className="text-xs text-gray-400 leading-relaxed flex-1 line-clamp-2 mb-4">
                {t.body.split('\n').filter(l => l.trim())[0]}
              </p>
              <div className="flex items-center gap-3 mb-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">{t.open_rate ?? '—'}</p>
                  <p className="text-[10px] text-gray-400">Open</p>
                </div>
                <div className="w-px h-6 bg-gray-100"/>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">{t.reply_rate ?? '—'}</p>
                  <p className="text-[10px] text-gray-400">Reply</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditTarget(t)}
                  className="flex-1 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50">
                  Edit
                </button>
                <button onClick={() => handleDelete(t.id)}
                  className="px-3 text-gray-300 hover:text-red-400 border border-gray-100 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full flex flex-col items-center py-16 text-center">
              <p className="text-sm font-semibold text-gray-600 mb-2">No templates found</p>
              <button onClick={() => setCreateOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Create first template</button>
            </div>
          )}
        </div>
      )}

      {(createOpen || editTarget) && (
        <TemplateModal
          template={editTarget ?? {}}
          onSave={handleSave}
          onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        />
      )}
    </main>
  );
}
