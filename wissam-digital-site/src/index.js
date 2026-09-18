const DOWNLOADS = {
  '/download/alofok-trial': {
    app: 'alofok',
    edition: 'trial',
    url: 'https://github.com/1984w18m11-byte/alofok-app/releases/download/v1.1.2/alaufuq-trial-1.1.2.apk'
  },
  '/download/wissam-admin': {
    app: 'wissam-digital-admin',
    edition: 'admin',
    url: 'https://github.com/1984w18m11-byte/alofok-app/releases/download/wissam-admin-v0.1.0/wissam-digital-admin-0.1.0.apk'
  }
};

function clean(value, max = 180) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, max);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function sourceFrom(request, url) {
  const explicit = clean(url.searchParams.get('src') || url.searchParams.get('source'), 60);
  if (explicit) return explicit;
  const ref = String(request.headers.get('referer') || '').toLowerCase();
  if (ref.includes('facebook.com') || ref.includes('fb.com')) return 'Facebook';
  if (ref.includes('instagram.com')) return 'Instagram';
  if (ref.includes('tiktok.com')) return 'TikTok';
  if (ref.includes('youtube.com') || ref.includes('youtu.be')) return 'YouTube';
  if (ref.includes('google.')) return 'Google';
  return ref ? 'Referral' : 'Direct';
}

function record(env, event, request, values = {}) {
  if (!env.SITE_ANALYTICS) return;
  const url = new URL(request.url);
  const country = clean(request.cf?.country || 'Unknown', 8);
  const path = clean(values.path || url.pathname, 180);
  const source = clean(values.source || sourceFrom(request, url), 60);
  const app = clean(values.app || '', 60);
  const edition = clean(values.edition || '', 40);
  const sessionId = clean(values.sessionId || url.searchParams.get('sid') || '', 80);
  env.SITE_ANALYTICS.writeDataPoint({
    indexes: [clean(event, 60)],
    blobs: [path, source, country, app, edition, sessionId],
    doubles: [1]
  });
}

function adminAuthorized(request, env) {
  const expected = String(env.ADMIN_TOKEN || '');
  if (!expected) return false;
  const header = String(request.headers.get('authorization') || '');
  return header === `Bearer ${expected}`;
}

function plusStore(env) {
  const id = env.PLUS_ADMIN.idFromName('primary');
  return env.PLUS_ADMIN.get(id);
}

async function forwardStore(env, path, init = {}) {
  return plusStore(env).fetch(`https://plus-admin.internal${path}`, init);
}

