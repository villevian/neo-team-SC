// Спільний шар даних для index.html та admin.html.
// Бекенд — Supabase (RPC-функції з supabase/schema.sql).
// Якщо SUPABASE_URL/KEY порожні — DEMO-режим через localStorage (лише цей браузер).
(function () {
  const CFG = window.TOT_CONFIG;
  const DEMO_KEY = "tot_demo_db2";
  const isDemo = !(CFG.SUPABASE_URL && CFG.SUPABASE_KEY);

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

  // ---------- public API (Supabase RPC) ----------
  async function rpc(fn, args) {
    const res = await fetch(CFG.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.SUPABASE_KEY },
      body: JSON.stringify(args || {})
    });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || "HTTP " + res.status);
    return data;
  }
  async function post(body) {
    if (isDemo) return demoHandle(body);
    if (body.action === "join") await rpc("join_student", { p_client_id: body.clientId, p_name: body.name });
    else if (body.action === "save") await rpc("save_response", { p_client_id: body.clientId, p_name: body.name, p_activity: body.activity, p_key: body.key, p_value: body.value });
    else if (body.action === "reset") await rpc("admin_reset", { p_key: body.key });
    return { ok: true };
  }
  // Admin: all raw data (needs the admin password)
  async function results(key) {
    if (isDemo) return Object.assign({ ok: true }, demoLoad());
    return Object.assign({ ok: true }, await rpc("admin_results", { p_key: key || "" }));
  }
  // Students: only the anonymous aggregate of the budget task
  async function budgetRanking() {
    if (isDemo) return Object.assign({ ok: true }, budgetSummary(demoLoad().responses));
    return Object.assign({ ok: true }, await rpc("budget_summary", {}));
  }

  window.TOT_API = { isDemo, post, results, budgetRanking, budgetSummary };
})();
