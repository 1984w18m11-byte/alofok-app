const DOWNLOADS = {
  '/download/alofok-trial': {
    app: 'alofok',
    edition: 'trial',
    url: 'https://github.com/1984w18m11-byte/alofok-app/releases/download/v1.0.2/alofok-trial-1.0.2.apk'
  }
};

function clean(value, max = 180) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, max);
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/payment-copy') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      let payload = {};
      try { payload = await request.json(); } catch (_) {}
      const destinationKind = clean(payload.destinationKind || '', 60);
      const deviceCode = clean(payload.deviceCode || '', 80);
      const purpose = clean(payload.purpose || '', 40);
      const edition = clean(payload.edition || '', 40);
      const copiedAt = clean(payload.copiedAt || '', 60);
      if (env.SITE_ANALYTICS) {
        env.SITE_ANALYTICS.writeDataPoint({
          indexes: ['payment_copy'],
          blobs: [destinationKind, deviceCode, purpose, edition, copiedAt, clean(request.cf?.country || 'Unknown', 8)],
          doubles: [1]
        });
      }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
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
