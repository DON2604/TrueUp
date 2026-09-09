/* ============================================================
   Vendor Intelligence Flow - interactive architecture walkthrough
   ============================================================ */

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  wrap: $("#canvasWrap"),
  stage: $("#canvasStage"),
  arch: $("#architecture"),
  packet: $("#packet"),
  logs: $("#logs"),
  stageTrack: $("#stageTrack"),
  startBtn: $("#startBtn"),
  pauseBtn: $("#pauseBtn"),
  resetBtn: $("#resetBtn"),
  sourceSelect: $("#sourceSelect"),
  vendorSelect: $("#vendorSelect"),
  speedSelect: $("#speedSelect"),
};

/* ---------- Flow definition ---------- */
const STAGES = [
  {
    id: "sources",
    title: "Input received",
    link: null,
    steps: (c) => [
      [`${c.source} uploaded for ${c.vendor}`, "ok"],
      ["File signature and format validated", "info"],
      ["Payload queued for secure processing", "info"],
    ],
  },
  {
    id: "extraction",
    title: "1. Extraction & non-sensitization",
    link: "link-extraction",
    steps: () => [
      ["Storing payload in Google Cloud Blob Storage", "info"],
      ["Document AI OCR extracting text, tables and key terms", "info"],
      ["DLP scan detected 14 sensitive fields", "warn"],
      ["Sensitive values de-identified and tokenized", "ok"],
    ],
    metrics: { mFields: 96, mTokens: 14 },
  },
  {
    id: "orchestrator",
    title: "2. Multi-modal AI orchestration",
    link: "link-orchestrator",
    steps: () => [
      ["Document Agent parsing clauses and obligations", "info"],
      ["Email Intelligence Agent linking commitments to contracts", "info"],
      ["Reconciliation Agent matching invoices, ERP and SLA records", "info"],
      ["Insight & Reasoning Agent scoring value-leakage signals", "info"],
      ["Unstructured content converted to structured JSON", "ok"],
    ],
    metrics: { mFields: 148, mRecords: 62 },
  },
  {
    id: "validator",
    title: "JSON validation",
    link: "link-validator",
    steps: () => [
      ["Structured payload received from orchestrator", "info"],
      ["Schema check: required fields and data types", "info"],
      ["Gemini context validation passed", "ok"],
      ["3 missing optional values enriched safely", "warn"],
    ],
  },
  {
    id: "segregation",
    title: "3. Secure data segregation",
    link: "link-segregation",
    steps: (c) => [
      [`Provisioning isolated schema for ${c.vendor}`, "info"],
      ["Generating vendor-specific encryption key", "info"],
      ["Encrypting records at rest (AES-256)", "info"],
      [`Committed to ${c.vendor} Postgres partition`, "ok"],
    ],
    metrics: { mRecords: 214 },
  },
  {
    id: "mapping",
    title: "4. Rule based mapping",
    link: "link-mapping",
    steps: () => [
      ["Rule Creator Agent drafting rebate and SLA rules", "info"],
      ["Generated rules matched against vendor configuration", "info"],
      ["Human approval recorded by domain expert", "warn"],
      ["Rule Transpiler produced 18 executable SQL rules", "ok"],
    ],
    metrics: { mRules: 18 },
  },
  {
    id: "output",
    title: "5. End user view & output",
    link: "link-output",
    steps: (c) => [
      [`Computing value leakage for ${c.vendor}`, "info"],
      ["Refreshing SLA, rebate and renewal dashboards", "info"],
      ["Analytics assistant index rebuilt", "info"],
      ["Conditional alert jobs scheduled", "ok"],
    ],
  },
];

/* ---------- Run state ---------- */
const state = { token: 0, running: false, paused: false, seconds: 0, ticker: null };

