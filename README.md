<p align="center">
  <img src="docs/images/screenshot_square.png" alt="組織図マネージャー" width="800">
</p>

<h1 align="center">🏢 組織図マネージャー</h1>

<p align="center">
  <strong>直感的に組織図を作成・編集できるインタラクティブWebアプリ</strong><br>
  サーバー不要。ブラウザだけで動作。データは自動保存。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Vanilla_JS-F7DF1E?style=flat-square&logo=javascript" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Canvas-HTML5-E34F26?style=flat-square&logo=html5" alt="HTML5 Canvas">
  <img src="https://img.shields.io/badge/Server-不要-success?style=flat-square" alt="No Server">
  <img src="https://img.shields.io/badge/Data-自動保存-blue?style=flat-square" alt="Auto Save">
  <img src="https://img.shields.io/badge/Theme-Light%20%2F%20Dark-8B5CF6?style=flat-square" alt="Dark Mode">
</p>

---

## ✨ デモ

### 📐 スクエアビュー — 標準的な組織図

部署を領域で囲み、人物をカラフルなアイコンで配置。コネクタで部署間の関係を可視化。

<img src="docs/images/screenshot_square.png" alt="スクエアビュー" width="800">

### 🔷 クォータービュー — 立体的なアイソメトリック表示

ワンクリックで立体的な俯瞰ビューに切り替え。奥行きのあるプロフェッショナルな見た目に。

<img src="docs/images/screenshot_quarter.png" alt="クォータービュー" width="800">

### 🎨 プロパティ編集 — 直感的な操作

人物の名前・所属・色・役割をリアルタイムに編集。左のツリーは領域のネスト構造に自動同期。

<img src="docs/images/screenshot_properties.png" alt="プロパティ編集" width="800">

---

## 🚀 特徴

<table>
<tr>
<td width="50%">

### 🖱️ 直感的な操作
- ドラッグ＆ドロップで自由配置
- 範囲選択・Ctrl+Click で複数選択
- **複数選択したオブジェクトをグループで移動**
- マウスホイールでズーム
- Undo / Redo（Ctrl+Z / Y）
- コピー＆ペースト（Ctrl+C / V / D）
- **整列（6方向）＋ 等間隔配置（水平/垂直）**

</td>
<td width="50%">

### 📊 2つのビューモード
- **スクエア** — 正面からの標準ビュー
- **クォーター** — 立体的なアイソメトリック表示
- ワンクリックで即座に切り替え

</td>
</tr>
<tr>
<td>

### 🔗 コネクタ（関係線）
- 部署間をカギ状コネクタで接続
- ラベル付きで関係性を明示
- ウェイポイントで経路を自由に調整
- 矢印の方向を設定可能

</td>
<td>

### 🏷️ 役割管理
- カスタム役割を作成（名前・色・アイコン）
- 人物に複数役割を割り当て
- キャンバス上にバッジで表示

</td>
</tr>
<tr>
<td>

### 💾 データ保存・読込
- JSONファイルにエクスポート（💾 保存）
- JSONファイルからインポート（📂 読込）
- CSVファイルからの一括取込（📊 CSV）
- localStorage による自動保存も併用

</td>
<td>

### 🌲 ツリー構造サイドバー
- 領域のネストに自動同期
- 折りたたみ/展開可能
- 🔍 リアルタイム人物検索
- 領域ごとの所属人数バッジ表示

</td>
</tr>
<tr>
<td>

### 📸 エクスポート・共有
- PNG画像として高解像度エクスポート
- 共有URLでデータをURLエンコードして共有
- 印刷レイアウト対応（A3/A4）

</td>
<td>

### 📝 注釈・カスタマイズ
- キャンバス上にテキストボックスを自由配置
- **注釈テキストの選択・ドラッグ移動に対応**
- 領域ごとのカラー設定
- **領域名のフォントサイズ・テキスト揃え（左/中央/右）設定**
- 🌙 ダークモード対応
- 人物詳細（メール・電話・入社日・発令日・写真URL）

</td>
</tr>
</table>

---

## 📦 セットアップ

### 必要なもの

- モダンブラウザ（Chrome / Edge / Firefox / Safari）
- **それだけ！** サーバーは不要です

### 起動

```bash
# リポジトリをクローン
git clone https://github.com/yet103/org_manager.git
cd org_manager
```

