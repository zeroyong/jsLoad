/**
 * @Author: xhg
 * @Date:   2025-04-26
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-04-26
 */
// ==UserScript==
// @name         链接新标签页打开
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  将网站的所有链接设置为在新标签页打开，支持自定义配置
// @author       xhg
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

'use strict';

(function() {
    // 默认配置
    const DEFAULT_CONFIG = {
        enabled: true,
        excludeDomains: [],
        onlyMatchDomain: '',
        targetBlank: true
    };

    // 获取配置
    function getConfig() {
        const config = {};
        for (const key in DEFAULT_CONFIG) {
            config[key] = GM_getValue(key, DEFAULT_CONFIG[key]);
        }
        return config;
    }

    // 保存配置
    function saveConfig(config) {
        for (const key in config) {
            GM_setValue(key, config[key]);
        }
    }

    // 转换链接为新标签页打开
    function convertLinks() {
        const config = getConfig();
        if (!config.enabled) return;

        console.log('链接新标签页打开: 开始处理');

        const links = document.querySelectorAll('a[href]');
        const currentDomain = window.location.hostname;
        
        console.log('找到链接数量:', links.length);
        console.log('当前域名:', currentDomain);

        // 如果设置了只匹配特定域名
        if (config.onlyMatchDomain && !currentDomain.includes(config.onlyMatchDomain)) {
            console.log('域名不匹配，跳过');
            return;
        }

        // 检查是否在排除列表中
        if (config.excludeDomains.some(domain => currentDomain.includes(domain))) {
            console.log('在排除列表中，跳过');
            return;
        }

        let processedCount = 0;
        links.forEach(link => {
            const href = link.getAttribute('href');
            // 跳过无效链接和特殊链接
            if (!href || href === '#' || href.startsWith('javascript:')) return;

            // 跳过带有 data-action 属性的链接（通常是 AJAX 链接）
            if (link.hasAttribute('data-action')) {
                console.log('跳过 AJAX 链接:', href);
                return;
            }

            // 跳过带有 onclick 的链接（可能有自定义事件）
            if (link.hasAttribute('onclick')) {
                console.log('跳过带 onclick 的链接:', href);
                return;
            }

            // 新标签页打开
            if (config.targetBlank && !link.target) {
                link.setAttribute('target', '_blank');
                link.rel = 'noopener noreferrer';
                processedCount++;
            }
        });
        
        console.log('已处理链接数量:', processedCount);
    }

    // 监听DOM变化，处理动态加载的链接
    function observeDOM() {
        const config = getConfig();
        if (!config.enabled) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.tagName === 'A') {
                        const href = node.getAttribute('href');
                        if (href && !href.startsWith('javascript:') && href !== '#') {
                            // 跳过 AJAX 链接
                            if (node.hasAttribute('data-action')) return;
                            // 跳过带 onclick 的链接
                            if (node.hasAttribute('onclick')) return;
                            
                            if (config.targetBlank) {
                                node.setAttribute('target', '_blank');
                                node.rel = 'noopener noreferrer';
                            }
                        }
                    } else if (node.nodeType === 1) {
                        const links = node.querySelectorAll && node.querySelectorAll('a[href]');
                        if (links) {
                            links.forEach(link => {
                                const href = link.getAttribute('href');
                                if (href && !href.startsWith('javascript:') && href !== '#') {
                                    // 跳过 AJAX 链接
                                    if (link.hasAttribute('data-action')) return;
                                    // 跳过带 onclick 的链接
                                    if (link.hasAttribute('onclick')) return;
                                    
                                    if (config.targetBlank) {
                                        link.setAttribute('target', '_blank');
                                        link.rel = 'noopener noreferrer';
                                    }
                                }
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 菜单命令：启用/禁用
    function toggleEnabled() {
        const config = getConfig();
        config.enabled = !config.enabled;
        saveConfig(config);
        alert('功能已' + (config.enabled ? '启用' : '禁用') + '，刷新页面生效');
    }

    // 菜单命令：设置只匹配特定域名
    function setDomainFilter() {
        const config = getConfig();
        const domain = prompt('请输入要匹配的域名（留空表示所有网站）:', config.onlyMatchDomain || '');
        if (domain !== null) {
            config.onlyMatchDomain = domain.trim();
            saveConfig(config);
            alert('域名过滤已设置: ' + (config.onlyMatchDomain || '无') + '，刷新页面生效');
        }
    }

    // 菜单命令：清除域名过滤设置
    function clearDomainFilter() {
        const config = getConfig();
        config.onlyMatchDomain = '';
        config.excludeDomains = [];
        saveConfig(config);
        alert('已清除所有域名过滤设置，刷新页面生效');
    }

    // 菜单命令：查看当前设置
    function showSettings() {
        const config = getConfig();
        const settings = `
当前设置:
- 功能启用: ${config.enabled ? '是' : '否'}
- 匹配域名: ${config.onlyMatchDomain || '所有域名'}
- 排除域名: ${config.excludeDomains.join(', ') || '无'}
- 新标签页: ${config.targetBlank ? '是' : '否'}
        `.trim();
        alert(settings);
    }

    // 注册菜单命令
    GM_registerMenuCommand('切换启用/禁用', toggleEnabled);
    GM_registerMenuCommand('设置匹配域名', setDomainFilter);
    GM_registerMenuCommand('添加排除域名', addExcludeDomain);
    GM_registerMenuCommand('清除域名过滤', clearDomainFilter);
    GM_registerMenuCommand('查看当前设置', showSettings);

    // 页面加载后执行
    window.addEventListener('load', function() {
        convertLinks();
        observeDOM();
    });

    // 如果页面已经加载完成，立即执行
    if (document.readyState !== 'loading') {
        convertLinks();
        observeDOM();
    }
})();