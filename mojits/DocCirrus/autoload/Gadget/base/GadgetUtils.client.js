/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'GadgetUtils', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module GadgetUtils
     */
    Y.namespace( 'doccirrus.gadget.utils' );
    var
        NS = Y.doccirrus.gadget.utils;

    /**
     * Y.use promise
     * @param modules
     * @returns {Promise}
     * @for doccirrus.gadget.utils
     */
    NS.requireYuiModule = Y.doccirrus.utils.requireYuiModule;

    /**
     * Creates a Mongo ObjectId
     * @returns {String}
     * @for doccirrus.gadget.utils
     */
    NS.createObjectId = function createObjectId() {
        return (new Y.doccirrus.mongo.ObjectId()).toString();
    };

    /**
     * Make exposed Drag'n'Drop Data for public event handlers
     * @param {DD.Drag} drag
     * @param {null|DD.Drop} drop
     * @param {EventFacade} yEvent
     * @returns {{drag: DD.Drag, drop: null|DD.Drop, _event: EventFacade}}
     */
    NS.makeDragEventData = function( drag, drop, yEvent ) {
        return {
            drag: drag,
            drop: drop,
            _event: yEvent
        };
    };

    /**
     * Debounce method call
     * @param {Function} method
     * @param {Number} delay
     * @returns {Function}
     */
    NS.deBounceMethodCall = function( method, delay ) {
        var
            timeout;

        return function() {
            var
                self = this,
                args = arguments;

            function later() {
                timeout = null;
                method.apply( self, args );
            }

            clearTimeout( timeout );
            timeout = setTimeout( later, delay );
        };
    };

    /**
     * Get the inheritance chain of a class.
     * @returns {Array}
     * @for doccirrus.gadget.utils
     */
    NS.getInheritance = function( ctx ) {
        var
            superclass = ctx.superclass,
            result;

        if( ctx._CACHED_CLASS_DATA ) {
            result = ctx._CACHED_CLASS_DATA.classes;
        }
        else {
            result = [ctx];
            while( superclass ) {
                result.push( superclass.constructor );
                superclass = superclass.constructor.superclass;
            }
        }

        return result;
    };

    /**
     * Get the merged ATTRS based on inheritance chain of a class.
     * @returns {Array}
     * @for doccirrus.gadget.utils
     */
    NS.getATTRSInherited = function( ctx ) {
        var
            attrs,
            result;

        if( ctx._CACHED_CLASS_DATA ) {
            result = ctx._CACHED_CLASS_DATA.attrs;
        }
        else {
            attrs = NS.getInheritance( ctx ).map( function( item ) {
                return item.ATTRS;
            } );
            attrs.reverse();
            result = attrs.reduce( function( previousValue, currentValue ) {
                var
                    attrKey, attrProp;

                for( attrKey in currentValue ) {
                    if( currentValue.hasOwnProperty( attrKey ) ) {
                        previousValue[attrKey] = previousValue[attrKey] || {};
                        for( attrProp in currentValue[attrKey] ) {
                            if( currentValue[attrKey].hasOwnProperty( attrProp ) ) {
                                previousValue[attrKey][attrProp] = currentValue[attrKey][attrProp];
                            }
                        }
                    }
                }

                return previousValue;
            }, {} );
        }

        return result;
    };

}, '3.16.0', {
    requires: [
        'dcmongo',
        'dcutils'
    ]
} );
