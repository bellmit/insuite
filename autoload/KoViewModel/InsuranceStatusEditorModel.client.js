/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'InsuranceStatusEditorModel', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module InsuranceStatusEditorModel
     */

    var
        additionalRegex = Y.doccirrus.regexp.additionalInsuranceTypeRegex,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        AN_ERROR_OCCURRED = i18n( 'general.message.AN_ERROR_OCCURRED' ),
        KoViewModel = Y.doccirrus.KoViewModel,
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' );

    /**
     * Read a physician employee by _id
     * @param {String} employeeId
     * @return {Object}
     * @async
     */
    function readPhysicianEmployeeById( employeeId ) {
        return Y.doccirrus.jsonrpc.api.employee
            .read( {query: {_id: employeeId, type: 'PHYSICIAN'}} )
            .then( function( response ) {
                return response && response.data && response.data[0] || null;
            } );
    }

    /**
     * Read the physician employees of a location _id
     * @param {String} locationId
     * @return {Object}
     * @async
     */
    function readPhysicianEmployeesInLocationId( locationId ) {
        return Y.doccirrus.jsonrpc.api.employee
            .read( {query: {"locations._id": locationId, type: 'PHYSICIAN'}, options: {sort: {lastname: 1}}} )
            .then( function( response ) {
                return response && response.data || [];
            } );
    }

    /**
     * Check that a physician employee _id is in a location _id
     * @param {String} employeeId
     * @param {String} locationId
     * @return {Boolean}
     * @async
     */
    function checkPhysicianEmployeeIdIsInLocationId( employeeId, locationId ) {
        return Y.doccirrus.jsonrpc.api.employee
            .read( {query: {_id: employeeId, "locations._id": locationId, type: 'PHYSICIAN'}} )
            .then( function( response ) {
                var
                    results = response && response.data || [];

                return Boolean( results.length );
            } );
    }

    function daleUvInsuranceSearchMapper( entry ) {
        return {id: entry.iknr, text: entry.name + (entry.iknr ? ' (' + entry.iknr + ')' : ''), _data: entry};
    }

    function checkKT( iknr, vknr, ktab, callback ) {
        var ctlg = Y.doccirrus.catalogmap.getCatalogSDKT();

        // handle not having a catalog
        if( null === ctlg ) {
            callback( new Error( 'Error verifying KT: no catalog' ) );
        }
        if( !iknr || !vknr || !ktab || !callback ) {
            if( 'function' === typeof callback ) {
                callback( Error( 'insufficient arguments' ) );
            }
            return;
        }
        else {
            Y.doccirrus.jsonrpc.api.catalog.verifyKT( {
                ik: iknr,
                ktab: ktab,
                vk: vknr,
                catalog: ctlg.filename
            } ).done( function( response ) {
                callback( null, response.data );
            } ).fail( function() {
                callback( new Error( 'Error verifiing KT' ) );
            } );
        }
    }

    /**
     * @class InsuranceStatusEditorModel
     * @constructor
     * @extends SubEditorModel
     */
    function InsuranceStatusEditorModel( config ) {
        InsuranceStatusEditorModel.superclass.constructor.call( this, config );
    }

    Y.extend( InsuranceStatusEditorModel, SubEditorModel, {
        initializer: function InsuranceStatusEditorModel_initializer() {
            var
                self = this;

            self.initInsuranceStatusEditorModel();
        },
        destructor: function InsuranceStatusEditorModel_destructor() {
        },
        initInsuranceStatusEditorModel: function InsuranceStatusEditorModel_initInsuranceStatusEditorModel() {
            var
                self = this;

            self.initType();
            self.initLocation();
            self.initPayer();
            self.initEmployee();
            self.initCostCarrierBillingSection();
            self.initFeeSchedule();
            self.initFk4110();
            self.initDaleUvInsurance();
            self.initFk3000();
            self.initTier();
            self.addDisposable( ko.computed( function() {
                unwrap( self.insuranceName );
                var insuranceId = unwrap( self.insuranceId );
                self.insuranceId.validate( insuranceId );
            } ) );
        },
        _filteredTypeList: null,
        initType: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            /**
             * Replace PUBLIC_A and PRIVATE_A with PUBLIC/PRIVATE pug-files
             */
            self.getTemplateName = self.addDisposable( ko.computed( function() {

                var
                    myInsuranceType = unwrap(self.type);
                if( null !== myInsuranceType.match( additionalRegex ) ) {
                    myInsuranceType = myInsuranceType.replace(additionalRegex, '');
                }
                return 'PatientInsuranceStatusEditorModel-' + myInsuranceType;
            }));
            /**
             * every insurance type can only be used once
             */
            self._filteredTypeList = self.addDisposable( ko.computed( function() {
                var i, j,
                    type, found, insurance, parentIns, parentInsFound,
                    filteredTypes = [],
                    typeList = self.type.list().sort( function( a, b ) {
                        if( a.val.match( additionalRegex ) && !b.val.match( additionalRegex ) ) {
                            return 1;
                        } else if( !a.val.match( additionalRegex ) && b.val.match( additionalRegex ) ) {
                            return -1;
                        } else {
                            return 0;
                        }
                    } ),
                    insuranceStatus = currentPatient.insuranceStatus(),
                    currenPatientCountryMode = unwrap( currentPatient.countryMode() ),
                    dataModel = self.get( 'dataModelParent' );

                for( i = 0; i < typeList.length; i++ ) {
                    type = typeList[i];
                    found = false;
                    parentInsFound = false;
                    parentIns = null;
                    if( null !== type.val.match( additionalRegex ) ) {
                        parentIns = type.val.split('_A')[0];
                    }
                    for( j = 0; j < insuranceStatus.length; j++ ) {
                        insurance = insuranceStatus[j];

                        if( insurance.clientId === dataModel.clientId ) {
                            continue;
                        }
                        if( insurance.type.peek() === type.val ) {
                            found = true;
                        }
                        if (parentIns  && insurance.type.peek() === parentIns){
                            parentInsFound = true;
                        }
                    }
                    if( false === found && _.intersection( type.countryMode, currenPatientCountryMode ).length ) {
                        if (!parentIns) {
                            filteredTypes.push( type );
                        } else {
                            // if patient has GKV - only then GKV_A will be shown on the list
                            if (parentInsFound) {
                                filteredTypes.push( type );
                            }
                        }
                    }
                }

                return filteredTypes;
            } ) );
        },
        _locationList: null,
        initLocation: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                locations = binder.getInitialData( 'location' ),
                tenantSettings = binder.getInitialData( 'tenantSettings' ),
                filter = Y.doccirrus.utils.getFilter(),
                locationId = peek( self.locationId ),
                foreignLocations;

            if( locationId && locations.every( function( location ) {
                    return location._id !== locationId;
                } ) ) {
                foreignLocations = (binder.getInitialData( 'foreignLocations' ) || []);
                foreignLocations.some( function( fLoc ) {
                    if( fLoc._id === locationId ) {
                        locations.push( fLoc );
                        return true;
                    }
                } );
            }
            if( !locationId ) {
                if( (true === (tenantSettings && tenantSettings.noCrossLocationAccess)) && locations && locations.length ) {
                    self.locationId( locations[0]._id );
                } else if( filter && filter.location ) {
                    self.locationId( filter.location );
                } else {
                    self.locationId( Y.doccirrus.schemas.location.getMainLocationId() );
                }
            }
            self._locationList = ko.observableArray( locations );
        },
        initPayer: function() {
            var self = this;

            self.addDisposable( self.type.subscribe( function( val ) {
                self._resetPayer();
                if( Y.doccirrus.schemas.patient.isPrivateInsurance( {type: val} ) ) {
                    self.feeSchedule( '3' );
                }
                self.get( 'dataModelParent' ).revalidate();
            } ) );

            self.addDisposable( ko.computed( function() {
                var unknownInsurance = unwrap( self.unknownInsurance ),
                    type = unwrap( self.type );
                if( ko.computedContext.isInitial() ) {
                    return;
                }
                self._resetPayer();
                if( unknownInsurance ) {
                    self.unknownInsurance( true );
                    self.insuranceName( 'DUMMY' );
                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: type} ) ) {
                        self.insuranceGrpId( '00000' );
                        self.insuranceId( '000000000' );
                        self.costCarrierBillingSection( '00' );
                        self.costCarrierBillingGroup( '00' );
                        self.insuranceKind( '1' );
                        self.feeSchedule( '1' );
                    } else if( Y.doccirrus.schemas.patient.isPrivateInsurance( {type: type} ) ) {
                        self.insuranceId( '000000000' );
                        self.insuranceName( 'DUMMY' );
                        self.feeSchedule( '3' );
                    } else if( type === 'BG' ) {
                        self.insuranceId( '000000000' );
                    }
                }
            } ) );
        },
        /**
         * allows _resetPayer to reset
         * @type {boolean}
         * @private
         */
        _resetAllowed: true,
        /**
         * resets payer values to their default values
         * if _resetAllowed = true
         * @private
         */
        _resetPayer: function( ignoreIdField ) {
            var
                self = this,
                dataModelParent,
                defaults,
                ignoreKeys,
                keys;

            if( self._resetAllowed ) {

                dataModelParent = self.get( 'dataModelParent' );
                defaults = dataModelParent.get( 'defaults' );
                ignoreKeys = ['type'];
                if( ignoreIdField ) {
                    ignoreKeys.push( '_id' );
                }
                keys = Y.Array.filter( Object.keys( dataModelParent._boilerplate ), function( key ) {
                    return -1 === ignoreKeys.indexOf( key );
                } );

                keys.forEach( function( key ) {
                    var
                        value = (key in defaults) ? defaults[key] : undefined;

                    dataModelParent[key]( value );
                } );
                self._costCarrierBillingSectionList( [] );
            }
            return self._resetAllowed;
        },
        /**
         * choose a payer via UI
         * @param model
         * @private
         */
        _selectPayer: function() {
            var
                self = this,
                model = self.get( 'dataModelParent' ),
                insuranceType = ko.unwrap( model.type ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                aDCWindow, aDatatable, aDatatableColumns;

            if( Y.doccirrus.schemas.patient.isPrivateInsurance( {type: insuranceType} ) ) {
                aDatatableColumns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'single'
                    },
                    {
                        forPropertyName: 'suchname',
                        label: i18n( 'person-schema.Insurance_search.SUCHNAME' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'iknr',
                        label: i18n( 'person-schema.Insurance_search.IKNR' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'abrechnungsbereich',
                        label: i18n( 'person-schema.Insurance_search.ABRECHNUNGSBEREICH' ),
                        isSortable: true,
                        isFilterable: true
                    }
                ];
            } else if( 'BG' === insuranceType ) {
                aDatatableColumns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'single'
                    },
                    {
                        forPropertyName: 'name',
                        label: i18n( 'person-schema.Insurance_search.SUCHNAME' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'iknr',
                        label: i18n( 'person-schema.Insurance_search.IKNR' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'addresses.street',
                        label: i18n( 'person-schema.Insurance_search.STREET' ),
                        renderer: function( meta ) {
                            var
                                addresses = meta.row.addresses;

                            if( Array.isArray( addresses ) && addresses.length ) {
                                return addresses[0].street || '';
                            }
                            return '';
                        },
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'addresses.zip',
                        label: i18n( 'person-schema.Insurance_search.ZIP_CODE' ),
                        renderer: function( meta ) {
                            var
                                addresses = meta.row.addresses;

                            if( Array.isArray( addresses ) && addresses.length ) {
                                return addresses[0].zip || '';
                            }
                            return '';
                        },
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'addresses.city',
                        label: i18n( 'person-schema.Insurance_search.CITY' ),
                        renderer: function( meta ) {
                            var
                                addresses = meta.row.addresses;

                            if( Array.isArray( addresses ) && addresses.length ) {
                                return addresses[0].city || '';
                            }
                            return '';
                        },
                        isSortable: true,
                        isFilterable: true
                    }
                ];
            } else if( insuranceType.indexOf('PRIVATE_CH') > -1 ) {
                aDatatableColumns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'single'
                    },
                    {
                        forPropertyName: 'insuranceName',
                        label: i18n( 'person-schema.Insurance_search.SUCHNAME' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'insuranceGLN',
                        label: i18n( 'person-schema.Insurance_search.GLN' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'zipcode',
                        label: i18n( 'person-schema.Insurance_search.ZIP_CODE' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'city',
                        label: i18n( 'person-schema.Insurance_search.CITY' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'mediport',
                        label: i18n( 'person-schema.Insurance_search.MEDIPORT' ),
                        renderer: function( meta ) {
                            var mediport = meta.row.mediport;
                            return mediport ? i18n( 'person-schema.Insurance_search.YES' ) : i18n( 'person-schema.Insurance_search.NO' );
                        },
                        isSortable: true,
                        isFilterable: true
                    }
                ];
            } else {
                aDatatableColumns = [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'single'
                    },
                    {
                        forPropertyName: 'suchname',
                        label: i18n( 'person-schema.Insurance_search.SUCHNAME' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'vknr',
                        label: i18n( 'person-schema.Insurance_search.VKNR' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'iknr',
                        label: i18n( 'person-schema.Insurance_search.IKNR' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'ktab',
                        label: i18n( 'person-schema.Insurance_search.KTAB' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'abrechnungsbereich',
                        label: i18n( 'person-schema.Insurance_search.ABRECHNUNGSBEREICH' ),
                        isSortable: true,
                        isFilterable: true
                    }
                ];
            }

            // create Datatable
            aDatatable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-SelectInsurancePayer',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.catalog.getInsurances,
                    baseParams: {
                        insuranceType: insuranceType,
                        locationId: unwrap( self.locationId )
                    },
                    columns: aDatatableColumns,
                    responsive: false,
                    selectMode: 'none',
                    tableMinWidth: '500px',
                    usageConfigurationDisabled: true,
                    usageConfigurationVisible: false
                }
            } );

            ko.applyBindings( aDatatable, node.getDOMNode() );

            // create Window
            aDCWindow = new Y.doccirrus.DCWindow( {
                className: 'DCWindow-SelectInsurancePayer',
                bodyContent: node,
                title: i18n( 'person-schema.Insurance_search.COST_CARRIER' ),
                icon: Y.doccirrus.DCWindow.ICON_SEARCH,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: 400,
                minHeight: 400,
                minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'SELECT', {
                            isDefault: true,
                            action: function( e ) {
                                var
                                    checked = aDatatable.getComponentColumnCheckbox().checked(),
                                    data,
                                    isFused = false,
                                    isFusedFrom = null,
                                    fusedToInsuranceId = null;

                                function setPublicData() {
                                    model.fused( isFused );
                                    model.fusedFrom( isFusedFrom );
                                    model.fusedToInsuranceId( fusedToInsuranceId );
                                    model.insuranceGrpId( ko.unwrap( data.vknr ) );
                                    self._abrechnungsbereiche( ko.unwrap( data.abrechnungsbereiche ) );
                                    model.kv( ko.unwrap( data.kv ) );
                                    model.costCarrierBillingGroup( ko.unwrap( data.kostentraegergruppeId ) );
                                    model.unzkv( ko.unwrap( data.unzkv || [] ) ); //P2-265

                                    model.insuranceId( ko.unwrap( data.iknr ) );
                                    model.insuranceName( ko.unwrap( data.name ) );
                                    model.costCarrierBillingSection( ko.unwrap( data.ktab ) );
                                    model.insurancePrintName( ko.unwrap( data.abrechnungsbereich ) );
                                    model.feeSchedule( ko.unwrap( data.gebuehrenordnung ) );
                                    model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                    model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );

                                    aDCWindow.close();
                                }

                                function ktVerifiedCb( err, result ) {
                                    var CardReaderError = Y.doccirrus.commonerrors.DCError, error;

                                    if( err ) {
                                        Y.log( 'error verifing KT' + err, 'debug' );
                                    }

                                    if( result && result.status && result.status.code ) {
                                        error = new CardReaderError( result.status.code );
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'error',
                                            message: error.message
                                        } );

                                        return;
                                    }

                                    if( 1 === result.code && result.data && result.data[0] && result.ktIsFused ) {
                                        data = result.data[0];
                                        isFused = true;

                                        isFusedFrom = data.fusedFrom;
                                        fusedToInsuranceId = data.fusedToInsuranceId;
                                    }

                                    setPublicData();
                                }

                                e.preventDefault();
                                if( 1 !== checked.length ) {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'warn',
                                        message: 'Bitte prüfen Sie ihre Auswahl'
                                    } );
                                } else {
                                    data = checked[0];
                                    self.unknownInsurance( false );
                                    // if adding/removing fields also check "test kv validity and if invalid reset values"
                                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) ) {
                                        checkKT( ko.unwrap( data.iknr ), ko.unwrap( data.vknr ), ko.unwrap( data.ktab ), ktVerifiedCb );

                                    } else if( 'BG' === insuranceType ) {
                                        model.insuranceId( ko.unwrap( data.iknr ) );
                                        model.insuranceName( ko.unwrap( data.name ) );
                                        model.insurancePrintName( ko.unwrap( data.name ) );
                                        model.feeSchedule( '3' );
                                        model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                        model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );
                                        aDCWindow.close();
                                    } else if ( insuranceType.indexOf('PRIVATE_CH') > -1 ) {
                                        model.insuranceId( ko.unwrap( data.insuranceGLN ) );
                                        model.insuranceName( ko.unwrap( data.insuranceName ) );
                                        model.department( ko.unwrap( data.department ) );
                                        model.insuranceGLN( ko.unwrap( data.insuranceGLN ) );
                                        model.recipientGLN( ko.unwrap( data.recipientGLN ) );
                                        model.insurancePrintName( ko.unwrap( data.insurancePrintName ) );
                                        model.address1( ko.unwrap( data.address1 ) );
                                        model.address2( ko.unwrap( data.address2 ) );
                                        model.zipcode( ko.unwrap( data.zipcode ) );
                                        model.city( ko.unwrap( data.city ) );
                                        model.phone( ko.unwrap( data.phone ) );
                                        model.insuranceLink( ko.unwrap( data.insuranceLink ) );
                                        model.email( ko.unwrap( data.email ) );
                                        model.changebillingtypedesc( ko.unwrap( data.changebillingtypedesc ) );
                                        model.mediport( ko.unwrap( data.mediport ) );
                                        aDCWindow.close();
                                    } else {
                                        model.insuranceId( ko.unwrap( data.iknr ) );
                                        model.insuranceName( ko.unwrap( data.name ) );
                                        model.costCarrierBillingSection( ko.unwrap( data.ktab ) );
                                        model.insurancePrintName( ko.unwrap( data.abrechnungsbereich ) );
                                        model.feeSchedule( ko.unwrap( data.gebuehrenordnung ) );
                                        model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                                        model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );
                                        aDCWindow.close();
                                    }
                                }
                            }
                        } )
                    ]
                }
            } );
            // needed for patient version modal in schhein activities
            aDCWindow.bringToFront();
        },
        _employeeIdSelect2Config: null,
        initEmployee: function() {
            var
                self = this;

            /**
             * Select2 configuration for "employeeId"
             * @type {Object}
             */
            self._employeeIdSelect2Config = {
                _lastLocationId: null, // on change cache new results
                _lastResults: [], // used to cache results for current locationId
                val: self.addDisposable( ko.computed( {
                    read: function() {

                        return ko.unwrap( self.employeeId ) || '';
                    },
                    write: function( $event ) {

                        self.employeeId( $event.val );
                    }
                }, self ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    query: function( query ) {
                        var
                            select2 = this,
                            config = self._employeeIdSelect2Config,
                            locationId = ko.unwrap( self.locationId );

                        if( !locationId ) {
                            config._lastLocationId = null;
                            query.callback( {
                                results: []
                            } );
                            return;
                        }

                        if( config._lastLocationId === locationId ) {
                            query.callback( {
                                results: Y.Array.filter( config._lastResults, function( item ) {
                                    return select2.matcher( query.term, item.text );
                                } )
                            } );
                            return;
                        }

                        readPhysicianEmployeesInLocationId( locationId )
                            .done( function( results ) {
                                results = results.map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    };
                                } );
                                config._lastLocationId = locationId;
                                config._lastResults = results;
                                query.callback( {
                                    results: Y.Array.filter( results, function( item ) {
                                        return select2.matcher( query.term, item.text );
                                    } )
                                } );
                            } );

                    },
                    initSelection: function( element, callback ) {

                        readPhysicianEmployeeById( ko.unwrap( self.employeeId ) )
                            .done( function( employee ) {
                                if( employee ) {
                                    callback( {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    } );
                                }
                            } );
                    }
                }
            };

            /**
             * Compute valid "employeeId" in "locationId", else unset "employeeId"
             */
            self.addDisposable( ko.computed( function() {
                var
                    locationId = ko.unwrap( self.locationId ),
                    employeeId = ko.unwrap( self.employeeId );

                if( !(locationId && employeeId) ) {
                    return;
                }

                if( employeeId && !locationId ) {
                    self.employeeId( '' );
                    return;
                }

                checkPhysicianEmployeeIdIsInLocationId( employeeId, locationId )
                    .done( function( isInLocation ) {
                        if( !isInLocation ) {
                            self.employeeId( '' );
                        }
                    } );

            } ) );
        },
        _costCarrierBillingSectionList: null,
        initCostCarrierBillingSection: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            /**
             * setting _abrechnungsbereiche will rebuild _costCarrierBillingSectionList
             * @type ko.observable
             */
            self._abrechnungsbereiche = ko.observable( self.get( 'dataModelParent' ).get( 'data.abrechnungsbereiche' ) );

            self._costCarrierBillingSectionList = Y.doccirrus.KoViewModel.utils.createAsync( {
                cache: InsuranceStatusEditorModel,
                initialValue: [],
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.catalog.catsearch,
                    params: self.addDisposable( ko.computed( function() {
                        var iknr = ko.unwrap( self.insuranceId ),
                            vknr = ko.unwrap( self.insuranceGrpId ),
                            valid = (Boolean( iknr ) && Boolean( vknr )),
                            catalog = Y.doccirrus.catalogmap.getCatalogSDKT();
                        if( valid && catalog ) {
                            return {
                                catalog: catalog.filename,
                                disableOnlyInvoiceIK: true,
                                query: {vknr: vknr},
                                sort: 'ktab,1'
                            };
                        }
                        return null;
                    } ) )
                },
                converter: function( response ) {
                    var
                        data = response.data;
                    if( data[0] ) {
                        return self._abrechnungsbereicheMapper( data[0].abrechnungsbereiche );
                    } else {
                        return [];
                    }
                }
            } );

            // on "_abrechnungsbereiche" change rebuild the _costCarrierBillingSectionList
            self.addDisposable( ko.computed( function() {
                var _abrechnungsbereiche = self._abrechnungsbereiche();
                if( !Y.Lang.isUndefined( _abrechnungsbereiche ) ) {
                    if( self._costCarrierBillingSectionList.inProgress && self._costCarrierBillingSectionList.inProgress() ) {
                        // while loading we have to destroy the async (there is no access to resolve)
                        self._costCarrierBillingSectionList = ko.observableArray( self._abrechnungsbereicheMapper( _abrechnungsbereiche ) );
                    } else {
                        self._costCarrierBillingSectionList( self._abrechnungsbereicheMapper( _abrechnungsbereiche ) );
                    }
                }
            } ) );

            /**
             * Computed to keep insurancePrintName in sync with the selected ktab
             */
            self.addDisposable( ko.computed( function() {
                var value = self.costCarrierBillingSection(),
                    list = self._costCarrierBillingSectionList(),
                    ktab;

                if( list && list.length ) {
                    ktab = Y.Array.find( list, function( item ) {
                        return value === item.ktab;
                    } );
                    if( ktab ) {
                        self.insurancePrintName( ktab.abrechnungsbereich );
                    } else {
                        Y.log( 'KTAB Not Found In List', 'warn' );
                    }
                }
            } ) );

            // possible contents for FK 4131 from 778, 779, 780, 781
            // (KVDT-Datensatzbeschreibung Kap. 3.5.1, S. 52)
            self.addDisposable( ko.computed( function() {
                self.costCarrierBillingSection();
                var
                    persGroup = self.persGroup();

                switch( persGroup ) {
                    case '4':
                        self.costCarrierBillingSection( '00' );
                        break;
                    case '6':
                        self.costCarrierBillingSection( '02' );
                        break;
                    case '7':
                    case '8':
                        self.costCarrierBillingSection( '01' );
                        break;
                }
            } ) );

            self.addDisposable( self.persGroup.subscribe( function( val ) {
                var
                    incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                    mid = 'persGroup9' + self._id;

                if( !incaseConfig.showPersGroup9Info ) {
                    return;
                }

                Y.doccirrus.DCSystemMessages.removeMessage( mid );
                if( '9' === val ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: mid,
                        content: i18n( 'InCaseMojit.insurance-modelJS.messages.NOTICE_ASYLBLG' ),
                        level: 'INFO'
                    } );
                }
            } ) );

            self.addDisposable( ko.computed( function() {
                var computedInitial = ko.computedContext.isInitial(),
                    insuranceType = peek( self.type ),
                    unknownInsurance = peek( self.unknownInsurance ),
                    fused = peek( self.fused ),
                    cardSwipe = peek( self.cardSwipe ),
                    insuranceGrpId = peek( self.insuranceGrpId ),
                    insuranceId = peek( self.insuranceId ),
                    fusedToInsuranceId = peek( self.fusedToInsuranceId ),
                    costCarrierBillingSection = self.costCarrierBillingSection();

                function checkKTCb( err, result ) {

                    var data, CardReaderError = Y.doccirrus.commonerrors.DCError, error,
                        model = self.get( 'dataModelParent' );

                    if( err ) {
                        Y.log( 'error verifing KT after KTAB change' + err, 'debug' );
                    }

                    if( result && result.status && result.status.code ) {
                        error = new CardReaderError( result.status.code );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: ((typeof error.message === 'string') ? error.message : AN_ERROR_OCCURRED).replace( ' dieser Karte', '' )
                        } );

                        return;
                    }

                    if( 1 === result.code && result.data && result.data[0] ) {
                        data = result.data[0];

                        model.insuranceGrpId( ko.unwrap( data.vknr ) );
                        self._abrechnungsbereiche( ko.unwrap( data.abrechnungsbereiche ) );
                        model.kv( ko.unwrap( data.kv ) );
                        model.costCarrierBillingGroup( ko.unwrap( data.kostentraegergruppeId ) );
                        model.unzkv( ko.unwrap( data.unzkv || [] ) ); //P2-265

                        model.insuranceId( fused ? insuranceId : ko.unwrap( data.iknr ) );
                        model.insuranceName( ko.unwrap( data.name ) );
                        model.costCarrierBillingSection( ko.unwrap( data.ktab ) );
                        model.insurancePrintName( ko.unwrap( data.abrechnungsbereich ) );
                        model.feeSchedule( ko.unwrap( data.gebuehrenordnung ) );
                        model.address1( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 1 ) );
                        model.address2( Y.doccirrus.commonutils.buildInsuranceAddressPart( data, 2 ) );
                    }

                }

                // fused/fusedFrom was never set in "Ersatzverfahren" before and introduced falsy KT validation after
                // MOJ-7222 was impl. We can only "revalidate" KTs in "Ersatzverfahren" if fusedFrom (original VKNR) is set.
                if( computedInitial || unknownInsurance || cardSwipe ||
                    !Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) || !insuranceGrpId ||
                    !(fusedToInsuranceId || insuranceId) || !costCarrierBillingSection ) {
                    return;
                }

                checkKT( (fused ? ( fusedToInsuranceId || insuranceId) : insuranceId), insuranceGrpId, costCarrierBillingSection, checkKTCb );

            } ).extend( {rateLimit: {timeout: 200, method: "notifyWhenChangesStop"}} ) );

        },
        /**
         * maps abrechnungsbereiche Object to Array
         * @param {Object} object
         * @return {Array}
         * @private
         */
        _abrechnungsbereicheMapper: function( object ) {
            var abrechnungsbereicheObject = ko.unwrap( object ),
                abrechnungsbereicheArray = Y.Array.map( Y.Object.keys( abrechnungsbereicheObject ), function( key ) {
                    return {
                        ktab: key,
                        abrechnungsbereich: abrechnungsbereicheObject[key]
                    };
                } );
            abrechnungsbereicheArray.sort( function( a, b ) {
                return a.ktab - b.ktab;
            } );
            return abrechnungsbereicheArray;
        },
        _feeScheduleList: null,
        initFeeSchedule: function() {
            var
                self = this;

            self._feeScheduleList = Y.doccirrus.KoViewModel.utils.createAsync( {
                cache: InsuranceStatusEditorModel,
                initialValue: [],
                jsonrpc: Y.doccirrus.jsonrpc.api.kbv.gebuehrenordnung,
                converter: function( response ) {
                    var data = response.data;
                    if( data[0] && data[0].kvValue ) {
                        data = data[0].kvValue;
                    }
                    return data;
                }
            } );

            self._feeScheduleListAfterRender = function( option, item ) {
                ko.applyBindingsToNode( option, {
                    disable: ko.computed( function() {
                        var type = unwrap( self.type ),
                            val = item.key;

                        if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: type} ) && '3' === val ) {
                            return true;
                        }
                        if( Y.doccirrus.schemas.patient.isPrivateInsurance( {type: type} ) && -1 !== ['0', '1', '2'].indexOf( val ) ) {
                            return true;
                        }

                        return false;
                    } )
                } );
            };
        },
        initFk4110: function() {
            var
                self = this;

            /**
             * throw a warning if fk4110 is out-of-date // MOJ-1413
             */
            self.addDisposable( self.fk4110.subscribe( function( value ) {
                if( !value || !moment( value ).isValid() ) {
                    return;
                }
                var
                    momentValue = moment( value ).startOf( 'day' ),
                    check = Y.doccirrus.commonutils.checkCardValidityDate( null, momentValue );

                if( null !== check ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: check.message
                    } );
                }
            } ) );
        },
        _searchResult: null,
        _daleUvInsuranceSearch: null,
        initDaleUvInsurance: function() {
            var
                self = this,
                currentPatient = ko.unwrap( self.get( 'currentPatient' ) );

            self.addDisposable( ko.computed( function() {
                var publicInsurance,
                    daleUvGkvCatalog = Y.doccirrus.catalogmap.getCatalogDALEUVKT();
                if( self._id ) {
                    return;
                }
                if( 'BG' !== self.type() ) {
                    return;
                }

                currentPatient.insuranceStatus.peek().some( function( _insurance ) {
                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: _insurance.type()} ) ) {
                        publicInsurance = _insurance;
                        return;
                    }
                } );

                if( !publicInsurance || !publicInsurance.insuranceId.peek() ) {
                    return;
                }

                Y.doccirrus.jsonrpc.api.catalog.read( {
                    query: {
                        catalog: daleUvGkvCatalog.filename,
                        iknr: publicInsurance.insuranceId.peek()
                    },
                    options: {
                        itemsPerPage: 1
                    }
                } ).done( function( response ) {
                    var data = response && response.data;
                    if( Array.isArray( data ) && data.length ) {
                        self.daleUvInsuranceId( data[0].iknr );
                        self.daleUvInsuranceName( data[0].name );
                    }
                } );

            } ) );

            self._searchResult = ko.observable();

            self._searchResult.subscribe( function( entry ) {
                self.daleUvInsuranceId( entry._data.iknr );
                self.daleUvInsuranceName( entry._data.name );
            } );

            self._daleUvInsuranceSearch = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return self._searchResult();
                    },
                    write: function( $event ) {
                        if( Y.Object.owns( $event, 'added' ) ) {
                            self._searchResult( $event.added );
                        }
                    }
                } ) ),
                placeholder: '',
                select2: {
                    allowClear: true,
                    query: function( query ) {
                        var daleUvGkvCatalog = Y.doccirrus.catalogmap.getCatalogDALEUVKT();

                        Y.doccirrus.jsonrpc.api.catalog.read( {
                            query: {
                                catalog: daleUvGkvCatalog.filename,
                                $or: [
                                    {iknr: {$regex: query.term, $options: 'i'}}, {
                                        name: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }]
                            },
                            options: {
                                itemsPerPage: 20
                            }
                        } ).done( function( response ) {
                            var data = response && response.data || [];
                            query.callback( {
                                results: data.map( daleUvInsuranceSearchMapper )
                            } );
                        } );

                    }
                }
            };

            self.insuranceOnlySearchI18n = i18n( 'InCaseMojit.insurance_item.sr_only.SEARCH' );
            self.insuranceAddressPart1I18n = i18n( 'InCaseMojit.insurance_item.placeholder.ADDRESS_PART1' );
            self.insuranceAddressPart2I18n = i18n( 'InCaseMojit.insurance_item.placeholder.ADDRESS_PART2' );
            self.insuranceButtonDeleteI18n = i18n( 'general.button.DELETE' );
            self.insuranceButtonNewInsuranceI18n = i18n( 'InCaseMojit.insurance_item.button.NEW_INSURANCE' );
            self.insuranceCostCarrierBillingSectionI18n = i18n( 'InCaseMojit.insurance_item.placeholder.COST_CARRIER_BILLING_SECTION' );
            self.insuranceUnder18PaidFreeI18n = i18n( 'InCaseMojit.insurance_item.tooltip.PATIENTS_UNDER_18_AUTO_PAIDFREE' );
            self.insurancePolicyHolderI18n = i18n( 'InCaseMojit.insurance_item.placeholder.POLICY_HOLDER' );
            self.insurancePolicyDOBI18n = i18n( 'InCaseMojit.insurance_item.placeholder.POLICY_DOB' );
            self.isTiersPayantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersPayant' );
            self.isTiersGarantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersGarant' );
        },

        /**
         *  Set createUniqCaseIdentNoOnInvoice according to clobal invoice config when adding new PUBLIC insurance, EXTMOJ-1904
         */

        initFk3000: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                insuranceType = ko.unwrap( self.type ),
                invoiceconfig = ko.unwrap( binder.getInitialData( 'invoiceconfiguration' ) ),
                //  only initialize Fk3000 when creating new insurance, ie, before user chooses insurance provider
                insurancePrintName = ko.unwrap( self.insurancePrintName ),
                isNew = !insurancePrintName;

            if( !isNew || !invoiceconfig || !Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) ) {
                return;
            }

            if ( invoiceconfig.createUniqCaseIdentNoOnInvoice ) {
                self.createUniqCaseIdentNoOnInvoice( true );
            }
        },

        removeItem: function() {
            var
                self = this,
                dataModelParent = self.get( 'dataModelParent' ),
                dataModelParentType = dataModelParent.type.peek(),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                insurances = currentPatient.insuranceStatus(),
                i, currentInsuranceType, mainInsurance,
                errorMessage = i18n( 'person-schema.InsuranceStatus_T.preventSubWithoutMainInsurance' ),
                subInsuranceFound = null;

            // Lets check if main insurance has a special insurance on the side before we allow to delete it.
            for(i=0; i<insurances.length; i++){
                currentInsuranceType= insurances[i].type.peek();
                if( currentInsuranceType.match( additionalRegex ) ) {
                    mainInsurance = currentInsuranceType.split('_A')[0];
                    if (mainInsurance === dataModelParentType){
                        subInsuranceFound = currentInsuranceType;
                        break;
                    }
                }
            }

            if (!subInsuranceFound) {
                currentPatient.insuranceStatus.remove( dataModelParent );
            } else {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: errorMessage
                } );
            }
        },
        resetItem: function() {
            var self = this;
            self._resetPayer( true );
        },
        initTier: function() {
            var self = this;
            self.isTierSelected = ko.computed({
                read: function( ) {
                    return getSelectedTier();
                },
                write: function( value ) {
                    self.isTiersGarant(value === 'isTiersGarant');
                    self.isTiersPayant(value === 'isTiersPayant');
                }
            });

            self.isTierSelected(getSelectedTier());

            function getSelectedTier(  ) {
                if (unwrap(self.isTiersGarant)) {
                    return 'isTiersGarant';
                }
                return 'isTiersPayant';
            }
        }
    }, {
        NAME: 'InsuranceStatusEditorModel',
        ATTRS: {
            whiteList: {
                value: [
                    'type',
                    'locationId',
                    'insuranceId',
                    'insuranceName',
                    'insurancePrintName',
                    'employeeId',
                    'insuranceNo',
                    'vekaCardNo',
                    'costCarrierBillingSection',
                    'insuranceGrpId',
                    'costCarrierBillingGroup',
                    'cardSwipe',
                    'insuranceKind',
                    'dmp',
                    'fk4133',
                    'locationFeatures',
                    'persGroup',
                    'fk4110',
                    'feeSchedule',
                    'paidFreeTo',
                    'paidFree',
                    'policyHolder',
                    'policyDob',
                    'address1',
                    'address2',
                    'notes',
                    'billingFactor',
                    'bgNumber',
                    'cardValidTo',
                    'daleUvInsuranceId',
                    'daleUvInsuranceName',
                    'fused',
                    'fusedFrom',
                    'fusedToInsuranceId',
                    'createUniqCaseIdentNoOnInvoice',
                    'doNotShowInsuranceInGadget',
                    'unknownInsurance',
                    // CH
                    'zipcode',
                    'city',
                    'phone',
                    'insuranceLink',
                    'email',
                    'insuranceGLN',
                    'recipientGLN',
                    'changebillingtypedesc',
                    'department',
                    'mediport',
                    'isTiersGarant',
                    'isTiersPayant'
                ],
                lazyAdd: false
            }
        }
    } );
    KoViewModel.registerConstructor( InsuranceStatusEditorModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'SubEditorModel',
        'InsuranceStatusModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'DCWindow',
        'DCSystemMessages',
        'location-schema',
        'person-schema',
        'dccatalogmap',
        'dccommonutils',
        'dcutils',
        'dckbvutils',
        'dcquery',
        'dcregexp'
    ]
} );
