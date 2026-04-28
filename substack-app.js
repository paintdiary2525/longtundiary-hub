(async function () {
  const $ = (s) => document.querySelector(s);

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  const DISCORD_FORUM = "https://discord.gg/wUba6Kw7SY";

  let data;
  try {
    const res = await fetch("data/substack.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    $("#substack-feed").innerHTML = `<p class="feed-empty">ยังไม่มี picks ในระบบ — Press ยังไม่ได้ publish รอบแรก</p>`;
    $("#substack-meta").textContent = "no data yet";
    return;
  }

  const weeks = (data.weeks || []).slice(0, 5);
  if (weeks.length === 0) {
    $("#substack-feed").innerHTML = `<p class="feed-empty">ยังไม่มี picks สำหรับสัปดาห์นี้</p>`;
    $("#substack-meta").textContent = "—";
    return;
  }

  $("#substack-meta").textContent = `อัปเดตล่าสุด ${escapeHtml(data.updated || "")} · ${weeks.length} สัปดาห์`;

  const html = weeks.map(week => {
    const papers = (week.papers || []).map((p, i) => {
      const authorLink = p.author_url
        ? `<a href="${escapeHtml(p.author_url)}" target="_blank" rel="noopener">${escapeHtml(p.author || "—")}</a>`
        : escapeHtml(p.author || "—");
      return `
        <article class="substack-paper">
          <span class="substack-paper__num">${String(i + 1).padStart(2, "0")}</span>
          <h3 class="substack-paper__title">${escapeHtml(p.title || "")}</h3>
          <p class="substack-paper__author">โดย ${authorLink}</p>
          <div class="substack-paper__section">
            <h4 class="substack-paper__section-hd">📝 Core thesis</h4>
            <p class="substack-paper__body">${escapeHtml(p.core_thesis || "")}</p>
          </div>
          <div class="substack-paper__section">
            <h4 class="substack-paper__section-hd">🎯 Key takeaway</h4>
            <p class="substack-paper__body">${escapeHtml(p.key_takeaway || "")}</p>
          </div>
          <a class="substack-paper__cta" href="${DISCORD_FORUM}" target="_blank" rel="noopener">
            อ่านสรุปเต็มใน Discord <i data-lucide="arrow-up-right"></i>
          </a>
        </article>
      `;
    }).join("");
    const count = (week.papers || []).length;
    return `
      <section class="substack-week">
        <div class="substack-week__head">
          <h2 class="substack-week__label">${escapeHtml(week.week_label || "")}</h2>
          <span class="substack-week__count">${count} paper${count === 1 ? "" : "s"}</span>
        </div>
        <hr class="substack-week__rule">
        <div class="substack-papers">${papers}</div>
      </section>
    `;
  }).join("");

  $("#substack-feed").innerHTML = html;
  if (window.lucide) lucide.createIcons();
})();
