// ==UserScript==
// @name        hellotik.app 批量下载助手
// @namespace   Violentmonkey Scripts
// @match       https://www.hellotik.app/zh/rednote*
// @grant       none
// @version     2.0
// @author      -
// @description 2026/5/20 批量下载无水印图片，支持明暗主题切换，手机端友好
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 主题管理 ====================
    const THEME_KEY = 'hongload-theme';

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function getTheme() {
        return localStorage.getItem(THEME_KEY) || getSystemTheme();
    }

    function setTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
        applyTheme(theme);
        updateThemeIcon(theme);
    }

    function toggleTheme() {
        setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    }

    function updateThemeIcon(theme) {
        var icon = document.getElementById('hongload-theme-icon');
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    function applyTheme(theme) {
        var root = document.documentElement;
        if (!root) return;
        if (theme === 'dark') {
            root.classList.add('hongload-dark');
            root.classList.remove('hongload-light');
        } else {
            root.classList.add('hongload-light');
            root.classList.remove('hongload-dark');
        }
    }

    // ==================== 样式注入 ====================
    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = `
            /* ---- 浮动容器 ---- */
            #hongload-fab-wrap {
                position: fixed;
                bottom: 80px;
                right: 16px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                pointer-events: none;
            }
            #hongload-fab-wrap > * {
                pointer-events: auto;
            }

            /* ---- 主题切换小按钮 ---- */
            #hongload-theme-toggle {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: none;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease;
                -webkit-tap-highlight-color: transparent;
            }
            #hongload-theme-toggle:active {
                transform: scale(0.9);
            }

            /* ---- 主下载按钮 ---- */
            #hongload-dl-btn {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: none;
                font-size: 22px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease;
                -webkit-tap-highlight-color: transparent;
                position: relative;
                overflow: hidden;
            }
            #hongload-dl-btn:active {
                transform: scale(0.9);
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            }

            /* 涟漪动画 */
            #hongload-dl-btn::after {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                transform: scale(0);
                opacity: 0;
                transition: transform 0.4s ease, opacity 0.4s ease;
            }
            #hongload-dl-btn.ripple::after {
                transform: scale(2.5);
                opacity: 0;
            }

            /* ---- 提示气泡 ---- */
            #hongload-toast {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 500;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease, transform 0.3s ease;
                z-index: 100000;
                text-align: center;
                max-width: 80vw;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            #hongload-toast.show {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            /* ==================== 亮色主题 ==================== */
            .hongload-light #hongload-theme-toggle {
                background: #ffffff;
                color: #333;
            }
            .hongload-light #hongload-theme-toggle:hover {
                box-shadow: 0 3px 12px rgba(0,0,0,0.2);
            }
            .hongload-light #hongload-dl-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
            }
            .hongload-light #hongload-dl-btn:hover {
                box-shadow: 0 6px 24px rgba(102,126,234,0.4);
            }
            .hongload-light #hongload-toast {
                background: rgba(255,255,255,0.92);
                color: #333;
                box-shadow: 0 4px 24px rgba(0,0,0,0.12);
                border: 1px solid rgba(0,0,0,0.06);
            }

            /* ==================== 暗色主题 ==================== */
            .hongload-dark #hongload-theme-toggle {
                background: #2a2a2e;
                color: #f0f0f0;
            }
            .hongload-dark #hongload-theme-toggle:hover {
                box-shadow: 0 3px 12px rgba(0,0,0,0.4);
            }
            .hongload-dark #hongload-dl-btn {
                background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
                color: #fff;
            }
            .hongload-dark #hongload-dl-btn:hover {
                box-shadow: 0 6px 24px rgba(167,139,250,0.35);
            }
            .hongload-dark #hongload-toast {
                background: rgba(40,40,44,0.92);
                color: #f0f0f0;
                box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.08);
            }

            /* ---- 适配 iPhone 底部安全区 ---- */
            @supports (padding-bottom: env(safe-area-inset-bottom)) {
                #hongload-fab-wrap {
                    bottom: calc(80px + env(safe-area-inset-bottom));
                }
            }

            /* ---- 小屏微调 ---- */
            @media (max-width: 380px) {
                #hongload-dl-btn {
                    width: 48px;
                    height: 48px;
                    font-size: 18px;
                }
                #hongload-theme-toggle {
                    width: 36px;
                    height: 36px;
                    font-size: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== Toast 提示 ====================
    function showToast(msg) {
        var toast = document.getElementById('hongload-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'hongload-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.remove('show');
        // 强制重排以重新触发动画
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 1800);
    }

    // ==================== 清空按钮改造 ====================
    function setupClearButton() {
        var allBtns = document.querySelectorAll('button');
        allBtns.forEach(function (btn) {
            if (btn.textContent.trim() === '粘贴' && !btn.dataset.hongloadDone) {
                btn.dataset.hongloadDone = '1';
                var clone = btn.cloneNode(true);
                clone.textContent = '清空';
                clone.title = '清空输入框内容';
                clone.removeAttribute('onclick');
                clone.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var input = document.querySelector('input[placeholder*="请粘贴小红书"]');
                    if (input) {
                        input.value = '';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, true);
                btn.parentNode.replaceChild(clone, btn);
            }
        });
    }

    // ==================== 核心功能 ====================
    function createUI() {
        if (document.getElementById('hongload-fab-wrap')) return;

        // 应用初始主题
        applyTheme(getTheme());

        // 浮动容器
        var wrap = document.createElement('div');
        wrap.id = 'hongload-fab-wrap';

        // 主题切换按钮
        var themeBtn = document.createElement('button');
        themeBtn.id = 'hongload-theme-toggle';
        themeBtn.title = '切换明暗主题';
        var themeIcon = document.createElement('span');
        themeIcon.id = 'hongload-theme-icon';
        themeBtn.appendChild(themeIcon);
        updateThemeIcon(getTheme());
        themeBtn.onclick = function (e) {
            e.stopPropagation();
            toggleTheme();
        };

        // 下载按钮
        var dlBtn = document.createElement('button');
        dlBtn.id = 'hongload-dl-btn';
        dlBtn.title = '一键下载所有无水印图片';
        dlBtn.textContent = '⬇';

        dlBtn.onclick = function () {
            var allBtns = document.querySelectorAll('button');
            var count = 0;
            allBtns.forEach(function (b) {
                if (b.textContent.trim() === '下载无水印图片') {
                    b.click();
                    count++;
                }
            });
            if (count > 0) {
                showToast('✅ 已触发 ' + count + ' 个下载');
            } else {
                showToast('⚠️ 未找到可下载的图片');
            }
        };

        wrap.appendChild(themeBtn);
        wrap.appendChild(dlBtn);
        document.body.appendChild(wrap);

        setupClearButton();
    }

    // ==================== 启动 ====================
    function init() {
        injectStyles();
        createUI();

        if (!document.body) return;

        var obs = new MutationObserver(function () {
            if (!document.getElementById('hongload-fab-wrap')) {
                createUI();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
            updateThemeIcon(e.matches ? 'dark' : 'light');
        }
    });
})();
