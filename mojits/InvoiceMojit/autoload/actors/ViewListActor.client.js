/**
 * User: do
 * Date: 07/09/16  11:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

YUI.add( 'ViewListActor', function( Y ) {
        var each = Y.doccirrus.promiseUtils.each,
            hide = Y.doccirrus.edmputils.hide,
            show = Y.doccirrus.edmputils.show,
            define = Y.doccirrus.actors.Actor.define,
            send = Y.doccirrus.actors.Actor.send,
            create = Y.doccirrus.actors.Actor.create;

        define( 'viewList', {
            create: function( self ) {
                var node = self.options.node,
                    items = self.options.items;

                self.currentItemId = null;

                return each( items, function( item ) {
                    var childClass = item.actor,
                        itemElement = document.createElement( 'div' );

                    hide( itemElement );
                    itemElement.className = childClass;
                    item.element = itemElement;
                    node.appendChild( itemElement );

                    return create( self, item.actor, {
                        node: itemElement
                    } ).then( function( address ) {
                        item.address = address;
                    } );
                } );
            },
            /**
             * show item with provided id
             */
            show: function( self, message ) {
                var items = self.options.items,
                    data = message.data,
                    forceShow = true === data.forceShow,
                    itemIdToShow = data.itemId || null,
                    itemToShow, itemToHide;

                function hideItem() {
                    return send( {from: self, to: itemToHide.address, name: 'attemptToHide', data: data} )
                        .catch( function( err ) {
                            if( 'RejectedHideAttemptError' === err.name && true === forceShow ) {
                                return;
                            }
                            throw err;
                        } )
                        .then( function() {
                            hide( itemToHide.element );
                            return send( {from: self, to: itemToHide.address, name: 'hidden', data: data} );
                        } );
                }

                function showItem() {
                    return send( {from: self, to: itemToShow.address, name: 'attemptToShow', data: data} )
                        .then( function() {
                            show( itemToShow.element );
                            self.currentItemId = itemToShow.id;
                            return send( {from: self, to: itemToShow.address, name: 'shown', data: data} );
                        } );
                }

                if( self.currentItemId === itemIdToShow ) {
                    return;
                }

                items.forEach( function( item ) {
                    if( item.id === self.currentItemId ) {
                        itemToHide = item;
                    } else if( item.id === itemIdToShow ) {
                        itemToShow = item;
                    }
                } );

                return Promise.resolve( itemToHide && hideItem() ).then( function() {
                    if( itemToShow ) {
                        return showItem();
                    }
                } );
            },
            /**
             * show next item in stack
             */
            next: function() {


            },
            /**
             * show last item in stack
             */
            last: function() {

            },
            /**
             * push item to list
             */
            push: function() {

            }
        } );

        function RejectedHideAttemptError( message ) {
            this.name = 'RejectedHideAttemptError';
            this.message = message;
        }

        RejectedHideAttemptError.prototype = Error();

        Y.namespace( 'doccirrus.actors' ).ViewListActor = {
            errors: {
                RejectedHideAttemptError: RejectedHideAttemptError
            }
        };

    },
    '0.0.1', {requires: ['Actor']}
);

