/*global YUI, ko */

'use strict';

YUI.add( 'printmultiplemodal', function( Y, NAME ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        DEFAULT_LOCATION = '000000000000000000000001';

        /**
         * ListToPrintViewModel
         * @param config
         * @constructor
         */
        function ListToPrintViewModel( config ) {
            ListToPrintViewModel.superclass.constructor.call( this, config );
        }

        ListToPrintViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ListToPrintViewModel, KoViewModel.getBase(), {
                initializer: function ListToPrintViewModel_initializer() {
                    var self = this;
                    self.activityI18n = i18n( 'IncaseAdminMojit.rules.actions.labels.ACTIVITY' );
                    self.countI18n = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' );
                    self.locationI18n = i18n( 'FormEditorMojit.formprinters.labels.LOCATION_SETTINGS' );
                    self.printerI18n = i18n('FormEditorMojit.print_properties.LBL_PRINTERNAME');
                    self.checkedAll = ko.observable( true );
                    self.isLoaded = ko.observable( false );
                    self.activities = ko.observableArray([]);
                    if( self.initialConfig.activities && self.initialConfig.activities.length > 0 ) {
                        self.initialConfig.activities.forEach(function( item ) {
                            self.activities.push( new PrintDataViewModel( {item: item, location: self.initialConfig.location} ) );
                        });
                    }

                    self.addDisposable(ko.computed(function() {
                        var checked = unwrap( self.activities ).every(function( item ) {
                            return true === unwrap( item.checked );
                        }),
                        isLoaded = unwrap( self.activities ).every(function( item ) {
                            return false === unwrap( item.firstLoad );
                        });
                        self.checkedAll( checked );
                        self.isLoaded( isLoaded );
                    }));

                },
                destructor: function ListToPrintViewModel_destructor() {
                },
                selectAllHandler: function() {
                    var self = this,
                        i,
                        activities = unwrap( self.activities ),
                        checkedAll = peek( self.checkedAll );
                    for(i = 0; i < activities.length; i++) {
                        activities[i].checked( checkedAll );
                    }
                }
            },
            {
                NAME: 'ListToPrintViewModel'
            }
        );

        KoViewModel.registerConstructor( ListToPrintViewModel );

        /**
         * PrintDataViewModel
         * @param config
         * @constructor
         */
        function PrintDataViewModel( config ) {
            PrintDataViewModel.superclass.constructor.call( this, config );
        }

        PrintDataViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PrintDataViewModel, KoViewModel.getBase(), {

                initializer: function PrintDataViewModel_initializer() {
                    var self = this;
                    self.firstLoad = ko.observable( true );
                    self.item = self.initialConfig.item;
                    self.currentIdentity = ko.observable();
                    self.employeeProfile = ko.observable();
                    self.locationId = ko.observable( null );
                    self.lastSelectedLocationId = ko.observable( null );
                    self.formId = ko.observable( null );
                    self.userLocations = ko.observableArray( [] );
                    self.printers = ko.observable( null );
                    self.location = ko.observable( null );
                    self.printerName = ko.observable();
                    self.checked = ko.observable( true );
                    self.copies = ko.observable( 1 );

                    self.getFormId( self.loadPrintData.bind( self ) );

                    self.addDisposable(ko.computed(function() {
                        var
                            copies = parseInt( unwrap( self.copies ), 10 );
                        if( copies && 99 < copies ) {
                            self.copies( 99 );
                        }
                    }));
                },
                destructor: function PrintDataViewModel_destructor() {
                },
                loadPrintData: function() {
                    var self = this,
                        localStorageLastPrintedLocation = Y.doccirrus.utils.localValueGet( 'lastPrintedLocation' ),
                        localStorageLastPrintedLocationValue,
                        firstLoad = unwrap( self.firstLoad ),
                        formId = unwrap( self.formId ),
                        locationId = unwrap( self.locationId );

                    if( firstLoad ) {
                        if( localStorageLastPrintedLocation ) {
                            try {
                                localStorageLastPrintedLocationValue = JSON.parse( localStorageLastPrintedLocation );
                                if( localStorageLastPrintedLocationValue[ formId ] && localStorageLastPrintedLocationValue[ formId ] !== locationId ) {
                                    self.lastSelectedLocationId( localStorageLastPrintedLocationValue[ formId ] );
                                }
                            } catch ( parseErr ){
                                Y.log( 'Error getting last used printer per location: ' + JSON.stringify( parseErr ), 'warn', NAME );
                            }
                        } else {
                            locationId = self.initialConfig.location;
                            self.lastSelectedLocationId( locationId );
                        }
                    }

                    self.loadCurrentIdentity().then( self.loadEmployeeProfile.bind( self ) ).then( self.loadLocation.bind( self ) ).then( function(){
                        if( !unwrap( self.printers ) ) {
                            return self.loadFormPrinters( subscribeLocationChange );
                        } else {
                            subscribeLocationChange();
                        }
                    } ).catch( function( err ){
                        if( err ) {
                            Y.log( 'Could not load print data: ' + JSON.stringify( err ), 'warn', NAME );
                            return;
                        }
                    } );

                    function subscribeLocationChange(){
                        // preselected location should be selected on first load
                        if( firstLoad ) {
                            self.firstLoad( false );

                            self.locationId.subscribe( function() {
                                self.location( null );
                                self.loadPrintData();
                            } );
                        }
                    }
                },
                loadCurrentIdentity: function() {
                    var self = this;
                    if ( unwrap( self.currentIdentity ) ) {
                        return Promise.resolve();
                    }
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api.employee
                            .getIdentityForUsername( {username: Y.doccirrus.auth.getUserId()} )
                            .done( function( response ) {
                                self.currentIdentity( response.data ? response.data : response );
                                resolve();
                            } )
                            .fail( function( err ) {
                                reject( err );
                            } );
                    } );

                },
                loadEmployeeProfile: function() {
                    var
                        self = this,
                        profileId = self.currentIdentity().specifiedBy || null;
                    if ( unwrap( self.employeeProfile ) ) {
                        return Promise.resolve();
                    }
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api.employee
                            .read( {query: {_id: profileId}} )
                            .done( function( response ) {
                                var employeeProfile = ( response.data && response.data[0] ) ? response.data[0] : response;
                                self.employeeProfile( employeeProfile );

                                //  if employee is only enabled at one location then set this as current location
                                if( employeeProfile && employeeProfile.locations && 1 === employeeProfile.locations.length ) {
                                    Y.log( 'Employee has only a single location, setting as current location.', 'debug', NAME );
                                    employeeProfile.currentLocation = employeeProfile.locations[0]._id;
                                }

                                self.userLocations(employeeProfile ? employeeProfile.locations : []);
                                self.locationId( unwrap( self.lastSelectedLocationId ) || employeeProfile.currentLocation || DEFAULT_LOCATION );
                                resolve();
                            } )
                            .fail(function( err ) {
                                reject( err );
                            } );
                    } );

                },
                loadLocation: function() {
                    var self = this,
                        locationId = unwrap( self.locationId );
                    if( unwrap( self.location ) ) {
                        return Promise.resolve();
                    }
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api.location
                            .read( {query: {_id: locationId}} )
                            .done( function( response ) {

                                if( !response.data[0] ) {

                                    if( DEFAULT_LOCATION === locationId ) {
                                        return reject( 'Could not load location: ' + locationId );
                                    }

                                    //  fix case where user is locked into a deleted location
                                    Y.log( 'Could not load current location, trying default location: ' + locationId, 'warn', NAME );
                                    self.locationId( DEFAULT_LOCATION );
                                    return self.loadLocation();
                                }

                                self.location( response.data[0] );
                                self.printers( null );
                                resolve();
                            } )
                            .fail( function( err ) {
                                reject( err );
                            } );
                    } );
                },
                getFormId: function( callback ){
                    var
                        self = this,
                        canonicalId;

                    //getting canonicalId because form is not created yet
                    canonicalId = Y.doccirrus.getFormRole(  self.item );

                    Y.dcforms.getConfigVar( '', canonicalId, false, function onLookupCanonical( err, configVal ) {
                        if ( err ) {
                            Y.log( 'Problem getting canonicalId: ' + JSON.stringify( err ), 'warn', NAME );
                        } else {
                            self.formId( configVal );
                        }
                        callback();
                    } );
                },
                loadFormPrinters: function( callback ) {
                    var
                        self = this,
                        locationId = unwrap( self.locationId ),
                        postArgs = {
                            'locationId': locationId,
                            'canonicalId': unwrap( self.formId )
                        },
                        locationEnabledPrinters = unwrap( self.location ).enabledPrinters,
                        localStorageValue = Y.doccirrus.utils.localValueGet( 'printers' ),
                        localStoragePrinters = [],
                        localStorageDefaultValue = Y.doccirrus.utils.localValueGet( 'defaultPrinter' ),
                        localStorageDefaultPrinter,
                        localAssignment, i, j,
                        individualAssignment = null,
                        isCorrectDefaultPrinter = false,
                        lastPrinter;
                    if( localStorageValue ) {
                        try {
                            localStoragePrinters = JSON.parse( localStorageValue );
                        } catch( parseErr ) {
                            Y.log( 'Problem getting localStorage printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                        }
                    }
                    isCorrectDefaultPrinter = false;
                    if( localStorageDefaultValue ) {
                        try {
                            localStorageDefaultPrinter = JSON.parse( localStorageDefaultValue );
                            isCorrectDefaultPrinter = localStorageDefaultPrinter[locationId] &&
                                                      localStorageDefaultPrinter[locationId][postArgs.canonicalId] || false;
                        } catch( parseErr ) {
                            Y.log( 'Problem getting localStorage default printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                        }
                    }

                    Y.doccirrus.comctl.privatePost( '/1/formprinter/:loadIndividualAssignment', postArgs, onIndividualAssignmentQuery );

                    function onIndividualAssignmentQuery( err, result ) {
                        if( err ) {
                            Y.log( 'Problem loading individual assignment of formPrinters: ' + JSON.stringify( err ), 'warn', NAME );
                            return callback( err );
                        }

                        individualAssignment = result.data ? result.data : result;

                        if( localStoragePrinters && localStoragePrinters.length > 0 ) {
                            localAssignment = {
                                'printerName': '',
                                'alternatives': [],
                                'locationPrinters': []
                            };
                            if( isCorrectDefaultPrinter ) {
                                localAssignment.printerName = localStorageDefaultPrinter[locationId] &&
                                                              localStorageDefaultPrinter[locationId][postArgs.canonicalId] &&
                                                              localStorageDefaultPrinter[locationId][postArgs.canonicalId].printerName;
                                lastPrinter = localAssignment.printerName;
                            }
                            for( i = 0; i < localStoragePrinters.length; i++ ) {
                                for( j = 0; j < locationEnabledPrinters.length; j++ ) {
                                    if( locationEnabledPrinters[j] === localStoragePrinters[i].name.trim() ) {
                                        localAssignment.locationPrinters.push( localStoragePrinters[i].name.trim() );
                                    }
                                }
                            }
                            self.printers( localAssignment.locationPrinters );
                            if( !(localAssignment.locationPrinters || []).find( function(printer){
                                return printer === lastPrinter;
                            })){
                                lastPrinter = null;
                            }
                            self.printerName( lastPrinter || localAssignment.locationPrinters[ 0 ] || '' );
                            return callback( null );
                        }

                        if( individualAssignment && Object.keys( individualAssignment ).length > 0 ) {
                            if( !individualAssignment.locationPrinters || !individualAssignment.locationPrinters.length ) {
                                individualAssignment.locationPrinters = [];
                            }

                            //  Populate list of all printers if individual assignment exists EXTMOJ-1478
                            if( localStoragePrinters && localStoragePrinters.length > 0 ) {
                                for( i = 0; i < localStoragePrinters.length; i++ ) {
                                    for( j = 0; j < locationEnabledPrinters.length; j++ ) {
                                        if( locationEnabledPrinters[j] === localStoragePrinters[i].name.trim() ) {
                                            individualAssignment.locationPrinters.push( localStoragePrinters[i].name.trim() );
                                        }
                                    }
                                }
                            } else {
                                // if any localstorage list of printers, get from location
                                for( i = 0; i < locationEnabledPrinters.length; i++ ) {
                                    if( locationEnabledPrinters[i] ) {
                                        individualAssignment.locationPrinters.push( locationEnabledPrinters[i] );
                                    }
                                }
                            }

                            self.printerName( individualAssignment.printerName || individualAssignment.locationPrinters[0] || '' );
                            self.printers( individualAssignment.locationPrinters );
                            return callback( null );
                        }
                        Y.doccirrus.comctl.privatePost( '/1/formprinter/:getAllAlternatives', postArgs, onAssignmentQuery );
                    }

                    function onAssignmentQuery( err, result ) {
                        if( err ) {
                            return callback( err );
                        }

                        var assignment = result.data ? result.data : result,
                            lastPrinter;

                        self.printers( assignment.locationPrinters );

                        if( isCorrectDefaultPrinter ) {
                            lastPrinter = localStorageDefaultPrinter[locationId] &&
                                          localStorageDefaultPrinter[locationId][postArgs.canonicalId] &&
                                          localStorageDefaultPrinter[locationId][postArgs.canonicalId].printerName;
                        }
                        if( !(assignment.locationPrinters || []).find( function(printer){
                            return printer === lastPrinter;
                        })){
                            lastPrinter = null;
                        }
                        self.printerName( lastPrinter || assignment.locationPrinters[0] || '' );
                        callback( null );
                    }

                },
                getActivityType: function ( actType ) {
                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                }
            },
            {
                NAME: 'PrintDataViewModel'
            }
        );

        KoViewModel.registerConstructor( PrintDataViewModel );

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'print_multiple_modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }

        /**
         *  @param  {Object}    data
         *  @param  {Object}    data.activities         Array of activities or stub object to be printed
         *  @param  {String}    data.locationSelected   Location to show printers for
         *  @param  {Function}  data.callback           Called with array of [ { activityType, location, printer, copies }, ... ]
         */

        function show( data ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                var model = new ListToPrintViewModel( {activities: data.activities, location: data.locationSelected} ),
                    modal;
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-PrintMultiple',
                    bodyContent: node,
                    title: data.message,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: '650px',
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                    resizeable: false,
                    centered: true,
                    focusOn: [],
                    modal: true,
                    visible: false,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                label: i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT' ),
                                name: 'PRINT',
                                value: 'PRINT',
                                isDefault: true,
                                action: function onPintButtonClicked() {
                                    var printActivities = [];
                                    modal.close();
                                    unwrap( model.activities ).forEach(function( activity ) {
                                        if( unwrap( activity.checked ) && parseInt( unwrap( activity.copies ), 10 ) > 0 ) {
                                            printActivities.push({
                                                location: unwrap( activity.locationId ),
                                                copies: parseInt( unwrap( activity.copies ) , 10 ) - 1 || 0,
                                                printerName: unwrap( activity.printerName ),
                                                activityType: activity.item
                                            });
                                        }
                                    });

                                    data.callback( { data: printActivities } );
                                }
                            }
                        ]
                    }
                } );

                ko.applyBindings( model , node.getDOMNode() );

                model.addDisposable(ko.computed(function() {
                    var isLoaded = unwrap( model.isLoaded );

                    if( isLoaded ) {
                        setTimeout(function() {
                            modal.show();
                        }, 1000);
                    }
                }));

            } );
        }

        Y.namespace( 'doccirrus.modals' ).printMultiple = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'dcforms-roles'
        ]
    }
);
