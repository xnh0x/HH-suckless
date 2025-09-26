// ==UserScript==
// @name         HH suckless
// @version      0.31.3
// @description  HH that sucks less. Requires HH++ BDSM and Rena's Battle Sim.
// @author       xnh0x
// @match        https://*.hentaiheroes.com/*
// @match        https://nutaku.haremheroes.com/*
// @match        https://*.comixharem.com/*
// @match        https://*.gayharem.com/*
// @match        https://*.pornstarharem.com/*
// @match        https://*.gaypornstarharem.com/*
// @match        https://*.transpornstarharem.com/*
// @run-at       document-idle
// @namespace    https://github.com/xnh0x/HH-suckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hentaiheroes.com
// @grant        GM_info
// @grant        unsafeWindow
// ==/UserScript==

/*global GM_info, unsafeWindow*/

console.log(`HH suckless: version: ${GM_info.script.version}`);
const local_now_ts = Math.floor(Date.now() / 1000);

(async function suckless() {
    'use strict';

    if (!unsafeWindow['hhPlusPlusConfig']) {
        log(`waiting for HHPlusPlus`);
        $(document).one('hh++-bdsm:loaded', () => {
            log('HHPlusPlus ready, restart script');
            suckless();
        });
        return;
    }

    const {
        GT: {
            design: {
                ends_in: GT_design_ends_in,
                event_ranking: GT_design_event_ranking,
                girl_town_event_owned_v2: GT_design_girl_town_event_owned_v2,
                love_raid: GT_design_love_raid,
                market_new_stock: GT_design_market_new_stock,
                raids_ongoing: GT_design_raids_ongoing,
                upcoming_love_raids: GT_design_upcoming_love_raids,
            }
        },
        HHBattleSimulator: {
            simulateFromTeamsEx,
        },
        HHPlusPlus: {
            Helpers: {
                doWhenSelectorAvailable,
                getCDNHost,
                getGameKey,
                getGirlDictionary,
                getHref,
                getWikiLink,
            },
            I18n: {
                getLang,
            },
        },
        hhPlusPlusConfig,
        server_now_ts,
        shared: {
            HHMenu
        }
    } = unsafeWindow;

    const LS = {
        labFavorites: 'HHsucklessLabFavorites',
        labShopCycleEnd: 'HHsucklessLabShopCycleEnd',
        labShopStock: 'HHsucklessLabShopStock',
        loveRaids: 'HHsucklessLoveRaids',
        loveRaidsNotifications: 'HHsucklessLoveRaidsNotifications',
        pog: 'HHsucklessPoG',
        popData: 'HHsucklessPopData',
        pov: 'HHsucklessPoV',
        seasonal: 'HHsucklessSeasonal',
        seasonChanceThreshold: 'HHsucklessSeasonChanceThreshold',
    }

    const CALENDAR_URL = {
        HH: 'https://raw.githubusercontent.com/xnh0x/HH-suckless/refs/heads/master/calendar/HH.png',
    };

    const CONFIG = loadConfig();

    debug('config:', CONFIG);

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
                    background-image: url('${getCDNHost()}/design_v2/affstar_S.png');
                    opacity: 0.7;
                    filter: grayscale(1);
                }
                .harem-girl-container[data-is-favourite="true"] .favourite-toggle,
                .girl-container[data-is-favourite="true"] .favourite-toggle {
                    background-image: url('${getCDNHost()}/design_v2/affstar_S.png');
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
    if (CONFIG.girlPreview.enabled) {
        girlPreview();
    }

    /*
     * - 'R' key shortcut to reload current page since an actual reload
     *     by the browser puts you back to town
     */
    if (CONFIG.reload.enabled) {
        pageReloadKey();
    }

    /*
     * - replace HH++ PoP bar
     */
    if (CONFIG.activities.popBar) {
        doWhenSelectorAvailable('a.script-pop-timer', popTimerBar);
    }

    /*
     * - disable fade transition when opening the navigation menu
     */
    mainMenu();

    /*
     * add the monthly calendar to the menu
     */
    if (getGameKey() in CALENDAR_URL) {
        doWhenSelectorAvailable(`nav div[rel='content'] > div`, calendar);
    }

    if (window.location.pathname === '/home.html') {
        /*
         * - the automatic shop and news popup can fuck off forever
         *     the "busy" carrot may still show up for a moment when
         *     something would have popped up
         * - add PoV/PoG timers
         * - add ranking timer and reward chest for LR/HA
         * - reduce love raid counters to exclude completed raids
         */
        home();
    }

    if (window.location.pathname === '/shop.html') {
        /*
         * - indicators for hero equipment resonance
         */
        if (CONFIG.shop.enabled) {
            shop();
        }
    }

    if (window.location.pathname === '/champions-map.html') {
        /*
         * - hide raid cards to prevent accidental navigation
         */
        if (CONFIG.champ.enabled) {
            championsMap();
        }
    }

    if (window.location.pathname === '/club-champion.html') {
        /*
         * - fade out non know-how girls for farming
         */
        if (CONFIG.champ.enabled) {
            clubChampion();
        }
    }

    if (window.location.pathname === '/activities.html') {
        /*
         * - Places of Power 'space' key:
         *     - collect reward
         *     - assign
         *     - start
         *     - go to next pop
         */
        if (CONFIG.activities.enabled) {
            activities();
        }
    }

    if (window.location.pathname === '/troll-pre-battle.html') {
        /*
         * - 'space' key starts single fight
         */
        if (CONFIG.villain.enabled) {
            trollPreBattle();
        }
    }

    if (window.location.pathname === '/troll-battle.html') {
        /*
         * - 'space' key skips fight and reward popup
         */
        if (CONFIG.villain.enabled) {
            trollBattle();
        }
    }

    if (window.location.pathname === '/pantheon.html') {
        /*
         * - 'space' key enters floor
         */
        if (CONFIG.pantheon.enabled) {
            pantheon();
        }
    }

    if (window.location.pathname === '/pantheon-pre-battle.html') {
        /*
         * - 'space' key starts single fight
         */
        if (CONFIG.pantheon.enabled) {
            pantheonPreBattle();
        }
    }

    if (window.location.pathname === '/pantheon-battle.html') {
        /*
         * - 'space' key skips fight and reward popup
         */
        if (CONFIG.villain.enabled) {
            pantheonBattle();
        }
    }

    if (window.location.pathname === '/season.html') {
        /*
         * - hide raid card if completed
         */
        if (CONFIG.season.enabled) {
            season();
        }
    }

    if (window.location.pathname === '/season-arena.html') {
        /*
         * - swap the best opponent to the left
         *     decided by highest chance then highest mojo
         * - 'space' key starts fight against the best opponent
         * - '1', '2', '3' keys start battles against the three opponents
         */
        if (CONFIG.season.enabled) {
            seasonArena();
        }
    }

    if (window.location.pathname === '/season-battle.html') {
        /*
         * - 'space' key skips fight and reward popup
         */
        if (CONFIG.season.enabled) {
            seasonBattle();
        }
    }

    if (window.location.pathname === '/love-raids.html') {
        /*
         * - reveals all mysterious girls
         *     names, shards, images
         * - adds wiki links to the orange names
         * - makes go buttons link to harem if you already own the girl
         * - add notification toggles to show a reminder on the homepage
         *     if a specific raid is active
         */
        if (CONFIG.raid.enabled) {
            await loveRaids();
        }
    }

    if (window.location.pathname === '/seasonal.html') {
        /*
         * - add confirmation to open ranking tabs if there are rewards to claim
         * - hide HA scam bonus path and reminder popup
         * - hide SEM scam bonus path and reminder popup
         */
        seasonal();
    }

    if (window.location.pathname.includes('/quest/')) {
        /*
         * - add disabled navigation buttons (back on first scene, next on last
         *     scene) for consistency
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

    if (window.location.pathname === '/path-of-valor.html') {
        /*
         * - remove claim all
         */
        if (CONFIG.pov.enabled) {
            PoV();
        }
        // save end time stamp for home page timer
        const { time_remaining } = unsafeWindow;
        localStorage.setItem(LS.pov, `${server_now_ts + (+time_remaining)}`);
    }

    if (window.location.pathname === '/path-of-glory.html') {
        /*
         * - remove claim all
         */
        if (CONFIG.pog.enabled) {
            PoV();
        }
        // save end time stamp for home page timer
        const { time_remaining } = unsafeWindow;
        localStorage.setItem(LS.pog, `${server_now_ts + (+time_remaining)}`);
    }

    if (window.location.pathname === '/labyrinth-pool-select.html') {
        /*
         * - highlight top7 for lab generation and keep them at the top
         * - favorite girls are ensured to be selected by auto-assign
         */
        if (CONFIG.lab.enabled) {
            labyrinthPoolSelect();
        }
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
        if (CONFIG.lab.enabled) {
            labyrinth();
        }
    }

    if (window.location.pathname === '/edit-labyrinth-team.html'
        || window.location.pathname === '/edit-world-boss-team.html') {
        /*
         * - favorite girls
         *     sort them to the top preserving the order they were marked as
         *     favorite, this allows autofill to quickly pick your favorite team
         */
        if (CONFIG.lab.enabled) {
            editLabyrinthTeam();
        }
    }

    if (window.location.pathname === '/edit-team.html') {
        /*
         * - fill team from list
         * - copy current team list
         */
        if (CONFIG.editTeam.enabled) {
            await editTeam();
        }
    }

    if (window.location.pathname === '/event.html') {
        /*
         * - Sultry Mysteries
         *     red/green generate button to indicate optimal grid refresh
         */
        if (window.location.search.includes('tab=sm_event_')) {
            sultryMysteries();
        }

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
                img.src = getHref(img['src']);
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

    function popTimerBar() {
        if (window.location.pathname === '/activities.html' && window.location.search.includes('&index')) {
            const { current_pop_data } = unsafeWindow;
            const $claimButton = $('.pop_central_part button[rel="pop_claim"]');
            $claimButton.on('click', () => {
                let data = JSON.parse(localStorage.getItem(LS.popData));
                data.times = data.times.filter((e) => e.id_places_of_power !== current_pop_data.id_places_of_power);
                data.active = data.times.length;
                data.inactive = data.unlocked - data.active;
                current_pop_data.remaining_time = 0;
                localStorage.setItem(LS.popData, JSON.stringify(data));
            });
        }
        addPopCSS();

        const popBarUpdater = setInterval(updatePopBar, 1000);
        doWhenSelectorAvailable('#canvas_worship_energy', replacePopBar);

        function replacePopBar() {
            const $popBar = $(`
                <div class="energy_counter" type="pop" id="canvas_pop">
                    <div class="energy_counter_bar">
                        <div class="energy_counter_icon">
                            <span class="hudPop_mix_icn"></span>
                        </div>
                        <a href="${getHref('/activities.html?tab=pop')}">
                            <div class="bar-wrapper">
                                <div class="bar red"></div>
                                <div class="over">
                                    <div class="energy_counter_amount">
                                        <span finished=""></span>/<span rel="max"></span>
                                    </div>
                                    <span rel="increment_txt">+<span rel="increment"></span> in <span rel="time"></span></span>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>`);
            $('a.script-pop-timer').remove();
            $('#canvas_worship_energy').after($popBar);
            updatePopBar(true);
        }

        function updatePopBar(firstRun = false) {
            const popData = updatePopData(firstRun);
            const $popBar = $('#canvas_pop');
            if ($.isEmptyObject(popData)) {
                $popBar.find('.energy_counter_amount').text('open PoP page');
                $popBar.find('.over span[rel="increment_txt"]').css('display', 'none');
                return;
            }

            const now = serverNow();
            const running = popData.times.filter(t => t.end_ts > now);
            const finished = popData.active - running.length;
            let next = null;
            let last = running.slice(-1)[0];
            if (running.length) {
                next = {};
                next.totalDuration = running[0].time_to_finish;
                next.remaining = running[0].end_ts - now;
                next.elapsed = next.totalDuration - next.remaining;
                next.increment = running.filter((e) => e.end_ts === running[0].end_ts).length;
            }

            $popBar.find('.energy_counter_amount span[finished]').text(`${finished}`);
            $popBar.find('.energy_counter_amount span[rel="max"]').text(`${popData.active}`);
            $popBar.find('.energy_counter_amount span[rel="max"]').css('color', popData.inactive ? '#ec0039' : 'unset');
            if (next) {
                $popBar.find('.bar.red').css('width', `${next.elapsed / next.totalDuration * 100}%`);
                $popBar.find('.over span[rel="increment_txt"]').css('display', 'unset');
                $popBar.find('.over span[rel="increment"]').text(`${next.increment}`);
                $popBar.find('.over span[rel="time"]').text(`${formatTime(next.remaining)}`);
                $popBar.find('.hudPop_mix_icn').attr('tooltip',
                    `Ready in <span class="orange" rel="timer">${formatTime(last.end_ts - now)}</span>`
                    + `<br>Ready at <span class="orange">${(new Date(last.end_ts * 1000)).toLocaleString(getLang(), {'hour':'numeric', 'minute':'numeric'})}</span>`);
            } else {
                $popBar.find('.bar.red').css('width', '100%');
                $popBar.find('.over span[rel="increment_txt"]').css('display', 'none');
                $popBar.find('.hudPop_mix_icn').attr('tooltip', '<span class="orange">Ready</span>');
                if (!(window.location.pathname === '/activities.html' && window.location.search.includes('&index'))) {
                    // pop data can't change on the current page so there is no need to keep updating
                    clearInterval(popBarUpdater);
                }
            }
        }

        function updatePopData(firstRun = false) {
            let data = JSON.parse(localStorage.getItem(LS.popData)) || {};
            if (firstRun && window.location.pathname === '/activities.html') {
                const { pop_data } = unsafeWindow;
                const popArr = Object.values(pop_data);
                const times = popArr.reduce((acc, curr) => {
                    if (curr.time_to_finish) {
                        const {id_places_of_power, remaining_time, time_to_finish} = curr;
                        const end_ts = server_now_ts + remaining_time;
                        acc.push({id_places_of_power, end_ts, time_to_finish})
                    }
                    return acc;
                }, []);
                data = {
                    unlocked: popArr.length,
                    active: times.length,
                    inactive: popArr.length - times.length,
                    times: times.sort((a, b) => a.end_ts - b.end_ts),
                    updated: false,
                };
                localStorage.setItem(LS.popData, JSON.stringify(data));
            }

            if (window.location.pathname === '/activities.html' && window.location.search.includes('&index')) {
                const { current_pop_data } = unsafeWindow;
                const $progressBar = $('#pop_info .pop_central_part .hh_bar');
                if (data.updated || $progressBar.css('display') === 'none') {
                    return data;
                }
                if (current_pop_data.remaining_time === 0) {
                    // when manually starting, neither current_pop_data nor pop_data is updated until you
                    // reload the activity page, so the end and duration is calculated here. otherwise
                    // the script wouldn't have any data on the last PoP if you just leave the activity page
                    const {id_places_of_power, level_power, max_team_power} = current_pop_data;
                    const $powerBar = $('#pop_info .pop_right_part .hh_bar');
                    const frontWidth = parseFloat($powerBar.find('.frontbar').css('width'));
                    const backWidth = parseFloat($powerBar.find('.backbar').css('width'))
                        - 2 * parseFloat($powerBar.find('.backbar').css('border-width'));
                    const teamPowerPercent = frontWidth / backWidth;
                    const teamPower = max_team_power * teamPowerPercent;
                    const time_to_finish = Math.ceil(level_power / teamPower * 60);
                    const end_ts = serverNow() + time_to_finish;

                    let times = data.times;
                    const i = times.findIndex((e) => e.id_places_of_power === id_places_of_power);
                    if (i >= 0) {
                        times[i] = {id_places_of_power, end_ts, time_to_finish};
                    } else {
                        times.push({id_places_of_power, end_ts, time_to_finish});
                    }
                    data.active = times.length;
                    data.inactive = data.unlocked - data.active;
                    data.times = times.sort((a, b) => a.end_ts - b.end_ts);
                    data.updated = true;
                }
                localStorage.setItem(LS.popData, JSON.stringify(data));
            }
            return data;
        }

        function addPopCSS() {
            // pretty much 1 to 1 copied from the other bar's styles
            let sheet = document.createElement("style");
            sheet.textContent = `
                body>div#contains_all>header>div.energy_counter .energy_counter_icon span.hudPop_mix_icn {
                    height: 24px;
                    width: 24px;
                    background-size: contain;
                    background-position: center;
                    background-repeat: no-repeat;
                    background-image: url(https://hh.hh-content.com/pictures/gallery/18/200x/379e7b87f856f75d6016f0242415d028.webp);
                    filter: drop-shadow(0px 2px 0px #000000bf);
                    left: -124px;
                    top: 21px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper {
                    width: 114px;
                    height: 16px;
                    margin-left: -114px;
                    margin-top: 24px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .bar:after {
                    left: 3px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over .energy_counter_amount {
                    font-size: 8px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over span[finished] {
                    font-size: 12px;
                    line-height: 16px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over span {
                    font-size: 8px;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=increment_txt] {
                    font-size: 8px;
                    color: #8ec3ff;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=increment],
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=time] {
                    line-height: 12px;
                    color: #8ec3ff;
                }
                body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=time] {
                    font-size: 9px;
                }
                @media (min-width: 1026px) {
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over {
                        justify-content: space-between;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over .energy_counter_amount {
                        margin-left: 14px;
                    }
                }
                @media (max-width: 1025px) {
                    body>div#contains_all>header div.energy_counter .energy_counter_icon span.hudPop_mix_icn {
                        left: -121px;
                        top: 37px;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper {
                        height: 26px;
                        margin-top: 36px;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .bar:after {
                        left: -2px;
                        width: calc(100% + 9px);
                    }
                    body>div#contains_all>header div.energy_counter[type=pop] .bar-wrapper .over {
                        flex-direction: row;
                        justify-content: space-between;
                        margin-left: 14px;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over span[finished] {
                        font-size: 16px;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=increment_txt],
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=increment] {
                        line-height: 9px;
                        letter-spacing: 0.1px;
                    }
                    body>div#contains_all>header>div.energy_counter[type=pop] .bar-wrapper .over [rel=time] {
                        letter-spacing: 0.1px;
                        font-size: 10px;
                        line-height: 9px;
                    }
                }
            `;
            document.head.appendChild(sheet);
        }
    }

    function mainMenu() {
        doWhenSelectorAvailable('#contains_all > nav > [rel="content"] > div', () => {
            $('#contains_all > nav > [rel="content"] > div')[0].style.transition = 'none';
        });
    }

    function calendar() {
        addCalendarCSS();

        const calendarURL = CALENDAR_URL[getGameKey()];
        const $commonPopups = $('#common-popups');
        const $menu = $(`nav div[rel='content'] > div`);

        const $calendarMenuItem = $(`
            <a><div><ic class="calendar"></ic><span>Calendar</span></div></a>
        `);
        $menu.prepend($calendarMenuItem);

        const $calendarPopup = $(`
            <div class="popup_wrapper">
                <div class="popup_background clickable"></div>
                <div id="popup_calendar" class="popup">
                    <div class="calendar_container container-special-bg">
                        <img src="${calendarURL}" alt="calendar">
                    </div>
                    <close class="closable"></close>
                </div>
            </div>
        `);

        $calendarMenuItem.on('click', () => {
            HHMenu.hideMenu();
            $commonPopups.css('display', 'block');
            $commonPopups.append($calendarPopup);

            $calendarPopup.find('close').on('click', () => {
                $commonPopups.css('display', 'none');
                $calendarPopup.remove();
            });
        });

        function addCalendarCSS() {
            let sheet = document.createElement("style");
            sheet.textContent = `
                #contains_all > nav ic.calendar {
                    background-image: url(https://raw.githubusercontent.com/xnh0x/HH-suckless/refs/heads/master/icon/calendar_month.svg);
                }
                #contains_all > nav a {
                    cursor: pointer;
                }
                .popup_wrapper #popup_calendar {
                    width: 1020px;
                    height: 550px;
                    top: 0.62rem;
                    left: 0.62rem;
                }
                .popup_wrapper #popup_calendar close {
                    width: 2.4rem;
                    height: 2.2rem;
                    background-image: url(/images/clubs/ic_xCross.png);
                    opacity: 1;
                }
                .popup_wrapper #popup_calendar .calendar_container {
                    width: 100%;
                    height: 100%;
                    box-shadow: none;
                    border: 2px solid #ff9900;
                    align-content: center;
                }
                .calendar_container img {
                    height: 90%;
                }
            `;
            document.head.appendChild(sheet);
        }
    }

    function home() {
        if (CONFIG.raid.enabled) {
            setNonCompletedRaidCounts();
            setRaidNotification();
        }

        if (CONFIG.news.enabled) {
            preventAutoPopup(['.info-container .chest-container', '.currency plus', '#mc-selector'], '#shop-payment-tabs', '#common-popups close');
            preventAutoPopup(['#news_button'], '#news_details_popup', '#common-popups close');
        }

        addPovTimer(LS.pov, 'path-of-valor', 'pov_timer', 14 * 24 * 60 * 60);
        addPovTimer(LS.pog, 'path-of-glory', 'pog_timer', 35 * 24 * 60 * 60);

        if (CONFIG.noWBT.enabled) {
            $(`div.world-boss`).remove();
        }

        if (CONFIG.seasonal.enabled && CONFIG.seasonal.home) {
            addSeasonalInfo();
        }

        function setNonCompletedRaidCounts() {
            const raids = JSON.parse(localStorage.getItem(LS.loveRaids));
            const { ongoing_love_raids_count, upcoming_love_raids_count } = unsafeWindow;
            if (!raids) return;
            let expired = 0, ongoing = 0, upcoming = 0;
            raids.forEach((raid) => {
                if (raid.end < server_now_ts) {
                    expired += 1;
                } else if (raid.all_is_owned) {
                    // don't care
                } else if (raid.start < server_now_ts) {
                    ongoing += 1;
                } else {
                    upcoming += 1;
                }
            });
            const outdated = raids.length - expired < ongoing_love_raids_count + upcoming_love_raids_count;
            const $raidAmounts = $(`.raids .raids-amount`);
            $raidAmounts.first().html(
                `<span ${outdated ? 'style="color:pink"' : ''}>${ongoing}</span> ${GT_design_raids_ongoing}`);
            $raidAmounts.last().html(
                `<span ${outdated ? 'style="color:pink"' : ''}>${upcoming}</span> ${GT_design_upcoming_love_raids}`);
        }

        function setRaidNotification() {
            const raids = JSON.parse(localStorage.getItem(LS.loveRaids));
            const raidNotifs = JSON.parse(localStorage.getItem(LS.loveRaidsNotifications));
            if (!raids || !raidNotifs) return;
            const showNotif = raids.reduce((result, raid) => {
                const ongoing = raid.start < server_now_ts && raid.end > server_now_ts;
                if (ongoing && raidNotifs.includes(raid.id_raid) && !raid.all_is_owned) {
                    if (raid.end > server_now_ts) {
                        return true;
                    }
                }
                return result;
            }, false);

            if (showNotif) {
                $(`.raids`).append(`
                    <img class="new_notif" src="${getCDNHost()}/ic_new.png" style="position: relative;" alt="!">
                `);
            }
        }

        function addPovTimer(storageKey, rel, id, increment) {
            let end_ts = +localStorage.getItem(storageKey);
            if (end_ts) {
                while (serverNow() > end_ts) {
                    // if a device hasn't been used in a while it might be more than one path out of date
                    end_ts += increment;
                }
                localStorage.setItem(storageKey, `${end_ts}`);
                // position: absolute; left: 6px; bottom: 14px;
                const $potionText = $(`a[rel="${rel}"] .pov-widget .white_text`);
                const $potionsBar = $(`a[rel="${rel}"] .pov-widget .pov-tier-bar`);
                const $timer = $(`
                    <span style="color: #8EC3FF;">${capitalize(GT_design_ends_in)} <span id="${id}" ></span>
                    </span>
                `);
                if (!$(`.potions-paths-buttons`).length) {
                    $timer.appendTo($potionText).css({ position: 'absolute', left: '6px' })
                } else {
                    // HH++ legacy layout
                    $potionText.after($timer).detach().appendTo($potionsBar)
                        .css({ position: 'absolute', right: '0px', bottom: '-5px', 'text-shadow': '1px 1px 0 #000' });
                }

                const handler = () => {
                    $(`#${id}`).text(`${formatTime(end_ts - serverNow())}`);
                };
                handler();
                return setTimeout(handler, 1000);
            }
        }

        function addSeasonalInfo() {
            let seasonalData = JSON.parse(localStorage.getItem(LS.seasonal) ?? '{}');
            if (seasonalData.type === undefined
                || !seasonalData.seasonalEnd
                || serverNow() > seasonalData.seasonalEnd) {
                return;
            }

            if (seasonalData.type === 1) {
                // seasonal event
                // there is nothing relevant to show on the homepage
            } else if (seasonalData.type === 2) {
                // lusty race;
                addRankingTimer();
            } else if (seasonalData.type === 3) {
                // hot assembly
                addRankingTimer();
            }

            function addRankingTimer() {
                if (!seasonalData.rankingEnd) {
                    return;
                }

                if (serverNow() > seasonalData.rankingEnd) {
                    // the next ranking will end three days after the last one
                    seasonalData.rankingEnd += 3 * 24 * 60 * 60;
                    seasonalData.rankingRewards = true;
                    localStorage.setItem(LS.seasonal, JSON.stringify(seasonalData));
                }

                const $megaEvent = $(`div.over[rel="mega-event"]`);

                if (seasonalData.rankingRewards) {
                    $megaEvent.append(`
                        <span class="button-notification-icon button-notification-reward" 
                            style="top: unset; right: unset; bottom: 0; left: 0;"></span>
                    `);
                }

                if (seasonalData.rankingEnd >= seasonalData.seasonalEnd) {
                    // there is no ranking in the last days of the event
                    return;
                }

                $megaEvent.append(`
                    <div class="mega-event-timer timer">
                        <p>${GT_design_event_ranking} ${GT_design_ends_in}
                            <span id="ranking_timer" rel="expires"></span>
                        </p>
                    </div>
                `);

                const handler = () => {
                    $('#ranking_timer').text(`${formatTime(seasonalData.rankingEnd - serverNow())}`);
                };
                handler();
                setInterval(handler, 1000);
            }
        }
    }

    function shop() {
        addResonanceIndicators()

        function addResonanceIndicators() {
            const wrongClass = 'url("/images/caracs/no_class.png")';
            const resonance1 = {
                damage: 'url("/images/caracs/damage.png")',
                ego: 'url("/images/caracs/ego.png")',
            }
            const resonance2 = {
                defense: 'url("/images/caracs/deff_undefined.png")',
                chance: 'url("/images/pictures/misc/items_icons/5.png")',
            }
            const colors = {
                darkness: '#434343',
                fire: '#a61c00',
                nature: '#38761d',
                stone: '#b45f06',
                sun: '#ffd966',
                water: '#1155cc',
                light: '#f3f3f3',
                psychic: '#674ea7',
            }
            const rainbow = 'linear-gradient(0deg, rgba(255,0,0,1) 0%, rgba(255,154,0,1) 11%, rgba(208,222,33,1) 22%, rgba(79,220,74,1) 33%, rgba(63,218,216,1) 44%, rgba(47,201,226,1) 55%, rgba(28,127,238,1) 66%, rgba(95,21,242,1) 77%, rgba(186,12,248,1) 88%, rgba(251,7,217,1) 99%)';
            let sheet = document.createElement("style");
            sheet.textContent = `
                .slot.mythic[armor-item-tooltip] {
                    .gradient_wrapper::before,
                    .gradient_wrapper::after {
                        content: '';
                        display: block;
                        width: 33%;
                        height: 33%;
                        position: absolute;
                    }
                    &:not([data-d*='"class":{"identifier":"${shared.Hero.infos.class}"']) .gradient_wrapper::before {
                        background-image: ${wrongClass} !important;
                    }
            `;
            for (const [bonus, background] of Object.entries(resonance1)) {
                sheet.textContent += `
                    &[data-d*='"resonance":"${bonus}"'] .gradient_wrapper::before {
                        background-image: ${background};
                        background-repeat: no-repeat;
                        background-size: contain;
                        bottom: 33%;
                        right: 1px;
                    }
                `;
            }
            for (const [bonus, background] of Object.entries(resonance2)) {
                sheet.textContent += `
                    &[data-d*='"resonance":"${bonus}"'] .gradient_wrapper::after {
                        background-image: ${background};
                        background-repeat: no-repeat;
                        background-size: contain;
                        bottom: 1px;
                        right: 1px;
                    }
                `;
            }
            for (const [theme, color] of Object.entries(colors)) {
                sheet.textContent += `
                    &[data-d*='"theme":{"identifier":"${theme}"'] {
                        background: ${color};
                    }
                `;
            }
            sheet.textContent += `
                    &[data-d*='"theme":{"identifier":null'] {
                        background: ${rainbow};
                    }
            `;
            sheet.textContent += `
                }
            `;
            document.head.appendChild(sheet);
        }
    }

    function championsMap() {
        if (CONFIG.champ.noRaid) {
            hideRaidCards();
        }

        function hideRaidCards() {
            let sheet = document.createElement("style");
            sheet.textContent = `
                .love-raid-container {
                    display: none;
                }
            `;
            document.head.appendChild(sheet);
        }
    }

    function clubChampion() {
        if (CONFIG.champ.fade) {
            fadeOutDraft();
        }

        function fadeOutDraft() {
            let sheet = document.createElement("style");
            sheet.textContent = `
                .girl-selection__girl-box:has(> div > span[carac="1"]),
                .girl-selection__girl-box:has(> div > span[carac="carac1"]),
                .girl-selection__girl-box:has(> div > span[carac="class1"]),
                .girl-selection__girl-box:has(> div > span[carac="2"]),
                .girl-selection__girl-box:has(> div > span[carac="carac2"]),
                .girl-selection__girl-box:has(> div > span[carac="class2"]) {
                    filter: grayscale(0.5) opacity(0.5);
                }
            `;
            document.head.appendChild(sheet);
        }
    }

    function activities() {
        const { pop_data } = unsafeWindow;
        if (CONFIG.activities.popShortcuts) {
            if (window.location.search.includes('&index')) {
                popAssign();
            } else {
                popCollect();
            }
        }

        function popCollect() {
            $(document).on('keydown', (e) => {
                if (!window.location.search.includes('tab=pop')) {
                    return;
                }
                if (e.key === ' ') {
                    const $claimGirlButton = $('#claim-reward');
                    if ($claimGirlButton.length) {
                        clickOnElement($claimGirlButton.get(0));
                        return;
                    }
                    const $okButton = $('#rewards_popup button.blue_button_L[confirm_blue_button]');
                    if ($okButton.length) {
                        clickOnElement($okButton.get(0));
                        return;
                    }
                    const $claimButtons = $('button.purple_button_L[rel=pop_thumb_claim][style="display:block"]');
                    if ($claimButtons.length) {
                        if (!$claimButtons.first().attr('disabled')) {
                            delete unsafeWindow['activities']['PlacesOfPower']['POP_RELOAD'];
                            unsafeWindow['activities']['PlacesOfPower']['POP_RELOAD'] = false;
                            clickOnElement($claimButtons.get(0));
                            // wait for the reward popup to re-enable POP_RELOAD
                            doWhenSelectorAvailable('#rewards_popup button.blue_button_L[confirm_blue_button]',
                                () => { unsafeWindow['activities']['PlacesOfPower']['POP_RELOAD'] = true });
                        }
                        return;
                    }
                    const $visitButtons = $('button.blue_button_L[rel=pop_thumb_info][style!="display:none"]');
                    clickOnElement($visitButtons.get(0));
                    $(document).off('keydown');
                }
            });
        }

        function popAssign() {
            $(document).on('keydown', (e) => {
                if (!window.location.search.includes('tab=pop')) {
                    return;
                }
                if (e.key === ' ') {
                    if (Object.values(pop_data).reduce((inactive, pop)=>{ return inactive + (pop.time_to_finish === 0) }, 0) === 0) {
                        // nothing else to assign, go home
                        clickOnElement($(`header > a.hh_logo img`).get(0));
                        $(document).off('keydown');
                        return;
                    }
                    const $assignButton = $('.pop-quick-nav button[rel=pop_auto_assign]');
                    if (!$assignButton.attr('disabled')) {
                        clickOnElement($assignButton.get(0));
                        $assignButton.attr('disabled', '');
                        return;
                    }
                    const $startButton = $('.pop_central_part button[rel=pop_action]');
                    if (!$startButton.attr('disabled')) {
                        clickOnElement($startButton.get(0));
                        $startButton.attr('disabled', '');
                        return;
                    }
                    if ($('.pop_central_part button[rel=pop_finish]').css('display') !== 'none') {
                        clickOnElement($('.pop-quick-nav a .pop-quick-nav-next').get(0));
                        $(document).off('keydown');
                    }
                }
            });
        }
    }

    function trollPreBattle() {
        // space key starts single battle
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                clickOnElement(document.querySelector(`.battle-buttons .single-battle-button`));
            }
        });
    }

    function trollBattle() {
        skipBattle();
    }

    function pantheon() {
        // space key enters floor
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                clickOnElement(document.querySelector(`#pantheon_tab_container .pantheon-pre-battle-btn`));
            }
        });
    }

    function pantheonPreBattle() {
        // space key starts single battle
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                clickOnElement(document.querySelector(`.battle-buttons .pantheon-single-battle-button`));
            }
        });
    }

    function pantheonBattle() {
        skipBattle();
    }

    function season() {
        hideCompletedRaid();

        function hideCompletedRaid() {
            /*global love_raids*/
            if (love_raids && love_raids[0].all_is_owned) {
                $('a.love-raid-container.raid').remove();
            }
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
                clickOnElement(performButtons[0]);
            } else if (e.key === '2') {
                clickOnElement(performButtons[1]);
            } else if (e.key === '3') {
                clickOnElement(performButtons[2]);
            }
        });

        function sortOpponents() {
            const cls = {main:'.sim-chance', tie:'.sim-mojo'};
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
            if (!(CONFIG.season.useThreshold && mainCriterion[best] < CONFIG.season.threshold)) {
                document.addEventListener('keydown', (e) => {
                    if (e.key === ' ') {
                        clickOnElement(bestOpponent.querySelector(`.green_button_L.btn_season_perform`));
                    }
                });
            }
            log('opponents sorted');

            return true;
        }
    }

    function seasonBattle() {
        skipBattle();
    }

    function skipBattle() {
        // space key skips battle, a second press accepts the results
        $(document).on('keydown', (e) => {
            if (e.key === ' ') {
                const $claimGirlButton = $('#claim-reward');
                if ($claimGirlButton.length) {
                    clickOnElement($claimGirlButton[0]);
                    return;
                }
                const $okButton = $('#rewards_popup button.blue_button_L[close_callback]');
                if ($okButton.length) {
                    clickOnElement($okButton[0]);
                    return;
                }
                const $skipButton = $('#new-battle-skip-btn');
                if ($skipButton.length) {
                    clickOnElement($skipButton[0]);
                }
            }
        });
    }

    async function loveRaids() {
        /*global love_raids*/

        // save raid times for home page counts
        localStorage.setItem(LS.loveRaids,
            JSON.stringify(love_raids.reduce((result, raid) => {
                const { id_raid, all_is_owned } = raid;
                let start, end;
                if (raid['status'] === 'ongoing') {
                    const { seconds_until_event_end } = raid;
                    start = 0; // irrelevant since it is running
                    end = server_now_ts + seconds_until_event_end;
                } else {
                    const { event_duration_seconds, seconds_until_event_start } = raid;
                    start = server_now_ts + seconds_until_event_start;
                    end = start + event_duration_seconds;
                }
                result.push({ all_is_owned, id_raid, start, end });
                return result;
            }, []))
        );

        const girls = await getGirlDictionary()
            .then(dict => love_raids.map(raid => dict.get(raid.id_girl.toString())));

        document.querySelectorAll('.raid-card').forEach((raidCard, i) => {
            if (!girls[i]) {
                log('HH++ is missing info, scroll through whole harem to update!');
                return;
            }
            const { name, shards } = girls[i];
            const { id_girl, girl_data: { grade_skins } } = love_raids[i];

            const haremLink = getHref(`/characters/${id_girl}`);
            const wikiLink = getWikiLink(name, id_girl, getLang());

            // replace shadow poses
            const leftImage = raidCard.querySelector('.girl-img.left');
            leftImage.src = `${getCDNHost()}/pictures/girls/${id_girl}/ava0.png`;
            if (grade_skins.length) {
                if (!raidCard.classList.contains('multiple-girl')) {
                    raidCard.classList.add('multiple-girl');
                    raidCard.classList.remove('single-girl');
                    $(raidCard).find('div.raid-content')
                        .append($(`
                        <div class="right-girl-container">
                            <img class="girl-img right" src="" alt="Right" 
                                 style="margin-top: ${leftImage.style.marginTop}">
                        </div>
                        `));
                    $(raidCard).find('.info-box .info-container .classic-girl')
                        .after($(`
                        <div class="classic-girl">
                            <div class="shards-container">
                                <div class="progress-container">
                                    <div class="shards_bar_wrapper">
                                        <div class="shards">
                                            <span class="skins_shard_icn"></span>
                                            <p><span>?/33</span></p>
                                        </div>
                                        <div class="shards_bar skins-shards">
                                            <div class="bar basic-progress-bar-fill pink" style="width: 0"></div>
                                        </div>
                                    </div>
                                </div>
                                <a href="" class="redirect_button blue_button_L" disabled="">Go</a>
                            </div>
                            <div class="border-bottom"></div>
                        </div>`));
                }
                const rightImage = raidCard.querySelector('.girl-img.right');
                if (!rightImage.src.includes('grade_skins')) {
                    // there is no good way to tell which skin it will be so this will always show the first
                    rightImage.src = `${getCDNHost()}/pictures/girls/${id_girl}/grade_skins/grade_skin1.png`;
                }
            }

            // sometimes the poses are also hidden instead of just black
            raidCard.querySelectorAll('.girl-img').forEach((img) => {
                if (img.style.visibility === 'hidden') {
                    img.style.visibility = 'visible';
                }
            });

            const objectives = raidCard.querySelectorAll('.classic-girl');
            const girl = objectives[0];
            const skin = objectives[1];

            // fill names on mysterious girls and make all names link to the wiki
            raidCard.querySelector('.raid-name span span').innerText = `${name} ${GT_design_love_raid}`;
            girl.querySelector('.girl-name').innerHTML = `<a href="${wikiLink}" target="_blank">${name}</a>`;

            // add go buttons if there aren't any
            addMissingGoButton(girl);
            addMissingGoButton(skin);

            // enable go buttons of owned girls/skins
            const goButtons = raidCard.querySelectorAll('.redirect_button');
            if (shards === 100) {
                girl.querySelector('.objective').innerText = GT_design_girl_town_event_owned_v2;
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

        addNotificationToggle();

        if (CONFIG.raid.hideOwned) {
            const sheet = document.createElement("style");
            sheet.textContent = `.raid-card.grey-overlay { display: none !important; }`;
            document.head.appendChild(sheet);
        }

        function addNotificationToggle() {
            addCSS();
            const raidNotifs = JSON.parse(localStorage.getItem(LS.loveRaidsNotifications)) || [];
            $('.raid-card:not(.grey-overlay)').each(function () {
                const id_raid = +$(this).attr('id_raid');
                const $raidName = $(this).find('.raid-name');
                $raidName.attr('data-notify', raidNotifs.includes(id_raid).toString())
                const $notifyToggle = $(`<span class="notify-toggle"></span>`);
                $raidName.append($notifyToggle);
                $notifyToggle.on('click', (event) => {
                    event.stopPropagation();
                    const i = raidNotifs.indexOf(id_raid);
                    if (i > -1) {
                        raidNotifs.splice(i, 1);
                        $raidName.attr('data-notify', 'false');
                    } else {
                        raidNotifs.push(id_raid);
                        $raidName.attr('data-notify', 'true');
                    }
                    localStorage.setItem(LS.loveRaidsNotifications,
                        JSON.stringify(raidNotifs));
                });
            });

            function addCSS() {
                let sheet = document.createElement("style");
                sheet.textContent = `
                    #love-raids .raid-card:not(.expanded) .raid-content .info-box {
                        padding-top: 0;
                        top: 4.8em;
                    }
                    
                    #love-raids .raid-card:not(.expanded).multiple-girl .raid-content .info-box .classic-girl:nth-of-type(2) .shards-container {
                        top: 0;
                    }
                    .notify-toggle {
                        position: relative;
                        display: inline-block;
                        height: 25px;
                        width: 25px;
                        background-image: url('${getCDNHost()}/ic_new.png');
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                        opacity: 0.5;
                        filter: grayscale(1);
                    }
                    .raid-name[data-notify="true"] .notify-toggle {
                        opacity: 1;
                        filter: grayscale(0);
                    }
                `;
                document.head.appendChild(sheet);
            }
        }

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

    function seasonal() {
        const { mega_event_time_remaining } = unsafeWindow;
        const type = getType();
        if (type === undefined) {
            log(`can't tell ME type`);
            return;
        }

        let seasonalData = JSON.parse(localStorage.getItem(LS.seasonal) ?? '{}');
        if (seasonalData.type !== type || server_now_ts > seasonalData.seasonalEnd) {
            seasonalData = { type: type, new: true }
        }

        if (type === 1) {
            seasonalEvent();
        } else if (type === 2) {
            lustyRace();
        } else if (type === 3) {
            hotAssembly();
        }
        localStorage.setItem(LS.seasonal, JSON.stringify(seasonalData));

        function getType() {
            const { mega_tiers_data } = unsafeWindow;
            if (mega_tiers_data) {
                if (mega_tiers_data.length === 115
                    && mega_tiers_data[114]['potions_required'] === 40000) {
                    // seasonal event
                    return 1;
                }
                if (mega_tiers_data.length === 100
                    && mega_tiers_data[99]['potions_required'] === 30000) {
                    // lusty race
                    return 2;
                }
                if (mega_tiers_data.length === 210
                    && mega_tiers_data[209]['potions_required'] === 50000) {
                    // hot assembly
                    return 3;
                }
            }
            return undefined;
        }

        function seasonalEvent() {

            addSECSS();

            preventAutoPopup(['a.pass-reminder'], '#pass_reminder_popup', '#pass_reminder_popup close');

            if (seasonalData.new) {
                seasonalData = { type: 1, new: false,
                    seasonalEnd: server_now_ts + mega_event_time_remaining,
                };
            }

            function addSECSS() {
                let sheet = document.createElement("style");
                sheet.textContent = ``;
                if (CONFIG.seasonal.hideSeasonalEventBonusPath) {
                    sheet.textContent += `
                        #home_tab_container .mega-progress-bar-tiers.double-mega-event .mega-tier-container {
                            height: 5rem !important;
                        }
                        #home_tab_container .middle-container {
                            padding-top: 1rem;
                        }
                        #home_tab_container .bottom-container {
                            padding-top: 2rem;
                            height: 8.75rem !important;
                        }
                        #home_tab_container .bottom-container .left-part-container.mega-event-2 {
                            height: 11rem !important;
                        }
                        #home_tab_container .mega-tier.pass-slot,
                        #home_tab_container .gsp_btn_holder {
                            display: none !important;
                        }
                    `;
                }
                document.head.appendChild(sheet);
            }
        }

        function lustyRace() {
            addLRCSS();

            if (seasonalData.new) {
                seasonalData = { type: 2, new: false,
                    seasonalEnd: server_now_ts + mega_event_time_remaining,
                    rankingEnd: null, rankingRewards: false,
                };
            }

            if (seasonalData.rankingEnd === null
                // just in case the page is reloaded on the ranking tabs
                || window.location.search.includes('tab=top_ranking_tab_container')
                || window.location.search.includes('tab=event_ranking_tab_container')) {
                seasonalData.rankingRewards = false;
            } else {
                if (serverNow() > seasonalData.rankingEnd) {
                    // the next ranking will end three days after the last one
                    seasonalData.rankingEnd += 3 * 24 * 60 * 60;
                    seasonalData.rankingRewards = true;
                }
            }

            doWhenSelectorAvailable('.ranking-timer.timer', () => {
                seasonalData.rankingEnd = Math.round((serverNow() + parseInt($('.ranking-timer.timer').attr('data-time-stamp'))) / 100) * 100;
                localStorage.setItem(LS.seasonal, JSON.stringify(seasonalData));
            });

            if (seasonalData.rankingRewards) {
                addRewardConfirmation('top_ranking_tab');
                addRewardConfirmation('event_ranking_tab');
            }

            function addLRCSS() {
                let sheet = document.createElement("style");
                sheet.textContent = `
                        #mega-event-tabs .collect_notif.show-chest {
                            display: unset !important;
                        }
                    `;
                document.head.appendChild(sheet);
            }
        }

        function hotAssembly() {

            addHACSS();

            if (CONFIG.seasonal.hideHotAssemblyBonusPath) {
                $('#get_mega_pass_kobans_btn').attr('disabled', '');
                doWhenSelectorAvailable('#pass_reminder_popup close', () => {
                    clickOnElement($('#pass_reminder_popup close')[0]);
                });
            }

            if (seasonalData.new) {
                seasonalData = { type: 3, new: false,
                    seasonalEnd: server_now_ts + mega_event_time_remaining,
                    rankingEnd: null, rankingRewards: false,
                };
            }

            if (seasonalData.rankingEnd === null
                // just in case the page is reloaded on the ranking tabs
                || window.location.search.includes('tab=event_ranking_tab_container')) {
                seasonalData.rankingRewards = false;
            } else {
                if (serverNow() > seasonalData.rankingEnd) {
                    // the next ranking will end three days after the last one
                    seasonalData.rankingEnd += 3 * 24 * 60 * 60;
                    seasonalData.rankingRewards = true;
                }
            }

            doWhenSelectorAvailable('.ranking-timer.timer', () => {
                seasonalData.rankingEnd = Math.round((serverNow() + parseInt($('.ranking-timer.timer').attr('data-time-stamp'))) / 100) * 100;
                localStorage.setItem(LS.seasonal, JSON.stringify(seasonalData));
            });

            if (seasonalData.rankingRewards) {
                addRewardConfirmation('event_ranking_tab');
            }

            function addHACSS() {
                let sheet = document.createElement("style");
                sheet.textContent = `
                    #mega-event-tabs .collect_notif.show-chest {
                        display: unset !important;
                    }
                `;
                if (CONFIG.seasonal.hideHotAssemblyBonusPath) {
                    sheet.textContent += `
                        #home_tab_container .mega-progress-bar-tiers.double-mega-event .mega-tier-container {
                            height: 5rem !important;
                        }
                        #home_tab_container .middle-container {
                            padding-top: 1rem;
                        }
                        #home_tab_container .bottom-container {
                            padding-top: 2rem;
                            height: 8.75rem !important;
                        }
                        #home_tab_container .bottom-container .left-part-container.mega-event-2 {
                            height: 11rem !important;
                        }
                        #home_tab_container .mega-tier.pass-slot,
                        #home_tab_container .gsp_btn_holder {
                            display: none !important;
                        }
                    `;
                }
                document.head.appendChild(sheet);
            }
        }

        function addRewardConfirmation(tabId) {
            const $rewardTab = $(`#${tabId}`);
            if ($rewardTab.length) {
                $rewardTab.wrapInner(`<div id="${tabId}_confirm" class="claim-confirmation"></div>`);
                $rewardTab.find('.collect_notif').addClass('show-chest');
                $(`#${tabId}_confirm`).on('click', (e) => {
                    if (confirm('opening ranking tab will claim rewards')) {
                        rewardsClaimed();
                    } else {
                        e.stopPropagation();
                    }
                });
            }

            function rewardsClaimed() {
                seasonalData.rankingRewards = false;
                localStorage.setItem(LS.seasonal, JSON.stringify(seasonalData));
                $('#mega-event-tabs .claim-confirmation').off('click');
                $('.show-chest').removeClass('show-chest');
            }
        }
    }

    function quest() {
        if (CONFIG.quest.highRes) {
            doWhenSelectorAvailable('#background', () => {
                const bg = $('#background')[0];
                bg.src = bg.src.replace('800x450', '1600x900');
            });
        }

        if (CONFIG.quest.nav) {
            addNavigationButtons();
        }

        function addNavigationButtons() {
            const $backButton = $(`#archive-back`);
            const $nextButton = $(`#archive-next`);
            if (!$backButton.length) {
                $nextButton.before(`
                    <button id="archive-back" class="finished round_blue_button big-intro-button-angel" disabled>
                        <img src="https://hh.hh-content.com/design/ic_arrow-left-ffffff.svg" alt="<">
                    </button>
                `);
            }
            if (!$nextButton.length) {
                $backButton.after(`
                    <button id="archive-next" class="finished round_blue_button big-intro-button-angel" disabled>
                        <img class="continue" src="https://hh.hh-content.com/design/ic_arrow-right-ffffff.svg" alt=">">
                    </button>
                `);
            }
        }
    }

    function waifu() {
        const { girls_data_list } = unsafeWindow;
        const $copyButton = $(`
            <button id="copy_girls" class="square_blue_btn" style="margin-bottom: 8px; margin-left: 8px; display: block">
                <span>
                    <img alt="Copy owned girls and skins" tooltip="Copy owned girls and skins"
                         src="${getCDNHost()}/design/ic_books_gray.svg" 
                         style="filter: brightness(0) saturate(1) invert(1)">
                </span>
            </button>`);
        $copyButton.on('click', copyGirls);

        doWhenSelectorAvailable('#filter_girls', () => {
            $('#filter_girls')
                .wrap(`<div style="display: flex"> </div>`)
                .after($copyButton);
        });

        function copyGirls() {
            const text = girls_data_list.reduce((csv, girl) => {
                const ownedSkins = girl.preview.grade_skins_data.reduce((owned, skin) => {
                    return owned + skin.is_owned;
                }, 0);
                csv += `${girl.id_girl},${ownedSkins}\n`;
                return csv;
            }, 'id,skins\n');
            copyText(text);
        }
    }

    function PoV() {
        const { time_remaining } = unsafeWindow;
        runAndRepeatOnChange('.potions-paths-progress-bar-tiers', () => {
            if (+time_remaining < 23.5 * 60 * 60) { return; } // only hide until the contest starts on the last day
            const claimAll = $('.potions-paths-tier.unclaimed.claim-all-rewards')[0];
            if (claimAll) {
                claimAll.classList.remove('claim-all-rewards');
                claimAll.querySelector('#claim-all').style.display = 'none';
            }
        });
        preventAutoPopup(['button.purchase-pass'], '#pov_pog_passes_popup', '#pov_pog_passes_popup close');
    }

    function labyrinthPoolSelect() {
        doWhenSelectorAvailable('.labyrinth-pool-select-container .girl-grid', async () => {
            const { owned_girls } = unsafeWindow;
            const favorites = new FavoriteLabGirls();

            $('.girl-grid .girl-container').each((i, girl) => {
                setPower(favorites, girl, girl.getAttribute('id_girl'), owned_girls);
            });

            const top7 = getTop7(owned_girls);

            await runAndRepeatOnChange('.labyrinth-pool-select-container .girl-grid', async () => {
                $('.girl-grid .girl-container').each((i, girl) => {
                    favorites.prepareGirlElement(girl, 'id_girl', top7, owned_girls);
                });

                moveTop7Up(top7, '.girl-grid .girl-container', 'id_girl');
            });
        });
    }

    function labyrinth() {
        // favorites
        doWhenSelectorAvailable('#squad_tab_container .squad-container .girl-grid', async () => {
            const { girl_squad } = unsafeWindow;
            const favorites = new FavoriteLabGirls();

            const top7 = getTop7(girl_squad.map(girl => girl['member_girl']));

            await runAndRepeatOnChange('#squad_tab_container .squad-container', async () => {
                $('.girl-grid .girl-container').each((i,girl) => {
                    favorites.prepareGirlElement(girl, 'id', top7);
                });

                moveTop7Up(top7, '.girl-grid .girl-container', 'id');
            });
        });

        // shop timer
        doWhenSelectorAvailable('#shop_tab_container .item-container .slot', async () => {
            const currentShopCycleEnd = updateCycleEnd();

            await runAndRepeatOnChange('#shop_tab_container', setShopTimer);

            setInterval(function() {
                const timer = $('#shop_tab_container .shop-timer p span');
                if (timer.length) {
                    // just to trigger setShopTimer through the observer
                    timer.text('');
                }
            }, 1000);

            function setShopTimer() {
                const timer = $('#shop_tab_container .shop-timer p');
                if (!timer.length) { return; }
                const seconds = currentShopCycleEnd - serverNow();
                if (seconds > 0) {
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    const timeString = (h > 0 ? `${h}h ` : '') + (h > 0 || m > 0 ? `${m}m ` : '') + `${s}s`;
                    timer.html(`${GT_design_market_new_stock}<span rel="expires">${timeString}</span>`);
                } else {
                    // since the timer is the latest time that restocking happens it must have
                    // happened now so force a reload to prevent buying unknown items from the new stock
                    timer.html('Refresh!');
                    $('.shop-section .slot').css('filter', 'grayscale(1)');
                    $('.blue_button_L.buy-item').attr('disabled', '');
                    setTimeout(() => { window.location.reload(); }, 2500);
                }
            }

            function updateCycleEnd(force = false) {
                /*global cycle_end_in_seconds*/
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
        doWhenSelectorAvailable('.harem-panel-girls', async () => {
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

            await runAndRepeatOnChange('.harem-panel-girls', async () => {
                $(document).trigger('updateFavorites');
            });
        });
    }

    async function editTeam() {
        const dict = await getGirlDictionary();
        const $input = $('<input type="text" id="team_list" placeholder="Team list" style="text-align:center;">');
        const $setButton = $('<button id="set-team" class="blue_button_L">Copy Team</button>');
        const $clearButton = $('#clear-team');

        $clearButton.before($input);
        $clearButton.before($setButton);

        $input.on('input', () => {
            if (!$input.val()) {
                $setButton.text('Copy Team');
            } else {
                $setButton.text('Set Team');
            }
        });

        $setButton.on('click', ()=>{
            if (!$input.val()) {
                let names = [];
                $('.team-member-container').each((i, e) => {
                    const j = $(e).attr('data-team-member-position');
                    const id = $(e).attr('data-girl-id');
                    if (!id) { return; }
                    const name = dict.get(id).name;
                    names[j] = `"${name}"`;
                });
                copyText(names.join(', '));
                $setButton.text('Copied');
                setTimeout(() => { $input.trigger('input'); }, 3000);
            } else {
                clickOnElement($clearButton[0]);
                const girls = JSON.parse(`[${$input.val()}]`);
                const ids = girls.map(name => dict.keys().find(k => dict.get(k).name === name));
                for (const i in ids) {
                    const girlElement = $(`.harem-girl-container[id_girl=${ids[i]}]`)[0];
                    if (girlElement) {
                        clickOnElement(girlElement);
                    } else {
                        log(`unowned girl (typo?): ${girls[i]}`)
                    }
                }
            }
        });
    }

    function sultryMysteries() {
        doWhenSelectorAvailable('.preview-rewards-panel .preview-rewards-list', function() {
            const $generateButton = $('button.generate-new-grid');
            const $rewards = $('.preview-rewards-panel .preview-rewards-list');

            runAndRepeatOnChange('.preview-rewards-panel .preview-rewards-list', function() {
                const tilesLeft = $rewards.find('.reward-preview:not(.claimed)').length;
                const coinsLeft = getAvailableAmount('.slot_sultry_coins');
                const keysLeft = getAvailableAmount('.slot_progressions');

                $generateButton.removeClass(['blue_button_L', 'red_button_L', 'green_button_L']);
                $generateButton.addClass(
                    (coinsLeft + keysLeft) / tilesLeft >= 0.75 ? 'red_button_L' : 'green_button_L'
                );
            });

            function getAvailableAmount(cls) {
                return Array.from($rewards.find(`.reward-preview:not(.claimed) ${cls} .amount`))
                    .reduce((sum, el) => sum + +(el.innerText), 0);
            }
        });
    }

    function log(...args) {
        console.log('HH suckless:', ...args);
    }

    function debug(...args) {
        console.debug('HH suckless:', ...args);
    }

    function capitalize(val) {
        return val.charAt(0).toUpperCase() + val.slice(1);
    }

    function formatTime(seconds) {
        const days = Math.floor(seconds / 60 / 60 / 24);
        const d = days + 'd';

        const hours = Math.floor(seconds / 60 / 60) % 24;
        const h = hours + 'h';

        const minutes = Math.floor(seconds / 60) % 60;
        const m = minutes + 'm';

        const secs = Math.floor(seconds) % 60;
        const s = secs + 's';

        if (days > 0) {
            return `${d} ${h}`;
        } else if (hours > 0) {
            return `${h} ${m}`;
        } else if (minutes > 0) {
            return `${m} ${s}`;
        } else {
            return s;
        }
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
        // noinspection JSDeprecatedSymbols
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

    function preventAutoPopup(manualButtons, check, close) {
        let manualClick = false;
        for (const button of manualButtons) {
            $(button).on('click', () => {
                manualClick = true;
            });
        }
        doWhenSelectorAvailable(check, ()=>{
            if (!manualClick) {
                clickOnElement($(close)[0]);
            }
        });
    }

    function runOnChange(selectors, func) {
        const observer = new MutationObserver(async () => {
            observer.disconnect();
            await func();
        });
        observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
    }

    function repeatOnChange(selectors, func) {
        const observer = new MutationObserver(async () => {
            observer.disconnect();
            await func();
            observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
        });
        observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
    }

    async function runAndRepeatOnChange(selectors, func) {
        const observer = new MutationObserver(async () => {
            observer.disconnect();
            await func();
            observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
        });
        await func();
        observer.observe(document.querySelector(selectors), {childList: true, subtree: true});
    }

    function clickOnElement(el) {
        const rect = el.getBoundingClientRect();
        const posX = rect.left + rect.width / 2;
        const posY = rect.top + rect.height / 2;
        el.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            clientX: posX, clientY: posY,
            screenX: posX, screenY: posY}));
    }

    function loadConfig() {
        // defaults
        let config = {
            reload:
                { enabled: true },
            news:
                { enabled: false },
            activities:
                { enabled: false, popBar: false, popShortcuts: false },
            girlPreview:
                { enabled: true },
            shop:
                { enabled: true },
            quest:
                { enabled: true, highRes: true, nav: true },
            raid:
                { enabled: true , hideOwned: false },
            champ:
                { enabled: false, fade: false, noRaid: false },
            villain:
                { enabled: true },
            pantheon:
                { enabled: true },
            season:
                { enabled: true, useThreshold: false, threshold: 100 },
            seasonal:
                { enabled: true, home: true, hideHotAssemblyBonusPath: false , hideSeasonalEventBonusPath: false },
            lab:
                { enabled: true },
            editTeam:
                { enabled: false },
            pov:
                { enabled: true },
            pog:
                { enabled: true },
            noWBT:
                { enabled: false },
        };

        const {
            loadConfig: hhLoadConfig,
            registerGroup,
            registerModule,
            runModules,
        } = hhPlusPlusConfig;

        registerGroup({
            key: 'suckless',
            name: 'suckless'
        });

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'reload',
                label: 'R key reloads current page',
                default: true,
            },
            run() {
                config.reload = {
                    enabled: true,
                };
            },
        });
        config.reload.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'news',
                label: 'prevent news and shop popup',
                default: false,
            },
            run() {
                config.news = {
                    enabled: true,
                };
            },
        });
        config.news.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'girlPreview',
                label: 'unblur girl preview',
                default: true,
            },
            run() {
                config.girlPreview = {
                    enabled: true,
                };
            },
        });
        config.girlPreview.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'shop',
                label: 'improved shop',
                default: true,
            },
            run() {
                config.shop = {
                    enabled: true,
                };
            },
        });
        config.shop.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'quest',
                label: 'improved scenes',
                default: true,
                subSettings: [
                    { key: 'highRes', default: true,
                        label: 'force higher resolution',
                    },
                    { key: 'nav', default: true,
                        label: 'add missing navigation buttons',
                    },
                ],
            },
            run(subSettings) {
                config.quest = {
                    enabled: true,
                    highRes: subSettings.highRes,
                    nav: subSettings.nav,
                };
            },
        });
        config.quest.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'raid',
                label: 'additional raid card tweaks',
                default: true,
                subSettings: [
                    { key: 'hideOwned', default: false,
                        label: 'hide cards of completed raids',
                    },
                ],
            },
            run(subSettings) {
                config.raid = {
                    enabled: true,
                    hideOwned: subSettings.hideOwned,
                };
            },
        });
        config.raid.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'champ',
                label: 'champion tweaks',
                default: false,
                subSettings: [
                    { key: 'fade', default: false,
                        label: 'fade out non know-how girls in club champ draft',
                    },
                    { key: 'noRaid', default: false,
                        label: 'hide raid cards',
                    },
                ],
            },
            run(subSettings) {
                config.champ = {
                    enabled: true,
                    fade: subSettings.fade,
                    noRaid: subSettings.noRaid,
                };
            },
        });
        config.champ.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'activities',
                label: 'improved activities',
                default: false,
                subSettings: [
                    { key: 'popBar', default: false,
                        label: 'restyle PoP bar',
                    },
                    { key: 'popShortcuts', default: false,
                        label: 'PoP space key shortcuts',
                    },
                ],
            },
            run(subSettings) {
                config.activities = {
                    enabled: true,
                    popBar: subSettings.popBar,
                    popShortcuts: subSettings.popShortcuts,
                };
            },
        });
        config.activities.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'villain',
                label: 'improved villain fights',
                default: true,
            },
            run() {
                config.villain = {
                    enabled: true,
                };
            },
        });
        config.villain.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'pantheon',
                label: 'improved pantheon fights',
                default: true,
            },
            run() {
                config.pantheon = {
                    enabled: true,
                };
            },
        });
        config.pantheon.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'season',
                label: 'improved season',
                default: true,
                subSettings: [
                    { key: 'useThreshold', default: false,
                        label: `disable space bar when chance is below <span><input type="text" id="season-threshold-input" placeholder="" style="text-align: center; height: 1rem; width: 2rem;">%</span>`,
                    },
                ],
            },
            run(subSettings) {
                config.season = {
                    enabled: true,
                    useThreshold: subSettings.useThreshold,
                    threshold: parseFloat(localStorage.getItem(LS.seasonChanceThreshold) ?? '100'),
                };
            },
        });
        config.season.enabled = false;

        doWhenSelectorAvailable('#season-threshold-input', () => {
            const $input = $('#season-threshold-input');
            let threshold = parseFloat(localStorage.getItem(LS.seasonChanceThreshold) ?? '100');
            $input.val(threshold.toString());
            $input.on('focusout', () => {
                const input = parseFloat($input.val());
                threshold = isNaN(input) ? 0 : Math.min(100, Math.max(0, input));
                localStorage.setItem(LS.seasonChanceThreshold, threshold.toString());
                $input.val(threshold.toString());
            });
        });

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'seasonal',
                label: 'improved seasonal',
                default: true,
                subSettings: [
                    { key: 'home', default: true,
                        label: 'add infos on home page',
                    },
                    { key: 'hideHotAssemblyBonusPath', default: false,
                        label: 'hide HA bonus path',
                    },
                    { key: 'hideSeasonalEventBonusPath', default: false,
                        label: 'hide SEM bonus path',
                    },
                ],
            },
            run(subSettings) {
                config.seasonal = {
                    enabled: true,
                    home: subSettings.home,
                    hideHotAssemblyBonusPath: subSettings.hideHotAssemblyBonusPath,
                    hideSeasonalEventBonusPath: subSettings.hideSeasonalEventBonusPath,
                };
            },
        });
        config.seasonal.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'lab',
                label: 'improved labyrinth',
                default: true,
            },
            run() {
                config.lab = {
                    enabled: true,
                };
            },
        });
        config.lab.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'editTeam',
                label: 'improved team edit',
                default: false,
            },
            run() {
                config.editTeam = {
                    enabled: true,
                };
            },
        });
        config.editTeam.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'pov',
                label: 'hide PoV/PoG claim all until the last day',
                default: true,
            },
            run() {
                config.pov = {
                    enabled: true,
                };
                config.pog = {
                    enabled: true,
                };
            },
        });
        config.pov.enabled = false;
        config.pog.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'noWBT',
                label: 'hide WBT',
                default: false,
            },
            run() {
                config.noWBT = {
                    enabled: true,
                };
            },
        });
        config.noWBT.enabled = false;

        hhLoadConfig();
        runModules();

        return config;
    }
})();
