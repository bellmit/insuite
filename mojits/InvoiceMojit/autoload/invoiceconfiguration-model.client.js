/**
 * User: do
 * Date: 05/05/14  11:20
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'dcinvoiceconfigurationmodel', function( Y ) {

        var InvoiceConfigurationModel,
            i18n = Y.doccirrus.i18n;

        InvoiceConfigurationModel = function InvoiceConfigurationModel( configuration ) {
            var
                self = this,
                isConfirmAutoAssignmentModalOpen = false;
            self._modelName = 'InvoiceConfigurationModel';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'v_invoiceconfiguration';

            self._runBoilerplate( configuration );

            self.padxSettings._arrayOf = 'PadxSettingModel';
            self.cashSettings._arrayOf = 'CashSettingModel';
            // fill the arrays with data
            self._generateDependantModels();

            /* ---  Basic data parameters --- */
            // url
            self._dataUrl = '/1/invoiceconfiguration';

            self.groupEBMI18n = i18n('InvoiceMojit.invoicefactor_item.group.EBM');
            self.pointValueI18n = i18n('InvoiceMojit.invoicefactor_item.label.POINT_VALUE');
            self.yearLabelI18n = i18n('InvoiceMojit.invoicefactor_item.label.YEAR');
            self.quarterLabelI18n = i18n('InvoiceMojit.invoicefactor_item.label.QUARTER');
            self.factorPlaceholderI18n = i18n('InvoiceMojit.invoicefactor_item.placeholder.FACTOR');
            self.groupGenSetI18n = i18n('InvoiceMojit.invoicegeneralsettings.group.GEN_SET');
            self.labelExpValueI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.EXP_VALUE');
            self.labelAutoAssignmentI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.AUTO_ASSIGNMENT_OF_DIAGNOSIS');
            self.checkBoxDiagnosisI18n = i18n('InvoiceMojit.kbvFocusFunctionality.checkbox.DIAGNOSIS');
            self.askForCreationAfterCartReaderI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.ASK_FOR_CREATION_OF_ADDITIONAL_INSURANCES_AFTER_CARDREAD');
            self.copyPublicInsuranceDataI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.COPY_PUBLIC_INSURANCE_DATA_TO_ADDITIONAL_INSURANCE');
            self.groupKBVI18n = i18n('InvoiceMojit.kbvFocusFunctionality.group.KBV');
            self.checkBoxCodingI18n = i18n('InvoiceMojit.kbvFocusFunctionality.checkbox.CODING');
            self.invoiseNumbersI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.group.INVOICE_NUMBERS');
            self.labelStammI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.label.STAMM');
            self.labelCounterPositionI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.label.COUNTERPOSITION');
            self.labelCounterStartI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.label.COUNTER_START');
            self.groupReceiptNumbersI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.group.RECEIPT_NUMBERS');
            self.itemTextExampleI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.text.EXAMPLE');
            self.bgInvoiseNumbersI18n = i18n('InvoiceMojit.bgNumberScheme_item.group.INVOICE_NUMBERS');
            self.bgLabelStammI18n = i18n('InvoiceMojit.bgNumberScheme_item.label.STAMM');
            self.bgLabelCounterPositionI18n = i18n('InvoiceMojit.bgNumberScheme_item.label.COUNTERPOSITION');
            self.bgLabelCounterStartI18n = i18n('InvoiceMojit.bgNumberScheme_item.label.COUNTER_START');
            self.bgTextExampleI18n = i18n('InvoiceMojit.bgNumberScheme_item.text.EXAMPLE');
            self.labelAutoValidationI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.AUTO_VALIDATION');
            self.hintAutoValidationI18n = i18n('InvoiceMojit.invoicegeneralsettings.hints.AUTO_VALIDATION');
            self.gkvAutoValidationI18n = i18n('InvoiceMojit.invoicegeneralsettings.label.GKV_AUTO_VALIDATION');

            self._sortInvoiceFactors = function() {
                self.invoicefactors.sort( function( a, b ) {
                    if( a.year() === b.year() ) {
                        if( a.quarter() === b.quarter() ) {
                            return 0;
                        } else {
                            return a.quarter() < b.quarter() ? -1 : 1;
                        }
                    } else {
                        return a.year() < b.year() ? -1 : 1;
                    }
                } );
            };

            self._empiricalvalue = ko.computed( {
                read: function() {
                    var empiricalvalue = self.empiricalvalue();
                    return Y.doccirrus.comctl.numberToLocalString( empiricalvalue );
                },
                write: function( value ) {
                    value = Y.doccirrus.comctl.localStringToNumber( value );
                    if( !isNaN( value ) ) {
                        self.empiricalvalue( value );
                    } else {
                        self.empiricalvalue( undefined );
                    }
                }
            } );

            self._addDisposable( self.autoAssignmentOfDiagnosis.subscribe( function( val ) {
                var dcWindow, text = '';
                if( isConfirmAutoAssignmentModalOpen ) {
                    return;
                }
                isConfirmAutoAssignmentModalOpen = true;
                if( val ) {
                    text += '<p>Aktuell ist der Modus "manuelle Zuordnung" von Diagnosen zu Leistungen aktiviert. Dieser Modus erlaubt eine präzise Zuordnung und Auswertbarkeit, aber es empfiehlt sich zunächst die Diagnosen und dann die Leistungen zu dokumentiert. Das System ordnet die Diagnosen dann den Leistungen im Sinne eines Vorschlags automatisch zu. Sie können aber auch jederzeit die Zuordnung von Diagnosen zu Leistungen einzeln ändern.</p>';
                    text += '<p>Mit Umschaltung in den Modus "automatische Zuordnung", wird der Diagnoseteil in den Leistungen ausgeblendet und die Zuordnung erfolgt mit Freigabe der Leistung automatisch, d.h. alle als behandlungsrelevant erfassten Diagnosen werden der Leistung zugeordnet und sind damit Teil der Abrechnung.</p>';
                    text += '<p>Sie können diesen Moduswechsel jederzeit durchführen. Bitte beachten Sie jedoch, dass das spätere Zurückwechseln in den manuellen Modus bedeutet, dass Sie für nicht abgerechnete Leistungen dann die Diagnosenzuordnung manuell prüfen und ggf. korrigieren müssen.</p>';
                } else {
                    text += '<p>Aktuell ist der Modus "automatische Zuordnung" von Diagnosen zu Leistungen aktiviert.</p>';
                    text += '<p>In diesem Modus werden mit Freigabe einer Leistung alle behandlungsrelevanten Diagnosen im Kontext des Scheins dieser Leistung zugeordnet und damit später auch Teil der Abrechnung.</p>';
                    text += '<p>Mit der Umschaltung in den Modus "manuelle Zuordnung", wird der Diagnoseteil in den Leistungen eingeblendet und die Zuordnung der Diagnosen zur Leistung kann manuell beeinflusst werden. Wird dieser Modus standardmäßig genutzt, dann empfehlen wir zunächst die Diagnosen und dann die Leistungen zu dokumentieren. Dies stellt sicher, dass die Diagnosen neuen Leistungen im Sinne eines Vorschlags bereits zugewiesen werden.</p>';
                    text += '<p>Wir empfehlen diesen Moduswechsel zu einem Zeitpunkt zu machen, zu dem die zurückliegenden Leistungen vollständig abgerechnet wurden (z.B. Quartalswechsel). Andernfalls müssen Sie die Zuordnung der Diagnosen zu allen noch nicht abgerechneten Leistungen manuell prüfen und ggf. korrigieren.</p>';
                }

                dcWindow = Y.doccirrus.DCWindow.notice( {
                    title: i18n( 'DCWindow.notice.title.info' ),
                    type: 'info',
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function( e ) {

                                        self.autoAssignmentOfDiagnosis( !val );
                                        dcWindow.close( e );
                                        isConfirmAutoAssignmentModalOpen = false;
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: 'Modus wechseln',
                                    action: function( e ) {
                                        dcWindow.close( e );
                                        isConfirmAutoAssignmentModalOpen = false;
                                    }
                                } )
                            ]
                        }
                    },
                    message: text
                } );

            } ) );

            self.askForCreationOfAdditionalInsurancesAfterCardread.subscribe( function( val ) {
                // reset depeneding option
                if( false === val ) {
                    self.copyPublicInsuranceDataToAdditionalInsurance( false );
                }
            } );

            self._saveConfig = function() {
                var
                    deferred = jQuery.Deferred();

                self._save( null, deferred.resolve, deferred.reject );

                return deferred;
            };

        };

        Y.namespace( 'doccirrus.uam' ).InvoiceConfigurationModel = InvoiceConfigurationModel;

    },
    '0.0.1', {requires: [ 'dcviewmodel', 'dcinvoicefactormodel', 'dcinvoicenumberschememodel', 'dc-comctl', 'padxSettings-models', 'cashSettings-models', 'v_invoiceconfiguration-schema', 'KvgSettingModel', 'TarmedInvoiceFactorValueModel', 'MediportDeliverySettingsModel' ] }
);