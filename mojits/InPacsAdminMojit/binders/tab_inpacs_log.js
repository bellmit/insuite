'use strict';

/*global fun:true, ko, _ */
/*exported fun */
fun = function _fn( Y ) {

    var
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

    function InPacsLogView() {
        InPacsLogView.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InPacsLogView, KoViewModel.getDisposable(), {

        LOGGING_LEVELS: Y.doccirrus.schemas.inpacsconfiguration.types.LogLevel_E.list.map( function( logLevel ) {
            return {
                value: logLevel.val,
                name: logLevel.i18n
            };
        } ),

        selectedLogLevel: null,

        initializer: function(config) {
            var
                self = this;

            self.logFileTitleI18n = i18n( 'InPacsAdminMojit.logfile.title' );
            self.logLevelTitleI18n = i18n( 'InPacsAdminMojit.logfile.logLevel.title' );
            self.buttonDeleteI18n = i18n( 'general.button.DELETE' );

            self.mainNode = config.node;
            self.logFile = {
                log: ko.observable(),
                length: ko.observable()
            };

            self.selectedLogLevel = ko.observable();
            self.disableClearLogButton = ko.observable(true);

            Y.doccirrus.jsonrpc.api.inpacsconfiguration
                .read()
                .then( function( response ) {
                    if( response.data && response.data[0] && response.data[0].logLevel ) {
                        self.selectedLogLevel( self.LOGGING_LEVELS.find( function( logLevel ) {
                            return response.data[0].logLevel === logLevel.value;
                        } ) );
                    }
                    self.selectedLogLevel.subscribe( function( logLevel ) {
                        if( logLevel ) {
                            Y.doccirrus.modals.OrthancRestartDialog.showDialog( function() {
                                Y.doccirrus.utils.showLoadingMask( self.mainNode );

                                Y.doccirrus.communication.apiCall( {
                                    method: 'inpacsconfiguration.setLogLevelAndRestart',
                                    data: {
                                        logLevel: logLevel.value
                                    }
                                }, function( err ) {
                                    Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                                    if(err) {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            content: 'Orthanc reload fehlgeschlagen',
                                            level: 'ERROR'
                                        } );
                                    }
                                } );
                            });
                        }
                    } );
                } );

            self.clearLog = function() {
                var
                    self = this,
                    configuration = _.assign({}, self.config, {lastLogLine: self.config.lastLogLine + unwrap( self.logFile.length )});

                self.disableClearLogButton(true);

                Y.doccirrus.jsonrpc.api.inpacsconfiguration.changeLastLogLine( {
                    data: configuration
                } )
                    .done( function() {
                        self.load();
                    } )
                    .fail( function( err ) {
                        self.disableClearLogButton(false);

                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.message
                        } );
                    } );
            };

            self.load();

        },
        load: function() {
            var self = this;
            Y.doccirrus.jsonrpc.api.inpacsconfiguration.getLogFile()
                .done( function( res ) {
                    if( res && res.data ) {
                        self.logFile.log( res.data.log );
                        self.logFile.length( res.data.length );
                        self.config = res.data.config;

                        self.disableClearLogButton(false);
                    }
                } )
                .fail( function( err ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: err.message
                    } );
                } );

        }
    }, {
        NAME: 'InPacsLogView'
    } );

    return {
        registerNode: function( node ) {
            viewModel = new InPacsLogView({
                node: node.getDOMNode()
            });

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};