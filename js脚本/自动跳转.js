/**
 * @Author: xhg
 * @Date:   2025-11-26 22:13:45
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-12-09 19:33:13
 */
// ==UserScript==
// @name         速读谷自动跳转与章节进入
// @namespace    https://tampermonkey.net/
// @version      0.2.0
// @description  从列表页自动进入在线阅读页，并在阅读页自动进入第一章；适配速读谷等小说站
// @author       xhg
// @match        *://*sudug*/*
// @match        *://*sudugu*/*
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 仅在速读谷域名上运行（防止误触发）
    const HOST_OK = /sudug|sudugu/i.test(location.hostname);
    if (!HOST_OK) return;

    // 防重复运行
    const RUN_FLAG = '__tm_auto_jump_v2__';
    if (window[RUN_FLAG]) return; else window[RUN_FLAG] = true;

    onReady(initScript);

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    function initScript() {
        console.log('自动跳转脚本开始执行 - 适配速读谷网站');

        // 策略1：尝试查找在线阅读链接
        let readOnlineLink = findReadOnlineLink();

        if (!readOnlineLink) {
            // 策略2：如果找不到特定链接，尝试点击第一个小说链接
            readOnlineLink = findFirstNovelLink();
        }

        if (!readOnlineLink) {
            console.log('未找到可点击的链接，开始监听动态内容...');
            observeForLinks();
            return;
        }

        console.log('找到目标链接，准备跳转:', readOnlineLink.href);
        navigateTo(readOnlineLink.href);

        // 在阅读页尝试进入第一章（多次尝试，兼容延迟加载）
        scheduleClickFirstChapter();
    }

    function navigateTo(url) {
        try {
            location.assign(url);
        } catch (e) {
            console.warn('location.assign 失败，尝试 fallback click:', e);
            const a = document.createElement('a');
            a.href = url;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }

    function scheduleClickFirstChapter() {
        window.addEventListener('load', function() {
            setTimeout(clickFirstListItem, 1200);
        });
        // 再次兜底尝试
        setTimeout(clickFirstListItem, 3000);
    }

    // 查找在线阅读链接（去除无效的 :contains 选择器，改用文本匹配）
    function findReadOnlineLink() {
        const candidates = Array.from(document.querySelectorAll('h2.op.bb a, a.read-online, a[href*="read"], a[href*="online"]'));
        const allLinks = Array.from(document.querySelectorAll('a'));
        const merged = [...new Set([...candidates, ...allLinks])];

        for (const link of merged) {
            if (!link || !link.href) continue;
            const txt = (link.textContent || '').trim();
            const hrefAttr = link.getAttribute('href') || '';
            const isValidText = /在线阅读|阅读|开始阅读/i.test(txt);
            const isSpecificPath = /\/156\/$/.test(hrefAttr);
            if ((isValidText || isSpecificPath) && !/javascript:/i.test(link.href)) {
                console.log('找到阅读链接:', txt || hrefAttr, link.href);
                return link;
            }
        }
        return null;
    }

    // 查找第一个小说链接
    function findFirstNovelLink() {
        const novelSelectors = [
            '.novel-list a',
            '.book-list a',
            '.item a',
            'h2 + ul a',
            'h2 + div a',
            'ul li a'
        ];

        for (const selector of novelSelectors) {
            const link = document.querySelector(selector);
            if (link && link.href && !/javascript:/i.test(link.href)) {
                console.log('找到小说链接:', selector, link.href);
                return link;
            }
        }

        // 文本兜底：优先选择文本看起来像书名的链接
        const fallback = Array.from(document.querySelectorAll('a')).find(a => {
            const txt = (a.textContent || '').trim();
            return a.href && !/javascript:/i.test(a.href) && /小说|书籍|作品|书名|阅读/i.test(txt);
        });
        return fallback || null;
    }

    // 点击第一个章节列表项
    function clickFirstListItem() {
        const listSelectors = [
            '#list ul li a',
            '.chapter-list li a',
            '.list li a',
            '.content li a',
            'ul li a'
        ];

        for (const selector of listSelectors) {
            const listItem = document.querySelector(selector);
            if (listItem) {
                console.log('找到列表项，执行点击:', (listItem.textContent || '').trim());
                listItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            }
        }
        console.log('未找到目标列表项');
        return false;
    }

    // 监听异步内容加载，出现目标链接后再跳转
    function observeForLinks() {
        const obs = new MutationObserver(() => {
            const link = findReadOnlineLink() || findFirstNovelLink();
            if (link) {
                console.log('动态内容中找到链接，准备跳转:', link.href);
                obs.disconnect();
                navigateTo(link.href);
                scheduleClickFirstChapter();
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
        // 最多监听10秒，防止资源浪费
        setTimeout(() => obs.disconnect(), 10000);
    }

})();