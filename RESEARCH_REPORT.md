# Telegram Mini App — Research and Architecture Report

**Status:** Research and planning only  
**Date:** 2026-11-19  
**Inputs:** `TASK.md`, `DEVELOPMENT.md`, Telegram documentation, and OWASP guidance

## 1. Executive Summary

The requested product is a read-oriented Telegram Mini App with three primary capabilities: browsing a catalog, viewing an item and its image gallery, and initiating a conversation about an item. A Node.js backend is required even though the initial catalog is file-based. It establishes the security boundary, validates Telegram identity, validates and exposes catalog data, prevents filesystem paths from reaching the client, and keeps the bot token server-side.

The recommended architecture is a single deployable web service with two logical parts:

1. A frontend Mini App that renders only server-provided view models and never receives the Telegram bot token.
2. A backend-for-frontend that serves the frontend, exposes a small versioned API, validates Telegram `initData`, reads a validated catalog, resolves image manifests, and creates the allowed Telegram handoff action.

The highest-risk requirement is the Buy flow. Telegram supports opening a public username chat with prefilled text, but a deep link does not attach a local image file to the draft. A public image or item URL may be included in the text and may produce a link preview, but an actual photo sent through the Bot API is sent by the bot, not by the user. The intended behavior must therefore be clarified before implementation.

No order, payment, reservation, or inventory workflow is specified. In the current scope, “Buy” is a contact or purchase-inquiry action, not a transaction.

## 2. Requirement Interpretation and Open Decisions

### 2.1. Confirmed scope

- Display a catalog derived from a structured local data source.
- Use image `0.webp` as the catalog preview.
- Display full item details on a dedicated item view.
- Display images beginning with `1.webp` in a logically infinite gallery.
- Open a configured Telegram destination with item context when the user selects Buy.
- Keep the Telegram bot token exclusively on the backend.
- Deliver the final product as one container at a later implementation stage.
- Run separate AI quality and security reviews after development, produce reports, and apply corrections through a separate pull request.

### 2.2. Decisions required before implementation

| Decision | Why it matters | Recommended default |
|---|---|---|
| Stable item identifier | Names and asset folders can change and must not be API identifiers. | Add an immutable opaque `id` to every item. |
| Price representation | A formatted string cannot be validated, sorted, or localized reliably. | Store an integer amount in minor units plus an ISO currency code; format only for display. |
| Meaning of “250 tokens” | Token counts depend on a tokenizer and language and are unsuitable for deterministic validation. | Replace with a maximum Unicode character count agreed with the product owner. |
| Catalog ordering | No default order is specified. | Define a stable order explicitly, such as creation date descending with `id` as a tie-breaker. |
| Gallery gaps | It is unclear what happens when `1.webp` or an intermediate index is missing. | Require a contiguous sequence beginning at `1.webp`; fail validation for gaps. |
| Preview-only items | An item may contain `0.webp` but no gallery images. | Decide whether to reject it or show the preview as the only detail image. |
| Buy destination | A public username, phone number, business link, and bot chat behave differently. | Use a public username or Telegram Business link; do not expose a private phone number. |
| Buy message image | Telegram deep links prefill text but do not attach a local photo. | Include a canonical public item URL or image URL; treat rich preview generation as best-effort. |
| Catalog update model | Packaged, mounted, and remotely managed data have different threat models. | For the first release, package validated data as an immutable release artifact. |
| Non-Telegram access | Browser development and production access policies are not defined. | Permit an explicit local development mode only; require valid Telegram authentication in production. |

## 3. Domain Model

### 3.1. Item

The Item is the canonical domain entity. It should not expose raw filesystem locations.

