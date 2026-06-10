import { useState, useEffect, useRef } from "react";
import { Folder, Key, Play, ArrowLeft, RefreshCw, ExternalLink, ShieldAlert, Sparkles, CheckCircle, Terminal, HelpCircle, History, Github } from "lucide-react";
// @ts-ignore
import mascoteImg from "./assets/mascote.png";

declare global {
  interface Window {
    api: {
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<any>;
      selectProject: () => Promise<{ path: string; name: string; hasGraph: boolean; recentProjects: any[]; language?: string } | null>;
      loadProject: (projectPath: string) => Promise<{ path: string; name: string; hasGraph: boolean; recentProjects: any[]; language?: string }>;
      cancelAnalysis: () => Promise<{ success: boolean }>;
      confirmAnalysis: (proceed: boolean) => Promise<{ success: boolean }>;
      startAnalysis: (payload: { projectPath: string; options: any }) => Promise<{ success: boolean; error?: string }>;
      getServerInfo: () => Promise<{ port: number; token: string }>;
      openExternal: (url: string) => void;
      getIgnoreFile: (projectPath: string) => Promise<string>;
      saveIgnoreFile: (projectPath: string, content: string) => Promise<{ success: boolean }>;
      onProgressUpdate: (callback: (progress: any) => void) => () => void;
    };
  }
}

