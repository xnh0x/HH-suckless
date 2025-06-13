// ==UserScript==
// @name         HH suckless
// @version      0.3
// @description  HH that sucks less. Requires HH++ BDSM and Rena's Battle Sim.
// @author       xnh0x
// @match        https://nutaku.haremheroes.com/*
// @run-at       document-idle
// @namespace    https://github.com/xnh0x/HH-suckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hentaiheroes.com
// @grant        GM_info
// ==/UserScript==

(async function () {
    'use strict';
    /*global $,love_raids,GT,HHPlusPlus,girls_data_list*/

    log(`version: ${GM_info.script.version}`);

    /*
     * - removes blur and lock icon from locked poses in the previews for girls
     */
    removePreviewBlur();

    /*
     * - 'R' key shortcut to reload current page since an actual reload
     *     by the browser puts you back to town
     */
    pageReloadKey();

    if (window.location.pathname === '/season-arena.html') {
        /*
         * - swap the best opponent to the left
         *     decided by highest chance then highest mojo
         * - 'space' key starts fight against the best opponent
         * - '1', '2', '3' keys start battles against the three opponents
         */
        seasonArena();
    }

    if (window.location.pathname === '/season-battle.html') {
        /*
         * - 'space' key skips fight and reward popup
         */
        seasonBattle();
    }

    if (window.location.pathname === '/love-raids.html') {
        /*
         * - reveals all mysterious girls
         *     names, shards, images
         * - adds wiki links to the orange names
         * - makes go buttons link to harem if you already own the girl
         */
        await loveRaids();
    }

    if (window.location.pathname.includes('/quest/')) {
        /*
         * - switch scene resolution from 800x450 to 1600x900
         */
        quest();
    }

    if (window.location.pathname === '/waifu.html') {
        /*
         * - button to export owned girls/skins for optimal team script
         */
        waifu();
    }

    if (window.location.pathname === '/path-of-valor.html'
        || window.location.pathname === '/path-of-glory.html') {
        /*
         * - remove claim all
         */
        PoVG();
    }

    function removePreviewBlur() {
        let sheet = document.createElement("style");
        sheet.textContent = [
            '.pose-preview_wrapper.locked .pose-preview { filter: blur(0) !important; }',
            '.pose-preview_wrapper.locked .preview-locked_icn { display: none !important; }',
        ].join(' ');
        document.head.appendChild(sheet);
    }

    function pageReloadKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && document.activeElement.tagName.toLowerCase() !== 'input') {
                window.location.reload();
            }
        });
    }

    function seasonArena() {
        const observer = new MutationObserver(async () => {
            if (document.querySelectorAll('.sim-chance').length === 3) {
                observer.disconnect();
                sortOpponents();
            }
        });

        // try to sort immediately and enable the observer in case rena's results weren't available yet
        if (!sortOpponents()) {
            log('waiting for rena');
            observer.observe(document, {childList: true, subtree: true});
        }

        // 1,2,3 keys start battles against the three opponents
        document.addEventListener('keydown', (e) => {
            const performButtons = document.querySelectorAll(`.season_arena_opponent_container .green_button_L.btn_season_perform`);
            if (e.key === '1') {
                performButtons[0].click();
            } else if (e.key === '2') {
                performButtons[1].click();
            } else if (e.key === '3') {
                performButtons[2].click();
            }
        });

        function sortOpponents() {
            const cls = {main:'.sim-chance', tie:'.sim-mojo'};
            // cls = {main:'.sim-mojo', tie:'.sim-chance'}; // in case the highest expected mojo is preferred
            const mainCriterion = Array.from(document.querySelectorAll(cls.main)).map((el) => parseFloat(el.innerText));
            const tieBreaker = Array.from(document.querySelectorAll(cls.tie)).map((el) => parseFloat(el.innerText));
            if (mainCriterion.length < 3 || tieBreaker.length < 3) {
                return false;
            }
            let best = 0;
            mainCriterion.forEach((c, i) => {
                if (c < mainCriterion[best]) return;
                if (c > mainCriterion[best] || tieBreaker[i] > tieBreaker[best]) best = i;
            });
            const bestOpponent = document.querySelector(`.season_arena_opponent_container.opponent-${best}`);
            if (best > 0) {
                const firstOpponent = document.querySelector(`.season_arena_opponent_container.opponent-0`);
                bestOpponent.remove();
                firstOpponent.before(bestOpponent);
                bestOpponent.classList.add('selected_opponent');
                firstOpponent.classList.remove('selected_opponent');
            }

            // space key starts battle against the best opponent
            document.addEventListener('keydown', (e) => {
                if (e.key === ' ') {
                    bestOpponent.querySelector(`.green_button_L.btn_season_perform`).click();
                }
            });
            log('opponents sorted');

            return true;
        }
    }

    function seasonBattle() {
        // space key skips battle, a second press accepts the results
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                const skipButton = document.querySelector('#new-battle-skip-btn');
                const rewardConfirm = document.querySelector('#rewards_popup .popup_buttons .blue_button_L');
                if (rewardConfirm) {
                    rewardConfirm.click();
                } else {
                    skipButton?.click();
                }
            }
        });
    }

    async function loveRaids() {
        const girls = await HHPlusPlus.Helpers.getGirlDictionary()
            .then(dict => love_raids.map(raid => dict.get(raid.id_girl.toString())));
        // console.log(girls)

        document.querySelectorAll('.raid-card').forEach((raidCard, i) => {
            if (!girls[i]) {
                log('HH++ is missing info, scroll through whole harem to update!')
                return;
            }
            const {name, shards, grade_offsets} = girls[i];
            const haremLink = HHPlusPlus.Helpers.getHref(`/characters/${love_raids[i].id_girl}`);
            const wikiLink = HHPlusPlus.Helpers.getWikiLink(name, love_raids[i].id_girl, HHPlusPlus.I18n.getLang())
            const objectives = raidCard.querySelectorAll('.classic-girl');
            const girl = objectives[0];
            const skin = objectives[1];

            // fill names on mysterious girls and make all names link to the wiki
            raidCard.querySelector('.raid-name span span').innerText = `${name} ${GT.design.love_raid}`;
            girl.querySelector('.girl-name').innerHTML = `<a href="${wikiLink}" target="_blank">${name}</a>`;

            // replace shadow poses
            const leftImage = raidCard.querySelector('.girl-img.left');
            leftImage.src = `${HHPlusPlus.Helpers.getCDNHost()}/pictures/girls/${love_raids[i].id_girl}/ava0.png`;
            if (raidCard.classList.contains('multiple-girl')) {
                const rightImage = raidCard.querySelector('.girl-img.right');
                // there is no good way to tell which skin it will be so this will always show the first
                // it'll be a while until girls will get a second skin anyway
                if (!rightImage.src.includes('grade_skins')) {
                    rightImage.src = `${HHPlusPlus.Helpers.getCDNHost()}/pictures/girls/${love_raids[i].id_girl}/grade_skins/grade_skin1.png`;
                }
            }

            // sometimes the poses are also hidden instead of just black
            raidCard.querySelectorAll('.girl-img').forEach((img) => {
                if (img.style.visibility === 'hidden') {
                    img.style.visibility = 'visible';
                    img.style.marginTop = `-${grade_offsets[0][0]/7}px`;
                }
            })

            // add go buttons if there aren't any
            addMissingGoButton(girl);
            addMissingGoButton(skin);

            // enable go buttons of owned girls/skins
            const goButtons = raidCard.querySelectorAll('.redirect_button');
            if (shards === 100) {
                girl.querySelector('.objective').innerText = GT.design.girl_town_event_owned_v2;
                goButtons[0].removeAttribute('disabled');
                goButtons[0].href = haremLink;
                if (skin) {
                    const skinProgress = parseFloat(skin.querySelector('.shards_bar .bar').style.width);
                    if (skinProgress === 100) {
                        goButtons[1].removeAttribute('disabled');
                        goButtons[1].href = haremLink;
                    }
                }
            }
        })

        // zoo's eye buttons are now obsolete
        document.querySelectorAll('.raid-card .eye').forEach(e => e.remove());

        function addMissingGoButton(e) {
            if (e && !e.querySelectorAll('.redirect_button').length) {
                const button = document.createElement('a');
                button.setAttribute('disabled', '');
                button.classList.add('redirect_button', 'blue_button_L');
                button.innerText = 'Go';
                e.querySelector('.shards-container').appendChild(button);
            }
        }
    }

    function quest() {
        HHPlusPlus.Helpers.doWhenSelectorAvailable('#background', () => {
            const bg = $('#background')[0];
            bg.src = bg.src.replace('800x450', '1600x900');
        })
    }

    function waifu() {
        const div = $(`
            <div style="display: flex">
                <button id="copy_girls" class="square_blue_btn" style="margin-bottom: 8px; margin-left: 8px; display: block">
                    <span><img alt="Copy owned girls and skins" tooltip="Copy owned girls and skins" src="${HHPlusPlus.Helpers.getCDNHost()}/design/ic_books_gray.svg"></span>
                </button>
            </div>`)[0];
        const filterButton = $('#filter_girls')[0];
        filterButton.before(div);
        filterButton.remove();
        const copyButton = $('#copy_girls')[0];
        copyButton.before(filterButton);
        copyButton.addEventListener('click', copyGirls);

        function copyGirls() {
            const text = girls_data_list.reduce((csv, girl) => {csv += `\n${girl.id_girl},${girl.grade_skins.length}`; return csv;}, 'id,skins');
            copyText(text);
        }
    }

    function PoVG() {
        repeatOnChange('.potions-paths-progress-bar-tiers', () => {
            const claimAll = $('.potions-paths-tier.unclaimed.claim-all-rewards')[0];
            if (claimAll) {
                claimAll.classList.remove('claim-all-rewards');
                claimAll.querySelector('#claim-all').style.display = 'none';
            }
        }, true);
    }

    function log(...args) {
        console.log('HH suckless:', ...args);
    }

    function copyText(text) {
        // navigator.clipboard.writeText doesn't work inside an iframe due to missing permissions
        const textArea = $(`<textarea>${text}</textarea>`)[0];
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
    }
})();
