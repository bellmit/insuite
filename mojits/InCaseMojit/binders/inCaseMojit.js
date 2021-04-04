/*global YUI, ko, moment, setViewportWide *//*eslint prefer-template:0 strict:0*/
'use strict';

YUI.add( 'InCaseMojitBinder', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,
        unwrap = ko.unwrap,

        NO_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN' ),
        NO_SCHEIN_IN_QUARTER = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_IN_QUARTER' ),
        NO_SCHEIN_EXPLANATION = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_EXPLANATION' ),
        SEARCH_BAR = i18n( 'InCaseMojit.documentSearchModal_clientJS.title.SEARCH_BAR' ),
        CREATE_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.button.CREATE_SCHEIN' ),
        SHOW_ALL_DOCUMENTS = i18n( 'InCaseMojit.casefile_detailJS.tooltip.SHOW_ALL_DOCUMENTS' ),
        SHOW_ALL_DOCUMENTS_OF_CURRENT_PATIENT = i18n( 'InCaseMojit.casefile_detailJS.tooltip.SHOW_ALL_DOCUMENTS_OF_CURRENT_PATIENT' ),

        catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        TAB_PATIENT_BROWSER = 'tab_patientBrowser',
        TAB_CASE_FILE = 'tab_caseFile',
        TAB_PATIENT_DETAIL = 'tab_patientDetail',
        TAB_REPORTS = 'tab_reports',
        TAB_WITHOUT_CARDREAD = 'tab_withoutCardRead',
        TAB_APK = 'tab_apkInProgress',
        TAB_KIM = 'tab_kim',


        PatientBrowserViewModel = KoViewModel.getConstructor( 'PatientBrowserViewModel' ),
        CaseFileViewModel = KoViewModel.getConstructor( 'CaseFileViewModel' ),
        PatientDetailViewModel = KoViewModel.getConstructor( 'PatientDetailViewModel' ),
        WithoutCardReadViewModel = KoViewModel.getConstructor( 'WithoutCardReadViewModel' ),
        PredefinedReportsViewModel = KoViewModel.getConstructor( 'PredefinedReportsViewModel' ),
        ApkInProgressViewModel = KoViewModel.getConstructor( 'ApkInProgressViewModel' ),
        KimViewModel = KoViewModel.getConstructor( 'KimViewModel' );

    /**
     * @class InCaseMojitBinder
     * @extends Y.doccirrus.DCBinder
     * @param   {Object}    config
     * @constructor
     */
    function InCaseMojitBinder( config ) {
        InCaseMojitBinder.superclass.constructor.call( this, config );
    }

    Y.extend( InCaseMojitBinder, Y.doccirrus.DCBinder, {

        /** @private */
        initializer: function() {
            var
                self = this;

            self.initObservables();

            //  set the default / 'not found' image
            Y.doccirrus.media.setDefaultImage( '/static/CaseFileMojit/assets/images/default-patient-image.jpg' );
            self.initHotKeys();
            self.initDcChangeTab();
            self.initToggleFullScreen();
            self.initWsListeners();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            if ( unwrap(self.isFrameView) ) {
                window.removeEventListener( 'onkeydown', self.closeSolModalOnEsc );
                self.PostMessageConnection.clean();
            }
            self.destroyHotKeys();
            self.destroyWsListeners();
        },
        /**
         * @property hotKeysGroup
         * @type {null|Object}
         */
        hotKeysGroup: null,

        /**
         * Keep a reference to any reporting viewModel created, so that we can dispose it properly when tabbing away
         * @property openReportsViewModel
         * @type {null|Object}
         */

        openReportsViewModel: null,

        initHotKeys: function() {
            var
                self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'global' )
                .on( 'ctrl+h', i18n( 'InCaseMojit.HotkeysModal.label' ), onShowShortcutsList );

            function onShowShortcutsList() {
                var
                    currentView = peek( self.currentView ),
                    currentActivity = peek( self.currentActivity ),
                    hotKeysGroups = currentActivity ? ['ActivityDetailsViewModel', currentView && currentView.name] : currentView && currentView.name;

                Y.doccirrus.modals.hotkeys.show( { 'hotKeysGroups': hotKeysGroups } );
            }

        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+h' );
                self.hotKeysGroup = null;
            }
        },
        initDcChangeTab: function() {
            Y.doccirrus.NavBarHeader.setActiveEntry( 'patients' );
        },

        initWsListeners: function() {
            var
                self = this;

            //  add socket event listener for PUBRECEIPTs / patientenquittungen
            Y.doccirrus.communication.on( {
                event: 'pubreceiptGenerated',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onPubreceiptGenerated,
                handlerId: 'caseFilePubreceiptListener'
            } );

            //  PDF will have been generated at this point, we must prompt the user to open or print it
            function onPubreceiptGenerated( message ) {
                var
                    data = message.data && message.data[0];

                if ( !data.activityId || -1 === self.printWhenReady.indexOf( data.activityId )  ) {
                    //  new PUBRECEIPT was not expected, generated by another process or tab
                    return;
                }

                //TODO: remove the activityId

                //  show print modal
                if ( data.mediaId && '' !== data.mediaId ) {
                    data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                    Y.doccirrus.modals.printPdfModal.show( data );
                }
            }

            //  add socket event listener for quickPrint
            //  this event handler should now only show errors on quickprint, success messages are given as green
            //  notifications in the top right.
            Y.doccirrus.communication.on( {
                event: 'quickPrintComplete',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onQuickPrintMessage,
                handlerId: 'caseFileQuickPrintListener'
            } );

            Y.doccirrus.communication.on( {
                event: 'TREATMENT_DIGNITIES_ERROR',
                done: function( response ) {
                    var data = response && response.data,
                        messageString = i18n( 'InCaseMojit.messages.dignitiesMessage' ) + '<br/><br/>';

                    ( data || [] ).forEach( function( i ) {
                        messageString += i.actCode + ' : ' + i.code + '<br/>';
                    });
                    Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + (response.meta && response.meta.messageId) );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'socket-message-' + (response.meta && response.meta.messageId),
                        content: messageString,
                        level: 'WARNING'
                    } );
                }
            } );

            function onQuickPrintMessage( message ) {

                var data = message.data && message.data[0];
                //  PDF will have been generated at this point, this event will refresh casefolder to show PDF
                //  link and pop a modal to notify printer outcome

                var errUrl,
                    localStorageValue = Y.doccirrus.utils.localValueGet( 'printers'),
                    localStoragePrinters;

                if (localStorageValue) {
                    localStoragePrinters = JSON.parse(localStorageValue);
                }

                if( data.err ) {
                    errUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                    errUrl = Y.doccirrus.infras.getPrivateURL( errUrl );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: 'Fehler: ' + JSON.stringify( data.err ) + '<br/>\n' +
                        'Drucker: ' + data.printerName + '<br/>\n' +
                        'PDF: <a href="' + errUrl + '" target="_blank">Herunterladen</a>',
                        window: {
                            width: 'medium'
                        }
                    } );
                    return;
                }

                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: '' +
                    i18n( 'InCaseMojit.casefile_exports.print_modal.printed' ) + data.msg + '<br/>' +
                    i18n( 'InCaseMojit.casefile_exports.print_modal.printer' ) + data.printerName,
                    window: {
                        width: 'medium'
                    }
                } );

                Y.fire( 'activityPDFChange', { mediaId: data.mediaId } );

                if (localStoragePrinters) {
                    Y.doccirrus.jsonrpc.api.printer
                        .getPrinter()
                        .done( function( response ) {
                            onPrintersLoaded(response);
                        } )
                        .fail( function( error ) {
                            Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'debug', NAME );
                        } );
                }
                function onPrintersLoaded( printers ) {
                    Y.doccirrus.utils.localValueSet( 'printers', JSON.stringify(printers.data ? printers.data : printers) );
                }
            }

            //  add socket event listener for making multiple copies of treatments - EXTMOJ-1064
            Y.doccirrus.communication.on( {
                event: 'treatmentCopiesCreated',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onTreatmentCopiesCreated,
                handlerId: 'caseFileTreatmentCopyListener'
            } );

            function onTreatmentCopiesCreated( message ) {
                Y.log( 'Multiple copies of treatment have been made, updating table.', 'debug', NAME );
                Y.fire( 'activityCopied', message );
            }

            //  add socket event listener for updates to activity after save of another activity which links them
            Y.doccirrus.communication.on( {
                event: 'linkedActivityUpdate',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onLinkedActivityUpdate,
                handlerId: 'caseFileLinkedActivityUpdateListener'
            } );

            function onLinkedActivityUpdate( message ) {
                if ( message.data && message.data.length ) {
                    Y.log( 'Linked activities have changed after transition, updating table.', 'debug', NAME );
                    Y.fire( 'activityChangedOnServer', message );
                }
            }

            //  add socket event listener for update activities after printing activity
            Y.doccirrus.communication.on( {
                event: 'activityPrinted',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onActivityPrinted,
                handlerId: 'activitiesTableActivityPrintedListener'
            } );

            function onActivityPrinted( message ) {
                if ( message.data && message.data.length ) {
                    Y.log( 'Activity print count have changed after transition, updating table.', 'debug', NAME );
                    Y.fire( 'activityPrinted', message );
                }
            }

            //  add socket event listener for invalidation of parent activities when child changes - MOJ-10071
            self.invalidatedParentActivities = ko.observableArray( [] );
            self.invalidParentModalVisible = ko.observable( false );

            Y.doccirrus.communication.on( {
                event: 'parentActivityInvalid',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onParentActivityInvalid,
                handlerId: 'caseFileParentActivityInvalidListener'
            } );

            function onParentActivityInvalid( message ) {
                var activityIds = [], i;

                if ( !message || !message.data || !message.data.length ) {
                    Y.log( 'Invalid message received from server: ' + JSON.stringify( message ), 'debug', NAME );
                    return;
                }

                for ( i = 0; i < message.data.length; i++ ) {
                    if ( message.data[i].activityId ) {
                        //  to update casefile table
                        activityIds.push( message.data[i].activityId );

                        //  event may fire multiple times as work is done in other tabs, only add new changes
                        if ( !hasInvalidParentActivity( message.data[i].activityId ) ) {
                            self.invalidatedParentActivities.push( message.data[i] );
                        }
                    }
                }

                //  update activity in CaseFile table, if visible
                Y.fire( 'activityChangedOnServer', { 'data': activityIds } );

                if ( self.invalidParentModalVisible() ) {
                    //  modal is already open, just updating set
                    return;
                }

                self.invalidParentModalVisible( true );

                Y.doccirrus.modals.notifyInvalidParents.show( {
                    'invalidatedParentActivities': self.invalidatedParentActivities,  //  ko observable array
                    'onDismiss': onInvalidParentsDismiss,                             //  raised when modal is closed
                    'navigateToActivity': function ( evt ) {
                        onInvalidParentsDismiss();
                        self.navigateToActivity( evt );
                    },
                    refreshCaseFolder: function() {
                        var
                            currentPatient = unwrap( self.currentPatient ),
                            caseFolders = currentPatient && currentPatient.caseFolderCollection;
                        caseFolders.load( {patientId: currentPatient._id()} );
                    }
                } );

                function onInvalidParentsDismiss() {
                    self.invalidParentModalVisible( false );
                    self.invalidatedParentActivities( [] );
                }
            }

            function hasInvalidParentActivity( activityId ) {
                var
                    plainAry = self.invalidatedParentActivities() || [],
                    i;

                for ( i = 0; i < plainAry.length; i++ ) {
                    if ( plainAry[i].activityId === activityId ) { return true; }
                }

                return false;
            }
            //  add socket event listener to show Sumex document
            Y.doccirrus.communication.on( {
                event: 'sumexPDFCreated',
                handlerId: 'caseFileSumexPDFCreatedListener',
                done: onSumexPDFCreated
            } );

            function onSumexPDFCreated( message ) {
                window.open( message.data[0].fullUrl, '_blank' );
                Y.fire( 'activityPDFChange', {} );
            }

            //  add socket event listener to show errors from Sumex
            Y.doccirrus.communication.on( {
                event: 'sumexError',
                handlerId: 'caseFileSumexErrorListener',
                done: onSumexError
            } );

            function onSumexError( message ) {
                var data = (message.data && message.data[0]) || {},
                    err = data.err,
                    errors = data.errors,
                    type = data.type || 'generation',
                    texts,
                    generationError_i18n = i18n('InvoiceMojit.sumex-api.errors.GENERATION_FAILED'),
                    validationError_i18n = i18n('InvoiceMojit.sumex-api.errors.VALIDATION_FAILED'),
                    errorHeadMessage = type === 'generation' ? generationError_i18n : validationError_i18n,
                    errorMessage = '<b>' + errorHeadMessage + '.</b></br></br>';

                if( Array.isArray( errors ) && errors.length ) {
                    texts = errors.map( function( e ) {
                        return e.text;
                    } );
                    errorMessage += texts.join( '</br>' );
                } else {
                    errorMessage += Y.doccirrus.errorTable.getMessage( err );
                }
                return Y.doccirrus.DCWindow.notice( {
                    title: i18n( 'DCWindow.notice.title.warn' ),
                    type: 'error',
                    message: errorMessage
                } );
            }

            //  add socket event listener for antivirus warnings
            Y.doccirrus.communication.on( {
                event: 'antivirusWarning',
                handlerId: 'caseFileAntivirusWarning',
                done: onAntivirusWarning
            } );

            function onAntivirusWarning( message ) {
                var data = (message.data && message.data[0]) || {};
                return Y.doccirrus.DCWindow.notice( {
                    title: i18n( 'InCaseMojit.casefile_attachments.text.AV_WARNING' ),
                    type: 'error',
                    message: '<pre>' + data + '</pre>' + i18n( 'InCaseMojit.casefile_attachments.text.AV_MESSAGE' )
                } );
            }
        },

        destroyWsListeners: function() {
            Y.doccirrus.communication.off( 'pubreceiptGenerated', 'caseFilePubreceiptListener' );
            Y.doccirrus.communication.off( 'linkedActivityUpdate', 'caseFileLinkedActivityUpdateListener' );
            Y.doccirrus.communication.off( 'parentActivityInvalid', 'caseFileParentActivityInvalidListener' );
            Y.doccirrus.communication.off( 'activityPrinted', 'activitiesTableActivityPrintedListener' );
            Y.doccirrus.communication.off( 'sumexError', 'caseFileSumexErrorListener');
            Y.doccirrus.communication.off( 'sumexPDFCreated', 'caseFileSumexPDFCreatedListener');
            Y.doccirrus.communication.off( 'TREATMENT_DIGNITIES_ERROR', '');
            Y.doccirrus.communication.releaseSubscription( {
                collection: 'patient',
                documentId: ko.unwrap( self.currentPatient()._id )
            } );
        },

        /**
         * The current view is displayed as full screen
         * @type {null|ko.observable}
         */
        isFullScreen: null,
        /** @protected */
        initToggleFullScreen: function() {
            const self = this;
            const isFrameView =  unwrap(self.isFrameView);
            let viewportIsWide = Y.doccirrus.utils.localValueGet( 'cal_viewportIsWide' );

            if( !viewportIsWide ) {
                Y.doccirrus.utils.localValueSet( 'cal_viewportIsWide', "true" );
                viewportIsWide = true;
            } else {
                viewportIsWide = viewportIsWide !== "false";
            }

            this.viewportIsWide = viewportIsWide;
            
            if (isFrameView) {
                viewportIsWide = isFrameView;
            }
            
            setViewportWide( viewportIsWide );
            
            self.isFullScreen = ko.observable( viewportIsWide );

            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

        },
        /**
         * Handler of the toggle full-screen action
         */
        toggleFullScreenHandler() {
            const viewportIsWide = Y.doccirrus.DCBinder.toggleFullScreen();

            this.isFullScreen( viewportIsWide );
        },
        /**
         *  @private
         */
        _setInitialData: function( ) {
            var
                self = this;

            InCaseMojitBinder.superclass._setInitialData.apply( self, arguments );
            self.updateActivityTypes();
        },
        /**
         * Rebuilds "activityTypes" based on "activitySettings"
         * @method updateActivityTypes
         */
        updateActivityTypes: function() {
            var
                self = this;
                self.setInitialData( 'activityTypes',  Y.doccirrus.utils.applySettingsToActivities( self.getInitialData( 'activitySettings' )) );

        },
        /**
         * @property currentView
         * @type {null|ko.observable(null|ViewModel)}
         */
        currentView: null,
        /**
         * @property currentPatient
         * @type {null|ko.observable(null|PatientModel)}
         */
        currentPatient: null,
        /**
         * @property currentActivity
         * @type {null|ko.observable(null|SimpleActivityModel)}
         */
        currentActivity: null,

        /**
         * Multiple child views use this flag to disable UI
         * @property pdfRenderInProgress
         * @type {null|ko.observable(null|Boolean)}
         */

        pdfRenderInProgress: null,

        /**
         * @property isFrameView
         * @type {boolean|ko.observable}
         * @default false
         */
        isFrameView: false,

        casefolderApiFn: Y.doccirrus.jsonrpc.api.casefolder,

        /**
         * Used to map tags in select2DocumentSearch
         * @method
         * @param {String} item
         * @returns {{id: {String}, text: {String}}}
         */
        select2TagMapper: function( item ) {
            return {
                id: item,
                text: item
            };
        },

        /** @protected */
        initObservables: function() {
            var
                self = this,
                currentView = ko.observable( null ),
                currentPatient = ko.observable( null ),
                currentActivity = ko.observable( null );

            self.isFrameView = ko.observable( Y.doccirrus.commonutils.isFrameView() );

            if ( unwrap(self.isFrameView) ) {
                self.initPostMessageListener();
                window.addEventListener('onkeydown', self.closeSolModalOnEsc);
            }

            self.currentView = ko.computed( {
                read: currentView,
                write: function( value ) {
                    if( value !== peek( currentView ) ) { // prevent change for same value
                        currentView( value );
                    }
                }
            } );
            self.currentPatient = ko.computed( {
                read: currentPatient,
                write: function( value ) {
                    var
                        currentPatientPeek = peek( currentPatient );

                    if( value !== currentPatientPeek ) { // prevent change for same value
                        if( currentPatientPeek ) {
                            currentPatientPeek.destroy();
                        }
                        currentPatient( value );
                    }
                }
            } );
            self.currentActivity = ko.computed( {
                read: currentActivity,
                write: function( value ) {
                    var
                        currentActivityPeek = peek( currentActivity );

                    if( value !== currentActivityPeek ) { // prevent change for same value
                        if( currentActivityPeek ) {
                            currentActivityPeek.destroy();
                        }
                        currentActivity( value );
                    }
                }
            } );

            self.route = ko.observable( null );

            self.documentSearch = ko.observable();
            self.ignoreIsOrdered = ko.observable(false);
            ko.computed( function() {
                var
                    documentSearch = unwrap( self.documentSearch ),
                    currentPatient = peek( self.currentPatient ),
                    params;

                if( documentSearch ) {
                    params = {
                        term: documentSearch,
                        locations: self.getInitialData( 'location' )
                    };
                    if( currentPatient  ) {
                        params.patientId = currentPatient._id();
                        params.patientNo = currentPatient.patientNo();
                        params.patientTitle = Y.doccirrus.utils.getPatientTitle( currentPatient );
                    }
                    Y.doccirrus.modals.navSearchModal.show( params )
                        .then( function() {
                            self.documentSearch( '' );
                        } );
                }
            } );

            /*
             ko.computed( function() {
             console.warn( 'CHANGED: route', self.route() );
             } );
             ko.computed( function() {
             console.warn( 'CHANGED: currentPatient', unwrap( self.currentPatient ) );
             } );
             ko.computed( function() {
             console.warn( 'CHANGED: currentActivity', unwrap( self.currentActivity ) );
             } );
             ko.computed( function() {
             var currentView = unwrap( self.currentView );
             console.warn( 'CHANGED: currentView', currentView && currentView.constructor.NAME, currentView );
             } );
             */
            self.initDocTreeCache();
            self.initPdfJobListeners();
            self.initRouteDependentHandling();
            self.initDocumentTitleHandling();
            self.initSelect2DocumentTag();
        },

        /**
         * Init PostMessage instance setting the iframeWindow (the one this PostMessageInstance will message to)
         * to the parent Window. This is to be used when InCase pages are served in a modal
         * with frameView mode
         */
        initPostMessageListener: function() {
            var
                self = this,
                rgx = /\/section.*/,
                url = window.location.href;

            self.iframeUrl = url.replace(rgx, '') || window.location.origin;

            self.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();

            self.PostMessageConnection
                .addListener(self.setPatientParameters.bind(self), 'SET_PRESET_PATIENT_PARAMETERS')
                .setIframeWindow(this.iframeUrl, window.parent);
        },

        closeSolModalOnEsc: function(evt) {
            var self = this;

            if (evt.key === "Escape" || evt.key === "Esc" || evt.keyCode === 27) {
                self.PostMessageConnection.postMessageToIframe({
                    action: 'CLOSE_MODAL',
                    isInsuitePage: true,
                    targetUrl: self.iframeUrl,
                    payload: {}
                });
            }
        },

        setPatientParameters: function(sourceEvent) {
            var
                self = this,
                currentPatient = peek( self.currentPatient ),
                data = currentPatient.get( 'data' );

            currentPatient.set( 'data', Object.assign({}, data, sourceEvent.data.payload.patientData) );
        },

        /**
         *  Keep lookups in the documentation tree, MOJ-8340
         *  prevent pauses / hammering the server when siwtching between text areas in masks
         *  see: ActivityDocTreeViewModel.client.js
         */
        initDocTreeCache: function() {
            var self = this;
            self.docTreeCache = {};
        },

        /**
         *  Keep track of PDF and print job status
         */

        pdfWindows: {},
        printWhenReady: [],

        initPdfJobListeners: function() {
            var
                self = this,
                currentActivity = self.currentActivity();

            self.pdfRenderInProgress = ko.observable( false );      //  deprecated
            self.blockPDFButtons = ko.observable( false );

            //  array of objects like { 'activityId': '123456778890', type: 'quickprint' }
            self.currentPdfJobs = ko.observableArray( [] );

            //  add socket listener for async PDFs
            Y.doccirrus.communication.on( {
                event: 'onPDFCreated',
                // note: specifying a socket here will cause this to fail after navigation,
                // socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var evt = message.data && message.data[0];

                    //  update any open window/tab waiting for this PDF
                    fillPdfWindow( evt );

                    //  recipients of this event must check that the currentActivity._id matches the event
                    Y.fire( 'asyncPDFGeneration', evt );
                },
                handlerId: 'inCaseMojit_onPDFCreated'
            } );

            Y.doccirrus.communication.on( {
                event: 'pdfRenderProgress',
                // note: specifying a socket here will cause this to fail after navigation,
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var evt = message.data && message.data[0];
                    Y.log( 'PDF render progress: ' + JSON.stringify( evt ), 'debug', NAME );

                    //  other components such as casefolder table listen for YUI events about PDF/print/transition
                    Y.fire( 'asyncPDFProgress', evt );

                    if ( !evt.mapId ) { return; }
                    if ( !hasJob( evt.mapId ) ) {
                        addJob( evt.mapId );
                    }

                    evt.progress = evt.progress || 0;

                    updateJob( evt.mapId, evt.progress );

                    if ( evt.label ) {
                        switch( evt.label ) {
                            case '<!- pdf error ->':     //  deliberate fallthrough
                            case '<!- pdf regenerated ->':
                            case '<!- pdf matched ->':
                            case '<!- pdf complete ->':
                                self.removeJob( evt.mapId );
                        }
                    }

                },
                handlerId: 'formPDFActionHandler'
            } );
            //pdfRenderProgress

            Y.doccirrus.communication.on( {
                event: 'asyncPDFPrinted',
                // note: specifying a socket here will cause this to fail after navigation,
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var evt = message.data && message.data[0];
                    Y.log( 'PDF render progress: ' + JSON.stringify( evt ), 'debug', NAME );

                    var
                        printMessageId = unwrap( evt.mediaId ) + '-' + Y.doccirrus.comctl.getRandId(),
                        printMessage = '' +
                            i18n( 'InCaseMojit.casefile_exports.print_modal.printed' ) + evt.msg + '<br/>' +
                            i18n( 'InCaseMojit.casefile_exports.print_modal.printer' ) + evt.printerName;

                    //  Display system message to the user
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: printMessageId,
                        content: printMessage,
                        level: 'SUCCESS'
                    } );

                    //  hide the message after a few seconds
                    window.setTimeout( function() { Y.doccirrus.DCSystemMessages.removeMessage( printMessageId ); }, Y.dcforms.PRINT_MSG_TIMEOUT );

                },
                handlerId: 'formPDFPrintHandler'
            } );

            function getJob( activityId ) {
                return self.getCurrentPdfJob( activityId );
            }

            function hasJob( activityId ) {
                if ( getJob( activityId ) ) { return true; }
                return false;
            }

            function updateJob( activityId, progress ) {
                var job = getJob( activityId );
                job.progress = progress;
            }

            function addJob( activityId ) {
                self.currentPdfJobs.push( {
                    'activityId': activityId,
                    'type': 'pdf',
                    'progress': 0
                } );
            }

            //  When a PDF is finished rendering, set it as the content of a tab opened eairlier
            //  Done this way to reduce problems with popup blockers

            function fillPdfWindow( evt ) {
                //  skip this if no window is waiting on a PDF for this activity
                if ( !evt.owner || !evt.owner._id || !evt.mediaId || !self.pdfWindows[ evt.owner._id ] ) { return; }

                var
                    mediaUrl = '/media/' + evt.mediaId + '_original.APPLICATION_PDF.pdf',
                    privateUrl = Y.doccirrus.infras.getPrivateURL( mediaUrl );

                self.pdfWindows[ evt.owner._id ].location = privateUrl;
                self.pdfWindows[ evt.owner._id ] = null;
                delete self.pdfWindows[ evt.owner._id ];
            }

            //  async generation on server may not be handled by activityHeadingButtons if user has navigated away
            //  (related to quickPrint functionality)
            Y.on( 'activityPDFChange', function( evt ) {
                var
                    previousJobs = self.currentPdfJobs(),
                    newJobs = [],
                    i;

                //  PDF is complete, remove from pending jobs
                if ( evt && evt.activity && evt.activity._id ) {
                    for ( i = 0; i < previousJobs.length; i++ ) {
                        if ( evt.activity._id !== previousJobs[i].activityId ) {
                            newJobs.push( previousJobs[i] );
                        }
                    }
                    self.currentPdfJobs( newJobs );
                }

                if( evt && evt.activity && currentActivity && evt.activity._id === unwrap( currentActivity._id ) ) {
                    self.pdfRenderInProgress( false );
                }
            } );

        },

        removeJob: function( activityId ) {
            var
                self = this,
                previousJobs = self.currentPdfJobs(),
                newJobs = [],
                i;

            for( i = 0; i < previousJobs.length; i++ ) {
                if( activityId !== previousJobs[i].activityId ) {
                    newJobs.push( previousJobs[i] );
                }
            }
            self.currentPdfJobs( newJobs );
        },

        getCurrentPdfJob: function( activityId ) {
            var
                self = this,
                currentJobs = self.currentPdfJobs(),
                i;

            for ( i = 0; i < currentJobs.length; i++ ) {
                if ( activityId === currentJobs[i].activityId ) {
                    return currentJobs[i];
                }
            }
            return null;
        },

        /**
         * initializes select2 for document search
         * @method initSelect2DocumentTag
         */
        initSelect2DocumentTag: function() {
            var
                self = this;

            self.openDocumentModalToolTip = ko.computed( function() {
                var
                    currentPatient = self.currentPatient();
                return currentPatient ? SHOW_ALL_DOCUMENTS_OF_CURRENT_PATIENT : SHOW_ALL_DOCUMENTS;
            });

            self.select2DocumentSearch = {
                data: ko.computed( {
                    read: function() {
                        var
                            tags = unwrap( self.documentSearch );
                        if( tags ) {
                            return { id: tags, text: tags };
                        } else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        self.documentSearch( $event.val );

                    }
                } ),
                placeholder: ko.observable( SEARCH_BAR ),
                select2: {
                    allowClear: true,
                    minimumInputLength: 1,
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.tag.read( {
                            query: {
                                type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                                title: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            },
                            options: {
                                itemsPerPage: 15
                            },
                            fields: ['title']
                        } ).done( function( response ) {
                            var data = response && response.data || [];
                            query.callback( {
                                results: data.map( function( item ) {
                                    return self.select2TagMapper( item.title );
                                } )
                            } );
                        } );

                    }

                }
            };
        },
        initRouteDependentHandling: function() {
            var
                self = this;

            self.route.subscribe( function( route ) {

                if( 'activity' !== route.route.routeId ) {
                    // unset activity on any route that is not "activity"
                    self.currentActivity( null );
                }
            } );

        },
        initDocumentTitleHandling: function() {
            var
                self = this,
                defaultTitle = Y.doccirrus.i18n( 'top_menu.LBL_MENU_PATIENTS' ),
                router = self.get( 'router' );

            ko.computed( function() {
                var
                    currentView = unwrap( self.currentView ),
                    currentPatient = peek( self.currentPatient );

                ignoreDependencies( function() {

                    if( !currentView ) {
                        document.title = defaultTitle;
                        return;
                    }

                    if( currentPatient ) {
                        switch( currentView.constructor.NAME ) {
                            case 'CaseFileViewModel':
                            case 'PatientDetailViewModel':
                                document.title = peek( currentPatient.lastname ) + ', ' + peek( currentPatient.firstname );
                                return;
                        }
                    }

                    document.title = defaultTitle;
                    router.setTitle( window.location );
                } );

            } ).extend( { rateLimit: 0 } );
        },
        setupNavigation: function() {
            var
                self = this,
                navigation = self.get( 'navigation' ),
                navItems = Y.doccirrus.ItemsTabFactory.createInCaseNavItems( {
                    rootPath: Y.doccirrus.utils.getUrl( 'inCaseMojit' )
                } );

            navItems.splice( 1, 0, {
                    text: i18n( 'InCaseMojit.casefile_navJS.menu.FILE' ),
                    name: 'tab_caseFile',
                    visible: ko.pureComputed( function() {
                        var
                            visible = false,
                            currentPatient = unwrap( self.currentPatient );

                        if( currentPatient && !currentPatient.isNew() ) {
                            visible = true;
                        }

                        return visible;
                    } ),
                    href: ko.pureComputed( function() {
                        var
                            href = null,
                            currentPatient = unwrap( self.currentPatient ),
                            patientId = unwrap( currentPatient && currentPatient._id );

                        if( currentPatient && !currentPatient.isNew() ) {
                            href = '#/patient/' + patientId + '/tab/casefile_browser';
                        }

                        return href;
                    } )
                },
                {
                    text: i18n( 'InCaseMojit.casefile_navJS.menu.DATA' ),
                    name: 'tab_patientDetail',
                    visible: ko.pureComputed( function() {

                        var
                            visible = false,
                            currentPatient = unwrap( self.currentPatient );

                        if( currentPatient ) {
                            visible = true;
                        }

                        return visible;
                    } ),
                    href: ko.pureComputed( function() {
                        var
                            href = null,
                            currentPatient = unwrap( self.currentPatient ),
                            patientId = unwrap( currentPatient && currentPatient._id );

                        if( currentPatient ) {
                            if( currentPatient.isNew() ) {
                                href = '#/patient/new/tab/patient_detail';
                            }
                            else {
                                href = '#/patient/' + patientId + '/tab/patient_detail';
                            }
                        }
                        return href;
                    } ),
                    hasDanger: ko.pureComputed( function() {
                        var currentPatient = unwrap( self.currentPatient ),
                            isValid = currentPatient ? currentPatient.isValid() : true;
                        return !isValid;
                    } )
                }
            );

            navigation.addItems( navItems );

            //  dispose and clean up old viewModels when tabbing away from them

            navigation.cleanupOldTabs = navigation.activeTab.subscribe( function( selectedNavItem ) {
                var
                    activeTabName = selectedNavItem && selectedNavItem.name ? selectedNavItem.name() : '';

                if ( self.openReportsViewModel && 'tab_reports' !== activeTabName ) {
                    Y.log( 'Cleaning up reporting viewmodels.', 'debug', NAME );
                    self.openReportsViewModel.destroy();
                    self.openReportsViewModel = null;
                }
            } );

        },
        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' ),
                items;

            router.set( 'root', Y.doccirrus.utils.getUrl( 'inCaseMojit' ) );
            items = [
                {
                    routeId: 'patientbrowser',
                    path: '/',
                    callbacks: Y.bind( self.route_patientbrowser, self )
                },
                {
                    routeId: 'patientbrowser',
                    path: '/patientbrowser',
                    callbacks: Y.bind( self.route_patientbrowser, self )
                },
                {
                    routeId: 'patient',
                    path: /^\/patient($|\/.*$)/,
                    callbacks: [
                        router.resolvePathAsKeyValue,
                        Y.bind( self.routeResolve_patient, self ),
                        Y.bind( self.route_patient, self )
                    ]
                },
                {
                    routeId: 'activity',
                    path: /^\/activity($|\/.*$)/,
                    callbacks: [
                        router.resolvePathAsKeyValue,
                        Y.bind( self.routeResolve_activity, self ),
                        Y.bind( self.route_activity, self )
                    ]
                },
                {
                    routeId: 'reports',
                    path: '/reports',
                    callbacks: Y.bind( self.route_reports, self )
                },
                {
                    routeId: 'withoutcardread',
                    path: '/withoutcardread',
                    callbacks: Y.bind( self.route_withoutcardread, self )
                },
                {
                    routeId: 'apkinprogress',
                    path: '/apkinprogress',
                    callbacks: Y.bind( self.route_apkinprogress, self )
                }
            ];
            if( Y.doccirrus.auth.hasTelematikServices('KIM') ) {
                items.push( {
                    routeId: 'kim',
                    path: '/kim',
                    callbacks: Y.bind( self.route_kim, self )
                } );
            }

            router.set( 'routes',  items);

            /** specific routing for occurred events **/

            self.refreshEvent = Y.doccirrus.communication.on( {
                event: "refreshCaseFolder",
                handlerId: 'refreshCasefolderById',
                done: function( message ) {
                    var
                        currentPatient = unwrap( self.currentPatient ),
                        caseFolders = currentPatient && currentPatient.caseFolderCollection,
                        activeTab = caseFolders && caseFolders.getActiveTab(),
                        toCaseFolderId = message && message.data && message.data[0] && message.data[0].caseFolderId,
                        currentCaseFolderId = activeTab && activeTab._id && activeTab._id.toString();

                    if( toCaseFolderId === currentCaseFolderId ) {
                        caseFolders.load( { patientId: currentPatient._id() } ).then( function() {
                        } );
                    }
                }
            } );

            self.refreshEvent = Y.doccirrus.communication.on( {
                event: "errorNotification",
                handlerId: 'errorNotificationEventId',
                done: function( event ) {
                    var
                        SCHEIN_ERROR = i18n( 'InCaseMojit.change_activity_modal_clientJS.text.SCHEIN_ERROR' ),
                        error = event && event.data && event.data[0] && event.data[0].error,
                        message = '';

                    if( 18002 === error.code ) {
                        message = SCHEIN_ERROR;
                    } else {
                        message = Y.doccirrus.errorTable.getMessage( error );
                    }
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: message,
                        window: { width: 'medium' }
                    } );
                }
            } );

            Y.on( 'activityTransitioned', function( activityTransitioned ) {
                var
                    currentPatient,
                    caseFolders,
                    activeTab,
                    quotationCaseFolder,
                    goToQuotationCaseFolder;

                function doDefault() {
                    if( !Y.doccirrus.schemas.activity.hasForm( activityTransitioned.data.actType ) && !activityTransitioned.skipRedirectBack ) {
                        self.navigateToCaseFileBrowser( activityTransitioned );
                    }
                    if( activityTransitioned.forceRedirectBack ) {
                        self.navigateToCaseFileBrowser( activityTransitioned );
                    }
                }

                switch( activityTransitioned.data.status ) {
                    case 'DELETED':
                        self.navigateToCaseFileBrowser();
                        break;
                }

                switch( activityTransitioned.data.actType ) {
                    case 'QUOTATION':
                        currentPatient = unwrap( self.currentPatient );
                        caseFolders = currentPatient.caseFolderCollection;
                        activeTab = caseFolders.getActiveTab();
                        quotationCaseFolder = caseFolders.getLastOfAdditionalType( 'QUOTATION' );
                        goToQuotationCaseFolder = 'QUOTATION' === peek( activityTransitioned.data.actType ) && activityTransitioned.isNew && !(activeTab && 'QUOTATION' === activeTab.additionalType);

                        if( goToQuotationCaseFolder ) {
                            if( !quotationCaseFolder ) {
                                caseFolders.load( { patientId: peek( activityTransitioned.data.patientId ) } )
                                    .then( function() {
                                        self.navigateToCaseFolder( {
                                            caseFolderId: caseFolders.getLastOfAdditionalType( 'QUOTATION' )._id
                                        } );
                                    } );
                            } else {
                                self.navigateToCaseFolder( {
                                    caseFolderId: quotationCaseFolder._id
                                } );
                            }
                        } else {
                            doDefault();
                        }
                        break;

                    case 'MEDICATION':
                        //  atypical behvior for medications with forms, MOJ-11250
                        self.navigateToCaseFileBrowser( activityTransitioned );
                        break;

                    case 'LABDATA':
                        //  skip automatic redirect back to casefolder, prevents race with saving labdata PDF / images
                        activityTransitioned.skipRedirectBack = true;
                        break;

                    case 'PROCESS':
                        if ( peek(self.isFrameView)  ) {
                            self.navigateToCaseFileBrowser( activityTransitioned );
                        }
                        break;
                    case 'MEDDATA':
                        if ( activityTransitioned.transitionDescription.transition === 'create' ) {
                            self.navigateToCaseFileBrowser( activityTransitioned );
                        }
                        break;

                    default:
                        doDefault();
                }
            } );

        },
        /**
         * Get "quotationTreatments".
         * @returns {null|QuotationTreatmentsHandler}
         */
        getQuotationTreatments: function() {
            var
                activityDetailsViewModel = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                quotationTreatments = activityDetailsViewModel && activityDetailsViewModel.get( 'quotationTreatments' ) || null;

            return quotationTreatments;
        },
        /**
         * Checks for "quotationTreatments".
         * @returns {boolean}
         */
        hasQuotationTreatments: function() {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                hasQuotationTreatments = Boolean( quotationTreatments );

            return hasQuotationTreatments;
        },
        /**
         * Checks for "quotationTreatments" and if available considers the modifications of.
         * @returns {boolean}
         */
        quotationTreatmentsHasModifications: function() {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                quotationTreatmentsHasModifications = Boolean( quotationTreatments && quotationTreatments.hasModifications() );

            return quotationTreatmentsHasModifications;
        },
        /**
         * Returns a Promise that will provide a PatientModel for patientId, could be the currentPatient if patientId matches
         * @method getPatientModelForPatientId
         * @param {String} patientId
         * @returns {Promise}
         */
        getPatientModelForPatientId: function( patientId ) {
            var
                self = this,
                currentPatient = peek( self.currentPatient );

            if( currentPatient && ( peek( currentPatient._id ) === patientId) ) {
                return Promise.resolve( currentPatient );
            }

            return PatientModel
                .createModelFromPatientId( patientId )
                .catch( catchUnhandled );
        },
        /**
         * Returns a Promise that will provide an ActivityModel, could be the currentActivity if computed same
         * - accepts an activity or its id as first argument
         * @method getActivityModelOf
         * @param {String|Object|SimpleActivityModel} firstArgument
         * @returns {Promise}
         */
        getActivityModelOf: function( firstArgument ) {

            var
                self = this,
                firstArgumentIsString = Y.Lang.isString( firstArgument ),
                activityId = firstArgumentIsString ? firstArgument : peek( firstArgument._id ),
                actType = firstArgument && firstArgument.activity && peek( firstArgument.activity.actType ),
                currentActivity = peek( self.currentActivity );

            /**
             * reuse currentActivity model if:
             * 1. CurrentActivity exists
             * 2. User is trying to open the same existing activity. Marker - passed _id === currentActivity._id
             * 3. User switched tab(activity section). Marker - There is no new actType
             * 4. User is trying to create new activity, when the same new activity(actType the same) is already opened.
             *  Marker - no '_id' but passed actType === currentActivity.actType
             */
            if( currentActivity && ( peek( currentActivity._id ) === activityId) && (activityId || !actType || (peek( currentActivity.actType ) === actType) ) ) {
                return Promise.resolve( currentActivity );
            }

            return ActivityModel
                .createModelFrom( firstArgument )
                .catch( function( err ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );
        },

        /**
         * Get the current set patients _id (subscribeable)
         * @returns {String|undefined}
         */
        getCurrentPatientId: function() {
            var
                self = this,
                currentPatientId = unwrap( self.currentPatient );

            currentPatientId = currentPatientId && unwrap( currentPatientId._id );

            return currentPatientId || undefined;
        },
        /**
         * Note: this is called indirectly, through the ActivityDetailsViewModel, to allow attachments to be saved
         * for server-side FSM prior to transition
         *
         * @method transitionCurrentActivity
         * @param {Object} parameters
         * @returns {Promise}
         */
        transitionCurrentActivity: function( parameters ) {
            var
                self = this,
                currentActivity = peek( self.currentActivity ),
                transitionDescription = parameters.transitionDescription,
                reloadTable = parameters.reloadTable,
                skipRedirectBack = parameters.skipRedirectBack,
                isNew = currentActivity.isNew();

            if( !(currentActivity && transitionDescription) ) {
                return Promise.reject( 'transitionCurrentActivity: invalid parameters' );
            }

            return currentActivity.transitionActivity( {
                transitionDescription: transitionDescription,
                documents: parameters.documents || [],
                printPdf: parameters.printPdf || null,
                printCopies: parameters.printCopies || 0,
                recreatePdf: parameters.recreatePdf || false
            } )
                .then( function( activity ) {
                    return self.afterActivityTransition( {
                        reloadTable: reloadTable,
                        activity: activity,
                        skipRedirectBack: skipRedirectBack,
                        transitionDescription: transitionDescription,
                        currentActivity: currentActivity,
                        isNew: isNew
                    } );
                } )
                .catch( function( err ) {
                    currentActivity.inTransition( false );
                    Y.log( 'Error during transition: ' + JSON.stringify( err ), 'warn', NAME );
                    return Promise.reject( err );
                } );
        },
        afterActivityTransition: function( params ) {
            var
                activity = params.activity,
                transitionDescription = params.transitionDescription,
                skipRedirectBack = params.skipRedirectBack,
                currentActivity = params.currentActivity,
                reloadTable = params.reloadTable,
                isNew = params.isNew;
            //  inTransition property prevents spurious action by the mappers due to .set updating things
            currentActivity.inTransition( true );

            if( !activity ) {
                return Promise.reject( 'copyCurrentActivity: invalid parameters' );
            }

            if( isNew ) {
                //  we now have an _id for this activity, add it to hash fragment in URL
                if( activity._id ) {
                    window.location.hash = window.location.hash.replace( '/new/', '/' + activity._id + '/' );
                }
            }

            currentActivity.set( 'data', activity );

            currentActivity.inTransition( false );
            currentActivity.setNotModified();

            Y.fire( 'documentsAllSaved', {} );

            Y.fire( 'activityTransitioned', {
                reloadTable: reloadTable,
                model: currentActivity,
                data: activity,
                transitionDescription: transitionDescription,
                isNew: isNew,
                skipRedirectBack: skipRedirectBack
            } );
            return activity;

        },
        /**
         * @method copyCurrentActivity
         * @returns {Promise}
         */
        copyCurrentActivity: function() {
            var
                self = this,
                currentActivity = peek( self.currentActivity );

            if( !currentActivity ) {
                return Promise.reject( 'copyCurrentActivity: invalid parameters' );
            }

            return currentActivity
                .copyActivity()
                .then( function( activity ) {
                    Y.fire( 'activityCopied', {
                        data: activity
                    } );
                    return activity;
                } )
                .catch( catchUnhandled );
        },
        /**
         * @method navigateToRoot
         */
        navigateToRoot: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/' );
        },
        /**
         * @method navigateToPatientBrowser
         */
        navigateToPatientBrowser: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/patientbrowser' );
        },
        /**
         * @method navigateToCaseFileBrowser
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId=currentPatient._id]
         * @param {Boolean} [parameters.refreshCaseFolder]
         */
        navigateToCaseFileBrowser: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                currentActivity = peek( self.currentActivity ),
                patientId = parameters.patientId || self.getCurrentPatientId(),
                refreshCaseFolder = parameters.refreshCaseFolder || false,
                currentPatient;

            if( patientId ){
                Y.doccirrus.jsonrpc.api.rule.triggerRuleEngineOnCaseOpenIPC( {
                     query: {
                         patientId: patientId
                     }
                } );
            }

            function navigationAction() {
                var activitiesCreated;

                if ( unwrap(self.isFrameView) ) {
                    if ( Array.isArray(self.frameViewModeActivitesCreated) ) {
                        activitiesCreated = self.frameViewModeActivitesCreated;
                    } else {
                        activitiesCreated = [];
                    }

                    activitiesCreated.push({
                        _id: peek(currentActivity._id),
                        actType: peek(currentActivity.actType)
                    });

                    self.PostMessageConnection.postMessageToIframe({
                        action: 'DATA_TO_SAVE',
                        isInsuitePage: true,
                        targetUrl: self.iframeUrl,
                        payload: {
                            activities: activitiesCreated
                        }
                    });
                } else {
                    self
                        .get( 'router' )
                        .save( '/patient/' + patientId + '/tab/casefile_browser' );
                }
            }

            if( refreshCaseFolder ) {

                currentPatient = peek( self.currentPatient );

                if( currentPatient && ( peek( currentPatient._id ) === patientId) ) {
                    currentPatient.caseFolderCollection.load( { patientId: peek( patientId ) } )
                        .then( function() {
                            navigationAction();
                        } );
                }
            } else {
                navigationAction();
            }
        },
        /**
         * @method navigateToCaseFolder
         * @param {Object} parameters
         * @param {String} [parameters.patientId]
         * @param {String} [parameters.caseFolderId='all']
         */
        navigateToCaseFolder: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                patientId = parameters.patientId || self.getCurrentPatientId(),
                caseFolderId = parameters.caseFolderId || 'all';

            self
                .get( 'router' )
                .save( '/patient/' + patientId + '/tab/casefile_browser/casefolder/' + caseFolderId );
        },
        /**
         * @method navigateToPatientDetail
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         */
        navigateToPatientDetail: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),
                updatePatientConfig = parameters.updatePatientConfig,
                patientId;

            if( updatePatientConfig ) {
                patientId = updatePatientConfig.data._id;
                self.set( 'updatePatientConfig', updatePatientConfig );
            } else {
                patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId();
            }

            router.save( '/patient/' + patientId + '/tab/patient_detail' );

        },
        /**
         * @method navigateToPatientCostCarriers
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         */
        navigateToPatientCostCarriers: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),
                patientId;

            patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId();

            router.save( '/patient/' + patientId + '/section/insurance' );

        },
        /**
         * @method navigateToNewPatient
         * @param {Object} [parameters]
         * @param {Object} [parameters.newPatientConfig]
         */
        navigateToNewPatient: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' );

            self
                .isNavigateToNewPatientAllowed( parameters )
                .then( function() {
                    var
                        newPatientConfig = null;

                    if( parameters.newPatientConfig ) {
                        newPatientConfig = parameters.newPatientConfig;
                    }

                    self.set( 'newPatientConfig', newPatientConfig );
                    router.save( '/patient/new/tab/patient_detail' );
                } );

        },
        /**
         * @method isNavigateToNewPatientAllowed
         * @returns {Promise}
         */
        isNavigateToNewPatientAllowed: function( /*parameters*/ ) {
            return Promise.resolve( null );
        },
        /**
         * @method navigateToActivity
         * @param {Object} [parameters]
         * @param {String} parameters.activityId
         */
        navigateToActivity: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),

                activityId = parameters.activityId;

            router.save( '/activity/' + activityId );

        },
        /**
         * @method navigateToNewActivity
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         * @param {String} [parameters.type]
         * @param {Object} [parameters.newActivityConfig]
         */
        navigateToNewActivity: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),
                currentActivity = peek( self.currentActivity ),
                patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId(),
                type = parameters.type,
                localStorageData = Y.doccirrus.utils.localValueGet( 'activityOpenTab' ),
                tableFormPostFix = '',
                activityCreated;

            if( localStorageData ) {
                localStorageData = JSON.parse( localStorageData );
            }

            if( 'tableform' === localStorageData[type] ) {
                tableFormPostFix = '/section/tableform';
            }

            if ( unwrap(self.isFrameView) ) {
                activityCreated = {
                    _id: peek(currentActivity._id),
                    actType: peek(currentActivity.actType)
                };

                if ( Array.isArray(self.frameViewModeActivitesCreated) ) {
                    self.frameViewModeActivitesCreated.push( activityCreated );
                } else {
                    self.frameViewModeActivitesCreated = [ activityCreated ];
                }
            }

            self
                .isNavigateToNewActivityAllowed( parameters )
                .then( function() {
                    var
                        newActivityConfig = null;

                    if( parameters.newActivityConfig ) {
                        newActivityConfig = parameters.newActivityConfig;
                    }

                    self.set( 'newActivityConfig', newActivityConfig );
                    self.set( 'isAboutToNavigateToNewActivity', true );

                    if( type ) {
                        router.save( '/activity/new/type/' + type + '/patient/' + patientId + tableFormPostFix );
                    }
                    else {
                        router.save( '/activity/new/patient/' + patientId + tableFormPostFix );
                    }

                    self.set( 'isAboutToNavigateToNewActivity', false );
                } );

        },
        /**
         * @method isNavigateToNewActivityAllowed
         * @param {Object} parameters
         * @param {String} parameters.patientId
         * @param {String} [parameters.type]
         * @returns {Promise}
         */
        isNavigateToNewActivityAllowed: function( parameters ) {

            return new Promise( function( resolve, reject ) {
                var
                    patientId = parameters.patientId/*,
                     type = parameters.type*/;

                if( !patientId ) {
                    reject( 'no patientId' );
                    return;
                }

                resolve();

            } );
        },
        /**
         * @method navigateToCalendar
         */
        navigateToCalendar: function() {
            var
                currentPatient = peek( this.currentPatient );

            if( currentPatient ) {
                Y.doccirrus.utils.sessionValueSet( 'loadEvent', {
                    action: 'createEvent',
                    patientId: peek( currentPatient._id )
                } );
            }
            window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
        },
        /**
         * @protected
         * @method route_patientbrowser
         * @param {Object} request
         * @param {String} request.params
         * @param {Object} request.route
         * --param {Object} response
         * --param {Function} next
         * @returns {void}
         */
        route_patientbrowser: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templatePatientBrowserViewModel: self.useTemplate( {
                        name: 'PatientBrowserViewModel',
                        path: 'InCaseMojit/views/PatientBrowserViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aPatientBrowserViewModel;

                    self.route( request );

                    //  clearing the current patient is the trigger to dispose viewmodels, etc on the previous tab
                    Y.log( 'Clearing current patent for navigation.', 'info', NAME );
                    self.currentPatient( null );

                    if( TAB_PATIENT_BROWSER !== peek( activeTab && activeTab.name ) ) {

                        document.title = i18n( 'general.PAGE_TITLE.PATIENTS' );

                        self.get( 'router' ).setTitle( window.location );

                        aPatientBrowserViewModel = KoViewModel.getViewModel( 'PatientBrowserViewModel' );

                        if( !aPatientBrowserViewModel ) {
                            Y.doccirrus.jsonrpc.api.sdManager.getDeviceServerVersion()
                                .done( function( res ) {
                                    aPatientBrowserViewModel =  KoViewModel.getViewModel( 'PatientBrowserViewModel' ) || new PatientBrowserViewModel( {deviceServerVersion: res.data.deviceServerVersion} );
                                    self.currentView( aPatientBrowserViewModel );
                                    self.get( 'navigation' ).activateTab( TAB_PATIENT_BROWSER );
                                } )
                                .fail( function() {
                                    aPatientBrowserViewModel = KoViewModel.getViewModel( 'PatientBrowserViewModel' ) || new PatientBrowserViewModel( {deviceServerVersion: ''} );
                                    self.currentView( aPatientBrowserViewModel );
                                    self.get( 'navigation' ).activateTab( TAB_PATIENT_BROWSER );
                                } );
                        } else {
                            self.currentView( aPatientBrowserViewModel );
                            self.get( 'navigation' ).activateTab( TAB_PATIENT_BROWSER );
                        }
                    }

                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /**
         * Helper for building patient route params
         * @protected
         * @param   {Object}    request     HTTP/routing request
         * @param   {Object}    response    HTTP/routing response
         * @param   {Function}  next        Call next routing handler
         */
        routeResolve_patient: function( request, response, next ) {
            var
                params = request.params;

            // remap path keys
            request.params = {
                patientId: params.patient, // id
                patientTab: params.tab,
                sectionTab: params.section,
                insuranceId: params.insurance, // iid
                caseFolder: params.casefolder,
                actionType: params.actionType
            };

            if( !request.params.patientTab ) {
                request.params.patientTab = 'patient_detail';
            }

            next();
        },
        /**
         * @protected
         * @method route_patient
         * @param {Object} request
         * @param {String} request.params
         * @param {String} request.params.patientTab
         * @param {String} request.params.patientId
         * @param {String} [request.params.sectionTab]
         * @param {String} [request.params.insuranceId]
         * @param {String} [request.params.caseFolder]
         * @param {Object} request.route
         * --param {Object} response
         * --param {Function} next
         * @returns {void}
         */
        route_patient: function( request/*, response, next*/ ) {
            var
                self = this,
                parameters = request.params,
                patientTab = parameters.patientTab,
                patientId = parameters.patientId,

                isNewPatient = 'new' === patientId,

                navigation = self.get( 'navigation' ),
                activeTab = peek( navigation.activeTab );

            if( !patientId ) {
                self.navigateToRoot();
                return;
            }

        // MOJ-10530: Set-up subscription to update currentPatient on DB change of latestMedData field. ----------------
        // This only concerns the 'latestMedData' field currently.
            // Avoid duplicate subscriptions:
            Y.doccirrus.communication.releaseSubscription( {
                collection: 'patient',
                documentId: patientId
            } );
            // Subscribe to patient:
            Y.doccirrus.communication.subscribeCollectionId( {
                collection: 'patient',
                documentId: patientId,
                callback: function( data ) {
                    self.getPatientModelForPatientId( patientId )
                        .then( function( model ) {
                            model.updateBoilerplate( data, ['latestMedData'] );
                            //  pregnancy casefolder may have been closed by MEDDATA update
                            self.currentPatient().caseFolderCollection.load( {
                                'patientId': ko.unwrap( self.currentPatient()._id )
                            } );
                        } );
                }
            } );

            self.showLoadingMask();

            Promise
                .props( {
                    /** ensure template is available **/
                    templateCaseFileViewModelPromise: self.useTemplate( {
                        name: 'CaseFileViewModel',
                        path: 'InCaseMojit/views/CaseFileViewModel'
                    } ),
                    /** ensure template is available **/
                    templatePatientDetailViewModelPromise: self.useTemplate( {
                        name: 'PatientDetailViewModel',
                        path: 'InCaseMojit/views/PatientDetailViewModel'
                    } )
                } )
                .then( function( /*props*/ ) {
                    var
                        promise,
                        updatePatientConfig = self.get( 'updatePatientConfig' );

                    self.route( request );

                    if( updatePatientConfig ) {
                        promise = self.getPatientModelForPatientId( patientId )
                            .then( function( model ) {
                                Y.each( updatePatientConfig, function( item, key ) {
                                    if( 'data' !== key ) {
                                        model.set( key, item );
                                    }
                                } );
                                if( Y.Lang.isObject( updatePatientConfig.data ) ) {
                                    model.updateBoilerplate( updatePatientConfig.data );
                                }
                                return model;
                            } );
                    } else if( isNewPatient ) {
                        // currently for a new patient and there is a currentPatient which is new it is assumed they are the same
                        if( unwrap( self.currentPatient ) && unwrap( self.currentPatient ).isNew() ) {
                            promise = Promise.resolve( unwrap( self.currentPatient ) );
                        }
                        else {
                            promise = Promise.resolve( new PatientModel( (self.get( 'newPatientConfig' ) || {}) ) );
                        }
                    }
                    else {
                        promise = self.getPatientModelForPatientId( patientId );
                    }

                    self.set( 'newPatientConfig', null );
                    self.set( 'updatePatientConfig', null );

                    /** set current patient **/
                    return promise
                        .then( function( model ) {
                            self.currentPatient( model );
                        } );

                } )
                .then( function() {
                    var
                        aCaseFileViewModel,
                        aPatientDetailViewModel;

                    switch( patientTab ) {
                        case 'casefile_browser':

                            if( TAB_CASE_FILE !== peek( activeTab && activeTab.name ) ) {

                                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' );
                                if( !aCaseFileViewModel ) {
                                    aCaseFileViewModel = new CaseFileViewModel();
                                    aCaseFileViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                        aCaseFileViewModel.destroy();
                                    } ) );
                                }

                                self.currentView( aCaseFileViewModel );
                                self.get( 'navigation' ).activateTab( TAB_CASE_FILE );
                            }
                            break;
                        case 'patient_detail':

                            if( TAB_PATIENT_DETAIL !== peek( activeTab && activeTab.name ) ) {

                                aPatientDetailViewModel = KoViewModel.getViewModel( 'PatientDetailViewModel' );

                                if( !aPatientDetailViewModel ) {
                                    aPatientDetailViewModel = new PatientDetailViewModel();
                                    aPatientDetailViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                        aPatientDetailViewModel.destroy();
                                    } ) );
                                }

                                self.currentView( aPatientDetailViewModel );
                                self.get( 'navigation' ).activateTab( TAB_PATIENT_DETAIL );
                            }
                            break;
                    }

                } )
                .then(function(  ) {
                    if (parameters.actionType) {
                        Y.doccirrus.inCaseUtils.createActivity( { actType: parameters.actionType } );
                    }
                })
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        },
        /**
         * Helper for building routes available params
         * @param   {Object}    request     HTTP/routing request
         * @param   {Object}    response    HTTP/routing response
         * @param   {Function}  next        Call next routing handler
         * @protected
         */
        routeResolve_activity: function( request, response, next ) {
            var
                params = request.params;
            // remap path keys
            request.params = {
                activityId: params.activity,
                patientId: params.patient,
                activityType: params.type,
                sectionTab: params.section,
                caseFolder: params.casefolder
            };

            next();
        },
        /**
         * @protected
         * @method route_patient
         * @param {Object} request
         * @param {String} request.params
         * @param {String} request.params.activityId
         * @param {String} [request.params.patientId]
         * @param {String} [request.params.activityType]
         * @param {String} [request.params.sectionTab]
         * @param {Object} request.route
         * --param {Object} response
         * --param {Function} next
         * @returns {void}
         */
        route_activity: function( request/*, response, next*/ ) {
            var
                self = this,
                parameters = request.params,
                activityId = parameters.activityId,
                patientId = parameters.patientId || self.getCurrentPatientId(),
                activityType = parameters.activityType,
                caseFolderId = parameters.caseFolder,

                isNewActivity = 'new' === activityId,

                navigation = self.get( 'navigation' ),
                activeTab = peek( navigation.activeTab ),
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' );

            if( !activityId || isNewActivity && !patientId ) {
                self.navigateToRoot();
                return;
            }

            Promise
                .props( new Promise( function( propsResolve/*, propsReject*/ ) {
                    var
                        /** common properties **/
                        props = {
                            /** ensure template is available **/
                            templateCaseFileViewModel: self.useTemplate( {
                                name: 'CaseFileViewModel',
                                path: 'InCaseMojit/views/CaseFileViewModel'
                            } )
                        },
                        newActivityConfig = self.get( 'newActivityConfig' );
                    self.set( 'newActivityConfig', null );
                    /** handle dependent properties **/
                    if( isNewActivity ) {

                        //  new activity will have no existing documents to load
                        props.patient = self.getPatientModelForPatientId( patientId );
                        props.activity = props.patient
                            .then( function( patient ) {
                                var
                                    patientData = patient.toJSON(),
                                    currentUser = self.getInitialData( 'currentUser' ),
                                    caseFolderActive = patient.caseFolderCollection.getActiveTab(),
                                    caseFolderId = caseFolderActive && caseFolderActive._id || undefined;
                                if( newActivityConfig && newActivityConfig.caseFolderId && caseFolderId !== newActivityConfig.caseFolderId ){
                                    caseFolderActive = patient.caseFolderCollection.getTabById( newActivityConfig.caseFolderId );
                                } else if( !caseFolderId ) {
                                    caseFolderActive = patient.caseFolderCollection.getTabById( patientData.activeCaseFolderId );
                                }

                                return Y.doccirrus.api.activity
                                    .createActivity( {
                                        patient: patientData,
                                        currentUser: currentUser,
                                        caseFolder: caseFolderActive,
                                        activity: (function() {
                                            var
                                                activity = {};

                                            if( activityType ) {
                                                activity.actType = activityType;
                                            }

                                            return activity;
                                        })()
                                    } ).then( function( activity ) {
                                        var
                                            activityData = {
                                                activity: Y.merge( activity, newActivityConfig ),
                                                additionalActivityData: {
                                                    caseFolder: caseFolderActive
                                                }
                                            };

                                        return activityData;
                                    } );
                            } )
                            .then( function( activityData ) {
                                return self.getActivityModelOf( activityData );
                            } )
                            .catch( catchUnhandled );

                        props.activitySettings = new Promise( function( resolve, reject ) {
                                Y.doccirrus.jsonrpc.api.activitysettings
                                    .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } )
                                    .done( function( response ) {
                                        resolve( Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [] );
                                    } )
                                    .fail( function( error ) {
                                        reject( error );
                                    } );
                            })
                            .catch( catchUnhandled );
                    }
                    else {
                        // not a new activity
                        props.activity = self.getActivityModelOf( activityId ).catch( catchUnhandled );

                        // handle not given patient id (read from activity)
                        if( !patientId ) {
                            props.patient = props.activity
                                .then( function( activityModel ) {
                                    return activityModel && self.getPatientModelForPatientId( peek( activityModel.patientId ) );
                                } )
                                .catch( catchUnhandled );
                        }
                        else {
                            props.patient = self.getPatientModelForPatientId( patientId );
                        }

                    }

                    propsResolve( props );

                } ) )
                /**
                 * Checks is there is a Schein
                 */
                .then( function( props ) {
                    var
                        activity = props.activity,
                        actType = activity && peek( activity.actType ),
                        lastSchein = activity && activity.get( 'lastSchein' ),
                        isNew = activity && activity.isNew(),
                        isScheinActType = Y.doccirrus.schemas.activity.isScheinActType( actType ),
                        activityDate = activity && moment( peek( activity.timestamp ) ),
                        caseFolderActive = activity && activity.get( 'caseFolder' ),
                        caseFolderType = caseFolderActive && caseFolderActive.type,
                        message = 'PUBLIC' === caseFolderType ? NO_SCHEIN_IN_QUARTER : (NO_SCHEIN + '<br/><br/>' + NO_SCHEIN_EXPLANATION ),
                        activitySettings,
                        activitySettingsMap;

                    //  MOJ-8551: Pregnancy casefolders have a Gravidogramm, not a schein
                    if ( 'PREGNANCY' === caseFolderType || 'PREPARED' === caseFolderType ) {
                        return props;
                    }

                    if( isNew && !isScheinActType && actType && 'QUOTATION' !== actType && (!caseFolderActive.additionalType || Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolderActive.additionalType ) && !Y.doccirrus.DCWindowManager.getById( 'checkQuarterHasSchein' ) ) {
                        if( lastSchein && ( 'VALID' === lastSchein.status || 'APPROVED' === lastSchein.status ) ) {
                            if( 'PUBLIC' !== caseFolderType ) {
                                return props;
                            }
                            if( moment( lastSchein.timestamp ).isBetween( activityDate.startOf( 'quarter' ).toISOString(), activityDate.endOf( 'quarter' ).toISOString() ) ) {
                                return props;
                            }
                        }

                        activitySettings = props.activitySettings;
                        activitySettingsMap = Y.Array.reduce( activitySettings, {}, function( result, item ) {
                            result[item.actType] = item;
                            return result;
                        } );

                        if(typeof activitySettingsMap[actType].schein !== "boolean" || activitySettingsMap[actType].schein) {
                            Y.doccirrus.DCWindow.notice( {
                                message: message,
                                window: {
                                    id: 'checkQuarterHasSchein',
                                    width: 'medium',
                                    buttons: {
                                        footer: [
                                            {
                                                isDefault: true,
                                                label: CREATE_SCHEIN,
                                                action: function() {
                                                    this.close();
                                                    Y.doccirrus.inCaseUtils.createActivity( { actType: 'SCHEIN' } );
                                                }
                                            }
                                        ]
                                    }
                                }
                            } );
                        }

                        return props;
                    } else {
                        return props;
                    }
                } )
                /** props have to provide patient, activity, activity settings **/
                .then( function( props ) {
                    var
                        patient = props.patient,
                        activity = props.activity,
                        caseFolderActive = activity && activity.get( 'caseFolder' ),
                        caseFolderType = caseFolderActive && caseFolderActive.type,
                        activitiesTable = aCaseFileViewModel && aCaseFileViewModel.activitiesTable,
                        currentActivity = peek( self.currentActivity ),
                        preLinkedActivities = self.get( 'preLinkedActivities' ),
                        i;
                    self.set( 'preLinkedActivities', null );
                    /** handle existing activities table **/
                    if( activitiesTable ) {
                        (function() {
                            var
                                componentColumnColumnCheckbox = activitiesTable.getComponentColumnCheckbox(),
                                componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                                checked = preLinkedActivities || [].concat( componentColumnColumnCheckbox.checked() );

                            componentColumnColumnCheckbox.uncheckAll();

                            if( !currentActivity || currentActivity !== activity ) {
                                componentColumnLinked.removeLinks();
                            }

                            /** link appropriate checked for a new activity **/
                            if( isNewActivity && Y.Lang.isFunction( activity && activity._linkActivity ) && Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() !== activity.caseFolderId() ) {
                                activity._linkActivitiesBatch( checked, caseFolderType );
                            }

                        })();
                    }

                    //  Set default userContent / backmappings if one is configured in activity settings, MOJ-7040
                    if ( props.activitySettings ) {
                        for ( i = 0; i < props.activitySettings.length; i++ ) {
                            if (
                                ( props.activitySettings[i].actType === activityType ) &&
                                ( props.activitySettings[i].userContent ) &&
                                ( '' !== props.activitySettings[i].userContent ) &&
                                ( 'DIAGNOSIS' !== activityType && 'MEDICATION' !== activityType )   // MOJ-9090
                            ) {
                                props.activity.userContent( props.activitySettings[i].userContent );
                            }
                        }
                    }


                    self.route( request );
                    self.currentPatient( patient );
                    self.currentActivity( activity || null );

                // MOJ-10530: Set-up subscription to update currentPatient on DB change of latestMedData field. --------
                // This only concerns the 'latestMedData' field currently.
                    // Avoid duplicate subscriptions:
                    var documentId = ( patient && unwrap( patient._id ) ) || patientId;

                    Y.doccirrus.communication.releaseSubscription( {
                        collection: 'patient',
                        documentId: documentId
                    } );
                    // Subscribe to patient:
                    Y.doccirrus.communication.subscribeCollectionId( {
                        collection: 'patient',
                        documentId: documentId,
                        callback: function( data ) {
                            self.getPatientModelForPatientId( patientId )
                                .then( function( model ) {
                                    model.updateBoilerplate( data, ['latestMedData'] );
                                    //  pregnancy casefolder may have been closed by MEDDATA update
                                    self.currentPatient().caseFolderCollection.load( {
                                        'patientId': ko.unwrap( self.currentPatient()._id )
                                    } );
                                } );
                        }
                    } );


                    if( TAB_CASE_FILE !== peek( activeTab && activeTab.name ) ) {

                        if( !aCaseFileViewModel ) {
                            aCaseFileViewModel = new CaseFileViewModel();
                            aCaseFileViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                aCaseFileViewModel.destroy();
                            } ) );
                        }

                        self.currentView( aCaseFileViewModel );
                        self.get( 'navigation' ).activateTab( TAB_CASE_FILE );
                    }

                    return props;

                } )
                .then( function( props ) {
                    var activity = props.activity;
                    if( !activity && caseFolderId && patientId ) {
                        return self.navigateToCaseFolder( {
                            patientId: patientId,
                            caseFolderId: caseFolderId
                        } );
                    }
                })
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /**
         *  Open reporting tab based on hash frahment route
         *
         *  @protected
         *  @param   {Object}    request     HTTP/routing request
         * --param   {Object}    response    HTTP/routing response
         * --param   {Function}  next        Call next routing handler
         */
        route_reports: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateReportsViewModel: self.useTemplate( {
                        name: 'PredefinedReportsViewModel',
                        path: 'InSight2Mojit/views/PredefinedReportsViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab );

                    self.route( request );

                    if( TAB_REPORTS !== peek( activeTab && activeTab.name ) ) {

                        //aReportsViewModel = KoViewModel.getViewModel( 'PredefinedReportsViewModel' );

                        //if( !aReportsViewModel ) {
                        self.openReportsViewModel = new PredefinedReportsViewModel( {
                            containerName: 'inCaseReports',
                            origin: 'INCASE'
                        } );
                        //}

                        self.currentView( self.openReportsViewModel );
                        self.get( 'navigation' ).activateTab( TAB_REPORTS );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        },
        /**
         *  @protected
         *  @param   {Object}    request     HTTP/routing request
         * --param   {Object}    response    HTTP/routing response
         * --param   {Function}  next        Call next routing handler
         */
        route_withoutcardread: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateWithoutCardReadViewModel: self.useTemplate( {
                        name: 'WithoutCardReadViewModel',
                        path: 'InCaseMojit/views/WithoutCardReadViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aWithoutCardReadViewModel;

                    self.route( request );

                    if( TAB_WITHOUT_CARDREAD !== peek( activeTab && activeTab.name ) ) {

                        aWithoutCardReadViewModel = KoViewModel.getViewModel( 'WithoutCardReadViewModel' );

                        if( !aWithoutCardReadViewModel ) {
                            aWithoutCardReadViewModel = new WithoutCardReadViewModel();
                        }

                        self.currentView( aWithoutCardReadViewModel );
                        self.get( 'navigation' ).activateTab( TAB_WITHOUT_CARDREAD );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /**
         *  @protected
         *  @param   {Object}    request     HTTP/routing request
         * --param   {Object}    response    HTTP/routing response
         * --param   {Function}  next        Call next routing handler
         */
        route_apkinprogress: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateApkInProgressViewModel: self.useTemplate( {
                        name: 'ApkInProgressViewModel',
                        path: 'InCaseMojit/views/ApkInProgressViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aApkInProgressViewModel;

                    self.route( request );

                    if( TAB_APK !== peek( activeTab && activeTab.name ) ) {

                        aApkInProgressViewModel = KoViewModel.getViewModel( 'ApkInProgressViewModel' );

                        if( !aApkInProgressViewModel ) {
                            aApkInProgressViewModel = new ApkInProgressViewModel();
                        }

                        self.currentView( aApkInProgressViewModel );
                        self.get( 'navigation' ).activateTab( TAB_APK );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        },
        /**
         *  @protected
         *  @param   {Object}    request     HTTP/routing request
         * --param   {Object}    response    HTTP/routing response
         * --param   {Function}  next        Call next routing handler
         */
        route_kim: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateKimViewModel: self.useTemplate( {
                        name: 'KimViewModel',
                        path: 'InCaseMojit/views/KimViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aKimViewModel;

                    self.route( request );

                    if( TAB_KIM !== peek( activeTab && activeTab.name ) ) {

                        aKimViewModel = KoViewModel.getViewModel( 'KimViewModel' );

                        if( !aKimViewModel ) {
                            aKimViewModel = new KimViewModel();
                        }

                        self.currentView( aKimViewModel );
                        self.get( 'navigation' ).activateTab( TAB_KIM );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        },

        showBackgroundProcessMask: function(){
            var
                self = this;
            self.showLoadingMask( i18n( 'InCaseMojit.text.backgroundProcess' ) );
            setTimeout( function() {
                self.hideLoadingMask();
            }, 2000 );
        },

        openDocumentModal: function() {
            var self = this,
                currentPatient = peek( self.currentPatient ),
                params = {
                    locations: self.getInitialData( 'location' )
                };

            if( currentPatient ) {
                params.patientTitle = Y.doccirrus.utils.getPatientTitle( currentPatient );
                params.patientNo = currentPatient.patientNo();
                params.patientId = currentPatient._id();
            }
            Y.doccirrus.modals.navSearchModal.show( params );
        },
        /**
         * Use this if all location are needed in strict mode.
         *
         * @returns {*}
         */
        getAllLocations: function() {
            var locations = this.getInitialData( 'location' ),
                foreignLocations = this.getInitialData( 'foreignLocations' ),
                allLocations = [];

            function addLocation( location ) {
                if( !allLocations.find( function( loc ) {
                    return loc._id === location._id;
                } ) ) {
                    allLocations.push( location );
                }
            }

            locations.forEach( addLocation );
            foreignLocations.forEach( addLocation );

            return allLocations;
        }

    }, {
        ATTR: {
            /**
             * Config options to pre-set for a new patient that is created via routing.
             *
             * In case of an object, it is the same as for the patients constructor.
             * @attribute newPatientConfig
             * @type {null|Object}
             * @default null
             */
            newPatientConfig: {
                value: null
            },
            /**
             * Config options to pre-set for a new activity that is created via routing.
             *
             * In case of an object, it is the same as for the constructor of activity.
             * @attribute newActivityConfig
             * @type {null|Object}
             * @default null
             */
            newActivityConfig: {
                value: null
            },
            /**
             * Internal setting to know about a navigate to a new activity is in progress.
             * @private
             * @attribute isAboutToNavigateToNewActivity
             * @type {boolean}
             * @default false
             */
            isAboutToNavigateToNewActivity: {
                value: false
            },
            /**
             * Config options to pre-set linked activities.
             *
             * @attribute preLinkedActivities
             * @type {null|Array}
             * @default null
             */
            preLinkedActivities: {
                value: null
            },
            /**
             * Config options that holds the raw data of an existing patient.
             * At the moment this is used when navigating to patient detail after successful cardread.
             *
             * @attribute updatePatientConfig
             * @type {null|Object}
             * @default null
             */
            updatePatientConfig: {
                value: null
            }
        }
    } );

    /**
     * @event activityTransitioned
     * @description Fires when an activity has been transitioned.
     * @param {KoViewModel} model currentActivity
     * @param {Object} data received data
     * @param {Object} transitionDescription used transition description
     * @type Event.Custom
     */
    Y.publish( 'activityTransitioned', { preventable: false } );
    /**
     * @event activityCopied
     * @description Fires when an activity has been copied.
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'activityCopied', { preventable: false } );
    /**
     * relay for server ws event sent when PDF generation is complete
     * @event asyncPDFGeneration
     * @description Fires when server makes PDF
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'asyncPDFGeneration', { preventable: false } );
    /**
     * relays server ws event as PDFs are generated
     *
     * @event asyncPDFProgress
     * @description Fires repetedly as steps of PDF generation complete
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'asyncPDFProgress', { preventable: false } );
    /**
     * raised by linked documents when they are edited
     *
     * @event attachmentUpdated
     * @description Fires repetedly as steps of PDF generation complete
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'documentUpdated', { preventable: false } );
    /**
     * raised after transition to note thhat document states match those on server
     *
     * @event attachmentUpdated
     * @description Fires repetedly as steps of PDF generation complete
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'documentsAllSaved', { preventable: false } );

    Y.namespace( 'mojito.binders' )[NAME] = new InCaseMojitBinder( {
        binderName: NAME,
        initialData: {
            activitytabsconfiguration: Y.doccirrus.jsonrpc.api.activitytabsconfiguration
                .get()
                .then( function( response ) {
                    return Y.Lang.isObject( response.data ) && response.data || {};
                } ),
            incaseconfiguration: Y.doccirrus.jsonrpc.api.incaseconfiguration
                .readConfig()
                .then( function( response ) {
                    return Y.Lang.isObject( response.data ) && response.data || {};
                } ),
            activitySettings: Y.doccirrus.jsonrpc.api.activitysettings
                .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [];
                } ),
            activitysettingsuser: Y.doccirrus.jsonrpc.api.activitysettingsuser
                .read( { query: { userId: Y.doccirrus.auth.getUserId() } } )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] || {};
                } ),
            invoiceconfiguration: Y.doccirrus.jsonrpc.api.invoiceconfiguration
                .read()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] || {};
                } ),
            location: Y.doccirrus.jsonrpc.api.location
                .read()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data || [];
                } ),
            // needed to display foreign locations if location array is filtered by users locations
            foreignLocations: Y.doccirrus.jsonrpc.api.location
                .getForeignLocations()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data || [];
                } ),
            tenantSettings: Y.doccirrus.jsonrpc.api.settings.read()
                .then( function( response ) {
                    return response.data && response.data[0] || {};
                } ),
            severityMap: Y.doccirrus.jsonrpc.api.severity
                .read()
                .then( function( response ) {
                    var
                        results = Y.Lang.isArray( response.data ) && response.data || [],
                        result = {};

                    results.forEach( function( item ) {
                        result[item.severity] = item;
                    } );

                    return result;
                } ),
            currentUser: Y.doccirrus.jsonrpc.api.employee
                .getIdentityForUsername( { username: Y.doccirrus.auth.getUserId() } )
                .then( function( response ) {
                    var data = response && response.data ? response.data : {};
                    return data;
                } ),
            currentPractice: Y.doccirrus.jsonrpc.api.practice
                .getMyPractice( { } )
                .then( function( response ) {
                    var data = response && response.data ? response.data : {};
                    return data;
                } ),
            catalogDescriptors: Y.doccirrus.jsonrpc.api.catalog
                .getCatalogDescriptorsByActType()
                .then( function( response ) {
                    return response.data;
                } )
                .then( function( data ) {
                    Y.doccirrus.catalogmap.init( data );
                } ),
            vatList: Y.doccirrus.jsonrpc.api.InCaseMojit
                .getVatList()
                .then( function( response ) {
                    return response.data;
                } )
                .then( function( data ) {
                    Y.doccirrus.vat.init( data );
                } ),
            specialitiesList: new Promise.resolve( Y.doccirrus.jsonrpc.api.kbv.fachgruppe() ).then( function( response ) {
                return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                    return {id: entry.key, text: entry.value};
                } );
            } ),
            printerList: new Promise( function( resolve ) {
                //  TODO: replace with load of user profile (employee locations, printers available at current location)
                Y.doccirrus.jsonrpc.api.printer
                    .getPrinter()
                    .done( function( response ) {
                        resolve( response );
                    } )
                    .fail( function( error ) {
                        Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'debug', NAME );
                        resolve();
                    } );
            } ).then( function( response ) {
                Y.dcforms.setPrinterList( response && response.data );
                return response && response.data;
            } ),
            customFonts: new Promise( function( resolve ) {
                Y.doccirrus.media.fonts.loadFontList( onFontsListed );
                function onFontsListed( err ) {
                    if( err ) {
                        Y.log( 'Error loading custom fonts: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite error
                        return resolve();
                    }
                    //  now done by embedded css
                    Y.log( 'Adding custom fonts to page...', 'debug', NAME );
                    Y.doccirrus.media.fonts.addFontsToPage();
                    resolve();
                }
            } ),
            labdataSortOrder: Y.doccirrus.jsonrpc.api.employee
                .getLabDataSortOrderForUsername( { 'username': Y.doccirrus.auth.getUserId() } )
                .then( function( response ) {
                    return response.data;
                } )
        }

    } );

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',
        'ItemsTabFactory',
        'doccirrus',
        'promise',
        'DCBinder',
        'DCRouter',
        'KoViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'NavBarHeader',

        'dcauth',
        'dcutils',
        'dccatalogmap',
        'dcmedia',
        'dcforms-utils',

        'activitysettings-schema',
        'activity-schema',
        'casefolder-schema',
        'activity-api',

        'PatientModel',
        'ActivityModels',
        'dcvat',
        'DocumentModel',

        'CaseFileViewModel',
        'PatientBrowserViewModel',
        'PatientDetailViewModel',
        'PredefinedReportsViewModel',
        'ApkInProgressViewModel',
        'KimViewModel',
        'WithoutCardReadViewModel',
        'dccommunication-client',
        'DocumentSearchModal',

        'DcNotifyInvalidParentsModal',
        'HotkeysModal'
    ]
} );
