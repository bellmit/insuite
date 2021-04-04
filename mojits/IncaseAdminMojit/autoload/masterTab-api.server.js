/*global YUI */


YUI.add( 'masterTab-api', function( Y, NAME ) {

        const HAS_ACTIVE_MASTER_TAB_SCOKET = 'HAS_ACTIVE_MASTER_TAB_SCOKET';
        const CLEAN_ACTIVE_PATIENT_SESSION = 'CLEAN_ACTIVE_PATIENT_SESSION';
        const activePatientPerSession = {};

        /**
         * Generates socket room for masterTab
         * @param {Object} params
         * @param {String} params.systemNumber
         * @returns {string}
         */
        function getMasterTabRoom( params ) {
            const { systemNumber } = params;
            return `system${systemNumber}`;
        }

        /**
         * Returns master tab socket for the user (if found)
         * Has to be called by master
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} params.systemNumber
         * @returns {Object|Null} socket
         */
        function findMasterTabSocket( params ) {
            const { systemNumber, user } = params;
            const socketServer = Y.doccirrus.communication.getIoServer();
            const roomName = getMasterTabRoom( { systemNumber } );
            return Object.values( socketServer.sockets.sockets ).find( socket => {
                const rooms = Object.keys( socket.rooms );
                return rooms.includes( roomName ) && rooms.includes( user.sessionId );
            } );
        }

        /**
         * Send event "masterTab.openMasterTab" to browser
         * @param {Object} params
         * @param {Object} params.socket
         * @param {String} params.systemNumber
         * @param {String} params.title
         */
        function sendOpenMasterTabEvent( params ) {
            const { socket, systemNumber, title } = params;
            Y.doccirrus.communication.emitEventForSocket( {
                socket,
                event: 'masterTab.openMasterTab',
                msg: {
                    data: {
                        systemNumber,
                        title
                    }
                },
                doNotChangeData: true
            } );
        }

        /**
         * Replace url placeholders with patient data
         * @param {Object} params
         * @param {Object} params.patient
         * @param {String} params.url
         * @returns {String}
         */
        function processUrl( params ) {
            const { patient } = params;
            let { url } = params;
            url = url.replace( '{{patientId}}', patient._id.toString() );
            url = url.replace( '{{Patientennummer}}', patient.patientNo || '' );
            url = url.replace( '{{PatientNumber}}', patient.patientNo || '' ); // en doc says this is also supported.
            (patient.partnerIds || []).filter( item => item.extra ).forEach( item => {
                url = url.replace( `{{${item.extra}}}`, item.patientId );
            } );
            return url;
        }

        /**
         * Sends masterTab.masterTabData with url and title
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} params.masterTabSocket web socket instance of master tab
         * @param {String} params.title
         * @param {String} params.patientId
         */
        function sendUpdateMasterTabEvent( params ) {
            const { user, masterTabSocket, title, patientId } = params;
            let { url } = params;
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'get',
                query: {
                    _id: patientId
                }
            } )
                .then( patients => {
                    const patient = patients[ 0 ];
                    if( patient ) {
                        url = processUrl( { url, patient } );
                    }
                    return checkUrlAvailability( { url } )
                        .then( () => {
                            _emitMasterTabData( {
                                socket: masterTabSocket,
                                msg: {
                                    data: {
                                        url,
                                        title
                                    }
                                }
                            } );
                        } );
                } )
                .catch( err => {
                    _emitMasterTabData( {
                        socket: masterTabSocket,
                        msg: {
                            error: err
                        }
                    } );
                } );
        }

        function _emitMasterTabData( params ) {
            const { socket, msg } = params;
            Y.doccirrus.communication.emitEventForSocket( {
                socket,
                event: 'masterTab.masterTabData',
                msg,
                doNotChangeData: true
            } );
        }

        /**
         * Checks whether the url can be opened in iframe or not. Checks "x-frame-options" header.
         * @param {Object}  params
         *
         * @return {Promise}
         */
        function checkUrlAvailability( params ) {
            const { url } = params,
                needle = require( 'needle' );
            return new Promise( ( resolve, reject ) => {
                needle.get( url, { rejectUnauthorized: false }, ( err, response ) => {
                    let error;
                    if( err ) {
                        error = err;
                    } else if( response.headers[ 'x-frame-options' ] ) {
                        error = new Y.doccirrus.commonerrors.DCError( 400, { message: `X-Frame-Options is set to ${response.headers[ 'x-frame-options' ]}` } );
                    }
                    if( error ) {
                        error.data = error.data || {};
                        error.data.url = url;
                        return reject( error );
                    }
                    resolve();
                } );
            } );
        }

        /**
         * inits web socket listeners to cover following cases:
         * user logged in - checks whether linkA has to be opened. if yes - sends system message to ui
         * user opened a patient - checks whether linkB has to be opened. if yes - sends system message to ui
         * user opened a master tab - checks which link has to be used and send it back to ui
         */
        function initSocketListeners() {
            initIPC();
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
                /**
                 * master tab registration handler
                 * Decides which url has to be shown in the master page
                 */
                Y.doccirrus.communication.setListenerForNamespace( '/', 'masterTab.registerMasterTab', function( message, callback ) {
                    const { systemNumber, user } = message;
                    const socket = this;
                    socket.join( getMasterTabRoom( { systemNumber } ) );
                    if( typeof callback !== 'function' ) {
                        return;
                    }
                    _getMasterConfig( { user, options: { skip: systemNumber - 1, limit: 1 } } )
                        .then( masterConfigs => {
                            const result = {};
                            if( masterConfigs[ 0 ] ) {
                                result.masterConfig = masterConfigs[ 0 ];
                                const patientId = activePatientPerSession[ user.sessionId ];
                                if( patientId ) {
                                    return Y.doccirrus.mongodb.runDb( {
                                        user,
                                        model: 'patient',
                                        action: 'get',
                                        query: {
                                            _id: patientId
                                        }
                                    } )
                                        .then( patients => {
                                            result.patientData = patients[ 0 ];
                                            return result;
                                        } );
                                }

                            }
                            return result;
                        } )
                        .then( data => {
                            const { patientData, masterConfig = {} } = data;

                            let
                                url,
                                title;
                            if( patientData && masterConfig ) {

                                url = processUrl( {
                                    url: masterConfig.patientBrowserLink,
                                    patient: patientData
                                } );
                                title = masterConfig.patientBrowserLinkTitle;
                            } else {
                                url = masterConfig.loginLink;
                                title = masterConfig.loginLinkTitle;
                            }
                            return checkUrlAvailability( { url } )
                                .then( () => {
                                    return callback( null, {
                                        masterTabData: {
                                            url,
                                            title
                                        }
                                    } );
                                } );

                        } )
                        .catch( error => {
                            callback( error );
                        } );
                } );
                /**
                 * login handler
                 * Checks master tab and if it is not opened decides which link has to be sent with system message.
                 */
                Y.doccirrus.communication.setListenerForNamespace( '/', 'masterTab.handleLogin', function() {
                    const user = this.user;
                    const socket = this;
                    _getMasterConfig( { user } )
                        .then( results => {
                            results.some( ( item, index ) => {
                                const systemNumber = index + 1,
                                    masterTabSocket = findMasterTabSocket( {
                                        user,
                                        systemNumber
                                    } ),
                                    patientId = activePatientPerSession[ user.sessionId ];
                                if( !masterTabSocket ) {
                                    if( patientId && item.patientBrowserLink ) {
                                        sendOpenMasterTabEvent( {
                                            socket,
                                            systemNumber,
                                            title: item.patientBrowserLinkTitle
                                        } );
                                    } else if( item.loginLink ) {
                                        /**
                                         * login link can be opened only on login even when there is no opened master tab.
                                         */
                                        sendOpenMasterTabEvent( {
                                            socket,
                                            systemNumber,
                                            title: item.loginLinkTitle
                                        } );
                                    }
                                }

                            } );
                        } )
                        .catch( err => {
                            Y.log( `checkMasterTab. could not get master tab configs. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        } );
                } );
                /**
                 * patient activation handler
                 * Either updates opened master tab or sends system message to open it.
                 */
                Y.doccirrus.communication.setListenerForNamespace( '/', 'masterTab.handleActivePatient', function( message ) {
                    const
                        socket = this,
                        { patientId, user } = message,
                        currentPatient = activePatientPerSession[ user.sessionId ];

                    /**
                     * Update data if master tab is opened and new patient "activated"
                     * Send system message (to open master tab) if master tab is not opened
                     * Do nothing if same patient is "activated"
                     */
                    activePatientPerSession[ user.sessionId ] = patientId;
                    _getMasterConfig( { user } )
                        .then( results => {
                            results.some( ( item, index ) => {
                                const systemNumber = index + 1;
                                const masterTabSocket = findMasterTabSocket( {
                                    user,
                                    systemNumber
                                } );
                                if( item.patientBrowserLink ) {
                                    if( masterTabSocket && currentPatient !== patientId ) {
                                        sendUpdateMasterTabEvent( {
                                            user,
                                            masterTabSocket,
                                            patientId,
                                            url: item.patientBrowserLink,
                                            title: item.patientBrowserLinkTitle
                                        } );
                                    } else if( !masterTabSocket ) {
                                        sendOpenMasterTabEvent( {
                                            socket,
                                            systemNumber,
                                            title: item.patientBrowserLinkTitle
                                        } );
                                    }
                                }

                            } );
                        } )
                        .catch( err => {
                            Y.log( `checkMasterTab. could not get master tab configs. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        } );
                } );
            }
        }

        /**
         * Checks whether socket from master page is connected
         * @param {Object} params
         * @param {Object} params.user
         * @param {String} params.systemNumber master system number
         * @param {Function} callback
         * @return {Function} callback
         */
        function hasActiveMasterTabSocket( params, callback ) {
            const { user, systemNumber } = params;
            if( Y.doccirrus.ipc.isMaster() ) {
               return  callback( null, Boolean( findMasterTabSocket( { user, systemNumber } ) ) );
            }
            Y.doccirrus.ipc.sendAsync( HAS_ACTIVE_MASTER_TAB_SCOKET, Object.assign( {}, params ), callback );
        }

        /**
         * Finds mastertabconfig entries sorted by _id (DESC by default)
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} [params.query]
         * @param {Object} [params.options]
         * @returns {Promise}
         * @private
         */
        function _getMasterConfig( params ) {
            const { user, query = {}, options = {} } = params;
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'mastertabconfig',
                query,
                options: Object.assign( {
                    sort: {
                        _id: -1
                    }
                }, options )
            } );
        }

        /**
         * inits ipc
         */
        function initIPC() {
            if( Y.doccirrus.ipc.isMaster() ) {
                Y.doccirrus.ipc.subscribeNamed( HAS_ACTIVE_MASTER_TAB_SCOKET, NAME, true, function( params, callback ) {
                    hasActiveMasterTabSocket( params, callback );
                } );
                Y.doccirrus.ipc.subscribeNamed( CLEAN_ACTIVE_PATIENT_SESSION, NAME, true, function handleCacheEvent( params ) {
                    _cleanActivePatientOfSession( params.sessionId );
                } );
            }
        }

        /**
         * deletes last active patient by the user sessionId
         * @param {String} sessionId
         * @private
         */
        function _cleanActivePatientOfSession( sessionId ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                activePatientPerSession[ sessionId ] = undefined;
            } else {
                Y.doccirrus.ipc.send( CLEAN_ACTIVE_PATIENT_SESSION, { sessionId: sessionId }, true );
            }
        }

        Y.namespace( 'doccirrus.api' ).masterTab = {
            name: NAME,
            initSocketListeners,
            _cleanActivePatientOfSession
        };
    },
    '0.0.1',
    {
        requires: [
            'dccommunication'
        ]
    }
);