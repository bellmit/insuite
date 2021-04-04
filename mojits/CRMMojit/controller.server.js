/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint node:true, nomen:true*/
/*global YUI */


YUI.add( 'CRMMojit', function( Y, NAME ) {

        /**
         * The CRMMojit module.
         *
         * @module CRM
         */

        const
            _ = require( 'lodash' );

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method corresponding to the 'index' action.
             *
             * @param {Object} ac The ActionContext that provides access
             *        to the Mojito API.
             */
            'crm_nav': function( ac ) {
                let
                    user = ac.http.getRequest() && ac.http.getRequest().user,
                    isAllowedToUseCRM = Y.doccirrus.auth.isDCPRC() || Y.doccirrus.auth.isVPRCAdmin( user ),
                    catalogDescriptors,
                    countryCode = Y.doccirrus.auth.getCountryCode( user );
                Y.log( 'Entering index...', 'debug', NAME );

                // @todo: change this as soon as we have a true dcprc in production
                if( Y.doccirrus.auth.hasSectionAccess( user, 'CRMMojit.crm_nav' ) && isAllowedToUseCRM ) {
                    ac.assets.addCss( './css/mis.css' );
                    // remove and allow caching for production TODO
                    //ac.assets.addBlob('name = "Cache-Control" content = "no-cache"', 'top');
                    //ac.assets.addBlob('name = "Pragma" content = "no-cache"', 'top');

                    catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                        {
                            actType: '',
                            country: countryCode || 'D'
                        } );

                    // MOJ-3453: if country has no catalogs fall back to german catalogs
                    if( _.isEmpty( catalogDescriptors ) ) {
                        catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                            actType: '',
                            country: 'D'
                        } );
                    }

                    ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

                    ac.done( {
                        status: 'Mojito is working.',
                        data: {}
                    }, {} );
                } else {
                    Y.doccirrus.utils.redirect( '/', ac );
                }
            }
        };
    },
    '0.0.1', {requires: [
        'mojito',
        'dcauth',
        'mojito-assets-addon',
        'mojito-models-addon',
        'mojito-params-addon',
        'mojito-config-addon',
        'mojito-data-addon',
        'mojito-http-addon',
        'addons-viewengine-jade',
        'mojito-intl-addon'
    ]}
)
;