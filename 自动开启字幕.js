/**
 * @Author: xhg
 * @Date:   2025-09-21 21:09:28
 * @Last Modified by:   xhg
 * @Last Modified time: 2026-02-18 11:48:10
 */
// ==UserScript==
// @name         哔哩哔哩自动打开字幕
// @namespace    http://tampermonkey.net/
// @version      2024-03-10
// @description  bilibili b站 哔哩哔哩 播放视频时自动打开网站字幕
// @author       You
// @match        https://www.bilibili.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/489403/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E8%87%AA%E5%8A%A8%E6%89%93%E5%BC%80%E5%AD%97%E5%B9%95.user.js
// @updateURL https://update.greasyfork.org/scripts/489403/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E8%87%AA%E5%8A%A8%E6%89%93%E5%BC%80%E5%AD%97%E5%B9%95.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 黑名单管理
    const BlacklistManager = {
        storageKey: 'bilibili_subtitle_blacklist',

        getBlacklist() {
            const data = GM_getValue(this.storageKey, '[]');
            try {
                return JSON.parse(data);
            } catch {
                return [];
            }
        },

        saveBlacklist(list) {
            GM_setValue(this.storageKey, JSON.stringify(list));
        },

        addToBlacklist(url) {
            const list = this.getBlacklist();
            if (!list.includes(url)) {
                list.push(url);
                this.saveBlacklist(list);
            }
        },

        removeFromBlacklist(url) {
            let list = this.getBlacklist();
            list = list.filter(item => item !== url);
            this.saveBlacklist(list);
        },

        isInBlacklist(url) {
            return this.getBlacklist().includes(url);
        }
    };
    // 创建UI面板 - 小浮窗
    function createControlPanel() {
        const currentUrl = window.location.href;
        let isBlacklisted = BlacklistManager.isInBlacklist(currentUrl);
        
        // 调试信息
        console.log('当前URL:', currentUrl);
        console.log('是否在黑名单中:', isBlacklisted);
        console.log('黑名单内容:', BlacklistManager.getBlacklist());

        // 主按钮
        const btn = document.createElement('button');
        btn.id = 'subtitle-control-btn';
        btn.style.cssText = `
            position: fixed;
            bottom: 72px;
            right: 27px;
            width: 30px;
            height: 30px;
            background: ${isBlacklisted ? '#ffc107' : '#00a1d6'};
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        btn.title = isBlacklisted ? '字幕已禁用' : '字幕已启用';
        btn.textContent = isBlacklisted ? '🔇' : '🔊';

        // 悬停效果
        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.1)';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'scale(1)';
        };

        // 菜单面板
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            display: none;
            min-width: 150px;
            overflow: hidden;
        `;
        
        // 按钮悬浮时显示菜单
        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.1)';
            menu.style.display = 'block';
        };
        
        // 菜单悬浮时保持显示
        menu.onmouseover = () => {
            menu.style.display = 'block';
        };
        menu.onmouseout = (e) => {
            // 检查鼠标是否移到了按钮上
            if (e.relatedTarget !== btn && !menu.contains(e.relatedTarget)) {
                menu.style.display = 'none';
            }
        };

        // 状态显示
        const statusItem = document.createElement('div');
        statusItem.style.cssText = `
            padding: 10px 15px;
            font-size: 12px;
            color: #666;
            border-bottom: 1px solid #eee;
            background: ${isBlacklisted ? '#fff3cd' : '#d4edda'};
        `;
        statusItem.textContent = isBlacklisted ? '✓ 字幕已禁用' : '✗ 字幕已启用';

        // 切换按钮
        const toggleItem = document.createElement('button');
        toggleItem.style.cssText = `
            width: 100%;
            padding: 10px 15px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 12px;
            color: #333;
            border-bottom: 1px solid #eee;
            transition: background 0.2s;
        `;
        toggleItem.textContent = isBlacklisted ? '✓ 启用字幕' : '✗ 禁用字幕';
        toggleItem.onmouseover = () => toggleItem.style.background = '#f5f5f5';
        toggleItem.onmouseout = () => toggleItem.style.background = 'none';
        toggleItem.onclick = () => {
            const currentlyBlacklisted = BlacklistManager.isInBlacklist(currentUrl);
            if (currentlyBlacklisted) {
                BlacklistManager.removeFromBlacklist(currentUrl);
                // 切换为启用字幕
                openSubtitle();
            } else {
                BlacklistManager.addToBlacklist(currentUrl);
                // 切换为禁用字幕
                closeSubtitle();
            }
            // 更新本地状态并刷新UI
            isBlacklisted = !currentlyBlacklisted;
            updateUI();
        };

        // 管理列表按钮
        const manageItem = document.createElement('button');
        manageItem.style.cssText = `
            width: 100%;
            padding: 10px 15px;
            border: none;
            background: none;
            text-align: left;
            cursor: pointer;
            font-size: 12px;
            color: #333;
            transition: background 0.2s;
        `;
        manageItem.textContent = '📋 管理列表';
        manageItem.onmouseover = () => manageItem.style.background = '#f5f5f5';
        manageItem.onmouseout = () => manageItem.style.background = 'none';
        manageItem.onclick = () => {
            menu.style.display = 'none';
            showBlacklistModal();
        };

        menu.appendChild(statusItem);
        menu.appendChild(toggleItem);
        menu.appendChild(manageItem);

        // 更新UI的函数
        const updateUI = () => {
            // 更新按钮样式和文本
            btn.style.background = isBlacklisted ? '#ffc107' : '#00a1d6';
            btn.title = isBlacklisted ? '字幕已禁用' : '字幕已启用';
            btn.textContent = isBlacklisted ? '🔇' : '🔊';
            
            // 更新状态显示
            statusItem.style.background = isBlacklisted ? '#fff3cd' : '#d4edda';
            statusItem.textContent = isBlacklisted ? '✓ 字幕已禁用' : '✗ 字幕已启用';
            
            // 更新切换按钮文本
            toggleItem.textContent = isBlacklisted ? '✓ 启用字幕' : '✗ 禁用字幕';
        };

        // 按钮点击切换菜单
        btn.onclick = () => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        };

        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (e.target !== btn && e.target !== menu && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        const container = document.createElement('div');
        container.appendChild(btn);
        container.appendChild(menu);
        return container;
    }

    // 关闭字幕函数
    function closeSubtitle() {
        // 先找到字幕按钮
        const subtitleButton = document.querySelector('.bpx-player-ctrl-btn[aria-label="字幕"]');
        if (!subtitleButton) {
            console.warn('未找到字幕按钮');
            return;
        }
        
        // 检查字幕是否已打开
        const isSubtitleOpen = subtitleButton.classList.contains('bpx-state-active');
        
        if (isSubtitleOpen) {
            // 如果字幕已打开，点击关闭
            subtitleButton.click();
            console.log('已关闭字幕');
        } else {
            console.log('字幕已经是关闭状态');
        }
    }

    // 显示黑名单管理弹窗
    function showBlacklistModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        const title = document.createElement('h2');
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #333;
            font-size: 18px;
        `;
        title.textContent = '字幕禁用链接列表';

        const list = document.createElement('div');
        list.style.cssText = `
            margin-bottom: 15px;
            max-height: 400px;
            overflow-y: auto;
        `;

        const blacklist = BlacklistManager.getBlacklist();
        if (blacklist.length === 0) {
            list.innerHTML = '<p style="color: #999; text-align: center;">暂无禁用链接</p>';
        } else {
            blacklist.forEach((url) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: #f5f5f5;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    word-break: break-all;
                `;

                const urlSpan = document.createElement('span');
                urlSpan.textContent = url.substring(0, 50) + (url.length > 50 ? '...' : '');
                urlSpan.title = url;

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.style.cssText = `
                    padding: 4px 8px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                    margin-left: 10px;
                    white-space: nowrap;
                `;
                deleteBtn.onclick = () => {
                    BlacklistManager.removeFromBlacklist(url);
                    item.remove();
                };

                item.appendChild(urlSpan);
                item.appendChild(deleteBtn);
                list.appendChild(item);
            });
        }

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            width: 100%;
            padding: 10px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        closeBtn.onclick = () => modal.remove();

        content.appendChild(title);
        content.appendChild(list);
        content.appendChild(closeBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    let queryValue = '';
    // 定时检测URL是否发生变化
    let timer = setInterval(function() {
        // 获取URL中的查询字符串部分
        const queryString = window.location.search;
        // 解析查询字符串，将参数以对象的形式存储
        const params = new URLSearchParams(queryString);
        // 获取特定参数的值
        const value = params.get('p');
        if (queryValue !== value) {
            // 检查是否在黑名单中
            if (!BlacklistManager.isInBlacklist(window.location.href)) {
                openSubtitle();
            }
            queryValue = value;
        }
    }, 1000); // 减少定时器间隔

    window.addEventListener('unload', function(_event) {
        clearInterval(timer)
    });

    // 屏蔽反馈弹窗
    function blockFeedbackModal() {
        const removeModal = () => {
            const modal = document.querySelector('.bpx-player-translation-feedback-modal');
            if (modal) {
                modal.remove();
                console.log('已移除字幕反馈弹窗');
            }
        };

        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    removeModal();
                }
            });
        });

        // 配置观察选项
        const config = {
            childList: true,
            subtree: true
        };

        // 开始观察body
        observer.observe(document.body, config);
    }

    function openSubtitle(){
        // 定义一个通用的等待元素出现的函数
        function waitForElement(selector, maxRetries = 5, interval = 50) {
            return new Promise((resolve, reject) => {
                let retries = 0;
                const checkElement = () => {
                    const element = document.querySelector(selector);
                    if (element) {
                        resolve(element);
                    } else if (retries < maxRetries) {
                        retries++;
                        setTimeout(checkElement, interval);
                    } else {
                        reject(new Error(`元素 ${selector} 在 ${maxRetries * interval}ms 内未找到`));
                    }
                };
                checkElement();
            });
        }

        // 尝试打开字幕
        const tryOpenSubtitle = async () => {
            // 尝试多种选择器来定位字幕按钮
            const subtitleSelectors = [
                '.bpx-player-ctrl-btn[aria-label="字幕"] .bpx-common-svg-icon', // 旧版选择器
                '.subtitle-btn', // 可能的新版选择器
                '[data-v-subtitle-btn]', // Vue组件可能的选择器
                '.bilibili-player-video-subtitle-btn' // 另一种可能的选择器
            ];

            try {
                // 尝试找到并点击字幕按钮
                let subtitleButton = null;
                for (let selector of subtitleSelectors) {
                    try {
                        subtitleButton = await waitForElement(selector);
                        subtitleButton.click();
                        console.log(`字幕按钮通过 ${selector} 成功点击`);
                        break;
                    } catch (error) {
                        console.log(`尝试 ${selector} 失败: ${error.message}`);
                    }
                }

                if (!subtitleButton) {
                    console.warn('未找到任何可用的字幕按钮');
                    return;
                }

                // 等待并选择中文字幕
                const chineseSubtitleSelector = '.bpx-player-ctrl-subtitle-language-item[data-lan="ai-zh"]';
                const chineseSubtitleButton = await waitForElement(chineseSubtitleSelector);

                if (chineseSubtitleButton) {
                    chineseSubtitleButton.click();
                    console.log('成功选择中文字幕');
                }
            } catch (error) {
                console.warn('自动开启字幕过程中发生错误:', error.message);
            }
        };

        // 尽快执行
        tryOpenSubtitle();
    }

    // 页面加载后立即执行
    blockFeedbackModal();

    // 页面加载后立即尝试打开字幕
    if (!BlacklistManager.isInBlacklist(window.location.href)) {
        openSubtitle();
    }

    // 添加控制面板到页面
    document.body.appendChild(createControlPanel());
})();