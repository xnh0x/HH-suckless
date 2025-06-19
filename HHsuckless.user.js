// ==UserScript==
// @name         HH suckless
// @version      0.9
// @description  HH that sucks less. Requires HH++ BDSM and Rena's Battle Sim.
// @author       xnh0x
// @match        https://*.hentaiheroes.com/*
// @match        https://nutaku.haremheroes.com/*
// @match        https://*.comixharem.com/*
// @match        https://*.pornstarharem.com/*
// @match        https://*.gayharem.com/*
// @run-at       document-idle
// @namespace    https://github.com/xnh0x/HH-suckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hentaiheroes.com
// @grant        GM_info
// @grant        unsafeWindow
// ==/UserScript==

console.log(`HHsuckless: version: ${GM_info.script.version}`);
const local_now_ts = Math.floor(Date.now() / 1000);

(async function suckless() {
    'use strict';
    /*global $,love_raids,GT,HHPlusPlus,girls_data_list*/

    if (!unsafeWindow.HHPlusPlus) {
        log(`waiting for HHPlusPlus`);
        $(document).one('hh++-bdsm:loaded', () => {
            log('HHPlusPlus ready, restart script');
            suckless();
        });
        return;
    }

    const LS = {
        labFavorites: 'HHsucklessLabFavorites',
        labShopCycleEnd: 'HHsucklessLabShopCycleEnd',
        labShopStock: 'HHsucklessLabShopStock',
    }

    class FavoriteLabGirls {
        constructor() {
            this.favoriteIds = JSON.parse(localStorage.getItem(LS.labFavorites)) || [];
            this.toggle = $('<div class="favourite-toggle"></div>');
            this.addCSS();
        }

        addCSS() {
            let sheet = document.createElement("style");
            sheet.textContent = `
                .harem-girl-container,
                .girl-container {
                    position: relative;
                }
                .girl-container {
                    /* by default the containers have an inconsistent width
                       which makes the stars look unaligned */
                    width: 4.5rem; 
                }
                .harem-girl-container .favourite-toggle {
                    /* slightly smaller to not touch the turn order */
                    height: 22px;
                    width: 22px;
                    background-size: 22px;
                    top: 2px;
                    right: 2px;
                }
                .favourite-toggle {
                    position: absolute;
                    display: none;
                    height: 25px;
                    width: 25px;
                    top: 0px;
                    right: 0px;
                    background-size: 25px;
                    background-repeat: no-repeat;
                    background-position: center;
                    z-index: 1;
                    border-top-right-radius: 5px;
                    border-bottom-left-radius: 5px;
                }
                .harem-girl-container:hover[data-is-favourite="false"] .favourite-toggle,
                .harem-girl-container[data-is-favourite="true"] .favourite-toggle,
                .girl-container:hover[data-is-favourite="false"] .favourite-toggle,
                .girl-container[data-is-favourite="true"] .favourite-toggle {
                    display: block;
                }
                .harem-girl-container[data-is-favourite="false"] .favourite-toggle,
                .girl-container[data-is-favourite="false"] .favourite-toggle {
                    background-image: url('${HHPlusPlus.Helpers.getCDNHost()}/design_v2/affstar_S.png');
                    opacity: 0.7;
                    filter: grayscale(1);
                }
                .harem-girl-container[data-is-favourite="true"] .favourite-toggle,
                .girl-container[data-is-favourite="true"] .favourite-toggle {
                    background-image: url('${HHPlusPlus.Helpers.getCDNHost()}/design_v2/affstar_S.png');
                }
                .girl-container.top7 img.girl-image {
                    border-color: #ffb244 !important;
                    box-shadow: 0px 0px 6px 3px #ffb244 !important;
                }
                .labyrinth-pool-select-panel .girl-container {
                    /* the top7 glow is slightly cut off at the top */
                    margin-top: 0.5rem;
                    margin-bottom: -0.5rem;
                }
            `;
            document.head.appendChild(sheet);
        }

        toggleFavorite(id) {
            const fav = this.isFavorite(id);
            if (fav) {
                this.removeFavorite(id);
            } else {
                this.addFavorite(id);
            }
            return !fav;
        }

        removeFavorite(id) {
            this.favoriteIds = this.favoriteIds.filter(e => e !== +id);
            this.updateFavorites();
        }

        addFavorite(id) {
            this.favoriteIds.push(+id);
            this.updateFavorites();
        }

        isFavorite(id) {
            return this.favoriteIds.includes(+id);
        }

        updateFavorites() {
            localStorage.setItem(LS.labFavorites, JSON.stringify(this.favoriteIds));
            log(this.favoriteIds);
        }

        prepareGirlElement(girl_element, idAttribute, top7 = null, girlList = null) {
            const id = girl_element.getAttribute(idAttribute);
            if (top7 && top7.includes(+id)) {
                girl_element.classList.add('top7');
            }
            girl_element.setAttribute('data-is-favourite', this.isFavorite(id));
            this.addToggleButton(girl_element, id, girlList);
        }

        addToggleButton(girl, id, girlList = null) {
            if (girl.querySelector('.favourite-toggle')) { return; }
            const toggle = this.toggle.clone()[0];
            toggle.onclick = () => {
                const isFav = this.toggleFavorite(id);
                girl.setAttribute('data-is-favourite', isFav);
                if (girlList) {
                    setPower(this, girl, id, girlList);
                }
                $(document).trigger('updateFavorites');
            };
            girl.append(toggle);
        }
    }

    /*
     * - removes blur and lock icon from locked poses in the previews for girls
     * - fixes img src for unlocked scenes
     */
    girlPreview();

    /*
     * - 'R' key shortcut to reload current page since an actual reload
     *     by the browser puts you back to town
     */
    pageReloadKey();

    /*
     * - disable fade transition when opening the navigation menu
     */
    mainMenu();

    if (window.location.pathname === '/home.html') {
        /*
         * - the automatic shop and news popup can fuck off forever
         *     the "busy" carrot may still show up for a moment when
         *     something would have popped up
         */
        home();
    }

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

    if (window.location.pathname === '/labyrinth-pool-select.html') {
        /*
         * - highlight top7 for lab generation and keep them at the top
         * - favorite girls are ensured to be selected by auto-assign
         */
        labyrinthPoolSelect();
    }

    if (window.location.pathname === '/labyrinth.html') {
        /*
         * - squad tab
         *   - highlight top7 for lab generation and keep them at the top
         *   - mark favorite girls
         * - shop timer improvement
         *     tries to show when the next restock happens. it will be a little
         *     inaccurate if last restock was triggered on a different device,
         *     but it will show when the next restock happens at the latest
         */
        labyrinth();
    }

    if (window.location.pathname === '/edit-labyrinth-team.html') {
        /*
         * - favorite girls
         *     sort them to the top preserving the order they were marked as
         *     favorite, this allows autofill to quickly pick your favorite team
         */
        editLabyrinthTeam();
    }

    function girlPreview() {
        let sheet = document.createElement("style");
        sheet.textContent = [
            '.pose-preview_wrapper.locked .pose-preview { filter: blur(0) !important; }',
            '.pose-preview_wrapper.locked .preview-locked_icn { display: none !important; }',
        ].join(' ');
        document.head.appendChild(sheet);

        repeatOnChange('#common-popups', () => {
            $('#scenes-tab_container .scene-preview_wrapper.unlocked img').each((i, img) => {
                img.src = HHPlusPlus.Helpers.getHref(img.src);
            });
        });
    }

    function pageReloadKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && document.activeElement.tagName.toLowerCase() !== 'input') {
                window.location.reload();
            }
        });
    }

    function mainMenu() {
        HHPlusPlus.Helpers.doWhenSelectorAvailable('#contains_all > nav > [rel="content"] > div', () => {
            $('#contains_all > nav > [rel="content"] > div')[0].style.transition = 'none';
        });
    }

    function home() {
        preventAutoPopup(['.info-container .chest-container', '.currency plus'], '#shop-payment-tabs', '#common-popups close');
        preventAutoPopup(['#news_button'], '#news_details_popup', '#common-popups close');

        function preventAutoPopup(manualButtons, check, close) {
            let manualClick = false;
            for (const button of manualButtons) {
                $(button).on('click', () => {
                    manualClick = true;
                });
            }
            HHPlusPlus.Helpers.doWhenSelectorAvailable(check, ()=>{
                if (!manualClick) {
                    $(close).trigger('click');
                }
            });
        }
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
            // remove Kinkoid's grayscale so the expanded cards are colored again
            raidCard.classList.remove('grey-overlay');

            // add tooltip with date to start and end times
            let raidDate = (new Date(((love_raids[i].status === 'upcoming' ? love_raids[i].seconds_until_event_start : love_raids[i].seconds_until_event_end) + server_now_ts) * 1000));
            $(raidCard).find('.raid-timer .raid-timer p').attr('tooltip', `${raidDate.toLocaleString(document.documentElement.lang.replace('_','-'), {'weekday':'long','hour':'numeric'})}`)

            if (!girls[i]) {
                log('HH++ is missing info, scroll through whole harem to update!');
                return;
            }
            const {name, shards, grade_offsets} = girls[i];
            const haremLink = HHPlusPlus.Helpers.getHref(`/characters/${love_raids[i].id_girl}`);
            const wikiLink = HHPlusPlus.Helpers.getWikiLink(name, love_raids[i].id_girl, HHPlusPlus.I18n.getLang());
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
            });

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
        });

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
        });
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
            const text = girls_data_list.reduce((csv, girl) => {
                    csv += `\n${girl.id_girl},${girl.grade_skins.length}`;
                    return csv;
                }, 'id,skins');
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

    function labyrinthPoolSelect() {
        HHPlusPlus.Helpers.doWhenSelectorAvailable('.labyrinth-pool-select-container .girl-grid', async () => {
            const favorites = new FavoriteLabGirls();

            $('.girl-grid .girl-container').each((i, girl) => {
                setPower(favorites, girl, girl.getAttribute('id_girl'), owned_girls);
            });

            const top7 = getTop7(owned_girls);

            await repeatOnChange('.labyrinth-pool-select-container .girl-grid', async () => {
                $('.girl-grid .girl-container').each((i, girl) => {
                    favorites.prepareGirlElement(girl, 'id_girl', top7, owned_girls);
                });

                moveTop7Up(top7, '.girl-grid .girl-container', 'id_girl');
            }, true);
        });
    }

    function labyrinth() {
        // favorites
        HHPlusPlus.Helpers.doWhenSelectorAvailable('#squad_tab_container .squad-container .girl-grid', async () => {
            const favorites = new FavoriteLabGirls();

            const top7 = getTop7(girl_squad.map(girl => girl.member_girl));

            await repeatOnChange('#squad_tab_container .squad-container', async () => {
                $('.girl-grid .girl-container').each((i,girl) => {
                    favorites.prepareGirlElement(girl, 'id', top7);
                });

                moveTop7Up(top7, '.girl-grid .girl-container', 'id');
            }, true);
        });

        // shop timer
        HHPlusPlus.Helpers.doWhenSelectorAvailable('#shop_tab_container .item-container .slot', async () => {
            const currentShopCycleEnd = updateCycleEnd();

            await repeatOnChange('#shop_tab_container', setShopTimer, true);

            setInterval(function() {
                const timer = $('#shop_tab_container .shop-timer p span')[0];
                if (timer) {
                    // just to trigger setShopTimer through the observer
                    timer.innerText = '';
                }
            }, 1000);

            function setShopTimer() {
                const timer = $('#shop_tab_container .shop-timer p')[0];
                if (!timer) { return; }
                const seconds = currentShopCycleEnd - serverNow();
                if (seconds > 0) {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    const timeString = (h > 0 ? `${h}h ` : '') + (h > 0 || m > 0 ? `${m}m ` : '') + `${s}s`;
                    timer.innerHTML = `${GT.design.market_new_stock}<span rel="expires">${timeString}</span>`;
                } else {
                    // since the timer is the latest time that restocking happens it must have
                    // happened now so force a reload to prevent buying unknown items from the new stock
                    timer.innerHTML = 'Refresh!';
                    $('.shop-section .slot').css('filter', 'grayscale(1)');
                    $('.blue_button_L.buy-item').attr('disabled', '');
                    setTimeout(() => { window.location.reload(); }, 2500);
                }
            }

            function updateCycleEnd(force = false) {
                const oldCycleEnd = +localStorage.getItem(LS.labShopCycleEnd);
                const twelveHours = 12 * 60 * 60;

                const newShopCycleEnd = force || detectRestock() || (oldCycleEnd < server_now_ts)
                    ? Math.min(server_now_ts + cycle_end_in_seconds,  // shop will restock next reset
                        serverNow() + twelveHours)  // shop will restock in 12h
                    : oldCycleEnd;  // shop restock hasn't happened yet
                localStorage.setItem(LS.labShopCycleEnd, newShopCycleEnd.toString());
                return newShopCycleEnd;
            }
        });

        function detectRestock() {
            const oldStock = JSON.parse(localStorage.getItem(LS.labShopStock)) || [];
            const currentStock = updateStock();
            if (!currentStock) { return false; }
            return currentStock.reduce((acc, curr, i) => {
                if (i >= oldStock.length || curr === 'sold') {
                    // current slot was added by monthly card or current
                    // slot has been bought out
                    return acc;
                }
                return acc || curr !== oldStock[i];
            }, false);
        }

        function updateStock() {
            const currentStock = Array.from($('#shop_tab_container .item-container .slot')).map(parseShopItem);
            if (currentStock.length === 0) {
                log(`couldn't read inventory`);
                return null;
            }
            localStorage.setItem(LS.labShopStock, JSON.stringify(currentStock));
            return currentStock;
        }

        function parseShopItem(item) {
            if (item.classList.contains('slot_empty')) {
                return 'sold';
            }
            if (item.classList.contains('slot_girl_shards')) {
                const shards = item.querySelector('.shards');
                const amount = shards.querySelector('p span').innerText;
                return `${shards.getAttribute('name')} ${amount}`;
            }
            if (item.classList.contains('slot_gems')) {
                return item.querySelector('span').className;
            }
            if (item.classList.contains('slot_hard_currency')) {
                return 'KB';
            }
            if (item.classList.contains('slot_rejuvenation_stone')) {
                return 'ST';
            }
            if (item.classList.contains('slot_energy_fight')) {
                return 'CP';
            }
            if (item.classList.contains('random_equipment')) {
                return 'HE';
            }
            if (item.classList.contains('slot_girl_armor')) {
                return 'GE';
            }
            if (item.classList.contains('slot_mc')) {
                return item.querySelector('.mc-reward div').innerText;
            }
            if (item.classList.contains('slot_scrolls_mythic')) {
                return 'SM';
            }
            if (item.classList.contains('slot_scrolls_legendary')) {
                return 'SL';
            }
            if (item.classList.contains('slot_scrolls_epic')) {
                return 'SE';
            }
            if (item.classList.contains('slot_scrolls_rare')) {
                return 'SR';
            }
            if (item.classList.contains('slot_scrolls_common')) {
                return 'SC';
            }
            if (item.classList.contains('slot_orbs')) {
                return item.querySelector('span').classList[1];
            }
            if (item.classList.contains('mythic')) {
                const itemId = item.getAttribute('id_item');
                if (itemId) return `${itemId}`;
            }
            log('lab shop item not parsed', item, item.className);
            return item.className;
        }
    }

    function editLabyrinthTeam() {
        HHPlusPlus.Helpers.doWhenSelectorAvailable('.harem-panel-girls', async () => {
            const favorites = new FavoriteLabGirls();
            $('.harem-panel-girls .harem-girl-container').each((i,girl) => {
                favorites.prepareGirlElement(girl, 'id_girl');
            });

            $(document).on('updateFavorites', () => {
                const nonFav = $(`.harem-panel-girls .harem-girl-container[data-is-favourite="false"]:not(.top7)`)[0];
                if (nonFav) {
                    for (const id of favorites.favoriteIds) {
                        const fav = $(`.harem-panel-girls .harem-girl-container[id_girl=${id}]:not(.top7)`)[0];
                        if (!fav) {
                            continue;
                        }
                        fav.remove();
                        nonFav.before(fav);
                    }
                }
            });

            await repeatOnChange('.harem-panel-girls', async () => {
                $(document).trigger('updateFavorites');
            }, true);
        });
    }

    function log(...args) {
        console.log('HH suckless:', ...args);
    }

    function serverNow() {
        const serverOffset = server_now_ts - local_now_ts;
        return Math.floor(Date.now()/1000) + serverOffset;
    }

    function copyText(text) {
        // navigator.clipboard.writeText doesn't work inside an iframe due to missing permissions
        const textArea = $(`<textarea>${text}</textarea>`)[0];
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
    }

    function getTop7(girlList) {
        return girlList.map((girl) => { return {girl, power: powerCalc(girl.battle_caracs)}})
            .sort((a, b) => b.power - a.power)
            .slice(0,7)
            .map(e => e.girl.id_girl);
    }

    function moveTop7Up(top7, containerSelector, idAttribute) {
        const nonTop7 = $(`${containerSelector}:not(.top7)`)[0];
        if (nonTop7) {
            for (const id of top7) {
                const t7 = $(`${containerSelector}[${idAttribute}=${id}]`)[0];
                t7.remove();
                nonTop7.before(t7);
            }
        }
    }

    function powerCalc(battle_caracs) {
        // in case zoo's normalization is enabled the real power needs to be calculated again
        const {damage, defense, ego, mana_starting, speed} = battle_caracs;
        return Math.ceil(ego + 7.5 * (damage + defense) + 0.625 * speed + 0.1 * mana_starting);
    }

    function setPower(favorites, girlElement, id, girlList) {
        girlList.find(e => e.id_girl === +id).power_display = favorites.isFavorite(id)
            ? 1e7 // just a high number to ensure the favorites are picked by auto-assign
            : +girlElement.querySelector('.girl-power-number').getAttribute('value');
    }

    async function runOnChange(selectors, func) {
        const observer = new MutationObserver(async () => {
            observer.disconnect();
            await func();
        });
        observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
    }

    async function repeatOnChange(selectors, func, runImmediately = false) {
        const observer = new MutationObserver(async () => {
            observer.disconnect();
            await func();
            observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
        });
        if (runImmediately) {
            await func();
        }
        observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
    }
})();
