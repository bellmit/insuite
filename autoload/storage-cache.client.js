/*global YUI*/

YUI.add( 'storage-cache', function( Y ) {
        'use strict';

        /**
         * Create a storage cache
         *
         * @param {Storage} storage
         * @param {Function} [quota]
         * @constructor
         */
        function StorageCache( storage, quota ) {
            this.storage = storage;
            this.quota = quota;
        }

        /**
         * Check if an entry exists in the storage
         *
         * @param {string} key
         * @return {boolean}
         */
        StorageCache.prototype.has = function( key ) {
            if (typeof key !== 'string' && key instanceof String === false) {
                throw new Error( 'Not implemented' );
            }

            return this.storage.getItem( key ) !== null;
        };

        /**
         * Get an entry by its key or null if it was not found
         *
         * @param {string} key
         * @param {Function} [reviver]
         * @return {null|any}
         */
        StorageCache.prototype.get = function( key, reviver ) {
            if (typeof key !== 'string' && key instanceof String === false) {
                throw new Error( 'Not implemented' );
            }

            const value = this.storage.getItem( key );

            if ( value === null ) {
                return null;
            }

            try {
                return JSON.parse( value, reviver );
            } catch( error ) {
                throw new Error( 'Invalid entry' );
            }
        };

        /**
         * Store an entry
         *
         * @param {string} key
         * @param {any} value
         * @param {Function} [replacer]
         * @return {boolean}
         */
        StorageCache.prototype.set = function( key, value, replacer ) {
            if (typeof key !== 'string' && key instanceof String === false) {
                throw new Error( 'Not implemented' );
            }

            const serialization = JSON.stringify( value, replacer );

            // if there is a quota given check before write into the storage
            if ( typeof this.quota === 'function' && !this.quota( key, serialization ) ) {
                return;
            }

            try {
                this.storage.setItem( key, serialization );
            } catch ( error ) {
                return false;
            }

            return true;
        };

        /**
         * Remove all entries for the given key
         *
         * @param {string|Regexp} key
         * @return {void}
         */
        StorageCache.prototype.remove = function( key ) {
            if ( key instanceof RegExp === false ) {
                return this.storage.removeItem( key );
            }

            var matches = [];
            var regex = key;
            var i;

            for ( i = 0; i < this.storage.length; i++ ) {
                key = this.storage.key( i );

                if ( key.match( regex ) !== null ) {
                    matches.push( key );
                }
            }

            for (i = 0; i < matches.length; i++ ) {
                this.storage.removeItem( matches[i] );
            }
        };

        Y.namespace( 'doccirrus.storage' ).Cache = StorageCache;
    },
    '0.0.1',
    {
        requires: []
    }
);