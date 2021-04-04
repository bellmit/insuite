/**
 * The API's exposed in this file are used to emulate a terminal so that from UI the user can use this as a real terminal
 * For more details please see "https://github.com/Microsoft/node-pty" (node-pty)
 *
 * All the API's here are ONLY meant to work on master cluster via websocket
 */
/*global YUI*/

YUI.add( 'xterminal-api', function( Y, NAME ) {
    const
        pty = require('node-pty');

    let
        terminals = {};

    /**
     * instantiates a terminal
     * @param {string | undefined} command
     * @param {number} cols columns length
     * @param {number} rows rows length
     * @param {string | undefined} oldPath should be a string if the log file a *.gz file
     * @param {string | undefined} newPath should be a string if the log file a *.gz file
     * @param {boolean} isDaySet should be true if todayMinusNumber in _getLogInfo larger than 1
     *
     * @return {Object} pty.spawn
     */
    function initTerminal(command, cols=100, rows = 25,oldPath=undefined, newPath=undefined, isDaySet=false){
        if ( !command ) {
            throw new Error( 'No command given' );
        }

        let terminalArguments = [command];

        if ( isDaySet ) {
            terminalArguments = terminalArguments.concat( oldPath, newPath );
        }

        Y.log( `Passing arguments ${terminalArguments.join(' ')} system terminal script`, 'info', NAME );

        const terminal = pty.spawn( `${process.cwd()}/src/bash/system-terminal.sh`, terminalArguments, {
            name: 'xterm-color',
            cols: cols,
            rows: rows,
            cwd: process.env.PWD,
            env: process.env
        } );

        if ( !terminal || !terminal.pid ){
            return undefined;
        }

        terminals[terminal.pid] = terminal;

        Y.log( `Created terminal with PID: ${terminal.pid}. ${Object.keys(terminals).length} terminal(s) are open`, 'info', NAME );

        return terminal;
    }

    /**
     *
     * @param {boolean} isTab
     * @return {IPty} term
     */
    function initConsole(isTab){
        let
            bashArgs,
            term;

        bashArgs = isTab ? ["-c", `${process.cwd()}/src/bash/start-console.sh`] : [];

        term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', bashArgs, {
            name: 'xterm-color',
            cols:  100,
            rows:  25,
            cwd: process.env.PWD,
            env: process.env
        });

        terminals[term.pid] = term;
        Y.log(`xterminal: initConsole -> Created console with PID: ${term.pid}. ${Object.keys(terminals).length} Console(s) are open`, "info", NAME);
        return term;
    }

    /*
    * This method call the initTerminal  or initConsole function and returns, in callback, the terminal processId
    *
    * @param {Object} args
    *
    * args = {user, callback, ....}
    *
    * Errors:
    *   1] NOT_MASTER
    *   2] NOT_SUPPORT_USER
    *
    * Success:
    *   terminal processId
    * */
    function getTerminal( args ) {
        Y.log('Entering Y.doccirrus.api.xterminal.getTerminal', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.xterminal.getTerminal');
        }
        if( !Y.doccirrus.ipc.isMaster() ) {
            return args.callback( 'NOT_MASTER' );
        }

        /*if( !Y.doccirrus.auth.memberOf( args.user, Y.doccirrus.schemas.identity.userGroups.SUPPORT ) ) {
            return args.callback( `NOT_SUPPORT_USER` );
        }*/

        const {callback} = args;
        let terminal;

        if(args.data.commandId){
            const
                {data:{commandId,threadNumber,todayMinusNumber,isDaySet}} = args,
                command = getCommand(commandId,threadNumber,todayMinusNumber);

            if(command.length === 1){
                return callback(command[0]);
            }
            terminal = initTerminal(command[0],320,150,command[1],command[2],isDaySet);
            if(terminal === undefined){
                return callback('NO_TERMINAL_OR_PID');
            }

        }else{
            const {data: {isTabConsole}} = args;
            terminal = initConsole(isTabConsole);
        }

        callback( null, terminal.pid.toString() );
    }


    /**
     * @description     This function build the finale commend for the terminal input.
     * @param {String}  commandId e.g command 1, command2
     * @param {number | null}   threadNumber number of thread e.g. prc 5.
     * @param {number | null}   todayMinusNumber value decripe the days; 0 is today 1 is yesterday ...
     * @param {string}  file source of the log file
     * @return {array}  return a array with length 3 [final command,current log source, new log destination] or a empty array is something wrong
     */
    function getCommand (commandId, threadNumber=null, todayMinusNumber = null, file=Y.doccirrus.auth.getLogPath()){
        const
            commands = Y.doccirrus.logging.commands,
            lessParameter = `| LESSSECURE=1 less`;
        let
            oldFile;

        if(!commands[commandId]){
            return ['NO_VALID_COMMANDID'];
        }
        if(todayMinusNumber !== null){
            if(typeof todayMinusNumber === "number" ) {

                if( todayMinusNumber > 0 ) {
                    let
                        today = new Date(),
                        date = new Date( today ),
                        newDay = new Date( date.setDate( today.getDate() - todayMinusNumber ) ),
                        month = newDay.getMonth() + 1,
                        day = newDay.getDate(),
                        year = newDay.getFullYear();

                    if( day < 10 ) {
                        day = "0" + day;
                    }
                    if( month < 10 ) {
                        month = "0" + month;
                    }
                    file = file +"-"+ year + month + day;

                    if(todayMinusNumber > 1){
                        let newFile = file.split('/').pop();
                        oldFile = file;
                        file = `${Y.doccirrus.auth.getTmpDir()}/${newFile}`;
                    }

                }else {
                    Y.log( 'The value of todayMinusNumber is smaller as 1 ' + NAME, 'warn', NAME );
                    return ['DAY_IS_SMALLER_ONE'];
                }
            }else{
                Y.log( 'The value of todayMinusNumber is a string. But expected a number' + NAME, 'warn', NAME );
                return ['DAY_IS_STRING'];
            }
        }

        if(commands[commandId].filter && commands[commandId].filter === 'thread'){
            if(threadNumber >= 0 && typeof  threadNumber === "number") {
                return [`${commands[commandId].regex} '${threadNumber}: ' '${file}' ${lessParameter}`,oldFile,file];
            }

            Y.log( 'threadNumber is empty or smaller as 0' + NAME, 'warn', NAME );
            return  ['THREAD_IS_SMALLER_ZERO_OR_STRING'];
        }

        return [`${commands[commandId].regex} '${file}' ${lessParameter}`,oldFile,file];
    }

    /*
    * This method is called when the UI initiates a websocket connection on 'x-terminal' namespace ONLY.
    * This method accepts the connected 'socket' object. If the socket has terminalId to which it wants to connect to
    * then the communication channel is established to the terminal and user commands are passed to the terminal via socket.
    *
    * If terminals object has any keys(connected terminal) then each key represents a CONNECTED terminal to the UI. Once socket is disconnected then we delete
    * the terminal reference from the 'terminals' object and the UI will call getTerminal method first to get the new terminalId and then initiate websocket
    * connection on 'x-terminal' namespace by passing 'terminalId' as query param inorder to connect to the right terminal via socket.
    * */

    function socketConnected( socket ) {
        if( !socket ) {
            Y.log(`xterminal: no socket object passed in. Aborting....`, "warn", NAME);
            return socket.callback('NO_SOCKET');
        }
        if( !Y.doccirrus.ipc.isMaster() ) {
            return socket.callback( 'NOT_MASTER' );
        }


        if( !socket.handshake || !socket.handshake.query || !socket.handshake.query.terminalId ) {
            //Should never come in here
            Y.log(`xterminal: terminalId not present as query param in socket object. Cannot establish a socket connection`, "warn", NAME);
            socket.emit('connectionProblem', `NO_TERMINAL_ID`);
            return socket.callback('NO_TERMINAL_ID');
        }

        const
            term = terminals[parseInt(socket.handshake.query.terminalId, 10)],
            listenForTerminalExit = socket.handshake.query.listenForTerminalExit;

        if( !term ) {
            //Should never come in here
            Y.log(`xterminal: Terminal not found for terminalId: ${socket.handshake.query.terminalId}. Aborting this connection.`, "warn", NAME);
            socket.emit('connectionProblem', `TERMINAL_NOT_FOUND`);
            return socket.callback('TERMINAL_NOT_FOUND');
        }

        term.on('data', function(data) {
            try {
                socket.emit('message', data);
            } catch (ex) {
                // The WebSocket is not open, ignore
                //Should not come here
                Y.log(`xterminal: Error emitting message from socket for terminalId: ${socket.handshake.query.terminalId}. Error: ${ex}`, "error", NAME);
            }
        });

        if( listenForTerminalExit ) {
            term.on('exit', function(code, signal) {
                Y.log(`xterminal: Console tab terminal exitted with code: ${code} and signal: ${signal}`, "info", NAME);
                socket.emit("terminalExited", "TERMINAL_EXITED");
            });
        }

        socket.on('message', function(msg) {
            term.write(msg);
        });

        socket.on('disconnect', function () {
            // Clean things up
            term.kill();
            delete terminals[term.pid];
            Y.log(`xterminal: Socket disconnected. Killed terminalId: ${term.pid}. ${Object.keys(terminals).length} Terminal(s) are open`, "info", NAME);
        });
    }

    Y.namespace( 'doccirrus.api' ).xterminal = {
        /**
         * @property name
         * @type {String}
         * @default xterminal-api
         * @protected
         */
        name: NAME,
        getTerminal,
        socketConnected
    };
    }, '0.0.1', {
        requires: [
            //'dcipc',
             'dcauth',
            'logging-common'
            //'dccommunication'
            //'dccommunication-client'
            // 'identity-schema',
             //'logging-common'
        ]
    }
);