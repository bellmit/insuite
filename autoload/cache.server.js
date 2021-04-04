/**
 * User: mahmoud
 * Date: 19/02/15  12:01
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

/**
 * a system-wide in-memory caching mechanism
 * the cache is allocated inside workers and
 * the api just synchronises its value across workers
 */

var
    UPDATE_CACHE_MESSAGE = 'dccache_update_cache', // push the cache to workers
    GET_CACHE_MESSAGE = 'dccache_get_cache', // ask from master for its cache
    ONUPDATE = 'onUpdate';

YUI.add( 'dccache', function( Y, NAME ) {
        var
            my_cache,
            myTable = {}; // cache of caches!

        /**
         * the class
         * @constructor
         */
        function DCCache() {
        }

        /**
         * replace the local data with master's
         * @param   {*}   privateKey
         */
        function getFromMaster( privateKey ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                Y.doccirrus.ipc.send( GET_CACHE_MESSAGE, {privateKey: privateKey}, true );
            }
        }

        /**
         * return a cache table which can be kept synchronised on all workers/master.
         * initialize the cache by the given values unless it is already reinitialized by master.
         * if master already has created the cache, workers only retrieve the current value and wont reinitialize it
         *
         *  the cache must always be accessed via the returned object in order to get the expected result. e.g.
         *  var myCache = Y.doccirrus.cache.getCacheBase({myKey:myValue});
         *
         *  retrieve your cached parameter like
         *  var myValue = myCache.myKey; // changing myValue won't affect other workers
         *
         *  to reflect the change on all workers you must write the new/changed value back to myCache:
         *  myCache.myKey = myNewValue;
         *
         *  now all workers and master have the same value for myKey
         *
         * @param   {Object}    params      the set of key-value pairs to be cached
         * @param   {Function}  onUpdate    called on all processes when this process make a first level change
         * @returns {Object}                the table containing the parameters
         */
        DCCache.prototype.getCacheBase = function( params, onUpdate ) {
            Y.log( `create a cache base for params: ${JSON.stringify( params )}`, 'debug', NAME );
            function addToCache( key, initValue ) {
                var
                    privateKey = '_' + key + '_';

                // in case it's a worker, pull the data from master
                // the later calls on worker will not replace the current value set by master
                getFromMaster( privateKey );
                if( !myTable[privateKey] ) {
                    myTable[privateKey] = initValue;
                }
                if( onUpdate ) {
                    myTable[privateKey + ONUPDATE] = onUpdate;
                }

                //  if property already exists, cannot redefine, set value instead
                if ( myTable.hasOwnProperty( key ) ) {
                    myTable.key = initValue;
                    return;
                }

                // overriding default getter and setter
                Object.defineProperty( myTable, key, {
                    get: function() {
                        //                        console.log( 'getter called on ' + Y.doccirrus.ipc.whoAmI() + ': ', Object.keys( this ), ' = ', JSON.stringify( this ) );
                        return this[privateKey];
                    },
                    set: function( value ) {
                        //                        console.log( 'setter called on ' + Y.doccirrus.ipc.whoAmI() + ': ', arguments, Object.keys( this ) );
                        this[privateKey] = value;
                        try {
                            Y.doccirrus.ipc.send( UPDATE_CACHE_MESSAGE, {privateKey: privateKey, value: value}, true );
                        } catch ( ipcErr ) {
                            Y.log( `Cannot send IPC ${UPDATE_CACHE_MESSAGE}: ${ipcErr.stack||ipcErr}`, 'error', NAME );
                        }
                    }
                } );
            }

            let field;
            for( field in params ) {
                if( params.hasOwnProperty( field ) ) {
                    addToCache( field, params[field] );
                }
            }

            return myTable;
        };

        my_cache = new DCCache();

        Y.doccirrus.ipc.subscribeNamed( UPDATE_CACHE_MESSAGE, NAME, true, function( data ) {
            myTable[data.privateKey] = data.value;
            if( myTable[data.privateKey + ONUPDATE] ) {
                myTable[data.privateKey + ONUPDATE]();
            }
            //            console.warn( 'cache message received on ', Y.doccirrus.ipc.whoAmI(), '(after set), myTable[options]:', JSON.stringify( myTable['options'] ), data.value );
        } );

        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( GET_CACHE_MESSAGE, NAME, true, function( data ) {
                //  broadcast to all workers
                Y.doccirrus.ipc.send( UPDATE_CACHE_MESSAGE, {privateKey: data.privateKey, value: myTable[data.privateKey]}, true, false );
            } );
        }

        Y.namespace( 'doccirrus' ).cache = my_cache;
    },
    '0.0.1', {requires: [ 'dcipc']}
);