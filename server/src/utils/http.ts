import https from 'node:https';
import http from 'node:http';
import zlib from 'node:zlib';
import type { IncomingMessage, IncomingHttpHeaders } from 'node:http';
import type { Readable } from 'node:stream';

export function decompressResponse(res: IncomingMessage): Readable {
  const enc = res.headers['content-encoding'];
  if (enc === 'gzip') return res.pipe(zlib.createGunzip());
  if (enc === 'deflate') return res.pipe(zlib.createInflate());
  if (enc === 'br') return res.pipe(zlib.createBrotliDecompress());
  return res;
}

export function httpsGetFollow(
  url: string,
  reqHeaders?: Record<string, string>
): Promise<{ status?: number; body: string; headers: IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const doReq = (u: string, redirects: number) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const lib = u.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept-Encoding': 'gzip, deflate',
        ...reqHeaders,
      };
      lib
        .get(u, { headers }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const next = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, u).href;
            res.resume();
            return doReq(next, redirects + 1);
          }
          const stream = decompressResponse(res);
          const chunks: Buffer[] = [];
          stream.on('data', (d: Buffer) => chunks.push(d));
          stream.on('end', () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString('utf-8'),
              headers: res.headers,
            })
          );
          stream.on('error', reject);
        })
        .on('error', reject);
    };
    doReq(url, 0);
  });
}

export function httpsPost(
  url: string,
  bodyStr: string,
  extraHeaders?: Record<string, string>
): Promise<{ status?: number; body: string; cookies: string[] }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const bodyBuf = Buffer.from(bodyStr);
    const opts = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': bodyBuf.length,
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept-Encoding': 'gzip, deflate',
        ...extraHeaders,
      },
    };
    const req = https.request(opts, (res) => {
      const cookies = res.headers['set-cookie'] || [];
      const stream = decompressResponse(res);
      const chunks: Buffer[] = [];
      stream.on('data', (d: Buffer) => chunks.push(d));
      stream.on('end', () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString('utf-8'),
          cookies,
        })
      );
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.write(bodyBuf);
    req.end();
  });
}
