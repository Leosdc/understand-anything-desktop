# Understand Anything Desktop - Tutorial Completo de Uso

Bem-vindo ao guia oficial de uso do **Understand Anything Desktop**. Este guia aborda detalhadamente cada funcionalidade, etapa de configuração, técnicas de controle de custos de tokens e ferramentas de interface para ajudá-lo a extrair o máximo de proveito da análise de código sem surpresas financeiras.

---

## 🚀 Primeiros Passos e Configuração da API Key

O Understand Anything utiliza Modelos de Linguagem de Grande Porte (LLMs) para ler, classificar e descrever a lógica do seu código. Para usar o aplicativo, você precisará de uma chave de API (API Key) pessoal do Google Gemini ou do Anthropic Claude:

1. **Obter uma API Key**:
   - **Google Gemini**: Acesse o [Google AI Studio](https://aistudio.google.com/) e gere uma chave de API gratuitamente ou com cobrança por consumo. (O Gemini 2.5 Flash é altamente recomendado por sua velocidade e excelente custo-benefício).
   - **Anthropic Claude**: Acesse o [Anthropic Console](https://console.anthropic.com/) para criar sua chave de API e adicionar créditos para consumo.
2. **Configurar o Aplicativo**:
   - Cole a chave gerada no campo **API Key**.
   - Escolha o provedor correspondente (**Google Gemini AI** ou **Anthropic Claude**).
   - Selecione o modelo desejado:
     * **Modelos do Google Gemini**:
       - `gemini-2.5-flash` (Padrão rápido & econômico) — Entrada: $0.075 / 1M, Saída: $0.30 / 1M.
       - `gemini-2.5-pro` (Alta inteligência) — Entrada: $1.25 / 1M, Saída: $5.00 / 1M.
       - `gemini-1.5-flash` (Legado rápido) — Entrada: $0.075 / 1M, Saída: $0.30 / 1M.
       - `gemini-1.5-pro` (Legado avançado) — Entrada: $1.25 / 1M, Saída: $5.00 / 1M.
       - `gemini-2.0-flash-exp` (Preview experimental) — Entrada: $0.075 / 1M, Saída: $0.30 / 1M.
     * **Modelos do Anthropic Claude**:
       - `claude-3-5-sonnet-20241022` (Sonnet v2 - Equilíbrio padrão) — Entrada: $3.00 / 1M, Saída: $15.00 / 1M.
       - `claude-3-5-haiku-20241022` (Haiku v2 - Rápido & econômico) — Entrada: $0.80 / 1M, Saída: $4.00 / 1M.
       - `claude-3-opus-20240229` (Opus - Raciocínio máximo & custo alto) — Entrada: $15.00 / 1M, Saída: $75.00 / 1M.
       - `claude-3-sonnet-20240229` (Legado médio) — Entrada: $3.00 / 1M, Saída: $15.00 / 1M.
       - `claude-3-haiku-20240307` (Legado rápido) — Entrada: $0.25 / 1M, Saída: $1.25 / 1M.

---

## ⚠️ Controle de Custos com o `.understandignore` (Crítico)

Como a Fase 2 lê o conteúdo textual real dos arquivos do seu repositório usando a inteligência artificial, submeter pastas pesadas, bibliotecas de terceiros ou arquivos binários compilados pode consumir seus créditos de API de forma extremamente rápida. **Para evitar custos elevados, é obrigatório configurar as regras de ignore.**

### O que é o arquivo de ignore?
O `.understandignore` é um arquivo de texto simples que fica localizado no diretório:
`[pasta-raiz-do-seu-projeto]/.understand-anything/.understandignore`

> [!IMPORTANT]
> **Exclusões & Geração Automática**: Se este arquivo não existir em seu repositório, o backend do aplicativo **irá criá-lo automaticamente na primeira execução** (durante a Fase 0.5) com regras padrão altamente otimizadas (ignorando `node_modules/`, `dist/`, `.git/`, builds, logs e locks) para proteger seu bolso de cobranças acidentais massivas. Você pode visualizar, alterar e adicionar novas regras a qualquer momento.

Qualquer arquivo ou diretório que corresponda aos padrões descritos neste arquivo será totalmente desconsiderado durante o escaneamento e **não** será enviado para leitura da IA.

### Exclusões Recomendadas
Sempre exclua arquivos não essenciais, dependências externas, pastas de build e arquivos de mídia:

| Categoria | Padrões de Exemplo | Motivo |
|---|---|---|
| **Gerenciadores de Pacotes** | `node_modules/`, `.venv/`, `venv/`, `__pycache__/`, `bower_components/` | Contém milhares de arquivos de bibliotecas externas que você não alterou. **Nunca analise estas pastas.** |
| **Pastas de Build/Saída** | `dist/`, `build/`, `out/`, `target/`, `bin/`, `obj/` | Códigos compilados ou empacotados replicam a lógica original do código, duplicando o consumo de tokens. |
| **Controle de Versão** | `.git/`, `.github/`, `.svn/`, `.hg/` | Diretórios internos de metadados com histórico massivo de commits. |
| **Arquivos de Lock** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `cargo.lock` | Arquivos de texto gigantescos com milhares de caminhos de dependências que desperdiçam créditos. |
| **Mídias e Binários** | `*.png`, `*.jpg`, `*.mp4`, `*.zip`, `*.pdf`, `*.mov` | Não contêm código-fonte legível e desperdiçam limite de tokens de contexto. |
| **Testes/Cobertura** | `coverage/`, `.nyc_output/` | Relatórios e logs temporários de ferramentas de teste. |

### Como formatar as regras
Escreva cada padrão em uma linha separada. Suporta correspondência glob padrão:
- `/node_modules` ou `node_modules/` ignora toda a pasta node_modules.
- `*.log` ignora todos os arquivos de log.
- `temp/*` ignora todo o conteúdo dentro da pasta temporária.

---

## 🔄 Usando o Editor e Recálculo de Ignore em Tempo Real

Para facilitar o controle de custos, o aplicativo desktop possui um editor de `.understandignore` integrado diretamente no modal de confirmação de custos.

> [!TIP]
> **Como otimizar seu orçamento de análise na hora:**
> 1. Selecione a pasta do projeto e clique em **Analisar Repositório**.
> 2. O app executará um escaneamento local rápido e exibirá o modal **Confirmar Estimativa de Custo**.
> 3. Observe o **Custo Estimado da API de IA**. Se ele estiver muito alto:
>    - Vá para a seção **Regras de Exclusão (.understandignore)** no lado direito do modal.
>    - Adicione as pastas que deseja remover da análise (ex: `node_modules/` ou `dist/`).
>    - Clique em **Salvar & Recalcular**.
> 4. O aplicativo salvará as alterações no arquivo fisicamente, abortará a execução atual em segundo plano e iniciará um novo escaneamento limpo.
> 5. Em poucos segundos, um novo resumo com contagem reduzida de arquivos e tokens aparecerá atualizado!
> 6. Se o valor estiver adequado para o seu orçamento, clique em **Confirmar e Continuar** para prosseguir para a análise com IA.

---

## 📊 Compreendendo o Pipeline de Análise de 7 Fases

Saiba o que o aplicativo faz em cada etapa:

1. **Fase 0: Pre-flight**: Preparação de diretórios e validação inicial do ambiente de execução.
2. **Fase 0.5: Configurando Exclusões**: Cria o arquivo `.understandignore` com padrões padrão se ele não existir.
3. **Fase 1: Varredura do Projeto**: Mapeia todos os arquivos, tamanhos, linguagens e dependências locais determinísticas.
4. **Fase 1.5: Divisão de Lotes**: Agrupa arquivos relacionados logicamente em lotes semânticos (batches) para envio.
5. **Confirmação de Custo**: *Interação do usuário.* Exibe a projeção de tokens, arquivos e custos em dólares ($).
6. **Fase 2: Análise de Código (IA)**: Processamento sequencial em que a IA lê cada lote, escreve descrições e detecta dependências ocultas.
7. **Fase 3 a 6: Unificação e Conectores**: Normaliza identificadores, mapeia arquivos de testes aos arquivos de produção correspondentes e resolve links.
8. **Fase 7: Servidor e Dashboard**: Inicializa um servidor Express protegido localmente para renderizar o dashboard interativo do grafo.

---

## 🎮 Interagindo com o Grafo de Conhecimento 3D

Assim que a análise é finalizada, o dashboard carrega um canvas interativo com os nós do projeto:

- **Navegação**:
  - **Botão Esquerdo do Mouse + Arrastar**: Desloca a câmera (Pan) pelo canvas.
  - **Botão Direito do Mouse + Arrastar (ou Shift + Arrastar)**: Desloca a câmera (Pan).
  - **Scroll do Mouse**: Aproxima e afasta o zoom.
- **Classificação de Nós**:
  - Cada nó representa um artefato de código (arquivo, função, classe, rota/endpoint).
  - Passar o cursor sobre um nó exibe seu caminho físico, linguagem, resumo semântico e complexidade.
- **Complexidade de Código**:
  - **Verde (Simple)**: Poucas linhas de código, lógica direta.
  - **Amarelo (Moderate)**: Lógica com complexidade e dependências intermediárias.
  - **Vermelho (Complex)**: Grande acoplamento ou lógica complexa. Excelente candidato para refatoração!
- **Projetos Recentes**:
  - O histórico na tela de setup permite carregar os últimos 5 projetos analisados. Se o grafo correspondente existir, o dashboard abre em 1 segundo sem gerar chamadas adicionais à API de IA.
