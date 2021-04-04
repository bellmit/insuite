/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null,
        beforeUnloadView = null;

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
     * clear handle ViewModel modifications when leaving view
     */
    function detachConfirmModifications() {
        if( beforeUnloadView ) {
            beforeUnloadView.detach();
            beforeUnloadView = null;
        }
    }

    /**
     * handle ViewModel modifications when leaving view
     */
    function attachConfirmModifications() {
        beforeUnloadView = Y.doccirrus.utils.getMojitBinderByType( 'DeviceMojit' ).router.on( 'beforeUnloadView', function( yEvent, event ) {
            var
                modifications,
                isTypeRouter,
                isTypeAppHref;

            if( !(viewModel && viewModel.isModified()) ) {
                return;
            }

            isTypeRouter = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.router);
            isTypeAppHref = (event.type === Y.doccirrus.DCRouter.beforeUnloadView.type.appHref);

            yEvent.halt( true );

            // no further handling for other kinds
            if( !(isTypeRouter || isTypeAppHref) ) {
                return;
            }

            modifications = Y.doccirrus.utils.confirmModificationsDialog();

            modifications.on( 'discard', function() {

                viewModel.set( 'data', viewModel.get( 'data' ) ); // reset to last data
                detachConfirmModifications();

                if( isTypeRouter ) {
                    event.router.goRoute();
                }
                if( isTypeAppHref ) {
                    event.appHref.goHref();
                }

            } );

            modifications.on( 'save', function() {

                viewModel.save().done( function() {

                    detachConfirmModifications();

                    if( isTypeRouter ) {
                        event.router.goRoute();
                    }
                    if( isTypeAppHref ) {
                        event.appHref.goHref();
                    }

                } );

            } );

        } );
    }

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initViewModel();
            self.load();
        },
        /** @protected */
        destructor: function() {
        },
        /**
         * Initializer
         */
        initViewModel: function() {
            var
                self = this;

            self.inOutHeaderI18n = i18n( 'DeviceMojit.tab_inOut.header' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.inOutActivatedI18n = i18n( 'settings-schema.inPort_T.inOutActivated.i18n' );
            self.macintoshHeadlineI18n = i18n( 'DeviceMojit.tab_inOut.instructions.macintosh.headline' );
            self.macintosh1I18n = i18n( 'DeviceMojit.tab_inOut.instructions.macintosh.1' );
            self.macintosh2I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_inOut.instructions.macintosh.2', {data: {'style-em':'<em>','/style-em':'</em>','link-deviceAdapter':'<a href="/inport#/serial" target="_blank">','/link-deviceAdapter':'</a>'}} ) );
            self.macintosh3I18n = i18n( 'DeviceMojit.tab_inOut.instructions.macintosh.3' );
            self.macintosh4I18n = i18n( 'DeviceMojit.tab_inOut.instructions.macintosh.4' );
            self.windowsHeadlineI18n = i18n( 'DeviceMojit.tab_inOut.instructions.windows.headline' );
            self.windows1I18n = i18n( 'DeviceMojit.tab_inOut.instructions.windows.1' );
            self.windows2I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_inOut.instructions.windows.2', {data: {'style-em':'<em>','/style-em':'</em>','link-deviceAdapter':'<a href="/inport#/serial" target="_blank">','/link-deviceAdapter':'</a>'}} ) );
            self.windows3I18n = i18n( 'DeviceMojit.tab_inOut.instructions.windows.3' );
            self.windows4I18n = i18n( 'DeviceMojit.tab_inOut.instructions.windows.4' );
            self.inOutIdentitiesTableHeadlineI18n = i18n( 'DeviceMojit.tab_inOut.inOutIdentitiesTable.headline' );

            self.initActions();
            self.initLoadMask();
            self.initInOutIdentitiesTable();
            self.initButtonAddCard();
            self.initButtonResetCard();

        },
        // handle view
        /**
         * bound node
         */
        node: null,
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

            self.node = ko.observable( null );
            self.pending = ko.observable( false );
            self.saveDisabled = ko.computed( function() {
                var
                    pending = self.pending(),
                    valid = self._isValid(),
                    modified = self.isModified();

                return pending || !(modified && valid);
            } ).extend( {rateLimit: 0} );

        },
        /**
         * init the loading mask
         */
        initLoadMask: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    pending = self.pending(),
                    node = self.node();

                if( !node ) {
                    return;
                }

                if( pending ) {
                    Y.doccirrus.utils.showLoadingMask( node );
                }
                else {
                    Y.doccirrus.utils.hideLoadingMask( node );
                }

            } ).extend( {rateLimit: 0} ) );
        },
        /**
         * load data for this view
         */
        load: function() {
            var
                self = this;

            self.pending( true );
            Y.doccirrus.jsonrpc.api.settings.read()
                .then( function( response ) {
                    return response && response.data && response.data[0] || null;
                } )
                .done( function( settings ) {
                    self.set( 'data', settings );
                    self.setNotModified();
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

        },
        /**
         * save data for this view
         * @return {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                data = self.toJSON();

            self.pending( true );

            return Y.doccirrus.jsonrpc.api.settings
                .update( {
                    query: {_id: data._id},
                    data: Y.merge( data, {fields_: ['inOutActivated']} )
                } )
                // notify about update
                .then( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }

                    if( response.data ) {
                        self.set( 'data', response.data );
                        self.setNotModified();
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_inOut-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    }

                    return response;
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

        },
        /**
         * KoTable instance holding identities
         */
        inOutIdentitiesTable: null,
        /**
         * computes identities configuration's visibility
         */
        inOutIdentitiesConfigurationVisible: null,
        /**
         * Init KoTable instance holding identities
         */
        initInOutIdentitiesTable: function() {
            var
                self = this;

            self.inOutIdentitiesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inOutIdentitiesTable',
                    states: ['limit'],
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.identity.read,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'identity-schema.Identity_T.firstname' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'identity-schema.Identity_T.lastname' ),
                            sortInitialIndex: 0,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'cardKey',
                            label: i18n( 'identity-schema.Identity_T.cardKey.i18n' )
                        }
                    ],
                    selectMode: 'none',
                    onRowClick: function( meta ) {
                        var
                            self = this,
                            data = meta.row,
                            checkBoxColumn = self.getComponentColumnCheckbox();

                        if( checkBoxColumn.isChecked( data ) ) {
                            checkBoxColumn.uncheck( data );
                        }
                        else {
                            checkBoxColumn.check( data );
                        }

                    }
                }
            } );

            self.inOutIdentitiesConfigurationVisible = ko.computed( function() {
                self.isModified();
                ko.unwrap( self.inOutActivated );

                return self.get( 'data.inOutActivated' );
            } ).extend( {rateLimit: 0} );
        },
        /**
         * KoButton instance to add cardKey for checked identity
         */
        buttonAddCard: null,
        /**
         * Init KoButton instance to add cardKey for checked identity
         */
        initButtonAddCard: function() {
            var
                self = this,
                inOutIdentitiesTable = self.inOutIdentitiesTable,
                checkBoxColumn = self.inOutIdentitiesTable.getComponentColumnCheckbox();

            self.buttonAddCard = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'buttonAddCard',
                    text: i18n( 'DeviceMojit.tab_inOut.inOutIdentitiesTable.buttonAddCard.text' ),
                    disabled: ko.computed( function() {
                        var
                            checked = checkBoxColumn.checked();

                        if( 1 === checked.length && !checked[0].cardKey ) {
                            return false;
                        }

                        return true;
                    } ),
                    click: function() {
                        var
                            checked = checkBoxColumn.checked(),
                            data = checked[0];

                        if( data && !data.cardKey ) {

                            checkBoxColumn.uncheck( data );

                            Y.doccirrus.jsonrpc.api.inout
                                .assignCardInfoToIdentity( {identityId: data._id} )
                                .then( function( response ) {
                                    var
                                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                    if( warnings.length ) {
                                        Y.Array.invoke( warnings, 'display' );
                                    }

                                    if( response.data ) {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            messageId: 'tab_inOut-inout-assignCardInfoToIdentity',
                                            content: i18n( 'general.message.CHANGES_SAVED' )
                                        } );
                                    }

                                    return response;
                                } )
                                .fail( fail )
                                .always( function() {
                                    inOutIdentitiesTable.reload();
                                } );
                        }
                    }
                }
            } );
        },
        /**
         * KoButton instance to reset cardKey for checked identity
         */
        buttonResetCard: null,
        /**
         * Init KoButton instance to reset cardKey for checked identity
         */
        initButtonResetCard: function() {
            var
                self = this,
                inOutIdentitiesTable = self.inOutIdentitiesTable,
                checkBoxColumn = inOutIdentitiesTable.getComponentColumnCheckbox();

            self.buttonResetCard = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'buttonResetCard',
                    text: i18n( 'DeviceMojit.tab_inOut.inOutIdentitiesTable.buttonResetCard.text' ),
                    disabled: ko.computed( function() {
                        var
                            checked = checkBoxColumn.checked();

                        if( 1 === checked.length && checked[0].cardKey ) {
                            return false;
                        }

                        return true;
                    } ),
                    click: function() {
                        var
                            checked = checkBoxColumn.checked(),
                            data = checked[0];

                        if( data && data.cardKey ) {

                            checkBoxColumn.uncheck( data );

                            data.cardKey = '';

                            Y.doccirrus.jsonrpc.api.identity
                                .update( {
                                    query: {_id: data._id},
                                    data: Y.merge( data, {fields_: ['cardKey']} )
                                } )
                                // notify about update
                                .then( function( response ) {
                                    var
                                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                                    if( warnings.length ) {
                                        Y.Array.invoke( warnings, 'display' );
                                    }

                                    if( response.data ) {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            messageId: 'tab_inOut-identity-update',
                                            content: i18n( 'general.message.CHANGES_SAVED' )
                                        } );
                                    }

                                    return response;
                                } )
                                .fail( fail )
                                .always( function() {
                                    inOutIdentitiesTable.reload();
                                } );
                        }
                    }
                }
            } );
        },

        inOutLicensed: Y.doccirrus.auth.hasAdditionalService("inOut")
    }, {
        schemaName: 'settings'
    } );

    viewModel = new ViewModel();

    return {

        registerNode: function( node ) {
            viewModel.node( node.getDOMNode() );
            attachConfirmModifications();
            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            detachConfirmModifications();
            viewModel.node( null );
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
