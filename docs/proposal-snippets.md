# Reusable proposal copy

Written for the class of Upwork JD this demo answers: a finished static site that needs deploying to Cloudflare Pages with HubSpot, GA4, redirects and schema wired up. Paste and adapt.

---

## Answer to "how would you set up the redirects from the old URLs?"

Most JDs of this shape end with this exact screening question. One paragraph, no jargon padding.

I would put them in a `_redirects` file at the root of the build output, one rule per line in the form `/old-path /new-path 301`, and use 301 rather than 302 throughout because the old site is being retired and you want its accumulated ranking signal to transfer rather than stay parked on dead URLs. Before writing anything I would pull the actual list of legacy paths from Search Console and your server logs rather than guessing, since the URLs that matter are the ones with real inbound links and impressions, and then map each one to its closest equivalent page. The mistake I would specifically avoid is bulk-redirecting everything to the homepage, because Google treats a redirect to an irrelevant page as a soft 404 and discards the signal entirely, which defeats the point of migrating at all. A few Cloudflare specifics worth knowing: static files win over redirect rules, so any source path that collides with a real page will silently never fire; rules evaluate top to bottom with first match winning, so specific rules go above general ones; and query strings on the source are ignored for matching but forwarded to the destination, which is what makes short vanity links like `/sarah` to `/start?lo=sarah` work. Limits are 2,100 static rules with up to 100 dynamic ones using splats or placeholders, so for a 15 URL migration I would keep every rule explicit and legible rather than clever. After deploy I verify the whole list with `curl -sI` in a loop, asserting each returns 301 and resolves to the intended destination in a single hop rather than a redirect chain, and I would hand you that output as part of delivery.

---

## Portfolio blurb for 1mr.llc

Short version, for a card or list item:

**Meadowbrook Mortgage Demo** — A 22 page hand-coded static site demonstrating URL-parameter personalization, HubSpot form integration, GA4 conversion tracking and legacy URL migration on Cloudflare Pages. Vanilla HTML, CSS and JavaScript. Zero dependencies, no build step, 100 across all four Lighthouse categories.

Longer version, for a project page:

Meadowbrook Mortgage Demo is a working demonstration of the referral flow a small mortgage branch would ship to its real estate agent partners. An agent texts a buyer a short vanity link, the buyer lands on a page that greets them by name and names the loan officer handling their file, and that attribution follows them into the application form as hidden CRM fields so every lead records where it came from.

It is built the way the brief asked for rather than the way that would have been easiest: vanilla HTML, CSS and JavaScript, no framework, no build step, no dependencies at all. The pages are served exactly as authored. That constraint was the interesting part of the problem, so the repository documents the alternative I evaluated and declined, and the point past which I would change the answer.

The parts worth looking at are the sanitizer standing between the URL and the DOM, which uses an allowlist rather than a blocklist and renders through textContent so a crafted referral link cannot execute; the graceful degradation contract on the landing page, where four separate personalization failure modes all resolve to the same generic welcome with nothing visibly broken; and the verification script, which enforces across every hand-authored page the invariants a static site generator would have guaranteed structurally.

Built by 1MR LLC. The business, its staff and its testimonials are fictional.

---

## Positioning notes

Points worth making in a cover letter for this JD shape, in rough priority order.

1. **Lead with the redirects answer.** It is the screening question, most applicants will answer it thinly, and a specific answer that mentions soft 404s and static-asset shadowing separates you from people who have only read the Cloudflare docs page.
2. **Name the deployment risk they have not thought about.** Apex domain plus www: a plain CNAME at the apex is invalid per DNS spec, and it is the usual reason the apex fails while www works. Clients who hold their own DNS have usually been burned by this.
3. **Mention the HubSpot internal-name trap.** Hidden field population fails silently if the internal name does not match: the form submits fine and the attribution is simply absent, which nobody notices until they go looking in the CRM days later. Knowing this signals you have actually shipped a HubSpot integration.
4. **The GA4 custom-dimension gotcha.** Custom parameters arrive in DebugView immediately but do not appear as report dimensions until registered under Admin, Custom definitions. Worth stating you will register them as part of delivery, because otherwise the client sees no data and assumes the wiring failed.
5. **Quote the monthly separately and anchor it on content.** These JDs usually mention an optional retainer for content uploads. On a hand-authored static site every content addition is manual work, so scope it per post or per page rather than as an open-ended hourly, and say what turnaround they get.
