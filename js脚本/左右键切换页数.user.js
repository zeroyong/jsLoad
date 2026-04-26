/**
 * @Author: xhg
 * @Date:   2025-11-28 07:13:57
 * @Last Modified by:   xhg
 * @Last Modified time: 2025-04-26
 */
// ==UserScript==
// @name         左右箭头切换页面
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  使用左右箭头键在sudugu.org网站切换上下页，适配排行榜等分页页面
// @author       xhg
// @match        https://www.sudugu.org/*
// @match        https://sudugu.org/*
// @match        *://*.sudugu.org/*
// @match        https://jable.tv/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

'use strict';

// 左右箭头切换页面功能 - 适配 https://www.sudugu.org/
(function() {
    // 等待页面加载完成
    window.addEventListener('load', function() {
        // 查找页面导航元素（列表页）- 尝试多种选择器
        let pageNav = document.querySelector('.page') || document.querySelector('.pagination') || document.querySelector('.pager');
        // 查找详情页导航元素
        const chapterNav = document.querySelector('.prenext');
        
        console.log('页面导航元素:', pageNav);
        
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
        }
        
        // 页面可见性变化时暂停视频（所有页面都执行）
        function handleVideoPause() {
            // 暂停所有 video 元素
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (!video.paused) {
                    video.pause();
                }
            });

            // 点击 video 元素本身暂停
            const mainVideo = document.getElementById('player');
            if (mainVideo) {
                mainVideo.click();
            }

            // 尝试 Plyr API
            if (window.plyr) {
                window.plyr.pause();
            }

            // 尝试点击播放器容器
            const playerContainer = document.querySelector('.plyr--video');
            if (playerContainer) {
                playerContainer.click();
            }

            // 尝试点击暂停按钮（多个选择器）
            const pauseSelectors = [
                '[data-plyr="play"].plyr__control--pressed',
                '.plyr__control[data-plyr="pause"]',
                'button[data-plyr="pause"]',
                '.plyr__controls__item[data-plyr="pause"]',
                '.plyr__control--pressed'
            ];
            
            pauseSelectors.forEach(selector => {
                const btn = document.querySelector(selector);
                if (btn) {
                    btn.click();
                }
            });
        }

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                handleVideoPause();
            }
        });

        // 监听页面离开（刷新、关闭、跳转）
        window.addEventListener('pagehide', function() {
            handleVideoPause();
        });

        // 尝试多次查找视频，因为可能是动态加载的
        let videoCheckCount = 0;
        const videoCheckInterval = setInterval(() => {
            const video = document.getElementById('player') || document.querySelector('video');
            if (video) {
                console.log('找到视频元素:', video);
                clearInterval(videoCheckInterval);
            } else {
                videoCheckCount++;
                if (videoCheckCount > 10) {
                    clearInterval(videoCheckInterval);
                    console.log('未找到视频元素');
                }
            }
        }, 500);

        console.log('视频自动暂停功能已启用');
    });
    
    // 列表页导航处理函数
    function handleListPageNavigation(pageNav) {
        // 查找当前激活的页面元素 - 可能是span或a
        const activePage = pageNav.querySelector('.active.disabled');
        
        console.log('找到的激活页面元素:', activePage);
        
        // 找到当前页面的前一个和后一个链接
        let prevLink = null;
        let nextLink = null;
        
        if (activePage) {
            const parentLi = activePage.closest('li.page-item');
            if (parentLi) {
                // 找到前一个相邻的li中的链接
                const prevLi = parentLi.previousElementSibling;
                if (prevLi) {
                    prevLink = prevLi.querySelector('a');
                }
                // 找到后一个相邻的li中的链接
                const nextLi = parentLi.nextElementSibling;
                if (nextLi) {
                    nextLink = nextLi.querySelector('a');
                }
            }
        } else {
            // 备用方案：查找"上一页"和"下一页"链接
            const links = pageNav.querySelectorAll('a');
            links.forEach(link => {
                const text = link.textContent.trim();
                if (text === '上一页') {
                    prevLink = link;
                } else if (text === '下一页') {
                    nextLink = link;
                }
            });
        }
        
        console.log('上一页链接:', prevLink ? prevLink.href : '未找到');
        console.log('下一页链接:', nextLink ? nextLink.href : '未找到');

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
