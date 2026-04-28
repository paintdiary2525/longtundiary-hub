/* ลงทุน Diary — Members Hub
   Loads data, renders sections, wires up search + filter on the archive. */

(async function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ytWatch(videoId) {
    return `https://youtube.com/watch?v=${videoId}`;
  }
  function ytThumb(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  }
  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[+m - 1]} ${+d}, ${y}`;
  }

  // ---------- Load data ----------
  const [eps, paths, series] = await Promise.all([
    fetch("data/episodes.json").then(r => r.json()),
    fetch("data/paths.json").then(r => r.json()),
    fetch("data/series.json").then(r => r.json()),
  ]);

  const episodes = eps.episodes;
  const byId = new Map(episodes.filter(e => e.video_id).map(e => [e.video_id, e]));

  // ---------- Hero meta counters ----------
  $("#meta-entries").textContent = episodes.length;
  $("#meta-members").textContent = episodes.filter(e => e.membership).length;
  const seriesSet = new Set();
  for (const e of episodes) for (const s of e.series) seriesSet.add(s);
  $("#meta-series").textContent = seriesSet.size;

  // ---------- Paths (Beginner / General / Advanced) ----------
  const pathOrder = ["beginner", "general", "advanced"];
  const pathsGrid = $("#paths-grid");
  pathOrder.forEach((key, idx) => {
    const p = paths[key];
    const card = document.createElement("article");
    card.className = "hub-path";
    card.innerHTML = `
      <span class="hub-path__tab">Vol ${idx + 1}</span>
      <div>
        <h3 class="hub-path__title">${p.label}</h3>
        <span class="hub-path__subtitle">${p.subtitle}</span>
      </div>
      <p class="hub-path__blurb">${p.blurb}</p>
      <ol class="hub-path__list" id="path-list-${p.id}"></ol>
    `;
    pathsGrid.appendChild(card);
    const list = $(`#path-list-${p.id}`, card);
    p.entries.forEach((entry, i) => {
      const li = document.createElement("li");
      let title = "(missing)";
      let href = "#";
      let sub = "";
      let isMember = false;
      let isFirst = !!entry.first_watch;
      if (entry.type === "playlist") {
        title = entry.title;
        sub = entry.subtitle || "";
        href = `https://www.youtube.com/playlist?list=${entry.playlist_id}`;
      } else {
        const ep = byId.get(entry.video_id);
        if (ep) {
          title = ep.title;
          href = ytWatch(entry.video_id);
          isMember = ep.membership;
          if (isFirst) sub = "First watch";
        } else {
          title = entry.fallback_title || `(unknown video — ${entry.video_id})`;
        }
      }
      const itemClasses = ["hub-path__item"];
      if (isFirst) itemClasses.push("hub-path__item--first");
      li.innerHTML = `
        <a class="${itemClasses.join(" ")}" href="${href}" target="_blank" rel="noopener">
          <span class="hub-path__num">${i + 1}</span>
          <span class="hub-path__txt">${escapeHtml(title)}${sub ? `<small>${escapeHtml(sub)}</small>` : ""}</span>
          ${entry.type === "playlist"
            ? `<span class="hub-path__item-icon" title="Playlist"><i data-lucide="list"></i></span>`
            : isMember
              ? `<span class="hub-stamp">RESERVED</span>`
              : `<span class="hub-path__item-icon"><i data-lucide="play"></i></span>`
          }
        </a>
      `;
      list.appendChild(li);
    });
  });

  // ---------- Latest page ----------
  const sorted = [...episodes].filter(e => e.video_id && e.url).sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  if (latest) {
    const el = $("#latest-card");
    el.innerHTML = `
      <a class="hub-latest__thumb" href="${latest.url}" target="_blank" rel="noopener">
        <img src="${ytThumb(latest.video_id)}" alt="" loading="lazy">
      </a>
      <div class="hub-latest__body">
        ${latest.membership ? `<span class="hub-stamp hub-stamp--lg">RESERVED</span> ` : ""}
        <h3>${escapeHtml(latest.title)}</h3>
        ${latest.series.length ? `<p>Series · ${latest.series.map(escapeHtml).join(" · ")}</p>` : ""}
        <a class="hub-membercard__cta" href="${latest.url}" target="_blank" rel="noopener">Open on YouTube <i data-lucide="arrow-up-right"></i></a>
        <div class="meta">
          <span><i data-lucide="calendar"></i> ${fmtDate(latest.date)}</span>
          ${latest.level ? `<span><i data-lucide="layers"></i> ${latest.level}</span>` : ""}
        </div>
      </div>
    `;
  }

  // ---------- Library: named series ----------
  const namedShelf = $("#shelf-named");
  series.named_series.forEach(s => {
    const count = episodes.filter(e => e.series.includes(s.name)).length;
    const a = document.createElement("a");
    a.className = "hub-book" + (s.playlist ? "" : " hub-book--no-playlist");
    a.href = s.playlist || `#archive?series=${encodeURIComponent(s.name)}`;
    if (s.playlist) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    a.dataset.series = s.name;
    a.innerHTML = `
      <span class="hub-book__stub">${s.playlist ? "playlist" : "auto-list"}</span>
      <span class="hub-book__icon"><i data-lucide="${s.icon}"></i></span>
      <span class="hub-book__name">${escapeHtml(s.name)}</span>
      <span class="hub-book__sub">${escapeHtml(s.subtitle)}</span>
      <span class="hub-book__count">${count} entr${count === 1 ? "y" : "ies"}</span>
    `;
    namedShelf.appendChild(a);
  });

  // ---------- Library: per-stock sagas ----------
  const sagaShelf = $("#shelf-sagas");
  series.stock_sagas.forEach(s => {
    const a = document.createElement("a");
    a.className = "hub-book hub-book--sage hub-book--no-playlist";
    a.href = `#archive?series=${encodeURIComponent(s.name)}`;
    a.dataset.series = s.name;
    a.innerHTML = `
      <span class="hub-book__icon"><i data-lucide="trending-up"></i></span>
      <span class="hub-book__name">$${escapeHtml(s.ticker)}</span>
      <span class="hub-book__sub">${s.count} entries</span>
    `;
    sagaShelf.appendChild(a);
  });

  // ---------- Library: ลงทุนแบบคนเก่งๆ sub-series ----------
  const creatorShelf = $("#shelf-creators");
  series.longtun_baeb_kuen_keng.sub_series.forEach(s => {
    const fullName = `ลงทุนแบบคนเก่งๆ — ${s.name}`;
    const a = document.createElement("a");
    a.className = "hub-book hub-book--no-playlist";
    a.href = `#archive?series=${encodeURIComponent(fullName)}`;
    a.dataset.series = fullName;
    a.innerHTML = `
      <span class="hub-book__icon"><i data-lucide="user-round"></i></span>
      <span class="hub-book__name">${escapeHtml(s.name)}</span>
      <span class="hub-book__count">${s.count} entr${s.count === 1 ? "y" : "ies"}</span>
    `;
    creatorShelf.appendChild(a);
  });

  // ---------- Topic chips ----------
  const topicCounts = new Map();
  for (const e of episodes) {
    for (const t of e.topics) {
      topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
    }
  }
  const topicAggregates = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 24);
  const chipBox = $("#topic-chips");
  // Add the AI+Semi combined chip first if applicable
  const aiSemi = series.topic_playlists["ai-semi"];
  const aiSemiChip = document.createElement("a");
  aiSemiChip.className = "hub-chip hub-chip--has-playlist";
  aiSemiChip.href = aiSemi.playlist;
  aiSemiChip.target = "_blank";
  aiSemiChip.rel = "noopener";
  aiSemiChip.innerHTML = `<i data-lucide="cpu" style="width:14px;height:14px"></i> ${aiSemi.label} <span class="hub-chip__count">playlist</span>`;
  chipBox.appendChild(aiSemiChip);
  // Then the rest from data
  topicAggregates.forEach(([topic, count]) => {
    const a = document.createElement("a");
    a.className = "hub-chip";
    a.href = `#archive?topic=${encodeURIComponent(topic)}`;
    a.dataset.topic = topic;
    // Trim trailing slashes/extra labels for display
    const display = topic.split("/")[0].trim();
    a.innerHTML = `${escapeHtml(display)} <span class="hub-chip__count">${count}</span>`;
    chipBox.appendChild(a);
  });

  // ---------- Archive: search + filter ----------
  const allSeries = Array.from(seriesSet).sort((a, b) => a.localeCompare(b, "th"));
  const seriesFilter = $("#series-filter");
  allSeries.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    seriesFilter.appendChild(opt);
  });

  let pageSize = 30;
  const archiveList = $("#archive-list");
  const filterCount = $("#filter-count");
  const showMoreBtn = $("#show-more");

  function getFilters() {
    return {
      query: $("#search-input").value.trim().toLowerCase(),
      level: $("#level-filter").value,
      series: $("#series-filter").value,
      memberOnly: $("#member-filter").checked,
    };
  }

  function applyFilters() {
    const f = getFilters();
    const filtered = episodes.filter(e => {
      if (f.memberOnly && !e.membership) return false;
      if (f.level && e.level !== f.level) return false;
      if (f.series && !e.series.includes(f.series)) return false;
      if (f.query && !e.title.toLowerCase().includes(f.query)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
    return filtered;
  }

  function render() {
    const filtered = applyFilters();
    archiveList.innerHTML = "";
    const visible = filtered.slice(0, pageSize);
    visible.forEach(e => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a class="hub-archive__row" href="${e.url || "#"}" ${e.url ? 'target="_blank" rel="noopener"' : ""}>
          <span class="hub-archive__date">${fmtDate(e.date)}</span>
          <span class="hub-archive__title">${e.membership ? '<span class="hub-stamp" style="margin-right:8px">RESERVED</span>' : ""}${escapeHtml(e.title)}</span>
          <span class="hub-archive__series">${e.series.map(s => `<span>${escapeHtml(s)}</span>`).join(" · ")}</span>
          ${e.level ? `<span class="hub-archive__level hub-archive__level--${e.level}">${e.level}</span>` : `<span></span>`}
        </a>
      `;
      archiveList.appendChild(li);
    });
    filterCount.textContent = `${filtered.length} entr${filtered.length === 1 ? "y" : "ies"}`;
    showMoreBtn.style.display = filtered.length > pageSize ? "" : "none";
    lucide.createIcons();
  }

  $("#search-input").addEventListener("input", () => { pageSize = 30; render(); });
  $("#level-filter").addEventListener("change", () => { pageSize = 30; render(); });
  $("#series-filter").addEventListener("change", () => { pageSize = 30; render(); });
  $("#member-filter").addEventListener("change", () => { pageSize = 30; render(); });
  showMoreBtn.addEventListener("click", () => { pageSize += 30; render(); });

  // Hash deep-link: #archive?series=Foo  /  #archive?topic=Bar
  function applyHashFilter() {
    const hash = window.location.hash;
    const m = hash.match(/^#archive\?(series|topic)=(.+)$/);
    if (!m) return;
    const [, kind, raw] = m;
    const value = decodeURIComponent(raw);
    if (kind === "series") {
      $("#series-filter").value = value;
    } else if (kind === "topic") {
      // Treat topic clicks as searches by topic substring
      $("#search-input").value = "";
      // Soft filter: keep only episodes that include this topic
      const orig = applyFilters;
      // simple override using closure
      pageSize = 30;
      const filtered = episodes.filter(e => e.topics.some(t => t.includes(value))).sort((a, b) => b.date.localeCompare(a.date));
      archiveList.innerHTML = "";
      filtered.slice(0, pageSize).forEach(e => {
        const li = document.createElement("li");
        li.innerHTML = `
          <a class="hub-archive__row" href="${e.url || "#"}" target="_blank" rel="noopener">
            <span class="hub-archive__date">${fmtDate(e.date)}</span>
            <span class="hub-archive__title">${e.membership ? '<span class="hub-stamp" style="margin-right:8px">RESERVED</span>' : ""}${escapeHtml(e.title)}</span>
            <span class="hub-archive__series">${e.series.map(s => `<span>${escapeHtml(s)}</span>`).join(" · ")}</span>
            ${e.level ? `<span class="hub-archive__level hub-archive__level--${e.level}">${e.level}</span>` : `<span></span>`}
          </a>
        `;
        archiveList.appendChild(li);
      });
      filterCount.textContent = `${filtered.length} entr${filtered.length === 1 ? "y" : "ies"} matching topic "${value}"`;
      lucide.createIcons();
      $("#archive").scrollIntoView({ behavior: "smooth" });
      return;
    }
    pageSize = 30;
    render();
    $("#archive").scrollIntoView({ behavior: "smooth" });
  }

  window.addEventListener("hashchange", applyHashFilter);
  render();
  applyHashFilter();

  // ---------- Diary micro-interactions ----------
  // 1. Stamp a hand-lettered page number in the top-right of each section.
  $$(".hub-section").forEach((section, idx) => {
    const stamp = document.createElement("span");
    stamp.className = "hub-page-num";
    stamp.textContent = `page ${idx + 1}`;
    section.appendChild(stamp);
  });

  // 2. Page-flip animation on the hero "Open the diary" CTA.
  $$('[data-flip]').forEach(link => {
    link.addEventListener("click", (e) => {
      const target = link.getAttribute("data-flip");
      const dest = $(target);
      if (!dest) return;
      e.preventDefault();
      const flip = document.createElement("div");
      flip.className = "page-flip is-active";
      document.body.appendChild(flip);
      // Start scrolling slightly before the flip clears so the reveal lines up.
      setTimeout(() => dest.scrollIntoView({ behavior: "smooth" }), 280);
      flip.addEventListener("animationend", () => flip.remove(), { once: true });
    });
  });

  lucide.createIcons();

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
