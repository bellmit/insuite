/*jslint anon:true, sloppy:true, moment:true*/
/*global fun:true, io, Terminal, fit, ko*/
/*exported fun */

fun = function _fn( Y, NAME ) {
    'use strict';
    var
        socket,
        isManualDisconnect,
        i18n=  Y.doccirrus.i18n,
        threadValue = ko.observable(null),
        dayValue = ko.observable(false);


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
        registerNode: function( node, key, options ) {

            var
                term,
                systemLogging = options.systemLogging,
                terminalContainer = document.getElementById( 'terminal' ),
                terminalConnected = ko.observable(true),
                errorMessage = ko.observable(),
                loadingMaskNode,
                actionButton = ko.observable(),
                info = ko.observable(),
                threadButton = ko.observable(),
                manual = i18n('InSuiteAdminMojit.tab_system_terminal.manual'),
                _buttonArray = ko.observableArray();

            // We need parent node because we want to block the UI, including tab navigation, when connecting to server
            if( node.ancestor && node.ancestor() && node.ancestor().ancestor && node.ancestor().ancestor() ) {
                loadingMaskNode = node.ancestor().ancestor();
            }

            ko.applyBindings( {
                terminalConnected: terminalConnected,
                errorMessage: errorMessage,
                SystemCommandsI18n: i18n('InSuiteAdminMojit.tab_system_terminal.selectTitle'),
                actionButton: actionButton,
                info: info,
                customised: threadButton,
                customisedButton: i18n('InSuiteAdminMojit.tab_system_terminal.commands.grep_with_user_input'),
                insertDay: i18n('InSuiteAdminMojit.tab_system_terminal.days'),
                _buttonArray: _buttonArray,
                title: i18n('InSuiteAdminMojit.tab_system_terminal.title'),
                thread: i18n('InSuiteAdminMojit.tab_system_terminal.thread'),
                threadValue: threadValue,
                dayValue: dayValue
            }, node.getDOMNode() );

            Terminal.applyAddon(fit);

            /**
             * @description create a terminal
             * @param {string} commandId id of the commands; see in logging.common.js
             * @param {number | null } thread number of thread
             * @param {number | null} todayMinusNumber number of past days: e.g. yesterday === 1
             * @param {boolean} istDaySet: see for more details in xterminal-api.server.js > initTerminal()
             * @param {string} text
             */
            function createTerminal(commandId = 'command1', thread = null, todayMinusNumber = null,istDaySet = false,text){

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
                    data:{
                        commandId: commandId,
                        threadNumber: thread,
                        todayMinusNumber: todayMinusNumber,
                        isDaySet: istDaySet
                    }

                },function( err,result ){
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
                            }else if(err.data[0] === 'NO_TERMINAL_OR_PID'){
                                return onFail(i18n('MISMojit.terminal.messages.NO_TERMINAL_ID'));
                            }else if(err.data[0] === 'NO_USER_INPUT'){
                                return onFail(i18n('InSuiteAdminMojit.tab_system_terminal.NO_USER_INPUT'));
                            }else if(err.data[0] === 'DAY_IS_SMALLER_ONE'){
                                return onFail(i18n('InSuiteAdminMojit.tab_system_terminal.DAY_IS_SMALLER_ONE'));
                            }else if(err.data[0] === 'THREAD_IS_SMALLER_ZERO_OR_STRING'){
                                return onFail(i18n('InSuiteAdminMojit.tab_system_terminal.THREAD_IS_SMALLER_ZERO_OR_STRING'));
                            }else if(err.data[0] === 'DAY_IS_STRING'){
                                return onFail(i18n('InSuiteAdminMojit.tab_system_terminal.DAY_IS_STRING'));
                            }else if(err.data[0] === 'NO_VALID_COMMANDID'){
                                return onFail(i18n('InSuiteAdminMojit.tab_system_terminal.NO_VALID_COMMANDID'));
                            }
                        }

                        Y.log("createTerminal: Unexpected error occurred. Error: " + JSON.stringify(err), "error", NAME);
                        return onFail( i18n( 'MISMojit.terminal.messages.UNEXPECTED_ERROR' ) );
                    } else if( result && result.data ) {
                        // Connect to 'x-terminal' namespace ONLY for terminal purpose
                        socket = io( Y.doccirrus.infras.getPrivateURL() + '/x-terminal?terminalId=' + result.data, { forceNew: true, reconnection: false } );

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

                        socket.on('message', function (data) {
                            term.write(data);

                        });
                        term.on('data', function (data) {
                            socket.emit('message', data);
                        });
                    }});
            }

            /**
             * This function create the input of the xterminal and will be call if the user click a button.
             */
            function clickButtons(){
                function _run(commandId,thread,day){
                    if(!isNaN(day)){
                        if(day > 1){
                            createTerminal(commandId,thread,day,true);
                        }else{
                            createTerminal(commandId,thread,day);
                        }
                    }else{
                        createTerminal(commandId,thread);
                    }
                }

                actionButton.subscribe(function(commandId){
                    //console.log(dayValue());
                    //var day = dayValue();
                    //day = parseInt(day,10);
                    if(dayValue() === true){
                        _run(commandId,null,1);
                    }else{
                        _run(commandId,null);
                    }
                });

                threadButton.subscribe(function(){
                    var day = dayValue(),
                        thread = threadValue();
                    day = parseInt(day,10);
                    thread = parseInt(thread,10);
                    _run('command5',thread,day);
                });
            }

            /**
             * create for each Button a element with the right commandId and description
             */
            function createButtonArray(){
                var commands = systemLogging.commands;
                Object.keys(commands).forEach(function(key){
                    if(key !== 'command5'){
                        _buttonArray.push({commandId: key, description: commands[key].description});
                    }
                });
            }

            function initNotification(){
                info.subscribe(function(){
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: manual,
                        window: {
                            width: 'medium'
                        }
                    } );
                });
            }

            createTerminal();
            createButtonArray();
            initNotification();
            clickButtons();
        },

        deregisterNode: function() {
            if( socket && socket.close ) {
                isManualDisconnect = true;
                socket.close();
            }
        }
    };
};