#!/usr/bin/env bash

# Consistency gate for hand-authored HTML. Usage: tools/verify.sh [--live <url>]

set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

FAILURES=0
CHECKS=0

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; DIM=''; BOLD=''; RESET=''
fi

pass() { CHECKS=$((CHECKS + 1)); printf '  %sok%s   %s\n' "$GREEN" "$RESET" "$1"; }

fail() {
  CHECKS=$((CHECKS + 1)); FAILURES=$((FAILURES + 1))
  printf '  %sFAIL%s %s\n' "$RED" "$RESET" "$1"
}

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }

# Single source of truth: sitemap, redirect targets and page files check against this.
CANONICAL_PATHS=(
  "/"
  "/start"
  "/apply"
  "/about"
  "/team"
  "/team/sarah"
  "/team/marcus"
  "/team/jordan"
  "/agents"
  "/faq"
  "/reviews"
  "/calendar"
  "/contact"
  "/privacy"
  "/terms"
  "/disclosures"
  "/blog"
  "/blog/post-1"
  "/blog/post-2"
  "/blog/post-3"
  "/blog/post-4"
  "/blog/post-5"
)

BASE_URL="https://mortgage-referral-demo.1mr.llc"

# Maps a URL path to the file Cloudflare Pages would serve for it.
path_to_file() {
  case "$1" in
    "/") printf 'index.html' ;;
    *) printf '%s.html' "${1#/}" ;;
  esac
}

section "1. Page files exist (22 canonical + 404)"

ALL_FILES=()
for path in "${CANONICAL_PATHS[@]}"; do
  file=$(path_to_file "$path")
  ALL_FILES+=("$file")
  if [ -f "$file" ]; then
    pass "$file"
  else
    fail "$file is missing (canonical path $path)"
  fi
done

if [ -f "404.html" ]; then
  ALL_FILES+=("404.html")
  pass "404.html"
else
  fail "404.html is missing"
fi

# An extra page violates "no pages beyond the 22" and would be absent from the sitemap.
while IFS= read -r found; do
  found="${found#./}"
  case " ${ALL_FILES[*]} " in
    *" $found "*) ;;
    *) fail "unexpected HTML file not in the canonical list: $found" ;;
  esac
done < <(find . -name '*.html' -not -path './node_modules/*' -not -path './.git/*' \
  -not -path './docs/*' -not -path './.claude/*' -not -path './.superpowers/*' | sort)

section "2. Required invariants present in every page"

# Blocks a generator would guarantee and that copy-paste can silently lose.
INVARIANTS=(
  "legal disclaimer|::|Portfolio demo by 1MR LLC. Not a real financial services firm."
  "lang attribute|::|<html lang=\"en\">"
  "charset|::|<meta charset=\"utf-8\""
  "viewport|::|name=\"viewport\""
  "meta description|::|name=\"description\""
  "canonical link|::|rel=\"canonical\""
  "JSON-LD schema|::|application/ld+json"
  "MortgageLoanCompany type|::|\"@type\": \"MortgageLoanCompany\""
  "stylesheet|::|/css/style.css"
  "GA4 gtag loader|::|googletagmanager.com/gtag/js"
  "params.js|::|/js/params.js"
  "analytics.js|::|/js/analytics.js"
  "skip link|::|class=\"skip-link\""
  "disclaimer banner|::|class=\"disclaimer-banner\""
  "site header|::|class=\"site-header\""
  "site footer|::|class=\"site-footer"
  "footer disclaimer|::|class=\"disclaimer\""
)

for file in "${ALL_FILES[@]}"; do
  [ -f "$file" ] || continue
  missing=""
  for entry in "${INVARIANTS[@]}"; do
    label="${entry%%|::|*}"
    pattern="${entry##*|::|}"
    if ! grep -qF -- "$pattern" "$file"; then
      missing="${missing}${missing:+, }${label}"
    fi
  done

  if [ -z "$missing" ]; then
    pass "$file has all ${#INVARIANTS[@]} invariants"
  else
    fail "$file missing: $missing"
  fi
