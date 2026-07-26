import { SupabaseClient } from '@supabase/supabase-js';

// Least-used selection across A + however many ab_variants exist, instead of
// pure uniform random. Pure random risks small recipient counts all landing
// on the same version by chance (the whole point of variant rotation is
// guaranteeing recipients don't all get identical wording) — this counts
// what's actually been sent so far for this step and picks whichever
// version has been used least, ties broken randomly.
export async function pickLeastUsedVariant(
  supabase: SupabaseClient,
  campaignId: string,
  stepNumber: number,
  variantCount: number, // total versions including A (index 0)
): Promise<number> {
  if (variantCount <= 1) return 0;

  const { data } = await supabase
    .from('sent_emails')
    .select('ab_variant')
    .eq('campaign_id', campaignId)
    .eq('step_number', stepNumber);

  const counts = new Array(variantCount).fill(0);
  for (const row of data ?? []) {
    const letter = (row.ab_variant || 'A').toUpperCase();
    const idx = letter.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, ...
    if (idx >= 0 && idx < variantCount) counts[idx]++;
  }

  const minCount = Math.min(...counts);
  const candidates = counts.map((c, i) => (c === minCount ? i : -1)).filter(i => i !== -1);
  return candidates[Math.floor(Math.random() * candidates.length)];
}
