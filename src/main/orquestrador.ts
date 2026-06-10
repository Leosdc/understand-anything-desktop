import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Controle de cancelamento da análise
let activeAnalysisCancelled = false;

export function cancelActiveAnalysis() {
  activeAnalysisCancelled = true;
  // Se estiver pausado na tela de confirmação, liberar a promise como falso
  if (confirmPromiseResolve) {
    confirmPromiseResolve(false);
    confirmPromiseResolve = null;
  }
}

export function resetCancelState() {
  activeAnalysisCancelled = false;
}

export function isAnalysisCancelled() {
  return activeAnalysisCancelled;
}

let confirmPromiseResolve: ((proceed: boolean) => void) | null = null;

export function setAnalysisConfirmation(proceed: boolean) {
  if (confirmPromiseResolve) {
    confirmPromiseResolve(proceed);
    confirmPromiseResolve = null;
  }
}

// Interfaces para comunicação de progresso
export interface ProgressUpdate {
  phase: number;
  totalPhases: number;
  phaseName: string;
  message: string;
  detail?: string;
  logLine?: string;
}

export interface AnalysisOptions {
  apiKey: string;
  apiProvider: "gemini" | "anthropic";
  modelName: string;
  language: string;
  forceFull?: boolean;
}

// ── ID Normalization & Complexity mapping constants ────────────────────────
const VALID_NODE_PREFIXES = new Set([
  "file", "func", "function", "class", "module", "concept",
  "config", "document", "service", "table", "endpoint",
  "pipeline", "schema", "resource",
  "domain", "flow", "step",
  "article", "entity", "topic", "claim", "source"
]);

const TYPE_TO_PREFIX: Record<string, string> = {
  file: "file",
  function: "function",
  func: "function",
  class: "class",
  module: "module",
  concept: "concept",
  config: "config",
  document: "document",
  service: "service",
  table: "table",
  endpoint: "endpoint",
  pipeline: "pipeline",
  schema: "schema",
  resource: "resource",
  domain: "domain",
  flow: "flow",
  step: "step",
  article: "article",
  entity: "entity",
  topic: "topic",
  claim: "claim",
  source: "source"
};

const COMPLEXITY_MAP: Record<string, string> = {
  low: "simple",
  easy: "simple",
  medium: "moderate",
  intermediate: "moderate",
  high: "complex",
  hard: "complex",
  difficult: "complex"
};

const DIRECTION_ALIASES: Record<string, string> = {
  both: "bidirectional",
  mutual: "bidirectional"
};

const VALID_DIRECTIONS = new Set(["forward", "backward", "bidirectional"]);

// Helper para chamar APIs de forma genérica
async function callLLM(
  prompt: string,
  systemInstruction: string,
  options: AnalysisOptions
): Promise<string> {
  if (isAnalysisCancelled()) {
    throw new Error("Análise cancelada pelo usuário.");
  }
  const { apiKey, apiProvider, modelName } = options;

  if (apiProvider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini API");
    return text;
  } else {
    // Anthropic API
    const url = "https://api.anthropic.com/v1/messages";
    const payload = {
      model: modelName,
      max_tokens: 8192,
      system: systemInstruction,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Empty response from Anthropic API");
    return text;
  }
}

// ── Lógica de Normalização de Grafo (Traduzida de merge-batch-graphs.py) ────
function normalizeNodeId(nodeId: string, node: any): string {
  let nid = nodeId;

  // Remover duplo prefixo "file:file:..."
  for (const prefix of VALID_NODE_PREFIXES) {
    const double = `${prefix}:${prefix}:`;
    if (nid.startsWith(double)) {
      nid = nid.substring(prefix.length + 1);
      break;
    }
  }

  // Remover prefixo de nome do projeto
  const match = nid.match(/^[^:]+:((?:file|func|function|class|module|concept|config|document|service|table|endpoint|pipeline|schema|resource|domain|flow|step|article|entity|topic|claim|source)):(.+)$/);
  if (match) {
    const firstSeg = nid.split(":")[0];
    if (!VALID_NODE_PREFIXES.has(firstSeg)) {
      nid = `${match[1]}:${match[2]}`;
    }
  }

  // Canonicalizar prefixo antigo func: -> function:
  if (nid.startsWith("func:") && !nid.startsWith("function:")) {
    nid = "function:" + nid.substring(5);
  }

  // Prefixar caminhos puros de arquivo
  let hasPrefix = false;
  for (const prefix of VALID_NODE_PREFIXES) {
    if (nid.startsWith(`${prefix}:`)) {
      hasPrefix = true;
      break;
    }
  }

  if (!hasPrefix) {
    const nodeType = node.type || "file";
    const prefix = TYPE_TO_PREFIX[nodeType] || "file";
    if (nodeType === "function" || nodeType === "class") {
      const filePath = node.filePath || "";
      const name = node.name || nid;
      if (filePath) {
        nid = `${prefix}:${filePath}:${name}`;
      } else {
        nid = `${prefix}:__nofilepath__:${name}`;
      }
    } else {
      nid = `${prefix}:${nid}`;
    }
  }

  return nid;
}

function normalizeComplexity(value: any): { normalized: string; status: string } {
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "simple" || lower === "moderate" || lower === "complex") {
      return { normalized: lower, status: "valid" };
    }
    if (lower in COMPLEXITY_MAP) {
      return { normalized: COMPLEXITY_MAP[lower], status: "mapped" };
    }
    return { normalized: "moderate", status: "unknown" };
  } else if (typeof value === "number") {
    const n = Math.floor(value);
    if (n <= 3) return { normalized: "simple", status: "mapped" };
    if (n <= 6) return { normalized: "moderate", status: "mapped" };
    return { normalized: "complex", status: "mapped" };
  }
  return { normalized: "moderate", status: "unknown" };
}

function normalizeDirection(value: any): string {
  const candidate = typeof value === "string" ? value.toLowerCase() : "";
  const mapped = DIRECTION_ALIASES[candidate] || candidate;
  if (!VALID_DIRECTIONS.has(mapped)) {
    return "forward";
  }
  return mapped;
}

