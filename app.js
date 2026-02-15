/**
 * Unity Package Viewer - メインアプリケーション
 */

class UnityPackageViewer {
    constructor() {
        this.currentPackage = null;
        this.selectedFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // ドラッグ＆ドロップイベント
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadFile(files[0]);
            }
        });

        // ファイル選択イベント
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadFile(e.target.files[0]);
            }
        });

        // クリックでファイル選択を開く（uploadArea全体をクリック可能）
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    async loadFile(file) {
        if (!file.name.endsWith('.unitypackage')) {
            alert('エラー: .unitypackage ファイルを選択してください');
            return;
        }

        console.log('Loading file:', file.name, 'Size:', file.size, 'bytes');

        // ローディング表示
        this.showLoading();

        try {
            const arrayBuffer = await file.arrayBuffer();
            console.log('File loaded, ArrayBuffer size:', arrayBuffer.byteLength);
            
            this.currentPackage = await UnityPackageParser.parsePackage(arrayBuffer);
            
            console.log('Package parsed successfully');
            console.log('Assets found:', Object.keys(this.currentPackage.assets).length);
            
            if (Object.keys(this.currentPackage.assets).length === 0) {
                console.error('No assets found in package');
                throw new Error('パッケージにファイルが見つかりません');
            }
            
            this.displayPackage();
        } catch (error) {
            console.error('Error:', error);
            this.showError(error.message);
        }
    }

    displayPackage() {
        const mainContent = document.getElementById('mainContent');
        const uploadSection = mainContent.parentElement.querySelector('.upload-section');
        const contentBody = document.getElementById('contentBody');

        // ローディング画面をクリア
        contentBody.innerHTML = '';
        contentBody.className = 'content-body';

        // UI を表示
        uploadSection.style.display = 'none';
        mainContent.style.display = 'flex';

        // 統計情報を表示
        this.updateStats();

        // ファイルツリーを表示
        this.buildFileTree();
    }

    updateStats() {
        const stats = this.currentPackage.assets;
        const assets = Object.values(stats);

        const categories = {};
        let totalSize = 0;

        for (const asset of assets) {
            const cat = asset.type.category;
            if (!categories[cat]) {
                categories[cat] = 0;
            }
            categories[cat]++;
            totalSize += asset.size;
        }

        const statsHtml = `
            ファイル数: ${assets.length} | 
            合計: ${this.formatBytes(totalSize)} | 
            アセット: ${categories.assets || 0} | 
            スクリプト: ${categories.scripts || 0} | 
            画像: ${categories.images || 0} | 
            モデル: ${categories.models || 0}
        `;

        document.getElementById('contentFooter').innerHTML = statsHtml;
    }

    buildFileTree() {
        const assets = this.currentPackage.assets;
        const treeContainer = document.getElementById('treeContainer');
        treeContainer.innerHTML = '';

        // ファイル構造を階層化
        const tree = this.buildHierarchy(assets);

        // ツリーをレンダリング
        for (const [key, value] of Object.entries(tree)) {
            const nodeElement = this.createTreeNode(key, value);
            treeContainer.appendChild(nodeElement);
        }
    }

    buildHierarchy(assets) {
        const tree = {};

        for (const [filepath, asset] of Object.entries(assets)) {
            const parts = filepath.split('/').filter(p => p);
            let current = tree;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLast = i === parts.length - 1;

                if (!current[part]) {
                    if (isLast) {
                        current[part] = {
                            type: 'file',
                            path: filepath,
                            asset: asset,
                            children: null
                        };
                    } else {
                        current[part] = {
                            type: 'folder',
                            path: filepath.split('/').slice(0, i + 1).join('/'),
                            children: {}
                        };
                    }
                } else if (!isLast && current[part].type === 'file') {
                    // ファイルノードだったがさらに子要素がある場合、フォルダーに変換
                    const existingFile = current[part];
                    current[part] = {
                        type: 'folder',
                        path: filepath.split('/').slice(0, i + 1).join('/'),
                        children: {}
                    };
                }

                if (!isLast && current[part].children) {
                    current = current[part].children;
                }
            }
        }

        return tree;
    }

    createTreeNode(name, data, level = 0) {
        const nodeDiv = document.createElement('div');
        
        if (data.type === 'file') {
            nodeDiv.className = 'tree-node';
            nodeDiv.innerHTML = `
                <div class="tree-node-content">
                    <span class="tree-toggle"></span>
                    <span class="file-icon">${this.getFileIcon(data.asset.type)}</span>
                    <span>${name}</span>
                </div>
            `;

            nodeDiv.addEventListener('click', () => {
                document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
                nodeDiv.classList.add('selected');
                this.showFilePreview(data.path, data.asset);
            });
        } else {
            // フォルダーノード
            const isExpanded = level < 2; // デフォルトで深さ2までを展開

            nodeDiv.className = 'tree-node';
            nodeDiv.innerHTML = `
                <div class="tree-node-content">
                    <span class="tree-toggle" style="cursor: pointer;">${isExpanded ? '▼' : '▶'}</span>
                    <span class="file-icon">📁</span>
                    <span>${name}</span>
                </div>
            `;

            const childrenDiv = document.createElement('div');
            childrenDiv.className = `tree-children ${isExpanded ? '' : 'hidden'}`;

            for (const [childName, childData] of Object.entries(data.children)) {
                const childNode = this.createTreeNode(childName, childData, level + 1);
                childrenDiv.appendChild(childNode);
            }

            nodeDiv.querySelector('.tree-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                childrenDiv.classList.toggle('hidden');
                nodeDiv.querySelector('.tree-toggle').textContent = childrenDiv.classList.contains('hidden') ? '▶' : '▼';
            });

            nodeDiv.appendChild(childrenDiv);
        }

        return nodeDiv;
    }

    getFileIcon(assetType) {
        const iconMap = {
            'images': '🖼️',
            'scripts': '📝',
            'documents': '📄',
            'audio': '🔊',
            'models': '🎨',
            'assets': '⚙️',
            'other': '📦'
        };
        return iconMap[assetType.category] || '📦';
    }

    showFilePreview(filepath, asset) {
        this.selectedFile = { filepath, asset };

        const contentTitle = document.getElementById('contentTitle');
        const contentInfo = document.getElementById('contentInfo');
        const contentBody = document.getElementById('contentBody');

        contentTitle.textContent = filepath.split('/').pop();

        const sizeKB = (asset.size / 1024).toFixed(2);
        contentInfo.innerHTML = `
            <strong>パス:</strong> ${filepath}<br>
            <strong>サイズ:</strong> ${sizeKB} KB<br>
            <strong>タイプ:</strong> ${asset.type.extension.toUpperCase()}<br>
            <strong>GUID:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">${asset.guid}</code>
        `;

        const preview = UnityPackageParser.getFilePreview(asset.data, asset.type.mimeType);

        contentBody.innerHTML = '';
        contentBody.className = `content-body ${preview.type}`;

        if (preview.type === 'image') {
            const img = document.createElement('img');
            img.src = preview.content;
            img.className = 'preview-image';
            img.onerror = () => {
                contentBody.innerHTML = '<p>画像の表示に失敗しました</p>';
            };
            contentBody.appendChild(img);
        } else if (preview.type === 'text') {
            const pre = document.createElement('pre');
            pre.textContent = preview.content;
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            contentBody.appendChild(pre);
        } else if (preview.type === 'binary') {
            contentBody.innerHTML = `<p>${preview.content}</p>`;
        } else {
            contentBody.innerHTML = `<p>❌ ${preview.content}</p>`;
        }

        // ダウンロードボタンを追加
        this.addDownloadButton(contentInfo, filepath, asset.data);
    }

    addDownloadButton(container, filepath, data) {
        const filename = filepath.split('/').pop();
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.marginTop = '10px';
        btn.textContent = '💾 ダウンロード';

        btn.addEventListener('click', () => {
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        // 既存のボタンを削除
        const existingBtn = container.querySelector('.btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        container.appendChild(btn);
    }

    showLoading() {
        const contentBody = document.getElementById('contentBody');
        contentBody.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
    }

    showError(message) {
        const mainContent = document.getElementById('mainContent');
        const uploadSection = mainContent.parentElement.querySelector('.upload-section');

        uploadSection.innerHTML += `<div class="error">❌ ${message}</div>`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new UnityPackageViewer();
});
