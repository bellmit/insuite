/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


YUI.add( 'JadeLoaderMojit', function( Y, NAME ) {

        var
            fs = require( 'fs' ),
            _loader = Y.Env._loader;

        //  Helper object for loading and compiling Jade templates

        function LightWeightAdapter( actionContext, fnName ) {
            this.myAc = actionContext;
            this.fnName = fnName;
            this.il8nDict = { };
        }

        /**
         *  Attempt to load internationalization dictionary for user's current language
         *  @param  mojitName   {string}
         */

        LightWeightAdapter.prototype.loadIl8nDict = function(mojitName) {
            var
                ac = this.myAc,
                tempController = ac.instance.controller;

            Y.Intl.setLang( mojitName, Y.Intl.getLang( NAME ) );

            ac.instance.controller = mojitName;
            ac.instance.controller = tempController;

            Y.log('Checking for translation dictionary on mojit: ' + mojitName, 'info', NAME);

        };


        /*
        LightWeightAdapter.prototype.flattenIl8nDict = function(nestedDict) {
            var
                k,
                flatDict = {};

            for (k in nestedDict) {
                if (nestedDict.hasOwnProperty(k)) {
                    if ('string' === typeof nestedDict[k]) {
                        flatDict
                    }
                }
            }

            return flatDict;
        };
        */

        LightWeightAdapter.prototype.done = function( html, meta ) {
            var
                k,                  //  for enumerating over il8n dictionary
                matchTranslation,   //  compiled dictionary key to replace
                result,             //  javascript to be run by client
                index = html.indexOf('function template(locals)'),
                strBefore,
                strAfter,
                finalStr;

//            Y.log( 'META ' + JSON.stringify( meta.http ) +
//                   '\nBINDERCODE: ' + ( meta.javascript || '' ) +
//                   '\nJADESCRIPT: ' + html, 'info', NAME );

            if( 0 < index ) {
                strAfter = html.substr(index);
                strBefore = html.substr(0, index);
                finalStr = strAfter + ' ;' + strBefore;
            }

            result = 'YUI.dcJadeRepository.__html[\'' + this.fnName + '\'] = ' + (finalStr ? finalStr : html) + ';';
            if( meta.javascript ) {
                result += 'YUI.dcJadeRepository.__code[\'' + this.fnName + '\'] = ' + meta.javascript + ';';
            }

            for (k in this.il8nDict) {
                if (this.il8nDict.hasOwnProperty(k)) {
                    // look for invocations / interpretations of this jade var in compiled script
                    //matchTranslation = '(jade.escape((jade.interp = ' + k + ') == null ? \'\' : jade.interp))';
                    matchTranslation = '(jade.escape((jade_interp = ' + k + ') == null ? \'\' : jade_interp))';
                    //Y.log('Searching for: ' + matchTranslation, 'warn', NAME);

                    if (result.indexOf(k) > 0) {
                        Y.log('Embedding translation in pug view: ' + k + ' ==> ' + this.il8nDict[k]);
                        result = result.replace(matchTranslation, "'" + this.il8nDict[k] + "'");
                    }
                }
            }

            this.myAc.done( {
                'data': result,
                'status': 'ok'
            }, meta );
        };

        function reformatFn( fnStr ) {
            var
                res,
                idx = -1;
            if( ('string' === typeof fnStr) && 0 < fnStr.length ) {
                res = /_fn\w*\(/.exec( fnStr );
                if( res ) {
                    idx = fnStr.indexOf( '\n', res.index );
                    return 'function( Y, NAME ) {' + fnStr.substr( idx );
                }
                Y.log( 'Non-standard javascript, cannot load javascript file', 'error', NAME );
                return '';

            }
            throw new Error( 'Cannot reformat non-String.' );

        }

        /**
         * The JadeLoaderMojit module.
         *
         * @module JadeLoaderMojit
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method corresponding to the 'index' action, delivers HTML.
             *
             * @param  {Object} ac The ActionContext that provides access
             *        to the Mojito API.
             */
            __call: function( ac ) {
                var meta = { 'view': {} };

                Y.log( 'Entering...', 'info', NAME );

                // all we really want to do is inject our JadeLoader so that
                // it can be used by the other binders.
                // ac.assets.addJs('/static/JadeLoaderMojit/assets/jadeloader.js');
                meta.view.name = 'index';
                meta.view.id = 'JadeLoaderBinder';
                ac.done(
                    {
                        status: 'ok',
                        data: {}
                    },
                    meta
                );

            },

            //
            //  ===========================  REST METHODS ========================
            //

            'get': function( ac ) {
                var
                    meta = {},
                    params = ac.rest.originalparams,
                    templatename = (params.template || ''),
                    mojitname = (ac.rest.field || ''),
                    moduleInfo = _loader.getModuleInfo( mojitname ),
                    mojitpath = moduleInfo ?
                        moduleInfo.fullpath.replace( '/controller.server.js', '' ) :
                        (__dirname + '/../' + mojitname),
                    templatepath = mojitpath +
                                   '/views/' +
                                   templatename + '.pug',
                    binderpath = mojitpath +
                                 '/binders/' +
                                 templatename + '.js',
                    jade = new Y.mojito.addons.viewEngines.jade( Date.now() ),
                    adapter = new LightWeightAdapter( ac, mojitname + '_' + templatename),
                    data = {};

                Y.log('GET pug template - mojit name: ' + mojitname, 'info', NAME);

                adapter.loadIl8nDict.call(adapter, mojitname);

                /**
                 * Function to read Javascript File
                 * @param {String} path
                 * @param {Function} callback
                 */
                function loadJavascript( path, callback ) {
                    fs.stat( path, function( err, stats ) {
                        if( !err &&
                            stats &&
                            stats.isFile() ) {
                            fs.readFile( path, 'utf-8', function( err, result ) {
                                if( err ) {
                                    // rare disk error, but this could be fatal for the client.
                                    Y.log( templatepath + ' error reading. ' + err, 'debug', NAME );
                                    return setImmediate( callback );
                                }
                                meta.javascript = reformatFn( result );
                                callback();

                            } );
                        } else {
                            Y.log( templatepath + ' template without binder code.', 'debug', NAME );
                            return setImmediate( callback );
                        }

                    } );

                }

                // check params
                if( !templatename ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 400, 'jadeTemplate: missing templatename' );
                    return;
                }
                if( !templatename ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 400, 'jadeTemplate: missing ref (binder ref)' );
                    return;
                }

                Y.log( 'jadeTemplate', 'info', NAME );
                // Make sure we have meta
                meta.http = meta.http || {};
                meta.http.headers = meta.http.headers || {};

                loadJavascript( binderpath, function() {
                    jade.compile( data, 'custom', templatepath, adapter, meta, [] );
                } );

            },

            /**
             *  Get a dictionary in the user's current language
             *  @param ac
             */

            getdict: function ( ac ) {

                if (false === ac.rest.originalparams.hasOwnProperty('mojit')) {
                    ac.rest.originalparams.mojit = '';
                }

                var
                    il8nDict,
                    mojitName = ac.rest.originalparams.mojit,
                    tempController = ac.instance.controller,
                    finish = this._getCallback( ac );

                Y.log('Setting language to de for controller ' + mojitName, 'debug', NAME);
                // Y.Intl.setLang( mojitName, 'de' );

                //  brief context switch to get another mojit's asset with mojit-intl
                ac.instance.controller = mojitName;
                il8nDict = ac.intl.lang();
                ac.instance.controller = tempController;

                finish(null, il8nDict);

            },

            put: function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'PUT', NAME );
            },

            post: function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'POST', NAME );
            },

            'delete': function( ac ) {
                Y.doccirrus.utils.unsupportedActionJSON( ac, 'DELETE', NAME );
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'mojito',
            'mojito-http-addon',
            'mojito-config-addon',
            'mojito-assets-addon',
            'mojito-models-addon',
            'mojito-meta-addon',
            'mojito-params-addon',
            'mojito-intl-addon',
            'addons-viewengine-jade'
        ]
    }
);
