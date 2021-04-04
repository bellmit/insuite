/*eslint strict:0 */
/*global YUI, ko, $, async */

'use strict';

YUI.add( 'ActivityHeadingButtonsViewModel', function( Y, NAME ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        throbberImg = '/static/DocCirrus/assets/images/ajax-loader.gif',

        // shortcuts
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap;

    /**
     * @event activityPDFChange
     * @description Fires when an activity has been updated with a new PDF
     * @param {KoViewModel} model currentActivity
     * @param {Object} data received data
     * @param {Object} mediaId id of new PDF
     * @type Event.Custom
     */

    Y.publish( 'activityPDFChange', {preventable: false} );

    /**
     * @constructor
     * @class ActivityHeadingButtonsViewModel
     */
    function ActivityHeadingButtonsViewModel() {
        ActivityHeadingButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityHeadingButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentPatient = unwrap( binder.currentPatient ),
                config = {
                    dropup: false, // will have an effect in the correct context e.g. KoButtonDropDown
                    pullRight: true,
                    items: [
                        {
                            name: 'menu-print-copy',
                            text: '',
                            title: '',
                            icon: '',
                            disabled: self.disabledOrMissing,
                            html: i18n( 'KoUI.KoPrintButton.PRINT_COPY' ),
                            click: function() { self.btnQuickPrintClick( 1 ); }
                        },
                        {
                            name: 'menu-print-copy-dialog',
                            text: '',
                            title: '',
                            icon: '',
                            disabled: self.disabledOrMissing,
                            html:  i18n( 'KoUI.KoPrintButton.PRINT_COPY_DIALOG' ),
                            click: function() { self.createCopyDialog(); }
                        }
                    ]
                };

            self.showKbvPrescriptionFormPanel = ko.observable( false );
            self.currentActivity = ko.computed( function() {
                return unwrap( binder.currentActivity );
            } );

            self.dropMenu = KoComponentManager.createComponent( {
                componentType: 'KoMenu',
                componentConfig: config
            } );

            self.btnViewAction = ko.observable( 'view100' );
            self.btnViewAction.subscribe( function(){
                self.pcntWidth( self.getSizePcnt() );
            });
            self.mapBtnView = function( action ){
                var result, text, pcnt = self.pcntWidth();
                switch( action ){
                    case 'preview':
                        text = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.btnView.preview');
                        result = {text: text, textB: text, icon: 'fa fa-eye'};
                        break;
                    case 'zoomIn':
                        text = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.btnView.zoom');
                        result = {text: text, textB: text + ' (' + pcnt + '%)', icon: 'fa fa-plus'};
                        break;
                    case 'zoomOut':
                        text = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.btnView.zoom');
                        result = {text: text, textB: text + ' (' + pcnt + '%)', icon: 'fa fa-minus'};
                        break;
                    case 'back':
                        text = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.btnView.back');
                        result = {text: text, textB: text + ' (' + pcnt + '%)', icon: 'fa fa-angle-left'};
                        break;
                    case 'view100':
                    default:
                        text = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.btnView.view100');
                        result = {text: text, textB: text, icon: ''};
                }
                return result;
            };
            self.pcntWidth = ko.observable( 0 );
            self.viewMenu = KoComponentManager.createComponent( {
                componentType: 'KoMenu',
                componentConfig: {
                    dropup: false,
                    pullRight: true,
                    items: [
                        {
                            name: 'menu-zoom-100',
                            text: '',
                            title: '',
                            icon: '',
                            disabled: self.btn100Disabled,
                            html: self.mapBtnView( 'view100' ).text,
                            click: function() {
                                self.btnViewAction( 'view100' );
                                self.btnZoom100Form();
                            }
                        },
                        {
                            name: 'menu-back',
                            text: '',
                            title: '',
                            icon: 'ANGLE_LEFT',
                            disabled: self.btnBackDisabled,
                            html: self.mapBtnView( 'back' ).text,
                            click: function() {
                                self.btnViewAction( 'back' );
                                self.btnFitPageForm();
                            }
                        },
                        {
                            name: 'menu-zoom-in',
                            text: '',
                            title: '',
                            icon: 'PLUS',
                            html: self.mapBtnView( 'zoomIn' ).text,
                            click: function() {
                                self.btnViewAction( 'zoomIn' );
                                self.btnZoomForm( 1 );
                            }
                        },
                        {
                            name: 'menu-zoom-out',
                            text: '',
                            title: '',
                            icon: 'MINUS',
                            html: self.mapBtnView( 'zoomOut' ).text,
                            click: function() {
                                self.btnViewAction( 'zoomOut' );
                                self.btnZoomForm( -1 );
                            }
                        },
                        {
                            name: 'menu-preview',
                            text: '',
                            title: '',
                            icon: 'EYE',
                            html: self.mapBtnView( 'preview' ).text,
                            click: function() {
                                self.btnViewAction( 'preview' );
                                self.btnPreviewForm();
                            }
                        }
                    ]
                }
            } );

            const lessThanApprovedActivityStatuses = ['EXT_IMPORT', 'DISPATCHED', 'CREATED', 'INVALID', 'VALID', 'PREPARED'];

            self.pdfDebug = ko.observable( 'ready' );
            self.pdfDebugStatus = ko.computed( function() {
                return currentActivity.status();
            } );

            self.pdfRenderInProgress = ko.computed( function __pdfRenderInProgress() {

                var
                    pdfJobs = binder.currentPdfJobs(),
                    currentActivityId = unwrap( currentActivity._id ),
                    i;

                for ( i = 0; i < pdfJobs.length; i++ ) {
                    if ( pdfJobs[i].activityId === currentActivityId ) {
                        return true;
                    }
                }
                return false;
            } );

            self.isPrintingAndPdfAllowed = function( scheduled ) {
                var activitySettings = binder.getInitialData( 'activitySettings' ),
                    currentActivitySettings = activitySettings.find(function(el) { return el.actType === currentActivity.actType(); });
                if (!currentActivitySettings || !currentActivitySettings.quickPrintInvoice || scheduled ) { return true; }
                return currentActivitySettings.quickPrintInvoice && !lessThanApprovedActivityStatuses.includes(currentActivity.status());
            };

            self.hideLinksOfPrintedPDF = function() {
                let activitySettings = binder.getInitialData( 'activitySettings' ),
                    currentActivitySettings = activitySettings.find( setting => setting.actType === currentActivity.actType() );

                return currentActivitySettings && currentActivitySettings.hideLinksOfPrintedPDF;
            };

            self.isPrintEnabled = ko.computed( function() {
                return self.isPrintingAndPdfAllowed();
            } );

            self.canPrintAndRelease = ko.computed( function() {
                const activitySettings = binder.getInitialData( 'activitySettings' );
                const currentActivitySettings = activitySettings.find(function(el) { return el.actType === currentActivity.actType(); });

                if (!currentActivitySettings || !currentActivitySettings.quickPrintInvoice) { return true; }

                return !self.pdfRenderInProgress() &&
                       (unwrap( currentActivity.status ) !== 'DISPATCHED') &&
                       currentActivitySettings.quickPrintInvoice && currentActivity.status() === 'VALID';
            });

            self.pdfNotInProgress = ko.computed( function __pdfNotInProgress() {
                var isPrintEnabled = self.isPrintEnabled();
                return !self.pdfRenderInProgress() && (unwrap( currentActivity.status ) !== 'DISPATCHED') && isPrintEnabled;
            } );

            self.allowPDFCreation = ko.computed( function() {
                return self.isPrintingAndPdfAllowed() && !self.hideLinksOfPrintedPDF();
            } );

            self.allowScheduledPDFCreation = ko.computed( function () {
                return self.isPrintingAndPdfAllowed( true );
            });

            self.initialStatus = unwrap( currentActivity.status );
            self.createKoPrintButtons( );

            self.havePrinters = ko.observable( false );
            self.printToolTip = ko.observable( '' );

            self.locationPrinters = ko.observableArray( [] );
            self.setLocationPrinters();

            self.locationListener = currentActivity.locationId.subscribe( function() {
                self.setLocationPrinters();
            } );

            //  if no form then PDF and print buttons should not be shown
            self.canHavePdf = ko.computed( function() {
                //  MOJ-8927 When in ISD / Dispatcher we do not create PDFs for display or print, but may
                //  display or print PDFs already attached to an activity.
                if ( binder.blockPDFButtons && binder.blockPDFButtons() ) { return false; }
                return ( currentActivity.formId && currentActivity.formId() && '' !== currentActivity.formId() );
            } );

            self.isFrameView = ko.computed( function() {
                return Y.doccirrus.commonutils.isFrameView();
            } );

            self.isEDMP = ko.pureComputed( function() {
                var caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    isDMP = caseFolder && Y.doccirrus.schemas.casefolder.isEDMP( caseFolder );
                return isDMP && self.currentActivitySectionName() === 'textform';
            } );

            self.isHGV = ko.pureComputed( function() {
                var caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    isHGV = caseFolder && Y.doccirrus.schemas.casefolder.isHGV( caseFolder );
                return isHGV && self.currentActivitySectionName() === 'textform';
            } );

            self.isEdmpPrintEnabled = ko.computed( function() {
                const activitySettings = binder.getInitialData( 'activitySettings' );
                const currentActivitySettings = activitySettings.find(function (el) {return el.actType === currentActivity.actType(); });


                const pdfAllowed = currentActivitySettings ? currentActivitySettings.quickPrintInvoice : true;
                var status = unwrap( currentActivity.status );

                return (-1 !== ['APPROVED', 'SENT', 'ARCHIVED'].indexOf( status )) && pdfAllowed && !lessThanApprovedActivityStatuses.includes(status);
            } );

            self.isISD = function() {
                return Y.doccirrus.auth.isISD();
            };

            self.canNotPrint = ko.computed( function() {
                return ( !( self.canHavePdf() && self.havePrinters() ) );
            } );

            self.canQuickPrint = ko.computed( function() {
                var status = unwrap( currentActivity.status );

                const activitySettings = binder.getInitialData( 'activitySettings' );

                const currentActivitySettings = activitySettings.find(function (el) { return el.actType === currentActivity.actType(); });

                if (currentActivitySettings && !currentActivitySettings.quickPrintPrescription) {
                    return false;
                }

                if( !self.canHavePdf || !self.canHavePdf() ) {
                    //Y.log( 'can not quickprint, self.canHavePdf is false', 'debug', NAME )
                    return false;
                }

                if( self.isFrameView() ) {
                    return false;
                }

                if(
                    !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.SUPPORT ) && !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.ADMIN ) && !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.CONTROLLER ) && !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.PHYSICIAN )
                ) {
                    return false;
                }

                if( 'CREATED' !== status && 'VALID' !== status && 'DISPATCHED' !== status ) {
                    //Y.log( 'can not quickprint, incorrect status', 'debug', NAME );
                    return false;
                }

                if ( !self.kopbForm.printerName() || '' === self.kopbForm.printerName() ) {
                    return false;
                }


                switch( unwrap( currentActivity.actType ) ) {
                    case 'PUBPRESCR':
                    case 'PRESASSISTIVE':

                        if( Y.doccirrus.auth.isISD() ) {
                            // user cannot be on ISD server
                            return false;
                        }

                        return true;

                    default:
                        return true;
                }
            } );

            self.currentActivitySectionName = ko.computed( function __currentActivitySectionName() {
                var
                    currentView = unwrap( binder.currentView ) || null,
                    isInCaseFile = ( currentView && currentView.activityDetailsViewModel ),
                    actDetailsVM = isInCaseFile ? unwrap( currentView.activityDetailsViewModel ) : null,
                    sectionName = actDetailsVM ? actDetailsVM.activeActivityNavSection() : '';

                return sectionName;
            } );

            self.canModifyView = ko.computed( function() {
                return self.currentActivitySectionName() === 'formform';
            } );

            self.canPrefill = ko.computed( function __canPrefill() {
                var
                    incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                    hasConfigSetting = incaseConfig.showPrefillButton || false,
                    hasForm = ( currentActivity.formId() && '' !== currentActivity.formId() ),
                    onFormTab = ( 'formform' === self.currentActivitySectionName() );

                return currentActivity._isEditable() && hasConfigSetting && hasForm && onFormTab;
            } );

            self.isMedicationplan = ko.computed( function __isMedicationPlan() {
                return ( 'MEDICATIONPLAN' === currentActivity.actType() );
            } );

            self.isKBVMedicationPlan = ko.computed( function __isMedicationPlan() {
                return ( 'KBVMEDICATIONPLAN' === currentActivity.actType() );
            } );

            //  True if we are in an open / active pregnancy case
            self.isActivePregnancy = ko.computed( function __isActivePregnancy() {
                var
                    currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                    caseFolderItems = currentPatient.caseFolderCollection.items(),
                    i;

                if ( !currentCaseFolder || currentCaseFolder.additionalType !== 'PREGNANCY' ) { return false; }

                for ( i = 0; i < caseFolderItems.length; i++ ) {
                    if ( caseFolderItems[i]._id === currentCaseFolder._id ) {
                        if ( currentCaseFolder.disabled ) { return false; }
                    }
                }

                return ( 'GRAVIDOGRAMM' === currentActivity.actType() );
            } );

            //  True if we are in a locked / completed pregnancy case
            self.isInactivePregnancy = ko.computed( function __isActivePregnancy() {
                var
                    currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                    caseFolderItems = currentPatient.caseFolderCollection.items(),
                    i;

                if ( 'GRAVIDOGRAMM' !== currentActivity.actType() ) { return false; }

                if ( !currentCaseFolder || currentCaseFolder.additionalType !== 'PREGNANCY' ) { return false; }

                for ( i = 0; i < caseFolderItems.length; i++ ) {
                    if ( caseFolderItems[i]._id === currentCaseFolder._id ) {
                        return currentCaseFolder.disabled;
                    }
                }

                return false;
            } );

            self.mmiPrintEnabled = ko.computed( function __hasMedicationplanPdf() {
                if ( self.pdfRenderInProgress() ) { return false; }
                return ( null !== self.getMedicationsplanDoc() );
            });

            self.isFormToolboxAvailable = ko.computed( function() {
                return self.canModifyView() && currentActivity._isEditable();
            } );

            self.wsPdfCallback = null;

            //  update activity and refresh the UI when PDF render completes on the server
            self.pdfListener = Y.on( 'asyncPDFGeneration', function __pdfListener( data ) {

                if(
                    !currentActivity || !data || !data.activity || !data.activity._id ||
                    data.activity._id !== unwrap( currentActivity._id )
                ) {
                    Y.log( 'Received PDF event bound for different tab, discarding', 'debug', NAME );
                    return;
                }

                //Y.log( 'PDF event applies to current activity: ' + unwrap( currentActivity._id ), 'debug', NAME );

                if( self.wsPdfCallback && 'function' === typeof self.wsPdfCallback ) {
                    self.wsPdfCallback( data );
                } else {
                    Y.log( 'Implicit generation of PDF via transition, reloading attached documents', 'info', NAME );
                    self.onServerPDFGeneration( data );
                }
            } );

            //  updated by changes in display options in LABDATA table viewmodel, MOJ-9218
            self.showLaborblattCharts = ko.observable( true );

            self.initPrintListener();
            self.initPdfListener();
            self.initKbvFormPanel();

            self.labDataSinglePdfI18n = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.text.LABDATA_SINGLE_PDF');
            self.medicatioplanPDFI18n = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.text.MEDICATIONPLAN_PDF');
            self.endPregnancyCaseI18n = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.text.END_PREGNANCY_CASE');
            self.reopenPregnancyCaseI18n = i18n('InCaseMojit.ActivityHeadingButtonsViewModel.text.REOPEN_PREGNANCY_CASE');
            self.prefillI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PREFILL' );
            self.btnQuickPrintTextI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.btnQuickPrint.text' );
            self.buttonTextPDFI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PDF' );
            self.buttonTextPrintTaskI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT_TASK' );
            self.buttonTextPrintI18n = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT' );
        },

        initPrintListener: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity );
            Y.doccirrus.communication.on( {
                event: 'asyncPDFPrinted',
                // note: specifying a socket here will cause this to fail after navigation,
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var evt = message.data && message.data[0];
                    Y.log( 'PDF render progress: ' + JSON.stringify( evt ), 'debug', NAME );

                    if( evt && evt.mapId && currentActivity && evt.mapId !== unwrap( currentActivity._id ) ) {
                        //  progress update applies to a different activity, or is broadcast to a different tab
                        return;
                    }

                    self.kopbForm.printerName( evt.printerName );
                    self.kopbForm.updateMenu();
                },
                handlerId: NAME + 'asyncPDFPrinted'
            } );
        },

        initPdfListener: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = ko.unwrap( binder.currentActivity );

            Y.doccirrus.communication.on( {
                event: 'onPDFCreated',
                // note: specifying a socket here will cause this to fail after navigation,
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var evt = message.data && message.data[0];
                    Y.log( 'PDF render progress: ' + JSON.stringify( evt ), 'debug', NAME );

                    if( evt && evt.mapId && currentActivity && evt.mapId !== unwrap( currentActivity._id ) ) {
                        //  progress update applies to a different activity, or is broadcast to a different tab
                        return;
                    }
                },
                handlerId: NAME + 'onPDFCreated'
            } );
        },
        initKbvFormPanel: function() {
            var self = this;
            self.addDisposable( ko.computed( function() {
                var
                    binder = self.get( 'binder' ),
                    activityDetailsViewModel,
                    caseFileVM = unwrap( binder.currentView ),
                    currentActivity = ko.unwrap( binder.currentActivity ),
                    substitutePrescription = currentActivity && unwrap( currentActivity.substitutePrescription ),
                    currentPatient = ko.unwrap( binder.currentPatient ),
                    currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                    isPublicCaseFolder = currentCaseFolder && currentCaseFolder.type === 'PUBLIC',
                    isKbvForm = currentActivity && ['PUBPRESCR', 'PRESCRBTM', 'PRESCRT'].indexOf( unwrap( currentActivity.actType ) ) !== -1;

                activityDetailsViewModel = caseFileVM && unwrap( caseFileVM.activityDetailsViewModel );
                self.showKbvPrescriptionFormPanel( isPublicCaseFolder && isKbvForm );

                if( activityDetailsViewModel && activityDetailsViewModel.template && peek( self.showKbvPrescriptionFormPanel ) ) {
                    activityDetailsViewModel.template.map( {
                        medication2: substitutePrescription ? i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.SUBSTITUTE_PRESCRIPTION_PRINT' ) : '',
                        dosis2: '',
                        pzn2: ''
                    }, true, function() {
                    } );
                }
            } ) );
        },

        /** @protected */
        destructor: function() {
            var self = this;

            //  important - Chrome will error about CORS if we try to dispose this
            self.preWindow = null;

            self.canHavePdf = null;
            self.canQuickPrint = null;
            self.pdfNotInProgress = null;
            self.pdfRenderinProgress = null;
            self.wsPdfCallback = null;

            self.pdfListener = null;
            self.pdfProgressListener = null;
            self.printListener = null;
            //self.pdfProgressWidth = null;

            Y.doccirrus.communication.off( 'asyncPDFPrinted', NAME + 'asyncPDFPrinted' );
            Y.doccirrus.communication.off( 'onPDFCreated', NAME + 'onPDFCreated' );
        },

        preWindow: null,
        canQuickPrint: null,
        canHavePdf: null,
        canNotPrint: null,
        havePrinters: null,
        printToolTip: null,
        pdfRenderInProgress: null,
        pdfNotInProgress: null,

        locationPrinters: null,
        locationListener: null,
        pdfListener: null,
        pdfProgressListener: null,

        templateReady: function() {
            $( '[data-toggle="tooltip"]' ).tooltip();
        },

        createKoPrintButtons: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                lblPrintForm = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.PRINT' ),
                style = {
                    'btn-xs': true,
                    'btn-default': true
                };

            self.kopbForm = KoComponentManager.createComponent( {
                componentType: 'KoPrintButton',
                componentConfig: {
                    name: 'kopbForm',
                    formId: currentActivity.formId,
                    text: lblPrintForm,
                    title: lblPrintForm,
                    icon: 'PRINT',
                    option: 'DEFAULT',
                    size: 'XSMALL',
                    disabled: ko.computed( function() {
                        return !self.pdfNotInProgress();
                    } ),
                    visible: true,
                    css: style,
                    click: function( printerName, numCopies ) {
                        self.onKoPrintClick( printerName, numCopies );
                    }
                }
            } );

            //  let the print button know when the form changes, so that it can load printer assignment for new form
            self.formChangeListener = currentActivity.formId.subscribe( function( newValue ) {
                self.kopbForm.formId( newValue ); }
            );
        },

        onKoPrintClick: function( printerName, numCopies ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                canonicalId = peek( currentActivity.formId ),
                locationId = peek( self.kopbForm.locationId );

            if ( !numCopies || numCopies < 1 ) {
                //  simple / default print: PDF added to document attachment
                return self.printPDF( printerName, 0, locationId, canonicalId );
            }

            //  print directly (performs save), then print again with 'COPY' transparency over each page of PDF

            Y.log( 'Printing default and copy PDFs: ' + printerName, 'debug', NAME );

            return self.printPDF( printerName, numCopies, locationId, canonicalId )
                .then( onPrintComplete );

            function onPrintComplete( savedActivity ) {
                Y.log( 'Completed print of PDF on activity: ' + savedActivity._id, 'debug', NAME );
            }
        },

        getEffectiveStatus: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                activityActionButtonsVM = unwrap( activityDetailsVM.activityActionButtonsViewModel );

            return activityActionButtonsVM.effectiveStatus();
        },

        /**
         *  Raised in reponse to keyboard shortcut
         */

        shortcutPrint: function() {
            var
                self = this,
                prefix = 'utils_clientJS.keyboardShortcutMessages.',
                printerName;

            if ( self.isMedicationplan() && self.mmiPrintEnabled() && self.pdfNotInProgress() ) {

                Y.doccirrus.DCSystemMessages.addMessage( {
                    content: i18n( prefix + 'PRINTING_MEDICATIONPLAN_DEFAULT' ),
                    level: 'INFO'
                } );

                self.btnMedicationplanPrintClick();
                return;
            }

            if ( self.canHavePdf() && self.pdfNotInProgress() ) {

                printerName = unwrap( self.kopbForm.printerName );

                if ( !printerName ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        content: i18n( prefix + 'PLEASE_ASSIGN_PRINTER' ),
                        level: 'ERROR'
                    } );
                }

                Y.doccirrus.DCSystemMessages.addMessage( {
                    content: i18n( prefix + 'PRINTING_DEFAULT' ) + printerName,
                    level: 'INFO'
                } );

                self.onKoPrintClick( printerName, 0 );
            }
        },

        /**
         *  Try and save the activity and associated objects to server
         *  (ie, run the validate transition if not already valid)
         *
         *  Returns a promise to save the activity
         *
         *  @param  {String}    printerName         name of printer to pass to doTransitionPlus
         *  @param  {Number}    printCopies         how many copies to print (with copy mask)
         *  @param  {Boolean}   recreatePDF         make a PDF, not for immediate printing
         *  @param  {String}    printLocation       DEPRECATED, not currently used
         *  @param  {String}    printCanonicalId    DEPRECATED, not currently used
         */

        trySaveActivity: function( printerName, printCopies, recreatePdf /*, printLocation, printCanonicalId */ ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentActivityId = unwrap( currentActivity._id ),
                //  currentActivityStatus = unwrap( currentActivity.status),
                transitions = Y.doccirrus.schemas.activity.getTransitionList(),
                transitionDescription = transitions.validate || null,
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),

                transitionParams = {
                    transitionDescription: transitionDescription,
                    printPdf: printerName || null,
                    printCopies: printCopies || 0,
                    recreatePdf: recreatePdf || false
                };

            if( false === currentActivity._isEditable() /* || 'VALID' === self.getEffectiveStatus() */ ) {
                //  activity not editable, so no need to save before generating PDF
                Y.log( 'no need to save activity before generating PDF', 'info', NAME );
                return Promise.resolve( currentActivity );
            }

            if ( !activityDetailsVM.isFormLoaded() ) {
                Y.log( 'Form is not yet loaded / please wait for form to load / not making PDF', 'debug', NAME );
                return Promise.reject( 'Activity not yet loaded' );
            }

            //  MOJ-8040 if form is currently busy with a mapping operation then wait until it is finished
            return activityDetailsVM.saveAttachmentsAndTransition( transitionParams )
                .then( onTransitionComplete )
                .catch( onTransitionFailed );

            function onTransitionComplete( updatedActivity ) {
                if( currentActivity._id && unwrap( currentActivity._id ) && '' !== unwrap( currentActivity._id ) ) {
                    return Promise.resolve( updatedActivity );

                } else {

                    Y.log( 'Could not save activity to server.', 'warn', NAME );

                    //  Cancel client-side PDF complete event handler
                    self.wsPdfCallback = null;

                    if( binder.pdfWindows && binder.pdfWindows[ currentActivityId ] ) {
                        //  TODO: translateme
                        binder.pdfWindows[ currentActivityId ].document.body.innerHTML = "Could not generate PDF, please check the activity.";
                        binder.pdfWindows[ currentActivityId ] = null;
                        delete binder.pdfWindows[ currentActivityId ];
                    }

                    return Promise.reject( 'Could not save activity to server' );
                }
            }

            function onTransitionFailed( err ) {
                Y.log( 'Could not save current activity for print/pdf operation: ' + JSON.stringify( err ), 'warn', NAME );
            }

        },

        /**
         *  Opens a new browser tab to display the latest PDF document
         *
         *  A new PDF will be created if none is available or current form does not match state when PDF was last made.
         *
         *  A window may already be open and showing a throbber
         *  @param  newTab  {Object}    Window to display PDF in
         */

        openPDFInNewTab: function( newTab ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel,
                latestPDFDocument = attachments.getLatestPdf(),
                formDoc = attachments.findDocument( 'FORM' ),
                pdfMatchesForm = ( formDoc && latestPDFDocument && ko.unwrap( formDoc.formStateHash ) === ko.unwrap( latestPDFDocument.formStateHash ) );

            /*
            console.log( '(***) openPdfInNewTab, pdfMatchesForm: ', pdfMatchesForm );
            if ( !pdfMatchesForm ) {
                console.log( '(****) pdf does not match form, latestPDFDocument: ', latestPDFDocument );
                console.log( '(****) pdf does not match form, formDoc: ', formDoc );
                if ( latestPDFDocument && formDoc ) { //--
                    console.log( '(****) hashes: ',  ko.unwrap( formDoc.formStateHash ), ko.unwrap( latestPDFDocument.formStateHash ),  ko.unwrap( formDoc.formStateHash ) === ko.unwrap( latestPDFDocument.formStateHash ) )
                }
            }
            */

            //  MOJ-8927 When activity is approved, or on dispatcher, we do not regenerate PDFs
            if( latestPDFDocument && ( !currentActivity._isEditable() || self.isISD() || pdfMatchesForm ) ) {

                if( newTab ) {
                    //  opened closer to click event to reduce problems with popup blockers
                    newTab.location = latestPDFDocument.fullUrl();
                } else {
                    //  open PDF directly
                    window.open( latestPDFDocument.fullUrl(), '_blank' );
                }

                return Promise.resolve( latestPDFDocument );

            } else {

                Y.log( 'No PDF is available for display, making a new one', 'info', NAME );

                //if ( 'VALID' === currentActivity.status() ) {
                //    //console.log( '(****) creating PDF from valid activity....' );
                //    return self.createPdfFromValidActivity( newTab );
                //}

                if ( 'VALID' === currentActivity.status() ) {
                    currentActivity.status( 'CREATED' );
                }

                return self.createPdfFromUnsavedActivity( newTab );
            }
        },

        createPdfFromValidActivity: function( newTab ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                template = activityDetailsVM.template;

            function findOrGeneratePDFDirectly( resolve, reject ) {
                //  in that case latestPDF and formDoc will have matching content hashes

                template.renderPdfServer('db', '', 'PDF', onDocumentReady);

                function onDocumentReady( err, formForPDF ) {
                    if ( err ) { return reject( err ); }

                    Y.doccirrus.jsonrpc.api.formtemplate.generatePdfDirect( { documentState: formForPDF } )
                        .then( onGeneratedPdf )
                        .fail( onGeneratePdfFailed );
                }

                function onGeneratedPdf( result ) {
                    var
                        mediaId = result && result.data && result.data._id;

                    //endTime = new Date().getTime();
                    //console.log( '(****) onMakePdf, jsonrpc timing: ', ( endTime - startTime ), 'ms' );
                    //console.log( '(****) onMakePdf, result: ', result );
                    newTab.location = Y.doccirrus.infras.getPrivateURL( '/media/' + mediaId );
                }

                function onGeneratePdfFailed( err ) {
                    Y.log( 'Could not generate PDF: ' + JSON.stringify( err ), 'error', NAME );
                    //TODO: should probably pop a notice here
                    reject( err );
                }
            }

            return new Promise( findOrGeneratePDFDirectly );
        },

        createPdfFromUnsavedActivity: function( newTab ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel;

            return self.trySaveActivity( null, 0, true )
                .then( function() {
                    var
                        latestPdf = attachments.getLatestPdf(),
                        mediaId = latestPdf ? ko.unwrap( latestPdf.mediaId ) : null;
                    //  now sent directly in _attachmentsObj

                    if ( mediaId ) {
                        //  let activity table know that there is a new PDF MOJ-5827
                        Y.fire( 'activityPDFChange', {
                            model: currentActivity,
                            mediaId: mediaId
                        } );

                        newTab.location = latestPdf.fullUrl();
                    }

                    //return attachments.updateFromServer( currentActivity );
                    return Promise.resolve( latestPdf );
                } );

        },

        /**
         *  Sends PDF to configured printer
         *  @param  {String}    selectedPrinter         optional for now
         *  @param  {Number}    numCopies               numnber of copies to print
         *  @param  {String}    selectedLocationId
         *  @param  {String}    selectedCanonicalId
         *  @return {Object}                            promise
         */

        printPDF: function( selectedPrinter, numCopies, selectedLocationId, selectedCanonicalId ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel,
                latestPDFDocument = attachments.getLatestPdf(),
                formDoc = attachments.findDocument( 'FORM' ),
                mediaId;

            self.pdfDebug( 'Printing activity' );

            //  TODO: check pdf FORMPDF doc exists and has a content hash matching the FORM doc

            //  MOJ-8927 When activity is approved, or on dispatcher, we do not regenerate PDFs
            if( latestPDFDocument && ( !currentActivity._isEditable() || self.isISD() ) ) {
                binder.pdfRenderInProgress( false );
                self.sendToPrinter( latestPDFDocument, selectedPrinter, selectedLocationId, selectedCanonicalId, numCopies );

                if ( numCopies > 0 ) {
                    self.printCopies( selectedPrinter, numCopies );
                }
                return Promise.resolve( true );
            }

            //  if there is already a PDF and the form state hash matches that of the current form then we do not need
            //  to regenerate the PDF, contents are the same as when it was last generated.

            if (
                latestPDFDocument && formDoc && ko.unwrap( formDoc.formStateHash ) &&
                ko.unwrap( formDoc.formStateHash ) === ko.unwrap( latestPDFDocument.formStateHash )
            ) {
                Y.log( 'PDF already exists for this form state, printing directly: ' + selectedPrinter, 'debug', NAME );
                binder.pdfRenderInProgress( false );
                self.sendToPrinter( latestPDFDocument, selectedPrinter, selectedLocationId, selectedCanonicalId, numCopies );

                if ( numCopies > 0 ) {
                    self.printCopies( selectedPrinter, numCopies );
                }
                return Promise.resolve( true );
            }

            if ( 'VALID' === currentActivity.status() ) {
                Y.log( 'Set activity status CREATED to force save for faster printing: ' + currentActivity.status(), 'debug', NAME );
                currentActivity.status( 'CREATED' );
            }

            Y.log( 'Creating PDF by activity transition and printing it to ' + selectedPrinter + ' with ' + numCopies + ' copies.', 'info', NAME );

            return self.trySaveActivity( selectedPrinter, numCopies, selectedLocationId, selectedCanonicalId )
                .then( function( newMediaId ) {
                    self.pdfDebug( 'loading new attachments from server' );
                    mediaId = newMediaId;
                } )
                .then( function() {
                    //  let activity table know that there is a new PDF MOJ-5827
                    Y.fire( 'activityPDFChange', {
                        model: currentActivity,
                        mediaId: mediaId
                    } );
                    self.pdfDebug( 'Ready' );
                    binder.pdfRenderInProgress( false );

                    Y.doccirrus.jsonrpc.api.activity.incrementPrintCount({
                        activityIds: [unwrap( currentActivity._id )],
                        numCopies: numCopies || 1
                    });

                    if ( numCopies > 0 ) {
                        self.printCopies( selectedPrinter, numCopies );
                    }

                    return Promise.resolve( true );
                } );

            //  .fail( function( err ) {
            //      Y.log( 'Could not print PDF document: ' + JSON.stringify( err ), 'warn', NAME );
            //} );

        },

        /**
         *  Query assigned printer for a document and pop a model to select one if none are configured
         *
         *  @param  document    {Object}    A KO document viewModel
         *  @param  autoSelect  {Boolean}   If true will not show modal unless no printer is configured
         *  @param  callback    {Function}  Of the form fn(err, printerName)
         */

        queryAssignedPrinter: function( document, autoSelect, callback ) {
            Y.doccirrus.modals.choosePrinter.show( {
                'canonicalId': unwrap( document.formId ),
                'autoSelect': autoSelect,
                'onPrinterSelected': onPrinterSelected
            } );

            function onPrinterSelected( selectedPrinter, selectedLocationId, selectedCanonicalId ) {
                Y.log( 'Printer selected by user: ' + selectedPrinter, 'debug', NAME );
                callback( null, selectedPrinter, selectedLocationId, selectedCanonicalId );
            }
        },

        /**
         *  Request Media API print a file (GridFS files only)
         *
         *  @param  document            {Object}    KO document model
         *  @param  selectedPrinter     {String}    from chooseprinter-modal
         *  @param  selectedLocationId  {String}    from chooseprinter-modal
         *  @param  selectedCanonicalId {String}    from chooseprinter-modal
         *  @param  numCopies           {Number}    from chooseprinter-modal
         *  @return {*}
         */

        sendToPrinter: function( document, selectedPrinter, selectedLocationId, selectedCanonicalId, numCopies ) {
            var self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            self.pdfDebug( 'Sending document to printer...' );
            Y.log( 'Sending to document printer: ' + document.printerName() + ' ' + document.mediaId(), 'debug', NAME );

            var printerName = selectedPrinter || unwrap( document.printerName );

            onPrinterResolved();

            function onPrinterResolved( ) {

                Y.doccirrus.comctl.privatePost(
                    '/1/media/:print/',
                    {
                        'printerName': printerName,
                        'mediaId': unwrap( document.mediaId )
                    },
                    onPrinted
                );
            }

            function onPrinted( err, data ) {
                //err = { 'force': 'for test' };

                var
                    pdfLink = '/media/' + unwrap( document.mediaId ) + '_original.APPLICATION_PDF.pdf',
                    retryMsg = i18n( 'InCaseMojit.casefile_exports.print_modal.printer_failure' ),
                    printMessageId = unwrap( document._id ) + '-' + Y.doccirrus.comctl.getRandId(),
                    printMessage,
                    configUpdate = {
                        'canonicalId': selectedCanonicalId,
                        'locationId': selectedLocationId,
                        'printerName': printerName
                    },
                    localStorageValue = Y.doccirrus.utils.localValueGet( 'printers'),
                    localStoragePrinters;

                if (localStorageValue) {
                    localStoragePrinters = JSON.parse(localStorageValue);
                }

                if( err ) {
                    //  allow the user to select another printer and try again

                    retryMsg = retryMsg.replace( '%%PRINTERNAME%%', document.printerName() );
                    retryMsg = retryMsg.replace( '%%PDFLINK%%', Y.doccirrus.infras.getPrivateURL( pdfLink ) );

                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: printMessageId,
                        content: retryMsg,
                        level: 'ERROR'
                    } );

                    //self.showPrinterSelectModal( onChangePrinterSelection, retryMsg, printerName );
                    return;
                }

                Y.doccirrus.jsonrpc.api.activity.incrementPrintCount({
                    activityIds: [unwrap( currentActivity._id )],
                    numCopies: numCopies || 1
                });

                data = data.data ? data.data : data;
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
                window.setTimeout( function() { Y.doccirrus.DCSystemMessages.removeMessage( printMessageId ); }, Y.dcforms.PRINT_MSG_TIMEOUT );

                //  Update / confirm print settings for this location
                if ( selectedCanonicalId && selectedLocationId && '' !== selectedCanonicalId && '' !== selectedLocationId ) {
                    Y.doccirrus.comctl.privatePost( '/1/formprinter/:setsingle', configUpdate, onPrinterConfigSaved );

                    if ( selectedPrinter !== peek( self.kopbForm.printerName ) ) {
                        self.kopbForm.printerName( selectedPrinter );
                        self.kopbForm.updateMenu();
                    }
                }

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

            function onPrinterConfigSaved( err ) {
                if ( err ) {
                    Y.log( 'Could nto update printer config for current user: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }
                Y.log( 'Updated printer config for current user.', 'debug', NAME );

                //  reload formprinter assignments, since these may have een changed by printer response
                self.kopbForm.loadFormPrinters( function onFormPrintersReload( err ) {
                    if ( err ) {
                        Y.log( 'Could not reload formprinter assignment: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    Y.log( 'Checked formprinter reassignment after print: ' + JSON.stringify( err ) );
                    self.kopbForm.updateMenu();
                } );
            }
        },

        printCopies: function( selectedPrinter, numCopies ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),

                printOptions = {
                    mapCollection: 'activity',
                    mapObject: ko.unwrap( currentActivity._id ),
                    formId: ko.unwrap( currentActivity.formId ),
                    formVersionId: ko.unwrap( currentActivity.formVersion ),

                    saveTo: 'temp',
                    printTo: selectedPrinter,
                    printCopies: numCopies,
                    waitCallback: false
                };

            Y.doccirrus.jsonrpc.api.formtemplate.printpdfcopyws( printOptions ).then( onPrintCopies ).fail( onPrintFail );

            function onPrintCopies( /* response */ ) {
                Y.log( 'Printed ' + numCopies + ' copies with mask to ' + selectedPrinter + '.', 'info', NAME );
            }

            function onPrintFail( err ) {
                //  server should raise a websocket event which will display a system message
                Y.log( 'Probblem printing copies: ' + JSON.stringify( err ), 'error', NAME );
            }

        },

        /**
         *  Regenerate the PDF, update attachments but do nothing else
         */

        regeneratePDFAndUpdate: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel,
                latestPDFDocument = attachments.getLatestPdf();

            if( latestPDFDocument && !currentActivity._isEditable() ) {

                return Promise.resolve( latestPDFDocument );

            } else {

                Y.log( 'No PDF is available for display, making a new one', 'info', NAME );

                return self.trySaveActivity()
                    .then( function( /* savedActivity */ ) {
                        self.pdfDebug( 'Generating PDF... ' );
                        return self.regeneratePDF();
                    } )
                    .then( function( newMediaId ) {
                        self.pdfDebug( 'Updating attachments... ' );
                        Y.log( 'Created new PDF: ' + newMediaId, 'debug', NAME );
                        return attachments.updateFromServer( currentActivity );
                    } )
                    .then( function() {
                        latestPDFDocument = attachments.getLatestPdf();
                        return Promise.resolve( latestPDFDocument );
                    } );
            }
        },

        /**
         *  Make a new PDF from the current activity (assumes it has been saved first)
         *
         *  @param  printerName     {String}    Optional, name of printer to send the PDF to
         *  @param  userLocationId  {String}    Optional, current location of user for printer config
         *
         *  @returns {Promise}
         */

        regeneratePDF: function( printerName, userLocationId ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentActivityId = unwrap( currentActivity._id ),
                tempStatus = unwrap( currentActivity.status );

            return new Promise( function( resolve, reject ) {
                var
                    postArgs = {
                        'serialRender': 'true',
                        'formId': unwrap( currentActivity.formId ),
                        'formVersionId': unwrap( currentActivity.formVersion ),
                        'mapCollection': 'activity',
                        'mapObject': unwrap( currentActivity._id )
                    };

                if ( currentActivityId && !binder.getCurrentPdfJob( currentActivityId ) ) {
                    binder.currentPdfJobs.push( {
                        'activityId': currentActivityId,
                        'type': 'PDF'
                    } );
                }

                if ( printerName && '' !== printerName ) {
                    Y.log( 'If generated, the PDF will be printed by: ' + printerName, 'debug', NAME );
                    postArgs.printTo = printerName;
                }

                if ( userLocationId && '' !== userLocationId ) {
                    Y.log( 'User location for print settings: ' + userLocationId, 'debug', NAME );
                    postArgs.userLocationId = userLocationId;
                }

                function onMakePDF( wsResponse ) {
                    Y.log( 'created PDF: ' + JSON.stringify( wsResponse ), 'debug', NAME );

                    if( 'error' === wsResponse.status ) {
                        reject( wsResponse.err );
                        return;
                    }

                    var mediaId = wsResponse.mediaId || '';

                    //  current activity changed while PDF was being generated, just update the table and we're done
                    if( wsResponse.activity._id !== currentActivityId ) {
                        Y.log( 'Activity has changed since PDF generation was requested, updating data table only.', 'debug', NAME );
                        Y.fire( 'activityPDFChange', {
                            model: currentActivity,
                            mediaId: mediaId
                        } );
                        return;
                    }

                    //  update activity fields which were changed on the server by addition of PDF
                    if( wsResponse && wsResponse.activity && wsResponse.activity.attachments ) {
                        currentActivity.attachments( wsResponse.activity.attachments );
                        currentActivity.attachedMedia( wsResponse.activity.attachedMedia );
                        currentActivity.formPdf( wsResponse.activity.formPdf );

                        currentActivity.status( tempStatus );
                        currentActivity.setNotModified();
                    } else {
                        Y.log( 'Activity not returned from server after PDF generation', 'warn', NAME );
                    }

                    self.wsPdfCallback = null;
                    resolve( mediaId );
                }

                self.wsPdfCallback = onMakePDF;

                var startTime = new Date().getTime();

                Y.doccirrus.jsonrpc.api.formtemplate
                    .makepdfws( postArgs )
                    .then( function( result ) {
                        Y.log( 'JSONRPC callback from makepdfws: ' + JSON.stringify( result ), 'debug', NAME );
                        var endTime = new Date().getTime();

                        Y.log( 'pdf render time: ' + (endTime - startTime), 'debug', NAME );
                    } );
            } );

        },

        /**
         *  Pop a modal to allow the user to select from available printers
         *
         *  @param  callback        {Function}  Of the form fn( printerName)
         *  @param  msg             [String]    Optional alternative message for dialog
         *  @param  defaultPrinter  [String]    Optional, preselect printer to use
         */

        showPrinterSelectModal: function( callback, msg, defaultPrinter ) {

            //  TODO: remove - use choosePrinter initially, then system messages on status return

            var
                self = this,
                selectPrinterModal,
                printers = self.locationPrinters(),
                selected = '',
                html = '',
                i;

            for( i = 0; i < printers.length; i++ ) {
                selected = ( printers[i] === defaultPrinter ) ? ' selected="selected"' : '';
                html = html + '<option value="' + printers[i] + '"' + selected + '>' + printers[i] + '</option>\n';
            }

            if( !msg || '' === msg ) {
                msg = '' +
                      i18n( 'InCaseMojit.casefile_exports.print_modal.printerSelect_1' ) + '  ' +
                      i18n( 'InCaseMojit.casefile_exports.print_modal.printerSelect_2' );
            }

            html = msg + '<br/><br/><select class="form-control" id="selPrinterFromModal">' + html + '</select>';

            selectPrinterModal = Y.doccirrus.DCWindow.notice( {
                type: 'info',
                title: i18n( 'InCaseMojit.casefile_exports.print_modal.title' ),        //  translateme
                message: html,
                window: {
                    width: 'medium',
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                disabled: false,
                                action: onPrinterModalOKClick
                            } )
                        ]
                    }
                }
            } );

            function onPrinterModalOKClick() {
                //onPrinterChosen( $( '#selPrinterFromModal' ).val() );
                callback( $( '#selPrinterFromModal' ).val() );              //  eslint-disable-line
                selectPrinterModal.close();
            }
        },

        /**
         *  Pop an info modal to report that notprinters are available at this location
         */

        showNoPrinterModal: function() {
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: i18n( 'InCaseMojit.casefile_exports.print_modal.no_printers_for_location' ),
                window: {
                    width: 'medium'
                }
            } );
        },

        //  KO handlers bound in DOM

        /**
         *  Generate PDF and open in a new tab
         *  This will involve saving the current activity to the server for the PDF to be generated
         *  UI will be blocked by a modal while this happens
         */

        btnGeneratePDFClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel,
                currentActivity = unwrap( binder.currentActivity ),
                caseFolder = currentActivity.initialConfig.caseFolder,
                newTab;

            function openTab() {
                newTab = window.open( throbberImg, '_blank' );
                binder.pdfRenderInProgress( true );
                self.openPDFInNewTab( newTab ).then( function() {
                    self.pdfDebug( 'Ready' );
                } );
            }

            if (!self.allowPDFCreation()) { return; }

            if( !currentActivity.formId || '' === unwrap( currentActivity.formId ) ) {
                //  activity does not have a form, can't make a PDF from it
                return;
            }

            var sumexPdfDoc = attachments.findDocument( 'SUMEXPDF' );
            if(sumexPdfDoc) {
                window.open( sumexPdfDoc.fullUrl(), '_blank' );
                return;
            }
            if(Y.doccirrus.schemas.casefolder.isSwissCaseFolderType(caseFolder.type)) {
                if(unwrap(currentActivity.actType).includes('INVOICE')) {
                    Y.doccirrus.jsonrpc.api.invoicelog.getPdfFromInvoice( {
                        invoice: currentActivity,
                        lastSchein: currentActivity.initialConfig.lastSchein,
                        caseFolder: caseFolder
                    } ).done( function( response ) {
                        window.open( response.data.fullUrl, '_blank' );
                        Y.fire( 'activityPDFChange', {} );
                    } ).fail( function( error ) {
                        self.showError( error );
                    } );
                } else if(unwrap(currentActivity.actType) === 'REMINDER' || unwrap(currentActivity.actType).includes('WARN')) {
                    Y.doccirrus.jsonrpc.api.warning.generateSumexDocuments( {
                        warning: currentActivity
                    } ).done( function( response ) {
                        window.open( response.data.fullUrl, '_blank' );
                        Y.fire( 'activityPDFChange', {} );
                    } ).fail( function( error ) {
                        self.showError( error );
                    } );
                } else {
                    openTab();
                }
            } else {
                if( currentActivity.actType() === 'KBVUTILITY2' ) {
                    currentActivity.createDiagnoses().then( function() {
                        if( peek( currentActivity.hasWarnings ) ) {
                            currentActivity.showWarnings();
                        }
                        openTab();
                    } );
                } else {
                    openTab();
                }
            }
        },
        showError: function (error) {
            var message = error.message, texts;
            if (error && error.message) {
                if (Array.isArray(message) && message.length) {
                    texts = message.map(function(m){
                        return m.text;
                    });
                    message = texts.join('</br>');
                } else if(message.code) {
                    message = Y.doccirrus.errorTable.getMessage( message );
                }

                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: message,
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                    isDefault: false
                                })
                            ]
                        }
                    }
                } );
            } else {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            }
        },
        onServerPDFGeneration: function( data ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentView = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( currentView.activityDetailsViewModel );

            //Y.log( 'PDF regenerated after approval, restoring PDF buttons' + '\n' + JSON.stringify( data ), 'debug', NAME );
            binder.pdfRenderInProgress( false );
            self.pdfDebug( 'PDF generated on server' );

            if( !currentActivity || !currentActivity.status || !currentActivity.status() ) {
                //  can happen during quickprint, when navigating away from activity
                //  just raise the event to reload the table to show the new PDF
                Y.fire( 'activityPDFChange', {
                    model: currentActivity,
                    mediaId: data.mediaId
                } );
                return;
            }

            if ( data.activity._id && data.activity._id !== unwrap( currentActivity._id ) ) {
                Y.log( 'PDF attached to a different activity, current activity not affected.', 'debug', NAME );
                return;
            }

            var tempStatus = currentActivity.status();

            if( data && data.activity && data.activity.attachments ) {
                currentActivity.attachments( data.activity.attachments );
                currentActivity.attachedMedia( data.activity.attachedMedia );
                currentActivity.formPdf( data.activity.formPdf );
                currentActivity.status( tempStatus );
                currentActivity.setNotModified();
            } else {
                Y.log( 'Activity not returned from server after PDF generation', 'warn', NAME );
            }

            var removed = activityDetailsVM.attachmentsModel.documents.removeAll();
            removed.forEach( function( doc ) {
                doc.destroy();
            } );

            //  reload attachments
            return activityDetailsVM.attachmentsModel
                .loadFromActivity( currentActivity )
                .then( function() {

                    Y.fire( 'activityPDFChange', {
                        model: currentActivity,
                        mediaId: data.mediaId
                    } );

                    currentActivity.status( tempStatus );
                    currentActivity.setNotModified();

                    //Y.log( 'updated attached documents after PDF regeneration on approve: ' + currentActivity.status(), 'debug', NAME );
                    return Promise.resolve( true );
                } );
        },

        btnPrintActivityTextClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                activityId = peek( currentActivity._id ),
                contentToPrint = $( '#divCurrentActivitySectionViewModel' ).clone();


            if( activityId ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.setPrintedFlag( {
                    activityId: activityId
                } ) ).catch( function( err ) {
                    Y.log( 'could set print flag: ' + err, 'error', NAME );
                } );
            }
            contentToPrint.find( 'input, select' ).replaceWith( function() {
                var el = $( this );
                if( el.is( '[type="checkbox"]' ) || el.is( '[type="radio"]' ) ) {
                    if( this.checked ) {
                        return el.attr( 'checked', true );
                    }
                } else if( el.is( 'select' ) ) {
                    return '<div>' + $( 'select[name="' + this.name + '"] :selected' ).text() + '</div>';
                } else {
                    return '<div>' + el.val() + '</div>';
                }
            } );

            contentToPrint.find( '.eDocPrintOnly' ).show();

            var printWindow = window.open( '', '_blank', 'height=800,width=800,status=no,toolbar=no,scrollbars=yes,menubar=no,location=no' );
            printWindow.opener = null;

            printWindow.document.write( '<html><head><title></title>' );
            printWindow.document.write( '<link rel="stylesheet" href="/static/dcbaseapp/assets/lib/bootstrap/3.1.1/css/bootstrap.min.css" type="text/css" />' );
            printWindow.document.write( '<style>@media print {.printBtn{ display: none} } @media screen{.printBtn{border-bottom: 1px solid black; display: block; padding: 10px;}}.form-control-feedback,.input-group-addon,.select2-container{display: none !important;}label{color: black !important;}.form-control{border: 1px solid black !important;}</style>' );
            printWindow.document.write( '</head><body >' );
            printWindow.document.write( '<div class="printBtn"><button onclick="window.print();">' + i18n( 'InCaseMojit.casefile_browser.menu.PRINT' ) + '</button></div>' );
            printWindow.document.write( contentToPrint.html() );
            printWindow.document.write( '</body></html>' );
            printWindow.focus();

            // firefox never stops loading the page, so print is not possible
            setTimeout( function() {
                printWindow.stop();
            }, 700 );
        },

        btnCreatePrintTaskClick: function() {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            if( !currentActivity._id || !currentActivity._id() ) {
                //  must save first
                self.trySaveActivity()
                    .then( function( savedActivity ) {
                        if( savedActivity && unwrap( currentActivity._id ) ) {
                            self.showTaskModal( 'PRINT' );
                        }
                    } );

            } else {
                self.showTaskModal( 'PRINT' );
            }
        },

        btnCreateTranscriptionTaskClick: function() {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );

            if( !currentActivity._id || !currentActivity._id() ) {
                //  must save first
                self.trySaveActivity()
                    .then( function( savedActivity ) {
                        if( savedActivity && unwrap( currentActivity._id ) ) {
                            self.showTaskModal( 'TRANSCRIBE' );
                        }
                    } );

            } else {
                self.showTaskModal( 'TRANSCRIBE' );
            }
        },
        getTemplate: function() {
            var
                binder = this.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = caseFileVM && unwrap( caseFileVM.activityDetailsViewModel ) || {},
                template = activityDetailsVM.template || {};
            return template;
        },
        btnBackDisabled: ko.observable(),
        btn100Disabled: ko.observable(),
        btnViewDisabled: function() {
            var self = this;
            switch( self.btnViewAction() ) {
                case 'preview':
                case 'zoomIn':
                case 'zoomOut':
                    return false;
                case 'back':
                    return self.btnBackDisabled();
                case 'view100':
                    return self.btn100Disabled();
            }
        },
        btnViewClick: function() {
            switch( this.btnViewAction() ) {
                case 'preview':
                    this.btnPreviewForm();
                    break;
                case 'zoomIn':
                    this.btnZoomForm( 1 );
                    break;
                case 'zoomOut':
                    this.btnZoomForm( -1 );
                    break;
                case 'back':
                    this.btnFitPageForm();
                    break;
                case 'view100':
                default:
                    this.btnZoom100Form();
            }
        },
        getSizePcnt: function(){
            var
                self  = this,
                template = self.getTemplate(),
                px = template.px || {},
                paperWidth  = template.paper && template.paper.width || 0,
                percent = paperWidth * 3.7795275591 / 100;
            return percent ? Math.round( px.width / percent ) : 0;
        },
        btnZoomForm: function( delta ) {
            if( !delta ){
                return;
            }
            var
                self  = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                template = self.getTemplate(),
                px = template.px || {},
                paperWidth  = template.paper && template.paper.width || 0,
                percentDelta = paperWidth * 3.7795275591 / 10,
                newWidth = px.width + percentDelta * delta,
                pcnt;

            if( px.width && newWidth > 500 && newWidth < 5000 ){
                template.resize( newWidth, function(){
                    $( "#" + template.domId ).width( newWidth );
                    template.px.resizedWidth = newWidth;
                    template.render( function(){} );
                    localStorage.setItem( 'defaultViewWidth.' + currentActivity.actType() + '.' + paperWidth.toString(), newWidth.toFixed(2) );
                    pcnt = self.getSizePcnt();
                    self.pcntWidth( pcnt );
                    self.btn100Disabled( 100 === pcnt );
                    self.btnBackDisabled( false );
                } );
            }
        },
        btnZoom100Form: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                template = self.getTemplate(),
                paper = template.paper,
                newWidth,
                pcnt;

            if( paper.width ){
                newWidth = paper.width * 3.7795275591;
                template.resize( newWidth, function(){
                    $( "#" + template.domId ).width( newWidth );
                    template.px.resizedWidth = newWidth;
                    template.render( function(){} );

                    localStorage.setItem( 'defaultViewWidth.' + currentActivity.actType() + '.' + paper.width.toString(), newWidth.toFixed(2) );
                    pcnt = self.getSizePcnt();
                    self.pcntWidth( pcnt );
                    self.btn100Disabled( 100 === pcnt );
                    self.btnBackDisabled( false );
                } );
            }
        },
        btnFitPageForm: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                template = self.getTemplate(),
                paper = template.paper,
                formOuterDiv = $( '#' + template.domId ).parent(),
                containerWidth = formOuterDiv && Math.floor( formOuterDiv.width() ),
                newWidth,
                pcnt;

            if( containerWidth && containerWidth !== ( template.px && template.px.width ) ){
                newWidth = containerWidth;
                template.resize( newWidth, function(){
                    $( "#" + template.domId ).width( newWidth );
                    template.px.resizedWidth = newWidth;
                    template.render( function(){} );

                    localStorage.setItem( 'defaultViewWidth.' + currentActivity.actType() + '.' + paper.width.toString(), newWidth.toFixed(2) );
                    pcnt = self.getSizePcnt();
                    self.pcntWidth( pcnt );
                    self.btn100Disabled( 100 === pcnt );
                    self.btnBackDisabled( true );
                } );
            }
        },
        btnPreviewForm: function() {
            var
                //self = this,
                editTemplate = this.getTemplate(),
                modal,
                node,

                btnConfirm = {
                    name: 'CLOSE',
                    isDefault: true,
                    action: onCloseButtonClick
                },

                modalConfig = {
                    className: 'DCWindow-editForm',
                    title: i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.FORM_PREVIEW' ),
                    bodyContent: null,
                    icon: Y.doccirrus.DCWindow.ICON_EDIT,
                    width: '95%',
                    height: '85%',
                    minHeight: 150,
                    minWidth: 1024,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: false,
                    resizeable: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close' ],
                        footer: [ btnConfirm ]
                    }
                },

                formOptions = {
                    'canonicalId': editTemplate.canonicalId, //  formtemplate with role 'casefile-terminliste',
                    'formVersionId': editTemplate.formVersionId, //  latest version of this form
                    'divId': 'divFormsComposeModal', //  div to render into, in modal
                    'doRender': false //  we will call template.render after load
                },

                template,
                width = editTemplate.paper.width * 3.7795275591,
                mapper;

            async.series(
                [
                    loadJadeTemplate,
                    createModal,
                    getFormMeta,
                    createFormTemplate,
                    resizeAndRenderForm
                ],
                onModalReady
            );

            function onModalReady(){

            }

            function loadJadeTemplate( itcb ) {
                Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'InCaseMojit/views/CaseFileViewModel/activitySection/ActivitySectionFormViewModelModal' } )
                    .then( onJadeTemplateLoaded );

                function onJadeTemplateLoaded( response ) {
                    node = Y.Node.create( response.data );
                    modalConfig.bodyContent = node;
                    itcb( null );
                }
            }

            function createModal( itcb ) {
                modal = new Y.doccirrus.DCWindow( modalConfig );
                modal.on( 'visibleChange', function( event ) {
                    if( false === event.newVal ) {
                        if( mapper ) {
                            mapper.destroy();
                        }
                        if( template ) {
                            template.destroy();
                        }
                    }
                } );

                function BackMappingVm() {}

                ko.applyBindings( new BackMappingVm(), document.querySelector( '#divFormEdit' ) );

                itcb( null );
            }


            //  (X) look up form metadata
            function getFormMeta( itcb ) {
                Y.dcforms.getFormListing( '', formOptions.canonicalId, onFormMetaLoaded );

                function onFormMetaLoaded( err, formMeta ) {

                    if( err ) {
                        //  TODO: translateme
                        //node.setHTML( i18n( prefix + 'NO_FORM' ) );
                        //  TODO: notice asking the user to create/assign a form for this activity type
                        return itcb( null );
                    }

                    formOptions.formVersionId = formMeta.latestVersionId;

                    //Y.log( 'Adding form Appointment List form modal: ' + formOptions.canonicalId, 'debug', NAME );
                    itcb( null );
                }
            }

            //  (X) instantiate and load the form
            function createFormTemplate( itcb ) {
                //  if no form to look up then we can skip this step

                formOptions.callback = onFormTemplateCreated;
                Y.dcforms.createTemplate( formOptions );

                function onFormTemplateCreated( err, newFormTemplate ) {
                    if ( !err && !newFormTemplate ) { err = 'Could not create form template'; }
                    if ( err ) { return itcb( err ); }

                    template = newFormTemplate;
                    template.highlightEditable = false;
                    template.fromDict( editTemplate.toDict() );
                    template.mode = 'locked';
                    itcb( null );
                }
            }


            //  (X) instantiate the mapper
            function resizeAndRenderForm( itcb ) {
                template.resize( width,  onRedrawComplete );

                function onRedrawComplete() {
                    modal.centered();
                    template.setSelected( 'fixed', null );
                    template.render( itcb );
                }
            }

            //  EVENT HANDLERS
            function onCloseButtonClick() {
                modal.close();
            }
        },

        btnQuickPrintClick: function( numCopies ) {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentView = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( currentView.activityDetailsViewModel ),
                url = '/1/activity/:quickprint',
                printerName = peek( self.kopbForm.printerName ),
                postArgs = {
                    activity: currentActivity.toJSON(),
                    attachments: [],
                    numCopies: parseInt( numCopies, 10 ) || 0,
                    printerName: printerName
                };

            //  we can't quickprint if there are no printers at this activity's location

            activityDetailsVM.attachmentsModel.documents().forEach( function addDocumentToSave( doc ) {
                postArgs.attachments.push( doc.toJSON() );
            } );

            Y.log( 'Added documents to quicksave: ', postArgs.attachments.length, 'debug', NAME );

            Y.log( 'Quickprint will use printer: ' + printerName, 'debug', NAME );
            Y.doccirrus.comctl.privatePost( url, postArgs, onQuickPrintReturned );
            function onQuickPrintReturned( err, result ) {
                if( err ) {
                    Y.log( 'Error on quickprint: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    return;
                }

                if( -1 !== ['VALID', 'CREATED', 'DISPATCHED'].indexOf( result.newState ) ) {
                    //  should never happen
                    Y.log( 'Error on quickprint, invalid status, not navigating: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                var
                    isNew = (
                        !currentActivity._id || !unwrap( currentActivity._id ) ||
                        '' === unwrap( currentActivity._id ) ||
                        'new' === unwrap( currentActivity._id )
                    ),
                    activity = result.data,
                    transitionDescription = {
                        'newStatus': result.newState,
                        'transition': 'bill'
                    };

                //  inTransition property prevents spurious action by the mappers due to .set updating things
                currentActivity.inTransition( true );

                currentActivity.set( 'data', activity );
                currentActivity.inTransition( false );
                currentActivity.setNotModified();

                activityDetailsVM.activityActionButtonsViewModel.documentNeedsSave( false );

                Y.fire( 'activityTransitioned', {
                    model: currentActivity,
                    data: activity,
                    patientId: currentActivity.patientId(),
                    transitionDescription: transitionDescription,
                    isNew: isNew,

                    refreshCaseFolder: true,

                    //  redirect back to case folder
                    skipRedirectBack: false,
                    forceRedirectBack: true
                } );

                if( isNew && activity._id ) {
                    //  we now have an _id for this activity, add it to hash fragment in URL
                    window.location.hash = window.location.hash = '/activity/' + activity._id;
                }

                return activity;
            }

        },

        createCopyDialog: function() {
            var self = this;
            Y.doccirrus.DCWindow.prompt( {
                'title': i18n( 'KoUI.KoPrintButton.HOW_MANY_COPIES' ),
                'callback': onPromptCompleted
            } );
            function onPromptCompleted( evt ) {
                var
                    userInput = evt.data ? evt.data : 0,
                    confirmMsg ;

                userInput = parseInt( userInput, 10 );
                if ( isNaN( userInput ) || userInput < 1 ) { return; }

                if ( userInput > 9 ) {
                    confirmMsg = i18n( 'KoUI.KoPrintButton.CONFIRM_MANY_COPIES' );
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

                    self.btnQuickPrintClick( userInput );
                }

            }
        },

        /**
         *  Pop a dialog to show other forms from this patient, with the option to insert data into the current form
         *
         *  If an activity is selected then the modal should call onFormDocSelected and we pass that to the form
         */

        btnPrefillClick: function() {

            function onFormDocSelected( formDoc ) {
                var
                    binder = self.get( 'binder' ),
                    caseFileVM = unwrap( binder.currentView ),
                    actDetailsVM = caseFileVM ? unwrap( caseFileVM.activityDetailsViewModel ) : null,
                    formSectionVM = actDetailsVM ? unwrap( actDetailsVM.currentActivitySectionViewModel ) : null;

                if( !formSectionVM || !formSectionVM.setFormState ) {
                    Y.log( 'Cannot prefill form data, form not open', 'warn', NAME );
                    return;
                }

                formSectionVM.setFormState( formDoc );
            }

            var
                self = this,
                binder = self.get( 'binder' ),
                modalOptions = {
                    'currentPatient': unwrap( binder.currentPatient ),
                    'currentActivity': unwrap( binder.currentActivity ),
                    'onFormDocSelected': onFormDocSelected
                };

            Y.doccirrus.modals.prefillFormActivity.show( modalOptions );
        },

        /**
         *  Print the current MMI PDF
         *
         *  PDF Documents produced from MMI have type MEDICATIONPLAN
         */

        btnMedicationplanPrintClick: function() {
            var
                self = this,
                mmiDoc = self.getMedicationsplanDoc(),
                binder = self.get( 'binder' ),
                activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                currentActivity = peek( binder.currentActivity ),
                currentActivitySectionViewModel,
                medicationPlanEditor,
                medications = [],
                data;

            if ( !mmiDoc ) {
                Y.log( 'No MMI document found.', 'warn', NAME );
                currentActivitySectionViewModel = peek( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel );
                medicationPlanEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor );
                data = medicationPlanEditor && medicationPlanEditor.medicationTable && peek( medicationPlanEditor.medicationTable.rows ) || [];
                if ( medicationPlanEditor && ( currentActivity.isNew() || currentActivity.isModified() ) ) {
                    data.forEach( function( viewModel ) {
                        if( viewModel.isModified() || viewModel.isNew() ) {
                            medications.push( viewModel.toJSON() );
                        }
                    } );
                    Y.doccirrus.jsonrpc.api.activity.saveMedicationPlan( {
                        data: {
                            medicationPlan: currentActivity.toJSON(),
                            medications: medications
                        }
                    } )
                        .done( function( res ) {
                            var data = res && res.data;
                            currentActivity.setNotModified();
                            mmiDoc = self.getMedicationsplanDoc();
                            if ( data ) {
                                binder.navigateToActivity( {activityId: data} );
                            }
                            if( !mmiDoc ) {
                                return;
                            }
                            openPdfModal();
                        })
                        .fail( function( error ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                }
            } else {
                openPdfModal();
            }

            function openPdfModal() {
                var pdfUrl = unwrap( mmiDoc.url );

                Y.doccirrus.modals.printPdfModal.show( {
                    'documentUrl': pdfUrl,
                    'documentFileName': pdfUrl.replace( '/media/', '' ),
                    'mediaId': unwrap( mmiDoc.mediaId ),
                    'cacheFile': pdfUrl,
                    'formRole': 'casefile-medicationplan-table'
                } );
            }
        },

        /**
         *  Print the current MMI PDF
         *
         *  PDF Documents produced from MMI have type MEDICATIONPLAN
         */

        btnKBVMedicationPlanPrintClick: function() {
            var
                self = this,
                mmiDoc = self.getMedicationsplanDoc();

            if ( !mmiDoc ) {
                Y.log( 'No MMI document found.', 'warn', NAME );
            } else {
                openPdfModal();
            }

            function openPdfModal() {
                var pdfUrl = unwrap( mmiDoc.url );

                Y.doccirrus.modals.printPdfModal.show( {
                    documentUrl: pdfUrl,
                    documentFileName: pdfUrl.replace( '/media/', '' ),
                    mediaId: unwrap( mmiDoc.mediaId ),
                    cacheFile: pdfUrl,
                    formRole: 'casefile-medicationplan-table'
                } );
            }
        },

        getMedicationsplanDoc: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentView,
                activityDetailsVM,
                attachments,
                mmiDoc;

            currentView = unwrap( binder.currentView );
            if ( !currentView ) { return null; }
            activityDetailsVM = unwrap( currentView.activityDetailsViewModel );
            if ( !activityDetailsVM ) { return null; }
            attachments = activityDetailsVM.attachmentsModel;
            if ( !attachments ) { return null; }

            mmiDoc = attachments.findDocument( 'MEDICATIONPLAN' );

            return mmiDoc;
        },

        /**
         *  Process of closing a pregnancy casefolder
         *
         *      (*) Request reason the pregnancy has ended,
         *      (*) Create note to record end of pregnancy
         *      (*) Approve gravidogramm (?)
         *      (*) Lock the casefolder
         *      (*) navigate to locked casefolder (?)
         *
         *  Locking the casefolder should cause the server to end pregnancy in latest patient MEDDATA and clear
         *  GRAVIDOGRAMM data from patient
         */

        btnEndPregnancyCaseClick: function() {
            var
                self = this,
                REASON_TO_CANCEL = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.REASON_PREGNANCY_END' ),
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                reasonToClose = '';

            async.series( [ requestReason, lockCasefolder ], onAllDone );

            function requestReason( itcb ) {
                Y.doccirrus.modals.endPregnancy.show( { 'message': REASON_TO_CANCEL, callback: onReasonGiven } );

                function onReasonGiven( response ) {
                    reasonToClose = response.data ? response.data : response;
                    if ( !reasonToClose || '' === reasonToClose ) {
                        return;
                    }
                    itcb( null );
                }
            }

            function lockCasefolder( itcb ) {
                var
                    lockParams = {
                        'caseFolderId': unwrap( currentCaseFolder._id ),
                        'reasonToClose': reasonToClose
                    };

                Y.doccirrus.jsonrpc.api.casefolder
                    .lockPregnancyCaseFolder( lockParams )
                    .then( onCaseFolderLocked )
                    .fail( itcb );

                function onCaseFolderLocked( result ) {
                    //  Reload activity table and mark the casefolder as locked
                    currentCaseFolder.disabled = true;

                    var caseFolderItems = currentPatient.caseFolderCollection.items(), i;

                    for ( i = 0; i < caseFolderItems.length; i++ ) {
                        if (caseFolderItems[i]._id === currentCaseFolder._id ) {
                            caseFolderItems[i].disabled = true;
                        }
                    }

                    currentPatient.caseFolderCollection.items( caseFolderItems );

                    Y.log( 'Locked casefolder, reloading: ' + JSON.stringify( result.data ), 'debug', NAME );
                    Y.fire( 'activityCopied', result );
                    itcb( null);
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not close pregnancy casefolder: ' + JSON.stringify( err ), 'warn', NAME );
                    //  TODO: modal / notice to user here?
                    return;
                }
            }

        },

        btnReopenPregnancyCaseClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab();

            var
                unlockParams = {
                    query: { '_id': unwrap( currentCaseFolder._id ) }
                };

            Y.doccirrus.jsonrpc.api.casefolder
                .unlockPregnancyCaseFolder( unlockParams )
                .then( onCaseFolderLocked )
                .fail( onUnlockFail );

            function onCaseFolderLocked( result ) {
                //  Reload activity table and mark the casefolder as unlocked
                currentCaseFolder.disabled = false;

                var caseFolderItems = currentPatient.caseFolderCollection.items(), i;

                for ( i = 0; i < caseFolderItems.length; i++ ) {
                    if (caseFolderItems[i]._id === currentCaseFolder._id ) {
                        caseFolderItems[i].disabled = false;
                    }
                }

                currentPatient.caseFolderCollection.items( caseFolderItems );

                Y.log( 'Unlocked casefolder, reloading: ' + JSON.stringify( result.data ), 'debug', NAME );
                Y.fire( 'activityCopied', result );
            }

            function onUnlockFail( err ) {
                Y.log( 'Could not unlock casefolder: ' + JSON.stringify( err ), 'warn', NAME );
            }
        },

        showTaskModal: function( taskType ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                currentActivity = unwrap( binder.currentActivity ),

                taskTemplate = {
                    patientId: peek( currentPatient._id ),
                    patientName: Y.doccirrus.schemas.person.personDisplay( {
                        firstname: peek( currentPatient.firstname ),
                        lastname: peek( currentPatient.lastname ),
                        title: peek( currentPatient.title )
                    } ),
                    activityId: peek( currentActivity._id ),
                    activityType: peek( currentActivity.actType )
                };

            if ( taskType ) {
                taskTemplate.type = taskType;
            }

            Y.doccirrus.modals.taskModal.showDialog( taskTemplate, onTaskModalClosed );

            function onTaskModalClosed() {
                Y.log( 'Task modal closed, current patient is: ' + unwrap( currentPatient._id ) );
            }
        },

        setLocationPrinters: function() {

            var
                self = this,
                binder = self.get( 'binder' ),
                locations = binder.getInitialData( 'location' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentLocationId = currentActivity.locationId();

            self.locationPrinters.removeAll();

            if( currentLocationId && locations ) {
                locations.forEach( function( location ) {
                    if( location._id === currentLocationId && location.enabledPrinters ) {
                        location.enabledPrinters.forEach( function( printerName ) {
                            self.locationPrinters.push( printerName );
                        } );
                    }
                } );
            }

            if( self.locationPrinters().length > 0 ) {
                self.havePrinters( true );
                self.printToolTip( '' );
            } else {
                self.havePrinters( false );
                self.printToolTip( i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.NO_PRINTERS' ) );
            }
        },
        /**
         * Open the new modal to edit current form with preview and toolbox
         */
        btnOpenToolboxClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                currentActivity = unwrap( binder.currentActivity ),
                activityDetailsVM = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ),
                currentActivitySectionViewModel = peek( activityDetailsVM && activityDetailsVM.currentActivitySectionViewModel ),
                currentActivityEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                caseFileVM = unwrap( binder.currentView ),
                linkedActivities = caseFileVM && caseFileVM.activitiesTable && caseFileVM.activitiesTable.getComponentColumnLinked();

            Y.doccirrus.modals.formToolbox.show( {
                binder: binder,
                editTemplate: this.getTemplate(),
                currentActivityEditor: currentActivityEditor,
                activity: currentActivity,
                patient: currentPatient,
                activitySectionViewModel: currentActivitySectionViewModel,
                linkedActivities: linkedActivities } );
        }
    }, {
        NAME: 'ActivityHeadingButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityHeadingButtonsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcutils',
        'dcauth',
        'DcGestationDataModal',
        'dcprefillmodal',
        'chooseprinter-modal',
        'endpregnancymodal',
        'formtoolbox-modal',
        'KoMenu',
        'WYSWYGViewModel',
        'DCFsmDefault'
    ]
} );
