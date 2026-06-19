'use client';

import { useEffect, useState } from 'react';

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthly_price: number;
  annual_price: number;
  credits_per_month: number;
  features: string[];
  highlighted: boolean;
  cta_label: string;
  sort_order: number;
  active: boolean;
};

function PlanEditor({ plan, onSave, saving }: { plan: Plan; onSave: (p: Plan) => void; saving: boolean }) {
  const [form, setForm] = useState<Plan>(plan);
  const [featuresText, setFeaturesText] = useState(plan.features.join('\n'));
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof Plan>(k: K, v: Plan[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    const features = featuresText.split('\n').map(l => l.trim()).filter(Boolean);
    onSave({ ...form, features });
    setDirty(false);
  };

  const HIGHLIGHT_COLORS: Record<string, string> = {
    free: 'border-gray-200',
    starter: 'border-blue-200',
    pro: 'border-violet-300',
    agency: 'border-amber-200',
  };

  return (
    <div className={`bg-white rounded-2xl border-2 p-6 space-y-5 ${form.highlighted ? 'border-violet-300' : (HIGHLIGHT_COLORS[plan.id] ?? 'border-gray-200')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
            plan.id === 'free' ? 'bg-gray-100 text-gray-500' :
            plan.id === 'starter' ? 'bg-blue-50 text-blue-700' :
            plan.id === 'pro' ? 'bg-violet-50 text-violet-700' :
            'bg-amber-50 text-amber-700'
          }`}>{form.name}</span>
          {form.highlighted && <span className="text-[10px] font-bold bg-violet-600 text-white rounded-full px-2 py-0.5">Featured</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={form.highlighted} onChange={e => update('highlighted', e.target.checked)} className="accent-violet-600"/>
            Featured
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => update('active', e.target.checked)} className="accent-blue-600"/>
            Active
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Plan Name</label>
          <input value={form.name} onChange={e => update('name', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tagline</label>
          <input value={form.tagline} onChange={e => update('tagline', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Monthly Price ($)</label>
          <input type="number" min={0} value={form.monthly_price} onChange={e => update('monthly_price', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Annual Price ($)</label>
          <input type="number" min={0} value={form.annual_price} onChange={e => update('annual_price', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Credits / Month</label>
          <input type="number" min={0} value={form.credits_per_month} onChange={e => update('credits_per_month', Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">CTA Button Label</label>
        <input value={form.cta_label} onChange={e => update('cta_label', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Features (one per line)</label>
        <textarea value={featuresText} onChange={e => { setFeaturesText(e.target.value); setDirty(true); }} rows={6}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"/>
      </div>

      {dirty && (
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPlans(d); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (plan: Plan) => {
    setSaving(plan.id);
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    const updated = await res.json();
    if (updated.id) {
      setPlans(prev => prev.map(p => p.id === plan.id ? updated : p));
      showToast(`${plan.name} plan updated — changes visible to users immediately`);
    }
    setSaving(null);
  };

  return (
    <main className="flex-1 p-6 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-semibold rounded-xl px-5 py-3 shadow-xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Pricing Plans</h1>
        <p className="text-sm text-gray-400 mt-0.5">Edit plan names, prices, credits, and features. Changes update the billing page and pricing page immediately.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, j) => <div key={j} className="h-8 bg-gray-100 rounded-xl animate-pulse"/>)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => (
            <PlanEditor key={plan.id} plan={plan} onSave={handleSave} saving={saving === plan.id}/>
          ))}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-sm font-semibold text-gray-600 mb-2">No pricing plans found</p>
          <p className="text-xs text-gray-400">Run the <span className="font-mono bg-gray-100 px-1.5 rounded">migration_pricing_plans.sql</span> migration in Supabase to seed the plans.</p>
        </div>
      )}
    </main>
  );
}
