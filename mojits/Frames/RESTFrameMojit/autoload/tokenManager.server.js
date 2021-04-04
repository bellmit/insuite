/**
 * User: pi
 * Date: 04.12.17  15:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'tokenManager', function( Y, NAME ) {
    const
        async = require( 'async' );

    class TokenManager {
        hasApiAccess( params, callback ) {
            const
                { friend, api, rest, dcServerType } = params;
            if( api && 'function' === typeof api.checkApiAccess && !dcServerType ) {
                api.checkApiAccess( { friend, rest }, callback );
            } else {
                this.checkApiAccess( { dcServerType, rest }, callback );
            }

        }

        checkApiAccess( params, callback ) {
            const
                { dcServerType, rest } = params;
            let
                error;
            switch( dcServerType ) {
                case Y.doccirrus.auth.friendsList.PUC:
                case Y.doccirrus.auth.friendsList.VPRC:
                case Y.doccirrus.auth.friendsList.PRC:
                case Y.doccirrus.auth.friendsList.DCPRC:
                case Y.doccirrus.auth.friendsList.DeviceServer:
                case Y.doccirrus.auth.friendsList.Cardreader:
                case Y.doccirrus.auth.friendsList.ISD:
                case Y.doccirrus.auth.friendsList.WWW:
                    break;
                default:
                    Y.log( `Default api access checker: ${dcServerType} does not have ${rest.action} api access`, 'warn', NAME );
                    error = new Y.doccirrus.commonerrors.DCError( 401 );
            }
            setImmediate( callback, error );
        }

        getApiUser( params, callback ) {
            const
                { friend, rest, api } = params;
            if( api && api.getApiUser ) {
                api.getApiUser( {
                    friend,
                    rest
                }, callback );
            } else {
                this.getDefaultApiUser( {
                    rest,
                    friend
                }, callback );
            }
        }

        getDefaultApiUser( params, callback ) {
            let
                defaultUser;

            if( params.friend ) {
                defaultUser = Object.assign( {}, params.rest.user, { U: params.friend } );
            } else {
                // Means this is coming from Oauth so don't override user.U parameter
                Y.log(`Y.doccirrus.tokenManager.getDefaultApiUser called with Oauth request. param.rest.user.U = ${params.rest.user.U}`, "info", NAME);
                defaultUser = Object.assign( {}, params.rest.user );
            }

            setImmediate( callback, null, defaultUser );
        }

        checkApiAccessAndGetUser( params, callback ) {
            const
                self = this;
            async.waterfall( [
                function( next ) {
                    self.hasApiAccess( params, next );
                },
                function( next ) {
                    self.getApiUser( params, next );
                }
            ], callback );
        }
    }

    Y.namespace( 'doccirrus' ).tokenManager = new TokenManager();
}, '0.0.1', {
    requires: [ 'dcauth' ]
} );