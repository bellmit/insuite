/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'dcpatientupdatemodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function PatientUpdateModel( config ) {
        PatientUpdateModel.superclass.constructor.call( this, config );
    }

    function getDiff(rows, name){
        return {
            columnKeyLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnKeyLabel' ),
            columnValueNewLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueNewLabel' ),
            columnValueOldLabel: i18n( 'InSuiteAdminMojit.showAuditDiffDialog.columnValueOldLabel' ),
            rows: rows.filter( function(el){ return el.area === name; } )
        };
    }


    Y.extend( PatientUpdateModel, KoViewModel.getDisposable(), {

        initializer: function PatientUpdateModel_initializer( config ) {
            var
                self = this;

            self.initValues( config );
        },



        initValues: function( config ) {
            var self = this; //jshint ignore:line

            self.baseDataI18n = i18n( 'PatientTransferMojit.patient_update.baseData' );
            self.insuranceDataI18n = i18n( 'PatientTransferMojit.patient_update.insuranceData' );
            self.egkDataI18n = i18n( 'PatientTransferMojit.patient_update.egkData' );
            self.accountDataI18n = i18n( 'PatientTransferMojit.patient_update.accountData' );
            self.additionalDataI18n = i18n( 'PatientTransferMojit.patient_update.additionalData' );
            self.careDataI18n = i18n( 'PatientTransferMojit.patient_update.careData' );

            this.baseData = ko.observable( config.data.baseData || false );
            this.baseDataVisible = config.data.baseData || false;
            this.insuranceData = ko.observable( config.data.insuranceData || false );
            this.insuranceDataVisible = config.data.insuranceData || false;
            this.egkData = ko.observable( config.data.egkData || false );
            this.egkDataVisible = config.data.egkData || false;
            this.accountData = ko.observable( config.data.accountData || false );
            this.accountDataVisible = config.data.accountData || false;
            this.additionalData = ko.observable( config.data.additionalData || false );
            this.additionalDataVisible = config.data.additionalData || false;
            this.careData = ko.observable( config.data.careData || false );
            this.careDataVisible = config.data.careData || false;

            this.message = i18n( 'PatientTransferMojit.message.patient_found_update');

            var rows = (config.data.rows || []).map( function(row){
               return {
                   area: row.area,
                   property: row.path,
                   oldValue: row.diff.oldValue,
                   newValue: row.diff.newValue
               };
            });
            this.baseDataDiff = getDiff(rows, 'baseData');
            this.insuranceDataDiff = getDiff(rows, 'insuranceData');
            this.egkDataDiff = getDiff(rows, 'egkData');
            this.accountDataDiff = getDiff(rows, 'accountData');
            this.additionalDataDiff = getDiff(rows, 'additionalData');
            this.careDataDiff = getDiff(rows, 'careData');
            this.cb = config.callback;
        }


    }, {
        NAME: 'RuleLogModalModel'
    } );

    KoViewModel.registerConstructor( PatientUpdateModel );

    function show( data ) {
        /* jshint unused:false */
        var
            self = this, //eslint-disable-line no-unused-vars
            node = Y.Node.create( '<div></div>' ),
            modal, //eslint-disable-line no-unused-vars
            viewModel = new PatientUpdateModel( data );

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'patient_update_modal',
            'PatientTransferMojit',
            {},
            node,
            function() {

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-PatientTransferUpadate',
                    bodyContent: node,
                    title: i18n( 'utils_clientJS.confirmDialog.title.CONFIRMATION' ),
                    icon: Y.doccirrus.DCWindow.ICON_QUESTION,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                    viewModel.cb( null, {
                                        baseData: viewModel.baseData(),
                                        insuranceData: viewModel.insuranceData(),
                                        egkData: viewModel.egkData(),
                                        accountData: viewModel.accountData(),
                                        additionalData: viewModel.additionalData(),
                                        careData: viewModel.careData()
                                    } );
                                }
                            } )
                        ]
                    }
                } );

                ko.applyBindings( viewModel, node.getDOMNode() );
            }
        );
    }


    Y.namespace( 'doccirrus.modals' ).patientUpdateModal = {
        show: show
    };

}, '0.0.1', {
    requires: [
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
