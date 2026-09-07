/* =========================================================================
   start.js — personalized landing page for /start
   Portfolio demo by 1MR LLC. Not a real financial services firm.

   WHAT THIS DOES
   --------------
   An agent texts a buyer a link like:

       /start?agent=Dana%20Whitfield&lo=sarah

   This script reads both parameters, looks the loan officer slug up in
   data/loan-officers.json, and renders:

       "Welcome, referred by Dana Whitfield. Your loan officer is Sarah."

   DEGRADATION CONTRACT
   --------------------
   The spec requires missing or misspelled parameters to fall back to a
   generic welcome with no visible error. There are four independent ways
   this page can fail to personalize, and all four land in the same place:

       1. No ?agent= given          -> omit the referral clause
       2. No ?lo= given             -> omit the officer clause
       3. ?lo= is not a known slug  -> omit the officer clause
       4. The JSON fetch fails      -> omit the officer clause

   Case 4 matters more than it looks. The greeting is rendered from markup
   that is already correct before this script runs, so a buyer on a flaky
   phone connection sees a valid, professional page rather than a spinner or
   an empty heading. JavaScript upgrades the page; it is never load-bearing.

   All interpolation goes through .textContent. See params.js for why.
   ========================================================================= */

(function (ns) {
  "use strict";

  var OFFICER_DATA_URL = "/data/loan-officers.json";

  /* Rendered when we know neither the agent nor the officer. Identical to
     the copy already present in the HTML, so the no-JS path matches. */
  var GENERIC_HEADLINE = "Welcome";
  var GENERIC_BODY =
    "Start your mortgage pre-qualification below, or reach out and we will " +
    "match you with a loan officer.";

  /**
   * Build the greeting headline from whatever we successfully resolved.
   *
   * @param {string} agentName - sanitized, may be ""
   * @param {string} officerFirstName - resolved from JSON, may be ""
   * @returns {{headline: string, body: string}}
   */
  function composeGreeting(agentName, officerFirstName) {
    var hasAgent = agentName.length > 0;
    var hasOfficer = officerFirstName.length > 0;

    if (!hasAgent && !hasOfficer) {
      return { headline: GENERIC_HEADLINE, body: GENERIC_BODY };
    }

    var headline = hasAgent ? "Welcome, referred by " + agentName + "." : "Welcome.";
    var body;

    if (hasOfficer) {
      body =
        "Your loan officer is " +
        officerFirstName +
        ". " +
        officerFirstName +
        " will walk you through pre-qualification and answer your questions.";
    } else {
      body = GENERIC_BODY;
    }

    return { headline: headline, body: body };
  }

  /**
   * Write the greeting into the DOM.
   *
   * textContent, not innerHTML — this is the second of the two defense
   * layers described in params.js, and the reason a crafted ?agent= value
   * cannot execute even if the sanitizer were weakened.
   */
  function renderGreeting(greeting) {
    var headlineEl = document.querySelector("[data-greeting-headline]");
    var bodyEl = document.querySelector("[data-greeting-body]");

    if (headlineEl) {
      headlineEl.textContent = greeting.headline;
    }
    if (bodyEl) {
      bodyEl.textContent = greeting.body;
    }
  }

  /**
   * Reveal the officer card once we have a match, and fill it in.
   * Hidden by default so a failed lookup leaves no empty shell behind.
   */
  function renderOfficerCard(officer, slug) {
    var card = document.querySelector("[data-officer-card]");
    if (!card || !officer) {
      return;
    }

    var nameEl = card.querySelector("[data-officer-name]");
    var titleEl = card.querySelector("[data-officer-title]");
    var linkEl = card.querySelector("[data-officer-link]");
    var avatarEl = card.querySelector("[data-officer-avatar]");

    if (nameEl) {
      nameEl.textContent = officer.full_name;
    }
    if (titleEl) {
      titleEl.textContent = officer.title;
    }
    if (linkEl) {
      /* Slug is [a-z0-9-] only, so this cannot escape the path. */
      linkEl.setAttribute("href", "/team/" + slug);
      linkEl.textContent = "Read " + officer.first_name + "'s profile";
    }
    if (avatarEl && officer.photo) {
      avatarEl.setAttribute("src", officer.photo);
      avatarEl.setAttribute("alt", "Portrait placeholder for " + officer.full_name);
    }

    card.hidden = false;
  }

  /**
   * Carry the referral parameters onto every outbound Apply link, so the
   * attribution survives the hop from /start to /apply. Without this the
   * hidden HubSpot fields would arrive empty and the referral would be
   * untrackable — which is the entire point of the product.
   */
  function propagateParamsToApplyLinks(params) {
    if (!params.agent && !params.lo) {
      return;
    }

    var query = new URLSearchParams();
    if (params.agent) {
      query.set("agent", params.agent);
    }
    if (params.lo) {
      query.set("lo", params.lo);
    }

    var links = document.querySelectorAll('a[href^="/apply"]');
    Array.prototype.forEach.call(links, function (link) {
      link.setAttribute("href", "/apply?" + query.toString());
    });
  }

  /** Populate the integration-preview strip, when the page has one. */
  function renderDebugStrip(params, resolvedOfficer) {
    var agentEl = document.querySelector("[data-debug-agent]");
    var loEl = document.querySelector("[data-debug-lo]");
    var matchEl = document.querySelector("[data-debug-match]");

    if (agentEl) {
      agentEl.textContent = params.agent || "(not supplied)";
    }
    if (loEl) {
      loEl.textContent = params.lo || "(not supplied)";
    }
    if (matchEl) {
      matchEl.textContent = resolvedOfficer
        ? resolvedOfficer.full_name
        : "(no match — generic greeting shown)";
    }
  }

  /**
   * Look the slug up without touching the prototype chain.
   * Object.prototype.hasOwnProperty.call guards against ?lo=constructor and
   * friends resolving to inherited properties.
   */
  function findOfficer(officers, slug) {
    if (!officers || !slug) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(officers, slug)) {
      return null;
    }

    var officer = officers[slug];
    return officer && typeof officer.first_name === "string" ? officer : null;
  }

  function init() {
    var params = ns.readReferralParams();

    /* Render immediately with what we have. If the fetch below succeeds we
       upgrade the greeting; if it fails the page is already correct. */
    renderGreeting(composeGreeting(params.agent, ""));
    propagateParamsToApplyLinks(params);

    if (!params.lo) {
      renderDebugStrip(params, null);
      return;
    }

    fetch(OFFICER_DATA_URL, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Officer lookup returned HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        var officer = findOfficer(data && data.officers, params.lo);

        renderGreeting(composeGreeting(params.agent, officer ? officer.first_name : ""));
        renderOfficerCard(officer, params.lo);
        renderDebugStrip(params, officer);
      })
      .catch(function (error) {
        /* Silent by contract. The generic greeting is already on screen, so
           there is nothing for the buyer to recover from and nothing worth
           interrupting them about. Logged for the developer only. */
        if (window.console && window.console.warn) {
          window.console.warn("[start] officer lookup unavailable:", error.message);
        }
        renderDebugStrip(params, null);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.MMD);
