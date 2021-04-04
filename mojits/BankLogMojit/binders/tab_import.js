/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko, $, _ */
function _fn( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        viewModel,
        WRONG_FILE = i18n( 'BankLogMojit.text.wrongFile' );

    function TabImportViewModel( config ) {
        TabImportViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabImportViewModel, Disposable, {
        /**
         * Determines file input enabled
         * @type {null|ko.observable}
         */
        fileEnabled: null,
        /**
         * Determines upload button enabled
         * @type {null|ko.observable}
         */
        uploadEnabled: null,
        /**
         * Determines upload ignoreHashExists enabled
         * @type {null|ko.observable}
         */
        ignoreHashExistsEnabled: null,
        /**
         * Determines upload isMocking enabled
         * @type {null|ko.observable}
         */
        isMocking: null,
        uploadBESRListener: null,

        initializer: function TabImportViewModel_initializer( config ) {
            var
                self = this;

            self.fileEnabled = ko.observable( true );
            self.uploadEnabled = ko.observable( false );
            self.ignoreHashExistsEnabled = ko.observable( false );
            self.isMocking = ko.observable( false );
            self.importSubmitTextI18n = i18n( 'LabLogMojit.tab_import.submit.text' );
            self.generateBesrTextI18n = i18n( 'BankLogMojit.labels.generateBesr' );
            self.medidataPendingTextI18n = i18n( 'BankLogMojit.labels.medidataPending' );
            self.generateBesrInfoI18n = i18n( 'BankLogMojit.text.generateBesr' );
            self.medidataPendingInfoI18n = i18n( 'BankLogMojit.text.medidataPending' );
            self.noDataInfoI18n = i18n( 'BankLogMojit.text.noData' );
            self.successInfoI18n = i18n( 'BankLogMojit.text.success' );
            self.mainNode = config.node;
            self.inProcess = ko.observable( false );
            self.progressBarProcess = ko.observable( 0 );
            self.initInvoiceConfiguration();

            Y.doccirrus.communication.on( {
                event: 'BANKLOG_IMPORT',
                handlerId: 'overview',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    self.inProcess( true );
                    self.progressBarProcess( data );
                    if( 100 === data ) {
                        self.inProcess( false );
                        self.progressBarProcess( 0 );
                    }
                }

            } );

            Y.doccirrus.communication.on( {
                event: 'BANKLOG_IMPORT_ERR',
                handlerId: 'overview',
                done: function() {
                    self.notice( WRONG_FILE );
                }

            } );

            self.uploadBESRListener = Y.doccirrus.communication.on( {
                event: 'uploadBESREvent',
                done: function( response ) {
                    self.hideSpinner();

                    var error = response && response.data && response.data[0] && response.data[0].error;
                    if( error ) {
                        return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    }

                }
            } );
        },
        destructor: function TabImportViewModel_destructor() {
            if( this.uploadBESRListener ) {
                this.uploadBESRListener.removeEventListener();
                this.uploadBESRListener = null;
            }
        },
        notice: function TabImportViewModel_notice( message ) {
            Y.doccirrus.DCWindow.notice( {
                message: message,
                window: {width: 'medium'}
            } );
        },
        showSpinner: function() {
            Y.doccirrus.utils.showLoadingMask( this.mainNode );
        },
        hideSpinner: function() {
            Y.doccirrus.utils.hideLoadingMask( this.mainNode );
        },
        initInvoiceConfiguration: function TabImportViewModel_initInvoiceConfiguration() {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.invoiceconfiguration
                .read()
                .done( function( response ) {
                    var
                        data = response && response.data && response.data[0];
                    self.isMocking( data.isMocking || false );
                } )
                .fail( function( err ) {
                    Y.log( 'InvoiceConfiguration error loading ' + err, 'debug', NAME );
                } );
        },
        generateBesr: function TabImportViewModel_generateBesr() {
            var
                self = this,
                fileContent = '';
            Y.doccirrus.jsonrpc.api.activity.read( {
                query: {
                    actType: "INVOICEREF",
                    status: 'BILLED',
                    totalReceipts: 0,
                    totalReceiptsOutstanding: {$ne: 0},
                    $or: [
                        {referenceNo: {$exists: true}},
                        {invoiceNo: {$exists: true}},
                        {locImportId: {$exists: true}}
                    ]
                },
                options: {
                    lean: true,
                    itemsPerPage: 3,
                    sort: {_id: -1}
                }
            } ).done( function( result ) {
                var
                    data = result && result.data;

                function formatNumber( number, length ) {
                    return number.length > length ? number.substring( 0, length ) : number.padStart( length, '0' );
                }
                if( data && 0 < data.length ) {
                    data.forEach( function( activity, idx ) {
                        if( 2 === idx ) {
                            activity.totalReceiptsOutstanding = activity.totalReceiptsOutstanding / 2;
                        }
                        var
                            sum = activity.totalReceiptsOutstanding.toFixed( 2 ).toString().replace( '.', '' ),
                            sumAdditional = 10 - sum.length,
                            fullSum = '0000000000',
                            transactionType = '002',
                            participantNumber = '000000000',
                            referenceNo = activity.referenceNo || formatNumber( activity.invoiceNo, 26 ) +
                                          Y.doccirrus.commonutilsCh.countLastRefNumberDigit( formatNumber( activity.invoiceNo, 26 ) ),
                            amount = fullSum.substring( 0, sumAdditional ) + sum,
                            reference = '0000000000',
                            payment = '190401',
                            credit = '190401',
                            processing = '190401',
                            microfilm = '000000000',
                            reject = '0',
                            reverse = '000000000',
                            fees = '0000',
                            totalRow = '';
                        totalRow += transactionType;
                        totalRow += participantNumber;
                        totalRow += referenceNo;
                        totalRow += amount;
                        totalRow += reference;
                        totalRow += payment;
                        totalRow += credit;
                        totalRow += processing;
                        totalRow += microfilm;
                        totalRow += reject;
                        totalRow += reverse;
                        totalRow += fees;
                        totalRow += '\n';

                        if( 1 === idx ) {
                            totalRow += totalRow;
                        }
                        fileContent += totalRow;
                    } );
                    setTimeout( function() {
                        download( fileContent );
                    }, 500 );
                } else {
                    self.notice( self.noDataInfoI18n );
                }

                function download( fileContent ) {
                    var fileName = "data.BESR",
                        pp = document.createElement( 'a' );
                    pp.setAttribute( 'href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( fileContent ) );
                    pp.setAttribute( 'download', fileName );
                    pp.click();
                }
            } ).fail( function( result, err ) {
                Y.log( 'Error in looking for INVOICEREF: ' + err, 'error', NAME );
            } );
        },
        medidataPending: function TabImportViewModel_medidataPending() {
            var self = this;
            Y.doccirrus.jsonrpc.api.activity.read( {
                query: {
                    actType: "INVOICEREF",
                    status: 'BILLED',
                    invoiceNo: {$exists: true}
                },
                options: {
                    lean: true,
                    itemsPerPage: 1,
                    sort: {_id: -1}
                }
            } ).done( function( result ) {
                var
                    data = result && result.data && result.data[0];
                if( data ) {
                    self.notice( self.successInfoI18n );
                    Y.doccirrus.jsonrpc.api.banklog.runTest( {
                        data: {
                            invoiceNo: data.invoiceNo
                        },
                        callback: function( err ) { // eslint-disable-line
                            if( err ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            }
                        }
                    } );
                } else {
                    self.notice( self.noDataInfoI18n );
                }
            } ).fail( function( result, err ) {
                Y.log( 'Error in looking for INVOICEREF: ' + err, 'error', NAME );
            } );
        },
        /**
         * Shows info of buttons
         * @param {TabImportViewModel} $data
         * @param {jQuery.Event} $event
         */
        showInfoDialog: function TabImportViewModel_showInfoDialog( $data, $event ) {
            var
                self = this,
                target = $event.target.id;
            self.notice( 'generateInfo' === target ? self.generateBesrInfoI18n : self.medidataPendingInfoI18n );
        },
        /**
         * Change event handler of file input.
         * @param {TabImportViewModel} $data
         * @param {jQuery.Event} $event
         */
        fileChange: function TabImportViewModel_fileChange( $data, $event ) {
            var
                self = this,
                fileList = $event.target.files,
                file = fileList[0],
                fileSizeExceeds = Y.doccirrus.utils.notifyAboutFileSizeExceeds( fileList );

            if( fileSizeExceeds ) {
                self.uploadEnabled( false );
            } else {
                self.uploadEnabled( Boolean( file ) );
                self.file = file;
            }

        },
        /**
         * Click event handler of upload button.
         */
        upload: function TabImportViewModel_upload() {
            var self = this;

            self.uploadEnabled( false );
            self.showSpinner();

            function uploadBESR( file64evt ) {
                Y.doccirrus.jsonrpc.api.banklog.uploadBESR( {
                    data: {
                        fileData: file64evt && file64evt.target && file64evt.target.result,
                        fileName: self.file && self.file.name
                    }
                } );
            }

            var readerObj = new FileReader();
            readerObj.onloadend = uploadBESR;
            readerObj.readAsText( self.file );
        }
    } );

    return {

        registerNode: function tab_import_registerNode( node ) {
            viewModel = new TabImportViewModel( {
                node: node.getDOMNode()
            } );
            ko.applyBindings( viewModel, node.getDOMNode() );
            $( '[data-toggle="popover"]' ).popover();
        },

        deregisterNode: function tab_import_deregisterNode( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
}