# 📐 Stractal — 開発ドキュメント

## アーキテクチャ概要

| 項目 | 内容 |
|------|------|
| フレームワーク | なし（Vanilla JS） |
| 描画方式 | HTML5 Canvas（毎フレーム全再描画） |
| データ永続化 | localStorage（自動保存） |
| ファイル構成 | `index.html` + `index.css` + `app.js` の3ファイル |
| サーバー依存 | なし（`file://` で直接動作） |

### なぜフレームワークを使わないのか

- **配布の容易さ**: `index.html` を開くだけで動作
- **依存関係ゼロ**: npm, node_modules, ビルドステップが不要
- **学習コストの低減**: 純粋な HTML/CSS/JS で保守可能

---

## データモデル（`state` オブジェクト）

```javascript
state = {
  persons: [{
    id, name, role, affiliation, color,
    x, y,           // ワールド座標
    roleIds: [],     // 割り当て済み役割IDの配列
    email, phone, joinDate, effectiveDate, photoUrl  // 詳細フィールド
  }],
  regions: [{
    id, name, x, y, w, h,
    color            // 領域ごとのカラー（#hex）
  }],
  roles: [{
    id, name, color, icon   // カスタム役割定義
  }],
  connectors: [{
    id, fromRegionId, toRegionId, fromSide, toSide,
    label, direction, waypoints: []
  }],
  textAnnotations: [{
    id, text, x, y, fontSize, color
  }],
  // UI状態
  viewMode,          // 'square' | 'quarter'
  tool,              // 'select' | 'region' | 'connector' | 'text'
  selectedId, selectedType,
  multiSelection: { personIds: [], regionIds: [] },
  searchQuery,
  zoom, canvasOffset, gridSize,
  undoStack, redoStack
}
```

---

## 描画パイプライン

```
render()
  ├── drawGrid()           # 背景グリッド
  ├── drawConnectors()     # カギ状コネクタ線
  ├── drawRegions()        # 部署の領域（色分け＋人数バッジ）
  ├── drawRegionPreview()  # 領域描画中のプレビュー
  ├── drawTextAnnotations()# テキスト注釈
  ├── drawPersons()        # 人物アイコン（名前＋役割バッジ）
  ├── drawConnectorPreview()
  ├── drawConnectionPoints()
  └── drawRangeSelect()    # 範囲選択の矩形
```

---

## 主要機能の実装場所

| 機能 | 関数 / セクション |
|------|-------------------|
| 人物追加 | `addPerson()` |
| 領域描画 | `drawRegions()` — 色分け、人数バッジ含む |
| コネクタ | `drawConnectors()`, ウェイポイント対応 |
| Undo/Redo | `pushUndo()`, `undo()`, `redo()`, `getSnapshot()` |
| プロパティパネル | `updatePropsPanel()` — person/region/connector/text |
| ツリー構造サイドバー | `renderPersonList()` — 領域ネストに自動同期 |
| 保存/読込 | `saveState()` → localStorage, `btnSaveFile`/`btnLoadFile` → JSON |
| 検索 | `personSearch` input → `state.searchQuery` → renderPersonList |
| コピー/ペースト | `copySelected()`, `pasteClipboard()` |
| PNG出力 | `btnExportPng` → offscreen canvas → toDataURL |
| CSV取込 | `csvImportInput` → FileReader → addPerson + regions |
| ダークモード | `btnDarkMode` → body.dark-mode クラス切替 |
| 共有URL | `btnShareUrl` → btoa(JSON) → clipboard |
| 印刷 | `btnPrint` → window.print() + CSS @media print |

---

## キーボードショートカット一覧

| キー | 動作 | 実装箇所 |
|------|------|----------|
| Ctrl+Z/Y | Undo/Redo | keydown handler |
| Ctrl+A | 全選択 | `selectAll()` |
| Ctrl+C/V | コピペ | `copySelected()` / `pasteClipboard()` |
| Ctrl+D | 複製 | copy + paste |
| Ctrl+S | 保存 | btnSaveFile.click() |
| Ctrl+F | 検索フォーカス | personSearch.focus() |
| Ctrl++/-/0 | ズーム | zoom 操作 |
| Delete | 削除 | `deleteSelected()` |
| Escape | 選択解除 | clearSelection + setToolActive('select') |
| Home | ビューリセット | offset=0, zoom=1.0 |
| 矢印 / Shift+矢印 | 移動 | `nudgeSelected()` |
| Ctrl+Click | 追加選択 | mousedown handler |
| Shift長押し | コネクタモード | shiftHeld フラグ |

---

## エンハンス履歴

| # | 内容 | 状態 |
|---|------|------|
| 1-6 | 基本機能（Canvas描画、ドラッグ、ズーム、コネクタ、役割管理、一括作成） | ✅ |
| 7 | ツリー構造サイドバー、フォントサイズ調整 | ✅ |
| 8 | JSONファイル保存/読込 | ✅ |
| 9 | PNG出力、検索＆ハイライト、人数バッジ、詳細フィールド | ✅ |
| 10 | 領域色分け、テキスト注釈、発令日フィールド、CSVインポート | ✅ |
| 11 | ダークモード、印刷レイアウト、共有URL | ✅ |
| 12 | キーボードショートカット（全16種） | ✅ |

詳細は `enhance.txt` を参照。

---

## 既知の制約・注意事項

- **localStorage**: 約5MBの上限。大量データでは JSON ファイル保存を推奨
- **共有URL**: データが大きいとURLが非常に長くなる（ブラウザ上限あり）
- **Canvas描画**: DOM要素ではないためアクセシビリティ対応が困難
- **兼務表示**: データモデルには対応済み（複数regionに人物配置可能）だが、点線表示は未実装
- **時系列管理**: `effectiveDate` フィールドはあるが、時点ごとの状態再現は未実装

---

## 今後の拡張候補

- 兼務の点線コネクタ表示
- 時系列スライダー（発令日ベースの状態再現）
- SVGエクスポート
- Excel（.xlsx）インポート対応
- リアルタイム共同編集（WebSocket + サーバー）
- モバイル対応（タッチ操作）
