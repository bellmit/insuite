/**
 * User: dcdev
 * Date: 12/24/20  5:40 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InvoiceChEditorModel', function( Y ) {
        /**
         * @module InvoiceChEditorModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class InvoiceChEditorModel
         * @constructor
         * @param {Object} config
         * @extends SimpleActivityEditorModel
         */
        function InvoiceChEditorModel( config ) {
            InvoiceChEditorModel.superclass.constructor.call( this, config );
        }

        InvoiceChEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    'status',
                    'onHold',
                    'onHoldNotes',
                    'statusBeforeHold',
                    'cancelReason'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( InvoiceChEditorModel, SimpleActivityEditorModel, {
            initializer: function InvoiceChEditorModel_initializer() {
                var self = this,
                    currentActivity = peek( self.get( 'currentActivity' ) ),
                    HOLDABLE_STATUSES = ['APPROVED', 'BILLED', 'VALID', 'REVOKEWARN'];

                self.revokeWarningI18n = i18n( 'InCaseMojit.casefile_detail.label.REVOKE_WARNING' );
                self.onHoldNotesI18n = i18n( 'InCaseMojit.casefile_detail.label.ON_HOLD_NOTES' );
                self.cancelReasonI18n = i18n( 'InCaseMojit.casefile_detail.label.CANCEL_REASON' );

                self.addDisposable( ko.computed( function() {
                    var status = ko.unwrap( self.status ),
                        actType = ko.unwrap( self.actType ),
                        isNew = currentActivity.isNew();
                    self.canPutOnHold = ko.observable( HOLDABLE_STATUSES.includes( status ) || isNew );
                    self.cancelled = ko.observable( status === 'CANCELLED' && (actType === 'INVOICE' || actType === 'INVOICEREF') );
                } ) );
            },
            destructor: function InvoiceChEditorModel_destructor() {
            }
        }, {
            NAME: 'InvoiceChEditorModel'
        } );

        KoViewModel.registerConstructor( InvoiceChEditorModel );

    }, '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'activity-schema',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
