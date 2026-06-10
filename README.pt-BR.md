# Understand Anything Desktop

<p align="center">
  <img src="src/renderer/assets/mascote.png" width="160" alt="Mascote Understand Anything" />
</p>

<p align="center">
  <a href="https://github.com/Leosdc/understand-anything-desktop"><img src="https://img.shields.io/badge/GitHub-Repo-181717?logo=github" alt="GitHub" /></a>
  <a href="https://github.com/Leosdc/understand-anything-desktop/releases"><img src="https://img.shields.io/badge/Vers%C3%A3o-v0.3.0-blue" alt="Versão" /></a>
  <a href="https://github.com/Leosdc/understand-anything-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://github.com/Lum1104"><img src="https://img.shields.io/badge/Criador_Original-Yuxiang_Lin_(Lum1104)-38bdf8" alt="Criador Original" /></a>
</p>

<p align="center">
  <b><a href="README.md">English</a></b> | 
  <b><a href="README.pt-BR.md">Português (Brasil)</a></b> | 
  <b><a href="README.es.md">Español</a></b> | 
  <b><a href="README.ja.md">日本語</a></b> | 
  <b><a href="README.zh.md">简体中文</a></b>
</p>

Transforme qualquer base de código em um grafo de conhecimento interativo para explorar visualmente, pesquisar e auditar. **Agora com um aplicativo desktop para Windows bonito e sem dependências locais!**

Este é o empacotamento oficial de desktop e versão portátil do aclamado projeto **Understand Anything**.

