// ==UserScript==
// @name         No Nutaku Frame Warning
// @version      0.1
// @description  disable Nutaku frame warning
// @author       xnh0x
// @match        https://nutaku.haremheroes.com/*
// @match        https://nutaku.comixharem.com/*
// @match        https://nutaku.gayharem.com/*
// @match        https://nutaku.pornstarharem.com/*
// @match        https://nutaku.gaypornstarharem.com/*
// @match        https://nutaku.transpornstarharem.com/*
// @run-at       document-start
// @namespace    https://github.com/xnh0x/HH-suckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/noFrameWarning.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/noFrameWarning.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=haremheroes.com
// @grant        none
// ==/UserScript==

// see: https://superuser.com/questions/455863/how-can-i-disable-javascript-popups-alerts-in-chrome

const scriptNode = document.createElement('script');
scriptNode.type = 'text/javascript';
scriptNode.textContent = `(${overrideNativeAlert.toString()})()`;

const t = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
t.appendChild(scriptNode);

function overrideNativeAlert() {
    const nativeAlert = window.alert;
    window.alert = function alert (message) {
        if (message === "You need to be inside Nutaku's frame for this to work.") return;
        nativeAlert(message);
    }
}