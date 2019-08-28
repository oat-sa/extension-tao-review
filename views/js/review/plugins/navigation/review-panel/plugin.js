/**
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2019 Open Assessment Technologies SA ;
 */
/**
 * @author Jean-Sébastien Conan <jean-sebastien@taotesting.com>
 */
define([
    'core/promiseTimeout',
    'taoTests/runner/plugin',
    'taoReview/review/plugins/navigation/review-panel/panel'
], function (
    promiseTimeout,
    pluginFactory,
    reviewPanelFactory
) {
    'use strict';

    /**
     * Test Review Plugin : Review Panel
     * Displays a navigation panel allowing to see the whole test structure and give access to each element
     */
    return pluginFactory({
        name: 'review-panel',

        /**
         * Initialize the plugin (called during runner's init)
         */
        init() {
            this.getTestRunner()
                .on('enablenav', () => this.enable())
                .on('disablenav', () => this.disable());
        },

        /**
         * Called during the runner's render phase
         */
        render() {
            return promiseTimeout(new Promise(resolve => {
                const testRunner = this.getTestRunner();
                const reviewPanel = reviewPanelFactory(
                    this.getAreaBroker().getPanelArea(),
                    this.getConfig(),
                    testRunner.getTestMap()
                );

                // control the test runner from the review panel
                reviewPanel
                    .on('itemchange', (itemRef, position) => testRunner.jump(position, 'item'))
                    .on('ready', resolve);

                // reflect the test runner state to the review panel
                testRunner
                    .on('loaditem', itemRef => reviewPanel.setActiveItem(itemRef))
                    .on(`plugin-show.${this.getName()}`, () => reviewPanel.show())
                    .on(`plugin-hide.${this.getName()}`, () => reviewPanel.hide())
                    .on(`plugin-enable.${this.getName()}`, () => reviewPanel.enable())
                    .on(`plugin-disable.${this.getName()}`, () => reviewPanel.disable())
                    .on('destroy', () => reviewPanel.destroy());
            }));
        }
    });
});
