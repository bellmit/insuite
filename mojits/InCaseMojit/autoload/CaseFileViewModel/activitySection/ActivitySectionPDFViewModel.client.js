/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'ActivitySectionPDFViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' ),

        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class ActivitySectionPDFViewModel
     * @extends ActivitySectionViewModel
     */
    function ActivitySectionPDFViewModel() {
        ActivitySectionPDFViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionPDFViewModel, ActivitySectionViewModel, {
        templateName: 'ActivitySectionPDFViewModel',

        hasPdf: null,
        hasForm: null,
        formDoc: null,
        latestPdf: null,
        latestPdfLink: null,
        isShareable: null,
        isNotShareable: null,
        isShared: null,
        isNotShared: null,
        inToggle: null,
        pdfRenderInProgress: null,

        //  debug
        //hasPdfText: null,
        //hasFormText: null,
        //isSharedText: null,

        documentsSubscription: null,

        /** @protected */
        initializer: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity );
            
            self.latestPdf = ko.observable( null );

            self.hideLinksOfPrintedPDF = function() {
                let activitySettings = binder.getInitialData( 'activitySettings' ),
                    currentActivitySettings = activitySettings.find( setting => setting.actType === currentActivity.actType() );

                return currentActivitySettings && currentActivitySettings.hideLinksOfPrintedPDF;
            };

            self.latestPdfUrl = ko.computed( function() {
                var latestPdf = self.latestPdf();
                return (latestPdf && latestPdf.url() && !self.hideLinksOfPrintedPDF()) ? latestPdf.fullUrl() : '#nolink';
            } );

            self.hasPdf = ko.computed( function() {
                return (self.latestPdf() && true);
            } );

            self.latestPdfCaption = ko.computed( function() {
                var latestPdf = self.latestPdf();

                if( !latestPdf ) {
                    return '';
                }

                return moment( latestPdf.createdOn() ).format( 'DD.MM.YYYY HH:mm' ) + '.pdf';
            } );

            self.formDoc = ko.observable( null );

            self.hasForm = ko.computed( function() {
                return (self.formDoc() && true);
            } );

            self.isNotShareable = ko.computed( function() {
                var
                    status = unwrap( currentActivity.status ),
                    editableStates = ['CREATED', 'VALID'],
                    notShareable = ( -1 !== editableStates.indexOf( status ) ),
                    mirrorCasefile = Y.doccirrus.auth.isISD();

                if( 'CANCELLED' === status ) {
                    //  user should not be able to re-share forms after cancelling, MOJ-5769
                    return true;
                }

                if( !self.hasForm() ) {
                    return true;
                }
                return notShareable || mirrorCasefile;
            } );

            self.isShareable = ko.computed( function() {
                if( !self.isNotShareable || 'function' !== typeof self.isNotShareable ) {
                    return false;
                }
                return !self.isNotShareable();
            } );

            //  formDoc is replaced by save, will break computed so this must be an observable
            self.isShared = ko.observable( false );

            self.isNotShared = ko.computed( function() {
                //alert('calc isNotShared' + (!self.isShared() ? 'TRUE' : 'FALSE'));
                return !self.isShared();
            } );

            self.pdfRenderInProgress = ko.computed( function() {
                var pdfJobs = binder.currentPdfJobs(), i;
                for ( i = 0; i < pdfJobs.length; i++ ) {
                    if ( pdfJobs[i].activityId === unwrap( currentActivity._id ) ) {
                        return true;
                    }
                }
                return false;
            } );


            /* debug only ---
             self.hasPdfText = ko.computed( function() {
             return self.hasPdf() ? 'HAS-PDF' : 'HAS-NO-PDF';
             } );

             self.hasFormText = ko.computed( function() {
             return self.hasForm() ? 'HAS-FORM' : 'HAS-NO-FORM';
             } );

             self.isSharedText = ko.computed( function() {
             return self.isShared() ? 'IS-SHARED' : 'IS-NOT-SHARED';
             } );
             */

            self.initActivitySectionPDFViewModel();

            self.PDFViewMoldelPDFI18n = i18n('InCaseMojit.PDFViewModel.PDF');
            self.regeneratePDFTextI18n = i18n('InCaseMojit.PDFViewModel.REGENERATE_PDF');
            self.interactiveFormI18n = i18n('InCaseMojit.PDFViewModel.INTERACTIVE_FORM');
            self.shareFormI18n = i18n('InCaseMojit.PDFViewModel.SHARE_FORM');
            self.lockFormTextI18n = i18n('InCaseMojit.PDFViewModel.LOCK_FORM');
            self.PDFViewModelTipI18n = i18n('InCaseMojit.PDFViewModel.TIP');

        },

        /** @protected */
        destructor: function() {
            var self = this;

            self.isTemplateReady = false;
            self.documentsSubscription.dispose();
        },
        /**
         * Initializes ActivitySectionPDFViewModel
         */
        initActivitySectionPDFViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self.canCreatePDF = ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity ),
                    status = currentActivity && unwrap( currentActivity.status ),
                    _isEditable = ko.utils.peekObservable( currentActivity._isEditable );

                if( true === self.pdfRenderInProgress() ) {
                    return false;
                }

                return _isEditable && ('VALID' === status || 'CREATED' === status);
            } );

            self.allowPDFCreation = ko.computed( function () {
                const lessThanApprovedActivityStatuses = ['EXT_IMPORT', 'DISPATCHED', 'CREATED', 'INVALID', 'VALID', 'PREPARED'];
                const currentActivity = unwrap( binder.currentActivity );
                const activitySettings = binder.getInitialData( 'activitySettings' );
                const currentActivitySettings = activitySettings.find( el => el.actType === currentActivity.actType() );
                if (!currentActivitySettings || !currentActivitySettings.quickPrintInvoice) { return true; }

                return currentActivitySettings.quickPrintInvoice &&
                       !lessThanApprovedActivityStatuses.includes( currentActivity.status() ) &&
                       !currentActivitySettings.hideLinksOfPrintedPDF;
            });
        },

        templateReady: function() {
            var
                self = this,
                attachments = self.getAttachments();

            self.latestPdf( attachments.getLatestPdf() );
            self.formDoc( attachments.findDocument( '_hasFormData' ) );
            self.updateIsShared();

            self.documentsSubscription = attachments.documents.subscribe( function() {
                var latestPdf = attachments.getLatestPdf();

                if( latestPdf !== self.latestPdf() ) {
                    self.latestPdf( latestPdf );
                }

                if( !self.formDoc() ) {
                    self.formDoc( attachments.findDocument( '_hasFormData' ) );
                    self.updateIsShared();
                }
            }, null, 'arrayChange' );
        },

        getAttachments: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

            if( false === self.isTemplateReady ) {
                return null;
            }

            return activityDetailsVM.attachmentsModel;
        },

        /**
         *  Regenerate PDF by invoking the PDF button in activity heading, to prevent duplication of
         *  save/print/pdf code.
         */

        onRegeneratePdfClick: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                activityHeadingVM = unwrap( activityDetailsVM.activityHeadingViewModel ),
                activityHeadingButtonsVM = unwrap( activityHeadingVM.activityHeadingButtonsViewModel );

            if (!self.allowPDFCreation()) { return; }
            activityHeadingButtonsVM
                .regeneratePDFAndUpdate()
                .then(
                    function( latestDoc ) {
                        //  let activity table know that there is a new PDF MOJ-6104
                        Y.fire( 'activityPDFChange', {
                            model: currentActivity,
                            mediaId: unwrap( latestDoc.mediaId ) || ''
                        } );
                        Y.log( 'PDF (re)generation complete, new media ID is: ' + unwrap( latestDoc.mediaId ), 'debug', NAME );
                    }
                );
        },

        onShareClick: function() {
            var
                self = this,
                formDoc = self.formDoc();

            if( !formDoc || self.isNotShareable() ) {
                return;
            }
            Y.log( 'Granting patient access to form: ' + unwrap( formDoc._id ), 'debug', NAME );
            formDoc.setPatientAccess( true, function() {
                self.updateIsShared();
            } );
            self.updateIsShared();
        },

        onUnshareClick: function() {
            var
                self = this,
                formDoc = self.formDoc();

            if( !formDoc || self.isNotShareable() ) {
                return;
            }
            Y.log( 'Removing patient access to form: ' + unwrap( formDoc._id ), 'debug', NAME );
            formDoc.setPatientAccess( false, function() {
                self.updateIsShared();
            } );
        },

        updateIsShared: function() {
            var
                self = this,
                formDoc = self.formDoc();

            if( !formDoc || !formDoc._patientAccess() ) {
                self.isShared( false );
            } else {
                self.isShared( true );
            }
        }

    }, {
        NAME: 'ActivitySectionPDFViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionPDFViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivitySectionViewModel'
    ]
} );
