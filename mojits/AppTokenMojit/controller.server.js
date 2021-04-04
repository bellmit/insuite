/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint node:true, nomen:true*/
/*global YUI */


YUI.add( 'AppTokenMojit', function( Y, NAME ) {

        /**
         * The AppTokenMojit module.
         *
         * @module AppTokenMojit
         */

        Y.namespace( 'mojito.controllers' )[NAME] = {

            'appToken': function( ac ) {
                const
                    user = ac.http.getRequest() && ac.http.getRequest().user,
                    meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.APP_TOKEN' ) };
                Y.log( 'Entering index...', 'debug', NAME );
                if( Y.doccirrus.auth.hasSectionAccess( user, 'AppTokenMojit.appToken' ) && Y.doccirrus.auth.isDCPRC() ) {
                    ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
                    ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'appToken.bundle.js' ), 'bottom' );
                    ac.done( {}, meta );
                } else {
                    Y.doccirrus.utils.redirect( '/', ac );
                }
            },

            'appAccessManager': function( ac ) {
                const
                    user = ac.http.getRequest() && ac.http.getRequest().user,
                    testLicense = Y.doccirrus.licmgr.hasSupportLevel( user.tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST ),
                    meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.APP_ACCESS_MANAGER' ) };

                Y.log( 'Entering index...', 'debug', NAME );

                Y.doccirrus.api.appreg.get( {
                    query: {},
                    options: {limit: 1},
                    callback: ( err, res ) => {
                        if( err ) {
                            Y.log( `Error occurred while querying appreg to check if at least one app licensed: ${err}`, 'error', NAME );
                            ac.done( {
                                status: '500',
                                data: err
                            } );
                        } else {
                            if( Y.doccirrus.auth.hasSectionAccess( user, 'AppTokenMojit.appAccessManager' ) && ( testLicense || ( res && Array.isArray( res ) && res.length ) ) ) {
                                ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
                                ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'appAccessManager.bundle.js' ), 'bottom' );
                                ac.assets.addCss( './css/appAccessManager.css' );
                                ac.assets.addCss( './css/solDocumentation.css' );
                                ac.done( {}, meta );
                            } else {
                                Y.log( `Access Denied: Either Test licence (${testLicense}) is not on or not even a single Sol is licenced ... aborting`, 'info', NAME );
                                Y.doccirrus.utils.redirect( '/', ac );
                            }
                        }
                    }
                } );
            },

            'appNav': function( ac ) {
                const
                    user = ac.http.getRequest() && ac.http.getRequest().user,
                    meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.APP_ACCESS_MANAGER' ) };
                Y.log( 'Entering index...', 'debug', NAME );
                if( Y.doccirrus.auth.hasSectionAccess( user, 'AppTokenMojit.appNav' ) ) {
                    ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
                    ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'appNav.bundle.js' ), 'bottom' );
                    ac.done( {}, meta );
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
        'mojito-http-addon',
        'addons-viewengine-jade',
        'mojito-intl-addon'
    ]}
);