/* ลงทุน Diary — AI Content page
   Renders the 3-column AI roadmap from data/ai-content.json.
   Mirrors app.js path rendering, plus two extra entry types:
     - coming-soon: rendered as a non-clickable item with a "เร็วๆ นี้" badge
     - section-header: a sub-heading inside a column (used in the middle tab) */

(async function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  const data = await fetch("data/ai-content.json").then(r => r.json());

  const tabOrder = ["ai-101", "ai-workflows", "ai-advanced"];
  const grid = $("#ai-paths-grid");

  tabOrder.forEach((key, idx) => {
    const p = data[key];
    if (!p) return;
    const card = document.createElement("article");
    card.className = "hub-path";
    card.innerHTML = `
      <span class="hub-path__tab">Vol ${idx + 1}</span>
      <div>
        <h3 class="hub-path__title">${p.label}</h3>
        <span class="hub-path__subtitle">${p.subtitle}</span>
      </div>
      <p class="hub-path__blurb">${p.blurb}</p>
      <ol class="hub-path__list" id="ai-list-${p.id}"></ol>
    `;
    grid.appendChild(card);

    const list = $(`#ai-list-${p.id}`, card);
    let n = 0; // number resets after each section-header

    p.entries.forEach((entry) => {
      const li = document.createElement("li");

      if (entry.type === "section-header") {
        li.className = "hub-path__section";
        li.innerHTML = `<span>${escapeHtml(entry.label)}</span>`;
        list.appendChild(li);
        n = 0; // reset numbering for the next sub-section
        return;
      }

      n += 1;

      if (entry.type === "coming-soon") {
        li.innerHTML = `
          <div class="hub-path__item is-coming-soon">
            <span class="hub-path__num">${n}</span>
            <span class="hub-path__txt">${escapeHtml(entry.title)}${entry.subtitle ? `<small>${escapeHtml(entry.subtitle)}</small>` : ""}</span>
            <span class="hub-path__badge">เร็วๆ นี้</span>
          </div>
        `;
        list.appendChild(li);
        return;
      }

      // Future shape: published video. Same as app.js path rendering.
      if (entry.type === "video" && entry.video_id) {
        const href = `https://youtube.com/watch?v=${entry.video_id}`;
        li.innerHTML = `
          <a class="hub-path__item" href="${href}" target="_blank" rel="noopener">
            <span class="hub-path__num">${n}</span>
            <span class="hub-path__txt">${escapeHtml(entry.title || entry.video_id)}${entry.subtitle ? `<small>${escapeHtml(entry.subtitle)}</small>` : ""}</span>
            <span class="hub-path__item-icon"><i data-lucide="play"></i></span>
          </a>
        `;
        list.appendChild(li);
        return;
      }
    });
  });

  // Page-flip CTA pattern (parity with index.html data-flip)
  document.querySelectorAll('[data-flip]').forEach(link => {
    link.addEventListener("click", (e) => {
      const target = link.getAttribute("data-flip");
      const dest = $(target);
      if (!dest) return;
      e.preventDefault();
      const flip = document.createElement("div");
      flip.className = "page-flip is-active";
      document.body.appendChild(flip);
      setTimeout(() => dest.scrollIntoView({ behavior: "smooth" }), 280);
      flip.addEventListener("animationend", () => flip.remove(), { once: true });
    });
  });

  lucide.createIcons();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
