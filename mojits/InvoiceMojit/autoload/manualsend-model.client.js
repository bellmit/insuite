'use strict';

/*global ko */

YUI.add( 'dcmanualsendsmodel', function( Y ) {

        var i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus.uam' );

        function ManualSendModel( data, steps ) {
            var
                self = this;

            Y.doccirrus.uam.ViewModel.mixDisposable( self );

            if( !Array.isArray( steps ) ) {
                steps = [];
            }

            self.steps = steps;
            self.currentStep = ko.observable( 0 );

            self.nextStep = function() {
                var currentStep = self.currentStep();
                if( currentStep + 1 >= self.steps.length ) {
                    self.currentStep( -1 );
                    return;
                }
                currentStep += 1;

                self.currentStep( currentStep++ );
            };

            self.getCurrentStepName = function() {
                return self.steps[self.currentStep()] ? self.steps[self.currentStep()] : undefined;
            };

            self.isActive = function( stepName ) {
                return self._addDisposable( ko.computed( function() {
                    var currentStep = self.currentStep();
                    return self.getCurrentStepName( currentStep ) === stepName;
                } ) );
            };

            self.btnLabel = ko.observable( '' );
            self.windowLabel = ko.observable( '' );

            self.localBillingFileI18n = i18n('InvoiceMojit.manual_send.message.LOCAL_BILLING_FILE');
            self.KVBillingFileI18n = i18n('InvoiceMojit.manual_send.message.KV_BILLING_FILE');
            self.messageSuccessI18n = i18n('InvoiceMojit.manual_send.message.SUCCESS');
            self.messageSureI18n = i18n('InvoiceMojit.manual_send.message.SURE');
            self.messageSure2I18n = i18n('InvoiceMojit.manual_send.message.SURE2');

            self._addDisposable( self.btnLabel.subscribe( function( val ) {
                self.dcwindow.getButton( 'next' ).button.set( 'label', val );
            } ) );

            self._addDisposable( self.windowLabel.subscribe( function( val ) {
                self.dcwindow.set( 'title', val );
            } ) );

            self.setWindow = function( dcwindow ) {
                self.dcwindow = dcwindow;
            };

            function next() {
                var stepName;
                stepName = self.getCurrentStepName();
                switch( stepName ) {
                    case 'manual-send-step-1':
                        self.btnLabel( 'Ablegen' );
                        self.windowLabel( 'Manueller Versand Schritt 1/3' );
                        break;
                    case 'manual-send-step-2':
                        self.windowLabel( 'Manueller Versand Schritt 2/3' );
                        if( data.deliverySettings.kvPortalUrl ) {
                            self.btnLabel( 'Einspielen' );
                        } else {
                            self.btnLabel( 'Weiter' );
                        }
                        Y.doccirrus.utils.downloadFile( Y.doccirrus.infras.getPrivateURL( '/download/' + data.selectedLog.xkmFileId ) );
                        break;
                    case 'manual-send-step-3':
                        if( data.deliverySettings.kvPortalUrl ) {
                            window.open( data.deliverySettings.kvPortalUrl, '_blank' );
                        } else {
                            self.btnLabel( 'Weiter' );
                        }
                        self.btnLabel( 'Bestätigen' );
                        self.windowLabel( 'Manueller Versand Schritt 3/3' );
                        break;
                    default:
                        data.callback( data.selectedLog._id );
                        self.dcwindow.close();
                }
            }
            self.next = function() {
                self.nextStep();
                next();
            };
        }

        Y.doccirrus.uam.ManualSendModel = ManualSendModel;

    },
    '0.0.1',
    {
        requires: [
            'dcviewmodel'
        ]
    }
);
