/**
 * User: strix
 * Date: 04/12/16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, $, async */

YUI.add( 'chooseprinter-modal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Select a printer from those available at this location, or show a message that none are available
         *
         *  @param  config                      {Object}
         *  @param  config.locationId           {String}    Current location of this user (optional)
         *  @param  config.canonicalId          {String}    Canonical _id of the form to be printed
         *  @param  config.autoSelect           {Boolean}   If true then call back immediately with default printer
         *  @param  config.onPrinterSelected    {Function}  Of the form fn( printerName, locationId, canonicalId )
         *  @param  config.dropDown             {Object}    Query dom node to render into, instead of modal - dropdown menu ul
         */

        function show( config ) {

            var
                node = Y.Node.create( '<div></div>' ),
                jq = {},

                DEFAULT_LOCATION = '000000000000000000000001',

                locationId = config.locationId || null,
                canonicalId = config.canonicalId || null,
                onPrinterSelected = config.onPrinterSelected || Y.dcforms.nullCallback,
                autoSelect = config.autoSelect || false,

                assignment = null,
                employeeProfile = null,
                location = null,
                printerName = '',
                showAll = false,                //  true when showing all printers at location

                modal,

                btnSelect = {
                    name: 'SELECTPRINTER',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.SELECT' ),
                    isDefault: true,
                    action: onSelectButtonClick
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.CANCEL' ),
                    isDefault: true,
                    action: onCancelButtonClick
                },

                buttonSet = [ btnSelect, btnCancel ];

            if ( config.dropDown ) { jq.dropDown = config.dropDown; }

            async.series(
                [
                    getCurrentUserLocation,
                    getLocation,
                    getPrintPreferences,
                    doQuickPrint,
                    createDropDown,
                    loadJade,
                    createModal,
                    updatePrinterSelect
                ],
                onModalReady
            );

            //  1. Get the location if the current user as set in their profile (if not passed in config)
            function getCurrentUserLocation( itcb ) {
                //  skip this step if we already have a locationId
                if ( locationId && '' !== locationId ) { return itcb( null ); }

                Y.doccirrus.jsonrpc.api.employee
                    .getIdentityForUsername( { username: Y.doccirrus.auth.getUserId() } )
                    .then( onLoadProfile )
                    .fail( onUserLookupFail );

                function onLoadProfile( response ) {
                    employeeProfile = response.data ? response.data : response;
                    locationId = employeeProfile.currentLocation || DEFAULT_LOCATION;
                    itcb( null );
                }

                function onUserLookupFail( err ) {
                    itcb( err );
                }

            }

            //  2. Get full location object (for enabled printers at this location)
            function getLocation( itcb ) {
                Y.doccirrus.jsonrpc.api.location
                    .read( { query: { _id: locationId } } )
                    .then( onLocationLoaded )
                    .fail( onLocationErr );

                function onLocationLoaded( response ) {
                    if ( !response.data[0] ) { return itcb(  'Could not load location: ' + locationId ); }

                    location = response.data[0];
                    itcb( null );
                }

                function onLocationErr( err ) {
                    return itcb( err );
                }
            }

            //  3. Get the user's print preferences for this form at the current location
            function getPrintPreferences( itcb ) {
                var
                    postArgs = {
                        'locationId': locationId,
                        'canonicalId': canonicalId
                    },
                    locationDefaultPrinter = location.defaultPrinter,
                    locationEnabledPrinters = location.enabledPrinters,
                    localStorageValue = Y.doccirrus.utils.localValueGet( 'printers'),
                    localStoragePrinters,
                    localAssignment, i, j,
                    individualAssignment = null;
                if (localStorageValue) {
                    localStoragePrinters = JSON.parse(localStorageValue);
                }

                Y.doccirrus.comctl.privatePost( '/1/formprinter/:loadIndividualAssignment', postArgs, onIndividualAssignmentQuery );

                function onIndividualAssignmentQuery( err, result ) {
                    if ( err ) { return itcb( err ); }

                    individualAssignment = result.data ? result.data : result;
                    if (individualAssignment && Object.getOwnPropertyNames(individualAssignment).length > 0 &&
                        localStoragePrinters && localStoragePrinters.length > 0) {
                        if (!individualAssignment.locationPrinters || !individualAssignment.locationPrinters.length) {
                            individualAssignment.locationPrinters = [];
                        }
                        assignment = individualAssignment;
                        printerName = individualAssignment.printerName;
                        itcb( null );
                    } else {
                        if (localStoragePrinters && localStoragePrinters.length > 0) {
                            localAssignment = {
                                'printerName': locationDefaultPrinter || '',
                                'alternatives': [],
                                'locationPrinters': []
                            };
                            for (i = 0; i < localStoragePrinters.length; i++) {
                                for (j = 0; j < locationEnabledPrinters.length; j++) {
                                    if (locationEnabledPrinters[j] === localStoragePrinters[i].name.trim()) {
                                        localAssignment.locationPrinters.push( localStoragePrinters[i].name );
                                    }
                                }
                            }
                            assignment = localAssignment;
                            printerName = localAssignment.printerName;
                            itcb( null );
                        } else {
                            Y.doccirrus.comctl.privatePost( '/1/formprinter/:getAllAlternatives', postArgs, onAssignmentQuery );
                        }
                    }
                }

                function onAssignmentQuery( err, result ) {
                    if ( err ) { return itcb( err ); }

                    assignment = result.data ? result.data : result;
                    printerName = assignment.printerName;
                    itcb( null );
                }

            }

            //  4. Send default printer to caller is using autoSelect option (no modal shown)
            function doQuickPrint( itcb ) {
                //  if not set to autoSelect then we can skip this step (and present the modal)
                if ( !autoSelect ) { return itcb( null ); }

                if ( printerName && '' !== printerName ) {
                    //  let parent know about printer assignment, don't call back - we're done and the process ends here
                    return onPrinterSelected( printerName, locationId, canonicalId );
                }

                //  no default printer, continue to load and show modal
                itcb( null );
            }

            //  5. Load modal jade template (stub)
            function loadJade( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'chooseprinter_modal',
                    'FormEditorMojit',
                    {},
                    node,
                    itcb
                );
            }

            //  HACK: Create a dropdown menu on a button instead of popping a modal
            function createDropDown( itcb ) {
                //  if no dropdown
                if ( !jq.dropDown ) { return itcb( null ); }

                updatePrinterMenu();

                //  no callback, abort here
            }

            //  6. Instantiate the modal
            function createModal( itcb ) {

                modal = Y.doccirrus.DCWindow.dialog( {
                    title: i18n( 'FormEditorMojit.chooseprinter_modal.title' ),
                    type: 'info',
                    window: {
                        width: 'large',
                        maximizable: true,
                        buttons: { footer: buttonSet }
                    },
                    message: node
                } );

                jq = {
                    'divSelPrinter': $('#divSelPrinter')
                };

                setButtonsDisplay( 'none' );
                itcb( null );
            }

            /**
             *  Raised after the printerList variable is populated
             */

            //  7. Create and populate a select box to select printer
            function updatePrinterSelect( itcb ) {
                var
                    html = '',
                    isSelected,
                    printerList,
                    i;

                //  if there is no config for this printer then we can only show the full list
                if ( 0 === assignment.alternatives.length && '' === assignment.printerName && !showAll ) {
                    showAll = true;
                }

                if ( showAll ) {
                    printerList = location.enabledPrinters || [];
                } else {
                    printerList = assignment.alternatives.slice();
                    if ( assignment.printerName ) { printerList.unshift( assignment.printerName ); }
                }

                for (i = 0; i < printerList.length; i++ ) {
                    isSelected = ( printerList[i] === printerName ) ? ' selected="selected"' : '';
                    html = html + '<option value="' + printerList[i] + '"' + isSelected + '>' + printerList[i] + '</option>';
                }

                if ( showAll ) {
                    html = html + '<option value="FEWER_PRINTERS"><i>' + i18n( 'FormEditorMojit.chooseprinter_modal.labels.FEWER_PRINTERS' ) + '</i></option>';
                } else {
                    html = html + '<option value="MORE_PRINTERS"><i>' + i18n( 'FormEditorMojit.chooseprinter_modal.labels.MORE_PRINTERS' ) + '</i></option>';   //  translateme
                }

                html = '<select class="form-control" id="selPrintPDFTo">' + html + '</select>';

                if ( 0 === printerList.length ) {
                    //  Add a message if there are not printers to choose from
                    html = i18n( 'FormEditorMojit.chooseprinter_modal.labels.NO_PRINTERS' ) + '<br/>';
                    // debug
                    html = html + 'Location: ' + location.locname + ' / ' + location._id;
                    setButtonsDisplay( 'none' );
                } else {
                    //  Show the 'select' button
                    setButtonsDisplay( '' );
                }

                jq.divSelPrinter.html( html );
                jq.selPrinter = $( '#selPrintPDFTo' );
                jq.selPrinter.off( 'change' ).on( 'change', onSelectionChanged );
                itcb( null );
            }

            /**
             *  Change visibility of modal buttons
             *
             *  @param  value   {String}    Empty string to show buttons, 'none' to hide them
             */

            function setButtonsDisplay( value ) {
                if (!modal || !modal._buttonsMap) {
                    return;
                }
                modal._buttonsMap.SELECTPRINTER._node.style.display = value;
            }

            /**
             *  Make a dropdown menu from the currently available printers at this location
             */

            function updatePrinterMenu( ) {
                var
                    html = '',
                    isSelected,
                    printerList,
                    selectedIcon = ' <i style="color: green;" class="fa fa-check"></i>',
                    i;

                //  if there is no config for this printer then we can only show the full list
                if ( 0 === assignment.alternatives.length && '' === assignment.printerName && !showAll ) {
                    showAll = true;
                }

                if ( showAll ) {
                    printerList = location.enabledPrinters || [];
                } else {
                    printerList = assignment.alternatives.slice();
                    if ( assignment.printerName ) { printerList.unshift( assignment.printerName ); }
                }

                printerList = printerList.slice();
                printerList.sort();

                for (i = 0; i < printerList.length; i++ ) {
                    isSelected = ( printerList[i] === printerName ) ? selectedIcon : '';

                    html = html + '' +
                        '<li id="ddPrintSelectMenu' + i + '">' +
                        '<a href="#">' + printerList[i] + isSelected + '</a>' +
                        '</li>';
                }

                html = html + '<li role="separator" class="divider"></li>';

                if ( showAll ) {
                    html = html + '<li id="ddPrintSelectMenuFEWER"><a href="#"><i>' + i18n( 'FormEditorMojit.chooseprinter_modal.labels.FEWER_PRINTERS' ) + '</i></a></li>';
                } else {
                    html = html + '<li id="ddPrintSelectMenuMORE"><a href="#"><i>' + i18n( 'FormEditorMojit.chooseprinter_modal.labels.MORE_PRINTERS' ) + '</i></a></li>';   //  translateme
                }

                if ( 0 === printerList.length ) {
                    //  Add a message if there are not printers to choose from
                    html = i18n( 'FormEditorMojit.chooseprinter_modal.labels.NO_PRINTERS' ) + '<br/>';
                    // debug
                    html = html + 'Location: ' + location.locname + ' / ' + location._id;
                }

                jq.dropDown.html( html );

                //  TODO: attach event handlers here

                for ( i = 0; i < printerList.length; i++ ) {
                    $( '#ddPrintSelectMenu' + i ).off( 'click' ).on( 'click', makePrintSelectHander( i ) );
                }

                if ( showAll ) {
                    $( '#ddPrintSelectMenuFEWER' ).off( 'click' ).on( 'click', function( evt ) {
                        evt.stopPropagation();
                        showAll = false;
                        updatePrinterMenu();
                    } );
                } else {
                    $( '#ddPrintSelectMenuMORE' ).off( 'click' ).on( 'click', function( evt ) {
                        evt.stopPropagation();
                        showAll = true;
                        updatePrinterMenu();
                    } );
                }

                function makePrintSelectHander( idx ) {
                    return function() {
                        jq.dropDown.html( '...' );
                        onPrinterSelected( printerList[idx], locationId, canonicalId );
                    };
                }

            }

            //  Event handlers

            /**
             *  Raised after modal is created
             *
             *  @param err
             */

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Could not set printer modal: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

            /**
             *  User pressed the select button, dismiss this modal and inform parent
             */

            function onSelectButtonClick() {
                if ( !printerName || '' === printerName ) {
                    Y.log( 'Not selecting printer, none chosen', 'debug', NAME );
                    return;
                }

                Y.log( 'Printer selected from dialog box: ' + printerName, 'debug', NAME );
                onPrinterSelected( printerName, locationId, canonicalId );
                modal.close( true );
            }

            /**
             *  Raised when value changes in printer select box
             */

            function onSelectionChanged() {
                var selectValue = jq.selPrinter.val();

                //  magic list item
                if ( 'MORE_PRINTERS' === selectValue ) {
                    showAll = true;
                    return updatePrinterSelect( onPrintersUpdated );
                }

                if ( 'FEWER_PRINTERS' === selectValue ) {
                    showAll = false;
                    return updatePrinterSelect( onPrintersUpdated );
                }

                if ( selectValue && '' !== selectValue ) {
                    printerName = selectValue;
                }

                function onPrintersUpdated() {
                    jq.selPrinter.addClass( 'open' );
                }
            }


            /**
             *  User pressed the cancel button, just close the modal
             *  Future: might delete the cached PDF here on a timeout, will be cleared on next restart
             */

            function onCancelButtonClick() {
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).choosePrinter = {
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