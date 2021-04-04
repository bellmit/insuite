/**
 * User: pi
 * Date: 16/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, jQuery */

'use strict';

YUI.add( 'TreatmentEditorModel', function( Y/*, NAME*/ ) {
        /**
         * @module TreatmentEditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' ),

            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        /**
         * @class TreatmentEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function TreatmentEditorModel( config ) {
            TreatmentEditorModel.superclass.constructor.call( this, config );
        }

        TreatmentEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    'code',
                    'catalog',
                    'fk5035Set',
                    'status',
                    'userContent',
                    'subType',
                    'mirrorActivityId',
                    'explanations',
                    'uvGoaeType',
                    'actualUnit',
                    'timestamp',
                    'unit',
                    'price',
                    'billingFactorValue',
                    'billingFactorType',
                    'actualPrice',
                    'u_extra',
                    'hasVat',
                    'icdsExtra',
                    'icds',
                    'vat',
                    'areTreatmentDiagnosesBillable',
                    'generalCosts',
                    'specialCosts',
                    'fk5002',
                    'fk5005',
                    'fk5013',
                    'fk5015',
                    'fk5016',
                    'tsvDoctorNo',
                    'fk5044',
                    'fk5008',
                    'fk5017',
                    'fk5018',
                    'fk5019',
                    'fk5023',
                    'fk5024',
                    'fk5025',
                    'fk5026',
                    'fk5034',
                    'fk5037',
                    'fk5038',
                    'fk5040',
                    'fk5010BatchNumber',
                    'omimCodes',
                    'publicBillingFactor',
                    'employeeId',
                    'caseFolderId',
                    'patientId',
                    'costType',
                    'linkedPercentage',
                    'gnrAdditionalInfo',
                    'gnrAdditionalInfoType',
                    'noOmimGCodeAllowed',
                    'numberOfCopies',
                    'noASV'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: CatalogTagEditorModel.ATTRS.subModelsDesc.value.concat( [
                    {
                        propName: 'fk5012Set',
                        editorName: 'Fk5012EditorModel'
                    },
                    {
                        propName: 'fk5020Set',
                        editorName: 'Fk5020EditorModel'
                    },
                    {
                        propName: 'fk5035Set',
                        editorName: 'Fk5035EditorModel'
                    },
                    {
                        propName: 'fk5036Set',
                        editorName: 'Fk5036EditorModel'
                    },
                    {
                        propName: 'fk5042Set',
                        editorName: 'Fk5042EditorModel'
                    },
                    {
                        propName: 'omimCodes',
                        editorName: 'OmimEditorModel'
                    }
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( TreatmentEditorModel, CatalogTagEditorModel, {
                isASV: false,
                canOverrideCatalogFlag: false,
                initializer: function TreatmentEditorModel_initializer() {
                    var
                        self = this;
                    self.initTreatmentEditorModel();
                },
                destructor: function TreatmentEditorModel_destructor() {
                },
                initTreatmentEditorModel: function TreatmentEditorModel_initTreatmentEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        caseFolder = self.get( 'caseFolder' );

                    self.contentServiceI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CONTENT_SERVICE' );
                    self.catalogTextI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CATALOG_TEXT' );
                    self.SD4ExplanationsI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.SD4EXPLANATIONS' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );
                    self.useCatalogPriceI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.USE_CATALOG_PRICE' );
                    self.bilableI18n = i18n( 'InCaseMojit.casefile_detail.label.BILLABLE' );
                    self.checkboxYesI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.YES' );
                    self.checkboxNoI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.NO' );
                    self.numberOfCopiesI18n = i18n( 'InCaseMojit.casefile_detail.label.NUMBER_OF_COPIES' );
                    self.labelCodeI18n = i18n( 'InCaseMojit.casefile_detail.label.CODE' );
                    self.vatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.VAT' );
                    self.labelNetI18n = i18n( 'InCaseMojit.casefile_detail.label.NET' );
                    self.displayPriceI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DISPLAY_PRICE' );
                    self.labelGrossI18n = i18n( 'InCaseMojit.casefile_detail.label.GROSS' );
                    self.billingFactorValueI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.BILLING_FACTOR_VALUE' );
                    self.groupExpensesI18n = i18n( 'InCaseMojit.casefile_detail.group.EXPENSES' );
                    self.labelExpensesI18n = i18n( 'InCaseMojit.casefile_detail.label.EXPENSES' );
                    self.groupDiagnosesI18n = i18n( 'InCaseMojit.casefile_detail.group.DIAGNOSES' );
                    self.labelAnamnesticI18n = i18n( 'InCaseMojit.casefile_detail.label.ANAMNESTIC' );
                    self.labelRelevantI18n = i18n( 'InCaseMojit.casefile_detail.label.RELEVANT' );
                    self.groupCostsI18n = i18n( 'InCaseMojit.casefile_detail.group.COSTS' );
                    self.specialCostsI18n = i18n( 'InCaseMojit.casefile_detail.label.SPECIAL_COSTS' );
                    self.generalCostsI18n = i18n( 'InCaseMojit.casefile_detail.label.GENERAL_COSTS' );
                    self.labelInCentI18n = i18n( 'InCaseMojit.casefile_detail.label.IN_CENT' );
                    self.matCostsI18n = i18n( 'InCaseMojit.casefile_detail.label.MAT_COSTS' );
                    self.placeholderFK5012I18n = i18n( 'InCaseMojit.casefile_detail.placeholder.FK5012' );
                    self.labelDesignationsI18n = i18n( 'InCaseMojit.casefile_detail.label.DESIGNATIONS' );
                    self.groupJourneyI18n = i18n( 'InCaseMojit.casefile_detail.group.JOURNEY' );
                    self.groupOperationI18n = i18n( 'InCaseMojit.casefile_detail.group.OPERATION' );
                    self.labelOpKeyI18n = i18n( 'InCaseMojit.casefile_detail.label.OP_KEY' );
                    self.siteLocI18n = i18n( 'InCaseMojit.casefile_detail.label.SITE_LOC' );
                    self.labelGnrJustI18n = i18n( 'InCaseMojit.casefile_detail.label.GNR_JUST' );
                    self.earlyDI18n = i18n( 'InCaseMojit.casefile_detail.group.EARLY_D' );
                    self.groupKMAMI18n = i18n( 'InCaseMojit.casefile_detail.group.KM_AM' );
                    self.groupGenesI18n = i18n( 'InCaseMojit.casefile_detail.group.GENES' );
                    self.textCopyrightI18n = i18n( 'InCaseMojit.casefile_detail.text.COPYRIGHT' );
                    self.useCatalogInfoI18n = i18n( 'InCaseMojit.casefile_detail.text.USE_CATALOG_INFO' );
                    self.gnrAdditionalInfoI18n = i18n( 'activity-schema.GnrAdditionalInfo_E.i18n' );
                    self.groupBatchNumberI18n = i18n('InCaseMojit.casefile_detail.label.batchNumber');
                    self.labelBatchNumberI18n = i18n('InCaseMojit.casefile_detail.label.batchNumberText');

                    /**
                     * Checks if batch number fk5010 needs to filled out and collapse the dropdown menu.
                     */
                    self.addDisposable( ko.computed( function() {
                        if (self.fk5010BatchNumber.hasError()) {
                            jQuery( '#textform-sd4-panel-body-batchNumber' ).collapse('show');
                        }
                    } ) );

                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );

                    self._billingFactorTypeList = function() {
                        return Y.doccirrus.schemas.person.types.BillingFactor_E.list;
                    };

                    self._fk5018List = Y.doccirrus.schemas.activity.types.Fk5018_E.list;

                    self._fk5043List = [
                        {val: '', i18n: PLEASE_SELECT},
                        {val: '1', i18n: 'ml'},
                        {val: '2', i18n: 'mg'},
                        {val: '3', i18n: 'μg'}
                    ];

                    self.costTypes = ko.observableArray( Y.doccirrus.schemas.activity.types.CostType_E.list );

                    self.fk5008Notes = currentActivity.get( 'fk5008Notes' );

                    self.addDisposable( ko.computed( self.checkFk5009ForDocumentation.bind( self ) ) );

                    //  used for inserting text fragments from documentation tree
                    self.userContent.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };
                    self.explanations.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

                    /**
                     * determine visibility of fk5008Notes
                     * @type ko.computed
                     */
                    self.isVisibleFk5008Notes = Boolean( self.fk5008Notes && self.fk5008Notes.length );

                    self._displayPrice = ko.computed( {
                        read: function() {
                            var price = unwrap( self.price );
                            price = Y.doccirrus.comctl.numberToLocalString( price );
                            return price;
                        },
                        write: function( val ) {
                            val = Y.doccirrus.comctl.localStringToNumber( val );
                            // MOJ-3396
                            if( 'GOÄ' === peek( self.catalogShort ) ) {
                                self.billingFactorValue( '1.00' );
                            }
                            /**
                             * order is important! Changing in price will change actualPrice. Billing factor should be already be set.
                             */
                            self.price( val );
                        }
                    } );

                    self._displayBillingFactorValue = ko.computed( {
                        read: function() {
                            var billingFactorValue = unwrap( self.billingFactorValue );
                            billingFactorValue = Y.doccirrus.comctl.factorToLocalString( billingFactorValue );
                            return billingFactorValue;
                        },
                        write: function( val ) {
                            val = Y.doccirrus.comctl.localStringToNumber( val );
                            self.billingFactorValue( val && val.toString() );
                        }
                    } );

                    self._unitValuesVisible = ko.computed( function() {
                        var
                            catalogShort = unwrap( self.catalogShort ),
                            actualUnit = unwrap( self.actualUnit ),
                            visible = true,
                            codeExists = unwrap( self.catalog );
                        if( !codeExists ) {
                            visible = true;
                        } else if( 'EBM' === catalogShort && ('Euro' !== actualUnit && 'Punkte' !== actualUnit) ) {
                            visible = false;
                        }

                        return visible;
                    } );

                    self._PriceReadOnly = ko.computed( function() {
                        var
                            readOnly = unwrap( self.price.readOnly ),
                            codeExists = unwrap( self.catalog ),
                            catalogShort = unwrap( self.catalogShort );
                        return readOnly || (codeExists && 'EBM' === catalogShort);
                    } );
                    self._UnitReadOnly = ko.computed( function() {
                        var
                            readOnly = unwrap( self.unit.readOnly ),
                            codeExists = unwrap( self.catalog ),
                            catalogShort = unwrap( self.catalogShort );
                        return readOnly || (codeExists && 'EBM' === catalogShort);
                    } );

                    self._vatList = Y.doccirrus.vat.getList();


                    /**
                     * Gross entering computed
                     * - reads price as gross
                     * - writes net from gross to price
                     */
                    self._displayGross = ko.computed( {
                        read: function() {
                            var
                                price = unwrap( self.price ),
                                vatCode = unwrap( self.vat ),
                                priceNumber = Y.doccirrus.comctl.localStringToNumber( Y.doccirrus.comctl.numberToLocalString( price ) ), // price can also be a string sometimes
                                gross = Y.doccirrus.vat.calculateAmt( priceNumber, vatCode ) + priceNumber,
                                grossStr = Y.doccirrus.comctl.numberToLocalString( gross );

                            return grossStr;
                        },
                        write: function( value ) {
                            var
                                gross = Y.doccirrus.comctl.localStringToNumber( value ),
                                vatCode = unwrap( self.vat ),
                                net = Y.doccirrus.vat.calculateNetFromGross( gross, vatCode );

                            self._displayPrice( Y.doccirrus.comctl.numberToLocalString( net ) );
                        }
                    } );

                    self._showTreatmentDiagnoses = function() {
                        var
                            invoiceConfig = self.get( 'binder' ).getInitialData( 'invoiceconfiguration' );
                        return !invoiceConfig.autoAssignmentOfDiagnosis;
                    };

                    self.initSelect2TreatmentDiagnoses();

                    self._displayGeneralCosts = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.generalCosts ) );
                    self._displaySpecialCosts = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.specialCosts ) );

                    self._hasSpecialCostsInfo = ko.observable( false );
                    self._specialCostsValues = ko.observable( [] );
                    self._clickSpecialCostsValue = function( val ) {
                        self.specialCosts( val );
                    };

                    self.addFk5035Set = function() {
                        currentActivity.addFk5035Set();
                    };
                    self.removeFk5035Set = function( data ) {
                        currentActivity.removeFk5035Set( data.get( 'dataModelParent' ) );
                    };

                    self.addFk5036Set = function() {
                        currentActivity.addFk5036Set();
                    };
                    self.removeFk5036Set = function( data ) {
                        currentActivity.removeFk5036Set( data.get( 'dataModelParent' ) );
                    };

                    if( currentActivity.mirrorActivityId() || ( caseFolder && ( "QUOTATION" === caseFolder.additionalType || "ERROR" === caseFolder.additionalType || "PREPARED" === caseFolder.type ) ) ) {
                        self.initPrivate();
                        self.initPublic();
                    } else {
                        // MOJ-14319: [OK] [CASEFOLDER]
                        if( caseFolder && Y.doccirrus.schemas.patient.isPublicInsurance( {type: caseFolder.type} ) ) {
                            self.initPublic();
                        } else {
                            self.initPrivate();
                        }
                    }

                    self.addOmimCodes = function() {
                        currentActivity.omimCodes.push( {} );
                    };

                    self.removeOmimCodes = function( data ) {
                        currentActivity.omimCodes.remove( data.get( 'dataModelParent' ) );
                    };

                    self.omimCodesHasError = ko.computed( function() {
                        var currentActivity = peek( self.get( 'currentActivity' ) ),
                            omimCodes = currentActivity.omimCodes(),
                            omimCodesHasError = currentActivity.omimCodes.hasError(),
                            contentHasError;
                        contentHasError = omimCodes.some( function( entry ) {
                            var
                                fk5070HasError = entry.fk5070.hasError(),
                                fk5071HasError = entry.fk5071.hasError(),
                                fk5072HasError = entry.fk5072.hasError(),
                                fk5073HasError = entry.fk5073.hasError();
                            return fk5070HasError || fk5071HasError || fk5072HasError || fk5073HasError;
                        } );

                        return contentHasError || omimCodesHasError;
                    } );

                    self.omimCodesValidationMessage = ko.computed( function() {
                        var currentActivity = peek( self.get( 'currentActivity' ) ),
                            str = '',
                            omimCodesHasError = self.omimCodesHasError();
                        if( omimCodesHasError ) {
                            str = currentActivity.omimCodes.validationMessages().join( ', ' );
                        }
                        return str;
                    } );

                    self.selectedOmimChain = ko.observable();

                    self.omimChainSelect2 = {
                        data: self.addDisposable( ko.computed( {
                            write: function( $event ) {
                                self.selectedOmimChain( $event.added ? $event.added : null );
                            },
                            read: function() {
                                return self.selectedOmimChain();
                            }
                        } ) ),
                        select2: {
                            multiple: false,
                            query: function( query ) {

                                Y.doccirrus.jsonrpc.api.omimchain.read( {
                                    query: {
                                        chainName: { $regex: query.term }
                                    }
                                } )
                                    .done( function( response ) {
                                        var
                                            results = (response.data || []).map( function( entry ) {
                                                return { id: entry._id, text: entry.chainName, _data: entry };
                                            } );

                                        query.callback( {
                                            results: results
                                        } );
                                    } );
                            }
                        }
                    };

                    self.addOmimChain = function() {
                        var selectedOmimChain = self.selectedOmimChain();
                        if( selectedOmimChain && selectedOmimChain._data && selectedOmimChain._data.chain && selectedOmimChain._data.chain.length ) {
                            selectedOmimChain._data.chain.forEach( function( omimChainItem ) {
                                currentActivity.omimCodes.push( {
                                        fk5070: omimChainItem.omimG,
                                        fk5072: omimChainItem.genName,
                                        fk5071: omimChainItem.omimP,
                                        fk5073: omimChainItem.desc
                                    }
                                );
                            } );

                        }
                    };

                    self.addDisposable( ko.computed( function() {
                        var needsIcd, needsOmim,
                            code = self.code();

                        function showWarning( error ) {
                            var message = Y.doccirrus.errorTable.getMessages( error ),
                                messageId = peek( currentActivity._id ) + '_omim_' + code;

                            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                content: message,
                                messageId: messageId,
                                level: 'WARNING'
                            } );
                        }

                        if( ko.computedContext.isInitial() || !code ) {
                            return;
                        }
                        needsIcd = Y.doccirrus.regexp.some( code, [
                            Y.doccirrus.regexp.KP2615,
                            Y.doccirrus.regexp.KP2616,
                            Y.doccirrus.regexp.KP2617,
                            Y.doccirrus.regexp.KP2617_2,
                            Y.doccirrus.regexp.KP2617_3
                        ] );

                        needsOmim = Y.doccirrus.regexp.some( code, [
                            Y.doccirrus.regexp.KP2612,
                            Y.doccirrus.regexp.KP2613,
                            Y.doccirrus.regexp.KP2614,
                            Y.doccirrus.regexp.KP2614_2,
                            Y.doccirrus.regexp.KP2615,
                            Y.doccirrus.regexp.KP2616
                        ] );

                        if( needsIcd ) {
                            showWarning( {code: '18016', data: {$gop: code}} );
                        }

                        if( needsOmim ) {
                            showWarning( {code: '18017', data: {$gop: code}} );
                        }

                        self.fk5010BatchNumber('');

                    } ) );

                    self._uvGoaeTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.UvGoaeType_E.list );

                    self.isLinkedPercentageVisible = ko.observable( false );
                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code );
                        self.isLinkedPercentageVisible( Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( code ) );
                    } ) );
                    self._displayLinkedPercentage = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.linkedPercentage ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            isLinkedPercentageVisible = unwrap( self.isLinkedPercentageVisible );
                        if( !ko.computedContext.isInitial() ) {
                            if( isLinkedPercentageVisible ) {
                                self.billingFactorValue( '1.00' );
                            } else {
                                self.linkedPercentage( null );
                            }
                        }
                    } ) );
                },
                initPrivate: function TreatmentEditorModel_initPrivate() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    self.privateBillingFactorType = ko.computed( {
                        read: function() {
                            var billingFactorType = unwrap( self.billingFactorType );
                            return billingFactorType;
                        },
                        write: function( value ) {
                            self.billingFactorType( value );
                            currentActivity.setBillingFactorValue( value );
                        }
                    } );
                    self.canOverrideCatalogFlag = ko.computed( function() {
                        var code = unwrap( self.code );
                        return self.isUserAdmin && code;
                    } );


                },
                initPublic: function TreatmentEditorModel_initPublic() {
                    var
                        self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        caseFolder = self.get( 'caseFolder' ),
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    self.isASV = caseFolder && 'ASV' === caseFolder.additionalType;

                    self.addDisposable( ko.computed( function() {
                        var
                            value = (self.publicBillingFactor && self.publicBillingFactor()) || null,
                            isInitial = ko.computedContext.isInitial();
                        if( !isInitial && !value ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: 'Bitte geben Sie einen Punktwert an.',
                                window: {
                                    width: 'medium',
                                    buttons: {
                                        footer: [
                                            {
                                                isDefault: true,
                                                label: 'Punktwert angeben',
                                                action: function( e ) {
                                                    this.hide( e );
                                                    window.location.href = "/invoice#/configuration";
                                                }
                                            }
                                        ]
                                    }
                                }
                            } );
                        }
                    } ) );

                    // display material costs hints
                    self._additionalCodeResults = ko.observableArray();

                    self.pseudoGnr = Y.doccirrus.KoViewModel.utils.createAsync( {
                        cache: self,
                        initialValue: null,
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.kbv.pseudognr,
                            params: (function() {
                                var params,
                                    actType = self.actType.peek(),
                                    insurance = currentPatient.getPublicInsurance( caseFolder.type ); // MOJ-14319 [OK] [CASEFOLDER]

                                if( insurance && 'TREATMENT' === actType ) {
                                    params = {
                                        patientId: peek( currentPatient._id ),
                                        locationId: peek( insurance.locationId ),
                                        costCarrierBillingSection: peek( insurance.costCarrierBillingSection ),
                                        costCarrierBillingGroup: peek( insurance.costCarrierBillingGroup )
                                    };

                                    return params;
                                }
                                return null;
                            })()
                        },
                        converter: function( response ) {
                            return response.data;
                        }
                    } );
                    self.addDisposable( ko.computed( function() {
                        var pseudoGnr = unwrap( self.pseudoGnr );
                        if( pseudoGnr ) {
                            self._additionalCodeResults( pseudoGnr.gnrs );
                        } else {
                            self._additionalCodeResults.removeAll();
                        }
                    } ) );

                    self._codeValidationInfo = ko.computed( function() {
                        var
                            timestamp = unwrap( self.timestamp ),
                            u_extra = unwrap( self.u_extra ),
                            splittedValidFrom, from, to, momTimestamp, result,
                            isValid = true;

                        if( !u_extra || !u_extra.validfrom || !timestamp ) {
                            return;

                        }

                        // possible formats ['YYYY-MM-DD..YYYY-MM-DD', '..YYYY-MM-DD', 'YYYY-MM-DD..', 'YYYY-MM-DD']
                        splittedValidFrom = u_extra.validfrom.split( '..' );

                        if( !splittedValidFrom || 2 !== splittedValidFrom.length ) {
                            // no code is only valid for one day
                            return;
                        }
                        momTimestamp = moment( timestamp );
                        from = splittedValidFrom[0] ? moment( splittedValidFrom[0], 'YYYY-MM-DD' ) : null;
                        to = splittedValidFrom[1] ? moment( splittedValidFrom[1], 'YYYY-MM-DD' ) : null;

                        if( from ) {
                            isValid = from.isBefore( momTimestamp ) || from.isSame( momTimestamp );
                        }

                        if( true === isValid && to ) {
                            isValid = to.isAfter( momTimestamp ) || to.isSame( momTimestamp );
                        }

                        result = {
                            from: from && from.format( 'DD.MM.YYYY' ),
                            to: to && to.format( 'DD.MM.YYYY' ),
                            isValid: isValid,
                            display: 'Gültig'
                        };

                        if( result.from ) {
                            result.display += ' ab ' + result.from;
                        }

                        if( result.to ) {
                            result.display += ' bis ' + result.to;
                        }

                        return result;
                    } );

                    self.initGnrAdditionalInfo();

                    self.showAdditionalFk5012SetFields = ko.computed( function() {
                        var isASV = unwrap( self.isASV );
                        var noASV = unwrap( self.noASV );
                        var timestamp = unwrap( self.timestamp );
                        var isAfterQ12021 = moment( timestamp ).isAfter( moment( '1/2021', 'Q/YYYY' ).endOf( 'quarter' ) );
                        if( !isAfterQ12021 ) {
                            return isASV && !noASV;
                        }
                        return true;
                    } );

                    self.addFk5012Set = function() {
                        var
                            pseudoGnr = peek( self.pseudoGnr );
                        currentActivity.addFk5012Set();
                        if( pseudoGnr ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                content: pseudoGnr.text,
                                messageId: 'pseudoGnr' + peek( currentActivity._id ),
                                level: 'INFO',
                                _removeTimeout: 30000
                            } );
                            self.pseudoGnr( '' );
                        }
                    };
                    self.removeFk5012Set = function( data ) {
                        currentActivity.removeFk5012Set( data.get( 'dataModelParent' ) );
                    };

                    self.tsvDoctorNoAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var tsvDoctorNo = self.tsvDoctorNo();
                                if( tsvDoctorNo ) {
                                    return {id: tsvDoctorNo, text: tsvDoctorNo};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.tsvDoctorNo( $event.val );
                            }
                        } ) ),
                        select2: {
                            placeholder: 'BSNR',
                            minimumInputLength: 1,
                            allowClear: true,
                            query: function( query ) {
                                function done( results ) {
                                    results = (results && results.data || []).map( function( item ) {
                                        return {id: item.bsnr, text: item.bsnr, _data: item};
                                    } );
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                                    done( [] );
                                }
                                else {
                                    Y.doccirrus.jsonrpc.api.catalog.catsearch( {
                                        action: 'catsearch',
                                        catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                        itemsPerPage: 10,
                                        term: query.term,
                                        key: 'bsnr'
                                    } ).done( done ).fail( function() {
                                        done( [] );
                                    } );
                                }

                            },
                            createSearchChoice: function( term ) {
                                return {id: term, text: term};
                            }
                        }
                    };
                },
                addPrivateCode: function() {
                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.addFk5012Set( {
                        fk5011Set: [
                            {
                                fk5011: ''
                            }
                        ],
                        fk5012: ''
                    } );
                },
                initSelect2TreatmentDiagnoses: function TreatmentEditorModel_initSelect2TreatmentDiagnoses() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) );
                    /**
                     * Treatment - Diagnoses Handling
                     */
                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: [ 'icdsObj', 'icdsExtraObj' ]
                    } );
                    var // map data to select2 format and include a reference
                        select2Mapper = function( data ) {
                            return { id: data._id, text: unwrap( data.code ), _ref: data };
                        },
                        // formatting select2 list entries
                        select2FormatResult = function( object ) {
                            var code = unwrap( object._ref.code ),
                                content = unwrap( object._ref.content ),
                                text = Y.Escape.html( code + ' (' + content + ')' );
                            return '<div class="dc-formatResult" title="' + text + '">' + text + '</div>';
                        },
                        // formatting select2 tags
                        select2FormatSelection = function( object, container ) {
                            var code = unwrap( object._ref.code ),
                                content = unwrap( object._ref.content ),
                                text = Y.Escape.html( code + ' (' + content + ')' ),
                                ref = object._ref;
                            if( ref.actType === 'DIAGNOSIS' && ref.diagnosisType === 'CONTINUOUS' &&
                                ref.diagnosisTreatmentRelevance === 'TREATMENT_RELEVANT' ) {
                                container.parent().css( { 'background-image': 'linear-gradient(to top, #FFCC91 20%, #FFCC91 50%, #FFCC91 52%, #eee 100%)' } );
                            }
                            return '<span title="' + text + '">' + code + '</span>';
                        };

                    // setup input widgets
                    self._select2caseHistory = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                // provide select2 data objects
                                return self.icdsExtraObj().map( select2Mapper );
                            },
                            write: function( $event ) {
                                // transfer select2 data status
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    currentActivity.addIcdsExtra( $event.added._ref );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    currentActivity.removeIcdsExtra( $event.removed._ref._id );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            formatResult: select2FormatResult,
                            formatSelection: select2FormatSelection,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.patient.relevantDiagnosesForTreatment( {
                                    timestamp: peek( self.timestamp ),
                                    patientId: peek( currentPatient._id ),
                                    caseFolderId: peek( currentActivity.caseFolderId )
                                } ).done( function( response ) {
                                    var
                                        relatedDiagnoses = response.data,
                                        results = relatedDiagnoses.all.map( select2Mapper ),
                                        otherIds = self._select2treatmentRelevant.data().map( function( item ) {
                                            return item.id;
                                        } ),
                                        filtered = Y.Array.filter( results, function( item ) {
                                            return -1 === otherIds.indexOf( item.id );
                                        } );
                                    query.callback( {
                                        results: filtered
                                    } );
                                } );

                            }
                        }
                    };
                    self._select2treatmentRelevant = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                // provide select2 data objects
                                return self.icdsObj().map( select2Mapper );
                            },
                            write: function( $event ) {
                                // transfer select2 data status
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    currentActivity._linkActivity( $event.added._ref, true );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    currentActivity._unlinkActivity( $event.removed._ref._id );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            formatResult: select2FormatResult,
                            formatSelection: select2FormatSelection,
                            query: function( query ) {

                                Y.doccirrus.jsonrpc.api.patient.relevantDiagnosesForTreatment( {
                                    timestamp: peek( self.timestamp ),
                                    patientId: peek( currentPatient._id ),
                                    caseFolderId: peek( currentActivity.caseFolderId )
                                } )
                                    .done( function( response ) {
                                        var
                                            relatedDiagnoses = response.data,
                                            results = relatedDiagnoses.all.map( select2Mapper ),
                                            otherIds = self._select2caseHistory.data().map( function( item ) {
                                                return item.id;
                                            } ),
                                            filtered = Y.Array.filter( results, function( item ) {
                                                return -1 === otherIds.indexOf( item.id );
                                            } );
                                        query.callback( {
                                            results: filtered
                                        } );
                                    } );
                            }
                        }
                    };
                },
                jumpTo: function( additionalInfo ) {
                    var $el;
                    if( !additionalInfo || !additionalInfo.val ) {
                        return;
                    }

                    switch( additionalInfo.val ) {
                        case '5006':
                            jQuery( '[name="daySeparation-toggle"]' ).focus();
                            break;
                        case '5009':
                            jQuery( '#textform-sd4-userContent' ).focus();
                            break;
                        case '5036':
                        case '5035':
                        case '5034':
                        case '5026':
                        case '5025':
                            $el = jQuery( '#textform-sd4-panel-operation' );
                            $el.collapse( 'show' );
                            break;
                        case '5020':
                        case '5021':
                        case '5040':
                            $el = jQuery( '#textform-sd4-panel-earlyDiagnosis' );
                            $el.collapse( 'show' );
                            break;
                        case '5042':
                        case '5043':
                            $el = jQuery( '#textform-sd4-panel-kmam' );
                            $el.collapse( 'show' );
                            break;
                        case '5070':
                        case '5071':
                            $el = jQuery( '#textform-sd4-panel-gens' );
                            $el.collapse( 'show' );
                            break;
                        case '5002':
                        case '5003':
                        case '5015':
                        case '5016':
                            $el = jQuery( '#textform-sd4-panel-others' );
                            $el.collapse( 'show' );
                            break;
                        case '5011':
                        case '5012':
                            $el = jQuery( '#textform-sd4-panel-bodymaterialCosts' );
                            $el.collapse( 'show' );
                            break;
                        case '5010':
                            $el = jQuery( '#textform-sd4-panel-body-batchNumber' );
                            $el.collapse( 'show' );
                            break;
                    }
                },
                initGnrAdditionalInfo: function() {
                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        fieldsToTrack = {};

                    peek( self.gnrAdditionalInfo.list ).filter( function( item ) {
                        return item.trackPath;
                    } ).forEach( function( item ) {
                        fieldsToTrack[item.val] = item.trackPath;
                    } );

                    self.fieldTracker = {};

                    Object.keys( fieldsToTrack ).forEach( function( key ) {
                        self.fieldTracker[key] = self.addDisposable( ko.computed( function() {
                            var
                                path = fieldsToTrack[key],
                                pathSplit = path && path.split( '.' ),
                                val = unwrap( currentActivity[pathSplit[0]] );

                            if( Array.isArray( val ) ) {
                                if( pathSplit[1] ) {
                                    return val[0] && val[0][pathSplit[1]] && Boolean( unwrap( val[0][pathSplit[1]] ) );
                                }
                                return 0 < val.length;
                            }
                            return 0 === val || Boolean( val );
                        } ) );
                    } );

                    self.availableGnrAdditionalInfos = ko.computed( function() {
                        var
                            u_extra = unwrap( self.u_extra ),
                            completeAdditionalInfoList = self.gnrAdditionalInfo.list(),
                            additionalInfoList = u_extra && u_extra.gnr_zusatzangaben && u_extra.gnr_zusatzangaben[0] && Array.isArray( u_extra.gnr_zusatzangaben[0].liste ) && u_extra.gnr_zusatzangaben[0].liste,
                            additionalInfoListType = u_extra && u_extra.gnr_zusatzangaben && u_extra.gnr_zusatzangaben[0] && u_extra.gnr_zusatzangaben[0].typ;

                        self.gnrAdditionalInfoType( additionalInfoListType || 'AUSWAHL' );

                        if( additionalInfoList ) {

                            return additionalInfoList.map( function( fieldCode ) {
                                var result;
                                completeAdditionalInfoList.some( function( item ) {
                                    if( item.val === fieldCode ) {
                                        result = item;
                                        return true;
                                    }
                                } );

                                return result;
                            } );
                        }

                        return [];
                    } );

                    self.availableGnrAdditionalInfos.subscribe( function( val ) {
                        self.gnrAdditionalInfo( (val || []).map( function( item ) {
                            return item.val;
                        } ) );
                    } );

                    self.gnrAdditionalInfoEntered = ko.computed( function() {
                        var
                            result = true,
                            availableGnrAdditionalInfos = self.availableGnrAdditionalInfos(),
                            gnrAdditionalInfoType = self.gnrAdditionalInfoType();

                        if( availableGnrAdditionalInfos && availableGnrAdditionalInfos.length && gnrAdditionalInfoType ) {
                            result = availableGnrAdditionalInfos['SEQUENZ' === gnrAdditionalInfoType ? 'every' : 'some']( function( item ) {
                                return self.fieldTracker[item.val]();
                            } );
                        }
                        return !result;
                    } );

                },
                getCodeSearchParams: function TreatmentEditorModel_getCodeSearchParams() {
                    var
                        self = this,
                        catalogFile = unwrap( self._catalogFile ),
                        catalogShort = unwrap( self.catalogShort ),
                        locationId = unwrap( self.locationId ), // locationId is only necessary for kv specific EBM catalogs (851)
                        employeeId = unwrap( self.employeeId ),
                        tags = unwrap( self.selectedCatalogTags );

                    if( catalogFile ) {
                        return {
                            itemsPerPage: 20,
                            isASV: self.isASV,
                            query: {
                                term: '',
                                catalogs: [
                                    { filename: catalogFile, short: catalogShort }
                                ],
                                employeeId: self.isASV ? employeeId : null,
                                locationId: locationId,
                                tags: tags
                            },
                            data: {
                                _includeCatalogText: true
                            }
                        };
                    }
                    else {
                        return null;
                    }
                },
                setActivityData: function TreatmentEditorModel_setActivityData( data/*, options */ ) {
                    var
                        self = this;
                    // MOJ-10669: keep catalog flag here
                    if( -1 !== ['GOÄ', 'UVGOÄ', 'GebüH'].indexOf( data.catalogShort ) && typeof data.catalog === 'boolean' && data.catalog === false ) {
                        data.catalogEntry = false;

                    }
                    TreatmentEditorModel.superclass.setActivityData.apply( this, arguments ); // original method
                    self._hasSpecialCostsInfo( data._hasSpecialCostsInfo );
                    self._specialCostsValues( data._specialCostsValues );

                },
                /**
                 * [MOJ-1448] Testing of TREATMENT explanation documentation
                 */
                checkFk5009ForDocumentation: function TreatmentEditorModel_checkFk5009ForDocumentation() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        explanations,
                        insuranceStatus,
                        fk5035Set,
                        messageId;
                    if( ('undefined' !== typeof Y.doccirrus.DCSystemMessages) ) {
                        explanations = currentActivity.explanations();
                        insuranceStatus = currentPatient.insuranceStatus();
                        fk5035Set = currentActivity.fk5035Set();
                        messageId = 'FK5009-046-' + (currentActivity._id || currentActivity._cid);
                        Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                        if( Y.doccirrus.validations.kbv._046( explanations ) && !fk5035Set.length ) {
                            Y.each( insuranceStatus, function( insurance ) {
                                var feeSchedule = insurance.feeSchedule(),
                                    type = insurance.type();
                                // MOJ-14319: [OK] [CASEFOLDER]
                                if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: type} ) ||
                                    Y.doccirrus.schemas.patient.isPrivateInsurance( {type: type} ) ) {
                                    if( '3' !== feeSchedule ) {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            messageId: messageId,
                                            content: 'Der OPS von "Erläuterungen" muss im Feld "Operation > OP-Schlüssel" dokumentiert werden',
                                            level: 'WARNING'
                                        } );
                                    }
                                }
                            } );
                        }
                    }
                }

            }, {
                NAME: 'TreatmentEditorModel'
            }
        );

        KoViewModel.registerConstructor( TreatmentEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedEditorModel',
            'dc-comctl',
            'DCWindow',
            'dcvat',
            'dcinfrastructs',
            'activity-schema',
            'casefolder-schema',
            'person-schema',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'DCSystemMessages',
            'kbv-validations',
            'inCaseUtils',
            'dcerrortable',
            'OmimEditorModel',
            'v_treatment-schema'
        ]
    }
);