**`index.html` をダブルクリック** で起動！🎉

> 💡 HTTPサーバー経由でも利用できます：
> ```bash
> python -m http.server 8765    # Python
> npx serve -p 8765             # Node.js
> ```

---

## 🎮 操作ガイド

### 基本操作

| 操作 | 方法 |
|:-----|:-----|
| 👤 人物追加 | サイドバーの **＋** ボタン |
| ⬜ 領域作成 | 領域ツール → キャンバス上でドラッグ |
| 🔗 コネクタ | コネクタツール → 接続ポイント間をドラッグ |
| 📝 テキスト注釈 | 注釈ツール → キャンバス上をクリック |
| 🖱️ 移動 | 選択ツール → オブジェクトをドラッグ |
| ☐ 範囲選択 | 空白をドラッグ |
| ☐ 追加選択 | `Ctrl + Click` |
| 🔍 ズーム | マウスホイール |
| ✋ パン | 右ドラッグ |

### キーボードショートカット

| キー | 動作 |
|:-----|:-----|
| `Ctrl + Z` | 元に戻す |
| `Ctrl + Y` | やり直し |
| `Ctrl + A` | 全選択 |
| `Ctrl + S` | ファイル保存（JSONダウンロード） |
| `Ctrl + C` | 選択コピー |
| `Ctrl + V` | 貼り付け（ずらして配置） |
| `Ctrl + D` | 複製 |
| `Ctrl + F` | 検索バーにフォーカス |
| `Ctrl + +/-` | ズームイン / アウト |
| `Ctrl + 0` | ズームリセット |
| `Escape` | 選択解除 / ツールリセット |
| `Home` | ビュー原点リセット |
| `Delete` | 選択削除 |
| `↑ ↓ ← →` | 微移動（1グリッド） |
| `Shift + ↑ ↓ ← →` | 大きく移動（5グリッド） |
| `Shift` 長押し | 一時的にコネクタモード |

### データ管理

| 操作 | 方法 |
|:-----|:-----|
| 💾 保存 | ツールバー「保存」→ JSONファイルをダウンロード |
| 📂 読込 | ツールバー「読込」→ JSONファイルを選択して復元 |
| 📊 CSV取込 | ツールバー「CSV」→ CSVファイルから一括インポート |
| 📸 画像出力 | ツールバー「画像出力」→ PNG高解像度ダウンロード |
| 🔗 共有URL | ツールバー「🔗」→ データをURLエンコードしてコピー |
| 🖨 印刷 | ツールバー「印刷」→ 印刷プレビュー表示 |
| 🌙 ダークモード | ツールバー「🌙」→ ダーク/ライト切替 |

---

## 🗂️ ファイル構成

```
org_manager/
├── index.html          # メインHTML
├── index.css           # スタイルシート
├── app.js              # アプリケーションロジック
├── docs/
│   └── images/         # スクリーンショット
├── enhance.txt         # エンハンスメント履歴
├── goal.txt            # プロジェクト目標
├── LICENSE             # MIT License
└── README.md
```

## 🛠️ 技術スタック

| 技術 | 用途 |
|:-----|:-----|
| **HTML5 Canvas** | 描画エンジン |
| **Vanilla JavaScript** | アプリケーションロジック |
| **CSS3** | UIスタイリング（ダークモード対応） |
| **localStorage** | データ永続化（自動保存） |

> 🎯 **フレームワーク不使用** — 依存関係ゼロ。ブラウザだけで完結するピュアなWebアプリです。

---

## 🚀 すぐに使う

### ▶ オンラインで使う（GitHub Pages）

**https://yet103.github.io/org_manager/**

ブラウザでアクセスするだけ！インストール不要。

### ▶ ダウンロードして使う

1. [ZIPをダウンロード](https://github.com/yet103/org_manager/archive/refs/heads/main.zip)
2. 解凍して `index.html` をダブルクリック
3. 完了！🎉

### ▶ Git Clone

```bash
git clone https://github.com/yet103/org_manager.git
cd org_manager
# index.html をブラウザで開く
```

> 💡 サーバーは**一切不要**です。`file://` プロトコルで直接動作します。

---

## 📜 ライセンス

[MIT License](LICENSE) — 自由にご利用ください。

---

<p align="center">
  <sub>Built with ❤️ and vanilla JavaScript</sub>
</p>
