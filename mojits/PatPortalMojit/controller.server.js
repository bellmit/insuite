/**
 * The PatPortalMojit module.
 *
 * @module PatPortalMojit
 */

/*jslint latedef:false */
/* global YUI */



YUI.add( 'PatPortalMojit', function( Y, NAME ) {

    var
        i18ResponseErrCommunicateH = 'Die Praxis ist zur Zeit unerreichbar.',
        i18ResponseErrCommunicateS = 'Bitte versuchen Sie es nochmal später.',
        i18ResponseErrUnknownH = 'Ungültige Angaben.',
        i18ResponseErrUnknownS = 'Bitte überprüfen Sie Ihre Angaben.',
        i18n = Y.doccirrus.i18n,
        BROWSER_OK = null,
        GRECAPCHA_LANG = i18n('PatPortalMojit.controller.GRECAPCHA_LANG'),
        promisify = require( 'util' ).promisify,
        INVALID_LINK = i18n('PatPortalMojit.controller.text.INVALID_LINK'),
        SUCCESS_CONFIRMATION = i18n('PatPortalMojit.controller.text.SUCCESS_CONFIRMATION'),
        SUCCESS_VC_CONFIRMATION = i18n('PatPortalMojit.controller.text.SUCCESS_VC_CONFIRMATION'),
        BUTTON_NEXT = i18n('PatPortalMojit.controller.label.BUTTON_NEXT'),
        {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
        SERVER_ERROR = Y.doccirrus.errorTable.getMessage( { code: 500 } ),
        NOT_FOUND =  Y.doccirrus.errorTable.getMessage( { code: 404 } ),
        CURRENT_PRACTICE_DC_CUSTOMER_NO;

    /**
     * Writes some head to response, end() it and execute done() function of given actionContext
     *
     * @param {Object} params
     * @param {Number} params.code - code of response to return
     * @param {String} params.message - message to show for the user
     * @param {Object} params.ac - actionContext of current action
     * @param {Object} params.meta - meta to pass into done()
     */
    function returnToClient( params ) {
        const
            {code, message, ac, meta} = params,
            res = ac.http.getResponse();

        res.writeHead( code, {'Content-type': 'text/html'} );
        res.write( `<h1>${code}: ${message}</h1>` );
        res.end();
        ac.done( {
            status: 'Mojito is working.'
        }, meta );
        return;
    }


    /**
     * !!WARNING!!
     *
     * This mojit runs on PUC ONLY...
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {


        jawbone_code: function( ac ){
            var
                req = ac.http.getRequest(),
                dbUser = req.user,
                params = ac.params.getFromUrl();
            if( params.code && dbUser ) {
                Y.doccirrus.api.jawbone.getAccessToken( {
                    user: dbUser,
                    query: {
                        code: params.code
                    },
                    callback: function() {
                        //Y.doccirrus.utils.redirect( '/intime_nav#/devices', ac );
                        Y.doccirrus.utils.redirect( '/intime#/devices', ac );
                    }
                } );
                return;
            } else {
                //Y.doccirrus.utils.redirect( '/intime_nav#/devices', ac );
                Y.doccirrus.utils.redirect( '/intime#/devices', ac );
            }
        },
        redirectToIntime: function( ac ) {
            Y.log(' Somebody uses /intime/patient root. This root should not be used anymore. Redirect to /intime#/practices', 'warn', NAME );
            Y.doccirrus.utils.redirect( '/intime#/practices', ac );
        },
        intime_nav: function( ac ) {
            var
                meta = { http: {}, noTopMenu: true, title: Y.doccirrus.i18n('general.PAGE_TITLE.PATIENT_PORTAL') },
                req = ac.http.getRequest(),
                user = req.user,
                params = ac.params.getFromUrl(),
                dcCustomerNo = params.prac,
                redirectTo = params.redirectTo,
                adhocSupport = params.adhocSupport,
                registrationSupport = params.registrationSupport,
                browserCheck = Y.mojito.controllers.LoginMojit.browsercheck( ac );

            if( !params.browserOk && !browserCheck && !req.isAuthenticated() && !BROWSER_OK ) {
                Y.doccirrus.utils.redirect( '/wrongbrowser', ac );
                return;
            }

            if( user && 'vc-user' === user.id && 'VC Proxy User' === user.U ) {
                ac.done( {
                    status: 'Mojito is working.'
                    //loggedIn: req.isAuthenticated(),
                }, meta );
                return;
            }

            BROWSER_OK = params.browserOk;

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( './css/intime_nav.css' );
            ac.assets.addCss( './css/patientalert.css' );
            
            //  form assets - javascript, jQuery plugins and css
            Y.doccirrus.forms.assethelper(ac);

            //ac.assets.addBlob( '<meta name = "viewport" content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">', 'top' );
            //ac.assets.addCss( '/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css' );
            //ac.assets.addCss( '/static/dcbaseapp/assets/lib/font-awesome/4.6.3/css/font-awesome.min.css' );
            //ac.assets.addCss( './css/patientalert.css' );
            ac.pageData.set( 'loggedIn', req.isAuthenticated() );
            if( req.isAuthenticated() ) {
                const
                    googleApiCfg = Y.doccirrus.utils.tryGetConfig( 'googleApiKeys.json', null );

                if (googleApiCfg && googleApiCfg.maps && googleApiCfg.maps.siteKey){
                    ac.assets.addJs( 'https://maps.googleapis.com/maps/api/js?key='+googleApiCfg.maps.siteKey, 'bottom' );
                }else {
                    Y.log( "Error while loading googleApiKeys.json: "+ googleApiCfg, "error", NAME );

                }
            }

            if( dcCustomerNo ) {
                /**
                 * because of link in (v)prc 'Dienste' => 'Gesundheitsportal'
                 */
                Y.doccirrus.utils.redirect( `/intime#/frame_link/${dcCustomerNo || ''}/${adhocSupport}/${registrationSupport}`, ac );
            } else if( redirectTo ) {
                Y.doccirrus.utils.redirect( '/intime#' + decodeURIComponent( redirectTo ), ac );
            } else {
                ac.done( {
                    status: 'Mojito is working.'
                    //loggedIn: req.isAuthenticated(),
                }, meta );
            }
        },

        confirm_email: function( ac ) {
            var
                meta = {
                    http: {},
                    noTopMenu: true,
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.PATIENT_PORTAL' )
                },
                params = ac.params.getFromUrl(),
                user = Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() );

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( './css/intime_nav.css' );
            ac.assets.addCss( './css/patientalert.css' );

            function renderPage( err, text ) {
                ac.pageData.set( 'text', text );
                if( !err ) {
                    ac.pageData.set( 'btnNext', BUTTON_NEXT );
                }
                ac.done( {
                    status: 'Mojito is working.'
                }, meta );
            }

            if( !params.patientId || !params.customerIdPrac || !params.email ) {
                renderPage( true, INVALID_LINK );
                return;
            }

            Y.doccirrus.api.patientreg.confirmPatientEmailToPRC( {
                user: user,
                data: {
                    email: params.email,
                    patientId: params.patientId,
                    customerIdPrac: params.customerIdPrac
                },
                callback: function( err ) {
                    if( err ) {
                        return renderPage( true, Y.doccirrus.errorTable.getMessage( err ) );
                    }
                    renderPage( null, SUCCESS_CONFIRMATION );
                }
            } );

        },

        // the route to the patient DC registration page
        patientdcregister: function( ac ) {
            var
                data = ac.params.getFromUrl(),
                patientId,
                customerId,
                meta = {http: {}, noTopMenu: true};

            // activate bootstrap responsive design
            ac.assets.addBlob( '<meta name = "viewport" content = "width=device-width, initial-scale=1.0, user-scalable=no">', 'top' );
            ac.assets.addCss( '/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css' );
            ac.assets.addCss( '/static/MISMojit/assets/css/mis.css' );
            ac.assets.addCss( './css/patientalert.css' );

            patientId = data.id || '';
            customerId = data.customerId || '';
            ac.pageData.set( 'customerId', customerId );
            ac.done( {
                status: 'Mojito is working.',
                patientId: patientId,
                customerId: customerId,
                loggedIn: false,
                link: '',
                data: { // the jade file needs these anyway
                    dcCustomerNo: '',
                    canTransfer: ''
                }
            }, meta );

        },
        // to the pin page
        patientprcregister: function( ac ) {
            var
                data = ac.params.getFromUrl(),
                patientId,
                customerId,
                meta = {http: {}, noTopMenu: true};

            // activate bootstrap responsive design
            ac.assets.addBlob( '<meta name = "viewport" content = "width=device-width, initial-scale=1.0, user-scalable=no">', 'top' );
            ac.assets.addCss( '/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css' );
            ac.assets.addCss( '/static/MISMojit/assets/css/mis.css' );
            ac.assets.addCss( './css/patientalert.css' );

            patientId = data.id || '';
            customerId = data.XxX || '';

            ac.done( {
                status: 'Mojito is working.',
                patientId: patientId,
                customerId: customerId,
                loggedIn: false,
                link: '',
                data: { // the jade file needs these anyway
                    dcCustomerNo: '',
                    canTransfer: ''
                }
            }, meta );
        },

        passreset: function( ac ) {
            var pars = ac.params.url(),
            // FIXME this ugliness stems from url encode + decode
                token = pars.token && pars.token.replace( / /g, '+' );

            function done( err, identity ) {
                ac.assets.addBlob( '<meta name = "viewport" content = "width=device-width, initial-scale=1.0, user-scalable=no">', 'top' );
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css' );
                ac.assets.addCss( '/static/MISMojit/assets/css/mis.css' );
                ac.assets.addCss( './css/patientalert.css' );

                if( err ) {
                    Y.log( err, 'error', NAME );
                    err = 'Ein Fehler ist aufgetreten. Bitte initiieren Sie den Vorgang erneut.';
                }

                ac.done( {
                    user: (identity && identity.username) || '',
                    token: (identity && identity.pwResetToken) || '',
                    status: 'fubar',
                    loggedIn: false,
                    error: err || ''
                }, {http: {}, noTopMenu: true} );
            }

            if( !token || !pars.user ) {
                done( (token ? 'user' : 'token') + ' must not be omitted', null );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    model: 'identity',
                    user: Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                    action: 'get',
                    query: {username: pars.user},
                    options: {},
                    callback: function( err, result ) {
                        if( err ) {
                            done( 'while getting identity: ' + err, null );
                        } else {
                            if( result && result.length ) {
                                if( result[0].pwResetToken ) {
                                    if( result[0].pwResetToken === token ) {
                                        done( null, result[0] );
                                    } else {
                                        done( 'invalid token: ' + token, null );
                                    }
                                } else {
                                    done( 'password reset not initiated for user: ' + pars.user, null );
                                }
                            } else {
                                done( 'no such user: ' + pars.user, null );
                            }
                        }
                    }
                } );
            }
        },

        /**
         *
         * The patient clicked their OPT-IN link!
         *
         * e.g. http://puc.dev.dc/prgn?ccode=4414081706944
         *
         * 1. update the contact's status (if required)
         * 2. transmit the future loginlink (if required)
         *
         * @param {Object}          ac
         */
        patientOptin: function( ac ) {
            var
                params = ac.params.getFromMerged(),
                code = params.ccode || '',
                email = params.email || '',
                dbuser = Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                pinPageUrl;

            function nextView( err, data ) {
                if( err || 'string' === typeof data ) {
                    Y.doccirrus.utils.redirect( Y.doccirrus.auth.getPUCUrl( '/intime?regs=' + (err ? 'fail' : data) ), ac );

                } else if( data && data.patientId && data.prcKey ) {
                    pinPageUrl = Y.doccirrus.auth.getPUCUrl( '/intime/registertoprc?pid=' + data.patientId + '&spub=' + encodeURIComponent( data.prcKey ) + '&coname=' + encodeURIComponent( data.coname || '' ) );
                    Y.doccirrus.utils.redirect( pinPageUrl, ac );
                } else if( data && data.redirectTo ) {
                    Y.doccirrus.utils.redirect( data.redirectTo, ac );
                } else {
                    Y.doccirrus.utils.redirect( Y.doccirrus.auth.getPUCUrl( '/pplogout' ), ac );
                }
            }

            Y.doccirrus.api.patientreg.patientOptin( {
                user: dbuser,
                data: {
                    ccode: code,
                    email: email
                },
                callback: nextView
            } );
        },

        /**
         * Route to confirm VC appointment on practice
         *
         * @param {Object}          ac
         */
        confirm_vc: async function( ac ) {
            const
                meta = {
                    http: {},
                    noTopMenu: true,
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.PATIENT_PORTAL' )
                },
                req = ac.http.getRequest(),
                user = req.user,
                params = ac.params.getFromMerged(),
                dcCustomerNo = params.prac || '',
                scheduleId = params.schedule || '',
                confirmVCP = promisifyArgsCallback( Y.doccirrus.api.patientportal.confirmVC ),
                dbuser = Y.doccirrus.auth.getSUForTenant( Y.doccirrus.auth.getPUCTenantId() ),
                getFullPracticeInfoP = promisify( Y.doccirrus.pucproxy.getFullPracticeInfo );

            let err, practice;

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( './css/intime_nav.css' );
            ac.assets.addCss( './css/patientalert.css' );

            function renderPage( text ) {
                ac.pageData.set( 'text', text );
                ac.pageData.set( 'patientPortalTitle', i18n( 'PatPortalMojit.general.PP_TITLE' ) );
                ac.done( {
                    status: 'Mojito is working.'
                }, meta );
            }

            [err, practice] = await formatPromiseResult( getFullPracticeInfoP( user, {dcCustomerNo} ) );

            if( err ) {
                Y.log( `confirm_vc. Error while getting full practice info: ${err.stack || err}`, 'error', NAME );
                return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
            }
            if( !practice || !practice[0] ) {
                Y.log( `confirm_vc. Cannot get practice info.`, 'error', NAME );
                return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
            }
            if( !practice[0].enablePublicVC ) {
                return returnToClient( { code: 404, message: NOT_FOUND, ac, meta} );
            }

            if( !dcCustomerNo || !scheduleId || !Y.doccirrus.comctl.isObjectId( scheduleId ) ) {
                renderPage( INVALID_LINK );
                return;
            }
            [err] = await formatPromiseResult(
                confirmVCP( {
                    user: dbuser,
                    data: {
                        dcCustomerNo,
                        scheduleId
                    }
                } )
            );

            if( err ) {
                Y.log( `confirm_vc route: Error while confirming VC appointment: ${err.stack || err}`, 'warn', NAME );
                return renderPage( Y.doccirrus.errorTable.getMessage( err ) );
            }
            return renderPage( SUCCESS_VC_CONFIRMATION );
        },



        /**
         * Route to access PP to book video conference for unregistered users
         * - make a call to get 'enablePublicVC' setting from desired practice to check if it's allowed to do it
         *
         * e.g. http://puc.dev.dc/inconference?prac=2002
         *
         * @param {Object}          ac
         */
        video_conference: function( ac ) {
            var
                meta = {http: {}, noTopMenu: true, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.PATIENT_PORTAL' )},
                params = ac.params.getFromUrl(),
                dcCustomerNo = params.prac,
                req = ac.http.getRequest(),
                user = req.user,
                browserCheck = Y.mojito.controllers.LoginMojit.browsercheck( ac );

            if( !params.browserOk && !browserCheck && !req.isAuthenticated() && !BROWSER_OK ) {
                Y.doccirrus.utils.redirect( '/wrongbrowser', ac );
                return;
            }

            BROWSER_OK = params.browserOk;
            ac.http.addHeader( "Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://apis.google.com https://www.google.com" );
            ac.assets.addJs( 'https://www.google.com/recaptcha/api.js?render=explicit&hl=' + GRECAPCHA_LANG );
            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( './css/intime_nav.css' );
            ac.assets.addCss( './css/patientalert.css' );

            ac.pageData.set( 'loggedIn', req.isAuthenticated() );

            if( dcCustomerNo ) {
                CURRENT_PRACTICE_DC_CUSTOMER_NO = dcCustomerNo;
                Y.doccirrus.pucproxy.getFullPracticeInfo( user, {
                    dcCustomerNo
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( `video_conference. Error while getting full practice info: ${err.stack || err}`, 'error', NAME );
                        return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
                    }
                    if( !result || !result[0] ) {
                        Y.log( `video_conference. Cannot get practice info.`, 'error', NAME );
                        return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
                    }
                    if( result[0].enablePublicVC ) {
                        Y.doccirrus.utils.redirect( `/inconference#/practices/${dcCustomerNo}`, ac );
                    } else {
                        return returnToClient( { code: 404, message: NOT_FOUND, ac, meta} );
                    }
                } );
            } else {
                //if no dcCustomerNo comes from url, then try to get it from global variable
                dcCustomerNo = CURRENT_PRACTICE_DC_CUSTOMER_NO;
                Y.doccirrus.pucproxy.getFullPracticeInfo( user, {
                    dcCustomerNo
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( `video_conference. Error while getting full practice info: ${err.stack || err}`, 'error', NAME );
                        return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
                    }
                    if( !result || !result[0] ) {
                        Y.log( `video_conference. Cannot get practice info.`, 'error', NAME );
                        return returnToClient( { code: 500, message: SERVER_ERROR, ac, meta} );
                    }
                    if( result[0].enablePublicVC ) {
                        ac.done( {
                            status: 'Mojito is working.'
                        }, meta );
                    } else {
                        return returnToClient( { code: 404, message: NOT_FOUND, ac, meta} );
                    }
                } );
            }
        },

        pattest: function( ac ) {

            var
                options = Y.doccirrus.auth.setInternalAccessOptions(),

                testUrl = '',

                req = ac.http.getRequest(),
                user = req.user,
                meta = {http: {}, noTopMenu: true};

            // add bootstrap responsive design
            ac.assets.addBlob( '<meta name = "viewport" content = "width=device-width, initial-scale=1.0, user-scalable=no">', 'top' );
            ac.assets.addCss( '/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css' );
            ac.assets.addCss( '/static/MISMojit/assets/css/mis.css' );
            ac.assets.addCss( './css/patientalert.css' );

            Y.log( 'current user: ' + JSON.stringify( req.user, undefined, 2 ), 'info', NAME );

            function onReadPatientReg( err, data ) {
                if( err ) {
                    Y.log( 'Could not read meta reg: ' + err, 'error', NAME );
                    return;
                }

                Y.log( 'Read patientreg: ' + JSON.stringify( data, undefined, 2 ), 'info', NAME );

                var patientReg = data[0];

                testUrl = 'http://1111111111.dev.dc/1/formtemplate/getcategories' +
                          '?pid=' + patientReg.patientId +
                          '&enchanced=true';

                /*
                 testUrl = 'http://1111111111.dev.dc/1/formtemplate/:loadform?action=loadform' +
                 '&pid=' + patientReg.patientId +
                 '&auth=' + patientReg.portalPin +
                 '&instanceId=vjj4vehc99all3diiux1bnk09yg5jyvi_forms_Test_Start.form' +
                 '&enchanced=true';
                 */

                Y.doccirrus.pucproxy.getPracticeInfo( user, {}, onReadPractice );
            }

            function onReadPractice( err, practices ) {
                if( err ) {
                    Y.log( 'Could not read practices: ' + err, 'warn', NAME );
                    return;
                }

                Y.log( 'Read practices: ' + Y.doccirrus.utils.safeStringify( practices ), 'info', NAME );
                Y.log( 'Read practices ERROR: ' + Y.doccirrus.utils.safeStringify( practices.error ), 'info', NAME );
                Y.log( 'Read practices DATA: ' + Y.doccirrus.utils.safeStringify( practices.data ), 'info', NAME );
                Y.log( 'Read practices DATA[0]: ' + Y.doccirrus.utils.safeStringify( practices.data[0] ), 'info', NAME );
                Y.doccirrus.https.externalGet( testUrl, options, onHttpGet );
            }

            function onHttpGet( err, response, body ) {

                if( err ) {
                    Y.log( 'HTTP GET request failed:' + err, 'warn', NAME );
                    return;
                }

                Y.log( 'HTTP Response: ' + Y.doccirrus.utils.safeStringify( response ), 'info', NAME );
                Y.log( 'HTTP Response: ' + Y.doccirrus.utils.safeStringify( body ), 'info', NAME );

                ac.done( { 'testvalue': 'testvalue', 'testuser': req.user }, meta );
            }

            Y.log( '***** GET PRACTICE INFO *****', 'info', NAME );

            Y.doccirrus.api.patientreg.getForCurrentUser( user, '', onReadPatientReg );
        },

        /*
         ========================  REST ============================
         */

        /**
         *  REST action to make a request of a PRC or VPRC tenant and return results to the client
         *
         *  In order to route and authenticate the request this action will need to know which patientReg to use
         *  for this call, expects params:
         *
         *      patientRegId   {String}    Database ID of a patientreg object
         *
         *
         *  @param {Object}          ac
         */

        'blindproxy': function( ac ) {

            var
                _final = this._getCallback( ac ),
                params = ac.rest.originalparams,
                user = ac.rest.user,
                options = Y.doccirrus.auth.setInternalAccessOptions();

            /**
             *  Callback from blind proxy action
             *
             *  @param  err         {String}    Error / debug message
             *  @param  response    {Mixed}     JSON in most cases
             *  @param  redirect    {String}    URL to redirect to (files middleware)
             */

            function onPRCResponse( err, response, redirect ) {

                if( err ) {
                    _final( err );
                    return;
                }

                if( response ) {
                    _final( null, response );
                    return;
                }

                if( redirect ) {
                    Y.doccirrus.utils.redirect( redirect, ac, true );
                    return;
                }

                _final( 'Proxy request failed.' );
            }

            Y.doccirrus.blindproxy.getFromPRC( user, options, params, onPRCResponse );
        },

        /**
         *  REST action to allow the client to load a set of patientreg records to allow polling and routing of
         *  requests to PRCs or VPRC tenants where the client is registered.
         *
         *  DEPRECATED: funcationality moved from blidproxy to new style of REST API, wrapper preserves old route
         *  for interim.
         *
         *  @param  ac
         */

        'listpatientreg': function( ac ) {

            var callback = this._getCallback( ac );

            //            function onLoadRedactedPatientReg( err, data ) {
            //
            //                if( err ) {
            //                    Y.log( 'Could not read patient meta reg from db: ' + err, 'error', NAME );
            //                    callback( 'Could not read patient meta reg from db: ' + err );
            //                    return;
            //                }
            //
            //                Y.log( 'Read redacted patientreg: ' + JSON.stringify( data, undefined, 2 ), 'info', NAME );
            //                callback( null, data );
            //            }

            Y.doccirrus.api.patientreg.listmine( { 'user': ac.rest.user, 'callback': callback } );
        },

        /**
         * Runs on Tenant 0 only!!!!!!
         * Method to request remaining waiting time by praxid & waitno
         *
         * MOJ-115
         * - The request shall have praxID and waitno.
         * - The server returns only the individual waiting time or start time related to the given praxID and waitno. No more details.
         * - If the praxID is unknown to the server, the response shall indicate this
         * - If the waitno is unknown or in the past AND not AUFGERUFEN (=flag scheduled), the server shall return an error indicating that the waitno is invalid
         *   (see MOJ-20 or -120, linked together)
         *
         * MOJ-119
         * The complete calculation of durations is handled on the server side only.
         * The client time shall have no influence to what is shown or when alerts will be send.
         *
         * MOJ-118
         * The correct waiting time for the given praxID and waitno is shown.
         * If the schedule is overdue we have different situations:
         * a) AUFRUFEN was pressed for it         (adhoc===true,scheduled===SCH_CURRENT)
         *    show:
         *              Termin läuft
         *              --
         * b) SCHIEBEN was pressed for it         (adhoc===true,scheduled===SCH_WAITING, waitingtime > 0)
         *    show:
         *              X Minuten
         *              --
         * c) schedule was deleted (or wrong praxid / waiting number, see MOJ-115)
         *    show:
         *              Termin unbekannt
         *              Falsche Nummer oder Termin wurde abgesagt
         * d) practice waiting     (adhoc===true,scheduled===SCH_WAITING, waitingtime <= 0)
         *    show:
         *              -X Minuten
         *              Praxis wartet
         *
         * e) already ended    (scheduled===SCH_ENDED)
         *    show:
         *              Termin gelaufen
         *              --
         *
         * Response:
         * a: i18response_OK_running,
         * b: i18response_OK_changed,
         * c: i18response_ERR_deleted,
         *    i18response_ERR_unknown,
         * d: i18response_OK_delayed
         *
         * @param {Object}          ac
         */

        'p_receivewaitingtime': function( ac ) {
            var
                user = ac.rest.user,
                unknownData = {
                    'waitText': i18ResponseErrUnknownH,
                    'subtext': i18ResponseErrUnknownS
                },
                errData = {
                    'waitText': i18ResponseErrCommunicateH,
                    'subtext': i18ResponseErrCommunicateS
                },
                unknownResponse = {
                    'status': 'err',
                    'data': unknownData
                },
                errResponse = {
                    'status': 'err',
                    'data': errData
                },
                serverOffline = {
                    status: 'err',
                    data: {
                        waitText: Y.doccirrus.i18n('PatPortalMojit.intime_practices_tab.text.PRACTICE_OFFLINE')
                    }
                },
                data = ac.rest.originalparams,
                query = ac.rest.query,
                callback = this._getCallback( ac ),
                url;

            // first do some checks
            // if we could save a call, check in a recent cache whether the ticket is valid
            // or if the ticket has already ENDED (this latter info should never get stale) TODO
            if( !query.praxid || !query.waitno ) {
                Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Missing parameters, waitno/praxid. ' );
                return;
            }
            // if not PUC terminate
            if( !Y.doccirrus.auth.isPUC() ) {
                Y.doccirrus.utils.reportErrorJSON( ac, 403, 'This request is not allowed for ' + ac.http.getRequest().url );
                return;
            }

            if( !user ) {
                // we are in a public version of the route
                user = Y.doccirrus.auth.getSUForPUC();
            }

            function httpGetCb( error, resp, body ) {
                if( error || undefined === body || !body.data ) {
                    error = error || 'response returned empty body';
                    Y.log( 'Cannot get waitingtime -- ' + error, 'warn', NAME );
                    if( error && 503 === error.code ) {
                        return callback( null, serverOffline );
                    }
                    return callback( null, errResponse );
                }

                Y.log( 'Proxied waiting time -- ' + JSON.stringify( body ), 'debug', NAME );
                callback( null, body.data ); // body.data can be a duplicate to unknownData, it should be just an error code
            }

            function getTenant( error, result ) {
                var
                    options = Y.doccirrus.auth.setInternalAccessOptions(),
                    urlPrefix = '/1/calevent/:receiveWaitingTime',
                    host;

                if( error || !result || 0 === result.length ) {
                    error = error || 'body is empty';
                    Y.log( 'Cannot get tenant -- ' + error, 'warn', NAME );
                    return callback( null, unknownResponse );
                }

                //tenant-id received, external get wt from tenant-url
                url = urlPrefix + '?number=' + query.waitno;
                url = url + '&wantsAlert=' + data.wantsAlert;
                url = url + '&email=' + data.email;
                url = url + '&mobile=' + data.mobile;
                url = url + '&timeinadvance=' + data.timeinadvance;

                // translate hostnames that come as url in metaprac
                host = result[0].host.replace( 'http://', '' ).replace( 'https://', '' ).replace( '/', '' );

                Y.doccirrus.https.externalGet( Y.doccirrus.auth.getExternalUrl( url, host ), options, httpGetCb );
            }

            Y.log( 'In receive waiting time: get, ' + query.praxid + '  ' + query.waitno );

            // MOJ-627 : receive external url from PUC metaprac
            // i.e.  praxid --> hostname  translation implies a specific tenant is
            // addressed, and that tenant knows which practice it is. So here we use host
            // and don't worry about tenants.
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'metaprac',
                action: 'get',
                callback: getTenant,
                query: { customerIdPrac: query.praxid }
            } );

        },

        /**
         * insert apidoc here
         * @param {Object}          ac          mojito action context
         */
        'p_getPracticeInfo': function( ac ) {
            var
                callback = this._getCallback( ac ),
                user = ac.rest.user,
                params = ac.rest.originalparams;

            function onReadPractice( err, practices ) {
                if( err ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'Server error' );
                    return;
                }

                if( !practices.data || 1 > practices.data.length ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 400, 'Nicht freigeschaltet' );
                    return;
                }
                callback( null, practices );
            }

            Y.doccirrus.pucproxy.getPracticeInfo( user, {dcCustomerNo: params.dcCustomerNo, checkTransfer: params.checkTransfer}, onReadPractice );
        },
        /**
         * send a request to a PRC for all approved activities if the patient
         * @param {Object}          ac           must contain practiceId
         */
        'p_patientactivities': function( ac ) {
            var
                params = ac.rest.originalparams,
                user = ac.rest.user,
                callback = this._getCallback( ac );

            function reportError( msg, code ) {
                Y.doccirrus.utils.reportErrorJSON( ac, code || 500, 'invalid params' );
                Y.log( 'p_patientactivities: ' + msg, 'error', NAME );
                callback( 'invalid params' );
            }

            function returnData( err, response ) {
                if( err ) {
                    reportError( 'error in getting activities: ' + err );
                    return;
                }
                callback( null, response );
            }

            Y.doccirrus.pucproxy.getActivitiesByPractice( user, {practiceId: params.practiceId}, returnData );

        },

        /**
         * Initialize the process for patient transfer.
         *  Ask PRC for ETAN, then store transfer info and the received ETAN in patientreg.
         * PRC will remember the request temporarily until the next step (confirmTransfer).
         * Repeated attempts for transfer will overwrite current request.
         * @param {Object}          ac
         */
        'p_requesttransfer': function( ac ) {
            var
                params = ac.rest.originalparams,
                user = ac.rest.user,
                callback = this._getCallback( ac ),
                sourceData = params.sourceData,
                targetData = params.targetData,
                activityIds = params.activityIds,
                patientreg,
                prcHost;

            function reportError( msg, code ) {
                Y.log( 'p_requesttransfer: ' + msg, 'error', NAME );
                Y.doccirrus.utils.reportErrorJSON( ac, code || 500, 'invalid params' );
            }

            if( !activityIds || !sourceData || !sourceData.practiceId || !targetData || !targetData.practiceId ) {
                reportError( 'missing params!', 400 );
                return;
            } else if( sourceData.practiceId === targetData.practiceId ) {
                reportError( 'source and target practices cannot be the same!', 400 );
                return;
            }

            function allDone( err ) {
                if( err ) {
                    reportError( 'error in p_requesttransfer()' );
                    return;
                }
                callback( err, {status: 'eTAN', patientId: sourceData.patientId} ); // let fronend know of success
            }

            // inform frontend whether transfer has been authorized by PRC
            function checkETAN( err, eTAN ) {
                if( err || !eTAN ) {
                    callback( err, {ok: false} );
                    return;
                }

                patientreg.transfer = {
                    eTAN: eTAN,
                    source: sourceData.practiceId,
                    target: targetData.practiceId,
                    date: new Date().toJSON()
                };

                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientreg',
                    action: 'put',
                    query: {
                        _id: patientreg._id
                    },
                    fields: Object.keys(patientreg),
                    data: Y.doccirrus.filters.cleanDbObject(patientreg)
                }, allDone);

            }

            // send a request to PRC for a new TAN
            function postToPRC( err, result ) {
                if( err || !result || !result[0] ) {
                    reportError( 'failed to get target metaprac: ' + err, (err) ? 500 : 400 );
                    return;
                }

                var data = {
                    host: prcHost,
                    activityIds: activityIds,
                    sourceData: sourceData,
                    targetData: targetData
                };

                Y.doccirrus.pucproxy.getETAN( data, checkETAN ); // send all transfer related data to the source prac with this request
            }

            function targetPatientregCb( err, result ) {
                if( err ) {
                    reportError( 'faild to get target patientreg', 500 );
                    return;
                }

                if( !result || !result[0] ) {
                    reportError( 'no target patientreg for patient: identityId' + user.identityId, 400 );
                    return;
                }

                if( !result[0].accessPRC ) {
                    callback( Y.doccirrus.errors.http( 1401, 'access to PRC not permitted' ) );
                    return;
                }
                targetData.patientId = result[0].patientId; // patientId in target PRC

                // get target practice
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'metaprac',
                    query: { customerIdPrac: targetData.practiceId },
                    callback: postToPRC
                } );
            }

            // get the target patientreg to get the patientId on target PRC, then query for target metaprac
            function sourceMetapracCb( err, result ) {
                if( err || !result || !result[0] ) {
                    reportError( 'failed to get source metaprac: ' + err, (err) ? 500 : 400 );
                    return;
                }

                prcHost = result[0].host;

                // target patientreg
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientreg',
                    query: { identityId: user.identityId, customerIdPrac: targetData.practiceId},
                    callback: targetPatientregCb
                } );
            }

            // get source patientreg and query for source metaprac
            function sourcePatientregCb( err, result ) {
                if( err ) {
                    reportError( 'faild to get source patientreg', 500 );
                    return;
                }

                if( !result || !result[0] ) {
                    reportError( 'no source patientreg for patient: identityId' + user.identityId, 400 );
                    return;
                } else {
                    patientreg = result[0]; // to be updated later
                }

                sourceData.patientId = patientreg.patientId; // patientId in the source practice

                // get source practice
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'metaprac',
                    query: { customerIdPrac: sourceData.practiceId },
                    callback: sourceMetapracCb
                } );
            }

            // get the source patientreg to store transfer data
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                query: { identityId: user.identityId, customerIdPrac: sourceData.practiceId},
                callback: sourcePatientregCb
            } );

        }, //p_requesttransfer

        /**
         * Send the final request to PRC after user correctly confirmed the TAN.
         * @param {Object}          ac
         */
        'p_confirmtransfer': function( ac ) {
            var
                params = ac.rest.originalparams,
                user = ac.rest.user,
                callback = this._getCallback( ac ),
                eTAN = params.eTAN,
                patientreg;

            function reportError( msg, code, level ) {
                Y.log( msg, level || 'error', NAME );
                Y.doccirrus.utils.reportErrorJSON( ac, code || 500, 'invalid params' );
            }

            if( !eTAN ) {
                reportError( 'eTAN is missing in params', 400, 'warn' );
                callback( 'invalid params' );
                return;
            }

            function allDone( err, statusCode ) {
                if( err ) {
                    reportError( 'error in p_confirmtransfer()' );
                    return;
                }
                callback( err, {status: 'tranferred', statusCode: statusCode, patientId: patientreg.patientId} ); // let frontend know of success
            }

            // check if the transfer request was successful then update patientreg accordingly
            function checkTransferResult( err, data ) {
                if( err ) {
                    reportError( err, data.statusCode );
                    return;
                }
                Y.log( 'patient transfer was successful, result:' + JSON.stringify( data ), 'debug', NAME );
                allDone( null, data.statusCode );
            }

            // inform the PRC of patient's confirmation
            function postToPRC( err, result ) {
                if( err ) {
                    Y.doccirrus.utils.reportError( ac, 500, 'failed to get metaprac: ' + err );
                    return;
                } else if( !result || !result[0] ) {
                    Y.doccirrus.utils.reportError( ac, 400, 'failed to get metaprac: ' + patientreg.transfer.source );
                    return;
                }

                var prcHost = result[0].host,
                    data = {
                        eTAN: eTAN,
                        patientId: patientreg.patientId,
                        dcCustomerNo: patientreg.transfer.target,
                        host: prcHost
                    };

                Y.log( 'sending transfer confirm to (V)PRC: ' + JSON.stringify( patientreg.transfer ), 'info', NAME );
                Y.doccirrus.pucproxy.sendTransferConfirm( data, checkTransferResult ); // to start the transfer on PRC
            }

            function getMetaprac( err, result ) {
                if( err ) {
                    reportError( 'faild to get patientreg', 500 );
                    return;
                }

                if( !result || !result[0] ) {
                    reportError( 'no patientreg found using the eTAN', 409, 'warn' );
                    return;
                }
                patientreg = result[0];
                if( !patientreg.transfer || !patientreg.transfer.source ) {
                    reportError( 'there is no registered transfer', 400 );
                    //TODO check the date if expired, return 409 if so
                    return;

                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'metaprac',
                    query: { customerIdPrac: patientreg.transfer.source },
                    callback: postToPRC
                } );
            }

            // get the source patientreg to retrieve transfer data
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientreg',
                query: { "transfer.eTAN": eTAN},
                callback: getMetaprac
            } );
        }, //confirmTransfer

        //
        //
        // REST -- PatientPortalMojit offers no direct access to any models.
        //
        /**
         * Idempotent
         * @param {Object}          ac
         */
        post: function( ac ) {
            Y.doccirrus.utils.unsupportedActionJSON( ac, 'POST', 'register' );
        },
        /**
         * Idempotent
         * @param {Object}          ac
         */
        get: function( ac ) {
            Y.doccirrus.utils.unsupportedActionJSON( ac, 'GET', 'register' );
        },
        /**
         * Idempotent
         * @param {Object}          ac
         */
        put: function( ac ) {
            Y.doccirrus.utils.unsupportedActionJSON( ac, 'PUT', 'register' );
        },
        /**
         * Delete a record or records.
         * @param {Object}          ac
         */
        'delete': function( ac ) {
            Y.doccirrus.utils.unsupportedActionJSON( ac, 'DELETE', 'register' );
        }
    };
}, '0.0.1', {requires: [
    'mojito',
    'mojito-http-addon',
    'mojito-assets-addon',
    'mojito-params-addon',
    'mojito-models-addon',
    'mojito-data-addon',
    'mojito-config-addon',
    'mojito-intl-addon',
    'addons-viewengine-jade',
    'dcforms-assethelper',
    'dcblindproxy',
    'dc-comctl',
    'dcerrortable'
]} );
