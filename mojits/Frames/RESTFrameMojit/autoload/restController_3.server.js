/**
 * User: ma
 * Date: 24/06/2014  12:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jslint latedef: false */



YUI.add( 'RESTController_3', function( Y, NAME ) {

    const
        UPSERT = 'upsert';

    class Rest_3Handler extends Y.doccirrus.classes.RestHandlerClass {

        /**
         * Same setcallback as in REST 1.  There is no filtering or post-processing here.
         *
         * @param {Object}   rest
         * @param {Function} callback
         */
        setCallback( rest, callback ) {
            var
                self = this;
            rest._callback = function restReturn( error, response, warning ) {
                var
                    params = rest.originalParams,
                    data,
                    output = {};

                if( error ) { //  handle HTTP errors, NOT custom business logic errors
                    if( error.name && 'ValidationError' === error.name ) {
                        callback( error );
                        return; // EXIT
                    } else if( 500 === error.code ) {
                        callback( error );
                        return; // EXIT
                    } else if( 'string' === typeof error ) {
                        callback( error );
                        return; // EXIT
                    }
                }

                data = response || {};
                if( !data.meta && !data.data && !Array.isArray(response) ) {
                    // if not already wrapped, and not an array
                        output =
                            self.wrapResponse(params, error, [response], warning);
                } else {
                    // otherwise treat as standard output
                    output =
                        self.wrapResponse(params, error, response, warning);
                }

                //output = JSON.stringify( data );
                Y.log( `REST 3 returning...`, 'debug', NAME );
                callback( null, output );
            };
            rest.callback = function( error, response, warning ) {
                rest._callback( error, response, warning );
            };
        }

        /**
         * Overrides the abstract classes method.
         *
         * @method getDCParamOptions
         * @param {Object} params
         * @returns {{}}
         */
        getDCParamOptions( params ) {
            var
                opt = {};

            if( params[Y.doccirrus.urls.PARAM_LIMIT] ) {
                opt.limit = +params[Y.doccirrus.urls.PARAM_LIMIT];
            }
            // always set a limit
            if( !opt.limit ) {
                opt.limit = 1000;
                opt.skip = 0;
            }

            if( params[Y.doccirrus.urls.PARAM_PAGE] ) {
                opt.skip = (+params[Y.doccirrus.urls.PARAM_PAGE] - 1) * opt.limit;
            }

            //opt.sort = (params[Y.doccirrus.urls.PARAM_SORT] ? translateSortStringIntoObject( params[Y.doccirrus.urls.PARAM_SORT] ) : {});
            // always page...
            //opt.paging = params[ Y.doccirrus.urls.PARAM_PAGING ];
            opt.paging = true;

            return opt;
        }

        /**
         * Remove fields not in the white-list.
         * Used to filter incoming and outgoing objects.
         *
         * Recursive.
         *
         * @param {String} rootPath
         * @param {Object} obj
         * @returns {*}
         */
        cleanObject( rootPath, obj ) {
            return obj;
        }

        // get query either from path or parameters
        // exclude all paging and sort parameters
        getQueryObj( rest ) {
            var
                groups,
                queryParams = rest.fromBody.query_ || rest.fromUrl,
                strArr = [],
                dcQuery, query;

            groups = REGEX_with_id.exec( rest.path ) || []; // get _id part

            if( groups[0] ) {
                query = {_id: groups[1]};
                return query;

            } else {
                Y.Object.each( queryParams, function( val, key ) {
                    if( !Y.Object.hasValue( Y.doccirrus.urls, key ) ) { // add non-reserved params
                        strArr.push( key );
                        strArr.push( val );
                    }
                } );
            }

            // translate special operator into mongodb query
            dcQuery = new Y.doccirrus.DCQuery( strArr.join( ',' ) );
            query = dcQuery.getQueryAsObj();

            // additional check and opr translation
            dcQuery = new Y.doccirrus.DCQuery( query );
            dcQuery.checkOperators( true );

            return dcQuery.getQueryAsObj();
        }

        // find out model name and action
        readPath( rest ) {
            var
                groups;
            if( 0 < rest.path.indexOf( '/:' ) ) {
                groups = REGEX_customAction.exec( rest.path );
                if( groups && groups[0] ) {
                    rest.model = groups[1];
                    rest.action = groups[2];
                }

            } else {
                groups = REGEX_basic.exec( rest.path );
                if( groups && groups[0] ) {
                    rest.model = groups[1];
                    rest.action = rest.actionHttp;
                }
            }
            if( 'head' === rest.action ) {
                rest.action = 'get';
            }
            rest.action = rest.fromUrl[Y.doccirrus.urls.PARAM_UPSERT] && 'put' === rest.action ? UPSERT : rest.action; // translate the parameter to action
        }

        processData( rest ) {
            function filterBody( startPath, data ) {
                return data;
            }

            // "fields_" will tell DB layer which fields should be updated
            // handles the case a sub-document is targeted
            function setFields( data, path ) {
                var
                    REGEX_SUBDOC = /^\/3\/[\w]+\/[\da-f]+\/([\w]+)\/([\da-f]+)\/?$/, // /3/<modelName>/<_id>/<fieldName>\/<_id>
                    parts,
                    sub_doc;

                function addFields( myObj ) {
                    myObj.fields_ = Object.keys( myObj ).filter( function( key ) {
                        return '_id' !== key;
                    } );
                    return myObj;
                }

                if( Array.isArray( data ) ) {
                    data = Y.Array.map( data, function( item ) {
                        return addFields( item );
                    } );

                } else if( 'object' === typeof data ) {
                    parts = REGEX_SUBDOC.exec( path ) || [];
                    if( parts[0] ) { // then it's a PUT on a sub-doc
                        data.fields_ = [parts[1]];
                        data._id = parts[2];
                        sub_doc = parts[1];
                    } else {
                        data = addFields( data );
                    }
                }

                return sub_doc;
            }

            var
                rootPath = rest.model;

            if( 'put' === rest.action ) {
                rest.subModel = setFields( rest.fromBody, rest.path ); // set fields_
                if( rest.subModel ) {
                    rootPath = rest.model + '.' + rest.subModel;
                }
                rest.fromBody = filterBody( rootPath, rest.fromBody );

            } else {
                rest.fromBody = filterBody( rest.model, rest.fromBody );
            }
        }


        /**
         *
         * @method setupRestObject
         * @param {Object} rest
         * @param {Object} config
         * @param {Function} callback
         */
        setupRestObject( rest, config, callback ) { // a single place for setting all required arguments
            var
                actionHttp;

            rest.req = config.req;
            rest.path = rest.req.path;
            rest.fromBody = config.fromBody || {};
            rest.fromUrl = config.fromUrl || {};
            actionHttp = config.req.method;
            rest.actionHttp = actionHttp ? actionHttp.toLowerCase() : undefined;

            this.readPath( rest ); // set model
            rest.originalModel = rest.model;
            if( 'test' === rest.model ) {
                this.processData(rest);
            }

            // setup REST file uploads
            if( rest.req.files ) {
                rest.originalfiles = rest.req.files;
            } else {
                masterLog( 'No files object to pass to REST child.', 'debug', NAME );
                rest.originalfiles = {};
            }

            rest.user = Object.assign( {}, rest.req.user ); // a common thing for all kind of requests
            rest.query = this.getQueryObj( rest );
            rest.originalQuery = Y.clone( rest.query );
            rest.data = rest.originalParams = Y.merge( {}, rest.fromBody );
            rest.httpRequest = rest.req;
            rest.fields = rest.fromBody.fields_;
            this.setCallback( rest, callback );
            this.setParams( config.req, rest, rest );

            // special options for REST 2
            if( UPSERT === rest.action && rest.query._id ) { // query._id takes precedence
                rest.data._id = rest.query._id;
            }
            //if( POST === rest.action ) {
            //    rest.options.entireRec = true;
            //}

        }

        /**
         * Overrides the abstract classes main function
         *
         * @method handleRequest
         * @param {Object} config
         * @param {Object} config.req
         * @param {Object} config.fromBody
         * @param {Object} config.fromUrl
         * @param {Function} callback
         */
        handleRequest( config, callback ) {
            var
                rest = {};

            this.setupRestObject( rest, config, callback );


            Y.log( 'REST3: ' + rest.actionHttp + ' => ' + rest.path, 'debug', NAME );

            this.callApi( rest, 'RESTController_3' );

        }

    }

    var
        YDC = Y.doccirrus,

        REGEX_basic = /\/3\/(\w+)[\/]?(.*)/,  // /3/<model-name>?...
        REGEX_customAction = /\/3\/([-\w]+)\/:(\w+)/,  // /3/<model-name>/:<actionName>?...
        REGEX_with_id = /^\/3\/[\w]+\/([\da-f]+)\/?.*\/?$/, // /3/<modelName>/<_id>

    //const
        WHITELISTED_SCHEMAS = {
            statuscheck: {get: true},
            test: {toggleLogging: true},
            inphone: {inboundphonecall: true},
            appLicenseSerials: {get: true}
        };

    function masterLog( str, level, name ) {
        if( YDC.ipc.isMaster() ) {
            Y.log( str, level, name );
        }
    }


    var handler = new Rest_3Handler();

    Y.namespace( 'doccirrus' ).RESTController_3 = {
        'WHITELISTED_SCHEMAS': WHITELISTED_SCHEMAS,

        /**
         * The REST controller simply calls the correct API to
         * deal with the concrete request in each instance.
         *
         * @param {Object} config
         * @param {Object} config.req
         * @param {Object} config.fromBody
         * @param {Object} config.fromUrl
         * @param {Function} callback
         */
        handleRequest: function( config, callback ) {
            handler.handleRequest( config, callback );
        },
        defaultHandlers: handler.defaultHandlers

    };

}, '0.0.1', {
    requires: [
        'doccirrus',
        'oop',
        'RESTController_1',
        'dcquery'
    ]
} );
