/**
 * User: oliversieweke
 * Date: 19.11.18  13:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, _ */

'use strict';

YUI.add( 'TreatmentChEditorModel', function( Y, NAME ) {
        /**
         * @module TreatmentChEditorModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        function fail( error ) {
            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
        }

        function noDignities( codesList ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: i18n( 'InCaseMojit.messages.dignitiesMessage' ) + '<br/><br/>' + codesList,
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        }

        /**
         * @class TreatmentChEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function TreatmentChEditorModel( config ) {
            TreatmentChEditorModel.superclass.constructor.call( this, config );
        }

        TreatmentChEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    // Taken over from TREATMENT D
                    'code',
                    'status',
                    'userContent',
                    'explanations',
                    'numberOfCopies',

                    'countryMode',
                    'timestamp',
                    'price',
                    'unit',
                    'actualPrice',
                    'displayPrice',
                    'locationId',
                    'employeeId',
                    'hasVat',
                    'vat',
                    'areTreatmentDiagnosesBillable',
                    'actualUnit',
                    'catalog',
                    // CH spec,ific
                    'treatmentCategory',
                    'hierarchyRules',
                    'divisionCode',
                    'divisionText',
                    'anaesthesiaCode',
                    'anaesthesiaText',
                    'medicalText',
                    'technicalText',
                    'medicalTaxPoints',
                    'technicalTaxPoints',
                    'assistanceTaxPoints',
                    'medicalScalingFactor',
                    'technicalScalingFactor',
                    'treatmentTime',
                    'preparationAndFollowUpTime',
                    'reportTime',
                    'roomOccupancyTime',
                    'rotationTime',
                    'assistanceQuantity',
                    'benefitsCode',
                    'benefitsText',
                    'billingRole',
                    'treatmentTypeCh',
                    'sideMandatory',
                    'side',
                    'taxPoints',
                    'tariffType'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( TreatmentChEditorModel, CatalogTagEditorModel, {
                initializer: function TreatmentChEditorModel_initializer() {
                    var
                        self = this;
                    self.initTreatmentChEditorModel();
                },
                destructor: function TreatmentChEditorModel_destructor() {},
                initTreatmentChEditorModel: function TreatmentChEditorModel_initTreatmentChEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    // TAKEN OVER FROM D TREATMENT ---------------------------------------------------------------------
                    self.catalogTextI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CATALOG_TEXT' );
                    self.contentServiceI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CONTENT_SERVICE' );
                    self.SD4ExplanationsI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.SD4EXPLANATIONS' );
                    self.numberOfCopiesI18n = i18n( 'InCaseMojit.casefile_detail.label.NUMBER_OF_COPIES' );
                    self.labelCodeI18n = i18n( 'InCaseMojit.casefile_detail.label.CODE' );
                    self.displayPriceI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DISPLAY_PRICE' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );
                    self.vatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.VAT' );
                    self.labelNetI18n = i18n( 'InCaseMojit.casefile_detail.label.NET' );
                    self.displayPriceI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DISPLAY_PRICE' );
                    self.labelGrossI18n = i18n( 'InCaseMojit.casefile_detail.label.GROSS' );
                    self.useCatalogPriceI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.USE_CATALOG_PRICE' );
                    self.useCatalogInfoI18n = i18n( 'InCaseMojit.casefile_detail.text.USE_CATALOG_INFO' );
                    self.bilableI18n = i18n( 'InCaseMojit.casefile_detail.label.BILLABLE' );
                    self.checkboxYesI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.YES' );
                    self.checkboxNoI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.NO' );
                    // CH SPECIFIC -------------------------------------------------------------------------------------
                    self.medicalTextI18n = i18n( 'activity-schema.Treatment_CH_T.medicalText.i18n' );
                    self.technicalTextI18n = i18n( 'activity-schema.Treatment_CH_T.technicalText.i18n' );
                    self.technicalTextI18n = i18n( 'activity-schema.Treatment_CH_T.technicalText.i18n' );
                    self.taxPointsI18n = i18n( 'InCaseMojit.casefile_detail.group.TAX_POINTS' );
                    self.medicalTaxPointsI18n = i18n( 'activity-schema.Treatment_CH_T.medicalTaxPoints.i18n' );
                    self.technicalTaxPointsI18n = i18n( 'activity-schema.Treatment_CH_T.technicalTaxPoints.i18n' );
                    self.assistanceTaxPointsI18n = i18n( 'activity-schema.Treatment_CH_T.assistanceTaxPoints.i18n' );
                    self.scalingFactorI18n = i18n( 'InCaseMojit.casefile_detail.label.SCALING_FACTOR' );
                    self.timeI18n = i18n( 'InCaseMojit.casefile_detail.group.TIME' );
                    self.treatmentTimeI18n = i18n( 'activity-schema.Treatment_CH_T.treatmentTime.i18n' );
                    self.preparationAndFollowUpTimeI18n = i18n( 'activity-schema.Treatment_CH_T.preparationAndFollowUpTime.i18n' );
                    self.reportTimeI18n = i18n( 'activity-schema.Treatment_CH_T.reportTime.i18n' );
                    self.roomOccupancyTimeI18n = i18n( 'activity-schema.Treatment_CH_T.roomOccupancyTime.i18n' );
                    self.rotationTimeI18n = i18n( 'activity-schema.Treatment_CH_T.rotationTime.i18n' );
                    self.assistanceI18n = i18n( 'InCaseMojit.casefile_detail.group.ASSISTANCE' );
                    self.assistanceQuantityI18n = i18n( 'activity-schema.Treatment_CH_T.assistanceQuantity.i18n' );
                    self.anaesthesiaI18n = i18n( 'InCaseMojit.casefile_detail.group.ANAESTHESIA' );
                    self.benefitsI18n = i18n( 'InCaseMojit.casefile_detail.group.BENEFITS' );
                    self.billingRoleI18n = i18n( 'InCaseMojit.casefile_detail.group.BILLING_ROLE' );
                    self.treatmentTypeChI18n = i18n( 'InCaseMojit.casefile_detail.group.TREATMENT_TYPE' );
                    self.sideI18n = i18n( 'InCaseMojit.casefile_detail.group.SIDE' );
                    self.pleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );

                    self.firstLoad = true;
                    self.firstPriceCalculation = true;

                    self.hasImagingDevice = false;

                    self.code.subscribe( function() { // In case 'sideMandatory' changes for new treatment
                        self.side.validate();
                    } );

                    self.showSelectCategory = ko.computed( function() {
                        if( 'Zuschlagsleistung' === unwrap( self.treatmentCategory ) || 'Referenzleistung' === unwrap( self.treatmentCategory ) ) {
                            return 'Hauptleistung';
                        } else if( 'Hauptleistung' === unwrap( self.treatmentCategory ) ) {
                            return 'Zuschlagsleistung';
                        } else {
                            return unwrap( self.treatmentCategory );
                        }
                    });

                    self.side.hasError.subscribe( function( newValue ) { // This is to show the side field if it becomes invalid
                        if( newValue === true ) {
                            jQuery( '#textform-panel-body-side' ).collapse( 'show' );
                        }
                    } );

                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );
                    self.userContent.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };
                    self.explanations.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };
                    self.canOverrideCatalogFlag = ko.computed( function() {
                        var code = unwrap( self.code ),
                            catalogShort = unwrap( self.catalogShort );

                        return !['TARMED', 'TARMED_UVG_IVG_MVG', 'EAL'].includes( catalogShort ) && self.isUserAdmin && code;
                    } );
                    self.tarmedCatalog = ko.computed( function() {
                        var catalogShort = unwrap( self.catalogShort ),
                            catalog = unwrap( self.catalog );
                        return catalog && ('TARMED' === catalogShort || 'TARMED_UVG_IVG_MVG' === catalogShort);
                    } );
                    self.priceExplainString = ko.observable( '' );

                    self._PriceReadOnly = ko.computed( function() {
                        var
                            readOnly = unwrap( self.price.readOnly ),
                            codeExists = unwrap( self.catalog ),
                            catalogShort = unwrap( self.catalogShort );
                        return readOnly || (codeExists && ('EAL' === catalogShort || 'TARMED' === catalogShort || 'TARMED_UVG_IVG_MVG'  === catalogShort));
                    } );
                    self.isEAL = ko.computed( function() {
                        var catalogShort = unwrap( self.catalogShort );
                        return 'EAL' === catalogShort;
                    } );
                    /**
                     * Price entering computed
                     * - reads price number and converts to string
                     * - writes price converted from string to number
                     */
                    self.displayPrice = ko.computed( {
                        read: function() {
                            var
                                price = unwrap( self.price ),
                                priceStr = Y.doccirrus.comctl.numberToLocalString( price );
                            return priceStr;
                        },
                        write: function( value ) {
                            self.price( Y.doccirrus.comctl.localStringToNumber( value ) );
                        }
                    } );

                    self.vatList = Y.doccirrus.vat.getList();

                    /**
                     * Gross entering computed
                     * - reads price as gross
                     * - writes net from gross to price
                     */
                    self.displayGross = ko.computed( {
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

                            self.displayPrice( Y.doccirrus.comctl.numberToLocalString( net ) );
                        }
                    } );

                    self.checkedAll = ko.computed( {
                        read: function() {
                            // Get selected when dependent children are selected
                            var someSelected = false,
                                hierarchyRules = unwrap( self.hierarchyRules );
                            if( hierarchyRules ) {
                                hierarchyRules.forEach( function( rule ) {
                                    if( rule.checked() ) {
                                        someSelected = true;
                                    }
                                } );
                            }
                            return someSelected;
                        },
                        write: function( newState ) {
                            var hierarchyRules = self.hierarchyRules();
                            if( hierarchyRules ) {
                                hierarchyRules.forEach( function( rule ) {
                                    if( !rule.disabled() ){
                                        rule.checked( newState );
                                    }
                                } );
                            }
                        }
                    } );


                    Promise.resolve( Y.doccirrus.jsonrpc.api.invoiceconfiguration.read() )
                        .then( function( result ) {
                            var invoiceConfigurations = result && result.data && result.data[0] || {},
                                tarmedTaxPointValues = invoiceConfigurations.tarmedTaxPointValues || [],
                                invoiceFactorValues = invoiceConfigurations.tarmedInvoiceFactorValues || [],
                                tarmedScalingFactors = {
                                    taxPointValues: tarmedTaxPointValues,
                                    invoiceFactorValues: invoiceFactorValues
                                };

                            if( !tarmedTaxPointValues ) {
                                return Y.log( 'Could not find tarmedTaxPointValues', 'error', NAME );
                            }

                            self.hasImagingDevice = invoiceConfigurations.hasImagingDevice || false;

                            self.initReCalculatePriceOnCodeChange( tarmedScalingFactors );
                        } )
                        .catch( function( err ) {
                            return Y.log( 'Error in getting invoiceConfigurations ' + ( err && err.stack || err ), 'error', NAME );
                        } );

                    self.addDisposable( ko.computed( function() {
                        var
                            treatmentCategory = unwrap( self.treatmentCategory ),
                            code = unwrap( self.code );
                        if( !self.firstLoad || self.isNew() ) {
                            if( ( 'Hauptleistung' === treatmentCategory || 'Zuschlagsleistung' === treatmentCategory || 'Referenzleistung' === treatmentCategory ) && code ) {
                                self.loadRelatedCodes( code, treatmentCategory );
                            } else {
                                self.hierarchyRules( [] );
                            }
                        } else {
                            self.firstLoad = true;
                        }
                    }));

                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code ),
                            u_extra = unwrap( self.u_extra ),
                            qualDignities = u_extra && u_extra.dignityRules && u_extra.dignityRules.qualDignity,
                            dignitiesCodes = ( qualDignities || [] ).map( function( i ) {
                                return i.code;
                            }),
                            messageString = '';
                        if( ( self.isModified() || self.isNew() ) && dignitiesCodes.length && code ) {
                            self.loadEmployeeProfile()
                                .then( function( data ) {
                                  var dignities = data && data.qualiDignities || [],
                                    hasDignity;
                                  if( !dignities.length ) {
                                      self.code( undefined );
                                      self.userContent( undefined );
                                      ( dignitiesCodes || [] ).forEach( function( i ) {
                                          messageString += code + ' : ' + i + '<br/>';
                                      });
                                      noDignities( messageString );
                                      return;
                                  }

                                  hasDignity = dignitiesCodes.some( function( i ) {
                                      return -1 !== dignities.indexOf( i );
                                  });

                                  if( !hasDignity ) {
                                      self.code( undefined );
                                      self.userContent( undefined );
                                      ( dignitiesCodes || [] ).forEach( function( i ) {
                                          if( -1 === dignities.indexOf( i ) ) {
                                              messageString += code + ' : ' + i + '<br/>';
                                          }
                                      });
                                      noDignities( messageString );
                                      return;
                                  }
                                });
                        }
                    })).extend( { rateLimit: 200 } );
                },
                loadEmployeeProfile: function() {
                    var
                        self = this,
                        profileId = unwrap( self.employeeId );
                    if ( !profileId ) {
                        return Promise.resolve();
                    }
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api.employee
                            .read( {query: {_id: profileId}} )
                            .done( function( response ) {
                                var employeeProfile = ( response.data && response.data[0] ) ? response.data[0] : response;
                                resolve( employeeProfile );
                            } )
                            .fail(function( err ) {
                                reject( err );
                            } );
                    } );

                },
                getCodeSearchParams: function treatmentChEditorModel_getCodeSearchParams() {
                    var
                        self = this,
                        catalogFile = unwrap( self._catalogFile ),
                        catalogShort = unwrap( self.catalogShort ),
                        tags = unwrap( self.selectedCatalogTags );

                    if( catalogFile ) {
                        return {
                            itemsPerPage: 20,
                            query: {
                                term: '',
                                catalogs: [ {filename: catalogFile, short: catalogShort} ],
                                tags: tags,
                                locationId: unwrap( self.locationId ),
                                employeeId: unwrap( self.employeeId )
                            },
                            data: { _includeCatalogText: true }
                        };
                    } else {
                        return null;
                    }
                },

                initReCalculatePriceOnCodeChange: function TreatmentChEditorModel_initReCalculatePriceOnCodeChange( tarmedScalingFactors ) {
                    var
                        self = this,
                        currentPatient = self.get( 'currentPatient' )(),
                        currentCaseFolderType = currentPatient.caseFolderCollection.getActiveTab().type, // eslint-disable-line
                        insuranceStatus = currentPatient.insuranceStatus(),
                        insurance = insuranceStatus.find( function( insurance ) {
                            return insurance.type() === currentCaseFolderType;
                        } ),
                        insuranceGLN = insurance && insurance.insuranceGLN(),

                        calculatePrice = self.calculatePriceFactory( {
                            tarmedScalingFactors: tarmedScalingFactors,
                            currentCaseFolderType: currentCaseFolderType,
                            insuranceGLN: insuranceGLN
                        } );

                    /* subscribe 'calculate price' when code changes */
                    self.addDisposable( ko.computed( function() {
                        unwrap( self.code );
                        unwrap( self.medicalScalingFactor );
                        calculatePrice();
                    } ) );
                },

                calculatePriceFactory: function TreatmentChEditorModel_calculatePriceFactory( args ) {
                    var
                        self = this,
                        tarmedScalingFactors = args.tarmedScalingFactors,
                        currentCaseFolderType = args.currentCaseFolderType,
                        insuranceGLN = args.insuranceGLN;

                    return function TreatmentChEditorModel_calculatePrice() {
                        var
                            date = ko.unwrap( self.timestamp ),
                            locationId = ko.unwrap( self.locationId ),
                            currentActivity = unwrap( self.get( 'currentActivity' ) ),
                            currentEmployee,
                            qualiDignities,
                            currentTreatment,
                            catalogShort = ko.unwrap( self.catalogShort ),
                            catalog = ko.unwrap( self.catalog ),
                            taxPoints = ko.unwrap( self.taxPoints ),
                            promise = new Promise( function( resolve, reject ) {
                                if( !currentActivity ) {
                                    return resolve();
                                }
                                currentEmployee = ko.unwrap( currentActivity.employee );
                                qualiDignities = (currentEmployee || {}).qualiDignities;

                                if( !Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.includes( catalogShort ) || !tarmedScalingFactors.invoiceFactorValues || !tarmedScalingFactors.invoiceFactorValues.length ) {
                                    return resolve();
                                }

                                Y.doccirrus.jsonrpc.api.activity.calculateActivityMedicalScalingFactor( {
                                    activityData: currentActivity.toJSON(),
                                    tarmedInvoiceFactorValues: tarmedScalingFactors.invoiceFactorValues,
                                    employeeDignities: qualiDignities,
                                    caseFolderType: currentCaseFolderType
                                } ).done( function( result ) {
                                    var newMedicalScalingFactor = result.data || 1;
                                    self.medicalScalingFactor( newMedicalScalingFactor );
                                    return resolve();
                                } ).fail( reject );
                            } );

                        promise.then( function() {
                            currentTreatment = {
                                medicalTaxPoints: ko.unwrap( self.medicalTaxPoints ),
                                technicalTaxPoints: ko.unwrap( self.technicalTaxPoints ),
                                assistanceTaxPoints: ko.unwrap( self.assistanceTaxPoints ),
                                medicalScalingFactor: ko.unwrap( self.medicalScalingFactor ),
                                technicalScalingFactor: ko.unwrap( self.technicalScalingFactor ),
                                timestamp: date
                            };
                            Promise.resolve( Y.doccirrus.jsonrpc.api.location.read( {
                                query: {
                                    _id: locationId
                                },
                                options: {
                                    limit: 1
                                }
                            } ) )
                                .then( function( result ) {
                                    var cantonCode = Y.doccirrus.commonutils.getObject( 'data.0.cantonCode', result ),
                                        price;

                                    if( !cantonCode ) {
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'error',
                                            message: i18n( 'InCaseMojit.messages.cantonMissing' ),
                                            window: {
                                                width: Y.doccirrus.DCWindow.SIZE_SMALL
                                            }
                                        } );
                                        self.price( 0 );
                                        return;
                                    }

                                    try {
                                        price = 0;
                                        // if no catalog not need to recalculate
                                        if( catalog && unwrap( self.isModified ) ) {
                                            if( -1 !== ['EAL', 'MIGEL', 'ARZT_KVG_VVG', 'Pandemieleistungen', 'AMV'].indexOf( catalogShort ) ) {
                                                price = Y.doccirrus.commonutilsCh.calculateNonTarmedPrice( {
                                                    taxPoints: taxPoints
                                                } );
                                            } else if (catalogShort === 'TARMED' || catalogShort === 'TARMED_UVG_IVG_MVG' ){
                                                // when changing this function please see its use in activity-api _addSwissTreatmentPrice
                                                price = Y.doccirrus.commonutilsCh.calculateTarmedPrice( {
                                                    tarmedScalingFactors: tarmedScalingFactors,
                                                    caseFolderType: currentCaseFolderType,
                                                    cantonCode: cantonCode,
                                                    insuranceGLN: insuranceGLN,
                                                    treatment: currentTreatment
                                                } );
                                            }
                                            self.price( price );
                                            if( self.tariffType() ) {
                                                self.tariffType( '' );
                                            }
                                        } else if( !catalog ) {
                                            self.tariffType( '999' );
                                        }
                                        if( currentCaseFolderType ) {
                                            self.explainPrice( {
                                                caseFolderType: currentCaseFolderType,
                                                date: date,
                                                cantonCode: cantonCode,
                                                tarmedTaxPointValues: tarmedScalingFactors.taxPointValues
                                            } );
                                        }
                                        if( self.firstPriceCalculation && currentActivity ) {
                                            currentActivity.setNotModified();
                                            self.firstPriceCalculation = false;
                                        }
                                    } catch( err ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                        Y.log( 'initPriceCalculation(): Could not calculate price.', 'error', NAME );
                                        self.price( 0 );
                                    }
                                } )
                                .catch( function( err ) {
                                    Y.log( 'initPriceCalculation(): Error in getting location ${locationId}: ' + (err && err.stack || err), 'error', NAME );
                                    self.price( 0 );
                                } );
                        } ).catch( function( err ) {
                            Y.log( 'initPriceCalculation(): Error in getting location ${locationId}: ' + (err && err.stack || err), 'error', NAME );
                            self.price( 0 );
                        } );
                    };
                },
                explainPrice: function TreatmentChEditorModel_explainPrice( args ) {
                    var self = this,
                        priceExplainString = '',
                        price = Math.round( unwrap( self.price ) * 100 ) / 100,
                        medicalTaxPoints = unwrap( self.medicalTaxPoints ),
                        technicalTaxPoints = unwrap( self.technicalTaxPoints ),
                        assistanceTaxPoints = unwrap( self.assistanceTaxPoints ),
                        medicalScalingFactor = unwrap( self.medicalScalingFactor ),
                        technicalScalingFactor = unwrap( self.technicalScalingFactor ),
                        relevantTaxPointValue = Y.doccirrus.commonutilsCh.getRelevantTarmedTaxPointEntry( args ),
                        taxPointValue = relevantTaxPointValue.value / 100;

                    priceExplainString += price + ' = ' + technicalTaxPoints + ' * ' + technicalScalingFactor + ' * ' +
                                         taxPointValue + ' + ';
                    if( assistanceTaxPoints ) {
                        priceExplainString += ' ( ' + medicalTaxPoints + ' + ' + assistanceTaxPoints + ' ) ';
                    } else {
                        priceExplainString += medicalTaxPoints;
                    }
                    priceExplainString += ' * ' + medicalScalingFactor + ' * ' + taxPointValue;
                    self.priceExplainString( priceExplainString );
                },
                setActivityData: function TreatmentChEditorModel_setActivityData() {
                    TreatmentChEditorModel.superclass.setActivityData.apply( this, arguments ); // original method
                },
                showCodesCollapsed: function() {
                    jQuery( '#textform-panel-body-linking-treatments' ).collapse( 'show' );
                },
                loadRelatedCodes: function TreatmentChEditorModel_loadRelatedCodes( code, category ) {
                    var
                        self = this,
                        groupCodes,
                        blockRules,
                        uExtra = unwrap( self.u_extra ),
                        divisionCode = unwrap( self.divisionCode ),
                        currentPatient = self.get( 'currentPatient' )(),
                        excludedDivisionCodes = ['5000'], // these codes should not be visible
                        query = {},
                        options = {
                            select: {
                                seq: 1,
                                validFrom: 1,
                                validUntil: 1,
                                title: 1
                            }
                        },
                        orQuery;

                    if( 'Referenzleistung' === category ) {
                        query.treatmentCategory = 'Referenzleistung';
                    } else {
                        query.treatmentCategory = 'Zuschlagsleistung';
                    }

                    if( 'Hauptleistung' === category ) {
                        if( uExtra && uExtra.treatmentGroups ) {
                            groupCodes = uExtra.treatmentGroups.map( function( i ) {
                                return i.code;
                            });
                            blockRules = uExtra.blocRules.map( function( i ) {
                                return i.code;
                            });
                        }

                        if( groupCodes && groupCodes.length ) {
                            query.$or = [
                                {
                                    treatmentCategory: 'Referenzleistung',
                                    divisionCode: {$nin: excludedDivisionCodes},
                                    'u_extra.cumulationRules': {
                                        $elemMatch: {
                                            'slaveSeq': {$in: groupCodes},
                                            'slaveType': 'G',
                                            'type': 'X'
                                        }
                                    }
                                },
                                {
                                    treatmentCategory: 'Zuschlagsleistung',
                                    'u_extra.hierarchyRules.seq': code
                                }];
                            delete query.treatmentCategory;
                            if( self.hasImagingDevice && blockRules.length ) {
                                orQuery = {
                                    $and: [
                                        {divisionCode: {$nin: excludedDivisionCodes}},
                                        {divisionCode: divisionCode.toString()}
                                    ],
                                    treatmentCategory: 'Referenzleistung',
                                    'u_extra.blocRules.code': {$in: blockRules}
                                };

                                orQuery.seq = {$in: ['39.2000', '39.3800', '39.5300', '39.4300', '39.7300']};
                                query.$or.push( orQuery );
                            }
                        } else {
                            query['u_extra.hierarchyRules.seq'] = code;
                        }

                    } else {
                        query.seq = code;
                    }
                    Y.doccirrus.jsonrpc.api.catalog.getHierarchyCodesByAge( {
                        query: query,
                        options: options,
                        data: {
                            catalogShort: peek( self.catalogShort ),
                            patient: {
                                dateOfDeath: peek( currentPatient.dateOfDeath ),
                                kbvDob: peek( currentPatient.kbvDob ),
                                treatmentNeeds: peek( currentPatient.treatmentNeeds )
                            },
                            actType: 'TREATMENT'
                        }
                    } ).done( function( response ) {
                        var
                            isReference = 'Referenzleistung' === category,
                            data;
                        if( 'Hauptleistung' === category ) {
                            data = response && response.data;
                            self.hierarchyRules( data.map( function( rule ) {
                                return {
                                    seq: rule.seq,
                                    checked: !rule.disabledByAge,
                                    disabled: rule.disabledByAge,
                                    title: rule.title,
                                    validFrom: rule.validFrom,
                                    validUntil: rule.validUntil
                                };
                            }) );
                            self.showCodesCollapsed();
                        } else {
                            if( isReference ) {
                                // reference linking based on other field
                                data = response && response.data && response.data[0] && response.data[0].u_extra && response.data[0].u_extra.cumulationRules;
                            } else {
                                data = response && response.data && response.data[0] && response.data[0].u_extra && response.data[0].u_extra.hierarchyRules;
                            }
                            if( data && data.length ) {
                                if( isReference ) {
                                    data = data.filter( function( item ) {
                                        return "X" === item.type && "G" === item.slaveType;
                                    }).map( function( item ) {
                                        return item.slaveSeq;
                                    });
                                } else {
                                    data = data.map( function( item ) {
                                        return item.seq;
                                    });
                                }
                                self.loadMainCodes( data, isReference );
                            }
                        }
                    } ).fail( fail );
                },
                loadMainCodes: function TreatmentChEditorModel_loadMainCodes( codes, isReference ) {
                    var
                        self = this,
                        options = {
                            select: {
                                seq: 1,
                                validFrom: 1,
                                validUntil: 1,
                                title: 1
                            }
                        },
                        query = {};

                    if( isReference ) {
                        query["u_extra.treatmentGroups.code"] = { $in: codes };
                    } else {
                        query.treatmentCategory = 'Hauptleistung';
                        query.seq = { $in: codes };
                    }
                    Y.doccirrus.jsonrpc.api.catalog.getSecondaryHierarchyCodes( {
                        query: query,
                        options: options,
                        data: {
                            actType: 'TREATMENT',
                            catalogShort: peek( self.catalogShort )
                        }
                    } ).done( function( response ) {
                        var
                            data = response && response.data;

                        self.hierarchyRules( data.map( function( rule ) {
                            return {
                                seq: rule.seq,
                                checked: !isReference,
                                disabled: false,
                                title: rule.title,
                                validFrom: rule.validFrom,
                                validUntil: rule.validUntil
                            };
                        }) );
                        self.showCodesCollapsed();
                    } ).fail( fail );
                }

            }, {
                NAME: 'TreatmentChEditorModel'
            }
        );

        KoViewModel.registerConstructor( TreatmentChEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedEditorModel',
            'activity-schema',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dcvat',
            'dccommonutils-ch',
            'dc-comctl'
        ]
    }
);
