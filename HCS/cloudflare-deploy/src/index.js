/**
 * ============================================================
 *  HCS PROXY WORKER — Cloudflare Worker
 *  Proxy sécurisé pour Content Generator High Coffee Shirt
 * ============================================================
 *
 *  DÉPLOIEMENT :
 *  1. Installer Wrangler CLI : npm install -g wrangler
 *  2. wrangler login
 *  3. Créer le worker : wrangler init hcs-proxy (choisir "Hello World")
 *  4. Remplacer le contenu de src/index.js par ce fichier
 *  5. Définir les secrets (jamais en clair dans le code) :
 *       wrangler secret put OPENAI_API_KEY
 *       wrangler secret put DROPBOX_ACCESS_TOKEN
 *       wrangler secret put WORKER_SECRET
 *  6. Déployer : wrangler deploy
 *
 *  VARIABLES D'ENVIRONNEMENT (wrangler.toml) :
 *  [vars]
 *  ALLOWED_ORIGIN = "https://votredomaine.com"   ← domaine du HTML
 *  DROPBOX_BASE_PATH = "HCS/2026"
 *
 *  ROUTES EXPOSÉES :
 *  POST /api/chat           → OpenAI Chat Completions (GPT-4o)
 *  POST /api/images         → OpenAI Image Generation (DALL-E 3)
 *  POST /api/dropbox/upload → Dropbox File Upload
 *  GET  /api/health         → Sanity check
 * ============================================================
 */

// ── Limites de sécurité ──────────────────────────────────────
const MAX_BODY_SIZE      = 1024 * 1024 * 15; // 15 MB max payload (images base64)
const MAX_TOKENS_ALLOWED = 2000;              // plafond tokens OpenAI
const RATE_LIMIT_MAX     = 30;               // requêtes par fenêtre
const RATE_LIMIT_WINDOW  = 60_000;           // fenêtre = 60 secondes

// ── Compteur rate-limit en mémoire (remis à zéro au redémarrage) ─
const ipCounters = new Map();

// ============================================================
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // ── CORS preflight ─────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, env);
    }

    // ── Health check public ────────────────────────────────
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return corsResponse(JSON.stringify({ status: 'ok', worker: 'hcs-proxy' }), 200, env);
    }

    // ── Vérification origine CORS ──────────────────────────
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    if (allowedOrigin !== '*' && origin && origin !== allowedOrigin) {
      return errorResponse('Origine non autorisée', 403);
    }

    // ── Authentification Worker Secret ─────────────────────
    const clientSecret = request.headers.get('X-Worker-Secret');
    if (!clientSecret || clientSecret !== env.WORKER_SECRET) {
      return errorResponse('Non autorisé', 401);
    }

    // ── Rate limiting par IP ───────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitError = checkRateLimit(clientIP);
    if (rateLimitError) return errorResponse(rateLimitError, 429);

    // ── Taille du body ─────────────────────────────────────
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');
    if (contentLength > MAX_BODY_SIZE) {
      return errorResponse('Payload trop volumineux', 413);
    }

    // ── Routage ────────────────────────────────────────────
    try {
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return await handleChat(request, env);
      }
      if (url.pathname === '/api/images' && request.method === 'POST') {
        return await handleImages(request, env);
      }
      if (url.pathname === '/api/dropbox/upload' && request.method === 'POST') {
        return await handleDropboxUpload(request, env);
      }
      if (url.pathname === '/api/picwish' && request.method === 'POST') {
        return await handlePicWish(request, env);
      }
      if (url.pathname === '/api/dropbox/archive' && request.method === 'POST') {
        return await handleDropboxArchive(request, env);
      }
      if (url.pathname === '/api/replicate' && request.method === 'POST') {
        return await handleReplicate(request, env);
      }
      if (url.pathname === '/api/claude' && request.method === 'POST') {
        return await handleClaude(request, env);
      }
      return errorResponse('Route introuvable', 404);
    } catch (err) {
      console.error('Worker error:', err);
      return errorResponse('Erreur interne du serveur', 500);
    }
  }
};

// ============================================================
//  ROUTE : POST /api/chat
//  Body attendu : { messages: [...], model?: string, max_tokens?: number }
// ============================================================
async function handleChat(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { messages, model = 'gpt-4o', max_tokens = 800 } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('messages[] requis', 400);
  }
  if (messages.length > 20) {
    return errorResponse('Trop de messages (max 20)', 400);
  }

  // Validation de chaque message
  for (const msg of messages) {
    if (!['system','user','assistant'].includes(msg.role)) {
      return errorResponse('Rôle de message invalide', 400);
    }
    if (typeof msg.content !== 'string' || msg.content.length > 8000) {
      return errorResponse('Contenu de message invalide ou trop long', 400);
    }
  }

  // Plafonner les tokens
  const safeTokens = Math.min(parseInt(max_tokens) || 800, MAX_TOKENS_ALLOWED);

  // Modèles autorisés uniquement
  const allowedModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
  if (!allowedModels.includes(model)) {
    return errorResponse(`Modèle non autorisé. Utilisez : ${allowedModels.join(', ')}`, 400);
  }

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, max_tokens: safeTokens, temperature: 0.8 })
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error('OpenAI error:', errText);
    return errorResponse(`Erreur OpenAI (${upstream.status})`, upstream.status);
  }

  const data = await upstream.json();
  return corsResponse(JSON.stringify(data), 200, null, true);
}

