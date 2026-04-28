(async function () {
  const $ = (s) => document.querySelector(s);

  function fmtThaiDate(iso) {
    const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    const [y,m,d] = iso.slice(0, 10).split("-");
    return `${+d} ${months[+m-1]} ${+y}`;
  }
  function fmtLastEdited(iso) {
    // Accepts "YYYY-MM-DD" (date-only) or full ISO "YYYY-MM-DDTHH:MM:SS+TZ"
    const datePart = fmtThaiDate(iso);
    if (!iso.includes("T")) return `Last edited: ${datePart}`;
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok", hour12: false });
    return `Last edited: ${datePart}, ${time}`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  let data;
  try {
    const res = await fetch("data/news.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    $("#news-feed").innerHTML = `<p class="feed-empty">ยังไม่มี news ในระบบ — Press ยังไม่ได้ publish รอบแรก</p>`;
    $("#news-meta").textContent = "no data yet";
    return;
  }

  const days = (data.days || []).slice(0, 7);
  if (days.length === 0) {
    $("#news-feed").innerHTML = `<p class="feed-empty">ไม่มี news ในช่วง 7 วันที่ผ่านมา</p>`;
    $("#news-meta").textContent = "—";
    return;
  }

  $("#news-meta").textContent = `${fmtLastEdited(data.updated)} · ${days.length} day${days.length === 1 ? "" : "s"}`;

  const html = days.map(day => {
    const headlines = (day.headlines || []).map(h => `
      <li class="news-headline">
        <span class="news-headline__emoji">${escapeHtml(h.emoji || "🗞️")}</span>
        <span class="news-headline__ticker">${escapeHtml(h.ticker || "—")}</span>
        <span class="news-headline__blurb">${escapeHtml(h.blurb || "")}</span>
      </li>
    `).join("");
    const sources = (day.sources && day.sources.length)
      ? `<p class="news-day__sources"><strong>ที่มา:</strong> ${day.sources.map(escapeHtml).join(" · ")}</p>`
      : "";
    return `
      <article class="news-day">
        <h3 class="news-day__date">${escapeHtml(day.thai_date || fmtThaiDate(day.date))}</h3>
        <p class="news-day__date-sub">${escapeHtml(day.date)} · ${headlines && (day.headlines || []).length} ข่าว</p>
        <ul class="news-headlines">${headlines}</ul>
        ${sources}
      </article>
    `;
  }).join("");

  $("#news-feed").innerHTML = html;
})();
