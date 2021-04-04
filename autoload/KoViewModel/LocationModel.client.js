/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, $, _ */
'use strict';

YUI.add( 'LocationModel', function( Y, NAME  ) {

        /**
         * @module LocationModel
         */

        var
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            AddressModel = KoViewModel.getConstructor( 'AddressModel' ),
            WeeklyTimeModel = KoViewModel.getConstructor( 'WeeklyTimeModel'),
            initialPrinter = null,
            cachePrinters = null;

        /**
         * Determines if an employee object is of type physician
         * @param {Object} employee
         * @return {boolean}
         */
        function isPhysician( employee ) {
            return 'PHYSICIAN' === employee.type;
        }

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class LocationModel
         * @constructor
         * @extends KoViewModel
         */
        function LocationModel( config ) {
            LocationModel.superclass.constructor.call( this, config );
        }

        LocationModel.ATTRS = {
            supportCountryExtensions: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( LocationModel, KoViewModel.getBase(), {
            initializer: function LocationModel_initializer( config ) {
                var
                    self = this;

                self.membersOfSuperLocations = config.membersOfSuperLocations || [];

                if( !peek( self.isOptional ) ) {
                    if( 'CH' === self.countryCode() ) {
                        self.isOptional( false );
                    } else {
                        self.isOptional( true );
                    }
                }

                self.initLocationModel();
            },
            destructor: function LocationModel_destructor() {
            },
            // overwrite
            _initSubscriptions: function LocationModel__initSubscriptions() {
                var
                    self = this;

                LocationModel.superclass._initSubscriptions.apply( self, arguments );

                self.displayOpenTimes = ko.computed( self.displayOpenTimesComputed, self );

                self.commercialNo.hasError = ko.observable( false );
                self.commercialNo.validationMessages = ko.observableArray();
                self.checkCommercialNo = ko.computed( self.checkCommercialNoComputed, self );
            },
            initLocationModel: function LocationModel_initLocationModel() {
                var self = this;
                self.addDisposable( ko.computed( function() {
                    unwrap( self.smtpPassword );
                    unwrap( self.smtpUserName );
                    unwrap( self.smtpSsl );
                    unwrap( self.smtpHost );
                    unwrap( self.smtpPort );
                    self.smtpEmailFrom.validate();
                } ) );
            },
            /**
             * Determines open times
             */
            displayOpenTimes: null,
            /**
             * Computes open times
             */
            displayOpenTimesComputed: function LocationModel_displayOpenTimesComputed() {
                var
                    self = this,
                    times = ko.toJS( self.consultTimes ),
                    result = [],
                    resultMap = {};

                Y.each( WeeklyTimeModel.ATTRS.dayAliasMap.value, function( alias, day ) {
                    result.push( {
                        alias: alias,
                        day: day,
                        times: []
                    } );
                } );

                if( !(Array.isArray( times ) && times.length) ) {
                    return result;
                }

                result.forEach( function( item ) {
                    resultMap[item.day] = item;
                } );

                times.forEach( function( time ) {
                    time.days.forEach( function( day ) {

                        resultMap[day].times.push( {start: time.formattedStart, end: time.formattedEnd} );
                    } );
                } );

                result.forEach( function( item ) {
                    if( item.times.length ) {
                        item.times.sort( function( a, b ) {
                            return Y.ArraySort.naturalCompare( a.start, b.start );
                        } );
                    }
                    else {
                        item.times.push( i18n( 'LocationModel.NO_VISITING_HOUR' ) );
                    }
                } );

                return result;
            },
            checkCommercialNoComputed: function() {
                var self = this,
                    locationId = self._id(),
                    commercialNo = self.commercialNo();

                self.commercialNo.hasError( false );
                self.commercialNo.validationMessages( [] );

                if( commercialNo ) {
                    Y.doccirrus.jsonrpc.api.settings.read().done( function ( result ){
                        if( result && result.data && result.data[0] && result.data[0].allowSameCommercialNo === true ){
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.location.isCommercialNoAlreadyAssigned( {
                            locationId: locationId || null,
                            commercialNo: commercialNo
                        } ) ).catch( function( err ) {
                            if( err && '40000' === err.code ) {
                                self.commercialNo.hasError( true );
                                self.commercialNo.validationMessages.push( err.message );
                            } else {
                                Y.log( 'could not check if commericalNo is unique ' + err, 'error', NAME );
                            }
                        } );
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

                }
            }
        }, {
            schemaName: 'v_location',
            NAME: 'LocationModel'
        } );
        KoViewModel.registerConstructor( LocationModel );

        /**
         * @class LocationEditModel
         * @constructor
         * @extends LocationModel
         */
        function LocationEditModel( config ) {
            LocationEditModel.superclass.constructor.call( this, config );
        }

        Y.extend( LocationEditModel, LocationModel, {
            initializer: function LocationEditModel_initializer() {
                var
                    self = this;

                self.initLocationEditModel();
            },
            destructor: function LocationEditModel_destructor() {
            },
            // overwrite
            _getBoilerplateDefinition: function LocationEditModel__getBoilerplateDefinition() {
                var
                    self = this,
                    definition = LocationEditModel.superclass._getBoilerplateDefinition.apply( self, arguments );

                if( self.get( 'useKbvZipCheck' ) ) {
                    // no async validations, handle somehow
                    definition.kbvZip = Y.clone( definition.kbvZip, true );
                    if( !definition.kbvZip.validate ) {
                        definition.kbvZip.validate = [];
                    }
                    definition.kbvZip.validate.push( {
                        validator: function( val ) {
                            var
                                zip = this.zip,
                                zipExists = peek( self.zipExists ),
                                valid = Y.doccirrus.validations.common._Address_T_zip.call( this, val );

                            if( zip && !zipExists && !valid && 'CH' !== this.countryCode ) {
                                return false;
                            }
                            return true;
                        },
                        msg: i18n( 'validations.message.zip' )
                    } );
                }

                return definition;
            },
            // overwrite
            _runBoilerplate: function LocationEditModel__runBoilerplate() {
                var
                    self = this;

                LocationEditModel.superclass._runBoilerplate.apply( self, arguments );

                // handle not schema defined
                self._runBoilerplateEach( [], 'employees' );

            },
            // overwrite
            afterInit: function LocationEditModel_afterInit() {
                var
                    self = this;

                LocationEditModel.superclass.afterInit.apply( self, arguments );

                self.initValidateDependencies();
            },
            /**
             * validate those dependencies
             */
            initValidateDependencies: function LocationEditModel_initValidateDependencies() {
                var
                    self = this;

                // street dependencies
                self.addDisposable( ko.computed( function() {
                    self.kind();
                    self.countryCode();
                    self.postbox();
                    ko.ignoreDependencies( self.street.validate );
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                // houseno dependencies
                self.addDisposable( ko.computed( function() {
                    self.kind();
                    ko.ignoreDependencies( self.houseno.validate );
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                // zip dependencies
                self.addDisposable( ko.computed( function() {
                    self.countryCode();
                    ko.ignoreDependencies( self.zip.validate );
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                // postbox dependencies
                self.addDisposable( ko.computed( function() {
                    self.kind();
                    ko.ignoreDependencies( self.postbox.validate );
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                // validate those kbvZip dependencies
                self.addDisposable( ko.computed( function() {
                    self.countryCode();
                    self.zip();
                    if( self.get( 'useKbvZipCheck' ) ) {
                        self.zipExists();
                    }
                    ko.ignoreDependencies( self.kbvZip.validate );
                } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

            },
            /**
             * Initialises "LocationEditModel"
             */
            initLocationEditModel: function LocationEditModel_initLocationEditModel() {
                var
                    self = this;

                self.initSelect2CountryCode( self.get( 'useSelect2CountryCode' ) );
                self.initSelect2Zip( self.get( 'useSelect2Zip' ) );
                self.initSelect2City( self.get( 'useSelect2City' ) );

                self.initKbvZip();

                self.initSelect2CommercialNo( self.get( 'useSelect2CommercialNo' ) );

                self.initLocationsList();
                self.initEmployeesList();
                self.initMainLocationId();
                self.initEmployees();
                self.initDefaultPrinterDisabled();
                self.initPrintersList();

                self.getKvOnValidZip = ko.computed( self.getKvOnValidZipComputedRead, self ).extend( {rateLimit: 0} );
            },
            /**
             * May hold select2-binding config for "commercialNo"
             * @type {null|object}
             */
            select2CommercialNoConfig: null,
            /**
             * Initialises select2-binding config for "commercialNo"
             * @method initSelect2CommercialNo
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2CommercialNo: function LocationEditModel_initSelect2CommercialNo( mode ) {
                var
                    self = this,
                    select2CommercialNoConfig;

                if( !mode ) {
                    return;
                }

                select2CommercialNoConfig = self.get( 'select2CommercialNoConfig' );

                self.select2CommercialNoConfig = select2CommercialNoConfig.call( this );

            },
            /**
             * Read computed handler of select2-binding config for "commercialNo"
             * @method select2CommercialNoComputedRead
             * @protected
             */
            select2CommercialNoComputedRead: function LocationEditModel_select2CommercialNoComputedRead() {
                var
                    self = this,
                    commercialNo = ko.unwrap( self.commercialNo );

                if( commercialNo ) {
                    return {id: commercialNo, text: commercialNo};
                }
                else {
                    return null;
                }
            },
            /**
             * Write computed handler of select2-binding config for "commercialNo"
             * @method select2CommercialNoComputedWrite
             * @protected
             */
            select2CommercialNoComputedWrite: function LocationEditModel_select2CommercialNoComputedWrite( $event ) {
                var
                    self = this;
                self.nonStandardCommercialNo( $event && $event.added && $event.added.nonStandard === true );
                self.commercialNo( $event.val );
            },
            /**
             * Available locations
             * @type {null|ko.observableArray}
             */
            locationsList: null,
            /**
             * Initialises available locations
             */
            initLocationsList: function LocationEditModel_initLocationsList() {
                var
                    self = this;

                self.locationsList = ko.observableArray();
                self.get( 'locationsDeferredList' )
                    .done( function( results ) {
                        self.locationsList( results );
                    } );

            },
            /**
             * Available employees
             * @type {null|ko.observableArray}
             */
            employeesList: null,
            /**
             * Initialises available employees
             */
            initEmployeesList: function LocationEditModel_initEmployeesList() {
                var
                    self = this;

                self.employeesList = ko.observableArray();
                self.get( 'employeesDeferredList' )
                    .then( function( results ) {
                        results.sort( function( a, b ) {
                            var strA, strB;
                            strA = a.lastname + ' ' + a.firstname;
                            strB = b.lastname + ' ' + b.firstname;
                            return strA.localeCompare( strB );
                        } );
                        return results;
                    } )
                    .done( function( results ) {
                        self.employeesList( results );
                    } );

            },
            /**
             * Initialises handling of employees
             */
            initEmployees: function LocationEditModel_initEmployees() {
                var
                    self = this;

                self.computePhysiciansList = ko.computed( self.computePhysiciansListComputed, self );
                self.computePhysicians = ko.computed( self.computePhysiciansComputed, self );

                self.computeOthersList = ko.computed( self.computeOthersListComputed, self );
                self.computeOthers = ko.computed( self.computeOthersComputed, self );

                self.initSelect2PhysiciansConfig( self.get( 'useSelect2PhysiciansConfig' ) );
                self.initSelect2OthersConfig( self.get( 'useSelect2OthersConfig' ) );
            },

            printers: ko.observableArray([]),

            showPrinterAssignmentsUI: null,

            defaultPrinterDisabled: null,

            initDefaultPrinterDisabled: function LocationEditModel_initDefaultPrinterDisabled() {
                var self = this;
                self.defaultPrinterDisabled = ko.computed(function() {
                    var
                        plainEnabled = ko.unwrap( self.enabledPrinters ) || [],
                        plainDefault = ko.unwrap( self.defaultPrinter ) || [];

                    //  since this fires on change to enabledPrinters, check the default while we're here
                    if (1 === plainEnabled.length) {
                        //  if there is only one enabled printer then it must be the default printer
                        self.defaultPrinter(plainEnabled[0]);
                    }

                    if (-1 === plainEnabled.indexOf(plainDefault)) {
                        //  if the default printer is not enabled, change it to one that is
                        self.defaultPrinter(plainEnabled[0]);
                    }

                    return plainEnabled.length === 0;
                });

                self.showPrinterAssignmentsUI = ko.computed(function() {
                    var plainEnabled = ko.unwrap(self.enabledPrinters) || [];
                    return plainEnabled.length > 0;
                });
            },

            initPrintersList: function LocationEditModel_initPrintersList() {
                var
                    self = this;

                //  needs to be done immediately or the binding will fail, does not wait for printers to load
                self.initSelect2Printers();

                //  don't reload the printers from server if we don't have to

                if (Y.doccirrus.cachePrinters) {
                    cachePrinters = Y.doccirrus.cachePrinters;
                }

                if ( cachePrinters ) {
                    onListPrinters( cachePrinters );
                    return;
                }

                Y.doccirrus.jsonrpc.api.printers.getPrinter().then( onListPrinters ).fail( onListPrintersFailed );

                function onListPrinters( data) {

                    self.printers = ko.observableArray([]);

                    var i;
                    data = data.data ? data.data : data;

                    //  keep for next time
                    if (!cachePrinters) { cachePrinters = data; }

                    //  update the URL of the printer configuration page while we're here
                    self.formsConfigUrl('/formprinters#' + (ko.unwrap(self._id) || ''));

                    for (i = 0; i < data.length; i++) {
                        self.printers.push({ 'val': data[i].name, 'text': data[i].name });
                    }

                    self.initSelect2Printers();
                    //$('#tab_locations-editing-enabledPrinters').trigger('change');
                }

                function onListPrintersFailed( err ) {
                    Y.log('Could not load printers: ' + JSON.stringify(err), 'warn', NAME);
                }

                //Y.doccirrus.comctl.privateGet('/1/printer/:getPrinter', {}, onListPrinters);

            },

            select2Printers: null,

            initSelect2Printers: function LocationEditModel_initSelect2Printers() {
                var
                    self = this,
                    select2PrintersConfig = self.get('select2PrintersConfig');

                if (!initialPrinter && self.defaultPrinter && ko.unwrap(self.defaultPrinter)) {
                    //Y.log('Noting initial printer: ' + initialPrinter, 'debug', NAME);
                    initialPrinter = ko.unwrap(self.defaultPrinter);
                }

                self.select2Printers = select2PrintersConfig.call(this);

                if (initialPrinter) {
                    Y.log('Resetting default printer from received object: ' + ko.unwrap(self.defaultPrinter) + ' --> ' + initialPrinter, 'debug', NAME);
                    self.defaultPrinter(initialPrinter);
                }
            },

            formsConfigUrl: ko.observable( '/formprinters' ),

            /**
             *  Insert UI to assign forms to printers
             */

            initFormPrinterAssignment: function LocationEditModel_initFormPrinterAssignment() {

                var jqDiv = $('#divFormPrinterAssignments');

                if (!jqDiv.length) { return; }

                jqDiv.html(Y.doccirrus.comctl.getThrobber());

                var
                    self = this,
                    bindNode;

                bindNode = Y.one('#divFormPrinterAssignments');

                if (!bindNode) {
                    Y.log('no node to insert formprinters UI', 'warn', NAME);
                    return;
                }

                bindNode.passToBinder = { 'location': self};

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'formprinters_assign',
                    'FormEditorMojit',
                    { },
                    bindNode,
                    function() {
                        Y.log( 'Form Printer Assignments Editor loaded', 'info', NAME );
                    }
                );
            },

            /**
             * Computes available employees of type physician to pick from
             * @return {Array}
             */
            computePhysiciansListComputed: function LocationEditModel_computePhysiciansListComputed() {
                var
                    self = this,
                    employeesList = ko.unwrap( self.employeesList );

                return Y.Array.filter( employeesList, isPhysician );
            },
            /**
             * Computes "employees" of type physician
             * @return {Array}
             */
            computePhysiciansComputed: function LocationEditModel_computePhysiciansComputed() {
                var
                    self = this,
                    employees = ko.unwrap( self.employees );

                return Y.Array.filter( employees, isPhysician );
            },
            /**
             * Computes available employees of type other than physician to pick from
             * @return {Array}
             */
            computeOthersListComputed: function LocationEditModel_computeOthersListComputed() {
                var
                    self = this,
                    employeesList = ko.unwrap( self.employeesList );

                return Y.Array.reject( employeesList, isPhysician );
            },
            /**
             * Computes "employees" of type other than physician
             * @return {Array}
             */
            computeOthersComputed: function LocationEditModel_computeOthersComputed() {
                var
                    self = this,
                    employees = ko.unwrap( self.employees );

                return Y.Array.reject( employees, isPhysician );
            },
            /**
             * Map an employee object to a select2 item object
             * @param {Object} employee
             * @return Object
             */
            employeeToSelect2Object: function LocationEditModel_employeeToSelect2Object( employee ) {
                return {
                    id: employee._id,
                    text: Y.doccirrus.schemas.person.personDisplay( employee ),
                    data: employee
                };
            },
            /**
             * May hold select2-binding config for "employees" of type physician
             * @type {null|object}
             */
            select2PhysiciansConfig: null,
            /**
             * Initialises select2-binding config for "employees" of type physician
             * @method initSelect2PhysiciansConfig
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2PhysiciansConfig: function LocationEditModel_initSelect2PhysiciansConfig( mode ) {
                var
                    self = this,
                    select2PhysiciansConfig;

                if( !mode ) {
                    return;
                }

                select2PhysiciansConfig = self.get( 'select2PhysiciansConfig' );

                self.select2PhysiciansConfig = select2PhysiciansConfig.call( this );

            },
            /**
             * Read computed handler of select2-binding config for "employees" of type physician
             * @method select2PhysiciansComputedRead
             * @protected
             */
            select2PhysiciansComputedRead: function LocationEditModel_select2PhysiciansComputedRead() {
                var
                    self = this;

                return ko.unwrap( self.computePhysicians ).map( self.employeeToSelect2Object );
            },
            /**
             * Write computed handler of select2-binding config for "employees" of type physician
             * @method select2PhysiciansComputedWrite
             * @protected
             */
            select2PhysiciansComputedWrite: function LocationEditModel_select2PhysiciansComputedWrite( $event ) {
                var
                    self = this;

                if( Y.Object.owns( $event, 'added' ) ) {
                    self.employees.push( $event.added.data );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    self.employees.remove( $event.removed.data );
                }
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2PhysiciansOnSelect: function LocationEditModel_select2PhysiciansOnSelect( /*$event*/ ) {

            },
            /**
             * May hold select2-binding config for "employees" of type other than physician
             * @type {null|object}
             */
            select2OthersConfig: null,
            /**
             * Initialises select2-binding config for "employees"
             * @method initSelect2OthersConfig
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2OthersConfig: function LocationEditModel_initSelect2OthersConfig( mode ) {
                var
                    self = this,
                    select2OthersConfig;

                if( !mode ) {
                    return;
                }

                select2OthersConfig = self.get( 'select2OthersConfig' );

                self.select2OthersConfig = select2OthersConfig.call( this );

            },
            /**
             * Read computed handler of select2-binding config for "employees" of type other than physician
             * @method select2OthersComputedRead
             * @protected
             */
            select2OthersComputedRead: function LocationEditModel_select2OthersComputedRead() {
                var
                    self = this;

                return ko.unwrap( self.computeOthers ).map( self.employeeToSelect2Object );
            },
            /**
             * Write computed handler of select2-binding config for "employees" of type other than physician
             * @method select2OthersComputedWrite
             * @protected
             */
            select2OthersComputedWrite: function LocationEditModel_select2OthersComputedWrite( $event ) {
                var
                    self = this;

                if( Y.Object.owns( $event, 'added' ) ) {
                    self.employees.push( $event.added.data );
                }
                if( Y.Object.owns( $event, 'removed' ) ) {
                    self.employees.remove( $event.removed.data );
                }
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2OthersOnSelect: function LocationEditModel_select2OthersOnSelect( /*$event*/ ) {

            },
            /**
             * Observable of "mainLocationIdVisibleComputed"
             * @type {null|ko.computed}
             */
            computeMainLocationIdVisible: null,
            /**
             * Observable of "computeGkvInvoiceReceiverVisible"
             * @type {null|ko.computed}
             */
            computeGkvInvoiceReceiverVisible: null,
            /**
             * Observable of "mainLocationIdDisableComputed"
             * @type {null|ko.computed}
             */
            computeMainLocationIdDisable: null,
            /**
             * Observable of "mainSuperLocationDisableComputed"
             * @type {null|ko.computed}
             */
            computeMainSuperLocationDisable: null,
            /**
             * Initialises "mainLocationId" handling
             */
            initMainLocationId: function LocationEditModel_initMainLocationId() {
                var
                    self = this;

                self.computeMainLocationIdVisible = ko.computed( self.mainLocationIdVisibleComputed, self );
                self.computeGkvInvoiceReceiverVisible = ko.computed( self.gkvInvoiceReceiverVisibleComputed, self );
                self.computeMainLocationIdDisable = ko.computed( self.mainLocationIdDisableComputed, self );
                self.computeMainSuperLocationDisable = ko.computed( function (){
                    var
                        self = this,
                        id = ko.unwrap( self._id );
                    return id && ( self.membersOfSuperLocations || [] ).includes( id );
                }, self );

                self.addDisposable( ko.computed( self.resetOnIsAdditionalLocationChangeComputed, self ) );

                self.initSelect2MainLocationId( self.get( 'useSelect2MainLocationId' ) );

                self.select2gkvInvoiceReceiverConfig = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return self.gkvInvoiceReceiver();
                        },
                        write: function( event ) {
                            self.gkvInvoiceReceiver( event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: i18n( 'location-schema.Location_T.gkvInvoiceReceiver.i18n' ),
                        allowClear: true,
                        data: Y.doccirrus.schemas.location.types.GkvInvoiceReceiver_E.list.map( function( entry ) {
                            return {id: entry.val, text: [entry.val, entry.i18n].join( ' ' )};
                        } )
                    }
                };

                self.addDisposable( ko.computed( function() {
                    var
                        commercialNo = unwrap( self.commercialNo ),
                        newGkvInvoiceReceiver;

                    if( ko.computedContext.isInitial() || !commercialNo ) {
                        return;
                    }

                    newGkvInvoiceReceiver = Y.doccirrus.schemas.location.getGkvInvoiceReceiverFromCommercialNo( commercialNo );

                    self.gkvInvoiceReceiver( newGkvInvoiceReceiver );
                } ) );

                self.addDisposable( ko.computed( function() {
                    self.commercialNo();
                    self.isAdditionalLocation();
                    self.mainLocationId.validate();
                    self.gkvInvoiceReceiver.validate();
                } ) );

            },
            /**
             * May hold select2-binding config for "mainLocationId"
             * @type {null|object}
             */
            select2MainLocationIdConfig: null,
            /**
             * Initialises select2-binding config for "mainLocationId"
             * @method initSelect2MainLocationId
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2MainLocationId: function LocationEditModel_initSelect2MainLocationId( mode ) {
                var
                    self = this,
                    select2MainLocationIdConfig;

                if( !mode ) {
                    return;
                }

                select2MainLocationIdConfig = self.get( 'select2MainLocationIdConfig' );

                self.select2MainLocationIdConfig = select2MainLocationIdConfig.call( this );

            },
            /**
             * Read computed handler of select2-binding config for "mainLocationId"
             * @method select2MainLocationIdComputedRead
             * @protected
             */
            select2MainLocationIdComputedRead: function LocationEditModel_select2MainLocationIdComputedRead() {
                var
                    self = this,
                    mainLocationId = ko.unwrap( self.mainLocationId );

                return mainLocationId || '';
            },
            /**
             * Write computed handler of select2-binding config for "mainLocationId"
             * @method select2MainLocationIdComputedWrite
             * @protected
             */
            select2MainLocationIdComputedWrite: function LocationEditModel_select2MainLocationIdComputedWrite( $event ) {
                var
                    self = this;

                self.mainLocationId( $event.val );
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2MainLocationIdOnSelect: function LocationEditModel_select2MainLocationIdOnSelect( /*$event*/ ) {

            },
            /**
             * Computes the visibility of "mainLocationId"
             * @return {boolean}
             */
            mainLocationIdVisibleComputed: function LocationEditModel_mainLocationIdVisibleComputed() {
                var
                    self = this,
                    isAdditionalLocation = ko.unwrap( self.isAdditionalLocation );

                return isAdditionalLocation;
            },
            /**
             * Computes the visibility of "gkvInvoiceReceiver"
             * @return {boolean}
             */
            gkvInvoiceReceiverVisibleComputed: function LocationEditModel_gkvInvoiceReceiverVisibleComputed() {
                var
                    self = this,
                    commercialNo = ko.unwrap( self.commercialNo ),
                    isAdditionalLocation = ko.unwrap( self.isAdditionalLocation );

                return commercialNo && !isAdditionalLocation;
            },
            /**
             * Computes the disabled state of "mainLocationId"
             * @return {boolean}
             */
            mainLocationIdDisableComputed: function LocationEditModel_mainLocationIdDisableComputed() {
                var
                    self = this,
                    id = ko.unwrap( self._id ),
                    locationsList = ko.unwrap( self.locationsList );

                return id && locationsList.some( function( location ) {
                    return location.mainLocationId === id;
                } );
            },
            /**
             * Computes and resets necessary "isAdditionalLocation" changes
             */
            resetOnIsAdditionalLocationChangeComputed: function LocationEditModel_resetOnIsAdditionalLocationChangeComputed() {
                var
                    self = this,
                    isAdditionalLocation = self.isAdditionalLocation();

                if( ko.computedContext.isInitial() ) {
                    return;
                }

                if( !isAdditionalLocation ) {
                    self.mainLocationId( '' );
                }
            },
            /**
             * May hold select2-binding config for "kbvZip"
             * @type {null|object}
             */
            select2KbvZipConfig: null,
            /**
             * Initialises select2-binding config for "kbvZip"
             * @method initSelect2KbvZip
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2KbvZip: function LocationEditModel_initSelect2KbvZip( mode ) {
                var
                    self = this,
                    select2KbvZipConfig;

                if( !mode ) {
                    return;
                }

                select2KbvZipConfig = self.get( 'select2KbvZipConfig' );

                self.select2KbvZipConfig = select2KbvZipConfig.call( this );
            },
            /**
             * Observable of "select2KbvZipVisibleComputedRead" & "select2KbvZipVisibleComputedWrite"
             * @type {null|ko.computed}
             */
            select2KbvZipVisible: null,
            /**
             * The Observable of "select2KbvZipVisible"
             * @type {null|ko.computed}
             */
            select2KbvZipVisibleObservable: null,
            /**
             * The Observable for checking if "zip" is an KBV existing zip
             * @type {null|ko.observable}
             */
            zipExists: null,
            /**
             * Initialises "kbvZip" handling
             */
            initKbvZip: function LocationEditModel_initKbvZip() {
                var
                    self = this;

                self.select2KbvZipVisibleObservable = ko.observable( false );

                self.initSelect2KbvZip( self.get( 'useSelect2KbvZip' ) );

                if( self.get( 'useKbvZipCheck' ) ) {

                    self.zipExists = ko.observable( true );

                    self.addDisposable( ko.computed( self.computeKbvZipCheck, self ).extend( {rateLimit: 0} ) );
                }

                self.select2KbvZipVisible = ko.computed( {
                    read: self.select2KbvZipVisibleComputedRead,
                    write: self.select2KbvZipVisibleComputedWrite
                }, self ).extend( {rateLimit: 0} );

            },
            /**
             * Computes the visibility of "kbvZip"
             * @return {boolean}
             */
            computeKbvZipCheck: function LocationEditModel_computeKbvZipCheck() {
                var
                    self = this,
                    zipDisabled = ko.unwrap( self.select2ZipDisabled ),
                    zip = ko.unwrap( self.zip ),
                    zipValid = ko.ignoreDependencies( function() {
                        return self.zip.validateNow().valid;
                    } );

                ko.unwrap( self.kbvZip );

                self.zipExists( true );

                if( !zipDisabled && zipValid && Y.doccirrus.catalogmap.getCatalogSDPLZ() ) {
                    jQuery
                        .ajax( {
                            type: 'GET', xhrFields: {withCredentials: true},
                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                            data: {
                                action: 'catsearch',
                                catalog: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
                                itemsPerPage: 10,
                                term: zip
                            }
                        } )
                        .done( function( result ) {
                            if( Array.isArray( result ) && !result.length ) {
                                self.zipExists( false );
                            }
                        } );
                }

            },
            /**
             * Read computed handler of "select2KbvZipVisible"
             * @method select2KbvZipVisibleComputedRead
             * @protected
             */
            select2KbvZipVisibleComputedRead: function LocationEditModel_select2KbvZipVisibleComputedRead() {
                var
                    self = this,
                    kbvZip = ko.unwrap( self.kbvZip ),
                    zipExists,
                    select2KbvZipVisibleObservable = ko.unwrap( self.select2KbvZipVisibleObservable );

                if( self.get( 'useKbvZipCheck' ) ) {
                    zipExists = ko.unwrap( self.zipExists );
                    return kbvZip || select2KbvZipVisibleObservable || !zipExists;
                }

                return kbvZip || select2KbvZipVisibleObservable;
            },
            /**
             * Write computed handler of "select2KbvZipVisible"
             * @method select2KbvZipVisibleComputedWrite
             * @protected
             */
            select2KbvZipVisibleComputedWrite: function LocationEditModel_select2KbvZipVisibleComputedWrite( value ) {
                var
                    self = this;

                self.select2KbvZipVisibleObservable( value );
            },
            /**
             * Read computed handler of select2-binding config for "kbvZip"
             * @method select2KbvZipComputedRead
             * @protected
             */
            select2KbvZipComputedRead: function LocationEditModel_select2KbvZipComputedRead() {
                var
                    self = this,
                    kbvZip = self.kbvZip();

                if( kbvZip ) {
                    return {id: kbvZip, text: kbvZip};
                }
                else {
                    return null;
                }
            },
            /**
             * Write computed handler of select2-binding config for "kbvZip"
             * @method select2KbvZipComputedWrite
             * @param {object} $event
             * @protected
             */
            select2KbvZipComputedWrite: function LocationEditModel_select2KbvZipComputedWrite( $event ) {
                var
                    self = this;

                self.kbvZip( $event.val );
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2KbvZipOnSelect: function LocationEditModel_select2KbvZipOnSelect( /*$event*/ ) {

            },

            /**
             * Get KV from valid zip code
             */
            getKvOnValidZipComputedRead: function() {
                var self = this,
                    zip = this.zip(),
                    kbvZip = this.kbvZip(),
                    zipExists = this.zipExists(),
                    zipToSearch = zipExists ? zip : kbvZip;

                if( !zipToSearch || !Y.doccirrus.catalogmap.getCatalogSDPLZ() ) {
                    this.kv( '' );
                    return;
                }
                jQuery
                    .ajax( {
                        type: 'GET', xhrFields: {withCredentials: true},
                        url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                        data: {
                            action: 'catsearch',
                            catalog: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
                            itemsPerPage: 10,
                            term: zipToSearch
                        }
                    } )
                    .done( function( result ) {
                        var kv = result && result[0] && result[0].kv;
                        if( kv ) {
                            self.kv( kv );
                        }
                    } );
            }
        }, {
            schemaName: LocationModel.schemaName,
            NAME: 'LocationEditModel',
            ATTRS: {
                getTypeName: {
                    // overwrite
                    value: function( typeName/*, propertyName, schemaFullPath*/ ) {
                        switch( typeName ) {
                            case 'WeeklyTime_T':
                                return 'WeeklyTimeEditModel';
                            default:
                                return false;
                        }
                    },
                    lazyAdd: false
                },
                useSelect2CountryCode: {
                    /**
                     * Determines if a select2-binding config for "country" should be initialised
                     * @attribute useSelect2CountryCode
                     * @for LocationEditModel
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2CountryCodeConfig: AddressModel.ATTRS.select2CountryCodeConfig,

                useSelect2Zip: {
                    /**
                     * Determines if a select2-binding config for "zip" should be initialised
                     * @attribute useSelect2Zip
                     * @for LocationEditModel
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2ZipConfig: AddressModel.ATTRS.select2ZipConfig,

                useSelect2City: {
                    /**
                     * Determines if a select2-binding config for "city" should be initialised
                     * @attribute useSelect2City
                     * @for LocationEditModel
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2CityConfig: AddressModel.ATTRS.select2CityConfig,

                _cities: AddressModel.ATTRS._cities,

                validatable: {
                    value: true,
                    lazyAdd: false
                },

                locationsDeferredList: {
                    valueFn: function( /*key*/ ) {
                        return Y.doccirrus.jsonrpc.api.location
                            .read()
                            .then( function( response ) {
                                return response && response.data || [];
                            } );
                    },
                    validator: function( value/*, key, options*/ ) {
                        return Y.Lang.isObject( value ) && Y.Lang.isFunction( value.then );
                    }
                },

                employeesDeferredList: {
                    valueFn: function( /*key*/ ) {
                        return Y.doccirrus.jsonrpc.api.employee
                            .read()
                            .then( function( response ) {
                                return response && response.data || [];
                            } );
                    },
                    validator: function( value/*, key, options*/ ) {
                        return Y.Lang.isObject( value ) && Y.Lang.isFunction( value.then );
                    }
                },

                useSelect2CommercialNo: {
                    /**
                     * Determines if a select2-binding config for "commercialNo" should be initialised
                     * @attribute useSelect2CommercialNo
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2CommercialNoConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "commercialNo"
                     * @attribute select2CommercialNoConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function() {
                        var
                            self = this;

                        return {
                            data: self.addDisposable( ko.computed( {
                                read: self.select2CommercialNoComputedRead,
                                write: self.select2CommercialNoComputedWrite
                            }, self ) ),
                            select2: {
                                width: '100%',
                                placeholder: i18n( 'location-schema.Location_T.commercialNo.placeholder' ),
                                allowClear: true,
                                minimumInputLength: 1,
                                createSearchChoice: function( term ) {
                                    return {
                                        id: term,text: term,
                                        nonStandard: true
                                    };
                                },
                                query: function( query ) {

                                    function done( all ) {
                                        query.callback( {
                                            results: all.map( function( bsnr ) {
                                                return {id: bsnr, text: bsnr};
                                            } )
                                        } );
                                    }

                                    // handle not having a catalog
                                    if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                                        done( [] );
                                    }
                                    else {
                                        jQuery
                                            .ajax( {
                                                type: 'GET',
                                                xhrFields: {withCredentials: true},
                                                url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/?action=catsearch&' + Y.QueryString.stringify( {
                                                    catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                                    itemsPerPage: 10,
                                                    term: query.term,
                                                    key: 'bsnr'
                                                } ) )
                                            } )
                                            .then( function( results ) {
                                                return results.map( function( item ) {
                                                    return item.bsnr;
                                                } );
                                            } )
                                            .done( done );
                                    }

                                }
                            }
                        };
                    }
                },

                useSelect2MainLocationId: {
                    /**
                     * Determines if a select2-binding config for "mainLocationId" should be initialised
                     * @attribute useSelect2MainLocationId
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2MainLocationIdConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "mainLocationId"
                     * @attribute select2MainLocationIdConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function() {
                        var
                            self = this,
                            locationsList = [];

                        self.get( 'locationsDeferredList' ).done( function( results ) {
                            locationsList = results;
                        } );

                        return {
                            val: self.addDisposable( ko.computed( {
                                read: self.select2MainLocationIdComputedRead,
                                write: self.select2MainLocationIdComputedWrite
                            }, self ) ),
                            select2: {
                                width: '100%',
                                placeholder: i18n( 'location-schema.Location_T.mainLocationId.placeholder' ),
                                allowClear: true,
                                data: function() {

                                    return {
                                        results: Y.Array
                                            .filter( locationsList, function( location ) {
                                                return !location.isAdditionalLocation && ko.unwrap( self._id ) !== location._id;
                                            } )
                                            .map( function( location ) {
                                                return {id: location._id, text: location.locname};
                                            } )
                                    };
                                },
                                initSelection: function( element, callback ) {
                                    var
                                        id = ko.unwrap( self.mainLocationId ),
                                        text;

                                    self.get( 'locationsDeferredList' )
                                        .done( function( results ) {

                                            results.some( function( location ) {
                                                if( location._id === id ) {
                                                    text = location.locname;
                                                    return true;
                                                }
                                            } );
                                            callback( {id: id, text: text} );
                                        } );
                                }
                            },
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2MainLocationIdOnSelect( $event );
                                } );
                            }
                        };
                    }
                },

                useSelect2PhysiciansConfig: {
                    /**
                     * Determines if a select2-binding config for "employees" should be initialised
                     * @attribute useSelect2PhysiciansConfig
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2PhysiciansConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "employees"
                     * @attribute select2PhysiciansConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function() {
                        var
                            self = this;

                        return {
                            data: self.addDisposable( ko.computed( {
                                read: self.select2PhysiciansComputedRead,
                                write: self.select2PhysiciansComputedWrite
                            }, self ) ),
                            select2: {
                                width: '100%',
                                allowClear: true,
                                placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                                multiple: true,
                                data: function() {
                                    return {
                                        results: Y.Array.map( ko.unwrap( self.computePhysiciansList ), self.employeeToSelect2Object )
                                    };
                                }
                            },
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2PhysiciansOnSelect( $event );
                                } );
                            }
                        };
                    }
                },

                useSelect2OthersConfig: {
                    /**
                     * Determines if a select2-binding config for "employees" should be initialised
                     * @attribute useSelect2OthersConfig
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                select2OthersConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "employees"
                     * @attribute select2OthersConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function() {
                        var
                            self = this;

                        return {
                            data: self.addDisposable( ko.computed( {
                                read: self.select2OthersComputedRead,
                                write: self.select2OthersComputedWrite
                            }, self ) ),
                            select2: {
                                width: '100%',
                                allowClear: true,
                                placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                                multiple: true,
                                data: function() {
                                    return {
                                        results: Y.Array.map( ko.unwrap( self.computeOthersList ), self.employeeToSelect2Object )
                                    };
                                }
                            },
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2OthersOnSelect( $event );
                                } );
                            }
                        };
                    }
                },

                useSelect2KbvZip: {
                    /**
                     * Determines if a select2-binding config for "kbvZip" should be initialised
                     * @attribute useSelect2KbvZip
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                },

                useKbvZipCheck: {
                    value: true,
                    lazyAdd: false
                },

                select2KbvZipConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "kbvZip"
                     * @attribute select2KbvZipConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function() {
                        var
                            self = this;

                        return {
                            data: self.addDisposable( ko.computed( {
                                read: self.select2KbvZipComputedRead,
                                write: self.select2KbvZipComputedWrite
                            }, self ) ),
                            select2: {
                                minimumInputLength: 1,
                                allowClear: true,
                                maximumInputLength: 10,
                                placeholder: i18n( 'location-schema.Location_T.kbvZip.placeholder' ),
                                query: function( query ) {

                                    function done( data ) {
                                        // publish results
                                        query.callback( {
                                            results: data.map( function( item ) {
                                                return {id: item.plz, text: item.plz};
                                            } )
                                        } );
                                    }

                                    // handle not having a catalog
                                    if( null === Y.doccirrus.catalogmap.getCatalogSDPLZ() ) {
                                        done( [] );
                                    }
                                    else {
                                        jQuery
                                            .ajax( {
                                                type: 'GET', xhrFields: {withCredentials: true},
                                                url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                                data: {
                                                    action: 'catsearch',
                                                    catalog: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
                                                    itemsPerPage: 10,
                                                    term: query.term
                                                }
                                            } )
                                            .done( done )
                                            .fail( function() {
                                                done( [] );
                                            } );
                                    }

                                }
                            },
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2KbvZipOnSelect( $event );
                                } );
                            }
                        };
                    }
                },

                select2PrintersConfig: {
                    /**
                     *  Set up a select2 control for printers available at this location
                     *
                     *  The enabledPrinters property is used by /printersettings
                     *
                     * @attribute select2PrintersConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */

                    'value': function() {
                        var
                            self = this,
                            selPrinters = ko.unwrap(self.enabledPrinters) || [];

                        function select2PrintersRead() {
                            var i, temp = [];

                            if (!cachePrinters) {
                                Y.log('Printers not yet loaded, waiting on AJAX: ' + JSON.stringify(selPrinters), 'debug', NAME);
                                return temp;
                            }

                            for (i = 0; i < cachePrinters.length; i++) {
                                if (-1 !== selPrinters.indexOf(cachePrinters[i].name)) {
                                    temp.push({id: cachePrinters[i].name, text: cachePrinters[i].name});
                                }
                            }

                            //Y.log('sel2Printers read: ' + JSON.stringify(temp), 'debug', NAME);
                            return temp;
                        }

                        function select2PrintersWrite($event) {
                            var
                                newPrinters,
                                locationId,
                                printerName,
                                i;

                            if ('change' === $event.type) {
                                if ($event.removed) {
                                    locationId =  unwrap( self._id ) || '';
                                    printerName = $event.removed.id || '';

                                    Y.log( 'select2printerswrite remove: ' + printerName + ' from location: ' + locationId, 'debug', NAME );
                                    //  remove from the set of printers on the location model
                                    newPrinters = [];
                                    for (i = 0; i < selPrinters.length; i++) {
                                        if (printerName !== selPrinters[i]) {
                                            newPrinters.push(selPrinters[i]);
                                        }
                                    }

                                    selPrinters = newPrinters;

                                    //  remove any per-user settings which rely on the removed printer
                                    if ( '' !== locationId && '' !== locationId ) {
                                        Y.doccirrus.comctl.privatePost(
                                            '/1/formprinter/:clearuserassignments',
                                            {
                                                'printerName': printerName,
                                                'locationId': locationId
                                            },
                                            function onUserAssignmentsCleared( err ) {
                                                if ( err ) {
                                                    Y.log( 'Error clearing user assignments for printer: ' + JSON.stringify( err ), 'warn', NAME );
                                                    return;
                                                }

                                                Y.log( 'Cleared per-user assignments for printer ' + printerName + ' at location: ' + locationId, 'info', NAME );
                                            }
                                        );
                                    }

                                }
                            }

                            if ('change' === $event.type) {
                                if ($event.added) {
                                    if (-1 === selPrinters.indexOf($event.added.id)) {
                                        selPrinters.push($event.added.id);
                                    }
                                }
                            }

                            self.enabledPrinters(selPrinters);
                        }

                        return {
                            //data: self.addDisposable( ko.computed( {
                            data: ko.computed( {
                                read: select2PrintersRead,
                                write: select2PrintersWrite
                            }, self ),
                            //}, self ) ),
                            select2: {
                                minimumInputLength: 0,
                                allowClear: true,
                                maximumInputLength: 100,
                                placeholder: i18n( 'InSuiteAdminMojit.tab_locations.placeholder.PRINTERS' ),
                                multiple: true,

                                query: function( query ) {
                                    var
                                        terms = query.term.split(' '),
                                        term,
                                        printerName,
                                        matches = [],
                                        match,
                                        i, j;

                                    if (!cachePrinters) { return matches; }

                                    for (i = 0; i < cachePrinters.length; i++) {
                                        printerName = cachePrinters[i].name.toLowerCase();
                                        match = true;

                                        //  check against user query
                                        for (j = 0; j < terms.length; j++) {
                                            term = $.trim(terms[j].toLowerCase());
                                            if ('' !== term) {
                                                if (-1 === printerName.indexOf(term)) {
                                                    //  query term not in printer name, does not match
                                                    match = false;
                                                }
                                            }
                                        }

                                        if (match) {
                                            matches.push({ id: cachePrinters[i].name, text: cachePrinters[i].name });
                                        }
                                    }

                                    query.callback({ 'results': matches });

                                }
                            },
                            init: function( /* element */ ) {
                                Y.log( 'Initializing select2 for printers', 'debug', NAME );
                                //jQuery( element ).on( 'select2-selected', function( $event ) {
                                //console.log('select2PrintersOnSelect', $event);
                                //} );
                            }
                        };

                    }
                } // end select2PrintersConfig

            }
        } );

        Y.mix( LocationEditModel, AddressModel, false, [
            'select2CountryCode',
            'initSelect2CountryCode',
            'select2CountryCodeComputedRead',
            'select2CountryCodeComputedWrite',
            'select2CountryCodeOnSelect'
        ], 1 );

        Y.mix( LocationEditModel, AddressModel, false, [
            'select2Zip',
            'select2ZipDisabled',
            'select2ZipDisabledComputedRead',
            'initSelect2Zip',
            'select2ZipComputedRead',
            'select2ZipComputedWrite',
            'select2ZipOnSelect'
        ], 1 );

        Y.mix( LocationEditModel, AddressModel, false, [
            'select2City',
            'initSelect2City'
        ], 1 );

        KoViewModel.registerConstructor( LocationEditModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'dcvalidations',
            'KoViewModel',
            'v_location-schema',
            'person-schema',
            'AddressModel',
            'WeeklyTimeModel',
            'LocationEditModel_CH'
        ]
    }
);