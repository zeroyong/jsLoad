/**
 * @Author: xhg
 * @Date:   2025-11-28 07:13:57
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-11-28 07:42:02
 */
// ==UserScript==
// @name         左右箭头切换页面 - sudugu.org
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  使用左右箭头键在sudugu.org网站切换上下页，适配排行榜等分页页面
// @author       xhg
// @match        https://www.sudugu.org/*
// @match        https://sudugu.org/*
// @match        *://*.sudugu.org/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

'use strict';

// 左右箭头切换页面功能 - 适配 https://www.sudugu.org/
(function() {
    // 等待页面加载完成
    window.addEventListener('load', function() {
        // 查找页面导航元素（列表页）
        const pageNav = document.querySelector('.page');
        // 查找详情页导航元素
        const chapterNav = document.querySelector('.prenext');
        
        if (pageNav) {
            // 列表页导航处理
            handleListPageNavigation(pageNav);
        }
        
        if (chapterNav) {
            // 详情页章节导航处理
            handleChapterNavigation(chapterNav);
        }
        
        if (!pageNav && !chapterNav) {
            console.log('未找到页面导航元素');
            return;
        }
        
        // 用户不希望显示提示消息，因此移除 createIndicator 的调用
        
        // 在列表页添加复制书籍链接功能
        if (pageNav) {
            addCopyBookLinkButtons();
        }
        
        console.log('左右箭头切换页面功能已启用');
    
    // 列表页导航处理函数
    function handleListPageNavigation(pageNav) {
        // 查找上一页和下一页链接
        const links = pageNav.querySelectorAll('a');
        let prevLink = null;
        let nextLink = null;

        links.forEach(link => {
            const text = link.textContent.trim();
            if (text === '上一页') {
                prevLink = link;
            } else if (text === '下一页') {
                nextLink = link;
            }
        });

        // 键盘事件处理
        document.addEventListener('keydown', function(event) {
            // 左箭头键 - 上一页
            if (event.key === 'ArrowLeft' && prevLink) {
                event.preventDefault();
                if (prevLink.href && prevLink.href !== '#') {
                    window.location.href = prevLink.href;
                }
            }
            // 右箭头键 - 下一页
            else if (event.key === 'ArrowRight' && nextLink) {
                event.preventDefault();
                if (nextLink.href && nextLink.href !== '#') {
                    window.location.href = nextLink.href;
                }
            }
        });
    }
    
    // 详情页章节导航处理函数
    function handleChapterNavigation(chapterNav) {
        // 查找上一章和下一章链接
        // 使用更精确的选择器查找上一页和下一页链接
        const prevChapter = chapterNav.querySelector('span:first-child a');
        const nextChapter = chapterNav.querySelector('span:last-child a');
        
        // 打印调试信息
        console.log('详情页导航元素:', chapterNav);
        console.log('找到的上一章链接 (prevChapter):', prevChapter ? prevChapter.href : '未找到');
        console.log('找到的下一章链接 (nextChapter):', nextChapter ? nextChapter.href : '未找到');
        
        // 详情页键盘事件处理
        document.addEventListener('keydown', function(event) {
            // 左箭头键 - 上一章
            if (event.key === 'ArrowLeft') {
                if (prevChapter) {
                    event.preventDefault();
                    if (prevChapter.href && prevChapter.href !== '#') {
                        window.location.href = prevChapter.href;
                    } else {
                        console.log('上一章链接无效或为空:', prevChapter.href);
                    }
                } else {
                    console.log('未找到上一章链接，左箭头键不起作用。');
                }
            }
            // 右箭头键 - 下一章
            else if (event.key === 'ArrowRight') {
                if (nextChapter) {
                    event.preventDefault();
                    if (nextChapter.href && nextChapter.href !== '#') {
                        window.location.href = nextChapter.href;
                    } else {
                        console.log('下一章链接无效或为空:', nextChapter.href);
                    }
                } else {
                    console.log('未找到下一章链接，右箭头键不起作用。');
                }
            }
        });
        
        console.log('详情页章节导航功能已启用');
    }
    

    });
    
    // 复制书籍详情页链接功能
    function addCopyBookLinkButtons() {
        // 查找所有书籍项目
        const bookItems = document.querySelectorAll('.itemtxt');
        
        bookItems.forEach(item => {
            const h3 = item.querySelector('h3');
            const bookLink = h3 ? h3.querySelector('a') : null;
            
            if (bookLink && bookLink.href) {
                // 创建复制按钮
                const copyButton = document.createElement('button');
                copyButton.textContent = '📋';
                copyButton.title = '复制书籍链接';
                copyButton.style.cssText = `
                    margin-left: 8px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    padding: 2px 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.3s;
                `;
                
                // 鼠标悬停效果
                copyButton.addEventListener('mouseenter', function() {
                    this.style.background = '#45a049';
                });
                
                copyButton.addEventListener('mouseleave', function() {
                    this.style.background = '#4CAF50';
                });
                
                // 复制功能
                copyButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // 获取完整链接
                    const fullUrl = bookLink.href;
                    
                    // 使用现代的Clipboard API
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(fullUrl).then(() => {
                            // 临时改变按钮文本和样式
                            const originalText = copyButton.textContent;
                            const originalBackground = copyButton.style.background;
                            copyButton.textContent = '✓';
                            copyButton.style.background = '#2196F3';
                            
                            // 2秒后恢复原状
                            setTimeout(() => {
                                copyButton.textContent = originalText;
                                copyButton.style.background = originalBackground;
                            }, 2000);
                            
                            console.log('书籍链接已复制:', fullUrl);
                        }).catch(err => {
                            console.error('复制失败:', err);
                            alert('复制失败，请手动复制链接');
                        });
                    } else {
                        // 降级方案：使用传统方法
                        const textArea = document.createElement('textarea');
                        textArea.value = fullUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                            document.execCommand('copy');
                            copyButton.textContent = '✓';
                            copyButton.style.background = '#2196F3';
                            setTimeout(() => {
                                copyButton.textContent = '📋';
                                copyButton.style.background = '#4CAF50';
                            }, 2000);
                            console.log('书籍链接已复制:', fullUrl);
                        } catch (err) {
                            console.error('复制失败:', err);
                            alert('复制失败，请手动复制链接');
                        } finally {
                            document.body.removeChild(textArea);
                        }
                    }
                });
                
                // 将按钮添加到h3中，放在链接后面
                h3.appendChild(copyButton);
            }
        });
        
        if (bookItems.length > 0) {
            console.log(`已为 ${bookItems.length} 本书籍添加复制链接按钮`);
        }
    }
})();
