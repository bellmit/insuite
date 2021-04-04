/**
 * User: do
 * Date: 08/09/16  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'ActionButtonsVM', function( Y ) {

        function mapButtonDefinition( buttons ) {
            return buttons.map( function( button ) {
                return {
                    title: ko.observable( button.title ),
                    action: ko.observable( button.action ),
                    enable: ko.observable( button.enable ),
                    visible: ko.observable( button.visible )
                };
            } );
        }

        function findButtonByAction( buttons, action ) {
            var result;
            buttons.some( function( button ) {
                var bAction = button.action.peek();
                if( bAction === action ) {
                    result = button;
                    return true;
                }
            } );
            return result;
        }

        function setState( button, state ) {
            Object.keys( state ).forEach( function( attrName ) {
                if( button[attrName] && ko.isWriteableObservable( button[attrName] ) ) {
                    button[attrName]( state[attrName] );
                }
            } );
        }

        function ActionButtonsVM( config ) {
            var buttons = mapButtonDefinition( config.buttons ),
                onAction = function( button ) {
                    var b = ko.toJS( button );
                    config.onAction( b.action, b );
                },
                setStates = function( buttonStates ) {
                    Object.keys( buttonStates ).forEach( function( action ) {
                        var state = buttonStates[action],
                            button = findButtonByAction( buttons, action );
                        setState( button, state );
                    } );
                };

            return {
                buttons: buttons,
                onAction: onAction,
                setStates: setStates
            };
        }

        Y.namespace( 'doccirrus.edmp.models' ).ActionButtonsVM = ActionButtonsVM;
    },
    '0.0.1', {requires: []}
);

