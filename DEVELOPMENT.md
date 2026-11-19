# Engineering Standards

## 1. Purpose

This document defines the mandatory engineering standards for the project. Its purpose is to ensure predictable quality, clear architecture, secure development, and long-term maintainability.

These rules apply to all new code. Any intentional exception must be justified, documented, and approved during code review.

## 2. Role and Working Approach

The developer acts as a Senior Frontend/Fullstack Developer and is responsible not only for functional correctness, but also for architectural quality, security, testability, and maintainability.

Core working principles:

- Understand the task, constraints, and acceptance criteria before designing a solution.
- Choose the simplest solution that fully satisfies the requirements and supports safe evolution.
- Do not introduce abstractions prematurely. Generalize only proven, recurring patterns.
- Separate concerns and avoid mixing presentation, business logic, and external system integration.
- Deliver small, logically complete changes that are easy to review.
- Treat loading, empty, error, and access-restricted states as part of the primary implementation.
- Validate the result with static analysis, tests, and manual checks of critical scenarios.
- Leave the codebase clearer and more resilient than it was before the change.

## 3. Code Quality

### 3.1. Control Flow

- Nested `if` statements are prohibited. Use early returns or extract dedicated functions to handle edge cases and invalid states.
- Nested ternary operators are prohibited. Express complex branching through clear conditions, named variables, or dedicated functions.
- Curly braces are mandatory for all control-flow statements, including single-line branches and early returns. Do not write forms such as `if (condition) return value;`.
- Keep the condition and its braced body visually distinct and consistently formatted.
- Deeply nested loops, callbacks, and blocks must be eliminated through decomposition.
- Conditions should read as meaningful statements. Extract complex boolean expressions into clearly named variables or functions.

### 3.2. Constants and Naming

- Magic numbers and unexplained literals are prohibited.
- Meaningful values must be extracted into named constants.
- Constants must use `UPPER_SNAKE_CASE` naming.
- Variable, function, type, and module names must communicate their purpose without requiring inspection of the implementation.
- Abbreviations are allowed only when they are widely understood and do not reduce readability.

### 3.3. Type Safety

- Strict type checking is mandatory.
- Types for parameters, return values, state, component properties, and contracts between layers must always be declared explicitly.
- Unrestricted types are prohibited. When input data is unknown, use a safe unknown type and narrow it before use.
- Type assertions must not hide design errors or bypass compiler checks.
- External data is untrusted and must be validated at the system boundary before use.
- Incoming state values must be validated whenever they cross an untrusted boundary, including restored, persisted, remotely supplied, or user-controlled state.
- Correctly distinguish falsy values from nullish values. Do not treat `false`, `0`, or an empty string as absent when they are valid values.
- Use explicit nullish checks and nullish fallback behavior when only `null` or `undefined` should be considered missing.
- Shared contracts must have a single source of truth and must not be duplicated across layers.

### 3.4. Decomposition

- Spaghetti code and entities with mixed responsibilities are prohibited.
- User interfaces must be divided into small components with clear responsibilities.
- Reusable state and lifecycle logic must be extracted into hooks.
- Pure transformations and shared operations must be extracted into utilities.
- External communication and side effects must be isolated from the presentation layer.
- Large functions and components must be split when they perform multiple independent tasks or require excessive effort to understand.
- Public module interfaces must remain minimal. Internal implementation details must not be exported without a clear reason.
- Duplication should be removed only when the resulting abstraction remains clear and represents a genuinely shared responsibility.

### 3.5. Readability and Maintainability

- Code must be self-documenting and use as few comments as possible. Add comments only when they are required to explain non-obvious intent, constraints, risks, or decisions that the code cannot communicate clearly.
- Dead code, commented-out implementations, and unused dependencies are prohibited.
- Errors must be handled explicitly and must never be silently ignored.
- Insert a blank line between logically distinct operations, including after variable declarations, between independent conditional blocks, and between function definitions.
- Do not add blank lines that separate a single logical operation or reduce local readability.
- Formatting and static analysis rules must be applied consistently and automatically.
- Compiler, linter, and test warnings must not remain unresolved without a documented reason.

### 3.6. Engineering Principles

- **DRY — Don't Repeat Yourself:** keep each piece of knowledge and each shared rule in one authoritative place. Remove meaningful duplication, but do not force unrelated code into a premature abstraction.
- **KISS — Keep It Simple:** prefer the clearest and least complex solution that fully satisfies the requirements.
- **YAGNI — You Aren't Gonna Need It:** do not implement speculative features, extension points, configuration, or abstractions without a current verified need.
- **SOLID:** design modules and abstractions around a single responsibility, extension without unnecessary modification, safe substitutability, focused interfaces, and dependencies on stable contracts rather than concrete implementation details.
- Apply these principles pragmatically. When principles appear to conflict, prioritize correctness, clarity, maintainability, and the current requirements.