| Field | Type and constraints | Purpose |
|---|---|---|
| `id` | Required stable opaque string; unique; bounded length | URL and API identity independent of display name or folder name |
| `name` | Required plain Unicode text; trimmed; bounded length | Human-readable title |
| `price` | Required Money value | Canonical amount and currency, separate from formatting |
| `description` | Required or explicitly nullable plain text; bounded length | Item detail content; never interpreted as markup |
| `paintedAt` | Required UTC timestamp; safe integer or normalized timestamp string | Creation date of the item, not catalog insertion date |
| `assetKey` | Required server-internal identifier with strict allowlist syntax | Maps the item to its image set without accepting a path |
| `preview` | Required Image reference with ordinal `0` | Catalog image and possible link-preview source |
| `gallery` | Ordered collection of Image references with ordinals beginning at `1` | Detail slider content |

The current field name `assetsArray` is misleading because its value is a single folder-like key rather than an array. `assetKey` or `galleryKey` describes the domain meaning more accurately.

### 3.2. Money

Money should be modeled as a value object:

| Field | Constraint |
|---|---|
| `amountMinor` | Non-negative safe integer in the currency's minor units |
| `currency` | Supported ISO 4217 code from an allowlist |

The API may additionally return a localized display string, but that string must not become the source of truth. Purchase intent creation must always resolve price from the server-side catalog rather than accepting it from the client.

### 3.3. Image Asset

| Field | Type and constraints | Purpose |
|---|---|---|
| `id` | Stable identifier unique within an item | Rendering key and diagnostics |
| `role` | `preview` or `gallery` | Explicit semantic use |
| `ordinal` | Non-negative integer | Stable ordering |
| `url` | Same-origin or approved HTTPS URL generated by the server | Browser-safe resource location |
| `mimeType` | Expected to be `image/webp` | Correct response and validation |
| `width` / `height` | Positive bounded integers | Layout reservation and responsive selection |
| `byteSize` | Positive bounded integer | Resource budgets and monitoring |
| `altText` | Plain text | Accessibility; may derive from item name and image position |

The source data does not need to repeat all derived image metadata. The backend can build and cache an immutable image manifest after verifying the files during startup. The API should expose URLs and metadata, never directory names or absolute paths.

### 3.4. Catalog List

The Catalog List is a read model rather than a separate mutable business entity. It contains:

- an ordered collection of item summaries;
- a total item count;
- a catalog revision or ETag for cache invalidation;
- optional pagination metadata if the catalog can grow beyond a small bounded set.

Each summary should contain only the fields needed by the catalog: `id`, `name`, display price, `paintedAt`, and preview metadata. Full descriptions and full galleries belong to the item-detail response.

### 3.5. Purchase Intent

A Purchase Intent is a short-lived server-generated handoff description, not an order. It contains the canonical item identifier, destination type, destination link, prepared text, and expiration if the link is signed or cached. The client submits only the item identifier. Name, price, preview URL, and destination are resolved on the server to prevent client-side tampering.

## 4. Proposed System Architecture

### 4.1. Logical components

| Component | Responsibility | Trust level |
|---|---|---|
| Telegram client | Hosts the Mini App and supplies launch data | External platform |
| Frontend Mini App | Presentation, navigation, gallery interaction, and user-triggered handoff | Untrusted client |
| Node.js backend-for-frontend | Authentication, validation, canonical catalog reads, media routing, and Telegram integration | Trusted application boundary |
| Catalog loader | Parses and validates the packaged catalog and builds immutable read models | Trusted only after validation |
| Media manifest service | Resolves validated asset keys to verified image metadata and safe URLs | Trusted only after file validation |
| Telegram adapter | Validates Telegram launch data and performs only explicitly allowed Telegram operations | Privileged boundary |

An Express server is a suitable implementation choice, but the architectural requirement is a narrow Node.js backend, not a generic Telegram proxy. It should expose only application-specific operations. An endpoint that accepts arbitrary Telegram method names, target chat identifiers, or remote media URLs would turn the service into an abuse primitive and is prohibited.

### 4.2. Request flow

