/**
 * User: pi
 * Date: 03/06/16  10:27
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';

YUI.add( 'DCLicenseEmailModal', function( Y ) {

        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            peek = ko.utils.peekObservable;

        function LicenseEmailModel() {
            LicenseEmailModel.superclass.constructor.apply( this, arguments );
        }

        LicenseEmailModel.ATTRS = {
            /**
             * type of license
             */
            licenseType: {
                value: '',
                lazyAdd: false
            }
        };

        Y.extend( LicenseEmailModel, Y.doccirrus.KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initLicenseEmailModel();
            },
            initLicenseEmailModel: function LicenseEmailModel_initLicenseEmailModel() {
                var
                    self = this,
                    licenseType = self.get( 'licenseType' );
                self.emailContent = ko.observable();
                self.emailContent.i18n = i18n( "LicenseMojit.license_email_modal_clientJS.text.EMAIL_CONTENT" );
                self.title = ko.observable( Y.Lang.sub( i18n( "LicenseMojit.license_email_modal_clientJS.text.TITLE" ), { licenseType: licenseType } ) );
                self.title.i18n = i18n( "general.title.TITLE" );
                self.info = Y.Lang.sub( i18n( "LicenseMojit.license_email_modal_clientJS.text.INFO" ), { licenseType: licenseType } );
                self.shortDescription = i18n( "InSuiteAdminMojit.insuiteadmin.basesystemdesc." + licenseType );
                self.shortDescriptionLable = i18n( "general.title.DESCRIPTION" );
            },
            /** @protected */
            destructor: function() {
            },
            sendEmail: function LicenseEmailModel_sendEmail() {
                var
                    self = this;
                return Promise.resolve( Y.doccirrus.jsonrpc.api.communication.sendLicenseEmail( {
                    data: {
                        title: peek( self.title ),
                        emailContent: peek( self.emailContent ),
                        licenseType: self.get( 'licenseType' )
                    }
                } ) );
            }
        } );

        function LicenseEmailModal() {
        }

        LicenseEmailModal.prototype = {
            show: function( config ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'LicenseMojit/views/license_email_modal' } )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            licenseEmailModel = new LicenseEmailModel( config.data ),
                            bodyContent = Y.Node.create( template ),
                            modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Appointment',
                                bodyContent: bodyContent,
                                icon: Y.doccirrus.DCWindow.ICON_INFO,
                                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                height: 600,
                                minHeight: 600,
                                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                                maximizable: true,
                                resizable: false,
                                focusOn: [],
                                centered: true,
                                modal: true,
                                render: document.body,
                                buttons: {
                                    header: [ 'close' ],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                licenseEmailModel.sendEmail()
                                                    .then( function() {
                                                        Y.doccirrus.DCWindow.notice( {
                                                            type: 'success',
                                                            message: i18n( "LicenseMojit.license_email_modal_clientJS.text.EMAIL_SENT" )
                                                        } );
                                                    } )
                                                    .catch( function( error ) {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                    } );
                                                modal.close();
                                            }
                                        } )
                                    ]
                                },
                                after: {
                                    visibleChange: function( event ) {
                                        if( !event.newVal ) {
                                            ko.cleanNode( bodyContent.getDOMNode() );
                                            licenseEmailModel.destroy();
                                        }
                                    }
                                }
                            } );
                        ko.applyBindings( licenseEmailModel, bodyContent.getDOMNode() );

                    } )
                    .catch( catchUnhandled );
            }
        };

        Y.namespace( 'doccirrus.modals' ).licenseEmailModal = new LicenseEmailModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',

            'DCWindow',
            'KoViewModel'
        ]
    }
);

