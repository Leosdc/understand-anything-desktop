import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import express from "express";
import { runAnalysis, ProgressUpdate, AnalysisOptions, cancelActiveAnalysis, setAnalysisConfirmation } from "./orquestrador.js";

let mainWindow: BrowserWindow | null = null;
let expressApp: express.Express | null = null;
let serverInstance: any = null;
let activeProjectPath: string | null = null;

// Token de acesso de uso único gerado no boot da aplicação
const ACCESS_TOKEN = crypto.randomBytes(16).toString("hex");

// Configurações do usuário salvas localmente
const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");

function getSettings() {
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      if (!data.recentProjects) data.recentProjects = [];
      return data;
    } catch (_) {}
  }
  return { apiKey: "", apiProvider: "gemini", modelName: "gemini-2.5-flash", language: "en", recentProjects: [] };
}

function saveSettings(settings: any) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

// Inicializar Servidor Express Local
function startLocalServer(port = 5173): Promise<number> {
  return new Promise((resolve, reject) => {
    expressApp = express();

    // Middleware de segurança para validar o Token nas requisições do dashboard
    const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const token = req.query.token || req.headers["x-access-token"];
      if (token !== ACCESS_TOKEN) {
        res.status(403).json({ error: "Forbidden: missing or invalid token" });
        return;
      }
      next();
    };

    // Servir os dados do grafo do projeto ativo de forma segura
    expressApp.get("/knowledge-graph.json", authMiddleware, (req, res) => {
      if (!activeProjectPath) {
        res.status(400).json({ error: "Nenhum projeto selecionado." });
        return;
      }
      const gPath = path.join(activeProjectPath, ".understand-anything/knowledge-graph.json");
      if (fs.existsSync(gPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(gPath, "utf-8"));
          // Sanitizar caminhos absolutos no JSON antes de retornar (evitar leaks)
          if (Array.isArray(raw.nodes)) {
            raw.nodes = raw.nodes.map((node: any) => {
              if (typeof node.filePath !== "string") return node;
              const abs = node.filePath;
              const rel = abs.startsWith(activeProjectPath!)
                ? abs.substring(activeProjectPath!.length).replace(/^[\\/]/, "").replace(/\\/g, "/")
                : path.isAbsolute(abs)
                ? path.basename(abs)
                : abs;
              return { ...node, filePath: rel };
            });
          }
          res.json(raw);
        } catch (err) {
          res.status(500).json({ error: "Erro ao ler grafo de conhecimento." });
        }
      } else {
        res.status(404).json({ error: "Nenhum grafo de conhecimento encontrado. Execute a análise primeiro." });
      }
    });

    expressApp.get("/meta.json", authMiddleware, (req, res) => {
      if (!activeProjectPath) return res.status(400).json({ error: "Nenhum projeto." });
      const mPath = path.join(activeProjectPath, ".understand-anything/meta.json");
      if (fs.existsSync(mPath)) {
        res.sendFile(mPath);
      } else {
        res.status(404).end();
      }
    });

    expressApp.get("/config.json", authMiddleware, (req, res) => {
      if (!activeProjectPath) return res.status(400).json({ error: "Nenhum projeto." });
      const cPath = path.join(activeProjectPath, ".understand-anything/config.json");
      if (fs.existsSync(cPath)) {
        res.sendFile(cPath);
      } else {
        res.json({ autoUpdate: false, outputLanguage: "en" });
      }
    });

    // Endpoint de leitura segura de código fonte (Path Traversal protection)
    expressApp.get("/file-content.json", authMiddleware, (req, res) => {
      const requestedPath = (req.query.path as string) || "";
      if (!activeProjectPath || !requestedPath) {
        res.status(400).json({ error: "Parâmetros inválidos." });
        return;
      }

      // Prevenir Path Traversal
      const normalizedPath = path.normalize(requestedPath);
      if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        res.status(400).json({ error: "Acesso fora do diretório do projeto não permitido." });
        return;
      }

      const absoluteFile = path.resolve(activeProjectPath, normalizedPath);
      if (!absoluteFile.startsWith(activeProjectPath)) {
        res.status(400).json({ error: "Acesso fora do diretório do projeto não permitido." });
        return;
      }

      if (fs.existsSync(absoluteFile) && fs.statSync(absoluteFile).isFile()) {
        try {
          const buffer = fs.readFileSync(absoluteFile);
          // Verificar se é arquivo binário
          if (buffer.includes(0)) {
            res.status(415).json({ error: "Arquivos binários não podem ser visualizados." });
            return;
          }
          const content = buffer.toString("utf8");
          const ext = path.extname(absoluteFile).slice(1).toLowerCase();

          res.json({
            path: requestedPath.replace(/\\/g, "/"),
            language: ext || "text",
            content,
            sizeBytes: buffer.byteLength,
            lineCount: content.split(/\r\n|\n|\r/).length
          });
        } catch (_) {
          res.status(500).json({ error: "Erro ao ler arquivo." });
        }
      } else {
        res.status(404).json({ error: "Arquivo não encontrado." });
      }
    });

    // Servir arquivos estáticos do Dashboard compilados em produção
    // O dashboard compilado fica na pasta `dashboard/dist`
    // Caminho relativo ao build do desktop
    const dashboardDist = path.resolve(__dirname, "../dashboard");
    if (fs.existsSync(dashboardDist)) {
      expressApp.use(express.static(dashboardDist));
      // Redirecionamento SPA
      expressApp.get("*", (req, res, next) => {
        // Ignorar endpoints da API
        if (req.path === "/knowledge-graph.json" || req.path === "/file-content.json" || req.path === "/meta.json" || req.path === "/config.json") {
          return next();
        }
        res.sendFile(path.join(dashboardDist, "index.html"));
      });
    } else {
      // Se não existir, avisa em console (desenvolvimento)
      expressApp.get("/", (req, res) => {
        res.send(`<h1>Servidor Ativo</h1><p>Token de acesso: <code>${ACCESS_TOKEN}</code></p><p>Nota: Dashboard React não encontrado em <code>${dashboardDist}</code>. Roda em dev mode para se conectar.</p>`);
      });
    }

    // Tentar escutar na porta
    const startListening = (p: number) => {
      serverInstance = expressApp!.listen(p, "127.0.0.1", () => {
        console.log(`[Express] Servidor ativo em http://127.0.0.1:${p}`);
        resolve(p);
      }).on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.log(`Porta ${p} em uso, tentando porta ${p + 1}...`);
          startListening(p + 1);
        } else {
          reject(err);
        }
      });
    };

    startListening(port);
  });
}

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Understand Anything Desktop",
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Em desenvolvimento, o Vite dev server do renderer roda em http://localhost:5174
  // Em produção, carregamos o index.html compilado do renderer
  const indexHtml = path.join(__dirname, "../renderer/index.html");
  if (fs.existsSync(indexHtml)) {
    mainWindow.loadFile(indexHtml);
  } else {
    mainWindow.loadURL("http://localhost:5174");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await startLocalServer();
    createWindow(port);

    // Salvar porta globalmente para uso no Renderer se necessário
    ipcMain.handle("get-server-info", () => {
      return { port, token: ACCESS_TOKEN };
    });
  } catch (err) {
    console.error("Falha ao iniciar servidor local:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (mainWindow === null) {
    const port = await startLocalServer();
    createWindow(port);
  }
});

