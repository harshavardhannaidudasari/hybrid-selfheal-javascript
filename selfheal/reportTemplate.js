'use strict';

const HTML_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>__PROJECT_NAME__ — Self-Healing Test Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #f7f8fb; --card: #ffffff; --text: #1a1d29; --muted: #676c7e;
    --border: #e3e6ee; --accent: #5b5fef; --green: #1a9e6b; --green-bg: #e8f9f1;
    --red: #d1264f; --red-bg: #fdecf1; --amber: #b3760a; --amber-bg: #fdf3e0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14151f; --card: #1c1e2b; --text: #eef0f8; --muted: #9195a8;
      --border: #2c2f42; --accent: #8b8ffb; --green: #3ddc97; --green-bg: #123328;
      --red: #ff6b8a; --red-bg: #3a1522; --amber: #ffc861; --amber-bg: #3a2c0f;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  header { padding: 28px 32px 20px; }
  header h1 { margin: 0 0 4px; font-size: 22px; }
  header .meta { color: var(--muted); font-size: 13px; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 0 32px 60px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px; margin: 8px 0 28px; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px 16px; }
  .stat .n { font-size: 24px; font-weight: 700; }
  .stat .l { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  .stat.green .n { color: var(--green); }
  .stat.red .n { color: var(--red); }
  .stat.amber .n { color: var(--amber); }
  .test-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    margin-bottom: 16px; overflow: hidden; }
  .test-head { display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; cursor: pointer; }
  .test-head .name { font-weight: 600; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px;
    font-weight: 600; }
  .badge.passed { background: var(--green-bg); color: var(--green); }
  .badge.failed { background: var(--red-bg); color: var(--red); }
  .badge.healed { background: var(--green-bg); color: var(--green); }
  .badge.unresolved { background: var(--red-bg); color: var(--red); }
  .test-body { border-top: 1px solid var(--border); padding: 4px 18px 14px; display: none; }
  .test-card.open .test-body { display: block; }
  .test-card.no-events .test-head { cursor: default; }
  .event { border: 1px solid var(--border); border-radius: 10px; margin: 12px 0; padding: 14px 16px; }
  .event-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
  .event-top .loc-name { font-weight: 600; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .conf-bar { flex: 1 1 120px; height: 6px; border-radius: 999px; background: var(--border);
    max-width: 160px; overflow: hidden; }
  .conf-bar > div { height: 100%; background: var(--accent); }
  .conf-pct { font-size: 12px; color: var(--muted); min-width: 38px; }
  .selectors { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; margin: 6px 0; }
  .selectors .arrow { color: var(--muted); margin: 0 6px; }
  .selectors .bad { color: var(--red); }
  .selectors .good { color: var(--green); }
  .err { color: var(--muted); font-size: 13px; margin: 6px 0 10px; }
  .shots { display: flex; gap: 12px; flex-wrap: wrap; }
  .shot { flex: 1 1 260px; }
  .shot .cap { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  .shot img { width: 100%; border-radius: 8px; border: 1px solid var(--border); display: block; }
  .empty { color: var(--muted); font-size: 13px; padding: 8px 0 4px; }
  .chev { color: var(--muted); transition: transform .15s; }
  .test-card.open .chev { transform: rotate(90deg); }
</style>
</head>
<body>
<header>
  <h1>__PROJECT_NAME__ — Self-Healing Test Report</h1>
  <div class="meta">__BASE_URL__ &nbsp;·&nbsp; run started __STARTED_AT__ &nbsp;·&nbsp; duration __DURATION__</div>
</header>
<div class="wrap">
  <div class="summary" id="summary"></div>
  <div id="tests"></div>
</div>
<script>
const REPORT_DATA = __REPORT_DATA_JSON__;

function pct(x) { return Math.round(x * 100) + '%'; }

function renderSummary(data) {
  const tests = data.tests;
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.length - passed;
  const events = tests.flatMap(t => t.healingEvents);
  const healed = events.filter(e => e.outcome === 'healed').length;
  const unresolved = events.filter(e => e.outcome === 'unresolved').length;
  const stats = [
    ['Tests', tests.length, ''],
    ['Passed', passed, 'green'],
    ['Failed', failed, failed ? 'red' : ''],
    ['Healing attempts', events.length, ''],
    ['Healed', healed, 'green'],
    ['Unresolved', unresolved, unresolved ? 'red' : ''],
  ];
  document.getElementById('summary').innerHTML = stats.map(([label, n, cls]) =>
    \`<div class="stat \${cls}"><div class="n">\${n}</div><div class="l">\${label}</div></div>\`
  ).join('');
}

function renderEvent(e) {
  const confColor = e.outcome === 'healed' ? 'var(--green)' : 'var(--red)';
  const shots = [];
  if (e.screenshotBefore) shots.push(['Before (failure)', e.screenshotBefore]);
  if (e.screenshotAfter) shots.push(['After (healed, highlighted)', e.screenshotAfter]);
  return \`
    <div class="event">
      <div class="event-top">
        <span class="loc-name">\${e.locatorName}</span>
        <span class="badge \${e.outcome}">\${e.outcome}</span>
        <div class="conf-bar"><div style="width:\${pct(e.confidence)};background:\${confColor}"></div></div>
        <span class="conf-pct">\${pct(e.confidence)} confidence</span>
        <span class="conf-pct">\${e.candidatesConsidered} candidates scanned</span>
      </div>
      <div class="selectors">
        <span class="bad">\${e.primarySelector}</span><span class="arrow">→</span>\${e.healedSelector ? \`<span class="good">\${e.healedSelector}</span>\` : '<span class="bad">no candidate above threshold</span>'}
      </div>
      <div class="err">\${e.error}</div>
      \${shots.length ? \`<div class="shots">\${shots.map(([cap, src]) =>
        \`<div class="shot"><div class="cap">\${cap}</div><img src="\${src}" loading="lazy"></div>\`
      ).join('')}</div>\` : ''}
    </div>\`;
}

function renderTests(data) {
  document.getElementById('tests').innerHTML = data.tests.map((t, i) => {
    const hasEvents = t.healingEvents.length > 0;
    return \`
    <div class="test-card \${hasEvents ? '' : 'no-events'}" id="test-\${i}">
      <div class="test-head" onclick="document.getElementById('test-\${i}').classList.toggle('open')">
        <div><span class="chev">▶</span>&nbsp; <span class="name">\${t.name}</span></div>
        <div><span class="badge \${t.status}">\${t.status}</span>
          \${hasEvents ? \`<span class="badge \${t.healingEvents.some(e=>e.outcome==='unresolved') ? 'unresolved' : 'healed'}">\${t.healingEvents.length} healing event\${t.healingEvents.length===1?'':'s'}</span>\` : ''}
        </div>
      </div>
      <div class="test-body">
        \${hasEvents ? t.healingEvents.map(renderEvent).join('') : '<div class="empty">No healing needed for this test.</div>'}
      </div>
    </div>\`;
  }).join('');
  data.tests.forEach((t, i) => {
    if (t.status === 'failed' || t.healingEvents.some(e => e.outcome === 'unresolved')) {
      document.getElementById('test-' + i).classList.add('open');
    }
  });
}

renderSummary(REPORT_DATA);
renderTests(REPORT_DATA);
</script>
</body>
</html>
`;

module.exports = { HTML_TEMPLATE };
