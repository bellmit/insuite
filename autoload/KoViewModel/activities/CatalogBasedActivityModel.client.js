/**
 * User: pi
 * Date: 18/12/15  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'CatalogBasedActivityModel', function( Y, NAME ) {
        /**
         * @module CatalogBasedActivityModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            CatalogTextModel = KoViewModel.getConstructor( 'CatalogTextModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            ignoreDependencies = ko.ignoreDependencies;

        var CASE_FOLDER_TYPE_TO_COUNTRY_MAP = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;

        /**
         * @abstract
         * @class CatalogBasedActivityModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function CatalogBasedActivityModel( config ) {
            CatalogBasedActivityModel.superclass.constructor.call( this, config );
        }

        CatalogBasedActivityModel.checkCode = function( params ) {
            var
                locationId = params.locationId,
                code = params.code,
                catalogRef = params.catalogRef,
                promise;
            promise = Y.doccirrus.jsonrpc.api.activity.checkCatalogCode( {
                query: {
                    seq: code,
                    catalog: catalogRef,
                    locationId: locationId
                }
            } );
            return promise;
        };

        Y.extend( CatalogBasedActivityModel, SimpleActivityModel, {

                initializer: function CatalogBasedActivityModel_initializer() {
                    var
                        self = this;
                    self.initCatalogBasedActivityModel();
                },
                destructor: function CatalogBasedActivityModel_destructor() {
                },
                initCatalogBasedActivityModel: function CatalogBasedActivityModel_initCatalogBasedActivityModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                        catalogTextHidden = incaseConfig && incaseConfig.catalogTextHidden || false,
                        actType = peek( self.actType );
                    self.set( 'data.modifyHomeCat', false ); // drop every time when activity is initialized
                    self.setNotModified();

                    self.setOnCatalogShortChange();

                    self.initEvents();
                    self.catalogTextModel = ko.observable();
                    if( ( 'TREATMENT' === actType || 'DIAGNOSIS' === actType ) && !catalogTextHidden ) {
                        self.initCatalogText();
                    }

                },
                initCatalogText: function() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        var
                            locationId = unwrap( self.locationId ),
                            catalogShort = unwrap( self.catalogShort ),
                            code = unwrap( self.code ),
                            currentUserContent = peek( self.userContent ),
                            isInitial = ko.computedContext.isInitial();
                        if( isInitial ) {
                            self.catalogTextModel( new CatalogTextModel( {
                                currentUserContent: currentUserContent,
                                data: self.get( 'catalogText' ) || {
                                    locationId: locationId,
                                    code: code,
                                    catalogShort: catalogShort
                                }
                            } ) );
                            return;
                        }
                        ignoreDependencies( function() {

                            self.updateCatalogText( {
                                currentUserContent: currentUserContent,
                                locationId: locationId,
                                code: code,
                                catalogShort: catalogShort
                            } );
                        } );
                    } ) );
                },
                setOnCatalogShortChange: function CatalogBasedActivityModel_setOnCatalogShortChange() {
                    var

                        self = this;
                    self.addDisposable( ko.computed( function() {
                        var
                            catalogShort = unwrap( self.catalogShort );
                        ko.ignoreDependencies( function() {
                            var
                                catalog = Y.Array.find( self.getCatalogs(), function( catalog ) {
                                    return catalogShort === catalog.short;
                                } ),
                                isNew = peek( self.isNew() ),
                                isInitial = ko.computedContext.isInitial();
                            if( isNew || !isInitial ) {
                                if( catalog && catalog.filename ) {
                                    self.catalogRef( catalog.filename );
                                } else {
                                    self.catalogRef( '' );
                                    self.catalogShort( '' );
                                }
                            }
                        } );

                    } ).extend( { rateLimit: 30 } ) );
                },
                getCatalogs: function CatalogBasedActivityModel_getCatalogs() {
                    var
                        self = this,
                        catalogs,
                        options = self.getCatalogBaseOptions();
                    catalogs = Y.doccirrus.catalogmap.getCatalogs( options );
                    return catalogs;
                },
                getCatalogBaseOptions: function CatalogBasedActivityModel_getCatalogBaseOptions() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        actType = peek( self.actType ),
                        currentPatient = peek( binder.currentPatient ),
                        currentCaseFolder,
                        country;

                    if( currentPatient ) { // Not available on early page reload.
                        currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab();

                        if (actType === "MEDICATION") {
                            country = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? "CH" : CASE_FOLDER_TYPE_TO_COUNTRY_MAP[currentCaseFolder.type];
                        } else {
                            country = CASE_FOLDER_TYPE_TO_COUNTRY_MAP[currentCaseFolder.type||'ANY'];
                        }

                    }

                    return {
                        actType: actType,
                        country: country
                    };
                },
                updateCatalogText: function( params ){
                    var
                        self = this,
                        catalogShort = params.catalogShort,
                        code = params.code,
                        locationId = params.locationId,
                        currentUserContent = params.currentUserContent;
                    if( code ){
                        Y.doccirrus.communication.request( {
                            event: 'incase.getCatalogText',
                            message: {
                                query: {
                                    code: code,
                                    catalogShort: catalogShort,
                                    locationId: locationId
                                }
                            },
                            callback: function( err, res ) {
                                var
                                    catalogTextData;
                                if( err ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                    return;
                                }
                                catalogTextData = res && res[0] || {
                                        catalogShort: catalogShort,
                                        locationId: locationId,
                                        code: code
                                    };

                                self.catalogTextModel( new CatalogTextModel( {
                                    currentUserContent: currentUserContent,
                                    data: catalogTextData
                                } ) );
                            }
                        } );
                    } else {
                        self.catalogTextModel( new CatalogTextModel( {} ) );
                    }
                },
                initEvents: function CatalogBasedActivityModel_initEvents(){
                    var
                        self = this;
                    /**
                     * @property events
                     * @type {Y.EventTarget}
                     */
                    self.events = new Y.EventTarget();
                    self.events.publish( 'setActivityData', {preventable: false} );
                },

                setActivityData: function CatalogBasedActivityModel_setActivityData( data, options ) {
                    var
                        self = this,
                        actType = peek( self.actType ),
                        catalogShort = peek( self.catalogShort ),
                        catalog = peek( self.catalog ),
                        billingFactorType = peek( self.billingFactorType ),
                        billingFactorValue = peek( self.billingFactorValue ),
                        publicBillingFactor = peek( self.publicBillingFactor ),
                        locationId = peek( self.locationId ),
                        uvGoaeType = peek( self.uvGoaeType ),
                        billingFactor,
                        caseFolder = self.get( 'caseFolder' ),
                        binder = self.get( 'binder' ),
                        lastSchein = self.get( 'lastSchein' ),
                        scheinBillingFactorValue = lastSchein && Number( lastSchein.scheinBillingFactorValue ),
                        currentPatient = peek( binder.currentPatient ),
                        insuranceStatus = currentPatient && peek( currentPatient.insuranceStatus );
                    options = options || {};
                    if( !data.medicalTaxPoints && 'TREATMENT' === unwrap( self.actType ) ) {
                        self.medicalTaxPoints( 0 );
                        self.medicalScalingFactor( 0 );
                    }
                    if( !data.technicalTaxPoints && 'TREATMENT' === unwrap( self.actType ) ) {
                        self.technicalTaxPoints( 0 );
                        self.technicalScalingFactor( 0 );
                    }
                    if( ( !data.medicalText || data.medicalText === '' ) && 'TREATMENT' === unwrap( self.actType ) ) {
                        self.medicalText( '' );
                    }
                    if( 'EBM' === catalogShort ) {
                        if( catalog ) {
                            if( publicBillingFactor ) {
                                billingFactor = publicBillingFactor.factor;
                            } else {
                                billingFactor = billingFactorValue;
                            }
                        } else {
                            // EBM catalog "own code" treatment, this version of UI code does not preserve prices we get
                            // from catalogusages.  This is a kind of lazy migration of pre-existing bad data,
                            // since new bad factors are not allowed by the backend.
                            billingFactor = /*data.billingFactorValue ||*/ 1;
                        }
                    } else {
                        billingFactor = billingFactorValue;
                    }
                    if( data.catalog && caseFolder && 'PRIVATE' === caseFolder.type && insuranceStatus ) {
                        insuranceStatus.forEach( function( insurance ) {
                            if( peek( insurance.type ) === caseFolder.type ) {
                                billingFactorType = peek( insurance.billingFactor );
                            }
                        } );
                    } else {
                        billingFactorType = data.billingFactorType || billingFactorType;
                    }
                    if( scheinBillingFactorValue && ('PRIVATE' === caseFolder.type || 'SELFPAYER' === caseFolder.type) ) {
                        options.skipBillingFactorCalculation = true;
                        billingFactor = scheinBillingFactorValue;
                    }

                    self.events.fire( 'setActivityData', {
                        activityData: data,
                        options: options
                    } );
                    Y.doccirrus.schemas.activity._setActivityData( {
                        initData: {
                            actType: actType,
                            catalogShort: catalogShort,
                            billingFactorType: billingFactorType,
                            billingFactorValue: billingFactor,
                            uvGoaeType: uvGoaeType,
                            locationId: locationId,
                            areTreatmentDiagnosesBillable: data.areTreatmentDiagnosesBillable
                        },
                        entry: data,
                        user: null,
                        options: options
                    }, function( err, _data ) {
                        if (err) {
                            Y.log( 'setActivityData: Error in setting activity data' + (err.stack || err), 'warn', NAME );
                        }
                        self.updateObservables( _data );
                    } );
                },
                updateObservables: function CatalogBasedActivityModel_updateObservables( data ) {
                    var
                        self = this,
                        defaults = self.get( 'defaults' ) || {};
                    data = data || {};
                    Object.keys( data ).forEach( function( key ) {
                        var
                            value = data[ key ],
                            initValue;
                        /**
                         * if observable is updated with 'undefined' value:
                         *  1. try to set default schema value
                         *  2. check initial value, if it is 'null' or 'undefined' set it
                         *  3. set 'undefined'
                         */
                        if( self[ key ] ) {
                            if( 'undefined' === typeof value || null === value ) {
                                if( 'undefined' !== typeof defaults[ key ] ) {
                                    value = defaults[ key ];
                                } else {
                                    /**
                                     * prevent situation when observable is triggered by changing value from undefined <=> null
                                     */
                                    initValue = self.get( 'data.' + key );
                                    if( 'undefined' === typeof initValue || null === initValue ) {
                                        value = initValue;
                                    }
                                }
                            }
                            self[ key ]( value );
                        }
                    } );
                }

            },
            {
                NAME: 'CatalogBasedActivityModel',
                ATTRS: {
                    catalogText: {
                        value: null,
                        lazyAdd: false
                    }
                }
            }
        );
        KoViewModel.registerConstructor( CatalogBasedActivityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'activity-schema',
            'dccatalogmap',
            'CatalogTextModel'
        ]
    }
);