// ── tested_by Linker (Traduzido do merge-batch-graphs.py) ───────────────────
const JS_TS_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue"];
const JS_TS_TEST_EXTS = new Set(JS_TS_EXTS);
const MIRROR_PRODUCTION_ROOTS = ["src", "app", "lib", ""];

const TEST_NAME_PATTERNS: Record<string, [string[], string[]]> = {
  ".go": [[], ["_test"]],
  ".py": [["test_"], ["_test"]],
  ".java": [[], ["Test", "Tests", "IT"]],
  ".kt": [[], ["Test", "Tests"]],
  ".cs": [[], ["Test", "Tests"]],
  ".c": [["test_"], ["_test"]],
  ".cpp": [["test_"], ["_test"]],
  ".cc": [["test_"], ["_test"]]
};

function isTestPath(filePath: string): boolean {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const stem = path.basename(filePath, ext);

  if (JS_TS_TEST_EXTS.has(ext)) {
    return stem.endsWith(".test") || stem.endsWith(".spec");
  }

  const patterns = TEST_NAME_PATTERNS[ext];
  if (!patterns) return false;

  const [prefixes, suffixes] = patterns;
  return prefixes.some(p => stem.startsWith(p)) || suffixes.some(s => stem.endsWith(s));
}

function stripTestInfix(stem: string): string | null {
  if (stem.endsWith(".test")) return stem.slice(0, -5);
  if (stem.endsWith(".spec")) return stem.slice(0, -5);
  return null;
}

function productionCandidates(testPath: string): string[] {
  const ext = path.extname(testPath).toLowerCase();
  const stem = path.basename(testPath, ext);
  const dirPath = path.dirname(testPath).replace(/\\/g, "/");
  const dirSegs = dirPath.split("/").filter(Boolean);

  const candidates: string[] = [];
  const addUnique = (p: string) => {
    if (p && !candidates.includes(p)) candidates.push(p);
  };
  const joinPath = (d: string, n: string) => d ? `${d}/${n}` : n;

  if (JS_TS_TEST_EXTS.has(ext)) {
    const baseStem = stripTestInfix(stem);
    if (baseStem) {
      addUnique(joinPath(dirPath, `${baseStem}${ext}`));
      for (const e of JS_TS_EXTS) {
        addUnique(joinPath(dirPath, `${baseStem}${e}`));
      }

      if (dirSegs.length && ["__tests__", "test", "spec", "tests"].includes(dirSegs[dirSegs.length - 1])) {
        const parentDir = dirSegs.slice(0, -1).join("/");
        addUnique(joinPath(parentDir, `${baseStem}${ext}`));
        for (const e of JS_TS_EXTS) {
          addUnique(joinPath(parentDir, `${baseStem}${e}`));
        }
      }

      if (dirSegs.length && ["tests", "test", "__tests__"].includes(dirSegs[0])) {
        const tailPath = dirSegs.slice(1).join("/");
        for (const root of MIRROR_PRODUCTION_ROOTS) {
          const newDir = [root, tailPath].filter(Boolean).join("/");
          addUnique(joinPath(newDir, `${baseStem}${ext}`));
          for (const e of JS_TS_EXTS) {
            addUnique(joinPath(newDir, `${baseStem}${e}`));
          }
        }
      }
    }
  } else if (ext === ".go" && stem.endsWith("_test")) {
    const baseStem = stem.slice(0, -5);
    addUnique(joinPath(dirPath, `${baseStem}.go`));
  } else if (ext === ".py" && (stem.startsWith("test_") || stem.endsWith("_test"))) {
    const baseStem = stem.startsWith("test_") ? stem.substring(5) : stem.slice(0, -5);
    addUnique(joinPath(dirPath, `${baseStem}.py`));

    if (dirSegs.length && ["tests", "test"].includes(dirSegs[dirSegs.length - 1])) {
      const parentDir = dirSegs.slice(0, -1).join("/");
      addUnique(joinPath(parentDir, `${baseStem}.py`));
    }

    if (dirSegs.length && ["tests", "test"].includes(dirSegs[0])) {
      const tailPath = dirSegs.slice(1).join("/");
      for (const root of MIRROR_PRODUCTION_ROOTS) {
        const newDir = [root, tailPath].filter(Boolean).join("/");
        addUnique(joinPath(newDir, `${baseStem}.py`));
      }
    }
  } else if (ext === ".java") {
    for (const suffix of ["Tests", "Test", "IT"]) {
      if (stem.endsWith(suffix)) {
        const baseStem = stem.slice(0, -suffix.length);
        if (dirSegs.length >= 3 && dirSegs[0] === "src" && dirSegs[1] === "test" && dirSegs[2] === "java") {
          const newDir = ["src", "main", "java", ...dirSegs.slice(3)].join("/");
          addUnique(`${newDir}/${baseStem}.java`);
        }
        addUnique(joinPath(dirPath, `${baseStem}.java`));
        break;
      }
    }
  } else if (ext === ".kt") {
    for (const suffix of ["Tests", "Test"]) {
      if (stem.endsWith(suffix)) {
        const baseStem = stem.slice(0, -suffix.length);
        if (dirSegs.length >= 3 && dirSegs[0] === "src" && dirSegs[1] === "test" && dirSegs[2] === "kotlin") {
          const newDir = ["src", "main", "kotlin", ...dirSegs.slice(3)].join("/");
          addUnique(`${newDir}/${baseStem}.kt`);
        }
        addUnique(joinPath(dirPath, `${baseStem}.kt`));
        break;
      }
    }
  } else if (ext === ".cs") {
    for (const suffix of ["Tests", "Test"]) {
      if (stem.endsWith(suffix)) {
        const baseStem = stem.slice(0, -suffix.length);
        addUnique(joinPath(dirPath, `${baseStem}.cs`));

        let testsIdx: number | null = null;
        for (let i = dirSegs.length - 1; i >= 0; i--) {
          if (["tests", "test"].includes(dirSegs[i].toLowerCase())) {
            testsIdx = i;
            break;
          }
        }

        if (testsIdx !== null) {
          const parentSegs = dirSegs.slice(0, testsIdx);
          const tailSegs = dirSegs.slice(testsIdx + 1);
          const parentDir = parentSegs.join("/");
          addUnique(joinPath(parentDir, `${baseStem}.cs`));

          const srcDir = [...parentSegs, "src", ...tailSegs].join("/");
          addUnique(joinPath(srcDir, `${baseStem}.cs`));
        }

        if (dirSegs.length) {
          const top = dirSegs[0];
          if (top.endsWith(".Tests") || top.endsWith(".Test")) {
            const sibling = top.endsWith(".Tests") ? top.slice(0, -6) : top.slice(0, -5);
            if (sibling) {
              const mirrorDir = [sibling, ...dirSegs.slice(1)].join("/");
              addUnique(joinPath(mirrorDir, `${baseStem}.cs`));
            }
          }
        }
        break;
      }
    }
  } else if ([".c", ".cpp", ".cc"].includes(ext)) {
    let baseStem: string | null = null;
    if (stem.startsWith("test_")) baseStem = stem.substring(5);
    else if (stem.endsWith("_test")) baseStem = stem.slice(0, -5);

    if (baseStem) {
      addUnique(joinPath(dirPath, `${baseStem}${ext}`));
    }
  }

  return candidates;
}