interface ProgressState {
  phase: number;
  totalPhases: number;
  phaseName: string;
  message: string;
  detail?: string;
  logLine?: string;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: "Understand Anything Desktop",
    subtitle: "Generate and explore interactive knowledge graphs of any codebase.",
    provider: "AI Provider",
    model: "AI Model",
    apiKey: "API Key",
    show: "Show",
    hide: "Hide",
    apiKeyPlaceholder: "Enter your API Key...",
    langLabel: "Graph & Dashboard Language",
    projectFolder: "Project Folder",
    selectFolderBtn: "Select Folder",
    selectFolderPlaceholder: "No project directory selected...",
    graphFound: "Existing knowledge graph found in the folder!",
    graphNotFound: "No existing graph found in this folder. New analysis required.",
    analyzeBtn: "Analyze Repository",
    updateBtn: "Update Analysis",
    openDashboardBtn: "Open Dashboard",
    recentProjects: "Recent Projects",
    helpTitle: "How does the analysis work?",
    helpP1: "Understand Anything decomposes your code repository into 7 phases of structural and semantic analysis to generate an interactive three-dimensional graph.",
    helpQ1: "Why does Phase 2 (Code Analysis) take time?",
    helpA1: "In Phase 2, the project is divided into batches of related files. The complete code content of each batch is sent to the AI (Gemini or Claude) to read logic, classify real dependencies, and describe the purpose of each file. For large projects, this requires sequential API calls, which can take 10 to 30 minutes.",
    helpTips: "💡 Tips to speed up the analysis:",
    helpTip1: "Configure Exclusions: Create or edit the .understandignore file in your project's .understand-anything/ folder. Ignore heavy folders like node_modules/, dist/, .git/, builds, logs, and static assets.",
    helpTip2: "Scoped Analysis: Instead of opening the root folder of a large repository, try selecting a specific subfolder that represents your system's core logic.",
    helpQ2: "Why not just generate the graph and apply AI later?",
    helpA2: "Conventional static graphs (like deterministic import maps) are generated in seconds. However, our differentiator is semantic intelligence: the AI extracts hidden logical relationships (API endpoints, dynamic dependencies, database structures) that raw static text analysis cannot capture. We plan to support a fast offline graph mode with on-demand AI insights in the future.",
    helpUnderstandBtn: "Got it",
    phaseLabel: "Phase",
    ofLabel: "of",
    processingLogs: "Processing Logs",
    noLogs: "No logs available...",
    cancelBtn: "Cancel",
    analysisInterrupted: "Analysis interrupted by the user.",
    apiKeyRequired: "API key is required to perform AI-based analysis.",
    errorTitle: "Execution Error",
    backBtn: "Back",
    reloadGraphBtn: "Reload Graph",
    openBrowserBtn: "Open in Browser",
    initializing: "Initializing",
    connecting: "Connecting to repository orchestrator...",
    costTitle: "Confirm Cost Estimate",
    costMessage: "Understand Anything will analyze the codebase using the selected AI model. Based on the file scan, here is the estimated consumption:",
    costFiles: "Files to Analyze",
    costBatches: "AI Request Batches",
    costTokens: "Estimated Input / Output Tokens",
    costEstimate: "Estimated AI API Cost",
    costContinue: "Confirm & Proceed",
    costAbort: "Cancel Analysis",
    ignoreTitle: "Exclude Rules (.understandignore)",
    ignorePlaceholder: "Enter ignore patterns (e.g., node_modules/)...",
    ignoreRecommended: "Recommended to exclude:",
    saveRecalculate: "Save & Recalculate",
    ignoreHelp: "Excluding heavy folders (like node_modules, dist, .git, etc.) prevents high AI costs and speeds up analysis."
  },
  "pt-BR": {
    title: "Understand Anything Desktop",
    subtitle: "Gere e explore grafos de conhecimento interativos de qualquer base de código.",
    provider: "Provedor de IA",
    model: "Modelo de IA",
    apiKey: "API Key",
    show: "Exibir",
    hide: "Ocultar",
    apiKeyPlaceholder: "Insira sua chave de API...",
    langLabel: "Idioma do Grafo & Dashboard",
    projectFolder: "Pasta do Projeto",
    selectFolderBtn: "Selecionar Pasta",
    selectFolderPlaceholder: "Nenhum diretório de projeto selecionado...",
    graphFound: "Grafo de conhecimento existente encontrado na pasta!",
    graphNotFound: "Nenhum grafo existente encontrado nesta pasta. Nova análise necessária.",
    analyzeBtn: "Analisar Repositório",
    updateBtn: "Atualizar Análise",
    openDashboardBtn: "Abrir Dashboard",
    recentProjects: "Projetos Recentes",
    helpTitle: "Como Funciona a Análise?",
    helpP1: "O Understand Anything decompõe seu repositório de código em 7 fases de análise estrutural e semântica para gerar um grafo interativo tridimensional.",
    helpQ1: "Por que a Fase 2 (Análise de Código) é demorada?",
    helpA1: "Na Fase 2, o projeto é dividido em lotes (batches) de arquivos relacionados. O conteúdo completo de cada lote é enviado à IA (Gemini ou Claude) para ler a lógica do código, classificar dependências reais e descrever a finalidade de cada arquivo. Se seu projeto possui muitos arquivos e pastas (ex: centenas de arquivos), esse processo requer chamadas sequenciais pesadas à API, podendo levar de 10 a 30 minutos.",
    helpTips: "💡 Dicas para acelerar a análise:",
    helpTip1: "Configure Exclusões: Crie ou edite o arquivo .understandignore na pasta .understand-anything/ de seu projeto. Ignore pastas pesadas como node_modules/, dist/, .git/, builds, logs e arquivos estáticos.",
    helpTip2: "Análise Escopada: Em vez de abrir a pasta raiz de um grande repositório, tente selecionar uma subpasta específica que represente a lógica principal do seu sistema.",
    helpQ2: "Por que não gerar apenas o grafo e aplicar a IA depois?",
    helpA2: "Grafos estáticos convencionais (como mapas de importações determinísticos) são gerados em segundos. Porém, o diferencial do Understand Anything é a inteligência semântica: a IA extrai relações lógicas ocultas (chamadas de endpoints de API, dependências dinâmicas, estruturas de banco de dados e propósitos) que a análise estática pura de texto não consegue capturar. No entanto, temos planos futuros para suportar um modo 'Grafo offline rápido' e gerar insights por IA de forma sob demanda.",
    helpUnderstandBtn: "Entendido",
    phaseLabel: "Fase",
    ofLabel: "de",
    processingLogs: "Logs de Processamento",
    noLogs: "Nenhum log disponível...",
    cancelBtn: "Cancelar",
    analysisInterrupted: "Análise interrompida pelo usuário.",
    apiKeyRequired: "A chave de API é obrigatória para executar análises baseadas em IA.",
    errorTitle: "Erro de Execução",
    backBtn: "Voltar",
    reloadGraphBtn: "Recarregar Grafo",
    openBrowserBtn: "Abrir no Navegador",
    initializing: "Initializing",
    connecting: "Conectando-se ao orquestrador do repositório...",
    costTitle: "Confirmar Estimativa de Custo",
    costMessage: "O Understand Anything analisará a base de código usando o modelo de IA selecionado. Com base na varredura local, este é o consumo estimado:",
    costFiles: "Arquivos para Analisar",
    costBatches: "Lotes de Envio (Batches)",
    costTokens: "Tokens Estimados (Entrada / Saída)",
    costEstimate: "Custo Estimado da API de IA",
    costContinue: "Confirmar e Continuar",
    costAbort: "Cancelar Análise",
    ignoreTitle: "Regras de Exclusão (.understandignore)",
    ignorePlaceholder: "Digite os padrões de ignore (ex: node_modules/)...",
    ignoreRecommended: "Recomendado excluir:",
    saveRecalculate: "Salvar & Recalcular",
    ignoreHelp: "Excluir pastas pesadas (como node_modules, dist, .git, etc.) evita custos elevados com a IA e acelera a análise."
  },
  es: {
    title: "Understand Anything Desktop",
    subtitle: "Genera y explora grafos de conocimiento interactivos de cualquier base de código.",
    provider: "Proveedor de IA",
    model: "Modelo de IA",
    apiKey: "Clave API",
    show: "Mostrar",
    hide: "Ocultar",
    apiKeyPlaceholder: "Introduce tu clave API...",
    langLabel: "Idioma del Gráfico y Tablero",
    projectFolder: "Carpeta del Proyecto",
    selectFolderBtn: "Seleccionar Carpeta",
    selectFolderPlaceholder: "Ningún directorio de proyecto seleccionado...",
    graphFound: "¡Gráfico de conocimiento existente encontrado en la carpeta!",
    graphNotFound: "No se encontró ningún gráfico existente en esta carpeta. Se requiere un nuevo análisis.",
    analyzeBtn: "Analizar Repositorio",
    updateBtn: "Actualizar Análisis",
    openDashboardBtn: "Abrir Tablero",
    recentProjects: "Proyectos Recientes",
    helpTitle: "¿Cómo funciona el análisis?",
    helpP1: "Understand Anything descompone su repositorio de código en 7 fases de análisis estructural y semántico para generar un gráfico tridimensional interactivo.",
    helpQ1: "¿Por qué la Fase 2 (Análisis de Código) requiere tiempo?",
    helpA1: "En la Fase 2, el proyecto se divide en lotes de archivos relacionados. El contenido completo de cada lote se envía a la IA (Gemini o Claude) para leer la lógica, clasificar dependencias reales y describir el propósito de cada archivo. Para proyectos grandes, esto requiere llamadas secuenciales a la API, que pueden tardar de 10 a 30 minutos.",
    helpTips: "💡 Consejos para acelerar el análisis:",
    helpTip1: "Configurar Exclusiones: Cree o edite el archivo .understandignore en la carpeta .understand-anything/ de su proyecto. Ignore carpetas pesadas como node_modules/, dist/, .git/, compilaciones, registros y activos estáticos.",
    helpTip2: "Análisis Escopado: En lugar de abrir la carpeta raíz de un repositorio grande, intente seleccionar una subcarpeta específica que represente la lógica principal de su sistema.",
    helpQ2: "¿Por qué no generar solo el gráfico y aplicar la IA después?",
    helpA2: "Los gráficos estáticos convencionales (como mapas de importación deterministas) se generan en segundos. Sin embargo, nuestro diferenciador es la inteligencia semántica: la IA extrae relaciones lógicas ocultas (puntos finales de API, dependencias dinámicas, estructuras de bases de datos) que el análisis estático de texto no puede capturar. Planeamos admitir un modo de gráfico rápido fuera de línea con información de IA bajo demanda en el futuro.",
    helpUnderstandBtn: "Entendido",
    phaseLabel: "Fase",
    ofLabel: "de",
    processingLogs: "Registros de Procesamiento",
    noLogs: "No hay registros disponibles...",
    cancelBtn: "Cancelar",
    analysisInterrupted: "Análisis interrumpido por el usuario.",
    apiKeyRequired: "La clave API es obligatoria para realizar análisis basados en IA.",
    errorTitle: "Error de Ejecución",
    backBtn: "Volver",
    reloadGraphBtn: "Recargar Gráfico",
    openBrowserBtn: "Abrir en el Navegador",
    initializing: "Initializing",
    connecting: "Conectando al orquestrador del repositorio...",
    costTitle: "Confirmar Estimación de Costo",
    costMessage: "Understand Anything analizará el código utilizando el modelo de IA seleccionado. Basado en el escaneo local, este es el consumo estimado:",
    costFiles: "Archivos a Analizar",
    costBatches: "Lotes de Envío (Batches)",
    costTokens: "Tokens Estimados (Entrada / Salida)",
    costEstimate: "Costo Estimado de la API de IA",
    costContinue: "Confirmar y Continuar",
    costAbort: "Cancelar Análisis",
    ignoreTitle: "Reglas de Exclusión (.understandignore)",
    ignorePlaceholder: "Ingrese patrones de exclusión (ej: node_modules/)...",
    ignoreRecommended: "Recomendado excluir:",
    saveRecalculate: "Guardar y Recalcular",
    ignoreHelp: "Excluir carpetas pesadas (como node_modules, dist, .git, etc.) evita costos elevados de IA y acelera el análisis."
  },
  zh: {
    title: "Understand Anything Desktop",
    subtitle: "生成并探索任何代码库的交互式 3D 知识图谱。",
    provider: "AI 服务商",
    model: "AI 模型",
    apiKey: "API 密钥",
    show: "显示",
    hide: "隐藏",
    apiKeyPlaceholder: "请输入您的 API 密钥...",
    langLabel: "图谱与仪表板语言",
    projectFolder: "项目文件夹",
    selectFolderBtn: "选择文件夹",
    selectFolderPlaceholder: "未选择项目目录...",
    graphFound: "在文件夹中找到现有的知识图谱！",
    graphNotFound: "此文件夹中未找到现有图谱。需要重新分析。",
    analyzeBtn: "分析代码库",
    updateBtn: "更新分析",
    openDashboardBtn: "打开仪表板",
    recentProjects: "最近的项目",
    helpTitle: "分析是如何工作的？",
    helpP1: "Understand Anything 将您的代码库分解为 7 个结构和语义分析阶段，以生成交互式三维图谱。",
    helpQ1: "为什么第 2 阶段（代码分析）需要时间？",
    helpA1: "在第 2 阶段，项目被分成相关文件的批次。每个批次的完整代码内容发送给 AI（Gemini 或 Claude），以读取逻辑、分类实际依赖关系并描述每个文件的用途。对于大型项目，这需要顺序的 API 调用，可能需要 10 到 30 分钟。",
    helpTips: "💡 加快分析的提示：",
    helpTip1: "配置排除项：在项目的 .understand-anything/ 文件夹中创建或编辑 .understandignore 文件。忽略重型文件夹，如 node_modules/、dist/、.git/、构建、日志和静态资产。",
    helpTip2: "范围分析：不要打开大型存储库的根文件夹，尝试选择代表系统核心逻辑的特定子文件夹。",
    helpQ2: "为什么不直接生成图谱然后再应用 AI 呢？",
    helpA2: "常规静态图谱（如确定性导入图）在几秒钟内生成。然而，我们的区别在于语义智能：AI 提取隐藏的逻辑关系（API 端点、动态依赖、数据库结构），这是原始静态文本分析无法捕捉的。我们计划在未来支持带有按需 AI 见解快速离线图谱模式。",
    helpUnderstandBtn: "明白",
    phaseLabel: "阶段",
    ofLabel: "的",
    processingLogs: "处理日志",
    noLogs: "无可用日志...",
    cancelBtn: "取消",
    analysisInterrupted: "用户中断了分析。",
    apiKeyRequired: "执行基于 AI 的分析需要 API 密钥。",
    errorTitle: "执行错误",
    backBtn: "返回",
    reloadGraphBtn: "重新加载图谱",
    openBrowserBtn: "在浏览器中打开",
    initializing: "正在初始化",
    connecting: "正在连接到存储库编排器...",
    costTitle: "确认费用估算",
    costMessage: "Understand Anything 将使用所选的 AI 模型分析代码库。根据本地扫描，估算消耗如下：",
    costFiles: "待分析文件数",
    costBatches: "AI 请求批次",
    costTokens: "估算输入/输出 Token 数",
    costEstimate: "估算 AI API 费用",
    costContinue: "确认并继续",
    costAbort: "取消分析",
    ignoreTitle: "排除规则 (.understandignore)",
    ignorePlaceholder: "输入忽略模式 (例如 node_modules/)...",
    ignoreRecommended: "推荐排除：",
    saveRecalculate: "保存并重新计算",
    ignoreHelp: "排除大型文件夹 (如 node_modules、dist、.git 等) 可避免高昂的 AI 成本并加快分析速度。"
  },
  ja: {
    title: "Understand Anything Desktop",
    subtitle: "任意のコードベースのインタラクティブな 3D 知識グラフを生成して探索します。",
    provider: "AI プロバイダー",
    model: "AI モデル",
    apiKey: "API キー",
    show: "表示",
    hide: "非表示",
    apiKeyPlaceholder: "API キーを入力してください...",
    langLabel: "グラフとダッシュボードの言語",
    projectFolder: "プロジェクトフォルダ",
    selectFolderBtn: "フォルダを選択",
    selectFolderPlaceholder: "プロジェクトディレクトリが選択されていません...",
    graphFound: "グラフが見つかりました！",
    graphNotFound: "グラフが見つかりません。分析が必要です。",
    analyzeBtn: "リポジトリを分析",
    updateBtn: "分析を更新",
    openDashboardBtn: "ダッシュボードを開く",
    recentProjects: "最近のプロジェクト",
    helpTitle: "分析はどのように機能しますか？",
    helpP1: "Understand Anything は、コードリポジトリを 7 つの構造的および意味的分析フェーズに分解し、インタラクティブな 3 次元グラフを生成します。",
    helpQ1: "フェーズ 2（コード分析）に時間がかかるのはなぜですか？",
    helpA1: "フェーズ 2 では、プロジェクトは関連するファイルのバッチに分割されます。各バッチの完全なコード内容は AI（Gemini または Claude）に送信され、ロジックを読み取り、実際の依存関係を分類し、各ファイルの目的を説明します。大規模なプロジェクトでは、これに連続した API 呼び出しが必要になり、10 〜 30 分かかる場合があります。",
    helpTips: "💡 分析を高速化するためのヒント：",
    helpTip1: "除外の設定：プロジェクトの .understand-anything/ フォルダにある .understandignore ファイルを作成または編集します。node_modules/、dist/、.git/、ビルド、ログ、静的アセットなどの重いフォルダを無視します。",
    helpTip2: "スコープ分析：大規模なリポジトリのルートフォルダを開く代わりに、システムのコアロジックを表す特定のサブフォルダを選択してみてください。",
    helpQ2: "グラフだけを生成して、後から AI を適用すればいいのでは？",
    helpA2: "従来の静的グラフ（決定的なインポートマップなど）は数秒で生成されます。しかし、私たちの強みは意味的インテリジェンスです。AI は、生の静的テキスト分析ではキャプチャできない隠れた論理関係（API エンドポイント、動的依存、データベース構造）を抽出します。将来的には、オンデマンドの AI インサイトを備えた高速オフライングラフモードをサポートする予定です。",
    helpUnderstandBtn: "了解",
    phaseLabel: "フェーズ",
    ofLabel: "の",
    processingLogs: "処理ログ",
    noLogs: "ログはありません...",
    cancelBtn: "キャンセル",
    analysisInterrupted: "ユーザーによって分析が中断されました。",
    apiKeyRequired: "AI ベースの分析を実行するには API キーが必要です。",
    errorTitle: "実行エラー",
    backBtn: "戻る",
    reloadGraphBtn: "グラフを再読み込み",
    openBrowserBtn: "ブラウザで開く",
    initializing: "初期化中",
    connecting: "リポジトリオーケストレーターに接続中...",
    costTitle: "コスト見積もりの確認",
    costMessage: "Understand Anything は、選択された AI モデルを使用してコードベースを分析します。ローカルスキャンに基づく見積もり消費量は以下の通りです：",
    costFiles: "分析対象ファイル数",
    costBatches: "AI リクエストバッチ",
    costTokens: "見積もり入力/出力トークン",
    costEstimate: "見積もり AI API コスト",
    costContinue: "確認して続行",
    costAbort: "分析をキャンセル",
    ignoreTitle: "除外ルール (.understandignore)",
    ignorePlaceholder: "除外パターンを入力してください (例: node_modules/)...",
    ignoreRecommended: "除外を推奨:",
    saveRecalculate: "保存して再計算",
    ignoreHelp: "重いフォルダ (node_modules、dist、.git など) を除外することで、AIのコストを抑え、分析を高速化できます。"
  }
};

