/*
 * User: rrrw
 * Date: 01.01.13  09:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'LoginMojit', function( Y, NAME ) {

    const
        CHROME_MIN_VERSION = 80,
        FF_MIN_VERSION = 72,
        SAFARI_MIN_VERSION = 12,
        MICROSOFT_EDGE_MIN_VERSION = 80,
        i18n = Y.doccirrus.i18n;

    function getTenantId( req ) {
        var
            host = req.host,
            subdomain = (host.split( '.' ).length > 1) ? host.split( '.' )[0] : '',
            tenantId = 0;
        // check tenant
        if( Y.doccirrus.auth.isHexTenantId( subdomain ) ) {
            tenantId = subdomain;
        } else if( Y.doccirrus.auth.isDCPRCRealm( req ) ) {
            tenantId = 0;
        }
        return tenantId;
    }

    /**
     * The LoginMojit module.
     *
     * @module LoginMojit
     */

    function getMinimalVersions() {
        return {
            chrome: CHROME_MIN_VERSION,
            ff: FF_MIN_VERSION,
            safari: SAFARI_MIN_VERSION,
            microsoftEdgeVersion: MICROSOFT_EDGE_MIN_VERSION
        };
    }

    Y.namespace( 'doccirrus.browsersinfo' ).getMinimalVersions = getMinimalVersions;
    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */

    Y.namespace( 'mojito.controllers' )[NAME] = {
        /*
         * checks version of browser based on user agent
         * returns true if ok, else false
         */
        browsercheck: function( ac ) {
            var req = ac.http.getRequest(),
                ua = req.headers['user-agent'],
                r = require( 'ua-parser' ).parse( ua ),
                browserOk = false;
            Y.log( 'Entering browsercheck...' );
            console.log( r ); //eslint-disable-line no-console
            //
            if( Y.doccirrus.auth.isVPRC() ) {
                Y.log( 'HLink check from MS-Office...' );
                browserOk = /ms-office/.exec( ua );
                if( browserOk ) {
                    // shortcut out for medneo
                    return true;
                }
            }
            switch( r.ua.family ) {
                case 'Safari':
                case 'Mobile Safari':
                    if( r.ua.major === undefined ) {
                        Y.log( 'Safari detected but version number is undefined, UA:' + ua, 'warn', NAME );
                        Y.log( 'guess the chrome on android 4.1.1 bug... accept for now... ', 'warn', NAME );

                        // TODO: workaround for the chrome on android 4.1.1 bug
                        // see here https://www.slateone.com/readonly/index/578/Incorrect-chrome-user-agent-for-android-4-1-1
                        browserOk = true;
                    } else if( r.ua.major >= SAFARI_MIN_VERSION ) {
                        Y.log( 'Browser ok, UA:' + ua, 'debug', NAME );
                        browserOk = true;
                    } else {
                        Y.log( 'Safari, version mismatch, UA:' + ua, 'warn', NAME );
                    }
                    break;
                case 'Chrome':
                case 'Chromium':
                case 'Chrome Mobile':
                case 'Chrome Mobile iOS':
                    if( r.ua.major >= CHROME_MIN_VERSION ) {
                        Y.log( 'Browser ok, UA:' + ua, 'debug', NAME );
                        browserOk = true;
                    } else {
                        Y.log( 'Chrome, version mismatch, UA:' + ua, 'warn', NAME );
                    }
                    break;
                case 'Firefox Mobile':
                case 'Firefox':  // Firefox 15+ is fine
                    if( r.ua.major >= FF_MIN_VERSION ) {
                        Y.log( 'Browser ok, UA:' + ua, 'debug', NAME );
                        browserOk = true;
                    } else {
                        Y.log( 'Firefox, version mismatch, UA:' + ua, 'warn', NAME );
                    }
                    break;
                case 'Edge': // Edge versions are fine
                    if( r.ua.major >= MICROSOFT_EDGE_MIN_VERSION ) {
                        Y.log( 'Browser ok, UA:' + ua, 'debug', NAME );
                        browserOk = true;
                    } else {
                        Y.log( 'Edge, version mismatch, UA:' + ua, 'warn', NAME );
                    }
                    break;
                default:
                    Y.log( 'Unknown Browser, UA: ' + ua, 'warn', NAME );
                    console.log( 'UNKNOWN BROWSER, family: ' + r.ua.family ); //eslint-disable-line no-console
                    /*full dump of browser info */
                    // -> "Safari 5.0.1"
                    console.log( r.ua.toString() );        //eslint-disable-line no-console

                    // -> "5.0.1"
                    console.log( r.ua.toVersionString() ); //eslint-disable-line no-console

                    // -> "Safari"
                    console.log( r.ua.family );            //eslint-disable-line no-console

                    // -> "5"
                    console.log( r.ua.major );             //eslint-disable-line no-console

                    // -> "0"
                    console.log( r.ua.minor );             //eslint-disable-line no-console

                    // -> "1"
                    console.log( r.ua.patch );             //eslint-disable-line no-console

                    // -> "iOS 5.1"
                    console.log( r.os.toString() );        //eslint-disable-line no-console

                    // -> "5.1"
                    console.log( r.os.toVersionString() ); //eslint-disable-line no-console

                    // -> "iOS"
                    console.log( r.os.family );            //eslint-disable-line no-console

                    // -> "5"
                    console.log( r.os.major );             //eslint-disable-line no-console

                    // -> "1"
                    console.log( r.os.minor );             //eslint-disable-line no-console

                    // -> null
                    console.log( r.os.patch );             //eslint-disable-line no-console

                    // -> "iPhone"
                    console.log( r.device.family );        //eslint-disable-line no-console

                    break;
            }

            return browserOk;
        },

        wrongbrowser: function( ac ) {
            let url = "/login?browserOk=true";
            Y.log( 'Entering wrongbrowser...' );

            if( Y.doccirrus.auth.isPUC() ) {
                url = "/intime?browserOk=true";
            }

            ac.done( {
                url: url,
                chromeVersion: CHROME_MIN_VERSION,
                ffVersion: FF_MIN_VERSION,
                safariVersion: SAFARI_MIN_VERSION,
                microsoftEdgeVersion: MICROSOFT_EDGE_MIN_VERSION,
                labelNoteI18n: i18n( 'LoginMojit.wrongbrowser.label.NOTE' ),
                text1I18n: i18n( 'LoginMojit.wrongbrowser.text.TEXT1' ),
                text2I18n: i18n( 'LoginMojit.wrongbrowser.text.TEXT2' ),
                installNowI18n: i18n( 'LoginMojit.wrongbrowser.label.INSTALL_NOW' ),
                buttonNextI18n: i18n( 'LoginMojit.wrongbrowser.button.NEXT' )
            } );
        },

        supportlogin: function( ac ) {
            Y.log( 'Entering supportlogin...' );
            if( Y.doccirrus.auth.isPRC() ) {
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.done( {}, {http: {}} );
            }
        },

        /**
         * Show the login page (routed from /login)
         * Perhaps: make this remember incorrect usernames for retry
         * @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        login: function( ac ) {

            Y.log( 'Entering login...' );
            var req = ac.http.getRequest(),
                params = ac.params.getFromUrl(),
                redirectTo = params.redirectTo || '/',
                ref = params.ref || '',
                i8message,
                i8title,
                noReg = false,
                noLogin = false,
                host = req.headers.host,
                subdomain = (host.split( '.' ).length > 1) ? host.split( '.' )[0] : '',
                isTrial;

            ac.http.addHeader( "Cache-Control", "no-cache, no-store, must-revalidate" );
            ac.http.addHeader( "Pragma", "no-cache" );
            ac.http.addHeader( "Expires", "0" );

            // first check if we are trying to log into the puc
            // this is not the right page then, switch to the
            // /intime/page page.
            if( Y.doccirrus.auth.isPUC() ) {
                Y.log( 'Cannot login to PUC here, moving to patientportal login page...' );
                Y.doccirrus.utils.redirect( '/intime/patient', ac );
                return;
            }

            // for unsupported browsers show user the wrongbrowser page after login
            // but still allow him to use the system on own risk and without support from us
            if( !params.browserOk && !this.browsercheck( ac ) ) {
                //redirectTo = '/wrongbrowser';
                Y.doccirrus.utils.redirect( '/wrongbrowser', ac );
                return;
            }

            // set the title and message for re-login after logout
            if( 'logout' === ref ) {
                i8title = 'Ihre Session wurde beendet.';
                i8message = 'Sie müssen sich einloggen um weiter zu arbeiten.';
            }

            // If the customer wants to login to a local PRC box, 'mojito' requests
            // are handled locally. and the tenantId is immaterial.
            if( Y.doccirrus.mongodb.isMultitenant() ) {
                if( !Y.doccirrus.auth.isHexTenantId( subdomain ) ) {
                    subdomain = '';
                }
            }

            //Y.log( 'LoginMojit.login: ' + Y.doccirrus.auth.getLocalTenantId()  + '  |  ' + Y.doccirrus.auth.getPUCTenantId() );

            if( !Y.doccirrus.auth.isVPRC() ) {
                noReg = true;
            }
            console.warn( 'subdomain:', subdomain );//eslint-disable-line no-console

            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() ) {
                subdomain = Y.doccirrus.auth.getLocalTenantId();
            }

            // MOJ 963 --
            if( Y.doccirrus.auth.isDCPRCRealm( req ) ) {
                Y.log( 'Login overriding subdomain for DCPRC.', 'info', NAME );
                subdomain = 0;
            }
            if( Y.doccirrus.auth.isVPRCAdmin( req ) ) {
                Y.log( 'Login overriding subdomain for MVPRC', 'info', NAME );
                subdomain = 0;
            }

            isTrial = !!(params.trial);

            var formStrings = {
                'isTrial': isTrial,
                'i8username': (isTrial) ? 'E-Mail' : i18n( 'LoginMojit.login.label.USERNAME' ),
                'i8password': i18n( 'LoginMojit.login.label.PASSWORD' ),
                'i8message': i8message || '',
                'i8title': i8title || '',
                'clientimg': '/static/dcbaseapp/assets/img/doccirrus/cirrus_cloud.jpg',
                'redirectTo': encodeURIComponent( redirectTo ),
                'tenantId': subdomain,
                'noReg': noReg,
                'noLogin': noLogin,
                'lang': ac.http.getRequest().context.lang,
                'isLdap': Y.doccirrus.auth.isAllowedLDAPLogin(),
                'notYetRegisteredI18n': i18n( 'LoginMojit.login.label.NOT_YET_REGISTERED' ),
                'customerNumberI18n': i18n( 'LoginMojit.login.placeholder.CUSTOMER_NUMBER' ),
                'pwForgottenI18n': i18n( 'LoginMojit.login.label.PW_FORGOTTEN' ),
                'resetPWI18n': i18n( 'LoginMojit.login.group.RESET_PW' ),
                'usernameI18n': i18n( 'LoginMojit.login.label.USERNAME' ),
                'buttonCancelI18n': i18n( 'LoginMojit.login.button.CANCEL' ),
                'sendLinkI18n': i18n( 'LoginMojit.login.button.SEND_LINK' ),
                'text1I18n': i18n( 'LoginMojit.pinModal.TEXT1' ),
                'pinModalPlaceholderI18n': i18n( 'LoginMojit.pinModal.PLACEHOLDER' ),
                'text2I18n': i18n( 'LoginMojit.pinModal.TEXT2' )
            };

            if( true === req.isAuthenticated() ) {
                Y.log( 'dologin was called, but we are logged in' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                Y.doccirrus.api.settings.get( {
                    user: Y.doccirrus.auth.getSUForTenant( subdomain ),
                    useCacheParam: false,
                    callback: function( err, result ) {
                        var inOutActivated = false;
                        if( err ) {
                            Y.log( 'Error getting settings: ' + err, 'error', NAME );

                        } else {
                            inOutActivated = result && result[0] && result[0].inOutActivated;
                        }
                        ac.pageData.set( 'inOutActivated', inOutActivated );

                        ac.done( formStrings, {noTopMenu: true} );

                    }
                } );
            }
        },

        // password set/reset form
        firstLogin: function( ac ) {
            var
                params = ac.params.getFromUrl(),
                req = ac.http.getRequest(),
                tenantId = getTenantId( req ),
                dbuser = Y.doccirrus.auth.getSUForTenant( tenantId );

            if( (!Y.doccirrus.auth.isPRC() || !Y.doccirrus.auth.isISD()) && undefined === tenantId ) {
                Y.doccirrus.utils.reportErrorJSON( ac, 404, 'Tenant not Found' );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: dbuser,
                action: 'count',
                model: 'identity',
                query: {pwResetToken: params.token || 'NON_EXISTENT_TOKEN'},
                useCache: false,
                callback: function( err, count ) {
                    if( err ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 500, 'server error' );
                    } else {
                        ac.done( {
                            token: params.token || '', // password reset token
                            employeeId: params.id || '',
                            isTokenValid: (count > 0),
                            setPwI18n: i18n( 'LoginMojit.firstLogin.title.SET_PW' ),
                            pleaseSetPwI18n: i18n( 'LoginMojit.firstLogin.text.PLEASE_SET_PW' ),
                            resetLinkI18n: i18n( 'LoginMojit.firstLogin.text.INVALID_RESET_LINK' ),
                            indicatorI18n: i18n( 'LoginMojit.firstLogin.text.INDICATOR' ),
                            placeholderPinI18n: i18n( 'LoginMojit.firstLogin.placeholder.PIN' ),
                            placeholderPwI18n: i18n( 'LoginMojit.firstLogin.placeholder.PW' ),
                            placeholderRePwI18n: i18n( 'LoginMojit.firstLogin.placeholder.RE_PW' )
                        } );
                    }
                }
            } );
        },

        // when the user submits the new password and the token
        regfirstlogin: function( ac ) {
            var
                dbuser,
                params = ac.params.getFromMerged(),
                req = ac.http.getRequest(),
                tenantId = getTenantId( req ),
                query,
                options;

            if( (!Y.doccirrus.auth.isPRC() || !Y.doccirrus.auth.isISD()) && undefined === tenantId ) {
                Y.doccirrus.utils.reportErrorJSON( ac, 404, 'Tenant not Found' );
                return;
            }
            // check params
            if( !params.token || !params.password ) {
                Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid parameters' );
                return;
            }
            // someone is trying to hack the page
            if( params.token && 24 < params.token.length ) {
                Y.log( 'Hack attempt on ' + tenantId, 'error', NAME );
                Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid parameters' );
                return;
            }
            // set dbuser
            if( (!Y.doccirrus.auth.isPRC() || !Y.doccirrus.auth.isISD()) ) {
                dbuser = Y.doccirrus.auth.getSUForTenant( tenantId );
            } else {
                dbuser = Y.doccirrus.auth.getSUForLocal();
            }

            // get identity and compare token
            function idCb( err, docs ) {
                if( !err && docs[0] ) {
                    if( params.token === docs[0].pwResetToken ) {
                        // token matched so set password to new password
                        Y.doccirrus.mongodb.runDb( {
                            user: dbuser,
                            model: 'identity',
                            action: 'put',
                            query: {
                                _id: docs[0]._id
                            },
                            fields: ['pw', 'pwResetToken', 'failedLoginCount'],
                            data: {
                                pwResetToken: '',
                                pw: Y.doccirrus.auth.getSaltyPassword( params.password ),
                                failedLoginCount: 0,
                                skipcheck_: true
                            }
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Error during regfirstlogin. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            // success!!
                            Y.doccirrus.utils.redirect( '/login', ac );
                        } );
                    } else if( !docs[0].pwResetToken ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 403, 'Already Set Password' );
                    } else {
                        Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid Token' );
                    }
                    return;
                }
                Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Invalid parameters' );
            }

            if( params.id ) {
                query = {specifiedBy: params.id};
                options = {};
            } else {
                query = {};
                options = {sort: {$natural: 1}, limit: 1};
            }
            options.lean = true;
            Y.doccirrus.mongodb.runDb( {
                user: dbuser,
                action: 'get',
                model: 'identity',
                query: query,
                options: options,
                callback: idCb
            } );
        },

        readContact: function( ac ) {
            Y.log( 'Entering log contact...' );
            var req = ac.http.getRequest(),
                params = ac.params.getFromUrl(),
                // The following will be changed TODO MOJ-38
                dbuser = Y.doccirrus.auth.getSUForLocal(),
                modelContact;

            if( undefined === req.cid || undefined === params.cid ) {
                throw new Error( 'No contact id given.' );
            }

            function successCb( err ) {
                if( err ) {
                    Y.log( 'Error in readContact. ' + JSON.stringify( err ) );
                }
            }

            function identityModelCb( err, model ) {
                if( !err ) {
                    modelContact = model;
                    modelContact.get( dbuser, {'centralContact': '5188da99e33be2a52e00000e'}, {}, successCb );
                }
            }

            Y.doccirrus.mongodb.getModel( dbuser, 'contact', identityModelCb );

        }
    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-models-addon',
        'mojito-params-addon',
        'mojito-http-addon',
        'mojito-intl-addon',
        'mojito-data-addon',
        'dcauth',
        'dcutils',
        'settings-api'
    ]
} );
