/**
 * User: do
 * Date: 06/09/16  15:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

YUI.add( 'EdmpDeliveriesActor', function( Y, NAME ) {
        var Actor = Y.doccirrus.actors.Actor,
            i18n = Y.doccirrus.i18n,
            define = Actor.define,
            create = Actor.create,
            send = Actor.send,
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode,
            edmpDeliveriesItems = [
                {
                    id: 'DELIVERIES_TABLE',
                    actor: 'edmpDeliveriesTable'
                },
                {
                    id: 'DELIVERY_DETAIL',
                    actor: 'edmpDeliveriesDetail'
                }
            ],
            buttons = [
                {
                    action: 'backToOverview',
                    title: 'Zurück',
                    enable: false,
                    visible: false
                },
                {
                    action: 'createDelivery',
                    title: i18n( 'InvoiceMojit.gkv_delivery_settings.button.CREATE' ),
                    enable: true,
                    visible: true
                },
                {
                    action: 'packDelivery',
                    title: 'Verpacken',
                    enable: false,
                    visible: false
                },
                {
                    action: 'sendDelivery',
                    title: 'Manuell versenden',
                    enable: false,
                    visible: false
                },
                {
                    action: 'removeSelectedDocs',
                    title: 'Dokumentation entfernen',
                    enable: false,
                    visible: false
                },
                {
                    action: 'correctSelectedDocs',
                    title: 'Dokumentation korrigieren',
                    enable: false,
                    visible: false
                },
                // {
                //     action: 'saveDelivery',
                //     title: 'Speichern',
                //     enable: false,
                //     visible: false
                // },
                {
                    action: 'removeDelivery',
                    title: 'Löschen',
                    enable: false,
                    visible: false
                },
                {
                    action: 'archiveDelivery',
                    title: 'Archivieren',
                    enable: false,
                    visible: false
                }

            ];

        define( 'edmpDeliveries', {
            create: function( self ) {
                var node = self.options.node;
                self.edmpDeliveriesItems = edmpDeliveriesItems;

                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.edmp_deliveries'
                } ).then( function() {

                    self.edmpDeliveriesContentNode = node.querySelector( '.edmpDeliveriesContent' );
                    self.actionButtonsNode = node.querySelector( '.edmpActionButtons' );
                    self.checkedDocs = [];

                    return create( self, 'edmpActionButtons', {
                        node: self.actionButtonsNode,
                        alias: 'edmpActionButtons',
                        buttons: buttons
                    } ).then( function() {
                        return create( self, 'viewList', {
                            node: self.edmpDeliveriesContentNode,
                            alias: 'edmpDeliveriesContent',
                            items: edmpDeliveriesItems,
                            passUnknownMessagesToParent: true
                        } ).then( function() {
                            return send( {
                                from: self,
                                to: self.edmpDeliveriesContent,
                                name: 'show',
                                data: {itemId: edmpDeliveriesItems[0].id}
                            } );

                        } );
                    } );

                } );

            },
            createDelivery: function( self ) {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.createDeliveries() ).then( function() {
                    var
                        tableItem = edmpDeliveriesItems[0],
                        tableAddress = tableItem.address;

                    return send( {
                        from: self,
                        to: tableAddress,
                        name: 'reload'
                    } );
                } ).catch( function( err ) {
                    Y.log( 'could not create delivreries: ' + err, 'error', NAME );
                } );
            },
            //saveDelivery: Actor.forwardTo( {path: 'edmpDeliveriesItems.1.address'} ),
            removeDelivery: Actor.forwardTo( {path: 'edmpDeliveriesItems.1.address'} ),
            packDelivery: Actor.forwardTo( {path: 'edmpDeliveriesItems.1.address'} ),
            sendDelivery: Actor.forwardTo( {path: 'edmpDeliveriesItems.1.address'} ),
            archiveDelivery: Actor.forwardTo( {path: 'edmpDeliveriesItems.1.address'} ),
            deliverySelected: function( self, message ) {

                var data = message && message.data,
                    detailItem = edmpDeliveriesItems[1],
                    detailId = detailItem.id,
                    detailAddress = detailItem.address,
                    currentDeliveryStatus = data && data.edmpDeliveryStatus;
                self.delivery = data;
                return send( {
                    from: self,
                    to: self.edmpDeliveriesContent,
                    name: 'show',
                    data: {itemId: detailId}
                } ).then( function() {
                    return Promise.all( [
                        send( {
                            from: self,
                            to: detailAddress,
                            name: data ? 'editDelivery' : 'unsetDelivery',
                            data: data || null
                        } ),
                        send( {
                            from: self,
                            to: self.edmpActionButtons,
                            name: 'changeButtonStates',
                            data: {
                                backToOverview: {visible: true, enable: true},
                                //saveDelivery: {visible: true, enable: false},
                                removeDelivery: {
                                    visible: true,
                                    enable: -1 === ['SENT', 'ARCHIVED'].indexOf( currentDeliveryStatus )
                                },
                                removeSelectedDocs: {visible: true, enable: false},
                                correctSelectedDocs: {visible: true, enable: false},
                                createDelivery: {visible: false, enable: false},
                                sendDelivery: {
                                    visible: true,
                                    enable: 'PACKED' === currentDeliveryStatus
                                },
                                packDelivery: {
                                    visible: true,
                                    enable: ('OPEN' === currentDeliveryStatus || 'PACK_ERR' === currentDeliveryStatus)
                                },
                                archiveDelivery: {
                                    visible: true,
                                    enable: 'SENT' === currentDeliveryStatus
                                }
                            }
                        } )] );
                } );

            },
            documentsChecked: function( self, message ) {
                var currentDeliveryStatus = self.delivery && self.delivery.edmpDeliveryStatus,
                    data = message.data,
                    checked = data && data.checked,
                    checkedIsQDocu = checked.some(function(item){
                            return item.actType === 'QDOCU';
                    }),
                    enableCorrect = checked && ((0 === checked.length ) ? false : true) && 'SENT' === currentDeliveryStatus,
                    enableRemove = checked && ((0 === checked.length ) ? false : true) && ('OPEN' === currentDeliveryStatus || ('PACK_ERR' === currentDeliveryStatus && checkedIsQDocu));
                
                if( !checked ) {
                    return;
                }
                self.checkedDocs = checked;
                return send( {
                    from: self,
                    to: self.edmpActionButtons,
                    name: 'changeButtonStates',
                    data: {
                        removeSelectedDocs: {visible: true, enable: enableRemove},
                        correctSelectedDocs: {visible: true, enable: enableCorrect}
                    }
                } );

            },
            removeSelectedDocs: function( self ) {

                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.removeDocsFromDelivery( {
                    deliveryId: self.delivery && self.delivery._id,
                    docIds: self.checkedDocs.map( function( doc ) {
                        return doc._id;
                    } )
                } ) ).then( function() {
                    var detailItem = edmpDeliveriesItems[1],
                        detailAddress = detailItem.address,
                        tableItem = edmpDeliveriesItems[0],
                        tableAddress = tableItem.address;

                    return Promise.all( [
                        send( {
                            from: self,
                            to: tableAddress,
                            name: 'reload'
                        } ),
                        send( {
                            from: self,
                            to: detailAddress,
                            name: 'reloadTable'
                        } )] );
                } ).catch( function( err ) {
                    Y.log( 'could not remove selected docs from delivery: ' + err, 'error', NAME );
                } );

            },
            correctSelectedDocs: function( self ) {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.correctDocsFromDelivery( {
                    deliveryId: self.delivery && self.delivery._id,
                    docIds: self.checkedDocs.map( function( doc ) {
                        return doc._id;
                    } )
                } ) ).then( function() {
                    var detailItem = edmpDeliveriesItems[1],
                        detailAddress = detailItem.address,
                        tableItem = edmpDeliveriesItems[0],
                        tableAddress = tableItem.address;

                    return Promise.all( [
                        send( {
                            from: self,
                            to: tableAddress,
                            name: 'reload'
                        } ),
                        send( {
                            from: self,
                            to: detailAddress,
                            name: 'reloadTable'
                        } )] );
                } ).catch( function( err ) {
                    Y.log( 'could not correct selected docs from delivery: ' + err, 'error', NAME );
                } );

            },
            validStateChange: function( /* self, message */ ) {
                // var isValid = message.data && message.data.isValid;
                // return send( {
                //     from: self,
                //     to: self.edmpActionButtons,
                //     name: 'changeButtonStates',
                //     data: {
                //         saveDelivery: {visible: true, enable: isValid}
                //     }
                // } );
            },
            backToOverview: function( self ) {
                var data = {itemId: 'DELIVERIES_TABLE'};

                function changeView() {
                    return send( {
                        from: self,
                        to: self.edmpDeliveriesContent,
                        name: 'show',
                        data: data
                    } ).then( function() {
                        var
                            tableItem = edmpDeliveriesItems[0],
                            tableAddress = tableItem.address;

                        return send( {
                            from: self,
                            to: tableAddress,
                            name: 'reload'
                        } );
                    } ).then( function() {
                        return send( {
                            from: self,
                            to: self.edmpActionButtons,
                            name: 'changeButtonStates',
                            data: {
                                backToOverview: {visible: false, enable: false},
                                //saveDelivery: {visible: false, enable: false},
                                removeDelivery: {visible: false, enable: false},
                                removeSelectedDocs: {visible: false, enable: false},
                                createDelivery: {visible: true, enable: true},
                                sendDelivery: {visible: false, enable: false},
                                packDelivery: {visible: false, enable: false},
                                archiveDelivery: {visible: false, enable: false}
                            }
                        } );
                    } );
                }

                return changeView().catch( function( err ) {
                    var modal;

                    if( 'RejectedHideAttemptError' === err.name ) {
                        modal = Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            window: {
                                width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                buttons: {
                                    header: ['close'],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'DISCARD', {
                                            isDefault: true,
                                            action: function() {
                                                data.forceShow = true;
                                                modal.close();
                                                changeView();
                                            }
                                        } )
                                    ]
                                }
                            },
                            message: i18n( 'general.message.CHANGES_NOT_SAVED' )
                        } );

                    } else {
                        throw err;
                    }
                } );

            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'edmp-utils', 'EdmpDeliveriesTableActor', 'EdmpDeliveriesDetailActor', 'edmp-commonutils']}
);

