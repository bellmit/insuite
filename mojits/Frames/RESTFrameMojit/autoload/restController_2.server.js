/**
 * User: ma
 * Date: 24/06/2014  12:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jslint latedef: false */

YUI.add( 'RESTController_2', function( Y, NAME ) {

    const VIRTUAL_PREFIX = 'v_',
        UPSERT = 'upsert',
        CR_MODEL = 'cardreader',
        PRINTER_MODEL = 'printer',
        TEST_MODEL = 'test';

    class Rest_2Handler extends Y.doccirrus.classes.RestHandlerClass {

        /**
         * Overrides the abstract classes method.
         *
         * @override
         * @param {Object} params
         * @returns {Object}
         */
        getDCParamOptions( params ) {
            var
                opt = {};
            if( params[ Y.doccirrus.urls.PARAM_LIMIT ] ) {
                opt.limit = +params[ Y.doccirrus.urls.PARAM_LIMIT ];
            }
            // always set a limit
            if( !opt.limit ) {
                opt.limit = 1000;
                opt.skip = 0;
            }

            if( params[ Y.doccirrus.urls.PARAM_PAGE ] ) {
                opt.skip = (+params[ Y.doccirrus.urls.PARAM_PAGE ] - 1) * opt.limit;
            }

            if( params[ Y.doccirrus.urls.PARAM_NO_COUNT_LIMIT ] ) {
                opt.noCountLimit = params[Y.doccirrus.urls.PARAM_NO_COUNT_LIMIT] === 'true';
            }

            opt.sort = (params[ Y.doccirrus.urls.PARAM_SORT ] ? this.translateSortStringIntoObject( params[ Y.doccirrus.urls.PARAM_SORT ] ) : {});
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
         * @param {String}  rootPath
         * @param {Object}  obj
         * @returns {*}
         */
        cleanObject( rootPath, obj ) {
            Y.log( `Executing cleanObject for model: ${rootPath}`, 'debug', NAME );
            var
                self = this,
                path;

            function removeValueFromArray( inputArr, element ) {
                const index = inputArr.indexOf( element );

                if( index !== -1 ) {
                    inputArr.splice( index, 1 );
                }
            }

            if( !obj || 'object' !== typeof obj ) {
                return obj;
            }

            obj = obj.toObject ? obj.toObject() : obj; // get rid of mongoose stuff
            obj = JSON.parse(JSON.stringify(obj));

            Object.keys( obj ).forEach( function checkField( key ) {
                path = rootPath + '.' + key;
                if( -1 < WHITE_FIELDS.indexOf( key ) ||
                    TEST_MODEL === rootPath ||
                    CR_MODEL === rootPath ||
                    PRINTER_MODEL === rootPath
                ) {
                    return true; // passed
                }
                if( Array.isArray( obj[ key ] ) && rules_v2[ rootPath ] && -1 < rules_v2[ rootPath ].indexOf( path ) ) { // if a white-listed array
                    obj[ key ].forEach( function( item ) {
                        self.cleanObject.call( self, path, item );
                    } );

                } else if( obj[ key ] && 'object' === typeof  obj[ key ] && !Array.isArray( obj[ key ] ) && !obj[ key ].toJSON ) { // as of now, non-array object field is limited to JS objects only, checking anyway
                    if( rules_v2[ path ] && rules_v2[ path ][ 0 ] && 2 === +rules_v2[ path ][ 0 ].v && rules_v2[ path + '.type' ] === 'Object' ) {
                        return true; // passed passed for schema less Object
                    } else {
                        self.cleanObject.call( self, path, obj[ key ] );
                        return;
                    }

                } else if( rules_v2[ path ] && rules_v2[ path ][ 0 ] && 2 === +rules_v2[ path ][ 0 ].v ) { // leaf field
                    return; // leaf passed

                } else { // not passed
                    //Y.log( 'excluding path: ' + path, 'debug', NAME );
                    obj[ key ] = undefined;

                    if( obj.fields_ && Array.isArray( obj.fields_ ) && obj.fields_.length ) {
                        removeValueFromArray( obj.fields_, key ); //Remove the actual key from fields_ to avoid unexpected behaviours
                    }
                }
            } );
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

            if( groups[ 0 ] ) {
                query = { _id: groups[ 1 ] };
                return query;

            } else if( 'object' === typeof rest.fromBody.query_ ) {
                query = rest.fromBody.query_;
            } else {
                Y.Object.each( queryParams, function( val, key ) {
                    if( !Y.Object.hasValue( Y.doccirrus.urls, key ) ) { // add non-reserved params
                        strArr.push( Array.isArray( val ) ? `${key}[]` : key );
                        strArr.push( Array.isArray( val ) ? val.join( "_" ) : val );
                    }
                } );

                // translate special operator into mongodb query
                dcQuery = new Y.doccirrus.DCQuery( strArr.join( ',' ) );
                query = dcQuery.getQueryAsObj();
            }

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
                if( groups && groups[ 0 ] ) {
                    rest.model = groups[ 1 ];
                    rest.action = groups[ 2 ];
                }

            } else {
                groups = REGEX_basic.exec( rest.path );
                if( groups && groups[ 0 ] ) {
                    rest.model = groups[ 1 ];
                    rest.action = rest.actionHttp;
                }
            }
            rest.action = rest.fromUrl[ Y.doccirrus.urls.PARAM_UPSERT ] && 'put' === rest.action ? UPSERT : rest.action; // translate the parameter to action
        }

        processData( rest ) {
            Y.log( `Executing processData`, 'debug', NAME );
            var self = this;

            // check query parameters against the white list and remove fields not in white list
            function filterBody( startPath, data ) {

                if( TEST_MODEL === rest.model ) {
                    return data;
                }

                if( Array.isArray( data ) ) {
                    data = Y.Array.map( data, function( item ) {
                        return self.cleanObject( startPath, item );
                    } );

                } else if( data ) {
                    data = self.cleanObject( startPath, data );
                }

                return data;
            }

            // "fields_" will tell DB layer which fields should be updated
            // handles the case a sub-document is targeted
            function setFields( data, path ) {
                var
                    REGEX_SUBDOC = /^\/2\/[\w]+\/[\da-f]+\/([\w]+)\/([\da-f]+)\/?$/, // /2/<modelName>/<_id>/<fieldName>\/<_id>
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
                    if( parts[ 0 ] ) { // then it's a PUT on a sub-doc
                        data.fields_ = [ parts[ 1 ] ];
                        data._id = parts[ 2 ];
                        sub_doc = parts[ 1 ];
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
         * @method setCallback
         * @param {Object} rest
         * @param {Function} callback
         */
        setCallback( rest, callback ) {
            Y.log( `Executing setCallback`, 'debug', NAME );
            var
                self = this;

            // check query parameters against the white list and remove fields not in white list
            function filterResponse( modelName, response ) {
                var
                    data,
                    dataField;

                if( TEST_MODEL === rest.model ) {
                    return response;
                }

                if( response.result ) {
                    dataField = 'result';
                    data = response.result;
                } else if( response.data ) {
                    dataField = 'data';
                    data = response.data;
                } else {
                    data = response;
                }

                if( Array.isArray( data ) ) {
                    data = Y.Array.map( data, function( item ) {
                        return self.cleanObject( modelName, item );
                    } );

                } else {
                    data = self.cleanObject( modelName, data );
                }

                if( dataField ) {
                    response[ dataField ] = data;
                } else {
                    response = data;
                }

                return response;
            }

            rest.callback = function restReturn( error, result, warning ) {
                if( rest.readOnlyWarnings && rest.readOnlyWarnings.length > 0 ) {
                    warning = (warning || []).concat( rest.readOnlyWarnings );
                }

                // check for all possible result structures we can get from DB layer in order to determine emptiness
                function hasResult( result ) {
                    if( 'get' === rest.actionHttp || 'post' === rest.actionHttp || 'delete' === rest.actionHttp ) {
                        return result && (Array.isArray( result ) && result.length ||
                                          Array.isArray( result.result ) && result.result.length ||
                                          Array.isArray( result.data ) && result.data.length);
                    } else if( 'put' === rest.actionHttp ) {
                        return result && ('object' === typeof result && result._id ||
                                          'object' === typeof result.data && result.data._id ||
                                          'object' === typeof result.result && result.result._id ||
                                          Array.isArray( result ) && 'object' === typeof result[ 0 ] && result[ 0 ]._id);
                    } // else, not specified yet
                }

                function checkEntry( item ) {
                    return item._id && rest.fromBody._id === item._id.toString();
                }

                // conforming to Medneo specs
                // depending on the quantity of the result return specific messages
                function returnMedneoResponse( error, result, warning ) {
                    var
                        data;

                    Y.log( `Executing returnMedneoResponse with ${error || 'no error'} and result ${result || 'empty'}`, 'debug', NAME );

                    if( error ) { // report custom/business error
                        data = self.wrapResponse( rest.fromUrl, error, {}, warning );
                        callback( null, data );
                        return; // done

                    } else if( !hasResult( result ) && rest.originalQuery && Object.keys( rest.originalQuery ).length ) { // if there was a query but no result
                        if( 'get' === rest.actionHttp || 'put' === rest.actionHttp || 'delete' === rest.actionHttp ) {
                            callback( YDC.errors.http( 404, rest.model + ' not found' ) );
                            return; // done
                        }

                    } else if( 'put' === rest.actionHttp ) {
                        if( rest.subModel ) { // then check if the target entry really exists
                            if( !result || !Y.Array.some( result[ 0 ][ rest.subModel ] || result[ rest.subModel ], checkEntry ) ) {
                                callback( YDC.errors.http( 404, rest.subModel + ' not found' ) );
                                return; // done
                            } else {
                                result = Y.Array.find( result[ 0 ][ rest.subModel ] || result[ rest.subModel ], checkEntry ); // replace with the target entry
                            }
                        }
                        result = Array.isArray( result ) ? result : [ result ];
                    }

                    if( result.data && !result.meta ) { // partially wrapped result
                        data = self.wrapResponse( rest.fromUrl, null, result.data, warning );
                    }

                    if( !data ) {
                        data = self.wrapResponse( rest.fromUrl, null, result, warning );
                    }

                    if( data.meta ) {
                        data.meta.query = rest.originalQuery; // restore the user query
                        data.meta.model = rest.originalModel;
                    }

                    callback( null, data );
                }

                var
                    message;
                if( error ) { //  handle common errors

                    Y.log( `REST2 ${rest.action}, ${rest.path} returns with error: ${JSON.stringify( error )}`, 'error', NAME );

                    if( 'object' !== typeof error ) {
                        callback( YDC.errors.http( 500, error ) );
                        return; // EXIT

                    } else if( 'CastError' === error.name ) {
                        callback( YDC.errors.http( 400, error.message ) );
                        return; // EXIT

                    } else if( 'ValidationError' === error.name ) {
                        callback( YDC.errors.http( (error.code || 400), error.toString() ) );
                        return; // EXIT

                    } else if( 'TypeError' === error.name ) {
                        Y.log( 'error in apiCallback: ' + error, 'error', NAME );
                        callback( YDC.errors.http( 500, 'server error' ) );
                        return; // EXIT

                    } else if( 'MongoError' === error.name ) {
                        Y.log( 'error in apiCallback: ' + error, 'error', NAME );
                        if( 11000 === error.code ) {
                            callback( YDC.errors.http( 400, 'duplicate key _id' ) );
                        } else {
                            callback( YDC.errors.http( 500, 'server error' ) );
                        }
                        return; // EXIT

                    } else if( parseInt( error.code, 10 ) && +error.code < 600 ) { // http error
                        callback( YDC.errors.http( error.code, error.reasonPhrase || error.toString() ) );
                        return; // EXIT

                    } else if( parseInt( error.code, 10 ) || Array.isArray( error ) ) { // custom/business errors
                        message = YDC.errorTable.getMessages( error );
                        if( Array.isArray( message ) ) {
                            message = message.join( ',' );
                        }
                        callback( YDC.errors.http( 400, message ) );
                        return; // EXIT

                    } // else, an incorrect error object
                }

                result = result || {};
                result = filterResponse( rest.originalModel, result );

                returnMedneoResponse( error, result, warning );
            };

        }

        /**
         *
         * @method setupRestObject
         * @param {Object}  rest
         * @param {Object}  config
         * @param {Function} callback
         */
        setupRestObject( rest, config, callback ) { // a single place for setting all required arguments
            let
                actionHttp,
                allowedKeys = Object.values( Y.doccirrus.urls ),
                userParams,
                // extract only userParams that are allowed
                options = {};
            rest.req = config.req;
            rest.path = rest.req.path;
            rest.fromBody = config.fromBody || {};
            rest.fromUrl = config.fromUrl || {};
            userParams = ({ ...rest.fromBody, ...rest.fromUrl });
            actionHttp = config.req.method;
            rest.actionHttp = actionHttp ? actionHttp.toLowerCase() : undefined;

            this.readPath( rest ); // set model
            rest.originalModel = rest.model;
            this.processData( rest );

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

            Object.keys( userParams ).forEach( param => {
                if( allowedKeys.some( k => k === param ) ) {
                    options[ param ] = userParams[ param ];
                }
            } );

            this.setParams( config.req, rest, options );

            // special options for REST 2
            if( UPSERT === rest.action && rest.query._id ) { // query._id takes precedence
                rest.data._id = rest.query._id;
            }
            //if( POST === rest.action ) {
            //    rest.options.entireRec = true;
            //}

        }

        /**
         * Check query parameters and the action according to API V2 Defn.
         *
         * NOTE:
         * Validation for query parameters will only work if the schema file is required in dcdb.server.js
         * Otherwise the schema is unknown and will not be compiled into    rules_v2
         *
         * @method validate
         * @param {Object} rest
         * @returns {*}
         */
        validate( rest ) {
            var
                valid, invalidParams = [];

            // validate action
            if( !WHITELISTED_SCHEMAS[ rest.model ] || !WHITELISTED_SCHEMAS[ rest.model ][ rest.action ] ) {
                if( UPSERT === rest.action && WHITELISTED_SCHEMAS[ rest.model ].post && WHITELISTED_SCHEMAS[ rest.model ].put ) {
                    return;
                }
                return YDC.errors.http( 403, 'Forbidden' );
            }

            // relax rules for test path.
            if( TEST_MODEL === rest.model ) {
                return;
            }

            // validate query
            if( rest.query && Object.keys( rest.query ).length ) {
                valid = Object.keys( rest.query ).every( function( key ) {
                    var
                        path = rest.model + '.' + key;
                    if( -1 < WHITE_FIELDS.indexOf( key ) ) {
                        return true;
                    }
                    // check if the queried path is allowed
                    if( rules_v2[ rest.model ] && -1 < rules_v2[ rest.model ].indexOf( path ) && rules_v2[ path ] && rules_v2[ path ][ 0 ] && true === rules_v2[ path ][ 0 ].queryParam ) {
                        return true;
                    } else {
                        invalidParams.push( key );
                    }
                } );

            } else if( 'get' === rest.actionHttp || 'post' === rest.actionHttp ) { // empty query is not OK for DELETE or PUT
                valid = true;
            }

            if( !valid ) {
                Y.log( 'invalid query: ' + JSON.stringify( rest.query ), 'debug', NAME );
                return YDC.errors.http( 400, `Invalid query, did not expect: ${invalidParams.join(' or ')}` );
            }
        }

        checkReadOnlyProperty( warnings, data, prop, path ) {
            if( !data || Object.keys( data ).length === 0 ) {
                return;
            }
            let props = prop.split( "." );
            if( props.length === 1 ) {
                let fieldPath = path + ((path === '') ? '' : '.') + prop;
                if( typeof data[ prop ] !== 'undefined' && fieldPath !== null && fieldPath !== '' ) {
                    warnings.push(
                        new Y.doccirrus.commonerrors.DCError( '100001', { data: { $field: fieldPath } } )
                    );
                    //skip this property from data
                    delete data[ prop ];
                }
                return;
            }

            let curProp = props.shift();
            if( data[ curProp ] && Array.isArray( data[ curProp ] ) ) {
                data[ curProp ].forEach( ( el, ind ) => {
                    this.checkReadOnlyProperty( warnings, el, props.join( "." ), path + ((path === "") ? '' : '.') +
                                                                                 curProp + '[' + ind.toString() + ']' );
                } );
            } else {
                this.checkReadOnlyProperty( warnings, data[ curProp ], props.join( "." ), path + ((path === "") ? '' : '.') + curProp );
            }
        }

        checkReadOnly( rest ) {
            var warnings = [];

            if( !rules_v2_readOnly.hasOwnProperty( rest.model ) ) {
                return warnings;
            }
            if( rules_v2_readOnly[ rest.model ] && rules_v2_readOnly[ rest.model ].data ) {
                rules_v2_readOnly[ rest.model ].data.forEach( ( prop ) => {

                    // /(\/(.+?)\/[^\/]+)/img
                    // submodel is in the path like /2/{model}/{objectId}/{subModel}/{objectId}

                    let pathParts = rest.path.split( '/' );
                    if( pathParts.length > 4 && pathParts[ 1 ] === '2' &&
                        pathParts[ 2 ] === rest.model && prop.indexOf( pathParts[ 4 ] ) === 0 ) {
                        prop = prop.slice( pathParts[ 4 ].length + 1 );
                    }
                    this.checkReadOnlyProperty( warnings, rest.data, prop, "" );

                } );
            }

            return warnings;
        }

        /**
         * Overrides the abstract classes main function
         *
         * @method handleRequest
         * @param {Object}      config
         * @param {Object}      config.req
         * @param {Object}      config.fromBody
         * @param {Object}      config.fromUrl
         * @param {Function}    callback
         */
        handleRequest( config, callback ) {
            var
                validationError,
                rest = {};

            this.setupRestObject( rest, config, callback );

            Y.log( 'REST2: ' + rest.actionHttp + ' => ' + rest.path, 'debug', NAME );

            validationError = this.validate( rest );
            if( validationError ) {
                callback( validationError );
            } else {
                // if readonly fields exist then remove them from rest.data
                if( rest.action === 'put' || rest.action === 'post' ) {
                    rest.readOnlyWarnings = this.checkReadOnly( rest ) || [];
                }
                this.callApi( rest, 'RESTController_2' );
            }

        }

    }

    var
        YDC = Y.doccirrus,

        REGEX_basic = /\/2\/(\w+)[\/]?(.*)/,  // /2/<model-name>?...
        REGEX_customAction = /\/2\/([-\w]+)\/:(\w+)/,  // /2/<model-name>/:<actionName>?...
        REGEX_with_id = /^\/2\/[\w]+\/([\da-f]+)\/?.*\/?$/, // /2/<modelName>/<_id>

        rules_v2 = {},
        rules_v2_readOnly = {},
        //const
        /**
         * WHITELISTED_SCHEMAS drives the RAML Documentation
         *   see: raml-doc.server.js
         *
         * Any changes to this Object MUST be docuemnted according to the instructions
         *    https://confluence.intra.doc-cirrus.com/pages/viewpage.action?pageId=18088289
         *
         * i.e. also adding test sample data.
         */
        WHITELISTED_SCHEMAS = {
            user: { get: true, post: true, put: true, delete: true },
            assistive: { get: true, post: true, put: true, delete: true },
            medication: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true },
            document: { get: true, post: true, put: true },
            invoice: { get: true, post: true, put: true, delete: true, getOverdueInvoices: true },
            physician: { get: true, post: true, put: true, delete: true },
            basecontact: { get: true, post: true, put: true, delete: false },
            patient: {
                get: true,
                post: true,
                put: true,
                delete: true,
                getPatientFromCard: true,
                getPatientFromCardBatch: true,
                getForPatientBrowser: true,
                lookupPatientOnInSpectorSelectiveCareSystem: true
            },
            role: { get: true },
            medicationscatalog: { get: true, getATCCatalogEntries: true },
            catalog: { get: false, post: false, put: false, delete: false, getIcd10Catalog: true, getHouseCatalog: true },
            drug: { get: true, getATCCatalogEntries: true, getMoleculesByName: true, getShortCodeMap: true },
            location: { get: true, post: true, put: true, delete: true },
            contract: { get: true, post: true, put: true, delete: true, getLastContractForActivity: true, getInvoiceRef: true, getLinkedActivities: true },
            kbvmedicationplan: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true },
            diagnosis: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true },
            treatment: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true },
            utility: { get: true, post: true, put: true, delete: true },
            simple_activity: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true, initializeFormForActivity: true },
            labdata: { get: true, post: true, put: true, delete: true, getActivitiesLinkedToContract: true },
            cardreader: {get: true, post: true, getPatientFromCard: true},
            printer: { get: true },
            test: {
                get: true,
                post: true,
                runAllMochaSuites: true,
                getLastMochaReport: true,
                runSingleMochaSuite: true,
                removeWellKnownTestData: true,
                setNoCrossLocationAccessToFalse: true,
                setIsMocha: true,
                postRuleSet: true,
                echo: true,
                convertPatientCapacityMasterSchedules: true
            },
            rule: { get: true, post: true, put: true, delete: true, trigger: true },
            billing: { get: true, reportBillings: true },
            dispatchrequest: { get: true, post: true },
            company: { get: true },
            tenant: { get: true, post: true, put: true, delete: true },
            rulenode: { get: true, post: true, put: true, delete: true, trigger: true },
            meddata: { get: true, delete: true, put: true, post: true, getActivitiesLinkedToContract: true },
            casefolder: { get: true, post: true, put: true, delete: true, copyActivitiesToCaseFolder: true },
            import: {
                importEmployeeLocations: true,
                importCalendarsAndSchedules: true,
                importAllOtherCollections: true,
                uploadBriefeFile: true,
                getSeedDataForSol: true,
                copyDumpedDataFromSol: true
            },
            reportingjob: { outputCsv: true },
            audit: {postSolEntry: true },
            datasafe: {get: true },
            calendar: { get: true, post: true, put: true, delete: true },
            schedule: { get: true, post: true, put: true, delete: true },
            scheduletype: { get: true, post: true, put: true, delete: true },
            task: { get: true, post: true, put: true, delete: true },/*,
            media: {get: true, post: true, put: true, delete: true}*/ // TODO...
            blob: { get: true, post: true},
            jira: { search: true },
            complexprescription: { post: true },
            communication: {post: true},
            partneridcatalog: { get: true, post: true, put: true, delete: true },
            configuration: { get: true },
            formportal: { getActivePortalList: true, sendUrl: true },
            tag: { get: true, post: true, put: true, delete: true, getAllAvailableLabDataTags: true },
            ingredientplan: { get: true, post: true, put: true, delete: true }
        },
        WHITE_FIELDS = [ '_id', 'fields_' ]; // fields that are always allowed

    function masterLog( str, level, name ) {
        if( YDC.ipc.isMaster() ) {
            Y.log( str, level, name );
        }
    }

    // extract REST rules for all schemas that are loaded up to this point (and also while-listed)
    function loadRules() {

        // traverse the schema and check all paths
        function loadProps( subS, path ) {

            var
                newPath;

            Y.Object.each( subS, function( prop, name ) {
                if( name === 'default' ) {
                    return;
                }

                if( !prop ) {
                    return;
                }
                newPath = path + '.' + name;

                // get details about the path
                let fullPath = newPath.split( '.' ),
                    schemaName = fullPath.shift() || newPath,
                    fieldPath = fullPath.join( "." );

                if( prop.apiv || Array.isArray( prop ) ) {

                    if( Array.isArray( prop ) ) { // a sub-schema (also a parent)
                        prop = prop[ 0 ];
                    }

                    if( prop.apiv ) { // a child
                        //log( 'setting REST rule for property ' + newPath, 'debug', NAME );
                        rules_v2[ newPath ] = [ prop.apiv ];
                    }

                    if( prop.type === 'Object' ) {
                        rules_v2[ newPath + '.type' ] = prop.type;
                    }

                    if( prop.apiv && prop.apiv.readOnly === true ) {
                        if( !rules_v2_readOnly[ schemaName ] ) {
                            rules_v2_readOnly[ schemaName ] = {};
                        }
                        if( prop.apiv.queryParam && prop.apiv.queryParam === true ) {
                            if( !rules_v2_readOnly[ schemaName ].query ) {
                                rules_v2_readOnly[ schemaName ].query = [];
                            }
                            rules_v2_readOnly[ schemaName ].query.push( fieldPath );
                        }
                        if( !prop.apiv.queryParam || prop.apiv.queryParam === false ) {
                            if( !rules_v2_readOnly[ schemaName ].data ) {
                                rules_v2_readOnly[ schemaName ].data = [];
                            }
                            rules_v2_readOnly[ schemaName ].data.push( fieldPath );
                        }
                    }

                    loadProps( prop, newPath );

                    // if there is any rule for this prop then save a reference for parent
                    if( rules_v2[ newPath ] ) {
                        rules_v2[ path ] = rules_v2[ path ] || [];
                        rules_v2[ path ].push( newPath );

                        // push nested paths as well to the schema
                        if( path !== schemaName ) {
                            if( !rules_v2[ schemaName ] ) {
                                rules_v2[ schemaName ] = [];
                            }
                            rules_v2[ schemaName ].push( newPath );
                        }
                    }
                }
            } );
        }

        Object.keys( WHITELISTED_SCHEMAS ).forEach( function loadSchema( item ) {
            if( YDC.schemas[ VIRTUAL_PREFIX + item ] && YDC.schemas[ VIRTUAL_PREFIX + item ].schema ) {
                loadProps( YDC.schemas[ VIRTUAL_PREFIX + item ].schema, item );
                if( rules_v2[ item ] ) {
                    masterLog( 'loaded REST rule for virtual schema ' + item + ' :' + rules_v2[ item ].length, 'debug', NAME );
                }
            } else if( YDC.schemas[ item ] && YDC.schemas[ item ].schema ) {
                loadProps( YDC.schemas[ item ].schema, item );
                if( rules_v2[ item ] ) {
                    masterLog( 'loaded REST rule for schema ' + item + ' :' + rules_v2[ item ].length, 'debug', NAME );
                }
            }
        } );
    }

    function init( callback ) {
        YDC.auth.onReady( function() {
            loadRules();
            if( typeof callback === "function" ) {
                callback();
            }
        } );
        masterLog( 'RESTController_2 initialized', 'debug', NAME );
    }

    var handler = new Rest_2Handler();

    Y.namespace( 'doccirrus' ).RESTController_2 = {
        'WHITELISTED_SCHEMAS': WHITELISTED_SCHEMAS,

        init,

        /**
         * The REST controller simply calls the correct API to
         * deal with the concrete request in each instance.
         *
         * query parameters must be explicitly permitted marked in schema
         * fields are removed from response if not white-listed in schema
         *
         * paging parameters and query parameter should not overlap
         *
         * 1) Access models using the REST controller as follows:
         *
         * HTTP <action>   /2/<model>?field1=value1...&<paging_params>
         *
         * <action> is handled here, but can be overridden in <model>-api.server.js
         * the field/value will be translated to a query object and fed into <action> handler
         *
         * 2) Access custom functions as follows:
         *
         * HTTP (GET|POST)  /2/<model>/:<customFunction>?<params>
         *
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
         *   Y.doccirrus.urls.PARAM_ACTION = 'action',  // legacy deprecated
         *   Y.doccirrus.urls.PARAM_CONTONERROR = 'continueOnError', // not accepted from client
         *   Y.doccirrus.urls.PARAM_HARDDEL = 'hardDelete',  // not accepted from client
         *   Y.doccirrus.urls.PARAM_OVERWRITE = 'overwrite',  // not accepted from client
         *
         * @param {Object}      config
         * @param {Object}      config.req
         * @param {Object}      config.fromBody
         * @param {Object}      config.fromUrl
         * @param {Function}    callback
         */
        handleRequest: function( config, callback ) {
            handler.handleRequest( config, callback );
        },
        defaultHandlers: handler.defaultHandlers

    };

}, '0.0.1', {
    requires: [
        'oop',
        'RESTController_1',
        'dcurls',
        'dcquery'
    ]
} );
