/*
 @author: rw
 @date: 2013/12/09
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcarrayviewmodel', function( Y, NAME ) {

        /**
         *
         * See constructor.  As opposed to datatableviewmodel.
         *
         * @class ArrayViewModel
         */

        /**
         * Mix Updater
         *
         * Allows you to update one model from another without the observables
         * events destroying / overwriting each other.
         *
         * We need to put this pattern into a utility function, as it is very
         * useful and can be generalised.
         *
         * @param observable
         * @constructor
         */
        function MyUpdater( observable ) {
            this.obs = observable;
        }

        MyUpdater.prototype.update = function( item ) {
            if( !item ) {
                return this.obs();
            }
            this.obs( item );
            return item;
        };

        /**
         *
         * Base ArrayViewModel.  Mainly used to link select boxes to foreign collections.
         *
         * Should also be able to act as data source for a datatable (MOJ-1158)
         *
         * The abstract array-view model provides boilerplate to make
         * a view model into a model containing a single array which is always called
         * _data.
         *
         * The ArrayViewModel basically is a ViewModel with a single field (_data), which is an
         * observableArray. This field can loaded automatically with data depending
         * on the setup. This kind of View Model should be used for simple lookup
         * data scenarios, like Physician, Location, etc.
         *
         * Automatically adds the boilerplate to enable select boxes linked to the
         * main form model, if required (relObs and selectFldName params).
         *
         * Must set 'this' to the correct Object - i.e. the model that is being made into
         * an array model (see PhysicianArrayModel).
         *
         * @constructor ArrayViewModel
         * @param options {Object}
         *   data: optional Array to insert into the model
         *   field: the name of the field in the model that should be loaded if the arraymodel is an autoloader
         *          (i.e. asynchronous load from dataSource)
         *   relatedObs: the related Observer that this model must update when it is updated.
         *          (done via a generic syncronous computed)
         *   selectFldName: name of the function that can be used as a datasource to 'this' model
         *          but referring to the related observable (relObs) as the ultimate data source
         *   limit: number of items per page or unlimited
         *   page: page to start from or 1
         */
        function ArrayViewModel( data, options, callback ) {
            options = options || {};
            var
                self = this,
                upd;

            if( options.relatedObs ) {
                upd = new MyUpdater( options.relatedObs );
                // this function allows the models to
                // read and write to each other transparently
                // the parent chooses the name of the function and that is bound by ko.
                self._addDisposable( self[options.selectFldName] = ko.computed( {
                    read: function() {
                        return upd.update();
                    },
                    write: function( item ) {
                        return upd.update( item );
                    },
                    pure: true
                } ) );
            }
            self._isArrayViewModel = true;
            self._limit = options.limit;
            self._page = options.page || 1;
            self._data = ko.observableArray();

            // callback that gets the data asynchronously (or synchronously)
            self._arrLoadCb = function( err, data ) {
                if( err ) {
                    Y.log( 'error loading data, starting with empty array', 'info', NAME );
                }
                self._data._arrayOf = options.containsModelName;
                // only make the dependents observable if you really have to.
                if( self._hasObservableChildren() ) {
                    data = Y.doccirrus.uam.ViewModel.createModels( {
                        forName: options.containsModelName,
                        inAttribute: '_data',
                        parent: self,
                        items: data
                    } );
                }
                self._data( data || [] );
                if( callback ) {
                    callback();
                }
            };

            /**
             * Returns true if all contained ViewModels are valid.
             * @returns {boolean}
             */
            self._isValid = function() {
                var i,
                    viewmodel,
                    arr = self._data();
                for( i = 0; arr.length > i; i++ ) {
                    viewmodel = arr[i];
                    if( viewmodel._isValid && !viewmodel._isValid() ) {
                        return false;
                    }
                }
                return true;
            };

            // skip the async request if you can
            if( !data && self._autoLoad ) {
                Y.doccirrus.uam.loadhelper.load(
                    self,
                    {
                        limit: self._limit,
                        page: self._page
                    },
                    self._arrLoadCb
                );
            } else {
                self._arrLoadCb( null, data );
            }

        }

        Y.namespace( 'doccirrus.uam' ).ArrayViewModel = ArrayViewModel;

    },
    '0.0.1', {requires: []}
);