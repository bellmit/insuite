/**
 * User: rrrw
 * Date: 26/10/2012  16:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

/**
 * RESTController
 *
 * This DocCirrus Sub-Controller allows a HTTP/JSON interface to the MongoDB functionality.
 *
 * RESTController calls e.g.
 *
 * /r/model/id   or  'all'
 *
 * /r/model?query="key_operator,value,key,value,etc."
 *     e.g. query=INV_gt,4356,PED_lte,2012-09-02
 *
 * /r/<model>/<customFunction>?<params>&action=<customFunction>    // note duplication still required
 *
 * Paging and other options...
 *
 * @class RESTController
 *
 */


YUI.add( 'RESTController', function( Y, NAME ) {

        /*  ****************************
         *
         *   Generic Mojit REST Controller functions that are injected or applied to
         *   all REST mojits.
         *
         *  ****************************/

        var
        // local variables
            REST_PARAM = '__rest',
            propertyInjection = {};


        // the following function is used to route to custom rest calls
        // default / supportedActions calls are defined once for all
        // mojits in this RESTController.
        propertyInjection[REST_PARAM] = function( ac ) {
            /**
             * Structure of a local REST handler:
             *
             * 'REST_PARAM': function( ac )
             *      this is the local dispatcher function
             *      it interprets the params and calls
             *      the appropriate function that will actually
             *      do the handling. This structure enables
             *      one template to bespecified and used for all
             *      local rest calls.
             *
             * A_LOCAL_FUNCTION: function( ac )
             *      The local functions must put their JSON results
             *      in an object with a .data property.
             *      They must then call ac.done with the property
             *      to return their results up the stack.
             */
            var
                params = ac.params.getFromMerged(),
                action;
            ac.rest = params[REST_PARAM];
            action = ac.rest[Y.doccirrus.urls.PARAM_ACTION];

            // Y.log( '__rest main using - ' + JSON.stringify( params ), 'info', this.NAME );

            // We May add the auth setup code for REST digest auth here.

            if( this[ac.rest.field] && ('get' === action || 'post' === action) ) {
                // call the custom function defined in the field
                Y.log( 'Entering ' + REST_PARAM + ' on ' +
                       this.NAME + ' REST interface for: ' +
                       ac.rest.field, 'info', this.NAME );
                this[ac.rest.field]( ac );
            } else if( this[action] ) {
                // call the actual action
                Y.log( 'Entering ' + REST_PARAM + ' on ' +
                       this.NAME + ' REST interface for: ' +
                       action, 'info', this.NAME );
                this[action]( ac );
            } else {
                ac.done( '{ message: \'' + this.NAME + ' REST: Called undefined action: ' + action + '\'}' );
            }

        };

        /**
         * The generic wrap up function.
         * Returns an restReturn function that can be used as a callback and is
         * standardised - here DC REST standards will be applied to automatically make sure
         * meta data, paging info etc. goes with every answer.
         *
         * @param {Object}      ac - action context
         * @param {Object}      meta - additional meta items to mix in
         * @return {Function} restReturn(err, data), where
         *              err: if string, then returns 500 error with the
         *              err string as the reasonPhrase. Alternatively, you
         *              can use Y.doccirrus.errors.http(code,msg) to make
         *              an error that will also set the code.
         *              data: object to return.
         */
        propertyInjection._getCallback = function _getCallback( ac, meta ) {
            var
                mymeta = meta || {},
                myAc = ac;
            return function restReturn( err, response ) {
                var
                    innerMeta = {
                        'http': {
                            headers: {
                                'content-type': 'application/json; charset=utf-8'
                            }
                        }
                    },
                    data;

                innerMeta = Y.merge( innerMeta, mymeta );
                if( !err ) {
                    data = JSON.stringify( response );
                    if( !data ) {
                        Y.log( 'REST returning EMPTY RESPONSE', 'info', NAME );
                        // override whatever falsy value (undefined or '') and set to empty array string.
                        data = '[]';
                    } else {
                        Y.log( 'REST returning ' + data.substr( 0, 20 ), 'debug', NAME );
                    }
                    myAc.done( {
                        'data': data,
                        'status': 'ok'
                    }, innerMeta );
                } else {
                    if( err.name && 'ValidationError' === err.name ) {
                        Y.doccirrus.utils.reportErrorJSON( myAc, (err.code || 400), (err.reasonPhrase || err.toString()) );
                    } else {
                        Y.doccirrus.utils.reportErrorJSON( myAc, (err.code || 500), (err.reasonPhrase || err.toString()) );
                    }
                }
            };
        };

        /**
         * Search for a record, or carry out a custom action.
         * @param {Object}      ac
         */
        propertyInjection.get = function GET( ac ) {
            var
                callback = this._getCallback( ac );

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: this.getModelName(),
                user: ac.rest.user,
                query: ac.rest.query,
                options: ac.rest.options
            }, callback );
        };

        /**
         * Insert new record(s) or overwrite (them).
         * @param {Object}      ac
         */
        propertyInjection.post = function POST( ac ) {
            var
                data = ac.rest.originalparams,
                callback = this._getCallback( ac );

            //  Clean of XSS and other bad stuff before saving to database
            data = Y.doccirrus.filters.cleanDbObject( data );

            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: this.getModelName(),
                user: ac.rest.user,
                data,
                options: ac.rest.options
            }, callback );
        };

        /**
         * Requires an ID --> then updates the record with new data.
         * Idempotent -- i.e. if called several times, will have same effect on the record.
         * Of course, if another process changes the record in between calls, the idempotency
         * still holds, but the results may be not what one expected!
         * @param {Object}      ac
         */
        propertyInjection.put = function PUT( ac ) {
            var
                data = ac.rest.originalparams,
                callback = this._getCallback( ac );

            //  Clean of XSS and other bad stuff before saving to database
            data = Y.doccirrus.filters.cleanDbObject( data );

            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: this.getModelName(),
                user: ac.rest.user,
                fields: ac.rest.field,
                query: ac.rest.query,
                data
            }, callback );
        };

        /**
         * Delete a record or records.
         * @param {Object}      ac
         */
        propertyInjection.delete = function DELETE( ac ) {
            var
                callback = this._getCallback( ac );

            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: this.getModelName(),
                user: ac.rest.user,
                query: ac.rest.query,
                options: ac.rest.options
            }, callback );
        };

        /**
         * Given a URI friendly
         *
         *     query=INV_gt,4356,PED_lte,2012-09-02
         *
         *     operators:  _gt, _gte, _lt, etc.
         *
         *     for a full list, see the DCQuery documentation
         *
         * Creates the corresponding Mongodb query.
         * @param {String}      query
         * @return {Object}
         */
        function translateQueryStringIntoObject( query ) {
            var
                dcquery = new Y.doccirrus.DCQuery( query );

            return dcquery.getQueryAsObj();
        }

        /**
         * Given a URI friendly  sort=FLD1,1,FLD2,-1
         *
         * Creates the corresponding Mongodb sort object.
         * @param  {String}         sort
         * @return {Object}
         */
        function translateSortStringIntoObject( sort ) {
            var
                i,
                val,
                osort = {},
                arrsort = sort.split( ',' );

            for( i = 0; i < Math.floor( arrsort.length / 2 ); i++ ) {
                val = decodeURIComponent( arrsort[(i * 2) + 1] );
                osort[arrsort[i * 2]] = ('1' === val ? 1 : -1 );
            }
            //Y.log( 'Translated ' + sort + ' / ' + JSON.stringify( osort ), 'info', NAME );

            return osort;

        }

        function getDCParamOptions( params ) {
            var
                opt = {};

            if( params[Y.doccirrus.urls.PARAM_LIMIT ] ) {
                opt.limit = +params[Y.doccirrus.urls.PARAM_LIMIT ];
            }

            if( params[Y.doccirrus.urls.PARAM_PAGE ] ) {
                opt.skip = (+params[Y.doccirrus.urls.PARAM_PAGE ] - 1) * opt.limit;
            }

            opt.sort = (params[Y.doccirrus.urls.PARAM_SORT] ? translateSortStringIntoObject( params[Y.doccirrus.urls.PARAM_SORT] ) : {});

            opt.paging = params[ Y.doccirrus.urls.PARAM_PAGING ];

            return opt;
        }

        function getRESTParams( params, obj ) {
            if( !params || !obj || 'object' !== typeof obj ) {
                return;
            }

            obj.query = (params[Y.doccirrus.urls.PARAM_SEARCH] ? translateQueryStringIntoObject( params[Y.doccirrus.urls.PARAM_SEARCH] ) : null);
            if( !obj.query ) {
                obj.query = {};
            }
            if('string' === typeof obj.field ) {
                // case when id provided as a string
                if( 24 === obj.field.length && /[\da-f]+/.test( obj.field ) ) { // if it is a mongodb id
                    obj.query._id = obj.field;
                }
            }
            obj.options = getDCParamOptions( params );
        }

        /**
         *  Adds the YUI metadata back to the response.
         *
         * @param params
         * @param data
         * @param meta
         * @return {*}
         */

        function addYUIMetadata( params, data, meta ) {
            var
                result,
                paging = params[Y.doccirrus.urls.PARAM_PAGING],
                limit = params[Y.doccirrus.urls.PARAM_LIMIT],
                page = params[Y.doccirrus.urls.PARAM_PAGE],
                myData,
                myCount = 0;

            if( undefined === paging ) {
                return data;
            }

            if( data ) {
                myData = JSON.parse( data );
            } else {
                myData = { result: [] };
            }

            if( myData && myData.result ) {
                if( myData.count ) {
                    myCount = myData.count;
                }
            } else {
                //default: myCount = 0
                myData.result = [];
            }

            result = '{"' + Y.doccirrus.urls.PARAM_LIMIT + '":' + limit +
                     ',"' + Y.doccirrus.urls.PARAM_COUNT + '" : ' + myCount +
                     ',"' + Y.doccirrus.urls.PARAM_PAGE + '" : ' + page +
                     ',"' + Y.doccirrus.urls.PARAM_CODE + '" : ' + ((meta && meta.http && meta.http.code) || '200') +
                     ',"' + Y.doccirrus.urls.PARAM_RESULT + '" :' + JSON.stringify( myData.result ) + '}';

            return result;
        }

        /*  ****************************
         *
         *   This is the actual REST Controller code, that sets up the Mojit to call to handle the
         *   Request.  This is currently being restified and all REST mojits are expected to support
         *   get | post | put | delete.  Only custom methods need to be defined in the REST mappings.
         *
         *   Mojits can override the default  get | post | put | delete
         *
         *  ****************************/

        Y.namespace( 'doccirrus' ).RESTController = {

            /**
             * The REST Controller is dynamically setup according to the
             * routes.json configured mojit REST routes. Children mojits
             * referenced in the routing must be configured as children in
             * application.json.
             *
             * The REST controller simply calls the correct child mojit to
             * deal with the concrete request in each instance.
             *
             * Mojits registered here should returns pure JSON RESTfully
             * so that the front-end can use a model based view of the data to
             * display it.
             *
             * 1) Access models using the REST controller as follows:
             *
             * HTTP <action>   /r/<model>/<id>?<params>
             *
             * 2) Access custom functions as follows:
             *
             * HTTP (GET|POST)  /r/<model>/<customFunction>?<params>
             *
             * NOTE: For both of the above methods of calling the
             * RESTController, you only need to register ONE REST route
             * in routes.json, namely
             *                       '<model>': '<responsible_mojitname>'
             *
             * Using the legacy calling syntax described following,
             * each custom function needs to be registered in the
             * routes.json.
             *
             * Legacy call for MT2IT (deprecated):
             *
             * HTTP (GET|POST)  /dcrest?action=<customFunction>&<params>
             *
             * This response calls the done() method on the action context.
             *
             * Restrictions on <params>
             *
             *   These are RESERVED WORDS and MUST NOT be used in forms as input field id's or names.
             *   Y.doccirrus.urls.PARAM_LIMIT = 'itemsPerPage',
             *   Y.doccirrus.urls.PARAM_PAGE = 'page',
             *   Y.doccirrus.urls.PARAM_COUNT = 'totalItems',
             *   Y.doccirrus.urls.PARAM_CODE = 'replyCode',
             *   Y.doccirrus.urls.PARAM_RESULT = 'Results',
             *   Y.doccirrus.urls.PARAM_SORT = 'sort',
             *   Y.doccirrus.urls.PARAM_SEARCH = 'query',
             *   Y.doccirrus.urls.PARAM_ACTION = 'action',  // legacy deprecated
             *   Y.doccirrus.urls.PARAM_CONTONERROR = 'continueOnError', // not accepted from client
             *   Y.doccirrus.urls.PARAM_HARDDEL = 'hardDelete',  // not accepted from client
             *   Y.doccirrus.urls.PARAM_OVERWRITE = 'overwrite',  // not accepted from client
             *
             *
             * Restrictions on Mojits using the Default REST interface:
             *
             *  NB  Each Mojit with REST interface must publicly declare this function.
             *
             *  getModelName: function() {
             *     return <model_name>;
             * }
             *
             *  NB EXCEPT when a mojit supports more than one model, then it must override all the
             *      default functions. and does not need to declare its model name.
             *
             *
             *@param {Object}      ac
             */
            'handleRequest': function( ac ) {
                var
                    fn,
                    result,
                    model,
                    params = ac.params.getFromMerged(),
                    actions = params._rest,
                    req = ac.http.getRequest(),
                    action = params[Y.doccirrus.urls.PARAM_ACTION],
                    actionHttp = req.method,
                    query = (req.path && req.path.split( '?' )) || [], // make sure of here
                    command = (query[0] && query[0].split( '/' )) || [],
                    responsible,
                    ch = ac.config.get( 'children' ),
                    children = { 'children': {}, ac },
                    responsibleController,
                    myAc = ac,
                    error = {
                        reasonPhrase: 'REST interface error'
                    },
                    rest = { field: 'all' },
                    meta = {
                        'http': {
                            headers: {
                                'content-type': 'text/json; charset=utf-8'
                            }
                        },
                        'view': {'rest': true, 'name': 'rest' }
                    };
                actionHttp = actionHttp ? actionHttp.toLowerCase() : undefined;
                // work out what the URI is telling us
                // params[Y.doccirrus.urls.PARAM_ACTION] is supported only on the dcrest 'channel'
                if( 2 > command.length ) {
                    throw new Error( 'Empty REST URI Called:  ' + req.path );
                }

                if(
                    ( 'dcrest' === command[1]) &&
                    action &&
                    ( 'get' === actionHttp || 'post' === actionHttp )
                    ) {

                    Y.log( 'REST Legacy call being made! ', 'warn', NAME );

                } else {
                    // Pull the action out of the URL as per REST
                    if( 2 < command.length ) {
                        model = command[2];
                        rest.model = model;
                    }
                    if( 3 < command.length ) {
                        rest.field = command[3];
                    }
                }

                Y.log( 'RESTController model / action: ' + JSON.stringify( model ) + ' / ' + JSON.stringify( action ), 'info', NAME );

                // check who is responsible for this REST call
                if( actions ) {
                    if( !action ) {
                        // this is the default branch of the logic
                        responsible = actions[model]; // checking by model
                        action = actionHttp;  // action from HTTP method
                    } else {
                        // this is the legacy branch
                        responsible = actions[action];
                    }
                }
                // Nobody is responsible -- configuration error.
                if( !responsible ) {
                    Y.doccirrus.utils.unsupportedActionJSON( ac, action + '  on model  ' + model + ' (Config Error)', NAME );
                    return;
                }
                // No such child -- configuration error
                if( !ch[responsible] ) {
                    Y.doccirrus.utils.unsupportedActionJSON( ac, responsible + '  not child of DocCirrus Mojit. (Config Error)', NAME );
                    return;
                }

                // now we know what the URL was telling us...
                rest[Y.doccirrus.urls.PARAM_ACTION] = action;

                // execute local functions - e.g. REST status & routes
                if( '.' === responsible ) {
                    this[action]( ac );
                    // we are done.
                    return;
                }

                // check if we have Mojit children
                if( ch && ch.length > 0 ) {
                    throw new Error( ac.config.get( 'description' ) +
                                     '\n\n Configure some children to see something other than this message.'
                    );
                }

                // set up the Mojit that is going to handle this REST call
                // get the controller
                responsibleController = Y.mojito.controllers[responsible];

                if( responsibleController ) {

                    // inject rest handling code into the controller, an give it the right name!
                    for( fn in propertyInjection ) {
                        // do not overwrite functions the Mojit has already defined.
                        if( propertyInjection.hasOwnProperty( fn ) && !responsibleController[fn] ) {
                            responsibleController[fn] = propertyInjection[fn].bind( responsibleController );
                        }
                    }
                    responsibleController.meta = {};
                    responsibleController.NAME = responsible;
                    // Check whether the child supports this action
                    if( !responsibleController[action] ) {
                        throw new Error( 'Unsupported REST Action called (' + action + ' / ' + model + ')' );
                    }
                    // setup REST params
                    getRESTParams( params, rest );
                    rest.user = req.user;
                    rest.originalparams = Y.merge( {}, params );

                    // setup REST file uploads
                    if( req.files ) {
                        rest.originalfiles = req.files;
                    } else {
                        Y.log( 'No files object to pass to REST child.', 'debug', NAME );
                        rest.originalfiles = {};
                    }

                    // setup mojito params
                    ch[responsible][Y.doccirrus.urls.PARAM_ACTION] = REST_PARAM;
                    ch[responsible].params = (ch[responsible].params || {});
                    ch[responsible].params.body = (ch[responsible].params.body || {});
                    ch[responsible].params.body[REST_PARAM] = rest;
                    children.children[responsible] = ch[responsible];
                    // set propagateFailure
                    if( !children.children[responsible].config ) {
                        children.children[responsible].config = {};
                    }
                    children.children[responsible].config.propagateFailure = true;

                    Y.log( 'REST call for child ' + JSON.stringify( responsible ), 'info', NAME );

                    // pass actionContext to child, and execute it first (return via callback)
                    try {
                        Y.mojito.controllers.DocCirrus.dcExecute( children, function( err, data, childmeta ) {

                            // meta may contain return data too, especially errors.
                            if( childmeta && childmeta.http && childmeta.http.code && 200 !== +(childmeta.http.code) ) {
                                error.code = childmeta.http.code;
                                error.reasonPhrase = childmeta.http.reasonPhrase;
                                error.data = childmeta.http.data || childmeta.http.reasonPhrase;

                                if( (301 !== childmeta.http.code) && (302 !== childmeta.http.code) ) {

                                    myAc.error( error, error.data );
                                    return;

                                }

                                Y.log( 'Set meta http code to: ' + childmeta.http.code, 'info', NAME );
                                meta.http.code = childmeta.http.code;
                            }

                            if( childmeta && childmeta.http && childmeta.http.headers && childmeta.http.headers['content-type'] ) {
                                meta.http.headers['content-type'] = childmeta.http.headers['content-type'];
                            }

                            if( childmeta && childmeta.http && childmeta.http.headers && childmeta.http.headers.location ) {
                                meta.http.headers.location = childmeta.http.headers.location;
                            }

                            Y.log( JSON.stringify( childmeta.http ), 'debug', NAME );
                            // we automatically wrap the result adding the YUI-style metadata
                            // if required - i.e. if the itemsPerPage was set in the params.
                            result = addYUIMetadata( params, data[responsible], childmeta );

                            //if ('image/jpeg' === meta.http.headers['content-type']) {
                            //    Y.log('Sending image length: ' + result.length, 'debug', NAME);
                            //    //meta.http.headers['content-length'] = result.length;
                            //}

                            Y.log( 'Generating Final REST Response ', 'debug', NAME );
                            myAc.done( {
                                    'data': result
                                },
                                meta
                            );
                        } );
                    } catch( err ) {

                    }
                }
            }
        };

        Y.log( 'RESTController initialized', 'debug', NAME );
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-config-addon',
        'mojito-params-addon',
        'mojito-meta-addon',
        'dcquery'
    ]
});
