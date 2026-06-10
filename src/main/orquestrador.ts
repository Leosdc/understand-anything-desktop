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

const LOCALIZED_STRINGS: Record<string, Record<string, any>> = {
  en: {
    preflight: {
      phaseName: "Pre-flight",
      message: "Verifying directories and initializing environment...",
      logLine: (path: string) => `Starting repository analysis at ${path}`
    },
    exclusions: {
      phaseName: "Configuring Exclusions",
      message: "Configuring filters in .understandignore...",
      logLine: "Checking .understandignore...",
      created: "Filters created.",
      createdLog: "Generated ignore file at .understand-anything/.understandignore"
    },
    scan: {
      phaseName: "Project Scan",
      message: "Scanning repository files and imports...",
      logLine: "Running deterministic scan via scan-project.mjs...",
      found: (total: number) => `Found ${total} files. Extracting import map...`,
      extractingLog: "Running extract-import-map.mjs...",
      metadata: "Consulting AI for project metadata summary...",
      metadataLog: "Reading project manifest and generating executive summary...",
      success: "Scan completed successfully.",
      successLog: (total: number) => `Phase 1 completed. Found ${total} files.`
    },
    batches: {
      phaseName: "Split Semantic Batches",
      message: "Calculating semantic batches...",
      logLine: "Running compute-batches.mjs...",
      success: (total: number) => `Semantic batches split into ${total} batches.`,
      successLog: (total: number) => `Phase 1.5 completed. Created ${total} batches for AI analysis.`
    },
    cost: {
      phaseName: "Cost Confirmation",
      message: "Waiting for user cost confirmation...",
      logLine: (files: number, batches: number) => `Preliminary estimate generated: ${files} files in ${batches} batches.`
    },
    analyze: {
      phaseName: "Code Analysis",
      message: (batches: number) => `Analyzing files with AI (0/${batches} batches)...`,
      logLine: "Starting parallel file processing via AI...",
      batch: (idx: number, total: number, files: string) => `Analyzing batch ${idx}/${total} (${files})...`,
      batchLog: (idx: number, total: number, count: number) => `Sending batch ${idx}/${total} of files to AI (${count} file(s))`,
      success: (idx: number, total: number) => `Batch ${idx}/${total} analyzed and saved successfully.`,
      successLog: (idx: number, bIdx: number) => `Batch ${idx} graph saved to batch-${bIdx}.json`
    },
    merge: {
      phaseName: "Graph Merging",
      message: "Merging batches and normalizing relationships...",
      logLine: "Starting native JavaScript merge of batch graphs...",
      success: (nodes: number, edges: number) => `Merged ${nodes} nodes and ${edges} edges.`,
      successLog: "Phase 2 completed successfully. assembled-graph.json written."
    },
    validate: {
      phaseName: "Graph Validation",
      message: "Running static consistency audit...",
      logLine: "Running inline deterministic validator...",
      success: (errors: number) => `Audit completed with ${errors} critical errors found.`,
      successLog: (errors: number) => `Phase 3 completed. ${errors} inconsistencies noted.`
    },
    layers: {
      phaseName: "Layers Analysis",
      message: "Classifying files into architectural layers...",
      logLine: "Invoking AI to define project layers...",
      success: (count: number) => `Identified ${count} architectural layers.`,
      successLog: (layers: string) => `Phase 4 completed. Created layers: ${layers}`
    },
    tour: {
      phaseName: "Guide Construction",
      message: "Structuring interactive learning guide (Tours)...",
      logLine: "Invoking AI for pedagogical code guide...",
      success: (steps: number) => `Tour created with ${steps} learning steps.`,
      successLog: (steps: number) => `Phase 5 completed. Created ${steps} tour steps.`
    },
    assemble: {
      phaseName: "Final Assembling",
      message: "Verifying complete consistency of the knowledge graph...",
      logLine: "Compiling structured parts into the final graph file...",
      success: "Complete validation completed.",
      successLog: "Phase 6 completed. Knowledge graph generated and validated."
    },
    save: {
      phaseName: "Saving Graph",
      message: "Writing audit baselines (fingerprints) and finishing...",
      logLine: "Running build-fingerprints.mjs...",
      success: "Processing completed successfully!",
      successLog: (path: string) => `Phase 7 completed. Analysis finished and saved to ${path}`
    }
  },
  "pt-BR": {
    preflight: {
      phaseName: "Pre-flight",
      message: "Verificando diretórios e inicializando ambiente...",
      logLine: (path: string) => `Iniciando análise do repositório em ${path}`
    },
    exclusions: {
      phaseName: "Configurando Exclusões",
      message: "Configurando filtros do .understandignore...",
      logLine: "Verificando .understandignore...",
      created: "Filtros criados.",
      createdLog: "Gerado arquivo de ignore em .understand-anything/.understandignore"
    },
    scan: {
      phaseName: "Varredura do Projeto",
      message: "Vasculhando arquivos e importações do repositório...",
      logLine: "Executando varredura determinística via scan-project.mjs...",
      found: (total: number) => `Encontrados ${total} arquivos. Extraindo mapa de importações...`,
      extractingLog: "Executando extract-import-map.mjs...",
      metadata: "Consultando IA para meta-resumo do projeto...",
      metadataLog: "Lendo manifesto do projeto e gerando resumo executivo...",
      success: "Varredura concluída com sucesso.",
      successLog: (total: number) => `Fase 1 concluída. Encontrados ${total} arquivos.`
    },
    batches: {
      phaseName: "Divisão de Lotes",
      message: "Calculando lotes semânticos...",
      logLine: "Executando compute-batches.mjs...",
      success: (total: number) => `Lotes semânticos divididos em ${total} lotes.`,
      successLog: (total: number) => `Fase 1.5 concluída. Criados ${total} lotes para análise de IA.`
    },
    cost: {
      phaseName: "Confirmação de Custo",
      message: "Aguardando confirmação de custo pelo usuário...",
      logLine: (files: number, batches: number) => `Estimativa preliminar gerada: ${files} arquivos em ${batches} lotes.`
    },
    analyze: {
      phaseName: "Análise de Código",
      message: (batches: number) => `Analisando arquivos com IA (0/${batches} lotes)...`,
      logLine: "Iniciando processamento paralelo de arquivos via IA...",
      batch: (idx: number, total: number, files: string) => `Analisando lote ${idx}/${total} (${files})...`,
      batchLog: (idx: number, total: number, count: number) => `Enviando lote ${idx}/${total} de arquivos para a IA (${count} arquivo(s))`,
      success: (idx: number, total: number) => `Lote ${idx}/${total} analisado e salvo com sucesso.`,
      successLog: (idx: number, bIdx: number) => `Grafo do lote ${idx} salvo em batch-${bIdx}.json`
    },
    merge: {
      phaseName: "Mesclagem de Grafos",
      message: "Mesclando lotes e normalizando relações...",
      logLine: "Iniciando mesclagem nativa em JavaScript de grafos de lotes...",
      success: (nodes: number, edges: number) => `Mesclados ${nodes} nós e ${edges} arestas.`,
      successLog: "Fase 2 concluída com sucesso. assembled-graph.json gravado."
    },
    validate: {
      phaseName: "Validação do Grafo",
      message: "Rodando auditoria estática de consistência...",
      logLine: "Executando validador determinístico inline...",
      success: (errors: number) => `Auditoria concluída com ${errors} erros graves encontrados.`,
      successLog: (errors: number) => `Fase 3 concluída. ${errors} inconsistências anotadas.`
    },
    layers: {
      phaseName: "Análise de Camadas",
      message: "Classificando arquivos em camadas arquiteturais...",
      logLine: "Invocando IA para definição de camadas do projeto...",
      success: (count: number) => `Identificadas ${count} camadas arquiteturais.`,
      successLog: (layers: string) => `Fase 4 concluída. Criadas camadas: ${layers}`
    },
    tour: {
      phaseName: "Construção do Guia",
      message: "Estruturando guia interativo de aprendizado (Tours)...",
      logLine: "Invocando IA para roteiro didático do código...",
      success: (steps: number) => `Roteiro criado com ${steps} etapas de aprendizado.`,
      successLog: (steps: number) => `Fase 5 concluída. Criadas ${steps} etapas do guia.`
    },
    assemble: {
      phaseName: "Montagem Final",
      message: "Verificando consistência integral do grafo de conhecimento...",
      logLine: "Compilando as partes estruturadas no arquivo de grafo final...",
      success: "Validação integral concluída.",
      successLog: "Fase 6 concluída. Grafo de conhecimento gerado e validado."
    },
    save: {
      phaseName: "Salvando Grafo",
      message: "Escrevendo baselines de auditoria (fingerprints) e finalizando...",
      logLine: "Executando build-fingerprints.mjs...",
      success: "Processamento concluído com sucesso!",
      successLog: (path: string) => `Fase 7 concluída. Análise finalizada e salva em ${path}`
    }
  },
  es: {
    preflight: {
      phaseName: "Pre-flight",
      message: "Verificando directorios e inicializando entorno...",
      logLine: (path: string) => `Iniciando análisis del repositorio en ${path}`
    },
    exclusions: {
      phaseName: "Configurando Exclusiones",
      message: "Configurando filtros en .understandignore...",
      logLine: "Verificando .understandignore...",
      created: "Filtros creados.",
      createdLog: "Generado archivo de ignore en .understand-anything/.understandignore"
    },
    scan: {
      phaseName: "Escaneo del Proyecto",
      message: "Escaneando archivos e importaciones del repositorio...",
      logLine: "Ejecutando escaneo determinista vía scan-project.mjs...",
      found: (total: number) => `Encontrados ${total} archivos. Extrayendo mapa de importaciones...`,
      extractingLog: "Ejecutando extract-import-map.mjs...",
      metadata: "Consultando IA para meta-resumen del proyecto...",
      metadataLog: "Leyendo manifiesto del proyecto y generando resumen ejecutivo...",
      success: "Escaneo completado con éxito.",
      successLog: (total: number) => `Fase 1 completada. Encontrados ${total} archivos.`
    },
    batches: {
      phaseName: "División de Lotes",
      message: "Calculando lotes semánticos...",
      logLine: "Ejecutando compute-batches.mjs...",
      success: (total: number) => `Lotes semánticos divididos en ${total} lotes.`,
      successLog: (total: number) => `Fase 1.5 completada. Creados ${total} lotes para análisis de IA.`
    },
    cost: {
      phaseName: "Confirmación de Costo",
      message: "Esperando confirmación de costo por el usuario...",
      logLine: (files: number, batches: number) => `Estimación preliminar generada: ${files} archivos en ${batches} lotes.`
    },
    analyze: {
      phaseName: "Análisis de Código",
      message: (batches: number) => `Analizando archivos con IA (0/${batches} lotes)...`,
      logLine: "Iniciando procesamiento paralelo de archivos vía IA...",
      batch: (idx: number, total: number, files: string) => `Analizando lote ${idx}/${total} (${files})...`,
      batchLog: (idx: number, total: number, count: number) => `Enviando lote ${idx}/${total} de archivos a la IA (${count} archivo(s))`,
      success: (idx: number, total: number) => `Lote ${idx}/${total} analizado y guardado con éxito.`,
      successLog: (idx: number, bIdx: number) => `Gráfico del lote ${idx} guardado en batch-${bIdx}.json`
    },
    merge: {
      phaseName: "Fusión de Gráficos",
      message: "Fusionando lotes y normalizando relaciones...",
      logLine: "Iniciando fusión nativa en JavaScript de gráficos de lotes...",
      success: (nodes: number, edges: number) => `Fusionados ${nodes} nodos y ${edges} aristas.`,
      successLog: "Fase 2 completada con éxito. assembled-graph.json escrito."
    },
    validate: {
      phaseName: "Validación del Gráfico",
      message: "Ejecutando auditoría estática de consistencia...",
      logLine: "Ejecutando validador determinista inline...",
      success: (errors: number) => `Auditoría completada con ${errors} errores graves encontrados.`,
      successLog: (errors: number) => `Fase 3 completada. ${errors} inconsistencias anotadas.`
    },
    layers: {
      phaseName: "Análisis de Capas",
      message: "Clasificando archivos en capas arquitectónicas...",
      logLine: "Invocando IA para definición de capas del proyecto...",
      success: (count: number) => `Identificadas ${count} capas arquitectónicas.`,
      successLog: (layers: string) => `Fase 4 completada. Creadas capas: ${layers}`
    },
    tour: {
      phaseName: "Construcción de la Guía",
      message: "Estructurando guía interactiva de aprendizaje (Tours)...",
      logLine: "Invocando IA para ruta pedagógica del código...",
      success: (steps: number) => `Ruta creada con ${steps} etapas de aprendizaje.`,
      successLog: (steps: number) => `Fase 5 completada. Creadas ${steps} etapas de la guía.`
    },
    assemble: {
      phaseName: "Ensamblaje Final",
      message: "Verificando consistencia integral del gráfico de conocimiento...",
      logLine: "Compilando las partes estructuradas en el archivo de gráfico final...",
      success: "Validación integral completada.",
      successLog: "Fase 6 completada. Gráfico de conocimiento generado y validado."
    },
    save: {
      phaseName: "Guardando Gráfico",
      message: "Escribiendo baselines de auditoría (fingerprints) y finalizando...",
      logLine: "Ejecutando build-fingerprints.mjs...",
      success: "¡Procesamiento completado con éxito!",
      successLog: (path: string) => `Fase 7 completada. Análisis finalizado y guardado en ${path}`
    }
  },
  zh: {
    preflight: {
      phaseName: "预检阶段 (Pre-flight)",
      message: "正在验证目录并初始化环境...",
      logLine: (path: string) => `正在初始化位于 ${path} 的代码库分析`
    },
    exclusions: {
      phaseName: "配置排除规则",
      message: "正在配置 .understandignore 排除规则...",
      logLine: "正在检查 .understandignore 文件...",
      created: "排除规则创建成功。",
      createdLog: "已在 .understand-anything/.understandignore 生成默认排除文件"
    },
    scan: {
      phaseName: "代码库扫描",
      message: "正在扫描代码库中的文件和导入关系...",
      logLine: "正在通过 scan-project.mjs 执行确定性扫描...",
      found: (total: number) => `找到 ${total} 个文件。正在提取导入依赖关系图...`,
      extractingLog: "正在执行 extract-import-map.mjs...",
      metadata: "正在请求 AI 生成项目元数据总结...",
      metadataLog: "正在读取项目清单文件并生成执行摘要...",
      success: "扫描成功完成。",
      successLog: (total: number) => `第 1 阶段已完成。共找到 ${total} 个文件。`
    },
    batches: {
      phaseName: "语义分批",
      message: "正在计算语义分析批次...",
      logLine: "正在执行 compute-batches.mjs...",
      success: (total: number) => `语义批次已成功划分为 ${total} 个批次。`,
      successLog: (total: number) => `第 1.5 阶段已完成。共创建 ${total} 个 AI 分析批次。`
    },
    cost: {
      phaseName: "费用确认",
      message: "正在等待用户确认费用...",
      logLine: (files: number, batches: number) => `已生成初步估算：共 ${files} 个文件，分为 ${batches} 个批次。`
    },
    analyze: {
      phaseName: "代码分析",
      message: (batches: number) => `正在使用 AI 分析文件 (共 0/${batches} 批)...`,
      logLine: "正在启动 AI 文件的并行处理...",
      batch: (idx: number, total: number, files: string) => `正在分析批次 ${idx}/${total} (${files})...`,
      batchLog: (idx: number, total: number, count: number) => `正在发送第 ${idx}/${total} 批文件给 AI (共 ${count} 个文件)`,
      success: (idx: number, total: number) => `批次 ${idx}/${total} 分析并保存成功。`,
      successLog: (idx: number, bIdx: number) => `批次 ${idx} 的图谱已保存至 batch-${bIdx}.json`
    },
    merge: {
      phaseName: "图谱合并",
      message: "正在合并批次并归一化逻辑关系...",
      logLine: "正在启动原生 JavaScript 批次图谱合并...",
      success: (nodes: number, edges: number) => `已合并 ${nodes} 个节点和 ${edges} 条边。`,
      successLog: "第 2 阶段已完成。已生成 assembled-graph.json。"
    },
    validate: {
      phaseName: "图谱验证",
      message: "正在执行静态一致性审核...",
      logLine: "正在执行内联确定性验证...",
      success: (errors: number) => `审核完成，共发现 ${errors} 个严重错误。`,
      successLog: (errors: number) => `第 3 阶段已完成。已标记 ${errors} 处不一致。`
    },
    layers: {
      phaseName: "架构分层",
      message: "正在将文件归类到逻辑架构层中...",
      logLine: "正在调用 AI 定义项目的架构层...",
      success: (count: number) => `已识别出 ${count} 个架构层。`,
      successLog: (layers: string) => `第 4 阶段已完成。已创建架构层：${layers}`
    },
    tour: {
      phaseName: "编写学习路线",
      message: "正在构建交互式学习指南路线 (Tours)...",
      logLine: "正在调用 AI 生成代码教学指南...",
      success: (steps: number) => `已成功创建包含 ${steps} 个步骤的学习路线。`,
      successLog: (steps: number) => `第 5 阶段已完成。已创建 ${steps} 个教学步骤。`
    },
    assemble: {
      phaseName: "最终装配",
      message: "正在校验知识图谱的完整一致性...",
      logLine: "正在将各部分装配编译到最终图谱文件中...",
      success: "完整校验已完成。",
      successLog: "第 6 阶段已完成。知识图谱已生成并校验通过。"
    },
    save: {
      phaseName: "保存图谱",
      message: "正在编写审核基线 (fingerprints) 并收尾...",
      logLine: "正在执行 build-fingerprints.mjs...",
      success: "处理圆满完成！",
      successLog: (path: string) => `第 7 阶段已完成。分析已结束并保存至 ${path}`
    }
  },
  ja: {
    preflight: {
      phaseName: "事前確認 (Pre-flight)",
      message: "ディレクトリの確認および環境の初期化中...",
      logLine: (path: string) => `${path} でリポジトリ分析を初期化中...`
    },
    exclusions: {
      phaseName: "除外設定",
      message: ".understandignore 除外ルールの設定中...",
      logLine: ".understandignore ファイルの確認中...",
      created: "フィルターが作成されました。",
      createdLog: "デフォルトの除外ファイルを .understand-anything/.understandignore に生成しました"
    },
    scan: {
      phaseName: "プロジェクトスキャン",
      message: "リポジトリのファイルとインポート関係のスキャン中...",
      logLine: "scan-project.mjs による確定的なスキャンを実行中...",
      found: (total: number) => `${total} 個のファイルが見つかりました。インポート関係図を抽出中...`,
      extractingLog: "extract-import-map.mjs を実行中...",
      metadata: "AI にプロジェクトメタデータの要約を要求中...",
      metadataLog: "プロジェクトマニフェストファイルを読み込み、要約を生成中...",
      success: "スキャンが正常に完了しました。",
      successLog: (total: number) => `フェーズ 1 が完了しました。計 ${total} 個のファイルが見つかりました。`
    },
    batches: {
      phaseName: "セマンティック分割",
      message: "セマンティック分析バッチの計算中...",
      logLine: "compute-batches.mjs を実行中...",
      success: (total: number) => `バッチが ${total} 個に正常に分割されました。`,
      successLog: (total: number) => `フェーズ 1.5 が完了しました。計 ${total} 個の AI 分析バッチが作成されました。`
    },
    cost: {
      phaseName: "コスト確認",
      message: "ユーザーによるコスト確認を待機中...",
      logLine: (files: number, batches: number) => `予備見積もり生成完了：計 ${files} ファイル、${batches} バッチ。`
    },
    analyze: {
      phaseName: "コード分析",
      message: (batches: number) => `AI を使用してファイルを分析中 (計 0/${batches} バッチ)...`,
      logLine: "AI によるファイルの並行処理を起動中...",
      batch: (idx: number, total: number, files: string) => `バッチ ${idx}/${total} (${files}) を分析中...`,
      batchLog: (idx: number, total: number, count: number) => `AI に第 ${idx}/${total} バッチを送信中 (計 ${count} ファイル)`,
      success: (idx: number, total: number) => `バッチ ${idx}/${total} の分析と保存に成功しました。`,
      successLog: (idx: number, bIdx: number) => `バッチ ${idx} のグラフが batch-${bIdx}.json に保存されました`
    },
    merge: {
      phaseName: "グラフの統合",
      message: "バッチの統合および論理関係の正規化中...",
      logLine: "ネイティブの JavaScript によるバッチグラフの統合を起動中...",
      success: (nodes: number, edges: number) => `${nodes} 個のノードと ${edges} 個のエッジを統合しました。`,
      successLog: "フェーズ 2 が完了しました。assembled-graph.json を出力しました。"
    },
    validate: {
      phaseName: "グラフの検証",
      message: "静的整合性の監査を実行中...",
      logLine: "インライン確定的検証を実行中...",
      success: (errors: number) => `監査が完了しました。計 ${errors} 個の重大なエラーが検出されました。`,
      successLog: (errors: number) => `フェーズ 3 が完了しました。${errors} 箇所の不整合が記録されました。`
    },
    layers: {
      phaseName: "アーキテクチャ階層化",
      message: "ファイルを論理的なアーキテクチャ層に分類中...",
      logLine: "AI にプロジェクトのレイヤー定義を要求中...",
      success: (count: number) => `${count} 個のアーキテクチャレイヤーが特定されました。`,
      successLog: (layers: string) => `フェーズ 4 が完了しました。作成されたレイヤー：${layers}`
    },
    tour: {
      phaseName: "ツアー作成",
      message: "インタラクティブな学習ガイドツアー (Tours) を構築中...",
      logLine: "AI にコードチュートリアルガイドの作成を要求中...",
      success: (steps: number) => `${steps} ステップの学習ガイドツアーが作成されました。`,
      successLog: (steps: number) => `フェーズ 5 が完了しました。${steps} 個のツアー手順を作成しました。`
    },
    assemble: {
      phaseName: "最終アセンブリ",
      message: "知識グラフの完全な整合性を検証中...",
      logLine: "各構成パーツを最終グラフファイルにアセンブリ中...",
      success: "完全検証が完了しました。",
      successLog: "フェーズ 6 が完了しました。知識グラフが生成され、検証に合格しました。"
    },
    save: {
      phaseName: "グラフの保存",
      message: "監査基準 (fingerprints) の書き込みおよび終了処理中...",
      logLine: "build-fingerprints.mjs を実行中...",
      success: "すべての処理が正常に完了しました！",
      successLog: (path: string) => `フェーズ 7 が完了しました。分析が終了し、${path} に保存されました`
    }
  }
};

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
  const t = LOCALIZED_STRINGS[language] || LOCALIZED_STRINGS.en;
  const languageDirective = `> **Language directive**: Generate all textual content (summaries, descriptions, tags, titles, languageNotes, languageLesson) in **${language}**. Maintain technical accuracy while using natural, native-level phrasing in the target language. Keep technical terms in English when no standard translation exists (e.g., "middleware", "hook", "barrel").`;

  // Fase 0 - Pre-flight
  onProgress({
    phase: 0,
    totalPhases: 7,
    phaseName: t.preflight.phaseName,
    message: t.preflight.message,
    logLine: t.preflight.logLine(projectPath)
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
    phaseName: t.exclusions.phaseName,
    message: t.exclusions.message,
    logLine: t.exclusions.logLine
  });

  const ignorePath = path.join(uaDir, ".understandignore");
  if (!fs.existsSync(ignorePath)) {
    // Escrever ignore básico padrão
    const defaults = `# .understandignore - Exclusões padrão\nnode_modules/\n.git/\ndist/\nbuild/\ncoverage/\n.venv/\nvenv/\n__pycache__/\n*.lock\npackage-lock.json\nyarn.lock\npnpm-lock.yaml\n`;
    fs.writeFileSync(ignorePath, defaults, "utf-8");
    onProgress({
      phase: 0.5,
      totalPhases: 7,
      phaseName: t.exclusions.phaseName,
      message: t.exclusions.created,
      logLine: t.exclusions.createdLog
    });
  }

  // Fase 1 - SCAN
  onProgress({
    phase: 1,
    totalPhases: 7,
    phaseName: t.scan.phaseName,
    message: t.scan.message,
    logLine: t.scan.logLine
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
    phaseName: t.scan.phaseName,
    message: t.scan.found(rawScanData.totalFiles),
    logLine: t.scan.extractingLog
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
    phaseName: t.scan.phaseName,
    message: t.scan.metadata,
    logLine: t.scan.metadataLog
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
    phaseName: t.scan.phaseName,
    message: t.scan.success,
    logLine: t.scan.successLog(scanResult.totalFiles)
  });

  // Fase 1.5 - BATCH
  onProgress({
    phase: 1.5,
    totalPhases: 7,
    phaseName: t.batches.phaseName,
    message: t.batches.message,
    logLine: t.batches.logLine
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
    phaseName: t.batches.phaseName,
    message: t.batches.success(totalBatches),
    logLine: t.batches.successLog(totalBatches)
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
    phaseName: t.cost.phaseName,
    message: t.cost.message,
    logLine: t.cost.logLine(totalFilesToAnalyze, totalBatches),
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
    phaseName: t.analyze.phaseName,
    message: t.analyze.message(totalBatches),
    logLine: t.analyze.logLine
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
      phaseName: t.analyze.phaseName,
      message: t.analyze.batch(batchIdx, totalBatches, `${filePaths.slice(0, 2).join(", ")}${filePaths.length > 2 ? "..." : ""}`),
      logLine: t.analyze.batchLog(batchIdx, totalBatches, filePaths.length)
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
      phaseName: t.analyze.phaseName,
      message: t.analyze.success(batchIdx, totalBatches),
      logLine: t.analyze.successLog(batchIdx, index)
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
    phaseName: t.merge.phaseName,
    message: t.merge.message,
    logLine: t.merge.logLine
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
    phaseName: t.merge.phaseName,
    message: t.merge.success(mergedGraph.nodes.length, mergedGraph.edges.length),
    logLine: t.merge.successLog
  });

  // Fase 3 - ASSEMBLE REVIEW
  onProgress({
    phase: 3,
    totalPhases: 7,
    phaseName: t.validate.phaseName,
    message: t.validate.message,
    logLine: t.validate.logLine
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
    phaseName: t.validate.phaseName,
    message: t.validate.success(reviewResult.issues.length),
    logLine: t.validate.successLog(reviewResult.issues.length)
  });

  // Fase 4 - ARCHITECTURE
  onProgress({
    phase: 4,
    totalPhases: 7,
    phaseName: t.layers.phaseName,
    message: t.layers.message,
    logLine: t.layers.logLine
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
    phaseName: t.layers.phaseName,
    message: t.layers.success(parsedLayers.length),
    logLine: t.layers.successLog(parsedLayers.map(l => l.name).join(", "))
  });

  // Fase 5 - TOUR
  onProgress({
    phase: 5,
    totalPhases: 7,
    phaseName: t.tour.phaseName,
    message: t.tour.message,
    logLine: t.tour.logLine
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
    phaseName: t.tour.phaseName,
    message: t.tour.success(parsedTour.length),
    logLine: t.tour.successLog(parsedTour.length)
  });

  // Fase 6 - REVIEW
  onProgress({
    phase: 6,
    totalPhases: 7,
    phaseName: t.assemble.phaseName,
    message: t.assemble.message,
    logLine: t.assemble.logLine
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
    phaseName: t.assemble.phaseName,
    message: t.assemble.success,
    logLine: t.assemble.successLog
  });

  // Fase 7 - SAVE
  onProgress({
    phase: 7,
    totalPhases: 7,
    phaseName: t.save.phaseName,
    message: t.save.message,
    logLine: t.save.logLine
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
    phaseName: t.save.phaseName,
    message: t.save.success,
    logLine: t.save.successLog(finalGraphPath)
  });
}
