/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, $ */

'use strict';

YUI.add( 'dcloadhelper', function( Y, NAME ) {

        var
            store = {}, // central static store
            singleton,
            events = {
                get: {

                },
                set: {

                }
            };
        // initialise the user-agent model space.

        //  This is used as a global store by multiple casefile views to change application state

        function DataStore() {

            /**
             *  Set a value in the CaseFile's global data store
             *  @param  key     {String}
             *  @param  value   {Mixed}
             */

            this.set = function( key, value ) {
                if( events.set[key] ) {
                    events.set[key].fire( value, store[key] );
                }
                store[key] = value;
                this.onSet( key, value );
                //console.log( store );
            };

            /**
             *  Get a value in the CaseFile's global data store
             *  @param  key     {String}
             *  @param  value   {Mixed}
             */
            this.get = function( key ) {
                if( events.get[key] ) {
                    events.get[key].fire( store[key] );
                }
                //console.log( store[key] );
                return store[key];
            };

            /**
             *  removes a value from the CaseFile's global data store
             *  @param  key     {String}
             *  @param  value   {Mixed}
             */
            this.remove = function( key ) {
                var rtn = false;
                if( events.get[key] ) {
                    rtn = true;
                }
                delete store[key];
                return rtn;
            };

            /**
             *  Return the entire datastore - appears to be unused as of 2014/05/14
             *  @param  key     {String}
             *  @param  value   {Mixed}
             */

            this.getStore = function() {
                return store;
            };

            /**
             *  Empty the datastore - appears to be unused as of 2014/05/14
             *  @param  key     {String}
             *  @param  value   {Mixed}
             */

            this.flush = function() {
                store = {};
            };

            // possible source codes
            // where to find data
            this.PRC_SRC = 0;
            this.PUC_SRC = 1;  // PUC == PATPORTAL
            this.PORTAL_SRC = 1;  // PATPORTAL == PUC
            this.DCPRC_SRC = 3;
            this.PLAIN_SRC = 4;

            /**
             * Add callbacks that fire if method is called
             * @param method {String} currently only get and set
             * @param key {String} store key
             * @param fn {Function} callback
             */
            this.on = function( method, key, fn ) {
                if( !events[method] ) {
                    throw new Error( 'Method Not Found' );
                }
                if( !events[method][key] ) {
                    events[method][key] = $.Callbacks();
                }
                events[method][key].add( fn );
            };

            /**
             *  Builds a URL to load JSON data for an arraymodel relative to the current PRC or VPRC
             *
             *  @param model    {Object}    ArrayModel
             *  @param options  {Object}    page
             */

            this.buildUrl = function( model ) {
                var
                    remote;
                // @TODO -- add filtering
                switch( model._dataSrc ) {
                    case this.PRC_SRC:
                        remote = Y.doccirrus.infras.getPrivateURL( model._dataUrl );
                        break;
                    case this.PUC_SRC:
                    case this.PORTAL_SRC:
                        remote = Y.doccirrus.infras.getPublicURL( model._dataUrl );
                        break;
                    case this.PLAIN_SRC:
                        remote = model._dataUrl;
                        break;
                    case this.DCPRC_SRC:
                        Y.log( 'No DCPRC access', 'debug' );
                }
                Y.log( 'Remote url: ' + remote, 'debug' );
                model._tempQuery = [];
                if( /^\/1\//.test( model._dataUrl ) ) { // flag that helps to support both rest types
                    model.newRest = true;
                }

                //  recently added objPopulate option can cause double '?', truncating querystring
                remote = remote.replace( '?objPopulate=TRUE?', '?objPopulate=TRUE&' );

                return remote;
            };

            this.addQueryToUrl = function( model, url ) {
                var
                    delimiter = model.newRest ? '/' : ',',
                    permanentQuery = model._dataQuery.join( delimiter ),
                    tempQuery = model._tempQuery.join( delimiter ),
                    position;

                if( tempQuery ) {
                    if( permanentQuery ) {
                        tempQuery = permanentQuery + delimiter + tempQuery;
                    }
                } else {
                    tempQuery = permanentQuery;
                }

                position = url.indexOf( '?' );
                if( url && '/' === url.slice( -1 ) ) {
                    url = url.slice( 0, -1 );
                }
                if( 0 <= position ) {
                    if( model.newRest ) {
                        tempQuery = tempQuery ? '/' + tempQuery : tempQuery;
                        return [url.slice( 0, position ), tempQuery, url.slice( position )].join( '' );
                    } else {
                        return url + '&query=' + tempQuery;
                    }
                }

                //  extra _id was preventing save from casefile_detail, strix 22/01/2014
                //return '?query=_id,' + tempQuery;

                if( model.newRest ) {
                    tempQuery = tempQuery ? '/' + tempQuery : tempQuery;
                    return url + tempQuery;
                } else {
                    return url + '?query=' + tempQuery;
                }
            };

            this.addIdQuery = function( model, url ) {
                model._tempQuery.push( '_id' );
                model._tempQuery.push( model._id );
                return this.addQueryToUrl( model, url );
            };

            this.addPaging = function( options, url ) {
                var
                    paging;
                // use standard param naming as at the RESTController
                if( options.limit ) {
                    // you can set a limit independently of a page number
                    paging = Y.doccirrus.urls.PARAM_LIMIT + '=' + (options.limit || 10);
                    // you can only set a page number if you also have a limit.
                    if( options.page ) {
                        paging += '&' + Y.doccirrus.urls.PARAM_PAGE + '=' + options.page;
                    }
                }
                if( options.sort && options.sort.split( ',' ).length % 2 === 0 ) {
                    paging += '&' + Y.doccirrus.urls.PARAM_SORT + '=' + options.sort;
                }
                if( 0 <= url.indexOf( '?' ) ) {
                    return '&' + paging;
                }
                return '?' + paging;

            };

            // helper for query=a,b,c,d type queries set in the options
            // could move to using objects for queries by extending and using DCQuery
            // preferred for readable URLs
            this.addQueryFromOptions = function( model, options ) {
                var i;
                if( options.query && options.query.length ) {
                    i = options.query.length;
                    while( i ) {
                        i--;
                        if( 'string' === typeof options.query[i] ) {
                            model._tempQuery.push( options.query[i] );
                        }
                    }
                }
            };

            this.addCustom = function( options, url ) {
                var custom = options.custom || {},
                    keys = Object.keys( custom ),
                    i,
                    result = '';
                for( i = 0; i < keys.length; i++ ) {
                    if( keys[i] in [Y.doccirrus.urls.PARAM_SEARCH, Y.doccirrus.urls.PARAM_SORT, Y.doccirrus.urls.PARAM_PAGE, Y.doccirrus.urls.PARAM_LIMIT] ) {
                        continue;
                    }
                    if( 0 === i && 0 > url.indexOf( '?' ) ) {
                        result += '?';
                    }
                    else {
                        result += '&';
                    }
                    result += keys[i] + '=' + custom[keys[i]];
                }
                return result;
            };

            /**
             *  Warn: mutates the data object to include a fields array as per
             *  the PUT spec.
             *
             *  @param  model
             *  @param  fieldsArr
             *  @param  data
             */
            this.addFieldsToData = function( model, fieldsArr, data ) {
                var
                    field,
                    fields = fieldsArr || '';
                // if the fields are unset, we update all of them
                if( !fields ) {
                    for( field in data ) {
                        if( field && '' !== field &&
                            '_id' !== field &&
                            '_filter' !== field ) {
                            if( fields.length > 0 ) {
                                fields += ',';
                            }
                            fields += field;
                        }

                    }
                }
                // don't use the URL params as well as the data param
                //return '&fields_=' + fields;
                // here we use the data param
                data.fields_ = fields;
                console.log( data.fields_ );
            };

            /**
             * Warn: mutates the data object to include a fields array as per
             * the PUT spec.
             *
             * Includes a query for the _id, as well.
             *
             * @param model
             * @param fieldsArr
             * @param data --> will be mutated to cinlude fields_  property.
             */
            this.getUrlUpdateParams = function( model, updateFields, data ) {
                var
                    q = this.addIdQuery( model, '' );
                if( q && data ) {
                    this.addFieldsToData( model, updateFields, data );
                }
                return q;
            };

            /**
             * Loads data for an ArrayModel from a remote data source via $ajax
             *
             * @method load
             * @param model {Object} ArrayModel object with all settings correctly set
             * @param options {Object} limit, sort, etc.  Typical DataTable options.
             * @param callback (optional) executes the callback with (err, data)
             */
            this.load = function( model, options, callback ) {
                var
                    remoteSource = this.buildUrl( model, options );
                if( !callback ) {
                    return;
                }
                remoteSource += this.addPaging( options, remoteSource );
                remoteSource += this.addCustom( options, remoteSource );
                this.addQueryFromOptions( model, options );
                remoteSource = this.addQueryToUrl( model, remoteSource );

                if( remoteSource ) {

                    $.ajax( {
                        url: remoteSource,
                        xhrFields: {
                            withCredentials: true
                        },
                        success: function( data ) {
                            Y.log( 'Success loading loadhelper from ' + model._modelName, 'info', NAME );

                            //  On FF / CentOS this will be a string, not an array, and will need to be unserialized
                            if( 'string' === typeof data ) {
                                Y.log( 'Parsing loaded data from string: ' + data.length + ' bytes', 'debug', NAME );

                                try {
                                    data = JSON.parse( data );
                                } catch( parseErr ) {
                                    Y.log( 'Could not parse returned string: ' + parseErr + ' - ' + data, 'warn', NAME );
                                    callback( 'Could not parse returned string: ' + parseErr );
                                    return;
                                }

                            }

                            if( data && data.data && data.meta ) {
                                // backward compatible integration of /1/ route into loadhelper.
                                data = data.data;
                            }

                            store[model._modelName] = model;
                            callback( null, data );
                        },
                        error: function( err ) {
                            Y.log( 'Error loading loadhelper from ' + model._modelName + ':  ' + err, 'info', NAME );
                            callback( err );
                        }
                    } );
                } else {
                    Y.log( 'Trying to fetch remote data without a valid url.', 'info', NAME );
                    return false;
                }
            };

            /**
             * Loads data for a single ViewModel from a remote data source via $ajax
             *
             * @method loadSingleViewmodel
             * @param Viewmodel {Object} ViewModel object pointer
             * @param options {Object} should also include a query, can also have limit, sort, etc.  Typical DataTable options.
             * @param callback (optional) executes the callback with (err, data)
             */
            this.loadSingleViewmodel = function( Viewmodel, options, callback ) {
                var
                    remoteSource,
                    model;

                // check we have a callback
                if( !callback ) {
                    return;
                }
                // make empty object to access _dataUrl;
                model = new Viewmodel( {} );
                // get the source
                remoteSource = this.buildUrl( model, options );
                // do not do all the steps that are done in load()
                this.addQueryFromOptions( model, options );
                remoteSource = this.addQueryToUrl( model, remoteSource );

                if( remoteSource ) {
                    $.ajax( {
                        url: remoteSource,
                        xhrFields: {
                            withCredentials: true
                        },
                        success: function( data ) {
                            var result;
                            Y.log( 'Success loading single from ' + model._modelName, 'info', NAME );

                            //  On FF / CentOS this will be a string, not an array, and will need to be unserialized
                            if( 'string' === typeof data ) {
                                Y.log( 'Parsing loaded data from string: ' + data.length + ' bytes', 'debug', NAME );

                                try {
                                    data = JSON.parse( data );
                                } catch( parseErr ) {
                                    Y.log( 'Could not parse returned string: ' + parseErr + ' - ' + data, 'warn', NAME );
                                    callback( 'Could not parse returned string: ' + parseErr );
                                    return;
                                }
                            }

                            if( data && data.data && data.meta ) {
                                // backward compatible integration of /1/ route into loadhelper.
                                data = data.data;
                            }
                            // only use a single record of the ones returned
                            if( Y.Array.test( data ) ) {
                                if( data.length ) {
                                    Y.log( 'More than one record returned from ' + remoteSource + ':  ', 'info', NAME );
                                }
                                data = data[0];
                            }

                            // only actually instantiate if not empty object
                            if( data && Y.Object.size( data ) ) {
                                result = new Viewmodel( data );
                                Y.log( 'Successful instantiation of single ViewModel.' );
                                callback( null, result ); // return the new result
                            } else {
                                callback( null, model ); // return empty model
                            }
                        },
                        error: function( err ) {
                            Y.log( 'Error loading data from ' + remoteSource + ':  ' + err, 'info', NAME );
                            callback( err );
                        }
                    } );
                } else {
                    Y.log( 'Empty data source / source not specified', 'info', NAME );
                    return false;
                }
            };

            /**
             * A generic save function that saves data from any ViewModel to the
             * server side database.
             *
             * If an _id is provided (update of an existing entry), PUT is used, otherwise,
             * POST (new entry). i.e. only the server may assign IDs, in general.
             *
             * @method save
             * @param   model           {Object}    a DC ViewModel Object to persist on the server side.
             * @param   key             {String}    the string name of a single field to save
             * @param   callbackSuccess {Function}  callback( data ) called after the operation has completed.
             * @param   callbackFailure {Function}  callback( err ) if save operation failed
             */
            this.save = function( model, key, callbackSuccess, callbackFailure ) {

                if( 'new' === model._id ) {
                    delete model._id;
                }

                var type = ( model._id ) ? 'PUT' : 'POST',
                    urlQuery,
                    data = model._serializeToJS();
                if( model._isDtTbl ) {
                    Y.log( 'Cannot save in an DataTableModel yet.', 'info', NAME );
                    return;
                }
                if( model._isNav ) {
                    Y.log( 'Cannot save Navigation Model.', 'info', NAME );
                    return;
                }
                //                console.log( 'save type: ' + type + ' on model: ' + Object.getOwnPropertyNames( model ) );
                //                console.log( ko.toJSON( model ) );
                urlQuery = this.buildUrl( model );
                if( 'PUT' === type ) {
                    urlQuery += this.getUrlUpdateParams( model, key, data );
                    urlQuery = urlQuery.replace( '?objPopulate=TRUE?', '?objPopulate=TRUE&' );
                    console.log( "URL_QUERY", urlQuery, model, key, data );
                }

                //  don't send placeholder 'new' _id with POST on first save
                if( 'POST' === type ) {
                    delete data._id;
                }

                //alert('Saving model: ' + JSON.stringify(data, undefined, 2));

                //  fix double querystring with objPopulate
                urlQuery = urlQuery.replace( '?objPopulate?', '?objPopulate&' );

                // ko makes sure the data is in sync
                // so we just send it off now
                if( 'PatientModel' === model._modelName ) {
                    Y.doccirrus.jsonrpc.api.patient.savePatient({
                       query: {
                           patientData: data
                       }
                    } ).done(function(response){

                        if( 'POST' === type ) {
                            model._id = response.data[0];
                        }
                        if( callbackSuccess && 'function' === typeof callbackSuccess ) {
                            callbackSuccess( response.data );
                        }
                    } ).fail(function(err){
                        if (err.code){
                            err.data = Y.doccirrus.errorTable.getMessage(err) || err.data;
                        }
                        Y.log( 'Problem saving data via ' + type + ' / ' + err.data, 'debug', NAME );
                        // evaluate the successful communication
                        if( callbackFailure && 'function' === typeof callbackFailure ) {
                            callbackFailure( err );
                        }

                    });
                } else {
                    Y.doccirrus.ajax.send( {
                        url: urlQuery,
                        xhrFields: {
                            withCredentials: true
                        },
                        data: data,
                        type: type,
                        success: function( data ) {
                            //Y.log('AJAX ' + type + ' success: ' + JSON.stringify(data), 'undefined', 2);
                            if( 'POST' === type ) {
                                model._id = data[0];
                            }

                            // evaluate the successful communication
                            if( callbackSuccess && 'function' === typeof callbackSuccess ) {
                                callbackSuccess( data );
                            }
                        },
                        error: function( data ) {
                            // server should send 400 for faulty input / invalid data
                            if( data && data.status ) {
                                data.data = Y.doccirrus.errorTable.getMessage( {code: data.status} );
                            }
                            Y.log( 'Problem saving data via ' + type + ' / ' + data, 'debug', NAME );
                            // evaluate the successful communication
                            if( callbackFailure && 'function' === typeof callbackFailure ) {
                                callbackFailure( data );
                            }
                        }
                    } );
                }
            };

            /**
             * A generic delete function that deletes data from any ViewModel to the
             * server side database.
             *
             * @method save
             * @param model  {Object}  a DC ViewModel Object to persist on the server side.
             * @param callback {function}
             */
            this._delete = function( model, callback ) {
                var
                    urlQuery,
                    data = model._serializeToJS();
                if( !model._id ) {
                    Y.log( 'Cannot delete record with no id.', 'info', NAME );
                    return;
                }
                if( model._isDtTbl ) {
                    Y.log( 'Cannot delete in an DataTableModel yet.', 'info', NAME );
                    return;
                }
                if( model._isNav ) {
                    Y.log( 'Cannot delete Navigation Model.', 'info', NAME );
                    return;
                }
                urlQuery = this.buildUrl( model );
                urlQuery = this.addIdQuery( model, urlQuery );

                // ko makes sure the data is in sync
                // so we just send it off now
                $.ajax( {
                    url: urlQuery,
                    xhrFields: {
                        withCredentials: true
                    },
                    data: data,
                    type: 'DELETE',
                    success: function( data ) {
                        // evaluate the successful communication
                        if( callback && 'function' === typeof callback ) {
                            callback( data );
                        }
                    },
                    error: function( data ) {
                        // server should send 400 for faulty input / invalid data
                        Y.log( 'Problem deleting data / ' + data, 'error', NAME );
                    }
                } );
            };

            //  optional events, used to update display globally by CaseFile nav

            /**
             *  This will be replaced by casefile_nav.js with its own event handler - keeping it
             *  optional in case loadhelper will be used elsehwere.
             *
             *  @param  key {String}
             *  @param  val {Mixed}
             */

            this.onSet = function( key, val ) {
                var strObj;

                try {
                    strObj = JSON.stringify( val );
                } catch( jsonErr ) {
                    strObj = jsonErr;
                }
                Y.log( 'Unhandled onSet event from UAM datastore: ' + key + ':= ' + strObj, 'warn', NAME );
            };

        }

        singleton = new DataStore();
        Y.namespace( 'doccirrus.uam' ).loadhelper = singleton;

    },
    '0.0.1', {requires: [
        'dcurls',
        'dcerrortable',
        'JsonRpcReflection-doccirrus'
    ]}
);
