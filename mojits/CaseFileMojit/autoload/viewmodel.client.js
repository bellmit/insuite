/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, jQuery, ko, moment */

'use strict';

YUI.add( 'dcviewmodel', function( Y, NAME ) {

        /**
         * @module dcviewmodel
         * @requires dcutils-uam, dcloadhelper, dcvalidationskbv, ViewModelReadOnly
         */

        var ViewModel,
            clientIdIndex = -1;

        /**
         * Main abstract view model provides mechanics to filter elements
         * and do common things like date formatting
         * @class ViewModel
         * @constructor
         * @param {Object} config
         * @deprecated
         */
        ViewModel = function() {
            var
                self = this,
                _revalidateTimeoutInstance = null,
                initialDataForObservableArraysWithSubViewModels = {},
                /** @private */
                _boilerplateFields = {};

            if( 'undefined' === typeof self._modelName ) {
                if( Y.config.debug ) {
                    Y.log( 'Creating empty / abstract viewModel: ' + JSON.stringify( self ), 'debug', NAME );
                }
            }

            // MOJ-1157 this needs to be rationalised
            self._dataUrl = '';
            // array of query couples, e.g. '_id,2365376'
            self._dataQuery = [];
            self._cid = 'c' + clientIdIndex++;

            /**
             * An Array to fill with subscriptions, that will be disposed on _dispose
             * @property _disposables
             * @type {Array}
             */
            self._disposables = self._disposables || [];
            /**
             * Indicates if this model was disposed
             * @property _disposed
             * @type {boolean}
             */
            self._disposed = false;

            /**
             * add a subscription to _disposables and returns it
             * @method _addDisposable
             * @param subscription
             * @return {*}
             */
            self._addDisposable = function _addDisposable( subscription ) {
                self._disposables.push( subscription );
                return subscription;
            };

            /**
             * disposes a subscription
             * @method _disposeSubscription
             * @param {ko.computed|ko.observable.subscribe} subscription
             * @param {String} [key]
             */
            self._disposeSubscription = function _disposeSubscription( subscription, key ) {

                if( self._isSubViewModel && '_parent' === key ) {
                    return;
                }

                if( subscription && 'function' === typeof subscription.dispose ) {
                    subscription.dispose();
                }
            };

            /**
             * disposes any subscriptions in this model and its SubViewModels
             * @method _dispose
             */
            self._dispose = function _dispose() {
                var
                    subViewModels = self.getSubViewModelsOf( self ),
                    arrayViewModels = self._isArrayViewModel && ko.utils.peekObservable( self._data ) || null;

                if( subViewModels.length ) {
                    Y.Array.invoke( subViewModels, '_dispose' );
                }

                if( arrayViewModels && arrayViewModels.length ) {
                    Y.Array.invoke( arrayViewModels, '_dispose' );
                }

                Y.each( self._disposables, self._disposeSubscription );
                Y.each( self, self._disposeSubscription, self );

                self._disposed = true;

            };

            /**
             * get the fields boilerplate created (only the fields by _runBoilerplate - those considered schema fields […including "_id"])
             * - when using in computed and a subscribe is unwanted, use: "ko.ignoreDependencies( function() { return ko.toJS( self._getBoilerplateFields() ); } );"
             * @method _getBoilerplateFields
             * @return {Object}
             */
            self._getBoilerplateFields = function _getBoilerplateFields() {
                var
                    result = {};

                Y.each( _boilerplateFields, function _getBoilerplateFields_each( field, key ) {

                    if( ko.isObservable( field ) && '_arrayOf' in field ) {

                        result[key] = [];

                        Y.each( ko.unwrap( field ), function _getBoilerplateFields_each_arrayValue( model ) {
                            if( model._getBoilerplateFields ) {
                                result[key].push( model._getBoilerplateFields() );
                            }
                        } );

                    }
                    else {

                        result[key] = field;

                    }

                } );

                return result;

            };

            /**
             * Gets the initial data for an observableArray which will later have SubViewModels in it.
             * - "_runBoilerplate" mostly adds these entries.
             * - "_generateDependantModels" converts them and removes them
             * @method _getInitialDataForObservableArraysWithSubViewModelsByKey
             * @param {String} key
             * @return {undefined|Array}
             */
            self._getInitialDataForObservableArraysWithSubViewModelsByKey = function _getInitialDataForObservableArraysWithSubViewModelsByKey( key ) {
                return initialDataForObservableArraysWithSubViewModels[key];
            };

            /**
             * Adds the initial data for an observableArray which will later have SubViewModels in it by key.
             * - "_runBoilerplate" mostly adds these entries.
             * - "_generateDependantModels" converts them and removes them
             * @method _AddInitialDataForObservableArraysWithSubViewModelsByKey
             * @param {String} key
             * @param {Array} array
             */
            self._AddInitialDataForObservableArraysWithSubViewModelsByKey = function _AddInitialDataForObservableArraysWithSubViewModelsByKey( key, array ) {
                initialDataForObservableArraysWithSubViewModels[key] = array;
            };

            /**
             * Removes the initial data for an observableArray which will later have SubViewModels in it by key.
             * - "_runBoilerplate" mostly adds these entries.
             * - "_generateDependantModels" converts them and removes them
             * @method _AddInitialDataForObservableArraysWithSubViewModelsByKey
             * @method _RemoveInitialDataForObservableArraysWithSubViewModelsByKey
             * @param {String} key
             */
            self._RemoveInitialDataForObservableArraysWithSubViewModelsByKey = function _RemoveInitialDataForObservableArraysWithSubViewModelsByKey( key ) {
                delete initialDataForObservableArraysWithSubViewModels[key];
            };

            self._globals = Y.doccirrus.uam.utils.getObservableGlobals();

            self._validStateMap = ko.observableArray();
            self._isValid = ko.computed( function() {
                return 0 === self._validStateMap().length;
            } );

            /**
             * this is a {{#crossLink "ViewModel/isPropertySchemaDefined:method"}}{{/crossLink}}
             * bound to this model
             * @method _isPropertySchemaDefined
             */
            self._isPropertySchemaDefined = Y.bind(ViewModel.isPropertySchemaDefined, self);

            /**
             * this is a {{#crossLink "ViewModel/getPropertiesSchemaDefined:method"}}{{/crossLink}}
             * bound to this model
             * @method _getPropertiesSchemaDefined
             */
            self._getPropertiesSchemaDefined = Y.bind(ViewModel.getPropertiesSchemaDefined, self);

            /**
             * returns the ViewModelReadOnly instance
             * @return {ViewModelReadOnly}
             */
            self._getModuleViewModelReadOnly = function() {
                var constructor = Y.doccirrus.uam.ViewModelReadOnly,
                    _moduleViewModelReadOnly = self[constructor.namespace];
                if( !_moduleViewModelReadOnly ) {
                    _moduleViewModelReadOnly = self[constructor.namespace] = constructor.createInstance( { viewModel: self } );
                }
                return _moduleViewModelReadOnly;
            };

            /**
             * Adds error identifier to track changed observables.
             */

            self._errorExists = function( id ) {
                return (-1 !== self._validStateMap.indexOf( id ));
            };

            self._addError = function() {
                var id = Array.prototype.slice.call( arguments ).join( '.' );
                if( self._errorExists( id ) ) {
                    return;
                }
                self._validStateMap.push( id );
            };

            /**
             * Removes error identifier.
             */
            self._removeError = function() {
                var id = Array.prototype.slice.call( arguments ).join( '.' ),
                    i;
                i = self._validStateMap.indexOf( id );
                if( -1 !== i ) {
                    self._validStateMap.valueWillMutate(); // fixes bug for not updating _isValid
                    self._validStateMap.splice( i, 1 );
                    self._validStateMap.valueHasMutated(); // fixes bug for not updating _isValid
                }
            };

            /**
             * @method _runBoilerplate
             * @param {Object} data
             * @param {Object} options
             */
            self._runBoilerplate = function( data, options ) {

                var
                    i,
                    schema,
                    typeName,
                    context = self,
                    property,
                    mixedSchema,
                    schemaName,
                    schemaSubPath,
                    validators,
                    propertyName,
                    whitelist,
                    extenders = [];

                if( !self._schemaName ) {
                    Y.log( 'Can not run boilerplate code: No schemaName defined!' );
                    return;
                }
                schemaName = self._schemaName;

                var schemaArr = schemaName.split( '.' );
                schemaName = schemaArr[0];
                schemaSubPath = schemaArr.slice( 1 ).join( '.' );
                schema = Y.doccirrus.schemas[schemaName];

                if( schemaArr[1] ) {
                    mixedSchema = Y.doccirrus.schemaloader.getTypeForSchemaPath( schema, schemaSubPath )[0];
                } else {
                    mixedSchema = schema.schema;
                }

                function granted( prop ) {
                    if( options && options.blacklist ) {
                        for( i = 0; i < options.blacklist.length; i++ ) {
                            if( prop === options.blacklist[i] ) {
                                return false;
                            }
                        }
                    }
                    return true;
                }

                if( data && data._id ) {
                    context._id = data._id;
                    _boilerplateFields._id = data._id;
                }

                function activateProperty( propertyName ) {
                    var
                        propertyValue;

                    if( granted( propertyName ) ) {

                        property = mixedSchema[propertyName];

                        if( !property ) {
                            // no definition, must be a submodel and will be cleaned up by further boilerplate calls
                            return;
                        }

                        if( typeof property.default === 'function' ) {
                            property.default = property.default();
                        }

                        propertyValue = Y.Lang.isUndefined( data[propertyName] ) ? property.default : data[propertyName];

                        if( Y.Lang.isArray( property ) ||
                            (Y.Lang.isObject( property ) && Y.Lang.isArray( property.type ) ) ) {

                            context[propertyName] = ko.observableArray();
                            typeName = Y.Lang.isString( property.dctype ) ? property.dctype : undefined; // undefined because of e.g.: [String]

                            if( typeName ) {
                                typeName = typeName.substring( 0, typeName.lastIndexOf( '_' ) ) + 'Model';
                                context[propertyName]._arrayOf = typeName;
                            }

                            // initializing observableArray with undefined is ok, but not writing in undefined later
                            if( !Y.Lang.isUndefined( propertyValue ) ) {
                                // only cache data for observableArray that will have SubViewModels
                                if( typeName ) {
                                    self._AddInitialDataForObservableArraysWithSubViewModelsByKey( propertyName, propertyValue );
                                }
                                // non SubViewModel generated can have it directly
                                else {
                                    context[propertyName]( propertyValue );
                                }
                            }

                        } else if( Y.Lang.isObject( property ) ) {
                            context[propertyName] = ko.observable( propertyValue );
                        }

                        if( context[propertyName] ) {

                            // trigger generation for readOnly model and fields
                            self._getModuleViewModelReadOnly().buildReadOnlyForBoilerplate( context, propertyName );

                            context[propertyName]['-de'] = property['-de'];
                            context[propertyName]['-en'] = property['-en'];
                            if( property.list ) {
                                context['_' + propertyName + 'List'] = property.list;
                            }
                            context[propertyName].i18n = property.i18n;

                            validators = [];

                            if( property.required ) {
                                validators.push( Y.doccirrus.validations.common.mongooseMandatory[0] );
                            }

                            // read all validators defined in validate
                            if( Y.Lang.isArray( property.validate ) ) {
                                validators.push.apply( validators, property.validate );
                            }

                            // collect all validate objects and extend after boilerplate generation
                            if( 0 < validators.length ) {
                                extenders.push( {
                                    validate: {
                                        validators: validators,
                                        context: self,
                                        propertyName: propertyName
                                    }
                                } );
                            }

                            _boilerplateFields[propertyName] = context[propertyName];

                        }

                    }
                }

                // allow the model to provide it's own whitelist
                if( options && options.getWhitelist ) {
                    whitelist = options.getWhitelist();
                    Y.Array.each( whitelist, activateProperty );
                } else {
                    for( propertyName in mixedSchema ) {
                        if( mixedSchema.hasOwnProperty( propertyName ) ) {
                            activateProperty( propertyName );
                        }
                    }

                }


                extenders.forEach( function( extender ) {
                    var obs = context[extender.validate.propertyName];

                    // add validation extender
                    obs.extend( extender );

                    self._addDisposable( ko.computed( function() {
                        // subscribe to hasError observable and add or remove error identifier
                        var
                            hasError = obs.hasError(),
                            isInitial = ko.computedContext.isInitial();

                        if( !isInitial ) {
                            if( hasError ) {
                                self._addError( self._cid, obs.propertyName );
                            } else {
                                self._removeError( self._cid, obs.propertyName );
                            }

                            // For the activity model only revalidate under certain circumstances
                            // MOJ-3206
                            if( self._modelName !== 'ActivityModel' &&
                                (self._modelName ? self._modelName.indexOf( 'Fk' ) !== 0 : true) &&
                                (self._schemaName ? self._schemaName.indexOf( 'activity' ) !== 0 : true)
                            ) {
                                self._revalidate();
                            } else {
                                // MOJ-3206, TODO check in configuration if On, Off or Auto validate.
                                // never validate activities that are not loaded for editting
                                if( self._dirtyCheckEnabled ) {
                                    self._revalidate();
                                }
                            }
                        }

                    } ) );

                } );

                context._validatable = ko.observable( false );
                self._addDisposable( ko.computed( function() {
                    var
                        isInitial = ko.computedContext.isInitial(),
                        _validatable = context._validatable(),
                        i, len, obs;
                    if( !isInitial ) {
                        for( i = 0, len = extenders.length; i < len; i++ ) {
                            obs = context[extenders[i].validate.propertyName];
                            obs._validatable( _validatable );
                        }
                    }
                } ) );

                if( self._parent && self._parent._validatable ) {
                    self._addDisposable( ko.computed( function() {
                        var valid = self._parent._validatable();
                        self._validatable( valid );
                    } ) );
                }
            };

            /**
             * Re-validate all observables, which have the validate extender attached.
             */
            self._revalidate = function() {
                clearTimeout( _revalidateTimeoutInstance );
                _revalidateTimeoutInstance = setTimeout( function() {
                    var
                        i,
                        property;

                    for( i in self ) {
                        if( self.hasOwnProperty( i ) ) {
                            property = self[i];
                            if( ko.isObservable( property ) && property.validate ) {
                                property.validate( property.peek() );
                            }
                        }
                    }
                }, ko.extenders.validate.REVALIDATE_TIMEOUT );
            };

            /**
             * Re-validate all observables, which have the validate extender attached.
             * Sync version returns if the model is valid.
             *
             * @returns {boolean}
             */
            self._revalidateSync = function() {
                var
                    i,
                    property,
                    valid = true;
                for( i in self ) {
                    if( self.hasOwnProperty( i ) ) {
                        property = self[i];
                        if( ko.isObservable( property ) && property.validate ) {
                            if( !property.validate( property() ) || !valid ) {
                                valid = false;
                            }
                        }
                    }
                }
                return valid;
            };

            /**
             *
             * @param date {String}
             * @param format {String}
             * @returns {*}
             */
            self._formatDateGeneric = function( date, format ) {
                var _date = moment.utc( date ).local().format( format );

                return  _date;
            };

            /**
             *
             * @param date
             * @returns {*}
             */
            self._formatDateTime = function( date ) {
                var
                    errString = 'Ungültiges Datum';
                if( !date ) {
                    return errString;
                }
                if( date && 'function' === typeof date ) {
                    date = date();
                }
                return self._formatDateGeneric( date, 'DD.MM.YYYY HH:mm:ss' );
            };

            /**
             *
             * @param date
             * @returns {*}
             */
            self._formatDate = function( date ) {
                var
                    errString = 'Ungültiges Datum';
                if( !date ) {
                    return errString;
                }
                if( date && 'function' === typeof date ) {
                    date = date();
                }
                return self._formatDateGeneric( date, 'DD.MM.YYYY' );
            };

            self._filter = {};

            self._getFilter = function() {
                return self._filter;
            };
            self._setFilter = function( key, value ) {
                self._filter[key] = value;
            };
            self._flushFilter = function() {
                self._filter = {};
            };
            // hint: overwrite this in each child if needed
            // source type
            self._dataSrc = Y.doccirrus.uam.loadhelper.PRC_SRC;
            // paging
            self._isPaged = false;
            // array type model
            self._isDtTbl = false;

            /**
             * Gets an array of filtered elements
             * @param itemsName function returning model contents
             * @returns [array]
             */
            self._filteredElements = function( itemsName ) {
                if( !self._isDtTbl ) {
                    // we don't allow non-array type Models to filter.
                    // think about splitting special Array functions like this
                    // out into a BasicArrayModel
                    return function() {
                    };
                }
                else {
                    return ko.computed( function() {
                        var filter = self._filter,
                            items = itemsName(),
                            result;

                        if( !filter ) {
                            result = items;
                        } else {

                            result = ko.utils.arrayFilter( items, function( item ) {
                                var key,
                                    valid = true,
                                    value;
                                for( key in filter ) {
                                    if( item[key] ) {
                                        value = item[key];
                                        if( 'function' === typeof value ) {
                                            value = value();
                                        }
                                        if( !value || value.indexOf( filter[key] ) < 0 ) {
                                            valid = false;
                                            break;
                                        }
                                    }
                                }
                                return valid;
                            } );
                        }
                        return result;
                    } );
                }
            };

            /**
             * The save function on view models forwards to the loadhelper.
             *
             * @param key {string} if key is supplied send only the attribute key's data
             *          instead of all data.
             * @param callbackSuccess {Function} callback
             * @param callbackFailure {Function} calls back any error or failure whhen saving
             * @private
             */
            self._save = function( key, callbackSuccess, callbackFailure ) {

                //  calculate hash of state to be saved
                var
                    newHash = self._getHash();

                //  update the hash (dirty flag) to reflect new state on server, before calling back
                function hookOnSaveSuccess( data ) {
                    Y.log( 'Updating hash to new state on server: ' + self._hash + ' --> ' + newHash, 'debug', NAME );

                    self._hash = newHash;
                    if( 'function' === typeof callbackSuccess ) {
                        callbackSuccess( data );
                    } else {
                        Y.log( 'No callback given to ViewModel._save key: ' + key + ' dataUrl: ' + self._dataUrl, 'warn', NAME );
                    }
                }

                // this is the actual function that will be bound to the button.
                Y.doccirrus.uam.loadhelper.save( self, key, hookOnSaveSuccess, callbackFailure );
            };

            /**
             * The delete function on view models forwards to the loadhelper.
             *
             * @param callback
             * @private
             */
            self._delete = function( callback ) {
                self._hash = -1;
                Y.doccirrus.uam.loadhelper._delete( self, callback );
            };

            /*
             *  Selected property, allows viewmodels to be chosen in multi-select tables
             */

            self._selected = ko.observable(false);

            /*
             *  RandomId is used to allow items with no _id property to be added to datatables and and other
             *  HTML sets where arrays of viewModels need to be distinguished before being sent to the server
             *
             *  Also used to link activities to documents on the server before first save (MOJ-3364, MOJ-3939)
             */

            self._randomId = Math.random().toString(36).slice(2);

            /**
             * Make a checksum of this object, used to tell if dirty on the client
             */

            self._getHash = function() {
                Y.log( 'Generating hash for model....(0)', 'debug', NAME );
                return Y.doccirrus.comctl.fastHash( self._serializeToJS() );
            };

            /**
             * Set automatically by uam.loadhelper on load() and after save()
             * @type {number}
             * @private
             */

            self._hash = -1;

            /**
             * Discover whether the state of this object is different from that on the server
             * @returns {boolean}
             * @private
             */

            self._isDirty = function() {

                if( Y.config.debug ) {
                    Y.log( '_isDirty() Hash at last save: ' + self._hash + ' current: ' + self._getHash(), 'info', NAME );
                }

                return (self._hash !== self._getHash());
            };

            /**
             * returns a list of SubViewModels searched recursively through the passed parameter
             * @param {ViewModel} [model=self] the model to search through, defaults to self
             * @returns {Array} a list of SubViewModels
             */
            self.getSubViewModelsOf = function( model ) {
                model = model || self;

                var list = [];

                function search( complex ) {
                    Y.each( complex, function( value ) {
                        if( ko.isWriteableObservable( value ) && Y.Object.owns( value, '_arrayOf' ) ) {
                            Y.each( value.peek(), function( item ) {
                                if( Y.Object.owns( item, '_isSubViewModel' ) && item._isSubViewModel ) {
                                    list.push( item );
                                }
                                search( item );
                            } );
                        }
                    } );
                }

                search( model );

                return list;
            };

            self._arrayAdd = function( attributeName, callback ) {
                if( !attributeName ) {
                    Y.log( 'No attribute given in: _arrayAdd' );
                }
                //console.log( 'called arrayAdd in ' + self._modelName + ' for field ' + attributeName);
                if( attributeName && self[attributeName] && self[attributeName]._arrayOf ) {
                    return function arrayAdder( attributeModel ) {
                        var classConfig = {
                                parent: attributeModel,
                                inAttribute: attributeName
                            };
                        switch( attributeName ) {
                            case 'addresses':
                                // make the first address 'OFFICIAL'
                                if( null === self._getAddressByKind('OFFICIAL') ) {
                                    classConfig.kind = 'OFFICIAL';
                                }
                                break;
                        }
                        self[attributeName].push(
                            new Y.doccirrus.uam[self[attributeName]._arrayOf]( classConfig )
                        );
                        if( callback && 'function' === typeof callback ) {
                            callback();
                        }
                    };
                }
                else {
                    Y.log( 'Problem in _arrayAdd(): ' + attributeName, 'debug', NAME );
                }
            };

            self._serializeToJS = function() {
                var
                    result,
                    data = self;

                function recursiveSerialize( obj ) {
                    var
                        i,
                        key,
                        item,
                        res = {};

                    for( key in obj ) {
                        if( obj.hasOwnProperty( key ) &&
                            (0 !== key.indexOf( '_' ) || '_id' === key ) ) {
                            // let all keys not starting with '_' through, AND
                            // '_id' as well.
                            item = obj[key];
                            if( 'function' === typeof item ) {
                                if( ko.isObservable( item ) ) {
                                    item = item.peek();
                                }
                                else {
                                    continue;
                                }
                            }

                            if( Array.isArray( item ) ) {
                                res[key] = [];
                                for( i = 0; i < item.length; i++ ) {
                                    // arrays can themselves be complex
                                    if( 'object' === typeof item[i] || 'function' === typeof item[i] ) {
                                        res[key].push( recursiveSerialize( item[i] ) );
                                    } else {
                                        // or they can be simple...
                                        res[key].push( item[i] );
                                    }
                                }
                            } else if( null !== item && undefined !== item ) {
                                res[key] = item;
                            }

                            //  special case for activity attachments because knockout is messing this @ 2014-05-04
                            //  temp, ugly hack, intermittent error where attachment _id is saved as '[Object object]'

                            if( 'attachments' === key ) {
                                res[key] = [];
                                for( i = 0; i < item.length; i++ ) {
                                    if( ('object' === typeof item[i]) && (item[i].hasOwnProperty( '_id' )) && (item[i]._id) ) {
                                        res[key].push( item[i]._id );
                                    }
                                    if( 'string' === typeof item[i] ) {
                                        res[key].push( item[i] );
                                    }
                                }
                            }

                        }

                    }
                    return res;
                }

                result = recursiveSerialize( data );
                return result;
            };

            /**
             * An array model has only one underlying array and is used by the datatable to
             * steer its lifetime process
             *
             * This function allows one view model to have several arrays contained within
             * it. Any observable can be an _arrayOf something else.
             *
             * There is a corresponding jade snippet that exists just for that sub-view-model.
             *
             * @private
             */
            self._generateDependantModels = function() {
                Y.each( self, function( value, key ) {
                    var
                        initialArray = self._getInitialDataForObservableArraysWithSubViewModelsByKey( key ),
                        models;

                    // check valid items
                    if( Array.isArray( initialArray ) && initialArray.length ) {
                        // check valid observableArray
                        if( ko.isObservable( value ) && 'push' in value ) {
                            models = Y.doccirrus.uam.ViewModel.createModels( {
                                forName: value._arrayOf,
                                inAttribute: key,
                                parent: self,
                                items: self._getInitialDataForObservableArraysWithSubViewModelsByKey( key )
                            } );
                            if( Array.isArray( models ) ) {
                                value( models );
                            }
                            self._RemoveInitialDataForObservableArraysWithSubViewModelsByKey( key );
                        }
                    }
                } );
            };

            /**
             * Factory function to generate simple array models from a defined complex view model.
             *
             * @param records The actual data list of JSON objects from the data store.
             * @returns {ViewModel}
             */
            self._generateDatatableModel = function( records ) {
                var
                    i = 0,
                    data = [],
                    BaseModel = Y.doccirrus.uam[self._arrayOf];

                if
                    ( !BaseModel ) {
                    Y.log( 'Array View Model must have a base type _arrayOf. In: ' + self._modelName );
                    return;
                }
                // insert ko rows into the ko array.
                for( i; i < records.length; i++ ) {
                    data.push( new BaseModel( records[i] ) );
                }

                self._randomId = Math.round( Math.random() * 100000 );
                //self._randomId = ko.observable( Math.random().toString(36).slice(2) );

                if( 'function' === typeof self.data ) {
                    // replace the data
                    self.data( data );
                } else {
                    // create new observable array
                    self.data = ko.observableArray( data || [] );
                }

            };

            /**
             * Escapes provided string
             * @method _escape
             * @param {String} value
             * @return {String}
             */
            self._escape = function( value ) {
                return Y.Escape.html( String( value || '' ) );
            };

        };

        /**
         * Get a constructor reference for a property name available in the namespace of "doccirrus.uam"
         * @method getConstructorFor
         * @param {String} uamPropertyName a property name in the namespace of "doccirrus.uam"
         * @return {null|*} null if the constructor can't be found else the reference for the constructor
         * @static
         */
        ViewModel.getConstructorFor = function( uamPropertyName ) {
            var
                constructor = Y.doccirrus.uam[uamPropertyName];

            if( constructor ) {

                return constructor;

            }
            else {

                Y.log( '"getConstructorFor" undefined doccirrus.uam.' + uamPropertyName, 'warn', NAME );

                return null;

            }

        };

        /**
         * Creates a {{#crossLink "ViewModel"}}{{/crossLink}} from provided parameters
         * @method createModel
         * @param {Object} parameters Configuration options
         * @param {String} parameters.forName The constructor name to use with {{#crossLink "ViewModel/getConstructorFor:method"}}{{/crossLink}}
         * @param {Object} [parameters.config] The config object which will be used with the constructor
         * @param {String} [parameters.inAttribute] … applies an "inAttribute" to the config
         * @param {*} [parameters.parent] … applies a "parent" to the config
         * @return {null|*} null if the constructor can't be found else the instance from the constructor
         * @static
         */
        ViewModel.createModel = function( parameters ) {
            var
                forName = parameters.forName,
                config = parameters.config || {},
                Constructor = ViewModel.getConstructorFor( forName ),
                inAttribute = parameters.inAttribute,
                parent = parameters.parent;

            if( Constructor ) {
                if( config ) {

                    if( config instanceof Constructor ) {
                        return config;
                    }

                    if( inAttribute ) {
                        config.inAttribute = inAttribute;
                    }
                    if( parent ) {
                        config.parent = parent;
                    }

                    return new Constructor( config );

                }
                else {

                    return new Constructor();

                }
            }
            else {

                return null;

            }

        };

        /**
         * Creates an array of {{#crossLink "ViewModel"}}{{/crossLink}} from provided parameters
         * @method createModels
         * @param {Object} parameters Configuration options
         * @param {String} parameters.forName The constructor name to use with {{#crossLink "ViewModel/getConstructorFor:method"}}{{/crossLink}}
         * @param {Array} [parameters.items] An array of construtor configuration objects
         * @param {String} [parameters.inAttribute] … applies an "inAttribute" to the items config
         * @param {*} [parameters.parent] … applies a "parent" to the items config
         * @return {null|Array} null if the constructor can't be found else an array with the instances from the constructor with their applied constructor configurations
         * @static
         */
        ViewModel.createModels = function( parameters ) {
            var
                forName = parameters.forName,
                items = parameters.items || [],
                Constructor = ViewModel.getConstructorFor( forName ),
                inAttribute = parameters.inAttribute,
                parent = parameters.parent;

            if( Constructor ) {

                return items.map( function( item ) {
                    return ViewModel.createModel( {
                        forName: forName,
                        config: item,
                        inAttribute: inAttribute,
                        parent: parent
                    } );
                } );

            }
            else {

                return null;

            }

        };

        /**
         * checks if the passed propertyName is defined by the schema of desired context
         * (this is a static function to call with the desired context)
         * @method isPropertySchemaDefined
         * @param propertyName
         * @returns {Boolean}
         * @static
         */
        ViewModel.isPropertySchemaDefined = function( propertyName ) {
            var
                self = this,
                schemaProperties = self._getPropertiesSchemaDefined();
            return Boolean( schemaProperties.indexOf( propertyName ) > -1 );
        };

        /**
         * get an array of property names which are defined by the schema of desired context
         * (this is a static function to call with the desired context)
         * @method getPropertiesSchemaDefined
         * @returns {Array}
         * @static
         */
        ViewModel.getPropertiesSchemaDefined = function() {
            var
                self = this,
                result = [],
                schema = Y.doccirrus.schemas[self._schemaName];
            if( schema && schema.schema ) {
                result.push.apply( result, Y.Object.keys( schema.schema ) );
            }
            return result;
        };

        /**
         * mixes _dispose, _disposeSubscription, _disposables & _disposed for non ViewModel constructors
         * @param context
         * @return {boolean} success indicator
         */
        ViewModel.mixDisposable = function ViewModel_mixDisposable( context ) {

            if( !Y.Lang.isObject( context ) ) {

                Y.log( 'mixDisposable: no valid context', 'error' );
                return false;
            }

            if( '_dispose' in context || '_disposeSubscription' in context || '_disposables' in context || '_disposed' in context ) {

                Y.log( 'mixDisposable: redeclaration of properties', 'warn', context.constructor && context.constructor.name || NAME );
            }

            /**
             * An Array to fill with subscriptions, that will be disposed on _dispose
             * @property _disposables
             * @type {Array}
             */
            context._disposables = [];

            /**
             * Indicates if this model was disposed
             * @property _disposed
             * @type {boolean}
             */
            context._disposed = false;

            /**
             * add a subscription to _disposables and returns it
             * @param subscription
             * @return {*}
             */
            context._addDisposable = function _addDisposable( subscription ) {
                context._disposables.push( subscription );
                return subscription;
            };

            /**
             * disposes a subscription
             * @param {ko.computed|ko.observable.subscribe} subscription
             * @param {String} [key]
             */
            context._disposeSubscription = function _disposeSubscription( subscription/*, key*/ ) {

                if( subscription && 'function' === typeof subscription.dispose ) {
                    subscription.dispose();
                }

            };

            /**
             * disposes any subscriptions in this model and its SubViewModels
             */
            context._dispose = function _dispose() {

                Y.each( context._disposables, context._disposeSubscription );
                Y.each( context, context._disposeSubscription, context );

                context._disposed = true;

            };

            return true;

        };

        /**
         * create an async ko.computed, while inProgress use config.value.
         * @uses ko.extenders.makeAsync
         * @method createAsync
         * @param {Object} config the configuration
         * @param {Object} config.jsonrpc Object with property "fn" (rpc function reference) and optional "params" (Object or ko.observable).
         *                                      In case "params" evaluates to a false value and isn't 'undefined', the rpc won't be called
         *                                      In case "params" change, the rpc will be called again.
         * @param {Object} config.ajax Object with properties of jQuery.ajax which may overwrite the defaults, "url" can be a function or "url" and "data" can be ko.observable.
         *                                      In case "url" evaluates to a false value, the ajax won't be called
         *                                      In case "url" or "data" change, the ajax will be called again.
         * @param {*} [config.initialValue] value to use while in progress
         * @param {*} [config.cache=ViewModel] namespace to use for caching
         * @param {*} [config.cacheTimeout] timeout to use for clearing cached results
         * @param {ko.computed} [config.computed] arguments you would pass to a computed the return should be a jQuery.Deferred
         * @param {*} [config.computedContext] context to use for computed
         * @returns {ko.observable} the extended observable, additional properties are:
         *                                      "inProgress" - for checking if deferred is resolved
         *                                      "createAsync" - an Object with "config" (the passed config), "deferred" (current jQuery.Deferred), "computed" (not extended observable)
         * @static
         * @see ko.extenders.makeAsync
         * @example _via jsonrpc:_
         * @example
            self._exampleAsync = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: MyModel,
                initialValue: [],
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.schema.read,
                    params: { foo: 'bar' } // optional, for observable params: ko.observable({ foo: 'bar' })
                },
                converter: function( data ) {
                    return Y.Object.owns( data, 'data' ) ? data.data : [];
                }
            } );
         * @example _via ajax:_
         * @example
            self._exampleAsync = Y.doccirrus.uam.ViewModel.createAsync( {
                cache: MyModel,
                initialValue: [],
                ajax: {
                    url: 'http://some.url/read',
                    // as a function: function(){ return 'http://some.url/read'; }
                    // as an observable: ko.computed(function(){ return 'http://some.url/read'; })
                    data: {} // optional, can also be ko.observable({})
                },
                converter: function( data ) {
                    return data ? data : [];
                }
            } );
         * @example _via only deferred:_
         * @example
            self._exampleAsync = Y.doccirrus.uam.ViewModel.createAsync( {
                initialValue: 'foo',
                converter: function( data ) {
                    return data + ' (converted)';
                }
            } );
            // emulate async:
            setTimeout(function(){
                self._exampleAsync.createAsync.deferred.resolve('bar');
            }, 2000);
            // print to console:
            ko.computed(function(){
                console.log('value of "_exampleAsync":', self._exampleAsync());
                // logs: value of "_exampleAsync": 'foo'
                // +2000ms logs: value of "_exampleAsync": 'bar (converted)'
            });
         */
        ViewModel.createAsync = function( config ) {
            // FYI: initialValue && converter are handled by the extender
            config = config || {};

            var
                computedContext = config.computedContext,
                cacheNamespace = config.cache || ViewModel,
                cache = cacheNamespace.async = cacheNamespace.async || {},
                cacheTimeout = config.cacheTimeout,
                jsonRpc = config.jsonrpc,
                ajax = config.ajax,
                computedCfg = config.computed,
                computed, extended, currentDeferred;

            if( !computedCfg ) {
                if( jsonRpc ) {
                    computedCfg = function computedJsonRpcHandler() {
                        var
                            params = ko.unwrap( (Y.Lang.isUndefined( jsonRpc.params ) ? {} : jsonRpc.params) ), // params to pass and listen to change
                            fn = ( Y.Lang.isUndefined( jsonRpc.fn ) ? jsonRpc : jsonRpc.fn ), // rpc to use
                            identifier = { d: fn.description, p: params }, // unique identifier for caching
                            hash = JSON.stringify( identifier ), // hash to use in cache
                            deferred; // the returned deferred of rpc

                        if( params ) { // do call for supplied params
                            if( hash in cache ) { // if available use cached deferred
                                deferred = cache[hash];
                            } else { // else cache the deferred
                                deferred = fn( params );
                                cache[hash] = deferred;
                                if( cacheTimeout ) {
                                    setTimeout( function() {
                                        cache[hash] = null;
                                        delete cache[hash];
                                    }, cacheTimeout );
                                }
                            }
                        } else { // don't call just make deferred
                            deferred = jQuery.Deferred();
                        }

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                } else if( ajax ) {
                    computedCfg = function computedAjaxHandler() {
                        var
                            ajaxCfg = Y.aggregate( { // ajax defaults
                                type: 'GET', dataType: 'json',
                                xhrFields: { withCredentials: true }
                            }, ajax, true ),
                            hash, deferred;

                        if( !ko.isObservable( ajaxCfg.url ) && 'function' === typeof ajaxCfg.url ) {
                            ajaxCfg.url = ajaxCfg.url(); // handle url if is a plain function
                        } else {
                            ajaxCfg.url = ko.unwrap( ajaxCfg.url ); // listen to change
                        }
                        ajaxCfg.data = ko.unwrap( ajaxCfg.data ); // listen to change

                        if( ajaxCfg.url ) { // do call for valid url
                            hash = JSON.stringify( { u: ajaxCfg.url, d: ajaxCfg.data } ); // unique identifier for caching
                            if( hash in cache ) { // if available use cached deferred
                                deferred = cache[hash];
                            } else { // else cache the deferred
                                deferred = jQuery.ajax( ajaxCfg );
                                cache[hash] = deferred;
                                if( cacheTimeout ) {
                                    setTimeout( function() {
                                        cache[hash] = null;
                                        delete cache[hash];
                                    }, cacheTimeout );
                                }
                            }
                        } else { // don't call just just make deferred
                            deferred = jQuery.Deferred();
                        }

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                } else {
                    // just a dummy for other deferred stuff
                    computedCfg = function computedDeferredHandler() {
                        var
                            deferred = jQuery.Deferred();

                        currentDeferred = deferred;

                        return deferred; // return deferred to extender
                    };
                }
            }

            computed = ko.pureComputed( computedCfg, computedContext );
            extended = computed.extend( { makeAsync: config } );

            extended.createAsync = {
                config: config,
                computed: computed,
                deferred: currentDeferred
            };

            return extended;
        };

        Y.namespace( 'doccirrus.uam' ).ViewModel = ViewModel;

    },
    '0.0.1', {requires: [
        'oop',
        'ko-extenders',
        'dcutils-uam',
        'dcloadhelper',
        'kbv-validations',
        'ViewModelReadOnly'
    ]}
);