// ==UserScript==
// @name        tongquet.com - 字体调节
// @namespace   Violentmonkey Scripts
// @match       https://tongquet.com/book/*
// @grant       none
// @version     1.4
// @author      -
// @description 替换回到顶部按钮为字体大小调节器，半圆可拖拽吸附
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'tongquet_font_size';
    const POS_STORAGE_KEY = 'tongquet_font_pos';
    const DEFAULT_SIZE = 18;
    const MIN_SIZE = 12;
    const MAX_SIZE = 36;
    const DEFAULT_BOTTOM = 100;
    const KNOB_SIZE = 32;

    let autoHideTimer = null;

    // ── 字号 ──
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

    // ── 位置 ──
    function getPos() {
        try {
            return JSON.parse(localStorage.getItem(POS_STORAGE_KEY)) || { bottom: DEFAULT_BOTTOM };
        } catch { return { bottom: DEFAULT_BOTTOM }; }
    }
    function savePos(pos) {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
    }

    // ── 拖拽 ──
    let dragState = null;

    function initDrag(knob, wrap) {
        knob.addEventListener('touchstart', (e) => onStart(e, wrap), { passive: false });
        knob.addEventListener('mousedown', (e) => onStart(e, wrap));
    }

    function onStart(e, wrap) {
        const touch = e.touches ? e.touches[0] : e;
        const rect = wrap.getBoundingClientRect();
        dragState = {
            wrap,
            startY: touch.clientY,
            startBottom: parseFloat(wrap.style.bottom) || getPos().bottom,
        };
        wrap.style.transition = 'none';

        const onMove = (ev) => {
            if (!dragState) return;
            const t = ev.touches ? ev.touches[0] : ev;
            const dy = dragState.startBottom + (dragState.startY - t.clientY);
            const clamped = Math.max(10, Math.min(window.innerHeight - KNOB_SIZE - 10, dy));
            wrap.style.bottom = clamped + 'px';
            dragState.moved = true;
            ev.preventDefault();
        };
        const onEnd = () => {
            if (!dragState) return;
            if (dragState.moved) {
                const final = parseFloat(wrap.style.bottom) || getPos().bottom;
                const snapped = Math.round(final / 10) * 10;
                const clamped = Math.max(10, Math.min(window.innerHeight - KNOB_SIZE - 10, snapped));
                wrap.style.bottom = clamped + 'px';
                savePos({ bottom: clamped });
            }
            if (!wrap.classList.contains('collapsed')) {
                wrap.style.transition = 'right .35s ease';
            }
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            dragState = null;
        };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }

    // ── 控件 ──
    function createControls() {
        const pos = getPos();

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
            width: ${KNOB_SIZE}px; height: ${KNOB_SIZE}px; border-radius: 50%;
            background: rgba(0,0,0,.7); color: #fff;
            font-size: 14px; font-weight: bold;
            display: none; align-items: center; justify-content: center;
            user-select: none; cursor: grab; touch-action: none;
        `;

        wrap.appendChild(panel);
        wrap.appendChild(knob);

        wrap.style.cssText = `
            position: fixed; bottom: ${pos.bottom}px; right: 20px; z-index: 9999;
            transition: right .35s ease;
        `;

        initDrag(knob, wrap);

        wrap.addEventListener('click', (e) => {
            if (dragState && dragState.moved) return;
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
        el.style.right = `-${KNOB_SIZE / 2}px`;
        el.style.transition = 'right .35s ease';
    }

    function expandPanel(el) {
        el.classList.remove('collapsed');
        el.classList.add('expanded');
        const panel = el.querySelector('.fsc-panel');
        const knob = el.querySelector('.fsc-knob');
        knob.style.display = 'none';
        panel.style.display = 'flex';
        el.style.right = '20px';
        el.style.transition = 'right .35s ease';
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

    // ── 初始化 ──
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
