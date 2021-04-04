/**
 * User: strix
 * Date: 02/08/17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, $, ko, moment */

YUI.add( 'datepicker-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable();

        function DatePickerStubModel( config ) {
            DatePickerStubModel.superclass.constructor.call( this, config );
        }

        Y.extend( DatePickerStubModel, Disposable, {

            timestamp: null,

            initializer: function( options ) {
                var self = this;
                self._initData( options );
            },

            destructor: function() {
                var self = this;
                self.timestamp.destroy();
                self.timestamp = null;
            },

            /**
             *  Request full dataset from server is not available
             */

            _initData: function( options ) {
                var self = this;
                self.placeholderTimestampI18n = i18n('InCaseMojit.casefile_detail.placeholder.TIMESTAMP');
                self.timestamp = ko.observable( options.defaultValue );
            }

        } );
        /**
         *  Show progress of report generation on server and open print dialog when complete
         *
         *  @param  options                     {Object}
         *  @param  options.defaultValue        {String}        Initial value of datepicker
         *  @param  options.onSelect            {Function}      Called when user selects a date
         */

        function showDatePicker( options /*, callback */ ) {

            var
                node = Y.Node.create( '<div></div>' ),
                jq = {},
                modal,

                bindings = new DatePickerStubModel( options ),

                btnSelect = {
                    name: 'SELECTDATE',
                    label: i18n( 'FormEditorMojit.datepicker_modal.buttons.SELECT' ),
                    isDefault: true,
                    action: onSelectButtonClick
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.datepicker_modal.buttons.CANCEL' ),
                    isDefault: true,
                    action: onCancelButtonClick
                },

                modalProperties = {
                    className: 'DCWindow-Datepicker',
                    bodyContent: node,
                    title: i18n( 'FormEditorMojit.datepicker_modal.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    maximizable: false,
                    resizeable: false,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnCancel, btnSelect ]
                    }
                };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'datepicker_modal',
                'FormEditorMojit',
                {},
                node,
                onTemplateLoaded
            );

            function onTemplateLoaded() {

                modal = new Y.doccirrus.DCWindow( modalProperties );

                ko.applyBindings( bindings, node.getDOMNode() );

                jq = {
                    'divContainer': $('#divPubReceiptdatePicker'),
                    'txtDateValue': $('#txtDateValue')
                };

                if ( !options.defaultValue ) {
                    options.defaultValue = moment( 0, 'HH' ).format();
                }

                //  set default value
                jq.txtDateValue.val( options.defaultValue );
            }

            function onSelectButtonClick() {
                var currentVal = jq.txtDateValue.val();

                Y.log( 'User selected date: ' + currentVal, 'debug', NAME );

                if ( '' === currentVal || !moment( currentVal ).isValid ) {
                    Y.log( 'User has selected an invalid date, not calling it back: ' + currentVal, 'debug', NAME );
                    return;
                }

                if ( options.onSelect ) {
                    options.onSelect( currentVal );
                }

                modal.close();
            }

            function onCancelButtonClick() {
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).datePicker = {
            show: showDatePicker
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