/*
 @author: rw
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcsubviewmodel', function( Y, NAME ) {

        /**
         * Abstract sub-view model provides boilerplate to make
         * a view model into a dependant view-model, i.e. one which
         * has a parent.
         *
         * Main use is in recurring elements of view models - e.g.
         * addresses. A petient can have several addresses, each
         * of these is an address in its own right and reusable, but
         * is also linked to the parent model (patient).
         *
         * @constructor SubViewModel
         * @param options {Object} {parent: {ViewModel}, inAttribute: {String} }
         * @deprecated
         */
        function SubViewModel( options ) {
            var
                self = this;

            self._isSubViewModel = true;
            self._parent = options.parent;
            self._inAttribute = options.inAttribute;

            if( self._parent && self._parent._schemaName ) {
                self._schemaName = self._parent._schemaName + '.' + self._inAttribute;
            }

            /**
             * Adds error identifier to itself and parent to track changed observables.
             */
            self._addError = function() {
                var id = Array.prototype.slice.call( arguments ).join( '.' );
                if( self._errorExists( id ) ) {
                    return;
                }
                self._validStateMap.push( id );
                self._parent._addError( self._inAttribute, id );
            };

            /**
             * Removes error identifier to itself and parent.
             */
            self._removeError = function() {
                var id = Array.prototype.slice.call( arguments ).join( '.' );
                self._validStateMap.remove( id );
                self._parent._removeError( self._inAttribute, id );
            };

            /**
             * Deletes the given object from its container array in the parent.
             *
             * @param modelName
             * @returns {Function}
             * @private
             */
            self._arrayDel = function() {
                Y.log( 'called arrayDel in ' + self._modelName, 'debug', NAME );
                var subViewModels = [self].concat( self.getSubViewModelsOf() );
                // remove any subviews
                Y.each( subViewModels, function( subViewModel ) {
                    Y.each( subViewModel, function( value ) {
                        if( ko.isObservable( value ) && Y.Object.owns( value, 'hasError' ) ) {
                            value._validatable( false );
                            value.hasError( false ); // there is a subscription to "_validStateMap" _removeError
                        }
                    } );
                    // by here there should be no "_validStateMap" error left, but in case of
                    self._validStateMap.removeAll();
                    subViewModel._parent[subViewModel._inAttribute].remove( subViewModel );
                } );
            };

        }

        Y.namespace( 'doccirrus.uam' ).SubViewModel = SubViewModel;

    },
    '0.0.1', {requires: [
        'oop'
    ]}
);