(function() {
    // not needed outside of settings
    if (window.location.pathname !== '/settings.html') return;

    // already initialized
    if (unsafeWindow.HHSettings) return;

    function doASAP(callback, selector, condition = (jQ) => jQ.length) {
        const $selected = $(selector);
        if (condition($selected)) {
            callback($selected);
        } else {
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

    function addStyle(css) {
        const sheet = document.createElement('style');
        sheet.textContent = css;
        document.head.appendChild(sheet);
    }

    function createRandomID()
    {
        return Math.random().toString(36).replace('0.','');
    }

    function initTabSwitcher($tabSwitcher) {
        if ($tabSwitcher.attr('init') === 'true') return;
        $tabSwitcher.attr('init', 'true');

        $tabSwitcher.find('.slider').remove();

        $tabSwitcher.on('click', (e) => {
            if (e.target === e.currentTarget) return;

            $tabSwitcher.find('.underline-tab').each(function () {
                $(this).removeClass('underline-tab');
                $(this).removeClass('tab-switcher-fade-in');
                $(this).addClass('tab-switcher-fade-out');
            });
            $('.switch-tab-content').css('display', 'none');

            const $target = $(e.target);
            $target.removeClass('tab-switcher-fade-out');
            $target.addClass('tab-switcher-fade-in');
            $target.addClass('underline-tab');
            $(`#${$target.attr('data-tab')}`).css('display', 'flex');
        });

        $tabSwitcher.addClass('hh-scroll');

        addStyle(`
            .tabs-switcher {
                column-gap: 10px;
                width: 94%;
                margin-left: 3%;
            }
            .tabs-switcher .switch-tab {
                flex-shrink: 0;
                margin-left: unset;
            }
            .underline-tab::after {
                display: block;
                position: absolute;
                top: -15px;
                right: -15px;
                font-size: 10px;
                color: #a1624a;
            }
        `);
    }

    class SettingsTab {
        constructor(title, version = null) {
            const randomID = createRandomID();
            this.tabId = `HH-settings-${randomID}-tab`;
            this.contentId = `HH-settings-${randomID}-content`;

            this.$switchTab = $(`<div id="${this.tabId}" class="switch-tab tab-switcher-fade-out" data-tab="${this.contentId}">${title}</div>`);
            // prevent HH from adding listeners to this tab
            this.$switchTab.get(0).addEventListener = () => {};
            this.$switchTabContent = $(`<div id="${this.contentId}" class="switch-tab-content hh-scroll hh-settings" style="display: none;"></div>`);

            this.#addTab(this.$switchTab, this.$switchTabContent);

            this.#addVersion(version);
        }

        #addVersion(version) {
            if (version === null) return;

            addStyle(`
                #${this.tabId}.underline-tab::after {
                    content: 'v${version}';
                }
            `);
        }

        #addTab($switchTab, $switchTabContent) {
            doASAP(
                ($container) => {
                    const $tabsSwitcher = $container.find('.tabs-switcher');
                    $tabsSwitcher.append($switchTab);
                    const $settingTabs = $container.find('.panels__settings-switch');
                    $settingTabs.append($switchTabContent);
                },
                '.settings-wrapper .settings-container',
            );
        }

        addOption($option) {
            this.$switchTabContent.append($option);
        }
    }

    function createSettingsTab(title, version = null){
        return new SettingsTab(title, version);
    }

    function exposeFunction(f) {
        (unsafeWindow.HHSettings ??= {})[f.name] ??= f;
    }

    function init() {
        doASAP(
            initTabSwitcher,
            '.settings-wrapper .settings-container .tabs-switcher',
        );
        exposeFunction(createSettingsTab);
        $(document).trigger('HHSettings:init');
    }

    // check for jQuery
    if (unsafeWindow.$) {
        init();
    } else {
        const observer = new MutationObserver(() => {
            if (!unsafeWindow.$) return;
            observer.disconnect();
            init();
        })
        observer.observe(document.documentElement, {childList: true, subtree: true});
    }
})();