// Orai service worker: makes the site installable and usable offline.
// Pages: network first, cached copy when offline.
// Build files (_next, icons): served from cache, refreshed in the background.
const CACHE = "orai-v1";
const scope = self.registration.scope; // e.g. https://host/orai/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([`${scope}ta/`, `${scope}en/`]))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(scope)) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(`${scope}ta/`)),
        ),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      }),
    ),
  );
});
