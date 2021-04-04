/**
 * User: pi
 * Date: 17/08/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'FormPortalMojit', function( Y, NAME ) {

    /**
     *
     * @module FormPortalMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class FormPortalMojit
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[ NAME ] = {

        /**
         *  Method corresponding to the 'formPortal' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        formPortal: function( ac ) {
            let
                req = ac.http.getRequest(),
                { params: { 0: formPortalId } = {}, user } = req,
                dcUtil = require( process.cwd() + '/middleware/dc-util.js' ),
                dcServerMiddleware = dcUtil.getServerMiddleware(),
                dcLogout = dcServerMiddleware.dclogout,
                doLogout = dcLogout && dcLogout.doLogout,
                async = require( 'async' );

            if( user && req.isAuthenticated() ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.formportal.generatePortalToken( {
                            user,
                            data: {
                                formPortalId
                            },
                            callback: function( err, token ) {
                                next( err, token );
                            }
                        } );
                    }, function( token, next ) {
                        Y.doccirrus.api.formportal.registerPortal( {
                            user,
                            data: {
                                remoteAddress: req.headers[ 'x-forwarded-for' ] || req.ip || (req.connection && req.connection.remoteAddress),
                                token: token,
                                portalId: formPortalId
                            },
                            callback( err ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( null, token );
                            }
                        } );
                    }
                ], function( err, token ) {
                    if( err ) {
                        return ac.error( err );
                    }
                    ac.assets.addCss( './css/FormPortalMojit.css' );
                    ac.pageData.set( 'onlyIOInit', true );
                    ac.pageData.set( 'ioOptions', {
                        messagesOnly: true
                    } );
                    ac.pageData.set( 'token', token || '' );
                    ac.pageData.set( 'formPortalId', formPortalId || '' );
                    doLogout( user.sessionId, req );

                    ac.done( {
                        status: 'ok',
                        data: Y.config.insuite || {
                            version: '---'
                        }
                    }, { http: {}, noTopMenu: true } );
                } );
            } else {
                ac.assets.addCss( './css/FormPortalMojit.css' );
                ac.done( {
                    status: 'ok',
                    data: Y.config.insuite || {
                        version: '---'
                    }
                }, { http: {}, noTopMenu: true } );
            }
        }
    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-models-addon',
        'mojito-intl-addon',
        'mojito-data-addon'
    ]
} );