1. Telegram opens the Mini App and supplies raw `initData` to the frontend runtime.
2. The frontend sends the raw `initData` to the backend over HTTPS.
3. The backend verifies the Telegram signature and freshness before trusting the user fields.
4. The backend establishes a short-lived application session or requires validated `initData` on protected requests.
5. The frontend requests catalog summaries and item details from the backend.
6. The backend returns validated, minimal view models and same-origin media URLs.
7. On Buy, the frontend sends only the item `id` to the backend.
8. The backend resolves canonical item data and returns or executes the approved Telegram handoff strategy.

### 4.3. Container boundary for the future implementation

The single-container requirement is best satisfied by one Node.js process serving the compiled frontend, versioned API, and approved media resources. Build tooling should not run in the production process. Runtime catalog and secret locations must be explicitly separated: catalog data may be read-only application content, while secrets are injected at runtime and never copied into an image layer.

## 5. Frontend–Backend API Contract

All endpoints should be versioned under `/api/v1`, return the correct media type, enforce response-size limits, and use one consistent error envelope with a stable machine-readable code and a safe user-facing message. Stack traces and internal paths must never be returned.

### 5.1. Proposed endpoints

| Method and path | Input | Output | Authentication |
|---|---|---|---|
| `POST /api/v1/auth/telegram` | Raw Telegram `initData` | Short-lived session state and minimal user projection | Telegram signature validation |
| `GET /api/v1/catalog` | Optional bounded pagination and sort parameters | Catalog List of item summaries | Valid application session; public access only if explicitly approved |
| `GET /api/v1/items/{id}` | Stable item identifier | Full item detail with ordered gallery manifest | Valid application session |
| `POST /api/v1/purchase-intents` | Item identifier only | Approved Telegram handoff action | Valid application session, rate limited |
| `GET /media/items/{id}/{imageId}` | Opaque validated identifiers | Image bytes with immutable caching headers | Same-origin policy; authorization decision depends on catalog visibility |
| `GET /health/live` | None | Process liveness only | Deployment network only |
| `GET /health/ready` | None | Readiness without secrets or catalog content | Deployment network only |

### 5.2. Contract rules

- The client never supplies authoritative `name`, `price`, image path, destination, or message template.
- Unknown request fields are rejected rather than ignored at security-sensitive boundaries.
- Identifiers have bounded length and allowlisted syntax.
- Pagination, array size, description length, and response size have explicit upper bounds.
- Missing items return a generic not-found response without disclosing filesystem state.
- Image endpoints resolve opaque identifiers through the verified manifest; they never concatenate user input into a path.
- Catalog responses may use ETag or immutable revision identifiers for efficient caching.
- Authentication failures and validation failures are distinguishable by stable codes but do not expose cryptographic details.

## 6. Security Audit

### 6.1. Protecting the Telegram bot token

The requirement refers to a Telegram API key; for this architecture, the sensitive credential is the bot token issued by BotFather.

Required controls:

- Inject the token into the backend process at runtime through `.env` for local development and an approved secret store or runtime secret mechanism in deployed environments.
- Exclude real environment files from version control and provide only a placeholder template.
- Never use a frontend-exposed environment-variable prefix for the token and never serialize it into HTML, client configuration, API responses, source maps, logs, traces, or error reports.
- Ensure the frontend build has no access to the production token. A shared repository does not imply a shared runtime environment.
- Keep Telegram calls inside a dedicated server adapter with an allowlist of required operations and fixed Telegram API origin.
- Do not implement a pass-through proxy. The client must not choose the Telegram method, bot token, arbitrary `chat_id`, or arbitrary remote file URL.
- Redact authorization headers, query strings, and Telegram request payloads from logs where they may contain credentials or user data.
- Restrict secret access to the application identity and apply least privilege to deployment operators and CI jobs.
- Rotate the token after suspected exposure and maintain a documented revocation procedure through BotFather.
- Fail startup safely when the token is missing or malformed; do not fall back to an insecure client-side mode.

The bot token is needed to verify Mini App `initData` using Telegram's HMAC procedure even if no Bot API message is sent. The browser must never perform this verification because giving it the token would destroy the security boundary.

### 6.2. Telegram `initData` authentication

