/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko*/

YUI.add( 'chooseaddressee-modal', function( Y/*, NAME */ ) {

        function show( data, callback ) {

            function getSddaCatalogFilename() {
                return Y.doccirrus.catalogmap.getCatalogSDDA().filename;
            }

            var node = Y.Node.create( '<div></div>' ),
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                i18n = Y.doccirrus.i18n,
                ORGANIZATIONID = i18n( 'catalog-schema.SDDA_T.orgianizationId' ),
                ORGANIZATIONNAME = i18n( 'catalog-schema.SDDA_T.orgianizationName' ),
                KV = 'KV',
                PROGRAMS = i18n( 'catalog-schema.SDDA_T.constraints' ),
                KVCONNECT_ADDRESS = i18n( 'catalog-schema.SDDA_T.kv_connect' ),
                NavigationMenuVM = Y.doccirrus.edmp.models.NavigationMenuVM,
                filename = getSddaCatalogFilename(),
                sddaDmpTypeToActType = Y.doccirrus.edmpcommonutils.sddaDmpTypeToActType,
                nav = NavigationMenuVM( {
                    items: [
                        {
                            id: 'RECOMMENDATION',
                            title: 'Vorschläge'
                        },
                        {
                            id: 'CATALOG',
                            title: 'SDDA'
                        },
                        {
                            id: 'CATALOGUSAGE',
                            title: 'SDDA Erweiterung'
                        }
                    ]
                } ),

                // TODOOO remove filters and so on from bottom of table?
                // set the addressee data, how?
                // enable save button on selecetion
                // uopdate?

                addresseeTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-extSddaTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        renderFooter: false,
                        data: data,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false
                            },
                            {
                                forPropertyName: 'orgianizationId',
                                label: ORGANIZATIONID,
                                title: ORGANIZATIONID,
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            },
                            {
                                forPropertyName: 'orgianizationName',
                                label: ORGANIZATIONNAME,
                                title: ORGANIZATIONNAME,
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            },
                            {
                                forPropertyName: 'kv',
                                label: KV,
                                title: KV,
                                width: '75px',
                                sortInitialIndex: 0,
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            },
                            {
                                forPropertyName: 'kv_connect',
                                label: KVCONNECT_ADDRESS,
                                title: KVCONNECT_ADDRESS,
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            }
                        ]
                    }
                } ),

                sddaTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-sddaTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.catalog.read,
                        baseParams: {
                            query: {
                                catalog: filename,
                                kv_connect: {$ne: null}
                            }
                        },
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false
                            },
                            {
                                forPropertyName: 'orgianizationId',
                                label: ORGANIZATIONID,
                                title: ORGANIZATIONID,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'orgianizationName',
                                label: ORGANIZATIONNAME,
                                title: ORGANIZATIONNAME,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'kv',
                                label: KV,
                                title: KV,
                                width: '75px',
                                sortInitialIndex: 0,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'constraints',
                                label: PROGRAMS,
                                title: PROGRAMS,
                                renderer: function( meta ) {
                                    var types = [];

                                    (Array.isArray( meta.value ) ? meta.value : []).forEach( function( entry ) {
                                        types.push( sddaDmpTypeToActType( entry.dmpType ) );
                                    } );
                                    return types.join( ', ' );
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'kv_connect',
                                label: KVCONNECT_ADDRESS,
                                title: KVCONNECT_ADDRESS,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            }
                        ]
                    }
                } ),

                extSddaTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-extSddaTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.catalogusage.read,
                        baseParams: {
                            query: {
                                catalogShort: 'SDDA'
                            }
                        },
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false
                            },
                            {
                                forPropertyName: 'orgianizationId',
                                label: ORGANIZATIONID,
                                title: ORGANIZATIONID,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'orgianizationName',
                                label: ORGANIZATIONNAME,
                                title: ORGANIZATIONNAME,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'kv',
                                label: KV,
                                title: KV,
                                width: '75px',
                                sortInitialIndex: 0,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'kv_connect',
                                label: KVCONNECT_ADDRESS,
                                title: KVCONNECT_ADDRESS,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            }
                        ]
                    }
                } ),
                addresseeTableComponentColumnCheckbox = addresseeTable.getComponentColumnCheckbox(),
                sddaTableComponentColumnCheckbox = sddaTable.getComponentColumnCheckbox(),
                extSddaTableComponentColumnCheckbox = extSddaTable.getComponentColumnCheckbox(),
                currentAddressee = null;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'chooseaddressee-modal',
                'InvoiceMojit',
                {},
                node,
                function() {

                    var dcWindow = Y.doccirrus.DCWindow.notice( {
                        title: 'Empfänger auswählen',
                        type: 'info',
                        window: {
                            width: 'xlarge',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function( e ) {
                                            dcWindow.close( e );
                                            callback();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function( e ) {
                                            dcWindow.close( e );
                                            callback( currentAddressee );
                                        }
                                    } )
                                ]
                            }
                        },
                        message: node
                    } );

                    ko.computed( function() {
                        var recommendedChecked = addresseeTableComponentColumnCheckbox.checked(),
                            sddaTableChecked = sddaTableComponentColumnCheckbox.checked(),
                            extSddaTableChecked = extSddaTableComponentColumnCheckbox.checked(),
                            tab = nav.selectedId(),
                            isChecked = false;

                        switch( tab ) {
                            case 'RECOMMENDATION':
                                isChecked = Boolean( recommendedChecked.length );
                                currentAddressee = recommendedChecked[0] ? {
                                    from: 'RECOMMENDATION',
                                    addressee: recommendedChecked[0]
                                } : null;
                                break;
                            case 'CATALOG':
                                isChecked = Boolean( sddaTableChecked.length );
                                currentAddressee = sddaTableChecked[0] ? {
                                    from: 'CATALOG',
                                    addressee: sddaTableChecked[0]
                                } : null;
                                break;
                            case 'CATALOGUSAGE':
                                isChecked = Boolean( extSddaTableChecked.length );
                                currentAddressee = extSddaTableChecked[0] ? {
                                    from: 'CATALOGUSAGE',
                                    addressee: extSddaTableChecked[0]
                                } : null;
                                break;
                        }
                        if( isChecked ) {
                            dcWindow.getButton( 'OK' ).button.enable();
                        } else {
                            dcWindow.getButton( 'OK' ).button.disable();
                        }
                    } );

                    ko.applyBindings( {
                        nav: nav,
                        addresseeTable: addresseeTable,
                        sddaTable: sddaTable,
                        extSddaTable: extSddaTable
                    }, node.one( '#edmpChooseAddresseeModal' ).getDOMNode() );
                }
            );

        }

        Y.namespace( 'doccirrus.modals' ).edmpChooseAddresseeModal = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'NavigationMenuVM'
        ]
    }
);
