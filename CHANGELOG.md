# Changelog — Understand Anything Desktop

Todas as atualizações notáveis e melhorias de engenharia aplicadas a esta versão gráfica integrada.

---

## [0.3.0] — 2026-06-10

### Adicionado
- **Editor Visual Integrado do `.understandignore`**: Uma nova área de texto foi adicionada no lado direito do modal de custos (Fase 1.5), permitindo que o usuário visualize e edite as regras de exclusão de arquivos em tempo real.
- **Salvar & Recalcular na UI**: Botão integrado para salvar as novas regras de ignore direto na pasta do projeto e reiniciar silenciosamente o escaneamento do repositório para obter novas contagens e estimativas de tokens de IA instantaneamente.
- **Padrões Recomendados Rápidos**: Adição de botões de atalho no modal para preenchimento rápido de pastas pesadas (como `node_modules/`, `dist/`, `.git/`, `.venv/` e arquivos binários) para prevenir altos gastos.
- **Lista de Modelos de API Expandida**: Adicionado suporte completo de seleção de modelos na interface para Google Gemini (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash-exp`) e Anthropic Claude (`claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`), com seus respectivos cálculos de taxas de token atualizados.
- **Geração Automática do Ignore**: Implementada a exclusão inteligente padrão onde o backend gera automaticamente o arquivo `.understandignore` com padrões seguros na primeira execução, caso não exista.
- **Internacionalização Expandida**: Adicionadas todas as chaves de tradução no dicionário da interface (em inglês, português, espanhol, chinês e japonês) para apoiar o editor de ignore.
- **Segurança Antirretrospecção (Path Traversal)**: A ponte IPC de leitura e gravação valida se os caminhos solicitados estão contidos no escopo do projeto selecionado.
- **Pasta de Manuais e Tutoriais (`docs/`)**: Criação de um manual detalhado (`TUTORIAL.*.md`) em 5 idiomas explicando cada etapa da análise, estimativa de consumo, dicas de ignore e funcionamento do Dashboard 3D.

### Corrigido
- **Pipeline do GitHub Actions (CI)**: Alterado o runner do CI para `windows-latest` para possibilitar a compilação do executável do Windows sem a dependência falha do emulador Wine no Linux.

---

## [0.2.0] — 2026-06-09

### Adicionado
- **Histórico de "Projetos Recentes"**: Salva os últimos 5 repositórios analisados no arquivo local `settings.json`. Se o projeto já contiver um grafo de conhecimento existente, o usuário pode reabrir o dashboard em 1 segundo sem reanalisar o código.
- **Cancelamento Real de Análise (Backend/IA)**: O clique no botão "Cancelar" agora envia um sinal IPC que interrompe imediatamente o loop de lotes (batches) no orquestrador do backend e aborta as requisições ativas da API da IA, economizando consumo de tokens e liberando memória.
- **Mascote Flutuante Animado**: Imagem oficial do mascote robotizado em PNG injetada no canto inferior do Setup e da tela de Progresso com animação `@keyframes float` CSS acelerada por hardware e drop-shadow neon azul-violeta.
- **Modal de Ajuda Didático**: Um modal em overlay glassmorphic (ativável pelo ícone `HelpCircle` no topo) explicando detalhadamente o pipeline de 7 fases do app, as razões físicas do tempo de processamento em lotes de IA da Fase 2, e dicas práticas para acelerar repositórios massivos (uso do `.understandignore` e subpastas).
- **Botões de Suporte**: Integração no rodapé de botões diretos e estilizados para o repositório GitHub e link do Ko-fi do desenvolvedor.
- **Suporte a Rolagem Responsiva**: Reformulado o layout vertical do formulário com `overflowY: "auto"` e `margin: "auto"`, permitindo que o painel seja rolável e perfeitamente legível mesmo em monitores com baixa resolução ou janelas encolhidas.

### Corrigido
- **Exceção de Execução (`ReferenceError`)**: Removida a dependência de pacotes que tentavam inicializar dependências globais não suportadas no renderer do Electron.
- **Import de Assets no TypeScript**: Adicionada declaração global `vite-env.d.ts` na pasta do renderer para evitar erros de compilação do TypeScript ao importar imagens PNG.
- **Fechamento de Instâncias de Compilação**: Adicionado comando de kill automático para processos pendentes do executável antes de tentar sobrescrever novos builds portáteis.

---

## [0.1.0] — 2026-06-09

### Adicionado
- **Migração para TypeScript Portátil**: Reescrevemos o pipeline orquestrador do terminal original de Node/Python em TypeScript puro (`orquestrador.ts`), incluindo a portabilidade total da lógica do script Python `merge-batch-graphs.py` (normalização de nós, linked tested_by determinístico, recuperação de imports).
- **Janela Nativa Electron**: Construída a interface do aplicativo utilizando Electron + React (Vite) com design Dark e Glassmorphism.
- **Express Server Integrado**: Criação de servidor HTTP Express local protegido por token de segurança único gerado no boot, permitindo servir o dashboard tridimensional estático de forma isolada e segura.
- **Leitor de Código Seguro**: Endpoint protegidos contra Path Traversal no backend para leitura dinâmica de arquivos de código-fonte de forma integrada no dashboard.
- **Build Portátil do Executável**: Empacotador configurado para gerar a pasta descompactada pronta para rodar sem dependências de C++ ou Python.
