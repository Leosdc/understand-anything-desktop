# Understand Anything Desktop

<p align="center">
  <img src="src/renderer/assets/mascote.png" width="160" alt="Understand Anything 智能助手" />
</p>

<p align="center">
  <a href="https://github.com/Leosdc/understand-anything-desktop"><img src="https://img.shields.io/badge/GitHub-Repo-181717?logo=github" alt="GitHub" /></a>
  <a href="https://github.com/Leosdc/understand-anything-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://lum.is-a.dev/"><img src="https://img.shields.io/badge/Original_Creator-Luminis-38bdf8" alt="Original Creator" /></a>
</p>

将任何代码库转换为交互式的 知识图谱，以进行可视化探索、搜索和审计。**现在配备了美观、零本地依赖的 Windows 桌面端应用程序！**

这是备受瞩目的 **Understand Anything** 项目的官方桌面包装器及便携版本。

> [!IMPORTANT]
> **致谢与鸣谢：** 本桌面应用程序基于原作者 **Luminis** 开发的卓越代码库分析流水线构建（[https://lum.is-a.dev/](https://lum.is-a.dev/) / [Understand-Anything 仓库](https://github.com/Egonex-AI/Understand-Anything)）。我们将 Python 编写 institutional 图谱合并程序移植为原生 TypeScript，并构建了安全的 Electron 桌面环境，使用户无需安装复杂的终端依赖或本地语言环境即可使用此强大工具。

---

## 💡 为什么使用桌面端应用 (.exe) 而不是原始的 CLI 命令行工具？

桌面端便携版本旨在解决原始命令行工具（CLI）中存在的易用性差、环境配置繁琐和成本控制难等痛点：

* **零环境配置（即开即用）**：原始项目需要安装全局 Node.js、Python 3、C++ 编译器以及多个复杂的 Python 依赖库（如 pandas、networkx 等）。桌面端 `.exe` 文件将所有分析脚本、解析器和节点合并工具封装在原生 TypeScript 中。只需下载并直接运行，即可立即开始分析。
* **费用估算与 Token 限制**：在消耗 Gemini 或 Claude API 额度之前，桌面端应用会首先扫描您的代码库文件夹，并显示待分析文件数、预计 AI 请求批次及 Token 估算总结，供您选择继续或取消。
* **实时主动取消**：若分析时间过长或费用超出预期，您可随时一键取消。后端会立即终止挂起的 AI 请求并清理本地临时文件。而在 CLI 中强行按下 `Ctrl+C` 往往会导致后台残留孤立进程或产生损坏的图谱文件。
* **历史最近项目（1秒加载）**：自动记录您最近分析的 5 个代码库。如果项目已生成过图谱，您只需在 UI 中点击即可在 1 秒内直接打开可视化面板，无需再次分析消耗 AI Token，也不必每次手动输入终端路径。
* **动态多语言同步**：随时在设置面板切换软件语言。桌面端会自动同步修改当前活动项目的配置文件，使 渲染面板能立即切换至您偏好的语言显示。
* **安全受控的本地服务器**：在后台自动且隐蔽地运行安全的轻量级 Express 服务器，采用启动时随机生成的单次加密 Token 保护，防止局域网内其他设备非法访问您的代码数据。

---

## ⚠️ AI 成本优化与文件排除

由于 **Understand Anything** 在分析代码库时会读取文件的实际逻辑（阶段 2）以构建语义知识图谱，因此分析体积庞大的第三方依赖目录或构建产物可能会消耗大量的 AI API Token 额度。

为了避免不必要的费用：
1. 在您的项目文件夹中，找到或创建 `.understand-anything/` 目录。
2. 在该目录下创建或编辑名为 `.understandignore` 的文件。
3. 添加需要忽略的文件或目录的 glob 匹配模式（例如 `node_modules/`、`dist/`、`.git/`、日志文件或静态图片等）。
4. 欲了解详细的配置规则和高级过滤技巧，请参阅完整的说明文档 [TUTORIAL.zh.md](file:///c:/Users/PC/Documents/Bots/Understand-Anything/docs/TUTORIAL.zh.md)！

---

### 📊 架构与数据流

```mermaid
graph TD
    User([用户界面 UI]) -->|1. 选择项目与 AI 模型| Electron[Electron 桌面端]
    Electron -->|2. 本地离线扫描| Scan[阶段 1: 文件扫描]
    Scan -->|3. 划分代码文件| Batches[阶段 1.5: 语义批次划分]
    Batches -->|4. 费用确认弹窗| Confirm{费用估算确认对话框}
    Confirm -->|取消分析| Cancel[清理临时文件并重置]
    Confirm -->|确认继续| IA[阶段 2: 顺序调用 AI 阅读代码]
    IA -->|Gemini / Claude API| LLM((AI 大模型))
    IA -->|5. 合并子图谱| Merge[阶段 3-6: 节点规范化与连线器]
    Merge -->|6. 保存最终 JSON 数据| GraphFile[(knowledge-graph.json)]
    GraphFile -->|7. 本地 HTTP 安全服务| Express[Express 服务器 + 一次性 Token]
    Express -->|8. 交互式 图谱呈现| Iframe[嵌入式 Dashboard 视窗]
```

---

## ✨ 桌面端功能特性

- **📂 原生项目选择器**：使用原生 Windows 对话框直接选择计算机中的任何项目文件夹。
- **⚡ 语义化历史项目**：瞬间重新加载先前分析过的项目。如果图谱已存在，可在 1 秒内直接打开可视化面板，无需重新分析代码。
- **🛡️ 实时处理日志**：在交互式终端视图中跟踪分析的 7 个阶段（扫描、AI 批处理、架构层级映射和向导路线生成）的进度。
- **🛑 实时取消**：随时中止当前进行的分析。后端进程和 active AI 请求将立即终止，以节省 API Token 费用。
- **💰 提前费用管控**：在阶段 1.5 中估算 Token 消耗和美元（$）费用，允许用户决定是继续还是中止 AI 接口调用。
- **🤖 动画悬浮助手**：在配置和进度屏幕中嵌入了交互式机器人视觉助理，可对鼠标悬停做出缩放反应。
- **💡 内置帮助系统**：直接在界面中查看阶段说明、`.understandignore` 排除项配置以及针对超大型项目的性能优化建议。
- **🔒 安全本地 Web 服务器**：内置 Express 服务器，由每次启动时随机生成的单次使用访问令牌保护。

---

## 🛠️ 安装与使用

您可以直接下载预编译好的便携式文件夹，或自行构建项目。无需安装 Python 环境或 C++ 编译器！

### 方法一：运行预编译便携版 (.exe)
1. 访问目录 [dist-package/Understand Anything-win32-x64](https://github.com/Leosdc/understand-anything-desktop/tree/main/dist-package/Understand%20Anything-win32-x64)。
2. 双击运行 `Understand Anything.exe`。
3. 输入您的 **Google Gemini** 或 **Anthropic Claude** API 密钥（安全地保存在本地）。
4. 选择您的项目文件夹并点击 **Analisar Repositório**（分析代码库）。

### 方法二：从源码构建
如果您希望在本地编译桌面端应用程序，请确保已安装 Node.js：

1. 克隆仓库：
   ```bash
   git clone https://github.com/Leosdc/understand-anything-desktop.git
   cd understand-anything-desktop
   ```
2. 安装依赖项：
   ```bash
   npm install
   ```
3. 构建应用程序并打包便携式 `.exe`：
   ```bash
   npm run build
   ```
   *(该单一命令将生成 React 前端，使用 esbuild 编译 Node.js 后端，复制所有必要资源，并在 `dist-package/` 文件夹中生成便携式可执行文件)。*

---

## 🤝 贡献与支持

如果您觉得这个便携式桌面端应用对您有所帮助，请考虑：
- ⭐️ 在 [GitHub](https://github.com/Leosdc/understand-anything-desktop) 上为本仓库点亮星星。
- 💡 贡献代码改进，或在仓库的 Issue 跟踪器中反馈 bug。

*特别鸣谢 **Luminis** 创造了使该项目成为可能的核心分析分析流水线！*
