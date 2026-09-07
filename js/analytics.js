/* =========================================================================
   analytics.js — GA4 event wiring
   Portfolio demo by 1MR LLC. Not a real financial services firm.

   Four conversion events, per the spec:

     apply_click   any link or button routing to /apply
     call_click    any tel:  link
     text_click    any sms:  link
     form_submit   HubSpot onFormSubmit (fired from hubspot-form.js)

   HOW EVENTS ARE BOUND
   --------------------
   One delegated listener on document, not N listeners on N elements. This
   matters because /start rewrites Apply hrefs after load and other pages
   inject CTAs — a delegated listener covers elements that did not exist at
   binding time, which per-element listeners silently miss.

   GA4 vs UNIVERSAL ANALYTICS
   --------------------------
   GA4 has no category/action/label model; that was Universal Analytics,
   which was retired in 2023. GA4 takes an event name plus arbitrary named
   parameters. The spec asks for "category, action, label following GA4
   conventions", so this ships them as explicit custom parameters:

       event_category, event_action, event_label

   gtag forwards those names to GA4 as custom parameters unchanged. To make
   them usable in reports, register each as a custom dimension in the GA4
   UI: Admin > Custom definitions > Create custom dimension, scope Event.
   Until that registration happens they arrive in the payload and show in
   DebugView but will not appear as report dimensions. This trips people up
   constantly, so it is called out in the README too.

   NO-CONSENT-BANNER NOTE
   ----------------------
   Cookie consent is explicitly out of scope for this demo. A production
   deployment in a jurisdiction requiring consent would gate the gtag config
   call behind a consent decision using gtag('consent', 'default', ...).
   ========================================================================= */

window.MMD = window.MMD || {};

(function (ns) {
  "use strict";

  /**
   * Send an event to GA4.
   *
   * Guarded because gtag is absent whenever the measurement ID is still the
   * G-XXXXXXXXXX placeholder, an ad blocker ate the script, or the page is
   * open from the filesystem. Analytics must never break the page it is
   * measuring — a missing gtag is a no-op, not an exception.
   *
   * @param {string} eventName - GA4 event name (snake_case by convention)
   * @param {Object} params - custom parameters
   */
  function track(eventName, params) {
    var payload = params || {};

    if (typeof window.gtag !== "function") {
      /* Visible in the console so the wiring is demonstrably working even
         with a placeholder measurement ID. */
      if (window.console && window.console.info) {
        window.console.info("[analytics] " + eventName, payload);
      }
      return;
    }

    window.gtag("event", eventName, payload);
  }

  /**
   * Resolve a click target to one of our four tracked intents.
   * Returns null for ordinary navigation.
   */
  function classifyTarget(element) {
    var link = element.closest("a[href], button[data-track]");
    if (!link) {
      return null;
    }

    /* An explicit data-track attribute always wins, so a page can label a
       CTA that is not a plain link. */
    var explicit = link.getAttribute("data-track");
    if (explicit) {
      return { event: explicit, link: link };
    }

    var href = link.getAttribute("href") || "";

    if (href.indexOf("tel:") === 0) {
      return { event: "call_click", link: link };
    }
    if (href.indexOf("sms:") === 0) {
      return { event: "text_click", link: link };
    }
    if (href === "/apply" || href.indexOf("/apply?") === 0 || href.indexOf("/apply#") === 0) {
      return { event: "apply_click", link: link };
    }

    return null;
  }

  /**
   * Derive a human-readable label. Falls back through accessible name
   * sources so the label is meaningful even for icon-only controls.
   */
  function labelFor(link) {
    var label =
      link.getAttribute("data-track-label") ||
      link.getAttribute("aria-label") ||
      (link.textContent || "").replace(/\s+/g, " ").trim();

    return label.slice(0, 100) || "(unlabeled)";
  }

  var EVENT_CATEGORIES = {
    apply_click: "conversion",
    call_click: "contact",
    text_click: "contact",
    form_submit: "conversion",
  };

  function handleClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }

    var match = classifyTarget(target);
    if (!match) {
      return;
    }

    track(match.event, {
      event_category: EVENT_CATEGORIES[match.event] || "engagement",
      event_action: match.event,
      event_label: labelFor(match.link),
      page_path: window.location.pathname,
      link_url: match.link.getAttribute("href") || "",
    });
  }

  /* Exposed so hubspot-form.js can fire form_submit through the same path,
     keeping parameter shape identical across all four events. */
  ns.track = track;
  ns.trackFormSubmit = function (extra) {
    var payload = {
      event_category: "conversion",
      event_action: "form_submit",
      event_label: "loan application",
      page_path: window.location.pathname,
    };

    if (extra) {
      Object.keys(extra).forEach(function (key) {
        payload[key] = extra[key];
      });
    }

    track("form_submit", payload);
  };

  /* Capture phase: fires before any handler that might call
     stopPropagation, and before the browser follows tel:/sms: links. */
  document.addEventListener("click", handleClick, true);
})(window.MMD);
