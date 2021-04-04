/**
 * User: strix
 * Date: 31/08/16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, $ */

YUI.add( 'reportpdf-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n;

        /**
         *  Show progress of report generation on server and open print dialog when complete
         *
         *  @param  options                     {Object}
         *  @param  options.documentUrl         {String}    Optional,  URL of a PDF if already generated
         *  @param  options.documentFileName    {String}    Optional,  filename of PDF
         *  @param  options.forceShowPrintModal {Boolean}   show print dialog for approve+print if PDF not generated (will generate after transition)
         *  @param  options.beforeDone          {Function}  run transition before print
         */

        function show( options /*, callback */ ) {

            var
                node = Y.Node.create( '<div></div>' ),
                canonicalId = '';

            //  modal may have been invoked after PDF is generated, show print modal instead
            if ( options && ( ( options.documentUrl && '' !== options.documentUrl ) || options.forceShowPrintModal ) ) {
                options.beforeComplete = function( data ) {
                    if ( options.beforeDone ) { return Promise.resolve( options.beforeDone( data ) ); }
                };
                Y.doccirrus.modals.printPdfModal.show( options );
                return;
            }


            YUI.dcJadeRepository.loadNodeFromTemplate(
                'reportpdf_modal',
                'FormEditorMojit',
                {},
                node,
                onTemplateLoaded
            );

            function onTemplateLoaded() {
                var
                    jq = {},
                    modal,
                    documentUrl = '',
                    documentFileName = '',

                    //  helps ignore occasional duplicated events
                    isSubscribed = false;


                modal = Y.doccirrus.DCWindow.dialog( {
                    title: i18n( 'InSight2Mojit.reportpdf_modal.title' ),
                    type: 'info',
                    window: {
                        width: 'large',
                        maximizable: true,
                        buttons: {
                            footer: []
                        }
                    },
                    message: node
                } );

                jq = {
                    'divProgressContainer': $('#divProgressBar'),
                    'divProgress': $('#divProgressReportPDF'),
                    'divThrobber': $('#divProgressReportThrobber')
                };

                subscribeWS();

                function subscribeWS() {
                    //  Updates on progress during report generation
                    Y.log( 'Subscribing to PDF generation events', 'debug', NAME );
                    isSubscribed = true;
                    Y.doccirrus.communication.on( {
                        socket: Y.doccirrus.communication.getSocket( '/' ),
                        event: 'pdfRenderProgress',
                        done: onPdfRenderProgress,
                        handlerId: 'reportpdf_modal'
                    } );
                }

                function unSubScribeWS() {
                    //  Updates on progress during cashbook transition
                    Y.log( 'Unsubscribing from PDF generation events', 'debug', NAME );
                    isSubscribed = false;
                    Y.doccirrus.communication.off( 'pdfRenderProgress', 'reportpdf_modal' );
                }

                function onPdfRenderProgress( message ) {
                    var
                        evtD = message.data[0],
                        percentage = evtD.percent || jq.divProgress.css( 'width' );

                    if ( isSubscribed && 'complete' === evtD.label && evtD.url && '' !== evtD.url ) {
                        documentUrl = evtD.url;
                        documentFileName = evtD.fileName;
                        canonicalId = evtD.canonicalId || '';
                        unSubScribeWS();

                        // open print modal here
                        Y.doccirrus.modals.printPdfModal.show( {
                            'cacheFile': documentFileName,
                            'cacheUrl': documentUrl,
                            'documentUrl': documentUrl,
                            'canonicalId': canonicalId
                        } );

                        modal.close( true );
                        return;
                    }

                    jq.divProgress.css( 'width', percentage + '%' );
                    jq.divProgress.text( i18n( 'InSight2Mojit.reportpdf_modal.pdf_progress' ) + evtD.percent + '%' );
                }

            } // end onTemplateLoaded


        }

        Y.namespace( 'doccirrus.modals' ).reportPdfModal = {
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
            'printpdf-modal'
        ]
    }
);