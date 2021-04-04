/*
 *  Binder for bulk PDF testing page
 *
 *  Relates to MOJ-5288, MOJ-5598, MOJ-5756, MOJ-5722
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, async */

YUI.add('TestingMojitBinderBulkPDFTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderBulkPDFTest module.
         *
         * @module TestingMojitBinderBulkPDFTest
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderBulkPDFTest with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderImageTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            activity: null,
            documents: null,
            formDoc: null,
            counter: 0,

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                var
                    self = this,
                    jqCache = {
                        txtActivityId: $('#txtActivityId'),
                        txtNumPdf: $('#txtNumPdf'),
                        chkSerial: $('chkSerial'),
                        divLog: $('#divLog'),
                        btnLoadActivity: $('#btnLoadActivity'),
                        btnGenerateSerial: $('#btnGenerateSerial'),
                        btnGenerateParallel: $('#btnGenerateParallel'),
                        divControls: $('divControls')
                    };

                self.node = node;
                self.jq = jqCache;

                //  attach event handlers
                self.jq.btnLoadActivity.off( 'click' ).on( 'click', function() { self.onLoadButtonClicked(); } );
                self.jq.btnGenerateSerial.off( 'click' ).on( 'click', function() { self.onSerialButtonClicked(); } );
                self.jq.btnGenerateParallel.off( 'click' ).on( 'click', function() { self.onParallelButtonClicked(); } );
            },

            log: function( msg ) {
                var self = this;
                self.jq.divLog.append( '<pre>'  + msg + '</pre>' );
            },

            generatePDF: function( label, callback ) {
                var
                    self = this,
                    url = '/1/formtemplate/:makepdf/',
                    postArgs = {
                        'formId': self.formDoc.formId,
                        'formVersionId': self.formDoc.formInstanceId,
                        'mapCollection': 'activity',
                        'mapObject': self.activity._id,
                        'saveTo': 'temp',
                        'serialRender': self.jq.chkSerial.is( ':checked' )
                    };

                function onMakePDF(err, mediaResponse) {
                    if (err) {
                        self.log( 'Error generating PDF ' + label + ': ' + JSON.stringify( mediaResponse ) );
                        if ( callback ) { callback( err ); }
                        return;
                    }

                    var
                        tempFile = mediaResponse.data.mediaId.tempId,
                        parts = tempFile.split( '/' ),
                        fileName = parts.pop(),
                        pdfUrl = Y.doccirrus.infras.getPrivateURL( '/pdf/' + fileName );


                    //Y.log('created PDF: ' + JSON.stringify(mediaResponse), 'debug', NAME);
                    //self.log('created PDF: ' + JSON.stringify(mediaResponse), 'debug', NAME);
                    self.log( 'Complete ' + label + ': ' + JSON.stringify( mediaResponse.data ));
                    self.log( 'Link ' + label + ': ' + '<a href="' + pdfUrl + '">' + pdfUrl + '</a>' );
                    if ( callback ) { callback( null ); }
                }

                self.log( 'POST: ' + JSON.stringify( postArgs ) );
                Y.doccirrus.comctl.privatePost( url, postArgs, onMakePDF );
            },

            //  EVENT HANDLERS

            'onLoadButtonClicked': function() {
                var
                    self = this,
                    actId = self.jq.txtActivityId.val();

                if ( '' === $.trim( actId ) ) {
                    self.log( 'Please enter an activity _id' );
                    return;
                }

                self.log( 'activity _id: ' + actId );
                self.activity = null;
                self.formDoc = null;

                Y.doccirrus.jsonrpc.api.activity.getActivityForFrontend({ query: { _id: actId } } )
                    .then( function ( response ) {
                        self.activity = response.data.activity;
                        //self.log( 'loaded activity:\n' + JSON.stringify( self.activity, undefined, 2 ) );

                        if ( response.data.populatedObj && response.data.populatedObj.attachmentsObj ) {
                            self.documents = response.data.populatedObj.attachmentsObj;

                            //self.log( 'found documents: ' + JSON.stringify( self.documents, undefined, 2 ) );

                            self.documents.forEach( function( doc ) {
                                if ( doc.type && 'FORM' === doc.type ) {
                                    self.formDoc = doc;
                                }
                            } );
                        }

                        if ( self.formDoc ) {
                            self.jq.txtActivityId.addClass( 'disabled' );
                            self.jq.btnLoadActivity.hide();
                            self.jq.btnGenerateSerial.show();
                            self.jq.btnGenerateParallel.show();
                            self.log( 'form document:\n' + JSON.stringify( self.formDoc, undefined, 2 ) );
                        } else {
                            self.log( 'Please choose an activity with a form document.' );
                        }

                    } );

            },

            'onSerialButtonClicked': function() {
                var
                    self = this,
                    numPdfs = parseInt( self.jq.txtNumPdf.val(), 10 ),
                    genSteps = [],
                    i;

                if (!numPdfs || numPdfs < 0 ) {
                    self.log( 'Please specify how many PDFs to generate' );
                    return;
                }
                self.jq.divLog.html( '' );

                for ( i = 0; i < numPdfs; i++ ) {
                    genSteps.push( getStep( '' + i ) );
                }

                async.series( genSteps, onAllSerialComplete );

                function getStep( label ) {
                    return function( itcb ) {
                        self.log( 'starting serial generation of PDF: ' + label );
                        self.generatePDF( '' + label, itcb );
                    };
                }

                function onAllSerialComplete() {
                    self.log( 'All serial operations complete.' );
                }
            },

            'onParallelButtonClicked': function() {
                var
                    self = this,
                    numPdfs = parseInt( self.jq.txtNumPdf.val(), 10 ),
                    i;

                if (!numPdfs || numPdfs < 0 ) {
                    self.log( 'Please specify how many PDFs to generate' );
                    return;
                }
                self.jq.divLog.html( '' );

                for ( i = 0; i < numPdfs; i++ ) {
                    self.log( 'starting parallel generation of PDF: ' + i );
                    self.generatePDF( '' + i );
                }

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcvalidations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dcutils-uam',
            'dccasefilebinderevents',
            'dcloadhelper',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'dcvat',
            'DCWindow',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'dcOphthalmologyModels',
            'kbv-api',
            'dccrmanager',
            'cardreader',
            'dcrecommendedprescriptionmodal',
            'dcmediapreviewnmodal',
            'DCFsmDefault',
            'DeviceReader',
            'dccommunication-client'
        ]
    }
);
