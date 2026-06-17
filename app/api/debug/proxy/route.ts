import { NextResponse } from 'next/server';
import net from 'net';
import { SocksClient } from 'socks';

export async function GET() {
  const proxyEnv = process.env.SMTP_PROXY || '(not set)';

  let tcpResult = 'not tested';
  let socksResult = 'not tested';

  if (process.env.SMTP_PROXY) {
    const url = new URL(process.env.SMTP_PROXY);
    const host = url.hostname;
    const port = Number(url.port) || 1080;

    // Test 1: raw TCP connect to proxy
    tcpResult = await new Promise<string>((resolve) => {
      const sock = new net.Socket();
      const timer = setTimeout(() => { sock.destroy(); resolve(`TIMEOUT after 10s`); }, 10000);
      sock.connect(port, host, () => { clearTimeout(timer); sock.destroy(); resolve(`SUCCESS`); });
      sock.on('error', (e) => { clearTimeout(timer); resolve(`ERROR — ${e.message}`); });
    });

    // Test 2: full SOCKS5 handshake through proxy to smtp.gmail.com:587
    try {
      const { socket } = await SocksClient.createConnection({
        proxy: { host, port, type: 5 },
        command: 'connect',
        destination: { host: 'smtp.gmail.com', port: 587 },
        timeout: 12000,
      });
      socket.destroy();
      socksResult = 'SUCCESS — full SOCKS5 chain to smtp.gmail.com:587 works';
    } catch (e: any) {
      socksResult = `FAILED — ${e.message}`;
    }
  }

  return NextResponse.json({ proxyEnv, tcpResult, socksResult });
}
