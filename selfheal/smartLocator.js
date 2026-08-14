'use strict';

/**
 * SmartLocator factory: describes an element by a (deliberately stale)
 * primary CSS selector plus stable descriptor characteristics used by the
 * healing engine when the primary selector fails to resolve.
 *
 * @param {Object} opts
 * @param {string} opts.name - human-readable name, used in reporting.
 * @param {string} opts.primary - primary CSS selector (may be stale).
 * @param {string} opts.tag - expected HTML tag, e.g. "input", "button".
 * @param {Object} [opts.attributes] - stable attribute hints, e.g.
 *   { id, 'data-testid', name, type, role, placeholder, class }.
 * @param {string} [opts.text] - expected visible text (innerText/textContent).
 */
function smartLocator({ name, primary, tag, attributes = {}, text = null }) {
  return {
    name,
    primary,
    tag,
    attributes,
    text,
  };
}

module.exports = { smartLocator };
