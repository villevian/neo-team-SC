// Спільний шар даних для index.html та admin.html.
// Якщо API_URL порожній — DEMO-режим через localStorage (лише цей браузер).
(function () {
  const CFG = window.TOT_CONFIG;
  const DEMO_KEY = "tot_demo_db2";
  const isDemo = !CFG.API_URL;

  // ---------- aggregate for the Employability Budget (same logic as in Code.gs) ----------
  function budgetSummary(responses) {
    const per = {};
    let count = 0;
    responses.forEach((r) => {
      if (r.activity !== "budget" || r.key !== "alloc") return;
      let a; try { a = typeof r.value === "string" ? JSON.parse(r.value) : r.value; } catch (e) { return; }
      if (!a || typeof a !== "object") return;
      const vals = Object.values(a).map(Number);
      if (vals.some((v) => !isFinite(v) || v < 0) || vals.reduce((s, v) => s + v, 0) !== 100) return;
      count++;
      Object.keys(a).forEach((k) => (per[k] = per[k] || []).push(Number(a[k])));
    });
    const assets = {};
    Object.keys(per).forEach((k) => {
      const v = per[k], n = v.length, avg = v.reduce((s, x) => s + x, 0) / n;
      const sd = Math.sqrt(v.reduce((s, x) => s + (x - avg) * (x - avg), 0) / n);
      assets[k] = { avg: Math.round(avg * 10) / 10, min: Math.min(...v), max: Math.max(...v), sd: Math.round(sd * 10) / 10, n };
    });
    return { count, assets };
  }

  // ---------- demo backend ----------
  function demoLoad() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || { students: [], responses: [] }; }
    catch (e) { return { students: [], responses: [] }; }
  }
  function demoSave(db) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch (e) {} }
  function demoHandle(body) {
    const db = demoLoad(), now = new Date().toISOString();
    if (body.action === "join") {
      const s = db.students.find((x) => x.clientId === body.clientId);
      if (s) s.name = body.name; else db.students.push({ clientId: body.clientId, name: body.name, joinedAt: now });
      db.responses.forEach((r) => { if (r.clientId === body.clientId) r.name = body.name; });
    } else if (body.action === "save") {
      const r = db.responses.find((x) => x.clientId === body.clientId && x.activity === body.activity && x.key === body.key);
      if (r) Object.assign(r, { name: body.name, value: body.value, updatedAt: now });
      else db.responses.push({ clientId: body.clientId, name: body.name, activity: body.activity, key: body.key, value: body.value, updatedAt: now });
    } else if (body.action === "reset") {
      db.students = []; db.responses = [];
    }
    demoSave(db);
    return { ok: true };
  }

  // ---------- public API ----------
  async function post(body) {
    if (isDemo) return demoHandle(body);
    // Без заголовка Content-Type браузер шле text/plain — Apps Script приймає це без CORS-preflight
    const res = await fetch(CFG.API_URL, { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function get(params) {
    const qs = Object.keys(params).map((k) => k + "=" + encodeURIComponent(params[k])).join("&");
    const res = await fetch(CFG.API_URL + "?" + qs + "&t=" + Date.now());
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  // Admin: all raw data (needs key)
  async function results(key) {
    if (isDemo) return Object.assign({ ok: true }, demoLoad());
    return get({ action: "results", key: key || "" });
  }
  // Students: only the anonymous aggregate of the budget task
  async function budgetRanking() {
    if (isDemo) return Object.assign({ ok: true }, budgetSummary(demoLoad().responses));
    return get({ action: "summary", activity: "budget" });
  }

  window.TOT_API = { isDemo, post, results, budgetRanking, budgetSummary };
})();
