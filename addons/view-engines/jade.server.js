/**
 Adding the Jade template engine to Mojito
 @author: rrrw
 date: 2012-12-01
 */

/*global YUI*/
'use strict';

YUI.add( 'addons-viewengine-jade', function( Y, NAME ) {

    var fs = require( 'fs' ),
        // need this precision because we are running in mojito's directory.
        jade = require( __dirname + '/../../node_modules/pug' ),
        envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
        i18nMode = envConfig.i18nMode,
        psWorkDir = process.cwd(),
        slowjade = [cacheInCaseMojit(), cacheMirrorPatientMojit()].filter( isNotNullThenCache => isNotNullThenCache ),
        cacheSlowJade = {
            html: '',
            mojit_guid: '',
            mojit_view_id: ''
        },
        skipJadeCache = -1 !== process.argv.indexOf( '--skipJadeCache' ),
        skipJadeCacheFull = -1 !== process.argv.indexOf( '--skipJadeCacheFull' );

    function cacheInCaseMojit() {
        if( !Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isDCPRC() ) {
            return {
                path: `${psWorkDir}/mojits/InCaseMojit/views/inCaseMojit.jade.html`,
                guid: 'dummy_mojit_guid',
                view_id: 'dummy_mojit_view_id',
                assets: '/static/InCaseMojit/assets'
            };
        }
        return null;
    }

    function cacheMirrorPatientMojit() {
        if( Y.doccirrus.auth.isISD() ) {
            return {
                path: `${psWorkDir}/mojits/MirrorPatientMojit/views/mirrorpatient_nav.jade.html`,
                guid: 'dummy_mojit_guid_2',
                view_id: 'dummy_mojit_view_id_2',
                assets: '/static/InCaseMojit/assets'
            };
        }
        return null;
    }

    function JadeAdapter( viewId ) {
        this.viewId = viewId;
    }

    JadeAdapter.prototype = {

        render: function( data, mojitType, tmpl, adapter, meta ) {

            var
                mytmpl = tmpl,
                mymeta = meta;

            // Check mojito@0.5.8, tmpl is an object
            if( tmpl && tmpl["content-path"] ) {
                mytmpl = tmpl["content-path"];
            }
            // handle abort of view generation
            if( meta && meta.view && meta.view.abort ) {
                Y.log( 'Jade templating aborted', 'warn', NAME );
                adapter.done( '<!--redirect-->', mymeta );
            } else {
                if( !Y.Lang.isObject( data ) ) {
                    data = {};
                }

                data.__i18n = Y.doccirrus.i18n;

                if( slowjade.some( item => item.path === mytmpl ) && cacheSlowJade.html ) {

                    Y.log( `Load ${mytmpl} from cache using language ${Y.doccirrus.i18n.language}`, 'info', NAME );

                    if( i18nMode ) {
                        //console.time( 'substitute-i18n' );
                        cacheSlowJade.html = cacheSlowJade.nativeHtml.replace( /__i18n\('(.+?)'\)/g, ( all, subgroup ) => data.__i18n( subgroup ) );
                        //console.timeEnd( 'substitute-i18n' );
                    }

                    cacheSlowJade.html = cacheSlowJade.html.replace( cacheSlowJade.mojit_guid, data.mojit_guid ).replace( cacheSlowJade.mojit_view_id, data.mojit_view_id );
                    cacheSlowJade.mojit_guid = data.mojit_guid;
                    cacheSlowJade.mojit_view_id = data.mojit_view_id;
                    if( mymeta.__timing ) {
                        mymeta.__timing.push( {jadeRenderCache: Date.now()} );
                    }

                    adapter.done( cacheSlowJade.html, mymeta );
                } else {
                    jade.renderFile( mytmpl, data, function( err, html ) {
                        if( err ) {
                            Y.log( 'Jade template error ' + err, 'error', NAME );
                        } else if( !html ) {
                            Y.log( 'Jade template empty, but no error.  ' + JSON.stringify( mytmpl ) + ' empty ', 'warn', NAME );
                        }
                        if( !skipJadeCacheFull && slowjade.some( item => item.path === mytmpl ) ) {
                            cacheSlowJade.html = html;
                            cacheSlowJade.nativeHtml = html;
                            cacheSlowJade.mojit_guid = data.mojit_guid;
                            cacheSlowJade.mojit_view_id = data.mojit_view_id;
                        }
                        if( mymeta.__timing ) {
                            mymeta.__timing.push( {jadeRenderFresh: Date.now()} );
                        }

                        adapter.done( html, mymeta );
                    } );
                }
            }

        },
        compile: function( data, mojitType, tmpl, adapter, meta ) {
            var mymeta = meta,
                myadapter = adapter,
                js = '',
                options = {
                    filename: tmpl,
                    compileDebug: false
                };

            fs.readFile( tmpl, 'utf-8', function( err, result ) {
                if( result ) {
                    setImmediate( function() {
                        js = jade.compileClient( result, options );
                        myadapter.done( js, mymeta );
                    } );
                } else {
                    myadapter.done( '<undefined></undefined>', mymeta );
                    Y.log( 'Jade template compilation error result empty: ' + err, 'error', NAME );
                }
            } );
        }
    };
    if( !skipJadeCache && !skipJadeCacheFull ) {
        (function init() {
            slowjade.forEach( slowjadeObj => {

                let
                    bestLang = 'de',
                    dummyData = {
                        status: 'ok',
                        data: null,
                        mojit_guid: slowjadeObj.guid,
                        mojit_view_id: slowjadeObj.view_id,
                        mojit_assets: slowjadeObj.assets,
                        page: {},
                        __i18n: i18nMode ? ( key ) => `__i18n('${key}')` : Y.doccirrus.i18n,
                        mvprc: Y.doccirrus.auth.isMVPRC() && ( Y.doccirrus.schemas.company.systemTypes.MEDNEO === Y.doccirrus.auth.getSystemType() ),
                        filename: slowjadeObj.path
                    };

                Y.Intl.setLang( 'doccirrus', bestLang );
                Y.use( 'lang/' + 'doccirrus' + '_' + bestLang );

                Y.log( 'jade loader. pre render slow jade', 'info', NAME );
                // execute compile on the inCaseMojit to speedup the process.
                jade.compileFile( slowjadeObj.path, {cache: true} );
                jade.renderFile( slowjadeObj.path, dummyData, function( err, html ) {
                    if( err ) {
                        Y.log( 'Jade template error ' + err, 'error', NAME );
                    } else if( !html ) {
                        Y.log( 'Jade template empty, but no error.  ' + JSON.stringify( slowjadeObj ) + ' empty ', 'warn', NAME );
                    }
                    cacheSlowJade.html = html;
                    cacheSlowJade.nativeHtml = html;
                    cacheSlowJade.mojit_guid = dummyData.mojit_guid;
                    cacheSlowJade.mojit_view_id = dummyData.mojit_view_id;
                } );
            } );

        })();
    }

    Y.namespace( 'mojito.addons.viewEngines' ).jade = JadeAdapter;
}, '0.1.0', {
    requires: [
        'doccirrus',
        'mojito',
        'dcauth',
        'dclicmgr'
    ]
} );
