---
name: update-docs
description: >-
  Maintain and synchronize project documentation across README.md, AGENTS.md,
  and CLAUDE.md whenever codebase features, build commands, hardware integration,
  or workflow conventions change.
---

# Documentation Updating Skill

This skill defines the standard procedure for keeping all project documentation, AI agent instructions, and user guides accurate, synchronized, and compliant across both Antigravity (`agy`) and Claude Code harnesses.

---

## Documentation Roles & Mapping

| File | Audience | What It Contains |
| :--- | :--- | :--- |
| **`README.md`** | End users & contributors | Feature overview, prerequisites, setup instructions, table of NPM scripts, and upstream acknowledgments. |
| **`AGENTS.md`** | AI Agents (Antigravity & Claude Code) | Technical context, Node.js/ESM quirks, sound card architecture, CLI flags (`-m false`), deployment file locking warnings, and development commands. |
| **`CLAUDE.md`** | Claude Code harness | Contains `@AGENTS.md` import so Claude Code inherits the shared standard while allowing Claude-specific overrides if needed. |

---

## When to Trigger this Skill

Invoke or follow this workflow whenever any of the following occur:
1. **New Action or Controller Added/Modified**:
   - e.g., adding dials/touch strip support, changing keypad button layout, or adjusting states in `manifest.json`.
2. **Build Scripts or Tooling Changed**:
   - e.g., modifying `package.json` scripts, changing Rollup configurations, or adding deployment flags.
3. **Hardware / CLI Interop Behavior Changed**:
   - e.g., altering `sbz-switch.exe` subcommands, parameters (such as `-m false`), or adding support for new audio interfaces.
4. **Platform / Compatibility Changes**:
   - e.g., updating OS compatibility in `manifest.json` (such as removing macOS or adding Linux/ALSA support).

---

## Update Checklist

When performing a documentation update, follow these steps in order:

### 1. Check Technical Accuracy against Code
- Verify `manifest.json` action UUIDs, controller names (`Keypad`, `Encoder`), and OS definitions.
- Verify `package.json` script names and ensure all referenced scripts exist in `scripts/`.
- Verify runtime conventions (e.g. Node 24 ESM `__dirname` handling).

### 2. Update `AGENTS.md`
- Keep explanations dense, technical, and actionable.
- Ensure the **Common Development Commands** section lists all active npm scripts.
- Ensure the **Important File Locations & Conventions** section reflects current file paths.
- Document any platform-specific quirks (e.g., Windows file locks requiring Stream Deck to be quit before deploying).

### 3. Verify `CLAUDE.md` Import
- Ensure `CLAUDE.md` exists and contains `@AGENTS.md` to import the shared rules:
  ```markdown
  @AGENTS.md
  ```

### 4. Update `README.md`
- Keep instructions user-facing and clean.
- Update the **Available NPM Scripts** table if any npm scripts were added, modified, or deprecated.
- Ensure prerequisites accurately match current tool versions (e.g. Node.js 24+, Stream Deck 6.0+).
- Ensure third-party upstream credits (e.g. `@mdonoughe` for `sbz-switch`) are preserved.

### 5. Validate Before Committing
Run the project validators to ensure no documentation references broken schemas:
```bash
npm run validate
```