export class PlusAdminStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async latestForDevice(deviceCode) {
    const items = await this.state.storage.list({ prefix: 'request:' });
    let latest = null;
    for (const value of items.values()) {
      if (value.deviceCode !== deviceCode) continue;
      if (!latest || String(value.lastCopiedAt || value.createdAt) > String(latest.lastCopiedAt || latest.createdAt)) latest = value;
    }
    return latest;
  }

  async createOrTouchRequest(payload) {
    const deviceCode = clean(payload.deviceCode, 80).toUpperCase();
    if (!/^UFQ-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(deviceCode)) {
      return json({ ok: false, error: 'invalid_device_code' }, 400);
    }
    const now = new Date().toISOString();
    const existing = await this.latestForDevice(deviceCode);
    if (existing && existing.status === 'pending') {
      const updated = {
        ...existing,
        lastCopiedAt: now,
        copyCount: Number(existing.copyCount || 1) + 1,
        destinationKind: clean(payload.destinationKind, 60),
        amountIqd: Number(payload.amountIqd || existing.amountIqd || 8000),
        country: clean(payload.country, 8)
      };
      await this.state.storage.put(`request:${existing.id}`, updated);
      return json({ ok: true, request: updated });
    }
    const id = crypto.randomUUID();
    const request = {
      id,
      app: 'Al-Ufuq',
      section: 'plus',
      deviceCode,
      amountIqd: Number(payload.amountIqd || 8000),
      destinationKind: clean(payload.destinationKind, 60),
      status: 'pending',
      createdAt: now,
      lastCopiedAt: now,
      copyCount: 1,
      country: clean(payload.country, 8)
    };
    await this.state.storage.put(`request:${id}`, request);
    return json({ ok: true, request });
  }

  async listRequests() {
    const items = await this.state.storage.list({ prefix: 'request:' });
    const rows = Array.from(items.values()).sort((a, b) => String(b.lastCopiedAt || b.createdAt).localeCompare(String(a.lastCopiedAt || a.createdAt)));
    return json({ ok: true, requests: rows.slice(0, 200) });
  }

  async setRequestStatus(id, status) {
    const key = `request:${id}`;
    const request = await this.state.storage.get(key);
    if (!request) return json({ ok: false, error: 'not_found' }, 404);
    const now = new Date().toISOString();
    const updated = {
      ...request,
      status,
      decidedAt: now
    };
    await this.state.storage.put(key, updated);
    if (status === 'approved') {
      await this.state.storage.put(`entitlement:${request.deviceCode}`, {
        deviceCode: request.deviceCode,
        tier: 'plus',
        approved: true,
        approvedAt: now,
        requestId: request.id
      });
    } else if (status === 'rejected') {
      await this.state.storage.delete(`entitlement:${request.deviceCode}`);
    }
    return json({ ok: true, request: updated });
  }

  async status(deviceCode) {
    const code = clean(deviceCode, 80).toUpperCase();
    const entitlement = await this.state.storage.get(`entitlement:${code}`);
    const latest = await this.latestForDevice(code);
    return json({
      ok: true,
      deviceCode: code,
      approved: Boolean(entitlement?.approved),
      tier: entitlement?.approved ? 'plus' : 'trial',
      status: entitlement?.approved ? 'approved' : (latest?.status || 'none'),
      approvedAt: entitlement?.approvedAt || null,
      requestId: latest?.id || null
    });
  }

  async payload(deviceCode) {
    const code = clean(deviceCode, 80).toUpperCase();
    const entitlement = await this.state.storage.get(`entitlement:${code}`);
    if (!entitlement?.approved) return json({ ok: false, error: 'not_approved' }, 403);
    return json({
      ok: true,
      tier: 'plus',
      deviceCode: code,
      payloadVersion: '2026.09.18.2',
      features: ['plus_themes', 'automatic_theme_rotation', 'plus_interface'],
      issuedAt: new Date().toISOString()
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/request-copy' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (_) {}
      return this.createOrTouchRequest(body);
    }
    if (url.pathname === '/requests' && request.method === 'GET') return this.listRequests();
    if (url.pathname.startsWith('/requests/') && request.method === 'POST') {
      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts[1] || '';
      const action = parts[2] || '';
      if (action === 'approve') return this.setRequestStatus(id, 'approved');
      if (action === 'reject') return this.setRequestStatus(id, 'rejected');
      return json({ ok: false, error: 'bad_action' }, 400);
    }
    if (url.pathname === '/status' && request.method === 'GET') return this.status(url.searchParams.get('device_code') || '');
    if (url.pathname === '/payload' && request.method === 'GET') return this.payload(url.searchParams.get('device_code') || '');
    return json({ ok: false, error: 'not_found' }, 404);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/payment-copy') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      let payload = {};
      try { payload = await request.json(); } catch (_) {}
      const destinationKind = clean(payload.destinationKind || '', 60);
      const deviceCode = clean(payload.deviceCode || '', 80).toUpperCase();
      const purpose = clean(payload.purpose || '', 40);
      const edition = clean(payload.edition || '', 40);
      const copiedAt = clean(payload.copiedAt || '', 60);
      const amountIqd = Number(payload.amountIqd || 0);

      if (env.SITE_ANALYTICS) {
        env.SITE_ANALYTICS.writeDataPoint({
          indexes: ['payment_copy'],
          blobs: [destinationKind, purpose === 'plus' ? deviceCode : '', purpose, edition, copiedAt, clean(request.cf?.country || 'Unknown', 8)],
          doubles: [1]
        });
      }

      // Only Plus activation creates an admin request. Support stays private/simple.
      if (purpose === 'plus' && deviceCode) {
        const response = await forwardStore(env, '/request-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceCode,
            destinationKind,
            amountIqd: amountIqd || 8000,
            country: clean(request.cf?.country || 'Unknown', 8)
          })
        });
        return response;
      }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    if (url.pathname === '/api/plus/status' && request.method === 'GET') {
      return forwardStore(env, `/status?device_code=${encodeURIComponent(url.searchParams.get('device_code') || '')}`);
    }

    if (url.pathname === '/api/plus/payload' && request.method === 'GET') {
      return forwardStore(env, `/payload?device_code=${encodeURIComponent(url.searchParams.get('device_code') || '')}`);
    }

    if (url.pathname === '/api/admin/plus/requests' && request.method === 'GET') {
      if (!adminAuthorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      return forwardStore(env, '/requests');
    }

    const adminMatch = url.pathname.match(/^\/api\/admin\/plus\/requests\/([^/]+)\/(approve|reject)$/);
    if (adminMatch && request.method === 'POST') {
      if (!adminAuthorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      return forwardStore(env, `/requests/${encodeURIComponent(adminMatch[1])}/${adminMatch[2]}`, { method: 'POST' });
    }

    if (url.pathname === '/api/track') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      let payload = {};
      try { payload = await request.json(); } catch (_) {}
      const allowed = new Set(['page_view', 'app_explainer_open']);
      const event = clean(payload.event, 60);
      if (!allowed.has(event)) return new Response(null, { status: 204 });
      ctx.waitUntil(Promise.resolve(record(env, event, request, {
        path: payload.path,
        source: payload.source,
        app: payload.app,
        edition: payload.edition,
        sessionId: payload.sessionId
      })));
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    const download = DOWNLOADS[url.pathname];
    if (download) {
      record(env, 'download_click', request, {
        app: download.app,
        edition: download.edition,
        sessionId: url.searchParams.get('sid') || '',
        source: url.searchParams.get('src') || sourceFrom(request, url)
      });
      return Response.redirect(download.url, 302);
    }

    return env.ASSETS.fetch(request);
  }
};