> [!IMPORTANT]
> **Créditos & Agradecimentos:** Este aplicativo desktop é construído sobre o excepcional pipeline de análise de código criado pelo desenvolvedor original, **Yuxiang Lin** ([@Lum1104](https://github.com/Lum1104) / [Repositório Understand-Anything](https://github.com/Lum1104/Understand-Anything)). Nós portamos os mescladores de grafo escritos em Python para TypeScript nativo e criamos um ambiente seguro em Electron para tornar esta ferramenta incrível acessível a todos sem dependências de terminal ou interpretadores locais.

---

## 💡 Por que usar a versão Desktop (.exe) em vez da CLI original?

A versão portátil de desktop foi projetada para eliminar diversas fricções de usabilidade, configuração de ambiente e controle de custos que existiam no script de terminal original:

* **Zero Configuração de Ambiente (Portátil)**: O projeto original exigia a instalação global do Node.js, Python 3, compiladores C++ e várias bibliotecas Python pesadas (pandas, networkx, etc.). O `.exe` agrupa todos os scripts de análise, interpretadores e mescladores em TypeScript nativo de forma isolada. É só baixar, rodar e analisar imediatamente.
* **Avaliação Prévia de Custo de Tokens**: Antes de gastar créditos nas APIs do Gemini ou Claude, o App Desktop faz uma varredura estática no seu projeto e exibe um resumo detalhado de arquivos, estimativa de lotes de envio e projeção de tokens, permitindo decidir se deseja continuar ou abortar. **Você pode editar as regras do `.understandignore` diretamente nesse modal e recalcular os custos na hora! O app suporta o catálogo completo de modelos Gemini (3.5, 2.5, 1.5, 2.0) e Claude (Sonnet 4.6, Opus 4.6, Sonnet 3.5, Haiku, Opus) com estimativas precisas de tokens.**
* **Cancelamento Ativo em Tempo Real**: Se a análise estiver demorando muito ou custando mais do que o esperado, você pode interrompê-la com um clique. O backend cancela as chamadas de IA pendentes e limpa arquivos temporários na hora. Na CLI, forçar a parada com `Ctrl+C` deixava processos fantasmas no sistema operacional e arquivos corrompidos.
* **Histórico de Projetos Recentes (Carregamento em 1s)**: O app mantém um histórico dos últimos 5 repositórios analisados. Se o projeto já possuir um grafo gerado anteriormente, você pode abri-lo instantaneamente pela interface gráfica em 1 segundo, sem consumir novos tokens de IA ou precisar digitar caminhos de pastas no terminal.
* **Sincronização Dinâmica de Idiomas**: Altere o idioma do aplicativo a qualquer momento. A interface salva e atualiza a configuração do projeto atual de forma síncrona para que o dashboard de renderização reflita o idioma escolhido imediatamente.
* **Servidor HTTP Local Protegido**: O app inicializa um backend Express local de forma totalmente invisível e o protege com tokens criptográficos únicos gerados a cada inicialização, impedindo que outros dispositivos na sua rede local acessem os dados do seu código.

---

## ⚠️ Otimização de Custo de IA & Exclusões

Como o **Understand Anything** lê a lógica real da sua base de código (Fase 2) para construir o grafo de conhecimento semântico, analisar diretórios pesados de terceiros ou arquivos compilados pode consumir tokens de API de IA em excesso.

Para evitar custos desnecessários:
1. **Editor Visual Integrado**: Você pode criar ou editar seus padrões do `.understandignore` diretamente no modal de estimativa de custos antes de prosseguir com a IA. **Se o arquivo de ignore não existir, o backend do app gera o arquivo automaticamente com regras seguras na primeira execução.**
2. Alternativamente, crie ou edite um arquivo chamado `.understandignore` dentro da pasta `.understand-anything/` na raiz do seu projeto.
3. Adicione padrões glob (glob patterns) para arquivos e pastas que você deseja ignorar (ex: `node_modules/`, `dist/`, `.git/`, logs, imagens).
4. Para um tutorial detalhado de configuração e regras avançadas, consulte o [TUTORIAL.pt-BR.md](file:///c:/Users/PC/Documents/Bots/Understand-Anything/docs/TUTORIAL.pt-BR.md) completo!

---

### 📊 Fluxo de Trabalho & Dados

```mermaid
graph TD
    User([Interface do Usuário]) -->|1. Seleciona Projeto e Modelo| Electron[Aplicativo Electron]
    Electron -->|2. Varredura Local Offline| Scan[Fase 1: Escaneamento de Arquivos]
    Scan -->|3. Agrupamento de Arquivos| Batches[Fase 1.5: Divisão de Lotes Semânticos]
    Batches -->|4. Projeção Financeira| Confirm{Diálogo de Confirmação de Custo}
    Confirm -->|Abortar| Cancel[Limpeza e Redefinição]
    Confirm -->|Continuar| IA[Fase 2: Leitura do Código via IA]
    IA -->|API do Gemini / Claude| LLM((Modelos de IA))
    IA -->|5. Mesclagem de Sub-grafos| Merge[Fase 3-6: Normalização de Nós e Conectores]
    Merge -->|6. Salvar Grafo Final| GraphFile[(knowledge-graph.json)]
    GraphFile -->|7. Servir via HTTP Local| Express[Servidor Express + Token de uso único]
    Express -->|8. Renderização Visual Interativa| Iframe[Iframe / Dashboard Embutido]
```

---

## ✨ Recursos do Desktop

- **📂 Seletor de Projetos Nativo**: Selecione qualquer pasta no seu computador usando caixas de diálogo nativas do Windows.
- **⚡ Projetos Recentes Semânticos**: Recarregue projetos analisados anteriormente de forma instantânea. Se o grafo já existir, acesse o painel visualizador em 1 segundo sem reanalisar o código.
- **🛡️ Logs de Processamento em Tempo Real**: Acompanhe o progresso das 7 fases da análise (varredura, processamento de lotes IA, mapeamento de camadas e guias turísticos) em um console interativo.
- **🛑 Cancelamento Real**: Interrompa a análise ativa a qualquer momento. Os subprocessos e requisições de IA são finalizados no backend imediatamente para poupar tokens de API.
- **💰 Controle Prévio de Custos**: Avaliação estimada de tokens e custos em dólares ($) na Fase 1.5, permitindo que o usuário decida se deseja continuar ou abortar a chamada de IA.
- **🤖 Mascote Animado Flutuante**: Assistente robótico visual integrado às telas de Setup e Progresso com reações ao mouse.
- **💡 Ajuda Integrada**: Informações sobre as fases, exclusões no `.understandignore` e dicas de performance na interface.
- **🔒 Servidor Web Local Seguro**: Servidor Express embutido e protegido por tokens de acesso aleatórios de uso único gerados a cada boot.

---

## 🛠️ Instalação & Uso

Você pode baixar a pasta portátil pré-compilada diretamente ou compilar o projeto você mesmo. Nenhuma dependência de Python ou compiladores de C++ é exigida!

### Método 1: Executando a Versão Portátil Pré-compilada (.exe)
1. Acesse o diretório [dist-package/Understand Anything-win32-x64](https://github.com/Leosdc/understand-anything-desktop/tree/main/dist-package/Understand%20Anything-win32-x64).
2. Dê um duplo clique em `Understand Anything.exe`.
3. Insira sua chave de API do **Google Gemini** ou **Anthropic Claude** (salva localmente de forma segura).
4. Escolha a pasta do projeto e clique em **Analisar Repositório**.

### Método 2: Compilando a partir do Código-Fonte
Se deseja compilar o aplicativo desktop localmente, certifique-se de ter o Node.js instalado:

1. Clone o repositório:
   ```bash
   git clone https://github.com/Leosdc/understand-anything-desktop.git
   cd understand-anything-desktop
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Compile o front-end, backend e empacote o aplicativo portátil:
   ```bash
   npm run build
   ```
   *(Este comando único gera o front-end React, compila o backend em Node.js usando esbuild, move as skills e arquivos estáticos e gera o executável em `dist-package/`).*

---

## 🤝 Contribuições

Se você achar este aplicativo desktop portátil útil, por favor considere:
- ⭐️ Deixar uma estrela no repositório no [GitHub](https://github.com/Leosdc/understand-anything-desktop)
- 💡 Contribuir com melhorias de código ou reportar bugs no tracker do repositório.

*Agradecimento especial a **Yuxiang Lin (Lum1104)** por criar o pipeline original que torna este projeto possível!*
