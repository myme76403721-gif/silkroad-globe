// 오프라인 저장과 자동 업데이트를 맡는 서비스 워커
// 화면 파일(html·js·css·json)은 인터넷이 되면 항상 새로 받아(사이트를 고치면 앱도 바로 최신화) 저장해 두고,
// 사진·지도 라이브러리 같은 큰 파일은 한 번 받으면 저장해 둔 것을 씁니다.
var VERSION = "2026-11-12-11";
var CORE = "core-" + VERSION, MEDIA = "media-v1";
var CORE_FILES = ["./", "./index.html", "./manifest.json", "./data/meta.json", "./data/0.enc", "./data/1.enc", "./data/2.enc", "./data/3.enc", "./data/4.enc", "./data/5.enc", "./data/6.enc", "./data/7.enc", "./data/8.enc", "./data/9.enc", "./data/10.enc", "./data/11.enc", "./data/12.enc", "./data/13.enc", "./data/14.enc", "./data/15.enc", "./data/16.enc", "./data/17.enc", "./data/18.enc", "./data/19.enc", "./data/20.enc", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) {
    return Promise.all(CORE_FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("core-") === 0 && k !== CORE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("message", function (e) { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.protocol.indexOf("http") !== 0) return;
  // 지도 타일은 브라우저 기본 캐시에 맡김(대량 저장 금지 규정)
  if (/(cartocdn\.com|arcgisonline\.com|openstreetmap\.org)$/.test(url.hostname)) return;
  // 일기예보·환율은 늘 새로 받음(저장하면 옛 값이 계속 보임)
  if (/(open-meteo\.com|er-api\.com)$/.test(url.hostname)) return;
  var same = url.origin === self.location.origin;
  var isApp = req.mode === "navigate" || (same && /\.(html|js|css|json|enc)$/.test(url.pathname)) || (same && url.pathname.slice(-1) === "/");
  if (isApp) {
    // 인터넷 우선: 최신 화면을 받고, 안 되면 저장해 둔 것
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      // 2026-11-10 고침: 예전엔 CSS·JS를 못 받으면 index.html을 대신 돌려줘서 화면 꾸밈이 통째로 사라졌음.
      // 이제 화면 이동(navigate)일 때만 index.html로, CSS·JS는 저장해 둔 같은 파일만(없으면 실패 그대로)
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return req.mode === "navigate" ? caches.match("./index.html") : Response.error();
      });
    }));
    return;
  }
  // 사진·글꼴·라이브러리: 저장해 둔 것 우선
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok || res.type === "opaque") { var copy = res.clone(); caches.open(MEDIA).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
