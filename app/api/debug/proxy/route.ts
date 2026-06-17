import { NextResponse } from 'next/server';
import net from 'net';

export async function GET() {
  const proxyEnv = process.env.SMTP_PROXY || '(not set)';

  let tcpResult = 'not tested';
  if (process.env.SMTP_PROXY) {
    try {
      const url = new URL(process.env.SMTP_PROXY);
      const host = url.hostname;
      const port = Number(url.port) || 1080;
      tcpResult = await new Promise<string>((resolve) => {
        const sock = new net.Socket();
        const timer = setTimeout(() => {
          sock.destroy();
          resolve(`TIMEOUT after 10s connecting to ${host}:${port}`);
        }, 10000);
        sock.connect(port, host, () => {
          clearTimeout(timer);
          sock.destroy();
          resolve(`SUCCESS — connected to ${host}:${port}`);
        });
        sock.on('error', (e) => {
          clearTimeout(timer);
          resolve(`ERROR — ${e.message}`);
        });
      });
    } catch (e: any) {
      tcpResult = `PARSE ERROR — ${e.message}`;
    }
  }

  return NextResponse.json({ proxyEnv, tcpResult });
}