Telegram explicitly states that `initDataUnsafe` must not be trusted and that raw `initData` must be validated on the bot server. The backend must:

1. Accept the raw query string without client-side reinterpretation.
2. Parse it with duplicate-key and size policies.
3. Remove the received hash from the data-check fields, sort the remaining fields as specified, and compute the required HMAC using the bot token-derived secret.
4. Compare the calculated and supplied hashes in constant time.
5. Validate `auth_date` against a short documented maximum age and allow only limited clock skew.
6. Validate the parsed user and optional chat fields with a strict schema after cryptographic verification.
7. Apply replay controls to sensitive or state-changing operations, using a short-lived server session, request nonce, or consumed query identifier where applicable.
8. Rate-limit failures by multiple signals without treating a client-supplied IP header as authoritative.

Origin and CORS checks are useful defense-in-depth controls but are not substitutes for Telegram signature verification. A development bypass must be impossible to activate in production through a request parameter or client-controlled flag.

Telegram's official validation procedure and freshness guidance are documented in [Telegram Mini Apps](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

### 6.3. Structured catalog validation

The catalog file must be treated as untrusted configuration at ingestion, even when packaged locally. Validation should run in CI and again when the backend starts. Startup must fail closed on invalid data; the application must not serve a partially accepted catalog.

The schema must enforce:

- exact top-level structure and a maximum item count;
- required fields and rejection of unknown fields;
- unique stable item IDs and unique asset keys;
- trimmed plain-text names with minimum and maximum Unicode lengths;
- descriptions with a deterministic maximum length and no markup semantics;
- canonical Money structure, supported currencies, and safe integer bounds;
- `paintedAt` type, safe numeric range, and agreed policy for implausible future dates;
- asset keys restricted to a conservative slug alphabet, with no slash, backslash, dot segments, control characters, percent-encoded separators, or Unicode lookalikes;
- bounded nesting depth, input byte size, and array lengths before expensive processing;
- semantic cross-field checks after structural validation.

