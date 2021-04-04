/**
 * User: do
 * Date: 06/09/16  15:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'EdmpActor', function( Y ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            create = Actor.create,
            send = Actor.send,
            i18n = Y.doccirrus.i18n,
            DOCUMENTATIONS = i18n( 'InvoiceMojit.edmpMenu.DOCUMENTATIONS' ),
            UPCOMING = i18n( 'InvoiceMojit.edmpMenu.UPCOMING' ),
            DELIVERIES = i18n( 'InvoiceMojit.edmpMenu.DELIVERIES' ),
            edmpNavigationItems = [
                {
                    id: 'DOCUMENTATIONS',
                    title: DOCUMENTATIONS,
                    actor: 'edmpDocumentations'
                },
                {
                    id: 'UPCOMING',
                    title: UPCOMING,
                    actor: 'edmpUpcomingDocumentations'
                },
                {
                    id: 'DELIVERIES',
                    title: DELIVERIES,
                    actor: 'edmpDeliveries'
                }
            ];

        define( 'edmp', {
            create: function( self ) {
                var node = self.options.node,
                    navigationNode = node.querySelector( '.edmpNavigation' ),
                    edmpNavigationContentNode = node.querySelector( '.edmpNavigationContent' );

                return create( self, 'navigation', {
                    node: navigationNode,
                    items: edmpNavigationItems,
                    alias: 'edmpNavigation',
                    template: 'InvoiceMojit.navigation_menu'
                } ).then( function() {
                    return create( self, 'viewList', {
                        alias: 'edmpNavigationContent',
                        node: edmpNavigationContentNode,
                        items: edmpNavigationItems
                    } );
                } ).then( function() {
                    // edmpNavigation will set this automatically
                    return send( {
                        from: self,
                        to: self.edmpNavigationContent,
                        name: 'show',
                        data: {itemId: edmpNavigationItems[0].id}
                    } );
                } );
            },
            selectedItemChanged: function( self, message ) {
                return send( {
                    from: self,
                    to: self.edmpNavigationContent,
                    name: 'show',
                    data: message.data
                } );
            }
        } );

    },
    '0.0.1', {
        requires: [
            'Actor',
            'ViewListActor',
            'EdmpActionButtonsActor',
            'NavigationActor',
            'EdmpDocumentationsActor',
            'EdmpUpcomingDocumentationsActor',
            'EdmpDeliveriesActor'
        ]
    }
);

