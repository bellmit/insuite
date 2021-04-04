/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun */
'use strict';
fun = function _fn( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        PracticeModel = KoViewModel.getConstructor( 'PracticeModel' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        SAVE = i18n( 'general.button.SAVE' ),
        viewModel = null;

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, PracticeModel, {
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.load();
            //translations
            self.companyTitleI18n = i18n( 'InSuiteAdminMojit.tab_company.title.PRACTICE' );
            self.companyTypeI18n = i18n( 'person-schema.Company_T.cotype' );
            self.companyNameI18n = i18n( 'person-schema.Company_T.coname' );
            self.countryModeI18n = i18n( 'customer-schema.base.countryMode.i18n' );
            self.companyLastNameI18n = i18n( 'general.title.LASTNAME' );
            self.companyFirstNameI18n = i18n( 'general.title.FIRSTNAME' );
            self.companyWorkingAtI18n = i18n( 'person-schema.Person_T.workingAt' );
            self.supportContactI18n = i18n( 'practice-schema.Practice_T.supportContact.i18n' );
            self.pleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );
            self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );

        },
        destructor: function() {
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;
            self.isVPRCAdminAppliance = ko.observable();
            self.saveHostName = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: SAVE,
                    option: 'PRIMARY',
                    disabled: ko.computed( function() {
                        return !self._isValid() || !self.isModified();
                    } ),
                    text: SAVE,
                    click: function() {
                        Y.doccirrus.jsonrpc.api.company.setVprcFQHostNameFromMVPRC( {
                            data: {
                                vprcFQHostName: self.vprcFQHostName()
                            }
                        } ).done()
                            .fail( function( error ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: JSON.stringify( error )
                                } );
                            } );
                    }
                }
            } );

            self.initActions();
            self.initLoadMask();

            self.countryModeIncludesSwitzerland = ko.computed( function() {
                return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
            } );

        },
        // handle view
        /**
         * busy flag
         */
        pending: null,
        /**
         * save disabled computed
         */
        saveDisabled: null,
        /**
         * init actions this view exposes
         */
        initActions: function() {
            var
                self = this;

            self.pending = ko.observable( false );
        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            self.addDisposable( ko.computed( function() {

                if( self.pending() ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                }
                else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ) );
        },
        updateReadOnly: function() {
            var
                self = this;
            self.getModuleViewModelReadOnly()._makeReadOnly( {
                paths: [ '*' ]
            } );
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );
            Y.doccirrus.jsonrpc.api.practice
                .read()
                .then( function( response ) {
                    return response && response.data && response.data[ 0 ] || null;
                } )
                .done( function( practice ) {
                    var
                        supportContactModel,
                        centralContactModel;
                    if( practice && practice.supportContact && 'string' !== typeof practice.supportContact ) {
                        supportContactModel = KoViewModel.createViewModel( {
                            NAME: 'SupportBaseContactModel',
                            config: { data: practice.supportContact }
                        } );
                        delete practice.supportContact;
                    }

                    if( practice && practice.centralContact && 'string' !== typeof practice.centralContactModel ) {
                        centralContactModel = KoViewModel.createViewModel( {
                            NAME: 'ContactModel',
                            config: { data: practice.centralContact }
                        } );
                        delete practice.centralContact;
                    }

                    //delete practice.centralContact;

                    self.set( 'data', practice );
                    self.isVPRCAdminAppliance( Y.doccirrus.auth.isVPRCAdmin() && Y.doccirrus.schemas.company.systemTypes.TRIAL !== self.systemType() );
                    self.supportContact( supportContactModel );
                    self.centralContact( centralContactModel );
                    self.setNotModified();
                    self.updateReadOnly();

                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

        }

    }, {
        schemaName: PracticeModel.schemaName,
        ATTRS: {
            node: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {

        registerNode: function( node ) {

            // set viewModel
            viewModel = new ViewModel( {
                validatable: true,
                node: node.getDOMNode()
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }

        }
    };
};
