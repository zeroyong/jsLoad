/**
 * @Author: xhg
 * @Date:   2025-12-24 00:00:00
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-12-24 00:00:00
 */
// ==UserScript==
// @name         Pinterest 登录弹窗拦截
// @namespace    https://tampermonkey.net/
// @version      0.3.0
// @description  自动拦截并关闭 Pinterest 登录弹窗（全屏弹窗、中间弹窗、企业账户弹窗），提升浏览体验
// @author       xhg
// @match        *://*.pinterest.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 防重复运行
    const RUN_FLAG = '__tm_pinterest_login_blocker__';
    if (window[RUN_FLAG]) return;
    window[RUN_FLAG] = true;

    console.log('Pinterest 登录弹窗拦截脚本已启动');

    // 使用 MutationObserver 监听 DOM 变化，拦截登录弹窗
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 类型1：全屏登录弹窗（min-height: 400px）
                    const fullScreenModal = node.querySelector && node.querySelector('.ADXRXN[style*="min-height: 400px"]');
                    if (fullScreenModal) {
                        console.log('检测到 Pinterest 全屏登录弹窗，准备移除...');
                        removeLoginModal(fullScreenModal);
                    }
                    if (node.classList && node.classList.contains('ADXRXN') &&
                        node.style && node.style.minHeight === '400px') {
                        console.log('检测到 Pinterest 全屏登录弹窗（根节点），准备移除...');
                        removeLoginModal(node);
                    }

                    // 类型2：中间登录弹窗（包含"登录以继续探索"文本）
                    const centerModal = node.querySelector && node.querySelector('.ADXRXN[style*="padding-left: 100px"]');
                    if (centerModal) {
                        console.log('检测到 Pinterest 中间登录弹窗，准备移除...');
                        removeLoginModal(centerModal);
                    }
                    if (node.classList && node.classList.contains('ADXRXN') &&
                        node.style && node.style.paddingLeft === '100px') {
                        console.log('检测到 Pinterest 中间登录弹窗（根节点），准备移除...');
                        removeLoginModal(node);
                    }

                    // 类型3：企业账户弹窗（data-test-id="fullPageSignupModal"）
                    const businessModal = node.querySelector && node.querySelector('[data-test-id="fullPageSignupModal"]');
                    if (businessModal) {
                        console.log('检测到 Pinterest 企业账户弹窗，准备移除...');
                        removeLoginModal(businessModal);
                    }
                    if (node.getAttribute && node.getAttribute('data-test-id') === 'fullPageSignupModal') {
                        console.log('检测到 Pinterest 企业账户弹窗（根节点），准备移除...');
                        removeLoginModal(node);
                    }
                }
            }
        }
    });

    // 开始监听
    observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
    });

    // 移除登录弹窗及其相关元素
    function removeLoginModal(modal) {
        try {
            // 移除弹窗本身
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
                console.log('Pinterest 登录弹窗已成功移除');
            }
            // 尝试移除遮罩层（如果有）
            const overlay = document.querySelector('[style*="position: fixed"][style*="background"]');
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                console.log('遮罩层已移除');
            }
            // 恢复页面滚动
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        } catch (e) {
            console.warn('移除登录弹窗时出错:', e);
        }
    }

    // 页面加载完成后再次检查
    window.addEventListener('load', () => {
        // 检查全屏登录弹窗
        const fullScreenModal = document.querySelector('.ADXRXN[style*="min-height: 400px"]');
        if (fullScreenModal) {
            console.log('页面加载完成后检测到全屏登录弹窗，准备移除...');
            removeLoginModal(fullScreenModal);
        }
        // 检查中间登录弹窗
        const centerModal = document.querySelector('.ADXRXN[style*="padding-left: 100px"]');
        if (centerModal) {
            console.log('页面加载完成后检测到中间登录弹窗，准备移除...');
            removeLoginModal(centerModal);
        }
        // 检查企业账户弹窗
        const businessModal = document.querySelector('[data-test-id="fullPageSignupModal"]');
        if (businessModal) {
            console.log('页面加载完成后检测到企业账户弹窗，准备移除...');
            removeLoginModal(businessModal);
        }
    });

})();
