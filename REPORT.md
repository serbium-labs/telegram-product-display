# Milestone 5 Independent Review Report

Date: 2026-11-19

## Scope

Two independent reviews were performed after the purchase-intent implementation:

- a code-quality review against `DEVELOPMENT.md`;
- a security review focused on Telegram authentication, secrets, injection risks, error handling, and packaging.

The findings below reflect the final code after remediation.

## Code-Quality Review

### Verified

- No nested `if` statements or nested ternary expressions remain.
- Control-flow statements use braces and early returns.
- Numeric limits and protocol values use named `UPPER_SNAKE_CASE` constants.
- Public functions, component properties, hooks, and API contracts are explicitly typed.
- UI, state management, network transport, Telegram validation, rate limiting, and routing have separate responsibilities.
- External request and response bodies are validated at their trust boundaries.
- The Buy action exposes an accessible error state and a clear submitting state.

### Findings and remediation

1. **Explicit `null` configuration was treated as an omitted dependency.**
   - Remediation: application construction now distinguishes an absent property from an explicitly injected `null`, allowing deterministic service disabling in tests and deployments.
2. **Money formatting was duplicated on the client and server.**
   - Remediation: Telegram messages and the UI now use the same typed `formatMoney` utility.
3. **The purchase success test did not assert the canonical price.**
   - Remediation: tests now verify the canonical name, formatted price, and absolute preview URL. Strict request rejection and disabled-service behavior are also covered.

No unresolved code-quality finding blocks release.

## Security Review

### Verified

- `TELEGRAM_BOT_TOKEN` is consumed only by server-side configuration and HMAC validation. It is not exposed through a `VITE_` variable, response, log, or client bundle.
- Telegram `initData` validation uses the documented two-stage HMAC-SHA-256 derivation, constant-time hash comparison, duplicate-field rejection, a bounded input size, `auth_date` freshness checks, future-clock-skew protection, and validated user data.
- The client sends only `itemId`; commercial data is reloaded from the canonical server catalog.
- Purchase requests are schema-validated and rate-limited per validated Telegram user.
- Telegram usernames are allow-listed, preview URLs use a validated configured origin, and `URLSearchParams` encodes message content.
- React escapes displayed catalog text, and the client validates that the returned handoff URL is an HTTPS `t.me` link.
- Malformed JSON and unexpected server failures return safe JSON errors without stack traces or internal paths.
- Production `PUBLIC_APP_URL` values must use HTTPS.
- CSP, `nosniff`, referrer policy, restricted permissions, request-size limits, disabled Express identification, and a non-root container user are enabled.

### Residual operational risks

- A valid `initData` payload can be replayed during its configured validity period. The current endpoint only creates a deterministic link and does not mutate state, so per-user rate limiting is proportionate. Any future state-changing purchase endpoint must add one-time replay protection and transaction-level idempotency.
- The in-memory rate limiter is per process. A multi-instance deployment must use a shared limiter such as Redis or an API-gateway policy.
- Production deployments should inject the bot token through the platform secret store or Docker secrets. Operators with Docker inspection access can view ordinary container environment variables.
- Reverse proxies and observability tooling must redact the `X-Telegram-Init-Data` header because it contains signed Telegram user metadata.

## Verification

- TypeScript type checks: passed.
- ESLint: passed.
- Prettier check: passed.
- Production frontend/server build: passed.
- Vitest: 9 files passed, 47 tests passed.
- Docker multi-stage build: passed.
- Docker runtime smoke test: `GET /api/health` returned `API is running`.
- Temporary smoke-test container was stopped and removed.

## References

- [Telegram Mini Apps: validating data received via the Mini App](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Telegram public username links](https://core.telegram.org/api/links#public-username-links)