done

section "3. Per-page uniqueness (title, description, canonical)"

# Catches the block being present but never customised: 12 pages, one <title>.
for field in "title" "description" "canonical"; do
  case "$field" in
    title) values=$(grep -ho '<title>[^<]*</title>' "${ALL_FILES[@]}" 2>/dev/null) ;;
    description) values=$(grep -ho 'name="description"[^>]*content="[^"]*"' "${ALL_FILES[@]}" 2>/dev/null) ;;
    canonical) values=$(grep -ho 'rel="canonical" href="[^"]*"' "${ALL_FILES[@]}" 2>/dev/null) ;;
  esac

  total=$(printf '%s\n' "$values" | grep -c .)
  unique=$(printf '%s\n' "$values" | sort -u | grep -c .)

  if [ "$total" -eq "$unique" ]; then
    pass "all $total <$field> values are unique"
  else
    fail "$((total - unique)) duplicate $field value(s) across pages"
    printf '%s\n' "$values" | sort | uniq -d | sed "s/^/       ${DIM}dup:${RESET} /"
  fi
done

section "4. sitemap.xml matches the pages on disk, in both directions"

if [ ! -f sitemap.xml ]; then
  fail "sitemap.xml is missing"
else
  SITEMAP_PATHS=$(grep -o '<loc>[^<]*</loc>' sitemap.xml \
    | sed -e 's|<loc>||' -e 's|</loc>||' -e "s|^${BASE_URL}||" \
    | sed 's|^$|/|' | sort)
  EXPECTED_PATHS=$(printf '%s\n' "${CANONICAL_PATHS[@]}" | sort)

  if [ "$SITEMAP_PATHS" = "$EXPECTED_PATHS" ]; then
    pass "sitemap lists exactly the ${#CANONICAL_PATHS[@]} canonical URLs"
  else
    fail "sitemap does not match the canonical page list"
    diff <(printf '%s\n' "$EXPECTED_PATHS") <(printf '%s\n' "$SITEMAP_PATHS") | sed "s/^/       /"
  fi

  if grep -q '<loc>[^<]*404' sitemap.xml; then
    fail "sitemap contains 404.html — an error document is not a destination"
  else
    pass "sitemap excludes 404.html"
  fi

  for tag in lastmod changefreq priority; do
    n=$(grep -c "<$tag>" sitemap.xml)
    if [ "$n" -eq "${#CANONICAL_PATHS[@]}" ]; then
      pass "every sitemap entry has <$tag>"
    else
      fail "<$tag> appears $n times, expected ${#CANONICAL_PATHS[@]}"
    fi
  done
fi

section "5. _redirects integrity"

if [ ! -f _redirects ]; then
  fail "_redirects is missing"
else
  rule_count=0
  while read -r src dst status _rest; do
    [ -z "${src:-}" ] && continue
    case "$src" in \#*) continue ;; esac
    [ -z "${dst:-}" ] && continue

    rule_count=$((rule_count + 1))

    # Static assets are served before redirects evaluate, so a shadowed source never fires.
    src_file=$(path_to_file "$src")
    if [ -f "$src_file" ]; then
      fail "redirect source $src is shadowed by the real file $src_file"
    fi

    dst_path="${dst%%\?*}"
    dst_file=$(path_to_file "$dst_path")
    if [ ! -f "$dst_file" ]; then
      fail "redirect $src -> $dst points at missing file $dst_file"
    fi

    if [ "${status:-}" != "301" ] && [ "${status:-}" != "302" ]; then
      fail "redirect $src -> $dst has status '${status:-<none>}' (want 301 or 302)"
    fi
  done < _redirects

  if [ "$rule_count" -eq 18 ]; then
    pass "18 redirect rules (3 vanity + 15 legacy)"
  else
    fail "found $rule_count redirect rules, expected 18"
  fi

  if grep -q '301 Moved Permanently' _redirects; then
    pass "_redirects documents 301 vs 302"
  else
    fail "_redirects is missing the format/301-vs-302 explanatory comment"
  fi
