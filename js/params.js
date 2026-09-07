/* =========================================================================
   params.js — URL parameter reading and sanitization
   Portfolio demo by 1MR LLC. Not a real financial services firm.

   WHY THIS FILE EXISTS
   --------------------
   Both start.js (renders the personalized greeting) and hubspot-form.js
   (populates hidden form fields) need the same two URL parameters, sanitized
   the same way. Duplicating the sanitizer in both files would mean two
   implementations that can silently diverge — and the one place you cannot
   afford divergence is the code standing between a URL and the DOM.

   So there is exactly one sanitizer, here, and it is the only way either
   consumer is allowed to read a parameter.

   THE THREAT
   ----------
   /start and /apply read attacker-controllable values straight out of
   window.location.search and put them on the page. That is the textbook
   shape of a reflected XSS. A referral link is *designed* to be pasted into
   a text message by a third party, so "who would ever craft that URL" is not
   a defense — crafting the URL is the intended workflow.

   THE DEFENSE — two independent layers, either one sufficient:

   1. Allowlist, not denylist. We keep [A-Za-z0-9 ] and throw away
      everything else. Blocklists ("strip <script>") lose to encoding tricks
      forever; an allowlist cannot, because the dangerous characters were
      never in the output alphabet to begin with. < > " ' & / = ( ) ; and
      backtick are all structurally incapable of surviving this function.

   2. textContent, never innerHTML. Consumers assign through .textContent,
      so the browser treats the value as text and never as markup. Even if
      layer 1 were bypassed entirely, there is no HTML parse of the result.

   Belt and braces is deliberate. Layer 1 is what keeps output clean; layer 2
   is what keeps a future edit to layer 1 from becoming a vulnerability.
   ========================================================================= */

window.MMD = window.MMD || {};

(function (ns) {
  "use strict";

  /* Display names: 40 chars of letters, digits and spaces. Matches the
     spec's "alphanumeric + spaces, 40 char limit". */
  var MAX_DISPLAY_LENGTH = 40;

  /* Slugs are internal lookup keys, so the alphabet is tighter still. 32 is
     well past the longest real slug and short enough to bound any lookup. */
  var MAX_SLUG_LENGTH = 32;

  /**
   * Sanitize a human-facing name for display.
   *
   * Disallowed characters become a space rather than being deleted, so
   * "Mary-Jane O'Brien" reads as "Mary Jane O Brien" instead of collapsing
   * into "MaryJane OBrien". Runs of whitespace are then collapsed.
   *
   * @param {*} raw - untrusted value, any type
   * @returns {string} safe to place in textContent; "" if nothing survived
   */
  function sanitizeDisplayName(raw) {
    if (typeof raw !== "string" || raw.length === 0) {
      return "";
    }

    return raw
      .replace(/[^A-Za-z0-9 ]/g, " ") // allowlist — everything else out
      .replace(/\s+/g, " ") // collapse runs of whitespace
      .trim()
      .slice(0, MAX_DISPLAY_LENGTH)
      .trim(); // re-trim in case the slice landed mid-space
  }

  /**
   * Sanitize a lookup slug (?lo=sarah).
   *
   * Lowercased so ?lo=Sarah, ?lo=SARAH and ?lo=sarah all resolve. Restricted
   * to [a-z0-9-] because these values index into a JSON object, and a
   * constrained alphabet keeps that lookup from being steerable toward
   * inherited properties.
   *
   * @param {*} raw - untrusted value, any type
   * @returns {string} safe lookup key; "" if nothing survived
   */
  function sanitizeSlug(raw) {
    if (typeof raw !== "string" || raw.length === 0) {
      return "";
    }

    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, MAX_SLUG_LENGTH);
  }

  /**
   * Read a single query-string parameter.
   *
   * Wrapped in try/catch because a sufficiently malformed query string can
   * make URLSearchParams throw, and a thrown error here would abort the rest
   * of the page's initialization. The spec requires that bad parameters
   * degrade silently, so failure returns null and the caller falls back.
   *
   * @param {string} name
   * @returns {string|null}
   */
  function readRawParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (error) {
      return null;
    }
  }

  /**
   * Read and sanitize both referral parameters in one call.
   *
   * @returns {{agent: string, lo: string}} empty strings when absent/invalid
   */
  function readReferralParams() {
    return {
      agent: sanitizeDisplayName(readRawParam("agent")),
      lo: sanitizeSlug(readRawParam("lo")),
    };
  }

  ns.sanitizeDisplayName = sanitizeDisplayName;
  ns.sanitizeSlug = sanitizeSlug;
  ns.readRawParam = readRawParam;
  ns.readReferralParams = readReferralParams;
})(window.MMD);
