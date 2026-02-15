#!/usr/bin/env python3
"""
シンプルなHTTPサーバー
Unity Package Viewer をブラウザで実行するために使用

使用方法:
    python server.py
    または
    python3 server.py

その後、ブラウザで http://localhost:8000 にアクセス
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # キャッシュを無効化（開発用）
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    # スクリプトのディレクトリに移動
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"✅ サーバーを起動しました: {url}")
        print(f"🌐 ブラウザで自動的に開きます...")
        print(f"⏹️  終了するには Ctrl+C を押してください\n")
        
        # ブラウザを自動的に開く
        try:
            webbrowser.open(url)
        except:
            print(f"📌 ブラウザを手動で開いてください: {url}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✋ サーバーを停止しました")

if __name__ == "__main__":
    run_server()
