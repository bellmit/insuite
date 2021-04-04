/*global YUI, YUI_config*/

YUI.add( 'schema-cache', function( Y, NAME ) {
        'use strict';

        /**
         * Minimal free space left in the given storage in bytes
         *
         * @type {number}
         */
        const MINIMAL_FREE_SPACE = 500001;

        /**
         * Create a schema cache
         *
         * @param {ValidatorRegistry} validators
         * @param {StorageCache} cache
         * @param {string} version
         * @constructor
         */
        function SchemaCache( validators, cache, version ) {
            this.cache = cache;
            this.version = version;
            this.validators = validators;

            if( this.cache.get( 'schema:meta:version' ) !== this.version ) {
                Y.log( 'Schema version mismatch clean up cache.', 'info', NAME );
                this.clear();
            }

            Y.log( 'Init cache.', 'info', NAME );
            this.cache.set( 'schema:meta:version', this.version );
        }

        /**
         * Check if the schema exist
         *
         * @param {string} name
         * @return {boolean}
         */
        SchemaCache.prototype.has = function( name ) {
            return this.cache.has( 'schema:' + name );
        };

        /**
         * Get a schema by its name or null if it was not found
         *
         * @param {string} name
         * @return {null|any}
         */
        SchemaCache.prototype.get = function( name ) {
            const validators = this.validators;

            return this.cache.get( 'schema:' + name, function( key, value ) {
                if ( value && value.type === 'Date' && value.default === 'now' ) {
                    return Object.assign( value, { default: Date.now } );
                }
                if ( key === 'validate' ) {
                    const validator = validators.getValidator( value );
                    return Y.doccirrus.validator.factory.createMultiValidator( validator, value );
                }
                if ( value instanceof Object && '0' in value ) {
                    const array = Object.keys( value ).filter(
                        function( key ) { return !isNaN(key); }
                    ).map(
                        function( key ) { return value[key]; }
                    );
                    Object.keys( value ).filter(
                        function( key ) { return isNaN(key); }
                    ).forEach(
                        function( key ) { array[key] = value[key]; }
                    );
                    return array;
                }
                return value;
            } );
        };

        /**
         * Store a schema under the given name
         *
         * @param {string} name
         * @param {any} value
         * @return {boolean} False on failure otherwise true
         */
        SchemaCache.prototype.set = function( name, value ) {
            return this.cache.set( 'schema:' + name, value, function( key, value ) {
                if ( value && ( value.type === 'Date' || value.type === Date ) && value.default === Date.now ) {
                    return Object.assign( {}, value, {
                        default: 'now'
                    } );
                }
                if ( key === 'type' && typeof value === 'function' ) {
                    return value.name;
                }
                if ( key === 'type' && typeof value === 'object' && typeof value[0] === 'function' ) {
                    return [ value[0].name ];
                }
                if ( key !== 'default' && key !== 'validate' && value instanceof Array ) {
                    return Object.assign( {}, value );
                }
                if ( key !== 'validate' ) {
                    return value;
                }
                if ( value && !value.__identifier ) {
                    throw new Error( 'Caching schema failed: Missing identifier for validator.' );
                }
                return value && value.__identifier;
            } );
        };

        /**
         * Clear the whole cache
         */
        SchemaCache.prototype.clear = function() {
            this.cache.remove( /^schema:.*/ );
        };

        /**
         * Default quota make sure that at least MINIMAL_FREE_SPACE is left in given storage
         *
         * @param {string} key
         * @param {string} value
         * @return {boolean}
         */
        SchemaCache.quota = function( key, value ) {
            var quota = true;

            try {
                localStorage.setItem( 'schema:quota:test', new Array( MINIMAL_FREE_SPACE + value.length ).join( ' ' ) );
                localStorage.removeItem( 'schema:quota:test' );
            } catch ( error ) {
                Y.log( 'Cache limit reached.', 'warn', NAME );
                quota = false;
            }

            return quota;
        };

        /**
         * Cache factory
         * @param {ValidatorRegistry} validators
         * @returns {SchemaCache}
         */
        SchemaCache.create = function( validators ) {
            // checks if the local storage is available
            try {
                localStorage.setItem( '_', '' );
                localStorage.removeItem( '_' );
            } catch( error ) {
                Y.log( 'No cache available.', 'warn', NAME );
                return;
            }

            // prevent caching issues if something goes wrong
            var version = Date.now();

            if( YUI_config.doccirrus.Env && YUI_config.doccirrus.Env.user && YUI_config.doccirrus.Env.user.systemVersion ) {
                version = YUI_config.doccirrus.Env.user.systemVersion;
            }

            const cache = new Y.doccirrus.storage.Cache( localStorage, SchemaCache.quota );

            return new SchemaCache( validators, cache, version );
        };

        Y.namespace( 'doccirrus.schema' ).Cache = SchemaCache;
    },
    '0.0.1',
    {
        requires: [
            'storage-cache',
            'validator-factory'
        ]
    }
);