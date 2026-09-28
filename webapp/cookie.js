// Intellirity cookie consent — shows once, persists choice in localStorage,
// and links through to the full Cookie Policy.
(function () {
  var KEY = "intellirity_cookie_consent";
  function already() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  if (already()) return;

  var banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.id = "cookie-banner";
  banner.innerHTML =
    '<p>We use cookies to operate the site, remember your preferences, and understand product usage. ' +
    'See our <a href="cookie-policy.html">Cookie Policy</a>.</p>' +
    '<div class="cookie-actions">' +
    '<button class="button" id="cookie-reject">Reject non-essential</button>' +
    '<button class="button" id="cookie-accept">Accept all</button>' +
    "</div>";

  function show() { document.body.appendChild(banner); }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    if (banner.parentNode) banner.parentNode.removeChild(banner);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", show);
  } else {
    show();
  }
  banner.addEventListener("click", function (e) {
    if (e.target && e.target.id === "cookie-accept") save("all");
    if (e.target && e.target.id === "cookie-reject") save("essential");
  });
})();