// ============================================================
//  ROUTE : POST /api/images
//  Body attendu : { prompt: string, size?: string, quality?: string }
// ============================================================
async function handleImages(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { prompt, size = '1024x1024', quality = 'hd' } = body;

  if (!prompt || typeof prompt !== 'string') {
    return errorResponse('prompt requis', 400);
  }
  if (prompt.length > 2000) {
    return errorResponse('Prompt trop long (max 2000 chars)', 400);
  }

  const allowedSizes = ['1024x1024', '1792x1024', '1024x1792'];
  if (!allowedSizes.includes(size)) {
    return errorResponse('Taille invalide', 400);
  }

  const upstream = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality })
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error('DALL-E error:', errText);
    return errorResponse(`Erreur DALL-E (${upstream.status})`, upstream.status);
  }

  const data = await upstream.json();
  return corsResponse(JSON.stringify(data), 200, null, true);
}

// ============================================================
//  ROUTE : POST /api/dropbox/upload
//  Body attendu : JSON { imageUrl: string, fileName: string, folder: string }
//  Le worker télécharge l'image depuis imageUrl, puis l'uploade vers Dropbox
// ============================================================
async function handleDropboxUpload(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { imageUrl, fileName, folder } = body;

  if (!imageUrl || !fileName || !folder) {
    return errorResponse('imageUrl, fileName et folder sont requis', 400);
  }

  // Vérifier que l'URL vient bien d'OpenAI
  if (!imageUrl.startsWith('https://oaidalleapiprodscus.blob.core.windows.net/') &&
      !imageUrl.startsWith('https://images.openai.com/')) {
    return errorResponse('imageUrl non autorisée', 400);
  }

  // Sanitize fileName (alphanumérique, tirets, underscores, point)
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 80);
  const basePath = env.DROPBOX_BASE_PATH || 'HCS/2026';
  const dropboxPath = `/${basePath}/${folder}/${safeFileName}`;

  // Télécharger l'image depuis OpenAI
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    return errorResponse('Impossible de télécharger l\'image source', 502);
  }
  const imageBuffer = await imgResponse.arrayBuffer();

  // Uploader vers Dropbox
  const upstream = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DROPBOX_ACCESS_TOKEN}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path: dropboxPath,
        mode: 'overwrite',
        autorename: true,
        mute: false
      })
    },
    body: imageBuffer
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error('Dropbox error:', errText);
    return errorResponse(`Erreur Dropbox (${upstream.status})`, upstream.status);
  }

  const data = await upstream.json();
  return corsResponse(JSON.stringify({ success: true, path: data.path_display }), 200, null, true);
}

