/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0 strict:0 */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'InvoiceModel', function( Y , NAME ) {
        /**
         * @module InvoiceModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' ),
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n;

        /**
         * @class InvoiceModel
         * @constructor
         * @extends FormBasedActivityModel
         * @param   {Object}    config
         */
        function InvoiceModel( config ) {
            InvoiceModel.superclass.constructor.call( this, config );
        }

        InvoiceModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InvoiceModel, FormBasedActivityModel, {

                initializer: function InvoiceModel_initializer() {
                    var
                        self = this,
                        _id = unwrap( self._id ),
                        onHoldQuery = {
                            caseFolderId: ko.unwrap( self.caseFolderId ),
                            actType: {
                                $in: ['TREATMENT', 'MEDICATION']
                            }
                        };

                    if( _id ) {
                        onHoldQuery.referencedBy = {
                            $not: {
                                $elemMatch: {$eq: _id.toString()}
                            }
                        };
                    }

                    Y.doccirrus.jsonrpc.api.activity.getOnHoldActivities( {
                        query: onHoldQuery
                    } ).done( function( result ) {
                        var activities = result.data || [];
                        self.onHoldActivities = activities.map( function( a ) {
                            return a._id;
                        } );
                        self.unlinkOnHoldActivities();
                    } ).always( function() {
                        self.initInvoiceModel();
                    } );
                },

                destructor: function InvoiceModel_destructor() {
                    Y.doccirrus.communication.off( 'UPDATE_INVOICE', 'invoiceModel' );
                },

                initInvoiceModel: function InvoiceModel_initInvoiceModel() {
                    var self = this,
                        caseFolderType = self.get( 'caseFolder' ).type,
                        lastSchein = unwrap( self.get( 'lastScheinObservable' ) ) || {};

                    if( caseFolderType === "PRIVATE_CH_UVG" && lastSchein && !lastSchein.caseNumber ) {
                        self.blockApprove( true );
                        self.scheinId( lastSchein._id );
                        self.setNotModified();
                    }

                    if( self.isNew() ) {
                        Y.log( 'Initializing continuousIds from last Schein', 'debug', NAME );
                        self.initContinuousIcds();
                    }

                    self.addDisposable( ko.computed( function() {
                        var status = self.status(),
                            linkedActivities = self._activitiesObj(),
                            lastSchein = unwrap( self.get( 'lastScheinObservable' ) ) || {};

                        if( -1 === ['CREATED', 'VALID'].indexOf( status ) ) {
                            return;
                        }

                        Y.doccirrus.invoiceutils.calcInvoice( self, lastSchein, linkedActivities );
                    } ) );

                    Y.doccirrus.communication.on( {
                        event: 'UPDATE_INVOICE',
                        handlerId: 'invoiceModel',
                        done: function success( data ) {
                            var
                                value = data.data && data.data[0],
                                id = value && value.id,
                                blockApprove = value && value.blockApprove,
                                isModified = self.isModified();

                            if( id === self._id() && "PRIVATE_CH_UVG" === caseFolderType ) {
                                self.blockApprove( blockApprove );
                                if( !isModified ) {
                                    self.setNotModified();
                                }
                            }
                        }
                    } );
                },

                /**
                 *  When an activity is created on client, link continuousIcds from schein, MOJ-10591
                 */

                initContinuousIcds: function InvoiceModel_initContinuousIcds() {
                    var
                        self = this,
                        scheinQuery = {
                            caseFolderId: ko.unwrap( self.caseFolderId ),
                            patientId: ko.unwrap( self.patientId ),
                            locationId: ko.unwrap( self.locationId ),
                            timestamp: moment().toISOString()
                        };

                    Y.doccirrus.jsonrpc.api.patient.lastSchein( { query: scheinQuery } )
                        .then( onScheinLookup )
                        .fail( onScheinErr );

                    function onScheinLookup( response ) {
                        var lastSchein = response && response.data && response.data[ 0 ];

                        if ( !lastSchein ) {
                            //  can happen that there is no schein, not an error
                            Y.log( 'Invoice does not have an associated schein.', 'warn', NAME );
                            return;
                        }

                        Y.log( 'Set continuousIcds form schein: ' + JSON.stringify( lastSchein.continuousIcds ), 'debug', NAME );
                        self.continuousIcds( lastSchein.continuousIcds );

                        if ( self.ensureLoaded && self._continuousIcdsObj ) {
                            self.ensureLoaded( self.continuousIcds(), self._continuousIcdsObj, 'continuousIcdsObj' );
                        } else {
                            //  should not happen
                            Y.log( 'Load order error, linked activities API not available.', 'warn', NAME );
                        }
                    }

                    function onScheinErr( err ) {
                        Y.log( 'Could not look up schein for new invoice: ' + JSON.stringify( err ), 'warn', NAME );
                    }

                },

                /**
                 *  Raised when linked activity is checked in the table
                 */

                onActivityLinked: function( activity ) {
                    var self = this;

                    if ( 'TREATMENT' === activity.actType ) {
                        if ( 'VALID' !== activity.status && 'APPROVED' !== activity.status ) {
                            //  MOJ-7843: When adding treatments to invoices, check that the treatment is VALID or APPROVED
                            return false;
                        }
                        if ( activity.areTreatmentDiagnosesBillable && '0' === activity.areTreatmentDiagnosesBillable ) {
                            //  TREATMENT marked not billable, don't add it to bill
                            return false;
                        }

                        if( Array.isArray( self.onHoldActivities ) && self.onHoldActivities.includes( activity._id ) ) {
                            return false;
                        }
                    }

                    if ( 'DIAGNOSIS' === activity.actType ) {
                        if ( activity.diagnosisTreatmentRelevance && 'DOKUMENTATIV' === activity.diagnosisTreatmentRelevance ) {
                            //  DIAGNOSIS marked documentative only, not relevant to billable treatment, block link
                            return false;
                        }
                    }

                    if( ('MEDICATION' === activity.actType && 'DISPENSED' !== activity.status) || Array.isArray(self.onHoldActivities) && self.onHoldActivities.includes(activity._id) ) {
                        return false;
                    }

                    //  Receipts/creditnotes/etc on invoices are unusual in that they can be linked after an invoice is
                    //  approved, via a special API call to update the invoice balance and receipt activity on the server.
                    if ( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) ) {
                        return self._isEditable();
                    }

                    //  Only billing related activities from this point

                    if ( !self._isEditable() ) {
                        //  is activity has been approved, then block the synchronous linking action, and call the async
                        //  update of receipt and invoice on server (will update client when done)
                        self.updateReceiptsAfterApproval( unwrap( self._id ) + '', activity._id );
                        return false;
                    }

                    if ( activity.referencedBy && activity.referencedBy[0] ) {

                        if  ( activity.referencedBy[0] === unwrap( self._id ) ) {
                            //  If receipt is already assigned to this invoice then take no action
                            Y.log( 'Receipt ' + activity.activities[0] + ' already assigned to this invoice.', 'warn', NAME );
                            return true;
                        }

                        //  If receipt is already assigned to a different invoice then show a warning and block the link

                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n( 'activityModel_clientJS.message.RECEIPT_IS_ASSIGNED' ) + '<br/>' + activity.invoiceText,
                            window: {
                                width: 'medium'
                            }
                        } );
                        return false;
                    }

                    //  remove invoice from this receipt
                    //  receipt is not assigned to an invoice, continue claiming it for this one
                    return true;
                },

                /**
                 *  Raised when linked activity is unchecked in the table
                 *  @param activityId
                 */

                onActivityUnlinked: function( activityId ) {

                    var
                        self = this,
                        receiptIds = unwrap( self.receipts || [] );

                    if ( self._isEditable() ) {
                        //  if activity is editable then there is currently no reason to block unlink of activity
                        return true;
                    }

                    //  RECEIPTS can be attached/removed to invoices after approval
                    //  also: WARNING1, WARNING2, CREDITNOTE, REMINDER, BADDEBT - see EXTMOJ-2034

                    if ( -1 === receiptIds.indexOf( activityId ) ) {
                        //  if the activity is not a linked receipt, block
                        Y.log( 'Receipt not found to unlink: ' + activityId, 'warn', NAME );
                        return false;
                    }

                    //  remove invoice from this receipt
                    self.updateReceiptsAfterApproval( '', activityId );
                    return false;
                },
                updateReceiptsAfterApproval: function __updateReceiptsAfterApproval( invoiceId, receiptId ) {
                    var
                        self = this,
                        keepStatus = unwrap( self.status ),
                        postArgs = {
                            'invoiceId': invoiceId,
                            'receiptId': receiptId
                        };

                    //TODO: use JSONRPC for this

                    Y.doccirrus.comctl.privatePost( '/1/receipt/:assignToInvoice', postArgs, onReceiptDeassigned );

                    function onReceiptDeassigned( err, response ) {
                        if ( err ) {
                            Y.log( 'Error removing receipt from invoice: ' + JSON.stringify( err ), 'warn', NAME );
                        }

                        response = response.data ? response.data : response;

                        if ( invoiceId ) {
                            //  when linking, we get back the new receipts array
                            self.receipts( response.receipts || [] );
                            self.totalReceipts( response.totalReceipts || 0 );
                        } else {
                            //  when unlinking, just remove the receipt
                            self.receipts.remove( receiptId );
                        }

                        self.status( keepStatus );
                        self.setNotModified();
                    }

                },
                unlinkOnHoldActivities: function(  ) {
                    var self = this;

                    if( !self.onHoldActivities || !self.onHoldActivities.length ) {
                        return;
                    }

                    self.onHoldActivities.forEach(function( activity ) {
                        self._unlinkActivity( activity );
                    });
                }
            },
            {
                schemaName: 'v_invoice',
                NAME: 'InvoiceModel'
            }
        );

        KoViewModel.registerConstructor( InvoiceModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_invoice-schema',
            'dcinvoiceutils'
        ]
    }
);