## 4. UI Architecture

### 4.1. Styles and Design Tokens

- Reusable visual values must be defined as CSS variables in `:root`.
- Colors, typography, spacing, dimensions, border radii, shadows, stacking levels, and animation settings should be represented by variables.
- Components must use semantic tokens instead of duplicating raw values locally.
- Global styles must remain minimal. Component styles should be isolated and independent of accidental external context.
- Responsive behavior, focus states, and reduced-motion preferences must be considered during implementation.

### 4.2. Component Structure

Each component must be placed in its own directory. The directory acts as the component boundary and may contain its implementation, styles, types, local helpers, and public export entry point.

Recommended structure:

```text
components/
└── ComponentName/
    ├── ComponentName.tsx
    ├── ComponentName.module.css
    ├── ComponentName.types.ts
    └── index.ts
```

- Shared components must not depend on a specific usage scenario.
- Specialized components should be colocated with their functional area.
- Imports should use a module's public interface when one is defined.

### 4.3. Loading States

- Skeleton placeholders are mandatory while asynchronous data is loading.
- A Skeleton should approximate the geometry of the final content to minimize layout shifts.
- A placeholder must not imitate interactivity or create a false impression that an action is available.
- Loading, error, empty, and success states must be designed and handled separately.

### 4.4. Images

- Raster images must be optimized and delivered in `.webp` format unless a verified compatibility constraint prevents it.
- Image dimensions must match their actual display requirements. Loading unnecessarily large assets is prohibited.
- Non-critical images should use lazy loading.
- Image display dimensions must be reserved in advance to prevent layout shifts.
- Informative images must have meaningful alternative text. Decorative images must be excluded from the accessibility tree.

### 4.5. Accessibility

- The interface must be fully operable with a keyboard.
- Semantic elements must be used for their intended purpose. Replacing them with generic containers without justification is prohibited.
- Focus must be visible, navigation order must be logical, and interactive elements must have accessible names.
- Color must not be the only means of communicating state or meaning.

## 5. Testing

- Tests must be stored in a dedicated test directory and kept separate from production code.
- The test directory structure must clearly associate each test with the module or functional area it verifies.
- Tests should cover observable behavior, public contracts, business rules, edge cases, and error handling.
- Do not test obvious behavior, implementation details, language features, or the behavior of third-party libraries.
- A test must not duplicate the implementation of the code under test.
- Every test must be deterministic, independent, and named to describe the expected behavior clearly.
- External dependencies should be replaced only at system boundaries. Excessive mocking that couples tests to implementation details is prohibited.
- A defect fix should include a regression test when the issue can be reproduced reliably and the test provides practical value.
- Critical user flows must be covered by integration or end-to-end tests according to their risk level.
- Test count and coverage percentage are not goals by themselves. Protecting meaningful behavior is the priority.

## 6. Security

### 6.1. Secrets and Configuration

- Secrets, keys, tokens, and private configuration values must be stored only in `.env` files or an approved secure environment store.
- Files containing real secrets must never be committed to version control.
- The repository may contain only an environment template with variable names and safe example values.
- Secrets must never appear in client bundles, logs, error messages, test data, or documentation.
- A leaked secret must be rotated immediately. Removing it from the latest change is not sufficient.

### 6.2. Client-Server Boundary

- The client is an untrusted environment. Any data received from it may have been modified by the user.
- Authorization, permission checks, critical calculations, and operations on protected data must be performed on the server.
- Hiding a user interface element is not an access-control mechanism.
- All input and incoming state must be validated and normalized whenever it crosses an untrusted boundary.
- The server must return only the minimum required data and must not expose internal implementation details.
- Errors returned to the client must not contain stack traces, secrets, internal paths, or sensitive information.
- Requests must use appropriate authentication, rate limiting, request-forgery protection, and access policies.

### 6.3. General Security Requirements

- Dependencies must be checked regularly for known vulnerabilities and updated in a controlled manner.
- User input must not be inserted directly into commands, queries, or markup without appropriate validation and escaping.
- Logs must not contain secrets or unnecessary personal data.
- Access must follow the principle of least privilege.
- Significant security events must be observable and auditable.

## 7. Definition of Done

A change is complete when:

- the implementation satisfies the requirements and respects established architectural boundaries;
- the code is strictly typed, properly decomposed, and contains no prohibited constructs;
- loading, error, empty, and edge states are handled;
- tests cover meaningful behavior and all existing checks pass;
- accessibility, performance, and security requirements are satisfied;
- no secrets, debugging code, or unexplained warnings remain;
- documentation is updated when public contracts or operating rules change;
- the change has passed code review and can be released and rolled back safely.
