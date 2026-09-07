# Meadowbrook Mortgage Demo

**Portfolio demo by 1MR LLC. Not a real financial services firm.**

Meadowbrook Mortgage Demo is a fictional business. The loan officers, testimonials, address, phone number and reviews are invented. Nothing here is an offer to lend, a commitment to lend, or financial advice. It exists to demonstrate a specific class of front-end work, described below.

- **Live demo:** _pending deployment — see "Deploying" below_
- **Source:** https://github.com/0xjjjjjj/mortgage-referral-demo
- **Built by:** [1MR LLC](https://1mr.llc)

---

## The scenario

A small mortgage branch wants its real estate agent partners to hand buyers a personalized link. An agent texts a buyer something like:

```
https://example.com/sarah
```

That redirects to a landing page already scoped to a loan officer. The buyer sees a greeting naming both the agent who referred them and the officer who will handle their file. They tap Apply, and the referral attribution rides along into hidden fields on the application form, so every submitted lead records where it came from.

This repo is that flow, end to end, as 22 static pages.

## What it demonstrates

| Capability | Where to look |
|---|---|
| URL-parameter personalization with safe rendering | `js/params.js`, `js/start.js`, `/start` |
| CRM form integration with hidden-field attribution | `js/hubspot-form.js`, `/apply` |
| GA4 event tracking on four conversion actions | `js/analytics.js` |
| Legacy URL migration with 301s | `_redirects` |
| Vanity short links per staff member | `_redirects`, `/sarah` `/marcus` `/jordan` |
| LocalBusiness structured data | JSON-LD in the `<head>` of every page |
| Generated-quality sitemap and robots without a generator | `sitemap.xml`, `robots.txt`, `tools/verify.sh` |
| Mobile-first CSS with a real design-token layer | `css/style.css` |
| Consistency enforcement across hand-authored files | `tools/verify.sh` |

---

## Configuration

Four values are placeholders. Replace them at deploy time. Nothing else needs to change.

### 1. HubSpot portal ID and form GUID

**File:** `js/hubspot-form.js`, top of the file.

```js
var HUBSPOT_CONFIG = {
  portalId: "12345678",                              // <- replace
  formId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",    // <- replace
  region: "na1",                                     // <- eu1 for EU portals
};
```

Find both values in HubSpot under **Marketing → Forms**, open your form, and click **Share → Embed code**. The embed snippet contains `portalId` and `formId`.

While either value is still the placeholder, `/apply` renders a styled non-submitting mock of the form instead of calling HubSpot. This is deliberate: firing a request at a portal that does not exist produces a console error, costs a Lighthouse Best Practices point, and leaves a blank rectangle where the form should be. Replace both values and the real embed takes over automatically — no other edit required.

**Fields to create in the HubSpot form:**

| Field name | Type | Notes |
|---|---|---|
| `first_name` | Single-line text | Required |
| `last_name` | Single-line text | Required |
| `email` | Email | Required |
| `phone` | Phone number | Required |
| `referring_agent` | Single-line text | **Hidden.** Populated from `?agent=` |
| `loan_officer` | Single-line text | **Hidden.** Populated from `?lo=` |

The two hidden fields must use exactly those internal names. HubSpot's internal name is not the label — check it under the field's **Edit → Internal name**. A mismatch here fails silently: the form submits successfully and the attribution is simply absent, which you will not notice until you go looking for it in the CRM days later.

### 2. GA4 measurement ID

**Files:** the `<head>` of all 23 HTML files.

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
gtag("config", "G-XXXXXXXXXX");
```

Replace both occurrences per file. To do all of them at once:

```bash
grep -rl 'G-XXXXXXXXXX' --include='*.html' . \
  | xargs sed -i 's/G-XXXXXXXXXX/G-YOURREALID/g'
```

Find the ID in GA4 under **Admin → Data streams → your web stream**.

### 3. Google Calendar appointment URL

**File:** `calendar.html`.

```html
<a class="button" data-size="large" href="https://calendar.app.google/PLACEHOLDER">
```

Create the schedule in Google Calendar (**Create → Appointment schedule**), then use **Share → Copy booking page link**.

---

## Deploying to Cloudflare Pages

There is no build step. The files in this repo are served exactly as authored.

1. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
2. Select this repository.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** _leave empty_
   - **Build output directory:** `/`
4. Deploy.

`_redirects`, `sitemap.xml`, `robots.txt` and `404.html` all live at the repo root, which is the output directory, so Cloudflare picks them up with no further configuration. `404.html` is served automatically for unmatched paths with a real 404 status.

### Custom domain

Under **Custom domains**, add both the apex (`example.com`) and `www`. If the domain's DNS is already on Cloudflare, records are created automatically. Otherwise add a `CNAME` for `www` pointing at `<project>.pages.dev`, and use `CNAME` flattening or an `ALIAS` record for the apex — a plain `CNAME` at the apex is invalid per DNS spec, which is the usual cause of an apex domain failing to resolve while `www` works fine.

Pick one as canonical and redirect the other, so you are not serving identical content on two hostnames and splitting your ranking signal.

---

## How the redirects work

`_redirects` is a plain text file at the output root. One rule per line:

```
/source-path   /destination-path   [status]
```

**301 vs 302.** A 301 says the old URL is permanently gone and its accumulated ranking signal should transfer to the destination — that is what you want for a site migration, and it is how you keep the SEO equity a legacy site spent years earning. A 302 says the old URL is still canonical and will return, so the signal stays put; use it for A/B tests, seasonal pages and maintenance windows. Browsers cache 301s aggressively, so a wrong 301 is expensive to walk back. When genuinely unsure, ship a 302 and promote it later.

**Three things that bite on Cloudflare Pages specifically:**

1. **Static files win.** If a real file exists at the source path, it is served and the redirect never fires. `tools/verify.sh` asserts every source path is disjoint from the 22 real pages, because this failure is completely silent.
2. **First match wins**, evaluated top to bottom. Order specific rules above general ones.
3. **Query strings on the source are ignored for matching but forwarded to the destination.** Query strings written into the destination are preserved, which is what the three vanity rules rely on to carry `?lo=` through.

Limits are 2,100 static rules per project, of which up to 100 may be dynamic (containing `:placeholders` or `*` splats). This site uses 18.

**Mapping principle.** Every legacy URL points at its closest equivalent, never at the homepage as a catch-all. Bulk-redirecting a retired site to `/` is the most common migration mistake: Google treats a redirect to an irrelevant page as a soft 404 and discards the ranking signal entirely, which defeats the entire reason for redirecting.

Verify after deploy:

```bash
curl -sI https://your-site.pages.dev/about-us | head -n 2
tools/verify.sh --live https://your-site.pages.dev
```

---

## GA4 events

Four events, wired in `js/analytics.js` via a single delegated listener on `document` — not per-element listeners, because `/start` rewrites Apply hrefs after load and per-element binding would miss them.

| Event | Fires on |
|---|---|
| `apply_click` | Any link or button routing to `/apply` |
| `call_click` | Any `tel:` link |
| `text_click` | Any `sms:` link |
| `form_submit` | HubSpot `onFormSubmit` (or the mock submit in demo mode) |

Each carries `event_category`, `event_action`, `event_label`, `page_path` and `link_url`.

**One gotcha worth knowing.** GA4 has no category/action/label model — that was Universal Analytics, retired in 2023. GA4 takes an event name plus arbitrary named parameters. The three names above ship as custom parameters, which means they arrive in the payload and appear in DebugView immediately, but **will not show up as report dimensions** until you register each one under **Admin → Custom definitions → Create custom dimension**, scope **Event**. People lose an afternoon to this regularly.

To watch events fire: install the Google Analytics Debugger extension, then **Admin → DebugView**. With the placeholder measurement ID in place, `gtag` is absent and every event is logged to the browser console instead, so the wiring is still observable.

No cookie consent banner ships here — out of scope for a demo. A production deployment in a jurisdiction requiring consent would gate the `gtag('config', ...)` call behind a consent decision using `gtag('consent', 'default', ...)`.

---

## Local preview

Cloudflare serves `/about` from `about.html`. `file://` does not, and neither does Python's default server, so links will 404 if you just open `index.html`. Use any static server and browse with the `.html` extension locally:

```bash
python3 -m http.server 8000
# then http://localhost:8000/about.html
```

---

## Verification

```bash
tools/verify.sh                                    # static checks
tools/verify.sh --live https://your-site.pages.dev # + HTTP checks
```

The script has no dependencies beyond coreutils, grep and curl. It checks:

1. All 22 canonical pages plus `404.html` exist, and no unexpected extra pages do
2. Every page carries all 17 required invariants, including the legal disclaimer
3. `<title>`, meta description and canonical are unique per page
4. `sitemap.xml` matches the files on disk exactly, in both directions
5. Every redirect destination resolves, no source is shadowed, every status is 301 or 302
6. No `innerHTML` / `document.write` / `eval` anywhere in `js/`
7. Repo under 2 MB, no binary images, no third-party font requests

**Why a script instead of a generator.** See "Architecture" below. The short version: a static site generator would make these failures structurally impossible rather than merely detectable, and that would be the better engineering choice for a larger site. At 22 pages, with an explicit "no frameworks" constraint, detection is the right trade — but only if the detection actually runs. Run it before every commit.

---

## Architecture

### Why there is no build step

This was a deliberate choice, made after evaluating the alternative rather than by default.

[Eleventy](https://www.11ty.dev/) — specifically the patterns in [`madrilene/eleventy-excellent`](https://github.com/madrilene/eleventy-excellent) — solves the central problem of a hand-authored multi-page site outright. One layout owns the header, footer, navigation, JSON-LD and disclaimer, so they cannot drift. `_redirects` generates by walking pages that declare their own legacy URLs in front matter, making a redirect to a nonexistent page unrepresentable. `sitemap.xml` generates from a collection, so it cannot fall out of sync. A single `meta.js` holds all branding.

Eleventy is a build tool, not a framework: it ships zero runtime JavaScript, and its output is byte-comparable to hand-authored HTML with identical Lighthouse scores. The site would not have been heavier.

It was still the wrong call here, for one reason: the brief this demo answers specifies *no frameworks, no redesign*. Handing that client a build pipeline signals a willingness to rebuild their finished site, which is precisely what they asked not to happen. Matching their artifact shape demonstrates working inside someone else's constraints, which is the actual skill being evaluated.

**Past roughly 30 pages, or the moment a client wants to add content themselves, the calculus flips and Eleventy is the correct answer.** The migration path is short: the existing markup becomes one `base.njk`, the per-page bodies become content files, and `verify.sh` retires because its checks become structural invariants.

What *was* worth taking from that scaffold, because it needs no build at all, is the CSS architecture.

### CSS

[CUBE CSS](https://cube.fyi/) layering, in `css/style.css`, in this order: reset, tokens, global element styles, compositions, blocks, utilities, exceptions. Later layers may override earlier ones; that ordering is load-bearing.

Compositions are [Every Layout](https://every-layout.dev/) primitives — `.wrapper`, `.flow`, `.grid`, `.cluster`, `.repel`, `.sidebar` — which handle layout with zero cosmetics and, between them, remove the need for almost every media query. Type and space are fluid `clamp()` scales interpolating between a 320px and 1240px viewport.

Everything a re-skin would change lives in the tokens layer as custom properties. No preprocessor; this is plain CSS that the browser parses directly.

### Fonts

System font stack only. No Google Fonts: zero third-party requests, zero layout shift from font swap, and no question about whether visitor IP addresses are being sent to a font CDN — which on a site collecting mortgage application data is a question worth not having.

### Images

There are none. Every visual placeholder is inline SVG or an SVG data URI, including the loan officer portraits in `data/loan-officers.json` and the favicon. The repo carries no binary assets at all.

### Security

`/start` and `/apply` read attacker-controllable values out of `window.location.search` and put them on the page — the textbook shape of a reflected XSS. Since a referral link is *designed* to be pasted into a text message by a third party, "who would craft that URL" is not a defense; crafting the URL is the intended workflow.

Two independent layers, either sufficient on its own:

1. **Allowlist, not denylist.** `js/params.js` keeps `[A-Za-z0-9 ]` and discards everything else. Blocklists lose to encoding tricks eventually; an allowlist cannot, because the dangerous characters were never in the output alphabet. `< > " ' & / = ( ) ;` and backtick cannot survive it.
2. **`textContent`, never `innerHTML`.** There is no HTML parse of the result anywhere in the codebase, and `verify.sh` fails the build if one is introduced.

There is exactly one sanitizer, in one file, used by both consumers. Two copies could diverge, and the one place that must not happen is the code between a URL and the DOM.

Try it: `/start?agent=<script>alert(1)</script>&lo=nope` renders a generic welcome, no script execution, no visible error.

### Degradation

JavaScript upgrades these pages; it is never load-bearing. `/start` renders correct, professional markup before any script runs, so a buyer on a bad cellular connection sees a valid page rather than a spinner or an empty heading. All four personalization failure modes — no `agent`, no `lo`, unknown `lo`, failed JSON fetch — land on the same generic welcome, silently.

---

## Re-skinning this for another client

1. `css/style.css` — edit the TOKENS layer only. Colors, type scale, space scale, radii and shadows all live there.
2. `data/loan-officers.json` — replace the staff.
3. `tools/reskin.sh` — lists every remaining literal (business name, address, phone, email, domain) with the files it appears in, and can apply a bulk replacement.
4. `_redirects` — replace the legacy paths with the client's actual old URLs.
5. Re-run `tools/verify.sh`.

---

## Repository map

```
├── index.html              Home — also the canonical page template
├── start.html              Personalized landing (?agent=, ?lo=)
├── apply.html              Application form
├── about.html  team.html  agents.html  faq.html  contact.html
├── reviews.html  calendar.html
├── privacy.html  terms.html  disclosures.html
├── blog.html
├── team/                   sarah.html  marcus.html  jordan.html
├── blog/                   post-1.html … post-5.html
├── 404.html
├── css/style.css           Single stylesheet, CUBE layering
├── js/
│   ├── params.js           URL parsing + sanitization (single source)
│   ├── analytics.js        GA4 event wiring
│   ├── start.js            Personalized greeting + officer lookup
│   └── hubspot-form.js     Embed + hidden-field attribution
├── data/loan-officers.json Slug → officer lookup
├── tools/
│   ├── verify.sh           Consistency gate
│   └── reskin.sh           Re-branding helper
├── _redirects              3 vanity + 15 legacy rules
├── sitemap.xml             22 canonical URLs
└── robots.txt
```

`index.html` is the canonical template. Every other page copies its `<head>`, skip link, disclaimer banner, header and footer verbatim, changing only the title, description, canonical, `aria-current` marker and the contents of `<main>`.

`js/params.js` is a fourth JavaScript file beyond the three originally specified. It exists because `start.js` and `hubspot-form.js` need identical sanitization, and duplicating security-critical code across two files invites exactly the divergence you cannot afford there.

---

## Non-goals

No CMS. No framework. No build system. No pages beyond the 22. No binary images. No tracking beyond the specified GA4. No cookie consent banner. No copy that could be mistaken for financial advice. No page without the disclaimer.

## License

Code is MIT. The fictional business content is a portfolio demonstration and is not for reuse as real financial services copy.
