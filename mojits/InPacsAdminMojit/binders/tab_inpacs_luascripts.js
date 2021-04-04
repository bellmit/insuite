'use strict';

/*global fun:true, ko, $ */
fun = function _fn( Y ) {

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        InPacsLuaScriptModel = KoViewModel.getConstructor( 'InPacsLuaScriptModel' ),
        i18n = Y.doccirrus.i18n;

    function showError( response ) {
        var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            window: { width: 'small' },
            message: errors.join( '<br>' )
        } );
    }

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    ViewModel.ATTRS = {
        data: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( ViewModel, KoViewModel.getDisposable(), {

            luaScripts: ko.observableArray(),
            luaScriptsToBeDeleted: ko.observableArray(),
            node: null,

            initializer: function() {

                this.readLuaScripts();
                this.node = $( '#tab_inpacs_luascripts' );
            },

            readLuaScripts: function() {
                var
                    self = this;

                self.luaScriptsTitleI18n = i18n( 'InPacsAdminMojit.luascripts.title' );
                self.buttonSaveI18n = i18n( 'general.button.SAVE' );
                self.buttonDeleteI18n = i18n( 'general.button.DELETE' );

                Y.doccirrus.utils.showLoadingMask( self.node );
                Y.doccirrus.jsonrpc.api.inpacsluascript.read( {
                    query: {
                        predefined: false
                    }
                } ).done( function( results ) {
                    self.luaScripts( results.data.map( function( rawLuaScriptObject ) {
                        return new InPacsLuaScriptModel( { data: rawLuaScriptObject } );
                    } ) );
                    Y.doccirrus.utils.hideLoadingMask( self.node );
                } ).fail( showError );
            },

            addNewLuaScriptHandler: function tab_inpacs_luascripts__addNewLuaScriptHandler() {
                this.luaScripts.push( new InPacsLuaScriptModel( {
                    data: {
                        predefined: false
                    }
                } ) );
            },

            deleteLuaScriptHandler: function tab_inpacs_luascripts__deleteLuaScriptHandler( luaScriptToDelete ) {
                this.luaScripts.remove( luaScriptToDelete );
                this.luaScriptsToBeDeleted.push( ko.unwrap( luaScriptToDelete._id ) );
            },

            save: function() {
                var
                    self = this;
                Y.doccirrus.modals.OrthancRestartDialog.showDialog( function() {
                    Y.doccirrus.utils.showLoadingMask( self.node );
                    Y.doccirrus.communication.apiCall( {
                        method: 'inpacsluascript.createOrUpdateLuaScripts',
                        data: {
                            scriptsToCreateOrUpdate: ko.unwrap( self.luaScripts ),
                            luaScriptsToBeDeleted: ko.unwrap( self.luaScriptsToBeDeleted )
                        }
                    }, function( err ) {
                        Y.doccirrus.utils.hideLoadingMask( self.node );

                        if( err ) {
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                content: err.message,
                                level: 'ERROR'
                            } );
                        } else {
                            self.luaScriptsToBeDeleted.removeAll();
                            self.readLuaScripts();
                        }
                    } );
                });
            }
        }
    );

    return {
        registerNode: function( node, key, options ) {
            viewModel = new ViewModel( {
                node: function() {
                    return node.getDOMNode();
                },
                data: options
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};