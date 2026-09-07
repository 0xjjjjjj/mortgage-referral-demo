#!/usr/bin/env bash

# Lists or replaces the brand literals CSS tokens can't reach. Usage: tools/reskin.sh [--apply]

set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

TARGETS=(
  "Meadowbrook Mortgage Demo|::|business name"
  "Meadowbrook|::|short business name"
  "1200 Meadowbrook Court, Suite 210|::|street address"
  "Naperville|::|city"
  "60540|::|postal code"
  "+16305550100|::|phone, tel/sms href format"
  "(630) 555-0100|::|phone, display format"
  "hello@meadowbrook-mortgage-demo.example|::|email"
  "mortgage-referral-demo.pages.dev|::|domain, in canonicals and sitemap"
  "G-XXXXXXXXXX|::|GA4 measurement ID"
  "12345678|::|HubSpot portal ID"
  "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee|::|HubSpot form GUID"
  "https://calendar.app.google/PLACEHOLDER|::|Google Calendar booking URL"
)

if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=''; DIM=''; RESET=''
fi

SEARCH_GLOBS=(--include='*.html' --include='*.css' --include='*.js' --include='*.json' --include='*.xml' --include='*.txt' --include='_redirects')

printf '\n%sBrand literals in this repo%s\n\n' "$BOLD" "$RESET"
printf '%-46s %6s  %s\n' "LITERAL" "COUNT" "MEANING"

for entry in "${TARGETS[@]}"; do
  literal="${entry%%|::|*}"
  meaning="${entry##*|::|}"
  count=$(grep -rFo "${SEARCH_GLOBS[@]}" -- "$literal" . 2>/dev/null | grep -cv '^./tools/')
  printf '%-46s %6s  %s%s%s\n' "$literal" "$count" "$DIM" "$meaning" "$RESET"
done

if [ "${1:-}" != "--apply" ]; then
  printf '\n%sDry run.%s Edit the CSS TOKENS layer for colors and type; use --apply for these literals.\n\n' "$DIM" "$RESET"
  exit 0
fi

printf '\n%sApply mode.%s Enter a replacement for each, or press Enter to skip.\n\n' "$BOLD" "$RESET"

for entry in "${TARGETS[@]}"; do
  literal="${entry%%|::|*}"
  meaning="${entry##*|::|}"
  printf '%s  (%s)\n  -> ' "$literal" "$meaning"
  read -r replacement || break
  [ -z "$replacement" ] && continue

  files=$(grep -rlF "${SEARCH_GLOBS[@]}" -- "$literal" . 2>/dev/null | grep -v '^./tools/')
  [ -z "$files" ] && continue

  # Delimiter is | because URLs contain slashes; literals here never contain a pipe.
  printf '%s\n' "$files" | xargs sed -i "s|${literal//|/\\|}|${replacement//|/\\|}|g"
  printf '     replaced in %s file(s)\n\n' "$(printf '%s\n' "$files" | grep -c .)"
done

printf '\n%sDone.%s Re-run tools/verify.sh before committing.\n\n' "$BOLD" "$RESET"
