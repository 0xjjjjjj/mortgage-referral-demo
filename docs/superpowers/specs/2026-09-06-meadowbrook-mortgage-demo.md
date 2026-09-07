# Spec: Meadowbrook Mortgage Demo

Date: 2026-09-06
Author: Juan Lopez (1MR LLC), via Claude Code
Status: approved for planning

## Purpose

A portfolio-piece MVP demonstrating one specific class of freelance work: a
multi-page hand-coded static site with URL-parameter personalization, HubSpot
embedded form integration, GA4 event tracking, LocalBusiness schema, vanity and
legacy redirects, and Cloudflare Pages deployment.

This is NOT a real business. Mortgage services are regulated, so every page
carries the disclaimer verbatim:

    Portfolio demo by 1MR LLC. Not a real financial services firm.

## Fictional business

| Field    | Value |
|----------|-------|
| Name     | Meadowbrook Mortgage Demo |
| Tagline  | A demo of the personalized-referral flow that a small mortgage branch would ship to real estate agent partners |
| Location | Naperville, Illinois 60540 (fictional street address) |
| Offering | Mortgage referral portal: agents hand buyers a personalized landing page routing them to a loan officer |
| Phone    | (630) 555-0100 |
| Email    | hello@meadowbrook-mortgage-demo.example |

Loan officers (slug -> name): `sarah` -> Sarah Chen, `marcus` -> Marcus Reyes,
`jordan` -> Jordan Ellis.

Referring agents are not looked up. Any `?agent=` string is sanitized and
displayed.

## Origin and audience

Derived from a real Upwork JD: a small Illinois mortgage branch has a *finished*
22-page static site and wants a front-end dev to deploy it to Cloudflare Pages
and wire the integrations (HubSpot hidden fields, GA4 events, `_redirects` for
~15 legacy URLs, reviews widget, calendar button, 404, schema, sitemap, robots),
plus mobile QA and a DNS cutover. Scope is explicitly "no CMS, no frameworks, no
redesign."

Juan is NOT applying to that posting (20-50 applicants on a fixed-price deploy
job is a poor connect spend). This artifact is a **generic capability piece held
in the chamber** for the next JD of the same shape. Two consequences:

- The demo must read as *deployment and integration competence*, not design
  flair. README leads with the `_redirects` strategy, GA4 event wiring, HubSpot
  hidden-field mechanism and QA evidence.
- All credentials stay placeholders. Nothing is tied to a real HubSpot portal or
  GA4 property, so the piece stays reusable and maintenance-free.

A companion one-paragraph answer to "how would you set up the redirects from the
old URLs?" ships as reusable proposal copy, since that screening question
recurs across this class of JD.

## Decisions locked at brainstorm

1. **Cloudflare deploy is user-driven.** No CF API token in the environment.
   Claude builds and pushes to GitHub; Juan connects the repo in the Cloudflare
   dashboard (build command empty, output directory `/`) and reports the
   `.pages.dev` URL. Claude then runs live curl verification of all 22 pages and
   all 18 redirects, and writes the live URL into the README.
2. **Extensionless URLs.** All internal hrefs, canonicals, sitemap entries and
   `_redirects` targets omit `.html`. Cloudflare Pages serves `about.html` at
   `/about` and 301s `/about.html` to `/about` by default. Consequence: local
   preview requires a static server, not `file://`. README documents
   `python3 -m http.server`.
3. **Public GitHub repo**, overriding the global private-by-default rule. The
   artifact is meant to be linked publicly from 1mr.llc and contains only
   fictional data and placeholder credentials.
4. **Lighthouse is measured, not asserted.** `npx lighthouse` headless against a
   local static server, on a representative sample (`/`, `/start`, `/apply`,
   `/blog/post-1`, `/404.html`). Real scores are reported; if a category lands
   below 90 the cause is fixed or disclosed. Accompanied by a mobile QA matrix
   in the README (iOS Safari + Chrome Android viewports, tap targets, `tel:` and
   `sms:` behavior, `/start` param edge cases).

