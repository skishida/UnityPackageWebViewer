# Unity Package Viewer

ブラウザで Unity Package (.unitypackage) の内容を確認できるツールです。すべての処理がクライアント側で完結します。

## 使い方

### オンライン (GitHub Pages)

TBA

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

1. .unitypackage ファイルをドラッグ&ドロップ
2. ファイルツリーから見たいファイルをクリック
3. プレビューが表示されます
4. 必要に応じて個別保存可能

## 機能

- 階層的なファイルツリー表示
- PNG, JPG, GIF などの画像プレビュー
- C#スクリプト、JSON、YAML などのテキスト表示
- ファイル統計情報

## ファイル構成

```
UnityPackageViewer/
├── index.html                    # メインアプリケーション
├── app.js                        # UIロジック
├── unitypackage-parser.js        # TAR/gzip パーサー
├── server.py                     # Pythonサーバー
├── run.bat                       # Windows起動スクリプト
├── run.sh                        # macOS/Linux起動スクリプト
└── README.md                     # このファイル
```

## セキュリティ

- データはブラウザのメモリのみで処理
- サーバーへの送信なし
- Cookie/LocalStorage 未使用
- オフライン環境で動作

## プレビュー対応

ブラウザで以下のファイルはプレビュー表示できます：

| タイプ | 拡張子 | 表示内容 |
|--------|--------|---------|
| 画像 | png, jpg, jpeg, gif, bmp, tga, psd, exr | 画像を表示 |
| テキスト | txt, json, xml, yaml, cs, js, shader, unity, obj, mtl, dae | ファイル内容を表示 |
| その他 | 上記以外 | ファイルサイズのみ表示 |

----

Vive coded with GitHub Copilot
