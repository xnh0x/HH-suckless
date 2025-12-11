// ==UserScript==
// @name         HH suckless
// @version      0.53.0
// @description  HH that sucks less. Requires HH++ BDSM and Rena's Battle Sim.
// @author       xnh0x
// @match        https://*.hentaiheroes.com/*
// @match        https://nutaku.haremheroes.com/*
// @match        https://*.comixharem.com/*
// @match        https://*.gayharem.com/*
// @match        https://*.pornstarharem.com/*
// @match        https://*.gaypornstarharem.com/*
// @match        https://*.transpornstarharem.com/*
// @run-at       document-end
// @namespace    https://github.com/xnh0x/HH-suckless
// @updateURL    https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @downloadURL  https://github.com/xnh0x/HH-suckless/raw/refs/heads/master/HHsuckless.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hentaiheroes.com
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @require      https://raw.githubusercontent.com/xnh0x/HH-suckless/refs/heads/master/HHsettings.js
// ==/UserScript==

/*global GM_info, unsafeWindow*/

const local_now_ts = Math.floor(Date.now() / 1000);

(async function suckless() {
    'use strict';

    const LAB_STRATEGIES = {
        xp:     { id: 1, iconClass: 'xp_icn' },
        coins:  { id: 2, iconClass: 'labyrinth_coin_icn' },
        kisses: { id: 3, iconClass: 'hudKiss_mix_icn' },
        fists:  { id: 4, iconClass: 'hudBattlePts_mix_icn' },
    };

    class Storage {
        static #default = {
            labFavorites: [],
            labShopCycleEnd: null,
            labShopStock: [],
            labPathStrategy: LAB_STRATEGIES.xp.id,
            popData: null,
            seasonal: { type: undefined },
            seasonChanceThreshold: 100,
        }

        static #handle(key, value) {
            const {HH_UNIVERSE: game, shared: {Hero: {infos: {id}}}} = unsafeWindow;
            const fullKey = `${game}_${id}_${key}`;
            switch (value) {
                case undefined: return GM_getValue(fullKey, this.#default[key]);
                case null: GM_deleteValue(fullKey); return;
                default: GM_setValue(fullKey, value); return;
            }
        }

        static labFavorites(value) {
            return this.#handle('labFavorites', value);
        }

        static labShopCycleEnd(value) {
            return this.#handle('labShopCycleEnd', value);
        }

        static labShopStock(value) {
            return this.#handle('labShopStock', value);
        }

        static labPathStrategy(value) {
            return this.#handle('labPathStrategy', value);
        }

        static popData(value) {
            return this.#handle('popData', value);
        }

        static seasonal(value) {
            return this.#handle('seasonal', value);
        }

        static seasonChanceThreshold(value) {
            return this.#handle('seasonChanceThreshold', value);
        }
    }

    if (!unsafeWindow['hhPlusPlusConfig']) {
        log(`waiting for HHPlusPlus`);
        $(document).one('hh++-bdsm:loaded', () => {
            log('HHPlusPlus ready, restart script');
            suckless();
        });
        return;
    }

    const {
        HHPlusPlus: {
            Helpers: { doWhenSelectorAvailable, getCDNHost, getHref, onAjaxResponse },
            I18n: { getLang },
        },
        hhPlusPlusConfig,
        server_now_ts,
    } = unsafeWindow;

    const bind = (obj, methodName) => obj[methodName].bind(obj);

    const getGirlDictionary = bind(unsafeWindow.HHPlusPlus.Helpers, 'getGirlDictionary');

    const CONFIG = loadConfig();

    class FavoriteLabGirls {
        constructor() {
            this.favoriteIds = Storage.labFavorites();
            this.toggle = $('<div class="favourite-toggle"></div>');
            this.addCSS();
        }

        addCSS() {
            addStyle(`
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
            `);
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
            Storage.labFavorites(this.favoriteIds);
        }

        addFavorite(id) {
            this.favoriteIds.push(+id);
            Storage.labFavorites(this.favoriteIds);
        }

        isFavorite(id) {
            return this.favoriteIds.includes(+id);
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
     * trick the browser into thinking there is some media playback by playing
     *   a 20Hz tone at very low volume (it is inaudible). this prevents the
     *   game from being throttled while the tab is in the background
     */
    if (CONFIG.noThrottle.enabled) {
        preventThrottling();
    }

    /*
     * - replace HH++ PoP bar
     */
    if (CONFIG.activities.popBar) {
        if (window.location.pathname === '/penta-drill-arena.html') {
            doWhenSelectorAvailable(
                '.opponents-container.grid-container .opponent-info-container',
                () => { doWhenSelectorAvailable('a.script-pop-timer', popTimerBar) },
                (jQ) => jQ.length === 4
            );
        } else {
            doWhenSelectorAvailable('a.script-pop-timer', popTimerBar);
        }
    }

    /*
     * - disable fade transition when opening the navigation menu
     */
    mainMenu();

    /*
     * - indicators for hero equipment resonance
     */
    if (CONFIG.heroEquip.enabled) {
        addHeroEquipResonanceIndicators();
    }

    if (window.location.pathname === '/settings.html') {
        /*
         * - closing the settings redirects back to the previous page
         */
        settings();
    }

    if (window.location.pathname === '/home.html') {
        /*
         * - add ranking timer and reward chest for LR/HA
         */
        home();
    }

    if (window.location.pathname === '/penta-drill-arena.html') {
        /*
         * - add perform & skip
         */
        if (CONFIG.drill.enabled) {
            doASAP(
                pentaDrillArena,
                '.opponents-container.grid-container .opponent-info-container',
                (jQ) => jQ.length === 4
            );
        }
    }

    if (window.location.pathname === '/penta-drill-pre-battle.html'
        || window.location.pathname === '/penta-drill-pre-battle') {
        /*
         * - add perform & skip
         */
        if (CONFIG.drill.enabled) {
            doASAP(pentaDrillPreBattle, `.middle-container .buttons-container:has(#perform_opponent)`);
        }
    }

    if (window.location.pathname === '/champions-map.html') {
        /*
         * - hide raid cards to prevent accidental navigation
         * - start fights frm the map
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
        if (CONFIG.quest.enabled) {
            quest();
        }
    }

    if (window.location.pathname === '/waifu.html') {
        /*
         * - button to export owned girls/skins for optimal team script
         */
        waifu();
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
            doWhenSelectorAvailable('#clear-team', editTeam);
        }
    }

    if (window.location.pathname === '/event.html') {
        /*
         * - Sultry Mysteries
         *     - red/green generate button to indicate optimal grid refresh
         *     - space bar shortcut
         * - PoA/PoR
         *     - hide reminder
         * - DP
         *     - hide reminder
         */
        if (window.location.search.includes('tab=sm_event_')) {
            sultryMysteries();
        } else if (window.location.search.includes('tab=path_event_')) {
            PoA();
        } else if (window.location.search.includes('tab=dp_event_')) {
            DP();
        }

    }

    function girlPreview() {
        addStyle(`
            .pose-preview_wrapper.locked {
                .pose-preview { filter: blur(0) !important; }
                .preview-locked_icn { display: none !important; }
            }
        `);

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

    function preventThrottling() {
        const context = new window.AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.frequency.setValueAtTime(20, context.currentTime);
        gain.gain.setValueAtTime(0.001, context.currentTime);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        // when a page loads audio playback is automatically suspended and not
        // allowed to resume until the first user interaction
        if (context.state === 'suspended')
            $(document).one('click', ()=>{ context.resume() });
    }

    function popTimerBar() {
        if (window.location.pathname === '/activities.html' && window.location.search.includes('&index')) {
            const { current_pop_data } = unsafeWindow;
            const $claimButton = $('.pop_central_part button[rel="pop_claim"]');
            $claimButton.on('click', () => {
                let data = Storage.popData();
                data.times = data.times.filter((e) => e.id_places_of_power !== current_pop_data.id_places_of_power);
                data.active = data.times.length;
                data.inactive = data.unlocked - data.active;
                current_pop_data.remaining_time = 0;
                Storage.popData(data);
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
                if (!(window.location.pathname === '/activities.html')) {
                    // pop data can't change on the current page so there is no need to keep updating
                    clearInterval(popBarUpdater);
                }
            }
        }

        function updatePopData(firstRun = false) {
            let popData = Storage.popData();
            if (firstRun && window.location.pathname === '/activities.html') {
                const { pop_data } = unsafeWindow;
                parsePopData(pop_data);
                exposeFunction(parsePopData);

                function parsePopData(data) {
                    const popArr = Object.values(data);
                    const times = popArr.reduce((acc, curr) => {
                        if (curr.time_to_finish) {
                            const {id_places_of_power, remaining_time, time_to_finish} = curr;
                            const end_ts = curr.end_ts ?? server_now_ts + remaining_time;
                            acc.push({id_places_of_power, end_ts, time_to_finish})
                        }
                        return acc;
                    }, []);

                    popData = {
                        unlocked: popArr.length,
                        active: times.length,
                        inactive: popArr.length - times.length,
                        times: times.sort((a, b) => a.end_ts - b.end_ts),
                        updated: false,
                    };
                    Storage.popData(popData);
                }
            }

            if (window.location.pathname === '/activities.html' && window.location.search.includes('&index')) {
                const { current_pop_data } = unsafeWindow;
                const $progressBar = $('#pop_info .pop_central_part .hh_bar');
                if (popData.updated || $progressBar.css('display') === 'none') {
                    return popData;
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

                    let times = popData.times;
                    const i = times.findIndex((e) => e.id_places_of_power === id_places_of_power);
                    if (i >= 0) {
                        times[i] = {id_places_of_power, end_ts, time_to_finish};
                    } else {
                        times.push({id_places_of_power, end_ts, time_to_finish});
                    }
                    popData.active = times.length;
                    popData.inactive = popData.unlocked - popData.active;
                    popData.times = times.sort((a, b) => a.end_ts - b.end_ts);
                    popData.updated = true;
                }
                Storage.popData(popData);
            }
            return popData;
        }

        function addPopCSS() {
            // pretty much 1 to 1 copied from the other bar's styles
            addStyle(`
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
            `);
        }
    }

    function mainMenu() {
        doWhenSelectorAvailable('#contains_all > nav > [rel="content"] > div', () => {
            $('#contains_all > nav > [rel="content"] > div')[0].style.transition = 'none';
        });
    }

    function addHeroEquipResonanceIndicators() {
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

        let css = ``;
        for (const carac of [1, 2, 3]) {
            css += `
                .profile_page:has(.hero_info .class_change_btn[carac="${carac}"]) {
                    .slot.mythic[armor-item-tooltip]:not([data-d*='"class":{"identifier":"${carac}"']) .gradient_wrapper::before {
                        background-image: ${wrongClass} !important;
                    }
                }`;
        }
        css +=`
                .slot.mythic[armor-item-tooltip] {
                    .gradient_wrapper::before,
                    .gradient_wrapper::after,
                    &:not(:has(.gradient_wrapper))::before,
                    &:not(:has(.gradient_wrapper))::after {
                        content: '';
                        display: block;
                        width: 33%;
                        height: 33%;
                        position: absolute;
                    }
                    &:not(.profile_page .slot):not([data-d*='"class":{"identifier":"${shared.Hero.infos.class}"']) {
                        .gradient_wrapper::before,
                        &:not(:has(.gradient_wrapper))::before {
                            background-image: ${wrongClass} !important;
                        }
                    }
            `;
        for (const [bonus, background] of Object.entries(resonance1)) {
            css += `
                    &[data-d*='"resonance":"${bonus}"'] {
                        .gradient_wrapper::before,
                        &:not(:has(.gradient_wrapper))::before {
                            background-image: ${background};
                            background-repeat: no-repeat;
                            background-size: contain;
                            bottom: 33%;
                            right: 1px;
                        }
                    }
                `;
        }
        for (const [bonus, background] of Object.entries(resonance2)) {
            css += `
                    &[data-d*='"resonance":"${bonus}"'] {
                        .gradient_wrapper::after,
                        &:not(:has(.gradient_wrapper))::after {
                            background-image: ${background};
                            background-repeat: no-repeat;
                            background-size: contain;
                            bottom: 1px;
                            right: 1px;
                        }
                    }
                `;
        }
        for (const [theme, color] of Object.entries(colors)) {
            css += `
                    &[data-d*='"theme":{"identifier":"${theme}"'] {
                        background: ${color};
                    }
                `;
        }
        css += `
                    &[data-d*='"theme":{"identifier":null'] {
                        background: ${rainbow};
                    }
                }
            `;
        addStyle(css);
    }

    function settings() {
        doASAP(($close) => {
            $close.attr('href', null);
            $close.css('cursor', 'pointer');
            $close.on('click', ()=>{window.history.back()});
        }, '.settings-container a.close_cross');

        // for testing purposes
        addSettingsTab();

        function addSettingsTab() {
            const { HHSettings: { createSettingsTab } } = unsafeWindow;
            const settingsTab = createSettingsTab('suckless', GM_info.script.version);
            settingsTab.addOption($(`<div>test</div>`));
        }
    }

    function home() {

        if (CONFIG.noWBT.enabled) {
            doASAP($wb => {$wb.remove()}, `div.world-boss`);
        }

        if (CONFIG.seasonal.enabled && CONFIG.seasonal.home) {
            addSeasonalInfo();
        }

        function addSeasonalInfo() {
            const { GT: { design: { ends_in: GT_design_ends_in, event_ranking: GT_design_event_ranking } } } = unsafeWindow;

            let seasonalData = Storage.seasonal();
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
                doASAP(addRankingTimer, 'div.over[rel="mega-event"]');
            } else if (seasonalData.type === 3) {
                // hot assembly
                doASAP(addRankingTimer, 'div.over[rel="mega-event"]');
            }

            function addRankingTimer() {
                if (!seasonalData.rankingEnd) {
                    return;
                }

                if (serverNow() > seasonalData.rankingEnd) {
                    // the next ranking will end three days after the last one
                    seasonalData.rankingEnd += 3 * 24 * 60 * 60;
                    seasonalData.rankingRewards = true;
                    Storage.seasonal(seasonalData);
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

    function performPentaDrill(opponentId) {
        const {
            shared: {
                Hero, animations: { loadingAnimation }, general: { hh_ajax, objectivePopup, getDocumentHref }, reward_popup: { Reward }
            }
        } = unsafeWindow;

        loadingAnimation.start();

        //open the battle page first
        const battleHref = getDocumentHref('/penta-drill-battle.html');
        const battleURL = battleHref + `${battleHref.includes('?') ? '&' : '?'}id_opponent=${opponentId}&number_of_battles=1`;
        $.ajax({
            url: battleURL,
            success: function () {
                //change referer
                unsafeWindow.history.replaceState(null, '', battleURL);
                const params = {
                    action: "do_battles_penta_drill",
                    id_opponent: opponentId,
                    number_of_battles: "1"
                };

                hh_ajax(params, function (data) {
                    loadingAnimation.stop();
                    Reward.handlePopup(data.rewards);
                    Hero.updates(data.hero_changes);
                    objectivePopup.show(data.rewards);
                })
            }
        });
    }

    function pentaDrillArena() {
        $('.opponent-info-container .change-team-container #change_team').each(function() {
            const $performSkip = $(`
                <button id="perform_opponent" class="green_button_L">
                    ${GT.design.perform_tab}! <span class="hudPenta_drill_mix_icn" style="height: 24px;"></span>
                </button>
            `);
            if (!shared.Hero.energies.drill.amount) $performSkip.attr('disabled', '');
            $(this).after($performSkip);

            const preBattleHref = $(this).attr('href');
            const opponentId = URL.parse(window.location.origin + preBattleHref).searchParams.get('id_opponent');

            $performSkip.one('click', () => {
                const $allButtons = $('.green_button_L');
                $allButtons.attr('disabled', '');
                $allButtons.off('click');
                performPentaDrill(opponentId);
            });
        });
    }

    function pentaDrillPreBattle() {
        const $performSkip = $(`
            <button id="perform_opponent" class="green_button_L" style="width: 12rem;">
                ${GT.design.perform_tab} & ${GT.design.battle_skip}!
                <div class="energy-price-container">
                    1 <span class="hudPenta_drill_mix_icn"></span>
                </div>
            </button>
        `);
        if (!shared.Hero.energies.drill.amount) $performSkip.attr('disabled', '');
        const $buttonContainer = $('.middle-container .buttons-container:has(#perform_opponent)');
        $buttonContainer.append($performSkip);
        $buttonContainer.css({
            'width': 'min-content',
            'display': 'flex',
            'flex-direction': 'column',
            'align-items': 'center',
        });

        $performSkip.one('click', () => {
            const $allButtons = $('.green_button_L');
            $allButtons.attr('disabled', '');
            $allButtons.off('click');
            performPentaDrill(opponent_fighter.id_fighter);
        });
    }

    function championsMap() {
        if (CONFIG.champ.noRaid) {
            addStyle(`.love-raid-container { display: none; }`);
        }
    }

    function clubChampion() {
        if (CONFIG.champ.fade) {
            addStyle(`
                .girl-selection__girl-box:has(> div > span[carac="1"]),
                .girl-selection__girl-box:has(> div > span[carac="carac1"]),
                .girl-selection__girl-box:has(> div > span[carac="class1"]),
                .girl-selection__girl-box:has(> div > span[carac="2"]),
                .girl-selection__girl-box:has(> div > span[carac="carac2"]),
                .girl-selection__girl-box:has(> div > span[carac="class2"]) {
                    filter: grayscale(0.5) opacity(0.5);
                }
            `);
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
                    const $visitButtons = $('.pop_thumb_container:not(:has(.pop_thumb_progress_bar[style!="display:none"])) button.blue_button_L[rel=pop_thumb_info][style!="display:none"]');
                    if ($visitButtons.length) {
                        clickOnElement($visitButtons.get(0));
                        $(document).off('keydown');
                    }
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
        if (!shared.Hero.energies.fight.amount) { return; }
        $(document).on('keydown', (e) => {
            if (e.key === ' ') {
                $(document).off('keydown');
                doWhenSelectorAvailable(`.battle-buttons .single-battle-button`, () => {
                    clickOnElement($(`.battle-buttons .single-battle-button`).get(0));
                });
            }
        });
    }

    function trollBattle() {
        skipBattle();
    }

    function pantheon() {
        // space key enters floor
        $(document).on('keydown', (e) => {
            if (e.key === ' ') {
                $(document).off('keydown');
                doWhenSelectorAvailable(`#pantheon_tab_container .pantheon-pre-battle-btn`, () => {
                    clickOnElement($(`#pantheon_tab_container .pantheon-pre-battle-btn`).get(0));
                });
            }
        });
    }

    function pantheonPreBattle() {
        // space key starts single battle
        if (!shared.Hero.energies.worship.amount) { return; }
        $(document).on('keydown', (e) => {
            if (e.key === ' ') {
                $(document).off('keydown');
                doWhenSelectorAvailable(`.battle-buttons .pantheon-single-battle-button`, () => {
                    clickOnElement($(`.battle-buttons .pantheon-single-battle-button`).get(0));
                });
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
            $('a.love-raid-container.raid').each(function() {
                const id = +URL.parse(this.href).searchParams.get('raid');
                const raid = love_raids.find(raid => raid.id_raid === id);
                if (raid.all_is_owned) {
                    $(this).remove();
                }
            });
        }
    }

    function seasonArena() {
        doASAP(pickBestOpponent, '.sim-chance, .sim-mojo', jQ => jQ.length === 6, 'waiting for rena');

        // 1,2,3 keys start battles against the three opponents
        $(document).on('keydown', (e) => {
            const $performButtons = $(`.season_arena_opponent_container .green_button_L.btn_season_perform`);
            if (e.key === '1' || e.key === '2' || e.key === '3') {
                $(document).off('keydown');
                clickOnElement($performButtons.get(+e.key - 1));
            }
        });

        function pickBestOpponent() {
            const chance = Array.from(document.querySelectorAll('.sim-chance'))
                .map((el) => parseFloat(el.innerText));
            const mojo = Array.from(document.querySelectorAll(
                CONFIG.season.lowMojo ? '.slot_victory_points .amount' : '.sim-mojo'))
                .map((el) => parseFloat(el.innerText));
            const isBetter = CONFIG.season.lowMojo
                ? (newMojo, bestMojo) => (newMojo < bestMojo)
                : (newMojo, bestMojo) => (newMojo > bestMojo);
            let best;
            chance.forEach((c, i) => {
                if (CONFIG.season.useThreshold) {
                    if (chance[i] >= CONFIG.season.threshold
                        && (best === undefined || isBetter(mojo[i], mojo[best]))) {
                        best = i;
                    }
                    return;
                }
                if (best !== undefined && c < chance[best]) return;
                if (best === undefined || c > chance[best] || isBetter(mojo[i], mojo[best])) best = i;
            });
            const bestOpponent = document.querySelector(`.season_arena_opponent_container.opponent-${best}`);
            if (best !== undefined && best > 0) {
                const firstOpponent = document.querySelector(`.season_arena_opponent_container.opponent-0`);
                bestOpponent.remove();
                firstOpponent.before(bestOpponent);
                bestOpponent.classList.add('selected_opponent');
                firstOpponent.classList.remove('selected_opponent');
            }

            // space key starts battle against the best opponent
            if (shared.Hero.energies.kiss.amount) {
                if (best !== undefined && !(CONFIG.season.useThreshold && chance[best] < CONFIG.season.threshold)) {
                    $(document).on('keydown', (e) => {
                        if (e.key === ' ') {
                            $(document).off('keydown');
                            clickOnElement(bestOpponent.querySelector(`.green_button_L.btn_season_perform`));
                        }
                    });
                    log('best opponent chosen');
                    return;
                }
            } else {
                log('none selected for space bar: out of kisses');
                return;
            }
            log('none selected for space bar: opponents suck');
        }
    }

    function seasonBattle() {
        skipBattle();
    }

    function skipBattle() {
        // wait for the battle result
        onAjaxResponse(/action=do_battles_/, () => {
            // space key skips battle, a second press accepts the results
            let okClicked = false, claimClicked = false;
            $(document).on('keydown', (e) => {
                if (e.key === ' ') {
                    if (claimClicked) { return; }
                    const $claimGirlButton = $('#claim-reward');
                    if ($claimGirlButton.length) {
                        clickOnElement($claimGirlButton.get(0));
                        claimClicked =  true;
                        return;
                    }
                    if (okClicked) { return; }
                    const $okButton = $('#rewards_popup button.blue_button_L:not(.play-again)');
                    if ($okButton.length) {
                        clickOnElement($okButton.get(0));
                        okClicked =  true;
                        return;
                    }
                    const $skipButton = $('#new-battle-skip-btn');
                    if ($skipButton.length && $skipButton.css('display') !== 'none') {
                        clickOnElement($skipButton.get(0));
                    }
                }
            });
        });
    }

    function seasonal() {
        const { mega_event_time_remaining } = unsafeWindow;
        const type = getType();
        if (type === undefined) {
            log(`can't tell ME type`);
            return;
        }

        let seasonalData = Storage.seasonal();
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
        Storage.seasonal(seasonalData);

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
            preventAutoPopup(['a.pass-reminder'], '#pass_reminder_popup', '#pass_reminder_popup close');

            if (seasonalData.new) {
                seasonalData = {
                    type: 1, new: false,
                    seasonalEnd: server_now_ts + mega_event_time_remaining,
                };
            }

            if (CONFIG.seasonal.hideSeasonalEventBonusPath) {
                addStyle(`
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
                `);
            }
        }

        function lustyRace() {
            if (seasonalData.new) {
                seasonalData = {
                    type: 2, new: false,
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
                Storage.seasonal(seasonalData);
            });

            if (seasonalData.rankingRewards) {
                doASAP(addRewardConfirmation, '#top_ranking_tab');
                doASAP(addRewardConfirmation, '#event_ranking_tab');
            }

            onAjaxResponse(/action=leaderboard/, (response, opt) => {
                const searchParams = new URLSearchParams(opt.data);
                const feature = searchParams.get('feature');

                if (feature === 'seasonal_event_top') {
                    doWhenSelectorAvailable('#outer-hero-row', () => {
                        const $bottomHeroRow = $('#outer-hero-row');
                        const rank = +$bottomHeroRow.find('.rank').text();
                        if (rank > 1000) { return; }

                        $bottomHeroRow.on('click', () => {
                            $('.hero-row').get(0).scrollIntoView({
                                block: "center",
                                behavior: "smooth",
                                container: "nearest",
                            });
                        });
                    });
                }
            });

            addStyle(`.claim-confirmation .collect_notif.sl_show_chest { display: unset !important; }`);
        }

        function hotAssembly() {
            if (CONFIG.seasonal.hideHotAssemblyBonusPath) {
                $('#get_mega_pass_kobans_btn').attr('disabled', '');
                doWhenSelectorAvailable('#pass_reminder_popup close', () => {
                    clickOnElement($('#pass_reminder_popup close')[0]);
                });
            }

            if (seasonalData.new) {
                seasonalData = {
                    type: 3, new: false,
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
                Storage.seasonal(seasonalData);
            });

            if (seasonalData.rankingRewards) {
                doASAP(addRewardConfirmation, '#event_ranking_tab');
            }

            onAjaxResponse(/action=leaderboard/, (response, opt) => {
                const searchParams = new URLSearchParams(opt.data);
                const feature = searchParams.get('feature');

                if (feature === 'seasonal_event_top') {
                    doWhenSelectorAvailable('#outer-hero-row', () => {
                        const $bottomHeroRow = $('#outer-hero-row');
                        const rank = +$bottomHeroRow.find('.rank').text();
                        if (rank > 1000) { return; }

                        $bottomHeroRow.on('click', () => {
                            $('.hero-row').get(0).scrollIntoView({
                                block: "center",
                                behavior: "smooth",
                                container: "nearest",
                            });
                        });
                    });
                }
            });

            addStyle(`.claim-confirmation .collect_notif.sl_show_chest { display: unset !important;}`);

            if (CONFIG.seasonal.hideHotAssemblyBonusPath) {
                addStyle(`
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
                    }`
                );
            }
        }

        function addRewardConfirmation($rankingTab) {
            const tabId = $rankingTab.attr('id');
            if ($rankingTab.length) {
                $rankingTab.wrapInner(`<div id="${tabId}_confirm" class="claim-confirmation"></div>`);
                $rankingTab.find('.collect_notif').addClass('sl_show_chest');
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
                Storage.seasonal(seasonalData);
                $('#mega-event-tabs .claim-confirmation').off('click');
                $('.sl_show_chest').removeClass('sl_show_chest');
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
            doASAP(addNavigationButtons, '#archive-back, #archive-next');
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

    function labyrinthPoolSelect() {
        if (CONFIG.lab.favorites)
            doASAP(favorites, '.labyrinth-pool-select-container .girl-grid');

        async function favorites() {
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
        }
    }

    function labyrinth() {
        if (CONFIG.lab.favorites)
            doASAP(favorites, '#squad_tab_container .squad-container .girl-grid');

        if (CONFIG.lab.shop)
            doASAP(shop, '#shop_tab_container .item-container .slot');

        if (CONFIG.lab.path) {
            addStyle(`
                .hex-container img:not(.optimal-path) {
                    filter: brightness(.6) grayscale(.6);
                }
            `);
            doASAP(highlightPath, '.floor-container');
        }

        async function favorites() {
            const { girl_squad } = unsafeWindow;
            const favorites = new FavoriteLabGirls();

            const top7 = getTop7(girl_squad.map(girl => girl['member_girl']));

            await runAndRepeatOnChange('#squad_tab_container .squad-container', async () => {
                $('.girl-grid .girl-container').each((i,girl) => {
                    favorites.prepareGirlElement(girl, 'id', top7);
                });

                moveTop7Up(top7, '.girl-grid .girl-container', 'id');
            });
        }

        async function shop() {
            const { GT: { design: { market_new_stock: GT_design_market_new_stock } } } = unsafeWindow;

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
                const oldCycleEnd = Storage.labShopCycleEnd();
                const twelveHours = 12 * 60 * 60;

                const newShopCycleEnd = force || detectRestock() || (oldCycleEnd < server_now_ts)
                    ? Math.min(server_now_ts + cycle_end_in_seconds,  // shop will restock next reset
                        serverNow() + twelveHours)  // shop will restock in 12h
                    : oldCycleEnd;  // shop restock hasn't happened yet
                Storage.labShopCycleEnd(newShopCycleEnd);
                return newShopCycleEnd;

                function detectRestock() {
                    const oldStock = Storage.labShopStock();
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

                    function updateStock() {
                        const currentStock = Array.from($('#shop_tab_container .item-container .slot')).map(parseShopItem);
                        if (currentStock.length === 0) {
                            log(`couldn't read inventory`);
                            return null;
                        }
                        Storage.labShopStock(currentStock);
                        return currentStock;

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
                }
            }
        }

        function highlightPath() {
            /*global labyrinth_grid*/

            const floor = Object.values(labyrinth_grid.floors).find(f=>!f.is_completed);
            if (!floor) return;

            $('.upcoming-hex').removeClass('upcoming-hex');

            const heroPos = getHeroPos();
            const hexValues = getHexValues();

            // replace rows and hexes with arrays to simplify iteration
            floor.rows = Object.values(floor.rows);
            floor.rows.forEach(r => {
                r.hexes = Object.values(r.hexes);
            });

            for (let i = 0; i < floor.rows.length - 1; i++) {
                const row = floor.rows[i];
                const next = floor.rows[i + 1];

                const restrict = row.hexes.length > next.hexes.length;
                for (let j = 0; j < row.hexes.length; j++) {
                    const hex = row.hexes[j];
                    if (restrict) {
                        // the next row is shorter so the edge hexes only have one choice
                        if (hex.id === 1)
                            hex.nextChoices = [j];
                        else if (hex.id === row.hexes.length)
                            hex.nextChoices = [j - 1];
                        else
                            hex.nextChoices = [j - 1, j];
                    }
                    else
                        // the next row is longer so every hex has two choices
                        hex.nextChoices = [j, j + 1];

                    if (hex.type === 'hero')
                        // large value to ensure the already walked path will be highlighted
                        hex.value = 1000;
                    else
                        hex.value = hexValues[hex.type];

                    hex.totalValue = null;
                }
            }

            // iterate backwards from the boss to find the best path choice for each hex
            floor.rows[floor.rows.length - 1].hexes[0].totalValue = 0;
            for (let i = floor.rows.length - 2; i >= 0; i--) {
                const row = floor.rows[i];
                const nextHexes = floor.rows[i + 1].hexes;
                for (const hex of row.hexes) {
                    for (const choice of hex.nextChoices) {
                        const sum = hex.value + nextHexes[choice].totalValue;
                        if (!hex.totalValue || sum > hex.totalValue) {
                            hex.nextStep = choice;
                            hex.totalValue = sum;
                        }
                    }
                }
            }

            // highlight the best path
            let bestHexIndex = 0;
            for (const row of floor.rows) {
                const hex = row.hexes[bestHexIndex];
                $(`#row_${row.id} #hex_${hex.id} img`).addClass('optimal-path');
                bestHexIndex = hex.nextStep;
            }

            // in case a bag or wings are collected the path might have to change
            const observer = new MutationObserver(() => {
                const newHeroPos = getHeroPos();
                if (newHeroPos.toString() !== heroPos.toString()) {
                    observer.disconnect();
                    // update hexes in the row the hero moved to
                    for (const hex of floor.rows[newHeroPos[0]].hexes) {
                        if (hex.id - 1 === newHeroPos[1])
                            hex.type = 'hero';
                        else
                            hex.is_skipped = true;
                    }
                    highlightPath();
                }
            });
            observer.observe($(`.floor-container[floor_number="${floor.id}"]`).parent().get(0), {childList: true, subtree: true});

            function getHexValues() {
                switch (Storage.labPathStrategy()) {
                    case LAB_STRATEGIES.xp.id:
                        return {
                            opponent_super_easy: 10,
                            opponent_easy: 15,
                            opponent_medium: 20,
                            opponent_hard: 25,
                            treasure: 1,
                            shrine: 0,
                        };
                    case LAB_STRATEGIES.coins.id:
                        return {
                            opponent_super_easy: 1,
                            opponent_easy: 2,
                            opponent_medium: 3,
                            opponent_hard: 4,
                            treasure: 100,
                            shrine: 0,
                        };
                    case LAB_STRATEGIES.kisses.id:
                        return {
                            opponent_super_easy: 1,
                            opponent_easy: 1,
                            opponent_medium: 10,
                            opponent_hard: 12,
                            treasure: 3,
                            shrine: 0,
                        };
                    case LAB_STRATEGIES.fists.id:
                        return {
                            opponent_super_easy: 1,
                            opponent_easy: 1,
                            opponent_medium: 5,
                            opponent_hard: 25,
                            treasure: 10,
                            shrine: 0,
                        };
                    default:
                        throw `unknown strategy ${Storage.labPathStrategy()}`
                }
            }

            function getHeroPos() {
                const $heroHex = $(`.floor-container[floor_number="${floor.id}"] img.hex-type.hero:not(.completed-hex)`);
                const rowId = $heroHex.parent().parent().attr('key');
                const hexId = $heroHex.attr('hex_id');
                return [rowId - 1, hexId - 1];
            }
        }
    }

    function editLabyrinthTeam() {
        if (CONFIG.lab.favorites)
            doASAP(favorites, '.harem-panel-girls');

        async function favorites() {
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
        }
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
        doWhenSelectorAvailable('#grid_tab_container', function() {
            $(document).on('keydown', (e) => {
                if (e.key === ' ') {
                    const $ok = $('#rewards_popup .blue_button_L[confirm_blue_button]');
                    if ($ok.length) {
                        clickOnElement($ok.get(0));
                        return;
                    }
                    const $generate = $('.generate-new-grid.green_button_L:not([disabled])');
                    if ($generate.length) {
                        clickOnElement($generate.get(0));
                        return;
                    }
                    const $tile = $('.grid-slot.locked');
                    if ($tile.length) {
                        clickOnElement($tile.get(0));
                    }
                }
            });

            runAndRepeatOnChange('#grid_tab_container', function() {
                const $grid = $('#grid_tab_container');
                const tilesLeft = $grid.find('.grid-slot.locked').length;
                const coinsLeft = 26 - getClaimedAmount('.slot_sultry_coins');
                const keysLeft = 4 - getClaimedAmount('.slot_progressions');

                const $generateButton = $('button.generate-new-grid');
                $generateButton.removeClass(['blue_button_L', 'red_button_L', 'green_button_L']);
                $generateButton.addClass(
                    (coinsLeft + keysLeft) / tilesLeft >= 0.75 ? 'red_button_L' : 'green_button_L'
                );

                function getClaimedAmount(cls) {
                    return $grid.find(`.grid-slot.unlocked ${cls} .amount`).get()
                        .reduce((sum, el) => sum + (+el.innerText), 0);
                }
            });
        });
    }

    function PoA() {
        preventAutoPopup(['a.pass-reminder'], '#pass_reminder_popup', '#pass_reminder_popup close.closable')
    }

    function DP() {
        preventAutoPopup(['a.pass-reminder'], '#pass_reminder_popup', '#pass_reminder_popup close.closable')
    }

    function log(...args) {
        console.log('HH suckless:', ...args);
    }

    function formatTime(seconds) {
        const days = Math.floor(seconds / 60 / 60 / 24);
        const d = days + GT.time.d;

        const hours = Math.floor(seconds / 60 / 60) % 24;
        const h = hours + GT.time.h;

        const minutes = Math.floor(seconds / 60) % 60;
        const m = minutes + GT.time.m;

        const secs = Math.floor(seconds) % 60;
        const s = secs + GT.time.s;

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
            doASAP(($btn)=> {
                $btn.on('click', () => { manualClick = true; })
            }, button);
        }
        doASAP(()=>{
            if (!manualClick) {
                clickOnElement($(close)[0]);
            }
        }, check);
    }

    function doASAP(callback, selector, condition = (jQ) => jQ.length, waitMessage = null) {
        const $selected = $(selector);
        if (condition($selected)) {
            callback($selected);
        } else {
            if (waitMessage) log(waitMessage);
            const observer = new MutationObserver(() => {
                const $selected = $(selector);
                if (condition($selected)) {
                    observer.disconnect();
                    callback($selected);
                }
            })
            observer.observe(document.documentElement, {childList: true, subtree: true});
        }
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

    function addStyle(css) {
        const sheet = document.createElement('style');
        sheet.textContent = css;
        document.head.appendChild(sheet);
    }

    function exposeFunction(f) {
        (unsafeWindow.suckless ??= {})[f.name] = f;
    }

    function loadConfig() {
        // defaults
        let config = {
            reload:
                { enabled: true },
            noThrottle:
                { enabled: false },
            activities:
                { enabled: false, popBar: false, popShortcuts: false },
            girlPreview:
                { enabled: true },
            heroEquip:
                { enabled: true },
            quest:
                { enabled: true, highRes: true, nav: true },
            champ:
                { enabled: false, fade: false, noRaid: false },
            villain:
                { enabled: true },
            pantheon:
                { enabled: true },
            drill:
                { enabled: true },
            season:
                { enabled: true, useThreshold: false, threshold: 100, lowMojo: false },
            seasonal:
                { enabled: true, home: true, hideHotAssemblyBonusPath: false , hideSeasonalEventBonusPath: false },
            lab:
                { enabled: true, favorites: true, shop: true, path: true },
            editTeam:
                { enabled: false },
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

        addStyle(`
            h4.suckless.selected::after {
                content: 'v${GM_info.script.version}';
                display: block;
                position: absolute;
                top: -10px;
                right: -15px;
                font-size: 10px;
            }
            h4.suckless.selected:last-child::after { right: 0; }
        `);

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
                baseKey: 'noThrottle',
                label: `prevent throttling in background`,
                default: false,
            },
            run() {
                config.noThrottle = {
                    enabled: true,
                };
            },
        });
        config.noThrottle.enabled = false;

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
                baseKey: 'heroEquip',
                label: 'show resonance indicators on hero equip',
                default: true,
            },
            run() {
                config.heroEquip = {
                    enabled: true,
                };
            },
        });
        config.heroEquip.enabled = false;

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
                baseKey: 'drill',
                label: 'improved penta drill fights',
                default: true,
            },
            run() {
                config.drill = {
                    enabled: true,
                };
            },
        });
        config.drill.enabled = false;

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'season',
                label: 'improved season',
                default: true,
                subSettings: [
                    { key: 'useThreshold', default: false,
                        label: `pick opponent by mojo if chance is at least <span><input type="text" id="season-threshold-input" placeholder="" style="text-align: center; height: 1rem; width: 2rem;">%</span> and disable space bar if there are none`,
                    },
                    { key: 'lowMojo', default: false,
                        label: `stay away from the great wall of fuck you`,
                    },
                ],
            },
            run(subSettings) {
                config.season = {
                    enabled: true,
                    useThreshold: subSettings.useThreshold,
                    threshold: Storage.seasonChanceThreshold(),
                    lowMojo: subSettings.lowMojo,
                };
            },
        });
        config.season.enabled = false;

        doWhenSelectorAvailable('#season-threshold-input', () => {
            const $input = $('#season-threshold-input');
            let threshold = Storage.seasonChanceThreshold();
            $input.val(threshold.toString());
            $input.on('focusout', () => {
                const input = parseFloat($input.val());
                threshold = isNaN(input) ? 0 : Math.min(100, Math.max(0, input));
                Storage.seasonChanceThreshold(threshold);
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
                label: 'improved labyrinth/WBT',
                default: true,
                subSettings: [
                    { key: 'favorites', default: true,
                        label: 'mark girls as favorites',
                    },
                    { key: 'shop', default: true,
                        label: 'fix shop timer',
                    },
                    { key: 'path', default: true,
                        label: `highlight optimal path to maximize
                            <div id="labStrategySelector"></div>`,
                    },
                ],
            },
            run(subSettings) {
                config.lab = {
                    enabled: true,
                    favorites: subSettings.favorites,
                    shop: subSettings.shop,
                    path: subSettings.path,
                };
            },
        });
        config.lab.enabled = false;
        doASAP(($labStrategySelector) => {
            addStyle(`
                #labStrategySelector {
                    display: flex;
                    div { display: flex }
                    label {
                        margin-bottom: -4px;
                        margin-right: 4px;
                        span {
                            width: 20px;
                            height: 20px;
                            background-size: contain;
                        }
                    }
                }
            `);
            const saved = Storage.labPathStrategy();
            Object.entries(LAB_STRATEGIES).forEach(([name, {id, iconClass}]) => {
                const $radioBtn = $(`
                    <div>
                        <input type="radio" name="strategy" value="${id}" id="strategy_${name}" ${id === saved ? 'checked' : ''}>
                        <label for="strategy_${name}"><span class="${iconClass}"></span></label>
                    </div>
                `);
                $radioBtn.children('input').on('change', function () {
                    if (this.checked) Storage.labPathStrategy(id);
                });
                $labStrategySelector.append($radioBtn);
            })
        }, '#labStrategySelector')

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

        registerModule({
            group: 'suckless',
            configSchema: {
                baseKey: 'broke',
                label: `I'm broke :(`,
                default: false,
            },
            run() {
                if (this.hasRun) return;
                this.hasRun = true;

                /*global season_has_pass*/
                if (!season_has_pass) {
                    // season - hide path and adjust tier labels
                    addStyle(`
                        #gsp_btn_holder { display: none !important; }
                        .pass_reward.reward_wrapper { display: none !important; }
                        .rewards_seasons_row .rewards_pair .tier_number { top: 100% !important; }`
                    );

                }

                // ME - hide shop button and bundles
                addStyle(`
                    #get_mega_pass_shop_btn { display: none !important; }
                    #bundles_tab { display: none !important; }`
                );

                // ?
                addStyle(`
                    .purchase-shop { display: none !important; }`
                );
            },
        });

        hhLoadConfig();
        runModules();

        return config;
    }
})();
