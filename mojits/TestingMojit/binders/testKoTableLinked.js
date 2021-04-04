/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'testKoTableLinked-binder-index', function( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            console.warn( NAME, {
                arguments: arguments,
                this: this,
                Y: Y
            } );

        },

        bind: function( node ) {
            this.node = node;

            var
                aKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        fillRowsToLimit: true,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.getCaseFile,
                        limit: 5,
                        columns: [
                            {
                                componentType: 'KoTableColumnLinked',
                                forPropertyName: 'linked',
                                label: ''
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: 'Datum',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0
                            },
                            {
                                forPropertyName: 'actType',
                                label: 'Typ',
                                isSortable: true
                            }
                        ]
                    }
                } ),
                aKoButtonLinkFirst = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'aKoButtonLinkFirst',
                        text: 'Link First',
                        size: 'SMALL',
                        click: function() {
                            var
                                data = aKoTable.data();

                            aKoTable.getComponentColumnLinked().addLink( data[0]._id );
                        }
                    }
                } ),
                aKoButtonUnlinkFirst = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'aKoButtonUnlinkFirst',
                        text: 'UnLink First',
                        size: 'SMALL',
                        click: function() {
                            var
                                data = aKoTable.data();

                            aKoTable.getComponentColumnLinked().removeLink( data[0]._id );
                        }
                    }
                } ),
                applyBindings = {
                    aKoTable: aKoTable,
                    aKoButtonLinkFirst: aKoButtonLinkFirst,
                    aKoButtonUnlinkFirst: aKoButtonUnlinkFirst,
                    checked: ko.computed( function() {
                        return JSON.stringify( ko.toJS( aKoTable.getComponentColumnLinked().linked ), null, 2 );
                    } )
                };

            console.warn( '[testKoTableLinked.js] applyBindings :', applyBindings );

            ko.applyBindings( applyBindings, node.getDOMNode() );

        }

    };
}, '3.16.0', {
    requires: [
        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'dcutils-uam',

        'KoUI-all'
    ]
} );
