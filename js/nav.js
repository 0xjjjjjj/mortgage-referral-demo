/* =========================================================================
   nav.js — mobile navigation disclosure
   Portfolio demo by 1MR LLC. Not a real financial services firm.

   PROGRESSIVE ENHANCEMENT, NOT A DEPENDENCY
   -----------------------------------------
   The markup ships with all seven links visible and the toggle button
   carrying the `hidden` attribute. Without JavaScript the nav is simply a
   wrapping row of links: less pretty on a phone, fully functional, and
   every destination reachable.

   This script does three things, in this order:
     1. adds .has-js-nav to <html>, which is what lets the stylesheet
        collapse the nav on narrow viewports
     2. un-hides the toggle button
     3. wires the button

   Order matters. The class is added before the button is revealed so a
   slow frame can never paint a visible toggle that does nothing yet. And
   the stylesheet only ever hides the nav under .has-js-nav, so a failure
   to load this file leaves the links on screen rather than stranding a
   visitor with an inert hamburger and no navigation. That failure mode,
   a menu button that does nothing, is the single most common way a
   hand-rolled mobile nav breaks.

   The Apply call to action deliberately lives OUTSIDE the collapsible
   nav, so the primary conversion path stays one tap away on a phone
   instead of being buried behind a menu.
   ========================================================================= */

(function () {
  "use strict";

  var DESKTOP_QUERY = "(min-width: 64rem)";

  function init() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");

    if (!toggle || !nav) {
      return;
    }

    document.documentElement.classList.add("has-js-nav");
    toggle.hidden = false;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
    }

    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    /* Escape closes the menu and returns focus to the button, so keyboard
       users are never left with focus inside a panel they just dismissed. */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Following a link closes the panel. Matters for same-page anchors,
       where no navigation occurs and the menu would otherwise stay open
       covering the content the visitor just asked to see. */
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setOpen(false);
      }
    });

    /* Crossing into the desktop layout resets state. The stylesheet shows
       the nav regardless above the breakpoint, but aria-expanded would
       otherwise keep announcing "collapsed" for a menu that is visible. */
    if (typeof window.matchMedia === "function") {
      var desktop = window.matchMedia(DESKTOP_QUERY);
      var onChange = function (event) {
        if (event.matches) {
          setOpen(false);
        }
      };

      if (typeof desktop.addEventListener === "function") {
        desktop.addEventListener("change", onChange);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