The validator should produce actionable diagnostics for operators without echoing entire rejected records into production logs. OWASP recommends validating both syntax and semantics, limiting input before parsing, rejecting unknown properties, and validating every nested item; see the [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

### 6.4. File and image validation

The data schema alone cannot prove that image files are safe or consistent. The media loader must:

- resolve asset keys against one fixed gallery root and verify the canonical resolved path remains under that root;
- reject symbolic-link escapes and unexpected file types;
- require `0.webp` and apply the chosen policy for a missing `1.webp`;
- accept only strictly numeric gallery filenames and a contiguous, bounded ordinal range;
- inspect file signatures and decoded metadata rather than trusting extensions;
- enforce maximum file bytes, pixel dimensions, total images per item, and total decoded-pixel budget;
- reject malformed images and decompression bombs;
- strip unnecessary metadata during the controlled asset pipeline;
- serve a fixed `Content-Type: image/webp` only after content validation.

### 6.5. Preventing data substitution and tampering

- Package the validated catalog and images as immutable release artifacts for the initial release.
- Run the production filesystem read-only except for narrowly scoped runtime directories.
- Restrict the catalog update path to the reviewed build and release process.
- Record a catalog revision or manifest digest for observability and cache invalidation.
- If catalog files later come from an external store, authenticate the source, verify a signed manifest or trusted digest, retain version history, and validate again after download.
- Resolve all Buy message fields from the server's canonical item by `id`; never trust price, name, preview, or destination returned by the client.

A checksum delivered beside a compromised file is not an authenticity control. A signature or digest anchored in a separate trusted release channel is required when external updates are introduced.

### 6.6. XSS and content-injection controls

Schema validation reduces malformed input but does not by itself prevent XSS. Required rendering controls are:

- Treat names and descriptions as plain text, not HTML or Markdown.
- Rely on framework escaping and prohibit unsafe HTML rendering escape hatches for catalog content.
- Use safe text sinks and never pass catalog values to `innerHTML`, script, style, event-handler, or raw template contexts.
- Validate URLs by structure and allow only same-origin media paths or an explicit HTTPS origin allowlist.
- Encode each Telegram deep-link query parameter with a standards-compliant URL encoder; never concatenate untrusted text into a URL.
- Return structured responses as `application/json` with `nosniff`; never return them as HTML.
- Add a restrictive Content Security Policy as defense in depth, while preserving the Telegram integration resources that are explicitly required.
- Avoid inline scripts and prohibit `eval`-like execution.
- Use context-appropriate output encoding if a value leaves the normal framework rendering path.

OWASP recommends safe text sinks, framework auto-escaping, URL validation, and context-specific output encoding in the [Cross-Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).

### 6.7. Additional backend controls

- HTTPS only, with secure transport headers and no sensitive query-string authentication.
- Strict request body, header, and timeout limits.
- Rate limits on authentication and purchase-intent creation.
- Explicit CORS policy; same-origin deployment is preferred.
- If cookie sessions are used: `Secure`, `HttpOnly`, appropriate `SameSite`, session rotation, short lifetime, and CSRF protection for state-changing routes.
- Minimal privacy-preserving audit events for authentication failures and purchase-intent creation.
- No raw `initData`, bot token, full message text, or unnecessary Telegram profile data in logs.
- Dependency pinning, vulnerability review, and controlled updates during implementation.

## 7. Telegram Buy-Flow Feasibility

### 7.1. Supported direct-chat behavior

Telegram documents public username links that accept a `text` parameter and pre-enter UTF-8 text into the chat input when the user can write to that chat. A Mini App can open a `t.me` link through `openTelegramLink` in response to a user action. See [Telegram deep links](https://core.telegram.org/api/links#public-username-links) and [Telegram Mini Apps](https://core.telegram.org/bots/webapps).

This supports the following safe baseline:

- The backend resolves the configured public destination and canonical item.
- It prepares bounded plain text containing item name and formatted price.
- It includes a canonical public HTTPS item URL or preview URL.
- The frontend opens the returned Telegram link only after the user presses Buy.
- Telegram opens the destination chat with the text in the draft; the user reviews and sends it.

The sender is the user because the user completes the send action. The application must not claim that the message was sent merely because the chat opened.

### 7.2. Image limitation

A direct-chat deep link can prefill text but cannot attach the local `0.webp` file as draft media. Including a public URL may produce a Telegram link preview, but preview generation is asynchronous, client- and crawler-dependent, and not equivalent to an attached photo.

Using Bot API `sendPhoto` would create a real photo message, but:

- it is sent by the bot, not by the user;
- the bot must be allowed to send to the target chat and must know a valid target chat identifier;
- a bot cannot impersonate the user;
- sending an inquiry immediately may remove the user's final confirmation step;
- the endpoint would require anti-abuse, idempotency, and rate-limit controls.

Telegram documents Bot API photo sending in [sendPhoto](https://core.telegram.org/bots/api#sendphoto). This is a different product behavior and should not be selected without explicit approval.

### 7.3. Recommended decision

Adopt the user-sent draft flow for the first release: item name, canonical price, and canonical public item or preview URL in prefilled text. Treat a rich image preview as best-effort. If an actual attached image is mandatory, revise the requirement and choose explicitly between a bot-sent message, a Telegram Business workflow, or a user-driven share flow.

## 8. Telegram WebApp Integration Risks

### 8.1. Authentication and launch context

- `initDataUnsafe` is convenient for initial display but cannot establish identity or authorization.
- Some fields are optional and depend on how the Mini App was launched. The system must not assume that chat context, username, or query identifier is always present.
- Stale but correctly signed `initData` can be replayed unless `auth_date` and sensitive-operation replay controls are enforced.
- Telegram user identifiers should be preserved without lossy numeric conversion at boundaries.
- Opening the app in a normal browser produces no valid Telegram launch data; development behavior must be explicitly isolated from production.
- BotFather domain and Mini App configuration, HTTPS availability, and launch mode must be tested before UI work is considered complete.

### 8.2. Client and version fragmentation

- Telegram clients on iOS, Android, desktop, and web may expose different available versions and lifecycle behavior.
- Features must be gated by capability or version checks and have a safe fallback.
- `openTelegramLink` must be triggered by a user interaction and should be tested across supported clients.
- Back-button, theme, safe-area, viewport, minimize/resume, and orientation behavior require integration testing inside Telegram, not only in a desktop browser.
- The image slider's horizontal gesture can conflict with Telegram's vertical close/minimize gestures. Gesture direction locking and thresholds must be designed carefully without disabling platform gestures globally unless justified.
- Network interruptions and Mini App resume events can leave stale UI state; catalog revision and request cancellation policies are required.

Telegram warns that the dynamic viewport height is not suitable for smoothly pinning controls during resize and provides a stable viewport value for layout decisions; see [Telegram Mini Apps viewport guidance](https://core.telegram.org/bots/webapps).

## 9. Infinite Slider Design Without Unbounded Memory

“Infinite” should describe navigation behavior over a finite image list, not an ever-growing DOM or duplicated array.

Recommended design:

- Keep a single finite gallery manifest and one logical current index.
- Calculate previous and next indices with wrap-around; never append cloned slides on each navigation.
- Mount only a small fixed window, typically previous, current, and next, with at most a small additional buffer if animation requires it.
- Load the current image eagerly, prefetch only adjacent images, and lazy-load the rest.
- Use responsive dimensions and thumbnails so a phone does not decode full-resolution source images unnecessarily.
- Release object URLs if any are created, cancel obsolete requests, and remove timers, event listeners, observers, and gesture handlers on unmount.
- Do not store images as base64 strings in application state and do not keep decoded canvases for the whole gallery.
- Let the browser HTTP cache reuse image bytes; do not duplicate them in JavaScript caches without a measured need.
- Cap gallery length, file size, pixel dimensions, and total decoded-pixel budget during validation.
- Reserve image dimensions to prevent layout shift and use Skeleton placeholders while an image is loading.
- Handle decode failure with a bounded retry policy and a stable fallback, without advancing into an error loop.
- Pause autoplay when the Mini App is inactive, the document is hidden, or reduced-motion is requested. Autoplay is optional and should not be assumed.

Compressed file size does not represent memory use. A decoded raster typically requires roughly width × height × four bytes, so a visually small network response can occupy substantial memory at large dimensions. This is why server-side dimension limits and responsive variants matter more than the `.webp` extension alone.

Accessibility requirements:

- keyboard-operable previous and next controls;
- meaningful control labels and current-position announcement;
- predictable focus behavior when slides change;
- no focusable controls inside unmounted or visually hidden slides;
- reduced-motion behavior and no mandatory autoplay.

## 10. WebP Optimization Constraints

WebP is appropriate for the requested raster gallery and generally provides better compression than legacy raster formats. However, format choice alone is not an optimization strategy. MDN summarizes WebP capabilities and trade-offs in its [image format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types#webp_web_picture_format).

Key risks and controls:

| Risk | Impact | Control |
|---|---|---|
| Oversized pixel dimensions | High decoded memory and slow rendering despite a small file | Produce bounded responsive variants and enforce dimension limits |
| One quality setting for every image | Visible artifacts or unnecessarily large files | Define measurable quality and visual-review thresholds by content type |
| Incorrect MIME configuration | Failed rendering or content sniffing inconsistencies | Serve verified files as `image/webp` with `nosniff` |
| Old Telegram WebView behavior | Images may fail on unsupported client baselines | Define supported Telegram versions and test actual iOS, Android, desktop, and web clients |
| Metadata and orientation changes | Rotated images or privacy leakage after conversion | Normalize orientation before conversion and strip unnecessary metadata |
| Color-profile conversion | Artwork colors may shift | Standardize the target color space and perform visual regression checks |
| No responsive variants | Mobile clients decode desktop-scale images | Generate size variants and expose dimensions in the manifest |
| Telegram crawler behavior | Direct `.webp` links may not consistently produce the desired chat preview | Test publicly reachable HTTPS previews; add a compatible preview derivative only if verified as necessary |
| Conversion drift | Rebuilds produce unexpected quality or byte-size changes | Pin the conversion tool and settings and enforce asset budgets in CI |

If a verified Telegram compatibility constraint requires another format for link previews, that exception is compatible with `DEVELOPMENT.md`, which permits a non-WebP format when the constraint is documented. The in-app gallery should remain WebP unless testing disproves support for the agreed client baseline.

## 11. Risk Register

| Risk | Probability | Impact | Mitigation / decision |
|---|---:|---:|---|
| Buy-flow image behavior is technically incompatible with “sent by user” wording | High | High | Approve the text-plus-public-link baseline or revise the requirement before implementation |
| Bot token leaks into frontend build or logs | Medium | Critical | Runtime-only backend secret, build separation, log redaction, secret scanning, rotation procedure |
| Forged or replayed Telegram identity | Medium | Critical | Server-side HMAC validation, freshness window, constant-time comparison, replay controls |
| Path traversal through asset key or image identifier | Medium | High | Strict slug schema, manifest lookup, canonical root check, symlink policy, no path concatenation |
| Malicious catalog text causes XSS | Medium | High | Plain-text contract, strict validation, framework escaping, safe sinks, CSP |
| Malformed or oversized image exhausts memory | Medium | High | File signature, byte/pixel/count budgets, controlled conversion pipeline |
| Infinite slider retains every decoded image | Medium | High | Fixed DOM window, adjacent prefetch only, cleanup and memory profiling |
| Formatted price becomes authoritative | High | Medium | Money value object and server-side canonical lookup for purchase intent |
| Catalog and filesystem diverge | Medium | Medium | Startup manifest validation, fail closed, clear operator diagnostics |
| Telegram client differences break navigation or layout | High | Medium | Capability checks and cross-client Mini App test matrix |
| Link preview for WebP is absent or inconsistent | Medium | Medium | Treat preview as best-effort; test crawler behavior; documented derivative if required |
| Single-container requirement couples build and runtime | Medium | Medium | Multi-stage build later; one minimal runtime process serving UI and API |
| Development auth bypass reaches production | Low | Critical | Build-time/environment separation and startup refusal for insecure production flags |

## 12. Testing and Verification Strategy

Tests must live in a separate test directory and focus on meaningful behavior, consistent with `DEVELOPMENT.md`.

### 12.1. Contract and validation tests

- Valid minimal and full catalog records.
- Missing, unknown, incorrectly typed, oversized, duplicate, and semantically inconsistent fields.
- Asset keys containing traversal sequences, separators, control characters, encoding tricks, and Unicode lookalikes.
- Missing preview, missing first gallery image, ordinal gaps, excessive image counts, invalid signatures, and excessive dimensions.
- Money bounds, supported currencies, timestamp bounds, and deterministic description-length policy.

### 12.2. Authentication and security tests

- Valid Telegram signature and accepted freshness window.
- Modified field, invalid hash, duplicate parameter, stale timestamp, future timestamp, malformed user payload, and replayed sensitive request.
- Production rejection when Telegram authentication is absent.
- Authorization and rate-limit behavior for purchase intents.
- XSS payloads rendered as text, unsafe URL schemes rejected, response content types correct, and internal details absent from errors.
- Verification that no frontend artifact or source map contains the bot token.

### 12.3. UI and integration tests

- Catalog loading Skeleton, success, empty, and error states.
- Item navigation and not-found behavior.
- Slider wrap-around in both directions without DOM growth.
- Rapid swipe, interrupted transition, failed image decode, Mini App minimize/resume, and reduced-motion behavior.
- Buy action uses canonical server data and opens the intended Telegram link only on user interaction.
- Cross-client smoke tests in supported Telegram clients, not only standalone browsers.

Performance verification should include peak decoded image memory, DOM node count after repeated slider loops, transfer sizes, layout shifts, and behavior on a constrained mobile device.

## 13. Milestones

### Milestone 1 — Decisions, Contracts, and Foundation

**Scope:**

- Resolve the open product decisions, especially Buy-flow semantics, destination type, description limit, item ID, price model, gallery gaps, and catalog order.
- Define the supported Telegram client matrix and non-Telegram development policy.
- Finalize domain entities, strict schemas, API contracts, error model, trust boundaries, and threat model.
- Plan the future single-container runtime and secret-injection model without configuring it during research.

**Exit criteria:** All blocking decisions are recorded; API and security boundaries are reviewable; no requirement relies on unsupported Telegram behavior.

### Milestone 2 — Backend Security Boundary and Catalog Pipeline

**Scope:**

- Establish the Node.js backend and application-specific API.
- Implement runtime configuration and server-only bot-token handling.
- Implement Telegram `initData` validation, session policy, freshness, replay, and rate limits.
- Implement strict catalog and image-manifest validation with fail-closed startup.
- Expose catalog summary, item detail, and safe media endpoints.

**Exit criteria:** Invalid identities, catalog records, paths, and images are rejected; secrets cannot reach client artifacts; API contract tests pass.

### Milestone 3 — Catalog Experience

**Scope:**

- Build catalog loading, success, empty, and error states.
- Render validated item summaries with `0.webp` previews.
- Apply CSS variables, component-per-folder structure, accessibility, responsive layout, Skeleton placeholders, and image dimension reservation.
- Add integration tests for catalog behavior rather than trivial implementation details.

**Exit criteria:** Catalog behavior is correct across the agreed Telegram client matrix and meets accessibility and resource budgets.

### Milestone 4 — Item Detail, Bounded Infinite Gallery, and Telegram Handoff

**Scope:**

- Build item detail navigation and full metadata presentation.
- Implement fixed-window circular gallery behavior with adjacent prefetch, cleanup, error handling, and reduced motion.
- Implement the approved Buy handoff using canonical backend data.
- Verify direct-chat draft behavior and image/link-preview behavior on supported Telegram clients.

**Exit criteria:** Repeated slider loops do not increase DOM or application-held image count; the Buy flow matches the approved semantics and cannot be tampered with from the client.

### Milestone 5 — Hardening, Packaging, and Independent Review

**Scope:**

- Complete security, integration, end-to-end, accessibility, and performance testing.
- Add production headers, logging redaction, health checks, operational limits, and dependency review.
- Package the final frontend and backend into one minimal container with runtime secret injection and a read-only runtime filesystem where practical.
- Run the AI Critic Agent and AI Security Agent and save both reports.
- Apply approved corrections in a separate pull request and rerun the relevant verification suite.

**Exit criteria:** Release criteria in `DEVELOPMENT.md` pass; reports and remediation evidence exist; the release contains no secret and has a documented rollback and token-rotation procedure.

## 14. Recommended Architecture Decision

Proceed with a same-origin Node.js backend-for-frontend that serves a validated immutable catalog and media manifest, authenticates every production session with server-verified Telegram `initData`, and returns minimal view models to the Mini App. Model price as canonical Money, add stable item IDs, keep filesystem identifiers internal, and implement the gallery as a fixed-size circular viewport.

For the first release, define Buy as a user-confirmed handoff to a configured public Telegram username with prefilled plain text containing canonical name, price, and a public item or preview URL. Do not promise an attached image or automatic send. Any requirement for a real attached photo must trigger a separate architecture decision because Bot API delivery changes the sender identity and abuse model.

## 15. References

- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Mini App data validation](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Telegram public username deep links](https://core.telegram.org/api/links#public-username-links)
- [Telegram share and business chat links](https://core.telegram.org/api/links#share-links)
- [Telegram Bot API — sendPhoto](https://core.telegram.org/bots/api#sendphoto)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Cross-Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN Image File Type and Format Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)
