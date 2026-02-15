/**
 * Unity Package Parser
 * .unitypackage ファイルを解析するためのユーティリティ
 */

class UnityPackageParser {
    /**
     * .unitypackage ファイル（gzip圧縮TAR形式）をArrayBufferから解析
     */
    static async parsePackage(arrayBuffer) {
        try {
            // gzip デコード
            let decompressed;
            try {
                decompressed = await this.decompressGzip(arrayBuffer);
            } catch (e) {
                // gzip デコード失敗時は圧縮されていないと仮定
                console.warn('gzip デコード失敗、圧縮なしと仮定:', e);
                decompressed = new Uint8Array(arrayBuffer);
            }

            const tarEntries = this.parseTar(decompressed.buffer || decompressed);
            const packageStructure = this.buildPackageStructure(tarEntries);
            return packageStructure;
        } catch (error) {
            console.error('Package parsing error:', error);
            throw new Error(`パッケージの解析に失敗しました: ${error.message}`);
        }
    }

    /**
     * gzip形式を展開
     */
    static async decompressGzip(arrayBuffer) {
        const blob = new Blob([arrayBuffer], { type: 'application/gzip' });
        const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(stream).blob();
        return new Uint8Array(await decompressedBlob.arrayBuffer());
    }

    /**
     * TAR形式ファイルを解析
     */
    static parseTar(arrayBuffer) {
        const view = new Uint8Array(arrayBuffer);
        const entries = [];
        let offset = 0;

        while (offset < view.length) {
            // TAR ヘッダーは 512 バイト
            if (offset + 512 > view.length) break;

            const headerBytes = view.subarray(offset, offset + 512);
            const header = this.parseTarHeader(headerBytes);

            if (!header.filename) {
                // ヘッダーが無効または終了
                break;
            }

            offset += 512;

            // ファイルサイズ
            const fileSize = parseInt(header.size, 8);
            const fileData = view.subarray(offset, offset + fileSize);

            entries.push({
                filename: header.filename,
                size: fileSize,
                data: fileData,
                fileType: header.fileType,
                mtime: header.mtime
            });

            // 次のエントリへ（512バイト単位でアライン）
            offset += fileSize;
            const padding = (512 - (fileSize % 512)) % 512;
            offset += padding;
        }

        return entries;
    }

    /**
     * TAR ヘッダーを解析
     */
    static parseTarHeader(headerBytes) {
        const toString = (start, end) => {
            const bytes = headerBytes.subarray(start, end);
            let str = '';
            for (let i = 0; i < bytes.length; i++) {
                if (bytes[i] === 0) break;
                str += String.fromCharCode(bytes[i]);
            }
            return str;
        };

        return {
            filename: toString(0, 100).trim(),
            fileType: String.fromCharCode(headerBytes[156]),
            size: toString(124, 136),
            mtime: toString(136, 148)
        };
    }

    /**
     * TAR エントリーから Unity Package 構造を構築
     */
    static buildPackageStructure(tarEntries) {
        const structure = {
            assets: {},
            version: null,
            errors: []
        };

        if (!tarEntries || tarEntries.length === 0) {
            structure.errors.push('No tar entries found');
            return structure;
        }

        console.log('TAR entries found:', tarEntries.length);

        // GUID ベースでグループ化
        const guidMap = {};

        for (const entry of tarEntries) {
            if (!entry.filename) continue;

            // pathname ファイルを解析（ファイル名、パス情報を取得）
            if (entry.filename.endsWith('/pathname')) {
                const guid = entry.filename.split('/')[0];
                const pathnameText = this.bytesToString(entry.data);
                if (!guidMap[guid]) {
                    guidMap[guid] = {};
                }
                guidMap[guid].pathname = pathnameText.trim();
                console.log('Found pathname for', guid, ':', pathnameText.trim());
            }
            // asset ファイルを取得（実際のファイルデータ）
            else if (entry.filename.endsWith('/asset')) {
                const guid = entry.filename.split('/')[0];
                if (!guidMap[guid]) {
                    guidMap[guid] = {};
                }
                guidMap[guid].asset = entry.data;
                console.log('Found asset for', guid, '- size:', entry.data.length);
            }
        }

        console.log('Total GUIDs found:', Object.keys(guidMap).length);

        // 構造を構築
        for (const [guid, data] of Object.entries(guidMap)) {
            if (data.pathname) {
                const assetPath = data.pathname;
                structure.assets[assetPath] = {
                    guid: guid,
                    size: data.asset ? data.asset.length : 0,
                    data: data.asset,
                    type: this.detectAssetType(assetPath, data.asset)
                };
            }
        }

        console.log('Assets built:', Object.keys(structure.assets).length);

        return structure;
    }

