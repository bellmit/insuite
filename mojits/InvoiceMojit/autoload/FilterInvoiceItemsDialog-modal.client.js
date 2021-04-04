/*global YUI, ko, moment */
'use strict';
YUI.add( 'filterinvoicelogitems-modal', function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        FOOTER_TEXT_PVS = i18n( 'FilterInvoiceItemsDialog.FOOTER_TEXT_PVS' ),
        FOOTER_TEXT_CASH_BOOK = i18n( 'FilterInvoiceItemsDialog.FOOTER_TEXT_CASH_BOOK' ),
        PVS_SETTINGS = i18n( 'FilterInvoiceItemsDialog.pvsSettingsLink' ),
        CASH_SETTINGS = i18n( 'FilterInvoiceItemsDialog.cashSettingsLink' ),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 700,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function FilterInvoiceItemsModel( config ) {
        FilterInvoiceItemsModel.superclass.constructor.call( this, config );
    }

    Y.extend( FilterInvoiceItemsModel, Disposable, {
        initializer: function() {
            var
                self = this;

            self._initFields();
            self._initDatepickers();
            self.FIDatepickerTextI18n = i18n( 'FilterInvoiceItemsDialog.datepickerText' );
            self.FICheckBoxTextI18n = i18n( 'FilterInvoiceItemsDialog.checkboxText' );
            self.FIPrivateLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.private.label' );
            self.FISelfPlayerLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.selfpayer.label' );
            self.FIBgLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.bg.label' );
            self.FIFromLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.from.label' );
            self.FIDoNotCheckCatalogLabelTextI18n = i18n('FilterInvoiceItemsDialog.doNotcheckCatalog.label');
            self.FIToLabelTextI18n = i18n( 'FilterInvoiceItemsDialog.to.label' );
            self.FIPadxSettingsSelectionTextI18n = i18n( 'FilterInvoiceItemsDialog.padxSettingSelection' );
            self.KVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_PKV_CH_SCHEIN' );
            self.IVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_IVG_SCHEIN' );
            self.UVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_UVG_SCHEIN' );
            self.MVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_MVG_SCHEIN' );
            self.VVGCheckboxi18n = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_VVG_SCHEIN' );
        },
        destructor: function() {

        },
        _fields: null,
        private: null,
        selfpayer: null,
        bg: null,
        kvg: null,
        uvg: null,
        ivg: null,
        mvg: null,
        vvg: null,
        doNotcheckCatalog: null,
        from: null,
        to: null,
        _initFields: function() {
            var
                self = this,
                type = self.get( 'type' ),
                _fields = self._fields = {},
                locnames = [];

            self.isPVS = 'PVS' === type;
            self.isCASH = 'CASH' === type;
            self.hasSwissLocation = false;
            self.hasGermanLocation = false;
            self.hasGermanSettings = false;
            self.hasSwissSettings = false;
            self.isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
            self.padxSettings = self.isPVS || self.isCASH ? self.get( 'padxSettings' ) : [];
            self.padxSettingsOptions = [];
            self.padxSettings.forEach( function( setting ) {
                setting.countryCode = setting.countryCode || 'D';
                locnames = [];
                if(setting.countryCode === 'CH') {
                    self.hasSwissSettings = true;
                }
                if(setting.countryCode === 'D') {
                    self.hasGermanSettings = true;
                }
                setting.locations.forEach( function( loc ) {
                    loc.countryCode = loc.countryCode || 'D';
                    locnames.push( loc.locname );
                    if(loc.countryCode === 'CH') {
                        self.hasSwissLocation = true;
                    }
                    if(loc.countryCode === 'D') {
                        self.hasGermanLocation = true;
                    }
                } );
                self.padxSettingsOptions.push( {
                    value: (self.isCASH ? setting.cashSettingTitle : setting.padxSettingTitle) + ' ' + (self.isCASH ? '' : '(' + setting.senderCustomerNo + ') ') + locnames.join( ', ' ),
                    _id: setting._id
                } );
            } );
            if( self.hasSwissLocation ) {
                _fields.kvg = ko.observable( true );
                _fields.uvg = ko.observable( true );
                _fields.ivg = ko.observable( true );
                _fields.mvg = ko.observable( true );
                _fields.vvg = ko.observable( true );
            }

            // if no location for Germany allowed
            if( self.hasGermanLocation || ( self.isGermany && self.hasGermanSettings ) ) {
                _fields.private = ko.observable( true );
                _fields.bg = ko.observable( true );
                _fields.doNotcheckCatalog = ko.observable( true );
            }
            _fields.selfpayer = ko.observable( true );
            _fields.doNotcheckCatalog = ko.observable( true );

            _fields.from = ko.observable( moment().startOf( 'month' ).toISOString() );
            _fields.to = ko.observable( moment().toISOString() );

            self.minTotal = ko.observable( 0 );
            self.minTotal.i18n = i18n( 'FilterInvoiceItemsDialog.label.MIN_TOTAL' );
            self.padnextSettingId = ko.observable();
            if( self.isPVS ) {
                self.padxSettingsLink = '<a target="_blank" href="invoiceadmin#/pvs">' + PVS_SETTINGS + '</a>';
                self.footer = FOOTER_TEXT_PVS;
            } else if( self.isCASH ) {
                self.padxSettingsLink = '<a target="_blank" href="invoiceadmin#/cash">' + CASH_SETTINGS + '</a>';
                self.footer = '';
            } else {
                self.footer = FOOTER_TEXT_CASH_BOOK;
            }

            self.displayMinTotal = ko.computed( {
                read: function() {
                    var
                        minTotal = unwrap( self.minTotal );
                    return Y.doccirrus.comctl.numberToLocalString( minTotal );
                },
                write: function( value ) {
                    self.minTotal( Y.doccirrus.comctl.localStringToNumber( value ) || 0 );
                }
            } );

            Y.mix( self, _fields, true );
        },
        fromDatepicker: null,
        toDatepicker: null,
        _initDatepickers: function() {
            var
                self = this,
                _fields = self._fields,
                from = _fields.from,
                to = _fields.to;

            self.fromDatepicker = {
                value: from,
                onInit: function( datepicker ) {
                    self.addDisposable( ko.computed( function() {
                        var
                            maxDate = unwrap( to ) || false;

                        if( maxDate ) {
                            maxDate = moment( maxDate );
                        }
                        else {
                            maxDate = moment();
                        }

                        datepicker.maxDate( maxDate );
                    } ) );
                }
            };
            self.toDatepicker = {
                value: to,
                options: {widgetPositioning: {horizontal: 'right'}},
                onInit: function( datepicker ) {
                    self.addDisposable( ko.computed( function() {
                        var
                            minDate = unwrap( from ) || false;

                        if( minDate ) {
                            minDate = moment( minDate );
                        }

                        datepicker.minDate( minDate );
                        //datepicker.maxDate( moment() );
                    } ) );
                }
            };
        },

        /**
         *  Return array of insurance types names to add to new pvslogs
         *  @return {Array}
         */

        getInsuranceTypes: function() {
            var
                self = this,
                _fields = self._fields,
                insuranceTypes = [];

            if ( _fields.bg && _fields.bg() ) { insuranceTypes.push( 'BG' ); }
            if ( _fields.private && _fields.private() ) { insuranceTypes.push( 'PRIVATE' ); }
            if ( _fields.privateA && _fields.privateA() ) { insuranceTypes.push( 'PRIVATE_A' ); } // MOJ-14319:
            if ( _fields.selfpayer() ) { insuranceTypes.push( 'SELFPAYER' ); }
            if ( _fields.kvg && _fields.kvg() ) { insuranceTypes.push( 'PRIVATE_CH' ); }
            if ( _fields.uvg && _fields.uvg() ) { insuranceTypes.push( 'PRIVATE_CH_UVG' ); }
            if ( _fields.ivg && _fields.ivg() ) { insuranceTypes.push( 'PRIVATE_CH_IVG' ); }
            if ( _fields.mvg && _fields.mvg() ) { insuranceTypes.push( 'PRIVATE_CH_MVG' ); }
            if ( _fields.vvg && _fields.vvg() ) { insuranceTypes.push( 'PRIVATE_CH_VVG' ); }
            return insuranceTypes;
        },

        /**
         * Serializes this Model to a javascript object.
         * @method toJSON
         * @returns {Object}
         */
        toJSON: function() {
            var
                self = this,
                _fields = self._fields,
                startDate = _fields.from(),
                endDate = _fields.to(),
                padnextSettingId = self.padnextSettingId(),
                padnextSettingLocations = null,
                padnextSettingEmployees = null,
                padnextSettingTitle = null,
                padnextSettingCustomerNo = null;

            if( padnextSettingId ) {
                self.padxSettings.some( function( setting ) {
                    if( setting._id === padnextSettingId ) {
                        padnextSettingLocations = setting.locations;
                        padnextSettingEmployees = setting.employees;
                        padnextSettingTitle = setting.padxSettingTitle;
                        padnextSettingCustomerNo = setting.senderCustomerNo;
                        return true;
                    }
                } );
            }

            return {
                startDate: ( startDate && '' !== startDate ) ? moment( startDate ).startOf( 'day' ).toISOString() : '',
                useStartDate: ( '' !== startDate ),
                endDate: ( endDate && '' !== endDate ) ? moment( endDate ).startOf( 'day' ).add( 1, 'day' ).toISOString() : '',
                useEndDate: ( '' !== endDate ),
                insuranceTypes: self.getInsuranceTypes(),
                locations: padnextSettingLocations,
                employees: padnextSettingEmployees,
                doNotcheckCatalog: _fields.doNotcheckCatalog(),
                minTotal: peek( self.minTotal ),
                padnextSettingId: padnextSettingId,
                padnextSettingTitle: padnextSettingTitle,
                padnextSettingCustomerNo: padnextSettingCustomerNo
            };

        },

        /**
         *  Sanity check the state of this dialog
         *
         *  @return {Boolean}   False if the dialog state is invalid
         */

        checkValues: function checkValues() {
            var
                self = this,
                settings = self.toJSON();

            if ( 0 === settings.insuranceTypes.length ) {
                //  do not create pvslog which can never match any entries
                return false;
            }

            if ( settings.useStartDate && settings.useEndDate && moment( settings.startDate ).isAfter( settings.endDate ) ) {
                //  not valid if start date is greater than end date
                return false;
            }

            return true;
        }


    }, {
        ATTRS: {
            type: {
                value: null,
                lazyAdd: false
            },
            padxSettings: {
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

    function showFilterInvoiceItemsModal( options ) {
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
                    .renderFile( {path: 'InvoiceMojit/views/FilterInvoiceItemsDialog'} )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new FilterInvoiceItemsModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-FilterInvoiceItemsDialog',
                        className: 'DCWindow-FilterInvoiceItemsDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'FilterInvoiceItemsDialog.title' ),
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
                                    label: i18n( 'FilterInvoiceItemsDialog.buttons.CHOOSESETTINGS.label' ),
                                    name: 'CHOOSESETTINGS',
                                    value: 'CHOOSESETTINGS',
                                    isDefault: true,
                                    action: onChooseSettings
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                /**
                 *  Raised when the CHOOSESETTINGS button is clicked
                 *  @param e
                 */
                function onChooseSettings( e ) {

                    if ( !bindings.checkValues() ) {
                        //  do not try to create pvslogs if options are invalid
                        return;
                    }

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

    Y.namespace( 'doccirrus.modals' ).filterInvoiceItems = {
        show: showFilterInvoiceItemsModal
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
