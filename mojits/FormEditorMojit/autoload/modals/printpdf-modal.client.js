/**
 * User: strix
 * Date: 31/08/16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, Promise, ko, moment, _ */

YUI.add( 'printpdf-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_XLARGE,
            PRINT_MSG_TIMEOUT = 5000,                               //  TODO: centralize this constant

            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable(),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function PrintPDFModel( config ) {
            PrintPDFModel.superclass.constructor.call( this, config );
        }

        Y.extend( PrintPDFModel, Disposable, {

            documentUrl: '',
            cacheFile: '',
            mediaId: '',
            formId: null,

            caption: null,
            printerButtons: null,

            initializer: function( options ) {
                var
                    self = this,
                    localStorageDefaultValue = Y.doccirrus.utils.localValueGet( 'defaultPrinter' ),
                    localStorageLastPrintedLocation = Y.doccirrus.utils.localValueGet( 'lastPrintedLocation' ),
                    tmp;

                self.savePDFtoCaseFile = !!options.savePDFtoCaseFile;

                self.locationI18n = i18n( 'InSight2Mojit.printpdf_modal.location' );
                self.printersI18n = i18n( 'InSight2Mojit.printpdf_modal.printer' );
                self.countI18n = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' );
                self.morePrintersI18n = i18n( 'KoUI.KoPrintButton.MORE_PRINTERS' );
                self.fewerPrintersI18n = i18n( 'KoUI.KoPrintButton.FEWER_PRINTERS' );

                self.formId = ko.observable( options.canonicalId || options.formId || '' );
                self.formRole = ko.observable( options.formRole || '' );
                self.documentUrl = options.documentUrl || '';
                self.cacheFile = options.cacheFile || '';
                self.mediaId = options.mediaId || '';
                self.mapCollection = options.mapCollection || '';
                self.waitForTransition = options.waitForTransition || false;
                self.generatePDFandPrint = options.generatePDFandPrint || false;
                self.activityId = options.mapObject || null;
                self.formVersionId = options.formVersionId || null;
                self.activityIds = options.activityIds || null;

                self.openInNewTab = ko.observable( false );
                self.downloadPdf = ko.observable( false );

                self.overrideLocationChange = null;

                //  these will be updated from kopbCache component
                self.currentPrinters = ko.observableArray( [] );
                self.currentLocations = ko.observableArray( [] );
                self.selectedPrinter = ko.observable( '' );
                self.selectedLocation = ko.observable( '' );
                self.showMoreVisible = ko.observable( false );
                self.showFewerVisible = ko.observable( false );
                self.copies = ko.observable( 1 );
                self.copy = ko.observable( false );
                self.localStorageDefaultPrinter = ko.observable( {} );
                self.localStorageLastPrintedLocationValue = ko.observable( {} );
                self.presettings = new Y.doccirrus.ProfileManagementViewModel.create( {fromProfile: true} );
                self.copyText = ko.observable( '' );

                //Option to save PDF to caseFile of patient
                if( self.savePDFtoCaseFile ) {
                    self.actTypeI18n = i18n( 'InSight2Mojit.printpdf_modal.actType' );
                    self.activityStatusI18n = i18n( 'InSight2Mojit.printpdf_modal.status' );
                    self.activityContentI18n = i18n( 'InSight2Mojit.printpdf_modal.content' );
                    self.employeeI18n = i18n( 'InSight2Mojit.printpdf_modal.employee' );

                    self.availableActTypes = Y.doccirrus.schemas.v_simple_activity.getSimpleActivityList().filter( function( simpleActivity ) {
                        switch( simpleActivity && simpleActivity.val ) {
                            case 'EXTERNAL':
                            case 'CAVE':
                            case 'PROCESS':
                            case 'PREVENTION':
                                return true;
                            default:
                                return false;
                        }
                    } );
                    self.activityStatusList = Y.doccirrus.schemas.activity.getFilteredStatuses().filter( function( simpleActivity ) {
                        switch( simpleActivity && simpleActivity.val ) {
                            case 'VALID':
                            case 'APPROVED':
                                return true;
                            default:
                                return false;
                        }
                    } );

                    try {
                        tmp = JSON.parse( Y.doccirrus.utils.localValueGet( 'pdfIntoCaseFileActType' ) );
                    } catch( e ) {
                        Y.log( 'Junk in localStorage: ' + JSON.stringify( e ), 'warn', NAME );
                        tmp = undefined;
                    }
                    self.selectedSimpleActivity = ko.observable( self.availableActTypes.find( function( actType ) {
                        return actType.val === (tmp && tmp.val);
                    } ) || {} );
                    try {
                        tmp = JSON.parse( Y.doccirrus.utils.localValueGet( 'pdfIntoCaseFileStatus' ) );
                    } catch( e ) {
                        Y.log( 'Junk in localStorage: ' + JSON.stringify( e ), 'warn', NAME );
                        tmp = undefined;
                    }
                    self.selectedActivityStatus = ko.observable( self.activityStatusList.find( function( status ) {
                        return status.val === (tmp && tmp.val);
                    } ) || {} );
                    self.activityContent = ko.observable( Y.doccirrus.utils.localValueGet( 'pdfIntoCaseFileUserContent' ) || '' );
                    self.employeeId = ko.observable(
                        (options && options.options && (options.options.employeeId || (options.options.lastSchein && options.options.lastSchein.employeeId))) ||
                        Y.doccirrus.utils.localValueGet( 'pdfIntoCaseFileEmployeeId' ) ||
                        ''
                    );
                    try {
                        tmp = JSON.parse( Y.doccirrus.utils.localValueGet( 'pdfIntoCaseFileLocationId' ) );
                    } catch( e ) {
                        Y.log( 'Junk in localStorage: ' + JSON.stringify( e ), 'warn', NAME );
                        tmp = undefined;
                    }

                    self.currentLocations( options.locations );

                    self.setSelectedLocation(
                        options.locations.find( function( loc ) {
                            return loc._id === options.options.locationId;
                        } ) ||
                        options.locations.find( function( loc ) {
                            return loc._id === (tmp && tmp._id);
                        } ) ||
                        options.locations.find( function( loc ) {
                            return loc._id === options.options.lastSchein.locationId.toString();
                        } )
                    );

                    self.initSelect2Employee();
                    self.isValid = ko.computed( function() {
                        return unwrap( self.selectedLocation ) && unwrap( self.employeeId ) && unwrap( self.selectedActivityStatus ) && unwrap( self.selectedSimpleActivity );
                    } );
                }

                if ( localStorageLastPrintedLocation ) {
                    try {
                        self.localStorageLastPrintedLocationValue( JSON.parse( localStorageLastPrintedLocation ) );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage printed locations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                }

                if( localStorageDefaultValue ) {
                    try {
                        self.localStorageDefaultPrinter( JSON.parse( localStorageDefaultValue ) );
                    } catch( parseErr ) {
                        Y.log( 'Problem getting localStorage default printers: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    }
                }

                self.listenSelectedPrinter = self.selectedPrinter.subscribe( function( val ) {
                    if ( !val ) {
                        return;
                    }
                    self.onSelectedPrinterChange( val );
                } );

                self.listenSelectedLocation = self.selectedLocation.subscribe( function( val ) {
                    if ( !val ) {
                        return;
                    }
                    self.onSelectedLocationChange( val );
                } );

                self.kopbCache = KoComponentManager.createComponent( {
                    componentType: 'KoPrintButton',
                    componentConfig: {
                        name: 'kopbForm',
                        formId: peek (self.formId ),
                        formRole: peek( self.formRole ),
                        text: i18n( 'InSight2Mojit.printpdf_modal.print' ),
                        title: i18n( 'InSight2Mojit.printpdf_modal.print' ),
                        icon: 'PRINT',
                        option: 'DEFAULT',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        onMenuUpdate: function( items ) {
                            self.onMenuUpdate( items );
                        },
                        //css: style,
                        click: function( /* printerName */ ) {
                            //  should not happen in this modal, testing only
                            self.onPrintButtonClick();
                        }
                    }
                } );

                //  raised when koprintbutton loads its current print location
                //  only used if a speicifc location was not passed in options

                self.initialLocationListen = self.kopbCache.location.subscribe( function( newLocation ) {
                    if ( 0 === self.currentLocations().length ) {
                        self.setSelectedLocation( newLocation );
                    }
                } );

                //  set the selected location when we get a new set of locations in the dropdown

                self.listenCurrentLocations = self.currentLocations.subscribe( function( ) {
                    var useLocation = self.selectedLocation() || self.kopbCache.location();
                    if ( useLocation ) {
                        self.setSelectedLocation( useLocation );
                        //  effectively process next tick, because populating the dropdown will cause
                        //  its own change event which may arrive after ours, MOJ-12867
                        setTimeout( function() { self.setSelectedLocation( useLocation ); }, 0 );
                    }
                } );

                self.initWSListeners();

                self.addDisposable(ko.computed(function() {
                    var
                        copies = Math.abs( parseInt( unwrap( self.copies ), 10 ) );
                    if( copies && 99 < copies ) {
                        self.copies( 99 );
                    } else {
                        self.copies( copies );
                    }
                }));

                self.addDisposable(ko.computed(function() {
                    var
                        copies = parseInt( unwrap( self.copies ), 10 ),
                        copy = unwrap( self.copy ),
                        text,
                        realCopies;

                    if( copy ) {
                        if( 1 === copies ) {
                            realCopies = copies;
                        } else if( 2 === copies ) {
                            realCopies = 1;
                        } else {
                            realCopies = copies - 1;
                        }
                        text = Y.Lang.sub(i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.print_info' ), {
                            copies: realCopies
                        });
                        self.copyText( text );
                    } else {
                        self.copyText( '' );
                    }
                }));
            },

            /**
             *  Set the value of the dropdown to match the given location
             */

            setSelectedLocation: function( toLocation ) {
                var
                    self = this,
                    plainLocations = self.currentLocations(),
                    i;


                if ( !toLocation || !toLocation._id ) {
                    return;
                }

                for ( i = 0; i < plainLocations.length; i++ ) {
                    if ( plainLocations[i]._id === toLocation._id ) {
                        self.selectedLocation( plainLocations[i] );
                    }
                }
            },

            initSelect2Employee: function() {
                var self = this;
                self.select2Employee = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.employeeId );
                        },
                        write: function( $event ) {
                            self.employeeId( $event.val );
                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'InCaseMojit.casefile_detail.placeholder.SELECT_EMPLOYEE' ),
                        data: function() {
                            if( !peek( self.selectedLocation ) ) {
                                return {
                                    results: []
                                };
                            }
                            return {
                                results: peek( self.selectedLocation ).employees.filter( function( employee ) {
                                    return 'PHYSICIAN' === employee.type;
                                } ).map( function( employee ) {
                                    return {
                                        id: employee._id,
                                        text: Y.doccirrus.schemas.person.personDisplay( employee )
                                    };
                                } )
                            };
                        }
                    }
                };
            },

            initWSListeners: function() {
                var self = this;
                Y.doccirrus.communication.on( {
                    event: 'invoiceTransitionPrint',
                    handlerId: 'printPDFTransitionHandler',
                    done: function success( res ) {
                        var waitForTransition = self.waitForTransition,
                            data = res && res.data;
                        if( data && waitForTransition ) {
                            Y.doccirrus.jsonrpc.api.media
                                .concatenatepdfs( { mediaIds: data, notifyPrint: true } );
                        }
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'mediaConcatenatePDFsPrint',
                    handlerId: 'printPDFGeneratedTransitionHandler',
                    done: function success( res ) {
                        var
                            data = res && res.data,
                            kopb = self.kopbCache,
                            canonicalId = peek( self.formId ),
                            locationId = peek( kopb.locationId ),
                            printerName = peek( kopb.printerName ),
                            waitForTransition = self.waitForTransition,
                            numCopies = parseInt( unwrap( self.copies ), 10 ) || 0;
                            if( data && waitForTransition ) {
                                self.documentUrl = data[0].tempFile;
                                Y.log( 'Start print, printerName: ' + printerName + ' formId: ' + canonicalId, 'debug', NAME );
                                self.printPDF( printerName, locationId, canonicalId, numCopies );
                            }
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'onPDFCreated',
                    socket: self.socket,
                    done: function ( message ) {
                        // after pdf file generated try call function again
                        var
                            activity = message.data[0].activity,
                            newLink = activity && '/media/' + activity.formPdf + '_original.APPLICATION_PDF.pdf';

                        self.documentUrl = newLink;
                        if( self.openInNewTab() ) {
                            self.onOpenButtonClick();
                        }

                        if( self.downloadPdf() ) {
                            self.onDownloadButtonClick();
                        }
                    },
                    handlerId: 'invoiceBatchCreationActionHandler'
                } );
            },

            printPDF: function( printerName, locationId, canonicalId, numCopies ) {
                var
                    self = this,
                    printUrl = '/1/media/:printCache',
                    printOptions = {
                        'tempFile': self.cacheFile || self.documentUrl,
                        'deleteOnPrint': false,
                        'printCopies': 1
                    },
                    i,
                    numCopiesWS;

                numCopies = numCopies || 1;

                if( unwrap( self.copy ) ) {
                    numCopiesWS = numCopies > 1 ? numCopies - 1 : numCopies;
                    numCopies = 1;
                }

                printOptions.printerName = printerName;

                if ( '' === printerName ) { return; }

                if ( self.mediaId && '' !== self.mediaId ) {
                    printUrl = '/1/media/:print';
                    printOptions.mediaId = self.mediaId;
                }

                for( i = 0; i < numCopies; i++ ) {
                    Y.doccirrus.comctl.privatePost( printUrl, printOptions, onPrintComplete );
                }

                if( self.activityIds && self.activityIds.length ) {
                    Y.doccirrus.jsonrpc.api.formtemplate.prepareDataForPrintCopyWS( {
                        activityIds: self.activityIds,
                        copiesNumber: numCopiesWS,
                        printerName: printerName
                    } );

                    Y.doccirrus.jsonrpc.api.activity.incrementPrintCount( { activityIds: self.activityIds, numCopies: numCopies + (numCopiesWS || 0) } );
                }

                /**
                *  Print complete
                *
                *  @param err
                *  @param response
                */

                function onPrintComplete( err, data ) {

                    //err = { 'force': 'for test' };

                    var
                        pdfLink = self.cacheFile,
                        retryMsg = i18n( 'InCaseMojit.casefile_exports.print_modal.printer_failure' ),
                        printMessageId = Y.doccirrus.comctl.getRandId(),
                        printMessage,
                        generatePDFandPrint = peek( self.generatePDFandPrint ),
                        configUpdate = {
                            'canonicalId': canonicalId,
                            'locationId': locationId,
                            'printerName': printerName
                        };

                    if( !generatePDFandPrint  ) {
                        if( err ) {
                            //  show a warning modal on error

                            retryMsg = retryMsg.replace( '%%PRINTERNAME%%', printerName );
                            retryMsg = retryMsg.replace( '%%PDFLINK%%', Y.doccirrus.infras.getPrivateURL( 'pdf/' + pdfLink ) );
                            retryMsg = retryMsg.replace( '%%CACHEFILE%%', pdfLink );

                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: printMessageId,
                                content: retryMsg,
                                level: 'ERROR'
                            } );
                            return;
                        }

                        data = data.data ? data.data : data;

                        //  show a success message on completion
                        printMessage = '' +
                                       i18n( 'InCaseMojit.casefile_exports.print_modal.printed' ) + data.msg + '<br/>' +
                                       i18n( 'InCaseMojit.casefile_exports.print_modal.printer' ) + printerName;

                        //  Display ststem message to the user
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: printMessageId,
                            content: printMessage,
                            level: 'SUCCESS'
                        } );

                        //  hide the message after a few seconds
                        window.setTimeout( function() { Y.doccirrus.DCSystemMessages.removeMessage( printMessageId ); }, PRINT_MSG_TIMEOUT );

                        //  Update / confirm print settings for this location
                        if ( canonicalId && locationId && '' !== canonicalId && '' !== locationId ) {
                            Y.doccirrus.comctl.privatePost( '/1/formprinter/:setsingle', configUpdate, onPrinterConfigSaved );
                        } else {
                            self.onComplete( true );
                        }
                    }

                }

                function onPrinterConfigSaved( err ) {
                    if ( err ) {
                        Y.log( 'Could nto update printer config for current user: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    Y.log( 'Updated printer config for current user.', 'debug', NAME );
                    self.onComplete( true );
                }
            },

            destructor: function() {
                var self = this;

                self.kopbCache = null;

                self.options = null;
                Y.doccirrus.communication.off( 'invoiceTransitionPrint', 'printPDFTransitionHandler' );
                Y.doccirrus.communication.off( 'mediaConcatenatePDFsPrint', 'printPDFGeneratedTransitionHandler' );
            },

            //  Event handlers

            onMenuUpdate: function() {
                var
                    self = this,
                    kopb = self.kopbCache,
                    employeeProfile = kopb.employeeProfile(),
                    userLocations = ( employeeProfile ? employeeProfile.locations : [] ),
                    displayPrinters = kopb.visiblePrinters.slice(),
                    formId = peek( self.formId ),
                    localStorageDefaultPrinter = unwrap( self.localStorageDefaultPrinter ),
                    localStorageLastPrintedLocationValue = unwrap( self.localStorageLastPrintedLocationValue ),
                    lastPrintedLocation = localStorageLastPrintedLocationValue[formId],
                    selectedLocation = self.selectedLocation() || self.kopbCache.location(),
                    i,
                    postArgs;

                if( !peek( self.currentLocations ).length ) {
                    self.currentLocations( userLocations );
                }
                self.currentPrinters( displayPrinters );

                self.showMoreVisible( kopb.canExpand );
                self.showFewerVisible( kopb.canCollapse );

                //  formId may have been resolved from form role if not passed directly
                if ( !formId || '' === formId ) {
                    self.formId( kopb.formId() );
                }

                if( !selectedLocation ) {
                    for( i = 0; i < userLocations.length; i++ ) {
                        if( lastPrintedLocation && lastPrintedLocation === userLocations[i]._id ) {
                            self.setSelectedLocation( userLocations[i] );
                        }
                    }
                    if( !self.selectedLocation() ) {
                        // if location not selected set first
                        self.setSelectedLocation( userLocations[0] );
                    }
                }

                if( lastPrintedLocation && localStorageDefaultPrinter[lastPrintedLocation] && localStorageDefaultPrinter[lastPrintedLocation][self.formId()] ) {
                    self.selectedPrinter( localStorageDefaultPrinter[lastPrintedLocation][self.formId()].printerName );
                } else if( localStorageDefaultPrinter[self.selectedLocation()._id] && localStorageDefaultPrinter[self.selectedLocation()._id][self.formId()] ) {
                    self.selectedPrinter( localStorageDefaultPrinter[self.selectedLocation()._id][self.formId()].printerName );
                } else {
                    postArgs = {
                        'locationId': self.selectedLocation()._id,
                        'canonicalId': self.formId()
                    };

                    // if any printer in localStorage get location printers
                    Y.doccirrus.comctl.privatePost( '/1/formprinter/:getAllAlternatives', postArgs, onAssignmentQuery );
                }

                function onAssignmentQuery( err, result ) {
                    if( err ) {
                        self.selectedPrinter( '' );
                        return;
                    }
                    var assignment = result.data ? result.data : result;
                    self.selectedPrinter(  assignment.locationPrinters[0] || '' );
                }
            },

            onSelectedPrinterChange: function( newPrinterName ) {
                var
                    self = this,
                    kopb = self.kopbCache || null;

                if ( !kopb || !newPrinterName ) {
                    return;
                }

                if ( peek( kopb.printerName ) === newPrinterName ) {
                    //  no change
                    return;
                }

                kopb.printerName( newPrinterName );
            },

            onSelectedLocationChange: function( newLocationObj ) {
                var
                    self = this,
                    kopb = self.kopbCache || null;

                if ( !kopb || !kopb.locationId || !peek( kopb.locationId ) || !newLocationObj ) {
                    //  initialising, error or bad value
                    return;
                }

                if ( peek( kopb.locationId ) === newLocationObj._id ) {
                    //  no change
                    return;
                }

                kopb.setNewLocation( newLocationObj._id );
            },

            /**
             *  Open a new window to display the pdf
             */

            onOpenButtonClick: function() {
                var
                    self = this,
                    newWindow, fileOptions;
                // if no file, then generate
                if( !self.documentUrl ) {
                    fileOptions = {
                        formId: self.formId(),
                        formVersionId: self.formVersionId,
                        mapCollection: self.mapCollection,
                        mapObject: self.activityId,
                        serialRender: "true",
                        printTo: null,
                        printCopies: 0
                    };
                    self.openInNewTab( true );
                    Y.doccirrus.jsonrpc.api.formtemplate.makepdfws( fileOptions )
                        .fail( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );

                } else {
                    newWindow = window.open( Y.doccirrus.infras.getPrivateURL( self.documentUrl ) );
                    //  close the modal
                    if ( self.onComplete ) { self.onComplete( newWindow ); }
                }
            },

            /**
             *  Force download of PDF
             *
             *  see:
             *      https://davidwalsh.name/download-attribute
             *      http://jsfiddle.net/LewisCowles1986/QPv34/
             */

            onDownloadButtonClick: function() {
                var
                    self = this,
                    fileOptions,
                    dnLink = document.getElementById('aDownloadHelperPDF');
                // if no file, then generate
                if( !self.documentUrl ) {
                    fileOptions = {
                        formId: self.formId(),
                        formVersionId: self.formVersionId,
                        mapCollection: self.mapCollection,
                        mapObject: self.activityId,
                        serialRender: "true",
                        printTo: null,
                        printCopies: 0
                    };
                    self.downloadPdf( true );
                    Y.doccirrus.jsonrpc.api.formtemplate.makepdfws( fileOptions )
                        .fail( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );

                } else {
                    dnLink.setAttribute( 'href', Y.doccirrus.infras.getPrivateURL( self.documentUrl ) );
                    dnLink.setAttribute( 'download', self.cacheFile );
                    dnLink.click();
                }
            },

            onShowMoreClick: function() {
                var
                    self = this,
                    kopb = self.kopbCache;

                if ( !kopb ) { return; }
                kopb.showAllPrinters( true );
                self.showMoreVisible( false );
                kopb.updateMenu();
            },

            onShowFewerClick: function() {
                var
                    self = this,
                    kopb = self.kopbCache;

                if ( !kopb ) { return; }
                kopb.showAllPrinters( false );
                self.showFewerVisible( false );
                kopb.updateMenu();
            },

            /**
             *  Send print request to the server and close the modal
             */

            onPrintButtonClick: function() {
                var
                    self = this,
                    kopb = self.kopbCache,
                    canonicalId = peek( self.formId ),
                    copies = unwrap( self.copy ),
                    waitForTransition = self.waitForTransition,
                    generatePDFandPrint = self.generatePDFandPrint,
                    activityId = peek( self.activityId ),
                    formVersionId = peek( self.formVersionId ),
                    locationId = peek( kopb.locationId ),
                    printerName = peek( kopb.printerName ),
                    numCopies = parseInt( unwrap( self.copies ), 10 ) || 0,
                    numCopiesWSCopy = ( copies ? 1 : parseInt( unwrap( self.copies ), 10 ) ) || 0,
                    localStorageDefaultPrinter = unwrap( self.localStorageDefaultPrinter ),
                    localStorageLastPrintedLocationValue = unwrap( self.localStorageLastPrintedLocationValue ),
                    hasSomethingToPrint = ( self.cacheFile || self.documentUrl || self.mediaId ),
                    postData,
                    printOptions;

                Y.log( 'Start print, printerName: ' + printerName + ' formId: ' + canonicalId, 'debug', NAME );
                self.beforeComplete();

                //  if we can print immediately, do it, otherwise we must wait for transition/pdf generation
                if( ( !waitForTransition || !generatePDFandPrint ) && hasSomethingToPrint ) {
                    self.printPDF( printerName, locationId, canonicalId, numCopies );
                }

                if( generatePDFandPrint ) {
                    printOptions = {
                        formId: canonicalId,
                        formVersionId: formVersionId,
                        mapCollection: "activity",
                        mapObject: activityId,
                        serialRender: "true",
                        printTo: printerName || null,
                        printCopies: numCopiesWSCopy
                    };
                    Y.doccirrus.jsonrpc.api.formtemplate.makepdfws( printOptions ).then( onPrintCopies ).fail( onPrintFail );
                    if( copies ) {
                        printOptions = {
                            mapCollection: 'activity',
                            mapObject: activityId,
                            formId: canonicalId,
                            formVersionId: formVersionId,
                            saveTo: 'temp',
                            printTo: printerName,
                            printCopies: numCopies > 1 ? numCopies - 1 : numCopies,
                            waitCallback: false
                        };
                        Y.doccirrus.jsonrpc.api.formtemplate.printpdfcopyws( printOptions ).then( onPrintCopies ).fail( onPrintFail );
                    }

                }
                // set data to localStorage
                localStorageLastPrintedLocationValue[canonicalId] = locationId;
                if( !localStorageDefaultPrinter[locationId] ) {
                    localStorageDefaultPrinter[locationId] = {};
                }
                if( !localStorageDefaultPrinter[locationId][canonicalId] ) {
                    localStorageDefaultPrinter[locationId][canonicalId] = {};
                }
                localStorageDefaultPrinter[locationId][canonicalId].printerName = printerName;
                Y.doccirrus.utils.localValueSet( 'defaultPrinter', JSON.stringify( localStorageDefaultPrinter ) );
                Y.doccirrus.utils.localValueSet( 'lastPrintedLocation', JSON.stringify( localStorageLastPrintedLocationValue ) );
                postData = {
                    defaultPrinter: localStorageDefaultPrinter,
                    lastLocation: localStorageLastPrintedLocationValue
                };
                if ( self.presettings.activeProfileId() ) {
                    postData = {
                        defaultPrinter: localStorageDefaultPrinter,
                        lastLocation: localStorageLastPrintedLocationValue
                    };
                    Y.doccirrus.jsonrpc.api.profile.updateDefaultPrinter( {
                        query: {_id: self.presettings.activeProfileId()},
                        data: postData
                    } ).done( function( ) {
                        Y.log( 'default printer changed: ' + self.formId(), 'debug', NAME );
                    } ).fail( function( ) {
                        Y.log( 'default printer not changed: ' + self.formId(), 'debug', NAME );
                    } );
                }
                function onPrintCopies( /* response */ ) {
                    Y.log( 'Printed ' + numCopies + ' copies with mask to ' + printerName + '.', 'info', NAME );
                }

                function onPrintFail( err ) {
                    //  server should raise a websocket event which will display a system message
                    Y.log( 'Probblem printing copies: ' + JSON.stringify( err ), 'error', NAME );
                }
            }

        } );

        /**
         *  Show progress of report generation on server and download / save / print links when complete
         *
         *  @param  options                     {Object}
         *  @param  options.cacheFile           {String}    Name of a PDF file in the cache directory
         *  @param  options.documentUrl         {String}    Cache URL where this PDF may be downloaded
         *  @param  options.mediaId             [String]    Media _id of document is to be printed from GridFS
         *  @param  options.canonicalId         {String}    Form this PDF was generated from
         *  @param  options.formRole            {String}    Not presently used
         *  @param  options.canSavePdf          {Boolean}   Optional, if true, show 'Save PDF' button
         *  @param  options.onRequestSavePdf    [Function]  Optional, called when 'Save PDF' button is clicked
         *  @param {Boolean} [options.savePDFtoCaseFile]    Option for new functionality to save created PDF into
         *                                                  Casefile of Patient
         *  @param {Object} [options.options]               Additional Options
         *  @param {Object} [options.options.patientId]     PatientId
         *  @param {Object} [options.options.caseFolderId]  CaseFolderId
         *  @param {String} [options.documentFileName]      documentFileName
         */

        function show( options ) {
            var localStorageValue = Y.doccirrus.utils.localValueGet( 'printers'),
                localStoragePrinters;

            if (localStorageValue) {
                localStoragePrinters = JSON.parse(localStorageValue);
            }

            if (!localStoragePrinters) {
                Y.doccirrus.jsonrpc.api.printer
                    .getPrinter()
                    .done( function( response ) {
                        onPrintersLoaded(response);
                    } )
                    .fail( function( error ) {
                        Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'error', NAME );
                    } );
            }

            function onPrintersLoaded( printers ) {
                Y.doccirrus.utils.localValueSet( 'printers', JSON.stringify(printers.data ? printers.data : printers) );
            }

            //  allow option fotmat from previous modal
            if ( options && options.canonicalId ) {
                options.formId = options.canonicalId;
            }

            if ( !options || ( !options.formId && !options.formRole ) ) {
                Y.log( 'Missing canonicalId, cannot offer print functionality', 'warn', NAME );
                return;
            }

            Promise
                .props( {
                    modules: Y.doccirrus.utils.requireYuiModule( [
                        'node',
                        'JsonRpcReflection-doccirrus',
                        'JsonRpc',
                        'DCWindow'
                    ] ),
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'FormEditorMojit/views/printpdf_modal' } )
                        .then( function( response ) {
                            return response.data;
                        } ),
                    locations: Y.doccirrus.jsonrpc.api.location.read( {
                        options: {
                            sort: {
                                locname: 1
                            }
                        }
                    } )
                        .then( function( response ) {
                            return response.data;
                        } )
                } )
                .then( function( props ) {
                    var
                        template = props.template,
                        locations = props.locations,
                        bindings = new PrintPDFModel(Object.assign({}, options, {locations: locations} )),
                        bodyContent = Y.Node.create( template ),

                        btnPrint = {
                            name: 'PRINT',
                            label: i18n( 'InSight2Mojit.printpdf_modal.print' ),
                            isDefault: true,
                            action: onPrintButtonClick
                        },

                        btnOpen = {
                            name: 'OPEN',
                            label: i18n( 'InSight2Mojit.reportpdf_modal.open' ),
                            isDefault: true,
                            action: onOpenButtonClick
                        },

                        btnDownload = {
                            name: 'DOWNLOAD',
                            label: i18n( 'InSight2Mojit.reportpdf_modal.download' ),
                            isDefault: true,
                            action: onDownloadButtonClick
                        },

                        btnSave = {
                            name: 'SAVE',
                            label: i18n( 'InSight2Mojit.printpdf_modal.save' ),
                            isDefault: true,
                            action: onSaveButtonClick
                        },

                        btnCancel = {
                            name: 'Cancel',
                            label: i18n( 'InSight2Mojit.printpdf_modal.cancel' ),
                            isDefault: true,
                            action: onCancelButtonClick
                        },

                        buttonSet = [ btnCancel, btnDownload, btnOpen, btnPrint ],

                        dialogConfig = {
                            id: 'DCWindow-SelectLocationsDialog',
                            className: 'DCWindow-SelectLocationsDialog',
                            bodyContent: bodyContent,
                            title: !options.savePDFtoCaseFile? i18n( 'InSight2Mojit.printpdf_modal.title' ) : i18n( 'InSight2Mojit.printpdf_modal.savePDFtoCaseFileTitle' ),
                            icon: Y.doccirrus.DCWindow.ICON_INFO,

                            width: WINDOW_SIZE,
                            maximizable: false,
                            centered: true,
                            modal: true,

                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: buttonSet
                            }
                        },

                        dialog;

                    //  MOJ-9363 Add button to save PDF to activity Ext Dokumente //-----
                    if ( options.canSavePdf ) {
                        dialogConfig.buttons.footer = [ btnCancel, btnDownload, btnSave, btnOpen, btnPrint ];
                    }

                    if( options.savePDFtoCaseFile && options && options.options ) {
                        dialogConfig.buttons.footer = [btnCancel, btnDownload, btnOpen, btnSave];
                        options.onRequestSavePdf = function() {
                            var activityData = {
                                patientId: options.options.patientId,
                                caseFolderId: options.options.caseFolderId,
                                timestamp: moment(),
                                userContent: peek( bindings.activityContent ),
                                status: peek( bindings.selectedActivityStatus ).val,
                                actType: peek( bindings.selectedSimpleActivity ).val,
                                locationId: peek( bindings.selectedLocation )._id,
                                employeeId: peek( bindings.employeeId )
                            };

                            Y.doccirrus.utils.localValueSet( 'pdfIntoCaseFileLocationId', JSON.stringify( peek( bindings.selectedLocation ) ) );
                            Y.doccirrus.utils.localValueSet( 'pdfIntoCaseFileActType', JSON.stringify( peek( bindings.selectedSimpleActivity ) ) );
                            Y.doccirrus.utils.localValueSet( 'pdfIntoCaseFileStatus', JSON.stringify( peek( bindings.selectedActivityStatus ) ) );
                            Y.doccirrus.utils.localValueSet( 'pdfIntoCaseFileEmployeeId', activityData.employeeId );
                            Y.doccirrus.utils.localValueSet( 'pdfIntoCaseFileUserContent', activityData.userContent );

                            Promise.resolve( Y.doccirrus.jsonrpc.api.activity.createSimpleActivityWithAttachedPDF( {
                                params: {
                                    documentFileName: options.documentFileName
                                },
                                activityData: activityData
                            } ) ).then( function( response ) {
                                options.options.callback( null, response );
                            } ).catch( function( err ) {
                                options.options.callback( err );
                            } );
                        };
                    }

                    dialog = new Y.doccirrus.DCWindow( dialogConfig );

                    bindings.onComplete = function( serverResponse ) {
                        if ( options.onComplete ) { options.onComplete( serverResponse ); }
                        bindings.destroy();
                        dialog.close();
                    };

                    bindings.beforeComplete = function() {
                        return new Promise( function( resolve ) {
                            if ( options.beforeComplete ) {  options.beforeComplete()
                                .then(function() {
                                    resolve();
                                }); }
                        });
                    };

                    if( options.savePDFtoCaseFile ) {
                        bindings.addDisposable( ko.computed( function() {
                            var
                                isModelValid = unwrap( bindings.isValid ),
                                okButton = dialog.getButton( 'SAVE' ).button;
                            if( isModelValid ) {
                                okButton.enable();
                            } else {
                                okButton.disable();
                            }
                        } ) );
                    }

                    //  necessary to re-center after table node is added (similar to processNextTick)
                    window.setTimeout( function() { dialog.centered(); }, 1 );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                    function onOpenButtonClick() {
                        bindings.onOpenButtonClick();
                    }

                    function onDownloadButtonClick() {
                        bindings.onDownloadButtonClick();
                    }

                    function onPrintButtonClick() {
                        bindings.onPrintButtonClick();
                        dialog.close();
                    }

                    function onSaveButtonClick() {
                        if ( !options.onRequestSavePdf ) {
                            Y.log( 'Cannot save PDF, no onRequestSavePDF callback given' );
                            return;
                        }
                        options.onRequestSavePdf( options );
                        dialog.close();
                    }

                    function onCancelButtonClick() {
                        dialog.close();
                    }

                } );

        }

        Y.namespace( 'doccirrus.modals' ).printPdfModal = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'node-event-simulate',
            'dcforms-utils'
        ]
    }
);
