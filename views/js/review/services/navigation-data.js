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
 * Helper that will build the dataset for the review panel in the expected format
 * @author Jean-Sébastien Conan <jean-sebastien@taotesting.com>
 */
define([
    'lodash'
], function (_) {
    'use strict';

    /**
     * @typedef {Object} scoredEntry
     * @property {Number} score - The test taker's score for this item
     * @property {Number} maxScore - The max possible score for this item
     */

    /**
     * @typedef {scoredEntry} mapEntry
     * @property {String} id - The element identifier
     * @property {String} label - The displayed label
     * @property {Number} position - The position of the item within the test
     * @property {Boolean} [informational] - If the item is informational
     * @property {Boolean} [skipped] - If the item has been skipped
     */

    /**
     * Compares two objects by their position properties
     * @param {mapEntry} a
     * @param {mapEntry} b
     * @returns {Number}
     */
    const compareByPosition = (a, b) => a.position - b.position;

    /**
     * Extracts data from a mapEntry
     * @param {mapEntry} entry
     * @returns {mapEntry}
     */
    const extractData = entry => {
        const {id, label, position, informational, skipped, score, maxScore} = entry || {};
        const data = {id, label, position, score, maxScore};
        if ('undefined' !== typeof informational) {
            data.informational = informational;
        }
        if ('undefined' !== typeof skipped) {
            data.skipped = skipped;
        }
        return data;
    };

    /**
     * Makes sure the score is computed on a collection
     * @param {Object|Array} collection
     * @param {String} property
     * @returns {scoredEntry}
     */
    const computeScore = (collection, property) => {
        let score = 0;
        let maxScore = 0;
        return {
            [property]: _.mapValues(collection, item => {
                item.score = item.score || 0;
                item.maxScore = item.maxScore || 0;

                score += item.score;
                maxScore += item.maxScore;

                return item;
            }),
            score,
            maxScore
        };
    };

    /**
     * Manages the test map in order to allow to filter it.
     * Refines the test map to provide the dataset expected by the review panel
     * @param {testMap} testMap
     * @returns {navigationDataService}
     */
    function navigationDataServiceFactory(testMap = {}) {
        let filteredTestMap;

        /**
         * @typedef {Object} navigationDataService
         */
        const navigationDataService = {
            /**
             * Gets the filtered test map
             * @returns {testMap}
             */
            getMap() {
                return filteredTestMap;
            },

            /**
             * Sets the former test map
             * @param {testMap} map
             * @returns {navigationDataService}
             */
            setMap(map) {
                testMap = this.computeMap(map);
                this.filterMap();
                return this;
            },

            /**
             * Filters the former map by the provider filter callback.
             * Any item for which the filter returns true will be kept.
             * Empty sections and empty parts will be discarded.
             * @param {Function} filter
             * @returns {navigationDataService}
             * @throws TypeError when the filter is not a function
             */
            filterMap(filter = () => true) {
                if (!_.isFunction(filter)) {
                    throw new TypeError('A filter must be a function!');
                }

                filteredTestMap = Object.assign({}, testMap, {
                    parts: _.reduce(testMap.parts, (parts, part, partId) => {
                        part = Object.assign({}, part, {
                            sections: _.reduce(part.sections, (sections, section, sectionId) => {
                                section = Object.assign({}, section, {
                                    items: _.pick(section.items, filter)
                                });
                                if (_.size(section.items)) {
                                    sections[sectionId] = section;
                                }
                                return sections;
                            }, {})
                        });
                        if (_.size(part.sections)) {
                            parts[partId] = part;
                        }
                        return parts;
                    }, {})
                });

                return this;
            },

            /**
             * Computes some properties in the test map, like the score.
             * @param {testMap} map
             * @returns {testMap}
             */
            computeMap(map = {}) {
                // rebuild the map computing the score
                return Object.assign({}, map,
                    computeScore(_.mapValues(map.parts || {}, part => Object.assign({}, part,
                        computeScore(_.mapValues(part.sections || {}, section => Object.assign({}, section,
                            computeScore(section.items || {}, 'items')
                        )), 'sections')
                    )), 'parts')
                );
            },

            /**
             * Refines the test runner data and build the expected review panel map
             * @returns {reviewPanelMap}
             */
            getReviewPanelMap() {
                const {parts, score, maxScore} = this.getMap();

                // rebuild the map keeping only relevant data, and sorting elements by position
                return {
                    parts: _.map(parts, part => Object.assign(extractData(part), {
                        sections: _.map(part.sections, section => Object.assign(extractData(section), {
                            items: _.map(section.items, item => extractData(item))
                                .sort(compareByPosition)
                        })).sort(compareByPosition)
                    })).sort(compareByPosition),
                    score,
                    maxScore
                };
            }
        };

        return navigationDataService
            .setMap(testMap)
            .filterMap();
    }

    return navigationDataServiceFactory;
});
