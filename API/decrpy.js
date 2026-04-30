function encryptMd5(t) {
    return t ? CryptoJS.MD5(t).toString() : ""
}
function decryptAes(t, e) {
    if (!t || !e)
        return "";
    e = e.repeat(16).slice(-16);
    let r = encryptMd5(e).slice(8, 24)
      , n = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(t))
      , i = CryptoJS.AES.decrypt(n, CryptoJS.enc.Utf8.parse(e), {
        iv: CryptoJS.enc.Utf8.parse(r),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.ZeroPadding
    })
      , p = "";
    try {
        p = i.toString(CryptoJS.enc.Utf8)
    } catch (e) {
        return t
    }
    return p || t
}
function decryptUrl(t, e) {
    if (!t || !e)
        return "";
    let r = t.split("?")
      , n = r[0].split("/")
      , i = n[n.length - 1].split(".");
    if (i[0].length < 32)
        return t;
    let p = [i[0].slice(0, 32), i[0].slice(32)];
    return p[0] = decryptAes(p[0], e),
    i[0] = p.join(""),
    n[n.length - 1] = i.join("."),
    r[0] = n.join("/"),
    r.join("?")
}
