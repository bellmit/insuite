/*global YUI, ko, async */
/*eslint prefer-template:0 strict:0 */
YUI.add( 'KoPrintButton', function( Y, NAME ) {
    'use strict';
    /**
     * @module KoButton
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        //NOOP = KoUI.utils.Function.NOOP,
        KoComponentManager = KoUI.KoComponentManager,
        KoButton = KoComponentManager.registeredComponent( 'KoButton' ),
        //KoMenu = KoComponentManager.registeredComponent( 'KoMenu' ),

        DEFAULT_LOCATION = '000000000000000000000001';

    function firstLocationOf( identity ) {
        var firstLocation = identity && identity.locations[0];
        return firstLocation && firstLocation._id;
    }

    /**
     * __Button for starting print, selecting printers and updating location.__
     * @class KoPrintButton
     * @constructor
     * @extends KoButton
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoPrintButton.template"></div>
     ko.applyBindings( {
         aKoPrintButton: KoComponentManager.createComponent( {
            componentType: 'KoPrintButton',
            componentConfig: {
                name: 'aKoPrintButton',
                formId: '5391fb4cf68076bd1d9831c1',        //  a canonical form ID is required
                text: 'Tools',
                title: 'KoPrintButton',
                icon: 'PRINT',
                option: 'PRIMARY',
                size: 'SMALL',
            }
        } )
     }, node.getDOMNode() );
     * @param   {Object}    config
     * @beta
     */

    function KoPrintButton( config ) {
        KoPrintButton.superclass.constructor.call( this, config );
    }

    makeClass( {
        constructor: KoPrintButton,
        extends: KoButton,
        descriptors: {
            componentType: 'KoPrintButton',
            i18n: KoUI.i18n, // common translator
            init: function() {
                var
                    self = this;

                self.printerConfig = ko.observable();
                self.currentIdentity = ko.observable();
                self.employeeProfile = ko.observable();
                self.assignment = ko.observable();
                self.printerName = ko.observable( '' );
                self.location = ko.observable();
                self.showAllPrinters = ko.observable( false );
                self.printInProgress = ko.observable( false );
                self.presettings = new Y.doccirrus.ProfileManagementViewModel.create( {fromProfile: true} );

                //  used by dialogs which read state of this control
                self.visiblePrinters = [];
                self.canCollapse = false;
                self.canExpand = false;
                self.initComplete = false;

                //  allow parent to listen for menu changes
                if( self.initialConfig.onMenuUpdate ) {
                    self.onMenuUpdate = self.initialConfig.onMenuUpdate;
                }

                self.onDefaultPrintClick = function() {
                    if( self.initialConfig.click ) {
                        self.initialConfig.click( peek( self.printerName ), 0 );
                    }
                };

                self.onCopyPrintClick = function() {
                    if( self.initialConfig.click ) {
                        self.initialConfig.click( peek( self.printerName ), 1 );
                    }
                };

                self.createCopyDialog = function() {
                    Y.doccirrus.DCWindow.prompt( {
                        'title': self.i18n( 'KoUI.KoPrintButton.HOW_MANY_COPIES' ),
                        'callback': onPromptCompleted
                    } );
                    function onPromptCompleted( evt ) {
                        var
                            userInput = evt.data ? evt.data : 0,
                            confirmMsg ;

                        userInput = parseInt( userInput, 10 );
                        if ( isNaN( userInput ) || userInput < 1 ) { return; }

                        if ( userInput > 9 ) {
                            confirmMsg = self.i18n( 'KoUI.KoPrintButton.CONFIRM_MANY_COPIES' );
                            confirmMsg = confirmMsg.replace( '{n}', userInput );
                            Y.doccirrus.DCWindow.confirm( {
                                'title': 'Confirm',
                                'message': confirmMsg ,
                                'callback': onCopyConfirm
                            } );
                        } else {
                            onCopyConfirm( { 'success': true } );
                        }

                        function onCopyConfirm( evt ) {
                            if ( !evt || !evt.success ) {
                                //  cancelled by user on confirmation
                                return;
                            }

                            if( self.initialConfig.click ) {
                                self.initialConfig.click( peek( self.printerName ), userInput );
                            }
                        }

                    }

                };

                self.onAlternativePrinterClick = function( printerName ) {
                    var localStorageDefaultValue = Y.doccirrus.utils.localValueGet( 'defaultPrinter' ),
                        localStorageDefaultPrinter,
                        locationId = ko.unwrap( self.locationId ),
                        formId = ko.unwrap( self.formId );

                    if( localStorageDefaultValue ) {
                        try {
                            localStorageDefaultPrinter = JSON.parse( localStorageDefaultValue );
                        } catch( parseErr ) {
                            Y.log( 'Problem getting localStorage default printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                        }
                    } else {
                        localStorageDefaultPrinter = {};
                    }

                    //set default printer
                    if( !localStorageDefaultPrinter[locationId] ) {
                        localStorageDefaultPrinter[locationId] = {};
                    }
                    if( !localStorageDefaultPrinter[locationId][formId] ) {
                        localStorageDefaultPrinter[locationId][formId] = {};
                    }
                    localStorageDefaultPrinter[locationId][formId].printerName = printerName;

                    // updating data in localstorage
                    Y.doccirrus.utils.localValueSet( 'defaultPrinter', JSON.stringify( localStorageDefaultPrinter ) );

                    if (self.presettings.activeProfileId()) {
                        Y.doccirrus.jsonrpc.api.profile.updateDefaultPrinter( {
                            query: {_id: self.presettings.activeProfileId()},
                            data: localStorageDefaultPrinter
                        } ).done( function( ) {
                            Y.log( 'default printer changed: ' + self.formId(), 'debug', NAME );
                        } ).fail( function( ) {
                            Y.log( 'default printer not changed: ' + self.formId(), 'debug', NAME );
                        } );
                    }
                    if( self.initialConfig.click ) {
                        self.initialConfig.click( printerName );
                    }
                };

                //  Listen for change of location
                self.locationListen = self.locationId.subscribe(
                    function __subOnLocationChange() {
                        self.updateMenu();
                    }
                );

                self.noAssignment = ko.computed( function() {
                    var
                        assignment = self.assignment(),
                        location = self.location(),
                        printerOk = false,
                        i;

                    //  true if not printer assigned
                    if( !assignment || !assignment.printerName || '' === assignment.printerName ) {
                        return true;
                    }

                    //  true if location has no printers
                    if( !location || !location.enabledPrinters || 0 === location.enabledPrinters.length ) {
                        return true;
                    }

                    //  true if printer is not enabled at this location
                    for( i = 0; i < location.enabledPrinters.length; i++ ) {
                        if( assignment.printerName === location.enabledPrinters[i] ) {
                            printerOk = true;
                        }
                    }

                    if( !printerOk ) {
                        return true;
                    }
                    return false;
                } );

                self.disabledOrMissing = ko.computed( function() {
                    return self.disabled() || self.printInProgress() || self.printerName() === '' || !self.printerName;
                } );

                self.updateMenu();

                KoPrintButton.superclass.init.apply( self, arguments );
                self.updateMenu();
            },

            lookupFormFromRole: function() {
                var
                    self = this,
                    formId = self.formId(),
                    formRole = self.formRole();

                if( formId && '' !== formId ) {
                    //  formId already given or resolved
                    Y.log( 'FormId already resolved: ' + formId, 'debug', NAME );
                    return;
                }

                if( ( !formId || '' === formId ) && ( !formRole || '' === formRole) ) {
                    Y.log( 'No form role or canonical _id given, cannot instantiate menu.', 'warn', NAME );
                    return;
                }

                Y.dcforms.getConfigVar( '', formRole, false, onLookupForm );

                function onLookupForm( err, configVal ) {
                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    if( err ) {
                        Y.log( 'Could not look up form from role ' + formRole + ': ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    if( !configVal || '' === configVal ) {
                        //  TODO:  pop a modal here?
                        Y.log( 'No form is assigned to this role: ' + JSON.stringify( formRole ), 'warn', NAME );
                        return;
                    }

                    //  this should trigger an update of the menu via formId subscription
                    self.formId( configVal );
                }
            },

            loadCurrentIdentity: function( callback ) {
                var self = this;

                Y.doccirrus.jsonrpc.api.employee
                    .getIdentityForUsername( {username: Y.doccirrus.auth.getUserId()} )
                    .done( onLoadIdentity )
                    .fail( onUserLookupFail );

                function onLoadIdentity( response ) {
                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    var currentIdentity = response.data ? response.data : response;
                    if( self.currentIdentity ) {
                        self.currentIdentity( currentIdentity );
                    }

                    //self.locationId( currentIdentity.currentLocation || DEFAULT_LOCATION );
                    self.identityLoadInProgress = false;
                    callback( null );
                }

                function onUserLookupFail( err ) {
                    self.identityLoadInProgress = false;
                    callback( err );
                }
            },

            loadEmployeeProfile: function( callback ) {
                var
                    self = this,
                    currentIdentity = self.currentIdentity(),
                    profileId = currentIdentity && currentIdentity.specifiedBy || null;

                if( !profileId ) {
                    //  current user has no profile, and thus no printers
                    return callback( 'Current user has no profile.' );
                }

                Y.doccirrus.jsonrpc.api.employee
                    .read( {query: {_id: profileId}} )
                    .done( onLoadProfile )
                    .fail( onUserLookupFail );

                function onLoadProfile( response ) {
                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    var employeeProfile = ( response.data && response.data[0] ) ? response.data[0] : response;
                    self.employeeProfile( employeeProfile );

                    //  if employee is only enabled at one location then set this as current location
                    if( employeeProfile && employeeProfile.locations && 1 === employeeProfile.locations.length ) {
                        Y.log( 'Employee has only a single location, setting as current location.', 'debug', NAME );
                        employeeProfile.currentLocation = employeeProfile.locations[0]._id;
                    }

                    self.locationId( employeeProfile.currentLocation || firstLocationOf( currentIdentity ) || DEFAULT_LOCATION );
                    self.employeeLoadInProgress = false;
                    callback( null );
                }

                function onUserLookupFail( err ) {
                    self.employeeLoadInProgress = false;
                    callback( err );
                }
            },

            loadFormPrinters: function( callback ) {
                var
                    self = this,
                    postArgs = {
                        'locationId': self.locationId(),
                        'canonicalId': self.formId()
                    },
                    locationEnabledPrinters = self.location().enabledPrinters,
                    localStorageValue = Y.doccirrus.utils.localValueGet( 'printers' ),
                    localStorageDefaultValue = Y.doccirrus.utils.localValueGet( 'defaultPrinter' ),
                    localStoragePrinters = [],
                    localStorageDefaultPrinter,
                    localAssignment, i, j,
                    individualAssignment = null,
                    isCorrectDefaultPrinter = false;

                if( localStorageValue ) {
                    try {
                        localStoragePrinters = JSON.parse( localStorageValue );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                }
                if( localStorageDefaultValue ) {
                    try {
                        localStorageDefaultPrinter = JSON.parse( localStorageDefaultValue );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage default printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                    isCorrectDefaultPrinter = localStorageDefaultPrinter[self.locationId()] &&
                                              localStorageDefaultPrinter[self.locationId()][self.formId()];
                }

                //  TODO: use JSONRPC
                Y.doccirrus.comctl.privatePost( '/1/formprinter/:loadIndividualAssignment', postArgs, onIndividualAssignmentQuery );

                function onIndividualAssignmentQuery( err, result ) {
                    if( err ) {
                        Y.log( 'Problem loading individual assignment of formPrinters: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }

                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    individualAssignment = result.data ? result.data : result;

                    if( localStoragePrinters && localStoragePrinters.length > 0 ) {
                        localAssignment = {
                            'printerName': '',
                            'alternatives': [],
                            'locationPrinters': []
                        };
                        if( isCorrectDefaultPrinter ) {
                            localAssignment.printerName = localStorageDefaultPrinter[self.locationId()] &&
                                                          localStorageDefaultPrinter[self.locationId()][self.formId()] &&
                                                          localStorageDefaultPrinter[self.locationId()][self.formId()].printerName;
                        }
                        for( i = 0; i < localStoragePrinters.length; i++ ) {
                            for( j = 0; j < locationEnabledPrinters.length; j++ ) {
                                if( locationEnabledPrinters[j] === localStoragePrinters[i].name.trim() ) {
                                    localAssignment.locationPrinters.push( localStoragePrinters[i].name.trim() );
                                }
                            }
                        }
                        self.assignment( localAssignment );
                        self.printerName( localAssignment.printerName );
                        return callback( null );
                    }

                    if( individualAssignment && Object.keys( individualAssignment ).length ) {
                        if( !individualAssignment.locationPrinters || !individualAssignment.locationPrinters.length ) {
                            individualAssignment.locationPrinters = [];
                        }

                        if( localStoragePrinters && localStoragePrinters.length > 0) {
                            //  Populate list of all printers if individual assignment exists EXTMOJ-1478
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

                        self.assignment( individualAssignment );
                        self.printerName( individualAssignment.printerName );

                        return callback( null );
                    }

                    //TODO: use JSONRPC
                    //Y.doccirrus.jsonrpc.api.formprinter.getAllAlternatives( postArgs )
                    //    .then( function( result) { onAssignmentQuery( result ); } )
                    //    .fail( function( err ) { onAssignmentQuery( err ); } );

                    Y.doccirrus.comctl.privatePost( '/1/formprinter/:getAllAlternatives', postArgs, onAssignmentQuery );
                }

                function onAssignmentQuery( err, result ) {

                    if( err ) {
                        return callback( err );
                    }

                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    var assignment = result.data ? result.data : result;

                    self.assignment( assignment );
                    self.printerName( assignment.printerName );
                    if( isCorrectDefaultPrinter ) {
                        self.printerName(localStorageDefaultPrinter[self.locationId()] &&
                                         localStorageDefaultPrinter[self.locationId()][self.formId()] &&
                                         localStorageDefaultPrinter[self.locationId()][self.formId()].printerName);
                    }
                    callback( null );
                }
            },

            loadLocation: function( callback ) {
                var self = this;

                Y.doccirrus.jsonrpc.api.location
                    .read( {query: {_id: self.locationId()}} )
                    .done( onLocationLoaded )
                    .fail( onLocationErr );

                function onLocationLoaded( response ) {
                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    if( !response.data[0] ) {

                        if( DEFAULT_LOCATION === self.locationId() ) {
                            return callback( 'Could not load location: ' + self.locationId() );
                        }

                        //  fix case where user is locked into a deleted location
                        Y.log( 'Could not load current location, trying default location: ' + self.locationId(), 'warn', NAME );
                        self.locationId( firstLocationOf( self.currentIdentity() ) || DEFAULT_LOCATION );
                        return self.loadLocation( callback );
                    }

                    self.location( response.data[0] );
                    self.locationLoadInProgress = false;
                    callback( null );
                }

                function onLocationErr( err ) {
                    self.locationLoadInProgress = false;
                    return callback( err );
                }
            },

            /**
             *  initialize/refresh menu with new set of items
             */

            updateMenu: function() {
                var
                    self = this,
                    menuComponent = self.menu,

                    assignment = self.assignment(),
                    locationPrinters = ( assignment ? assignment.locationPrinters : [] ),

                    currentIdentity = self.currentIdentity(),
                    employeeProfile = self.employeeProfile(),
                    userLocations = ( employeeProfile && Array.isArray( employeeProfile.locations ) ) ? employeeProfile.locations : [],

                    showAll = ( self.noAssignment() || self.showAllPrinters() ),

                    formRole = self.formRole(),
                    formId = self.formId(),

                    printerName = self.printerName(),
                    locationId = self.locationId(),
                    location = self.location(),
                    items = [],
                    printerItems = [],
                    locationItems = [],

                    canCollapse = ( self.showAllPrinters() && printerName && printerName !== '' ),
                    canExpand = ( !self.showAllPrinters() && printerName && printerName !== '' ),

                    i;
                
                //  check initialization and load any outstanding data from server
                if( !self.menu ) {
                    Y.log( 'KoPrintButton menu not initialized', 'warn', NAME );
                    return;
                }

                if( ( formRole && '' !== formRole ) && ( !formId || '' === formId ) ) {
                    return self.lookupFormFromRole();
                }

                if( !formId || '' === formId ) {
                    Y.log( 'KoPrintButton has no formId', 'warn', NAME );
                    return;
                }

                if( !currentIdentity ) {
                    //  prevent parallell loads ( can happen with ko subs, but not in all cases )
                    if( self.identityLoadInProgress ) {
                        return;
                    }
                    self.identityLoadInProgress = true;

                    return self.loadCurrentIdentity( retryMenu );
                }

                if( !employeeProfile ) {
                    //  prevent parallell loads ( can happen with ko subs, but not in all cases )
                    if( self.employeeLoadInProgress ) {
                        return;
                    }
                    self.employeeLoadInProgress = true;

                    return self.loadEmployeeProfile( retryMenu );
                }

                if( !location || location._id !== locationId ) {
                    // location not loaded or has changed
                    //  prevent parallell loads ( can happen with ko subs, but not in all cases )
                    if( self.locationLoadInProgress ) {
                        return;
                    }
                    self.locationLoadInProgress = true;

                    return self.loadLocation( retryMenu );
                }

                if( !self.assignment() ) {
                    return self.loadFormPrinters( retryMenu );
                }

                //  clear any existing entries from the menu
                self.menu.clearItems();

                //  used by dialogs which read the state of this control
                self.visiblePrinters = [];

                //  create menu components

                if( showAll ) {
                    //  show all printers available at this location
                    for( i = 0; i < locationPrinters.length; i++ ) {
                        self.visiblePrinters.push( locationPrinters[i] );
                        printerItems.push( {
                            name: 'menu-' + locationPrinters[i],
                            text: locationPrinters[i],
                            title: locationPrinters[i],
                            icon: ( locationPrinters[i] === printerName ? 'CHECK' : '' ),
                            disabled: false,
                            click: makePrinterClickHandler( locationPrinters[i] )
                        } );
                    }
                } else {
                    //  show only printers used for this form
                    self.visiblePrinters.push( printerName );
                    printerItems.push( {
                        name: 'menu-' + printerName,
                        text: printerName,
                        title: printerName,
                        icon: 'CHECK',
                        disabled: false,
                        click: makePrinterClickHandler( printerName )
                    } );

                    if( assignment.alternatives && assignment.alternatives.length > 0 ) {
                        for( i = 0; i < assignment.alternatives.length; i++ ) {
                            self.visiblePrinters.push( assignment.alternatives[i] );
                            printerItems.push( {
                                name: 'menu-' + assignment.alternatives[i],
                                text: assignment.alternatives[i],
                                title: assignment.alternatives[i],
                                icon: '',
                                disabled: false,
                                click: makePrinterClickHandler( assignment.alternatives[i] ),
                                html: '<i style="float:right;" class="fa fa-times"></i>',
                                itemType: 'printer'
                            } );
                        }
                    }
                }

                //  sort and add to menu
                printerItems.sort( sortMenuItems );
                for( i = 0; i < printerItems.length; i++ ) {
                    items.push( printerItems[i] );
                }

                if( canCollapse ) {
                    //  add option to collapse full list, if possible
                    if( printerName ) {
                        //  add separator before toggle
                        //items.push( { separator: true } );
                        items.push( {
                            name: 'menu-toggle-full',
                            text: '',
                            title: '',
                            icon: 'CHEVRON_UP',
                            disabled: false,
                            html: '<i>' + self.i18n( 'KoUI.KoPrintButton.FEWER_PRINTERS' ) + '</i>',
                            click: toggleFullList
                        } );
                    }
                }

                //  used by dialogs which read state of this control
                self.canCollapse = canCollapse;

                if( canExpand ) {
                    //  add option to toggle full list
                    //items.push( { separator: true } );
                    items.push( {
                        name: 'menu-toggle-full',
                        text: '',
                        title: '',
                        icon: 'CHEVRON_DOWN',
                        disabled: false,
                        html: '<i>' + self.i18n( 'KoUI.KoPrintButton.MORE_PRINTERS' ) + '</i>',
                        click: toggleFullList
                    } );
                }

                //  used by dialogs which read state of this control
                self.canExpand = canExpand;

                //  add separator before print copy options
                items.push( {separator: true} );

                items.push( {
                    name: 'menu-print-copy',
                    text: '',
                    title: '',
                    icon: '',
                    disabled: self.disabledOrMissing,
                    html: self.i18n( 'KoUI.KoPrintButton.PRINT_COPY' ),
                    click: function() { self.onCopyPrintClick(); }
                } );

                items.push( {
                    name: 'menu-print-copy-dialog',
                    text: '',
                    title: '',
                    icon: '',
                    disabled: self.disabledOrMissing,
                    html:  self.i18n( 'KoUI.KoPrintButton.PRINT_COPY_DIALOG' ),
                    click: function() { self.createCopyDialog(); }
                } );

                //  add separator before locations
                items.push( {separator: true} );

                //  add location picker
                for( i = 0; i < userLocations.length; i++ ) {
                    locationItems.push( {
                        name: 'menu-location-' + userLocations[i]._id,
                        text: userLocations[i].locname,
                        title: userLocations[i].locname,
                        icon: ( userLocations[i]._id === locationId ? 'CHECK' : '' ),
                        disabled: false,
                        click: makeLocationClickHandler( userLocations[i]._id ),
                        itemType: 'location'
                    } );
                }

                items.push( {
                    name: 'menu-select-location',
                    text: self.i18n( 'KoUI.KoPrintButton.CURRENT_LOCATION' ),
                    title: self.i18n( 'KoUI.KoPrintButton.CURRENT_LOCATION' ),
                    icon: '',
                    pullLeft: true,
                    menu: {
                        items: locationItems
                    },
                    disabled: ( locationItems.length === 0 )
                } );

                //  Special case, if employee has no locations configured then add a link
                if( !employeeProfile.locations || 0 === employeeProfile.locations.length ) {
                    items = [];
                    items.push( {
                        name: 'menu-configure-locations',
                        text: self.i18n( 'KoUI.KoPrintButton.NO_LOCATIONS' ),
                        title: self.i18n( 'FormEditorMojit.formprinters.notice.NO_LOCATION' ),
                        icon: 'GEAR',
                        disabled: false,
                        click: openLocationSettings
                    } );
                }

                menuComponent.addItems( items );
                if( self.onMenuUpdate ) {
                    self.onMenuUpdate( items );
                }
                self.initComplete = true;

                function retryMenu( err ) {
                    if( err ) {
                        Y.log( 'Could not initialize menu: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    self.updateMenu();
                }

                function makePrinterClickHandler( printerName ) {
                    return function onPrinterListItemClick( menuItem, koEvt ) {

                        var
                            evt = koEvt.originalEvent || {},
                            clickedOn = evt.srcElement || null;

                        if( clickedOn && clickedOn.classList && 'fa fa-times' === clickedOn.classList.value ) {

                            //  keep the menu open
                            if( evt ) {
                                evt.stopPropagation();
                            }

                            //  remove the printer
                            self.removeAlternatePrinter( printerName );

                            return;
                        }

                        Y.log( 'Clicked print menu item: ' + printerName, 'debug', NAME );
                        self.onAlternativePrinterClick( printerName );
                    };
                }

                function makeLocationClickHandler( locationId ) {
                    return function( menuItem, args ) {
                        Y.log( 'Clicked location menu item: ' + locationId, 'debug', NAME );

                        if( args && args.originalEvent ) {
                            args.originalEvent.stopPropagation();
                        }

                        self.setNewLocation( locationId );
                    };
                }

                function toggleFullList( menuItem, args ) {
                    self.showAllPrinters( !self.showAllPrinters() );

                    if( args && args.originalEvent ) {
                        args.originalEvent.stopPropagation();
                    }

                    self.updateMenu();
                }

                function sortMenuItems( a, b ) {
                    if( a.text < b.text ) {
                        return -1;
                    }
                    if( a.text > b.text ) {
                        return 1;
                    }
                    return 0;
                }

                function openLocationSettings() {
                    window.location = '/admin/insuite#/location';
                }

            },

            /**
             *  Change the location on the current user's employee profile and query for new printer assignments at this
             *  location.
             *
             *  @param  locationId  {String}
             */

            setNewLocation: function( locationId ) {
                var
                    self = this,
                    currentIdentity = self.currentIdentity(),
                    employeeProfile = self.employeeProfile();

                //  only respond to locations chosen by the user
                if( !self.initComplete ) {
                    Y.log( 'Setting location before KO Print button is initialized, ignored.', 'warn', NAME );
                    return;
                }

                async.series( [updateEmployeeProfile], onLocationChanged );

                function updateEmployeeProfile( itcb ) {
                    var
                        updateParams = {
                            'profileId': currentIdentity.specifiedBy,
                            'locationId': locationId
                        };

                    Y.doccirrus.jsonrpc.api.employee.setCurrentLocation( updateParams )
                        .done( onProfileUpdated )
                        .fail( itcb );

                    function onProfileUpdated( /* response */ ) {
                        //  may have been disposed before callback
                        if ( 'function' !== typeof self.assignment ) { return; }

                        self.currentIdentity().currentLocation = locationId;
                        //  invalidate cached location and formprinter assignments
                        self.location( null );
                        self.assignment( null );
                        // changing the location will cause reload via subscription
                        self.locationId( locationId );
                        currentIdentity.currentLocation = locationId;
                        employeeProfile.currentLocation = locationId;
                        itcb( null );
                    }
                }

                function onLocationChanged( err ) {
                    if( err ) {
                        Y.log( 'Problem while changing current location: ' + JSON.stringify( err ), 'warn', NAME );
                        //return;
                    }
                }

            },

            removeAlternatePrinter: function( printerName ) {
                var
                    self = this,
                    assignment = peek( self.assignment ),
                    assignmentId = assignment._id || null,
                    postArgs = {
                        'assignmentId': assignmentId,
                        'printerName': printerName
                    };

                Y.doccirrus.jsonrpc.api.formprinter
                    .removeAlternative( postArgs )
                    .done( onAssignmentRemoved )
                    .fail( onRemoveAssignmentFailed );

                function onAssignmentRemoved( /* response */ ) {
                    //  may have been disposed before callback
                    if ( 'function' !== typeof self.assignment ) { return; }

                    //  update the menu
                    self.assignment( null );
                    self.updateMenu();
                }

                function onRemoveAssignmentFailed( err ) {
                    Y.log( 'Could not remove alternative formprinter assignment: ' + JSON.stringify( err ) );
                }
            }

        },
        lazy: {
            templateName: function( key ) {
                var self = this;
                return self._handleLazyConfig( key, ko.observable( 'KoPrintButton' ) );
            },
            /**
             * The menu for the drop down
             * @attribute menu
             * @type {KoMenu}
             * @returns {Object} KOMenu config
             */
            menu: function() {
                var
                    self = this,
                    config = {
                        dropup: false, // will have an effect in the correct context e.g. KoButtonDropDown
                        pullRight: true,
                        items: []
                    };

                config = KoComponentManager.createComponent( {
                    componentType: 'KoMenu',
                    componentConfig: config
                } );

                config.owner = self;

                return config;

            },

            /**
             * Used for buttons
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoPrintButton
             */

            css: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                defaults.disabled = self.disabled;
                defaults.active = self.active;
                Y.mix( peek( observable ), defaults );
                return observable;
            },

            locationId: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) );

                return observable;
            },

            formId: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) );

                return observable;
            },

            formRole: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) );

                //  Listen for change of form
                self.formListen = self.formId.subscribe(
                    function __subOnFormChange( newValue ) {
                        Y.log( 'Form changed, loading assignments for: ' + newValue, 'warn', NAME );
                        self.assignment( null );
                        self.updateMenu();
                    }
                );

                return observable;
            }

        }
    } );

    /**
     * @property KoPrintButton
     * @type {KoPrintButton}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */

    KoComponentManager.registerComponent( KoPrintButton );

}, '3.16.0', {
    requires: [
        'oop',
        'dccommonutils',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent',
        'KoMenu'
    ]
} );