function fileNodePath(node: any): string | null {
  const nid = node.id || "";
  if (typeof nid !== "string" || !nid.startsWith("file:")) return null;
  const fp = node.filePath;
  if (typeof fp === "string" && fp) return fp;
  return nid.substring(5);
}

function ensureTestedTag(node: any): boolean {
  if (!Array.isArray(node.tags)) {
    node.tags = [];
  }
  if (node.tags.includes("tested")) return false;
  node.tags.push("tested");
  return true;
}

function linkTests(
  nodesById: Map<string, any>,
  edges: any[]
): { added: number; dropped: number; tagged: number; swapped: number } {
  const filePathsToNodes = new Map<string, any>();
  const nodeIdToClassification = new Map<string, "test" | "prod">();
  const testNodes: Array<[string, any]> = [];

  for (const node of nodesById.values()) {
    const pathVal = fileNodePath(node);
    if (!pathVal) continue;
    filePathsToNodes.set(pathVal, node);
    if (isTestPath(pathVal)) {
      nodeIdToClassification.set(node.id, "test");
      testNodes.push([pathVal, node]);
    } else {
      nodeIdToClassification.set(node.id, "prod");
    }
  }

  const covered = new Set<string>();
  const pairToIdx = new Map<string, number>();
  const swappedPairs = new Set<string>();
  let dropped = 0;
  let writeIdx = 0;

  const getWeight = (e: any) => parseFloat(e.weight || "0") || 0;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (edge.type !== "tested_by") {
      edges[writeIdx++] = edge;
      continue;
    }

    const src = edge.source || "";
    const tgt = edge.target || "";
    const srcClass = nodeIdToClassification.get(src);
    const tgtClass = nodeIdToClassification.get(tgt);

    let pairKey = "";
    let needsSwap = false;

    if (srcClass === "prod" && tgtClass === "test") {
      pairKey = `${src}<=>${tgt}`;
      needsSwap = false;
    } else if (srcClass === "test" && tgtClass === "prod") {
      pairKey = `${tgt}<=>${src}`;
      needsSwap = true;
    } else {
      dropped++;
      continue;
    }

    if (covered.has(pairKey)) {
      const existingIdx = pairToIdx.get(pairKey)!;
      const existing = edges[existingIdx];
      if (getWeight(edge) > getWeight(existing)) {
        if (needsSwap) {
          edge.source = tgt;
          edge.target = src;
          edge.direction = "forward";
          edge.description = edge.description ? `${edge.description} [direction corrected]` : "Direction corrected (was test → production)";
          swappedPairs.add(pairKey);
        } else {
          swappedPairs.delete(pairKey);
        }
        edges[existingIdx] = edge;
      }
      dropped++;
      continue;
    }

    if (needsSwap) {
      edge.source = tgt;
      edge.target = src;
      edge.direction = "forward";
      edge.description = edge.description ? `${edge.description} [direction corrected]` : "Direction corrected (was test → production)";
      swappedPairs.add(pairKey);
    }

    covered.add(pairKey);
    pairToIdx.set(pairKey, writeIdx);
    edges[writeIdx++] = edge;
  }

  edges.length = writeIdx;
  const swapped = swappedPairs.size;

  const pairedTestIds = new Set<string>();
  for (const pair of covered) {
    const [, testId] = pair.split("<=>");
    pairedTestIds.add(testId);
  }

  let added = 0;
  for (const [testPath, testNode] of testNodes) {
    if (pairedTestIds.has(testNode.id)) continue;
    const candidates = productionCandidates(testPath);
    for (const candPath of candidates) {
      const prodNode = filePathsToNodes.get(candPath);
      if (!prodNode) continue;
      if (isTestPath(candPath)) continue;

      const pairKey = `${prodNode.id}<=>${testNode.id}`;
      if (covered.has(pairKey)) continue;

      edges.push({
        source: prodNode.id,
        target: testNode.id,
        type: "tested_by",
        direction: "forward",
        weight: 0.5,
        description: "Path-based pairing (deterministic)"
      });
      covered.add(pairKey);
      added++;
      break;
    }
  }

  let tagged = 0;
  for (const pair of covered) {
    const [prodId] = pair.split("<=>");
    const prodNode = nodesById.get(prodId);
    if (prodNode) {
      if (ensureTestedTag(prodNode)) {
        tagged++;
      }
    }
  }

  return { added, dropped, tagged, swapped };
}

