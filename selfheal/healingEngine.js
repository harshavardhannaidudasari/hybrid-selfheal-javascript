'use strict';

const fs = require('fs');
const path = require('path');
const { textSimilarity, classOverlap } = require('./similarity');

const PRIMARY_TIMEOUT_MS = 1500;
const CONFIDENCE_THRESHOLD = 0.35;

class HealingFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HealingFailedError';
  }
}

// Exactly the scan script specified by the framework contract - kept
// identical across all language ports.
const SCAN_SCRIPT = (tagSelector) => Array.from(document.querySelectorAll(tagSelector)).map((el, i) => ({
  index: i,
  tag: el.tagName.toLowerCase(),
  id: el.id || null,
  name: el.getAttribute('name'),
  dataTestId: el.getAttribute('data-testid'),
  classes: el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
  type: el.getAttribute('type'),
  placeholder: el.getAttribute('placeholder'),
  role: el.getAttribute('role'),
  href: el.getAttribute('href'),
  text: (el.innerText || el.textContent || '').trim().slice(0, 200),
}));

function scoreCandidate(candidate, smartLocator) {
  const { tag, attributes = {}, text } = smartLocator;

  if (tag && candidate.tag !== tag.toLowerCase()) {
    return 0;
  }

  let score = 0.10; // base credit for matching/unconstrained tag

  if (attributes.id && attributes.id === candidate.id) {
    score += 0.30;
  }
  if (attributes['data-testid'] && attributes['data-testid'] === candidate.dataTestId) {
    score += 0.30;
  }
  if (attributes.name && attributes.name === candidate.name) {
    score += 0.25;
  }
  if (attributes.type && attributes.type === candidate.type) {
    score += 0.15;
  }
  if (attributes.role && attributes.role === candidate.role) {
    score += 0.10;
  }
  if (attributes.placeholder) {
    score += 0.10 * textSimilarity(candidate.placeholder, attributes.placeholder);
  }
  if (attributes.class) {
    score += 0.10 * classOverlap(candidate.classes, attributes.class.split(' '));
  }
  if (text) {
    score += 0.30 * textSimilarity(candidate.text, text);
  }

  return Math.min(1.0, score);
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeForHasText(text) {
  return String(text).replace(/"/g, '\\"');
}

function buildHealedSelector(winner, tagSelector) {
  if (winner.id) {
    return `#${winner.id}`;
  }
  if (winner.dataTestId) {
    return `[data-testid="${winner.dataTestId}"]`;
  }
  if (winner.name) {
    return `${tagSelector}[name="${winner.name}"]`;
  }
  if (winner.text) {
    return `${tagSelector}:has-text("${escapeForHasText(winner.text)}")`;
  }
  return `${tagSelector}:nth-of-type(${winner.index + 1})`;
}

function screenshotsDir() {
  return path.join(process.cwd(), 'report', 'screenshots');
}

async function takeScreenshot(page, fileName) {
  const dir = screenshotsDir();
  fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  await page.screenshot({ path: fullPath, fullPage: true });
  return `screenshots/${fileName}`;
}

/**
 * Attempt to locate a SmartLocator on the page, healing via heuristic
 * attribute/text scoring if the primary (deliberately stale) selector
 * fails to resolve within a short timeout.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{name:string, primary:string, tag:string, attributes?:Object, text?:string|null}} smartLocator
 * @param {Array} events - array to push healing event records onto.
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function find(page, smartLocator, events) {
  const { name, primary, tag } = smartLocator;

  const primaryLocator = page.locator(primary).first();
  try {
    await primaryLocator.waitFor({ state: 'attached', timeout: PRIMARY_TIMEOUT_MS });
    return primaryLocator;
  } catch (err) {
    const errorMessage = String(err && err.message ? err.message : err).split('\n')[0].slice(0, 300);

    const uniqueSuffix = `${slugify(name)}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const screenshotBefore = await takeScreenshot(page, `${uniqueSuffix}__before.png`);

    const candidates = await page.evaluate(SCAN_SCRIPT, tag);

    let bestScore = 0;
    let bestCandidate = null;
    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, smartLocator);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    const confidence = Math.round(bestScore * 100) / 100;

    if (!bestCandidate || bestScore < CONFIDENCE_THRESHOLD) {
      events.push({
        locatorName: name,
        primarySelector: primary,
        error: errorMessage,
        outcome: 'unresolved',
        healedSelector: null,
        confidence,
        candidatesConsidered: candidates.length,
        screenshotBefore,
        screenshotAfter: null,
        timestamp: new Date().toISOString(),
      });
      throw new HealingFailedError(
        `Unable to heal locator "${name}" (primary "${primary}"): best confidence ${confidence} ` +
        `from ${candidates.length} candidate(s) is below threshold ${CONFIDENCE_THRESHOLD}.`
      );
    }

    const healedSelector = buildHealedSelector(bestCandidate, tag);
    const healedLocator = page.locator(healedSelector).first();
    await healedLocator.waitFor({ state: 'attached' });

    try {
      await healedLocator.evaluate((el) => {
        el.style.outline = '3px solid #e11d48';
        el.style.outlineOffset = '2px';
      });
    } catch (_highlightErr) {
      // best-effort only; swallow failures
    }

    const screenshotAfter = await takeScreenshot(page, `${uniqueSuffix}__after.png`);

    events.push({
      locatorName: name,
      primarySelector: primary,
      error: errorMessage,
      outcome: 'healed',
      healedSelector,
      confidence,
      candidatesConsidered: candidates.length,
      screenshotBefore,
      screenshotAfter,
      timestamp: new Date().toISOString(),
    });

    return healedLocator;
  }
}

module.exports = {
  find,
  HealingFailedError,
  scoreCandidate,
  buildHealedSelector,
  CONFIDENCE_THRESHOLD,
  PRIMARY_TIMEOUT_MS,
};
