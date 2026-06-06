'use client';

import { useState } from 'react';

const categories = ['All', 'Cold Outreach', 'Follow-up', 'Meeting Request', 'Break-up', 'Re-engagement'];

const templates = [
  {
    id: 1, category: 'Cold Outreach',
    name: 'The Problem Solver',
    subject: 'Quick question about {{company}}\'s {{pain_point}}',
    preview: 'Hi {{first_name}}, I was looking at {{company}} and noticed most teams in {{industry}} struggle with...',
    body: `Hi {{first_name}},

I was looking at {{company}} and noticed most teams in {{industry}} struggle with {{pain_point}}.

We helped [Similar Company] solve this by [Solution] — they went from [Before] to [After] in just 60 days.

Worth a 15-min call to see if we can do the same for you?

[Your Name]`,
    tags: ['B2B', 'SaaS'],
    uses: 2841,
    openRate: '67%',
    replyRate: '18%',
  },
  {
    id: 2, category: 'Cold Outreach',
    name: 'The Compliment Hook',
    subject: 'Loved your post on {{topic}}',
    preview: 'Hi {{first_name}}, saw your LinkedIn post about {{topic}} — really resonated...',
    body: `Hi {{first_name}},

Saw your LinkedIn post about {{topic}} — really resonated with our team.

That made me think you'd appreciate what we're doing at [Company] — we [One-line value prop].

Would you be open to a quick chat?

Best,
[Your Name]`,
    tags: ['LinkedIn', 'Warm'],
    uses: 1920,
    openRate: '72%',
    replyRate: '21%',
  },
  {
    id: 3, category: 'Follow-up',
    name: 'The Gentle Nudge',
    subject: 'Re: {{original_subject}}',
    preview: 'Hi {{first_name}}, just wanted to bump this up in case it got buried...',
    body: `Hi {{first_name}},

Just wanted to bump this up in case it got buried.

Did you get a chance to look at my previous email? I know inboxes get hectic.

Happy to keep it to 10 minutes if that's easier.

[Your Name]`,
    tags: ['Follow-up', 'Short'],
    uses: 4210,
    openRate: '61%',
    replyRate: '14%',
  },
  {
    id: 4, category: 'Follow-up',
    name: 'The Value Add',
    subject: 'Something useful for {{company}}',
    preview: 'Hi {{first_name}}, I put together a quick breakdown of how companies like yours...',
    body: `Hi {{first_name}},

I put together a quick breakdown of how companies like {{company}} are solving {{pain_point}}.

[Link to resource / case study]

No strings attached — thought it might be useful. Let me know if any of this is relevant to what you're working on.

[Your Name]`,
    tags: ['Follow-up', 'Resource'],
    uses: 1540,
    openRate: '58%',
    replyRate: '12%',
  },
  {
    id: 5, category: 'Meeting Request',
    name: 'The Direct Ask',
    subject: '15 mins this week?',
    preview: 'Hi {{first_name}}, I\'ll keep this short — I think we can help {{company}} with...',
    body: `Hi {{first_name}},

I'll keep this short — I think we can help {{company}} with {{pain_point}}.

We've done it for [Company A] and [Company B].

15 mins this week to show you how? Here's my calendar: [Calendly Link]

[Your Name]`,
    tags: ['Direct', 'Short'],
    uses: 3305,
    openRate: '64%',
    replyRate: '19%',
  },
  {
    id: 6, category: 'Break-up',
    name: 'The Permission Email',
    subject: 'Should I close your file?',
    preview: 'Hi {{first_name}}, I\'ve reached out a few times but haven\'t heard back...',
    body: `Hi {{first_name}},

I've reached out a few times but haven't heard back — which usually means one of two things:

1. The timing is off
2. This isn't a priority right now

Either way, totally fine. Should I close your file and reach back in a few months?

Just let me know either way — I appreciate the clarity.

[Your Name]`,
    tags: ['Break-up', 'High reply'],
    uses: 2190,
    openRate: '71%',
    replyRate: '28%',
  },
  {
    id: 7, category: 'Re-engagement',
    name: 'The "Still Relevant?" Email',
    subject: 'Still relevant for {{company}}?',
    preview: 'Hi {{first_name}}, we spoke a while back about {{topic}}. Wanted to check in...',
    body: `Hi {{first_name}},

We spoke a while back about {{topic}}. I wanted to check in — a lot has changed on our end since then.

We've [New feature / improvement] that specifically addresses [Pain point we discussed].

Would it make sense to reconnect for a quick update?

[Your Name]`,
    tags: ['Re-engage', 'Warm'],
    uses: 980,
    openRate: '55%',
    replyRate: '16%',
  },
  {
    id: 8, category: 'Cold Outreach',
    name: 'The Mutual Connection',
    subject: '{{mutual_name}} suggested I reach out',
    preview: 'Hi {{first_name}}, {{mutual_name}} mentioned you\'d be the right person to talk to about...',
    body: `Hi {{first_name}},

{{mutual_name}} mentioned you'd be the right person to talk to about {{topic}} at {{company}}.

I'm [Your Name] from [Company] — we [One-line value prop].

Would love to get your thoughts. Do you have 15 minutes this week?

[Your Name]`,
    tags: ['Referral', 'High trust'],
    uses: 1755,
    openRate: '78%',
    replyRate: '24%',
  },
];

function PreviewModal({ template, onClose }: { template: typeof templates[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">{template.name}</h2>
            <span className="text-xs text-gray-400">{template.category}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Open Rate', value: template.openRate, color: 'blue' },
              { label: 'Reply Rate', value: template.replyRate, color: 'emerald' },
              { label: 'Used by', value: `${template.uses.toLocaleString()}`, color: 'violet' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 text-center bg-${s.color}-50 border border-${s.color}-100`}>
                <p className={`text-lg font-bold text-${s.color}-700`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Subject */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subject Line</p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-900">{template.subject}</div>
          </div>
          {/* Body */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Body</p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">{template.body}</div>
          </div>
          {/* Variables */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Variables</p>
            <div className="flex flex-wrap gap-2">
              {(template.body.match(/\{\{[^}]+\}\}/g) || []).filter((v, i, a) => a.indexOf(v) === i).map(v => (
                <span key={v} className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1">{v}</span>
              ))}
            </div>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button className="flex-1 bg-blue-600 text-white font-bold text-sm rounded-xl py-3 hover:bg-blue-700 transition-colors">
              Use This Template →
            </button>
            <button className="px-5 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors">
              Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<typeof templates[0] | null>(null);

  const filtered = templates.filter(t =>
    (category === 'All' || t.category === category) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">High-converting templates ready to use in your campaigns.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-blue-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Create Template
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              category === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all group flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">{t.category}</span>
              <div className="flex gap-1">
                {t.tags.slice(0, 1).map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{tag}</span>
                ))}
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900 mb-1">{t.name}</h3>
            <p className="text-xs text-gray-500 font-medium mb-1 truncate">Subject: {t.subject}</p>
            <p className="text-xs text-gray-400 leading-relaxed flex-1 line-clamp-2 mb-4">{t.preview}</p>

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
                <p className="text-sm font-bold text-gray-900">{(t.uses / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-gray-400">Uses</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setPreview(t)}
                className="flex-1 text-xs font-bold text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors">
                Preview
              </button>
              <button
                className="flex-1 text-xs font-bold text-white bg-blue-600 rounded-xl py-2 hover:bg-blue-700 transition-colors">
                Use →
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-1">No templates found</p>
          <p className="text-xs text-gray-400">Try a different search or category.</p>
        </div>
      )}

      {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}
