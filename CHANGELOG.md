# Changelog — Understand Anything Desktop

All notable updates and engineering improvements applied to this integrated graphical version.

---

## [0.3.3] — 2026-06-12

### Added
- **Tradução do Modal de Caminhos**: Traduzidas todas as legendas, labels e mensagens do localizador de caminhos de dependência (`PathFinderModal`) em todos os 8 locales do dashboard.
- **Internacionalização em 5 Idiomas**: Adicionadas as traduções completas para Português do Brasil (`pt.ts`) e Espanhol (`es.ts`), garantindo compatibilidade total com os 5 idiomas principais suportados pelo app desktop.

### Changed
- **Sincronização de Tema do Dashboard**: O dashboard agora carrega por padrão com o tema `dark-ocean` e destaque `ocean` (redefinido para corresponder exatamente ao azul celeste `#38bdf8` do aplicativo desktop).

### Fixed
- **Clean Text Q&A Chat Parser**: Ajustado o endpoint `/ask-ai` e a função do orchestrator para solicitar saídas textuais limpas (Markdown) em vez de JSON estruturado, eliminando a renderização de propriedades brutas no chat do assistente.
- **Normalização de Nome de Projetos**: O orquestrador agora usa o nome físico do diretório (`path.basename`) como fallback caso a IA deduza títulos genéricos como "Projeto Indeterminado".

---

## [0.3.2] — 2026-06-12

### Added
- **Enterprise Security & Compliance Guide**: Created a comprehensive [FOR-ENTERPRISES.md](file:///c:/Users/PC/Documents/Bots/Understand-Anything/FOR-ENTERPRISES.md) guide at the repository root. Fully translated into 5 languages (English, Portuguese, Spanish, Japanese, and Chinese), it details local-first security boundaries, embedded loopback web servers, AST processing pipelines, and direct HTTPS connections to LLM API endpoints.

### Fixed
- **Missing Release Dependencies**: Resolved execution exceptions ("Cannot find module") in clean desktop environments by mapping and packaging all transitive dependencies of `graphology` and `mnemonist` (`graphology-utils`, `graphology-indices`, `graphology-types`, `mnemonist`, `obliterator`, and `pandemonium`) in the Electron app production bundle.

---

## [0.3.1] — 2026-06-11

### Security
- **Fix command injection vulnerability**: Replaced unsafe `child_process.exec` calls with `child_process.execFile` in the backend orchestrator ([orquestrador.ts](file:///c:/Users/PC/Documents/Bots/Understand-Anything/src/main/orquestrador.ts)) when executing Git commands, preventing shell injection vectors.
- **Remediation of dependency vulnerabilities**: Upgraded `concurrently` package dependency to mitigate shell-quote command injection vulnerability.
- **Electron Hardening**:
  - Implemented strict Content Security Policy (CSP) headers in all loaded pages inside [electron.ts](file:///c:/Users/PC/Documents/Bots/Understand-Anything/src/main/electron.ts).
  - Enhanced URL validation when opening links externally, restricting protocols strictly to `http:` and `https:` in `shell.openExternal`.
  - Added robust validation in the IPC bridge for loading project files, preventing path traversal and enforcing workspace constraints.
  - Removed token exposure from the dev mode fallback error page, eliminating credential leak risks.

---

## [0.3.0] — 2026-06-10

### Added
- **Integrated Visual `.understandignore` Editor**: A new text area was added to the right side of the cost estimation modal (Phase 1.5), allowing users to view and edit file exclusion rules in real-time.
- **Save & Recalculate in UI**: Integrated button to save new ignore rules directly to the project folder and silently restart the repository scan to get new file counts and AI token estimates instantly.
- **Quick Exclusion Shortcuts**: Shortcut buttons added to the modal for quick insertion of heavy directories (such as `node_modules/`, `dist/`, `.git/`, `.venv/`, and binary files) to prevent high costs.
- **Expanded API Model Catalog**: Added full model selection support in the interface for Google Gemini (`gemini-3.5-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash-exp`) and Anthropic Claude (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`), with updated token cost rate calculations.
- **Automatic Ignore File Generation**: Implemented a default smart exclusion check where the backend automatically generates the `.understandignore` file with safe default patterns on first run if it doesn't exist.
- **Expanded Internationalization**: Added all localization keys in the interface dictionary (English, Portuguese, Spanish, Chinese, and Japanese) to support the ignore editor.
- **Path Traversal Protection**: The IPC bridge for reading and writing ignore rules validates that the requested paths are strictly contained within the active project directory.
- **Manuals and Tutorials (`docs/`)**: Created detailed user guides (`TUTORIAL.*.md`) in 5 languages explaining each phase of the analysis, cost estimation, ignore tips, and 3D dashboard usage.

### Fixed
- **GitHub Actions Pipeline (CI/Release)**: Corrected build paths to properly locate the core plugin packages folder (`temp-plugin/understand-anything-plugin/packages/core`) and changed the CI runner to `windows-latest` to compile the Windows executable without relying on the failing Wine emulator on Linux.
- **Ignore Editor UI State**: Fixed the visual state retention of active ignore rules, ensuring the active exclusions panel continues to show up after a token cost recalculation.

---

## [0.2.0] — 2026-06-09

### Added
- **"Recent Projects" History**: Saves the last 5 analyzed codebases in the local `settings.json` file. If a project already has a generated knowledge graph, the user can open the dashboard instantly in 1 second without re-analyzing the code.
- **Real-Time Analysis Cancellation**: Clicking the "Cancel" button now sends an IPC signal that immediately halts the batch analysis loop in the backend orchestrator and aborts active AI API requests, saving token usage and freeing memory.
- **Floating Animated Mascot**: Official PNG image of the robotic mascot added to the bottom corner of the Setup and Progress screens, featuring hardware-accelerated CSS `@keyframes float` animation and a neon blue-violet drop-shadow.
- **Interactive Help Modal**: A glassmorphic overlay modal (triggered by the `HelpCircle` icon at the top) explaining the 7-phase analysis pipeline, the processing time during Phase 2 (AI batch analysis), and practical tips to speed up massive repos (e.g., `.understandignore` and subfolders).
- **Support Buttons**: Footer integrations providing direct links to the official GitHub repository.
- **Responsive Scroll Support**: Redesigned the form layout with vertical `overflowY: "auto"` and `margin: "auto"`, ensuring usability and readability on lower resolution monitors or resized windows.

### Fixed
- **Execution Exception (`ReferenceError`)**: Removed package dependencies that attempted to initialize unsupported global variables in the Electron renderer.
- **TypeScript Asset Imports**: Added a global `vite-env.d.ts` declaration in the renderer folder to prevent TypeScript compilation errors when importing PNG images.
- **Build Locking Protection**: Added an automated process kill command for pending executable instances before attempting to overwrite new portable builds.

---

## [0.1.0] — 2026-06-09

### Added
- **Migration to Portable TypeScript**: Ported the original Node/Python CLI orchestrator pipeline to native TypeScript (`orquestrador.ts`), including full porting of the Python `merge-batch-graphs.py` script logic (node normalization, tested_by deterministic linking, import recovery).
- **Native Electron Window**: Built the application interface using Electron + React (Vite) with a Dark Glassmorphism design system.
- **Secure Embedded Express Server**: Created a local Express HTTP server protected by a single-use authorization token generated at boot, serving the static 3D dashboard securely.
- **Secure File Reader**: Implemented endpoints protected against Path Traversal in the backend for reading source code files dynamically inside the dashboard.
- **Portable Executable Build**: Configured compiler and packaging scripts to generate an uncompressed folder ready to run without external C++ or Python dependencies.
