# Wissam Digital app publishing rules

1. Any downloadable app published on the Wissam Digital site must have two user-facing actions: a download button and a separate **شرح عن البرنامج / About the app** button.
2. Each app must have its own explanation page under `public/apps/` with a concise description, main features, edition information, and the download action when applicable.
3. Download buttons must use a first-party `/download/...` route handled by the Worker so download clicks can be counted privately before redirecting to the APK file.
4. Website page views and explanation-page opens are recorded through `/api/track` into the private Cloudflare Analytics Engine dataset `wissam_digital_site_events`.
5. Do not expose analytics totals or an analytics dashboard publicly on the website.
6. Analytics records should avoid storing raw IP addresses or payment information.

## Social publishing rule

7. Facebook, Instagram, TikTok, and YouTube posts must never contain a versioned GitHub APK URL.
8. Use this single permanent public link for al ufuq downloads:
   `https://wissam-digital-site.pages.dev/download/al-ufuq`
9. The Arabic post caption must end with: `رابط تحميل الأفق في أول تعليق 👇`
10. The English post caption must end with: `Download al ufuq from the first comment 👇`
11. The first comment must contain only the permanent public link. When a new approved APK is released, update the Worker download target once; do not edit every social post.
12. Remove old versioned links from future reposts and scheduled-post source files. Do not publish the old `1.0.2` link again.
