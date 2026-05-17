// ==UserScript==
// @name        tongquet.com - 字体调节
// @namespace   Violentmonkey Scripts
// @match       https://tongquet.com/book/*
// @grant       none
// @version     1.2
// @author      -
// @description 替换回到顶部按钮为字体大小调节器
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'tongquet_font_size';
    const DEFAULT_SIZE = 18;
    const MIN_SIZE = 12;
    const MAX_SIZE = 36;

    function getFontSize() {
        return parseInt(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SIZE;
    }

    function setFontSize(size) {
        size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
        localStorage.setItem(STORAGE_KEY, size);
        applyFontSize(size);
    }

    function applyFontSize(size) {
        const container = document.getElementById('reader-content');
        if (!container) return;
        const ps = container.querySelectorAll('p');
        ps.forEach(p => p.style.fontSize = size + 'px');
    }

    let autoHideTimer = null;

    function createControls() {
        const wrap = document.createElement('div');
        wrap.id = 'font-size-controls';
        wrap.className = 'expanded';

        // ---- expanded panel ----
        const panel = document.createElement('div');
        panel.className = 'fsc-panel';
        panel.style.cssText = `
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            background: rgba(0,0,0,.7); border-radius: 8px; padding: 8px 6px;
            transition: opacity .3s ease;
        `;

        const current = document.createElement('span');
        current.id = 'font-size-display';
        current.textContent = getFontSize();
        current.style.cssText = `
            color: #fff; font-size: 14px; font-weight: bold; line-height: 1; user-select: none;
        `;

        const btnUp = document.createElement('button');
        btnUp.textContent = '+';
        btnUp.style.cssText = btnStyle();
        btnUp.onclick = (e) => { e.stopPropagation(); setFontSize(getFontSize() + 1); current.textContent = getFontSize(); resetAutoHide(wrap); };

        const btnDown = document.createElement('button');
        btnDown.textContent = '-';
        btnDown.style.cssText = btnStyle();
        btnDown.onclick = (e) => { e.stopPropagation(); setFontSize(getFontSize() - 1); current.textContent = getFontSize(); resetAutoHide(wrap); };

        panel.appendChild(btnUp);
        panel.appendChild(current);
        panel.appendChild(btnDown);

        // ---- collapsed knob ----
        const knob = document.createElement('div');
        knob.className = 'fsc-knob';
        knob.textContent = 'Aa';
        knob.style.cssText = `
            width: 44px; height: 44px; border-radius: 50%;
            background: rgba(0,0,0,.7); color: #fff;
            font-size: 14px; font-weight: bold;
            display: none; align-items: center; justify-content: center;
            user-select: none; cursor: pointer;
        `;

        wrap.appendChild(panel);
        wrap.appendChild(knob);

        wrap.style.cssText = `
            position: fixed; bottom: 100px; right: 20px; z-index: 9999;
            transition: right .35s ease;
        `;

        wrap.addEventListener('click', (e) => {
            if (wrap.classList.contains('collapsed')) {
                e.stopPropagation();
                expandPanel(wrap);
                resetAutoHide(wrap);
            } else {
                resetAutoHide(wrap);
            }
        });

        return wrap;
    }

    function collapsePanel(el) {
        el.classList.remove('expanded');
        el.classList.add('collapsed');
        const panel = el.querySelector('.fsc-panel');
        const knob = el.querySelector('.fsc-knob');
        panel.style.display = 'none';
        knob.style.display = 'flex';
        el.style.right = '-22px';
    }

    function expandPanel(el) {
        el.classList.remove('collapsed');
        el.classList.add('expanded');
        const panel = el.querySelector('.fsc-panel');
        const knob = el.querySelector('.fsc-knob');
        knob.style.display = 'none';
        panel.style.display = 'flex';
        el.style.right = '20px';
    }

    function startAutoHide(el) {
        clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
            if (el.classList.contains('expanded')) {
                collapsePanel(el);
            }
        }, 5000);
    }

    function resetAutoHide(el) {
        clearTimeout(autoHideTimer);
        expandPanel(el);
        startAutoHide(el);
    }

    function btnStyle() {
        return `
            width: 36px; height: 36px; border: none; border-radius: 6px;
            background: #fff; color: #333; font-size: 20px; font-weight: bold;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            line-height: 1; user-select: none;
        `;
    }

    function init() {
        const oldBtn = document.getElementById('back-to-top');
        if (oldBtn) oldBtn.remove();

        const controls = createControls();
        document.body.appendChild(controls);
        applyFontSize(getFontSize());
        startAutoHide(controls);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
