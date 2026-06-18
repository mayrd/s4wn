# Siedler 4 Wildering New-Dawn (S4WN)

Welcome to the Siedler 4 Wildering New-Dawn (S4WN) project, initially known as Siedler 4 Web Native. Our mission is to preserve the spirit of the classic *Siedler 4* (The Settlers IV) experience while evolving it for the modern era. By migrating the game engine to a web-based architecture, we ensure accessibility across desktop and mobile browsers, ensuring this timeless classic remains playable for generations to come.

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
* **Reference:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — best source for Siedler 4 buildings, units, production chains, and game mechanics.

---

*This project is dedicated to the Settlers community. Our goal is to maintain the legacy of Siedler 4 by embracing modern web standards.*

---

## 🚀 Current Status

**Phase 2.16 — Config Name Normalization** ✅
- ✅ Nation-gated building placement — Roman, Viking, Maya, Trojan, and Dark Tribe unique buildings. `Economy::is_building_available()` checks player nation. 295 tests.
- ✅ Dark Tribe unique buildings (7) — DarkTemple, DarkGarden, MushroomFarm, SanctuaryOfMorbus, SanctuaryOfPestilence, DarkFortress, DemonGate
- ✅ Config name normalization — ClayPit→Clay Pit, HempFarm→Hemp Farm, MeadMaker→Mead Maker. JS config IDs now match Rust `BuildingType::name()` output.
---

AI Agent Configuration:
* Work Duration: 10-20 minutes per session.
* Frequency: Hourly.
* Reporting: Ensure README.md and IMPLEMENTATION_PLAN.md remain accurate to the current state of the project.