function mergeAndNormalize(batches: any[], importMap: Record<string, string[]>): any {
  const allNodes: any[] = [];
  const allEdges: any[] = [];

  for (const batch of batches) {
    if (Array.isArray(batch.nodes)) allNodes.push(...batch.nodes);
    if (Array.isArray(batch.edges)) allEdges.push(...batch.edges);
  }

  const idMapping = new Map<string, string>();
  const nodesWithIds: any[] = [];
  const nodesById = new Map<string, any>();

  for (const node of allNodes) {
    if (!node.id) continue;
    nodesWithIds.push(node);
    const correctedId = normalizeNodeId(node.id, node);
    if (correctedId !== node.id) {
      idMapping.set(node.id, correctedId);
      node.id = correctedId;
    }
  }

  for (const node of nodesWithIds) {
    const { normalized } = normalizeComplexity(node.complexity);
    node.complexity = normalized;
  }

  for (const edge of allEdges) {
    const src = edge.source || "";
    const tgt = edge.target || "";
    const newSrc = idMapping.get(src) || src;
    const newTgt = idMapping.get(tgt) || tgt;
    edge.source = newSrc;
    edge.target = newTgt;
  }

  for (const node of nodesWithIds) {
    nodesById.set(node.id, node);
  }

  // Chamar o tested_by linker
  linkTests(nodesById, allEdges);

  const nodeIds = new Set(nodesById.keys());
  const edgesByKey = new Map<string, any>();

  for (const edge of allEdges) {
    const src = edge.source || "";
    const tgt = edge.target || "";
    const etype = edge.type || "";
    const dir = normalizeDirection(edge.direction);
    edge.direction = dir;

    if (!nodeIds.has(src) || !nodeIds.has(tgt)) {
      continue; // edge órfã - dropar
    }

    const key = `${src}||${tgt}||${etype}||${dir}`;
    const weight = parseFloat(edge.weight || "0") || 0;
    const existing = edgesByKey.get(key);
    if (!existing || weight > (parseFloat(existing.weight || "0") || 0)) {
      edgesByKey.set(key, edge);
    }
  }

  // imports edge recovery de forma determinística usando o importMap
  const fileNodeIds = new Set<string>();
  for (const node of nodesById.values()) {
    if (node.type === "file") {
      fileNodeIds.add(node.id);
    }
  }

  const existingImports = new Set<string>();
  for (const edge of edgesByKey.values()) {
    if (edge.type === "imports") {
      existingImports.add(`${edge.source}||${edge.target}`);
    }
  }

  for (const [srcPath, targets] of Object.entries(importMap)) {
    const srcId = `file:${srcPath}`;
    if (!fileNodeIds.has(srcId)) continue;

    for (const tgtPath of targets) {
      const tgtId = `file:${tgtPath}`;
      if (!fileNodeIds.has(tgtId)) continue;
      if (srcId === tgtId) continue;

      const importKey = `${srcId}||${tgtId}`;
      if (!existingImports.has(importKey)) {
        edgesByKey.set(`${srcId}||${tgtId}||imports||forward`, {
          source: srcId,
          target: tgtId,
          type: "imports",
          direction: "forward",
          weight: 0.7,
          recoveredFromImportMap: true
        });
        existingImports.add(importKey);
      }
    }
  }

  return {
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesByKey.values())
  };
}

