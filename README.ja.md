# Understand Anything Desktop

<p align="center">
  <img src="src/renderer/assets/mascote.png" width="160" alt="Understand Anything マスコット" />
</p>

[![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?logo=github)](https://github.com/Leosdc/understand-anything-desktop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](https://github.com/Leosdc/understand-anything-desktop/blob/main/LICENSE)
[![Original Creator](https://img.shields.io/badge/Original_Creator-Luminis-38bdf8)](https://lum.is-a.dev/)

任意のコードベースをインタラクティブな 知識グラフに変換し、視覚的に探索、検索、および監査します。**Windows 用の、ローカル依存関係のない美しいデスクトップアプリケーションが利用可能になりました！**

これは、高く評価されている **Understand Anything** プロジェクトの公式デスクトップラッパーおよびポータブルバージョンです。

> [!IMPORTANT]
> **クレジットと謝辞：** このデスクトップアプリケーションは、元の開発者である **Luminis** が作成した優れたコードベース分析パイプラインに基づいて構築されています（[https://lum.is-a.dev/](https://lum.is-a.dev/) / [Understand-Anything リポジトリ](https://github.com/Egonex-AI/Understand-Anything)）。私たちは、Python のグラフマージャーをネイティブの TypeScript に移植し、安全な Electron デスクトップ環境を構築することで、ターミナルの依存関係なしにすべてのユーザーがこの強力なツールを利用できるようにしました。

---

## ✨ デスクトップ版の機能

- **📂 ネイティブプロジェクト選択機能**：Windows ネイティブのダイアログを使用して、コンピューター内の任意のプロジェクトフォルダを直接選択します。
- **⚡ セマンティックな履歴プロジェクト**：以前に分析したプロジェクトを瞬時に再ロードします。グラフがすでに存在する場合、コードを再分析することなく、1 秒でダッシュボードにアクセスできます。
- **🛡️ リアルタイム処理ログ**：分析の 7 つのフェーズ（スキャン、AI バッチ処理、レイヤーマッピング、ツアーガイド生成）の進行状況を、インタラクティブなターミナルコンソールで追跡します。
- **🛑 リアルタイムキャンセル**：実行中の分析をいつでも中止します。バックエンドプロセスとアクティブな AI リクエストは即座に終了し、API トークンの消費を節約します。
- **💰 トークン/コストの事前見積もり**：フェーズ 1.5 でトークン消費量と米ドル（$）のコストを概算し、AI コールの続行または中止をユーザーが選択できるようにします。
- **🤖 アニメーション浮遊マスコット**：設定および進行画面にロボットアシスタントが組み込まれており、マウスホバーに対してズーム反応を示します。
- **💡 統合ヘルプシステム**：フェーズの説明、`.understandignore` による除外設定、大規模プロジェクト向けのパフォーマンス向上のヒントをインターフェース上で直接確認できます。
- **🔒 安全なローカル Web サーバー**：起動ごとに生成される使い捨てのランダムなアクセスキーによって保護された、組み込みの Express サーバー。

---

## 🛠️ インストールと使用方法

ビルド済みのポータブルフォルダを直接ダウンロードするか、ご自身でプロジェクトをビルドできます。Python 環境や C++ コンパイラのインストールは不要です！

### 方法 1：ビルド済みのポータブルバージョン (.exe) の実行
1. ディレクトリ [dist-package/Understand Anything-win32-x64](https://github.com/Leosdc/understand-anything-desktop/tree/main/dist-package/Understand%20Anything-win32-x64) にアクセスします。
2. `Understand Anything.exe` をダブルクリックします。
3. **Google Gemini** または **Anthropic Claude** の API キーを入力します（ローカルに安全に保存されます）。
4. プロジェクトのフォルダを選択し、**Analisar Repositório**（分析実行）をクリックします。

### 方法 2：ソースコードからのビルド
ローカルでデスクトップアプリをコンパイルしたい場合は、Node.js がインストールされていることを確認してください：

1. リポジトリをクローンします：
   ```bash
   git clone https://github.com/Leosdc/understand-anything-desktop.git
   cd understand-anything-desktop
   ```
2. 依存関係をインストールします：
   ```bash
   npm install
   ```
3. アプリケーションをビルドし、ポータブル `.exe` をパッケージングします：
   ```bash
   npm run build
   ```
   *(この単一のコマンドで、React フロントエンドの生成、esbuild を使用した Node.js バックエンドのコンパイル、必要なアセットのコピー、および `dist-package/` フォルダ内へのポータブル実行ファイルの作成がすべて行われます)。*

---

## 🤝 貢献とサポート

このポータブルデスクトップアプリケーションが役に立った場合は、以下をご検討ください：
- ⭐️ [GitHub](https://github.com/Leosdc/understand-anything-desktop) でリポジトリにスターを付ける
- 💡 コードの改善やバグ報告をリポジトリの Issue トラッカーで行う

*このプロジェクトを可能にするオリジナルのパイプラインを作成してくれた **Luminis** に深く感謝します！*
