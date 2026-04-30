function initShortcut() {
    $(document).keydown(e => {
        70 === e.keyCode ? (e.ctrlKey || e.metaKey) && (e.preventDefault(),
        searchTopic()) : 71 === e.keyCode && (e.ctrlKey || e.metaKey) && (e.preventDefault(),
        searchTopic())
    }
    )
}
function init() {
    $(window).on("scroll", debounce( () => {
        refresh(),
        hideTip()
    }
    , 240))
}
function initNav() {
    $("#nav-mobile").click( () => ($("#tip-mini").hasClass("show") ? hideTip() : safeAsync(share)(),
    !1)),
    $("#btn-toggle-sort").click(function() {
        $(".navbar-sort").removeClass("collapsed"),
        $(".navbar-menu").addClass("collapsed"),
        $(this).addClass("collapsed"),
        $("#btn-toggle-menu").removeClass("collapsed")
    }),
    $("#btn-toggle-menu").click(function() {
        $(".navbar-menu").removeClass("collapsed"),
        $(".navbar-sort").addClass("collapsed"),
        $(this).addClass("collapsed"),
        $("#btn-toggle-sort").removeClass("collapsed")
    })
}
function initGalleryTitle(e="", t="") {
    let a = ""
      , i = $(".navbar-here span")
      , o = i.attr("data-title")
      , n = i.attr("data-desc");
    o && (a = o,
    n && (a += `&nbsp;&#xb7;&nbsp;${n}`)),
    e && (a ? a += `「${e}」` : a = `「${e}」`),
    t && (a ? a += `：${t}` : a = t),
    $(".list-label:first span").html(a || "图库")
}
async function load(e=!1) {
    let t = generateApiUrl(URL_API, SPLIT_KEY, DATA_CACHE);
    if (!t)
        return;
    let a = fetch(t, {
        headers: {
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        }
    })
      , i = null
      , o = null
      , n = null
      , s = null
      , r = null;
    e || (isPageGuideTopic() ? UA_PC || (i = fetch("https://api.nguaduot.cn/portrait/hot?json=1&pick=1&portrait=0", {
        headers: {
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        }
    })) : isPageGuideProvider() && (UA_PC || (r = fetch("https://api.nguaduot.cn/portrait/hot?json=1&pick=0&portrait=0", {
        headers: {
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        }
    }))));
    let l = await Promise.allSettled([a, i, o, n, s, r])
      , c = await Promise.allSettled(l.map(e => "fulfilled" === e.status && e.value ? e.value.json() : Promise.resolve(null)))
      , [p,d,g,h,f,u] = c.map(e => "fulfilled" === e.status ? e.value : null);
    handleData(p, d, g, h, f, u, e)
}
function handleData(e, t, a, i, o, n, s) {
    if (!e || 1 !== e.status)
        return void showToastError("load", e && e.msg ? `图库加载失败：${e.msg}` : "图库加载失败");
    let r = e.data;
    if (isPageGuideTopic()) {
        if (o && 1 === o.status) {
            let e = o.data;
            e.id = "二十四节气",
            e.title = "二十四节气",
            e.story = "“春雨惊春清谷天，夏满芒夏暑相连”",
            r.unshift(e)
        }
        if (i && 1 === i.status) {
            let e = i.data;
            e.id = "Windows 聚焦",
            e.title = "Windows 聚焦",
            e.story = "探索世界",
            r.unshift(e)
        }
        if (a && 1 === a.status) {
            let e = a.data;
            e.id = "周度精选",
            e.title = "周度精选",
            e.story = "编辑精选，每周一期",
            r.unshift(e)
        }
        if (t && 1 === t.status) {
            let e = t.data;
            e.id = "竖屏精选",
            e.title = "竖屏精选",
            e.story = "手机专用",
            r.unshift(e)
        }
        if (e.extend && 1 === e.extend.status && e.extend.data.length > 0) {
            r.forEach(e => {
                e.group = "其他"
            }
            );
            for (let t = e.extend.data.length - 1; t >= 0; --t) {
                let a = e.extend.data[t];
                a.group = "",
                r.unshift(a)
            }
        } else
            r.forEach(e => {
                e.group = ""
            }
            )
    } else if (isPageGuideProvider()) {
        if (n && 1 === n.status) {
            let e = n.data;
            e.title = "竖屏专区",
            e.story = "手机专用",
            e.rawprovider = "portrait",
            e.rawid = e.id,
            r.unshift(e)
        }
    } else {
        if (e.extend && 1 === e.extend.status)
            for (let t = e.extend.data.length - 1; t >= 0; --t) {
                let a = e.extend.data[t];
                a.extend = !0,
                r.unshift(a)
            }
        if ("周度精选" === getTopic())
            r.forEach(e => {
                e.group = `第${e.phase}期`
            }
            );
        else if ("Windows 聚焦" === getTopic())
            r.forEach(e => {
                e.group = new Date(e.reldate).Format("yyyy年MM月")
            }
            );
        else if ("二十四节气" === getTopic()) {
            let e = (new Date).Format("yyyy-MM-dd")
              , t = DATA_TERM.filter(t => e.localeCompare(t[0]) >= 0).slice(0, 24)
              , a = [];
            t.forEach(e => {
                let t = `${e[1]}（${new Date(e[0]).Format("yyyy年MM月")}）`
                  , i = `二十四节气-${e[1]}`;
                for (let e of r)
                    e.topic.indexOf(i) >= 0 && (e.group = t,
                    a.push(e))
            }
            ),
            r = a
        }
    }
    for (let e of r) {
        if (DATA_CACHE.length >= PAGE_TOTAL)
            break;
        e.id = e.id.toString(),
        DATA_CACHE.map(e => e.id).includes(e.id) || (e.imgurl = decryptUrl(e.imgurl, e.rawprovider),
        e.thumburl = decryptUrl(e.thumburl, e.rawprovider),
        DATA_CACHE.push(e))
    }
    $("#nav-account").data("auth", e.auth),
    s || $(".image-list").empty(),
    fill(DATA_CACHE),
    refresh(),
    s || setTimeout( () => {
        if (isPageSeek())
            showToastInfo("seek", "刷图过程中收藏好图（鼠标右键）、标记“我不喜欢”（快捷键 Backspace）将训练拾光为你推荐更好的内容。", "了解拾光如何为我推荐", () => {
                window.open("https://doc.timeline.ink/#/seek")
            }
            );
        else if (isPageProvider()) {
            let e = new URLSearchParams(location.search).get("o");
            "hot" === e ? showToastInfo("order", `你正在浏览图源「${PROVIDER_NAME}」。当前排序：趋势（近期热门）`, "&emsp;最新（每日更新）", () => {
                location.assign(location.pathname + "?o=latest")
            }
            , "&emsp;随缘（随机发现）", () => {
                location.assign(location.pathname + "?o=rand")
            }
            ) : "rand" === e ? showToastInfo("order", `你正在浏览图源「${PROVIDER_NAME}」。当前排序：随缘（随机发现）`, "&emsp;最新（每日更新）", () => {
                location.assign(location.pathname + "?o=latest")
            }
            , "&emsp;趋势（近期热门）", () => {
                location.assign(location.pathname + "?o=hot")
            }
            ) : showToastInfo("order", `你正在浏览图源「${PROVIDER_NAME}」。当前排序：最新（每日更新）`, "&emsp;趋势（近期热门）", () => {
                location.assign(location.pathname + "?o=hot")
            }
            , "&emsp;随缘（随机发现）", () => {
                location.assign(location.pathname + "?o=rand")
            }
            )
        } else if (isPageGuideTopic()) {
            let t = new URLSearchParams(location.search).get("k");
            if (t) {
                let a = e.extend && 1 === e.extend.status ? e.extend.data.length : 0
                  , i = `查找到${a}个与“${t}”相关的专题。若未能如愿找到，不妨尝试更具体的关键词。`;
                UA_PC && (i = `查找到${a}个与“${t}”相关的专题。若未能如愿找到，不妨尝试更具体的关键词，或联系客服寻求帮助，欢迎打扰。`),
                showToastInfo("log-gallery", i, "重新查找&emsp;", () => {
                    searchTopic()
                }
                , "联系客服", () => {
                    window.open("https://doc.timeline.ink/#/about?id=contact")
                }
                )
            } else {
                let e = "拾光专题正处于持续优化阶段，你可以通过关键词查找心仪的专题内容。"
                  , t = "查找专题&emsp;";
                UA_PC && (e = "拾光专题正处于持续优化阶段，暂未开放语义搜索，你可以暂且通过关键词查找心仪的专题内容，感谢理解与支持。若有任何需求或建议，欢迎随时打扰。",
                t = UA_APPLE ? "查找&nbsp;(Command+F)&emsp;" : "查找&nbsp;(Ctrl+F)&emsp;"),
                showToastInfo("log-gallery", e, t, () => {
                    searchTopic()
                }
                , "联系客服", () => {
                    window.open("https://doc.timeline.ink/#/about?id=contact")
                }
                )
            }
        } else if (isPageSort()) {
            let e = isPageSortHot() ? "热门图库" : isPageSortRand() ? "随机图库" : "最新图库"
              , t = new URLSearchParams(location.search).get("ch")
              , a = new URLSearchParams(location.search).get("cw")
              , i = !/^[01]{2}$/.test(t) || "00" === t || "11" === t
              , o = !/^[01]{5}$/.test(a) || "00000" === a || "11111" === a;
            i && "01100" === a ? showToastInfo("sort", `你正在浏览${e}。当前个性化：只看人物`, "&emsp;不看人物", () => {
                location.assign(`${location.pathname}?ch=11&cw=10011`)
            }
            , "&emsp;所有类别", () => {
                location.assign(location.pathname)
            }
            ) : i && "10011" === a ? showToastInfo("sort", `你正在浏览${e}。当前个性化：不看人物`, "&emsp;只看人物", () => {
                location.assign(`${location.pathname}?ch=11&cw=01100`)
            }
            , "&emsp;所有类别", () => {
                location.assign(location.pathname)
            }
            ) : i && o ? showToastInfo("sort", `你正在浏览${e}。当前个性化：所有类别`, "&emsp;只看人物", () => {
                location.assign(`${location.pathname}?ch=11&cw=01100`)
            }
            , "&emsp;不看人物", () => {
                location.assign(`${location.pathname}?ch=11&cw=10011`)
            }
            ) : showToastInfo("sort", `你正在浏览${e}。当前个性化：自定义`, "&emsp;所有类别", () => {
                location.assign(location.pathname)
            }
            )
        }
        checkAccount($("#nav-account").data("auth")),
        0 === DATA_CACHE.length ? isPageFavorite() ? showToastInfo("favorite", "你的收藏夹为空。如何收藏：点击喜欢的图片，右键菜单选择「添加到收藏夹」即可。") : showToastError("load", e.msg ? "空空如也：" + e.msg : "空空如也") : (isPageTopic() && safeAsync(fetchTopicInfo)(),
        safeAsync(checkDownloadTodo)()),
        safeAsync(checkVisitFreq)()
    }
    , 600)
}
function fill(e) {
    let t = group(e)
      , a = $(".image-list img").map(function() {
        return $(this).attr("id")
    }).toArray()
      , i = [];
    if (t[0].data.forEach(e => {
        a.includes(e.id.toString()) || i.push(e)
    }
    ),
    i.length > 0) {
        t[0].label && $(".list-label:first span").html(t[0].label);
        for (let e in i)
            isPageGuideProvider() ? $(".image-list:first").append(generateImgFigure4Provider(i[e])) : isPageGuideTopic() ? $(".image-list:first").append(generateImgFigure4Topic(i[e])) : $(".image-list:first").append(generateImgFigure(i[e]))
    }
    let o = $(".list");
    for (let e = 1; e < t.length; ++e) {
        let i = [];
        if (t[e].data.forEach(e => {
            a.includes(e.id) || i.push(e)
        }
        ),
        i.length > 0) {
            let a = $(`.image-list-${e}`);
            if (0 === a.length) {
                let i = $("<div class='list-label list-label-middle unavailable'></div>");
                i.append(`<i class="fa fa-space-shuttle"></i>&nbsp;<span>${t[e].label}</span>`),
                o.append(i),
                a = $(`<div class='image-list image-list-${e}'></div>`),
                o.append(a)
            }
            for (let e in i)
                isPageGuideProvider() ? a.append(generateImgFigure4Provider(i[e])) : isPageGuideTopic() ? a.append(generateImgFigure4Topic(i[e])) : a.append(generateImgFigure(i[e]))
        }
    }
}
function refresh() {
    let e = $(".image-list img")
      , t = e.length;
    if (e.each(function() {
        $(this).attr("id") && $(this).data("thumb") && checkPartiallyInViewport($(this)) && showThumb($(this))
    }),
    t < PAGE_TOTAL && t > 0 && checkPartiallyInViewport(e.last()) && t > last_load_more && (last_load_more = t,
    SPLIT_KEY && safeAsync(load)(!0)),
    t > 0) {
        let e = $(".copyright");
        $(window).height() + $(window).scrollTop() >= e.offset().top ? e.data("visible") || (e.data("visible", !0),
        refreshGlitter()) : e.data("visible", !1)
    }
}
function group(e) {
    e = e || [];
    let t = e.filter(e => !e.extend);
    if (!PAGE_GROUP || 0 === t.length)
        return [{
            label: "",
            data: e
        }];
    let a = [];
    if (void 0 !== e[0].group) {
        a.push({
            label: e[0].group,
            data: [e[0]]
        });
        for (let t = 1; t < e.length; ++t) {
            let i = a[a.length - 1]
              , o = i.data[i.data.length - 1]
              , n = e[t];
            n.extend ? i.data.push(n) : n.group === o.group ? i.data.push(n) : a.push({
                label: n.group,
                data: [n]
            })
        }
    } else {
        let t = []
          , i = [];
        if (e.forEach( (e, a) => {
            e.extend ? i.length > 0 ? i.push(e) : t.push(e) : i.length > 0 ? i.push(e) : t.length < 4 || e.reldate === t.slice(-1)[0].reldate ? t.push(e) : i.push(e)
        }
        ),
        a.push({
            label: "",
            data: t
        }),
        i.length > 0) {
            let e = t[t.length - 1].reldate;
            a.push({
                label: parseLabelEarlier(e),
                data: i
            })
        }
    }
    return a
}
function generateImgFigure(e) {
    let t = $("<figure></figure>")
      , a = $('<a target="_blank" rel="nofollow"></a>');
    a.data("id", e.id),
    "/" === location.pathname ? a.attr("href", "/flip" + location.search) : a.attr("href", "/flip" + location.pathname + location.search),
    a.click(function() {
        return localStorage.setItem("data", JSON.stringify(DATA_CACHE)),
        localStorage.setItem("goto", $(this).data("id")),
        !0
    });
    let i = $("<div class='card-v1'></div>")
      , o = $('<img alt="拾光壁纸" referrerpolicy="no-referrer">');
    o.attr("id", e.id),
    o.attr("src", generatePlaceholder(e.hue, e.width / e.height)),
    "contain" === COVER_FIT && o.css("object-fit", "contain"),
    o.data("thumb", e.thumburl),
    i.append(o),
    a.append(i),
    t.append(a);
    let n = $("<figcaption class='fade'></figcaption>");
    CAPTION_BLINK && (n.append(`${e.blink}&nbsp;<i class='fa fa-star'></i>`),
    e.rank > 0 && n.append("&emsp;<i class='fa fa-arrow-up'></i>"));
    let s = parseTag(e, CAPTION_TAG);
    if (s && (n.html() && n.append("&emsp;"),
    n.append(`<i class='fa fa-tag'></i>&nbsp;${s}`)),
    CAPTION_REMOVE_SAVE) {
        let t = $(`<a id='save0-${e.id}' href='javascript:' rel="nofollow"></a>`);
        t.data("id", e.id).data("rp", e.rawprovider).data("ri", e.rawid).data("url", e.imgurl),
        n.html() && t.append("&emsp;"),
        t.append("<i class='fa fa-eject'></i>&nbsp;移出收藏&emsp;"),
        t.click(function() {
            $(this).parent().removeClass("fade");
            let e = $(this).data("id")
              , t = $(this).data("rp")
              , a = $(this).data("ri")
              , i = $(this).data("url");
            $(this).children("i").hasClass("fa-check") ? safeAsync(markSave)(e, t, a, i) : safeAsync(markSaveUndo)(e, t, a)
        }),
        n.append(t)
    }
    return t.append(n),
    t
}
function generateImgFigure4Provider(e) {
    let t = $("<figure></figure>");
    t.append("<div class='card-v2-1'></div>"),
    t.append("<div class='card-v2-2'></div>");
    let a = $('<a target="_self" rel="nofollow"></a>');
    a.data("rp", e.rawprovider).data("ri", e.rawid),
    a.attr("href", `/feed/${e.rawprovider}`),
    a.click(function() {
        return saveRootDomainCookie(`cover-${$(this).data("rp")}`, $(this).data("ri"), !0),
        !0
    });
    let i = $("<div class='card-v2-3'></div>")
      , o = $('<img alt="拾光壁纸" referrerpolicy="no-referrer">');
    o.attr("id", e.id),
    o.attr("src", generatePlaceholder(e.hue, e.width / e.height)),
    "contain" === COVER_FIT && o.css("object-fit", "contain"),
    o.data("thumb", e.thumburl),
    i.append(o),
    a.append(i),
    t.append(a);
    let n = $("<figcaption class='fade1'></figcaption>")
      , s = $("<figcaption class='fade2'></figcaption>")
      , r = parseTag(e, CAPTION_PROVIDER);
    r && (o.attr("alt", r),
    n.append(`<i class="fa fa-folder-open"></i>&nbsp;${r}&ensp;`),
    s.append(`<i class="fa fa-folder-open"></i>&nbsp;${r}&ensp;`));
    let l = parseTag(e, CAPTION_SLOGAN);
    return l && s.append(`&ensp;<i class="fa fa-bookmark"></i>&nbsp;${l}&ensp;`),
    t.append(n),
    t.append(s),
    t
}
function generateImgFigure4Topic(e) {
    let t = $("<figure></figure>");
    t.append("<div class='card-v2-1'></div>"),
    t.append("<div class='card-v2-2'></div>");
    let a = $('<a target="_self" rel="nofollow"></a>');
    a.data("rp", e.rawprovider).data("ri", e.rawid),
    a.attr("href", `/?t=${encodeURIComponent(e.id)}`),
    "周度精选" === e.id || "Windows 聚焦" === e.id ? a.click(function() {
        return saveRootDomainCookie("cover-topic", $(this).data("ri"), !0),
        !0
    }) : (e.id,
    a.click(function() {
        let e = encryptMd5(`${$(this).data("rp")}-${$(this).data("ri")}`);
        return saveRootDomainCookie("cover-topic", e, !0),
        !0
    }));
    let i = $("<div class='card-v2-3'></div>")
      , o = $('<img alt="拾光壁纸" referrerpolicy="no-referrer">');
    o.attr("id", e.id),
    o.attr("src", generatePlaceholder(e.hue, e.width / e.height)),
    "contain" === COVER_FIT && o.css("object-fit", "contain"),
    o.data("thumb", e.thumburl),
    i.append(o),
    a.append(i),
    t.append(a);
    let n = $("<figcaption class='fade1'></figcaption>")
      , s = $("<figcaption class='fade2'></figcaption>")
      , r = parseTag(e, CAPTION_PROVIDER);
    r && (o.attr("alt", r),
    n.append(`<i class="fa fa-book"></i>&nbsp;${r}&ensp;`),
    s.append(`<i class="fa fa-book"></i>&nbsp;${r}&ensp;`));
    let l = parseTag(e, CAPTION_SLOGAN);
    return l && s.append(`&ensp;<i class="fa fa-bookmark"></i>&nbsp;${l}&ensp;`),
    t.append(n),
    t.append(s),
    t
}
function generateCaptionErrorAction() {
    return "&ensp;<i class='fa fa-circle-o-notch'></i>&nbsp;出错&ensp;"
}
function showThumb(e) {
    if (!e.data("thumb"))
        return;
    let t = new Image;
    t.referrerPolicy = "no-referrer",
    t.onload = function() {
        e.attr("src", $(this).attr("src"))
    }
    ,
    t.onerror = ( () => {
        e.attr("src", PLACEHOLDER_404)
    }
    ),
    t.src = e.data("thumb"),
    e.removeData("thumb")
}
function showToast(e, t, a, i, o, n, s) {
    let r = $(".toast-mask");
    if (!e || !a)
        return;
    let l, c = $(`.toast[data-id="${e}"]`);
    c && c.remove(),
    "error" === t ? (c = $("<div class='toast toast-error mb8 collapsed'></div>"),
    l = $("<i class='fa fa-circle-o-notch'></i>")) : (c = $("<div class='toast toast-info mb8 collapsed'></div>"),
    l = $("<i class='fa fa-circle-o'></i>")),
    c.attr("data-id", e);
    let p = $("<span class='msg'></span>");
    if (p.html(a.toString().replaceAll("\r\n", "<br>").replaceAll("\n", "<br>")),
    c.append(l).append("&nbsp;").append(p),
    i) {
        let t = $("<a class='action' href='javascript:' rel='nofollow'></a>");
        t.html(i),
        o ? t.click( () => (closeToast(e),
        o(),
        !1)) : t.click( () => (closeToast(e),
        !1)),
        c.append(t)
    }
    if (n) {
        let t = $("<a class='action' href='javascript:' rel='nofollow'></a>");
        t.html(n),
        s ? t.click( () => (closeToast(e),
        s(),
        !1)) : t.click( () => (closeToast(e),
        !1)),
        c.append(t)
    }
    r.prepend(c),
    c.show(400)
}
function showToastInfo(e, t, a="", i=null, o="", n=null) {
    showToast(e, "info", t, a, i, o, n)
}
function showToastError(e, t, a="", i=null, o="", n=null) {
    showToast(e, "error", t, a, i, o, n)
}
function showToastAnonymous() {
    isPageFavorite() ? showToastError("favorite", "当前为临时收藏。建议绑定账号，拾光将长期保留你的收藏图片，并多平台多设备同步。", "绑定账号…", () => {
        $("#nav-account")[0].click()
    }
    ) : isPageSeek() && showToastError("seek", "当前「推荐」内容为大众喜好。建议注册并绑定账号，拾光将学习你的喜好优化推荐。", "绑定账号…", () => {
        $("#nav-account")[0].click()
    }
    )
}
function closeToast(e=null) {
    e ? $(`.toast[data-id="${e}"]`).remove() : $(".toast-mask").empty()
}
function getTopic() {
    return new URLSearchParams(location.search).get("t")
}
function isPageGuideProvider() {
    return "/feed" === location.pathname
}
function isPageGuideTopic() {
    return "/" === location.pathname && !getTopic()
}
function isPageProvider() {
    return location.pathname.match(/^\/feed\/.+/)
}
function isPageTopic() {
    return "/" === location.pathname && getTopic()
}
function isPageSeek() {
    return "/seek" === location.pathname
}
function isPageFavorite() {
    return "/fav" === location.pathname
}
function isPageSortLatest() {
    return "/latest" === location.pathname
}
function isPageSortHot() {
    return "/hot" === location.pathname
}
function isPageSortRand() {
    return "/rand" === location.pathname
}
function isPageSort() {
    return isPageSortLatest() || isPageSortHot() || isPageSortRand()
}
function generateApiUrl(e, t, a) {
    if (e.indexOf("{id}") >= 0) {
        let t = isPageTopic() ? "cover-topic" : `cover-${PROVIDER_ID}`
          , a = $.cookie(t) || "";
        if (a)
            removeRootDomainCookie(t);
        else if (UA_WINDOWS) {
            let e = "timeline-doc-hotkey-windows";
            localStorage.getItem(e) || (a = e,
            localStorage.setItem(e, String(Date.now())))
        } else if (UA_MACOS) {
            let e = "timeline-doc-hotkey-macos";
            localStorage.getItem(e) || (a = e,
            localStorage.setItem(e, String(Date.now())))
        }
        e = e.replace("{id}", a)
    }
    if ("no" === t) {
        if (a = a.filter(e => !e.extend),
        a.length > 0) {
            let t = a.sort( (e, t) => e.no - t.no)[0].no;
            return t > 1 ? e.replace("{no}", t - 1) : null
        }
        return e.replace("{no}", 99999999)
    }
    return e
}
function parseLabelEarlier(e) {
    if (!e)
        return "早些时候";
    const t = 864e5;
    let a = str2localTimestamp(e)
      , i = new Date
      , o = str2localTimestamp(i.Format("yyyy-MM-dd"));
    if (a === o)
        return "一天前";
    let n = o - (i.getDay() - 1) * t;
    if (a === n)
        return "本周之前";
    let s = (o - a) / t;
    if (0 === s)
        return "今天之前";
    if (1 === s)
        return "两天前";
    if (2 === s)
        return "三天前";
    if (6 === s)
        return "一周前";
    let r = str2localTimestamp(i.Format("yyyy-MM-01"));
    return a === r ? "本月之前" : s > 2 && s < 6 ? `${s + 1}天前` : "早些时候"
}
function parseTag(e, t) {
    function a(t, a, i, o, n) {
        let s = e[a] || "";
        return i ? (i = parseInt(i),
        s && s.length > i && (s = s.substring(0, i - 2).trim(),
        s = s.replace(/[，。！？…：；“（]+$/g, "").trim(),
        s += "……"),
        s) : s
    }
    if (!e || !t || 0 === t.length)
        return "";
    let i = "";
    return t[0] && (i = t[0].replace(/\{([^}]+?)(?::(\d+))?}/g, a)),
    i && t[1] && (i = i.replaceAll(new RegExp(t[1],"g"), t[2] || "")),
    i || ""
}
function checkAccount(e) {
    let t = getCookieUser();
    if (!e || 1 !== e.status)
        return void (t ? showToastError("account", e && e.msg ? `账号验证失败：${e.msg}` : "账号验证失败") : showToastAnonymous());
    let a = e.data;
    if (a.auth)
        if (a.active)
            safeAsync(bindDevice)(),
            $("#nav-account span").text(a.user.substring(0, 4)).attr("data-col4-after", a.user.substring(4, 16)),
            localStorage.getItem(`${t}-congratulation`) || (localStorage.setItem(`${t}-congratulation`, String(Date.now())),
            showToastInfo("account", "祝贺，你的账号已绑定成功！感谢赞助拾光。", "我知道了"));
        else {
            let e = "";
            for (let t of a.chat)
                "active" === t.door && (e = t.reply);
            e ? showToastError("account", `当前账号未激活。客服回复：${e}`, "&emsp;重新注册…", () => {
                $("#nav-account")[0].click()
            }
            ) : showToastError("account", "当前账号尚未激活，请等待客服激活。", "重新注册…", () => {
                $("#nav-account")[0].click()
            }
            )
        }
    else
        showToastAnonymous()
}
async function checkDownloadTodo() {
    let e = localStorage.getItem("download-todo");
    if (!e)
        return;
    if (isPageFavorite())
        return void localStorage.removeItem("download-todo");
    let t = getCookieUser(!0);
    if (!t)
        return;
    let a = {
        download: !0
    }
      , i = await fetch("https://api.nguaduot.cn/appstats/account", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": t,
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(a)
    })
      , o = await i.json();
    if (1 !== o.status || 0 === Object.keys(o.data).length)
        return;
    let n = o.data;
    !n.auth || !n.active || n.download <= 0 || (localStorage.removeItem("download-todo"),
    $("#tip-todo img").one("load", () => {
        $(".tip-mask").removeClass("collapsed"),
        $("#tip-todo").removeClass("collapsed"),
        setTimeout( () => {
            $("#tip-todo").addClass("show")
        }
        , 20)
    }
    ).attr("src", e))
}
async function checkVisitFreq() {
    null === localStorage.getItem("count-gallery") && (isPageFavorite() || (UA_WINDOWS ? showToastInfo("log-gallery", "欢迎访问「拾光」，一个干净、舒适、流畅的桌面壁纸网站。", "安装客户端", () => {
        window.open(URL_WINDOWS_VERSION)
    }
    , "&emsp;体验小程序", () => {
        $("#tip-mini").hasClass("collapsed") && safeAsync(share)()
    }
    ) : UA_MACOS ? showToastInfo("log-gallery", "欢迎访问「拾光」，一个干净、舒适、流畅的桌面壁纸网站。", "体验小程序", () => {
        $("#tip-mini").hasClass("collapsed") && safeAsync(share)()
    }
    ) : showToastInfo("log-gallery", "欢迎访问「拾光」，一个干净、舒适、流畅的壁纸网站。", "了解更多", () => {
        window.open("https://doc.timeline.ink")
    }
    )));
    let e = JSON.parse(sessionStorage.getItem("log-gallery") || "[]");
    e.push(Date.now()),
    e = e.slice(-5),
    sessionStorage.setItem("log-gallery", JSON.stringify(e));
    let t = localStorage.getItem("count-gallery");
    if (t = parseInt(t) ? parseInt(t) + 1 : 1,
    localStorage.setItem("count-gallery", String(t)),
    e.length >= 5 && e[4] - e[0] < 1e4) {
        let e = `&emsp;${DONATE_ACTION[Date.now() % DONATE_ACTION.length]}`;
        return void showToastInfo("log-gallery", "访问慢一点。独立运营，维护不易 ^_^", e, () => {
            window.open("https://doc.timeline.ink/#/about?id=donate")
        }
        )
    }
    let a = await fetch("https://api.nguaduot.cn/appstats/bbs/activity/web", {
        headers: {
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        }
    })
      , i = await a.json();
    if (1 === i.status && i.data.brief && "1" !== $.cookie(`bbs-${i.data.id}`)) {
        let e = i.data.toastalt;
        if (e) {
            let t = "参与活动";
            return /[。！？”」]$/.test(e) || (t = "&emsp;" + t),
            void showToastInfo("activity", e, t, () => {
                saveRootDomainCookie(`bbs-${i.data.id}`, "1"),
                window.open("/user?f=9dv688")
            }
            )
        }
    }
    if (t >= 10) {
        localStorage.setItem("count-gallery", String(t - 10));
        let e = await fetch("https://glitter.timeline.ink/api/v2?json=1&lines=1&general=1", {
            headers: {
                "Timeline-Client": CLIENT
            }
        })
          , a = await e.json();
        if (1 !== a.status || 0 === a.data.length)
            return;
        let i = a.data[0].sentencefull || a.data[0].sentence
          , o = DONATE_ACTION[Date.now() % DONATE_ACTION.length];
        i && /[。！？”」]$/.test(i) || (o = "&emsp;" + o),
        showToastInfo("log-gallery", i, o, () => {
            let e = localStorage.getItem("count-gallery");
            e = parseInt(e) ? parseInt(e) - 30 : -30,
            localStorage.setItem("count-gallery", String(e)),
            window.open("https://doc.timeline.ink/#/about?id=donate")
        }
        )
    }
}
async function bindDevice() {
    let e = {
        platform: "web"
    }
      , t = await fetch("https://api.nguaduot.cn/appstats/account/bind", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(e)
    })
      , a = await t.json();
    1 === a.status && a.data
}
function searchTopic() {
    let e = prompt("查找专题图集：");
    if (e = e ? e.trim() : "",
    !e)
        return;
    let t = `/?k=${encodeURIComponent(e)}`;
    location.assign(t)
}
async function fetchTopicInfo() {
    if (!isPageTopic())
        return;
    let e = `https://api.nguaduot.cn/snake/topic/keynote?topic=${encodeURIComponent(getTopic())}`
      , t = await fetch(e, {
        headers: {
            "Timeline-Device": await getCookieFingerprint(),
            "Timeline-Client": CLIENT
        }
    })
      , a = await t.json();
    if (1 === a.status && Object.keys(a.data).length > 0) {
        let e = a.data.topic
          , t = a.data.desc;
        if (e && t)
            if ("竖屏精选" === e) {
                let a = new URLSearchParams(location.search).get("ch")
                  , i = new URLSearchParams(location.search).get("cw")
                  , o = !/^[01]{2}$/.test(a) || "00" === a || "11" === a
                  , n = !/^[01]{5}$/.test(i) || "00000" === i || "11111" === i;
                o && "01100" === i ? showToastInfo("topic", `你正在浏览专题「${e}」。${t}。当前个性化：只看人物`, "&emsp;不看人物", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}&ch=11&cw=10011`)
                }
                , "&emsp;所有类别", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}`)
                }
                ) : o && "10011" === i ? showToastInfo("topic", `你正在浏览专题「${e}」。${t}。当前个性化：不看人物`, "&emsp;只看人物", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}&ch=11&cw=01100`)
                }
                , "&emsp;所有类别", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}`)
                }
                ) : o && n ? showToastInfo("topic", `你正在浏览专题「${e}」。${t}。当前个性化：所有类别`, "&emsp;只看人物", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}&ch=11&cw=01100`)
                }
                , "&emsp;不看人物", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}&ch=11&cw=10011`)
                }
                ) : showToastInfo("topic", `你正在浏览专题「${e}」。${t}。当前个性化：自定义`, "&emsp;所有类别", () => {
                    location.assign(`/?t=${encodeURIComponent(e)}`)
                }
                )
            } else
                showToastInfo("topic", `你正在浏览专题「${e}」。${t}`)
    }
}
function refreshGlitter() {
    fetch("https://glitter.timeline.ink/api/v2?json=1&lines=1&general=0", {
        headers: {
            "Timeline-User": getCookieUser(!0),
            "Timeline-Client": CLIENT
        }
    }).then(e => e.json()).then(e => {
        if (1 === e.status && e.data.length > 0) {
            let t = e.data[0]
              , a = t.sentencefull || t.sentence;
            $(".copyright a:first span").html(a.replaceAll(/[\r\n]+/g, "<br>")),
            $(".copyright a:first").attr("href", `https://glitter.timeline.ink/${t.editor}?id=${t.id}`)
        } else
            $(".copyright a:first span").text("时光如歌，岁月如诗。"),
            $(".copyright a:first").attr("href", "https://glitter.timeline.ink")
    }
    ).catch(e => {
        $(".copyright a:first span").text("时光如歌，岁月如诗。"),
        $(".copyright a:first").attr("href", "https://glitter.timeline.ink")
    }
    )
}
async function share() {
    let e = getCookieUser(!0)
      , t = await getCookieFingerprint();
    if (!e || !t) {
        let e = await fetch(SHARE_CODE)
          , t = await e.blob();
        return void showShare(t)
    }
    let a = {
        appid: "wxd48f779aace1a85c",
        reqad: !1
    }
      , i = await fetch("https://api.nguaduot.cn/appstats/mini/wx/locker/deposit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": e,
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": t,
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(a)
    })
      , o = i.headers.get("content-type");
    if (o.startsWith("image/")) {
        let e = await i.blob();
        showShare(e)
    } else {
        let e = await fetch(SHARE_CODE)
          , t = await e.blob();
        showShare(t)
    }
}
function showShare(e) {
    $(".tip-mask").removeClass("collapsed"),
    $("#tip-mini").removeClass("collapsed"),
    setTimeout( () => {
        window.createImageBitmap(e).then(e => {
            let t = $("#tip-mini canvas")
              , a = jquery2JsObject(t).getBoundingClientRect()
              , i = a.width * getDpr()
              , o = a.height * getDpr()
              , n = o / 1.2
              , s = e.width * (n / e.height);
            t.attr("width", i),
            t.attr("height", o);
            let r = jquery2JsObject(t).getContext("2d");
            r.drawImage(e, (i - s) / 2, (o - n) / 2, s, n),
            $("#tip-mini").addClass("show")
        }
        )
    }
    , 20)
}
function hideTip() {
    $(".tip").removeClass("show"),
    setTimeout( () => {
        $(".tip").addClass("collapsed"),
        $(".tip-mask").addClass("collapsed")
    }
    , 400)
}
async function markSave(e, t, a, i) {
    let o = await getCookieFingerprint();
    if (!o)
        return;
    let n = {
        provider: t,
        id: a,
        url: i,
        action: "save",
        scene: location.pathname,
        lang: getLang()
    }
      , s = await fetch("https://api.nguaduot.cn/appstats/rank/v2", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": o,
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(n)
    })
      , r = await s.json();
    1 === r.status && r.data ? $(`#save0-${e} i`).attr("class", "fa fa-eject") : $(`#save0-${e}`).html(generateCaptionErrorAction())
}
async function markSaveUndo(e, t, a) {
    let i = await getCookieFingerprint();
    if (!i)
        return;
    let o = {
        provider: t,
        id: a,
        action: ["desktop", "lock", "save", "download"]
    }
      , n = await fetch("https://api.nguaduot.cn/appstats/rank/undo", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": getCookieUser(!0),
            "Timeline-Pwd": getCookiePwd(!0),
            "Timeline-Device": i,
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(o)
    })
      , s = await n.json();
    1 === s.status && s.data ? $(`#save0-${e} i`).attr("class", "fa fa-check") : $(`#save0-${e}`).html(generateCaptionErrorAction())
}
async function stats() {
    let e = await getCookieFingerprint();
    if (!e)
        return;
    let t = `${getScreenW()}x${getScreenH()},${getDpr().toFixed(2)}`
      , a = {
        topic: isPageTopic() ? getTopic() : "",
        provider: PROVIDER_ID,
        host: location.hostname,
        path: location.pathname,
        url: location.href,
        referrer: document.referrer,
        screen: t,
        timezone: getTimezone(),
        lang: getLang()
    }
      , i = await fetch("https://api.nguaduot.cn/appstats/web", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Timeline-User": getCookieUser(!0),
            "Timeline-Device": e,
            "Timeline-Client": CLIENT
        },
        body: JSON.stringify(a)
    })
      , o = await i.json();
    1 === o.status && o.data
}
const DATA_CACHE = []
  , DATA_TERM = [["2029-12-21", "冬至"], ["2029-12-07", "大雪"], ["2029-11-22", "小雪"], ["2029-11-07", "立冬"], ["2029-10-23", "霜降"], ["2029-10-08", "寒露"], ["2029-09-23", "秋分"], ["2029-09-07", "白露"], ["2029-08-23", "处暑"], ["2029-08-07", "立秋"], ["2029-07-22", "大暑"], ["2029-07-07", "小暑"], ["2029-06-21", "夏至"], ["2029-06-05", "芒种"], ["2029-05-21", "小满"], ["2029-05-05", "立夏"], ["2029-04-20", "谷雨"], ["2029-04-04", "清明"], ["2029-03-20", "春分"], ["2029-03-05", "惊蛰"], ["2029-02-18", "雨水"], ["2029-02-03", "立春"], ["2029-01-20", "大寒"], ["2029-01-05", "小寒"], ["2028-12-21", "冬至"], ["2028-12-06", "大雪"], ["2028-11-22", "小雪"], ["2028-11-07", "立冬"], ["2028-10-23", "霜降"], ["2028-10-08", "寒露"], ["2028-09-22", "秋分"], ["2028-09-07", "白露"], ["2028-08-22", "处暑"], ["2028-08-07", "立秋"], ["2028-07-22", "大暑"], ["2028-07-06", "小暑"], ["2028-06-21", "夏至"], ["2028-06-05", "芒种"], ["2028-05-20", "小满"], ["2028-05-05", "立夏"], ["2028-04-19", "谷雨"], ["2028-04-04", "清明"], ["2028-03-20", "春分"], ["2028-03-05", "惊蛰"], ["2028-02-19", "雨水"], ["2028-02-04", "立春"], ["2028-01-20", "大寒"], ["2028-01-06", "小寒"], ["2027-12-22", "冬至"], ["2027-12-07", "大雪"], ["2027-11-22", "小雪"], ["2027-11-07", "立冬"], ["2027-10-23", "霜降"], ["2027-10-08", "寒露"], ["2027-09-23", "秋分"], ["2027-09-08", "白露"], ["2027-08-23", "处暑"], ["2027-08-08", "立秋"], ["2027-07-23", "大暑"], ["2027-07-07", "小暑"], ["2027-06-21", "夏至"], ["2027-06-06", "芒种"], ["2027-05-21", "小满"], ["2027-05-06", "立夏"], ["2027-04-20", "谷雨"], ["2027-04-05", "清明"], ["2027-03-21", "春分"], ["2027-03-06", "惊蛰"], ["2027-02-19", "雨水"], ["2027-02-04", "立春"], ["2027-01-20", "大寒"], ["2027-01-05", "小寒"], ["2026-12-22", "冬至"], ["2026-12-07", "大雪"], ["2026-11-22", "小雪"], ["2026-11-07", "立冬"], ["2026-10-23", "霜降"], ["2026-10-08", "寒露"], ["2026-09-23", "秋分"], ["2026-09-07", "白露"], ["2026-08-23", "处暑"], ["2026-08-07", "立秋"], ["2026-07-23", "大暑"], ["2026-07-07", "小暑"], ["2026-06-21", "夏至"], ["2026-06-05", "芒种"], ["2026-05-21", "小满"], ["2026-05-05", "立夏"], ["2026-04-20", "谷雨"], ["2026-04-05", "清明"], ["2026-03-20", "春分"], ["2026-03-05", "惊蛰"], ["2026-02-18", "雨水"], ["2026-02-04", "立春"], ["2026-01-20", "大寒"], ["2026-01-05", "小寒"], ["2025-12-21", "冬至"], ["2025-12-07", "大雪"], ["2025-11-22", "小雪"], ["2025-11-07", "立冬"], ["2025-10-23", "霜降"], ["2025-10-08", "寒露"], ["2025-09-23", "秋分"], ["2025-09-07", "白露"], ["2025-08-23", "处暑"], ["2025-08-07", "立秋"], ["2025-07-22", "大暑"], ["2025-07-07", "小暑"], ["2025-06-21", "夏至"], ["2025-06-05", "芒种"], ["2025-05-21", "小满"], ["2025-05-05", "立夏"], ["2025-04-20", "谷雨"], ["2025-04-04", "清明"], ["2025-03-20", "春分"], ["2025-03-05", "惊蛰"], ["2025-02-18", "雨水"], ["2025-02-03", "立春"], ["2025-01-20", "大寒"], ["2025-01-05", "小寒"], ["2024-12-21", "冬至"], ["2024-12-06", "大雪"], ["2024-11-22", "小雪"], ["2024-11-07", "立冬"], ["2024-10-23", "霜降"], ["2024-10-08", "寒露"], ["2024-09-22", "秋分"], ["2024-09-07", "白露"]];
let last_load_more = 0;
$(document).ready( () => {
    initShortcut(),
    initNav(),
    init(),
    safeAsync(load)(),
    safeAsync(stats)()
}
);