fi

section "6. Security: no unsafe DOM sinks in js/"

# Matches real assignments/calls, not prose: comments *describing* the rule must not trip it.
UNSAFE_SINKS='\.(inner|outer)HTML[[:space:]]*=|\.insertAdjacentHTML[[:space:]]*\(|document\.write[[:space:]]*\(|[^A-Za-z.]eval[[:space:]]*\(|new[[:space:]]+Function[[:space:]]*\('
if grep -nEr "$UNSAFE_SINKS" js/ >/dev/null 2>&1; then
  fail "unsafe DOM sink in js/ — URL params must reach the DOM via textContent only"
  grep -nEr "$UNSAFE_SINKS" js/ | sed "s/^/       /"
else
  pass "no innerHTML / document.write / eval in js/"
fi

if grep -qF 'replace(/[^A-Za-z0-9 ]/g' js/params.js 2>/dev/null; then
  pass "params.js allowlist sanitizer intact"
else
  fail "params.js allowlist sanitizer is missing or was altered"
fi

section "7. Repo hygiene"

SIZE_KB=$(du -sk --exclude=.git --exclude=node_modules . | cut -f1)
if [ "$SIZE_KB" -lt 2048 ]; then
  pass "repo is ${SIZE_KB}KB, under the 2MB budget"
else
  fail "repo is ${SIZE_KB}KB, over the 2MB budget"
fi

if find . -path ./.git -prune -o \
     \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' -o -name '*.webp' \) \
     -print | grep -q .; then
  fail "binary image files present — placeholders must be inline SVG or data URIs"
else
  pass "no binary image assets"
fi

if grep -rqF "fonts.googleapis.com" --include='*.html' --include='*.css' . 2>/dev/null; then
  fail "Google Fonts reference found — spec requires a system font stack"
else
  pass "no third-party font requests"
fi

if [ "${1:-}" = "--live" ]; then
  LIVE_URL="${2:-}"
  if [ -z "$LIVE_URL" ]; then
    printf '\n%sUsage: tools/verify.sh --live https://your-site.pages.dev%s\n' "$RED" "$RESET"
    exit 2
  fi
  LIVE_URL="${LIVE_URL%/}"

  section "8. Live: all ${#CANONICAL_PATHS[@]} canonical pages return 200"
  for path in "${CANONICAL_PATHS[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "${LIVE_URL}${path}")
    if [ "$code" = "200" ]; then
      pass "200  ${path}"
    else
      fail "$code  ${path}"
    fi
  done

  section "9. Live: 404 handling"
  code=$(curl -s -o /dev/null -w '%{http_code}' "${LIVE_URL}/this-page-does-not-exist")
  if [ "$code" = "404" ]; then
    pass "404 returned for an unknown path"
  else
    fail "unknown path returned $code, expected 404"
  fi

  section "10. Live: redirects resolve in a single hop"
  while read -r src dst status _rest; do
    [ -z "${src:-}" ] && continue
    case "$src" in \#*) continue ;; esac
    [ -z "${dst:-}" ] && continue

    result=$(curl -sI -o /dev/null -w '%{http_code} %{redirect_url}' "${LIVE_URL}${src}")
    code="${result%% *}"
    location="${result#* }"
    got_path="${location#"$LIVE_URL"}"

    if [ "$code" = "$status" ] && [ "$got_path" = "$dst" ]; then
      pass "$status  $src -> $dst"
    else
      fail "$src returned $code -> ${got_path:-<none>} (expected $status -> $dst)"
    fi
  done < _redirects
fi

printf '\n%s────────────────────────────────────────%s\n' "$DIM" "$RESET"
if [ "$FAILURES" -eq 0 ]; then
  printf '%sPASS%s  %d checks, 0 failures\n\n' "$GREEN" "$RESET" "$CHECKS"
  exit 0
fi
printf '%sFAIL%s  %d checks, %d failure(s)\n\n' "$RED" "$RESET" "$CHECKS" "$FAILURES"
exit 1