// ── Registro de Canais IPC (Comunicação com o Renderer) ────────────────────

// Obter configurações
ipcMain.handle("get-settings", () => {
  return getSettings();
});

// Gravar configurações
ipcMain.handle("save-settings", (_, settings) => {
  saveSettings(settings);
  if (activeProjectPath) {
    const configPath = path.join(activeProjectPath, ".understand-anything/config.json");
    if (fs.existsSync(path.dirname(configPath))) {
      let currentConfig: any = {};
      if (fs.existsSync(configPath)) {
        try {
          currentConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } catch (_) {}
      }
      currentConfig.outputLanguage = settings.language || "en";
      try {
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), "utf-8");
      } catch (_) {}
    }
  }
  return { success: true };
});

// Seletor nativo de pasta de projeto
ipcMain.handle("select-project", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const projectPath = result.filePaths[0];
  activeProjectPath = projectPath;

  // Verificar se o grafo já existe
  const graphPath = path.join(projectPath, ".understand-anything/knowledge-graph.json");
  const hasGraph = fs.existsSync(graphPath);

  // Adicionar aos recentes
  const settings = getSettings();
  let recent = settings.recentProjects || [];
  recent = recent.filter((p: any) => p.path !== projectPath);
  recent.unshift({
    path: projectPath,
    name: path.basename(projectPath)
  });
  settings.recentProjects = recent.slice(0, 5);

  // Ler o idioma configurado do projeto, se existir
  let projectLanguage = settings.language || "en";
  const configPath = path.join(projectPath, ".understand-anything/config.json");
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.outputLanguage) {
        projectLanguage = cfg.outputLanguage;
        settings.language = projectLanguage;
      }
    } catch (_) {}
  }

  saveSettings(settings);

  return { 
    path: projectPath, 
    name: path.basename(projectPath), 
    hasGraph, 
    recentProjects: settings.recentProjects,
    language: projectLanguage
  };
});

