import { NextResponse } from 'next/server';
import tls from 'tls';
import net from 'net';

function testTLS(port: number, host: string): Promise<{ connected: boolean; reason: string; ms: number }> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
      const ms = Date.now() - start;
      socket.end();
      resolve({ connected: true, reason: 'TLS handshake succeeded', ms });
    });
    socket.setTimeout(10000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ connected: false, reason: 'Connection timed out — Titan is likely blocking this IP', ms: Date.now() - start });
    });
    socket.on('error', (e) => resolve({ connected: false, reason: e.message, ms: Date.now() - start }));
  });
}

function testTCP(port: number, host: string): Promise<{ connected: boolean; reason: string; ms: number }> {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = net.connect(port, host, () => {
      const ms = Date.now() - start;
      socket.end();
      resolve({ connected: true, reason: 'TCP connection succeeded', ms });
    });
    socket.setTimeout(10000);
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ connected: false, reason: 'Connection timed out — Titan is likely blocking this IP', ms: Date.now() - start });
    });
    socket.on('error', (e) => resolve({ connected: false, reason: e.message, ms: Date.now() - start }));
  });
}

export async function GET() {
  const [smtp587, smtp465, imap993] = await Promise.all([
    testTCP(587, 'smtp.titan.email'),
    testTLS(465, 'smtp.titan.email'),
    testTLS(993, 'imap.titan.email'),
  ]);

  const verdict = smtp587.connected || smtp465.connected
    ? 'Titan SMTP is reachable from this server — credentials may be the issue'
    : imap993.connected
    ? 'Titan IMAP works but SMTP is blocked — Titan is blocking this IP for sending only'
    : 'All Titan ports blocked — Titan is blocking all connections from this server IP';

  return NextResponse.json({
    verdict,
    tests: {
      'smtp.titan.email:587 (STARTTLS)': smtp587,
      'smtp.titan.email:465 (SSL)': smtp465,
      'imap.titan.email:993 (IMAP)': imap993,
    },
  });
}
