/**
 * User: pi
 * Date: 27/11/15  11:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'RestHandlerClass', function( Y, NAME ) {
    /**
     * THIS IS ABSTRACT CLASS
     * @class RestHandlerClass
     * @abstract
     */
    class RestHandlerClass {
        /**
         * @class RestHandlerClass
         * @constructor
         */
        constructor() {
            this.setDefaultHandlers();
        }

        /**
         * @method setDefaultHandlers
         */
        setDefaultHandlers() {
            this.defaultHandlers = {};
            /**
             * Search for a record, or carry out a custom action.
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.get = function GET( args ) {
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: args.model,
                    user: args.user,
                    query: args.query,
                    options: args.options
                }, args.callback );
            };

            /**
             * Insert new record(s) or overwrite (them).
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.post = function POST( args ) {

                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: args.model,
                    user: args.user,
                    data: args.data,
                    options: args.options
                }, args.callback );
            };

            /**
             * Requires an ID --> then updates the record with new data.
             * Idempotent -- i.e. if called several times, will have same effect on the record.
             * Of course, if another process changes the record in between calls, the idempotency
             * still holds, but the results may be not what one expected!
             *
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.data
             * @param {String| Number | Object}     args.fields
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.put = function PUT( args ) {

                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: args.model,
                    user: args.user,
                    query: args.query,
                    fields: args.fields,
                    data: args.data,
                    options: args.options
                }, args.callback );
            };

            /**
             * updates the doc if found by query, otherwise will insert it
             *
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.upsert = function PUT( args ) {

                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'upsert',
                    model: args.model,
                    user: args.user,
                    query: args.query,
                    data: args.data,
                    options: args.options
                }, args.callback );
            };

            /**
             * Delete a record or records.
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.delete = function DELETE( args ) {

                Y.doccirrus.mongodb.runDb( {
                    action: 'delete',
                    model: args.model,
                    user: args.user,
                    query: args.query,
                    options: args.options
                }, args.callback );
            };

            /**
             * Aggregate.
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {String}          args.model
             * @param {Object}          args.query
             * @param {Object}          args.options
             * @param {Function}        args.callback
             */
            this.defaultHandlers.aggregate = function AGGREGATE( args ) {
                Y.doccirrus.mongodb.runDb({
                    action: 'aggregate',
                    pipeline: args.originalParams.pipeline,
                    dates: args.originalParams.dates,
                    model: args.model,
                    options: args.options,
                    user: args.user
                }, args.callback );
            };
        }

        /**
         * @method wrapResponse
         * @param {Object} params
         * @param {Object} err
         * @param {Object} [response={}]
         * @param {Object} [warning]
         * @returns {Object}
         */
        wrapResponse( params, err, response = {}, warning ) {
            let
                result,
                limit = +params[ Y.doccirrus.urls.PARAM_LIMIT ] || null,
                page = +params[ Y.doccirrus.urls.PARAM_PAGE ] || null,
                query = null,
                myData = {},
                myCount,
                extraMeta;

            /*
            * If response has any value except undefined then default object i.e. {} will not be assigned as per ES6 default parameter syntax
            *
            * Hence,
            * if response = null is passed then
            * wrapResponse( params, err, response = {}, warning ) => response = null and not {} hence this check is necessary or we would
            * get an uncaught exception
            * */
            response = response || {};

            if( response.meta && response.data ) {
                return response; // do nothing if already wrapped
            }
            // take care of zeroes
            if( 0 === limit && 0 !== params[ Y.doccirrus.urls.PARAM_LIMIT ] ) {
                limit = null;
            }
            if( 0 === page && 0 !== params[ Y.doccirrus.urls.PARAM_PAGE ] ) {
                page = 0;
            }

            // format the results
            if( (response.count || 0 === response.count) && response.query ) {
                // this means that paging is on.
                myCount = response.count;
                query = response.query;
                myData.result = response.result;
                //additionally can be extra data from aggregation
                extraMeta = response.extra;
            } else {
                myData.result = response;
                myCount = (response.count + 1) ? response.count : null;
                myCount = (null === myCount) ? response.length : myCount;
                myCount = (null === myCount && 'object' === typeof response && Object.keys( response ).length) ? 1 : myCount;
            }

            // cannot let 'undefined' string slip in here, as it is not valid JSON
            result = {
                meta: {}
            };
            result[ Y.doccirrus.urls.PARAM_DATA ] = myData.result;
            result.meta[ Y.doccirrus.urls.PARAM_ERRORS ] = Array.isArray( err ) ? err : (err) ? [ err ] : [];   // guaranteed to be an array
            result.meta[ Y.doccirrus.urls.PARAM_WARNINGS ] = Array.isArray( warning ) ? warning : (warning) ? [ warning ] : [];
            result.meta[ Y.doccirrus.urls.PARAM_SEARCH ] = query;
            result.meta[ Y.doccirrus.urls.PARAM_LIMIT ] = limit;
            result.meta[ Y.doccirrus.urls.PARAM_COUNT ] = myCount;
            result.meta[ Y.doccirrus.urls.PARAM_PAGE ] = page;
            result.meta[ Y.doccirrus.urls.PARAM_CODE ] = 200;

            // strip extra info in error output
            result.meta[ Y.doccirrus.urls.PARAM_ERRORS ] = result.meta[ Y.doccirrus.urls.PARAM_ERRORS ].map( err => {
                if( err ) {
                    return {
                        code: err.code,
                        data: err.data,
                        type: err.type,
                        locale: err.locale,
                        message: err.message
                    };
                }
                return err;
            } );

            if( extraMeta && extraMeta.length ){
                //reshape response to easy access
                result.meta.extra = {};
                extraMeta.map( el => {
                    result.meta.extra = {...result.meta.extra, ...el };
                });
                delete result.meta.extra._id;
            }

            return result;
        }

        /**
         * @method getDCParamOptions
         * @param {Object} params
         * @returns {Object}
         */
        getDCParamOptions( params ) {
            var
                opt = {};
            /**
             * Given a URI friendly  sort=FLD1,1,FLD2,-1
             *
             * Creates the corresponding Mongodb sort object.
             * @param sort String
             * @return {Object}
             */

            if( params[ Y.doccirrus.urls.PARAM_LIMIT ] ) {
                opt.limit = +params[ Y.doccirrus.urls.PARAM_LIMIT ];
            }
            // always set a limit
            if( !opt.limit ) {
                opt.limit = 1000;
                opt.skip = 0;
            }

            if( params[ Y.doccirrus.urls.PARAM_PURE_LOG ] ) {
                opt.pureLog = true;
            }

            if( params[ Y.doccirrus.urls.PARAM_QUIET ] ) {
                opt.quiet = true;
            }

            if( params[ Y.doccirrus.urls.PARAM_PAGE ] ) {
                opt.skip = (+params[ Y.doccirrus.urls.PARAM_PAGE ] - 1) * opt.limit;
            }

            if( params[ Y.doccirrus.urls.PARAM_COLLATION ] ) {
                opt.collation = params[ Y.doccirrus.urls.PARAM_COLLATION ];
            }

            opt.sort = (params[ Y.doccirrus.urls.PARAM_SORT ] ? this.translateSortStringIntoObject( params[ Y.doccirrus.urls.PARAM_SORT ] ) : {});
            // always page...
            //opt.paging = params[ Y.doccirrus.urls.PARAM_PAGING ];
            opt.fields = params[ Y.doccirrus.urls.PARAM_PROJECT ];
            opt.paging = true;

            return opt;
        }

        /**
         * @method translateSortStringIntoObject
         * @param {String} sort
         * @returns {Object}
         */
        translateSortStringIntoObject( sort ) {

            if( Y.Lang.isObject( sort ) ) {
                return sort;
            }

            const
                sortByValueRegEx = /:/,
                mongoSortObject = {},
                inputArray = sort.split( ',' );

            let
                sortByName,
                sortByValue = -1;

            for( let sortByEntry of inputArray ) {
                sortByName = decodeURIComponent( sortByEntry );
                if( sortByValueRegEx.test( sortByName ) ) {
                    [sortByName, sortByValue] = sortByName.split( sortByValueRegEx );
                    sortByValue = Number(sortByValue) || -1;
                }
                mongoSortObject[sortByName] = sortByValue;
                // reset to default value
                sortByValue = -1;
            }

            return mongoSortObject;
        }

        /**
         * Modifies rest object
         * @method setParams
         * @param {Object} req
         * @param {Object} rest
         * @param {Object} params
         */
        setParams( req, rest, params ) {
            var
                dcqry = new Y.doccirrus.DCQuery( rest.query );
            rest.originalParams = params;
            rest.options = this.getDCParamOptions( params.options || params );

            // Prevent injection attacks and translate operators in general.
            // If the query has a string format it should remain unchanged.
            dcqry.checkOperators( true );

            // setup REST file uploads
            if( req.files ) {
                rest.originalfiles = req.files;
            } else {
                Y.log( 'No files object to pass to REST child.', 'debug', NAME );
                rest.originalfiles = {};
            }

        }

        /**
         * This method should start handling.
         * @return {Object}
         */
        handleRequest() {
            return new Error('This is abstract method. Should be defined for every subclass');
        }

        /**
         * @method callApi
         * @param {Object} rest
         * @param {String} who who calling this function. e.g. restController_1
         */
        callApi( rest, who ) {
            Y.log(`Executing RestHandler.callApi from ${who}`, 'info', NAME);
            const
                model = rest.model,
                action = rest.action,
                protectedReg = /^_/,
                protectedAction = action && protectedReg.test( action );

            Y.log( who + ': model/action: ' + JSON.stringify( model ) + '/' + JSON.stringify( action ), 'info', NAME );

            // if this is a needle request from the PUC then pid and auth token must be removed from query, or database
            // queries will fail - stashing in proxyUser property in case they are need for logging or discrimination

            if( rest.query && rest.query.auth && rest.query.pid ) {
                rest.proxyUser = {
                    'auth': rest.query.auth,
                    'pid': rest.query.pid
                };
                delete rest.query.auth;
                delete rest.query.pid;
            }

            // if the model's api supports the action then call and exit.
            if( !protectedAction && Y.doccirrus.api[ model ] && Y.doccirrus.api[ model ][ action ] ) { // see if there is a responsible api
                Y.doccirrus.api[ model ][ action ]( rest );

            } else if( !protectedAction && this.defaultHandlers[ action ] ) {
                this.defaultHandlers[ action ]( rest );

            } else {
                Y.log( `JSONRPC: Unsupported method called (${action} / ${model})`, 'error', NAME );
                rest.callback( Y.doccirrus.errors.rest( -32601, 'Method not found' ) );
            }
        }
    }

    Y.namespace( 'doccirrus.classes' ).RestHandlerClass = RestHandlerClass;

    Y.log( 'RestHandlerClass initialized', 'debug', NAME );
}, '0.0.1', {
    requires: [ 'dcutils' ]
} );
