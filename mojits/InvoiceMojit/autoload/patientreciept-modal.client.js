/**
 * User: strix
 * Date: 20/07/17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, Promise, ko, async, moment */

YUI.add( 'patientreceipt-modal', function( Y, NAME ) {

        var
            //i18n = Y.doccirrus.i18n,
            WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_XLARGE,

            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable();
            //peek = ko.utils.peekObservable;

        function PatientReceiptModel( config ) {
            PatientReceiptModel.superclass.constructor.call( this, config );
        }

        Y.extend( PatientReceiptModel, Disposable, {

            caption: null,
            scheine: null,

            progressTotal: 0,
            progressCurrent: 0,

            progressBarText: null,
            progressBarPercent: null,

            initializer: function( options ) {
                var self = this;

                self.scheine = options.scheine;

                self.progressTotal = self.scheine.length;
                self.progressCurrent = 0;
                self.progressBarText = ko.observable( '' );
                self.progressBarPercent = ko.observable( '0%' );

                self.testObservable = ko.observable( 'initial value' );

                //self.formId = ko.observable( options.canonicalId || options.formId || '' );
                //self.formRole = ko.observable( options.formRole || '' );

                self.testObservable( 'called with scheine: ' + self.scheine.length );

                self.createPubreceiptForEachSchein( onAllComplete );

                function onAllComplete( err, result ) {
                    if ( err ) {
                        Y.log( 'Could not create PUBRECEIPTs: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    self.onComplete( result );
                }
            },

            createPubreceiptForEachSchein: function( callback ) {
                var self = this;

                async.eachSeries( self.scheine, createSinglePubreceipt, callback );

                function createSinglePubreceipt( schein, itcb ) {
                    self.testObservable( 'creating: ' + schein._id );
                    self.progressCurrent = self.progressCurrent + 1;
                    self.progressBarPercent( Math.floor( ( self.progressCurrent / self.progressTotal ) * 100 ) + '%' );

                    var
                        rpcArgs = {
                            'caseFolderId': schein.caseFolderId,
                            'patientId': schein.patientId,
                            'treatmentIds': [],
                            'content': 'Patiententquittung für Scheine ' + moment( schein.timestamp ).format( 'DDMMYY' ) + ': ' + schein.content,
                            'makePdf': false
                        },
                        i;

                    for ( i = 0; i < schein.treatments.length; i++ ) {
                        rpcArgs.treatmentIds.push( schein.treatments[i]._id );
                    }

                    //console.log( '(****) rpcArgs: ', rpcArgs );

                    Y.doccirrus.jsonrpc.api.invoice.createPubReceipt( rpcArgs ).then( onPubReceiptCreated );

                    function onPubReceiptCreated( /* result */ ) {
                        //var data = result.data ? result.data : result;

                        //console.log( '(****) result of createPubReceipt: ', data );

                        /*
                        if ( data.mediaId && '' !== data.mediaId ) {
                            data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                            Y.doccirrus.modals.printPdfModal.show( data );
                        }
                        */

                        itcb( null );
                    }

                }

            },

            destructor: function() {
                var self = this;

                self.kopbCache.destroy();
                self.kopbCache = null;

                self.options = null;
            }

            //  Event handlers


        } );


        /**
         *  Generate PUBRECEIPT activities for each schein of each patient in GKV log
         *
         *  For each schein object in the options, we should have:
         *
         *    patientId     {String}
         *    caseFolderId  {String}
         *    scheinId      {String}
         *    treatmentIds  {[String]}
         *
         *  @param  options                 {Object}
         *  @param  options.scheine         {Object}    Array of objects representing scheine in patients in GKV log
         *  @param  options.canonicalId     {String}    Form to use when generating PUBRECEIPT activities
         *  @param  options.onComplete      {String}    Called when done
         */

        function show( options ) {

            Y.log( 'Creating patientreceipt-model, scheine: ' + options.scheine.length, 'debug', NAME );

            Promise
                .props( {
                    modules: Y.doccirrus.utils.requireYuiModule( [
                        'node',
                        'JsonRpcReflection-doccirrus',
                        'JsonRpc',
                        'DCWindow'
                    ] ),
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'InvoiceMojit/views/patientreceipt-modal' } )
                        .then( function( response ) {
                            //console.log( '(----) loaded patient receipt modal jade: ', response );
                            return response.data;
                        } )
                } )
                .then( function( props ) {
                    var
                        template = props.template,
                        bindings = new PatientReceiptModel( options ),
                        bodyContent = Y.Node.create( template ),

                        buttonSet = [ /* btnCancel, btnDownload, btnOpen, btnPrint */ ],

                        dialog = new Y.doccirrus.DCWindow( {
                            id: 'DCWindow-PatientReceiptProgressModel',
                            className: 'DCWindow-PatientReceiptProgressModal',
                            bodyContent: bodyContent,
                            title: 'TRANSLATEME: Patientenquittungen erstellen', //i18n( 'InSight2Mojit.printpdf_modal.title' ),
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
                        } );

                    bindings.onComplete = function( result ) {
                        if ( options.onComplete ) { options.onComplete( result ); }
                        dialog.close();
                    };

                    //  necessary to re-center after table node is added (similar to processNextTick)
                    window.setTimeout( function() { dialog.centered(); }, 1 );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                } );

        }

        Y.namespace( 'doccirrus.modals' ).patientReceiptModal = {
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