/* ---------- Helpers ---------- */
const wait = (ms) => {
  const token = state.token;
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    let last = performance.now();
    const tick = (now) => {
      if (token !== state.token) return reject(new Error("cancelled"));
      if (!state.paused) elapsed += now - last;
      last = now;
      if (elapsed >= ms) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

const pacing = () => {
  const unit = parseFloat(els.speedSelect.value) || 2;
  return { packet: unit * 450, logStep: unit * 260, hold: unit * 1000 };
};

const stamp = () =>
  new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

function log(message, type = "info") {
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.innerHTML = `<time>${stamp()}</time><span>${message}</span>`;
  els.logs.append(line);
  els.logs.scrollTop = els.logs.scrollHeight;
  while (els.logs.children.length > 250) els.logs.firstElementChild.remove();
}

function setProgress(pct, label) {
  $("#progressBar").style.width = `${pct}%`;
  $("#progressText").textContent = `${pct}%`;
  if (label) $("#statusText").textContent = label;
}

function countTo(id, target) {
  const node = document.getElementById(id);
  const from = parseInt(node.textContent, 10) || 0;
  if (target <= from) return;
  const startAt = performance.now();
  const step = (now) => {
    const p = Math.min((now - startAt) / 700, 1);
    node.textContent = Math.round(from + (target - from) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Zoom / fit ---------- */
const BASE = { w: 1500, h: 820 };
let zoom = 1;
let fitZoom = 1;
let manualZoom = false;

function applyZoom(scale) {
  zoom = Math.min(Math.max(scale, 0.2), 1.8);
  els.arch.style.transform = `scale(${zoom})`;
  els.stage.style.width = `${BASE.w * zoom}px`;
  els.stage.style.height = `${BASE.h * zoom}px`;
  els.wrap.classList.toggle("pannable", zoom > fitZoom + 0.002);
  $("#zoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}

function computeFit() {
  const r = els.wrap.getBoundingClientRect();
  return Math.min((r.width - 34) / BASE.w, (r.height - 34) / BASE.h);
}

function fitToScreen() {
  manualZoom = false;
  fitZoom = computeFit();
  applyZoom(fitZoom);
}

/* ---------- Packet travel along a connector ---------- */
function travel(linkId, duration) {
  const path = document.getElementById(linkId);
  if (!path) return Promise.resolve();
  const total = path.getTotalLength();
  const token = state.token;
  els.packet.setAttribute("opacity", "1");

  return new Promise((resolve, reject) => {
    const startAt = performance.now();
    let elapsed = 0;
    let last = startAt;
    const step = (now) => {
      if (token !== state.token) {
        els.packet.setAttribute("opacity", "0");
        return reject(new Error("cancelled"));
      }
      if (!state.paused) elapsed += now - last;
      last = now;
      const p = Math.min(elapsed / duration, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const pt = path.getPointAtLength(eased * total);
      els.packet.setAttribute("transform", `translate(${pt.x},${pt.y})`);
      if (p < 1) requestAnimationFrame(step);
      else {
        els.packet.setAttribute("opacity", "0");
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

/* ---------- Visual reset ---------- */
function resetVisuals() {
  $$(".group").forEach((g) => g.classList.remove("live", "done", "delivered"));
  $$(".link").forEach((l) => l.classList.remove("live", "done"));
  $$(".step-card").forEach((c) => c.classList.remove("pop"));
  $$(".vendor-row span").forEach((v) => v.classList.remove("active-vendor"));
  $$(".stage-row").forEach((r) => r.classList.remove("live", "done"));
  els.packet.setAttribute("opacity", "0");
  $("#deliveryToast").classList.remove("show");
  $("#statusDot").classList.remove("live");
  $("#liveDot").classList.remove("live");
  $("#payloadChip").textContent = "no payload";
  ["mFields", "mTokens", "mRules", "mRecords"].forEach((id) => (document.getElementById(id).textContent = "0"));
  setProgress(0, "Idle — select an input source and run the flow");
  $("#stageCount").textContent = `0/${STAGES.length}`;
}

/* ---------- Static scaffolding ---------- */
function buildScaffolding() {
  $$(".group").forEach((g) => {
    const tick = document.createElement("span");
    tick.className = "done-tick";
    tick.textContent = "✓";
    g.prepend(tick);
  });

  els.stageTrack.innerHTML = STAGES.map(
    (s, i) => `<div class="stage-row" data-row="${i}"><span class="bullet">✓</span>${s.title}</div>`
  ).join("");
}

/* ---------- Main run loop ---------- */
async function runFlow() {
  if (state.running) return;

  state.token += 1;
  state.running = true;
  state.paused = false;
  state.seconds = 0;

  const ctx = { source: els.sourceSelect.value, vendor: els.vendorSelect.value };

  resetVisuals();
  els.logs.innerHTML = "";
  els.startBtn.disabled = true;
  els.pauseBtn.disabled = false;
  els.pauseBtn.textContent = "Pause";
  $("#statusDot").classList.add("live");
  $("#liveDot").classList.add("live");
  $("#runId").textContent = `VF-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  $("#payloadChip").textContent = `${ctx.source} → ${ctx.vendor}`;

  clearInterval(state.ticker);
  state.ticker = setInterval(() => {
    if (state.paused || !state.running) return;
    state.seconds += 1;
    const m = String(Math.floor(state.seconds / 60)).padStart(2, "0");
    const s = String(state.seconds % 60).padStart(2, "0");
    $("#elapsed").textContent = `${m}:${s}`;
  }, 1000);

  log(`Run started — ${ctx.source} for ${ctx.vendor}`, "ok");

  try {
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i];
      const group = document.getElementById(stage.id);
      const p = pacing();

      // move the data packet along the incoming connector
      if (stage.link) {
        const link = document.getElementById(stage.link);
        link.classList.add("live");
        log(`Transferring payload → ${stage.title}`, "dim");
        await travel(stage.link, p.packet);
        link.classList.remove("live");
        link.classList.add("done");
      } else {
        const card = $(`.source-card[data-source="${CSS.escape(ctx.source)}"]`) || $(".source-card.is-selected");
        card.classList.add("beam");
        setTimeout(() => card.classList.remove("beam"), 1200);
      }

      // activate this stage
      $$(".group").forEach((g) => g.classList.remove("live"));
      group.classList.add("live");
      $$(".stage-row").forEach((r) => r.classList.remove("live"));
      const row = $(`.stage-row[data-row="${i}"]`);
      row.classList.add("live");
      $("#stageCount").textContent = `${i + 1}/${STAGES.length}`;
      setProgress(Math.round(((i + 0.35) / STAGES.length) * 100), stage.title);
      log(`STAGE ${i + 1}/${STAGES.length} — ${stage.title}`, "stage");

      if (stage.id === "segregation") {
        const pill = $(`.vendor-row span[data-vendor="${CSS.escape(ctx.vendor)}"]`);
        if (pill) pill.classList.add("active-vendor");
      }

      // walk the cards inside the stage while logging its steps
      const cards = Array.from(group.querySelectorAll(".step-card"));
      const steps = stage.steps(ctx);
      for (let s = 0; s < steps.length; s++) {
        await wait(p.logStep);
        const card = cards[s % Math.max(cards.length, 1)];
        if (card) {
          card.classList.add("pop");
          setTimeout(() => card.classList.remove("pop"), p.logStep * 2.2);
        }
        log(steps[s][0], steps[s][1]);
      }

      if (stage.metrics) Object.entries(stage.metrics).forEach(([id, value]) => countTo(id, value));

      // 2 second settle time between stages
      await wait(p.hold);

      group.classList.remove("live");
      group.classList.add("done");
      row.classList.remove("live");
      row.classList.add("done");
      setProgress(Math.round(((i + 1) / STAGES.length) * 100));
    }

    // final destination reached
    const output = document.getElementById("output");
    output.classList.add("delivered");
    $("#toastText").textContent = `${ctx.source} → ${ctx.vendor} dashboards, analytics & alerts`;
    $("#deliveryToast").classList.add("show");
    setProgress(100, `Complete — data delivered to ${ctx.vendor} output`);
    log("✓ Payload reached the final output destination", "ok");
    log("Dashboards, AI analytics and scheduled alerts are live", "ok");
    finish();
  } catch (err) {
    if (err.message !== "cancelled") throw err;
  }
}

function finish() {
  state.running = false;
  state.paused = false;
  clearInterval(state.ticker);
  els.startBtn.disabled = false;
  els.pauseBtn.disabled = true;
  els.pauseBtn.textContent = "Pause";
  $("#statusDot").classList.remove("live");
  $("#liveDot").classList.remove("live");
}

function hardReset() {
  state.token += 1;
  finish();
  state.seconds = 0;
  resetVisuals();
  $("#elapsed").textContent = "00:00";
  $("#runId").textContent = "—";
  els.logs.innerHTML =
    '<div class="log-line dim"><time>--:--:--</time><span>Waiting for a new processing run…</span></div>';
}

/* ---------- Events ---------- */
els.startBtn.addEventListener("click", runFlow);
els.resetBtn.addEventListener("click", hardReset);
$("#clearLogs").addEventListener("click", () => (els.logs.innerHTML = ""));

els.pauseBtn.addEventListener("click", () => {
  if (!state.running) return;
  state.paused = !state.paused;
  els.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  $("#statusDot").classList.toggle("live", !state.paused);
  if (state.paused) $("#statusText").textContent = "Paused";
  log(state.paused ? "Run paused by user" : "Run resumed", "warn");
});

function selectSource(value) {
  els.sourceSelect.value = value;
  $$(".source-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.source === value));
}

els.sourceSelect.addEventListener("change", (e) => selectSource(e.target.value));
$$(".source-card").forEach((card) =>
  card.addEventListener("click", () => {
    selectSource(card.dataset.source);
    if (!state.running) runFlow();
  })
);

$("#zoomIn").addEventListener("click", () => { manualZoom = true; applyZoom(zoom * 1.15); });
$("#zoomOut").addEventListener("click", () => { manualZoom = true; applyZoom(zoom / 1.15); });
$("#zoomFit").addEventListener("click", fitToScreen);

window.addEventListener("resize", () => {
  fitZoom = computeFit();
  if (!manualZoom) applyZoom(fitZoom);
  else els.wrap.classList.toggle("pannable", zoom > fitZoom + 0.002);
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "SELECT") return;
  if (e.code === "Space") { e.preventDefault(); state.running ? els.pauseBtn.click() : runFlow(); }
  if (e.key.toLowerCase() === "r") hardReset();
  if (e.key.toLowerCase() === "f") fitToScreen();
});

/* ---------- Init ---------- */
buildScaffolding();
resetVisuals();
fitToScreen();
