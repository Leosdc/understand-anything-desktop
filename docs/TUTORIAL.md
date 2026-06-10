# Understand Anything Desktop - Comprehensive User Tutorial

Welcome to the official user guide for **Understand Anything Desktop**. This guide covers every single feature, configuration step, cost-control technique, and UI tool to help you get the most out of your code analysis without unexpected expenses.

---

## 🚀 Quick Start & API Key Setup

Understand Anything uses advanced Large Language Models (LLMs) to read, categorize, and describe your code. To use the app, you need a personal API Key from either Google Gemini or Anthropic Claude:

1. **Get an API Key**:
   - **Google Gemini**: Access the [Google AI Studio](https://aistudio.google.com/) and generate an API key. (Gemini 2.5 Flash is highly recommended for speed and affordability).
   - **Anthropic Claude**: Access the [Anthropic Console](https://console.anthropic.com/) to create your key and buy credits.
2. **Configure the App**:
   - Paste the key in the **API Key** input box.
   - Choose your provider (**Google Gemini AI** or **Anthropic Claude**).
   - Select the target model:
     * **Google Gemini Models**:
       - `gemini-2.5-flash` (Default fast & affordable) — Input: $0.075 / 1M, Output: $0.30 / 1M.
       - `gemini-2.5-pro` (High intelligence) — Input: $1.25 / 1M, Output: $5.00 / 1M.
       - `gemini-1.5-flash` (Legacy fast) — Input: $0.075 / 1M, Output: $0.30 / 1M.
       - `gemini-1.5-pro` (Legacy reasoning) — Input: $1.25 / 1M, Output: $5.00 / 1M.
       - `gemini-2.0-flash-exp` (Preview experimental) — Input: $0.075 / 1M, Output: $0.30 / 1M.
     * **Anthropic Claude Models**:
       - `claude-3-5-sonnet-20241022` (Sonnet v2 - Default balance) — Input: $3.00 / 1M, Output: $15.00 / 1M.
       - `claude-3-5-haiku-20241022` (Haiku v2 - Fast & economic) — Input: $0.80 / 1M, Output: $4.00 / 1M.
       - `claude-3-opus-20240229` (Opus - Maximum reasoning & high cost) — Input: $15.00 / 1M, Output: $75.00 / 1M.
       - `claude-3-sonnet-20240229` (Legacy medium) — Input: $3.00 / 1M, Output: $15.00 / 1M.
       - `claude-3-haiku-20240307` (Legacy fast) — Input: $0.25 / 1M, Output: $1.25 / 1M.

---

## ⚠️ Controlling Costs with `.understandignore` (Critical)

Because Phase 2 reads the actual text of files using the LLM, running the analyzer on heavy folders, third-party libraries, or binary assets can quickly inflate your API token usage. **To prevent high costs, you must configure ignore rules.**

### What is the ignore file?
The `.understandignore` is a text file located inside your project folder at:
`[your-project-folder]/.understand-anything/.understandignore`

> [!IMPORTANT]
> **Automatic Exclusions & Generation**: If this file does not exist in your repository, the application's backend **automatically creates it on the first run** (during Phase 0.5) with highly optimized default rules (ignoring `node_modules/`, `dist/`, `.git/`, builds, logs, and lock files) to protect your wallet from massive, accidental token charges. You can then view, modify, and add custom paths at any time.

Any file or folder pattern matched in this file will be completely skipped during the scan phase and will **not** be sent to the AI.

### Recommended Exclusions
You should always exclude non-essential files, third-party dependencies, build folders, and static media:

| Category | Example Patterns | Reason |
|---|---|---|
| **Package Managers** | `node_modules/`, `.venv/`, `venv/`, `__pycache__/`, `bower_components/` | Contains thousands of external library files. **Never analyze these.** |
| **Build/Output** | `dist/`, `build/`, `out/`, `target/`, `bin/`, `obj/` | Bundled/compiled code replicates code logic, doubling token usage. |
| **Version Control** | `.git/`, `.github/`, `.svn/`, `.hg/` | Metadata folders containing massive history logs. |
| **Lock Files** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `cargo.lock` | Huge text files with thousands of dependency paths that waste tokens. |
| **Media & Binaries** | `*.png`, `*.jpg`, `*.mp4`, `*.zip`, `*.pdf`, `*.mov` | Cannot be read as source code and will waste context tokens. |
| **Tests/Coverage** | `coverage/`, `.nyc_output/` | Temporary coverage reports and outputs. |

### How to format rules
List each rule on a new line. Standard glob matching is supported:
- `/node_modules` or `node_modules/` ignores the entire folder.
- `*.log` ignores all log files.
- `temp/*` ignores everything inside the `temp` folder.

---

## 🔄 Using the Live Ignore Editor & Recalculation

To make cost control effortless, the Desktop App includes a live `.understandignore` editor inside the cost confirmation modal.

> [!TIP]
> **How to optimize your analysis budget on the fly:**
> 1. Select your project folder and click **Analyze Repository**.
> 2. The app will perform a fast local scan and display the **Confirm Cost Estimate** modal.
> 3. Look at the **Estimated AI API Cost**. If it is too high:
>    - Go to the **Exclude Rules (.understandignore)** editor on the right side of the modal.
>    - Add the folders you want to exclude (e.g. `node_modules/` or `dist/`).
>    - Click the **Save & Recalculate** button.
> 4. The application will instantly save the rules, cancel the current pipeline run, and trigger a fresh scan offline.
> 5. Within seconds, a new cost summary will appear with updated (and lower) token counts!
> 6. Once you are satisfied with the price, click **Confirm & Proceed** to start the AI analysis.

---

## 📊 Understanding the 7-Phase Analysis Pipeline

Here is how the app processes your project step by step:

1. **Phase 0: Pre-flight**: Directory preparation and workspace configuration.
2. **Phase 0.5: Ignore Configuration**: Verifies and generates default ignore rules if they do not exist.
3. **Phase 1: Project Scan**: Deterministically maps all files, sizes, languages, and import statements locally.
4. **Phase 1.5: Split Semantic Batches**: Groups related files into smart batches (to keep file dependencies together).
5. **Cost Confirmation**: *User Interaction required.* Shows token counts, files, and cost projection.
6. **Phase 2: Code Analysis (AI)**: The sequential phase where the LLM reads code batches, writes summaries, and detects logical dependencies.
7. **Phase 3 to 6: Merge & Linkers**: Normalizes node IDs, links tests to production files, resolves orphan paths, and calculates complexity.
8. **Phase 7: Serving & Dashboard**: Boots the Express server with secure tokens and displays the interactive visual dashboard.

---

## 🎮 Interacting with the 3D Knowledge Graph

Once the analysis is complete, the dashboard loads an interactive canvas:

- **Navigation**:
  - **Left Click & Drag**: Rotate the canvas.
  - **Right Click & Drag / Shift + Drag**: Pan the camera.
  - **Scroll Wheel**: Zoom in and out.
- **Node Classification**:
  - Nodes represent code artifacts (files, functions, classes, endpoints).
  - Hovering over a node displays its path, language category, semantic summary, and complexity.
- **Node Complexity**:
  - **Green (Simple)**: Low line count, straightforward logic.
  - **Yellow (Moderate)**: Average complexity and dependencies.
  - **Red (Complex)**: High dependency count or complex logic. These nodes are great targets for refactoring!
- **Recent Projects**:
  - The setup screen lists your last 5 analyzed folders. Clicking them loads the graph instantly (1 second) without any LLM cost.
