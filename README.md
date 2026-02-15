# Unity Package Viewer

ブラウザで Unity Package (.unitypackage) の内容を確認できるツールです。すべての処理がクライアント側で完結します。

## 使い方

### オンライン (GitHub Pages)

Please refer `About` in github webpage

### ローカル実行

- Windows: `run.bat` をダブルクリック

- macOS/Linux:
    ```bash
    chmod +x run.sh
    ./run.sh
    ```

- その他
    ```bash
    python server.py
    ```

ブラウザで http://localhost:8000 を開きます。

## ファイルの読み込み

### ビューアタブ

1. .unitypackage ファイルをドラッグ&ドロップ
2. ファイルツリーから見たいファイルをクリック
3. プレビューが表示されます
4. 必要に応じて個別保存可能

### 比較タブ

1. 2つの .unitypackage ファイルを各々アップロード
2. 差分一覧が自動表示されます
3. フィルター（追加/削除/変更）で表示を絞り込み可能
4. ファイルをクリックすると、両方のパッケージの内容を見比べられます

## 機能

### ビューアモード
- 階層的なファイルツリー表示
- PNG, JPG, GIF などの画像プレビュー
- C#スクリプト、JSON、YAML などのテキスト表示
- FBX, OBJ, DAE などの3Dモデルプレビュー（Three.js使用）
  - マウスドラッグで回転、スクロールでズーム
  - ワイヤーフレーム表示切り替え
  - 三角形数やフォーマット情報表示
- ファイル統計情報

### 比較モード
- 2つのパッケージ間の差分検出
- 追加/削除/変更されたファイルを色分け表示
- ファイルのパス、サイズ変更量を一覧表示
- テキスト/画像/3Dモデルファイルのサイドバイサイド比較表示
- フィルター機能（変更タイプでの絞り込み）

## ファイル構成

```
UnityPackageViewer/
├── index.html                    # メインアプリケーション
├── app.js                        # UIロジック＆比較ロジック
├── unitypackage-parser.js        # TAR/gzip パーサー
├── server.py                     # Pythonサーバー
├── run.bat                       # Windows起動スクリプト
├── run.sh                        # macOS/Linux起動スクリプト
└── README.md                     # このファイル
```

## セキュリティ

- データはブラウザのメモリのみで処理
- サーバーへのファイル送信なし
- Cookie/LocalStorage 未使用
- CDN経由でのjs読み込みは使用
    

## プレビュー対応

ブラウザで以下のファイルはプレビュー表示できます：

| タイプ | 拡張子 | 表示内容 |
|--------|--------|---------|
| 画像 | png, jpg, jpeg, gif, bmp, tga, psd, exr | 画像を表示 |
| 3Dモデル | fbx, obj, dae, blend | 3Dビューアで表示 |
| テキスト | txt, json, xml, yaml, cs, js, shader, unity, mtl | ファイル内容を表示 |
| その他 | 上記以外 | ファイルサイズのみ表示 |

----

Vive coded with GitHub Copilot
