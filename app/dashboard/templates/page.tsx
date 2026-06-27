'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';
import { bodyToHtml } from '@/lib/body-to-html';

const CATEGORIES = ['Cold Outreach', 'Follow-up', 'Meeting Request', 'Break-up', 'Re-engagement'];
const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}', '{{website}}', '{{unsubscribe_link}}'];

const DEFAULT_UNSUB = 'To unsubscribe, click here: {{unsubscribe_link}}\n{{company_address}}';

type Template = {
  id: number | string;
  dbId?: string;           // Supabase UUID — only on user-saved templates
  sourceBuiltinId?: number | null; // if this is a saved edit of a built-in
  category: string;
  name: string;
  subject: string;
  body: string;
  unsubText: string;
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

I was looking at {{company}} and noticed a few things we could help with.

We helped similar companies go from stuck to scaling in just 60 days.

Worth a 15-min call to see if we can do the same for you?

[Your Name]`,
    unsubText: DEFAULT_UNSUB,
    openRate: '67%', replyRate: '18%', uses: 2841,
  },
  {
    id: 2, builtIn: true, category: 'Cold Outreach',
    name: 'The Compliment Hook',
    subject: 'Quick thought for {{company}}',
    body: `Hi {{first_name}},

I came across {{company}} and was impressed by what you're building.

That made me think you'd appreciate what we're building — we [One-line value prop].

Would you be open to a quick chat?

Best,
[Your Name]`,
    unsubText: DEFAULT_UNSUB,
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
    unsubText: DEFAULT_UNSUB,
    openRate: '61%', replyRate: '14%', uses: 4210,
  },
  {
    id: 4, builtIn: true, category: 'Follow-up',
    name: 'The Value Add',
    subject: 'Something useful for {{company}}',
    body: `Hi {{first_name}},

I put together a quick breakdown of how companies like {{company}} are growing faster with less effort.

[Link to resource / case study]

No strings attached — thought it might be useful.

[Your Name]`,
    unsubText: DEFAULT_UNSUB,
    openRate: '58%', replyRate: '12%', uses: 1540,
  },
  {
    id: 5, builtIn: true, category: 'Meeting Request',
    name: 'The Direct Ask',
    subject: '15 mins this week?',
    body: `Hi {{first_name}},

I'll keep this short — I think we can help {{company}} get better results.

We've done it for [Company A] and [Company B].

15 mins this week to show you how? [Calendly Link]

[Your Name]`,
    unsubText: DEFAULT_UNSUB,
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

Either way, totally fine. Should I close your file?

[Your Name]`,
    unsubText: DEFAULT_UNSUB,
    openRate: '71%', replyRate: '28%', uses: 2190,
  },
  {
    id: 7, builtIn: true, category: 'Re-engagement',
    name: 'The Check-In',
    subject: 'Still relevant for {{company}}?',
    body: `Hi {{first_name}},

We connected a while back — I wanted to check in since a lot has changed on our end.

We've improved [area] that specifically addresses what we discussed.

Would it make sense to reconnect?

[Your Name]`,
    unsubText: DEFAULT_UNSUB,
    openRate: '55%', replyRate: '16%', uses: 980,
  },
];


function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}/>
    </button>
  );
}

