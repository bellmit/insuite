/**
 * User: abhijit.baldawa
 * Date: 08.06.18  14:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true, io, Terminal, fit, window, ko*/
/*exported fun */
'use strict';

fun = function _fn( Y, NAME ) {
    var
        socket,
        isManualDisconnect;

    function onFail( error ) {
        if(error && typeof error === "string") {
            error = {message:error};
        } else if( typeof error === "object" && !error.message ) {
            if( error.data ) {
                error.message = error.data;
            }
        }

        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: error && error.message || 'Undefined error',
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    return {
        registerNode: function( node ) {
            var
                term,
                terminalContainer = document.getElementById( 'terminal' ),
                terminalConnected = ko.observable(true),
                errorMessage = ko.observable(),
                i18n = Y.doccirrus.i18n,
                loadingMaskNode;

            // We need parent node because we want to block the UI, including tab navigation, when connecting to server
            if( node.ancestor && node.ancestor() && node.ancestor().ancestor && node.ancestor().ancestor() ) {
                loadingMaskNode = node.ancestor().ancestor();
            }

            ko.applyBindings( {terminalConnected: terminalConnected, errorMessage: errorMessage}, node.getDOMNode() );

            Terminal.applyAddon(fit);

            function createTerminal( text ) {
                isManualDisconnect = false;
                socket = null;

                // Clean terminal
                while( terminalContainer.children.length ) {
                    terminalContainer.removeChild( terminalContainer.children[0] );
                }

                term = new Terminal( {} );
                // window.term = term;  // Expose `term` to window for debugging purposes

                term.open( terminalContainer );
                term.fit();
                term.focus();

                Y.doccirrus.utils.showLoadingMask(loadingMaskNode || node, text);

                Y.doccirrus.communication.apiCall( {
                    method: 'xterminal.getTerminal',
                    data: {
                        isTabConsole: true
                    }
                }, function( err, result ) {
                    Y.doccirrus.utils.hideLoadingMask(loadingMaskNode || node);

                    if( err ) {
                        term.destroy();
                        terminalConnected(true); // This is just to hide the error message span dom. We are showing error here on a dialogue box
                        errorMessage('');

                        if( err.data && Array.isArray(err.data) ) {
                            if( err.data[0] === "NOT_SUPPORT_USER" ) {
                                return onFail( i18n( 'MISMojit.terminal.messages.NOT_SUPPORT_USER' ) );
                            } else if( err.data[0] === "NOT_MASTER" ) {
                                return onFail( i18n( 'MISMojit.terminal.messages.NOT_MASTER' ) );
                            }
                        }

                        Y.log("createTerminal: Unexpected error occurred. Error: " + JSON.stringify(err), "error", NAME);
                        return onFail( i18n( 'MISMojit.terminal.messages.UNEXPECTED_ERROR' ) );
                    } else if( result && result.data ) {
                        // Connect to 'x-terminal' namespace ONLY for terminal purpose
                        socket = io( Y.doccirrus.infras.getPrivateURL() + '/x-terminal?listenForTerminalExit=true&terminalId=' + result.data, { forceNew: true, reconnection: false } );

                        socket.on('connect', function() {
                            term.focus();
                            terminalConnected(true);
                            errorMessage('');
                        });

                        socket.on('disconnect', function() {
                            term.destroy();

                            if( isManualDisconnect ) {
                                return;
                            }

                            terminalConnected(false);
                            errorMessage(i18n( 'MISMojit.terminal.messages.RECONNECTING_TO_SERVER' ));

                            setTimeout(function() {
                                createTerminal( i18n( 'MISMojit.terminal.messages.RECONNECTING_TO_SERVER' ) );
                            }, 2000);
                        });

                        socket.on('error', function (err) {
                            term.destroy();

                            terminalConnected(false);
                            errorMessage(i18n( 'MISMojit.terminal.messages.SOCKET_CONNECTION_ERROR' ));

                            Y.log("Error in socket connection. Error: "+JSON.stringify(err), "warn", NAME);
                        });

                        socket.on('connectionProblem', function( message ) {
                            // This event should ideally never trigger
                            term.destroy();
                            terminalConnected(false);

                            if( message === "TERMINAL_NOT_FOUND" ) {
                                errorMessage(i18n( 'MISMojit.terminal.messages.TERMINAL_NOT_FOUND' ));
                            } else if( message === "NO_TERMINAL_ID" ) {
                                errorMessage( i18n( 'MISMojit.terminal.messages.NO_TERMINAL_ID' ) );
                            } else {
                                //Should never come here
                                errorMessage( i18n( 'MISMojit.terminal.messages.CONNECTION_PROBLEM' ) );
                            }
                        });

                        socket.on("terminalExited", function() {
                            if( socket && socket.close ) {
                                isManualDisconnect = true;
                                socket.close();
                            }
                        });

                        socket.on('message', function (data) {
                            term.write(data);

                        });

                        term.on('data', function (data) {
                            socket.emit('message', data);
                        });
                    }
                });
            }

            createTerminal();
        },

        deregisterNode: function() {
            if( socket && socket.close ) {
                isManualDisconnect = true;
                socket.close();
            }
        }
    };
};