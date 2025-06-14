// ==UserScript==
// @name         Stop Scrolling
// @version      0.1
// @description  Prevents scrolling of the page.
// @author       xnh0x
// @match        https://www.nutaku.net/games/harem-heroes/*
// @match        https://www.nutaku.net/games/comix-harem/*
// @match        https://www.nutaku.net/games/pornstar-harem/*
// @match        https://www.nutaku.net/games/gay-harem/*
// @run-at       document-idle
// @namespace    https://github.com/xnh0x/HHsuckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/StopScrolling.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/StopScrolling.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nutaku.net/
// ==/UserScript==

(function() {
    document.body.style.overflowY='hidden';
    document.body.onscroll = () => { document.body.scrollIntoView(false); };
})();
