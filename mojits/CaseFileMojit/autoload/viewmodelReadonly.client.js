/*jslint anon:true, nomen:true*/
/*global YUI, ko */
'use strict';
YUI.add( 'ViewModelReadOnly', function( Y/*, NAME*/ ) {

    /**
     * check for ViewModel
     * @param model
     * @return {boolean}
     * @see ViewModel
     */
    function isViewModel( model ) {

        if( Y.Lang.isObject( model ) ) {
            if( model._modelName ) { // uam.ViewModel (deprecated)
                return true;
            }
            if( Y.doccirrus.KoViewModel && model instanceof (Y.doccirrus.KoViewModel.getBase()) ) { // KoViewModel
                return true;
            }
        }

        return false;
    }

    /**
     * check for SubViewModel
     * @param model
     * @return {boolean}
     * @see SubViewModel
     */
    function isSubViewModel( model ) {

        if( Y.Lang.isObject( model ) ) {
            if( model._isSubViewModel ) { // uam.ViewModel (deprecated)
                return true;
            }
            if( model.get && model.get( 'parent' ) ) { // KoViewModel
                return true;
            }
        }

        return false;

    }

    /**
     * check for ArrayModel
     * @param model
     * @return {boolean}
     * @see ArrayViewModel
     */
    function isArrayModel( model ) {
        return Boolean( Y.Object.owns( model, '_arrayOf' ) && model._arrayOf ) || Boolean( Y.Object.owns( model, '_isArrayViewModel' ) && model._isArrayViewModel );
    }

    /**
     * check if model has a _isModelReadOnly observable
     * @param model
     * @return {Boolean}
     */
    function isModelReadOnly( model ) {
        return ( Y.Object.owns( model, '_isModelReadOnly' ) && ko.isWriteableObservable( model._isModelReadOnly ) );
    }

    /**
     * check if model has a readOnly method on an observable field
     * @param model
     * @return {Boolean}
     */
    function isReadOnly( observable ) {
        return ( Y.Object.owns( observable, 'readOnly' ) && ko.isWriteableObservable( observable.readOnly ) );
    }

    /**
     * go through provided item and call handler on each item
     * @param {Object} parameters
     * @param {ViewModel|Array|Object|observable} parameters.item
     * @param {Function} parameters.handler provided params: item, path
     * @param {String} [parameters.path] (defaults EmptyString if not supplied)
     */
    function walkModelFieldsHierarchical( parameters ) {
        var
            item = parameters.item,
            handler = parameters.handler,
            path = parameters.path || '',
            unwrapItem = ko.unwrap( item ),
            options = parameters.options || {},
            handlerOptions = Y.merge(
                { parent: null },
                options,
                {
                    path: path,
                    item: item,
                    unwrap: unwrapItem
                }
            );

        handler( handlerOptions );

        if( Y.Lang.isArray( unwrapItem ) || Y.Lang.isObject( unwrapItem ) ) {
            Y.each( unwrapItem, function( itemValue, itemKey ) {
                // continue for "_" prefixed items
                if( 0 === String( itemKey ).indexOf( '_' ) ) {
                    return true;
                }
                // assumed complex
                if( ko.isObservable( itemValue ) || Y.Lang.isArray( ko.unwrap( itemValue ) ) || isSubViewModel( itemValue ) ) {

                    options.parent = {
                        item: item,
                        path: path,
                        unwrap: unwrapItem
                    };
                    walkModelFieldsHierarchical( {
                        item: itemValue,
                        handler: handler,
                        path: (path ? (path + '.' + itemKey) : itemKey),
                        options: options
                    } );
                    return true;
                }
            } );
        }

    }

    /**
     * sets passed item to readOnly state
     */
    function handleItemReadOnly( item, state ) {

        if( isModelReadOnly( item ) ) {
            item._isModelReadOnly( state );
        }
        else if( isReadOnly( item ) ) {
            item.readOnly( state );
        }

    }

    /**
     * makes a wildcard string to a RegExp
     * '*.*' becomes /^.*?\..*?$/
     */
    function makeRegExp( path ) {
        return Y.Lang.isString( path ) && Y.doccirrus.commonutils.wildcardToRegExp( path ) || path;
    }

    /**
     *
     * @param {Object} config
     * @param {ViewModel} config.viewModel
     * @constructor
     */
    function ViewModelReadOnly( config ) {
        config = config || {};
        var
            self = this,
            viewModel = self._viewModel = config.viewModel;

        if( !viewModel ) {
            throw new Error( 'ViewModelReadOnly: invalid viewModel!' );
        }

        self._init();

    }

    /**
     * namespace in model to use
     * @type {string}
     * @static
     */
    ViewModelReadOnly.namespace = '_moduleViewModelReadOnly';
    /**
     * @type {walkModelFieldsHierarchical}
     * @static
     */
    ViewModelReadOnly.walkModelFieldsHierarchical = walkModelFieldsHierarchical;
    /**
     *
     * @param {Object} config
     * @return {ViewModelReadOnly}
     */
    ViewModelReadOnly.createInstance = function( config ) {
        return new ViewModelReadOnly( config );
    };
    ViewModelReadOnly.prototype = {
        constructor: ViewModelReadOnly,
        /** @private */
        _init: function() {
            var
                self = this,
                viewModel = self._viewModel;
            /**
             * common readOnly state for this viewModel
             * @type {ko.observable}
             * @see ko.bindingHandlers.readOnly
             */
            viewModel._isModelReadOnly = ko.observable( false );

        },

        /**
         * builds readOnly computed on model observable fields as _runBoilerplate creates them.
         * accessible via yourObservableField.readOnly
         * @param {ViewModel} context
         * @param {String} propertyName
         * @return {computed|undefined}
         * @see ViewModel._runBoilerplate
         */
        buildReadOnlyForBoilerplate: function buildReadOnlyForBoilerplate( context, propertyName ) {

            var readOnlyComputed,
                viewModel = this._viewModel;
            if( ko.isWriteableObservable( context[propertyName] ) ) {
                readOnlyComputed = context[propertyName].readOnly = context[propertyName].readOnly || ko.computed( (function() {
                    var // the private observable is undefined until it gets written to
                        readOnlyObservable = ko.observable(),
                    // build the computed
                        computedCfg = {
                            pure: true
                        };

                    /**
                     * if this computed gets written to use the private observable
                     * @param {Boolean} value
                     */
                    computedCfg.write = function( value ) {
                        readOnlyObservable( value );
                    };

                    /**
                     * either the models common readOnly state or the written state
                     * @return {Boolean}
                     * @see ViewModel._isModelReadOnly
                     */
                    computedCfg.read = function() {
                        var readResult,
                            readOnlyAll = viewModel._isModelReadOnly(),
                            readOnlyOwn = readOnlyObservable();

                        // determine private observable usage
                        if( Y.Lang.isUndefined( readOnlyOwn ) ) {
                            readResult = readOnlyAll;
                        } else {
                            readResult = readOnlyOwn;
                        }

                        return readResult;
                    };

                    // make config a computed
                    return computedCfg;
                })() );
            }
            if( 'function' === typeof context._addDisposable ) {
                context._addDisposable( readOnlyComputed );
            }
            return readOnlyComputed;
        },

        /**
         * translates a getReadOnlyFields return value and flag fields readOnly
         * @param {Object} parameters
         * @param {Array} parameters.paths
         * @param {Boolean} [parameters.state=true]
         * @param {Boolean} [parameters.invert=true]
         */
        // TODO: [Improvement] MOJ-5508: improve ViewModelReadOnly._makeReadOnly for KoViewModel
        _makeReadOnly: function _makeReadOnly( parameters ) {
            var
                paths = parameters.paths,
                state = parameters.state,
                invert = parameters.invert,

                viewModel = this._viewModel,

                itemsMatchPaths = {},
                itemsNotMatchPaths = {},
                itemsToHandle = {},
                invertItems = {};

            if( !Y.Lang.isArray( paths ) ) {
                throw new Error( '_makeReadOnly: paths invalid!' );
            }
            paths = Y.Array.map( paths, makeRegExp );
            if( Y.Lang.isUndefined( state ) ) {
                state = true;
            }
            if( Y.Lang.isUndefined( invert ) ) {
                invert = true;
            }

            // get all fields reset their state and determine should be handled
            walkModelFieldsHierarchical( {
                item: viewModel,
                handler: function( options ) {
                    var
                        item = options.item,
                        path = options.path,
                        isItemToHandle = Y.Array.some( paths, function( aRegExp ) {
                            return aRegExp.test( path );
                        } );

                    // reset fields
                    if( isModelReadOnly( item ) ) {
                        item._isModelReadOnly( false );
                    }
                    if( isReadOnly( item ) ) {
                        item.readOnly( undefined );
                    }
                    // map fields
                    if( isItemToHandle ) {
                        itemsMatchPaths[path] = options;
                    } else {
                        itemsNotMatchPaths[path] = options;
                    }

                }
            } );

            // try to not disable each *.isReadOnly if not necessary, they already listens to their model._isModelReadOnly observable
            Y.each( itemsMatchPaths, function( options, path ) {
                if( isViewModel( options.item ) || isArrayModel( options.item ) || (options.parent && isReadOnly( options.item ) && !Y.Object.owns( itemsToHandle, options.parent.path )) ) {
                    handleItemReadOnly( options.item, state );
                    itemsToHandle[path] = options;
                }
                // skipping invertItems addition
            } );
            Y.each( itemsNotMatchPaths, function( options, path ) {
                if( path && !Y.Object.owns( invertItems, path ) ) {
                    invertItems[path] = options.item;
                }
            } );
            /*
             console.warn('itemsMatchPaths', itemsMatchPaths);
             console.warn('itemsNotMatchPaths', itemsNotMatchPaths);
             console.warn('itemsToHandle', itemsToHandle);
             */
            if( invert ) {
                //console.warn('invertItems', invertItems);
                Y.each( invertItems, function( options ) {
                    handleItemReadOnly( options.item, !state );
                } );
            }

        }
    };

    Y.namespace( 'doccirrus.uam' );
    Y.doccirrus.uam.ViewModelReadOnly = ViewModelReadOnly;

}, '0.0.1', {
    "requires": [
        'oop',
        'KoViewModel'
    ]
} );
