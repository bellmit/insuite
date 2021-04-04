/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCTrialDaysModal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            MODAL_TITLE = i18n( 'CRMMojit.trial_modal.MODAL_TITLE' ),
            EMPTY_TENANT = i18n( 'CRMMojit.companiesbrowser.dropdown.EMPTY_TENANT' );

        function TrialDaysModel( config ) {
            var self = this,
                numValidation = Y.doccirrus.validations.common.num[0];

            function validateDays( newValue ) {
                var hasError = false,
                    msg = [];
                self.days.validationMessages( [] );
                if( !numValidation.validator( newValue ) ) {
                    hasError = true;
                    msg.push( numValidation.msg );
                }
                self.days.hasError( hasError );
                self.days.validationMessages( msg );
            }
            function loadTenantsTemplates() {
                Y.doccirrus.jsonrpc.api.company.getTemplateTenants( {} )
                    .done( function( response ) {
                        var data = response.data;
                        data.forEach( function( template ) {
                            self.tenantsTemplates.push( template );
                        } );
                    } )
                    .fail( function( response ) {
                        Y.log( ' Could not get tenants templates. Error: ' + response.error, 'error', NAME );
                    } )
                    .always( function(){
                        self.tenantsTemplates.push( {_id: '', coname: EMPTY_TENANT} );
                    });
            }


            Y.doccirrus.uam.ViewModel.mixDisposable( self );

            self.days = ko.observable( config.days );
            self.days.hasError = ko.observable();
            self.days.validationMessages = ko.observableArray();
            self.days.subscribe( function( newValue ) {
                validateDays( newValue );
            } );
            self.affectedTenants = config.affectedTenants.join( ', ' );
            self.tenantsTemplates = ko.observableArray();
            self.tenantTemplate = ko.observable();
            loadTenantsTemplates();

        }

        function TrialDaysModal() {

        }

        TrialDaysModal.prototype.showDialog = function( data, callback ) {
            function show() {
                var modal,
                    node = Y.Node.create( '<div></div>' ),
                    trialDaysModel = new TrialDaysModel( data );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'trialdays_modal',
                    'CRMMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_QUESTION,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
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
                                            callback( { days: ko.utils.peekObservable( trialDaysModel.days ), templateTenantId: ko.utils.peekObservable( trialDaysModel.tenantTemplate ).tenantId } );
                                            modal.close();
                                        }

                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    if( trialDaysModel && trialDaysModel._dispose ) {
                                        trialDaysModel._dispose();
                                    }
                                }
                            }
                        } );
                        trialDaysModel.selectedDataPoolI18n = i18n('CRMMojit.companiesbrowser.label.SELECTED_DATA_POOL');
                        ko.applyBindings( trialDaysModel, node.getDOMNode().querySelector( '#trialDaysModel' ) );
                    }
                );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).trialDaysModal = new TrialDaysModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcvalidations'
        ]
    }
);