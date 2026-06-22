import { NextRequest, NextResponse } from 'next/server';
import * as dns from 'dns/promises';
import * as net from 'net';
import { SocksClient } from 'socks';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PROXY_HOST = '157.180.121.10';
const PROXY_PORT = 443;

async function runSmtpTest(email: string): Promise<{
  email: string;
  domain: string;
  mx: string;
  result: 'valid' | 'invalid' | 'unknown';
  verdict: string;
  dialog: string[];
  duration_ms: number;
}> {
  const t0 = Date.now();
  const dialog: string[] = [];
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';

  dialog.push(`Email    : ${email}`);
  dialog.push(`Domain   : ${domain || '(missing)'}`);
  dialog.push(`Proxy    : socks5://${PROXY_HOST}:${PROXY_PORT}`);
  dialog.push('');

  if (!domain) {
    return { email, domain, mx: '', result: 'invalid', verdict: "INVALID: missing '@' or domain part", dialog, duration_ms: 0 };
  }

  // MX lookup — connect to the actual mail server, not the domain root
  let mxHost = domain;
  try {
    dialog.push(`MX lookup: ${domain}...`);
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('DNS timeout')), 5000)),
    ]) as Awaited<ReturnType<typeof dns.resolveMx>>;
    if (mxRecords?.length) {
      mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;
      dialog.push(`MX found  : ${mxHost}`);
    } else {
      dialog.push(`MX        : none found, using domain directly`);
    }
  } catch (e: unknown) {
    dialog.push(`MX error  : ${e instanceof Error ? e.message : String(e)} — using domain directly`);
  }

  dialog.push(`Dest     : ${mxHost}:25`);
  dialog.push('');
  dialog.push(`Connecting to ${mxHost}:25 via Hetzner SOCKS5...`);

  let socket: net.Socket;
  try {
    const conn = await (Promise.race([
      SocksClient.createConnection({
        proxy: { host: PROXY_HOST, port: PROXY_PORT, type: 5 },
        command: 'connect',
        destination: { host: mxHost, port: 25 },
      }),
      new Promise<never>((_, r) => setTimeout(() => r(new Error('proxy connect timeout (12s)')), 12000)),
    ]) as Promise<Awaited<ReturnType<typeof SocksClient.createConnection>>>);
    socket = conn.socket;
    dialog.push('Proxy connected ✓');
    dialog.push('');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    dialog.push(`ERROR: ${msg}`);
    return { email, domain, mx: mxHost, result: 'unknown', verdict: `ERROR connecting: ${msg}`, dialog, duration_ms: Date.now() - t0 };
  }

  return new Promise<{
    email: string; domain: string; mx: string; result: 'valid' | 'invalid' | 'unknown'; verdict: string; dialog: string[]; duration_ms: number;
  }>((resolve) => {
    let settled = false;
    let buf = '';
    let step = 0;

    const done = (result: 'valid' | 'invalid' | 'unknown', verdict: string) => {
      if (settled) return;
      settled = true;
      dialog.push('');
      dialog.push(`Duration : ${Date.now() - t0}ms`);
      try { socket.destroy(); } catch {}
      resolve({ email, domain, mx: mxHost, result, verdict, dialog, duration_ms: Date.now() - t0 });
    };

    const send = (cmd: string) => {
      dialog.push(`→ ${cmd}`);
      socket.write(cmd + '\r\n');
    };

    socket.setTimeout(12000);
    socket.once('timeout', () => done('unknown', 'UNKNOWN: socket timed out during SMTP conversation'));
    socket.once('error', (e) => done('unknown', `UNKNOWN: socket error — ${e.message}`));

    socket.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        dialog.push(`← ${t}`);
        if (t[3] === '-') continue; // SMTP multi-line continuation, wait for last line

        const code = parseInt(t.slice(0, 3), 10);
        const msg = t.slice(4).trim();

        if (step === 0) {
          // Server banner
          if (code === 220) {
            send('EHLO leadgenie.app');
            step = 1;
          } else {
            done('unknown', `UNKNOWN: unexpected banner code ${code} — ${msg}`);
          }

        } else if (step === 1) {
          // EHLO response
          if (code === 250) {
            send('MAIL FROM:<verify@leadgenie.app>');
            step = 2;
          } else if (code === 500 || code === 502) {
            // EHLO not supported, fall back to HELO
            send('HELO leadgenie.app');
            step = 1; // will re-enter with HELO response
          } else {
            done('unknown', `UNKNOWN: EHLO rejected — ${code} ${msg}`);
          }

        } else if (step === 2) {
          // MAIL FROM response
          if (code === 250) {
            send(`RCPT TO:<${email}>`);
            step = 3;
          } else {
            send('QUIT');
            done('unknown', `UNKNOWN: MAIL FROM rejected — ${code} ${msg}`);
          }

        } else if (step === 3) {
          // RCPT TO response — this is the verdict
          send('QUIT');
          if (code >= 200 && code < 300) {
            done('valid', `VALID — RCPT TO accepted: ${code} ${msg}`);
          } else if (code === 452) {
            done('invalid', `INVALID — mailbox full (452): ${msg}`);
          } else if (code >= 500) {
            done('invalid', `INVALID — no such mailbox (${code}): ${msg}`);
          } else {
            done('unknown', `UNKNOWN — ${code} ${msg} (greylisting or temp failure)`);
          }

        } else if (code >= 500) {
          send('QUIT');
          done('unknown', `UNKNOWN: server error at step ${step} — ${code} ${msg}`);
        }
      }
    });
  });
}

export async function GET(req: NextRequest) {
  // Admin-only guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const email = new URL(req.url).searchParams.get('email')?.trim() ?? '';
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 });

  const result = await runSmtpTest(email);
  return NextResponse.json(result);
}
