/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'MedicationChEditorModel', function( Y ) {
        /**
         * @module MedicationChEditorModel
         */

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
            i18n = Y.doccirrus.i18n,
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            controlCharsRegExp = Y.doccirrus.regexp.controlChars,
            replaceControlChars = Y.doccirrus.commonutils.replaceControlChars,
            PH_ONLY = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_ONLY' ),
            PH_PRESCRIPTION_ONLY = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_PRESCRIPTION_ONLY' ),
            PH_BTM = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_BTM' ),
            PH_CONTRACEPTIVE = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_CONTRACEPTIVE' ),
            PH_TER = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_TER' ),
            PH_TRANS = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_TRANS' ),
            PH_IMPORT = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_IMPORT' ),
            PH_NEGATIV = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_NEGATIVE' ),
            PH_LIFESTYLE = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_LIFESTYLE' ),
            PH_LIFESTYLE_COND = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_LIFESTYLE_COND' ),
            AMR1 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR1' ),
            AMR3 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR3' ),
            AMR5 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR5' ),
            PH_GBA = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_GBA' ),
            PH_DIS_AGR = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_DIS_AGR' ),
            PH_DIS_AGR_ALT = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_DIS_AGR_ALT' ),
            PH_OTC = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_OTC' ),
            PH_OTX = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_OTX' ),
            PH_ARV = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_ARV' ),
            PH_MED = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_MED' ),
            PH_PRESC_MED = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_PRESC_MED' ),
            PH_CHEAPER_PKG = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_CHEAPER_PKG' ),
            ADDITIONAL_INFO = i18n( 'InCaseMojit.activity_model_clientJS.placeholder.ADDITIONAL_INFO' ),
            ACTIVE_INGREDIENTS = i18n( 'utils_uam_clientJS.placeholder.ACTIVE_INGREDIENTS' ),
            FORM_OF_ADMINISTRATION = i18n( 'InCaseMojit.activity_model_clientJS.placeholder.FORM_OF_ADMINISTRATION' );

        function PhIngrEditorModel( config ) {
            PhIngrEditorModel.superclass.constructor.call( this, config );
        }

        PhIngrEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'code',
                    'name',
                    'strength'
                ],
                lazyAdd: false
            }
        };

        Y.extend( PhIngrEditorModel, SubEditorModel, {
            initializer: function() {
                var
                    self = this;
                self.initPhIngr();
            },
            initPhIngr: function() {
                var
                    self = this;
                self.initSelect2Name();
            },
            initSelect2Name: function() {
                var
                    self = this;
                self.select2Name = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                code = unwrap( self.code ),
                                name = unwrap( self.name );
                            if( !code && !name ) {
                                return null;
                            }
                            return { id: code, name: name };
                        },
                        write: function( $event ) {
                            var
                                name = $event.added && $event.added.name,
                                code = $event.added && $event.added.id;
                            self.name( name );
                            self.code( code );
                            if( name && (name === code) ) {
                                self.code( '' );
                            }
                        }
                    } ) ),
                    placeholder: ACTIVE_INGREDIENTS,
                    select2: {
                        allowClear: true,
                        minimumInputLength: 1,
                        containerCssClass: 'ko-select2-container ko-select2-no-right-border',
                        formatResult: function( query ) {
                            var name = query.name;
                            return '<div class="dc-formatResult" title="' + name + '">' + name + '</div>';
                        },
                        formatSelection: function( query ) {
                            return query.name;
                        },
                        createSearchChoice: function( term ) {
                            if( self.get( 'editorModelParent' ).exactMatch ) {
                                return null;
                            }
                            return { id: term, name: term };
                        },
                        query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {
                            var maxresult = this.maxresult || 10;
                            Y.doccirrus.jsonrpc.api.mmi.getMolecules( {
                                query: {
                                    name: query.term,
                                    maxresult: maxresult
                                }
                            } ).done( function( response ) {
                                    var results = response.data && response.data.MOLECULE.map( function( item ) {
                                            return {
                                                id: item.ID,
                                                name: item.NAME
                                            };
                                        } );
                                    query.callback( {
                                        results: results
                                    } );
                                }
                            )
                                .fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                        }, 750, this )
                    }
                };
            },
            destructor: function() {
            }
        }, {
            NAME: 'PhIngrEditorModel'
        } );
        KoViewModel.registerConstructor( PhIngrEditorModel );

        /**
         * @class MedicationChEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function MedicationChEditorModel( config ) {
            MedicationChEditorModel.superclass.constructor.call( this, config );
        }

        MedicationChEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    'userContent',
                    'catalogShort',
                    'subType',
                    'explanations',
                    'phTer',
                    'phTrans',
                    'phImport',
                    'phNegative',
                    'phLifeStyle',
                    'phLifeStyleCond',
                    'phGBA',
                    'phGBATherapyHintName',
                    'phDisAgr',
                    'phDisAgrAlt',
                    'phMed',
                    'phPrescMed',
                    'phCompany',
                    'phOnly',
                    'phRecipeOnly',
                    'phBTM',
                    'phOTC',
                    'phOTX',
                    'phAMR',
                    'phAMRContent',
                    'phAtc',
                    'phForm',
                    'phPriceSale',
                    'phCheaperPkg',
                    'phNLabel',
                    'phPZN',
                    'phPackSize',
                    'phARV',
                    'phARVContent',
                    'dosis',
                    'hasVat',
                    'vat',
                    'phDosisMorning',
                    'phDosisAfternoon',
                    'phDosisEvening',
                    'phDosisNight',
                    'phDosisType',
                    'phUnit',
                    'phNote',
                    'phReason',
                    'phSelfMedication',
                    'locationId',
                    'employeeId',
                    'subType',
                    'status',
                    'isDispensed',
                    'isArrived',
                    'orderId',
                    'insuranceCode',
                    'paidByInsurance',
                    'supplyCategory',
                    'insuranceDescription',
                    'phGTIN',
                    'prdNo',
                    'phContinuousMed',
                    'phContinuousMedDate',
                    'phSampleMed',
                    'phForeignUnit',
                    'units',
                    'phUnitDescription',
                    'isDivisible',
                    'noLongerValid',
                    'phSalesStatus'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'phIngr',
                        editorName: 'PhIngrEditorModel'
                    } ],
                lazyAdd: false
            }
        };

        Y.extend( MedicationChEditorModel, CatalogTagEditorModel, {
                initializer: function MedicationChEditorModel_initializer() {
                    var
                        self = this;
                    self.initMedicationChEditorModel();
                },
                destructor: function MedicationChEditorModel_destructor() {
                },
                initMedicationChEditorModel: function MedicationChEditorModel_initMedicationChEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseconfiguration = binder.getInitialData( 'incaseconfiguration' ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        phUnitsList;
                    self.hasInStock = Y.doccirrus.auth.hasAdditionalService( 'inStock' );
                    binder.ignoreIsOrdered( false );

                    self.countryMode = unwrap(currentPatient.countryMode);
                    self.allowCustomCodes = Y.doccirrus.auth.isAdmin() ||
                                            !incaseconfiguration.allowCustomCodeFor ||
                                            -1 !== incaseconfiguration.allowCustomCodeFor.indexOf( 'MEDICATION' );
                    self.allowCustomValuesForNoteAndReason = Y.doccirrus.auth.isAdmin() ||
                                                             !incaseconfiguration.allowCustomValueFor ||
                                                             -1 !== incaseconfiguration.allowCustomValueFor.indexOf( 'PRESCRIPTION' );

                    self.placeholderDosisI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DOSIS' );
                    self.placeholderContentTradenameI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CONTENT_TRADENAME' );
                    self.labelNDestinationI18n = i18n( 'InCaseMojit.casefile_detail.label.N_DESIGNATION' );
                    self.placeholderPhNLabelI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.PH_NLABEL' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );
                    self.medicationSearchI18n = i18n( 'InCaseMojit.casefile_detail.button.OPEN_MEDICATION_SEARCH' );
                    self.priceComparisonI18n = i18n( 'InCaseMojit.casefile_detail.button.OPEN_PRICE_COMPARISON' );
                    self.atcNameI18n = i18n( 'InCaseMojit.casefile_detail.label.ATC_NAME' );
                    self.formOfAdministrationI18n = i18n( 'InCaseMojit.casefile_detail.label.FORM_OF_ADMINISTRATION' );
                    self.addInfoI18n = i18n( 'InCaseMojit.casefile_detail.label.ADD_INFO' );
                    self.labelPhDosisI18n = i18n( 'InCaseMojit.casefile_detail.label.PH_DOSIS' );
                    self.labelAliasI18n = i18n( 'InCaseMojit.casefile_detail.label.ALIAS' );
                    self.labelCatalogI18n = i18n( 'InCaseMojit.casefile_detail.label.CATALOG' );
                    self.labelPriceI18n = i18n( 'InCaseMojit.casefile_detail.label.PRICE' );
                    self.placeholderPriceSaleI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DISPLAY_PH_PRICE_SALE' );
                    self.checkboxVatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.VAT' );
                    self.placeholderExplanationsI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.EXPLANATIONS' );
                    self.pznI18n = i18n( 'InCaseMojit.casefile_detail.label.PZN' );
                    self.placeholderPznI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.PH_PZN' );
                    self.gtinI18n = i18n( 'InCaseMojit.casefile_detail.label.GTIN' );
                    self.placeholderGtinI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.PH_GTIN' );
                    self.packSizeI18n = i18n( 'InCaseMojit.casefile_detail.label.PACK_SIZE' );
                    self.placeholderPackSizeI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.PH_PACK_SIZE' );

                    self.groupARMI18n = i18n( 'InCaseMojit.medication_modal.group.AMR' );
                    self.limitationI18n = i18n('InCaseMojit.medication_modal.text.LIMITATION');
                    self.groupARVI18n = i18n( 'InCaseMojit.medication_modal.group.ARV' );


                    self.editMode = ko.observable( false );
                    self.editMode.i18n = i18n( 'InCaseMojit.casefile_detail.checkbox.EDIT_MODE' );
                    self.showEditModeCheckbox = ko.computed( function() {
                        var
                            status = unwrap( self.status );
                        return self.allowCustomCodes && ('CREATED' === status || 'VALID' === status);
                    } );
                    self._vatList = Y.doccirrus.vat.getList();
                    self._locationList = binder.getInitialData( 'location' );
                    self._defaultMappings = Y.doccirrus.KoViewModel.utils.createAsync( {
                        initialValue: null,
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries,
                            params: (function() {
                                return {
                                    query: {
                                        catalogShortNames: [ 'MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT' ]
                                    }
                                };
                            })()
                        },
                        converter: function( response ) {
                            return response.data;
                        },
                        onFail: function( defaultMapping, response ) {
                            switch( response.code ) {
                                case 9000:
                                    defaultMapping.error = response;
                                    return [];
                            }
                        }
                    } );

                    self.exactMatch = false;
                    self._openMedicationSearchEnable = ko.computed( function() {
                        var
                            result = Boolean( unwrap( self._defaultMappings ) && !self.code.readOnly() && Y.doccirrus.auth.hasAdditionalService( "inScribe" ) );
                        self.exactMatch = result;
                        return result;
                    } );

                    self.priceComparisonBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButtonDropDown',
                        componentConfig: {
                            name: 'priceComparisonBtn',
                            title: self.priceComparisonI18n,
                            text: self.priceComparisonI18n,
                            disabled: ko.computed( function() {
                                return !(self._openMedicationSearchEnable() && self.phPZN());
                            } ),
                            menu: {
                                items: [
                                    {
                                        name: 'normalPriceComparisonBtn',
                                        text: 'Alle',
                                        click: function() {
                                            self.openPriceComparison();
                                        }
                                    },
                                    {
                                        name: 'cheaperPriceComparisonBtn',
                                        text: 'Nur rabattierte Produkte',
                                        click: function() {
                                            self.openPriceComparison( {priceComparisonDiscount: true} );
                                        }
                                    }]
                            }
                        }
                    } );

                    self.onBtnMouseOver = function() {
                        self.priceComparisonBtn.openMenu();
                    };


                    self._displayPhPriceSale = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.phPriceSale ) );

                    self.select2IngredientsReadOnly = self.addDisposable( ko.computed( function() {
                        return !unwrap( self.editMode ) || self.phIngr.readOnly();
                    } ) );
                    self._select2AtcCodes = new Y.doccirrus.uam.utils.MedicationATCList( { dataArray: self.phAtc } );
                    self._select2AtcCodes.readOnly = self.addDisposable( ko.computed( function() {
                        return !unwrap( self.editMode ) || self.phAtc.readOnly();
                    } ) );
                    self._medsReadOnly = ko.observable( true );

                    self.flagsMap = MedicationChEditorModel.flagsMap;
                    (function() {
                        self._select2AdditionalInfo = {
                            data: self.addDisposable( ko.computed( {
                                read: function() {
                                    return MedicationChEditorModel.getAdditionalInfo( self );
                                },
                                write: function( $event ) {
                                    if( Y.Object.owns( $event, 'added' ) ) {
                                        if( 'phAMR' === $event.added.origin ) {
                                            self.phAMR.push( $event.added.id );
                                        } else {
                                            self[ $event.added.origin ]( true );
                                        }
                                    }
                                    if( Y.Object.owns( $event, 'removed' ) ) {

                                        if( 'phAMR' === $event.removed.origin ) {
                                            self.phAMR.remove( $event.removed.id );
                                        } else {
                                            self[ $event.removed.origin ]( false );
                                        }
                                    }

                                }
                            } ) ),
                            placeholder: ko.observable( ADDITIONAL_INFO ),
                            select2: {
                                formatSelection: function( query ) {
                                    if( query.id === 'phGBA' && peek( self.phGBATherapyHintName ) ) {
                                        // TODO: MOJ-12106 click event is prevented by select2 only double click -> open works atm
                                        return ['<a href="mmi-download/TH/', peek( self.phGBATherapyHintName ), '">', query.text, '</a>'].join( '' );
                                    }
                                    return query.text;
                                },
                                multiple: true,
                                data: function() {
                                    return {
                                        results: self.flagsMap
                                    };
                                }
                            }
                        };
                        self._select2AdditionalInfo.readOnly = self.addDisposable( ko.computed( function() {
                            return !unwrap( self.editMode ) || self.phAMR.readOnly();
                        } ) );
                    })();
                    (function() {
                        self._select2Format = {
                            val: self.addDisposable( ko.computed( {
                                read: function() {
                                    var phForm = unwrap( self.phForm );
                                    return phForm;
                                },
                                write: function( $event ) {
                                    self.phForm( $event.val );
                                }
                            } ) ),
                            placeholder: ko.observable( FORM_OF_ADMINISTRATION ),
                            select2: {
                                minimumInputLength: 1,
                                allowClear: true,
                                initSelection: function( element, callback ) {
                                    var data = { id: element.val(), text: element.val() };
                                    callback( data );
                                },
                                query: function( query ) {
                                    var results = [],
                                        defaultMappings = self._defaultMappings();
                                    if( defaultMappings && defaultMappings.PHARMFORM && defaultMappings.PHARMFORM.CATALOGENTRY ) {
                                        defaultMappings.PHARMFORM.CATALOGENTRY.forEach( function( formatEntry ) {

                                            if( -1 !== formatEntry.NAME.indexOf( query.term ) ) {
                                                results.push( {
                                                    id: formatEntry.NAME,
                                                    text: formatEntry.NAME
                                                } );
                                            }
                                        } );
                                        query.callback( { results: results } );
                                    } else {
                                        query.callback( {
                                            results: [
                                                {
                                                    id: query.term,
                                                    text: query.term
                                                }
                                            ]
                                        } );
                                    }
                                }
                            }
                        };
                        self._select2Format.readOnly = self.addDisposable( ko.computed( function() {
                            return !unwrap( self.editMode ) || self.phForm.readOnly();
                        } ) );
                    })();

                    self._openMedicationSearch = function() {
                        var
                            defaultMappings = self._defaultMappings();
                        if( self._defaultMappings && self._defaultMappings.error ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                window: {
                                    manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                                    width: 'large'
                                },
                                message: self._defaultMappings.error.data
                            } );

                            return;
                        }
                        Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                                activity: self,
                                patient: currentPatient
                            }, function( err, selected ) {
                                if( err ) {
                                    return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                }

                                if( selected && selected.package && selected.package.originalData && selected.product &&
                                    selected.product.originalData ) {

                                    self.setActivityData( {
                                        code: '',
                                        catalogShort: self.catalogShort.peek(),
                                        title: selected.product.originalData.title,
                                        phTer: selected.product.originalData.phTer,
                                        phTrans: selected.product.originalData.phTrans,
                                        phImport: selected.product.originalData.phImport,
                                        phNegative: selected.product.originalData.phNegative,
                                        phLifeStyle: selected.product.originalData.phLifeStyle,
                                        phLifeStyleCond: selected.product.originalData.phLifeStyleCond,
                                        phGBA: selected.product.originalData.phGBA,
                                        phGBATherapyHintName: selected.product.originalData.phGBATherapyHintName,
                                        phDisAgr: selected.product.originalData.phDisAgr,
                                        phDisAgrAlt: selected.product.originalData.phDisAgrAlt,
                                        phMed: selected.product.originalData.phMed,
                                        phPrescMed: selected.product.originalData.phPrescMed,
                                        phCompany: selected.product.originalData.phCompany,
                                        phOnly: selected.product.originalData.phOnly,
                                        phRecipeOnly: selected.product.originalData.phRecipeOnly,
                                        phBTM: selected.product.originalData.phBTM,
                                        phOTC: selected.product.originalData.phOTC,
                                        phOTX: selected.product.originalData.phOTX,
                                        phAMR: selected.product.originalData.phAMR,
                                        phAMRContent: selected.product.AMRInfo,
                                        phAtc: selected.product.originalData.phAtc,
                                        phIngr: selected.product.originalData.phIngr,
                                        phForm: selected.product.originalData.phForm,
                                        phFormCode: selected.package.originalData.phFormCode,

                                        phPriceSale: selected.package.originalData.phPriceSale,
                                        phCheaperPkg: selected.package.originalData.phCheaperPkg,

                                        phNLabel: selected.package.originalData.phNLabel,

                                        phPZN: selected.package.originalData.phPZN,
                                        phSalesStatus: selected.package.originalData.phSalesStatus,
                                        phPackSize: selected.package.originalData.phPackSize,
                                        phARV: selected.package.originalData.phARV,
                                        phARVContent: selected.package.originalData.phARVText,
                                        prdNo: selected.package.originalData.prdNo,
                                        insuranceCode: selected.package.originalData.insuranceCode,
                                        paidByInsurance: selected.package.originalData.paidByInsurance,
                                        supplyCategory: selected.package.originalData.supplyCategory,
                                        insuranceDescription: selected.package.originalData.insuranceDescription,
                                        phGTIN: selected.package.originalData.phGTIN,
                                        isDivisible: selected.package.originalData.isDivisible
                                    } );
                                }
                            }
                        );
                    };

                    self.openPriceComparison = function( options ) {
                        Y.doccirrus.modals.MedicationPriceComparison.show( Object.assign( {
                            pzn: unwrap( self.phPZN ),
                            patient: currentPatient,
                            _defaultMappings: self._defaultMappings()
                        }, options || {} ) );
                    };

                    self.phDosisTypes = Y.doccirrus.schemas.activity.types.PhDosisType_E.list;
                    self.showPhDosisSchedule = ko.computed( function() {
                        var
                            phDosisType = unwrap( self.phDosisType );
                        return phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.SCHEDULE;
                    } );
                    self.showPhDosisText = ko.computed( function() {
                        var
                            phDosisType = unwrap( self.phDosisType );
                        return phDosisType === Y.doccirrus.schemas.activity.phDosisTypes.TEXT;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var dosis = self.dosis();

                        if( controlCharsRegExp.test( dosis )  ) {
                            dosis = replaceControlChars( dosis );
                             self.dosis( dosis );
                        }
                        return;
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var phNote = self.phNote();

                        if( controlCharsRegExp.test( phNote )  ) {
                            phNote = replaceControlChars( phNote );
                            self.phNote( phNote );
                        }
                        return;
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var phUnit = self.phUnit();

                        if( controlCharsRegExp.test( phUnit )  ) {
                            phUnit = replaceControlChars( phUnit );
                            self.phUnit( phUnit );
                        }
                        return;
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var phReason = self.phReason();

                        if( controlCharsRegExp.test( phReason )  ) {
                            phReason = replaceControlChars( phReason );
                            self.phReason( phReason );
                        }
                        return;
                    } ) );

                    self.select2Dosis = {
                        val: ko.computed( {
                            read: function() {
                                return self.dosis();
                            },
                            write: function( $event ) {
                                self.dosis( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.DOSIS' ),
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = { id: element.val(), text: element.val() };
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.DOSE,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: { title: 1 }
                                    },
                                    fields: { title: 1 }
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return { id: item.title, text: item.title };
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    self.select2PhNote = {
                        val: ko.computed( {
                            read: function() {
                                return self.phNote();
                            },
                            write: function( $event ) {
                                self.phNote( $event.val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = { id: element.val(), text: element.val() };
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.PHNOTE,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: { title: 1 }
                                    },
                                    fields: { title: 1 }
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return { id: item.title, text: item.title };
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    self.select2PhReason = {
                        val: ko.computed( {
                            read: function() {
                                return self.phReason();
                            },
                            write: function( $event ) {
                                self.phReason( $event.val );
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            quietMillis: 700,
                            multiple: false,
                            initSelection: function( element, callback ) {
                                var data = { id: element.val(), text: element.val() };
                                callback( data );
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.PHREASON,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15,
                                        sort: { title: 1 }
                                    },
                                    fields: { title: 1 }
                                } ).done( function( response ) {
                                    query.callback( {
                                        results: (response && response.data && response.data.map( function( item ) {
                                            return { id: item.title, text: item.title };
                                        } )) || []
                                    } );
                                } ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };

                    if( self.allowCustomValuesForNoteAndReason ) {
                        self.select2PhNote.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };

                        self.select2PhReason.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };
                        self.select2Dosis.select2.createSearchChoice = function( term ) {
                            return {
                                id: term,
                                text: term
                            };
                        };
                    }

                    //  used for inserting text fragments from documentation tree
                    self.explanations.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

                    if (!unwrap(self.isArrived)) {
                        Y.doccirrus.jsonrpc.api.instockrequest.getWares( {
                            query: {
                                $and: [
                                    {
                                        phPZN: unwrap( self.phPZN )
                                    },
                                    {
                                        locationId: unwrap( self.locationId )
                                    },
                                    {
                                        quantity: {$ne: 0}
                                    }
                                ]
                            }
                        } ).done( function( result ) {
                            if(result.data.length) {
                                binder.ignoreIsOrdered( true );
                            } else {
                                binder.ignoreIsOrdered( false );
                            }
                        } ).fail( function(err) {
                           Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        });
                    }

                    phUnitsList = [];
                    self.addDisposable( ko.computed( function() {
                        var units = unwrap( self.units() ) || [];
                        if( units.length === 0 && unwrap( self.phUnit ) && unwrap( self.phUnitDescription ) ) {
                            units.push( {
                                phUnit: unwrap( self.phUnit ),
                                phUnitDescription: unwrap( self.phUnitDescription )
                            } );
                        }
                        phUnitsList = units.map( function( unit ) {
                            return {
                                id: unit.phUnit,
                                text: unit.phUnitDescription
                            };
                        } );
                    } ) );

                    self.select2phUnit = {
                        val: self.addDisposable( ko.computed( {
                            read: function( value ) {
                                if( !value ) {
                                    return unwrap( self.phForeignUnit );
                                }

                                return {
                                    text: value
                                };
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.phForeignUnit( $event.added.id );
                                } else if( $event.removed ) {
                                    self.phForeignUnit( "" );
                                }
                            }
                        } ) ),

                        select2: {
                            allowClear: true,
                            required: true,
                            placeholder: '',
                            initSelection: function( element, callback ) {
                                self.addDisposable( ko.computed( function() {
                                    var phForeignUnit = unwrap( self.phForeignUnit );
                                    var unitsList = unwrap(self.units);
                                    if( !phForeignUnit || ! unitsList) {
                                        return callback( null );
                                    }

                                    var foreignUnit = unwrap(self.units).find(function( unit ) {
                                       return unit.phUnit === phForeignUnit;
                                    });

                                    if (foreignUnit) {
                                       return callback( {id: unwrap( self.phForeignUnit), text: foreignUnit.phUnitDescription});
                                    }

                                    return callback( null );
                                } ) );
                            },
                            data: function() {
                                return {results: phUnitsList};
                            }
                        }
                    };

                    self.medDatePickerOptions = {
                        buttons: ['monthsButtons'], // custom option to pass some own type of buttons which should be defined in ko-bindingHandlers.client.js
                        maxDate: moment().endOf( 'd' ).add( 6, 'month' )
                    };
                },
                addPhIngr: function() {
                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.addPhIngr();
                },
                removePhIngr: function( data ) {
                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    currentActivity.removePhIngr( data.get( 'dataModelParent' ) );
                }
            }, {
                NAME: 'MedicationChEditorModel',
                getAdditionalInfo: function( data ) {
                    var AMR = unwrap( data.phAMR ),
                        flags = {
                            phOnly: unwrap( data.phOnly ),
                            phRecipeOnly: unwrap( data.phRecipeOnly ),
                            phBTM: unwrap( data.phBTM ),
                            phTer: unwrap( data.phTer ),
                            phTrans: unwrap( data.phTrans ),
                            phImport: unwrap( data.phImport ),
                            phNegative: unwrap( data.phNegative ),
                            phLifeStyle: unwrap( data.phLifeStyle ),
                            phLifeStyleCond: unwrap( data.phLifeStyleCond ),
                            amr1: false,
                            amr3: false,
                            amr5: false,
                            phGBA: unwrap( data.phGBA ),
                            phDisAgr: unwrap( data.phDisAgr ),
                            phDisAgrAlt: unwrap( data.phDisAgrAlt ),
                            phOTC: unwrap( data.phOTC ),
                            phOTX: unwrap( data.phOTX ),
                            phARV: unwrap( data.phARV ),
                            phMed: unwrap( data.phMed ),
                            phPrescMed: unwrap( data.phPrescMed ),
                            phCheaperPkg: unwrap( data.phCheaperPkg )
                        },
                        result = [];
                    AMR.forEach( function( amr ) {
                        switch( amr ) {
                            case 'amr1':
                                flags.amr1 = true;
                                break;
                            case 'amr3':
                                flags.amr3 = true;
                                break;
                            case 'amr5':
                                flags.amr5 = true;
                                break;
                        }
                    } );
                    MedicationChEditorModel.flagsMap.forEach( function( flag ) {
                        if( flags[ flag.id ] ) {
                            result.push( flag );
                        }
                    } );
                    return result;
                },
                flagsMap: [
                    { id: 'phOnly', text: PH_ONLY, origin: 'phOnly' },
                    { id: 'phRecipeOnly', text: PH_PRESCRIPTION_ONLY, origin: 'phRecipeOnly' },
                    { id: 'phBTM', text: PH_BTM, origin: 'phBTM' },
                    { id: 'phContraceptive', text: PH_CONTRACEPTIVE, origin: 'phContraceptive' },
                    { id: 'phTer', text: PH_TER, origin: 'phTer' },
                    { id: 'phTrans', text: PH_TRANS, origin: 'phTrans' },
                    { id: 'phImport', text: PH_IMPORT, origin: 'phImport' },
                    { id: 'phNegative', text: PH_NEGATIV, origin: 'phNegative' },
                    { id: 'phLifeStyle', text: PH_LIFESTYLE, origin: 'phLifeStyle' },
                    { id: 'phLifeStyleCond', text: PH_LIFESTYLE_COND, origin: 'phLifeStyleCond' },
                    { id: 'amr1', text: AMR1, origin: 'phAMR' },
                    { id: 'amr3', text: AMR3, origin: 'phAMR' },
                    { id: 'amr5', text: AMR5, origin: 'phAMR' },
                    { id: 'phGBA', text: PH_GBA, origin: 'phGBA' },
                    { id: 'phDisAgr', text: PH_DIS_AGR, origin: 'phDisAgr' },
                    { id: 'phDisAgrAlt', text: PH_DIS_AGR_ALT, origin: 'phDisAgrAlt' },
                    { id: 'phOTC', text: PH_OTC, origin: 'phOTC' },
                    { id: 'phOTX', text: PH_OTX, origin: 'phOTX' },
                    { id: 'phARV', text: PH_ARV, origin: 'phARV' },
                    { id: 'phMed', text: PH_MED, origin: 'phMed' },
                    { id: 'phPrescMed', text: PH_PRESC_MED, origin: 'phMed' },
                    { id: 'phCheaperPkg', text: PH_CHEAPER_PKG, origin: 'phCheaperPkg' }
                ]
            }
        );

        KoViewModel.registerConstructor( MedicationChEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SubEditorModel',
            'CatalogBasedEditorModel',
            'dcvat',
            'dc-comctl',
            'dcregexp',
            'dccommonutils',
            'dcmedicationmodal',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'MedicationPriceComparison-modal'
        ]
    }
);