// ============================================================
//  ROUTE : POST /api/picwish
//  Body attendu : { image_base64: string, operation: "remove-background"|"enhance" }
//  Flux : base64 → upload Dropbox temp → lien temp → PicWish API → polling → result_url
// ============================================================
async function handlePicWish(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { image_base64, operation } = body;

  if (!['remove-background', 'enhance', 'smart-crop'].includes(operation)) {
    return errorResponse('operation invalide (remove-background | enhance | smart-crop)', 400);
  }
  if (operation !== 'smart-crop' && (!image_base64 || typeof image_base64 !== 'string')) {
    return errorResponse('image_base64 requis pour cette opération', 400);
  }

  try {
    // ── Endpoints corrects par opération ──────────────────
    const endpoints = {
      'remove-background': 'https://techhk.aoscdn.com/api/tasks/visual/segmentation',
      'enhance':           'https://techhk.aoscdn.com/api/tasks/visual/scale',
      'smart-crop':        'https://techhk.aoscdn.com/api/tasks/visual/correction'
    };
    const picwishEndpoint = endpoints[operation];

    // ── Soumission ─────────────────────────────────────────
    let picRes;
    if (operation === 'smart-crop') {
      // Smart Crop : image_url uniquement (pas de fichier binaire)
      if (!body.image_url) throw new Error('image_url requis pour smart-crop');
      picRes = await fetch(picwishEndpoint, {
        method: 'POST',
        headers: { 'X-API-KEY': env.PICWISH_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image_url=${encodeURIComponent(body.image_url)}&sync=0`
      });
    } else {
      // Détourage + Amélioration : envoi fichier binaire
      const imageBuffer = base64ToArrayBuffer(image_base64);
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image_file', blob, 'image.jpg');
      formData.append('sync', '0');
      // Upscale ×2 / ×4 (amélioration PicWish uniquement) — sans le paramètre,
      // PicWish garde la définition d'origine
      if (operation === 'enhance' && [2, 4].includes(Number(body.scale_factor))) {
        formData.append('scale_factor', String(Number(body.scale_factor)));
      }
      picRes = await fetch(picwishEndpoint, {
        method: 'POST',
        headers: { 'X-API-KEY': env.PICWISH_API_KEY },
        body: formData
      });
    }

    const picRaw = await picRes.text();
    let picData;
    try { picData = JSON.parse(picRaw); }
    catch { throw new Error(`PicWish réponse non-JSON (${picRes.status}): ${picRaw.slice(0, 120)}`); }

    // Sync (state=1 direct) ou async (task_id à poller)
    if (picData.status === 200 && picData.data?.state === 1) {
      const resultUrl = picData.data.image || picData.data.fore_image;
      if (!resultUrl) throw new Error(`URL résultat introuvable: ${JSON.stringify(picData.data)}`);
      return corsResponse(JSON.stringify({ success: true, result_url: resultUrl }), 200, null, true);
    }

    if (picData.status !== 200 || !picData.data?.task_id) {
      throw new Error(`PicWish soumission échouée: ${JSON.stringify(picData).slice(0, 200)}`);
    }

    const taskId = picData.data.task_id;
    const pollUrl = `${picwishEndpoint}/${taskId}`;

    // ── Polling résultat (max 30s) ─────────────────────────
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const pollRes = await fetch(pollUrl, { headers: { 'X-API-KEY': env.PICWISH_API_KEY } });
      const pollData = await pollRes.json();
      const state = pollData.data?.state ?? -99;

      if (state < 0) throw new Error(`PicWish échec state=${state}: ${JSON.stringify(pollData).slice(0, 200)}`);
      if (state === 1) {
        const resultUrl = pollData.data.image || pollData.data.fore_image;
        if (!resultUrl) throw new Error(`URL résultat introuvable: ${JSON.stringify(pollData.data)}`);
        return corsResponse(JSON.stringify({ success: true, result_url: resultUrl }), 200, null, true);
      }
    }

    throw new Error('Timeout PicWish (30s)');

  } catch (err) {
    console.error('handlePicWish error:', err.message);
    return errorResponse(`Erreur PicWish: ${err.message}`, 502);
  }
}

// ============================================================
//  ROUTE : POST /api/dropbox/archive
//  Body attendu : { image_base64: string, client: string, mois: string }
//  Sauvegarde le PNG final dans /HCS/2026/CLIENTS/{mois}/{client}/logos/
// ============================================================
//  Renouvelle automatiquement le token Dropbox via refresh_token
// ============================================================
async function getDropboxToken(env) {
  // Si un token court-terme est dispo, l'utiliser en fallback
  if (env.DROPBOX_REFRESH_TOKEN && env.DROPBOX_APP_KEY && env.DROPBOX_APP_SECRET) {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: env.DROPBOX_REFRESH_TOKEN,
        client_id:     env.DROPBOX_APP_KEY,
        client_secret: env.DROPBOX_APP_SECRET
      })
    });
    const data = await res.json();
    if (data.access_token) return data.access_token;
    throw new Error(`Refresh token Dropbox échoué : ${JSON.stringify(data)}`);
  }
  // Fallback token statique (déprécié, expire en 4h)
  if (env.DROPBOX_ACCESS_TOKEN) return env.DROPBOX_ACCESS_TOKEN;
  throw new Error('Aucun token Dropbox configuré (DROPBOX_REFRESH_TOKEN ou DROPBOX_ACCESS_TOKEN)');
}

// ============================================================
async function handleDropboxArchive(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { image_base64, client, clientFile, mois } = body;

  if (!image_base64 || typeof image_base64 !== 'string') {
    return errorResponse('image_base64 requis', 400);
  }
  if (!client || typeof client !== 'string') {
    return errorResponse('client requis', 400);
  }

  // Dossier : "Taina Afai" (espaces + majuscules préservés)
  const safeFolder  = client.replace(/[^a-zA-Z0-9 \-]/g, '').slice(0, 60);
  // Fichier  : "Taina_Afai_logo_traite.png" (sans espaces)
  const safeFile    = (clientFile || client).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60);
  const safeMois    = (mois || 'inconnu').replace(/[^a-zA-Z]/g, '').slice(0, 20);
  const basePath    = env.DROPBOX_BASE_PATH || 'HCS 2026';
  const dropboxPath = `/${basePath}/${safeMois}/${safeFolder}/${safeFile}_logo_traite.png`;

  try {
    const token       = await getDropboxToken(env);
    const imageBuffer = base64ToArrayBuffer(image_base64);

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath, mode: 'overwrite', autorename: false, mute: false })
      },
      body: imageBuffer
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Dropbox ${res.status}: ${txt.slice(0, 400)}`);
    }

    const data = await res.json();
    return corsResponse(JSON.stringify({ success: true, path: data.path_display || dropboxPath }), 200, null, true);

  } catch (err) {
    console.error('handleDropboxArchive error:', err.message);
    return errorResponse(`Erreur archivage: ${err.message}`, 502);
  }
}

// ============================================================
//  ROUTE : POST /api/replicate
//  Body attendu : { token: string, modelId: string, input: object }
//  Proxy Replicate — résout CORS file:// — polling interne côté Worker
// ============================================================
async function handleReplicate(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { token, modelId, input } = body;
  if (!token || !modelId || !input) {
    return errorResponse('token, modelId et input requis', 400);
  }

  const parts = modelId.split('/');
  if (parts.length !== 2) {
    return errorResponse('modelId invalide (format: owner/name)', 400);
  }
  const [owner, name] = parts;

  // Démarrer la prédiction (Prefer: wait = synchrone si < 55s)
  const startResp = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=55'
    },
    body: JSON.stringify({ input })
  });

  if (!startResp.ok) {
    const errText = await startResp.text();
    return errorResponse(`Replicate démarrage: ${startResp.status} — ${errText.slice(0,200)}`, startResp.status);
  }

  let pred = await startResp.json();

  // Réponse synchrone (Prefer: wait a fonctionné)
  if (pred.status === 'succeeded') {
    const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!url) return errorResponse('Replicate: pas d\'URL dans la réponse', 500);
    return corsResponse(JSON.stringify({ url }), 200, null, true);
  }

  // Polling fallback (si Prefer: wait a expiré avant la fin)
  const predId = pred.id;
  if (!predId) return errorResponse('Replicate: pas d\'ID de prédiction', 500);

  for (let i = 0; i < 20; i++) {
    await sleep(3000);
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    if (!pollResp.ok) continue;
    pred = await pollResp.json();
    if (pred.status === 'succeeded') {
      const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      if (!url) return errorResponse('Replicate: pas d\'URL dans la réponse', 500);
      return corsResponse(JSON.stringify({ url }), 200, null, true);
    }
    if (pred.status === 'failed') {
      return errorResponse('Replicate génération échouée: ' + (pred.error || 'unknown'), 500);
    }
  }

  return errorResponse('Replicate timeout — génération trop longue (>60s)', 504);
}

