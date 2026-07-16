// Google Postmaster Tools API — free, official Gmail-side domain reputation
// data (spam rate, IP/domain reputation, auth pass rates). Only reports on
// domains the connected Google account has verified in postmaster.google.com
// — it cannot report anything for a personal @gmail.com sending address,
// since Google (not the user) owns that domain's reputation data.
const POSTMASTER_API = 'https://gmailpostmastertools.googleapis.com/v1';

export async function refreshPostmasterToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Postmaster token refresh failed: ${data.error_description || data.error || 'unknown error'}`);
  }
  return data.access_token as string;
}

export type PostmasterDomainStats = {
  domain: string;
  date: string | null;
  userReportedSpamRatio: number | null;
  domainReputation: string | null;
  ipReputations: { reputation: string; ipCount: number }[];
  spfSuccessRatio: number | null;
  dkimSuccessRatio: number | null;
  dmarcSuccessRatio: number | null;
  inboundEncryptionRatio: number | null;
  outboundEncryptionRatio: number | null;
};

function ratio(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

export async function fetchPostmasterDomains(accessToken: string): Promise<PostmasterDomainStats[]> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const domainsRes = await fetch(`${POSTMASTER_API}/domains`, { headers });
  if (!domainsRes.ok) {
    throw new Error(`Postmaster domains list failed: ${domainsRes.status}`);
  }
  const domainsData = await domainsRes.json();
  const domainNames: string[] = (domainsData.domains || []).map((d: { name: string }) => d.name.replace(/^domains\//, ''));

  const results: PostmasterDomainStats[] = [];
  for (const domain of domainNames) {
    // Postmaster only retains ~30 days — fetch that window and pick the
    // most recent entry by its date-named resource id (domains/x/trafficStats/YYYYMMDD).
    const statsRes = await fetch(
      `${POSTMASTER_API}/domains/${domain}/trafficStats?pageSize=30`,
      { headers },
    );
    if (!statsRes.ok) {
      results.push({
        domain, date: null, userReportedSpamRatio: null, domainReputation: null,
        ipReputations: [], spfSuccessRatio: null, dkimSuccessRatio: null,
        dmarcSuccessRatio: null, inboundEncryptionRatio: null, outboundEncryptionRatio: null,
      });
      continue;
    }
    const statsData = await statsRes.json();
    const entries: any[] = statsData.trafficStats || [];
    const stats = entries.sort((a, b) => (a.name > b.name ? -1 : 1))[0];
    if (!stats) {
      results.push({
        domain, date: null, userReportedSpamRatio: null, domainReputation: null,
        ipReputations: [], spfSuccessRatio: null, dkimSuccessRatio: null,
        dmarcSuccessRatio: null, inboundEncryptionRatio: null, outboundEncryptionRatio: null,
      });
      continue;
    }
    results.push({
      domain,
      date: stats.name ? stats.name.split('/').pop() : null,
      userReportedSpamRatio: ratio(stats.userReportedSpamRatio),
      domainReputation: stats.domainReputation || null,
      ipReputations: (stats.ipReputations || []).map((ip: { reputation: string; ipCount?: string }) => ({
        reputation: ip.reputation,
        ipCount: Number(ip.ipCount) || 0,
      })),
      spfSuccessRatio: ratio(stats.spfSuccessRatio),
      dkimSuccessRatio: ratio(stats.dkimSuccessRatio),
      dmarcSuccessRatio: ratio(stats.dmarcSuccessRatio),
      inboundEncryptionRatio: ratio(stats.inboundEncryptionRatio),
      outboundEncryptionRatio: ratio(stats.outboundEncryptionRatio),
    });
  }
  return results;
}
