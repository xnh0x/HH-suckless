(function() {
    class Settings {
        static init() {
            const $selected = $('.settings-wrapper .settings-container .tabs-switcher');
            if ($selected.length) {
                this.#initTabSwitcher($selected);
            } else {
                const observer = new MutationObserver(() => {
                    const $selected = $('.settings-wrapper .settings-container .tabs-switcher');
                    if ($selected.length) {
                        observer.disconnect();
                        this.#initTabSwitcher($selected);
                    }
                })
                observer.observe(document.documentElement, {childList: true, subtree: true});
            }
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
    }

    if (window.location.pathname === '/settings.html') {
        Settings.init();
        window.Settings = Settings;
    }
})();