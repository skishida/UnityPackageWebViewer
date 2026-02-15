#!/bin/bash
# macOS/Linux用サーバー起動スクリプト

cd "$(dirname "$0")"

echo ""
echo "================================"
echo "Unity Package Viewer"
echo "================================"
echo ""

# Python がインストールされているか確認
if command -v python3 &> /dev/null; then
    echo "[OK] Python3 が見つかりました"
    python3 server.py
elif command -v python &> /dev/null; then
    echo "[OK] Python が見つかりました"
    python server.py
else
    echo "[!] Python が見つかりません"
    echo ""
    echo "Python 3 をインストールしてください："
    echo "  macOS: brew install python3"
    echo "  Ubuntu/Debian: sudo apt-get install python3"
    echo "  CentOS/RHEL: sudo yum install python3"
    exit 1
fi
