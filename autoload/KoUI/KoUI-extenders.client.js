/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoUI-extenders', function( Y, NAME ) {
    'use strict';
    /**
     * @module KoUI-extenders
     */

    if( !window.ko ) {
        Y.log( 'yui: NOT loaded: ko', 'warn', NAME );
        return;
    }

    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * Takes an observable array and returns a computed of it with functionality of an observable array (emulating it).
     * Initial Items inside and in future added ones are considered component configurations that will be turned into their respectively component instances.
     * So the resulting observable array will be one of component instances, nevertheless config or instances are added.
     * @method makeKoComponent
     * @for ko.extenders
     * @param {ko.observableArray} target
     * @param {Object} [parameters]
     * @param {String} [parameters.componentType] default type
     * @return {ko.observableArray}
     */
    ko.extenders.makeKoComponent = function( target, parameters ) {
        // TODO: [MOJ-3842] KoUI: ko.extenders.makeKoComponent should apply owner & not clean the referenced configuration items
        // TODO: [MOJ-3842] if owner available at owner.addDisposable(  )
        parameters = (parameters === true ? false : parameters || {});
        var
            componentType = parameters.componentType || 'KoComponent',
            result = ko.computed( {
                read: target,
                write: function( newValue ) {
                    if( Y.Lang.isArray( newValue ) ) {
                        target( newValue.map( function( instCfg ) {
                            return KoComponentManager.createComponent( instCfg, componentType );
                        } ) );
                    } else {
                        target.removeAll();
                    }
                }
            } ),
            initialItems = target.splice( 0 );

        Y.each( [ // observableArray functions
            'remove', 'removeAll', 'destroy', 'destroyAll', 'indexOf', 'replace',
            "pop", "push", "reverse", "shift", "sort", "splice", "unshift",
            'slice'
        ], function( methodName ) {
            result[methodName] = function() {
                var isEventContext = (arguments[0] === this), // means functionality is directly bound to an event
                    args = arguments,
                    slices;
                // TODO: may have to be improved
                switch( methodName ) {
                    case 'splice':
                        if( !isEventContext ) {
                            slices = Array.prototype.slice.call( args, 2 );
                            if( slices.length ) {
                                args = Array.prototype.slice.call( args, 0, 2 ).concat( Array.prototype.slice.call( args, 2 ).map( function( arg ) {
                                    return KoComponentManager.createComponent( arg, componentType );
                                } ) );
                            }
                        }
                        break;
                    case 'remove':
                        if( isEventContext ) {
                            args = [args[0]];
                        }
                        break;
                    case 'removeAll':
                    case 'reverse':
                    case 'shift':
                    case 'pop':
                        if( isEventContext ) {
                            args = [];
                        }
                        break;
                    case 'unshift':
                    case 'push':
                        if( isEventContext ) {
                            args = [KoComponentManager.createComponent( {}, componentType )];
                        } else {
                            args = Y.Array( args ).map( function( arg ) {
                                return KoComponentManager.createComponent( arg, componentType );
                            } );
                        }
                        break;
                }
                target[methodName].apply( target, args );
            };
        } );

        target.subscribe( function( actions ) {
            Y.each( actions, function( action ) { // {satus[added,deleted],value,index}
                if( 'deleted' === action.status ) {
                    if( action.value && action.value.dispose ) {
                        if (!action.value._preventDispose) {
                            action.value.dispose();
                        }
                    } else {
                        Y.log( 'Removing none model', 'warn', NAME );
                    }
                }
            } );
        }, null, "arrayChange" );

        result( initialItems );

        return result;
    };

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager'
    ]
} );
