/* =========================================================================
   hubspot-form.js — HubSpot embed + referral attribution
   Portfolio demo by 1MR LLC. Not a real financial services firm.

   THE PROBLEM THIS SOLVES
   -----------------------
   An agent sends a buyer to /start?agent=Dana%20Whitfield&lo=sarah. The
   buyer taps Apply. By the time they are filling in the form, the referral
   context exists only in the URL. If it is not written into the submission,
   nobody can answer "which agent sent this lead, and which loan officer
   owns it" — and that attribution is the entire product.

   So two hidden fields, referring_agent and loan_officer, are populated
   from the URL inside HubSpot's onFormReady callback.

   WHY onFormReady AND NOT DOMContentLoaded
   ----------------------------------------
   The HubSpot form renders inside a same-origin iframe that HubSpot creates
   asynchronously. At DOMContentLoaded the fields do not exist yet, and
   querying for them returns null. onFormReady is HubSpot's guarantee that
   the form is mounted and .setFieldValue() will land. Anything earlier is a
   race that passes on a fast connection and fails on a slow one — which is
   exactly the bug that reaches production, because it never reproduces on
   the developer's machine.

   PLACEHOLDER CREDENTIALS — see README "Configuration"
   ----------------------------------------------------
   portalId 12345678 and formId aaaaaaaa-... are not real. With placeholders
   in place the embed cannot mount, so this file renders a styled mock of
   the form instead, plus a live preview of the exact setFieldValue() calls
   that would fire. The integration logic is real and demonstrably running;
   only the HubSpot account is absent.

   Replace both values, remove nothing else, and the real embed takes over.
   ========================================================================= */

(function (ns) {
  "use strict";

  /* ---------------------------------------------------------------------
     CONFIGURATION — replace these two values at deploy time.
     --------------------------------------------------------------------- */
  var HUBSPOT_CONFIG = {
    portalId: "12345678",
    formId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    region: "na1",
  };

  /* Recognised placeholders. When either matches we skip the network call
     entirely rather than firing a request we know will 404 — a failed
     third-party request costs a Lighthouse Best Practices point and puts a
     red error in the console of anyone inspecting the demo. */
  var PLACEHOLDER_PORTAL_ID = "12345678";
  var PLACEHOLDER_FORM_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  var HIDDEN_FIELDS = {
    agent: "referring_agent",
    lo: "loan_officer",
  };

  function isPlaceholderConfig() {
    return (
      HUBSPOT_CONFIG.portalId === PLACEHOLDER_PORTAL_ID ||
      HUBSPOT_CONFIG.formId === PLACEHOLDER_FORM_ID
    );
  }

  /**
   * Populate the two hidden fields. Called from onFormReady.
   *
   * setFieldValue is HubSpot's supported API for this; writing to the DOM
   * input directly appears to work but does not update HubSpot's internal
   * form state, so the value is dropped on submit. That failure mode is
   * quiet and only shows up as missing data in the CRM days later.
   *
   * @param {Object} form - the form object HubSpot hands to onFormReady
   * @param {{agent: string, lo: string}} params
   */
  function applyReferralFields(form, params) {
    if (!form || typeof form.setFieldValue !== "function") {
      return;
    }

    if (params.agent) {
      form.setFieldValue(HIDDEN_FIELDS.agent, params.agent);
    }
    if (params.lo) {
      form.setFieldValue(HIDDEN_FIELDS.lo, params.lo);
    }
  }

  /**
   * Mirror the resolved values into the on-page integration preview, so a
   * reviewer can see the attribution working without a HubSpot account.
   */
  function renderIntegrationPreview(params) {
    var agentEl = document.querySelector("[data-hs-preview-agent]");
    var loEl = document.querySelector("[data-hs-preview-lo]");
    var callsEl = document.querySelector("[data-hs-preview-calls]");

    if (agentEl) {
      agentEl.textContent = params.agent || "(not supplied)";
    }
    if (loEl) {
      loEl.textContent = params.lo || "(not supplied)";
    }

    if (callsEl) {
      var lines = [];
      if (params.agent) {
        lines.push(
          'form.setFieldValue("' + HIDDEN_FIELDS.agent + '", "' + params.agent + '");'
        );
      }
      if (params.lo) {
        lines.push('form.setFieldValue("' + HIDDEN_FIELDS.lo + '", "' + params.lo + '");');
      }
      if (lines.length === 0) {
        lines.push("// no referral parameters present — no calls fire");
      }
      /* textContent: these strings contain sanitized user input. */
      callsEl.textContent = lines.join("\n");
    }

    /* Also fill the visible mock inputs so the form looks populated. */
    var mockAgent = document.querySelector('[data-mock-field="referring_agent"]');
    var mockLo = document.querySelector('[data-mock-field="loan_officer"]');
    if (mockAgent) {
      mockAgent.value = params.agent || "";
    }
    if (mockLo) {
      mockLo.value = params.lo || "";
    }
  }

  /** Swap the mock panel in for the real embed target. */
  function showMockForm() {
    var mock = document.querySelector("[data-hs-mock]");
    var target = document.querySelector("[data-hs-form-target]");

    if (mock) {
      mock.hidden = false;
    }
    if (target) {
      target.hidden = true;
    }
  }

  /**
   * Load HubSpot's embed script and create the form.
   * Only reached when real credentials are configured.
   */
  function loadHubSpotForm(params) {
    var script = document.createElement("script");
    script.src = "https://js.hsforms.net/forms/embed/v2.js";
    script.async = true;
    script.defer = true;

    script.onload = function () {
      if (!window.hbspt || !window.hbspt.forms) {
        showMockForm();
        return;
      }

      window.hbspt.forms.create({
        portalId: HUBSPOT_CONFIG.portalId,
        formId: HUBSPOT_CONFIG.formId,
        region: HUBSPOT_CONFIG.region,
        target: "[data-hs-form-target]",

        /* Fires once the form is mounted and its fields exist. */
        onFormReady: function (form) {
          applyReferralFields(form, params);
        },

        /* Fires on successful submit — the fourth GA4 event. Routed through
           analytics.js so all four events share one parameter shape. */
        onFormSubmit: function () {
          if (ns.trackFormSubmit) {
            ns.trackFormSubmit({
              referring_agent: params.agent || "(none)",
              loan_officer: params.lo || "(none)",
            });
          }
        },
      });
    };

    /* Network failure, ad blocker, or HubSpot outage: show the mock rather
       than leaving a blank rectangle where the form should be. */
    script.onerror = showMockForm;

    document.head.appendChild(script);
  }

  function init() {
    var params = ns.readReferralParams();

    renderIntegrationPreview(params);

    if (isPlaceholderConfig()) {
      showMockForm();

      /* Wire the mock's submit button to the same GA4 event the real form
         would fire, so form_submit is verifiable in this demo. */
      var mockSubmit = document.querySelector("[data-mock-submit]");
      if (mockSubmit) {
        mockSubmit.addEventListener("click", function (event) {
          event.preventDefault();
          if (ns.trackFormSubmit) {
            ns.trackFormSubmit({
              referring_agent: params.agent || "(none)",
              loan_officer: params.lo || "(none)",
              demo_mode: true,
            });
          }

          var confirmation = document.querySelector("[data-mock-confirmation]");
          if (confirmation) {
            confirmation.hidden = false;
            confirmation.focus();
          }
        });
      }
      return;
    }

    loadHubSpotForm(params);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.MMD);
