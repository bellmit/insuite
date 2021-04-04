/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'Collection', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module Collection
     */
    Y.namespace( 'doccirrus' );
    var
        unwrap = ko.unwrap,
    // peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function Collection( config ) {
        Collection.superclass.constructor.call( this, config );
    }

    Y.extend( Collection, Disposable, {
        initializer: function() {
            var
                self = this;

            self.items = ko.observableArray( self.get( 'items' ) );
        },
        destructor: function() {

        },
        /**
         * Get an item by index from the items.
         *
         * @method item
         * @param {Integer} i index to fetch
         * @return {mixed} the item at the requested index
         */
        item: function( i ) {
            return unwrap( this.items )[i];
        },
        /**
         * Execute a function on each item of the items, optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * @method each
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {Collection} this instance
         * @chainable
         */
        each: function( fn, context ) {
            Y.Array.each( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                fn.call( context || item, item, i, this );
            }, this );

            return this;
        },
        /**
         * Executes the supplied function on each item in the array and
         * returns a new array containing all the values returned by the supplied function, optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * @method map
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {Array} new array
         */
        map: function( fn, context ) {
            return Y.Array.map( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                return fn.call( context || item, item, i, this );
            }, this );
        },
        /**
         * Execute a function on each item of the items, optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * Unlike <code>each</code>, if the callback returns true, the
         * iteration will stop.
         *
         * @method some
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {Boolean} True if the function returned true on an item
         */
        some: function( fn, context ) {
            return Y.Array.some( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                return fn.call( context || item, item, i, this );
            }, this );
        },
        /**
         * Executes the supplied function on each item in the array,
         * searching for the first item that matches the supplied function, optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * @method find
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {mixed|null} the first item that the supplied function returns true for, or null if it never returns true.
         */
        find: function( fn, context ) {
            return Y.Array.find( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                return fn.call( context || item, item, i, this );
            }, this );
        },
        /**
         * Executes the supplied function on each item in the array.
         * Returns a new array containing the items for which the supplied function returned a truthy value, optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * @method filter
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {Array} Array of items for which the supplied function returned a truthy value (empty if it never returned a truthy value).
         */
        filter: function( fn, context ) {
            return Y.Array.filter( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                return fn.call( context || item, item, i, this );
            }, this );
        },
        /**
         * The inverse of filter(). Executes the supplied function on each item.
         * Returns a new array containing the items for which the supplied function returned false., optionally providing a
         * custom execution context. Default context is the item.
         *
         * The callback signature is <code>callback( item, index )</code>.
         *
         * @method reject
         * @param {Function} fn the function to execute
         * @param {mixed} context optional override 'this' in the function
         * @return {Array} The items for which the supplied function returned false.
         */
        reject: function( fn, context ) {
            return Y.Array.reject( unwrap( this.items ), function( item, i ) {
                item = this.item( i );

                return fn.call( context || item, item, i, this );
            }, this );
        },
        /**
         * Finds the first index of the needle in the managed array of items.
         *
         * @method indexOf
         * @param {mixed} needle The item to search for
         * @return {Integer} Array index if found.  Otherwise -1
         */
        indexOf: function( needle ) {
            return Y.Array.indexOf( unwrap( this.items ), needle );
        },
        /**
         * How many items are in this collection?
         *
         * @method size
         * @return {Integer} Number of items in the list
         */
        size: function() {
            return unwrap( this.items ).length;
        },
        /**
         * Is this instance managing any items?
         *
         * @method isEmpty
         * @return {Boolean} true if 1 or more items are being managed
         */
        isEmpty: function() {
            return !this.size();
        },
        /**
         * Provides an array-like representation for JSON.stringify.
         *
         * @method toJSON
         * @return {Array} an array representation of this collection
         */
        toJSON: function() {
            return [].concat( unwrap( this.items ) );
        }
    }, {
        NAME: 'Collection',
        ATTRS: {
            items: {
                value: [],
                cloneDefaultValue: true,
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( Collection );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel'
    ]
} );
