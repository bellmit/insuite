/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetInvoices', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetInvoices
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),
        defaultActTypes = ['invoice', 'receipt', 'creditNote', 'warning1', 'warning2', 'reminder'],
        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,
        days,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetInvoices;

    /**
     * @constructor
     * @class PatientGadgetInvoices
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetInvoices() {
        PatientGadgetInvoices.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetInvoices, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 1200 );
            self.initPatientGadgetInvoices();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        invoices: null,
        initPatientGadgetInvoices: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                invoiceConfig = binder.getInitialData( 'invoiceconfiguration' );

            days = invoiceConfig && invoiceConfig.dunningSchemes;
            self.invoices = ko.observableArray();
            self.invoicesI18n = i18n( 'PatientGadget.PatientGadgetInvoices.i18n' );

            self.addDisposable( ko.computed( function() {
                self.table.setItems( unwrap( self.invoices ) );
            } ) );

            self.loadTableData();
            self._initCommunication();
        },
        _communicationActivitySubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationActivitySubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'activity',
                callback: function( data ) {
                    var
                        binder = self.get( 'binder' ),
                        currentPatient = binder && peek( binder.currentPatient ),
                        patientId = currentPatient && peek( currentPatient._id ),
                        actTypes = defaultActTypes.map( function( item ) {
                            return item.toUpperCase();
                        } );

                    if( data.some( function( item ) {
                            return actTypes.indexOf( item.actType ) > -1 && item.patientId === patientId;
                        } ) ) {
                        self.loadTableDataDeBounced();
                    }
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationActivitySubscription ) {
                self._communicationActivitySubscription.removeEventListener();
                self._communicationActivitySubscription = null;
            }
        },
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                showOnlyOverdue = self.showOnlyOverdue(),
                selectedActTypes = defaultActTypes.filter( function( item ) {
                        return self[item];
                    } ).map( function( item ) {
                        return item.toUpperCase();
                    } ) || defaultActTypes.map( function( item ) {
                        return item.toUpperCase();
                    } ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            if( showOnlyOverdue ) {
                Y.doccirrus.jsonrpc.api.invoice
                    .getOverdueInvoices( {
                        noBlocking: true,
                        query: {
                            patientId: peek( currentPatient._id )
                        },
                        sort: {timestamp: -1},
                        itemsPerPage: self.loadLimit
                    } )
                    .done( function( response ) {
                        if( self.get( 'destroyed' ) || !self.invoices ) {
                            return;
                        }
                        self.invoices( response.data || [] );
                    } )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            } else {
                Y.doccirrus.jsonrpc.api.activity
                    .read( {
                        noBlocking: true,
                        query: {
                            actType: {$in: selectedActTypes},
                            patientId: peek( currentPatient._id ),
                            status: {$nin: ['CANCELLED', 'PREPARED']}
                        },
                        sort: {timestamp: -1},
                        itemsPerPage: self.loadLimit
                    } )
                    .done( function( response ) {
                        if( self.get( 'destroyed' ) || !self.invoices ) {
                            return;
                        }
                        self.invoices( response.data || [] );
                    } )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            }
        },
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                showOnlyOverdue = self.showOnlyOverdue(),
                selectedActTypes = defaultActTypes.filter( function( item ) {
                        return self[item];
                    } ).map( function( item ) {
                        return item.toUpperCase();
                    } ) || defaultActTypes.map( function( item ) {
                        return item.toUpperCase();
                    } ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            if( showOnlyOverdue ) {
                Y.doccirrus.communication.apiCall( {
                    method: 'invoice.getOverdueInvoices',
                    query: {
                        patientId: peek( currentPatient._id )
                    },
                    options: {
                        sort: {timestamp: -1},
                        itemsPerPage: self.loadLimit
                    }
                }, function( err, response ) {
                    if( err ) {
                        return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }
                    if( !self.get( 'destroyed' ) && self.invoices ) {
                        self.invoices( response.data || [] );
                    }
                } );
            } else {
                Y.doccirrus.communication.apiCall( {
                    method: 'activity.read',
                    query: {
                        actType: {$in: selectedActTypes},
                        patientId: peek( currentPatient._id ),
                        status: {$nin: ['CANCELLED', 'PREPARED']}
                    },
                    options: {
                        sort: {timestamp: -1},
                        itemsPerPage: self.loadLimit
                    }
                }, function( err, response ) {
                    if( err ) {
                        return _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }
                    if( !self.get( 'destroyed' ) && self.invoices ) {
                        self.invoices( response.data || [] );
                    }
                } );
            }
        }
    }, {
        NAME: 'PatientGadgetInvoices',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.TIMESTAMP,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                        converter: function( value ) {
                            return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.STATUS,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                        renderer: function( value ) {
                            var val = peek( value );
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', val, 'i18n', val );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.TYPE,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                        renderer: function( value ) {
                            var val = peek( value );
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', val, 'i18n', val );
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CONTENT,
                        i18n: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                        renderer: function( value, data ) {
                            var
                                result = '',
                                invoiceBilledDate = data.invoiceBilledDate || '',
                                totalReceiptsOutstanding = ( 0 === Number( parseFloat( data.totalReceiptsOutstanding ).toFixed( 2 ) ) ),
                                reminderDays,
                                warning1Days,
                                warning2Days,
                                status = ['CREDITED', 'PARTIALPAYMENT', 'DERECOGNIZED'];

                            if( invoiceBilledDate && days && days.length && -1 === status.indexOf( data.status ) ) {

                                days.forEach(function( day ) {
                                    if( day.locationId === data.locationId ) {
                                        reminderDays = day.reminderDays;
                                        warning1Days = day.warning1Days;
                                        warning2Days = day.warning2Days;
                                    }
                                });

                                if( !reminderDays && !warning1Days && !warning2Days ) {
                                    // set default if not found
                                    reminderDays = days[0].reminderDays;
                                    warning1Days = days[0].warning1Days;
                                    warning2Days = days[0].warning2Days;
                                }

                                if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= reminderDays ) && !totalReceiptsOutstanding && 'WARN1' !== data.status ) {
                                    result = 'color:' + "red";
                                }
                                if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= warning1Days ) && !totalReceiptsOutstanding ) {
                                    result = 'color:' + "red";
                                }
                                if( ( moment(new Date()).startOf('day').diff( moment(invoiceBilledDate).startOf('day'), 'days') >= warning2Days ) && !totalReceiptsOutstanding ) {
                                    result = 'color:' + "red";
                                }
                            }

                            return '<span style="' + result + '">' + ActivityModel.renderContentAsHTML( data ) + '</span>';
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.TIMESTAMP,
                    CONFIG_FIELDS.STATUS,
                    CONFIG_FIELDS.TYPE,
                    CONFIG_FIELDS.CONTENT
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetInvoices );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',

        'ActivityModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommunication-client'
    ]
} );
