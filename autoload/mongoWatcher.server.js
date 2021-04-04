/**
 * User: pi
 * Date: 02/07/15  11:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'DCMongoWatcher', function( Y, NAME ) {

        /**
         *
         * @module DCMongoWatcher
         */

        var mongoWatcher;

        /**
         * Constructor for the module class.
         *
         * @class DCMongoWatcher
         * @private
         */
        function DCMongoWatcher() {
            this._subscribedCollections = {};

        }

        DCMongoWatcher.prototype = {
            /**
             * @property _subscribedCollections
             * @type {Object}
             * @private
             @example

             collectionName: {
                id: { // specific id subscriber
                    default: callback, // default callback
                    callbackId: callback, // specific callback
                    callbackId: callback,
                    ...
                },
                common: { // collection subscriber
                    default: callback, // default callback
                    callbackId: callback, // specific callback
                    callbackId: callback,
                    ...
                }
             }
             */
            _subscribedCollections: null,
            /**
             * Sets callback for collection event
             * @method subscribeCollection
             * @param {Object} config
             * @param {String} config.collection collection name
             * @param {String} [config.id] specific id to subscribe
             * @param {String} [config.callbackId] callback id which is used to create several callbacks for same event
             * @param {Function} config.callback callback which is responsible for current event
             */
            subscribeCollection: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    subscribeId = config.id || 'common',
                    callbackId = config.callbackId || 'default',
                    callback = config.callback;
                Y.log( 'Set new subscription for ' + collection + '.' + subscribeId + '.' + callbackId, 'debug', NAME );
                if( collection ) {
                    self._subscribedCollections[collection] = self._subscribedCollections[collection] || {};
                    self._subscribedCollections[collection][subscribeId] = self._subscribedCollections[collection][subscribeId] || {};
                    self._subscribedCollections[collection][subscribeId][callbackId] = callback;
                }
            },
            /**
             * Release subscription for collection event
             * @method releaseSubscription
             * @param {Object} config
             * @param {String} config.collection collection name
             * @param {String} [config.id] specific id to subscribe
             * @param {String} [config.callbackId] callback id which is used to create several callbacks for same event
             */
            releaseSubscription: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    subscribeId = config.id || 'common',
                    callbackId = config.callbackId || 'default';
                Y.log( 'Release subscription for ' + collection + '.' + subscribeId + '.' + callbackId, 'debug', NAME );
                if( collection && self._subscribedCollections[collection] && self._subscribedCollections[collection][subscribeId] && self._subscribedCollections[collection][subscribeId][callbackId] ) {
                    delete self._subscribedCollections[collection][subscribeId][callbackId];
                    if( !Object.keys( self._subscribedCollections[collection][subscribeId] ).length ) {
                        delete self._subscribedCollections[collection][subscribeId];
                        if( !Object.keys( self._subscribedCollections[collection] ).length ) {
                            delete self._subscribedCollections[collection];
                        }
                    }
                }
            },
            /**
             * Returns function which calls all callbacks for specified collection event
             * @method getHandlersFor
             * @param {Object} config
             * @param {String} config.collection
             * @param {String} [config.id]
             * @returns {Function}
             */
            getHandlersFor: function( config ) {
                var
                    self = this,
                    collection = config.collection,
                    subscribeId = config.id || 'common',
                    callbacksList = self._subscribedCollections[collection] && self._subscribedCollections[collection][subscribeId];
                return function() {
                    var
                        args = arguments;
                    Y.Object.each( callbacksList, function( cb ) {
                        if( 'function' === typeof cb ) {
                            cb.apply( null, args );
                        }
                    } );
                };

            }

        };

        mongoWatcher = new DCMongoWatcher();

        Y.namespace( 'doccirrus' ).mongoWatcher = mongoWatcher;
    },
    '0.0.1', {requires: []}
);