(async function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function fail(msg, err) {
    console.error("[diary]", msg, err);
    const list = $("#diary-results");
    if (list) list.innerHTML = `<li class="diary-empty__msg">⚠ ${msg}<br><code style="font-size:11px;color:var(--accent-tomato)">${(err && err.message) || err || "unknown"}</code></li>`;
  }
  window.addEventListener("error", e => fail("page error", e.error || e.message));

  if (typeof MiniSearch !== "function") {
    fail("MiniSearch failed to load — check CDN", new Error("typeof MiniSearch = " + typeof MiniSearch));
    return;
  }

  const PAGE_SIZE = 30;

  const TYPE_LABELS = {
    all:      { label: "All", icon: "" },
    insight:  { label: "Insights", icon: "📓" },
    video:    { label: "Video", icon: "📺" },
    thesis:   { label: "Thesis", icon: "🧠" },
    xpost:    { label: "X post", icon: "𝕏" },
    substack: { label: "Substack", icon: "📰" },
  };

  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function fmtDate(iso) {
    if (!iso) return "";
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return iso;
    return `${+d} ${months[+m - 1]} ${+y}`;
  }

  function fmtLastEdited(iso) {
    if (!iso) return "—";
    const date = fmtDate(iso);
    if (!iso.includes("T")) return `บันทึกล่าสุด: ${date}`;
    const t = new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok", hour12: false });
    return `บันทึกล่าสุด: ${date}, ${t}`;
  }

  let data;
  try {
    const res = await fetch("data/diary.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    $("#diary-results").innerHTML = `<li class="diary-empty__msg">ยังโหลดไดอารี่ไม่ได้ — ลองใหม่อีกครั้ง</li>`;
    $("#diary-meta").textContent = "no data";
    return;
  }

  const entries = data.entries || [];
  const meta = data.meta || {};
  $("#diary-meta").textContent = `${fmtLastEdited(data.updated)} · ${meta.counts?.total ?? entries.length} entries`;

  // ---- Build MiniSearch index ----
  let mini, indexable, byId;
  try {
    mini = new MiniSearch({
      fields: ["title", "summary_thai", "tickers_str", "topics_str", "series_str"],
      storeFields: ["id"],
      searchOptions: {
        boost: { title: 3, tickers_str: 3, topics_str: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    indexable = entries.map(e => ({
      ...e,
      tickers_str: (e.tickers || []).join(" "),
      topics_str: (e.topics || []).join(" "),
      series_str: (e.series || []).join(" "),
    }));
    mini.addAll(indexable);
    byId = new Map(indexable.map(e => [e.id, e]));
  } catch (err) {
    fail("MiniSearch init failed", err);
    return;
  }

  // ---- State ----
  const state = {
    q: "",
    type: "all",
    ticker: null,
    topic: null,
    page: 1,
  };

  // ---- Type chips (hide types with 0 entries) ----
  const typeChipsEl = $("#type-chips");
  const typeOrder = ["all", "insight", "thesis", "xpost", "video", "substack"];
  const typeCounts = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  typeChipsEl.innerHTML = typeOrder
    .filter(t => t === "all" || (typeCounts[t] || 0) > 0)
    .map(t => {
      const meta = TYPE_LABELS[t];
      const count = t === "all" ? entries.length : (typeCounts[t] || 0);
      return `<button type="button" class="diary-chip diary-chip--type" data-type="${t}" role="tab">
        ${meta.icon ? `<span class="diary-chip__emoji">${meta.icon}</span>` : ""}<span>${meta.label}</span><span class="diary-chip__count">${count}</span>
      </button>`;
    }).join("");
  typeChipsEl.addEventListener("click", e => {
    const btn = e.target.closest("[data-type]");
    if (!btn) return;
    state.type = btn.dataset.type;
    state.page = 1;
    render();
  });

  // ---- Empty-state chips ----
  function renderEmptyState() {
    const tk = (meta.top_tickers || []).slice(0, 10);
    const tp = (meta.top_topics || []).slice(0, 10);
    $("#empty-tickers").innerHTML = tk.map(t =>
      `<button type="button" class="diary-chip" data-set-ticker="${escapeHtml(t)}">$${escapeHtml(t)}</button>`
    ).join("") || `<span class="diary-meta-line">ยังไม่มี ticker</span>`;
    $("#empty-topics").innerHTML = tp.map(t =>
      `<button type="button" class="diary-chip" data-set-topic="${escapeHtml(t)}">${escapeHtml(t)}</button>`
    ).join("") || `<span class="diary-meta-line">ยังไม่มีหัวข้อ</span>`;
  }
  renderEmptyState();

  document.addEventListener("click", e => {
    const tBtn = e.target.closest("[data-set-ticker]");
    const pBtn = e.target.closest("[data-set-topic]");
    if (tBtn) { e.preventDefault(); state.ticker = tBtn.dataset.setTicker; state.page = 1; render(); return; }
    if (pBtn) { e.preventDefault(); state.topic = pBtn.dataset.setTopic; state.page = 1; render(); return; }
    const clear = e.target.closest("[data-clear]");
    if (clear) {
      e.preventDefault();
      const k = clear.dataset.clear;
      if (k === "all") {
        state.q = "";
        state.type = "all";
        state.ticker = null;
        state.topic = null;
        const qEl = $("#diary-q");
        if (qEl) qEl.value = "";
      } else if (k === "q") {
        state.q = "";
        const qEl = $("#diary-q");
        if (qEl) qEl.value = "";
      } else if (k in state) {
        state[k] = (k === "type" ? "all" : null);
      }
      state.page = 1;
      render();
    }
  });

  // ---- Search input ----
  const qEl = $("#diary-q");
  let qTimer = null;
  qEl.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.q = qEl.value.trim();
      state.page = 1;
      render();
    }, 60);
  });

  // ---- Show more ----
  $("#diary-show-more").addEventListener("click", () => {
    state.page += 1;
    render(/*append*/ true);
  });

  // ---- Filter + render ----
  function filtered() {
    let pool;
    if (state.q) {
      const hits = mini.search(state.q, { combineWith: "AND" });
      pool = hits.map(h => byId.get(h.id)).filter(Boolean);
    } else {
      pool = indexable;
    }
    return pool.filter(e => {
      if (state.type !== "all" && e.type !== state.type) return false;
      if (state.ticker && !(e.tickers || []).includes(state.ticker)) return false;
      if (state.topic && !(e.topics || []).includes(state.topic)) return false;
      return true;
    });
  }

  function hasActiveFilter() {
    return state.q !== "" || state.type !== "all" || state.ticker || state.topic;
  }

  function renderActiveFilters() {
    const parts = [];
    if (state.q) parts.push(`<button type="button" class="diary-chip diary-chip--active" data-clear="q"><i data-lucide="search"></i> "${escapeHtml(state.q)}" <span class="diary-chip__x">×</span></button>`);
    if (state.type !== "all") {
      const meta = TYPE_LABELS[state.type] || { label: state.type, icon: "" };
      parts.push(`<button type="button" class="diary-chip diary-chip--active" data-clear="type">${meta.icon} ${meta.label} <span class="diary-chip__x">×</span></button>`);
    }
    if (state.ticker) parts.push(`<button type="button" class="diary-chip diary-chip--active" data-clear="ticker">$${escapeHtml(state.ticker)} <span class="diary-chip__x">×</span></button>`);
    if (state.topic)  parts.push(`<button type="button" class="diary-chip diary-chip--active" data-clear="topic">${escapeHtml(state.topic)} <span class="diary-chip__x">×</span></button>`);
    if (hasActiveFilter()) {
      parts.push(`<button type="button" class="diary-chip diary-chip--clearall" data-clear="all">× clear all</button>`);
    }
    $("#filter-chips").innerHTML = parts.join("");

    // Highlight active type chip
    $$("#type-chips [data-type]").forEach(b => {
      b.classList.toggle("diary-chip--on", b.dataset.type === state.type);
    });
  }

  function renderCard(e) {
    const meta = TYPE_LABELS[e.type] || { label: e.type, icon: "" };
    const tickerTags = (e.tickers || []).map(t => `<a href="#" class="diary-card__tag" data-set-ticker="${escapeHtml(t)}">$${escapeHtml(t)}</a>`).join("");
    const topicTags = (e.topics || []).slice(0, 3).map(t => `<a href="#" class="diary-card__tag diary-card__tag--soft" data-set-topic="${escapeHtml(t)}">${escapeHtml(t)}</a>`).join("");
    const link = e.external_url || (e.linked_video_id ? `https://youtube.com/watch?v=${e.linked_video_id}` : null);

    const cta = link
      ? `<a class="diary-card__cta" href="${escapeHtml(link)}" target="_blank" rel="noopener">→ ดูวิดีโอเต็ม <i data-lucide="arrow-up-right"></i></a>`
      : `<span class="diary-card__cta diary-card__cta--muted">no video link yet</span>`;

    const summary = e.summary_thai
      ? `<p class="diary-card__body">${escapeHtml(e.summary_thai)}</p>`
      : "";

    const membership = e.membership ? `<span class="diary-card__lock"><i data-lucide="lock"></i> members</span>` : "";

    return `<li class="diary-card diary-card--${escapeHtml(e.type)}">
      <div class="diary-card__head">
        <span class="diary-card__type">${meta.icon} ${meta.label}</span>
        <span class="diary-card__date">${escapeHtml(fmtDate(e.date))}</span>
        ${membership}
      </div>
      <h3 class="diary-card__title">${escapeHtml(e.title)}</h3>
      ${summary}
      <div class="diary-card__foot">
        <div class="diary-card__tags">${tickerTags}${topicTags}</div>
        ${cta}
      </div>
    </li>`;
  }

  function render(append = false) {
    renderActiveFilters();
    const all = filtered();
    const total = all.length;
    const slice = all.slice(0, state.page * PAGE_SIZE);

    const showEmptyHint = !state.q && state.type === "all" && !state.ticker && !state.topic;
    $("#diary-empty").hidden = !showEmptyHint;

    if (total === 0) {
      $("#diary-results").innerHTML = `<li class="diary-empty__msg">ยังไม่มี entry ที่ match — ลอง keyword อื่น หรือ clear filter</li>`;
      $("#diary-count").textContent = "";
      $(".diary-more").hidden = true;
    } else {
      $("#diary-results").innerHTML = slice.map(renderCard).join("");
      $("#diary-count").textContent = `${slice.length} / ${total} entries`;
      $(".diary-more").hidden = slice.length >= total;
    }

    if (window.lucide) lucide.createIcons();
  }

  render();
})();
