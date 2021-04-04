/*global fun:true, ko */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        SAVE = i18n( 'general.button.SAVE' ),
        BACK = i18n( 'general.button.BACK' ),
        SAVE_FAIL = i18n( 'CRMMojit.crm_company_browser_tabJS.message.SAVE_FAIL' ),
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        crmContactBrowserModel,
        KoComponentManager = KoUI.KoComponentManager,
        Disposable = KoViewModel.getDisposable();

    function CRMContactBrowserModel() {
        CRMContactBrowserModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( CRMContactBrowserModel, Disposable, {
        initializer: function CRMContactBrowserModel_initializer() {
            var
                self = this;
            self.initCRMContactBrowserModel();
        },
        destructor: function CRMContactBrowserModel_destructor() {
            var
                self = this;
            self.contactModel.destroy();
        },
        initCRMContactBrowserModel: function() {
            var
                self = this,
                contactData = self.get( 'contact' );

            self.centralContactI18n = i18n('customer-schema.base.centralContact.i18n');
            self.talkI18n = i18n( 'person-schema.Talk_E.i18n' );
            self.kbvDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
            self.titleComI18n = i18n( 'InCaseMojit.communication_item.title.TITLE_COM' );

            self.contactModel = KoViewModel.createViewModel( {
                NAME: 'ContactModel',
                config: {data: contactData}
            } );
            self.initButtons();
        },
        initButtons: function() {
            var self = this,
                pageData = self.get( 'pageData' );

            self.goBackBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'goBackBtn',
                    text: BACK,
                    click: function() {
                        if( pageData.prevTab ) {
                            window.open( pageData.prevTab, '_self' );
                        } else {
                            window.open( '/crm', '_self' );
                        }

                    }
                }
            } );

            self.saveContact = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: SAVE,
                    option: 'PRIMARY',
                    disabled: self.addDisposable( ko.computed( function() {
                        return !self.contactModel._isValid();
                    } ) ),
                    text: SAVE,
                    click: function() {
                        let contactData;
                        if( self.contactModel._isValid() ) {
                            contactData = self.contactModel.toJSON();
                            Y.doccirrus.jsonrpc.api.contact.update( {
                                query: {
                                    _id: contactData._id
                                },
                                data: contactData,
                                fields: Object.keys( contactData )
                            } )
                                .done( function() {
                                    self.goBackBtn.click();
                                } )
                                .fail( function() {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'error',
                                        message: SAVE_FAIL
                                    } );
                                } );
                        }
                    }
                }
            } );

        }
    }, {
        ATTRS: {
            contact: {
                value: {},
                lazyAdd: false
            },
            pageData: {
                value: {},
                lazyAdd: false
            }
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            function loadData( contactId, callback ) {

                Y.log( 'Loading contact data', 'debug', NAME );
                if( !contactId ) {
                    Y.log( 'Could not load contact. contactId is missing', 'debug', NAME );
                    return callback( 'Could not load contact. contactId is missing' );
                }
                Y.doccirrus.jsonrpc.api.contact.read( {
                    query: {
                        _id: contactId
                    }
                } )
                    .done( function( response ) {
                        var data = response && response.data && response.data[0];
                        if( data ) {
                            Y.log( 'Loaded contact, id: ' + data._id, 'debug', NAME );
                            return callback( null, data );
                        }

                        Y.log( 'Contact with id: ' + contactId + ', not found', 'debug', NAME );
                        callback( 'Contact with id: ' + contactId + ', not found' );
                    } )
                    .fail( function( response ) {
                        Y.log( 'Could not load contact with id: ' + contactId + '. Error: ' + JSON.stringify( response.error ), 'debug', NAME );
                        callback( response.error );
                    } );
            }

            function init( contactData ) {
                crmContactBrowserModel = new CRMContactBrowserModel( {
                    contact: contactData || {},
                    pageData: options.pageData
                } );

                ko.applyBindings( crmContactBrowserModel, node.getDOMNode() );
            }

            loadData( options.pageData.contactId, function( err, data ) {
                if( !err ) {
                    init( data );
                }
            } );
        },
        deregisterNode: function() {
            if( crmContactBrowserModel && crmContactBrowserModel.destroy ) {
                crmContactBrowserModel.destroy();
            }

        }
    };
};