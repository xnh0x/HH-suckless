(function() {
    class Settings {
        static init() {
            doASAP(
                Settings.#initTabSwitcher,
                '.settings-wrapper .settings-container .tabs-switcher',
            );
        }

        static #initTabSwitcher($tabSwitcher) {
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

            const sheet = document.createElement('style');
            sheet.textContent = `
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
            `;
            document.head.appendChild(sheet);
        };

        static addTab(id_prefix, title, $content, version = null) {
            doASAP(
                ($container) => Settings.#addTab($container, id_prefix, title, $content, version),
                '.settings-wrapper .settings-container',
            );
        }

        static #addTab($container, id_prefix, title, $content, version) {
            const $tabsSwitcher = $container.find('.tabs-switcher');
            const $switchTab = $(`<div id="${id_prefix}-tab" class="switch-tab tab-switcher-fade-out" data-tab="${id_prefix}_tab_container">${title}</div>`);
            // prevent HH from adding listeners to this tab
            $switchTab.get(0).addEventListener = () => {};
            $tabsSwitcher.append($switchTab);

            const $settingTabs = $container.find('.panels__settings-switch');
            const $settingTab = $(`<div id="${id_prefix}_tab_container" class="switch-tab-content hh-scroll" style="display: none;"></div>`);
            $settingTab.append($content);
            $settingTabs.append($settingTab);

            if (version) {
                const sheet = document.createElement('style');
                sheet.textContent = `
                    #${id_prefix}-tab.underline-tab::after {
                        content: 'v${version}';
                    }
                `;
                document.head.appendChild(sheet);
            }
        }
    }

    if (window.location.pathname === '/settings.html') {
        Settings.init();
        unsafeWindow.Settings = {
            addTab: Settings.addTab,
        };
    }

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
})();