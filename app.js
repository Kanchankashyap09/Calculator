(function () {
  'use strict';

  const { evaluate, formatResult, toExpression, autoClose } = window.CalcEngine;

  const STORAGE_KEY = 'calculator-history-v1';
  const MAX_HISTORY = 30;

  const $ = (id) => document.getElementById(id);
  const mainEl = $('main');
  const subEl = $('sub');
  const copyBtn = $('copy');
  const keysEl = $('keys');
  const listEl = $('history-list');
  const emptyEl = $('history-empty');
  const clearHistoryBtn = $('clear-history');
  const announceEl = $('announce');

  // ---------- State ----------
  let expr = '';            // what the user is typing, e.g. "12+3×4"
  let justEvaluated = false;
  let lastExpr = '';
  let lastValue = 0;
  let errorMsg = '';
  let history = loadHistory();

  // ---------- Helpers ----------
  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw)
        ? raw.filter((h) => h && typeof h.expr === 'string' && typeof h.value === 'number').slice(0, MAX_HISTORY)
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (_) { /* ignore */ }
  }

  // Adds spaces around operators for readability: "2+3×4" -> "2 + 3 × 4"
  function pretty(s) {
    return s.replace(/[+−×÷]/g, (m, off) =>
      off === 0 || /[(+−×÷]/.test(s[off - 1]) ? m : ' ' + m + ' ');
  }

  function previewText() {
    if (!expr) return '';
    const stripped = expr.replace(/[+−×÷(]+$/, '');
    const probe = stripped.replace(/\(−[0-9.]+\)/g, '0').replace(/^−/, '');
    if (!/[+−×÷%]/.test(probe)) return '';
    try { return '= ' + formatResult(evaluate(stripped)); } catch (_) { return ''; }
  }

  // ---------- Rendering ----------
  function render() {
    let main, sub;
    if (errorMsg) {
      main = errorMsg;
      sub = pretty(expr);
    } else if (justEvaluated) {
      main = formatResult(lastValue);
      sub = pretty(lastExpr) + ' =';
    } else {
      main = expr ? pretty(expr) : '0';
      sub = previewText();
    }
    mainEl.textContent = main;
    subEl.textContent = sub;
    mainEl.classList.toggle('error', !!errorMsg);
    mainEl.dataset.size = main.length > 18 ? 'xs' : main.length > 11 ? 's' : 'm';
    copyBtn.disabled = !justEvaluated || !!errorMsg;
  }

  function renderHistory() {
    listEl.textContent = '';
    emptyEl.hidden = history.length > 0;
    clearHistoryBtn.hidden = history.length === 0;
    history.forEach((item, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.dataset.index = String(i);
      const e = document.createElement('span');
      e.className = 'h-expr';
      e.textContent = pretty(item.expr) + ' =';
      const r = document.createElement('span');
      r.className = 'h-result';
      r.textContent = formatResult(item.value);
      btn.append(e, r);
      li.append(btn);
      listEl.append(li);
    });
  }

  // ---------- Input actions ----------
  function startFresh() {
    if (justEvaluated) { expr = ''; justEvaluated = false; }
  }

  function continueFromResult() {
    if (justEvaluated) { expr = toExpression(lastValue); justEvaluated = false; }
  }

  function inputDigit(d) {
    startFresh();
    if (/[)%]$/.test(expr)) expr += '×';
    const seg = (expr.match(/[0-9.]*$/) || [''])[0];
    if (seg.replace('.', '').length >= 15) return;
    if (seg === '0') expr = expr.slice(0, -1);
    expr += d;
  }

  function inputDot() {
    startFresh();
    if (/[)%]$/.test(expr)) expr += '×';
    const seg = (expr.match(/[0-9.]*$/) || [''])[0];
    if (seg.includes('.')) return;
    expr += seg === '' ? '0.' : '.';
  }

  function inputOperator(op) {
    continueFromResult();
    if (expr === '') {
      expr = op === '−' ? '−' : '0' + op;
      return;
    }
    if (expr.slice(-1) === '(') {
      if (op === '−') expr += op;
      return;
    }
    if (expr === '−' || /\(−$/.test(expr)) return;
    if (/[+−×÷]$/.test(expr)) {
      if (op === '−' && /[×÷]$/.test(expr)) { expr += op; return; }  // e.g. 5×−3
      expr = expr.replace(/[+−×÷]+$/, '') + op;                        // swap operator
      return;
    }
    expr += op;
  }

  function inputPercent() {
    continueFromResult();
    if (/[0-9)%]$/.test(expr)) expr += '%';
  }

  function inputParen(ch) {
    if (ch === '(') {
      startFresh();
      if (/[0-9)%]$/.test(expr)) expr += '×';
      expr += '(';
      return;
    }
    if (justEvaluated) return;
    const open = (expr.match(/\(/g) || []).length;
    const close = (expr.match(/\)/g) || []).length;
    if (open > close && /[0-9)%]$/.test(expr)) expr += ')';
  }

  function negate() {
    continueFromResult();
    const wrapped = expr.match(/\(−([0-9.]+)\)$/);
    if (wrapped) { expr = expr.slice(0, -wrapped[0].length) + wrapped[1]; return; }
    const num = expr.match(/[0-9.]+$/);
    if (num) expr = expr.slice(0, -num[0].length) + '(−' + num[0] + ')';
  }

  function backspace() {
    if (justEvaluated) {            // go back to editing the expression
      expr = lastExpr;
      justEvaluated = false;
      return;
    }
    expr = expr.slice(0, -1);
  }

  function clearAll() {
    expr = '';
    justEvaluated = false;
  }

  function equals() {
    if (justEvaluated || !expr) return;
    try {
      const value = evaluate(expr);
      lastExpr = autoClose(expr);
      lastValue = value;
      justEvaluated = true;
      history.unshift({ expr: lastExpr, value });
      history = history.slice(0, MAX_HISTORY);
      saveHistory();
      renderHistory();
      announceEl.textContent = 'Result ' + formatResult(value);
    } catch (err) {
      errorMsg = err.message;
      announceEl.textContent = err.message;
    }
  }

  function press(key) {
    errorMsg = '';
    if (/^[0-9]$/.test(key)) {
      inputDigit(key);
    } else {
      switch (key) {
        case '.':     inputDot(); break;
        case '+': case '−': case '×': case '÷': inputOperator(key); break;
        case '%':     inputPercent(); break;
        case '(': case ')': inputParen(key); break;
        case 'neg':   negate(); break;
        case 'back':  backspace(); break;
        case 'clear': clearAll(); break;
        case '=':     equals(); break;
      }
    }
    render();
  }

  // ---------- Events ----------
  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (btn) press(btn.dataset.key);
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;
    const item = history[Number(btn.dataset.index)];
    if (!item) return;
    expr = toExpression(item.value);
    justEvaluated = false;
    errorMsg = '';
    render();
  });

  clearHistoryBtn.addEventListener('click', () => {
    history = [];
    saveHistory();
    renderHistory();
  });

  copyBtn.addEventListener('click', async () => {
    if (!justEvaluated) return;
    const text = String(lastValue);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
    }
    copyBtn.textContent = ok ? 'Copied' : 'Copy failed';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
  });

  function flash(key) {
    const btn = keysEl.querySelector('[data-key="' + CSS.escape(key) + '"]');
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 110);
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let key = null;
    if (/^[0-9]$/.test(k)) key = k;
    else if (k === '.' || k === ',') key = '.';
    else if (k === '+') key = '+';
    else if (k === '-') key = '−';
    else if (k === '*' || k === 'x' || k === 'X') key = '×';
    else if (k === '/') key = '÷';
    else if (k === '%') key = '%';
    else if (k === '(' || k === ')') key = k;
    else if (k === 'Enter' || k === '=') key = '=';
    else if (k === 'Backspace') key = 'back';
    else if (k === 'Escape' || k === 'Delete') key = 'clear';
    if (!key) return;
    e.preventDefault();
    press(key);
    flash(key);
  });

  // ---------- Start ----------
  renderHistory();
  render();
})();
