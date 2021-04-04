/*jslint anon:true, sloppy:true, moment:true*/
/*global fun:true,ko */
/*exported fun */

fun = function _fn( Y ) {
    'use strict';
    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function InSuiteSystemMessagesView() {
        InSuiteSystemMessagesView.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSuiteSystemMessagesView, KoViewModel.getDisposable(), {

            init: function() {
                var self = this;
                self.warningHeaderI18n = i18n('InSuiteAdminMojit.tab_system_messages.warning_header');
                self.errorsHeaderI18n = i18n( 'InSuiteAdminMojit.tab_system_messages.errors_header' );
                self.buttonDeleteI18n = i18n('general.button.DELETE');
                self.logLevelTileI18n = i18n('InSuiteAdminMojit.tab_system_messages.logLevel');
                self.warn = i18n('casefolder-schema.CaseFolder_T.warnings.i18n');
                self.err = i18n('casefolder-schema.CaseFolder_T.errors.i18n');
                self.logFile = ko.observable();
                self._selectOptions = ko.observableArray();
                self.selectedId = ko.observable();
                self.initSelectOption();
                self.load();
                self.switchLogLevel();
            },
            initializer: function() {
                var
                    self = this;
                self.init();

            },

        /**
         * if the webpage loading this function will run.
         * the error log is shown
         */
        load: function() {
                var self = this;
                Y.doccirrus.jsonrpc.api.settings.getLogFile( { query: { logType: "error" } } )
                    .done( function ( res ) {
                        if ( res && res.data ){
                            if ( !Y.Object.isEmpty( res.data ) ) {
                                self.logFile( res.data );
                            }
                        }
                    } )
                    .fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.message
                        } );
                    } );
        },

        /**
         * this function  delete the current log at the view
         */
        clearLogView: function(  ){
            document.systemLogForm.reset();
        },
        /**
         * this function init the option fields of the HTML command select at the form.
         */
        initSelectOption: function(){
                var self = this;
                self._selectOptions.push({_id: '0', text: self.err});
                self._selectOptions.push({_id: '1', text: self.warn});
        },

        /**
         * this function change the log level
         */
        switchLogLevel: function(  ){
              var self = this;
              self.selectedId.subscribe(function( id ){
                if(id === '0'){
                    Y.doccirrus.jsonrpc.api.settings.getLogFile( { query: { logType: "error" } } )
                    .done( function ( res ) {
                        if ( res && res.data ){
                            if ( !Y.Object.isEmpty( res.data ) ) {
                                self.logFile( res.data );
                            }
                        }
                    } )
                    .fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.message
                        } );
                    } );
                }

                if(id === '1'){
                    Y.doccirrus.jsonrpc.api.settings.getLogFile( { query: { logType: "warn" } } )
                    .done( function ( res ) {
                        if ( res && res.data ){
                            if ( !Y.Object.isEmpty( res.data ) ) {
                                self.logFile( res.data );
                            }
                        }
                    } )
                    .fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.message
                        } );
                    });
                }
              });
            }
        }
    );

    return {
        registerNode: function( node ) {
            viewModel = new InSuiteSystemMessagesView();

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};
