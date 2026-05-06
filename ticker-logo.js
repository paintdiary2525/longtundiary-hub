/* ลงทุน Diary — ticker logo helper
   Renders a circle-wrapped logo from logo.dev. Falls back to first-letter
   ink mark on image error. Used by app.js (saga cards) and news-app.js. */

(function () {
  const TOKEN = "pk_dJf854DxT5uT2mAh2J4pHw";
  const ENDPOINT = "https://img.logo.dev/ticker";
  const SIZE = 128; // retina-ready for 36–44px display

  function escAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  // Global error handler so we don't have to embed quoted HTML in the
  // onerror attribute (which breaks attribute parsing).
  window.__tickerLogoFail = function (img) {
    const letter = (img.dataset.letter || "?").charAt(0);
    const span = document.createElement("span");
    span.className = "ticker-logo__fallback";
    span.textContent = letter;
    img.replaceWith(span);
  };

  // Returns innerHTML for a circle wrapper (caller provides the circle element).
  function tickerLogoInner(ticker) {
    const t = String(ticker || "").toUpperCase().replace(/^\$/, "").trim();
    if (!t) return "";
    const url = `${ENDPOINT}/${encodeURIComponent(t)}?token=${TOKEN}&size=${SIZE}&retina=true&format=png`;
    return `<img src="${url}" alt="${escAttr(t)} logo" data-letter="${escAttr(t.charAt(0))}" loading="lazy" onerror="window.__tickerLogoFail(this)">`;
  }

  // Returns full HTML for a standalone .ticker-logo circle (news headline use).
  function tickerLogoHTML(ticker, extraClass = "") {
    const inner = tickerLogoInner(ticker);
    if (!inner) return "";
    return `<span class="ticker-logo ${extraClass}">${inner}</span>`;
  }

  // Parse a raw ticker string from news.json. Only $-prefixed tokens count;
  // bucket labels (Semis, AI, Anthropic) return [] so callers can fall back.
  function parseTickers(raw) {
    if (!raw || !raw.includes("$")) return [];
    return raw.split(/[\/,]/)
      .map(s => s.trim())
      .filter(s => s.startsWith("$"))
      .map(s => s.replace(/^\$+/, "").toUpperCase())
      .filter(s => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s));
  }

  window.TickerLogo = { tickerLogoInner, tickerLogoHTML, parseTickers };
})();
