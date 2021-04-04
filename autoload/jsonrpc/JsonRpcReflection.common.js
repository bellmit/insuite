/*global YUI */
'use strict';
YUI.add( 'JsonRpcReflection', function( Y/*, NAME*/ ) {


    /**
     * JsonRpcReflection Module
     *
     * @example
     *      Y.doccirrus.jsonrpc.reflection.add([
     *          { namespace: 'foo', method: 'create', server: 'puc' },
     *          { namespace: 'foo', method: 'read', server: 'puc' },
     *          { namespace: 'foo', method: 'update', server: 'puc' },
     *          { namespace: 'foo', method: 'delete', server: 'puc' }
     *      ]);
     *
     * @module JsonRpc
     * @submodule JsonRpcReflection
     * @requires lazy-model-list
     * @since 3.16.0
     */

    Y.namespace( 'doccirrus.jsonrpc' );

    /**
     * LazyModelList extended for server API description.
     *
     * @class JsonRpcReflection
     * @constructor
     * @extends LazyModelList
     * @param {Object} config a configuration object
     *     @param {Array} config.items items for description
     * @private
     * @since 3.16.0
     */
    function JsonRpcReflection() {
        JsonRpcReflection.superclass.constructor.apply( this, arguments );
    }

    Y.mix( JsonRpcReflection, {
        NAME: 'JsonRpcReflection',
        ATTRS: {}
    } );
    Y.extend( JsonRpcReflection, Y.LazyModelList, {
        /** @private */
        initializer: function() {
        },
        /** @private */
        destructor: function() {
        },
        /**
         * Collection of API description items
         * @property items
         * @type {Array}
         */
        /**
         * Adds the specified model or array of models to this list. You may also pass
         * another ModelList instance, in which case all the models in that list will
         * be added to this one as well.
         *
         * @example
         *
         *      // Add a single model instance.
         *      list.add(new Model({foo: 'bar'}));
         *
         *      // Add a single model, creating a new instance automatically.
         *      list.add({foo: 'bar'});
         *
         *      // Add multiple models, creating new instances automatically.
         *      list.add([
         *          {foo: 'bar'},
         *          {baz: 'quux'}
         *      ]);
         *
         *      // Add all the models in another ModelList instance.
         *      list.add(otherList);
         *
         * @method add
         * @param {Model|ArrayOfModel|ModelList|Object|ArrayOfObject} models Model or array of
         * models to add. May be existing model instances or hashes of model
         * attributes, in which case new model instances will be created from the
         * hashes. You may also pass a ModelList instance to add all the models it
         * contains.
         * @param {Object} [options] Data to be mixed into the event facade of the
         * `add` event(s) for the added models.
         *
         * @param {Number} [options.index] Index at which to insert the added
         * models. If not specified, the models will automatically be inserted
         * in the appropriate place according to the current sort order as
         * dictated by the `comparator()` method, if any.
         * @param {Boolean} [options.silent=false] If `true`, no `add` event(s)
         * will be fired.
         *
         * @return {Model|ArrayOfModel} Added model or array of added models.
         */
        /**
         * Overrides LazyModelList#_defAddFn:method to support setting default values
         * @method _defAddFn
         * @param {EventFacade} item
         * @protected
         */
        _defAddFn: function( item ) {
            if( !item.model.server ) {
                item.model.server = 'prc';
            }
            JsonRpcReflection.superclass._defAddFn.apply( this, arguments );
        },
        /**
         * get available API description
         * @method getDescription
         * @returns {Array}
         */
        getDescription: function() {
            return Y.Array.map( this.toArray(), function( item ) {
                var shallowCopy = Y.merge( item );
                delete shallowCopy.clientId; // don't want that
                return shallowCopy;
            } );
        },
        /**
         * get API description filtered for server
         * @method getDescriptionForServer
         * @param {String} server currently 'prc', 'puc'
         * @returns {Array}
         */
        getDescriptionForServer: function( server ) {
            return Y.Array.filter( this.getDescription(), function( item ) {
                return (server === item.server);
            } );
        }
    } );

    /**
     * - server 'prc' is default, if not provided in description item
     * - see examples at {{#crossLinkModule "JsonRpcReflection"}}{{/crossLinkModule}}
     * @property reflection
     * @type {JsonRpcReflection}
     * @for doccirrus.jsonrpc
     */
    Y.doccirrus.jsonrpc.reflection = new JsonRpcReflection();

}, '3.16.0', {
    requires: [
        'oop',
        'lazy-model-list'
    ]
} );
