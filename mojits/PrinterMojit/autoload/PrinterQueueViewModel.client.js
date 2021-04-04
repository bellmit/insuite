/*global YUI, ko */
YUI.add( 'PrinterQueueViewModel', function( Y/*, NAME */ ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * @constructor
     * @class PrinterQueueViewModel
     * @extends KoDisposable
     */
    function PrinterQueueViewModel() {
        PrinterQueueViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PrinterQueueViewModel, KoViewModel.getDisposable(), {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initTemplate();
            self._initObservables();
            self._initPrinterQueueViewModel();
            self.headlineI18n = i18n( 'PrinterMojit.PrinterQueueViewModel.headline' );
            self.introI18n = i18n( 'PrinterMojit.PrinterQueueViewModel.intro' );
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self.stopLoadPrinterQueueInterval();
        },
        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @private */
        _initTemplate: function() {
            var
                self = this;

            self.template = {
                name: 'PrinterQueueViewModel',
                data: self
            };
        },
        /**
         * Observable queue of printers.
         * @property printerQueue
         * @type {ko.observableArray}
         */
        printerQueue: null,
        /**
         * Observable determination if "loadPrinterQueue" is currently pending.
         * @property loadPrinterQueuePending
         * @type {ko.observable}
         */
        loadPrinterQueuePending: null,
        /**
         * Observable determination if "clearPrinterQueue" is currently pending.
         * @property loadPrinterQueuePending
         * @type {ko.observable}
         */
        clearPrinterQueuePending: null,
        /** @private */
        _initObservables: function() {
            var
                self = this;

            self.printerQueue = ko.observableArray();
            self.loadPrinterQueuePending = ko.observable( false );
            self.clearPrinterQueuePending = ko.observable( false );
        },
        toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },
        /** @private */
        _initPrinterQueueViewModel: function() {
            var
                self = this;

            self.btnViewPortI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;

            self._initPrinterQueueTable();
        },
        /**
         * Table visualising printer queue.
         * @property printerQueueTable
         * @type {KoTable}
         */
        printerQueueTable: null,
        /** @private */
        _initPrinterQueueTable: function() {
            var
                self = this,
                printerQueue = self.printerQueue,
                printerQueueTable;

            self.printerQueueTable = printerQueueTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'PrinterMojit.PrinterQueueViewModel.pdfTitle' ),
                    stateId: 'PrinterQueueViewModel-printerQueueTable',
                    states: ['limit'],
                    data: printerQueue,
                    columns: [
                        {
                            forPropertyName: 'printerName',
                            label: i18n( 'PrinterMojit.PrinterQueueViewModel.printerName.label' ),
                            width: '70%',
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'queueLen',
                            label: i18n( 'PrinterMojit.PrinterQueueViewModel.queueLen.label' ),
                            width: '30%',
                            isSortable: true
                        },
                        {
                            forPropertyName: 'resetButton',
                            label: i18n( 'PrinterMojit.PrinterQueueViewModel.resetButton.label' ),
                            width: '120px',
                            visibleByUser: false,
                            renderer: function( /*meta*/ ) {
                                var
                                    link = '<a href="javascript:;" class="resetButton-btn btn btn-default btn-block btn-xs">{text}</a>',
                                    linkText = i18n( 'PrinterMojit.PrinterQueueViewModel.resetButton.text' );

                                return Y.Lang.sub( link, {text: linkText} );

                            },
                            onCellClick: function( meta ) {
                                var
                                    isLink = meta.isLink,
                                    data = meta.row,
                                    clearPrinterQueuePending = peek( self.clearPrinterQueuePending );

                                if( isLink && !clearPrinterQueuePending ) {
                                    self.clearPrinterQueue( data.printerName );
                                }

                                return false;
                            }
                        }
                    ],
                    selectMode: 'none',
                    exportCsvConfiguration: {
                        columns: [
                            {
                                forPropertyName: 'resetButton',
                                visible: false
                            }
                        ]
                    },
                    exportCsvVisible: false,
                    usageConfigurationDisabled: true
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    $element = unwrap( printerQueueTable.element ),
                    clearPrinterQueuePending = Boolean( unwrap( self.clearPrinterQueuePending ) ),
                    $buttons;

                ignoreDependencies( function() {
                    if( $element.length ) {
                        $buttons = $element.find( '.resetButton-btn' );
                        if( $buttons.length ) {
                            if( clearPrinterQueuePending ) {
                                $buttons.addClass( 'disabled' );
                            }
                            else {
                                $buttons.removeClass( 'disabled' );
                            }
                        }
                    }
                } );

            } ).extend( {rateLimit: 0} ) );

            self.loadPrinterQueue();
            self.startLoadPrinterQueueInterval();

        },
        /**
         * Loads the printer queue from server and refreshes "printerQueue".
         * @returns {jQuery.Deferred}
         */
        loadPrinterQueue: function() {
            var
                self = this,
                loadPrinterQueuePending = peek( self.loadPrinterQueuePending ),
                promise;

            if( loadPrinterQueuePending ) {
                promise = loadPrinterQueuePending;
            }
            else {
                promise = Y.doccirrus.jsonrpc.api.printer
                    .listQueues()
                    .then( function( response ) {
                        return Y.Lang.isArray( response.data ) && response.data || [];
                    } )
                    .then( function( data ) {
                        self.printerQueue( data );
                    } )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
                    .always( function() {
                        self.loadPrinterQueuePending( false );
                    } );
                self.loadPrinterQueuePending( promise );
            }

            return promise;
        },
        /** @private */
        _loadPrinterQueueInterval: null,
        /**
         * Start periodically fetching "printerQueue" from server.
         */
        startLoadPrinterQueueInterval: function() {
            var
                self = this;

            if( !self._loadPrinterQueueInterval ) {
                self._loadPrinterQueueInterval = setInterval( function() {
                    var
                        loadPrinterQueueNotPending = !peek( self.loadPrinterQueuePending ),
                        clearPrinterQueueNotPending = !peek( self.clearPrinterQueuePending );

                    if( loadPrinterQueueNotPending && clearPrinterQueueNotPending ) {
                        self.loadPrinterQueue();
                    }

                }, 30000 ); // NOTE: list shall refresh every 30s automatically
            }
        },
        /**
         * Stop periodically fetching "printerQueue" from server.
         */
        stopLoadPrinterQueueInterval: function() {
            var
                self = this;

            if( self._loadPrinterQueueInterval ) {
                clearInterval( self._loadPrinterQueueInterval );
                self._loadPrinterQueueInterval = null;
            }
        },
        /**
         * Clear the given printer names queue from server and refreshes "printerQueue".
         * @returns {jQuery.Deferred}
         */
        clearPrinterQueue: function( printerName ) {
            var
                self = this,
                clearPrinterQueuePending = peek( self.clearPrinterQueuePending ),
                promise;

            if( clearPrinterQueuePending ) {
                promise = clearPrinterQueuePending;
            }
            else {
                self.stopLoadPrinterQueueInterval();
                promise = Y.doccirrus.jsonrpc.api.printer
                    .clearQueue( {printerName: printerName} )
                    .then( function( response ) {
                        return Y.Lang.isArray( response.data ) && response.data || [];
                    } )
                    .then( function( data ) {
                        self.printerQueue( data );
                    } )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
                    .always( function() {
                        self.clearPrinterQueuePending( false );
                        self.startLoadPrinterQueueInterval();
                        setTimeout( function() {
                            self.loadPrinterQueue();
                        }, 2000 ); // NOTE: list shall refresh a bit delayed after user has clicked a Reset button
                    } );
                self.clearPrinterQueuePending( promise );
            }

            return promise;
        }
    }, {
        NAME: 'PrinterQueueViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PrinterQueueViewModel );

}, '3.16.0', {
    requires: [
        "DCBinder",
        'oop',
        'doccirrus',
        'KoViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',

        'dcerrortable'
    ]
} );
