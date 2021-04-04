
/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InvoiceConfigurationModel', function( Y/*, NAME */) {

        /**
         * @module InvoiceConfigurationModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            TEXT_LIMITS = i18n('InvoiceMojit.invoiceNumberScheme_item.text.LIMITS'),
            TEXT_FEES = i18n('InvoiceMojit.invoiceNumberScheme_item.text.FEES'),
            TEXT_TEXTS = i18n('InvoiceMojit.invoiceNumberScheme_item.text.TEXTS'),
            TITLE_FEES = i18n('InvoiceMojit.invoiceNumberScheme_item.title.FEES'),
            TITLE_LIMITS = i18n('InvoiceMojit.invoiceNumberScheme_item.title.LIMITS'),
            TITLE_TEXTS = i18n('InvoiceMojit.invoiceNumberScheme_item.title.TEXTS'),
            INVOICE_NUMBER = i18n('InvoiceMojit.invoiceNumberScheme_item.group.INVOICE_NUMBERS'),
            RECEIPT_NUMBER = i18n('InvoiceMojit.invoiceNumberScheme_item.group.RECEIPT_NUMBERS'),
            DUNNING = i18n('InvoiceMojit.invoiceNumberScheme_item.group.DUNNING'),
            CASHBOOK = i18n('InvoiceMojit.invoiceNumberScheme_item.group.CASHBOOK'),
            NAME = 'InvoiceConfigurationModel';
        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response ),
            errorsMessages = errors.map(function( err ) {
                var text = err.message || Y.doccirrus.errorTable.getMessage( err ),
                    type;
                if( err && err.config && err.config.data ){
                    switch( err.config.data ) {
                        case 'invoiceNumberSchemes':
                            type = INVOICE_NUMBER;
                            break;
                        case 'receiptNumberSchemes':
                            type = RECEIPT_NUMBER;
                            break;
                        case 'dunningSchemes':
                            type = DUNNING;
                            break;
                        case 'receiptsSchemes':
                            type = CASHBOOK;
                            break;
                    }
                }
                return type ? type + ': ' + text : text;
            });

            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                window: {width: 'small'},
                message: errorsMessages.join( '<br>' )
            } );
        }

        /**
         * @class InvoiceConfigurationModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function InvoiceConfigurationModel( config ) {
            InvoiceConfigurationModel.superclass.constructor.call( this, config );
        }

        InvoiceConfigurationModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InvoiceConfigurationModel, KoViewModel.getBase(), {
                vatList: [],
                shouldDisplayVatSelect: false,
                initializer: function InvoiceConfigurationModel_initializer() {
                    var
                        self = this,
                        isConfirmAutoAssignmentModalOpen = false,
                        mediportSettings = peek(self.mediportDeliverySettings);

                    self.vatList = ko.observable(false);

                    Y.doccirrus.jsonrpc.api.InCaseMojit.getVatList()
                        .then(function (response) {
                            self.vatList( response.data || [] );
                        })
                        .fail(function (err) {
                            Y.log( 'Could not get VAT list:  ' + JSON.stringify( err ), 'error', NAME );
                        });

                    self.shouldDisplayVatSelect = ko.computed(function () {
                        var
                            addVat = unwrap(self.addVat),
                            vatList = unwrap(self.vatList);

                        return addVat && vatList.length > 0;
                    });

                    /**
                     * Adds new cashSetting item
                     * @method addCashSetting
                     */
                    self.addCashSetting = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'CashSettingModel',
                                config: {}
                            } );
                        self.cashSettings.push( model );
                    };

                    /**
                     * Adds new padxSetting item
                     * @method addPadxSetting
                     */
                    self.addPadxSetting = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'PadxSettingModel',
                                config: {}
                            } );
                        self.padxSettings.push( model );
                    };

                    self.addKvgSetting = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'KvgSettingModel',
                                config: {}
                            } );
                        self.kvgSettings.push( model );
                    };

                    self.addMediportDeliverySetting = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'MediportDeliverySettingsModel',
                                config: {}
                            } );
                        self.mediportDeliverySettings.push( model );
                    };

                    self.addInvoiceFactorSetting  = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'TarmedInvoiceFactorValueModel',
                                config: {}
                            } );
                        self.tarmedInvoiceFactorValues.push( model );
                    };

                    /**
                     * Adds new invoiceNumberSchema item
                     * @method addInvoiceNumberSchema
                     */
                    self.addInvoiceNumberSchema = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'InvoiceNumberSchemeModel',
                                config: {}
                            } );
                        self.invoiceNumberSchemes.push( model );
                    };

                    /**
                     * Adds new receiptNumberSchema item
                     * @method addReceiptNumberSchema
                     */
                    self.addReceiptNumberSchema = function() {
                        var
                            self = this,
                            usedLocations = peek( self.receiptNumberSchemes ).map( function( schema ){
                                return schema.locationId && peek( schema.locationId );
                            } ).filter( function( id ){ return id;} ),
                            model = KoViewModel.createViewModel( {
                                NAME: 'InvoiceNumberSchemeModel',
                                config: {
                                    source: 'ReceiptNumberSchema',
                                    usedLocations: usedLocations || []
                                }
                            } );
                        self.receiptNumberSchemes.push( model );
                    };

                    self.addDunningSchema = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'DunningSchemeModel',
                                config: {}
                            } );
                        self.dunningSchemes.push( model );
                    };

                    self.showIncash = ko.computed( function() {
                      return Y.doccirrus.auth.hasAdditionalService( 'inCash' );
                    } );

                    self.addReceiptsSchema = function() {
                        var
                            self = this,
                            model = KoViewModel.createViewModel( {
                                NAME: 'ReceiptsSchemeModel',
                                config: {}
                            } );
                        self.receiptsSchemes.push( model );
                    };

                    self.groupEBMI18n = i18n('InvoiceMojit.invoicefactor_item.group.EBM');
                    self.groupExclusionList18n = i18n('invoiceconfiguration-schema.InvoiceConfiguration_T.gkvExclusionList');
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
                    self.labelStammReceiptI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.label.STAMM_RECEIPT');
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
                    self.groupDunningI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.group.DUNNING');
                    self.groupCashbookI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.group.CASHBOOK');
                    self.labelNameI18n = i18n('InvoiceMojit.invoiceNumberScheme_item.label.NAME');
                    self.titleFeesI18n = TITLE_FEES;
                    self.titleLimitsI18n = TITLE_LIMITS;
                    self.titleTextsI18n = TITLE_TEXTS;
                    self.demoModeI18n = i18n( 'InPacsAdminMojit.inpacsmodality_T.isMocking' );
                    self.gkvCombineCaseFoldersI18n = i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.gkvCombineCaseFolders' );
                    self.gkvCombineScheinsI18n = i18n( 'invoiceconfiguration-schema.InvoiceConfiguration_T.gkvCombineScheins' );


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

                    self.countryModeIncludesSwitzerland = ko.computed( function() {
                        return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                    } );

                    self.addDisposable( self.autoAssignmentOfDiagnosis.subscribe( function( val ) {
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
                        // reset depending option
                        if( false === val ) {
                            self.copyPublicInsuranceDataToAdditionalInsurance( false );
                        }
                    } );

                    self._saveConfig = function() {
                        var
                            model = self.toJSON(),
                            mediportDeliverySettings = peek(self.mediportDeliverySettings()) || [],
                            mediportDeliverySetting = mediportDeliverySettings.length && mediportDeliverySettings[0];

                        model.dunningSchemes.forEach( function( item ) {
                            // because value may be 0
                            if( item.reminderDays && "" === item.reminderDays ) {
                                delete item.reminderDays;
                            }
                            if( item.warning1Days && "" === item.warning1Days ) {
                                delete item.warning1Days;
                            }
                            if( item.warning2Days && "" === item.warning2Days ) {
                                delete item.warning2Days;
                            }
                        });

                        return Y.doccirrus.jsonrpc.api.invoiceconfiguration.update( {
                            data: model,
                            fields: Object.keys( model ),
                            query: {}
                        } ).done( function( response ) {
                            var data = response.data || {};
                            if( mediportDeliverySetting && mediportDeliverySetting.isModified() ) {
                                Y.doccirrus.jsonrpc.api.invoiceconfiguration.updateMediportDeliveryFlows( data )
                                    .done( function( response ) {
                                        var mediportSettings;
                                        if( response.data && response.data.mediportDeliverySettings ) {
                                            mediportSettings = response.data.mediportDeliverySettings;
                                            self.mediportDeliverySettings( mediportSettings );
                                            self.mediportFlowsIds = {
                                                sendFlowId: mediportSettings[0].sendFlowId,
                                                receiveFlowId: mediportSettings[0].receiveFlowId
                                            };
                                        }
                                    } );
                            } else if( !mediportDeliverySettings.length && self.mediportFlowsIds ) {
                                //mediportDeliverySetting was removed - need to delete flows
                                Y.doccirrus.jsonrpc.api.invoiceconfiguration.removeMediportDeliveryFlows( self.mediportFlowsIds );
                            }
                        } ).fail( function( response ) {
                            showError( response );
                        } );
                    };

                    // CH
                    self.initTarmedTaxPointValues();
                    self.initBillingAdjustments();

                    if( Array.isArray( mediportSettings ) && mediportSettings.length ) {
                        self.mediportFlowsIds = {
                            sendFlowId: peek( mediportSettings[0].sendFlowId ),
                            receiveFlowId: peek( mediportSettings[0].receiveFlowId )
                        };
                    }
                },
                destructor: function InvoiceConfigurationModel_destructor() {
                },
                initTarmedTaxPointValues: function initTarmedTaxPointValues() {
                    var self = this;
                    
                    self.tarmedTaxPointValuesI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.title' );
                    self.tarmedInvoiceFactorValuesI18n = i18n( 'InvoiceMojit.tarmedInvoiceFactorValues.title' );
                    self.lawI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.law' );
                    self.cantonI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.canton' );
                    self.dateI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.date' );
                    self.taxPointValueI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.taxPointValue' );
                    self.notAvailableI18n = i18n( 'InvoiceMojit.tarmedTaxPointValues.notAvailable' );

                    const laws = self.tarmedTaxPointValues().reduce( function(laws, currentEntry){
                        const law = ko.unwrap( currentEntry.law );
                        if( law ) {
                            laws.add( law );
                        }
                        return laws;
                    }, new Set() );

                    self.selectedLaw = ko.observable( [].concat(laws)[0] );

                    self.select2Law = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return {
                                    id: self.selectedLaw(),
                                    text: self.selectedLaw()
                                };
                            },
                            write: function( $event ) {
                                self.selectedLaw( $event.val );
                            }
                        }, self ) ),
                        select2: {
                            width: '100%',
                            placeholder: self.lawI18n,
                            data: function() {
                                return {
                                    results: [].concat(laws).map( function( law ) {
                                        return {
                                            id: law,
                                            text: law
                                        };
                                    } )
                                };
                            }
                        }
                    };

                    const cantons = self.tarmedTaxPointValues().reduce( function(cantons, currentEntry){
                        const cantonCode = ko.unwrap( currentEntry.cantonCode );
                        const cantonShort = ko.unwrap( currentEntry.cantonShort );
                        return cantons.add( {
                            id: cantonCode,
                            text: cantonShort
                        } );
                    }, new Set() );

                    self.selectedCanton = ko.observable( [].concat(cantons)[0] );

                    self.select2Canton = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.selectedCanton();
                            },
                            write: function( $event ) {
                                self.selectedCanton( $event.added );
                            }
                        }, self ) ),
                        select2: {
                            width: '100%',
                            placeholder: self.lawI18n,
                            data: function() {
                                return {results: [].concat(cantons)};
                            }
                        }
                    };

                    self.selectedTarmedTaxPointDate = ko.observable( new Date().toJSON() );

                    self.tarmedTaxPointValue = ko.computed( function() {
                        const tarmedTaxPointEntry = self.tarmedTaxPointValues().find( function(entry){
                            return entry.law() === self.selectedLaw() &&
                                   entry.cantonCode() === self.selectedCanton().id &&
                                   Date( entry.validFrom() ) < Date( self.selectedTarmedTaxPointDate() ) &&
                                   (!entry.validUntil() || Date( entry.validUntil() ) > Date( self.selectedTarmedTaxPointDate() ));
                        } );

                        return tarmedTaxPointEntry ? tarmedTaxPointEntry.value() : self.notAvailableI18n;
                    } );
                },
                initBillingAdjustments: function initBillingAdjustments() {
                    var self = this;
                    self.billingAdjustmentsI18n = i18n( 'InvoiceMojit.billingAdjustments.title' );
                    self.imagingDeviceAvailableI18n = i18n( 'InvoiceMojit.billingAdjustments.imagingDeviceAvailable' );
                    self.infoI18n = i18n( 'InvoiceMojit.billingAdjustments.info' );
                    self.showImagingDeviceInfoMessage = function () {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: i18n( 'InvoiceMojit.billingAdjustments.info' ),
                            window: {
                                width: 'medium',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                this.close();
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    };

                },
                showIdentityInfoDialog: function( $context ) {
                    var
                        content, title;

                    switch( $context ) {
                        case 'textLimits':
                            content = TEXT_LIMITS;
                            title = TITLE_LIMITS;
                            break;
                        case 'textFees':
                            content = TEXT_FEES;
                            title = TITLE_FEES;
                            break;
                        case 'textTexts':
                            content = TEXT_TEXTS;
                            title = TITLE_TEXTS;
                    }

                    new Y.doccirrus.DCWindow( { // eslint-disable-line
                        className: 'DCWindow-tab_employees-info',
                        bodyContent: content,
                        title: title,
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                    }
                                } )
                            ]
                        }
                    } );

                },
                addGkvExclusionList: function() {
                    var self = this,
                        model = KoViewModel.createViewModel( {
                            NAME: 'ExclusionListModel',
                            config: {}
                        } );
                    self.gkvExclusionList.push( model );
                },
                removeGkvExclusionListEntry: function( model ) {
                    var self = this;
                    self.gkvExclusionList.remove( model );
                }
            },
            {
                schemaName: 'invoiceconfiguration',
                NAME: 'InvoiceConfigurationModel'
            } );

        KoViewModel.registerConstructor( InvoiceConfigurationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'dcviewmodel',
            'InvoiceFactorModel',
            'InvoiceNumberSchemeModel',
            'DunningSchemeModel',
            'ReceiptsSchemeModel',
            'dc-comctl',
            'CashSettingModel',
            'PadxSettingModel',
            'KvgSettingModel',
            'TarmedInvoiceFactorValueModel',
            'MediportDeliverySettingsModel',
            'invoiceconfiguration-schema',
            'ExclusionListModel'
        ]
    }
);