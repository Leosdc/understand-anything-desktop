# Understand Anything Desktop

<p align="center">
  <img src="src/renderer/assets/mascote.png" width="160" alt="Mascote Understand Anything" />
</p>

<p align="center">
  <a href="https://github.com/Leosdc/understand-anything-desktop"><img src="https://img.shields.io/badge/GitHub-Repo-181717?logo=github" alt="GitHub" /></a>
  <a href="https://github.com/Leosdc/understand-anything-desktop/releases"><img src="https://img.shields.io/badge/Version-v0.3.3-blue" alt="Version" /></a>
  <a href="https://github.com/Leosdc/understand-anything-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://github.com/Lum1104"><img src="https://img.shields.io/badge/Original_Creator-Yuxiang_Lin_(Lum1104)-38bdf8" alt="Original Creator" /></a>
</p>

<p align="center">
  <b><a href="README.md">English</a></b> | 
  <b><a href="README.pt-BR.md">Português (Brasil)</a></b> | 
  <b><a href="README.es.md">Español</a></b> | 
  <b><a href="README.ja.md">日本語</a></b> | 
  <b><a href="README.zh.md">简体中文</a></b>
</p>

Turn any codebase into an interactive knowledge graph you can explore visually, search, and audit. **Now with a beautiful, zero-dependency Desktop App for Windows!**

This is the official desktop wrapper and portable version of the acclaimed **Understand Anything** project. 

