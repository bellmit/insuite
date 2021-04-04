/*
 * User: rrrw
 * Date: 01.01.13  09:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'DocCirrus', function( Y, NAME ) {

        /**
         * The DocCirrus module.
         *
         * Here we set up the Doc Cirrus infrastructure and orchestrate the
         * calling of Mojits and views to work together to create the app.
         *
         * The DocCirrus Orchestrates Two HTTP Paths:
         *
         * --  user requests for HTML pages
         *
         * -- requests by users and services for JSON (REST)
         *
         * All other request types, LDAP, HL7, CORS pre-flighting, etc. do not come
         * into this Mojit and are handled elsewhere.
         *
         * @module DocCirrus
         */

        /*
         * module wide variables and constants
         */
        var
            dcauth = require( __dirname + '/../../node_modules/dc-core' ).auth,

/*        // set up dev user
            idx = process.argv.indexOf( '--context' ),
            devMode = ( idx > 0 && (idx + 1) < process.argv.length ) ?
                ('environment:development' === process.argv[idx + 1]) :
                '',
*/
            /**
             * DocCirrus Base has a set of installable modules, which may be sub-controllers.
             * configuration elements or drivers. Each of
             * these requires a set of configuration parameters. The following
             * sets this up.
             */
                dcmodules = {
                'MongoDB': {
                    value: false,
                    confString: 'useMongoDb',
                    setup: function() {
                        // do nothing
                    }
                },
                'REST': {
                    value: false,
                    confString: 'useRest',
                    setup: function() {
                        // do nothing
                    }
                }
            },
            _loaded = false;

        // uncomment this only for testing purpose
        //        function getTestSlowDispatch( callback ) { // simulates a slow network connection
        //            return function() {
        //                setTimeout( callback, 2000 );
        //                Y.log( 'The slow dispatch is meant only for testing', 'error', NAME );
        //            };
        //        }

        /**
         *
         * @param {Object}          ac
         * @param {Function}        callback
         */
        function setUser( ac, callback ) {
            var
                req = ac.http.getRequest();

            if( req.user ) {
                Y.log( 'Handling (tenant|user|url): ' + req.user.tenantId + '  |  ' + req.user.U + '  |  ' + req.url, 'info', NAME );
            }
            else {
                Y.log( 'Handling public url (no user): ' + req.url, 'info', NAME );
            }
            callback( null, null );

        }

        /**
         *
         * @param {Object}          meta
         * @return {*}
         */
        function setHeaders( meta ) {
            // sets up the structures required for headers
            var
                mymeta = {},
                mh = {};

            if( meta ) {
                mymeta = meta;
                if( meta.http ) {
                    if( meta.http.headers ) {
                        mh = meta.http.headers;
                    }
                } else {
                    mymeta.http = {};
                }
            } else {
                mymeta = { http: { headers: {}}};
            }

            mymeta.http.headers = mh;
            return mymeta;
        }

        /**
         * @param {Object}          ac           mojito action context
         * @param {Object}          meta
         * @return {*}
         */
        function setInfrastructureInfo( ac, meta ) {
            // sets up the structures required for infrastructure and
            // user handling client side
            var
                req = ac.http.getRequest(),
                country = Y.doccirrus.auth.getCountryCode( req.user );

            Y.log( 'DCPRC: ' + dcauth.isDCPRCRealm( req ), 'debug', NAME );
            Y.log( 'VPRC: ' + dcauth.isVPRC(), 'debug', NAME );
            Y.log( 'PUC: ' + dcauth.isPUC(), 'debug', NAME );
            // if we are currently on a PRC, not including the DCPRC, then HAProxy does everything.
            if( dcauth.isDCPRCRealm( req ) ) {
                meta.infrastructure = {puc: '', prc: '', country: country};
                Y.log( '(DC)PRC INFRASTRUCTURE: ' + JSON.stringify( meta.infrastructure ), 'debug', NAME );
                return meta;
            }
            // otherwise default to PUC and VPRC
            meta.infrastructure = {puc: dcauth.getPUCUrl( '' ), prc: dcauth.isPRC() ? dcauth.getPRCUrl( '' ) : dcauth.getVPRCUrl( '' ), country: country};
            // if no user exit
            if( !req.user ) {
                Y.log( 'ANONYMOUS INFRASTRUCTURE: ' + JSON.stringify( meta.infrastructure ), 'debug', NAME );
                return meta;
            }
            // if PUC
            if( dcauth.isPUC() ) {
                // user.prc should be set from TOKEN
                if( req.user.prc ) {
                    meta.infrastructure = {
                        prc: req.user.prc,
                        puc: dcauth.getPUCHost( true, true ),
                        country: country
                    };
                } else if( !req.isDCPublic ) {
                    // have a problem, we are PUC, but don't know who the PRC is
                    Y.log( 'WARN: protected resource being accessed by user without PRC.', 'warn', NAME );
                }
                Y.log( 'PUC INFRASTRUCTURE: ' + JSON.stringify( meta.infrastructure ), 'debug', NAME );
            }
            // if VPRC
            if( dcauth.isVPRC() ) {
                // user.prc is not set from TOKEN
                meta.infrastructure = {
                    prc: dcauth.getPRCHost( req.user.tenantId, true, true ),
                    puc: dcauth.getPUCHost( true, true ),
                    country: country
                };
                Y.log( 'VPRC INFRASTRUCTURE: ' + JSON.stringify( meta.infrastructure ), 'debug', NAME );
            }

            if( dcauth.isISD() || dcauth.isPRC() ) {
                meta.infrastructure = {
                    prc: Y.doccirrus.auth.getMyHost( null, true ),
                    puc: dcauth.getPUCHost( true, true ),
                    country: country
                };
                Y.log( 'ISD INFRASTRUCTURE: ' + JSON.stringify( meta.infrastructure ), 'debug', NAME );
            }
            return meta;
        }

        /**
         * sets the user info in the browser
         *
         * @param {Object}        ac
         * @param {Object}        meta
         *
         * @returns {Object}       meta
         */
        function setUserInfo( ac, meta ) {
            var
                req = ac.http.getRequest();

            if( undefined !== req.user ) {
                meta.auth = {
                    groups: Y.JSON.stringify( req.user.groups ),
                    roles: Y.JSON.stringify( req.user.roles ),
                    version: req.user.intime,
                    tenant: req.user.tenantId,
                    prodServices: req.user.prodServices
                };
            } else {
                Y.log( 'INFO: no user info found. Probably you are not logged in.', 'info', NAME );
            }

            return meta;
        }

        /**
         * Read config and see which modules are enabled.
         * Move this code out to an addon.
         *
         * @param {Object} ac
         * @param {Function} callback
         */
        function loadConfig( ac, callback ) {
            var
                cfg = null;

            function loadModulesCfg() {
                var
                    key;
                if( _loaded ) {
                    callback();
                    return;
                }
                Y.log( 'Loading config ' + NAME, 'info', NAME );
                for( key in dcmodules ) {
                    if( dcmodules.hasOwnProperty( key ) ) {
                        try {
                            cfg = ac.config.get( dcmodules[key].confString );
                            if( cfg ) {
                                //Y.log( 'Using ' + key + ' Module: ' + JSON.stringify( cfg ), 'info', NAME );
                                dcmodules[key].value = cfg;
                            } else {
                                Y.log( 'No ' + key + ' Module configured for use in Base', 'warn', NAME );
                            }
                            dcmodules[key].setup( ac );
                        } catch( err ) {
                            Y.log( 'Starting ' + key + ' Module threw:' + err.message, 'error', NAME );
                            Y.log( 'Starting ' + key + ' Stack:' + err.stack(), 'info', NAME );
                        }
                    }
                }
                _loaded = true;
                callback();
            }

            // first set the user, then load the modules cfg
            setUser( ac, loadModulesCfg );

        }

        /**
         * Helper function to return an error to the user as "styled" HTML.
         * This is only for apps that use HTML/HTTP, not JSON/HTTP REST.
         *
         * @param {Object}          ac
         * @param {Object}          http
         */
        function throwError( ac, http ) {
            var
                err = http ? (http.http || http) : {},
                meta = {};

            if( !err || !err.code ) {
                // the error code must be "truthy", so if it's "falsy" set it to 500.
                err.code = 500;
            } else {
                err.code = +err.code;
            }
            meta.statusCode = err.code;
            meta.reasonPhrase = err.reasonPhrase;
            if( !err.reasonPhrase ) {
                if( err.message ) {
                    err.reasonPhrase = err.message;
                } else {
                    err.reasonPhrase = 'Unknown server error occured';
                }
            }
            Y.doccirrus.FrameController.createErrorFrame( ac, meta, err );

        }

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method corresponding to the 'index' action. This gets handled
             * by the
             *
             * @param {Object}          ac          The ActionContext that provides access
             *                                      to the Mojito API.
             */
            '__call': function( ac ) {
                var
                    ch = {},
                    req = ac.http.getRequest(),
                    processChildren = { 'children': {}, ac },
                    childNames = [],
                    self = this,
                    processChildrenNames = [],
                    i,
                    chController;

                // setup
                ch.children = ac.config.get( 'children' );

                function callFrameLogic( err, data, meta ) {
                    if( err ){
                        Y.log( 'error on callFrameLogic:' + err.message, 'error', NAME );
                    }
                    var
                        frame = ac.config.get( 'frame' ) || {},
                        templatename = frame.template || 'dcplainframe',
                        aborting = false;

                    // set up the headers - we need to do this for errors too
                    meta = setHeaders( meta );
                    // evaluate results from children meta, if any
                    if( meta && meta.http && meta.http.code && 200 !== +(meta.http.code) ) {
                        throwError( ac, meta );
                        // stop everything
                        return;
                    }
                    // inject user and infrastructure options
                    meta = setInfrastructureInfo( ac, meta );
                    meta = setUserInfo( ac, meta );

                    if( req.__timing ) {
                        req.__timing.push( { callFrameOut: Date.now() } );
                    }

                    // finally build the page ourselves
                    data.mojitOutput = [];

                    //  will be assigned to the global JS variable severTime
                    //data.serverTime = new Date().getTime();

                    for( i = 0; i < childNames.length; i++ ) {
                        // some childnames could be undefined as not run.
                        data.mojitOutput.push( data[childNames[i]] || '' );
                        if( '<!--redirect-->' === data[childNames[i]] ) {
                            //
                            // we have been redirected
                            // to deal with mojito problems with external redirect,
                            // we need to now shut down the action context as fast as possible.
                            //
                            try {
                                meta = {view: {name: "dcrest"}};
                                Y.log( 'Redirect aborting.', 'info', NAME );
                                ac.done( {
                                    'data': '',
                                    'status': 'ok'
                                }, meta );
                            } catch( e ) {
                                Y.log( 'Redirect aborting caught exception (known prb in mojito 0.7+):  ' + e, 'info', NAME );
                                // this call will crash as mojito now always sets headers in ac.done
                                // however prior to crashing, mojito cleans up its ac,
                                // which is what we want!
                                // catch and ignore.
                            }
                            aborting = true;
                        }
                    }
                    // only if we are not aborting due to a redirect, do we continue
                    // building the complex frame.
                    if( !aborting ) {
                        // switch to the right view.
                        meta.view = meta.view || {};
                        meta.view.name = templatename;
                        meta.view.id = 'DoccirrusMojitBinder';

                        // set up some data internals
                        //data.mojit_view_id = meta.view.id;

                        // Here we pass in the infrastructure info
                        data.infra = 'prc,' + meta.infrastructure.prc +
                                     ',puc,' + meta.infrastructure.puc +
                                     ',country,' + meta.infrastructure.country;

                        // Here auth info (TODO MOJ-534 should be passing an encrypted blob)
                        if( undefined !== meta.auth ) {
                            data.groups = meta.auth.groups;
                            data.roles = meta.auth.roles;
                            data.version = meta.auth.version;
                            data.prodServices = meta.auth.prodServices && meta.auth.prodServices.join( ',' );
                            data.dcprc = Y.doccirrus.auth.isDCPRC().toString();
                        }
                        if( req.realmDCPRC ) {
                            data.serverType = 'DCPRC';

                        } else if( req.realmPRC ) {
                            data.serverType = 'PRC';

                        } else if( req.realmISD ) {
                            data.serverType = 'ISD';

                        } else if( req.realmVPRC ) {
                            data.serverType = 'VPRC';

                        } else if( req.isPatientPortal ) {
                            data.serverType = 'PP';
                        } else if( req.realmPUC ) {
                            data.serverType = 'PUC';
                        }

                        data.systemType = Y.doccirrus.auth.getSystemType();

                        data.noTopMenu = meta.noTopMenu;
                        data.isd = Y.doccirrus.auth.isISD();

                        // Login/Logout and authentication info in the general frame / menu
                        if( req.devMode ) {
                            data.loggedInUser = 'Developer';
                        }
                        if( undefined !== req.user && undefined !== req.user.id && '' !== req.user.id ) {
                            data.loggedInUser = ( req.user.id.length > 10 ) ? req.user.id.substr( 0, 10 ) + '.' : req.user.id;
                            data.loggedInUserId = req.user.id;
                        } else {
                            data.loggedInUser = (req.user && req.user.U) || data.loggedInUser;
                            data.loggedInUserId = '';
                        }

                        if( undefined !== req.user && undefined !== req.user.U ) {
                            data.user = {
                                employeeId: req.user.specifiedBy,
                                identityId: req.user.identityId,
                                name: req.user.U,
                                validTo: req.user.validTo,
                                systemVersion: Y.config.insuite && Y.config.insuite.version,
                                coname: req.user.coname
                            };
                        } else {
                            data.user = {};
                        }

                        data.user.id = data.loggedInUserId;

                        data.isVPRCAdmin = Y.doccirrus.auth.isVPRCAdmin( req.user );

                        if( req.isAuthenticated && req.isAuthenticated() ) {
                            data.siteLoginState = 'logged-in';
                        } else {
                            data.siteLoginState = 'not-logged-in';
                        }
                        data.i8username = 'Username';
                        data.i8password = 'Password';
                        data.clientimg = '/static/dcbaseapp/assets/img/doccirrus/cirrus_cloud.jpg';
                        //console.dir( data );
                        //Y.doccirrus.FrameController.createFrame( ac, data, meta, true );

                        data.isPRC = req.realmPRC; // flag used to hide PRC-specific features

                        //MOJ-7477 - inBackup is now default service. inBackup now refers to inBackup cloud
                        data.hasInBackup = data.isPRC && Boolean( req.user ) /*&& Y.doccirrus.licmgr.hasAdditionalService( req.user.tenantId, 'inBackup' )*/;

                        /**
                         * Shorthand method for use in template
                         * @method getUrl
                         * @param {String}          specName
                         * @return {string|undefined}
                         * @private
                         */
                        data.getUrl = function getUrl( specName ) {
                            return Y.doccirrus.commonutils.getUrl( specName, ac );
                        };

                        // site-wide translations via frame
                        data = Y.merge( data, ac.intl.lang() );

                        ac.done( data, meta );
                    }
                }

                function runChildren() {
                    var
                        name;
                    if( !ch.children ) {
                        throwError( ac, {
                            http: {
                                reasonPhrase: ac.config.get( 'description' ) +
                                              '\n\n HTML interface has no children.',
                                code: 500
                            }
                        } );
                        return;
                    }

                    // determine which children will be run.  Only works if
                    // child names are the same as their type, i.e. restricts
                    // one to auto-binding one child mojit of each type.
                    // you can have more, but these have to be bound explicitly
                    // in routes.json, or via the REST interface (also in routes.json)
                    for( name in ch.children ) {
                        if( ch.children.hasOwnProperty( name ) ) {
                            //Y.log( 'Checking child...' + name, 'debug', NAME );
                            childNames.push( name );
                            ch.children[name].action = ac.action;
                            //Y.log( 'Accessing controller...' + name, 'debug', NAME );
                            chController = Y.mojito.controllers[name];
                            // inspection step: only call the child if it has a catch all '__call'
                            // or if it has the method defined.
                            if( chController && (chController.__call || chController[ac.action]) ) {
                                //Y.log( 'Adding child to list...' + name, 'debug', NAME );

                                // put in a ref to the object we want to process
                                processChildren.children[name] = ch.children[name];
                                processChildrenNames.push( name );
                            }
                        }

                    }

                    if( req.__timing ) {
                        req.__timing.push( { callFrameIn: Date.now() } );
                    }


                    Y.log( 'DCMojit running children: ' + processChildrenNames, 'debug', NAME );

                    // pass actionContext to children, and execute them first
                    try {
                        self.dcExecute( processChildren, callFrameLogic );
                    } catch( e ) {
                        Y.log( ' Executing children, module threw: ' + e, 'error', NAME );
                        throwError( ac, e );
                    }
                }

                ac.instance.closestLang = 'de';

                // uncomment only for speed test
                //loadConfig( ac, getTestSlowDispatch( runChildren ) );

                // first load the config, then run the children...
                loadConfig( ac, runChildren );

            },
            /**
             * Method which just returns pure JSON out of the database RESTfully
             * so that the front-end can use a model based view of the data to
             * display it.
             *
             * This is handled by the REST sub-controller.
             *
             * @param {Object}  ac Action Context
             */
            'dcrest': function( ac ) {
                function dispatchRest() {
                    if( false === dcmodules.REST.value ) {
                        ac.done( "{ message: 'No REST Interface Configured' }" );
                        return;
                    }
                    if( true === dcmodules.MongoDB.value ) {
                        // this branch of the IF is for execution that
                        // needs the MongoDB
                        //
                        // call the REST controller, this still needs some
                        // DB to run. TODO
                        Y.doccirrus.RESTController.handleRequest( ac );
                    } else {
                        // this branch of the IF is for execution that
                        // DOES NOT need the MongoDB
                        //
                        ac.done( "{ message: 'No Database Configured' }" );
                    }
                }

                // uncomment only for speed test
                // loadConfig( ac, getTestSlowDispatch( dispatchRest ) );
                loadConfig( ac, dispatchRest );
            },

            /**
             * we get here via a versioned rest call, i.e. /1/r/...
             * See routes.json
             * @param {Object}  ac Action Context
             */
            'dcrest_1': function( ac ) {
                function dispatchRest() {
                    if( false === dcmodules.REST.value ) {
                        ac.done( "{ message: 'No REST Interface Configured' }" );
                        return;
                    }
                    if( true === dcmodules.MongoDB.value ) {
                        // this branch of the IF is for execution that
                        // needs the MongoDB
                        //
                        // call the REST controller, this still needs some
                        // DB to run. TODO
                        Y.doccirrus.RESTController_1.handleRequest( ac );
                    } else {
                        // this branch of the IF is for execution that
                        // DOES NOT need the MongoDB
                        //
                        ac.done( "{ message: 'No Database Configured' }" );
                    }
                }

                // uncomment only for speed test
                //loadConfig( ac, getTestSlowDispatch( dispatchRest ) );
                loadConfig( ac, dispatchRest );
            },

            setInfrastructureInfo,

            setUserInfo,

            dcExecute: function( cfg, cb ) {

                let
                    ac = cfg.ac,
                    content = {},
                    meta = {},
                    children = cfg.children || {},
                    async = require( 'async' );

                // check to ensure children is an Object, not an array
                if( Y.Lang.isArray( cfg.children ) ) {
                    throw new Error( 'Cannot process children in the format of an' +
                                     ' array. \'children\' must be an object.' );
                }
                meta.children = children;

                if( children ) {
                    async.map(Object.keys(children), (child, done) => {
                        this.dcAddChild( child, children[child], ac, done);
                    }, function( err, results ) {
                        if( err ) {
                            // skiping due to an error during queue process
                            return;
                        }

                        // Reference the data we want from the "results" into our
                        // "content" obj Also merge the meta we collected.

                        results.forEach( result => {
                            content[result.name] = result.data;
                            if (result.meta) {
                                meta = Y.mojito.util.metaMerge(meta,
                                    result.meta);
                            }
                        } );


                        // Mix in the assets given via the config
                        if( cfg.assets ) {
                            if( !meta.assets ) {
                                meta.assets = {};
                            }
                            ac.assets.mixAssets( meta.assets, cfg.assets );
                        }

                        setImmediate( cb, null, content, meta );
                    });
                } else {
                    Y.log( ' dcExecute child is undefined. Children: ' + JSON.stringify( children ), 'error', NAME );
                    cb( new Error( 'Cannot process children. "children" must be an object with "child".' ) );
                }
            },

            dcAddChild: function ( childName, child, ac, cb) {

                var
                    self = this,
                    adapter = ac._adapter,
                    originalChild = child,
                    childAdapter,
                    newCommand,
                    id;

                // check to ensure children doesn't have a null child
                // in which case it will be automatically skipped to
                // facilitate disabling children based on the context.
                if( !child ) {
                    return;
                }

                // Make a new "command" that works in the context of this
                // composite
                newCommand = {
                    instance: child,
                    // use action in child spec or default to index
                    action: child.action || 'index',
                    context: ac.command.context,
                    params: child.params || ac.command.params
                };

                // identifier for the child (only used in the logs)
                id = NAME + '::' + (newCommand.base ? '' : '@' + newCommand.type) + ':' + newCommand.action;

                childAdapter = new Y.mojito.OutputBuffer( id, function( err, data, meta ) {
                    if( err && originalChild.propagateFailure ) {
                        Y.log( 'Failed composite because of first child failure of "child"', 'error', NAME );
                        cb( err );
                        return;
                    }

                    // This ends up in my.queue.results array.
                    cb( err, {
                        name: childName,
                        data: (data || ''),
                        meta: meta
                    } );

                } );

                childAdapter = Y.mix( childAdapter, adapter );

                if( childAdapter.req && childAdapter.req.__timing ) {
                    let
                        i = {};
                    //console.warn('id',id);
                    //console.warn('newCommand',newCommand);
                    i[ newCommand.action ] = Date.now();
                    childAdapter.req.__timing.push( i );
                }
                //ac._dispatch( newCommand, childAdapter );
                self.dcDispatch( newCommand, childAdapter, ac.dispatcher );
            },

            /**
             * Dispatch a command in the current runtime, or fallback
             * to a remote runtime when posible.
             * @method dispatch
             * @public
             * @param {object} command the command to dispatch
             * @param {OutputAdapter} adapter the output adapter
             * @param {Object}      dispatcher
             */
            dcDispatch: function (command, adapter, dispatcher) {

                var 
                    newAC,
                    store = dispatcher.store;

                try {
                    store.validateContext(command.context);
                } catch( err ) {
                    adapter.error( err );
                    return;
                }


                store.expandInstance(command.instance, command.context,
                    function (err, instance) {

                        if (err || !instance || !instance.controller) {
                                adapter.error(new Error('Cannot expand instance [' + (command.instance.base || '@' +
                                   command.instance.type) + '], or instance.controller is undefined'));
                            return;

                        }

                        // We replace the given instance with the expanded instance.
                        command.instance = instance;

                        if( !Y.mojito.controllers[ instance.controller ] ) {
                            // the controller was not found, we should halt
                            adapter.error( new Error( 'Invalid controller name [' +
                                                      command.instance.controller + '] for mojit [' +
                                                      command.instance.type + '].' ) );
                        } else {
                            let
                                actionFunction,
                                controller = Y.mojito.controllers[command.instance.controller];

                            if (!command.action) {
                                command.action = command.instance.action || 'index';
                            }
                            
                            
                            
                            actionFunction = command.action;
                            
                            controller = Y.mojito.util.heir(controller);
                            // Check if the controller has the requested action
                            if( 'function' !== typeof controller[ command.action ] ) {
                                // If the action is not found try the '__call' function
                                if( 'function' === typeof controller.__call ) {
                                    actionFunction = '__call';
                                } else {
                                    let
                                        error = new Error( "No method '" + command.action + "' on controller type '" + command.instance.type + "'" );
                                    error.code = 404;
                                    Y.log( 'Error from dispatch on instance \'' +
                                           (command.instance.id || '@' + command.instance.type) +
                                           '\':', 'error', NAME );
                                    Y.log( error.message, 'error', NAME );
                                    Y.log( error.stack, 'error', NAME );
                                    adapter.error( error );
                                    return;

                                }
                            }

                            /**
                             * reate AC object for a particular controller.
                             * @type {Y.mojito.ActionContext}
                             */
                            newAC = new Y.mojito.ActionContext( {
                                command: command,
                                controller: Y.mojito.util.heir( controller ),
                                dispatcher: dispatcher, // NOTE passing dispatcher.
                                adapter: adapter,
                                store: dispatcher.store,
                                actionFunction: actionFunction //for console
                            } );
                            
                            /**
                             * calling controller method
                             */
                            controller[ actionFunction ]( newAC );
                        }

                    });
            }
        };

    },
    '0.0.1', {requires: [
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
        'dclicmgr',
        'RESTController',
        'form-schema',
        'questionnaire-schema',
        'person-schema',
        'message-schema',
        'patient-schema',
        'auth-schema',
        'audit-schema',
        'customer-schema',
        'company-schema',
        'contact-schema',
        'patientalert-schema',
        'dccommonutils',
        'dcvalidations',
        'dcschemaloader',
        'intime-schema',
        'sysnum-schema',
        'employee-schema',
        'identity-schema',
        'calendar-schema',
        'schedule-schema',
        'repetition-schema',
        'practice-schema',
        'scheduletype-schema',
        'patientreg-schema',
        'metaprac-schema',
        'settings-schema'
    ]} );
