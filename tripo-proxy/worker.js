/**
 * Tripo3D CORS Proxy — Cloudflare Worker
 * Forwards requests to api.tripo3d.ai with proper CORS headers.
 * Usage: POST/GET https://tripo-proxy.<account>.workers.dev/<endpoint>
 *   - Authorization header is passed through from the client
 *   - Body is forwarded as-is
 */

const TRIPO_ORIGIN = 'https://api.tripo3d.ai';
const ALLOWED_ORIGINS = ['*']; // Restrict in production

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      const url = new URL(request.url);
      // The path after the worker domain maps to Tripo API
      // e.g. /v2/openapi/upload -> https://api.tripo3d.ai/v2/openapi/upload
      const tripoUrl = TRIPO_ORIGIN + url.pathname + url.search;

      // Build headers to forward
      const fwdHeaders = new Headers();
      const auth = request.headers.get('Authorization');
      if (auth) fwdHeaders.set('Authorization', auth);

      const ct = request.headers.get('Content-Type');
      if (ct) fwdHeaders.set('Content-Type', ct);

      // Forward the request
      const opts = {
        method: request.method,
        headers: fwdHeaders,
      };

      // Forward body for non-GET requests
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        // For multipart/form-data, read as raw body to preserve boundaries
        opts.body = request.body;
        // Don't set Content-Type for FormData — let the boundary pass through
        if (ct && ct.includes('multipart/form-data')) {
          fwdHeaders.delete('Content-Type');
          // Re-read with the raw content type
          fwdHeaders.set('Content-Type', ct);
        }
      }

      const tripoRes = await fetch(tripoUrl, opts);

      // Build response with CORS headers
      const responseHeaders = new Headers(tripoRes.headers);
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(tripoRes.body, {
        status: tripoRes.status,
        statusText: tripoRes.statusText,
        headers: responseHeaders,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  }
};