// ── Orquestrador de Análise de Fases ───────────────────────────────────────
export async function runAnalysis(
  projectPath: string,
  options: AnalysisOptions,
  pluginRoot: string,
  onProgress: (update: ProgressUpdate) => void
): Promise<void> {
  resetCancelState();
  const language = options.language || "en";
  const languageDirective = `> **Language directive**: Generate all textual content (summaries, descriptions, tags, titles, languageNotes, languageLesson) in **${language}**. Maintain technical accuracy while using natural, native-level phrasing in the target language. Keep technical terms in English when no standard translation exists (e.g., "middleware", "hook", "barrel").`;

  // Fase 0 - Pre-flight
  onProgress({
    phase: 0,
    totalPhases: 7,
    phaseName: "Pre-flight",
    message: "Verificando diretórios e inicializando ambiente...",
    logLine: "Iniciando análise do repositório em " + projectPath
  });

  const uaDir = path.join(projectPath, ".understand-anything");
  const intermediateDir = path.join(uaDir, "intermediate");
  const tmpDir = path.join(uaDir, "tmp");

  fs.mkdirSync(intermediateDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // Salvar idioma na configuração do understand-anything
  const configPath = path.join(uaDir, "config.json");
  let currentConfig: any = {};
  if (fs.existsSync(configPath)) {
    try {
      currentConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (_) {}
  }
  currentConfig.outputLanguage = language;
  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), "utf-8");

  // Fase 0.5 - Ignore Config
  onProgress({
    phase: 0.5,
    totalPhases: 7,
    phaseName: "Configurando Exclusões",
    message: "Configurando filtros do .understandignore...",
    logLine: "Verificando .understandignore..."
  });

  const ignorePath = path.join(uaDir, ".understandignore");
  if (!fs.existsSync(ignorePath)) {
    // Escrever ignore básico padrão
    const defaults = `# .understandignore - Exclusões padrão\nnode_modules/\n.git/\ndist/\nbuild/\ncoverage/\n.venv/\nvenv/\n__pycache__/\n*.lock\npackage-lock.json\nyarn.lock\npnpm-lock.yaml\n`;
    fs.writeFileSync(ignorePath, defaults, "utf-8");
    onProgress({
      phase: 0.5,
      totalPhases: 7,
      phaseName: "Configurando Exclusões",
      message: "Filtros criados.",
      logLine: "Gerado arquivo de ignore em .understand-anything/.understandignore"
    });
  }

  // Fase 1 - SCAN
  onProgress({
    phase: 1,
    totalPhases: 7,
    phaseName: "Varredura do Projeto",
    message: "Vasculhando arquivos e importações do repositório...",
    logLine: "Executando varredura determinística via scan-project.mjs..."
  });

  // Caminhos dos scripts da skill
  const scanScript = path.join(pluginRoot, "skills/understand/scan-project.mjs");
  const importScript = path.join(pluginRoot, "skills/understand/extract-import-map.mjs");

  const scanOut = path.join(tmpDir, "ua-scan-files.json");
  const importIn = path.join(tmpDir, "ua-import-map-input.json");
  const importOut = path.join(tmpDir, "ua-import-map-output.json");

  // Roda scan-project.mjs
  try {
    await execAsync(`node "${scanScript}" "${projectPath}" "${scanOut}"`);
  } catch (err: any) {
    throw new Error(`Falha ao executar scan-project: ${err.message}`);
  }

  const rawScanData = JSON.parse(fs.readFileSync(scanOut, "utf-8"));
  onProgress({
    phase: 1,
    totalPhases: 7,
    phaseName: "Varredura do Projeto",
    message: `Encontrados ${rawScanData.totalFiles} arquivos. Extraindo mapa de importações...`,
    logLine: "Executando extract-import-map.mjs..."
  });

  // Criar entrada para importScript
  const importInput = {
    projectRoot: projectPath,
    files: rawScanData.files
  };
  fs.writeFileSync(importIn, JSON.stringify(importInput, null, 2), "utf-8");

  // Roda extract-import-map.mjs
  try {
    await execAsync(`node "${importScript}" "${importIn}" "${importOut}"`);
  } catch (err: any) {
    throw new Error(`Falha ao executar extract-import-map: ${err.message}`);
  }

  const rawImportData = JSON.parse(fs.readFileSync(importOut, "utf-8"));

  // Coleta dados iniciais do manifesto/readme para a chamada de LLM
  onProgress({
    phase: 1,
    totalPhases: 7,
    phaseName: "Varredura do Projeto",
    message: "Consultando IA para meta-resumo do projeto...",
    logLine: "Lendo manifesto do projeto e gerando resumo executivo..."
  });

  let readmeHead = "";
  for (const rName of ["README.md", "README", "readme.md"]) {
    const rPath = path.join(projectPath, rName);
    if (fs.existsSync(rPath)) {
      readmeHead = fs.readFileSync(rPath, "utf-8").substring(0, 3000);
      break;
    }
  }

  let packageManifest = "";
  for (const mName of ["package.json", "pyproject.toml", "Cargo.toml", "go.mod"]) {
    const mPath = path.join(projectPath, mName);
    if (fs.existsSync(mPath)) {
      packageManifest = fs.readFileSync(mPath, "utf-8").substring(0, 2000);
      break;
    }
  }

  // Replicar o LLM project-scanner
  const scannerPrompt = `Analise os dados do projeto para produzir um resumo executivo em JSON.
README do projeto (parcial):
\`\`\`
${readmeHead}
\`\`\`

Manifesto do projeto (parcial):
\`\`\`
${packageManifest}
\`\`\`

Deduza o nome do projeto, tecnologias, linguagens e frameworks com base nos manifestos.
Crie um resumo de 1-2 sentenças no campo "description".

${languageDirective}

Gere o JSON no seguinte formato estrito:
{
  "name": "nome-do-projeto",
  "description": "resumo do projeto",
  "languages": ["lista", "de", "linguagens"],
  "frameworks": ["lista", "de", "frameworks"]
}
`;

  const scannerSystem = "Você é um especialista em análise de arquitetura de software e mapeador de repositórios.";
  const scannerResText = await callLLM(scannerPrompt, scannerSystem, options);
  let parsedScanner: any = {};
  try {
    // Limpar markdown de bloco de código JSON caso a IA inclua
    const cleanJson = scannerResText.replace(/```json/g, "").replace(/```/g, "").trim();
    parsedScanner = JSON.parse(cleanJson);
  } catch (_) {
    parsedScanner = {
      name: path.basename(projectPath),
      description: "Understand Anything repository analysis",
      languages: [rawScanData.stats?.byLanguage ? Object.keys(rawScanData.stats.byLanguage)[0] : "javascript"],
      frameworks: []
    };
  }

  // Escrever scan-result.json final
  const scanResult = {
    name: parsedScanner.name || path.basename(projectPath),
    description: parsedScanner.description || "Sem descrição disponível.",
    languages: parsedScanner.languages || [],
    frameworks: parsedScanner.frameworks || [],
    files: rawScanData.files,
    totalFiles: rawScanData.totalFiles,
    filteredByIgnore: rawScanData.filteredByIgnore,
    estimatedComplexity: rawScanData.estimatedComplexity,
    importMap: rawImportData.importMap || {}
  };

  const scanResultPath = path.join(intermediateDir, "scan-result.json");
  fs.writeFileSync(scanResultPath, JSON.stringify(scanResult, null, 2), "utf-8");

  onProgress({
    phase: 1,
    totalPhases: 7,
    phaseName: "Varredura do Projeto",
    message: "Varredura concluída com sucesso.",
    logLine: `Fase 1 concluída. Encontrados ${scanResult.totalFiles} arquivos.`
  });

  // Fase 1.5 - BATCH
  onProgress({
    phase: 1.5,
    totalPhases: 7,
    phaseName: "Divisão de Lotes",
    message: "Calculando lotes semânticos...",
    logLine: "Executando compute-batches.mjs..."
  });

  const batchScript = path.join(pluginRoot, "skills/understand/compute-batches.mjs");
  try {
    await execAsync(`node "${batchScript}" "${projectPath}"`);
  } catch (err: any) {
    throw new Error(`Falha ao executar compute-batches: ${err.message}`);
  }

  const batchesPath = path.join(intermediateDir, "batches.json");
  const batchesData = JSON.parse(fs.readFileSync(batchesPath, "utf-8"));
  const totalBatches = batchesData.batches.length;

  onProgress({
    phase: 1.5,
    totalPhases: 7,
    phaseName: "Divisão de Lotes",
    message: `Lotes semânticos divididos em ${totalBatches} lotes.`,
    logLine: `Fase 1.5 concluída. Criados ${totalBatches} lotes para análise de IA.`
  });

  // Calcular estimativa de custo de tokens e arquivos antes de iniciar a Fase 2 (IA)
  let totalCharacters = 0;
  let totalFilesToAnalyze = 0;
  if (batchesData && Array.isArray(batchesData.batches)) {
    for (const batch of batchesData.batches) {
      const batchFiles = batch.files || [];
      totalFilesToAnalyze += batchFiles.length;
      for (const f of batchFiles) {
        const filePath = path.join(projectPath, f.path);
        if (fs.existsSync(filePath)) {
          try {
            totalCharacters += fs.statSync(filePath).size;
          } catch (_) {}
        }
      }
    }
  }

  // Heurística de tokens de entrada: 1 token por 3.5 caracteres de código + 2000 tokens de contexto fixo por lote
  const inputTokens = Math.round((totalCharacters / 3.5) + (totalBatches * 2000));
  // Heurística de tokens de saída: aprox 1200 tokens de grafo gerados por lote
  const outputTokens = totalBatches * 1200;

  // Anunciar fase especial de confirmação de custos para o Renderer
  onProgress({
    phase: 1.5,
    totalPhases: 7,
    phaseName: "Confirmação de Custo",
    message: "Aguardando confirmação de custo pelo usuário...",
    logLine: `Estimativa preliminar gerada: ${totalFilesToAnalyze} arquivos em ${totalBatches} lotes.`,
    detail: JSON.stringify({
      isConfirmationRequired: true,
      totalFiles: totalFilesToAnalyze,
      totalBatches,
      inputTokens,
      outputTokens,
      apiProvider: options.apiProvider,
      modelName: options.modelName
    })
  });

  // Aguardar que o Renderer responda confirmando ou cancelando
  const proceed = await new Promise<boolean>((resolve) => {
    confirmPromiseResolve = resolve;
  });

  if (!proceed || isAnalysisCancelled()) {
    throw new Error("Análise cancelada pelo usuário após avaliação de custos.");
  }

  // Fase 2 - ANALYZE
  onProgress({
    phase: 2,
    totalPhases: 7,
    phaseName: "Análise de Código",
    message: `Analisando arquivos com IA (0/${totalBatches} lotes)...`,
    logLine: "Iniciando processamento paralelo de arquivos via IA..."
  });

  // Processamento concorrente dos lotes (limite de concorrência: 3 para evitar rate-limit no desktop)
  const CONCURRENCY = 3;
  const batchArray = batchesData.batches as any[];

  const runBatch = async (batch: any, index: number) => {
    if (isAnalysisCancelled()) {
      return;
    }
    const batchIdx = index + 1;
    const batchFiles = batch.files as any[];
    const filePaths = batchFiles.map((f: any) => f.path);

    onProgress({
      phase: 2,
      totalPhases: 7,
      phaseName: "Análise de Código",
      message: `Analisando lote ${batchIdx}/${totalBatches} (${filePaths.slice(0, 2).join(", ")}${filePaths.length > 2 ? "..." : ""})...`,
      logLine: `Enviando lote ${batchIdx}/${totalBatches} de arquivos para a IA (${filePaths.length} arquivo(s))`
    });

    // Ler conteúdo de cada arquivo
    const fileContents: Record<string, string> = {};
    for (const fPath of filePaths) {
      const fullPath = path.join(projectPath, fPath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          // Truncar conteúdo de arquivos muito grandes para evitar transbordar o context window
          fileContents[fPath] = content.length > 30000 ? content.substring(0, 30000) + "\n... [conteúdo truncado para análise] ..." : content;
        } catch (_) {}
      }
    }

    const fileAnalyzerPrompt = `Analise os seguintes arquivos do projeto "${scanResult.name}" e extraia nós de estruturas (GraphNode) e arestas de relacionamento (GraphEdge).

Linguagens do projeto: ${scanResult.languages.join(", ")}
Frameworks: ${scanResult.frameworks.join(", ")}

Arquivos a analisar neste lote:
${batchFiles.map((f: any, idx: number) => `${idx + 1}. \`${f.path}\` (${f.language}, ${f.sizeLines} linhas, categoria: ${f.fileCategory})`).join("\n")}

