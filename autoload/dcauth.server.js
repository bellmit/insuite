/*global YUI */

YUI.add( 'dcauth', function( Y, NAME ) {

        /**
         *  Server side authorisation and Authentication library.
         *
         *  Basically, a proxy for the auth Layer from Mojito
         *
         *  This is necessary to allow the mocking of the auth Layer
         *  for external developers. With this facade, one gets a
         *  necessary indirection to auth and can add more mojito level
         *  controls.
         */
        let
            i18n = Y.doccirrus.i18n,
            TMP_DIR_NAME = 'tmp',
            friends = require( 'dc-core' ).config.load( process.cwd() + '/friends.json' ),
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            friendsList = Object.freeze( {
                UVITA: 'UVITA',
                VPRC: 'VPRC',
                PUC: 'PUC',
                PRC: 'PRC',
                DCPRC: 'DCPRC',
                MVPRC: 'MVPRC',
                WWW: 'WWW',
                DeviceServer: 'DeviceServer',
                Cardreader: 'Cardreader',
                ISD: 'ISD'
            } ),
            APPLIANCE = 'APPLIANCE',
            fs = require( 'fs' ),
            dcauth = require( 'dc-core' ).auth,
            _ = require( 'lodash' ),
            prcHostName, prcIP,
            hasDCcli,
            authLayer,
            transitionList = Y.doccirrus.schemas.activity.getTransitionList(),
            /**
             * Contains collections and groups which are restricted
             */
            restrictedCollections = {
                audit: {
                    read: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                employee: {
                    read: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                identity: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PARTNER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                formtemplates: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                formtemplateversions: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                incaseconfigurations: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                invoiceconfigurations: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                activitysettings: {
                    delete: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                practices: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                locations: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                kbvlogs: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                company: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ]
                },
                basecontact: {
                    'delete': [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                kvcaccount: {
                    write: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    'delete': [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                }
            };

        /**
         * Check if tmp dir exists. If it does not exist, create it.
         * @param {string} tmpDir
         */
        function checkTmpDir( tmpDir ) {
            var
                excludeList = [ tmpDir + '/doNotDeleteMe' ],
                exists = fs.existsSync( tmpDir );
            if( !exists ) {
                Y.doccirrus.fileutils.mkdirpSync( tmpDir );
            }
            if( !Y.doccirrus.fileutils.isDirectorySync( tmpDir ) ) {
                console.error( 'tmp directory is not a direcotry' ); // eslint-disable-line no-console
                process.exit( 1 );
            }
            Y.doccirrus.fileutils.cleanDirSync( tmpDir, false, excludeList );

            if( !Y.doccirrus.fileutils.isWritableSync( tmpDir ) ) {
                console.error( 'tmp directory is not writeable' ); // eslint-disable-line no-console
                process.exit( 1 );
            }
        }

        function getServerTypeText() {
            let
                serverTypeText = '';

            if( Y.doccirrus.auth.isPRC() ) {
                serverTypeText = "PRC";
            } else if( Y.doccirrus.auth.isISD() ) {
                serverTypeText = "ISD";
            } else if( Y.doccirrus.auth.isMTSAppliance() ) {
                serverTypeText = "MTS_APPLIANCE";
            }

            return serverTypeText;
        }

        /**
         * Call this in a PRC to set up the host name for PRC
         * installations.
         * @return {Promise}
         */
         async function getPRCExternalHost() {

            let
                serverTypeText = getServerTypeText();

            function getMyDomain() {
                var
                    url = dcauth.getPUCHost();
                url = url && url.replace( 'puc', '' );
                return url;
            }

            if( hasDCcli === undefined ){
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.cli.hasDCcli()
                );
                if(err){
                    Y.log( `error checking cli availability ${err.message}`, 'error', NAME );
                }
                hasDCcli = result && result.hasDCcli;
            }

            if( hasDCcli !== true ){
                return Promise.resolve( 'getPRCExternalHost' ); //there are no dc-cli on this system
            }

            return new Promise( ( resolve ) => {
                Y.doccirrus.api.cli.getPRCHost( {
                    callback: function setPrcHostname( err, data ) {
                        if( err ) {
                            Y.log( `getPRCExternalHost: Error setting ${serverTypeText} external host name: ${err}`, 'warn', NAME );
                            resolve( 'getPRCExternalHost' ); //We do not need to reject here because we want to continue execution
                            return;
                        }
                        if( !data ) {
                            Y.log( `getPRCExternalHost: Empty ${serverTypeText} external host name! `, 'warn', NAME );
                            resolve( 'getPRCExternalHost' );
                            return;
                        }

                        Y.log( `getPRCExternalHost: ${serverTypeText} external host name: ${data}`, 'info', NAME );
                        prcHostName = data + '.hub' + getMyDomain();
                        resolve();
                    }
                } );
            } );
        }

        function setPRCIP() {
            return new Promise( async ( resolve ) => {
                if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isMTSAppliance() ) {

                    if( hasDCcli === undefined ){
                        let [err, result] = await formatPromiseResult(
                            Y.doccirrus.api.cli.hasDCcli()
                        );
                        if(err){
                            Y.log( `error checking cli availability ${err.message}`, 'error', NAME );
                        }
                        hasDCcli = result && result.hasDCcli;
                    }

                    if( hasDCcli !== true ){
                        return resolve( 'setPRCIP' ); //there are no dc-cli on this system
                    }

                    let
                        serverTypeText = getServerTypeText();

                    if( authLayer.isDevServer() ) {
                        prcIP = dcauth.getServerIP();
                        Y.log( `setPRCIP: ${serverTypeText} IP is set for dev server: ${prcIP}`, 'info', NAME );
                        resolve();
                    } else {
                        Y.doccirrus.api.cli.getPRCIP( {
                            callback( err, ipAddress ) {
                                if( err ) {
                                    Y.log( `setPRCIP: Error setting ${serverTypeText} IP address: ${err}`, 'warn', NAME );
                                    return resolve( 'setPRCIP' ); //We do not need to reject here because we want to continue execution
                                }

                                if( !ipAddress ) {
                                    Y.log( `setPRCIP: Empty ${serverTypeText} IP Address! `, 'warn', NAME );
                                    return resolve( 'setPRCIP' );
                                }

                                prcIP = ipAddress;
                                Y.log( `setPRCIP: ${serverTypeText} IP is set: ${prcIP}`, 'info', NAME );
                                resolve();
                            }
                        } );
                    }
                } else {
                    resolve();
                }
            } );
        }

        function DCAuth() {
            Y.log( 'Created new DC Auth Object', 'info', NAME );
            var config,
                cluster = require( 'cluster' );

            try {
                config = require( 'dc-core' ).config.load( `${process.cwd()}/env.json` );
                console.log( `${process.cwd()}/env.json`, config ); // eslint-disable-line no-console
            } catch( e ) {
                console.error( `Could not load env.json ${e.stack || e}` ); // eslint-disable-line no-console
                process.exit( 1 );
            }
            if( !config || !config.directories ) {
                console.error( 'Could not get environment from env.json' ); // eslint-disable-line no-console
                process.exit( 1 );
            }
            this.friendsList = friendsList;
            this.directories = config.directories;
            this.infrastructure = config.infrastructure;
            this.log = config.insuiteLogFile;
            // delete the tmpDirs before setting status to ready.
            if( cluster.isMaster ) {
                checkTmpDir( this.directories[ TMP_DIR_NAME ] );
            }
        }

        DCAuth.prototype.resetHasDCcli = function resetHasDCcli() { //reset value for testing purpose
            hasDCcli = undefined;
        };

        DCAuth.prototype.isFromUser = function isFromUser( user ) {
            return dcauth.isFromUser( user );
        };

        DCAuth.prototype.getTenantRequestSecret = function getTenantRequestSecret() {
            return dcauth.getTenantRequestSecret();
        };

        DCAuth.prototype.getSUForTenant = function getSUForTenant( tenantId ) {
            return dcauth.getSUForTenant( tenantId );
        };

        DCAuth.prototype.getSUForPUC = function getSUForPUC() {
            return dcauth.getSUForTenant( dcauth.getPUCTenantId() );
        };

        DCAuth.prototype.getSUForLocal = function getSUForLocal( groupsArr ) {
            return dcauth.getSUForLocal( groupsArr );
        };

        DCAuth.prototype.getSUForCustomer = function getSUForCustomer( customerNo, callback ) {
            return dcauth.getSUForCustomer( customerNo, callback );
        };

        DCAuth.prototype.isHexTenantId = function isHexTenantId( tenantId ) {
            return dcauth.isHexTenantId( tenantId );
        };

        DCAuth.prototype.getNewTenantId = function getNewTenantId( callback ) {
            dcauth.getNewTenantId( callback );
        };

        DCAuth.prototype.getTenantFromHost = function getTenantFromHost( host ) {
            return dcauth.getTenantFromHost( host );
        };

        DCAuth.prototype.getWWWSecret = function getDCPRCSecret() {
            return friends.WWW && friends.WWW.secretKey;
        };
        DCAuth.prototype.getMVPRCSecret = function getDCPRCSecret() {
            return friends.MVPRC && friends.MVPRC.secretKey;
        };
        DCAuth.prototype.getDCPRCSecret = function getDCPRCSecret() {
            return friends.DCPRC && friends.DCPRC.secretKey;
        };

        DCAuth.prototype.getPUCSecret = function getPUCSecret() {
            return friends.PUC && friends.PUC.secretKey;
        };

        DCAuth.prototype.getPUCHost = function getPUCHost( withScheme, withPort ) {
            return dcauth.getPUCHost( withScheme, withPort );
        };

        DCAuth.prototype.getISDSecret = function getPUCSecret() {
            return friends.ISD && friends.ISD.secretKey;
        };

        DCAuth.prototype.getVPRCSecret = function getVPRCSecret() {
            return friends.VPRC && friends.VPRC.secretKey;
        };

        DCAuth.prototype.getUVITASecret = function getUVITASecret() {
            return friends.UVITA && friends.UVITA.secretKey;
        };

        DCAuth.prototype.getIPList = function getIPList() {
            return dcauth.getIPList();
        };

        DCAuth.prototype.getPRCSecret = function getPRCSecret() {
            return friends.PRC && friends.PRC.secretKey;
        };
        DCAuth.prototype.getDeviceServerSecret = function getDeviceServerSecret() {
            return friends.DeviceServer && friends.DeviceServer.secretKey;
        };
        DCAuth.prototype.getCardreaderSecret = function getCardreaderSecret() {
            return friends.Cardreader && friends.Cardreader.secretKey;
        };

        DCAuth.prototype.getVPRCUrl = function getVPRCUrl( path ) {
            return dcauth.getVPRCUrl( path );
        };

        DCAuth.prototype.setVPRCHost = function getVPRCHost( vprcFQHostName ) {
            return dcauth.setVPRCHost( vprcFQHostName );
        };

        DCAuth.prototype.getPUCUrl = function getPUCUrl( path ) {
            return dcauth.getPUCUrl( path );
        };

        /**
         * This methods checks whether the input 'url' is for puc server or not.
         *
         * @param {String} url the endpoint which the current server is trying to request
         * @returns {boolean}
         * @private
         */
        DCAuth.prototype.isPucUrl = function getPUCUrl( url ) {
            const
                pucUrl = authLayer.getPUCUrl(),
                pucHost = pucUrl && pucUrl.replace(/(^\w+:|^)\/\//, ''); //Converts "http://puc.dev.dc" to puc.dev.dc

            if( url && typeof url === "string" && pucHost && url.includes(pucHost)) {
                return true;
            }

            return false;
        };

        DCAuth.prototype.isDevServer = function isDevServer() {
            return -1 !== process.argv.indexOf( '--dev' ) || dcauth.getPUCUrl( '/' ).includes( '.dev.dc' );
        };

        DCAuth.prototype.getExternalUrl = function getExternalUrl( path, hostname ) {
            return dcauth.getExternalUrl( path, hostname );
        };

        DCAuth.prototype.getTenantUrl = function getTenantUrl( host, path, withAddDomain ) {
            return dcauth.getTenantUrl( host, path, withAddDomain );
        };

        DCAuth.prototype.getDCPRCUrl = function getDCPRCUrl( path ) {
            return dcauth.getDCPRCUrl( path );
        };
        DCAuth.prototype.isDCPRCHost = function isDCPRCHost( host ) {
            let
                dcprcURL = this.getDCPRCUrl();
            return dcprcURL && -1 !== dcprcURL.indexOf( host );
        };

        /**
         * dcprc URL
         * @param {String} path
         * @returns {string}
         */
        DCAuth.prototype.getAdminUrl = function getAdminUrl( path ) {
            return dcauth.getDCPRCUrl( path );
        };

        DCAuth.prototype.getWWWUrl = function getWWWUrl( path ) {
            return dcauth.getWWWUrl( path );
        };

        DCAuth.prototype.getPartnerUrl = function getPartnerUrl( path ) {
            return dcauth.getPartnerUrl( path );
        };

        /**
         * determine the host name on which the current server is reachable
         * Note: for PRC on prod, the host is set externally, but on dev, it comes from dev-env-prc
         *
         * @param {string} tenantId
         * @param {boolean} withScheme whether to add protocol or not
         * @returns {string}
         */
        DCAuth.prototype.getMyHost = function getMyHost( tenantId, withScheme ) {
            if( authLayer.isPRC() || hasDCcli === true && authLayer.isISD() ) {
                if( prcHostName ) {
                    if( withScheme && !/^https?:\/\//.test( prcHostName ) ) {
                        return 'https://' + prcHostName;
                    } else {
                        return prcHostName;
                    }
                } else {
                    tenantId = null;
                }
            }
            return dcauth.getMyHost( tenantId, withScheme );
        };

        DCAuth.prototype.resetPRCHost = async function resetPRCHost() {
            let
                err, result;

            [ err, result ] = await formatPromiseResult( Promise.all( [ getPRCExternalHost(), setPRCIP() ] ) ); //jshint ignore:line

            if( err ) {
                throw err;
            }

            if( result ) {
                result = result.filter( Boolean );
            }

            Y.log( `resetPRCHost: Finished. ${ result.length ? "Failed to: " + result.join( "," ) : ""}`, 'info', NAME );
            return result;
        };//jshint ignore:line
        DCAuth.prototype.getPRCIP = function getPrcIP() {
            return prcIP;
        };

        DCAuth.prototype.getPUCTenantId = function getPUCTenantId() {
            return dcauth.getPUCTenantId();
        };

        DCAuth.prototype.getLocalTenantId = function getLocalTenantId() {
            return dcauth.getLocalTenantId();
        };

        DCAuth.prototype.getPRCUrl = function getPRCUrl( path, tenantId ) {
            if( tenantId ) {
                return dcauth.getPRCUrl( path, tenantId );
            }
            return dcauth.getPRCUrl( path );
        };

        DCAuth.prototype.getGeneralExternalUrl = function getGeneralExternalUrl( user ) {
            var prcUrl;

            if( Y.doccirrus.auth.isPUC() ) {
                prcUrl = user.prc || Y.doccirrus.auth.getPRCUrl( '', user.tenantId );
            } else if( Y.doccirrus.auth.isISD() ) {
                prcUrl = prcHostName || this.getSystemType();
            } else {
                prcUrl = Y.doccirrus.auth.getMyHost( user.tenantId, true );
            }
            return prcUrl.toLowerCase();
        };

        DCAuth.prototype.getSerialNumber = function getSerialNumber( prcUrl ) {
            if( Y.doccirrus.auth.isPUC() ) {
                return;
            } else {
                if( !/[^a-z]/i.test( prcUrl ) ) {
                    return prcUrl;
                }
                if( -1 < prcUrl.indexOf( '//' ) ) {
                    return prcUrl.slice( prcUrl.indexOf( '/' ) + 2, prcUrl.indexOf( '.' ) );
                }
                if( -1 < prcUrl.indexOf( '/' ) ) {
                    return prcUrl.slice( prcUrl.indexOf( '/' ) + 1, prcUrl.indexOf( '.' ) );
                }
                return prcUrl.slice( 0, prcUrl.indexOf( '.' ) );
            }
        };

        DCAuth.prototype.isPatientPortal = function isPatientPortal() {
            var
                self = this,
                serverType = self.getServerType();
            return 'PP' === serverType;
        };

        DCAuth.prototype.isPUC = function isPUC() {
            return dcauth.isPUC();
        };
        DCAuth.prototype.isPRC = function isPRC() {
            return dcauth.isPRC();
        };
        DCAuth.prototype.isISD = function isISD() {
            return dcauth.isISD();
        };
        DCAuth.prototype.isVPRC = function isVPRC() {
            return dcauth.isVPRC();
        };
        // is this a non-trial vprc (doc-cirrus trial vprc is the special case now)
        DCAuth.prototype.isMVPRC = function isMVPRC() {
            return this.isVPRC() && !this.getSystemType().startsWith( Y.doccirrus.schemas.company.systemTypes.TRIAL );
        };
        DCAuth.prototype.isDOQUVIDE = function isDOQUVIDE() {
            return this.isISD() && this.getSystemType() === Y.doccirrus.schemas.company.systemTypes.DSCK;
        };
        DCAuth.prototype.isINCARE = function isINCARE() {
            return this.isISD() && this.getSystemType() === Y.doccirrus.schemas.company.systemTypes.INCARE;
        };
        DCAuth.prototype.isAmtsIsdSystem = function isAmtsIsdSystem() {
            return this.isISD() && [
                Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM,
                Y.doccirrus.schemas.company.systemTypes.INSPECTOR_LEARNING_SYSTEM,
                Y.doccirrus.schemas.company.systemTypes.INSPECTOR_EXPERT_SYSTEM
            ].includes(this.getSystemType());
        };

        /**
         * determine medneo admin
         * req must be provided for client-side use cases
         * @param {object} user
         * @returns {boolean}
         */
        DCAuth.prototype.isVPRCAdmin = function isvVPRCAdmin( user ) {
            return user && user.tenantId === Y.doccirrus.auth.getLocalTenantId() && Y.doccirrus.auth.isVPRC();
        };

        /**
         * This method checks whether server is a VPRC and an APPLIANCE and the user in operations belongs to master database.
         * The information on serverType and systemType can be found in practices collection under below keys:
         *
         * "systemType" : "APPLIANCE",
         * "serverType" : "MTS"
         *
         * @param {object} user
         * @returns {boolean}
         */
        DCAuth.prototype.isMTSAndMasterUser = function( user ) {
            return user && user.tenantId === Y.doccirrus.auth.getLocalTenantId() && Y.doccirrus.auth.isMTSAppliance();
        };

        /**
         * This method checks whether the current server is a VPRC appliance i.e.
         *
         * "systemType" : "APPLIANCE",
         * "serverType" : "MTS"
         *
         * @returns {boolean}
         */
        DCAuth.prototype.isMTSAppliance = function() {
            return Y.doccirrus.auth.isVPRC() && (this.getSystemType() === Y.doccirrus.schemas.company.systemTypes.APPLIANCE);
        };

        DCAuth.prototype.isDCPRC = function isDCPRC() {
            return dcauth.isDCPRC();
        };
        /**
         * Determine for a specific connection if it is for the DCPRC or not.
         *
         * @param {object} req  the connect http request
         * @returns {*}
         */
        DCAuth.prototype.isDCPRCRealm = function isDCPRCRealm( req ) {
            return dcauth.isDCPRCRealm( req );
        };

        /**
         * Determine applicance or  non-appliance PRC
         * @param {function} callback
         * @returns {boolean}
         */
        DCAuth.prototype.isNAPRC = function isNAPRC( callback ) {

            if( this.isNAPRCflag || this.isNAPRCflag === false ) {
                return callback ? callback( null, this.isNAPRCflag ) : Promise.resolve( this.isNAPRCflag );
            }

            if( callback ) {
                return checkNaprc.call( this, callback );
            }

            return new Promise( ( resolve, reject ) => {
                checkNaprc.call( this, ( err, res ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( res );
                } );
            } );

        };

        function checkNaprc( callback ) {
            const user = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'practice',
                query: { systemType: APPLIANCE },
                options: { limit: 1 }
            }, ( err, [ practice ] ) => {
                if( err ) {
                    return callback( err );
                }
                if( !practice ) {
                    this.isNAPRCflag = true;
                } else {
                    this.isNAPRCflag = false;
                }
                callback( null, this.isNAPRCflag );
            } );

        }

        /**
         * Generates JSON Web Token for specified request.
         *  Function takes request and sign it with server secret key.
         * @method getJSONWebToken
         * @param {Object} req request data
         * @param {Object} req.headers set of headers
         *  must include
         *      host
         *      X-DC-Date - timestamp of request, e.g. 2015-06-23T08:13:29.335Z
         *      X-DC-Server - server type, e.g. VPRC. Is used to get a secret key.
         *      X-DC-Content-SHA256 - Hex(sha256hash(req.body)), if req.body is not specified, hash is computed of empty string
         * @param {String} req.method HTTP verb
         * @param {String} req.originalUrl url part which is followed after host. e.g. /search?q=something
         * @param {Object} req.query query object
         * @param {Object} [req.body] body object. Contains data which is sent via POST, PUT
         * @see http://expressjs.com/api.html#req
         * @returns {Promise}
         */
        DCAuth.prototype.getJSONWebToken = function getJSONWebToken( req ) {
            const
                self = this,
                dcSdk = require( 'dc-sdk-communications' );

            let
                normalizedHeaders = {},
                getHeader;

            Object.keys( req.headers ).forEach( ( key ) => {
                const
                    value = req.headers[ key ];
                normalizedHeaders[ key.toLowerCase() ] = value;
            } );

            /**
             * getter for header. Case insensitive
             * @param {String} header
             * @returns {String}
             */
            getHeader = dcSdk.auth.getHeaderFabric( { normalizedHeaders } );

            return new Promise( ( resolve, reject ) => {
                if( getHeader( 'X-DC-App-Name' ) ) {
                    return self.checkAndGetSecretForApp( getHeader( 'X-DC-App-Name' ), ( err, result ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    } );
                }
                if( getHeader( 'X-DC-Server' ) ) {
                    return resolve( self.getSecretFor( getHeader( 'X-DC-Server' ) ) );
                }
            } )
                .then( secretKey => {
                    return dcSdk.auth.getJSONWebToken( req, secretKey );
                } );
        };

        /**
         * Checks whether web socket is authorized or not.
         * Handle both version of auth.
         *
         * @param {Object} params
         * @param {String} params.name  Name of the server who initiated websocket connection
         * @param {String} params.version  Value should be wither "1.0" or "2.0"
         * @param {String} params.date ISO date
         * @param {Object} params.socket  The websocket object
         * @param {string} params.token  A JWT token which needs to be verified
         * @returns {Promise}
         */
        DCAuth.prototype.verifyWebSocketJWT = function getJSONWebTokenForWebSocket( params ) {
            const
                { name, version, date, socket, token } = params,
                self = this;
            return self.getJSONWebTokenForWebSocket( { name, version, date } )
                .then( _token => {
                    return Y.doccirrus.auth.doTokenCheck( {
                        token,
                        generatedToken: _token,
                        date
                    } );
                } )
                .then( () => {
                    socket.request.user = Object.assign( self.getUserByReq( socket.request ), { U: name } );
                    socket.request.friend = version === '1.0' && name;
                    socket.request.authenticatedApp = version === '2.0' && name;
                    return name;
                } )
                .catch( err => {
                    Y.log( `Web socket connection from ${name} could not be authorized: ${err.toString()}`, 'warn', NAME );
                    throw err;
                } );
        };

        /**
         * Checks whether web socket is authorized or not by verifying provided 'oauthToken' with DCPRC.
         *
         * @param {Object} params
         * @param {String} params.name  Name of the server who initiated websocket connection
         * @param {Object} params.socket  The websocket object
         * @param {string} params.oauthToken  The oauth token which needs to be verified
         * @returns {Promise<void>}
         */
        DCAuth.prototype.verifyWebSocketOauth = async function( params ) {
            const
                { name, socket, oauthToken } = params;

            let
                err,
                result;

            Y.log(`verifyWebSocketOauth: Verifying oauthToken = '${oauthToken}' (received from: '${name}') from DCPRC server`, "info", NAME);

            [err, result] = await formatPromiseResult( Y.doccirrus.https.verifyOauthTokenFromDcprc( oauthToken ) );

            if( err ) {
                Y.log(`verifyWebSocketOauth: Could not authorize web socket connection from '${name}'. Error while verifying Oauth token: ${oauthToken} from DCPRC server. Error: ${err.stack || err}. stringified error: ${JSON.stringify(err)}. Blocking access...`, 'warn', NAME);
                throw err;
            }

            if( result.token === "INVALID" ) {
                Y.log(`verifyWebSocketOauth: Could not authorize web socket connection from ${name}' because Oauth: ${oauthToken} is INVALID. Error = '${result.error}', Error description = '${result.error_description}', statusCode = '${result.statusCode}', statusMessage = '${result.statusMessage}'. Blocking access...`, "warn", NAME);
                throw new Error(result.error_description);
            }

            socket.request.user = {...this.getUserByReq( socket.request ), U: name};
            socket.request.friend = name;
            socket.request.authenticatedApp = false;

            Y.log(`verifyWebSocketOauth: oauthToken = '${oauthToken}' (received from: '${name}') is verified by DCPRC server and is valid. Authorizing Web socket connection with socketId: ${socket.id}`, "info", NAME);
        };

        /**
         *
         * @param {Object} params
         * @param {String} params.token token from requires
         * @param {String} params.generatedToken generated token based on req data
         * @param {String} params.date ISO date from req header
         * @returns {Promise}
         */
        DCAuth.prototype.doTokenCheck = function doTokenCheck( params ) {
            const
                moment = require( 'moment' ),
                { token, generatedToken, date } = params;
            return Promise.resolve()
                .then( () => {
                    if( token !== generatedToken ) {
                        Y.log( `Tokens do not match`, 'warn', NAME );
                        throw new Y.doccirrus.commonerrors.DCError( 401, { message: 'Wrong token' } );
                    }
                    if( 3 < moment().diff( date, 'minute' ) ) {
                        Y.log( `Token is expired`, 'warn', NAME );
                        throw new Y.doccirrus.commonerrors.DCError( 401, { message: 'Token expired' } );
                    }
                } );
        };

        /**
         * Creates jwt token.
         * Depends of the version uses different secters:
         *  version '1.0' used by dc servers like PRC, DCPRC... secret is taken from friends.json
         *  version '2.0' used by apps, secret is an appToken (stored in redis)
         * Uses "dc-sdk-communications".auth.getJSONWebTokenForWebSocket
         * @param {Object} params
         * @param {String} params.name
         * @param {String} params.version
         * @param {String} params.date
         * @returns {Promise}
         */
        DCAuth.prototype.getJSONWebTokenForWebSocket = function getJSONWebTokenForWebSocket( params ) {
            const
                self = this,
                { name, version, date } = params,
                dcSdk = require( 'dc-sdk-communications' );

            return new Promise( ( resolve, reject ) => {
                switch( version ) {
                    case '1.0':
                        return resolve( self.getSecretFor( name ) );
                    case '2.0':
                        return self.checkAndGetSecretForApp( name, ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        } );
                    default:
                        return reject( new Y.doccirrus.commonerrors.DCError( 401 ) );

                }
            } )
                .then( secretKey => {
                    return dcSdk.auth.getJSONWebTokenForWebSocket( { name, date, secretKey } );
                } );
        };

        /**
         * Computes and inserts friends headers (e.g. X-DC-Friend, X-DC-Date..) to options.headers
         * @param {String }_url url
         * @param {String} verb HTTP verb
         * @param {Object} options
         * @param {Object} [options.headers]
         * @param {Object} [options.appName]
         * @param {String} [options.serverType] secret key of this server type will be used to sign request
         * @param {Object} [data] POST, PUT data
         * @return {Promise}
         */
        DCAuth.prototype.setFriendHeader = function( _url, verb, options, data ) {
            var req = {},
                url = require( 'url' ),
                urlObject = url.parse( _url, true ),
                crypto = require( 'crypto' );

            if( options.friend ) {
                const
                    headers = Object.assign( {}, options.headers || {} );
                headers[ 'X-DC-Date' ] = headers[ 'X-DC-Date' ] || (new Date()).toISOString();
                if( options.appName ) {
                    headers[ 'X-DC-App-Name' ] = options.appName;
                } else {
                    headers[ 'X-DC-Server' ] = options.serverType || Y.doccirrus.auth.getServerType();
                }
                headers[ 'X-DC-Content-SHA256' ] = crypto.createHash( 'sha256' ).update( data ? JSON.stringify( data ) : '' ).digest( 'hex' );
                req.method = verb;
                req.originalUrl = urlObject.path;
                req.query = urlObject.query;
                req.headers = Object.assign( { host: urlObject.hostname }, headers );
                req.body = data;
                return Y.doccirrus.auth.getJSONWebToken( req )
                    .catch( err => {
                        /**
                         * if error => log it and return null to next "then"
                         */
                        Y.log( `setFriendHeader. Friend token has not been set. ${JSON.stringify( err )}`, 'error', NAME );
                        return null;
                    } )
                    .then( friendHeader => {
                        headers[ 'X-DC-Friend' ] = friendHeader;
                        return headers;
                    } );
            }
            return Promise.resolve();
        };

        /**
         * @method buildUserByIdentity
         * @param {Object} params
         * @param {Object} [params.identity] identity entry
         * @param {String} [params.tenantId]
         * @param {Object} [params.user={}] is used as base object
         * @returns {User}
         */
        DCAuth.prototype.buildUserByIdentity = function( params ) {
            return dcauth.buildUserByIdentity( params );
        };

        /**
         * Returns secret for app by name if app has rights
         * @method checkAndGetSecretForApp
         * @param {String} appName
         * @param {Function} callback
         * @see Y.doccirrus.auth._checkAndGetSecretForApp
         */
        DCAuth.prototype.checkAndGetSecretForApp = function checkAndGetSecretForApp( appName, callback ) {
            Y.doccirrus.auth._checkAndGetSecretForApp( { appName, user: Y.doccirrus.auth.getSUForLocal() }, callback );
        };

        /**
         * Returns the inSuiteToken if the app has access to inSuite
         * Returns an error if the app does not have access
         * @method _checkAndGetSecretForApp
         * @param {Object} params
         * @param {String} params.appName
         * @param {Object} params.user
         * @param {Function} callback
         * @private
         */
        DCAuth.prototype._checkAndGetSecretForApp = async function checkAndGetSecretForApp( params, callback ) {
            const {appName, user} = params;
            let error, result;

            [error, result] = await formatPromiseResult(
                Y.doccirrus.api.appreg.getSecretForApp( {
                    appName,
                    user
                } )
            );

            if( error ) {
                Y.log( `_checkAndGetSecretForApp: error while getting secret for app: ${error}`, 'error', NAME );
                error = new Y.doccirrus.commonerrors.DCError( 500, {message: `Unexpected error occured`} );
                return handleResult( error, undefined, callback );
            }

            if( !result ) {
                Y.log( `_checkAndGetSecretForApp: app ${appName} not found!`, 'error', NAME );
                error = new Y.doccirrus.commonerrors.DCError( 401, {message: `App token for ${appName} not found`} );
                return handleResult( error, undefined, callback );
            }

            let {inSuiteToken, hasAccess} = result;

            if( !hasAccess ) {
                error = new Y.doccirrus.commonerrors.DCError( 401, {message: `App ${appName} does not have access`} );
                return handleResult( error, undefined, callback );
            }

            return handleResult( error, inSuiteToken, callback );
        };

        /**
         * Returns app secret
         * @param {Object} params
         * @param {String} params.appName
         * @param {Function} callback
         */
        DCAuth.prototype.getSecretForApp = function getSecretForApp( params, callback ) {
            const
                { appName } = params;
            Y.doccirrus.cacheUtils.dataCache.getData( {
                key: 'DcAppTokens'
            }, ( err, results = [] ) => {
                let
                    record;
                if( err ) {
                    return callback( err );
                }
                record = results.find( ( item ) => {
                    return item.appName === appName;
                } );
                if( !record ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 401, { message: `Token for ${appName} not found` } ) );
                }
                callback( null, record.token );
            } );

        };

        /**
         * Updates appregs collection:
         *  1. inserts new tokens
         *  2. deletes deleted tokens
         * @param {object} params
         * @param {function} callback
         * @returns {*}
         * @private
         */
        DCAuth.prototype._updateAppRegs = function( params, callback ) {
            const
                async = require( 'async' ),
                { appTokens, user } = params;
            if( !appTokens ) {
                Y.log( `appreg collection was not updated: appTokens array is empty`, 'warn', NAME );
                return callback();
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'appreg',
                        action: 'get',
                        query: {}
                    }, ( err, results ) => {
                        let
                            data = {
                                newApps: [],
                                deletedApps: []
                            },
                            appRegNames,
                            appNamesFromDCPRC;
                        if( err ) {
                            return next( err );
                        }
                        appRegNames = results.map( item => item.appName );
                        appNamesFromDCPRC = appTokens.map( item => item.appName );
                        appNamesFromDCPRC.forEach( item => {
                            if( !appRegNames.includes( item ) ) {
                                data.newApps.push( item );
                            }
                        } );
                        appRegNames.map( item => {
                            if( !appNamesFromDCPRC.includes( item ) ) {
                                data.deletedApps.push( item );
                            }
                        } );
                        next( null, data );
                    } );
                },
                function( data, next ) {
                    if( data.newApps.length ) {
                        async.eachSeries( data.newApps, ( appName, callback ) => {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'appreg',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    appName,
                                    hasAccess: false
                                } )
                            }, callback );
                        }, ( err ) => next( err, data ) );
                    } else {
                        return next( null, data );
                    }
                },
                function( data, next ) {
                    if( data.deletedApps.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'appreg',
                            action: 'delete',
                            query: {
                                appName: { $in: data.deletedApps }
                            },
                            options: {
                                override: true
                            }
                        }, ( err ) => next( err ) );
                    } else {
                        return next( null, data );
                    }
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `Could not update appreg collection. Error: ${JSON.stringify( err )}`, 'error', NAME );
                }
                callback();
            } );

        };

        /**
         * Saves secret tokens of app
         * @param {Array} appTokens
         * @param {Function} callback
         * @see Y.doccirrus.auth._setSecretsForApps
         */
        DCAuth.prototype.setSecretsForApps = function setSecretForApp( appTokens, callback ) {
            Y.doccirrus.auth._setSecretsForApps( { appTokens, user: Y.doccirrus.auth.getSUForLocal() }, callback );
        };

        /**
         * Saves secrets into Redis and updates list of available app (appreg collection)
         * @method _setSecretsForApps
         * @param {Object} params
         * @param {Object} params.user
         * @param {Array} params.appTokens
         * @param {Function} callback
         * @private
         */
        DCAuth.prototype._setSecretsForApps = function setSecretForApp( params, callback ) {
            const
                { user, appTokens } = params,
                async = require( 'async' ),
                dcSdk = require( 'dc-sdk-communications' );
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'practice',
                action: 'get',
                query: {},
                options: {
                    limit: 1
                }
            } )
                .then( async results => {
                    let practice = results && results[ 0 ];
                    if( !practice ) {
                        throw new Y.doccirrus.commonerrors.DCError( 500, { message: 'Practice entry not found' } );
                    }
                    // eslint-disable-next-line no-unused-vars
                    for( let item of appTokens ) {
                        item.originalToken = item.token;
                        item.token = await dcSdk.auth.signObject( {
                            objectToSign: item.originalToken,
                            secretKey: `${practice._id.toString()}${practice.dcCustomerNo}`
                        } );

                        item.appAccessToken = await dcSdk.auth.signObject( {
                            objectToSign: item.originalToken,
                            secretKey: `${item.appName}${item.token}`
                        } );
                    }
                    async.parallel( [
                        function( done ) {
                            Y.doccirrus.cacheUtils.dataCache.setData( {
                                key: 'DcAppTokens',
                                data: appTokens
                            }, done );
                        },
                        function( done ) {
                            Y.doccirrus.auth._updateAppRegs( {
                                user,
                                appTokens: appTokens || []
                            }, done );
                        }
                    ], callback );
                } )
                .catch( error => {
                    callback( error );
                } );
        };

        /**
         * Returns a secret for the specified server type.
         * The Secret is taken from friends.json
         * @param {String} serverType
         * @returns {string}
         */
        DCAuth.prototype.getSecretFor = function getSecretFor( serverType ) {
            var dcSecret = 'not-allowed',
                self = this;
            switch( serverType ) {
                case friendsList.PUC:
                    dcSecret = self.getPUCSecret();
                    break;
                case friendsList.ISD:
                    dcSecret = self.getISDSecret();
                    break;
                case friendsList.PRC:
                    dcSecret = self.getPRCSecret();
                    break;
                case friendsList.VPRC:
                    dcSecret = self.getVPRCSecret();
                    break;
                case friendsList.DCPRC:
                    dcSecret = self.getDCPRCSecret();
                    break;
                case friendsList.WWW:
                    dcSecret = self.getWWWSecret();
                    break;
                case friendsList.DeviceServer:
                    dcSecret = self.getDeviceServerSecret();
                    break;
                case friendsList.Cardreader:
                    dcSecret = self.getCardreaderSecret();
                    break;
            }
            return dcSecret;

        };

        DCAuth.prototype.setInternalAccessOptions = function setInternalAccessOptions() {
            return {
                friend: true
            };
        };

        DCAuth.prototype.getCurrentDomain = function getCurrentDomain() {
            return dcauth.getCurrentDomain();
        };

        DCAuth.prototype.isValidTenantId = function isValidTenantId( tenantId ) {
            return !!dcauth.sanitizeTenantId( tenantId );
        };

        // The following Dummy Functions are used only in the LongiMojit at the moment
        // But they should also be available from the user mgmt console:  TODO MOJ-263
        // dummy functions returning randomized true or false
        DCAuth.prototype.checkPw = function( user, pwHash, callback ) {
            callback( Math.random() < 0.5 );
        };
        // dummy functions returning randomized true or false
        DCAuth.prototype.updatePw = function( user, oldHash, newHash, callback ) {
            callback( Math.random() < 0.5 );
        };

        /**
         * Check if the current logged in user is an admin user
         * @param {object} ac
         * @return {boolean}
         */
        DCAuth.prototype.isAdmin = function( ac ) {
            var
                req = ac.http.getRequest();
            if( undefined !== req && undefined !== req.user ) {
                return this.isAdminUser( req.user );
            }
            return false;
        };

        /**
         * check if the given has an Admin membership
         * @param {object} user
         * @returns {boolean}
         */
        DCAuth.prototype.isAdminUser = function( user ) {
            var
                groups = user.groups || user.memberOf,
                i;
            if( groups ) {
                for( i = 0; i < groups.length; i++ ) {
                    if( 'ADMIN' === groups[ i ].group.toUpperCase() ) {
                        return true;
                    }
                }
            }
            return false;
        };

        DCAuth.prototype.onReady = function onReady( callback ) {
            dcauth.onReady( callback );
        };

        DCAuth.prototype.isReady = function isReady() {
            return dcauth.isReady();
        };

        /**
         * checks the validity (license-wise) of the given product for this tenant
         * @param {object} ac
         * @param {string} name the product name to check
         * @return {boolean}
         */
        DCAuth.prototype.validProduct = function( ac, name ) {
            var
                result = false,
                req = ac.http.getRequest();

            if( req && req.user ) {
                if( req.user.prodServices && Array.isArray( req.user.prodServices ) ) {
                    result = req.user.prodServices.some( function( el ) {
                        return el === name;
                    } );
                }

                if( result ) {
                    Y.log( 'reporting valid product: ' + name, 'debug' );
                }
            }
            return result;
        };

        /**
         * Returns the URL of PRC or VPRC by Request
         * @param {object} req {Request}
         * @param {boolean} withProtocol
         * @returns {String}
         */
        DCAuth.prototype.getURLforPRCorVPRC = function( req, withProtocol ) {
            var
                host, subdomain, url = '', temp;

            if( withProtocol ) {
                temp = dcauth.getVPRCHost( true ) || '';
                url = (0 === temp.indexOf( 'https://' )) ? 'https://' : 'http://'; // use whatever protocol configured for vprc (MOJ-4022)
            }
            host = req && req.headers && req.headers.host;
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() ) {
                url += host;
                return url;
            }
            subdomain = (host && host.split( '.' ).length > 1) ? host && host.split( '.' )[0] : '';
            if( Y.doccirrus.auth.isHexTenantId( subdomain ) ) {
                url += host;
                return url;
            }
            host = req && req.headers && req.headers.origin && req.headers.origin.split( '//' );
            url += (host && host[1]);
            return url;
        };

        /**
         * set the prc field which is the url that client code (served form PUC) can use to communicate with (master) VPRC/PRC
         * @param {object} user
         * @param {object} req
         */
        DCAuth.prototype.setMasterUrl = function( user, req ) {
            // Set the PRC address into the cookie, very NB for the
            // binders which look for this value.
            if( dcauth.isVPRC() ) {
                user.prc = dcauth.getPRCHost( user.tenantId, true, true );
            } else if( dcauth.isPRC() || Y.doccirrus.auth.isISD() ) {
                // as requested in MOJ-4022
                user.prc = Y.doccirrus.auth.getURLforPRCorVPRC( req, true );
            } else {
                if( !dcauth.isPUC() ) {
                    // must be configured
                    user.prc = dcauth.getConfiguredHost();
                }
            }
        };

        /**
         * Gets the current country for this installation.
         *
         * Currently (Q1/2014) defined in Address_E
         *
         *  "val": "Österreich",
         *  "val": "Schweiz",
         *  "val": "Deutschland",
         *  "val": "Anderes Land",
         *
         *  Do not use this code any more.  It is not compatible with countryMode.
         *  Now a user has countryMode.
         *
         *  @deprecated
         *
         * @param {object} user
         * @return {string}
         */
        DCAuth.prototype.getCountry = function( user ) {
            return (user && user.country) ? user.country : '';
        };

        DCAuth.prototype.getCountryCode = function( user ) {
            return (user && user.countryCode) ? user.countryCode : '';
        };

        /**
         * return a token string which is hashed date string
         * a use case is password set/reset link
         * @returns {*}
         */
        DCAuth.prototype.getToken = function() {
            var
                crypto = require( 'crypto' ),
                md5 = crypto.createHash( 'md5' );
            md5.update( new Date().toString() );
            return md5.digest( 'base64' );
        };

        /**
         * Returns available directories.
         *
         * @param {String} [dirName] return this specific directory
         * @returns {Object | String} object with dirName / path associantions or  path to directory, if dirName is passed
         */
        DCAuth.prototype.getDirectories = function( dirName ) {
            if( 'string' !== typeof dirName ) {
                return this.directories;
            } else {
                return this.directories[ dirName ];
            }
        };

        /**
         * Returns log file path
         * @returns {string|undefined}
         */
        DCAuth.prototype.getLogPath = function() {
            return Y.doccirrus.fileutils.resolve( this.log );
        };

        /**
         *  Returns path to tmp directory.
         * @returns {String}
         */
        DCAuth.prototype.getTmpDir = function() {
            return Y.doccirrus.fileutils.resolve( Y.doccirrus.auth.getDirectories( TMP_DIR_NAME ) );
        };

        /**
         *  Returns path to tmp import directory.
         * @returns {String}
         */
        DCAuth.prototype.getImportDir = function() {
            var resultDir;
            if( authLayer.isDevServer() ) {
                resultDir = authLayer.getTmpDir() + authLayer.getDirectories( 'import' );
            } else {
                resultDir = authLayer.getDirectories( 'import' );
            }
            if( !resultDir ) {
                return;
            }
            return Y.doccirrus.fileutils.resolve( resultDir );
        };
        /**
         * Checks if specified user has permission to do specified transition
         * @param {Object} user
         * @param {Array} user.groups groups of identity
         * @param {String} transition action, e.g. validate, cancel, approve
         * @returns {Boolean}
         */
        DCAuth.prototype.hasTransitionPermission = function( user, transition ) {
            if( user && user.groups ) {
                return user.groups.some( function( data ) {
                    return transitionList[ transition ] && (-1 !== transitionList[ transition ].accessGroups.indexOf( data.group ));
                } );
            } else {
                return false;
            }

        };

        /**
         * Checks if specified user has permission to open specified section of the system
         * @method hasSectionAccess
         * @param {Object} user
         * @param {Array} user.groups groups of identity
         * @param {String} section section of system, can be: Mojit or section of mojit
         *      syntax for section: '<Mojit>.<Section>' e.g. 'UserMgmtMojit.companyadmin'
         * @param {Object} [options]
         * @see Y.doccirrus.authpub.sectionsAccess
         * @returns {Boolean}
         */
        DCAuth.prototype.hasSectionAccess = function( user, section, options ) {
            let
                sections = section.split( '.' ),
                accessGroups = this.filterACL( {
                    section,
                    options
                } );

            if( user && user.groups && sections && sections.length ) {
                if( !accessGroups ) {
                    Y.log( 'The section path: "' + section + '" does not exist', 'error', NAME );
                    return false;
                }
                //                accessGroups = accessGroups._access || accessGroups;

                return user.groups.some( function( data ) {
                    return -1 !== accessGroups.indexOf( data.group );
                } );
            } else {
                return false;
            }
        };

        /**
         * NOTE: DO NOT EXTEND!
         * @param {String} section
         * @return {boolean}
         */
        DCAuth.prototype.doesSectionNeedFiltering = function doesSectionNeedFiltering( section ) {
            const restrictedACL = [
                'LabLogMojit.labLog',
                'TelekardioMojit.telekardio',
                'GdtLogMojit.gdtLog',
                'InPacsLogMojit.inPacsLogMojit',
                'PatientTransferMojit.transferLog',
                'DeviceLogMojit.deviceLog'
            ];
            return restrictedACL.includes( section );
        };

        /**
         * NOTE: DO NOT EXTEND!
         * @param {Object} args
         * @param {String} args.section
         * @param {Object} [args.options]
         * @param {module:settingsSchema.settings} [args.options.settings]
         * @return {Object}
         */
        DCAuth.prototype.filterACL = function filterACL( args ) {
            const
                section = args.section,
                options = args.options || {},
                settings = options.settings || {};

            if( !this.doesSectionNeedFiltering( section ) || !settings || !settings.noCrossLocationAccess || !settings.booksAccessOnlyForAdmins ) {
                return _.get( Y.doccirrus.authpub.sectionsAccess, section );
            }

            return [
                Y.doccirrus.schemas.identity.userGroups.ADMIN,
                Y.doccirrus.schemas.identity.userGroups.SUPPORT
            ];
        };

        /**
         * Checks if specified user has permission to do specified action with specified collection
         *  checks if user is NOT in restricted list.
         * @method hasCollectionAccess
         * @param {Object} user
         * @param {Array} user.groups groups of identity
         * @param {String} action process action, e.g. write, delete
         * @param {String} collection collection name, e.g. activity, identity
         * @see restrictedCollections
         * @returns {Boolean}
         */
        DCAuth.prototype.hasCollectionAccess = function( user, action, collection ) {
            if( user && user.groups && collection && action ) {
                if( !restrictedCollections[ collection ] || !restrictedCollections[ collection ][ action ] ) {
                    return true;
                }
                return user.groups.some( function( data ) {
                    return -1 === restrictedCollections[ collection ][ action ].indexOf( data.group );
                } );
            } else {
                return false;
            }
        };

        /**
         * Returns function to check user access to do action with collection
         * @method getCollectionAccessChecker
         * @param {String} action process action, e.g. write, delete
         * @param {String} collectionName collection name, e.g. activity, identity
         * @param {Function} [helper] function which is called before main access check.
         *  This function is called only if prev. entry and new have same '_id'
         *  helper(user, data, callback)
         *      {Object} user - user object which is passed to process function,
         *      {Object} data - data object which is passed to process function,
         *      {Function} callback - callback function, should be called when helper is finished his tasks or in case of error.
         * @see DCAuth.prototype.hasCollectionAccess
         * @returns {Function}
         */
        DCAuth.prototype.getCollectionAccessChecker = function( action, collectionName, helper ) {
            return function( _user, entryData, callback ) {
                var
                    user = Object.assign( {}, _user ),
                    async = require( 'async' );
                async.series( [
                    function( next ) {
                        if( entryData && entryData._id && entryData.originalData_ && entryData.originalData_._id && entryData._id.toString() === entryData.originalData_._id.toString() && 'function' === typeof helper ) {
                            helper( user, entryData, next );
                        } else {
                            return next();
                        }
                    },
                    function( next ) {
                        if( !Y.doccirrus.auth.hasCollectionAccess( user, action, collectionName ) ) {
                            return next( Y.doccirrus.errors.rest( 401, '', true ) );
                        }
                        next();
                    }
                ], function( err ) {
                    if( err ) {
                        return callback( err );
                    }
                    callback( null, entryData );
                } );
            };
        };

        /**
         * Checks if specified user has specified group
         * @param {Object} user
         * @param {String} group
         * @returns {Boolean}
         */
        DCAuth.prototype.memberOf = function( user, group ) {
            var
                groups = user && (user.groups || user.memberOf);
            if( groups ) {
                return groups.some( function( data ) {
                    return group === data.group;
                } );
            } else {
                return false;
            }
        };

        /**
         * Checks if specified user has access to specified api function
         * @method hasSectionAccess
         * @param {Object} user
         * @param {Array} user.groups groups of identity
         * @param {String} apiPath function api path ('<API>.<method>'), e.g. 'kbvlog.approve'
         * @see Y.doccirrus.authpub.restrictedAPI
         * @returns {Boolean}
         */
        DCAuth.prototype.hasAPIAccess = function( user, apiPath ) {
            var api = apiPath.split( '.' ),
                accessGroups = Y.doccirrus.authpub.restrictedAPI;
            if( user && user.groups && api && api.length ) {
                api.every( function( _api ) {
                    accessGroups = accessGroups[ _api ];
                    return 'undefined' !== typeof accessGroups;
                } );
                if( !accessGroups ) {
                    Y.log( 'The api path: "' + apiPath + '" does not exist', 'error', NAME );
                    return false;
                }
                return user.groups.some( function( data ) {
                    return -1 === accessGroups.indexOf( data.group );
                } );
            } else {
                return false;
            }
        };

        /**
         * Checks if the prc has license to use the module
         * @param {Object} user
         * @param {String} section module section, e.g. CaseFileMojit
         * @returns {*}
         */
        DCAuth.prototype.hasModuleAccess = function( user, section ) {
            var
                accessGroups = Y.doccirrus.authpub.sectionsAccess,
                requiredLicense = (accessGroups[ section ] && accessGroups[ section ].requiredLicense);
            if( !user ) {
                return false;
            }
            if( !requiredLicense ) {
                return true;
            }

            switch( requiredLicense.type ) {
                case Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES:
                    return Y.doccirrus.licmgr.hasBaseServices( user.tenantId, requiredLicense.license );
                case Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES:
                    return Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, requiredLicense.license );
                default:
                    return false;
            }

        };

        DCAuth.prototype.getRequiredLicense = function( section ) {
            var
                accessGroups = Y.doccirrus.authpub.sectionsAccess;
            return (accessGroups[ section ] && accessGroups[ section ].requiredLicense && accessGroups[ section ].requiredLicense.license) || '';
        };

        /**
         * (re)generate public and private keys and store them
         * @param {object} user
         * @param {function} callback returns only public key
         */
        DCAuth.prototype.generateKeys = function( user, callback ) {
            Y.log( 'generating key pair for user:' + JSON.stringify( user ), 'debug', NAME );
            var
                kpData = { _id: Y.doccirrus.schemas.admin.getKeyPairId(), skipcheck_: true },
                kp = Y.doccirrus.authpub.createKeys(),
                expireDate = new Date();

            kpData.publicKey = kp.publicKey;
            kpData.privateKey = kp.secret;
            expireDate.setYear( expireDate.getFullYear() + 3 ); // 3 years
            kpData.expireDate = expireDate;

            function returnData() {
                callback( null, { publicKey: kpData.publicKey, expireDate: kpData.expireDate } );
            }

            function postIt() {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'admin',
                    action: 'post',
                    data: kpData,
                    callback: function( err ) {
                        if( err ) {
                            Y.log( 'error in posting kpData: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }

                        returnData();
                    }
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'get',
                query: { _id: kpData._id },
                callback: function( err, result ) {
                    if( err ) {
                        return callback( err );
                    }

                    if( result && result[ 0 ] ) {
                        Y.mix( result[ 0 ], kpData, true );

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'admin',
                            action: 'put',
                            query: {
                                _id: result[ 0 ]._id
                            },
                            fields: Object.keys( result[ 0 ] ),
                            data: Y.doccirrus.filters.cleanDbObject( result[ 0 ] )
                        }, function( err ) {
                            if( err ) {
                                return callback( err );
                            }

                            returnData();
                        } );
                    } else {
                        postIt();
                    }
                }
            } );
        };

        /**
         * if there is no key pair then create them on startup
         * @param {object} user
         * @param {function} callback
         */
        DCAuth.prototype.generateKeysOnStartUp = function generateKeysOnStartUp( user, callback ) {

            function _callback( err, result ) {
                if( err ) {
                    return callback( err );
                }
                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.doccirrus.api.metaprac.registerTenant( {
                        user: user,
                        data: {
                            publicKey: result.publicKey
                        },
                        callback: function( err ) {
                            callback( err );
                        }
                    } );
                } else {
                    return callback();
                }

            }

            Y.log( 'entered generateKeysOnStartUp', 'debug', NAME );

            if( !callback ) {
                callback = function( err, result ) {
                    if( err ) {
                        Y.log( 'error in generate-Keys-On-StartUp: ' + JSON.stringify( err ), 'error', NAME );
                    } else {
                        Y.log( 'done with generate-Keys-On-StartUp: ' + JSON.stringify( result ), 'debug', NAME );
                    }
                };
            }

            Y.doccirrus.auth.getKeyPair( user, function( err, keyData ) {
                if( err && 7303 !== err.code ) {
                    _callback( err );

                } else if( keyData && keyData.publicKey ) {
                    _callback( null, { publicKey: keyData.publicKey } );

                } else {
                    Y.doccirrus.auth.generateKeys( user, _callback );
                }
            } );
        };

        /**
         * single access point to key pair data
         * if the key is expired then an error will be returned
         *
         * @param {object} user
         * @param {function} callback
         */
        DCAuth.prototype.getKeyPair = function( user, callback ) {

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                select: { publicKey: 1, privateKey: 1, expireDate: 1 },
                query: { _id: Y.doccirrus.schemas.admin.getKeyPairId() },
                options: {
                    lean: true
                },
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( 'error in getting key pair: ' + JSON.stringify( err ) );
                        return callback( err );

                    }
                    if( result && result[ 0 ] ) {
                        if( result[ 0 ].expireDate < new Date() ) {
                            return callback( Y.doccirrus.errors.rest( 7303, { expireDate: result[ 0 ].expireDate } ) );
                        }
                        return callback( null, result[ 0 ] );
                    }
                    return callback();

                }
            } );
        };

        /**
         * access is external if host matches *.hub*,
         * or alternatively host is an IP which doesn't match server's IP
         *
         * @param {string} host either IP or host name user with which user has accessed the server
         * @param {function} callback
         * @returns {boolean | undefined}
         */
        DCAuth.prototype.isExternalAccess = function( host, callback ) {
            var
                isRemote;

            function getNetPrefix( ip ) {
                return ip.substring( 0, ip.lastIndexOf( '.' ) );
            }

            if( host && 0 < host.indexOf( '.hub' ) ) {
                isRemote = true;
            } else if( prcIP && host && /^[\d\.]+$/.test( host ) ) { // if the host is an IP address
                isRemote = (getNetPrefix( host ) !== getNetPrefix( prcIP ));
            }

            if( callback ) {
                callback( null, isRemote ); // eslint-disable-line callback-return
            }
            return isRemote;
        };

        /**
         * check user roles if they can access PRC externally
         * @param {object} user the subject user
         * @returns {boolean}
         */
        DCAuth.prototype.hasExternalAccess = function( user ) {
            return Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.ADMIN ) ||
                   Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPPORT ) ||
                   Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.CONTROLLER ) ||
                   Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPERUSER );
        };

        /**
         * Returns current server type
         * @method getServerType
         * @returns {string}
         */
        DCAuth.prototype.getServerType = function() {
            return dcauth.getServerType();
        };

        DCAuth.prototype.getSystemType = function() {
            return dcauth.getSystemType() || '';
        };

        DCAuth.prototype.wasArgsFlagUsed = function() {
            return dcauth.wasArgsFlagUsed();
        };

        /**
         * Checks whether server of request has access to current/specified server or not
         * @method hasInternalAccess
         * @param {String} targetServer server type of a request. e.g. from X-DC-Server header
         * @returns {boolean}
         */
        DCAuth.prototype.hasInternalAccess = function( targetServer ) {
            var
                self = this,
                serverType = self.getServerType();
            return targetServer && friends[ serverType ] && -1 !== friends[ serverType ].connections.indexOf( targetServer );
        };

        /**
         * Line in linux we store password augmented with salt string:
         * $V$SALTHASH
         * V=password version
         * SALT=The salt
         * HASH= hash(salt+password)
         *
         * @param {string} str the hashed password
         * @param {string} [salt] (optional) if not provided a new salt will be generated
         * @returns {string}
         */
        DCAuth.prototype.getSaltyPassword = function( str, salt ) {
            // recursive function to get arbitrarily long random string.
            function fillRandomString( len ) {
                var
                    buf = Buffer.alloc( Math.round( len / 2 ) ),
                    str = require( 'crypto' ).randomFillSync( buf ).toString( 'hex' );
                return str.substr( 0, len );
            }

            salt = salt || fillRandomString( 12 );
            var
                hashPart = salt + str, // salt + hashed password
                pw = '$2$' + salt + Y.doccirrus.authpub.getPasswordHash( hashPart ); // prepend the version prefix and salt
            return pw;
        };

        /**
         * Removes user session and socket connection
         * @param {Object} user
         * @param {Boolean} soft if not set, will emit socket event(redirect to login page) to client side
         *  if set, just removes session and socket connection.
         */
        DCAuth.prototype.doUserLogout = function( user, soft ) {
            var
                sessionId = user.sessionId;
            if( !soft ) {
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: sessionId,
                    event: 'timeoutWarn',
                    msg: { data: 0 }
                } );
            }
            dcauth.removeUserSession( user, sessionId ); // delete persistent session

            Y.doccirrus.communication.disconnectUserSockets( { sessionID: sessionId, identityId: user.identityId } ); // on master, disconnect other sockets for the same browser
            Y.doccirrus.api.auth.removeUser( user, sessionId );
            Y.doccirrus.api.masterTab._cleanActivePatientOfSession( sessionId );
        };

        /**
         * If ip address changes, send mail to admin.
         * @param {function} callback
         * @return {void}
         */
        DCAuth.prototype.checkIPAddessChanged = function checkIPAddessChanged( callback ) {

            if( !Y.doccirrus.auth.isPRC() ) {
                return callback();
            }

            let localIp = prcIP;

            if( !localIp ) {
                Y.log( `checkIPAddessChanged: Datasafe is offline. Skipping IP change check`, 'info', NAME );
                return callback();
            }

            Y.log( `checkIPAddessChanged: Datasafe current ip is ${localIp}. Checking if IP has changed`, 'info', NAME );

            class NotChangedIpErr extends Error {
            }

            class IsNAPRCErr extends Error {
            }

            const _id = Y.doccirrus.schemas.admin.getIpAddressId();
            const user = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.auth.isNAPRC()
                .then( isNAPRC => {
                    if( isNAPRC ) {
                        throw new IsNAPRCErr( 'Server is non-appliance' );
                    }
                    return runDb( { user, model: 'admin', query: { _id } } );
                } )
                .then( ( [ { localIp: oldIp = null } = {} ] ) => {
                    if( localIp === oldIp ) {
                        Y.log( `checkIPAddessChanged: Datasafe IP not changed. IP is: ${localIp}`, 'info', NAME );
                        throw new NotChangedIpErr( 'Ip not changed' );
                    }

                    Y.log( `checkIPAddessChanged: Datasafe Ip changed. Old Ip: ${oldIp} New IP: ${localIp}. Sending IP change email.`, 'info', NAME );

                    const upsertP = runDb( {
                        user,
                        model: 'admin',
                        action: 'upsert',
                        fields: [ 'localIp' ],
                        data: { _id, localIp, skipcheck_: true },
                        query: { _id }
                    } );
                    const adminsP = runDb( {
                        user,
                        model: 'employee',
                        query: {
                            'memberOf.group': 'ADMIN',
                            status: 'ACTIVE',
                            $or: [ { isSupport: { $exists: false } }, { isSupport: false } ]
                        }
                    } );
                    return Promise.all( [ adminsP, upsertP ] );
                } )
                .then( ( [ admins ] ) => {
                    if( !admins || !admins.length ) {
                        return callback();
                    }

                    let
                        mails = admins
                            .filter( a => a.communications.length && a.communications.filter( c => c && c.value ).length )
                            .map( a => {
                                const job = a.communications.find( c => 'EMAILJOB' === c.type );
                                const priv = a.communications.find( c => 'EMAILPRIV' === c.type );
                                return job && job.value || priv && priv.value;
                            } )
                            .filter( Boolean ),
                        mailMap = [];

                    if( !mails || !mails.length ) {
                        return callback();
                    }
                    mails.forEach( mail => {
                        if( mailMap.includes( mail ) ) {
                            return;
                        }
                        mailMap.push( mail );
                    } );

                    const jadeParams = {
                        title: 'Mögliche Zugriffe auf das System wurden geändert',
                        local: localIp ? `http://${localIp}` : '',
                        local_secure: localIp ? `https://${localIp}` : '',
                        remote: Y.doccirrus.auth.getMyHost( user.tenantId, true )
                    };

                    const mailOptions = Y.doccirrus.email.createHtmlEmailMessage( {
                        subject: jadeParams.title,
                        to: mailMap,
                        serviceName: 'prcService',
                        jadeParams,
                        jadePath: './mojits/DCAuthMojit/views/addressEmail.pug'
                    } );

                    Y.doccirrus.email.sendEmail( { ...mailOptions, user: Y.doccirrus.auth.getSUForLocal() }, callback );

                } )
                .catch( err => {
                    if( err && err instanceof NotChangedIpErr ) {
                        return callback();
                    }
                    if( err && err instanceof IsNAPRCErr ) {
                        return callback();
                    }
                    callback( err );
                } );

            function runDb( args ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.runDb( args, ( err, res ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( res );
                    } );
                } );
            }

        };

        /**
         * @method getUserByReq
         * @param {Object} req
         * @return {Object} user object created by tenantId from host
         */
        DCAuth.prototype.getUserByReq = function( req ) {
            let
                user = Y.doccirrus.auth.getSUForTenant( dcauth.sanitizeTenantId( dcauth.getTenantFromHost( req.headers.host ) ) );
            if( user && '' === user.tenantId ) {
                user.tenantId = '0';
            }
            return user;
        };

        DCAuth.prototype.isMocha = function() {
            return -1 !== process.argv.indexOf( '--mocha' );
        };

        DCAuth.prototype.isAllowedLDAPLogin = function() {
            return fs.existsSync( process.cwd() + '/ldap.json' );
        };

        authLayer = new DCAuth();
        authLayer.superuserDisplayName = i18n( 'dcauth.superuserDisplayName' );

        Y.namespace( 'doccirrus' ).auth = authLayer;

    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-config-addon',
            'dcauthpub',
            'dcfileutils',
            'activity-schema',
            'identity-schema',
            'company-schema',
            'cache-utils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'admin-schema',
            // 'appreg-api',
            // 'cli-api',
            // 'dccommonerrors',
            // 'dcemail',
            // 'dcerror',
            // 'dcfilters',
            // 'dchttps',
            // 'dclicmgr',
            // 'dcutils',
            // 'masterTab-api',
            // 'metaprac-api',
            // 'settings-schema'
        ]
    }
);
