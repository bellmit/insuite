/**
 * User: do
 * Date: 06/09/16  15:43
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'EdmpDeliveriesDetailActor', function( Y, NAME ) {
        var Actor = Y.doccirrus.actors.Actor,
            define = Actor.define,
            send = Actor.send,
            // RejectedHideAttemptError = Y.doccirrus.actors.ViewListActor.errors.RejectedHideAttemptError,
            EdmpDeliveriesDetailVM = Y.doccirrus.edmp.models.EdmpDeliveriesDetailVM,
            KoViewModel = Y.doccirrus.KoViewModel,
            EdmpDeliveryModel = KoViewModel.getConstructor( 'EdmpDeliveryModel' ),
            loadTemplateIntoNode = Y.doccirrus.edmputils.loadTemplateIntoNode;

        function getEmployees( locationId ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.employee.read( {
                query: {
                    type: 'PHYSICIAN',
                    status: 'ACTIVE',
                    'locations._id': {$in: locationId}
                }
            } ) ).then( function( response ) {
                return response && response.data || [];
            }).catch( function( err ) {
                Y.log( 'could not get employees for edmp delivery ' + err, 'warn', NAME );
                return [];
            } );
        }

        function unset( edmpDeliveryDetail ) {
            var current = edmpDeliveryDetail.currentModel.peek();
            if( current ) {
                current.dispose();
            }
            edmpDeliveryDetail.currentModel( null );
        }

        define( 'edmpDeliveriesDetail', {
            create: function( self ) {
                var node = self.options.node;

                function onAction( valid ) {
                    send( {
                        from: self,
                        to: self.parent,
                        name: 'validStateChange',
                        data: {isValid: valid}
                    } );
                }

                function onChecked( checked ) {
                    send( {
                        from: self,
                        to: self.parent,
                        name: 'documentsChecked',
                        data: {checked: checked}
                    } );
                }

                return loadTemplateIntoNode( {
                    node: node,
                    template: 'InvoiceMojit.edmp_delivery_editor'
                } ).then( function() {
                    self.edmpDeliveryDetail = EdmpDeliveriesDetailVM( {onAction: onAction, onChecked: onChecked} );
                    ko.applyBindings( self.edmpDeliveryDetail, node );
                } );
            },
            editDelivery: function( self, message ) {
                var locationId = message.data && message.data.locationId;
                unset( self.edmpDeliveryDetail );
                return getEmployees( locationId ).then( function( employees ) {
                    self.edmpDeliveryDetail.currentModel( new EdmpDeliveryModel( {
                        data: message.data,
                        employees: employees
                    } ) );
                } );
            },
            unsetDelivery: function( self ) {
                unset( self.edmpDeliveryDetail );
            },
            saveDelivery: function( self ) { // TODOOO remove
                var currentEdmpDeliveryModel = self.edmpDeliveryDetail.currentModel(),
                    data, deliveryId, method;
                if( currentEdmpDeliveryModel ) {
                    if( !currentEdmpDeliveryModel._isValid() ) {
                        throw Error( 'Delivery is not valid!' );
                    }
                    data = currentEdmpDeliveryModel.toJSON();
                    deliveryId = data._id;
                    delete data._id;

                    method = deliveryId ? 'update' : 'create';
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery[method]( {
                        query: 'update' === method ? {_id: data._id} : undefined,
                        fields: 'update' === method ? Object.keys( data ) : undefined,
                        data: data
                    } ) ).then( function() {
                        return send( {from: self, to: self.parent, name: 'backToOverview'} );
                    } ).catch( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    } );

                }
            },
            removeDelivery: function( self ) {
                var currentEdmpDeliveryModel = self.edmpDeliveryDetail.currentModel();
                if( !currentEdmpDeliveryModel || !currentEdmpDeliveryModel._id ) {
                    return;
                }
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.delete( {
                    query: {_id: currentEdmpDeliveryModel._id.peek()}
                } ) ).then( function() {
                    return send( {from: self, to: self.parent, name: 'backToOverview'} );
                } ).catch( function( err ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );
            },
            // attemptToHide: function( self ) {
            //     var currentEdmpDeliveryModel = self.edmpDeliveryDetail.currentModel();
            //     if( currentEdmpDeliveryModel && currentEdmpDeliveryModel.isModified() ) {
            //         throw new RejectedHideAttemptError( 'delivery is modified' );
            //     }
            // },
            reloadTable: function( self ) {
                self.edmpDeliveryDetail.reloadTable();
            },
            packDelivery: function( self ) {
                var deliveryId,
                    currentModel = self.edmpDeliveryDetail.currentModel(),
                    isQDocu = currentModel.addresseeIk.peek() === "QDOCU" ? true : false;
                if( !currentModel ) {
                    return;
                }
                deliveryId = currentModel._id.peek();
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.packDelivery( {
                    deliveryId: deliveryId,
                    isQDocu: isQDocu
                } ) ).then( function() {
                    return send( {from: self, to: self.parent, name: 'backToOverview'} );
                } ).catch( function( err ) {
                    Y.log( 'could not pack delivery ' + (err && err.stack || err), 'error' );
                } );
            },
            sendDelivery: function( self ) {
                var deliveryId,
                    currentModel = self.edmpDeliveryDetail.currentModel();
                if( !currentModel ) {
                    return;
                }
                deliveryId = currentModel._id.peek();
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.sendDelivery( {
                    deliveryId: deliveryId
                } ) ).then( function() {
                    return send( {from: self, to: self.parent, name: 'backToOverview'} );
                } ).catch( function( err ) {
                    Y.log( 'could not send delivery ' + (err && err.stack || err), 'error' );
                } );
            },
            archiveDelivery: function( self ) {
                var deliveryId,
                    currentModel = self.edmpDeliveryDetail.currentModel();
                if( !currentModel ) {
                    return;
                }
                deliveryId = currentModel._id.peek();
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edmpdelivery.archiveDelivery( {
                    deliveryId: deliveryId
                } ) ).then( function() {
                    return send( {from: self, to: self.parent, name: 'backToOverview'} );
                } ).catch( function( err ) {
                    Y.log( 'could not archive delivery ' + (err && err.stack || err), 'error' );
                } );
            }
        } );

    },
    '0.0.1', {requires: ['Actor', 'edmp-utils', 'EdmpDeliveryModel', 'ViewListActor', 'EdmpDeliveriesDetailVM', 'dcerrortable']}
);

