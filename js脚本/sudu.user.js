// ==UserScript==
// @name        速读谷小说下载器
// @namespace   Violentmonkey Scripts
// @match       https://www.sudugu.org/*/txt.html*
// @match       https://www.sudugu.org/*/
// @match       https://www.sudugu.org/*
// @grant       GM_xmlhttpRequest
// @grant       GM_download
// @version     1.5
// @author      xhg
// @description 速读谷小说下载器 - 一键下载当前页面所有分章节并合并为单个文件，支持自动跳转下载页
// ==/UserScript==

(function() {
    'use strict';

    const BASE_URL = 'https://www.sudugu.org';
    const MAX_CONCURRENT = 5;
    const ESTIMATED_SIZE_PER_CHAPTER_KB = 4600;
    const AUTO_JUMP_DELAY = 1000;
    let isDownloading = false;
    let jumpTimeout = null;

    function createDownloadButton() {
        const chapterCount = getNovelInfo().chapters.length;
        
        const container = document.createElement('div');
        container.id = 'sudu-download-container';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        `;

        const btn = document.createElement('button');
        btn.id = 'sudu-download-btn';
        btn.textContent = '📥';
        btn.title = '下载并合并所有章节';
        btn.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        `;
        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.6)';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 2px 10px rgba(102, 126, 234, 0.4)';
        };

        const hint = document.createElement('span');
        hint.id = 'sudu-download-hint';
        hint.textContent = `共 ${chapterCount} 卷`;
        hint.style.cssText = `
            font-size: 11px;
            color: white;
            background: rgba(0,0,0,0.6);
            padding: 2px 8px;
            border-radius: 10px;
            white-space: nowrap;
        `;

        container.appendChild(btn);
        container.appendChild(hint);
        document.body.appendChild(container);
        btn.addEventListener('click', startDownload);
    }

    function showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.sudu-notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'sudu-notification';

        const colors = {
            info: { bg: 'linear-gradient(135deg, #007bff, #6f42c1)', icon: 'ℹ️' },
            success: { bg: 'linear-gradient(135deg, #28a745, #20c997)', icon: '✅' },
            error: { bg: 'linear-gradient(135deg, #dc3545, #e74c3c)', icon: '❌' },
            warning: { bg: 'linear-gradient(135deg, #ffc107, #fd7e14)', icon: '⚠️' }
        };

        const style = colors[type] || colors.info;

        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            left: 10px;
            background: ${style.bg};
            color: white;
            padding: 12px 15px;
            border-radius: 8px;
            z-index: 10001;
            font-size: 13px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.innerHTML = `<span>${style.icon}</span> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function httpRequest(url, onProgress) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onprogress: (progress) => {
                    if (onProgress && progress.loaded) {
                        onProgress(progress.loaded, progress.total || 0);
                    }
                },
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const text = response.responseText || response.response;
                        resolve({ content: text, size: new Blob([text]).size });
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (error) => reject(error)
            });
        });
    }

    function cleanTitle(title) {
        if (!title) return '未知小说';
        let cleaned = title.trim();

        if (cleaned.endsWith('.txt')) {
            cleaned = cleaned.slice(0, -4);
        }

        cleaned = cleaned.replace(/\(\d+[-~]\d+章?\)/g, '').trim();
        cleaned = cleaned.replace(/\(\d+章\)/g, '').trim();
        cleaned = cleaned.replace(/[-_]+/g, '').trim();
        cleaned = cleaned.replace(/【.*?】/g, '').trim();
        cleaned = cleaned.replace(/《|》/g, '').trim();

        return cleaned || '未知小说';
    }

    function extractTitleFromMeta() {
        const metaDesc = document.querySelector('meta[name="description"]')?.content;
        if (metaDesc) {
            const match = metaDesc.match(/《([^》]+)》/);
            if (match) return match[1];
        }
        return null;
    }

    function getNovelInfo() {
        let rawTitle = '未知小说';

        const metaTitle = extractTitleFromMeta();
        if (metaTitle) {
            rawTitle = metaTitle;
        }

        if (rawTitle === '未知小说') {
            rawTitle = document.querySelector('h1')?.textContent?.trim() ||
                      document.querySelector('.title')?.textContent?.trim() ||
                      '未知小说';
        }

        if (rawTitle === '未知小说' || rawTitle.includes('TXT下载')) {
            const titleTag = document.querySelector('title')?.textContent;
            if (titleTag) {
                const parts = titleTag.split('-').map(p => p.trim()).filter(Boolean);
                let start = 0;
                if (parts.length > 1 && /^\d+$/.test(parts[0])) start = 1;
                for (let i = start; i < parts.length; i++) {
                    const p = parts[i];
                    if (!p.includes('TXT') && !p.includes('速读谷') && !p.includes('下载')) {
                        rawTitle = p; break;
                    }
                }
                if (rawTitle === '未知小说' || rawTitle.includes('TXT下载')) {
                    rawTitle = parts[start] || parts[0];
                }
            }
        }

        const novelTitle = cleanTitle(rawTitle);

        const listElement = document.querySelector('#list');
        if (!listElement) {
            return { title: novelTitle, chapters: [] };
        }

        const chapters = [];
        const links = listElement.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            if (href && text && href.includes('/txt/')) {
                chapters.push({
                    title: text,
                    url: href.startsWith('http') ? href : BASE_URL + href
                });
            }
        });

        return { title: novelTitle, chapters };
    }

    function calculateConcurrentThreads(chapterCount) {
        if (chapterCount <= 1) return 1;
        if (chapterCount <= 5) return 2;
        if (chapterCount <= 10) return 3;
        if (chapterCount <= 20) return 4;
        return MAX_CONCURRENT;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    async function downloadWithConcurrency(chapters, onProgress, onComplete) {
        const contentArray = new Array(chapters.length);
        const sizes = new Array(chapters.length).fill(0);
        const errors = [];
        const total = chapters.length;
        const concurrentThreads = calculateConcurrentThreads(total);

        let activeCount = 0;
        let completedCount = 0;
        let nextIndex = 0;
        let totalDownloadedSize = 0;

        return new Promise((resolve) => {
            async function downloadOne(index) {
                if (!isDownloading || index >= total) return;

                activeCount++;
                const chapter = chapters[index];
                onProgress(index, 'downloading', 0, activeCount, completedCount, totalDownloadedSize);

                try {
                    const result = await httpRequest(chapter.url, (loaded, total) => {
                        onProgress(index, 'downloading', loaded, activeCount, completedCount, totalDownloadedSize + loaded);
                    });
                    contentArray[index] = result.content;
                    sizes[index] = result.size;
                    totalDownloadedSize += result.size;
                    completedCount++;
                    activeCount--;
                    onProgress(index, 'completed', result.size, activeCount, completedCount, totalDownloadedSize);
                } catch (e) {
                    contentArray[index] = null;
                    errors.push(chapter.title);
                    completedCount++;
                    activeCount--;
                    onProgress(index, 'error', 0, activeCount, completedCount, totalDownloadedSize);
                }

                while (isDownloading && activeCount < concurrentThreads && nextIndex < total) {
                    const currentIndex = nextIndex++;
                    downloadOne(currentIndex);
                }

                if (completedCount >= total) {
                    resolve({ contentArray, sizes, errors, totalDownloadedSize });
                }
            }

            for (let i = 0; i < Math.min(concurrentThreads, total); i++) {
                downloadOne(nextIndex++);
            }
        });
    }

    async function startDownload() {
        if (isDownloading) {
            showNotification('正在下载中，请稍候...', 'warning');
            return;
        }

        const { title, chapters } = getNovelInfo();

        if (chapters.length === 0) {
            showNotification('未找到可下载的章节', 'error');
            return;
        }

        isDownloading = true;

        const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '').trim() || '小说';
        const truncatedTitle = safeTitle.length > 12 ? safeTitle.substring(0, 12) + '...' : safeTitle;
        
        const totalVolumes = chapters.length;
        let totalChapters = 0;
        for (const ch of chapters) {
            const match = ch.title.match(/(\d+)-(\d+)章/);
            if (match) {
                totalChapters = Math.max(totalChapters, parseInt(match[2]));
            }
        }
        
        const estimatedTotalSize = totalVolumes * ESTIMATED_SIZE_PER_CHAPTER_KB * 1024;
        const concurrentThreads = calculateConcurrentThreads(totalVolumes);

        const chapterStatuses = chapters.map(() => 'pending');
        const chapterItems = chapters.map((ch, i) => `
            <div id="sudu-ch-item-${i}" style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #eee; font-size: 11px; position: relative; overflow: hidden;">
                <div id="sudu-ch-progress-${i}" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: #e8eaff; transition: width 0.3s ease; z-index: 0;"></div>
                <span id="sudu-ch-icon-${i}" style="position: relative; z-index: 1; width: 16px; text-align: center; font-size: 12px;">⏳</span>
                <span id="sudu-ch-title-${i}" style="position: relative; z-index: 1; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ch.title}</span>
                <span id="sudu-ch-size-${i}" style="position: relative; z-index: 1; color: #999; font-size: 10px; min-width: 40px; text-align: right;">--</span>
            </div>
        `).join('');

        const progressOverlay = document.createElement('div');
        progressOverlay.id = 'sudu-progress-overlay';
        progressOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 15px;
            box-sizing: border-box;
        `;

        const chapterInfo = totalChapters > 0 ? `${totalVolumes} 卷 / ${totalChapters} 章` : `${totalVolumes} 卷`;

        progressOverlay.innerHTML = `
            <div style="background: white; padding: 15px; border-radius: 15px; text-align: center; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; display: flex; flex-direction: column;">
                <h2 style="margin: 0 0 8px 0; color: #333; font-size: 15px; word-break: break-all;">📥 ${truncatedTitle}</h2>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-bottom: 8px;">
                    <span>共 ${chapterInfo}</span>
                    <span>并发: ${concurrentThreads} 线程</span>
                    <span>预估: ${formatSize(estimatedTotalSize)}</span>
                </div>
                <div style="width: 100%; height: 12px; background: #f0f0f0; border-radius: 6px; overflow: hidden; margin-bottom: 5px;">
                    <div id="sudu-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 6px; transition: width 0.2s ease;"></div>
                </div>
                <div id="sudu-status" style="font-size: 12px; color: #666; margin-bottom: 10px;">准备下载...</div>
                <div id="sudu-stats" style="display: flex; justify-content: space-around; font-size: 11px; margin-bottom: 10px;">
                    <span id="sudu-pending" style="color: #999;">⏳ 等待</span>
                    <span id="sudu-active" style="color: #667eea;">🔥 下载中</span>
                    <span id="sudu-done" style="color: #28a745;">✅ 完成</span>
                    <span id="sudu-fail" style="color: #dc3545;">❌ 失败</span>
                </div>
                <div id="sudu-size-info" style="font-size: 11px; color: #666; margin-bottom: 10px;">
                    已下载: <span id="sudu-downloaded-size">0 B</span> / ${formatSize(estimatedTotalSize)}
                </div>
                <div id="sudu-chapters-container" style="flex: 1; overflow-y: auto; text-align: left; min-height: 150px; max-height: 45vh;">
                    ${chapterItems}
                </div>
                <button id="sudu-cancel-btn" style="margin-top: 10px; padding: 10px; border: none; border-radius: 20px; background: linear-gradient(135deg, #dc3545, #e74c3c); color: white; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">
                    取消下载
                </button>
            </div>
        `;

        document.body.appendChild(progressOverlay);

        document.getElementById('sudu-cancel-btn').addEventListener('click', () => {
            isDownloading = false;
            showNotification('下载已取消', 'warning');
            progressOverlay.remove();
        });

        function updateStats(active, completed, downloadedSize) {
            const pending = chapters.length - completed - active;
            const errors = chapterStatuses.filter(s => s === 'error').length;
            const actualCompleted = completed - errors;

            document.getElementById('sudu-pending').textContent = `⏳ ${pending}`;
            document.getElementById('sudu-active').textContent = `🔥 ${active}`;
            document.getElementById('sudu-done').textContent = `✅ ${actualCompleted}`;
            document.getElementById('sudu-fail').textContent = `❌ ${errors}`;
            document.getElementById('sudu-downloaded-size').textContent = formatSize(downloadedSize);

            const percent = Math.round((downloadedSize / estimatedTotalSize) * 100);
            const bar = document.getElementById('sudu-progress-bar');
            bar.style.width = Math.min(percent, 100) + '%';
            bar.style.background = '#81c784';
            document.getElementById('sudu-status').textContent = `下载中... ${actualCompleted}/${totalVolumes} 卷 (${percent}%)`;
        }

        function updateChapterStatus(index, status, size) {
            if (!isDownloading) return;
            
            chapterStatuses[index] = status;
            const iconEl = document.getElementById(`sudu-ch-icon-${index}`);
            const itemEl = document.getElementById(`sudu-ch-item-${index}`);
            const sizeEl = document.getElementById(`sudu-ch-size-${index}`);

            if (!iconEl || !itemEl) return;

            if (size && sizeEl) {
                sizeEl.textContent = formatSize(size);
            }

            const progressEl = document.getElementById(`sudu-ch-progress-${index}`);

            if (status === 'downloading') {
                iconEl.textContent = '🔥';
                if (progressEl) {
                    const t = Math.min(size / (ESTIMATED_SIZE_PER_CHAPTER_KB * 1024), 1);
                    progressEl.style.width = (t * 100) + '%';
                }
                itemEl.style.background = 'transparent';
                itemEl.style.color = '#333';
            } else if (status === 'completed') {
                iconEl.textContent = '✅';
                if (progressEl) progressEl.style.width = '100%';
                itemEl.style.background = 'transparent';
                itemEl.style.color = '#28a745';
            } else if (status === 'error') {
                iconEl.textContent = '❌';
                if (progressEl) progressEl.style.width = '0%';
                itemEl.style.background = '#ffe8e8';
                itemEl.style.color = '#dc3545';
                if (sizeEl) {
                    sizeEl.textContent = '失败';
                }
            } else {
                iconEl.textContent = '⏳';
                if (progressEl) progressEl.style.width = '0%';
                itemEl.style.background = 'transparent';
                itemEl.style.color = '#999';
            }
        }

        try {
            const { contentArray, sizes, errors, totalDownloadedSize } = await downloadWithConcurrency(
                chapters,
                (index, status, size, active, completed, downloadedSize) => {
                    updateChapterStatus(index, status, size);
                    updateStats(active, completed, downloadedSize);
                },
                null
            );

            if (isDownloading) {
                const fullContent = contentArray.filter(c => c !== null).join('\n\n');
                const safeName = safeTitle.replace(/[\/\\:*?"<>|]/g, '').trim() || '小说';
                try {
                    if (typeof GM_download !== 'undefined') {
                        const url = URL.createObjectURL(new Blob([fullContent], { type: 'text/plain;charset=utf-8' }));
                        GM_download({
                            url, name: safeName + '.txt', saveAs: true,
                            onload: () => { URL.revokeObjectURL(url); showNotification('文件已保存', 'success'); },
                            onerror: () => { URL.revokeObjectURL(url); window.open(url); }
                        });
                    } else {
                        const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url; link.download = safeName + '.txt';
                        document.body.appendChild(link); link.click();
                        setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);
                    }
                } catch (e) {
                    const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullContent);
                    window.open(dataUrl);
                }

                document.getElementById('sudu-status').textContent = '✅ 下载完成！';
                document.getElementById('sudu-progress-bar').style.width = '100%';
                document.getElementById('sudu-downloaded-size').textContent = formatSize(totalDownloadedSize);

                const successCount = contentArray.filter(c => c !== null).length;
                const errorCount = errors.length;
                let msg = `完成 ${successCount}/${chapters.length} 章`;
                if (errorCount > 0) msg += `，失败 ${errorCount}`;
                msg += ` (${formatSize(totalDownloadedSize)})`;
                showNotification(msg, errorCount > 0 ? 'warning' : 'success');

                setTimeout(() => progressOverlay.remove(), 2500);
            }
        } catch (e) {
            showNotification('下载失败: ' + e.message, 'error');
            progressOverlay.remove();
        }

        isDownloading = false;
    }

    function autoJumpToDownloadPage() {
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('/txt.html')) {
            createDownloadButton();
            return;
        }

        const match = currentUrl.match(/https:\/\/www\.sudugu\.org\/(\d+)/);
        if (!match) {
            return;
        }

        const novelId = match[1];
        const downloadUrl = `https://www.sudugu.org/${novelId}/txt.html#dir`;

        const jumpNotice = document.createElement('div');
        jumpNotice.id = 'sudu-jump-notice';
        jumpNotice.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            z-index: 10000;
            font-size: 13px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        const countdownSpan = document.createElement('span');
        countdownSpan.id = 'sudu-jump-countdown';
        countdownSpan.textContent = Math.ceil(AUTO_JUMP_DELAY / 1000);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 10px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 12px;
        `;

        jumpNotice.innerHTML = `
            <span>📥</span>
            <span>正在跳转到下载页...</span>
            <span id="sudu-jump-countdown">${Math.ceil(AUTO_JUMP_DELAY / 1000)}</span>
        `;
        jumpNotice.appendChild(cancelBtn);

        document.body.appendChild(jumpNotice);

        const maxCount = Math.ceil(AUTO_JUMP_DELAY / 1000);
        let countdown = maxCount;
        const countdownInterval = setInterval(() => {
            countdown--;
            document.getElementById('sudu-jump-countdown').textContent = Math.max(countdown, 0);
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.href = downloadUrl;
            }
        }, 1000);

        cancelBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            clearTimeout(jumpTimeout);
            jumpNotice.remove();
        });
    }

    function init() {
        autoJumpToDownloadPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();