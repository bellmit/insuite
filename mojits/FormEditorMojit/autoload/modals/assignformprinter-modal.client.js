/*global YUI, ko, Promise */

'use strict';

YUI.add( 'assignformprinter-modal', function( Y /*, NAME */ ) {
    var
        //i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_SMALL,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function AssignFormprinterModel( config ) {
        AssignFormprinterModel.superclass.constructor.call( this, config );
    }

    Y.extend( AssignFormprinterModel, Disposable, {

        locationId: '',
        userId: '',
        formId: '',

        caption: null,
        printerButtons: null,

        initializer: function( options ) {
            var self = this;
            self.locationId = options.locationId;
            self.userId = options.userId;
            self.formId = options.formId;

            self._initData( options );
        },

        destructor: function() {
            var self = this;
            self.caption.destroy();
            self.caption = null;

            self.printerButtons.destroy();
            self.pritnerButtons = null;

            self.options = null;
        },

        /**
         *  Request full dataset from server is not available
         */

        _initData: function( options ) {
            var
                self = this,
                buttons = [],
                i;

            self.caption = ko.observable ('adding buttons<br>Nutzer: ' + options.userId );       //TODO: translateme

            for ( i = 0; i < options.printers.length; i++ ) {
                buttons.push( {
                    printerName: options.printers[i]
                } );
            }

            self.printerButtons = ko.observableArray( buttons );
        },

        /**
         *  Raised by knockout when a user chooses a printer for this form
         *
         *  @param self
         *  @param printerName
         */

        onPrinterSelect: function( self, printerName ) {
            self.caption( Y.doccirrus.comctl.getThrobber() ) ;
            self.printerButtons( [] );

            var
                postUrl = '/1/formprinter/:setsingle',
                postArgs = {
                    'locationId': self.locationId,
                    'userId': self.userId,
                    'canonicalId': self.formId,
                    'printerName': printerName
                };

            Y.doccirrus.comctl.privatePost( postUrl, postArgs, onAssignForm );

            function onAssignForm( err, data ) {
                if ( err ) {
                    self.caption( 'Fehler: ' + JSON.stringify( err ) );
                    return;
                }

                self.caption( '...' );
                self.onComplete( data );
            }

        }

    } );

    /**
     *  Dialog to show progress of loading and printing a KOTable to PDF
     *
     *
     *  @method show
     *  @param  options             {Object}
     *  @param  options.userId      {String}    _id of an identity object or 'default'
     *  @param  options.formId      {String}    _id of a formtemplate object (canonical)
     *  @param  options.locationId  {String}    _id of a location
     *  @param  options.printers    {Object}    Array of printer names
     *  @param  options.onAssigned  {Function}  raised after (re)assigning to form to a printer
     */

    function showAssignFormPrinter( options ) {
        
        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'FormEditorMojit/views/assignformprinters_modal' } )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new AssignFormprinterModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-SelectLocationsDialog',
                        className: 'DCWindow-SelectLocationsDialog',
                        bodyContent: bodyContent,
                        title: 'Drucker auswahlen',                   //  TRANSLATEME
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        maximizable: false,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: []
                        }
                    } );

                bindings.onComplete = function( serverResponse ) {
                    if ( options.onAssigned ) { options.onAssigned( serverResponse ); }
                    dialog.close();
                };

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                ko.applyBindings( bindings, bodyContent.getDOMNode() );

            } );
    }

    Y.namespace( 'doccirrus.modals' ).assignFormPrinter = {
        show: showAssignFormPrinter
    };

}, '0.0.1', {
    requires: [
        'oop',
        'dc-comctl',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'dccommunication-client'
    ]
} );