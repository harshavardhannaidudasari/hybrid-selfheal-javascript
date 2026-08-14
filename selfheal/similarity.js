'use strict';

/**
 * Normalize a string for comparison: lowercase + collapse whitespace + trim.
 */
function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Produce the set of character bigrams for a normalized string.
 */
function bigrams(s) {
  const grams = [];
  for (let i = 0; i < s.length - 1; i++) {
    grams.push(s.slice(i, i + 2));
  }
  return grams;
}

/**
 * textSimilarity(a, b): 0 if either is falsy/empty; else a normalized
 * similarity ratio in [0,1], case/whitespace-insensitive, using the Dice
 * coefficient over character bigrams.
 */
function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Bigrams require at least 2 chars; fall back to exact-match ratio for
  // single-character strings.
  if (na.length < 2 || nb.length < 2) {
    return na === nb ? 1 : 0;
  }

  const bga = bigrams(na);
  const bgb = bigrams(nb);

  const counts = new Map();
  for (const g of bga) {
    counts.set(g, (counts.get(g) || 0) + 1);
  }

  let matches = 0;
  for (const g of bgb) {
    const c = counts.get(g) || 0;
    if (c > 0) {
      matches++;
      counts.set(g, c - 1);
    }
  }

  const dice = (2 * matches) / (bga.length + bgb.length);
  return Math.max(0, Math.min(1, dice));
}

/**
 * classOverlap(a, b): Jaccard similarity of the two token sets.
 * 0 if either is empty.
 */
function classOverlap(a, b) {
  const setA = new Set((a || []).filter(Boolean));
  const setB = new Set((b || []).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }
  const unionSize = new Set([...setA, ...setB]).size;
  if (unionSize === 0) return 0;
  return intersectionSize / unionSize;
}

module.exports = { textSimilarity, classOverlap, normalize };
