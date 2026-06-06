'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Cold Outreach', 'Follow-up', 'Meeting Request', 'Break-up', 'Re-engagement'];
const VARIABLES = ['{{first_name}}', '{{company}}', '{{industry}}', '{{pain_point}}', '{{topic}}', '{{mutual_name}}'];

type Template = {
  id: number;
  category: string;
  name: string;
  subject: string;
  body: string;
  builtIn: boolean;
  openRate: string;
  replyRate: string;
  uses: number;
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 1, builtIn: true, category: 'Cold Outreach',
    name: 'The Problem Solver',
    subject: "Quick question about {{company}}'s growth",
    body: `Hi {{first_name}},

I was looking at {{company}} and noticed most teams in {{industry}} struggle with {{pain_point}}.

We helped similar companies solve this — they went from stuck to scaling in just 60 days.

Worth a 15-min call to see if we can do the same for you?

[Your Name]`,
    openRate: '67%', replyRate: '18%', uses: 2841,
  },
  {
    id: 2, builtIn: true, category: 'Cold Outreach',
    name: 'The Compliment Hook',
    subject: 'Loved your post on {{topic}}',
    body: `Hi {{first_name}},

Saw your LinkedIn post about {{topic}} — really resonated with our team.

That made me think you'd appreciate what we're building at [Company] — we [One-line value prop].

Would you be open to a quick chat?

Best,
[Your Name]`,
    openRate: '72%', replyRate: '21%', uses: 1920,
  },
  {
    id: 3, builtIn: true, category: 'Follow-up',
    name: 'The Gentle Nudge',
    subject: 'Re: my last email',
    body: `Hi {{first_name}},

Just wanted to bump this up in case it got buried.

Did you get a chance to look at my previous email? I know inboxes get hectic.

Happy to keep it to 10 minutes if that's easier.

[Your Name]`,
    openRate: '61%', replyRate: '14%', uses: 4210,
  },
  {
    id: 4, builtIn: true, category: 'Follow-up',
    name: 'The Value Add',
    subject: 'Something useful for {{company}}',
    body: `Hi {{first_name}},

I put together a quick breakdown of how companies like {{company}} are solving {{pain_point}}.

[Link to resource / case study]

No strings attached — thought it might be useful. Let me know if any of this is relevant.

[Your Name]`,
    openRate: '58%', replyRate: '12%', uses: 1540,
  },
  {
    id: 5, builtIn: true, category: 'Meeting Request',
    name: 'The Direct Ask',
    subject: '15 mins this week?',
    body: `Hi {{first_name}},

I'll keep this short — I think we can help {{company}} with {{pain_point}}.

We've done it for [Company A] and [Company B].

15 mins this week to show you how? Here's my calendar: [Calendly Link]

[Your Name]`,
    openRate: '64%', replyRate: '19%', uses: 3305,
  },
  {
    id: 6, builtIn: true, category: 'Break-up',
    name: 'The Permission Email',
    subject: 'Should I close your file?',
    body: `Hi {{first_name}},

I've reached out a few times but haven't heard back — which usually means one of two things:

1. The timing is off
2. This isn't a priority right now

Either way, totally fine. Should I close your file and reach back in a few months?

[Your Name]`,
    openRate: '71%', replyRate: '28%', uses: 2190,
  },
  {
    id: 7, builtIn: true, category: 'Re-engagement',
    name: 'The Check-In',
    subject: 'Still relevant for {{company}}?',
    body: `Hi {{first_name}},

We spoke a while back about {{topic}}. I wanted to check in — a lot has changed on our end since then.

We've improved [area] that specifically addresses what we discussed.

Would it make sense to reconnect for a quick update?

[Your Name]`,
    openRate: '55%', replyRate: '16%', uses: 980,
  },
];

const EMPTY_FORM = { name: '', category: CATEGORIES[0], subject: '', body: '' };

function insertVar(
  text: string,
  variable: string,
  field: 'subject' | 'body',
  setSubject: (v: string) => void,
  setBody: (v: string) => void,
  subjectRef: React.RefObject<HTMLInputElement | null>,
  bodyRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const ref = field === 'subject' ? subjectRef.current : bodyRef.current;
  const setter = field === 'subject' ? setSubject : setBody;
  if (!ref) { setter(text + variable); return; }
  const start = ref.selectionStart ?? text.length;
  const end = ref.selectionEnd ?? text.length;
  const next = text.slice(0, start) + variable + text.slice(end);
  setter(next);
  setTimeout(() => {
    ref.focus();
    ref.setSelectionRange(start + variable.length, start + variable.length);
  }, 0);
}