// Abrir link no navegador padrão do sistema
ipcMain.on("open-external", (_, url) => {
  shell.openExternal(url);
});

// Carregar projeto recente
ipcMain.handle("load-project", (_, projectPath) => {
  activeProjectPath = projectPath;
  const graphPath = path.join(projectPath, ".understand-anything/knowledge-graph.json");
  const hasGraph = fs.existsSync(graphPath);

  // Atualizar a ordem da lista de recentes
  const settings = getSettings();
  let recent = settings.recentProjects || [];
  recent = recent.filter((p: any) => p.path !== projectPath);
  recent.unshift({
    path: projectPath,
    name: path.basename(projectPath)
  });
  settings.recentProjects = recent.slice(0, 5);

  // Ler o idioma configurado do projeto, se existir
  let projectLanguage = settings.language || "en";
  const configPath = path.join(projectPath, ".understand-anything/config.json");
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (cfg.outputLanguage) {
        projectLanguage = cfg.outputLanguage;
        settings.language = projectLanguage;
      }
    } catch (_) {}
  }

  saveSettings(settings);

  return { 
    path: projectPath, 
    name: path.basename(projectPath), 
    hasGraph, 
    recentProjects: settings.recentProjects,
    language: projectLanguage
  };
});

// Cancelar análise ativa
ipcMain.handle("cancel-analysis", () => {
  cancelActiveAnalysis();
  return { success: true };
});

// Confirmar estimativa de custo de análise
ipcMain.handle("confirm-analysis", (_, proceed) => {
  setAnalysisConfirmation(proceed);
  return { success: true };
});

// Iniciar a análise de código via IA
ipcMain.handle("start-analysis", async (event, { projectPath, options }) => {
  activeProjectPath = projectPath;
  const opts = options as AnalysisOptions;

  // Descobrir onde o plugin-root reside. No app empacotado, as skills 
  // estarão copiadas na pasta dist/skills, logo o root do plugin no runtime é dist/.
  // Como electron.js está em dist/main/, a pasta dist/ é o diretório pai (../).
  const pluginRoot = path.resolve(__dirname, "../");

  try {
    await runAnalysis(projectPath, opts, pluginRoot, (progress: ProgressUpdate) => {
      // Envia atualizações de progresso para a tela (Renderer)
      if (mainWindow) {
        mainWindow.webContents.send("analysis-progress-update", progress);
      }
    });
    return { success: true };
  } catch (err: any) {
    console.error("Erro na análise do projeto:", err);
    return { success: false, error: err.message || "Erro desconhecido durante o processamento." };
  }
});