export default function App() {
  const [view, setView] = useState<"setup" | "progress" | "dashboard">("setup");
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"gemini" | "anthropic">("gemini");
  const [modelName, setModelName] = useState("gemini-2.5-flash");
  const [language, setLanguage] = useState("en");
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [hasGraph, setHasGraph] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [costDetail, setCostDetail] = useState<any | null>(null);

  const recalculatingRef = useRef(false);
  const [ignoreContent, setIgnoreContent] = useState("");
  const [hasSavedIgnore, setHasSavedIgnore] = useState(false);

  const [analysisError, setAnalysisError] = useState("");
  const [progress, setProgress] = useState<ProgressState>({
    phase: 0,
    totalPhases: 7,
    phaseName: "",
    message: ""
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [serverInfo, setServerInfo] = useState<{ port: number; token: string } | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Carregar configurações iniciais e informações do servidor Express
  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (settings) {
        setApiKey(settings.apiKey || "");
        setApiProvider(settings.apiProvider || "gemini");
        setModelName(settings.modelName || "gemini-2.5-flash");
        setLanguage(settings.language || "en");
        setRecentProjects(settings.recentProjects || []);
      }
    });

    window.api.getServerInfo().then((info) => {
      setServerInfo(info);
    });
  }, []);

  // Rolagem automática do console de logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Carregar conteúdo do arquivo .understandignore ao exibir detalhes de custo
  useEffect(() => {
    if (costDetail && projectPath) {
      window.api.getIgnoreFile(projectPath).then((content) => {
        setIgnoreContent(content || "");
      });
    }
  }, [costDetail, projectPath]);

  // Escutar eventos de progresso da análise enviados pelo processo Main
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (view === "progress") {
      unsubscribe = window.api.onProgressUpdate((update: ProgressState) => {
        setProgress(update);
        if (update.logLine) {
          setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${update.logLine}`]);
        }
        if (update.detail) {
          try {
            const parsed = JSON.parse(update.detail);
            if (parsed.isConfirmationRequired) {
              setCostDetail(parsed);
            }
          } catch (_) {}
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [view]);

  // Handler para selecionar pasta do projeto
  const handleSelectProject = async () => {
    const project = (await window.api.selectProject()) as { path: string; name: string; hasGraph: boolean; recentProjects: any[]; language?: string } | null;
    if (project) {
      setProjectPath(project.path);
      setProjectName(project.name);
      setHasGraph(project.hasGraph);
      if (project.recentProjects) {
        setRecentProjects(project.recentProjects);
      }
      if (project.language) {
        setLanguage(project.language);
      }
    }
  };

  // Handler para carregar pasta do projeto a partir do histórico
  const handleLoadProject = async (path: string) => {
    const project = (await window.api.loadProject(path)) as { path: string; name: string; hasGraph: boolean; recentProjects: any[]; language?: string };
    if (project) {
      setProjectPath(project.path);
      setProjectName(project.name);
      setHasGraph(project.hasGraph);
      if (project.recentProjects) {
        setRecentProjects(project.recentProjects);
      }
      if (project.language) {
        setLanguage(project.language);
      }
    }
  };

  // Handler para salvar as API Keys e provedores nas configurações locais
  const handleSaveSettings = async () => {
    await window.api.saveSettings({ apiKey, apiProvider, modelName, language });
  };

  // Handler para cancelar análise ativa
  const handleCancelAnalysis = async () => {
    await window.api.cancelAnalysis();
    setView("setup");
    setAnalysisError(t.analysisInterrupted);
  };

  // Iniciar o pipeline de análise
  const handleStartAnalysis = async () => {
    if (!projectPath) return;
    if (!apiKey) {
      setAnalysisError(t.apiKeyRequired);
      return;
    }

    setAnalysisError("");
    setLogs([]);
    setCostDetail(null);
    setHasSavedIgnore(false);
    setView("progress");
    setProgress({
      phase: 0,
      totalPhases: 7,
      phaseName: t.initializing,
      message: t.connecting
    });

    // Salvar as configurações antes de rodar
    await handleSaveSettings();

    const result = await window.api.startAnalysis({
      projectPath,
      options: { apiKey, apiProvider, modelName, language }
    });

    if (result.success) {
      setHasGraph(true);
      setView("dashboard");
    } else {
      if (recalculatingRef.current) {
        recalculatingRef.current = false;
        handleStartAnalysis();
        return;
      }
      setAnalysisError(result.error || "Erro desconhecido durante o processamento do grafo.");
      setView("setup");
    }
  };

  // Abrir o dashboard do projeto ativo
  const handleOpenDashboard = () => {
    if (hasGraph && serverInfo) {
      setView("dashboard");
    }
  };

  // Link do dashboard
  const getDashboardUrl = () => {
    if (!serverInfo) return "";
    return `http://127.0.0.1:${serverInfo.port}/?token=${serverInfo.token}`;
  };

  // Abrir o dashboard no navegador externo
  const handleOpenExternal = () => {
    const url = getDashboardUrl();
    if (url) {
      window.api.openExternal(url);
    }
  };

  const getEstimatedCostText = () => {
    if (!costDetail) return "$0.00";
    const { inputTokens, outputTokens, apiProvider, modelName } = costDetail;
    let inputRate = 0;
    let outputRate = 0;

    if (apiProvider === "gemini") {
      if (modelName.includes("pro")) {
        // Gemini 2.5 Pro e Gemini 1.5 Pro
        inputRate = 1.25 / 1000000;
        outputRate = 5.00 / 1000000;
      } else { 
        // Gemini 2.5 Flash, Gemini 1.5 Flash e Gemini 2.0 Flash
        inputRate = 0.075 / 1000000;
        outputRate = 0.30 / 1000000;
      }
    } else { // anthropic
      if (modelName.includes("opus")) {
        // Claude 3 Opus
        inputRate = 15.00 / 1000000;
        outputRate = 75.00 / 1000000;
      } else if (modelName.includes("haiku")) {
        if (modelName.includes("3-5")) {
          // Claude 3.5 Haiku
          inputRate = 0.80 / 1000000;
          outputRate = 4.00 / 1000000;
        } else {
          // Claude 3 Haiku
          inputRate = 0.25 / 1000000;
          outputRate = 1.25 / 1000000;
        }
      } else {
        // Claude 3.5 Sonnet e Claude 3 Sonnet
        inputRate = 3.00 / 1000000;
        outputRate = 15.00 / 1000000;
      }
    }

    const cost = (inputTokens * inputRate) + (outputTokens * outputRate);
    if (cost < 0.005) return "USD < $0.01 (Extremamente Barato)";
    return `USD $${cost.toFixed(3)}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* ── Tela 1: Configuração e Onboarding ──────────────────────────────── */}
      {view === "setup" && (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", padding: "40px 20px", overflowY: "auto", height: "100%" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "32px", margin: "auto" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)", borderRadius: "12px", padding: "10px", display: "flex" }}>
                  <Sparkles size={32} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.025em" }} className="glow-text">
                    {t.title}
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
                    {t.subtitle}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelpModal(true)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", color: "var(--text-secondary)", transition: "color 0.2s" }}
                title="Ajuda / Como Funciona"
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                <HelpCircle size={24} />
              </button>
            </div>

            {analysisError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid var(--error)", borderRadius: "8px", padding: "16px", marginBottom: "24px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <ShieldAlert size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ color: "var(--error)", fontWeight: 600, fontSize: "0.95rem" }}>{t.errorTitle}</h4>
                  <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", marginTop: "4px" }}>{analysisError}</p>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="form-group">
                <label className="form-label">{t.provider}</label>
                <select 
                  className="input-control" 
                  value={apiProvider} 
                  onChange={(e) => {
                    const prov = e.target.value as "gemini" | "anthropic";
                    setApiProvider(prov);
                    const defaultModel = prov === "gemini" ? "gemini-2.5-flash" : "claude-3-5-sonnet-20241022";
                    setModelName(defaultModel);
                    window.api.saveSettings({ apiKey, apiProvider: prov, modelName: defaultModel, language });
                  }}
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t.model}</label>
                <select 
                  className="input-control" 
                  value={modelName} 
                  onChange={(e) => {
                    const model = e.target.value;
                    setModelName(model);
                    window.api.saveSettings({ apiKey, apiProvider, modelName: model, language });
                  }}
                >
                  {apiProvider === "gemini" ? (
                    <>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Padrão Rápido)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Altíssima Inteligência)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legado Rápido)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legado Avançado)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (Preview Rápido)</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet v2 (Padrão Inteligência)</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Rápido & Econômico)</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus (Máxima Complexidade)</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Legado Médio)</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku (Legado Rápido)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ position: "relative" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.apiKey}</span>
                <span 
                  style={{ color: "var(--primary)", cursor: "pointer", fontSize: "0.8rem" }} 
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? t.hide : t.show}
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <Key size={18} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "14px" }} />
                <input 
                  type={showApiKey ? "text" : "password"} 
                  className="input-control" 
                  placeholder={t.apiKeyPlaceholder}
                  style={{ paddingLeft: "42px" }}
                  value={apiKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setApiKey(key);
                    window.api.saveSettings({ apiKey: key, apiProvider, modelName, language });
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t.langLabel}</label>
              <select 
                className="input-control" 
                value={language} 
                onChange={(e) => {
                  const lang = e.target.value;
                  setLanguage(lang);
                  window.api.saveSettings({ apiKey, apiProvider, modelName, language: lang });
                }}
              >
                <option value="en">English (Default)</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="es">Español</option>
                <option value="zh">简体中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div style={{ height: "1px", background: "var(--panel-border)", margin: "24px 0" }}></div>

            <div className="form-group">
              <label className="form-label">{t.projectFolder}</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-secondary" onClick={handleSelectProject} style={{ gap: "8px", flexShrink: 0 }}>
                  <Folder size={18} />
                  {t.selectFolderBtn}
                </button>
                <input 
                  type="text" 
                  className="input-control" 
                  readOnly 
                  placeholder={t.selectFolderPlaceholder}
                  value={projectPath}
                />
              </div>
              {projectPath && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", fontSize: "0.85rem" }}>
                  {hasGraph ? (
                    <>
                      <CheckCircle size={14} color="var(--success)" />
                      <span style={{ color: "var(--text-secondary)" }}>
                        {t.graphFound}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={14} color="var(--warning)" />
                      <span style={{ color: "var(--text-secondary)" }}>
                        {t.graphNotFound}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {recentProjects.length > 0 && (
              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <History size={14} />
                  <span>{t.recentProjects}</span>
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "110px", overflowY: "auto", paddingRight: "4px" }}>
                  {recentProjects.map((p, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleLoadProject(p.path)}
                      style={{ 
                        background: projectPath === p.path ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        border: `1px solid ${projectPath === p.path ? "var(--primary)" : "var(--panel-border)"}`,
                        borderRadius: "8px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (projectPath !== p.path) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (projectPath !== p.path) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                          e.currentTarget.style.borderColor = "var(--panel-border)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                      </div>
                      <Folder size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
              <button 
                className={`btn btn-primary ${!projectPath ? "btn-disabled" : ""}`} 
                onClick={handleStartAnalysis} 
                disabled={!projectPath}
                style={{ flex: 1 }}
              >
                <Play size={18} />
                {hasGraph ? t.updateBtn : t.analyzeBtn}
              </button>
              
              {hasGraph && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleOpenDashboard}
                  style={{ flex: 1 }}
                >
                  <Sparkles size={18} color="var(--primary)" />
                  {t.openDashboardBtn}
                </button>
              )}
            </div>

            {/* Links de Suporte e GitHub */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--panel-border)" }}>
              <button 
                onClick={() => window.api.openExternal("https://github.com/Leosdc/understand-anything-desktop")}
                className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.8rem", height: "32px", display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid var(--panel-border)" }}
              >
                <Github size={14} />
                <span>GitHub Repo</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Tela 2: Progresso da Análise ──────────────────────────────────── */}
      {view === "progress" && (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "40px" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "680px", padding: "40px" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <div>
                <span style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t.phaseLabel} {progress.phase} {t.ofLabel} {progress.totalPhases}
                </span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>
                  {progress.phaseName || t.analyzeBtn}
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  onClick={() => setShowHelpModal(true)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", color: "var(--text-secondary)", transition: "color 0.2s" }}
                  title="Ajuda / Por que demora?"
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                >
                  <HelpCircle size={20} />
                </button>
                <div className="glow-text" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)" }}>
                  {Math.round((progress.phase / progress.totalPhases) * 100)}%
                </div>
              </div>
            </div>

            <div className="progress-bar-container" style={{ marginBottom: "20px" }}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${(progress.phase / progress.totalPhases) * 100}%` }}
              ></div>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "32px", minHeight: "24px" }}>
              {progress.message || "Aguardando atualizações..."}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Terminal size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                {t.processingLogs}
              </span>
            </div>

            <div className="terminal-view">
              {logs.map((log, idx) => (
                <div key={idx} className="terminal-line">{log}</div>
              ))}
              {logs.length === 0 && <div className="terminal-line" style={{ color: "var(--text-muted)" }}>{t.noLogs}</div>}
              <div ref={logEndRef}></div>
            </div>

            <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelAnalysis}
              >
                {t.cancelBtn}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Tela 3: Dashboard de Visualização Integrado ────────────────────── */}
      {view === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
          <div style={{ 
            height: "56px", 
            background: "rgba(10, 11, 14, 0.8)", 
            backdropFilter: "blur(12px)", 
            borderBottom: "1px solid var(--panel-border)", 
            padding: "0 20px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "8px 12px", fontSize: "0.85rem", height: "36px" }} 
                onClick={() => setView("setup")}
              >
                <ArrowLeft size={16} />
                {t.backBtn}
              </button>
              <div style={{ height: "20px", width: "1px", background: "var(--panel-border)" }}></div>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }} className="glow-text">{projectName}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                  {projectPath}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "8px 12px", fontSize: "0.85rem", height: "36px", gap: "6px" }}
                onClick={() => {
                  // Forçar recarregamento do iframe redefinindo o src do iframe
                  const iframe = document.getElementById("dashboard-iframe") as HTMLIFrameElement;
                  if (iframe) iframe.src = getDashboardUrl();
                }}
              >
                <RefreshCw size={14} />
                {t.reloadGraphBtn}
              </button>

              <button 
                className="btn btn-primary" 
                style={{ padding: "8px 16px", fontSize: "0.85rem", height: "36px", gap: "6px" }}
                onClick={handleOpenExternal}
              >
                <ExternalLink size={14} />
                {t.openBrowserBtn}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", background: "#0d0e12" }}>
            <iframe 
              id="dashboard-iframe"
              src={getDashboardUrl()} 
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Understand Anything Dashboard"
            />
          </div>
        </div>
      )}

      {/* ── Mascote Flutuante Absoluto ────────────────────────────────────── */}
      {view !== "dashboard" && (
        <img 
          src={mascoteImg} 
          className="floating-mascot" 
          style={{ 
            position: "absolute", 
            bottom: "24px", 
            right: "24px", 
            width: "160px", 
            height: "auto", 
            pointerEvents: "none", 
            zIndex: 10,
            opacity: 0.85
          }} 
          alt="Mascote robotizado flutuante" 
        />
      )}

      {/* ── Modal de Ajuda Overlay ────────────────────────────────────────── */}
      {showHelpModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(10, 11, 14, 0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "600px",
            padding: "32px",
            maxHeight: "85vh",
            overflowY: "auto",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            boxShadow: "0 0 24px rgba(56, 189, 248, 0.15)"
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "16px" }} className="glow-text">{t.helpTitle}</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              <p>
                {t.helpP1}
              </p>
              
              <div>
                <h4 style={{ color: "var(--primary)", fontWeight: 600, marginBottom: "4px" }}>{t.helpQ1}</h4>
                <p>
                  {t.helpA1}
                </p>
              </div>
              
              <div>
                <h4 style={{ color: "var(--primary)", fontWeight: 600, marginBottom: "4px" }}>{t.helpTips}</h4>
                <ul style={{ paddingLeft: "20px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li>
                    {t.helpTip1}
                  </li>
                  <li>
                    {t.helpTip2}
                  </li>
                </ul>
              </div>

              <div>
                <h4 style={{ color: "var(--primary)", fontWeight: 600, marginBottom: "4px" }}>{t.helpQ2}</h4>
                <p>
                  {t.helpA2}
                </p>
              </div>
            </div>

            <div style={{ height: "1px", background: "var(--panel-border)", margin: "24px 0" }}></div>
            
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={() => setShowHelpModal(false)} style={{ padding: "8px 24px" }}>
                {t.helpUnderstandBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Custo Overlay ────────────────────────── */}
      {costDetail && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(10, 11, 14, 0.85)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "920px",
            padding: "32px",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            boxShadow: "0 0 32px rgba(168, 85, 247, 0.15)",
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(168, 85, 247, 0.15)", borderRadius: "8px", padding: "8px", display: "flex", color: "var(--accent)" }}>
                <ShieldAlert size={24} />
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>{t.costTitle}</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "32px", marginBottom: "12px" }}>
              {/* Coluna Esquerda: Estimativa de Custos */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "16px" }}>
                    {t.costMessage}
                  </p>

                  <div style={{ background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--panel-border)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{t.costFiles}:</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{costDetail.totalFiles}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{t.costBatches}:</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{costDetail.totalBatches}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{t.costTokens}:</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {costDetail.inputTokens.toLocaleString()} / {costDetail.outputTokens.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: "1px", background: "var(--panel-border)", margin: "4px 0" }}></div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>{t.costEstimate}:</span>
                      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--primary)" }} className="glow-text">
                        {getEstimatedCostText()}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", marginTop: "24px" }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={async () => {
                      setCostDetail(null);
                      await window.api.confirmAnalysis(false);
                    }}
                    style={{ flex: 1 }}
                  >
                    {t.costAbort}
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={async () => {
                      setCostDetail(null);
                      await window.api.confirmAnalysis(true);
                    }}
                    style={{ flex: 1 }}
                  >
                    {t.costContinue}
                  </button>
                </div>
              </div>

              {/* Coluna Direita: Editor do Ignore ou Painel de Regras Ativas */}
              {hasSavedIgnore ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", borderLeft: "1px solid var(--panel-border)", paddingLeft: "32px", height: "100%", justifyContent: "center" }}>
                  <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "8px", padding: "20px" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <CheckCircle size={18} color="var(--success)" />
                      Ignore Configurado
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: "1.4" }}>
                      As regras de exclusão foram salvas com sucesso no arquivo `.understandignore`. Os arquivos listados abaixo estão sendo ignorados para esta análise:
                    </p>
                    
                    <div style={{ maxHeight: "160px", overflowY: "auto", background: "rgba(0, 0, 0, 0.25)", borderRadius: "6px", padding: "10px", border: "1px solid var(--panel-border)" }}>
                      {ignoreContent.split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#")).length > 0 ? (
                        <ul style={{ paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                          {ignoreContent.split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#")).map((rule, i) => (
                            <li key={i} style={{ wordBreak: "break-all" }}>{rule}</li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Nenhuma regra de exclusão ativa.</span>
                      )}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setHasSavedIgnore(false)}
                      style={{ marginTop: "16px", background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.8rem", textDecoration: "underline", padding: 0 }}
                    >
                      Editar regras de exclusão
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: "1px solid var(--panel-border)", paddingLeft: "32px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Folder size={16} color="var(--primary)" />
                      {t.ignoreTitle}
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {t.ignoreHelp}
                    </p>
                  </div>

                  <textarea
                    className="input-control"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      height: "140px",
                      resize: "none",
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid var(--panel-border)",
                      padding: "10px",
                      borderRadius: "6px"
                    }}
                    placeholder={t.ignorePlaceholder}
                    value={ignoreContent}
                    onChange={(e) => setIgnoreContent(e.target.value)}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{t.ignoreRecommended}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {["node_modules/", "dist/", "build/", "out/", ".git/", "*.lock", "*.zip", "*.mp4"].map((rule) => (
                        <button
                          key={rule}
                          type="button"
                          onClick={() => {
                            const trimmed = ignoreContent.trim();
                            const lines = trimmed ? trimmed.split("\n") : [];
                            if (!lines.includes(rule) && !lines.includes(rule.slice(0, -1))) {
                              const newContent = trimmed ? trimmed + "\n" + rule : rule;
                              setIgnoreContent(newContent);
                            }
                          }}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--panel-border)",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            fontSize: "0.7rem",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                        >
                          +{rule}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{
                      marginTop: "8px",
                      background: "linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      color: "#fff",
                      gap: "8px",
                      width: "100%",
                      justifyContent: "center",
                      fontWeight: 600
                    }}
                    onClick={async () => {
                      recalculatingRef.current = true;
                      // Salvar o arquivo via IPC
                      await window.api.saveIgnoreFile(projectPath, ignoreContent);
                      setHasSavedIgnore(true);
                      // Cancelar análise ativa silenciosamente para recarregar
                      setCostDetail(null);
                      await window.api.confirmAnalysis(false);
                    }}
                  >
                    <RefreshCw size={14} />
                    {t.saveRecalculate}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