    /**
     * Uint8Array をテキスト文字列に変換
     */
    static bytesToString(uint8Array) {
        let str = '';
        for (let i = 0; i < uint8Array.length; i++) {
            str += String.fromCharCode(uint8Array[i]);
        }
        return str;
    }

    /**
     * アセットタイプを検出
     */
    static detectAssetType(pathname, data) {
        const ext = pathname.split('.').pop().toLowerCase();
        const mimeMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tga': 'image/x-tga',
            'psd': 'image/vnd.adobe.photoshop',
            'exr': 'image/x-exr',
            'unity': 'text/plain',
            'yaml': 'text/yaml',
            'json': 'application/json',
            'txt': 'text/plain',
            'cs': 'text/x-csharp',
            'shader': 'text/plain',
            'asset': 'application/octet-stream',
            'prefab': 'application/octet-stream',
            'scene': 'application/octet-stream',
            'mat': 'application/octet-stream',
            'anim': 'application/octet-stream',
            'controller': 'application/octet-stream',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'fbx': 'application/octet-stream',
            'blend': 'application/octet-stream',
            'obj': 'text/plain',
            'mtl': 'text/plain',
            'dae': 'text/xml',
        };

        const type = {
            extension: ext,
            mimeType: mimeMap[ext] || 'application/octet-stream',
            category: this.categorizeAsset(ext)
        };

        return type;
    }

    /**
     * アセットをカテゴリに分類
     */
    static categorizeAsset(ext) {
        const categories = {
            images: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tga', 'psd', 'exr'],
            scripts: ['cs', 'js', 'shader'],
            documents: ['txt', 'json', 'yaml', 'unity', 'xml', 'obj', 'mtl', 'dae'],
            audio: ['wav', 'mp3', 'ogg', 'm4a'],
            models: ['fbx', 'blend', 'obj', 'dae'],
            assets: ['asset', 'prefab', 'scene', 'mat', 'anim', 'controller']
        };

        for (const [category, extensions] of Object.entries(categories)) {
            if (extensions.includes(ext)) {
                return category;
            }
        }
        return 'other';
    }

    /**
     * テキストファイルかどうかを判定
     */
    static isTextFile(mimeType) {
        return mimeType.startsWith('text/') || 
               mimeType === 'application/json' ||
               mimeType === 'application/xml' ||
               mimeType === 'text/yaml';
    }

    /**
     * 画像ファイルかどうかを判定
     */
    static isImageFile(mimeType) {
        return mimeType.startsWith('image/');
    }

    /**
     * 3Dモデルファイルかどうかを判定
     */
    static isModelFile(mimeType, extension) {
        const modelExtensions = ['fbx', 'obj', 'dae', 'blend', 'gltf', 'glb'];
        return modelExtensions.includes(extension.toLowerCase());
    }

    /**
     * Uint8Array から Base64 文字列を生成
     */
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * ファイル内容をプレビュー用に取得
     */
    static getFilePreview(data, mimeType, maxChars = 5000, extension = '') {
        if (this.isImageFile(mimeType)) {
            const base64 = this.arrayBufferToBase64(data);
            return {
                type: 'image',
                content: `data:${mimeType};base64,${base64}`
            };
        } else if (this.isModelFile(mimeType, extension)) {
            // 3Dモデルファイル
            return {
                type: 'model',
                content: data,
                extension: extension.toLowerCase()
            };
        } else if (this.isTextFile(mimeType)) {
            try {
                const text = this.bytesToString(data);
                return {
                    type: 'text',
                    content: text.length > maxChars ? text.substring(0, maxChars) + '\n...\n(内容が長いため省略されています)' : text
                };
            } catch (e) {
                return {
                    type: 'error',
                    content: 'テキストの解析に失敗しました'
                };
            }
        } else {
            const sizeKB = (data.length / 1024).toFixed(2);
            return {
                type: 'binary',
                content: `バイナリファイル (${sizeKB} KB)`
            };
        }
    }
}
