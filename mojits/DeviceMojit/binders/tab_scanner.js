/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
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

            self.dynamsoftI18n = i18n( 'settings-schema.Settings_T.dynamsoft.i18n' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );

            self.initActions();
            self.initLoadMask();

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
                    data: Y.merge( data, {fields_: ['dynamsoft']} )
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
                            messageId: 'tab_scanner-save',
                            content: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                    }

                    return response;
                } )
                .fail( fail )
                .always( function() {
                    self.pending( false );
                } );

        }
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
