/**
 * Бекенд для інтерактивної презентації «Degree or Certificate?» (ENG HUB).
 * Вставте цей код у Google Таблицю: Розширення → Apps Script.
 * Потім: Розгорнути → Нове розгортання → Веб-застосунок
 *   Виконувати як: Я
 *   Доступ: Усі (Anyone)
 * Скопіюйте URL, що закінчується на /exec, у config.js → API_URL.
 *
 * Аркуші створюються автоматично:
 *   students  — хто зайшов (clientId, name, joinedAt)
 *   responses — відповіді (clientId, name, activity, key, value, updatedAt)
 *     activity: tot (This or that), budget, case (Make the case), invest (£10K)
 */

// ⚠️ Змініть пароль адмінки ТУТ, в редакторі Apps Script (не в репозиторії).
const ADMIN_KEY = 'change-me';

const ACTIVITIES = ['tot', 'budget', 'case', 'invest'];
const SHEET_STUDENTS = 'students';
const SHEET_RESPONSES = 'responses';

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // зберігати все як текст
  }
  return sh;
}
const students_ = () => sheet_(SHEET_STUDENTS, ['clientId', 'name', 'joinedAt']);
const responses_ = () => sheet_(SHEET_RESPONSES, ['clientId', 'name', 'activity', 'key', 'value', 'updatedAt']);

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s, max) {
  return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, '').trim().slice(0, max || 80);
}
function rows_(sh) {
  const [head, ...rows] = sh.getDataRange().getValues();
  return rows.filter(r => r[0]).map(r => Object.fromEntries(head.map((h, i) => [h, String(r[i])])));
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents || '{}');
    const now = new Date().toISOString();
    const clientId = clean_(body.clientId, 64);
    const name = clean_(body.name, 60);

    if (body.action === 'join') {
      if (!clientId || !name) return json_({ ok: false, error: 'clientId and name required' });
      const sh = students_();
      const data = sh.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === clientId) { sh.getRange(i + 1, 2).setValue(name); found = true; break; }
      }
      if (!found) sh.appendRow([clientId, name, now]);
      const rs = responses_(); const rd = rs.getDataRange().getValues();
      for (let i = 1; i < rd.length; i++) if (rd[i][0] === clientId) rs.getRange(i + 1, 2).setValue(name);
      return json_({ ok: true });
    }

    if (body.action === 'save') {
      const activity = clean_(body.activity, 20);
      const key = clean_(body.key, 20);
      const value = clean_(body.value, 1000);
      if (!clientId || !name || !key || ACTIVITIES.indexOf(activity) < 0) return json_({ ok: false, error: 'bad save' });
      const sh = responses_();
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === clientId && data[i][2] === activity && data[i][3] === key) {
          sh.getRange(i + 1, 1, 1, 6).setValues([[clientId, name, activity, key, value, now]]);
          CacheService.getScriptCache().remove('summary_' + activity);
          return json_({ ok: true });
        }
      }
      sh.appendRow([clientId, name, activity, key, value, now]);
      CacheService.getScriptCache().remove('summary_' + activity);
      return json_({ ok: true });
    }

    if (body.action === 'reset') {
      if (body.key !== ADMIN_KEY) return json_({ ok: false, error: 'wrong key' });
      [students_(), responses_()].forEach(sh => { if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1); });
      ACTIVITIES.forEach(a => CacheService.getScriptCache().remove('summary_' + a));
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Анонімний підсумок Employability Budget (студенти бачать лише його, без імен)
function budgetSummary_() {
  const per = {}; let count = 0;
  rows_(responses_()).forEach(r => {
    if (r.activity !== 'budget' || r.key !== 'alloc') return;
    let a; try { a = JSON.parse(r.value); } catch (e) { return; }
    if (!a || typeof a !== 'object') return;
    const vals = Object.values(a).map(Number);
    if (vals.some(v => !isFinite(v) || v < 0) || vals.reduce((s, v) => s + v, 0) !== 100) return;
    count++;
    Object.keys(a).forEach(k => (per[k] = per[k] || []).push(Number(a[k])));
  });
  const assets = {};
  Object.keys(per).forEach(k => {
    const v = per[k], n = v.length, avg = v.reduce((s, x) => s + x, 0) / n;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - avg) * (x - avg), 0) / n);
    assets[k] = { avg: Math.round(avg * 10) / 10, min: Math.min(...v), max: Math.max(...v), sd: Math.round(sd * 10) / 10, n };
  });
  return { count, assets };
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'results') {
    if (p.key !== ADMIN_KEY) return json_({ ok: false, error: 'wrong key' });
    return json_({ ok: true, students: rows_(students_()), responses: rows_(responses_()) });
  }
  if (p.action === 'summary' && p.activity === 'budget') {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('summary_budget');
    if (hit) return json_(JSON.parse(hit));
    const out = Object.assign({ ok: true }, budgetSummary_());
    cache.put('summary_budget', JSON.stringify(out), 5);
    return json_(out);
  }
  return json_({ ok: true, service: 'degree-or-certificate' });
}
