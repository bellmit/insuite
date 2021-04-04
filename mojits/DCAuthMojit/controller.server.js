/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


YUI.add( 'DCAuthMojit', function( Y, NAME ) {

        /**
         *
         * OAuth2 Mojit.
         *
         */

        var
            url = require( 'url' ),
            authCodes = {};

        //        function callbackWithError( callback, err, state ) {
        //            http.get(
        //
        //                callback + '?error=' + err + '&state=' + state,
        //
        //                function( res ) {
        //                    Y.log( 'OAuth error submission got response: ' + res.statusCode, 'info', NAME );
        //                } ).on( 'error', function( e ) {
        //                    Y.log( 'OAuth error submission got error: ' + e.message, 'warn', NAME );
        //                } );
        //        }

        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             *  Catch All method -- this mojit can be relied on to throw an error!
             *
             * @param ac {Object} The ActionContext that provides access
             *        to the Mojito API.
             */

            'doauthorise': function( ac ) {
                var
                    req = ac.http.getRequest(),
                    params = ac.params.getFromUrl() || {},
                    meta = {
                        noTopMenu: true
                    },
                    myAc = ac;

                params.state = params.state || '';  // don't let 'undefined' slip through.

                Y.log( 'Entering dcauth...', 'info', NAME );

                function doShowForm() {
                    // we only recognise one client!
                    if( 'MT2IT' !== params.client_id ) {
                        Y.doccirrus.utils.redirect( params.redirect_uri + '?error=unauthorized_client&state=' + params.state, myAc );
                        return;
                    }
                    if( req.user ) {
                        // otherwise - render the user acceptance screen
                        ac.done(
                            {
                                data: {
                                    username: ''.concat( req.user.U ),
                                    client_id: ''.concat( params.client_id ),
                                    hospital: 'Ratzeburg',
                                    originalCall: ''.concat( req.url + '&au=' + encodeURIComponent( req.user.id ) )
                                },
                                status: 'ok'
                            },
                            meta
                        );
                        return;
                    }
                    Y.log( 'Invalid request, user credentials not found.', 'warn', NAME );
                    // redirect to the error page on the client.
                    Y.doccirrus.utils.redirect( params.redirect_uri + '?error=invalid_request&state=' + params.state, myAc );
                }

                function processOauthForm() {
                    var
                        originalCall = decodeURIComponent( params._call ),
                        urlObj = url.parse( originalCall, true ),
                        originalParams = ( urlObj || {}).query,
                        authCode = Date.now() + 'YY',
                        redirectURL;

                    // check the user is still the same... TODO
                    //                    if( originalParams.au !== req.user.id ) {
                    //                        Y.log( 'User ID does not match original user auth request ' +  originalParams.au +' !== ' + req.user.id , 'warn', NAME );
                    //                        redirectURL = originalParams.callback + '?error=invalid_request&state=' + originalParams.state;
                    //                        Y.doccirrus.utils.redirect( redirectURL, myAc );
                    //                        return;
                    //                    }
                    function createToken( err, model ) {
                        var
                            redirectURL;
                        if( !err ) {
                            model.createToken(
                                req.user,
                                ac.http,
                                originalParams.client_id,
                                originalParams.redirect_uri,
                                originalParams.state,
                                authCode,
                                'Q0fC4VV5eERb_2T30YaU7i5',
                                function( err/*, result*/ ) {
                                    if( err ) {
                                        Y.log( 'Failure generating token. See logs.', 'error', NAME );
                                        redirectURL = originalParams.redirect_uri + '?error=server_error&state=' + originalParams.state;
                                    } else {
                                        redirectURL = originalParams.redirect_uri + '?code=' + authCode + '&state=' + originalParams.state;
                                    }
                                    Y.doccirrus.utils.redirect( redirectURL, myAc );
                                } );
                        } else {
                            Y.log( err );
                        }
                    }

                    authCodes.authCode = Date.now();
                    if( 'true' === params.authorise ) {
                        Y.doccirrus.mongodb.getModel( req.user, 'auth', createToken );
                        return;

                    }
                    if( 'false' === params.authorise ) {
                        // RFC 6749 4.2.2.1
                        redirectURL = originalParams.redirect_uri + '?error=access_denied&state=' + originalParams.state;
                        Y.doccirrus.utils.redirect( redirectURL, myAc );
                    }
                }

                if( params.response_type ) {
                    Y.log( 'Showing Form...', 'info', NAME );
                    doShowForm();
                    return;
                }

                if( 'authorization_code' === params.grant_type ) {
                    Y.log( 'Asked to serve info on unsupported URL ...', 'info', NAME );
                }

                if( params.authorise ) {
                    Y.log( 'Processing Authorisation Response...', 'info', NAME );
                    processOauthForm();
                    return;
                }

                Y.log( 'Warning redirecting to error URL. OAUTH2 invalid request', 'warn', NAME );
                // redirect to the error page on the client.
                Y.doccirrus.utils.redirect( params.redirect_uri + '?error=invalid_request&state=' + params.state, myAc );
            },
            //
            //  ===========================  REST METHODS ========================
            //
            /**
             * GetModelName()
             *
             * @return {String}  model name
             */
            getModelName: function() {
                return 'auth';
            },
            /**
             *
             * @param {Objrect}         ac
             */
            issueAccessToken: function( ac ) {
                var
                    meta,
                    response = {},
                    token,
                    params = ac.params.params.body.__rest.originalparams,
                    user = ac.rest.user,
                    data;
                Y.log( 'Getting token for ' + params.code, 'info', NAME );

                function reportErr() {
                    meta = {
                        http: { code: 400, reasonPhrase: 'invalid_request' }
                    };
                    data = { data: '{ "error": "invalid_request"}' };
                    Y.log( 'Error on token' + data, 'info', NAME );
                    ac.done( data, meta );
                }

                function reportSuccess() {
                    response.access_token = encodeURIComponent( token.TOK );
                    response.token_type = 'bearer';
                    response.expires_in = 3600;
                    response.refresh_token = encodeURIComponent( token.RTOK );
                    response.state = token.STATE;
                    data = JSON.stringify( response );
                    Y.log( 'got token' + data, 'info', NAME );
                    ac.done(
                        {data: data, status: 'ok'}
                    );
                }

                function modelCb( err, model ) {
                    token = model.getToken( user, params.code, params.redirect_uri, params.client_secret,
                        function( err, token ) {
                            if( err || !token || !token.TOK ) {
                                reportErr();
                            } else {
                                reportSuccess();
                            }
                        } );
                }

                // get the model and then get the Token from there...
                Y.doccirrus.mongodb.getModel( user, 'auth', modelCb );
            }
        };

    },
    '0.0.1', {requires: [
        'mojito', 'mojito-http-addon', 'mojito-params-addon',
        'mojito-intl-addon'
    ]}
);
