/* Calculator engine: safe expression parser (no eval) */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CalcEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ') { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i));
        if (!m) throw new Error('Invalid number');
        tokens.push(parseFloat(m[0]));
        i += m[0].length;
        continue;
      }
      if ('+−×÷()%'.includes(ch)) { tokens.push(ch); i++; continue; }
      throw new Error('Invalid character');
    }
    return tokens;
  }

  // Closes any "(" that the user left open, e.g. "2×(3+4" -> "2×(3+4)"
  function autoClose(src) {
    const open = (src.match(/\(/g) || []).length;
    const close = (src.match(/\)/g) || []).length;
    return open > close ? src + ')'.repeat(open - close) : src;
  }

  function evaluate(src) {
    const tokens = tokenize(autoClose(src));
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    // expr := term (('+' | '−') term)*
    function parseExpr() {
      let left = parseTerm();
      while (peek() === '+' || peek() === '−') {
        const op = next();
        const right = parseTerm();
        // "200 + 10%" means 200 + (10% of 200)
        const r = right.pct ? left.value * right.value : right.value;
        left = { value: op === '+' ? left.value + r : left.value - r };
      }
      return left;
    }

    // term := unary (('×' | '÷') unary)*
    function parseTerm() {
      let left = parseUnary();
      while (peek() === '×' || peek() === '÷') {
        const op = next();
        const right = parseUnary();
        if (op === '÷' && right.value === 0) throw new Error('Cannot divide by zero');
        left = { value: op === '×' ? left.value * right.value : left.value / right.value };
      }
      return left;
    }

    function parseUnary() {
      if (peek() === '−') { next(); return { value: -parseUnary().value }; }
      if (peek() === '+') { next(); return parseUnary(); }
      return parsePostfix();
    }

    // postfix := primary '%'*
    function parsePostfix() {
      let value = parsePrimary();
      let pct = false;
      while (peek() === '%') { next(); value /= 100; pct = true; }
      return { value, pct };
    }

    function parsePrimary() {
      const t = next();
      if (typeof t === 'number') return t;
      if (t === '(') {
        const inner = parseExpr();
        if (next() !== ')') throw new Error('Invalid expression');
        return inner.value;
      }
      throw new Error('Incomplete expression');
    }

    const result = parseExpr();
    if (pos < tokens.length) throw new Error('Invalid expression');
    if (!Number.isFinite(result.value)) throw new Error('Number too large');
    // Round away floating point noise: 0.1 + 0.2 -> 0.3
    const rounded = parseFloat(result.value.toPrecision(12));
    return rounded === 0 ? 0 : rounded;
  }

  function formatResult(n) {
    if (n === 0) return '0';
    const abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-9) return Number(n.toPrecision(10)).toExponential();
    return n.toLocaleString('en-IN', { maximumFractionDigits: 10 });
  }

  // Turns a result back into something that can be typed into the expression
  function toExpression(value) {
    const s = String(Math.abs(value));
    return value < 0 ? '(−' + s + ')' : s;
  }

  return { evaluate, formatResult, toExpression, autoClose };
});