5. **Zero dependencies, hand-authored HTML — considered and chosen, not
   defaulted into.** Eleventy was evaluated against `madrilene/eleventy-excellent`
   (cloned and read at `~/git/_reference/eleventy-excellent`). Its DRY layout,
   front-matter-driven `_redirects`, collection-driven `sitemap.xml` and single
   `meta.js` branding config are genuinely superior for a site past ~30 pages,
   and the README says so explicitly. Rejected here because the JD's defining
   constraint is "no frameworks, no redesign" — shipping a build pipeline as the
   demo would signal a willingness to rebuild a client's finished site. The
   scaffold's CSS architecture (CUBE layering, Every Layout compositions, fluid
   `clamp()` scale) is adopted wholesale since it is plain CSS and needs no build.

6. **`/apply` renders a styled non-submitting mock of the HubSpot form**, plus a
   live integration-preview strip showing the `agent` and `lo` values parsed from
   the URL and the exact `setFieldValue()` calls that would fire. This
   demonstrates the integration logic working without a live portal, and avoids
   `/apply` reading as broken. The real embed code ships commented and
   documented alongside it.

## Deliverables

Numbered 1-12 exactly as given in the source brief. Summarized:

1. 22 canonical pages plus `404.html` (23 HTML files; 404 is not a canonical URL
   and is excluded from the sitemap).
2. `/start` reads `?agent=` and `?lo=`, sanitizes both, looks `lo` up in
   `data/loan-officers.json`, renders a personalized greeting, degrades silently
   to a generic welcome.
3. `/apply` hosts a HubSpot embedded form with `onFormReady` populating hidden
   `referring_agent` and `loan_officer` fields from the URL.
4. `/reviews` shows 6 hardcoded testimonial cards plus an HTML comment
   explaining the production Google Places / third-party-widget tradeoff. No
   real API call.
5. GA4 via `gtag.js` with placeholder `G-XXXXXXXXXX`, firing `apply_click`,
   `text_click`, `call_click`, `form_submit`.
6. `_redirects` at repo root: 3 vanity LO redirects + 15 legacy-path redirects,
   with a header comment explaining the format and 301 vs 302.
7. `/calendar` with a large Book a Call button pointing at a placeholder
   Google Calendar appointment URL.
8. `404.html` with Apply and Text CTAs.
9. JSON-LD `LocalBusiness` (subtype `MortgageLoanCompany`) in the head of every
   page.
10. `sitemap.xml` listing the 22 canonical URLs only, with lastmod, changefreq,
    priority.
11. `robots.txt` allowing all crawlers, pointing at the sitemap.
12. Mobile-first responsive CSS, system font stack, CSS custom properties,
    consistent header/footer, Lighthouse >= 90 across all four categories.

## Tech constraints

Vanilla HTML/CSS/JS only. No framework, no preprocessor, no page builder, no
build step. Files served exactly as authored. Repo under 2 MB. Placeholder
imagery is inline SVG or data-URI, never a binary image file.

## Non-goals

No CMS, no framework, no build system, no pages beyond the 22, no binary images,
no tracking beyond the specified GA4, no cookie banner, no copy that could be
read as real financial advice, no page missing the disclaimer.

## Placeholders the user configures at deploy time

| Thing | Current value |
|-------|---------------|
| HubSpot portal ID | `12345678` |
| HubSpot form GUID | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` |
| GA4 measurement ID | `G-XXXXXXXXXX` |
| Google Calendar URL | `https://calendar.app.google/PLACEHOLDER` |

Each gets a README "Configuration" entry with replacement instructions.

## Acceptance

- 23 HTML files exist; all 22 canonical paths resolve 200 on the live site.
- All 18 `_redirects` entries return 301 to the correct destination.
- `/start?agent=jsmith&lo=sarah` renders "Welcome, referred by jsmith. Your loan
  officer is Sarah."
- `/start?lo=nonexistent&agent=<script>alert(1)</script>` renders a generic
  welcome with no script execution and no visible error.
- Every one of the 23 HTML files contains the disclaimer string and a JSON-LD
  block.
- Lighthouse sample >= 90 on Performance, Accessibility, Best Practices, SEO.
- `du -sh` of the repo (excluding `.git`) is under 2 MB.
