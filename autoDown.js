/**
 * @Author: xhg
 * @Date:   2025-08-11 23:38:10
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-08-24 15:36:35
 */
// ==UserScript==
// @name         视频自动拦截
// @namespace    Violentmonkey Scripts
// @match        https://thisav2.com/dm*
// @match        https://123av.org/*
// @match        https://thisav2.com/cn*
// @match        https://jable.tv/*
// @grant        GM_addStyle
// @version      2.6
// @author       xhg
// @description  彻底移除广告跳转代码，保护视频播放，添加侧边栏切换
// ==/UserScript==

(function() {
    'use strict';

    // 调试日志函数（仅在开发模式下详细输出）
    const DEBUG = false;
    function debugLog(...args) {
        if (DEBUG) {
            console.log('[广告拦截调试]', ...args);
        }
    }

    // 添加样式以隐藏广告元素和侧边栏切换按钮
    GM_addStyle(`
        div[class*="ad-"],
        div[class*="ads-"],
        div[class*="advertisement"],
        div[id*="ad-"],
        div[id*="ads-"],
        div[id*="advertisement"],
        iframe[src*="ad"],
        iframe[src*="ads"],
        iframe[src*="doubleclick"],
        iframe[src*="googlesyndication"] {
            display: none !important;
        }

        /* 侧边栏切换按钮样式 */
        #sidebarToggleBtn {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1000;
            background-color: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        #sidebarToggleBtn:hover {
            background-color: rgba(0,0,0,0.9);
        }

        /* 默认隐藏右侧列表 */
        .hidden.lg\\:flex.h-full.ml-6.order-last {
            display: none !important;
        }

        /* 显示右侧列表 */
        .sidebar-visible .hidden.lg\\:flex.h-full.ml-6.order-last {
            display: flex !important;
        }
    `);

    // 创建侧边栏切换按钮
    function createSidebarToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'sidebarToggleBtn';
        btn.textContent = '显示';
        btn.setAttribute('title', '显示/隐藏右侧列表');
        
        btn.addEventListener('click', () => {
            const isVisible = document.body.classList.contains('sidebar-visible');
            
            if (isVisible) {
                // 隐藏列表
                document.body.classList.remove('sidebar-visible');
                btn.textContent = '显示';
            } else {
                // 显示列表
                document.body.classList.add('sidebar-visible');
                btn.textContent = '隐藏';
            }
        });

        document.body.appendChild(btn);
    }

    // 保存原始的 window.open 方法
    const originalWindowOpen = window.open;

    // 重写 window.open 方法拦截广告弹窗
    // window.open = function(url, target, features) {
    //     debugLog('尝试打开窗口:', url, target, features);

    //     // 检查是否为广告相关URL
    //     const isAdUrl = url && (
    //         url.includes('/pop?url=') ||
    //         url.includes('ad') ||
    //         url.includes('ads') ||
    //         url.includes('doubleclick') ||
    //         url.includes('googlesyndication') ||
    //         url.includes('pop') ||
    //         url.includes('redirect')
    //     );

    //     if (isAdUrl) {
    //         console.log('拦截广告弹窗:', url);
    //         // 返回一个模拟的关闭窗口对象
    //         return {
    //             closed: true,
    //             close: function() { debugLog('模拟关闭窗口'); },
    //             focus: function() {},
    //             blur: function() {}
    //         };
    //     }
        
    //     // 对于正常URL，使用原始的 window.open
    //     return originalWindowOpen.call(this, url, target, features);
    // };

    // 标记是否已经初始化
    let isInitialized = false;

    // 彻底移除和替换跳转逻辑
    function removeAdTransitionCode() {
        // 避免重复初始化
        if (isInitialized) return;

        console.log('开始移除广告跳转代码');

        // 创建侧边栏切换按钮
        // createSidebarToggleButton();

        // 尝试移除所有可能的跳转事件
        try {
            const elementsWithClick = Array.from(document.querySelectorAll('*'))
                .filter(el => {
                    const clickAttr = el.getAttribute('@click') || el.getAttribute('x-on:click');
                    return clickAttr && (clickAttr.includes('pop(') || clickAttr.includes('pop ('));
                });

            elementsWithClick.forEach(el => {
                debugLog('移除点击事件:', el);
                el.removeAttribute('@click');
                el.removeAttribute('x-on:click');
                el.setAttribute('@click', 'safePlay()');
                el.setAttribute('x-on:click', 'safePlay()');
            });
        } catch (error) {
            console.error('移除点击事件时发生错误:', error);
        }

        // 尝试修改全局对象的 pop 方法
        if (window.Vue && window.Vue.prototype) {
            debugLog('修改 Vue 原型上的 pop 方法');
            
            // 完全重写 pop 方法
            window.Vue.prototype.pop = function() {
                console.log('拦截 pop 方法调用');
                
                // 直接播放视频
                if (window.player && typeof window.player.play === 'function') {
                    window.player.play();
                }
                
                return false;
            };

            // 添加安全播放方法
            window.Vue.prototype.safePlay = function() {
                debugLog('安全播放方法被调用');
                if (window.player && typeof window.player.play === 'function') {
                    window.player.play();
                }
            };
        }

        // 移除所有包含广告跳转的脚本内容
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent) {
                // 移除包含广告跳转的脚本内容
                const cleanedScript = script.textContent
                    .replace(/window\.open\(`\/pop\?url=.*?\)/, 'console.log("广告跳转已拦截")')
                    .replace(/this\.popped\.urls\.push\(.*?\)/, 'console.log("广告URL记录已拦截")');
                
                if (cleanedScript !== script.textContent) {
                    debugLog('清理可疑脚本:', script);
                    script.textContent = cleanedScript;
                }
            }
        });

        // 标记已初始化
        isInitialized = true;
    }

    // 多重拦截策略
    function setupAdBlockerListeners() {
        // 页面加载完成时
        window.addEventListener('load', removeAdTransitionCode);
        
        // DOM 变化监听（节流）
        let timeoutId = null;
        const observer = new MutationObserver(() => {
            // 清除之前的定时器
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // 300ms 后执行，避免频繁触发
            timeoutId = setTimeout(removeAdTransitionCode, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 处理 a 标签中包含 videos/* 的链接，新开标签页
    function handleVideoLinks() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                // 检查 href 是否包含 videos/
                if (href && href.includes('videos/')) {
                    e.preventDefault();
                    e.stopPropagation();
                    debugLog('检测到 videos 链接，新开标签页:', href);
                    window.open(href, '_blank');
                }
            }
        }, true);
    }

    // 左右箭头翻页功能（仅适用于 jable.tv）
    function setupArrowKeyPagination() {
        // 检查是否在 jable.tv 上
        if (!window.location.hostname.includes('jable.tv')) {
            return;
        }

        document.addEventListener('keydown', function(e) {
            // 左箭头 (37) 或 A 键 - 上一页
            if (e.keyCode === 37 || (e.keyCode === 65 && e.ctrlKey)) {
                e.preventDefault();
                clickPreviousPage();
            }
            // 右箭头 (39) 或 D 键 - 下一页
            else if (e.keyCode === 39 || (e.keyCode === 68 && e.ctrlKey)) {
                e.preventDefault();
                clickNextPage();
            }
        });
    }

    // 点击下一页
    function clickNextPage() {
        const pagination = document.querySelector('ul.pagination');
        if (!pagination) {
            console.log('未找到分页元素');
            return;
        }

        // 找到当前活跃页面（disabled 的 span）
        const currentPage = pagination.querySelector('li.page-item span.page-link.active.disabled');
        if (!currentPage) {
            console.log('未找到当前页面');
            return;
        }

        // 找到当前页面的 li 元素
        const currentLi = currentPage.closest('li.page-item');
        if (!currentLi) {
            return;
        }

        // 获取下一个 li 元素中的链接
        let nextLi = currentLi.nextElementSibling;
        while (nextLi) {
            const link = nextLi.querySelector('a.page-link');
            if (link) {
                debugLog('点击下一页:', link.href);
                link.click();
                return;
            }
            nextLi = nextLi.nextElementSibling;
        }

        console.log('已经是最后一页');
    }

    // 点击上一页
    function clickPreviousPage() {
        const pagination = document.querySelector('ul.pagination');
        if (!pagination) {
            console.log('未找到分页元素');
            return;
        }

        // 找到当前活跃页面（disabled 的 span）
        const currentPage = pagination.querySelector('li.page-item span.page-link.active.disabled');
        if (!currentPage) {
            console.log('未找到当前页面');
            return;
        }

        // 找到当前页面的 li 元素
        const currentLi = currentPage.closest('li.page-item');
        if (!currentLi) {
            return;
        }

        // 获取上一个 li 元素中的链接
        let prevLi = currentLi.previousElementSibling;
        while (prevLi) {
            const link = prevLi.querySelector('a.page-link');
            if (link) {
                debugLog('点击上一页:', link.href);
                link.click();
                return;
            }
            prevLi = prevLi.previousElementSibling;
        }

        console.log('已经是第一页');
    }

    // 立即执行
    setupAdBlockerListeners();
    removeAdTransitionCode();
    handleVideoLinks();
    setupArrowKeyPagination();
})();