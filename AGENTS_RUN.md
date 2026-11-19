# Documentation: Running Agents and Subagents

## General Architecture

The project was developed using the **Codex AI agent (VS Code Extension)**. The process was divided into stages using the Task File pattern.

## Agent File Foundation

Before running the agents, the following files are created in the project root:

1. `TASK.md` — a complete description of the business task and requirements.
2. `DEVELOPMENT.md` — engineering standards covering roles, code rules, architecture, and security.

## Stage 1: Developer Agent

**Goal:** Implement the application code.

**Prompt:** “You are a Senior Frontend Developer. Read `DEVELOPMENT.md` and `TASK.md`. Create a plan and begin the implementation. Work autonomously.”

**Result:** Generated application code, tests, and Docker configuration.

## Stage 2: Critic Agent and Security Agent

**Goal:** Audit the code and identify vulnerabilities.

**Prompt:** “Change roles. You are the Critic Agent and Security Agent. Review the code for compliance with `DEVELOPMENT.md` and identify vulnerabilities. Produce a report in `REPORT.md`. Fix critical issues.”

**Result:** A `REPORT.md` file documenting the identified issues and the corrected code.

## Stage 3: Final Result

- All 47 tests pass.
- The Docker image builds and runs successfully (`/api/health` smoke test).
- The Critic Agent resolved code duplication and configuration issues.
- The Security Agent confirmed that the token and `initData` are protected.