> [!IMPORTANT]
> **Credits & Acknowledgements:** This desktop application is built on top of the exceptional codebase analysis pipeline created by the original developer, **Yuxiang Lin** ([@Lum1104](https://github.com/Lum1104) / [Understand-Anything Repo](https://github.com/Lum1104/Understand-Anything)). We ported the Python graph mergers to native TypeScript and built a secure Electron desktop environment to make this powerful tool accessible to everyone without terminal dependencies.

---

## 💡 Why use the Desktop App (.exe) instead of the original CLI?

The desktop portable version was designed to solve several usability, environment setup, and cost control friction points of the original CLI:

* **Zero Environment Setup (Portable)**: The original project required Node.js, Python 3, C++ compilers, and several Python libraries (pandas, networkx, etc.). The `.exe` bundles all analysis scripts, parsers, and node linkers in native TypeScript. Download, run, and analyze immediately.
* **Cost Appraisal & Token Estimates**: Before spending your money on Gemini or Claude API tokens, the Desktop App scans your folder and displays a summary of the files, estimated AI request batches, and tokens, allowing you to proceed or cancel. **You can edit the `.understandignore` rules directly inside this dialog and recalculate the costs on the fly! The app supports the complete Gemini (3.5, 2.5, 1.5, 2.0) and Claude (Sonnet 4.6, Opus 4.6, Sonnet 3.5, Haiku, Opus) model catalog with accurate live token rates.**
* **Real-time Cancellation**: If an analysis is taking too long or costing too much, you can cancel it with one click. The backend halts active API calls and cleans up temporary files immediately. In the CLI, killing with `Ctrl+C` could leave rogue processes and corrupted files.
* **Recent Projects History (1-Second Loading)**: Keep a list of your last 5 analyzed codebases. Load their visual graph instantly from the UI without performing a new analysis or writing terminal command paths.
* **Dynamic Multi-Language Sync**: Switch the interface language dynamically. The app automatically updates your active project configuration so that the rendering dashboard matches your preferred language immediately.
* **Secure Local Server**: Runs a secure, lightweight Express backend locally, protected by a single-use authorization token generated on startup to prevent local network breaches.

---

## ⚠️ AI Cost Optimization & Exclusions

Because **Understand Anything** reads the actual logic of your codebase (Phase 2) to build its semantic knowledge graph, analyzing heavy third-party directories or built assets can consume excessive AI API tokens. 

To prevent unnecessary costs:
1. **Live Ignore Editor**: You can create or edit your `.understandignore` patterns directly inside the cost estimation modal before proceeding. **If the file does not exist in your repository, the app backend automatically generates it with safe default rules on the first run.**
2. Alternatively, inside your project folder, locate or create the `.understand-anything/` directory.
3. Create or edit a file named `.understandignore` inside that folder.
4. Add glob patterns for files and directories you want to ignore (e.g. `node_modules/`, `dist/`, `.git/`, logs, images).
5. For a complete detailed setup and advanced rules, check out the comprehensive [TUTORIAL.md](file:///c:/Users/PC/Documents/Bots/Understand-Anything/docs/TUTORIAL.md)!

---

### 📊 Architecture & Data Flow

```mermaid
graph TD
    User([User Interface]) -->|1. Select Project & Model| Electron[Electron App]
    Electron -->|2. Run Scan Offline| Scan[Phase 1: Local File Scan]
    Scan -->|3. Group Files| Batches[Phase 1.5: Split Semantic Batches]
    Batches -->|4. Cost Appraisal| Confirm{Cost Confirmation Dialog}
    Confirm -->|Abort| Cancel[Cleanup & Reset]
    Confirm -->|Proceed| IA[Phase 2: Sequential AI Code Readings]
    IA -->|Gemini / Claude API| LLM((AI Models))
    IA -->|5. Merge Sub-graphs| Merge[Phase 3-6: Node Normalization & Linkers]
    Merge -->|6. Save JSON Data| GraphFile[(knowledge-graph.json)]
    GraphFile -->|7. Serve via Local HTTP Port| Express[Express Server + single-use Token]
    Express -->|8. Interactive Visual Rendering| Iframe[Embedded Webview Dashboard]
```

---

## ✨ Desktop Features

- **📂 Native Project Selector**: Select any folder in your computer directly using native Windows dialogs.
- **⚡ Semantic Recent Projects**: Instantly reload previously analyzed projects. If the graph exists, access the dashboard in 1 second without re-running the analysis.
- **🛡️ Real-time Processing Logs**: Follow the 7-phase analysis (Scanning, IA Batch processing, Architecture Layer Mapping, Tour guides creation) in a terminal log viewer.
- **🛑 Real Cancellation**: Abort ongoing analysis at any time. Backend processes and active AI requests are stopped immediately to save API tokens.
- **🤖 Animated Floating Mascot**: Interactive visual assistant that floats in the setup and progress screens.
- **💡 Built-in Help System**: Access phase descriptions, speed guidelines, and tips for massive projects right inside the UI.
- **🔒 Secure Local Web Server**: Express server runs locally protected by a single-use token generated on startup.

---

## 🚀 Portable Download (Quick Start)

For users who just want to use the application without compiling locally:

1. Go to the [Releases](https://github.com/Leosdc/understand-anything-desktop/releases) page of the repository.
2. Download the `.zip` file for the latest version (e.g., `Understand-Anything-Desktop-win32-x64.zip`).
3. Extract the contents to any folder on your computer.
4. Run `Understand Anything.exe` to launch the application.

---

## 🛠️ Installation & Build

To compile and run the desktop application locally, ensure you have Node.js installed:

1. Clone the repository:
   ```bash
   git clone https://github.com/Leosdc/understand-anything-desktop.git
   cd understand-anything-desktop
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and package the portable executable (`.exe`):
   ```bash
   npm run build
   ```
   *(This command compiles the React frontend, Electron backend, bundles all dependencies, and packages the desktop app inside the `dist-package/` directory).*
4. Once completed, go to the `dist-package/Understand Anything-win32-x64/` directory and run `Understand Anything.exe`.

---

## 🔒 Data Privacy & Security

Understand Anything Desktop is designed with local-first privacy:

* **Zero Telemetry**: The app contains no trackers, telemetry, or third-party cloud analytics.
* **Local API Keys**: Your Gemini and Claude API keys are stored locally on your machine in `%APPDATA%\Understand Anything\settings.json` and are never shared or sent to external servers.
* **Local Graph Processing**: Your codebase files are analyzed locally. The generated semantic graph (`knowledge-graph.json`) is saved strictly within your own project directory under the hidden `.understand-anything/` folder.
* **Direct AI Requests**: The only external network traffic consists of direct, secure HTTPS calls to the official Google Gemini (`https://generativelanguage.googleapis.com`) and Anthropic Claude (`https://api.anthropic.com`) endpoints to perform semantic code analysis.

---

## 🤝 Contributions

If you find this desktop wrapper useful, please consider:
- ⭐️ Star the repository on [GitHub](https://github.com/Leosdc/understand-anything-desktop)
- 💡 Contributing code improvements or filing issues in the tracker.

*Thank you to **Yuxiang Lin (Lum1104)** for creating the original pipeline that makes this project possible!*
