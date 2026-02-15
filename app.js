/**
 * Unity Package Viewer - メインアプリケーション
 */

class UnityPackageViewer {
    constructor() {
        this.currentPackage = null;
        this.comparePackages = { package1: null, package2: null };
        this.selectedFile = null;
        this.currentTab = 'viewer';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabButtons();
    }

    setupTabButtons() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        this.currentTab = tab;

        // タブボタンをアップデート
        document.querySelectorAll('.tab-button').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // アップロードセクション切り替え
        const viewerUpload = document.getElementById('viewerUploadSection');
        const compareUpload = document.getElementById('compareUploadSection');
        const mainContent = document.getElementById('mainContent');

        if (tab === 'viewer') {
            viewerUpload.style.display = 'block';
            compareUpload.style.display = 'none';
            document.getElementById('viewer-tab').style.display = 'flex';
            document.getElementById('compare-tab').style.display = 'none';
            // プレビューをリセット
            document.getElementById('diffPreview').style.display = 'none';
            document.getElementById('diffPreview1').innerHTML = '';
            document.getElementById('diffPreview2').innerHTML = '';
            // ビューアにパッケージがある場合はmainContentを表示
            if (this.currentPackage) {
                mainContent.style.display = 'flex';
            }
        } else {
            viewerUpload.style.display = 'none';
            compareUpload.style.display = 'block';
            document.getElementById('viewer-tab').style.display = 'none';
            document.getElementById('compare-tab').style.display = 'flex';
            // 比較に2つのパッケージがある場合はmainContentを表示
            if (this.comparePackages.package1 && this.comparePackages.package2) {
                mainContent.style.display = 'flex';
            }
        }
    }

    setupEventListeners() {
        // ビューアタブのイベント
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

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

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadFile(e.target.files[0]);
            }
        });

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // 比較タブのイベント
        this.setupCompareEventListeners();

        // フィルター変更イベント
        document.getElementById('filterAdded').addEventListener('change', () => this.updateDiffList());
        document.getElementById('filterRemoved').addEventListener('change', () => this.updateDiffList());
        document.getElementById('filterModified').addEventListener('change', () => this.updateDiffList());
    }

    setupCompareEventListeners() {
        ['1', '2'].forEach(num => {
            const uploadArea = document.getElementById(`uploadArea${num}`);
            const fileInput = uploadArea.querySelector('.fileInput-compare');

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
                if (e.dataTransfer.files.length > 0) {
                    this.loadCompareFile(e.dataTransfer.files[0], num);
                }
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.loadCompareFile(e.target.files[0], num);
                }
            });

            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
        });
    }

    async loadFile(file) {
        if (!file.name.endsWith('.unitypackage')) {
            alert('エラー: .unitypackage ファイルを選択してください');
            return;
        }

        console.log('Loading file:', file.name, 'Size:', file.size, 'bytes');

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

    async loadCompareFile(file, packageNum) {
        if (!file.name.endsWith('.unitypackage')) {
            alert('エラー: .unitypackage ファイルを選択してください');
            return;
        }

        const statusElement = document.getElementById(`package${packageNum}-status`);
        statusElement.innerHTML = '⏳ 読み込み中...';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pkg = await UnityPackageParser.parsePackage(arrayBuffer);

            this.comparePackages[`package${packageNum}`] = pkg;
            
            const fileCount = Object.keys(pkg.assets).length;
            const totalSize = Object.values(pkg.assets).reduce((sum, asset) => sum + asset.size, 0);

            statusElement.innerHTML = `✅ 読み込み完了<br><small>${fileCount} ファイル, ${this.formatBytes(totalSize)}</small>`;

            // 両方のパッケージが読み込まれたら比較を実行
            if (this.comparePackages.package1 && this.comparePackages.package2) {
                // mainContentを表示
                document.getElementById('mainContent').style.display = 'flex';
                this.updateDiffList();
            }
        } catch (error) {
            console.error('Error loading compare file:', error);
            statusElement.innerHTML = `❌ 読み込み失敗: ${error.message}`;
        }
    }

    updateDiffList() {
        const pkg1 = this.comparePackages.package1;
        const pkg2 = this.comparePackages.package2;

        // プレビューをリセット
        document.getElementById('diffPreview').style.display = 'none';
        document.getElementById('diffPreview1').innerHTML = '';
        document.getElementById('diffPreview2').innerHTML = '';

        if (!pkg1 || !pkg2) {
            document.getElementById('diffList').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>両方のパッケージを読み込んでください</p>
                </div>
            `;
            return;
        }

        // 差分を計算
        const diffs = this.calculateDifferences(pkg1, pkg2);

        // フィルター設定を取得
        const filterAdded = document.getElementById('filterAdded').checked;
        const filterRemoved = document.getElementById('filterRemoved').checked;
        const filterModified = document.getElementById('filterModified').checked;

        // フィルター適用
        const filtered = diffs.filter(diff => {
            if (diff.status === 'added') return filterAdded;
            if (diff.status === 'removed') return filterRemoved;
            if (diff.status === 'modified') return filterModified;
            return false;
        });

        // UI更新
        const diffList = document.getElementById('diffList');
        if (filtered.length === 0) {
            diffList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>差分がありません</p>
                </div>
            `;
            return;
        }

        diffList.innerHTML = '';
        filtered.forEach((diff, index) => {
            const element = this.createDiffItem(diff, index);
            diffList.appendChild(element);
        });
    }

    calculateDifferences(pkg1, pkg2) {
        const diffs = [];
        const assets1 = pkg1.assets;
        const assets2 = pkg2.assets;

        const seen = new Set();

        // pkg1 に存在するファイルをチェック
        for (const [path, asset1] of Object.entries(assets1)) {
            seen.add(path);
            const asset2 = assets2[path];

            if (!asset2) {
                // 削除されたファイル
                diffs.push({
                    path,
                    status: 'removed',
                    size1: asset1.size,
                    size2: 0,
                    asset1,
                    asset2: null
                });
            } else if (asset1.size !== asset2.size || asset1.guid !== asset2.guid) {
                // 変更されたファイル
                diffs.push({
                    path,
                    status: 'modified',
                    size1: asset1.size,
                    size2: asset2.size,
                    asset1,
                    asset2
                });
            }
        }

        // pkg2 に存在するが pkg1 に存在しないファイル
        for (const [path, asset2] of Object.entries(assets2)) {
            if (!seen.has(path)) {
                diffs.push({
                    path,
                    status: 'added',
                    size1: 0,
                    size2: asset2.size,
                    asset1: null,
                    asset2
                });
            }
        }

        return diffs.sort((a, b) => a.path.localeCompare(b.path));
    }

    createDiffItem(diff, index) {
        const element = document.createElement('div');
        element.className = `diff-item ${diff.status}`;

        const filename = diff.path.split('/').pop();
        const sizeChange = this.formatSizeChange(diff.size1, diff.size2);

        element.innerHTML = `
            <div>
                <span class="diff-item-status ${diff.status}">
                    ${this.getStatusLabel(diff.status)}
                </span>
                <span class="diff-item-path">${diff.path}</span>
            </div>
            <div class="diff-item-info">
                ${diff.status === 'removed' ? `サイズ: ${this.formatBytes(diff.size1)}` : ''}
                ${diff.status === 'added' ? `サイズ: ${this.formatBytes(diff.size2)}` : ''}
                ${diff.status === 'modified' ? `サイズ変更: ${diff.size1 > 0 ? this.formatBytes(diff.size1) : '新規'} → ${this.formatBytes(diff.size2)}` : ''}
            </div>
        `;

        element.addEventListener('click', () => {
            this.showDiffPreview(diff);
        });

        return element;
    }

    showDiffPreview(diff) {
        const preview1 = document.getElementById('diffPreview1');
        const preview2 = document.getElementById('diffPreview2');
        const previewContainer = document.getElementById('diffPreview');

        // プレビューを表示
        if (diff.asset1) {
            const preview = UnityPackageParser.getFilePreview(diff.asset1.data, diff.asset1.type.mimeType);
            this.renderPreview(preview1, preview, diff.status, '1', diff.path);
        } else {
            preview1.innerHTML = '<div class="empty-state"><p>パッケージ1に存在しません</p></div>';
        }

        if (diff.asset2) {
            const preview = UnityPackageParser.getFilePreview(diff.asset2.data, diff.asset2.type.mimeType);
            this.renderPreview(preview2, preview, diff.status, '2', diff.path);
        } else {
            preview2.innerHTML = '<div class="empty-state"><p>パッケージ2に存在しません</p></div>';
        }

        previewContainer.style.display = 'flex';
    }

    getLanguageFromPath(filePath) {
        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
        const languageMap = {
            '.cs': 'csharp',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.py': 'python',
            '.rb': 'ruby',
            '.php': 'php',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.sql': 'sql',
            '.md': 'markdown',
            '.txt': 'plaintext',
            '.glsl': 'glsl',
            '.shader': 'glsl'
        };
        return languageMap[ext] || null;
    }

    renderPreview(container, preview, status, packageNum, filePath = '') {
        container.innerHTML = '';

        if (preview.type === 'image') {
            const img = document.createElement('img');
            img.src = preview.content;
            img.onerror = () => {
                container.innerHTML = '<p>画像の表示に失敗しました</p>';
            };
            container.appendChild(img);
        } else if (preview.type === 'text') {
            const language = this.getLanguageFromPath(filePath);
            
            const code = document.createElement('code');
            if (language) {
                code.className = `language-${language}`;
            }
            code.textContent = preview.content;

            const pre = document.createElement('pre');
            pre.className = 'hljs-preview';
            pre.appendChild(code);
            
            container.appendChild(pre);

            // Highlight.jsでハイライト
            if (typeof hljs !== 'undefined') {
                if (language) {
                    hljs.highlightElement(code);
                } else {
                    hljs.highlightElement(code);
                }
            }
        } else if (preview.type === 'binary') {
            container.innerHTML = `<p style="color: #999;">${preview.content}</p>`;
        } else {
            container.innerHTML = `<p style="color: #999;">❌ ${preview.content}</p>`;
        }
    }

    getStatusLabel(status) {
        const labels = {
            added: '追加',
            removed: '削除',
            modified: '変更'
        };
        return labels[status] || status;
    }

    formatSizeChange(size1, size2) {
        if (size1 === 0) return `新規: ${this.formatBytes(size2)}`;
        if (size2 === 0) return `削除: ${this.formatBytes(size1)}`;
        const diff = size2 - size1;
        const sign = diff > 0 ? '+' : '';
        return `${sign}${this.formatBytes(diff)}`;
    }

    displayPackage() {
        const mainContent = document.getElementById('mainContent');
        const uploadSection = document.getElementById('viewerUploadSection');
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
            const language = this.getLanguageFromPath(filepath);
            
            const code = document.createElement('code');
            if (language) {
                code.className = `language-${language}`;
            }
            code.textContent = preview.content;

            const pre = document.createElement('pre');
            pre.className = 'hljs-preview';
            pre.appendChild(code);
            
            contentBody.appendChild(pre);

            // Highlight.jsでハイライト
            if (typeof hljs !== 'undefined') {
                if (language) {
                    hljs.highlightElement(code);
                } else {
                    hljs.highlightElement(code);
                }
            }
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
        const uploadSection = document.getElementById('viewerUploadSection');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `❌ ${message}`;
        uploadSection.appendChild(errorDiv);
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
