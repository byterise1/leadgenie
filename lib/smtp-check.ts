import * as dns from 'dns/promises';
import * as net from 'net';

export type SmtpResult = 'valid' | 'invalid' | 'unknown';

export async function smtpCheck(email: string): Promise<SmtpResult> {
  const domain = email.split('@')[1];
  if (!domain) return 'invalid';
  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
    ]) as Awaited<ReturnType<typeof dns.resolveMx>>;
    if (!mxRecords?.length) return 'invalid';
    const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

    return new Promise<SmtpResult>((resolve) => {
      let settled = false;
      const done = (r: SmtpResult) => {
        if (settled) return;
        settled = true;
        try { socket.destroy(); } catch {}
        resolve(r);
      };

      const socket = new net.Socket();
      let buf = '';
      let step = 0;

      socket.setTimeout(8000);
      socket.once('timeout', () => done('unknown'));
      socket.once('error', () => done('unknown'));

      socket.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t || t[3] === '-') continue; // skip continuation lines
          const code = parseInt(t.slice(0, 3));
          if (step === 0 && code === 220) {
            socket.write(`EHLO leadgenie.app\r\n`); step = 1;
          } else if (step === 1 && code === 250) {
            socket.write(`MAIL FROM:<verify@leadgenie.app>\r\n`); step = 2;
          } else if (step === 2 && code === 250) {
            socket.write(`RCPT TO:<${email}>\r\n`); step = 3;
          } else if (step === 3) {
            socket.write(`QUIT\r\n`);
            if (code === 250 || code === 251) done('valid');
            else if (code >= 500) done('invalid');
            else done('unknown');
          } else if (code >= 500 && step < 3) {
            done('unknown');
          }
        }
      });

      socket.connect(25, mxHost);
    });
  } catch {
    return 'unknown';
  }
}

export async function batchSmtp(emails: string[], concurrency = 8): Promise<Map<string, SmtpResult>> {
  const results = new Map<string, SmtpResult>();
  const domainCache = new Map<string, SmtpResult>();

  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    await Promise.all(batch.map(async (email) => {
      const domain = email.split('@')[1];
      if (domainCache.has(domain)) {
        results.set(email, domainCache.get(domain)!);
        return;
      }
      const result = await smtpCheck(email);
      results.set(email, result);
      if (result === 'invalid') domainCache.set(domain, 'invalid');
    }));
  }
  return results;
}