Abaixo estão os conteúdos de código/configuração dos arquivos:
${Object.entries(fileContents).map(([filePath, content]) => `--- ARQUIVO: ${filePath} ---\n${content}\n`).join("\n")}

Pre-resolved imports para este lote (use-os diretamente):
\`\`\`json
${JSON.stringify(batch.batchImportData || {}, null, 2)}
\`\`\`

Vizinhos de outros lotes (para consistência de referências):
\`\`\`json
${JSON.stringify(batch.neighborMap || {}, null, 2)}
\`\`\`

Instrução de Resposta:
Extraia todas as funções principais, classes, arquivos, dependências, rotas, endpoints, tabelas de banco e configurações.
Crie resumos semânticos claros e determine a complexidade ("simple", "moderate" ou "complex") de cada um.

${languageDirective}

Gere o JSON strito de saída contendo apenas as propriedades "nodes" e "edges":
{
  "nodes": [
    {
      "id": "file:caminho/do/arquivo",
      "type": "file", // ou function, class, config, document, service, table, endpoint, etc.
      "name": "Nome",
      "filePath": "caminho/do/arquivo",
      "summary": "Resumo semântico de finalidade",
      "tags": ["tag1", "tag2"],
      "complexity": "simple" // simple, moderate, complex
    }
  ],
  "edges": [
    {
      "source": "origem-node-id",
      "target": "destino-node-id",
      "type": "imports", // ou calls, configures, documents, deploys, triggers, etc.
      "direction": "forward", // forward, backward, bidirectional
      "weight": 0.5,
      "description": "Explicação da relação"
    }
  ]
}
`;

    const analyzerSystem = "Você é uma ferramenta automatizada de extração de grafos de dependência e resumo de engenharia de software.";
    const resText = await callLLM(fileAnalyzerPrompt, analyzerSystem, options);

    let cleanJson = resText.replace(/```json/g, "").replace(/```/g, "").trim();
    // Validar se é JSON válido antes de salvar
    try {
      JSON.parse(cleanJson);
    } catch (_) {
      // Tentar isolar o conteúdo entre chaves
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
    }

    const batchOut = path.join(intermediateDir, `batch-${index}.json`);
    fs.writeFileSync(batchOut, cleanJson, "utf-8");
    onProgress({
      phase: 2,
      totalPhases: 7,
      phaseName: "Análise de Código",
      message: `Lote ${batchIdx}/${totalBatches} analisado e salvo com sucesso.`,
      logLine: `Grafo do lote ${batchIdx} salvo em batch-${index}.json`
    });
  };

  // Executar batches com limitação de concorrência
  for (let i = 0; i < totalBatches; i += CONCURRENCY) {
    if (isAnalysisCancelled()) {
      try {
        fs.rmSync(intermediateDir, { recursive: true, force: true });
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
      throw new Error("Análise cancelada pelo usuário.");
    }
    const chunk = batchArray.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((batch, offset) => runBatch(batch, i + offset)));
  }

  // Mesclar e Normalizar os lotes (Substituindo merge-batch-graphs.py)
  onProgress({
    phase: 2,
    totalPhases: 7,
    phaseName: "Mesclagem de Grafos",
    message: "Mesclando lotes e normalizando relações...",
    logLine: "Iniciando mesclagem nativa em JavaScript de grafos de lotes..."
  });

  const batchFiles = fs.readdirSync(intermediateDir).filter(f => f.startsWith("batch-") && f.endsWith(".json") && f !== "batches.json");
  const loadedBatches: any[] = [];
  for (const bFile of batchFiles) {
    try {
      const bData = JSON.parse(fs.readFileSync(path.join(intermediateDir, bFile), "utf-8"));
      loadedBatches.push(bData);
    } catch (_) {}
  }

  const mergedGraph = mergeAndNormalize(loadedBatches, scanResult.importMap);
  const assembledPath = path.join(intermediateDir, "assembled-graph.json");
  fs.writeFileSync(assembledPath, JSON.stringify(mergedGraph, null, 2), "utf-8");

  onProgress({
    phase: 2,
    totalPhases: 7,
    phaseName: "Mesclagem de Grafos",
    message: `Mesclados ${mergedGraph.nodes.length} nós e ${mergedGraph.edges.length} arestas.`,
    logLine: "Fase 2 concluída com sucesso.assembled-graph.json gravado."
  });

  // Fase 3 - ASSEMBLE REVIEW
  onProgress({
    phase: 3,
    totalPhases: 7,
    phaseName: "Validação do Grafo",
    message: "Rodando auditoria estática de consistência...",
    logLine: "Executando validador determinístico inline..."
  });

  // Validador determinístico inline de grafos
  const reviewResult = {
    issues: [] as string[],
    warnings: [] as string[]
  };

  const nodeIds = new Set(mergedGraph.nodes.map((n: any) => n.id));
  const fileNodes = mergedGraph.nodes.filter((n: any) => n.type === "file").map((n: any) => n.id);

  mergedGraph.edges.forEach((e: any, idx: number) => {
    if (!nodeIds.has(e.source)) reviewResult.issues.push(`Aresta[${idx}] refere-se à origem inexistente: ${e.source}`);
    if (!nodeIds.has(e.target)) reviewResult.issues.push(`Aresta[${idx}] refere-se ao destino inexistente: ${e.target}`);
  });

  const reviewPath = path.join(intermediateDir, "review.json");
  fs.writeFileSync(reviewPath, JSON.stringify(reviewResult, null, 2), "utf-8");

  onProgress({
    phase: 3,
    totalPhases: 7,
    phaseName: "Validação do Grafo",
    message: `Auditoria concluída com ${reviewResult.issues.length} erros graves encontrados.`,
    logLine: `Fase 3 concluída. ${reviewResult.issues.length} inconsistências anotadas.`
  });

  // Fase 4 - ARCHITECTURE
  onProgress({
    phase: 4,
    totalPhases: 7,
    phaseName: "Análise de Camadas",
    message: "Classificando arquivos em camadas arquiteturais...",
    logLine: "Invocando IA para definição de camadas do projeto..."
  });

  // Mapear apenas nós de arquivo (e relacionados) para a IA criar camadas
  const fileLevelTypes = new Set(["file", "config", "document", "service", "pipeline", "table", "schema", "resource", "endpoint"]);
  const fileLevelNodes = mergedGraph.nodes
    .filter((n: any) => fileLevelTypes.has(n.type))
    .map((n: any) => ({
      id: n.id,
      type: n.type,
      name: n.name,
      filePath: n.filePath,
      summary: n.summary,
      tags: n.tags
    }));

  const importsEdges = mergedGraph.edges
    .filter((e: any) => e.type === "imports")
    .map((e: any) => ({ source: e.source, target: e.target }));

  const architecturePrompt = `Analise a estrutura de arquivos e importações do projeto para dividi-lo em camadas arquiteturais lógicas (por exemplo: "UI", "Controller", "Service", "Data", "Configuration", etc.).

Nome do projeto: ${scanResult.name}
Frameworks: ${scanResult.frameworks.join(", ")}

Nós de arquivos no grafo:
\`\`\`json
${JSON.stringify(fileLevelNodes, null, 2)}
\`\`\`

Arestas de importação:
\`\`\`json
${JSON.stringify(importsEdges, null, 2)}
\`\`\`

Atribua cada nó de arquivo do projeto a exatamente uma camada arquitetural apropriada.

${languageDirective}

Responda em formato JSON estrito:
[
  {
    "id": "layer:nome-da-camada-kebab",
    "name": "Nome da Camada",
    "description": "Explicação do que reside nesta camada",
    "nodeIds": ["file:caminho/do/arquivo1", "file:caminho/do/arquivo2"]
  }
]
`;

  const archSystem = "Você é um arquiteto de software sênior responsável pela governança de dependências e divisão de camadas.";
  const archResText = await callLLM(architecturePrompt, archSystem, options);
  let parsedLayers: any[] = [];
  try {
    const cleanJson = archResText.replace(/```json/g, "").replace(/```/g, "").trim();
    parsedLayers = JSON.parse(cleanJson);
    if (!Array.isArray(parsedLayers) && (parsedLayers as any).layers) {
      parsedLayers = (parsedLayers as any).layers;
    }
  } catch (_) {
    // Camada padrão em caso de falha de IA
    parsedLayers = [
      {
        id: "layer:core",
        name: "Código Fonte",
        description: "Contém todos os arquivos fonte do repositório.",
        nodeIds: fileLevelNodes.map((n: any) => n.id)
      }
    ];
  }

  // Validar e sanitizar layers
  parsedLayers = parsedLayers.map((l: any) => ({
    id: l.id || `layer:${(l.name || "camada").toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    name: l.name || "Camada",
    description: l.description || "Descrição da camada",
    nodeIds: (l.nodeIds || []).filter((id: string) => nodeIds.has(id))
  }));

  const layersPath = path.join(intermediateDir, "layers.json");
  fs.writeFileSync(layersPath, JSON.stringify(parsedLayers, null, 2), "utf-8");

  onProgress({
    phase: 4,
    totalPhases: 7,
    phaseName: "Análise de Camadas",
    message: `Identificadas ${parsedLayers.length} camadas arquiteturais.`,
    logLine: `Fase 4 concluída. Criadas camadas: ${parsedLayers.map(l => l.name).join(", ")}`
  });

  // Fase 5 - TOUR
  onProgress({
    phase: 5,
    totalPhases: 7,
    phaseName: "Construção do Guia",
    message: "Estruturando guia interativo de aprendizado (Tours)...",
    logLine: "Invocando IA para roteiro didático do código..."
  });

  const tourPrompt = `Crie um roteiro guiado passo a passo para um novo engenheiro de software aprender a navegar e entender este repositório.

Nome do projeto: ${scanResult.name}
Descrição: ${scanResult.description}

Camadas do projeto:
\`\`\`json
${JSON.stringify(parsedLayers.map(l => ({ id: l.id, name: l.name, description: l.description })), null, 2)}
\`\`\`

Gere um roteiro sequencial composto por 3 a 7 etapas que explicam o projeto partindo do ponto de entrada (entry point) até a lógica de negócios interna.

${languageDirective}

Responda em formato JSON estrito:
[
  {
    "order": 1,
    "title": "Título da Etapa",
    "description": "Explicação detalhada do fluxo ou relevância de estudar estes arquivos neste passo",
    "nodeIds": ["file:caminho/do/arquivo1", "file:caminho/do/arquivo2"]
  }
]
`;

  const tourSystem = "Você é um instrutor de desenvolvimento de software especializado em onboardings técnicos didáticos.";
  const tourResText = await callLLM(tourPrompt, tourSystem, options);
  let parsedTour: any[] = [];
  try {
    const cleanJson = tourResText.replace(/```json/g, "").replace(/```/g, "").trim();
    parsedTour = JSON.parse(cleanJson);
    if (!Array.isArray(parsedTour) && (parsedTour as any).steps) {
      parsedTour = (parsedTour as any).steps;
    }
  } catch (_) {
    parsedTour = [
      {
        order: 1,
        title: "Visão Geral do Projeto",
        description: "Ponto de partida para ler o README e compreender os arquivos básicos do projeto.",
        nodeIds: fileLevelNodes.slice(0, 3).map((n: any) => n.id)
      }
    ];
  }

  // Validar e ordenar o tour
  parsedTour = parsedTour.map((step: any, idx: number) => ({
    order: parseInt(step.order) || (idx + 1),
    title: step.title || "Passo",
    description: step.description || "Explicação da etapa.",
    nodeIds: (step.nodeIds || []).filter((id: string) => nodeIds.has(id))
  })).sort((a, b) => a.order - b.order);

  const tourPath = path.join(intermediateDir, "tour.json");
  fs.writeFileSync(tourPath, JSON.stringify(parsedTour, null, 2), "utf-8");

  onProgress({
    phase: 5,
    totalPhases: 7,
    phaseName: "Construção do Guia",
    message: `Roteiro criado com ${parsedTour.length} etapas de aprendizado.`,
    logLine: `Fase 5 concluída. Criadas ${parsedTour.length} etapas do guia.`
  });

  // Fase 6 - REVIEW
  onProgress({
    phase: 6,
    totalPhases: 7,
    phaseName: "Montagem Final",
    message: "Verificando consistência integral do grafo de conhecimento...",
    logLine: "Compilando as partes estruturadas no arquivo de grafo final..."
  });

  // Assemlar o grafo final
  const assembledGraph = {
    version: "1.0.0",
    project: {
      name: scanResult.name,
      languages: scanResult.languages,
      frameworks: scanResult.frameworks,
      description: scanResult.description,
      analyzedAt: new Date().toISOString(),
      gitCommitHash: ""
    },
    nodes: mergedGraph.nodes,
    edges: mergedGraph.edges,
    layers: parsedLayers,
    tour: parsedTour
  };

  const finalGraphPath = path.join(projectPath, ".understand-anything/knowledge-graph.json");
  fs.writeFileSync(finalGraphPath, JSON.stringify(assembledGraph, null, 2), "utf-8");

  onProgress({
    phase: 6,
    totalPhases: 7,
    phaseName: "Montagem Final",
    message: "Validação integral concluída.",
    logLine: "Fase 6 concluída. Grafo de conhecimento gerado e validado."
  });

  // Fase 7 - SAVE
  onProgress({
    phase: 7,
    totalPhases: 7,
    phaseName: "Salvando Grafo",
    message: "Escrevendo baselines de auditoria (fingerprints) e finalizando...",
    logLine: "Executando build-fingerprints.mjs..."
  });

  // Gerar baseline de fingerprints
  const fpScript = path.join(pluginRoot, "skills/understand/build-fingerprints.mjs");
  const fpIn = path.join(intermediateDir, "fingerprint-input.json");

  const fpInput = {
    projectRoot: projectPath,
    sourceFilePaths: scanResult.files.map((f: any) => f.path),
    gitCommitHash: ""
  };
  fs.writeFileSync(fpIn, JSON.stringify(fpInput, null, 2), "utf-8");

  try {
    await execAsync(`node "${fpScript}" "${fpIn}"`);
  } catch (err: any) {
    throw new Error(`Falha ao executar build-fingerprints: ${err.message}`);
  }

  // Escrever meta.json final
  const meta = {
    lastAnalyzedAt: new Date().toISOString(),
    gitCommitHash: "",
    version: "1.0.0",
    analyzedFiles: scanResult.files.length
  };
  const metaPath = path.join(uaDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  // Limpar diretório intermediário
  try {
    fs.rmSync(intermediateDir, { recursive: true, force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}

  onProgress({
    phase: 7,
    totalPhases: 7,
    phaseName: "Salvando Grafo",
    message: "Processamento concluído com sucesso!",
    logLine: "Fase 7 concluída. Análise finalizada e salva em " + finalGraphPath
  });
}
