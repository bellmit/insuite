/*
 *  Modal to display generation of serial DOCLETERS
 *
 *  Controleld by the ActivitySectionFormViewModel
 *
 *  @author: strix
 *  @date: 28/11/2018
 */

/*eslint strict:0, prefer-template: 0 */
/*global YUI, ko, async */

'use strict';

YUI.add( 'DcSerialDocletterModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        /**
         *  ViewModel to bind table to modal body
         *  @constructor
         */

        function SerialDocletterViewModel( ) {
            var self = this;

            self.mediaIds = ko.observableArray( [] );           //  of PDFs generated so far
            self.fileName = ko.observable();                    //  of all PDFs concatentated to one file
            self.selectedContacts = ko.observableArray();       //  set of selected contacts, plain objects
            self.currentContact = ko.observable();              //  contact we are currently making a PDF for, or null
            self.formId = ko.observable();                      //  _id of current form, used for print settings
            self.activityId = ko.observable();                  //  _id of current activity, used when joining PDFs
            self.zipInProgress = false;                         //  prevent double click
            self.zipDownload = ko.observable();                 //  ZIP of all PDFs is downloaded from invisible iFrame

            self.destroy = function __destroy() {
                Y.log( 'Destroying serial docletter modal', 'debug', NAME );
            };

            self.openPrintDialog = function() {
                Y.doccirrus.modals.printPdfModal.show( {
                    'canonicalId': self.formId(),
                    'cacheFile': self.fileName(),
                    'documentUrl': '/pdf/' + self.fileName(),
                    'activityIds': []
                } );
            };

            /**
             *  Handler for 'ZIP' button
             */

            self.downloadZip = function() {
                if ( self.zipInProgress ) { return; }
                self.zipInProgress = true;

                var
                    contacts = self.selectedContacts(),
                    idx = 0,
                    zipId;

                async.series( [ createZip, addAllPdfsToZip, downloadZip ], onAllDone );

                function createZip( itcb ) {
                    Y.doccirrus.jsonrpc.api.media.createzip( { prefername: 'Arztbrief_' } ).then( onZipCreated ).fail( itcb );

                    function onZipCreated( result ) {
                        zipId = result.data;
                        Y.log( 'Created new zip archive with id: ' + zipId, 'info', NAME );
                        itcb( null );
                    }
                }

                function addAllPdfsToZip( itcb ) {
                    var mediaIds = self.mediaIds();
                    async.eachSeries( mediaIds, addSinglePdfToZip, itcb );
                }

                function addSinglePdfToZip( mediaId, itcb ) {
                    var
                        fileArgs = {
                            mediaid: mediaId,
                            activityid: self.activityId(),
                            zipid: zipId,
                            prefername: contacts[ idx ].content + '.pdf'
                        };

                    idx = idx + 1;

                    Y.doccirrus.jsonrpc.api.media.copypdftozip( fileArgs ).then( onPdfCopied ).fail( itcb );
                    function onPdfCopied( /* result */ ) {
                        Y.log( 'PDF added to zip: ' + mediaId, 'info', NAME );
                        itcb( null );
                    }
                }

                function downloadZip( itcb ) {
                    var
                        zipUrl = Y.doccirrus.infras.getPrivateURL( '/zip/' + zipId + '.zip' );

                    self.zipDownload( '<iframe src="' + zipUrl + '" width="1px" height="1px"></iframe>' );
                    itcb( null );
                }

                function onAllDone( err ) {
                    self.zipInProgress = false;
                    if ( err ) {
                        Y.log( 'Problem adding PDFs to zip file: ' + JSON.stringify( err ), 'error', NAME );
                    }
                }
            };

            /**
             *  Modal content
             */

            self.resultDisplay = ko.computed( function() {
                var
                    currentContact = self.currentContact(),
                    fileName = self.fileName(),
                    pdfUrl;

                if ( fileName ) {
                    pdfUrl = Y.doccirrus.infras.getPrivateURL( '/pdf/' + fileName );
                    return '<iframe src="' + pdfUrl + '" width="100%" height="700px" noborder="noborder"></iframe>';
                }

                if ( currentContact ) {
                    return i18n( 'InCaseMojit.serial_docletter_modalJS.GENERATING_PDF_FOR' ) + ' ' + currentContact.content;
                }

                return i18n( 'InCaseMojit.serial_docletter_modalJS.JOINING_PDFS' );
            } );

            /**
             *  Progress bar values
             */

            self.progressBarValue = ko.computed( function() {
                var
                    total = self.selectedContacts().length,
                    completed = self.mediaIds().length,
                    percentage = Math.floor( ( completed / total ) * 100 );
                return percentage;
            } );

            self.progressBarWidth = ko.computed( function() {
                return self.progressBarValue() + '%';
            } );

            self.showProgressBar = ko.computed( function() {
                return self.fileName() ? false : true;
            } );
        }

        /**
         *  Modal to display progress of serial docleters and show result
         *
         *  @param  {Object}    options
         *  @param  {Function}  options.onBind              Called with viewmodel when bound
         */

        function showSerialDocletterModal( options ) {
            var
                JADE_TEMPLATE = 'InCaseMojit/views/serialdocletter_modal',

                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                    label: i18n( 'InCaseMojit.select_labdata_modalJS.button.CANCEL' )
                } ),

                btnPrint = Y.doccirrus.DCWindow.getButton( 'PRINT', {
                    isDefault: true,
                    label: i18n( 'DCWindow.BUTTONS.PRINT' ),
                    //disabled: true,
                    action: onPrintClick
                } ),

                btnZip = Y.doccirrus.DCWindow.getButton( 'ZIP', {
                    isDefault: true,
                    label: 'ZIP',
                    //disabled: true,
                    action: onZipClick
                } ),

                modalOptions = {
                    className: 'DCWindow-SerialDocletter',
                    bodyContent: null,                                              //  added from template
                    title: i18n( 'InCaseMojit.serial_docletter_modalJS.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: 1400,
                    height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnCancel, btnPrint, btnZip ]
                    },
                    after: { visibleChange: onModalVisibilityChange }
                },

                modal,              //  eslint-disable-line no-unused-vars
                template,
                filenameSubscription,
                serialDocletterViewModel;

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( { path: JADE_TEMPLATE } ) )
                .then( onTemplateLoaded )
                .catch( catchUnhandled );

            function onTemplateLoaded( response ) {
                template = ( response && response.data ) ? response.data : null;
                modalOptions.bodyContent = Y.Node.create( template );

                serialDocletterViewModel = new SerialDocletterViewModel( options );

                modal = new Y.doccirrus.DCWindow( modalOptions );

                ko.applyBindings( serialDocletterViewModel, modalOptions.bodyContent.getDOMNode() );

                //  pass the viewmodel back to parent
                options.onBind( serialDocletterViewModel );

                subscribeToFileName();
            }

            /**
             *  Enable footer buttons when PDF generation is complete
             */

            function subscribeToFileName() {
                filenameSubscription = serialDocletterViewModel.fileName.subscribe( function onSelectionChanged( fileName ) {
                    if ( !fileName ) {
                        //btnPrint.set( 'disabled', true );
                        //btnZip.set( 'disabled', true );
                        modal._buttonsMap.CANCEL.set( 'disabled', true );
                    } else {
                        //btnPrint.set( 'disabled', false );
                        //btnZip.set( 'disabled', false );
                        modal._buttonsMap.CANCEL.set( 'disabled', false );
                    }
                } );
            }

            /**
             *  Clean up when closed
             *
             *  @param  {Object}    event
             */

            function onModalVisibilityChange( event ) {
                if( !event.newVal ) {
                    ko.cleanNode( modalOptions.bodyContent.getDOMNode() );
                    if ( filenameSubscription ) {
                        filenameSubscription.dispose();
                    }
                    serialDocletterViewModel.destroy();
                }
            }

            function onPrintClick() {
                if ( serialDocletterViewModel.fileName() ) {
                    serialDocletterViewModel.openPrintDialog();
                }
            }

            function onZipClick() {
                if ( serialDocletterViewModel.fileName() ) {
                    serialDocletterViewModel.downloadZip();
                }
            }

        }

        Y.namespace( 'doccirrus.modals' ).serialDocletter = {
            show: showSerialDocletterModal
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'inCaseUtils'
        ]
    }
);