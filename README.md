# Siedler 4 Web-Native (S4WN)

Welcome to the Siedler 4 Web-Native (S4WN) project. Our mission is to preserve the spirit of the classic *Siedler 4* (The Settlers IV) experience while evolving it for the modern era. By migrating the game engine to a web-based architecture, we ensure accessibility across desktop and mobile browsers, ensuring this timeless classic remains playable for generations to come.

---

## 🤖 AI Agent Operational Protocol
This project is maintained by an AI agent operating on a daily 1-hour sprint cycle. The agent is tasked with the autonomous advancement of the codebase through the following structured workflow:

### 1. Initialization & Synchronization
* Git Sync: Pull the latest changes from the repository.
* Environment Check: Ensure the development environment is synchronized with the latest project state.

### 2. Task Execution
* Issue Resolution: Analyze open GitHub issues, prioritize based on project stability, and implement fixes.
* Feature Development: Consult the IMPLEMENTATION_PLAN.md to build out new features.
* Research & Planning: Investigate technical requirements for upcoming features and update the IMPLEMENTATION_PLAN.md accordingly.

### 3. Quality Assurance & Documentation
* Testing: Develop and maintain comprehensive regression tests to ensure game logic remains intact during refactoring.
* Documentation: Update technical documentation (inline comments and docs/) to reflect architectural changes.

### 4. Continuous Integration & Delivery
* Verification: Run all test suites.
* Cleanup: Review the IMPLEMENTATION_PLAN.md and append new actionable items discovered during the session.
* Commit: Push all changes to the Git repository.
* Deployment: Trigger a build for the Multi-Architecture Docker Image (targeting linux/amd64 and linux/arm64). The image must bundle all necessary dependencies to act as a standalone Webserver for the game.

---

## 📦 Asset Policy — 100% Open-Source

**Original Siedler 4 game assets (graphics, sounds, music, sprites) will NOT be used.** All visual and audio assets must be:
- **Generated or created** by the AI agent or contributors — nothing extracted from the original game
- **Committed directly into this repository** as open-source (MIT license)
- **Designed from scratch** — they do NOT need to replicate the original look-and-feel; creative reinterpretation is encouraged
- **Replaceable** — the engine loads assets from standard web formats (PNG, WebP, OGG, JSON) not from proprietary containers

The only original S4 files the engine MUST support are **maps and campaigns** (`*.map`, `*.sav` savegames):
- These are user-generated content, not copyrighted Ubisoft artwork
- They should be **importable or migrated on-the-fly** when a player drops a map/campaign file
- The `.map`/.`sav` parser reads scenario data (terrain layout, starting resources, objectives, triggers) but references our own generated asset ids — never extracts original sprites or textures

**Raison d'être:** This keeps the project legally clean, fully self-contained, and genuinely open-source — not dependent on extracting proprietary files the user may or may not own.

---

## 🛠 Technical Stack & Requirements
* Core: Web-native engine (targeting WebAssembly/JavaScript).
* Deployment: Dockerized Webserver (serving the game assets and engine).
* Compatibility: Cross-platform support for Desktop and Mobile web browsers.
* Architecture: Optimized for arm64 (Apple Silicon/Raspberry Pi) and x64 environments.

---

## 📋 Project Governance
* Implementation Plan: See IMPLEMENTATION_PLAN.md for the roadmap.
* Issue Tracker: Manage all bugs and feature requests via GitHub Issues.
* Testing: All PRs must pass regression tests before being merged into the main branch.

---

*This project is dedicated to the Settlers United community. Our goal is to maintain the legacy of Siedler 4 by embracing modern web standards.*

---

## 🚀 Current Status

**Phase 1 — Core Engine** (complete ✅)

- ✅ **TECHNOLOGY_CHOICE.md** — Engine: Rust → WASM, Server: Caddy, Graphics: WebGL2/WebGPU
- ✅ **Hello World POC** — Rust/WASM engine rendering an animated isometric terrain grid via WebGL2 (42KB .wasm)
- ✅ **CI/CD Pipeline** — GitHub Actions + Docker Buildx multi-arch (amd64/arm64)
- ✅ **Map Module** — 8 terrain types, procedural generation, resource deposits
- ✅ **Camera Module** — Isometric pan/zoom with mouse + touch support
- ✅ **Game Loop** — Tick-based deterministic, 10 TPS, seeded PRNG (SplitMix64)
- ✅ **Asset Pipeline** — ARA stream cipher + LZ/Huffman decompression (ported from Settlers.ts)
- ✅ **Renderer Integration** — Day/night cycle, resource glow visualization

**Phase 2 — Game Logic** (near complete ✅)

- ✅ **Economy System** — 16 resource types (9 raw + 7 processed), 14 building types, production chains, resource storage
- ✅ **Units System** — Workers, Soldiers, Archers with HP/speed/attack stats, movement along paths
- ✅ **Pathfinding** — A* on tile grid with terrain-aware movement costs
- ✅ **Worker-Building Integration** — Buildings require assigned workers to produce resources
- ✅ **Worker AI** — Auto-assignment, pathfind to building, transition to Working state
- ✅ **Combat System** — Attack resolution, damage/death, soldier chase and attack AI
- ⬜ Combat integration with game loop (AI-driven battles each tick)
- ⬜ Economy/unit visualization in WebGL renderer

---

AI Agent Configuration:
* Work Duration: 60 minutes per session.
* Frequency: Daily.
* Reporting: Ensure README.md and IMPLEMENTATION_PLAN.md remain accurate to the current state of the project.
