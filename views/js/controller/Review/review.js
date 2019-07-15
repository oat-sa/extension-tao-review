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
    'lodash',
    'i18n',
    'module',
    'taoReview/review/runner'
], function (
    $,
    _,
    __,
    module,
    previewerFactory
) {
    'use strict';

    /**
     * Controls the taoProctoring delivery page
     *
     * @type {Object}
     */
    return {
        /**
         * Entry point of the page
         */
        start() {
            const uri = {
                resultId: 'http://bosa/bosa3.rdf#i1562597019959151',
                deliveryUri: 'http://bosa/bosa3.rdf#i15625969425625'
            };

            previewerFactory(document.querySelector(".content-wrap"), {
                testUri: uri,
                readOnly: true,
                fullPage: false
            });
        }
    };
});