function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: Partial<Template> | null;
  onSave: (t: Omit<Template, 'id' | 'builtIn' | 'openRate' | 'replyRate' | 'uses'>) => void;
  onClose: () => void;
}) {
  const isEdit = !!template?.id;
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState(template?.category ?? CATEGORIES[0]);
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [activeField, setActiveField] = useState<'subject' | 'body'>('subject');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  // refs typed correctly
  const subjectRef = { current: null } as React.RefObject<HTMLInputElement | null>;
  const bodyRef = { current: null } as React.RefObject<HTMLTextAreaElement | null>;

  const handleInsert = (v: string) =>
    insertVar(activeField === 'subject' ? subject : body, v, activeField, setSubject, setBody, subjectRef, bodyRef);

  const valid = name.trim() && subject.trim() && body.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Template' : 'Create Template'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Template Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Outreach Email"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 transition">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Variable helper */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">
              Insert variable <span className="font-normal text-gray-400">(click field first, then tap a variable)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button key={v} onClick={() => handleInsert(v)}
                  className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Edit / Preview toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {(['edit', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'edit' ? (
            <>
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject Line</label>
                <input
                  ref={subjectRef as React.RefObject<HTMLInputElement>}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="e.g. Quick question about {{company}}"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Body</label>
                <textarea
                  ref={bodyRef as React.RefObject<HTMLTextAreaElement>}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onFocus={() => setActiveField('body')}
                  placeholder={`Hi {{first_name}},\n\nWrite your email here...\n\n[Your Name]`}
                  rows={10}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none leading-relaxed"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Tip: Use <span className="font-mono">{'{{first_name}}'}</span> etc. for personalisation. Click a variable above to insert at cursor.
                </p>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm font-medium text-gray-900">{subject || <span className="text-gray-300">No subject yet</span>}</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Body</p>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{body || <span className="text-gray-300">No body yet</span>}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => valid && onSave({ name, category, subject, body })}
            disabled={!valid}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UseModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-base font-bold text-gray-900 mb-1">Use this template</h2>
        <p className="text-sm text-gray-400 mb-5">Choose where you want to use <span className="font-semibold text-gray-700">"{template.name}"</span>.</p>
        <div className="space-y-2 mb-5">
          <button onClick={() => router.push('/dashboard/campaigns/new')}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">New Campaign</p>
              <p className="text-xs text-gray-400">Start a fresh campaign with this template</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={onClose}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Copy to My Templates</p>
              <p className="text-xs text-gray-400">Duplicate and customise before using</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [useTarget, setUseTarget] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const allCats = ['All', ...CATEGORIES];

  const filtered = templates.filter(t =>
    (filterCat === 'All' || t.category === filterCat) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = (data: Omit<Template, 'id' | 'builtIn' | 'openRate' | 'replyRate' | 'uses'>) => {
    if (editTarget) {
      setTemplates(prev => prev.map(t => t.id === editTarget.id ? { ...t, ...data } : t));
    } else {
      const newT: Template = { ...data, id: Date.now(), builtIn: false, openRate: '—', replyRate: '—', uses: 0 };
      setTemplates(prev => [newT, ...prev]);
    }
    setCreateOpen(false);
    setEditTarget(null);
  };

  const handleDelete = (id: number) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setDeleteId(null);
  };

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ready-to-use templates — edit, create, or use in campaigns.</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Create Template
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {allCats.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${filterCat === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">{t.category}</span>
              {t.builtIn && (
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Built-in</span>
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-1">{t.name}</h3>
            <p className="text-xs text-gray-500 font-medium mb-1 truncate">Subject: {t.subject}</p>
            <p className="text-xs text-gray-400 leading-relaxed flex-1 line-clamp-2 mb-4">
              {t.body.split('\n').filter(l => l.trim())[0]}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-3 mb-4 pt-3 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{t.openRate}</p>
                <p className="text-[10px] text-gray-400">Open</p>
              </div>
              <div className="w-px h-6 bg-gray-100"/>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{t.replyRate}</p>
                <p className="text-[10px] text-gray-400">Reply</p>
              </div>
              <div className="w-px h-6 bg-gray-100"/>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{t.uses > 999 ? `${(t.uses / 1000).toFixed(1)}k` : t.uses || '—'}</p>
                <p className="text-[10px] text-gray-400">Uses</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setEditTarget(t)}
                className="flex-1 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors">
                Edit
              </button>
              <button onClick={() => setUseTarget(t)}
                className="flex-1 text-xs font-bold text-white bg-blue-600 rounded-xl py-2 hover:bg-blue-700 transition-colors">
                Use →
              </button>
              {!t.builtIn && (
                <button onClick={() => setDeleteId(t.id)}
                  className="px-2.5 text-gray-300 hover:text-red-400 border border-gray-100 rounded-xl transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1">No templates found</p>
          <p className="text-xs text-gray-400 mb-4">Try a different search or category.</p>
          <button onClick={() => setCreateOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            + Create one
          </button>
        </div>
      )}

      {/* Create / Edit modal */}
      {(createOpen || editTarget) && (
        <TemplateModal
          template={editTarget ?? {}}
          onSave={handleSave}
          onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        />
      )}

      {/* Use modal */}
      {useTarget && <UseModal template={useTarget} onClose={() => setUseTarget(null)} />}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Delete this template?</p>
            <p className="text-xs text-gray-400 mb-5">This can't be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
