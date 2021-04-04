/*
 * User: rrrw
 * Date: 01.01.13  09:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/

/**
 * The Doc Cirrus Frame Mojit
 *
 * This mojit is required for 100% mojito compliance.
 *
 * It can enable mojito shaker control of resource delivery,
 * for all DC assets including minification etc.
 *
 *
 * NB!!
 *
 * This file is symlinked into each Doc Cirrus Frame Mojit
 * ensuring that the frame mojits all use the same code,
 * but are able to declare different CSS and JS dependencies
 * in the application.json
 *
 * This means that shaker can always roll optimal bundles
 * for deployment.
 */

YUI.add( 'DCHTMLFrameMojit', function( Y, NAME ) {

    let
        mojits;


    function initMojits(){
        try{
            mojits = require( 'dc-core' ).config.load( process.cwd() + '/mojits.json' );
        } catch(e){
            Y.log( 'Can not read mojits.json', 'error', NAME );
        }
    }

    initMojits();

    Y.namespace( 'mojito.controllers' )[NAME] = {

        index: function( ac ) {
            this.__call( ac );
        },

        __call: function( ac ) {
            var
                req = ac.http.getRequest(),
                url = req.url,
                user = req.user,
                isVCUser = user && 'VC Proxy User' ===  user.U && 'vc-user' === user.id,
                processArgv = process.argv.join(', '),
                params = ac.params.getFromUrl(),
                hasRedirectTo = params && 'undefined' !== typeof params.redirectTo || Y.doccirrus.auth.isISD() && (0 > req.url.indexOf( '/iscd' )),
                shouldCache = user && !isVCUser && -1 === processArgv.indexOf( '--skipJadeCache' ) && Y.doccirrus.cacheUtils.htmlCache.isClientConnected() && !hasRedirectTo;
            if( req.__timing ) {
                req.__timing.push( { htmlFrameIn: Date.now() } );
            }
            function respondREST( err, data, meta ) {
                if( err ) {
                    ac.error( err );
                    return;
                }
                // REST route
                meta.view = meta.view || {};
                meta.view.name = 'rest';

                meta.__timing = req.__timing;
                if( req.__timing ) {
                    req.__timing.push( { htmlFrameOut: Date.now() } );
                }

                ac.done( data, meta );
            }

            function respondHTML( err, data, meta ) {
                const
                    async = require('async');
                if( err ) {
                    ac.error( err );
                    return;
                }
                if( shouldCache ) {
                    let
                        pageData = {};
                    Object.keys( ac.pageData._state.data ).forEach( key => {
                        pageData[ key ] = ac.pageData.get( key );
                    } );
                    Y.doccirrus.cacheUtils.htmlCache.setHtml( {
                        user,
                        url,
                        data: {
                            data: Object.assign( {}, data ),
                            meta: Object.assign( {}, meta ),
                            pageData: pageData
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( ` could not set html cache: ${err.toString()}`, 'warn', NAME );
                        }
                    } );
                }

                function done(){
                    ac.done( data, Y.mojito.util.metaMerge( meta, {
                        http: {
                            headers: {'content-type': 'text/html; charset=utf-8'}
                        }
                    }, true ) );
                }

                function setResponse( err, extraData = {} ){
                    // pull missing info from the pageData
                    // meta.xyz = ac.pageData.get('dcmeta');
                    if( err ) {
                        Y.log( `One off initial data could not be fetched. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                    // HTMLFRAMEMOJIT (mojito)
                    // meta.assets from child should be piped into
                    // the frame's assets before doing anything else.
                    ac.assets.addAssets(meta.assets);

                    if( ac.config.get( 'deploy' ) === true ) {
                        ac.deploy.constructMojitoClientRuntime(ac.assets, meta.binders);
                    }

                    // SHAKER
                    //                if( typeof ac.shaker.data.run === 'function' ) {
                    //                    ac.shaker.data.run( ac.assets.assets, meta.binders );
                    //                } else {
                    //                    ac.shaker.run( ac.assets.assets, meta.binders );
                    //                }

                    // we don't care much about the views specified in childs
                    // and for the parent, we have a fixed one.

                    meta.view = meta.view || {};
                    meta.view.name = 'index';
                    meta.view.id = 'HTMLFrameBinder';

                    // 1. mixing bottom and top fragments from assets into
                    //    the template data, along with title and mojito version
                    //    and any other html data added through shaker
                    // 2. mixing meta with child metas, along with some extra
                    //    headers.

                    // Mojito may or may not set these parameters.
                    // We add them here so that the Jade is not full of conditionals.
                    data.bottom = data.bottom || '';
                    data.top = data.top || '';
                    data.prefetch = data.prefetch || '';
                    data.shakerInlineCss = data.shakerInlineCss || '';
                    data.shakerInlineJs = data.shakerInlineJs || '';
                    data.shakerTop = data.shakerTop || '';
                    data.postfetch = data.postfetch || '';
                    data.meta = [
                        {name: 'author', content: 'Doc Cirrus GmbH'},
                        {name: 'date', content: Date.now()}
                    ];
                    // i18n prb?
                    data.title = meta.title || Y.doccirrus.i18n('general.PAGE_TITLE.INSUITE');

                    //data = Y.merge( data, ac.assets.renderLocations(), ac.shaker.data.htmlData );
                    data = Y.merge( data, ac.assets.renderLocations() );

                    data.initialClientDebugValue = Y.config.initialClientDebugValue;

                    data.doccirrus = Y.config.doccirrus;
                    data.dcServerTime = new Date().getTime();
                    let root = data.doccirrus.Env;

                    if( req.isAuthenticated && req.isAuthenticated() ) {

                        if( !meta.infrastructure ) {
                            Y.mojito.controllers.DocCirrus.setInfrastructureInfo( ac, meta );
                        }
                        if( !meta.auth ) {
                            Y.mojito.controllers.DocCirrus.setUserInfo( ac, meta );
                        }
                        root.siteLoginState = 'logged-in';
                        root.infra = 'prc,' + meta.infrastructure.prc +
                                     ',puc,' + meta.infrastructure.puc +
                                     ',country,' + meta.infrastructure.country;
                        if( undefined !== meta.auth ) {
                            root.groups = meta.auth.groups;
                            root.roles = meta.auth.roles;
                            root.version = meta.auth.version;
                            root.prodServices = meta.auth.prodServices && meta.auth.prodServices.join( ',' );
                            if (!Y.doccirrus.auth.isDCPRC()) {
                                root.licenses = Y.doccirrus.licmgr.getLicenseData(meta.auth.tenant);
                                root.ignoresLicensing = Y.doccirrus.licmgr.ignoresLicensing();
                            } else {
                                root.ignoresLicensing = true;
                            }
                            root.dcprc = Y.doccirrus.auth.isDCPRC().toString();
                        }

                        // Login/Logout and authentication info in the general frame / menu
                        if( req.devMode ) {
                            root.loggedInUser = 'Developer';
                        }
                        if( undefined !== req.user && undefined !== req.user.id && '' !== req.user.id ) {
                            root.loggedInUser = ( req.user.id.length > 10 ) ? req.user.id.substr( 0, 10 ) + '.' : req.user.id;
                            root.loggedInUserId = req.user.id;
                        } else {
                            root.loggedInUser = (req.user && req.user.U) || root.loggedInUser;
                            root.loggedInUserId = '';
                        }

                        if( undefined !== req.user && undefined !== req.user.U ) {
                            root.user = {
                                employeeId: req.user.specifiedBy,
                                identityId: req.user.identityId,
                                name: req.user.U,
                                validTo: req.user.validTo,
                                systemVersion: Y.config.insuite && Y.config.insuite.version,
                                coname: req.user.coname
                            };
                        } else {
                            root.user = {};
                        }

                        root.user.id = root.loggedInUserId;

                        root.i8username = 'Username';
                        root.i8password = 'Password';
                        root.clientimg = '/static/dcbaseapp/assets/img/doccirrus/cirrus_cloud.jpg';
                    } else {
                        delete root.groups;
                        delete root.roles;
                        delete root.loggedInUser;
                        delete root.loggedInUserId;
                        delete root.username;
                        delete root.i8username;
                        delete root.i8password;
                        root.siteLoginState = 'not-logged-in';
                    }

                    if( req.realmDCPRC ) {
                        root.serverType = 'DCPRC';

                    } else if( req.realmPRC ) {
                        root.serverType = 'PRC';

                    } else if( req.realmISD ) {
                        root.serverType = 'ISD';

                    } else if( req.realmVPRC ) {
                        root.serverType = 'VPRC';

                    } else if( req.isPatientPortal ) {
                        root.serverType = 'PP';
                    } else if( req.realmPUC ) {
                        root.serverType = 'PUC';
                    }

                    root.systemType = Y.doccirrus.auth.getSystemType();

                    root.noTopMenu = meta.noTopMenu;
                    root.isPRC = req.realmPRC; // flag used to hide PRC-specific features

                    root.isVPRCAdmin = Y.doccirrus.auth.isVPRCAdmin( req.user );
                    root.isMTSAndMasterUser = Y.doccirrus.auth.isMTSAndMasterUser( req.user );

                    root.dccliSupportedFeatures = Y.doccirrus.api.cli.getDccliSupportedFeatures();
                    root.dccliCupsStatus = Y.doccirrus.api.cli.getDccliCupsStatus();

                    root.isSolsSupported = Y.doccirrus.api.appreg.isSolsSupported();
                    root.isAdminTenant =  req.user && (req.user.tenantId === Y.doccirrus.auth.getLocalTenantId());

                    root.routes = ac.params.params.route.publicRoutes;

                    if( extraData.appRegs ) {
                        root.appRegs = extraData.appRegs.map( app => {
                            let
                                obj = {...app};
                            delete obj.dbPassword;
                            delete obj.appCurrentPort;
                            delete obj.solToken;
                            return obj;
                        } );
                    }

                    if( extraData.hasSolConf || Y.doccirrus.auth.isDevServer() ) {
                        root.hasSolsConfig = true;
                    }

                    meta.__timing = req.__timing;
                    if( req.__timing ) {
                        req.__timing.push( { htmlFrameOut: Date.now() } );
                    }

                    root.patientportal = {patientLoggedIn: false};

                    if( req.user && req.isPatientPortal ) {
                        Y.doccirrus.api.patientportal.getPatientProfile( {
                            user: req.user,
                            callback: function( error, results, patientReg ) {
                                if( !error && Array.isArray( results ) && results[0] ) {
                                    root.patientportal.patientLoggedIn = true;
                                    root.patientportal.patientId = patientReg && patientReg.patientId;
                                    root.patientportal.prcKey = patientReg && patientReg.prcKey;
                                }
                                done();
                            }
                        } );
                    }
                    else {
                        done();
                    }
                }

                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.api.appreg.getPopulated( {
                            user,
                            callback( err, results ) {
                                return next( err, { appRegs: results } );
                            }
                        } );
                    },
                    function( data, next ) {
                        const solsConfig = Y.doccirrus.utils.tryGetConfig( 'sols.json', null );
                        data.hasSolConf = solsConfig;
                        next( null, data );
                    }
                ], setResponse );

            }

            if( 0 === url.indexOf( '/r/' ) ) {
                Y.log( 'DC processing REST route.', 'info', NAME );
                this._renderChild( ac, respondREST );
            } else {
                Y.log( `DC processing HTML route: ${url}. shouldCache: ${shouldCache}`, 'info', NAME );

                // Saves the frameView flag in the global config
                Y.config.doccirrus.Env.frameView = req.query && req.query.frameView === 'true' || false;
                Y.config.doccirrus.Env.isDev = Y.doccirrus.auth.isDevServer();

                if( shouldCache ) {
                    Y.log( `Checking html cache for url: ${url}, tenantId: ${ user.tenantId }, identityId: ${ user.identityId }`, 'debug', NAME );
                    Y.doccirrus.cacheUtils.htmlCache.getHtml( {
                        user,
                        url
                    }, ( err, cache ) => {
                        if( err ) {
                            Y.log( `Could not get html cache. Run regular jade compilation. Error: ${err.toString()}`, 'warn', NAME );
                            return this._renderChild( ac, respondHTML );
                        }
                        if( !cache || !cache.data || !cache.meta ) {
                            Y.log( `Html cache is empty. Run regular jade compilation.`, 'warn', NAME );
                            return this._renderChild( ac, respondHTML );
                        }
                        Y.log( 'Html was cached. Skip jade compilation.', 'debug', NAME );
                        if( cache.pageData ) {
                            Object.keys( cache.pageData ).forEach( key => {
                                ac.pageData.set( key, cache.pageData[ key ] );
                            } );
                        }
                        respondHTML( null, cache.data, cache.meta );
                    } );
                } else {
                    this._renderChild( ac, respondHTML );
                }
            }
        },

        /**
         * Renders a child mojit based on a config called "child" and
         * the "assets" collection specified in the specs.
         * @method _renderChild
         * @protected
         * @param {Object} ac Action Context Object.
         * @param {Function} callback The callback.
         */
        _renderChild: function( ac, callback ) {
            // Grab the "child" from the config an add it as the
            // only item in the "children" map.
            let
                cfg,
                _child = this.getChild( ac.instance.base || ac.instance.type, ac.action );

            if( !_child ) {
                callback( new Error( 'Child can not be created.' ) );
                return;
            }
            // Map the action to the child if the action
            // is not specified as part of the child config.
            _child.action = _child.action || ac.action;

            // Create a config object for the composite addon
            cfg = {
                children: {
                    child: _child
                },
                assets: ac.config.get( 'assets' ),
                ac: ac
            };

            // Now execute the child as a composite
            Y.mojito.controllers.DocCirrus.dcExecute( cfg, callback );
            //ac.composite.execute( cfg, callback );
        },
        getChild: function( frameName, action ) {
            if( !mojits ) {
                Y.log( 'Can not get child. Check mojits.json', 'error', NAME );
                return null;
            }
            if( !frameName ) {
                Y.log( 'Can not get child. Frame name is missing. Action context error.', 'error', NAME );
                return null;
            }
            if( !mojits[ frameName ] ) {
                Y.log( 'Can not get child. Frame does not have a child.', 'error', NAME );
                return null;
            }
            mojits[ frameName ].child.action = action;
            return mojits[ frameName ].child;
        }
    };

}, '0.1.0', {requires: [
    'mojito',
    'mojito-util',
    'mojito-params-addon',
    'mojito-config-addon',
    'mojito-http-addon',
    'mojito-meta-addon',
    'mojito-composite-addon',
    'mojito-models-addon',
    'mojito-assets-addon',
    'mojito-deploy-addon',
    'mojito-data-addon',
    'mojito-intl-addon',
    'dcauth',
    'DocCirrus',
    'patientportal-api'
]} );