// ============================================================
//  ROUTE : POST /api/claude
//  Body attendu : { messages: [...], model?: string, max_tokens?: number, system?: string }
//  Proxy Claude Anthropic (résout CORS file://)
// ============================================================
async function handleClaude(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON invalide', 400); }

  const { messages, model = 'claude-haiku-4-5-20251001', max_tokens = 4096, system, apiKey: clientKey } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('messages[] requis', 400);
  }

  const payload = { model, messages, max_tokens };
  if (system) payload.system = system;

  // Client peut passer sa propre clé ; sinon fallback sur le secret Worker
  const apiKey = clientKey || env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return errorResponse('Clé API Anthropic manquante (apiKey dans body ou ANTHROPIC_API_KEY Worker secret)', 500);

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return errorResponse(`Claude erreur: ${upstream.status} — ${errText.slice(0,200)}`, upstream.status);
  }

  const data = await upstream.json();
  return corsResponse(JSON.stringify(data), 200, null, true);
}

// ── Helpers PicWish ──────────────────────────────────────────
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
//  HELPERS
// ============================================================

function checkRateLimit(ip) {
  const now = Date.now();
  if (!ipCounters.has(ip)) {
    ipCounters.set(ip, { count: 1, windowStart: now });
    return null;
  }
  const entry = ipCounters.get(ip);
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry.count = 1;
    entry.windowStart = now;
    return null;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return `Trop de requêtes. Limite : ${RATE_LIMIT_MAX} req/${RATE_LIMIT_WINDOW / 1000}s`;
  }
  return null;
}

function corsResponse(body, status = 200, env = null, isJson = false) {
  const allowedOrigin = env?.ALLOWED_ORIGIN || '*';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Worker-Secret',
    'Access-Control-Max-Age': '86400',
    ...(isJson ? { 'Content-Type': 'application/json' } : {})
  };
  return new Response(body, { status, headers });
}

function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}
