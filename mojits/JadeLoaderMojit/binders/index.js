/*
 (c) Doc Cirrus Gmbh, 2013
 */

/**
 * The DC Jade Repository loads compiled Jade templates from the server
 * and caches them. All this is available via the global YUI object,
 * so easy to use from any binder that has the code available.
 *
 * @class dcJadeRepository
 */

/*global YUI, alert*/

'use strict';

YUI.add( 'dcJadeRepository', function( Y, NAME ) {

    // --------   static helper functions ----------
    /**
     * Wraps the eval call.
     * @param code  the code to eval
     * @param templateId  the template that we are expecting to load -- reqd as a security check
     * @return {Boolean} true if @code meets the required criteria and was eval'ed, false otherwise.
     */
    function executeCode( code, templateId ) {
        /*jshint evil: true */
        if( 0 === code.indexOf( 'YUI.dcJadeRepository.__html[\'' + templateId + '\']' ) ) {
            try {
                eval( code ); //eslint-disable-line no-eval
            } catch( evalErr ) {
                Y.log( 'Could not run template ' + templateId + ': ' + evalErr, 'warn', NAME );
                Y.log( code, 'debug', NAME );
            }

            return true;
        }
        return false;

    }

    /**
     * initRepositories of Javascript and indexes to nodes
     * __html -- jade js
     * __code -- binder js
     * __node -- index of nodes by id and their loaded templateId
     */
    function initRepositories() {
        if( !YUI.dcJadeRepository.__html ) {
            YUI.dcJadeRepository.__html = {};
        }
        if( !YUI.dcJadeRepository.__code ) {
            YUI.dcJadeRepository.__code = {};
        }
        if( !YUI.dcJadeRepository.__node ) {
            YUI.dcJadeRepository.__node = {};
        }
        if( !YUI.dcJadeRepository.__datarow ) {
            YUI.dcJadeRepository.__datarow = {};
        }
    }

    /**
     * Static helper to load template and binder into the repository.
     * @param templatename
     * @param mojitname
     * @param callback
     */
    function loadTemplateAndBinder( templatename, mojitname, callback ) {
        var
            templateId;
        if( !templatename ) {
            callback( 'Incorrect parameter templatename supplied to JadeLoader, template load failed.', null );
            return;
        }
        if( !mojitname ) {
            callback( 'Incorrect parameter mojit name supplied to JadeLoader, template load failed.', null );
            return;
        }
        templateId = YUI.dcJadeRepository.getTemplateId( templatename, mojitname );
        if( YUI.dcJadeRepository.__html[ templateId ] ) {
            // exists
            callback( null, templateId );
            return;
        }

        // go get the real McCoy
        Y.doccirrus.ajax.send( {
            action: 'GET',
            url: '/r/jade/' + mojitname + '?template=' + templatename,
            success: function( result ) {
                if( result ) {
                    // take a peek inside the string result
                    if( executeCode( result, templateId ) ) {
                        // at this point the code has been loaded, so load the binder code
                        // but not everyone has a binder, so check first
                        if( YUI.dcJadeRepository.__code[ templateId ] ) {
                            // pass in the templates name and YUI for logging.
                            YUI.dcJadeRepository.__code[ templateId ] = YUI.dcJadeRepository.__code[ templateId ]( Y, templateId );
                        }
                        callback( null, templateId );
                        return;
                    }
                }
                callback( 'Malformed pug script returned to JadeLoader, template load failed: ' + templateId, templateId );

            },
            /**
             * @TODO: RW: use the callback( error, ? ) here
             */
            error: function( /* xhr, status, error */ ) {

                var
                    isPatientPortal = false,
                    path = document.location.pathname;
                if( 0 === path.lastIndexOf( '/intime', 0 ) ||
                    0 === path.lastIndexOf( '/intime/patient', 0 ) ) {
                    isPatientPortal = true;
                }
                alert( 'JADELOADER Die Kommunikation mit dem Server ist gestört.  Bitte versuchen Sie es in ein paar Minuten erneut.' ); //eslint-disable-line no-alert
                if( isPatientPortal ) {
                    document.location = '/intime';
                } else {
                    // document.location = '/logout';
                }

            }
        } );
    }

    function getBaseNodeId( e, withNum, isShort ) {
        var
            splitarr,
            name,
            num;
        name = e.currentTarget.get( 'name' );
        splitarr = name.split( '.' );
        if( 1 < splitarr.length ) {
            name = splitarr[ 1 ];
        } else {
            name = '';
        }
        if( withNum && 2 < splitarr.length ) {
            num = splitarr[ splitarr.length - 1 ];
            name = name +
                   '\\.' +
                   num;
        }
        // there must be an additional node id at pos 2
        if( !isShort ) {
            name = name + '\\.' + splitarr[ 2 ];
        }

        return name;
    }

    function getTemplateIdFromEvent( e ) {
        return getBaseNodeId( e, false, true );
    }

    function checkTargetNode( node, callback ) {
        if( !node || null === node || 'object' !== typeof node ) {
            if( Y.config.debug ) {
                Y.log( 'Target node: ' + JSON.stringify( node ), 'debug', NAME );
            }
            callback(
                'Bad Target Node supplied for Jade load procedure.',
                null
            );
            return false;
        }
        return true;
    }

    var
        FRAME_MOJIT = 'JadeLoaderMojit',
        FRAME_ROW_VIEW = 'auxframerow',
        jl = {
            loadNodeHTML: function( params ) {
                var
                    path = params.path,
                    node = params.node,
                    binder = params.binder,
                    templateId = path,
                    binderData = params.binderData,
                    auxFrameRowsKey = params.auxFrameRowsKey,
                    promise;
                initRepositories();
                if( YUI.dcJadeRepository.__node[ node.get( 'id' ) ] ) {
                    YUI.dcJadeRepository.deregisterHandler( YUI.dcJadeRepository.__node[ node.get( 'id' ) ], node, auxFrameRowsKey, binderData );
                }
                if( YUI.dcJadeRepository.__html[ templateId ] ) {
                    promise = Promise.resolve( YUI.dcJadeRepository.__html[ templateId ] );
                } else {
                    promise = Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( { path: path } ) )
                        .then( function( response ) {
                            return response && response.data;
                        } );
                }
                return promise
                    .then( function( html ) {
                        YUI.dcJadeRepository.__html[ templateId ] = html;
                        YUI.dcJadeRepository.__node[ node.get( 'id' ) ] = templateId;
                        YUI.dcJadeRepository.__code[ templateId ] = binder;
                        node.set( 'innerHTML', html );
                        YUI.dcJadeRepository.registerHandler( templateId, node, auxFrameRowsKey, binderData );
                    } );
            },
            /**
             * loadNodeFromTemplate()
             *
             * Calls the callback when the Jade Script is available in the cache.
             *
             * Fetches the jade script from the server if required.
             *
             * @param templatename  name of template file  (without suffix)
             * @param mojitname  full mojit name
             * @param options  options to feed into the template script
             * @param node  the node whose HTML will be replaced with the loaded template HTML
             *              If the node is null or undefined, will not continue and will return
             *              an error in the callback.
             * @param callback  function(err,string) on success err === null, str == 'ok'
             */
            loadNodeFromTemplate: function( templatename, mojitname, options, node, callback ) {
                // initialise code and html cache
                initRepositories();

                if( !Y.Lang.isObject( options ) ) {
                    options = {};
                }
                options.__i18n = Y.doccirrus.i18n;

                if( undefined !== options && undefined === options.auxFrameRowsKey ) {
                    Y.log( 'auxFrameRowsKey is empty', 'debug', NAME );
                    options.auxFrameRowsKey = null;
                }

                // check the target node is valid
                if( !checkTargetNode( node, callback ) ) {
                    Y.log( 'Invalid target node', 'debug', NAME );
                    return;
                }

                // do the template and binder loading
                Y.log( 'Loading template and binder: ' + templatename + ' on mojit ' + mojitname, 'debug', NAME );

                loadTemplateAndBinder( templatename, mojitname, function( err, templateId ) {
                    var
                        htmlStr;

                    Y.log( 'Loaded template and binder: ' + templatename + ' on mojit ' + mojitname, 'debug', NAME );

                    function fillDataIntoHTML( htmlStr ) {
                        // Y.log( 'original html string: ' + htmlStr );

                        //...

                        //Y.log( 'replaced html string: ' + htmlStr );
                        return htmlStr;
                    }

                    if( node && !node.get( 'id' ) ) {
                        node.generateID();
                    }
                    if( !err ) {
                        if( null !== node ) {
                            // if the node was already dynamically filled ...
                            if( YUI.dcJadeRepository.__node[ node.get( 'id' ) ] ) {
                                YUI.dcJadeRepository.deregisterHandler( YUI.dcJadeRepository.__node[ node.get( 'id' ) ], node, options.auxFrameRowsKey, options );
                            }
                            htmlStr = YUI.dcJadeRepository.getHTMLString( templateId, options );
                            if( htmlStr ) {
                                htmlStr = fillDataIntoHTML( htmlStr, options );
                                node.set( 'innerHTML', htmlStr );
                                //                                // the clean way to create nodes
                                //                                node.create( htmlStr );
                            }
                            else {
                                Y.log( 'Incorrect options supplied to template, or template empty.' );
                            }
                            YUI.dcJadeRepository.__node[ node.get( 'id' ) ] = templateId;
                            YUI.dcJadeRepository.registerHandler( templateId, node, options.auxFrameRowsKey, options );
                        }
                        callback( null, 'ok', {
                            destroy: function() {
                                if( YUI.dcJadeRepository.__node[ node.get( 'id' ) ] ) {
                                    YUI.dcJadeRepository.deregisterHandler( YUI.dcJadeRepository.__node[ node.get( 'id' ) ], node, options.auxFrameRowsKey, options );
                                }
                            }
                        } );
                    } else {
                        Y.log( 'Problem Loading template ' + err, 'error', NAME );
                        callback( err, null );
                    }

                } );

            },
            /**
             * Loads a auxiliary type helper frame.
             *
             * Auxiliary types are types that describe sub-documents in the DC ER Diagramme UML.
             * These types are complex and included, i.e. they mostly may occur several times in
             * a given document.
             * The AuxFrame always has the same logic and and allows Jade forms to be loaded several
             * times in a subframe relating to a SINGLE specific document.
             *
             * Use CSS to affect where they are placed and how they look etc to fit the
             * context.
             *
             *
             *    Assuming you are calling this from a Parent form, which is
             *    currently showing a record with _id = @key, and you wish
             *    to add the aux helper frame into node @node, you will see the
             *    following structure:
             *
             * +--------------------------------------------------------------------+
             * | JadeLoaderMojit/views/auxframe.jade + js                           |
             * | +--------------------------------------------------------------+   |
             * | |  JadeLoaderMojit/views/auxframerow.jade         +----------+ |   |
             * | |  note: there is no binder for this subelement   | .auxbtn1 | |   |
             * | | +-------------------------------------------+   +----------+ |   |
             * | | |   DataViewMojit/views/@typename.jade + js     |   +----------+ |   |
             * | | |   note: this is where the actual medical  |   | .auxbtn2 | |   |
             * | | |      information is captured, saved etc.  |   +----------+ |   |
             * | | +-------------------------------------------+                |   |
             * | +--------------------------------------------------------------+   |
             * | ...                                                                |
             * | +--------------------------------------------------------------+   |
             * | | auxframerow (N), structure as above                          |   |
             * | +--------------------------------------------------------------+   |
             * |                                                                    |
             * | +----------+                                                       |
             * | | .auxsave |                                                       |
             * | +----------+                                                       |
             * +--------------------------------------------------------------------+
             *
             *
             *
             * @param schemaname  the name of the parent schema for the document
             * @param typename  the complex type or sub-schema that we need to display
             * @param key   the key identifying the document, to which the sub-documents belong,
             *              if blank we assume this is a new record and no data will be loaded.
             * @param node  the node to which to write HTML
             * @param callback  function( err, count ), where count is the number of data filled
             *                  and loaded sub-documents for this key
             */
            addRowAuxHelper: function( e ) {
                var
                    item,
                    templId,
                    html,
                    nodeid,
                    tnode,
                    nodes,
                    data = {};
                templId = getTemplateIdFromEvent( e );
                nodeid = getBaseNodeId( e );
                // get the table node and number of rows in the table
                tnode = Y.one( '#tbody_' + nodeid );
                nodes = tnode.all( '.auxframerow' );
                // build the data we need to inject into the new row
                data.html = YUI.dcJadeRepository.__datarow[ templId ];
                data._partId = templId + '.' + nodes.size();
                data._rowcounter = nodes.size();
                if( templId && data.html && nodes.size() ) {
                    // build html of new row
                    html = YUI.dcJadeRepository.getHTMLString(
                        YUI.dcJadeRepository.getTemplateId(
                            FRAME_ROW_VIEW,
                            FRAME_MOJIT ),
                        data );
                    item = Y.Node.create( html );
                    // register binder to the row node
                    YUI.dcJadeRepository.registerHandler( templId, item );
                    tnode.appendChild( item );
                } else {
                    //console.dir( e );
                    console.log( 'Click add from button with unmatchable template name.' ); //eslint-disable-line no-console
                }
            },
            removeRowAuxHelper: function( e ) {
                var
                    rowname,
                    name,
                    tnode;

                name = getTemplateIdFromEvent( e );
                // get the tr from the button...
                rowname = getBaseNodeId( e, true, true );
                tnode = Y.one( '#' + rowname );
                YUI.dcJadeRepository.deregisterHandler( name, tnode );
                tnode.remove( true );
            },
            /**
             *
             * @param templateid  templateId of required template
             * @param options  options to feed into the template script
             * @return string  HTML result or
             *                 undefined if an option was missing or null if template unavailable
             */
            getHTMLString: function( templateId, options ) {
                if( YUI.dcJadeRepository.__html[ templateId ] ) {
                    return YUI.dcJadeRepository.__html[ templateId ]( options );
                }
                return null;

            },
            /**
             * Similarly to mojito's binder concept, the Jade Templates
             * that are dynamically loaded can have binders
             *
             * @param templateId  templateId of required template
             * @param node  the node to which we should add event handlers
             */
            registerHandler: function( templateId, node, key, options ) {
                if( YUI.dcJadeRepository.__code[ templateId ] &&
                    YUI.dcJadeRepository.__code[ templateId ].registerNode ) {
                    YUI.dcJadeRepository.__code[ templateId ].registerNode( node, key, options );
                }
            },
            deregisterHandler: function( templateId, node, key, options ) {
                if( YUI.dcJadeRepository.__code[ templateId ] &&
                    YUI.dcJadeRepository.__code[ templateId ].deregisterNode ) {
                    YUI.dcJadeRepository.__code[ templateId ].deregisterNode( node, key, options );
                }
            },
            /**
             * @param templatename  name of required template (without suffix '.jade')
             * @param mojitname  full mojit templateId
             * return  templateId  String  or null.
             */
            getTemplateId: function( templatename, mojitname ) {
                return mojitname + '_' + templatename;
            }

        };

    Y.namespace( 'mojito.binders' )[ NAME ] = {
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function() {
            // attach to YUI so the others can access us directly.
            YUI.dcJadeRepository = jl;
        }

    };
}, '1.0.1', {
    requires: [
        'doccirrus',
        'JsonRpc',
        'mojito-rest-lib',
        'dcschemaloader',
        'dcvalidations',
        'dcerrortable'
    ]
} );

