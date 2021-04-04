/**
 * User: rrrw
 * Date: 25.11.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * URL Naming standards for DC REST URLS
 */


/*jslint anon:true, nomen:true, todo:true*/
/*global YUI */

YUI.add( 'dcurls', function( Y ) {

        'use strict';

        var dcUrl = {
            // CONST param NAMES USED IN URI
            // these are RESERVED WORDS and MUST NOT be used in forms as input field id's or names.
            PARAM_ERRORS: 'errors',
            PARAM_WARNINGS: 'warnings',
            PARAM_LIMIT: 'itemsPerPage',
            PARAM_PAGE: 'page',
            PARAM_COUNT: 'totalItems',
            PARAM_CODE: 'replyCode',
            PARAM_PAGING: 'paging',
            PARAM_RESULT: 'Results',
            PARAM_DATA: 'data',
            PARAM_SORT: 'sort',
            PARAM_SEARCH: 'query',
            PARAM_PROJECT: 'fields',
            PARAM_ACTION: 'action',
            PARAM_QUIET: 'quiet',
            // populate function
            PARAM_OBJPOPULATE: 'objPopulate',
            PARAM_POPULATE: 'populate',
            PARAM_UPSERT: 'upsert',
            PARAM_PURE_LOG: 'pureLog',
            PARAM_COLLATION: 'collation',
            PARAM_NO_COUNT_LIMIT: 'noCountLimit'
        };

        Y.namespace( 'doccirrus' ).urls = dcUrl;

    },
    '0.0.1', {requires: []}
);
