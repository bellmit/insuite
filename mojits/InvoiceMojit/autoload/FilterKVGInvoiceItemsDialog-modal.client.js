/**
 * User: oliversieweke
 * Date: 13.03.19  17:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, moment*/
'use strict';
YUI.add( 'filterKVGinvoicelogitems-modal', function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 700,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function FilterKVGInvoiceItemsModel( config ) {
        FilterKVGInvoiceItemsModel.superclass.constructor.call( this, config );
    }

    Y.extend( FilterKVGInvoiceItemsModel, Disposable, {
        initializer: function() {
            var
                self = this;

            self.initFields();
            self.initDatepickers();
            self.FIDatepickerTextI18n = i18n( 'FilterInvoiceItemsDialog.datepickerText' );
            self.FICheckBoxTextI18n = i18n( 'FilterInvoiceItemsDialog.checkboxText' );
            self.FIPrivateLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.private.label' );
            self.FIBgLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.bg.label' );
            self.FIFromLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.from.label' );
            self.FIDoNotCheckCatalogLabelTextI18n = i18n('FilterInvoiceItemsDialog.doNotcheckCatalog.label');
            self.FIToLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.to.label' );
            self.FIPadxSettingsSelectionTextI18n = i18n( 'FilterInvoiceItemsDialog.padxSettingSelection' );
            self.minTotal.i18n = i18n( 'FilterKVGInvoiceItemsDialog.label.MIN_TOTAL' );
            self.KVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_PKV_CH_SCHEIN' );
            self.IVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_IVG_SCHEIN' );
            self.UVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_UVG_SCHEIN' );
            self.MVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_MVG_SCHEIN' );
            self.VVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_VVG_SCHEIN' );
            self.isTiersPayantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersPayant' );
            self.isTiersGarantI18n =  i18n( 'InCaseMojit.casefile_detail.label.IsTiersGarant' );
            self.collectMedidataRejectedI18n = i18n( 'tarmedlog-schema.TarmedLog_T.collectMedidataRejected.i18n' );
        },

        initFields: function() {
            var self = this,
                _fields = self._fields = {};

            self.collectMedidataRejected = ko.observable( false );
            self.doNotcheckCatalog = ko.observable( false );
            self.from = ko.observable( moment().startOf( 'month' ).toISOString() );
            self.to = ko.observable( moment().toISOString() );
            self.minTotal = ko.observable( 0 );
            self.kvgSettingsOptions = [];
            self.kvgSettingId = ko.observable();
            self.kvgSettingsLink = '<a target="_blank" href="invoiceadmin#/tarmed">' + i18n( 'FilterKVGInvoiceItemsDialog.kvgSettingsLink' ) + '</a>';
            self.isTiersGarant = ko.observable(false);
            self.isTiersPayant = ko.observable(true);

            _fields.kvg = ko.observable( true );
            _fields.uvg = ko.observable( true );
            _fields.ivg = ko.observable( true );
            _fields.mvg = ko.observable( true );
            _fields.vvg = ko.observable( true );
            _fields.selfpayer = ko.observable( true );

            self.kvgSettings = self.get( 'kvgSettings' );
            self.kvgSettings.forEach( function( setting ) {
                var locnames = [];
                setting.locations.forEach( function( loc ) {
                    locnames.push( loc.locname );
                } );
                self.kvgSettingsOptions.push({
                    value: setting.kvgSettingTitle + ' ' + locnames.join( ', ' ),
                    _id: setting._id
                });
            } );

            self.displayMinTotal = ko.computed( {
                read: function() {
                    var minTotal = unwrap( self.minTotal );
                    return Y.doccirrus.comctl.numberToLocalString( minTotal );
                },
                write: function( value ) {
                    self.minTotal( Y.doccirrus.comctl.localStringToNumber( value ) || 0 );
                }
            } );

            self.isTierSelected = ko.computed({
                read: function( ) {
                    return getSelectedTier();
                },
                write: function( value ) {
                    self.isTiersGarant(value === 'isTiersGarant');
                    self.isTiersPayant(value === 'isTiersPayant');
                }
            });

            self.isTierSelected(getSelectedTier());


            function getSelectedTier(  ) {
                if (unwrap(self.isTiersGarant)) {
                    return 'isTiersGarant';
                }
                return 'isTiersPayant';
            }
        },

        initDatepickers: function() {
            var self = this;
            var from = self.from;
            var to = self.to;

            self.fromDatepicker = {
                value: from,
                onInit: function( datepicker ) {
                    self.addDisposable( ko.computed( function() {
                        datepicker.maxDate( moment( unwrap( to ) ) );
                    } ) );
                }
            };
            self.toDatepicker = {
                value: to,
                options: {widgetPositioning: {horizontal: 'right'}},
                onInit: function( datepicker ) {
                    self.addDisposable( ko.computed( function() {
                        datepicker.minDate( moment( unwrap( from ) ) );
                    } ) );
                }
            };
        },

        toJSON: function() {
            var self = this;

            var startDate = self.from();
            var endDate = self.to();
            var kvgSettingId = self.kvgSettingId();

            var selectedKvgSetting = self.kvgSettings.find( function( setting ) {
                return setting._id === kvgSettingId;
            } );

            let insuranceTypes = [];
            if ( self._fields.kvg() ) { insuranceTypes.push( 'PRIVATE_CH' ); }
            if ( self._fields.uvg() ) { insuranceTypes.push( 'PRIVATE_CH_UVG' ); }
            if ( self._fields.ivg() ) { insuranceTypes.push( 'PRIVATE_CH_IVG' ); }
            if ( self._fields.mvg() ) { insuranceTypes.push( 'PRIVATE_CH_MVG' ); }
            if ( self._fields.vvg() ) { insuranceTypes.push( 'PRIVATE_CH_VVG' ); }

            return Object.assign( selectedKvgSetting, {
                startDate: (startDate && '' !== startDate) ? moment( startDate ).startOf( 'day' ).toISOString() : '',
                endDate: (endDate && '' !== endDate) ? moment( endDate ).startOf( 'day' ).add( 1, 'day' ).toISOString() : '',
                useStartDate: ('' !== startDate),
                useEndDate: ('' !== endDate),
                minTotal: unwrap(self.minTotal),
                doNotcheckCatalog: unwrap(self.doNotcheckCatalog),
                insuranceTypes: insuranceTypes,
                isTiersPayant: unwrap(self.isTiersPayant),
                isTiersGarant: unwrap(self.isTiersGarant),
                collectMedidataRejected: unwrap(self.collectMedidataRejected)
            } );
        }

    }, {
        ATTRS: {
            type: {
                value: null,
                lazyAdd: false
            },
            kvgSettings: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    /**
     *  Provides a dialog to select the insurance types and date range to generate invoices for
     *  subscribe to event 'cancel' to receive cancellation
     *
     *  @method show
     *  @param  options                     {Object}
     *  @param  options.onCancelDialog      {Function}  Called when dialog is dismissed
     *  @param  options.onSettingsChosen    {Function}  Called when user has chosen date and insurance options
     *
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showFilterKVGInvoiceItemsModal( options ) {
        options = options || {};

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InvoiceMojit/views/FilterKVGInvoiceItemsDialog'} )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new FilterKVGInvoiceItemsModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-FilterKVGInvoiceItemsDialog',
                        className: 'DCWindow-FilterKVGInvoiceItemsDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'FilterKVGInvoiceItemsDialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: WINDOW_SIZE,
                        minWidth: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'FilterKVGInvoiceItemsDialog.buttons.CHOOSESETTINGS.label' ),
                                    name: 'CHOOSESETTINGS',
                                    value: 'CHOOSESETTINGS',
                                    isDefault: true,
                                    disabled: bindings.kvgSettingId(),
                                    action: onChooseSettings
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                function onChooseSettings( e ) {
                    if ( options.onSettingsChosen ) {
                        options.onSettingsChosen( bindings.toJSON() );
                    }

                    dialog.close( e );
                }

                function onVisibilityChange( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        setTimeout( function() { // delay for letting others fire first
                            if ( options.onCancelDialog ) {
                                options.onCancelDialog();
                            }

                            bindings.dispose();
                            ko.cleanNode( bodyContent.getDOMNode() );
                        }, 10 );
                    }
                }

                ko.applyBindings( bindings, bodyContent.getDOMNode() );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).filterKVGInvoiceItems = {
        show: showFilterKVGInvoiceItemsModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel'
    ]
} );
