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
 * Copyright (c) 2015-2019 (original work) Open Assessment Technologies SA ;
 */
define([
    'jquery',
    'ui/feedback',
    'core/logger',
    'taoReview/review/component/qtiTestReviewComponent'
], function (
    $,
    feedback,
    loggerFactory,
    reviewFactory
) {
    'use strict';

    /**
     * Create a dedicated logger
     */
    const logger = loggerFactory('taoReview/controller');

    /**
     * Controls the taoReview delivery page
     *
     * @type {Object}
     */
    return {
        /**
         * Entry point of the page
         */
        start() {

            const $container = $('.container');
            const {execution, delivery, showScore, showCorrect} = $container.data();

            reviewFactory($(".content-wrap", document), {
                testUri: {
                    resultId: execution,
                    deliveryUri: delivery
                },
                showScore,
                showCorrect,
                readOnly: true,
                plugins: [{
                    module: 'taoReview/review/plugins/navigation/review-panel/plugin',
                    bundle: 'taoReview/loader/qtiReview.min',
                    category: 'navigation'
                }, {
                    module: 'taoReview/review/plugins/navigation/next-prev/plugin',
                    bundle: 'taoReview/loader/qtiReview.min',
                    category: 'navigation'
                }, {
                    module: 'taoReview/review/plugins/content/item-answer/plugin',
                    bundle: 'taoReview/loader/qtiReview.min',
                    category: 'content'
                }]
            })
            .on('error', err => {
                logger.error(err);
                if (err && err.message) {
                    feedback().error(err.message);
                }
            } );
        }
    };
});