function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: Partial<Template>;
  onSave: (t: Pick<Template, 'name' | 'category' | 'subject' | 'body' | 'unsubText'>) => void;
  onClose: () => void;
}) {
  const isEdit = !!template.id;
  const [name, setName] = useState(template.name ?? '');
  const [category, setCategory] = useState(template.category ?? CATEGORIES[0]);
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body ?? '');
  const [unsubText, setUnsubText] = useState(template.unsubText ?? DEFAULT_UNSUB);
  const [includeUnsub, setIncludeUnsub] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');
  const [tab, setTab] = useState<'edit' | 'preview' | 'html'>('edit');

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const btnUrlRef = useRef<HTMLInputElement>(null);

  const [linkDialog, setLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [linkSel, setLinkSel] = useState<{ start: number; end: number; text: string }>({ start: 0, end: 0, text: '' });

  const [btnDialog, setBtnDialog] = useState(false);
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');
  const [btnSel, setBtnSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

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

  const openLinkDialog = () => {
    setActiveField('body');
    const ref = bodyRef.current;
    const s = ref?.selectionStart ?? body.length;
    const e = ref?.selectionEnd ?? body.length;
    setLinkSel({ start: s, end: e, text: body.slice(s, e) });
    setLinkUrl('');
    setLinkDialog(true);
    setTimeout(() => linkUrlRef.current?.focus(), 30);
  };

  const insertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const displayText = linkSel.text || fullUrl;
    const target = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const tag = `<a href="${fullUrl}"${target}>${displayText}</a>`;
    const next = body.slice(0, linkSel.start) + tag + body.slice(linkSel.end);
    setBody(next);
    setLinkDialog(false);
    setLinkUrl('');
    const pos = linkSel.start + tag.length;
    setTimeout(() => { const r = bodyRef.current; if (r) { r.focus(); r.setSelectionRange(pos, pos); } }, 0);
  };

  const openBtnDialog = () => {
    setActiveField('body');
    const ref = bodyRef.current;
    const s = ref?.selectionStart ?? body.length;
    const e = ref?.selectionEnd ?? body.length;
    setBtnSel({ start: s, end: e });
    setBtnText(body.slice(s, e) || '');
    setBtnUrl('');
    setBtnDialog(true);
    setLinkDialog(false);
    setTimeout(() => btnUrlRef.current?.focus(), 30);
  };

  const insertButton = () => {
    const url = btnUrl.trim();
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const label = btnText.trim() || 'Click here';
    const tag = `<a href="${fullUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a>`;
    const next = body.slice(0, btnSel.start) + tag + body.slice(btnSel.end);
    setBody(next);
    setBtnDialog(false);
    setBtnText('');
    setBtnUrl('');
    const pos = btnSel.start + tag.length;
    setTimeout(() => { const r = bodyRef.current; if (r) { r.focus(); r.setSelectionRange(pos, pos); } }, 0);
  };

  const applyFormat = (open: string, close: string) => {
    const ref = bodyRef.current;
    if (!ref) return;
    const s = ref.selectionStart ?? 0;
    const e = ref.selectionEnd ?? 0;
    const selected = body.slice(s, e) || 'text';
    const next = body.slice(0, s) + open + selected + close + body.slice(e);
    setBody(next);
    setTimeout(() => { ref.focus(); ref.setSelectionRange(s + open.length, s + open.length + selected.length); }, 0);
  };

  const valid = name.trim() && subject.trim() && body.trim();

  const tabs: { id: 'edit' | 'preview' | 'html'; label: string }[] = [
    { id: 'edit', label: 'Edit' },
    { id: 'preview', label: 'Preview' },
    { id: 'html', label: 'HTML' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
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
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Cold Email"
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
            <p className="text-xs font-bold text-gray-500 mb-1.5">
              Variables <span className="font-normal text-gray-400">— click in subject or body first, then insert</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button key={v} type="button" onClick={() => insertVar(v)}
                  className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            {tabs.map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'edit' && (
            <>
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Subject Line</label>
                <input ref={subjectRef} value={subject} onChange={e => setSubject(e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="e.g. Quick question about {{company}}"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
              </div>

              {/* Formatting toolbar */}
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="text-xs font-bold text-gray-500 flex-1">Email Body</label>
                  <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {[
                      { label: 'B', title: 'Bold', o: '<strong>', c: '</strong>' },
                      { label: 'I', title: 'Italic', o: '<em>', c: '</em>' },
                      { label: 'U', title: 'Underline', o: '<u>', c: '</u>' },
                    ].map(f => (
                      <button key={f.label} type="button" title={f.title} onClick={() => { setActiveField('body'); applyFormat(f.o, f.c); }}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all">
                        <span style={f.label === 'B' ? { fontWeight: 900 } : f.label === 'I' ? { fontStyle: 'italic' } : { textDecoration: 'underline' }}>{f.label}</span>
                      </button>
                    ))}
                    <button type="button" title="Insert link" onClick={openLinkDialog}
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${linkDialog ? 'bg-blue-600 shadow-sm' : 'hover:bg-white hover:shadow-sm'}`}>
                      <svg className={`w-3.5 h-3.5 ${linkDialog ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    </button>
                    <button type="button" title="Unordered list" onClick={() => { setActiveField('body'); applyFormat('<ul>\n  <li>', '</li>\n</ul>'); }}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                    <button type="button" title="Button" onClick={openBtnDialog}
                      className={`px-2 h-7 flex items-center justify-center rounded-md text-[10px] font-bold transition-all ${btnDialog ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white hover:shadow-sm'}`}>
                      BTN
                    </button>
                  </div>
                </div>
                {linkDialog && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    <input ref={linkUrlRef} value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') insertLink(); if (e.key === 'Escape') setLinkDialog(false); }}
                      placeholder="https://example.com"
                      className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400 min-w-0"/>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 cursor-pointer select-none">
                      <input type="checkbox" checked={linkNewTab} onChange={e => setLinkNewTab(e.target.checked)} className="w-3 h-3 accent-blue-600"/>
                      New tab
                    </label>
                    <button type="button" onClick={insertLink} disabled={!linkUrl.trim()}
                      className="text-xs font-bold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-40">
                      Insert
                    </button>
                    <button type="button" onClick={() => setLinkDialog(false)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
                {btnDialog && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider w-8 shrink-0">Text</span>
                      <input value={btnText} onChange={e => setBtnText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setBtnDialog(false); }}
                        placeholder="e.g. Book a Call"
                        className="flex-1 text-sm bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400"/>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider w-8 shrink-0">URL</span>
                      <input ref={btnUrlRef} value={btnUrl} onChange={e => setBtnUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') insertButton(); if (e.key === 'Escape') setBtnDialog(false); }}
                        placeholder="https://calendly.com/yourname"
                        className="flex-1 text-sm bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 outline-none text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400"/>
                      <button type="button" onClick={insertButton} disabled={!btnUrl.trim()}
                        className="text-xs font-bold bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-40 whitespace-nowrap">
                        Insert Button
                      </button>
                      <button type="button" onClick={() => setBtnDialog(false)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-all shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-400 pl-9">Button appears as a styled blue CTA in the email</p>
                  </div>
                )}
                <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)}
                  onFocus={() => { setActiveField('body'); setLinkDialog(false); setBtnDialog(false); }}
                  placeholder={`Hi {{first_name}},\n\nWrite your email here...\n\n[Your Name]`}
                  rows={9}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none leading-relaxed font-mono"/>
              </div>

              {/* Unsubscribe toggle */}
              <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-700">Include unsubscribe footer</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Adds an opt-out link at the bottom of the email</p>
                  </div>
                  <Toggle on={includeUnsub} onToggle={() => setIncludeUnsub(v => !v)}/>
                </div>
                {includeUnsub && (
                  <>
                    <textarea value={unsubText} onChange={e => setUnsubText(e.target.value)} rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none font-mono"/>
                    <p className="text-[10px] text-gray-400">Keep <span className="font-mono">{'{{unsubscribe_link}}'}</span> in the text — it gets replaced with a real opt-out URL on send.</p>
                  </>
                )}
              </div>
            </>
          )}

          {tab === 'preview' && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm font-medium text-gray-900">{subject || <span className="text-gray-300 font-normal">No subject yet</span>}</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Body</p>
                {body ? (
                  <iframe
                    srcDoc={bodyToHtml(body, unsubText, includeUnsub)}
                    className="w-full min-h-[240px] border-0 rounded-xl"
                    title="Email preview"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <p className="text-sm text-gray-300">No body yet</p>
                )}
              </div>
            </div>
          )}

          {tab === 'html' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">HTML Body <span className="font-normal text-gray-400">— edit raw HTML directly</span></p>
                <button type="button" onClick={() => navigator.clipboard.writeText(bodyToHtml(body, unsubText, includeUnsub))}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors border border-blue-100 bg-blue-50 rounded-lg px-3 py-1">
                  Copy Full Email HTML
                </button>
              </div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
                placeholder="Write raw HTML here — e.g. <p>Hi {{first_name}},</p>"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-xs text-gray-600 font-mono outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 resize-none"/>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 bg-gray-50 border-b border-gray-100">Rendered Preview</p>
                <iframe
                  srcDoc={bodyToHtml(body, unsubText, includeUnsub)}
                  className="w-full h-64 border-0"
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={() => valid && onSave({ name, category, subject, body, unsubText })}
            disabled={!valid}
            className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isEdit ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UseModal({ template, onClose, onDuplicate }: { template: Template; onClose: () => void; onDuplicate: (t: Template) => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-base font-bold text-gray-900 mb-1">Use this template</h2>
        <p className="text-sm text-gray-400 mb-5">Where do you want to use <span className="font-semibold text-gray-700">"{template.name}"</span>?</p>
        <div className="space-y-2 mb-5">
          <button onClick={() => {
              localStorage.setItem('prefill_template', JSON.stringify({ subject: template.subject, body: template.body, unsubText: template.unsubText, templateId: template.dbId || null }));
              router.push('/dashboard/campaigns/new');
            }}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Start New Campaign</p>
              <p className="text-xs text-gray-400">Use this template in a new campaign</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={() => { onDuplicate(template); onClose(); }}
            className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Duplicate & Customise</p>
              <p className="text-xs text-gray-400">Copy to My Templates and edit freely</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function toTemplate(row: Record<string, unknown>): Template {
  const sourceBuiltin = row.source_builtin_id != null
    ? DEFAULT_TEMPLATES.find(t => t.id === (row.source_builtin_id as number))
    : null;
  return {
    id: row.id as string,
    dbId: row.id as string,
    sourceBuiltinId: (row.source_builtin_id as number) ?? null,
    name: row.name as string,
    category: row.category as string,
    subject: row.subject as string,
    body: row.body as string,
    unsubText: (row.unsub_text as string) ?? DEFAULT_UNSUB,
    builtIn: false,
    openRate: (row.open_rate as string | null) ?? sourceBuiltin?.openRate ?? '—',
    replyRate: (row.reply_rate as string | null) ?? sourceBuiltin?.replyRate ?? '—',
    uses: ((row.uses as number) > 0 ? (row.uses as number) : null) ?? sourceBuiltin?.uses ?? 0,
  };
}

export default function TemplatesPage() {
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [prebuiltTemplates, setPrebuiltTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [useTarget, setUseTarget] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUserTemplates(data.map(toTemplate));
    });
    fetch('/api/templates/prebuilt').then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setPrebuiltTemplates(data.map((t: any) => ({
          id: t.id,
          dbId: undefined,
          sourceBuiltinId: null,
          name: t.name,
          category: t.category,
          subject: t.subject,
          body: t.body,
          unsubText: t.unsub_text,
          builtIn: true,
          openRate: t.open_rate ?? '—',
          replyRate: t.reply_rate ?? '—',
          uses: 0,
        } as Template)));
      }
    }).catch(() => {});
  }, []);

  // Merge: user templates first, then prebuilt ones not overridden by a user edit
  const overriddenBuiltinIds = new Set(
    userTemplates.filter(t => t.sourceBuiltinId != null).map(t => t.sourceBuiltinId!)
  );
  const templates: Template[] = [
    ...userTemplates,
    ...prebuiltTemplates.filter(t => !overriddenBuiltinIds.has(t.id as number)),
  ];

  const allCats = ['All', ...CATEGORIES];

  const filtered = templates.filter(t =>
    (filterCat === 'All' || t.category === filterCat) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async (data: Pick<Template, 'name' | 'category' | 'subject' | 'body' | 'unsubText'>) => {
    try {
      if (editTarget) {
        if (editTarget.dbId) {
          // Update existing user template in Supabase
          await fetch(`/api/templates/${editTarget.dbId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, category: data.category, subject: data.subject, body: data.body, unsub_text: data.unsubText }),
          });
          setUserTemplates(prev => prev.map(t => t.dbId === editTarget.dbId ? { ...t, ...data } : t));
        } else {
          // Editing a built-in → save as user override in Supabase
          const res = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, category: data.category, subject: data.subject, body: data.body, unsub_text: data.unsubText, source_builtin_id: editTarget.id }),
          });
          const created = await res.json();
          if (created.id) setUserTemplates(prev => [toTemplate(created), ...prev]);
        }
      } else {
        // Create new template
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, category: data.category, subject: data.subject, body: data.body, unsub_text: data.unsubText }),
        });
        const created = await res.json();
        if (created.id) setUserTemplates(prev => [toTemplate(created), ...prev]);
      }
    } catch {}
    setCreateOpen(false);
    setEditTarget(null);
  };

  const handleDuplicate = async (t: Template) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${t.name} (Copy)`, category: t.category, subject: t.subject, body: t.body, unsub_text: t.unsubText }),
    });
    const created = await res.json();
    if (created.id) {
      const copy = toTemplate(created);
      setUserTemplates(prev => [copy, ...prev]);
      setEditTarget(copy);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ready-to-use templates — edit, create, or launch in campaigns.</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm shrink-0 self-start md:self-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Create Template
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {allCats.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${filterCat === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-0">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 truncate max-w-[70%]">{t.category}</span>
              {t.builtIn && <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">Built-in</span>}
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">{t.name}</h3>
            <p className="text-xs text-gray-500 font-medium mb-1 truncate">Subject: {t.subject}</p>
            <p className="text-xs text-gray-400 leading-relaxed flex-1 line-clamp-2 mb-4">
              {t.body.split('\n').filter(l => l.trim())[0]}
            </p>
            <div className="flex items-center gap-3 mb-4 pt-3 border-t border-gray-100">
              <div className="text-center"><p className="text-sm font-bold text-gray-900">{t.openRate}</p><p className="text-[10px] text-gray-400">Open</p></div>
              <div className="w-px h-6 bg-gray-100"/>
              <div className="text-center"><p className="text-sm font-bold text-gray-900">{t.replyRate}</p><p className="text-[10px] text-gray-400">Reply</p></div>
              <div className="w-px h-6 bg-gray-100"/>
              <div className="text-center"><p className="text-sm font-bold text-gray-900">{t.uses > 999 ? `${(t.uses / 1000).toFixed(1)}k` : t.uses || '—'}</p><p className="text-[10px] text-gray-400">Uses</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditTarget(t)} className="flex-1 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors">Edit</button>
              <button onClick={() => setUseTarget(t)} className="flex-1 text-xs font-bold text-white bg-blue-600 rounded-xl py-2 hover:bg-blue-700 transition-colors">Use →</button>
              {!t.builtIn && t.dbId && (
                <button onClick={() => setDeleteId(t.dbId!)} className="px-2.5 text-gray-300 hover:text-red-400 border border-gray-100 rounded-xl transition-colors">
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
          <button onClick={() => setCreateOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2 transition-colors">+ Create one</button>
        </div>
      )}

      {(createOpen || editTarget) && (
        <TemplateModal template={editTarget ?? {}} onSave={handleSave} onClose={() => { setCreateOpen(false); setEditTarget(null); }} />
      )}
      {useTarget && <UseModal template={useTarget} onClose={() => setUseTarget(null)} onDuplicate={handleDuplicate} />}

      {deleteId !== null && (
        <ConfirmModal
          title="Delete this template?"
          message="This template will be permanently removed. This can't be undone."
          onCancel={() => setDeleteId(null)}
          onConfirm={async () => {
            await fetch(`/api/templates/${deleteId}`, { method: 'DELETE' });
            setUserTemplates(p => p.filter(t => t.dbId !== deleteId));
            setDeleteId(null);
          }}
        />
      )}
    </main>
  );
}
