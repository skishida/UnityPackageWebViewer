@echo off
REM Windows用サーバー起動スクリプト
REM server.py がない場合は python -m http.server を使用

cd /d "%~dp0"

echo.
echo ================================
echo Unity Package Viewer
echo ================================
echo.

REM Python がインストールされているか確認
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python が見つかりました
    python server.py
) else (
    echo [!] Python が見つかりません
    echo.
    echo 代わりに Python 組み込みサーバーを使用します
    echo.
    python -m http.server 8000
)

pause
