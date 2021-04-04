/**
 * Date: 12.08.2013
 * (c) 2013, Doc Cirrus GmbH, Berlin
 */

/**
 *
 * Licence information manager -- this info is needed on each server instance in the cluster.
 *
 */

/*jshint esnext:true */
/* global YUI */


YUI.add( 'dclicmgr',
    function( Y, NAME ) {

        let mochaHasLicReturnValue = false;

        const UPDATE_LICENSE_DATA = "UPDATE_LICENSE_DATA",
            GET_LICENSE_DATA = "GET_LICENSE_DATA",
            GET_COMPANIES_DATA = "GET_COMPANIES_DATA",
            UPDATE_COMPANIES_DATA = "UPDATE_COMPANIES_DATA",
            EventEmitter = require( 'events' ),
            ONLINE = '1',
            OFFLINE = '0',
            { formatPromiseResult, handleResult } = require('dc-core').utils;

        class SystemEventsEmitter extends EventEmitter {
        }

        var companies,
            licensedServices = {},
            practiceDataHashMap = new Map(),
            systemType,
            FakeEmitter = function() { // jshint ignore:line
                var listeners = {};

                function getApplicableTenants( sourceLicenses, targetLicenses, category, element ) {
                    var tenants = [];
                    Object.keys( targetLicenses ).forEach( tenant => {
                        if( targetLicenses[ tenant ] && Array.isArray( targetLicenses[ tenant ][ category ] ) ) {
                            if( (!sourceLicenses[ tenant ] || !sourceLicenses[ tenant ][ category ] || -1 === sourceLicenses[ tenant ][ category ].indexOf( element )) && -1 !== targetLicenses[ tenant ][ category ].indexOf( element ) ) {
                                tenants.push( tenant );
                            }
                        } else {
                            if( (!sourceLicenses[ tenant ] || !sourceLicenses[ tenant ][ category ] || sourceLicenses[ tenant ][ category ] !== element) && targetLicenses[ tenant ][ category ] === element ) {
                                tenants.push( tenant );
                            }
                        }
                    } );
                    return tenants;
                }

                function getLicensesChanges( params ) {
                    const
                        { licensesA = {}, licensesB = {}, licenseName } = params,
                        changes = {};
                    Object.keys( licensesA ).forEach( tenant => {
                        const
                            licenseSetA = licensesA[ tenant ] && licensesA[ tenant ][ licenseName ],
                            licenseSetB = licensesB[ tenant ] && licensesB[ tenant ][ licenseName ],
                            _changes = [];
                        changes[ tenant ] = _changes;
                        if( Array.isArray( licenseSetA ) ) {
                            _changes.push( ...licenseSetA.filter( item => !(licenseSetB || []).includes( item ) ) );
                        } else if( licenseSetA !== licenseSetB ) {
                            _changes.push( licenseSetA );
                        }
                    } );
                    return changes;
                }


                /**
                 * @method on
                 * @param {String} eventName name of the event in the form of specialModules.care.switchOn or specialModules.care.switchOff
                 * @param {Object} callback
                 */
                this.on = function( eventName, callback ) {
                    if( 3 !== eventName.split( "." ).length && 2 !== eventName.split( "." ).length ) {
                        throw new Error( "invalid licmanager listener description" );
                    }
                    if( listeners[ eventName ] ) {
                        listeners[ eventName ].push( callback );
                    } else {
                        listeners[ eventName ] = [ callback ];
                    }
                };

                this.check = function( oldLicenses, newLicenses ) {
                    Object.keys( listeners ).forEach( event => {
                        const eventElements = event.split( "." );
                        if( 3 === eventElements.length ){
                            let sourceLicenses,
                                targetLicenses,
                                applicableTenants;
                            if( "switchOn" === eventElements[ 2 ] ) {
                                sourceLicenses = oldLicenses;
                                targetLicenses = newLicenses;
                            } else {
                                sourceLicenses = newLicenses;
                                targetLicenses = oldLicenses;
                            }
                            applicableTenants = getApplicableTenants( sourceLicenses, targetLicenses, eventElements[ 0 ], eventElements[ 1 ] );
                            if( 0 < applicableTenants.length ) {
                                listeners[ event ].forEach( callback => callback( applicableTenants ) );
                            }
                        }
                        if( 2 === eventElements.length && 'changes' === eventElements[ 1 ] ){
                            const
                                changes = {
                                    added: [],
                                    removed: [],
                                    isInitial: 0 === Object.keys( oldLicenses ).length
                                };
                            let licenseName = eventElements[0];

                            changes.added = getLicensesChanges( {
                                licensesA: newLicenses,
                                licensesB: oldLicenses,
                                licenseName
                            } );
                            changes.removed = getLicensesChanges( {
                                licensesA: oldLicenses,
                                licensesB: newLicenses,
                                licenseName
                            } );
                            listeners[ event ].forEach( callback => callback( changes ) );
                        }
                    } );
                };
            }, //fake but more efficient event emitter handling
            events = new FakeEmitter(),
            systemEvents = new SystemEventsEmitter(),
            licenseProcessed = {};


        /**
         * collects customer and app metadata and sends them to DCPRC
         * @param {String} dcCustomerNo
         * @param {String} version  inSuite version
         * @param {Function} callback
         * @returns {void}
         */
        async function toDCPRC( dcCustomerNo, version, callback ) {
            let
                url = Y.doccirrus.auth.getDCPRCUrl( '/1/company/:getActiveTenants' ),
                params = {
                    version: version,
                    populateCompany: true,
                    dcCustomerNo
                },
                appsMetaData,
                err;

            // ------------------------------------------------- Set the systemId to the params if available ----------------------------------------------
            [err, params.systemId] = await formatPromiseResult( Y.doccirrus.api.cli.getPRCHost() );

            if( err ) {
                if( err.code === "userMgmtMojit_01" ) {
                    Y.log( `toDCPRC: dc-cli is not present so systemId will not be sent to DCPRC`, "info", NAME );
                } else {
                    Y.log( `toDCPRC: Error while querying systemId from cli.getPRCHost. Error: ${err.stack || err}. Stringified error: ${err}`, "warn", NAME );
                }
            }
            // ------------------------------------------------------------ END ---------------------------------------------------------------------------

            // ------------------------------------------------- Set the Sol metaData --------------------------------

            // If the system supports sols, get metaData for them
            if( Y.doccirrus.api.appreg.isSolsSupported() ) {

                [err, appsMetaData] = await formatPromiseResult( _getAppsMetaData() );

                if( err ) {
                    Y.log( `toDCPRC: Error while getting metaData for apps: ${err.stack || err}`, 'warn', NAME );
                }

                if( appsMetaData ) {
                    params.appsMetaData = appsMetaData;
                }
            }

            // ------------------------------------------------- END -------------------------------------------------

            // ------------------------------------------------- Send data to DCPRC ----------------------------------------------
            Y.log( `loadCustomerData.toDCPRC. Sending request to DCPRC to fetch license and practice data. params: ${JSON.stringify( params )}`, 'debug', NAME );
            Y.doccirrus.https.externalPost( url, params, Object.assign( {errDataCallback: true}, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, data ) {
                if( error ) {
                    Y.log( `loadCustomerData: Cannot get companies data: ${JSON.stringify( error )}`, 'warn', NAME );
                    return callback( error );
                }
                if( !data || 0 === data.length ) {
                    Y.log( 'loadCustomerData: Companies data is empty', 'warn', NAME );
                    return callback( null, data || [] );
                }
                return callback( null, data );
            } );
        }

        /**
         * @private
         * Function to get metaData values for activated sols.
         * Currently gets appName, version, latestReleaseDate, vendor
         *
         * @returns {Array} List of metaData for activated sols
         */
        async function _getAppsMetaData() {

            let appsMetaData = [],
                activeSols,
                solsListData,
                appreg,
                err;

            [err, activeSols] = await formatPromiseResult(
                Y.doccirrus.api.appreg.get( {
                    query: {},
                    options: {
                        fields: {appName: 1}
                    }
                } )
            );

            if( err ) {
                Y.log( `_getAppsMetaData: Error while querying appregs from appreg.get. Error: ${err.stack || err}. `, 'error', NAME );
                throw err;
            }

            // If there are no sols licensed on the system, return empty list
            if( !activeSols || !activeSols.length ) {
                return [];
            }

            if( !Y.doccirrus.auth.isDevServer() ) {
                [err, solsListData] = await formatPromiseResult(
                    Y.doccirrus.api.appreg.getSolsListData( {} )
                );

                if( err ) {
                    Y.log( `_getAppsMetaData: Error while getting Sols list: ${err.stack || err}`, 'warn', NAME );
                    throw err;
                }
            }

            // Collect meta information for each activated app
            for( appreg of activeSols ) {
                let
                    {appName} = appreg,
                    solPath,
                    solData,
                    solManifestData;

                if( solsListData && solsListData.length ) {
                    solData = solsListData.find( ( solData ) => solData.name === appName );
                }

                // Only get sol.manifest when app is installed
                if( solData ) {

                    solPath = Y.doccirrus.api.appreg._getSolPath( appName );

                    [err, solManifestData] = await formatPromiseResult(
                        Y.doccirrus.api.appreg.getDataFromSolManifest( {
                            solPath,
                            findRegEx: /SOLVENDOR=.*/gi
                        } )
                    );

                    if( err ) {
                        //No critical error, can procede without sol.manifest data
                        Y.log( `_getAppsMetaData: Error while getting data from sol.manifest for ${appName}: ${err.stack || err}`, 'warn', NAME );
                    }
                }

                appsMetaData.push( {
                    appName,
                    version: solData && solData.version || '',
                    latestReleaseDate: solData && solData.installDate || '',
                    vendor: solManifestData && solManifestData.SOLVENDOR || ''
                } );
            }

            return appsMetaData;
        }

        /**
         * download the list of all active customers form DCPRC
         * only VPRC/PRC is allowed to make this call
         * @param {String} dcCustomerNo
         * @param {Function} callback
         * @return {void}
         */
        function loadCustomerData( dcCustomerNo, callback ) {
            if( dcCustomerNo ) {
                toDCPRC( dcCustomerNo, Y.config.insuite && Y.config.insuite.version, ( err, result = [] ) => {
                    if( err ) {
                        checkAndSaveConnectionStatus( Y.doccirrus.auth.getSUForLocal(), OFFLINE, ( error ) => {
                            if( error ) {
                                Y.log( `Could not auditLog dcprcconnection with status ${OFFLINE}. Error: ${JSON.stringify( error )}`, 'error', NAME );
                            }
                        } );
                        return callback( err, result );
                    }
                    if( !result || !result.length ) {
                        checkAndSaveConnectionStatus( Y.doccirrus.auth.getSUForLocal(), OFFLINE, ( error ) => {
                            if( error ) {
                                Y.log( `Could not auditLog dcprcconnection with status ${OFFLINE}. Error: ${JSON.stringify( error )}`, 'error', NAME );
                            }
                        } );
                    } else {
                        checkAndSaveConnectionStatus( Y.doccirrus.auth.getSUForLocal(), ONLINE, ( error ) => {
                            if( error ) {
                                Y.log( `Could not auditLog dcprcconnection with status ${ONLINE}. Error: ${JSON.stringify( error )}`, 'error', NAME );
                            }
                        } );
                    }
                    if( Y.doccirrus.auth.isVPRC() ) {
                        return Y.doccirrus.api.company.getActiveTenants( {
                            data: { populateCompany: true },
                            user: Y.doccirrus.auth.getSUForLocal(),
                            callback( err, companies ) {
                                let
                                    mainCompany = result[ 0 ];
                                if( err ) {
                                    return callback( err );
                                }
                                if( mainCompany ) {
                                    let
                                        _ = require( 'lodash' );
                                    companies.forEach( companyData => {
                                        if( !companyData.licenseScope || !companyData.licenseScope[ 0 ] ) {
                                            companyData.licenseScope = companyData.licenseScope || [];
                                            companyData.licenseScope.push( mainCompany.licenseScope[ 0 ] );
                                            return;
                                        }
                                        Object.keys( companyData.licenseScope[ 0 ] ).forEach( licenseScopeKey => {
                                            let
                                                licenseScope = companyData.licenseScope[ 0 ][ licenseScopeKey ];
                                            if( Array.isArray( licenseScope ) ) {
                                                companyData.licenseScope[ 0 ][ licenseScopeKey ] = licenseScope.filter( item => mainCompany.licenseScope[ 0 ][ licenseScopeKey ].includes( item ) );
                                            } else {
                                                let
                                                    levels,
                                                    mainCompanyLevel = (mainCompany.licenseScope[ 0 ] && mainCompany.licenseScope[ 0 ][ licenseScopeKey ] || ''),
                                                    currentCompanyLevel = (companyData.licenseScope[ 0 ] && companyData.licenseScope[ 0 ][ licenseScopeKey ] || ''),
                                                    mainCompanyLevelIndex,
                                                    currentCompanyLevelIndex;
                                                switch( licenseScopeKey ) {
                                                    case 'baseSystemLevel':
                                                        levels = _.values( Y.doccirrus.schemas.settings.baseSystemLevels );
                                                        mainCompanyLevelIndex = levels.indexOf( mainCompanyLevel );
                                                        currentCompanyLevelIndex = levels.indexOf( currentCompanyLevel );
                                                        if( currentCompanyLevelIndex > mainCompanyLevelIndex ) {
                                                            companyData.licenseScope[ 0 ][ licenseScopeKey ] = mainCompany.licenseScope[ 0 ][ licenseScopeKey ];
                                                        }
                                                        break;
                                                    case 'supportLevel':
                                                        levels = _.values( Y.doccirrus.schemas.settings.supportLevels );
                                                        mainCompanyLevelIndex = levels.indexOf( mainCompanyLevel );
                                                        currentCompanyLevelIndex = levels.indexOf( currentCompanyLevel );
                                                        if( currentCompanyLevelIndex > mainCompanyLevelIndex ) {
                                                            companyData.licenseScope[ 0 ][ licenseScopeKey ] = mainCompany.licenseScope[ 0 ][ licenseScopeKey ];
                                                        }
                                                        break;
                                                }
                                            }
                                        } );
                                    } );
                                }
                                result.push( ...companies );
                                callback( err, result );
                            }
                        } );
                    } else {
                        return callback( err, result );
                    }
                } );
            } else {
                return callback( Y.doccirrus.errors.rest( 403 ) );
            }
        }

        function checkAndSaveConnectionStatus( user, status, callback ) {
            var async = require( 'async' ),
                auditData = { status: status, model: 'dcprcconnection' };

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'audit',
                        action: 'get',
                        query: {
                            $and: [
                                {
                                    model: 'dcprcconnection'
                                }
                            ]
                        },
                        options: {
                            sort: {
                                _id: -1
                            },
                            limit: 1,
                            select: {
                                descr: 1
                            }
                        }
                    }, ( err, res ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( res && res[0] ) {
                            return next( null, res[0] );
                        } else {
                            return next( null, null );
                        }
                    } );
                },
                ( auditEntry, next ) => {
                    if( auditEntry ) {
                        //check if it's necessary to create
                        if( status !== auditEntry.descr ) {
                            Y.doccirrus.api.audit.auditConnection( user, auditData, next );
                        } else {
                            return next();
                        }
                    } else {
                        //create
                        Y.doccirrus.api.audit.auditConnection( user, auditData, next );
                    }
                }
            ], ( err ) => {
                if( err ) {
                    return callback( err );
                }
                return callback();
            } );
        }

        function loadLicenseScope( dcprcCompanyData, callback ) {
            let
                loadOrder = [ tryDcprc, tryFile, tryDb ],
                dcprcLicenseData = {};

            if( dcprcCompanyData ) {
                dcprcCompanyData.forEach( e => {
                    if( "undefined" !== typeof e.tenantId && e.licenseScope && e.licenseScope[ 0 ] ) {
                        dcprcLicenseData[ e.tenantId ] = (e.licenseScope && e.licenseScope[ 0 ]) || {};
                    }
                } );
            }

            function tryDcprc( dcprcCb ) {
                if( dcprcLicenseData && 0 < Object.keys( dcprcLicenseData ).length ) {
                    dcprcCb( null, dcprcLicenseData );
                } else {
                    dcprcCb( "dcprc license data not available" );
                }
            }

            function tryFile( fileCb ) {
                Y.log( "trying to fetch license data from file...", 'info', NAME );
                require( 'fs' ).readFile( "./licenses.json", 'utf8', ( err, data ) => {
                    if( data ) {
                        try {
                            let licenseData = JSON.parse( data );
                            fileCb( null, licenseData );
                        } catch( e ) {
                            fileCb( e );
                        }
                    } else {
                        if( "ENOENT" === err.code ) {
                            fileCb( "licenses.json not found." );
                        } else {
                            fileCb( err, data );
                        }
                    }
                } );
            }

            function tryDb( dbCb ) {
                Y.log( "trying to fetch license data from db...", 'info', NAME );
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'admin',
                    action: 'get',
                    query: { _id: Y.doccirrus.schemas.admin.getLicenseId() }
                }, ( err, res ) => {
                    if( !err && res && res[ 0 ] && res[ 0 ].licenseScope ) {
                        dbCb( err, res[ 0 ].licenseScope );
                    } else {
                        dbCb( err || "db license data not available" );
                    }
                } );
            }

            function tryLoad() {
                var currentTry = loadOrder.shift();
                if( currentTry ) {
                    currentTry( ( err, licenseData ) => {
                        if( err ) {
                            Y.log( "license data source failed:", 'info', NAME );
                            Y.log( err, 'info', NAME );

                            tryLoad();
                        } else {
                            Y.log( require( 'util' ).inspect( licenseData, { depth: 10 } ), 'info', NAME );
                            updateLicenseScope( licenseData, callback );
                        }
                    } );
                } else {
                    Y.log( 'Unable to load licensing information, using default feature set.', 'info', NAME );
                    // updateLicenseScope( null, callback );
                    return callback(`Failed to fetch license scope using DCPRC, File and DB approach`);
                }
            }

            tryLoad();
        }

        function updateLicenseScope( licenseData, callback, doNotSaveToDb ) {
            let isUndefined = null === licenseData,
                saveToDb,
                oldLicenses,
                time = Date.now();
            licenseData = licenseData || {};
            saveToDb = !doNotSaveToDb || 1 === Object.keys( licenseData ).length;
            oldLicenses = licensedServices;

            if( Object.keys( licenseData ).length ) {
                Object.keys( licenseData ).map( e => {
                    licenseData[ e ] = Y.doccirrus.schemas.settings.getCleanLicenseData( licenseData[ e ] );
                } );
            } else {
                licenseData = { 0: Y.doccirrus.schemas.settings.getCleanLicenseData() };
            }

            if( Y.doccirrus.auth.isPRC() ) {
                licenseData[ 0 ] = licenseData[ Object.keys( licenseData )[ 0 ] ];
            }

            if( !isUndefined || 0 === Object.keys( licensedServices ).length ) {
                licensedServices = licenseData;
            }

            if( Y.doccirrus.ipc.isMaster() ) {
                Y.doccirrus.ipc.send( UPDATE_LICENSE_DATA, licensedServices, true );
            }

            events.check( oldLicenses, licensedServices );
            Y.log( `done checking licenses, took ${  Date.now() - time  }ms for ${  Object.keys( licenseData ).length  } tenants`, 'info', NAME );

            if( saveToDb && !isUndefined ) {
                let
                    licenseScope = Object.assign( {}, licensedServices );
                if( Y.doccirrus.auth.isPUC() ) {
                    delete licenseScope[ 0 ];
                }
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'admin',
                    noAudit: true,
                    action: 'upsert',
                    query: { _id: Y.doccirrus.schemas.admin.getLicenseId() },
                    fields: "licenseScope",
                    data: {
                        _id: Y.doccirrus.schemas.admin.getLicenseId(),
                        licenseScope: licenseScope,
                        skipcheck_: true
                    }
                }, ( err, res ) => {
                    callback( err, res );
                } );
            } else {
                return callback( null, true );
            }

        }

        /**
         * Helper.
         * Sends company data to all workers.
         */
        function sendCompaniesToWorkers() {
            if( Y.doccirrus.ipc.isMaster() ) {
                setSystemType( companies );
                Y.doccirrus.ipc.send( UPDATE_COMPANIES_DATA, companies, true );

            }
        }

        function checkSystemTypeChanges( data ){
            const
                serverTypeChanged = Y.doccirrus.auth.getServerType() !== data.serverType,
                systemTypeChanged = Y.doccirrus.auth.getSystemType() !== data.systemType;
            if( serverTypeChanged || systemTypeChanged ){
                Y.log( `SystemType (${systemTypeChanged}) or ServerType (${serverTypeChanged}) was changed. System will be restarted in 50 sec.`, 'warn', NAME );
                setTimeout( function() {
                    process.exit();
                }, 50000 );
            }
        }

        function updatePracticeData( callback ) {
            let
                async = require( 'async' ),
                timeout = 1000;

            function getPracticeData( company ) {
                let
                    fields = [
                        'licenseScope',
                        'addresses',
                        'communications',
                        'coname',
                        'cotype',
                        'customerNo',
                        'dcCustomerNo',
                        'prodServices',
                        'centralContact',
                        'supportContact',
                        'systemType',
                        'tenantId',
                        'serverType',
                        'activeState',
                        'vprcFQHostName',
                        'countryMode'
                    ],
                    practice = {};
                fields.forEach( field => {
                    practice[ field ] = company[ field ];
                } );
                return practice;
            }

            function updatePractice( params, callback ) {
                let
                    { user, practiceData } = params,
                    commonerrors = Y.doccirrus.commonerrors,
                    model = 'practice',
                    async = require( 'async' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model,
                            action: 'get',
                            options: {
                                lean: true,
                                limit: 1
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, results[ 0 ] );
                        } );
                    },
                    function( practice, next ) {
                        if( !practice ) {
                            Y.log( 'updatePracticeData. Practice collection is empty', 'error', NAME );
                            return setImmediate( next, new commonerrors.DCError( 500, { message: 'Practice collection is empty' } ) );
                        }
                        if( user && Y.doccirrus.auth.getLocalTenantId() === user.tenantId && params.practiceData.activeState !== practice.activeState ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: "company",
                                action: 'get',
                                query: { customerNo: params.practiceData.customerNo },
                                options: {
                                    lean: true,
                                    limit: 1
                                }
                            }, ( err, company ) => {
                                if( err ) {
                                    return setImmediate( next, new commonerrors.DCError( 500, { message: 'Company collection is empty' } ) );
                                }
                                if( params.practiceData.activeState ) {
                                    if( company && company[ 0 ] && company[ 0 ]._id ) {
                                        systemEvents.emit( 'system.activated', {
                                            user: user, callback: callback, data: {
                                                _id: company[ 0 ]._id,
                                                templateTenantId: Y.doccirrus.auth.getLocalTenantId()
                                            }
                                        } );
                                    }
                                    else {
                                        Y.log( "No companies found.", "error", NAME );
                                    }
                                }
                                else {
                                    systemEvents.emit( 'system.deactivated', {
                                        user: user, callback: callback, data: {
                                            _id: company && company[ 0 ]._id,
                                            templateTenantId: Y.doccirrus.auth.getLocalTenantId()
                                        }
                                    } );
                                }
                            } );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model,
                            action: 'put',
                            query: {
                                _id: practice._id.toString()
                            },
                            fields: Object.keys( practiceData ),
                            data: Y.doccirrus.filters.cleanDbObject( practiceData )
                        }, next );
                    }
                ], callback );
            }

            async.series( [
                function( done ) {
                    async.eachSeries( companies || [], function( company, next ) {
                        let
                            practiceData = getPracticeData( company ),
                            tenantId = company.tenantId,
                            hash = Y.doccirrus.comctl.fastHash( practiceData );
                        if( !tenantId && 0 !== tenantId ) {
                            Y.log( `updatePracticeData. Can not update practice data, because tenantId is not set.`, 'debug', NAME );
                            return setImmediate( next );
                        }
                        if( practiceDataHashMap.get( tenantId ) === hash ) {
                            Y.log( `updatePracticeData. Do not need to update practice data of tenant: ${tenantId}. Practice data has not been changed.`, 'debug', NAME );
                            return setImmediate( next );
                        } else {
                            Y.log( `updatePracticeData. Updating practice data of tenant: ${tenantId}.`, 'debug', NAME );
                            updatePractice( {
                                user: Y.doccirrus.auth.getSUForTenant( tenantId ),
                                practiceData
                            }, function( err ) {

                                setTimeout( () => {
                                    if( err ) {
                                        Y.log( `updatePracticeData. Could not update practice data of tenant: ${tenantId}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                    } else {
                                        Y.log( `updatePracticeData. Practice data has been updated. tenant: ${tenantId}.`, 'debug', NAME );
                                        practiceDataHashMap.set( tenantId, hash );
                                    }
                                    /**
                                     * let update other tenants
                                     */
                                    next();
                                }, timeout );
                            } );

                        }
                    }, function( err ) {
                        if( err ) {
                            Y.log( `updatePracticeData finished with error: ${JSON.stringify( err )}`, 'error', NAME );
                        } else {
                            Y.log( `updatePracticeData finished without critical errors`, 'debug', NAME );
                        }
                        done( err );

                    } );
                },
                function( next ) {
                    if( companies && companies[ 0 ] && (Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isPRC()) && !Y.doccirrus.auth.wasArgsFlagUsed() ) {
                        checkSystemTypeChanges( getPracticeData( companies[ 0 ] ) );
                    }
                    setImmediate( next );

                }
            ], ( err ) => {
                if( 'function' === typeof callback ) {
                    return callback( err );
                }
            } );
        }

        function onCompanyDataLoaded() {
            sendCompaniesToWorkers();
            if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() ) {
                updatePracticeData();
            }

        }

        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( GET_LICENSE_DATA, NAME, true, function( args, callback ) {
                callback( null, licensedServices );
            } );
            Y.doccirrus.ipc.subscribeNamed( GET_COMPANIES_DATA, NAME, true, function( data, callback ) {
                callback( null, companies );
            } );
        } else {
            /**
             * When worker is initialized and connected to IPC, request company/license information from master
             * This event is raised by IPC itself when outgoing connection is made
             */
            Y.doccirrus.ipc.subscribeNamed( Y.doccirrus.ipc.events.WORKER_INITIALIZED, NAME, true, function() {
                Y.doccirrus.ipc.sendAsync( GET_COMPANIES_DATA, {}, ( err, _companies ) => {
                    if( err ) {
                        Y.log( `GET_COMPANIES_DATA. Worker can not get license data. err: ${JSON.stringify( err )}`, 'error', NAME );
                    }
                    companies = _companies;
                } );
            } );

            Y.doccirrus.ipc.subscribeNamed( UPDATE_LICENSE_DATA, NAME, true, function( licenseData ) {
                licensedServices = licenseData;
            } );
            Y.doccirrus.ipc.subscribeNamed( UPDATE_COMPANIES_DATA, NAME, true, function( _companies ) {
                setSystemType( _companies );
                companies = _companies;
            } );
        }

        function setSystemType( _companies ) {
            if( Array.isArray( _companies ) ) {
                let
                    mainCompany = _companies.find( item => item.tenantId === Y.doccirrus.auth.getLocalTenantId() ) || {};
                systemType = mainCompany.systemType;
            }
        }

        function loadLicenseForPUC( callback ) {
            let
                url = Y.doccirrus.auth.getVPRCUrl( '/1/company/:getLicences' ),
                params = {
                    populateCompany: true
                };

            Y.doccirrus.https.externalPost( url, params, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ), function( error, data ) {
                if( error ) {
                    Y.log( `Cannot get companies data: ${JSON.stringify( error )}`, 'warn', NAME );
                    return updateLicenseScope( null, err => callback( err || error ) );
                }
                if( !data || 0 === Object.keys( data ).length ) {
                    Y.log( 'Companies data is empty', 'warn', NAME );
                    // is license is not set - use default behavior
                    return updateLicenseScope( null, callback ); // eslint-disable-line callback-return
                }
                // if license is set update via updateLicenseScope
                Y.log( "successfully got license data.", 'info', NAME );
                updateLicenseScope( data, callback );
            } );
        }

        /**
         * set the list of customers/companies that belong to this server
         * @param {Function} callback
         * @returns {Function}
         */
        function refresh( callback ) {
            const
                async = require( 'async' );
            callback = callback || function( err ) {
                if( err ) {
                    Y.log( `Refresh Error ${JSON.stringify( err )}`, 'warn', NAME );
                }
            };

            function loadCustomerDataCb( err, result ) {
                if( err || !result ) {
                    Y.log( `Licence Manager Refresh Error: ${  err}`, 'warn', NAME );
                } else {
                    companies = result;
                    onCompanyDataLoaded();
                }

                if( Y.doccirrus.ipc.isMaster() && !Y.doccirrus.auth.isDCPRC() ) {
                    loadLicenseScope( result, licenseErr => {
                        return callback( err || licenseErr );
                    } );
                } else {
                    Y.doccirrus.ipc.sendAsync( GET_LICENSE_DATA, {}, ( err, res ) => {
                        if( !err ) {
                            licensedServices = res;
                        }
                    } );
                    return callback( err );

                }
            }

            if( Y.doccirrus.auth.isPUC() ) {
                return loadLicenseForPUC( callback );
            }

            /**
             * If DCPRC is not available the Sol-related operations will not run
             */
            return async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.practice.getMyPractice( Y.doccirrus.auth.getSUForLocal(), function( err, myPrac ) {
                        if( err ) {
                            return loadCustomerDataCb( err );
                        }
                        loadCustomerData( myPrac.dcCustomerNo || myPrac.customerNo, next );
                    } );
                },
                function( data, next ) {
                    if( !Y.doccirrus.api.appreg.isSolsSupported() ) {
                        return next( null, data );
                    }
                    updateAppTokens( {companyData: data && data[0]}, ( err ) => {
                        if( err ) {
                            Y.log( `Could not update dc app tokens from dcprc. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        }
                        next( null, data ); // error is ignored
                    } );
                },
                function( data, next ) {
                    if( !Y.doccirrus.api.appreg.isSolsSupported() ) {
                        return next( null, data );
                    }

                    Y.doccirrus.api.appreg.checkForNewAppVersionsInStore({
                        callback: function (error) {
                            if( error ) {
                                Y.log( `Could not update app versions. Error: ${JSON.stringify( error.stack || error )}`, 'warn', NAME );
                            }

                            next( null, data );
                        }
                    });
                }
            ], loadCustomerDataCb );
        }

        /**
         * Handles requesting the DCPRC for the Sol tokens and updates the tokens for the Sols
         * in case of license changes it will add/remove/update the appreg entries
         * @param {Object} params
         * @param {Object} params.companyData
         * @param {Function} callback
         */
        function updateAppTokens( params, callback ) {
            const
                { companyData } = params;
            Y.log( `updateAppTokens. Sending request to DCPRC to get dc tokens.`, 'debug', NAME );

            Y.doccirrus.https.externalApiCall( {
                method: 'POST',
                model: 'apptoken',
                action: 'getAppTokens',
                host: Y.doccirrus.auth.getDCPRCUrl(),
                options: { friend: true, errDataCallback: true }
            }, ( err, result = [] ) => {
                let
                    allowedApps = [];

                if( err ) {
                    return callback( err );
                }
                if( !Y.doccirrus.auth.isPUC() ){
                    const
                        solutions = companyData && companyData.licenseScope && companyData.licenseScope[0] && companyData.licenseScope[0].solutions || [];
                    allowedApps = result.filter( item => solutions.includes( item.appName ));
                } else {
                    allowedApps = result;
                }

                Y.log( `Setting secrets for ${allowedApps.length} apps (Sols)`, 'debug', NAME );
                Y.doccirrus.api.appreg.setSecretsForApps( {appTokens: allowedApps, callback} );
            } );
        }

        /**
         * Handles removing any unlicensed apps that might have been missed out
         * @param {Function} [callback]
         * @returns {Promise<boolean|Object|*>}
         */
        async function removeUnlicensedApps( callback ) {
            Y.log( 'removeUnlicensedApps: removing any unlicensed apps', 'info', NAME );
            const user = Y.doccirrus.auth.getSUForLocal();

            if( Y.doccirrus.auth.isDevServer() ) {
                Y.log( `removeUnlicensedApps only works on not dev systems.`, 'debug', NAME );
                return handleResult( undefined, undefined, callback );
            }

            const [error] = await formatPromiseResult(
                Y.doccirrus.api.appreg.removeUnlicensedApps( {user} )
            );

            if( error ) {
                Y.log( `removeUnlicensedApps: error while removing apps: ${error.stack || error}`, 'warn', NAME );
            }

            return true;
        }

        /**
         * Handles installing the new apps
         * @param {Array} newSolutionsLicenses
         * @returns {Promise<number|{total: *, successCount: *}>}
         */
        async function installNewApps( newSolutionsLicenses ) {
            Y.log( `new solutions licenses: ${newSolutionsLicenses.join( ', ' )}`, 'info', NAME );

            const user = Y.doccirrus.auth.getSUForLocal();
            let error, successCount = 0;

            if( !newSolutionsLicenses.length ) {
                Y.log( 'installNewApps: newSolutionsLicenses is empty', 'warn', NAME );
                return successCount;
            }

            for( const appName of newSolutionsLicenses ) {
                await Y.doccirrus.api.audit.postBasicEntry( user, 'install', 'sol', `LICMGR: ${appName}` );

                [error] = await formatPromiseResult(
                    Y.doccirrus.api.appreg.installApp( {appName} )
                );

                if( error ) {
                    Y.log( `could not install ${appName}: ${error.stack || error}`, 'error', NAME );
                    continue;
                }

                successCount++;
            }

            return {successCount, total: newSolutionsLicenses.length};
        }

        /**
         * Handles uninstalling apps
         * @param {Array} removedSolutionsLicense
         * @returns {Promise<number|{total: *, successCount: *}>}
         */
        async function uninstallApps( removedSolutionsLicense ) {
            Y.log( `removing solutions licenses: ${removedSolutionsLicense.join( ', ' )}`, 'info', NAME );

            const user = Y.doccirrus.auth.getSUForLocal();
            let error, successCount = 0;

            if( !removedSolutionsLicense.length ) {
                Y.log( 'uninstallApps: newSolutionsLicenses is empty', 'warn', NAME );
                return successCount;
            }

            for( const appName of removedSolutionsLicense ) {
                await Y.doccirrus.api.audit.postBasicEntry( user, 'remove', 'sol', `LICMGR: ${appName}` );

                [error] = await formatPromiseResult(
                    Y.doccirrus.api.appreg.unInstallApp( {appName} )
                );

                if( error ) {
                    Y.log( `could not remove ${appName}: ${error.stack || error}`, 'error', NAME );
                    continue;
                }

                successCount++;
            }

            return {successCount, total: removedSolutionsLicense.length};
        }

        function LicenseManager() {
            if( !this.ignoresLicensing() ) {
                Y.doccirrus.kronnd.on( 'RefreshLicenseInfo', function onRefreshLicInfo() {
                    refresh( () => {
                    } );
                } );
            }
        }

        LicenseManager.prototype.events = events;

        LicenseManager.prototype.systemEvents = systemEvents;

        /**
         * on VPRC
         * @returns {Array}
         */
        LicenseManager.prototype.getActiveCustomers = function getActiveCustomers() {
            if( companies ) {
                return companies;
            } else {
                return [];
            }
        };
        /**
         * on VPRC
         * @param {Function} callback
         * @returns {Array}
         */
        LicenseManager.prototype.getActiveTrialCustomers = function getActiveCustomers( callback ) {
            if( Y.doccirrus.auth.isVPRC() ) {
                //'prodServices.config.key':'TrialVersion'
                let activeTrialCustomers = companies.filter( element => {
                    let isTrial = false;
                    element.prodServices.forEach( prodService => {
                        prodService.config.forEach( prodServConf => {
                            if( "TrialVersion" === prodServConf.key ) {
                                isTrial = true;
                            }
                        } );
                    } );
                    if( !isTrial ) {
                        if( element.licenseScope && Array.isArray( element.licenseScope ) ) {
                            // the customer counts as a trial if even only one trial license in the scope.
                            return element.licenseScope.some( item => {
                                return Boolean( item.trialBegin );
                            } );
                        }
                    }
                    return isTrial;
                } );
                if( callback ) {
                    return callback( null, activeTrialCustomers );
                }
                return activeTrialCustomers;
            } else {
                if( callback ) {
                    return callback( new Error( "not VPRC" ) );
                }
                return [];
            }
        };
        /**
         * on VPRC/PRC
         * @param {String} tenant
         * @returns {Object}
         */
        LicenseManager.prototype.getLicenseData = function getLicenseData( tenant ) {
            return licensedServices[ tenant ] || Y.doccirrus.schemas.settings.getCleanLicenseData();
        };

        /**
         * on VPRC/PRC
         * @returns {Object}
         */
        LicenseManager.prototype.getFullLicenseData = function getLicenseData() {
            return licensedServices;
        };

        LicenseManager.prototype.ignoresLicensing = function ignoresLicensing() {
            var YAuth = Y.doccirrus.auth;
            return YAuth.isDCPRC() || YAuth.isMocha();
        };

        LicenseManager.prototype.setMochaReturnValue = function getMochaReturnValue(value) {
            mochaHasLicReturnValue = value;
        };

        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {Array} licenseSet
         * @param {string} licenseName
         * @param {object} licenseData
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasLicense = function hasLicense( tenant, licenseSet, licenseName, licenseData ) {
            if( LicenseManager.prototype.ignoresLicensing() ) {
                return Y.doccirrus.auth.isMocha() ? mochaHasLicReturnValue : true;
            }

            let _licenseData = licenseData || this.getLicenseData( tenant );
            let licenseSetVal = _licenseData[ licenseSet ];
            if( typeof licenseSetVal === 'string' ) {
                return licenseName === licenseSetVal;
            } else if( Array.isArray( licenseSetVal ) ) {
                return -1 < licenseSetVal.indexOf( licenseName );
            } else {
                return false;
            }
        };

        /**
         * on PRCS
         * @param {string} solName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasSolLicense = async function hasSolLicense( solName ) {
            return Y.doccirrus.api.appreg.isSolLicensed( solName );
        };

        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasSpecialModule = function hasSpecialModule( tenant, licenseName ) {
            return this.hasLicense( tenant, "specialModules", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasBaseSystemLevel = function hasBaseSystemLevel( tenant, licenseName ) {
            return this.hasLicense( tenant, "baseSystemLevel", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @returns {String}
         */
        LicenseManager.prototype.getBaseSystemLevel = function getBaseSystemLevel( tenant ) {
            return this.getLicenseData( tenant ).baseSystemLevel;
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @returns {String}
         */
        LicenseManager.prototype.getDoctorsAmount = function getDoctorsAmount( tenant ) {
            return this.getLicenseData( tenant ).doctorsAmount;
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @returns {String}
         */
        LicenseManager.prototype.getSpecialModules = function getSpecialModules( tenant ) {
            return this.getLicenseData( tenant ).specialModules;
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasBaseServices = function hasBaseServices( tenant, licenseName ) {
            return this.hasLicense( tenant, "baseServices", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasAdditionalService = function hasAdditionalService( tenant, licenseName ) {
            return this.hasLicense( tenant, "additionalServices", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasTelematikServices= function hasTelematikServices( tenant, licenseName ) {
            return this.hasLicense( tenant, "telematikServices", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @param {string} licenseName
         * @returns {Boolean}
         */
        LicenseManager.prototype.hasSupportLevel = function hasSupportLevel( tenant, licenseName ) {
            return this.hasLicense( tenant, "supportLevel", licenseName );
        };
        /**
         * on VPRC/PRCS
         * @param {string} tenant
         * @returns {String}
         */
        LicenseManager.prototype.getSupportLevel = function getSupportLevel( tenant ) {
            return this.getLicenseData( tenant ).supportLevel;
        };

        /**
         * on VPRC/PRCS
         * @param {object} user
         * @param {string} newEmpType
         * @param {string} oldEmpType
         * @param {function} callback
         * @returns {Boolean}
         */
        LicenseManager.prototype.employeeLicensingCheck = function employeeLicensingCheck( user, newEmpType, oldEmpType, callback ) {
            if( LicenseManager.prototype.ignoresLicensing() ) {
                callback( null, true );
                return true;
            }

            var typeIsDoc = "PHYSICIAN" === newEmpType,
                typeHasChanged = newEmpType === oldEmpType,
                basequery = typeIsDoc ? { type: "PHYSICIAN" } : { type: { $not: { $eq: "PHYSICIAN" } } },
                curConfig = this.getDoctorsAmount( user.tenantId ),
                query = {
                    username: { $ne: Y.doccirrus.schemas.identity.getSupportIdentityObj().username },
                    type: basequery.type,
                    status: "ACTIVE"
                };

            //apply limit checking for PHYSICIAN employee type only
            if( !typeIsDoc ) {
                callback( null, true );
                return true;
            }

            if( '0' === curConfig ) { //means UNLIMITED
                callback( null, true );
                return true;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user || Y.doccirrus.auth.getSUForLocal(),
                model: 'employee',
                action: 'count',
                query: query,
                callback: function( err, res ) {
                    var limit = curConfig;
                    if( err ) {
                        return callback( err );
                    } else if( limit && typeHasChanged ? res > limit : res >= limit ) {
                        Y.log( `user could not be saved: ${  typeIsDoc ? "doc" : "MFA/other"  } user limit has already been reached.`, 'warn', NAME );
                        return callback( Y.doccirrus.errors.rest( typeIsDoc ? 15001 : 15002 ) );
                    } else {
                        return callback( null, true );
                    }
                }
            } );
        };

        /**
         * on VPRC/PRCS
         * @param {object} user
         * @param {function} callback
         * @returns {Boolean}
         */
        LicenseManager.prototype.locationLicensingCheck = function locationLicensingCheck( user, callback ) {
            callback( null, true );
            return true;
        };

        /**
         * on VPRC
         * provides companies list when it is loaded
         * @param {function} callback
         * @returns {void}
         */
        LicenseManager.prototype.getActiveCustomersEnsure = function getActiveCustomersEnsure( callback ) {
            if( Y.doccirrus.auth.isVPRC() ) {
                if( companies && companies.length ) {
                    return callback( null, companies );
                } else {
                    refresh( ( err ) => {
                        callback( err, companies );
                    } );
                }
            } else {
                return callback( null, [] );
            }
        };

        /**
         * get customer-ship status of this PRC/tenant
         * @returns {Object}
         */
        LicenseManager.prototype.getMyStatus = function getMyStatus() {
            var
                status = { active: false };
            if( companies && companies[ 0 ] ) {
                status.active = companies[ 0 ].activeState;
            }
            return status;
        };

        LicenseManager.prototype.forceRefresh = function forceRefresh( callback ) {
            if( LicenseManager.prototype.ignoresLicensing() ) {
                if( callback ) {
                    return callback( null, true );
                }
            } else {
                refresh( callback );
            }
        };

        LicenseManager.prototype.initRefresh = function forceRefresh( user, callback ) {
            if( LicenseManager.prototype.ignoresLicensing() ) {
                if( callback ) {
                    return callback( null, true );
                }
            } else {
                refresh( callback );
            }
        };

        LicenseManager.prototype.getSystemType = function() {
            return systemType;
        };

        LicenseManager.prototype.loadLicensesFromDb = function loadLicensesFromDb( callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                migrate: true,
                noAudit: true,
                action: 'get',
                query: { _id: Y.doccirrus.schemas.admin.getLicenseId() }
            }, ( err, res ) => {
                if( err ) {
                    return callback( err );
                }
                if( !res || !res[ 0 ] ) {
                    return callback( null, true );
                }
                updateLicenseScope( res[ 0 ].licenseScope, callback, true );
            } );
        };

        LicenseManager.prototype.loadSystemTypeFromDb = function loadLicensesFromDb( callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'practice',
                noAudit: true,
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    lean: true,
                    limit: 1,
                    select: {
                        systemType: 1
                    }
                }
            }, ( err, result ) => {
                if( err ) {
                    return callback( err );
                }
                if( result[ 0 ] ) {
                    systemType = result[ 0 ].systemType;
                }
                callback();
            } );
        };

        function synchronizePRCWithDispatcher( tenants, activeState, systemType ) {
            tenants.forEach( tenantId => {
                if( Y.doccirrus.auth.isVPRC() && '0' === tenantId ) {
                    return;
                }
                let
                    user = Y.doccirrus.auth.getSUForTenant( tenantId );
                Y.log( `Synchronize ${  systemType  } with dispatcher for tenant: ${  tenantId}`, 'debug' );
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'prc', {
                    activeState: activeState,
                    systemType: systemType
                }, () => {} );
            } );
        }

        /**
         * get license statuses for all active tenants
         * @private
         *
         * @param {String} license     - license name
         * @returns {Promise}          - result of OR expression on all license results
         */
        async function getAllLicenseStatues(license){
            let
                err,
                tenants,
                tenant;

            [err, tenants ] = await formatPromiseResult( (() =>{
                if( Y.doccirrus.auth.isVPRC() ) {
                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.company.getActiveTenants( {
                            user: Y.doccirrus.auth.getSUForLocal(),
                            callback: ( err, result ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( ['0', ...(result || []).map( el => el.tenantId )] );
                            }
                        } );
                    } );
                } else {
                    return Promise.resolve( ['0'] );
                }
            })() );
            if( err ) {
                Y.log( `getAllLicenseStatues: error on getting active tenants ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            let result = false;

            for( tenant of tenants ) {
                if( result ){
                    break;
                }
                result = result || Y.doccirrus.licmgr.hasAdditionalService( tenant, license );
            }
            return result;
        }

        if( Y.doccirrus.ipc.isMaster() ) {

            systemEvents.on( "system.activated", args => {
                Y.log( 'system.activated', 'info', NAME );
                setTimeout( function() {
                    Y.doccirrus.api.company.activateTenant( args );
                }, 2000 );
            } );

            systemEvents.on( "system.deactivated", args => {
                Y.log( 'system.deactivated', 'info', NAME );
                setTimeout( function() {
                    Y.doccirrus.api.company.deactivateTenant( args );
                }, 2000 );
            } );


            events.on( "additionalServices.inPacs.switchOn", () => {
                Y.log( 'additionalServices.inPacs.switchOn', 'info', NAME );
                setTimeout( async function() {
                    const [error, isOrthancStarted] = await formatPromiseResult( Y.doccirrus.api.inpacsconfiguration.enableOrthancService() );
                    if( error ) {
                        return Y.log(`additionalServices.inPacs.switchOn: Error in 'enableOrthancService()': ${error.stack || error}`, "error", NAME);
                    }

                    if(!isOrthancStarted) {
                        return Y.log(`additionalServices.inPacs.switchOn: Failed to start Orthanc server. isOrthancStarted = ${isOrthancStarted}`, "error", NAME);
                    }

                    Y.log(`additionalServices.inPacs.switchOn: Orthanc server started successfully`, "info", NAME);
                }, 2000 );
            } );

            events.on( "additionalServices.inPacs.switchOff", () => {
                Y.log( 'additionalServices.inPacs.switchOff', 'info', NAME );
                setTimeout( function() {
                    Y.doccirrus.api.inpacsconfiguration.disableOrthancService( ( err, res ) => {
                        if( err ) {
                            Y.log( ` Disabling Orthanc service failed. Error: ${err.stack || err}`, "error", NAME );
                        }
                        else if( res ) {
                            Y.log( " Orthanc service stopped. ", "info", NAME );
                        }

                    } );
                }, 2000 );
            } );

            events.on( "additionalServices.inScribe.switchOn", async () => {
                const licenseName = 'inScribe';
                if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isVPRC() ) {
                    return;
                }

                if( !licenseProcessed[licenseName] || licenseProcessed[licenseName] === 'off' ){
                    licenseProcessed[licenseName] = 'on';
                } else {
                    Y.log( `additionalServices.inScribe.switchOn: this service is already switched on`, 'info', NAME );
                    return;
                }
                Y.log( 'additionalServices.inScribe.switchOn', 'info', NAME );
                setTimeout( function() {
                    Y.log( `inScribe license switched on. Enabling MMI service`, "info", NAME );
                    Y.doccirrus.api.mmi.enableMMIService( ( err ) => {
                        if( err ){
                            Y.log( `additionalServices.inScribe.switchOn: error on enabling service ${err.message || err}`, 'error', NAME );
                            //set status off in cache to retry latter on next license change
                            licenseProcessed[licenseName] = 'off';
                        }
                    } );
                }, 2000 );
            } );

            events.on( "additionalServices.inScribe.switchOff", async () => {
                const licenseName = 'inScribe';
                if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isVPRC() ) {
                    return;
                }

                let [err, result] = await formatPromiseResult( getAllLicenseStatues(licenseName ) );
                if( err ){
                   Y.log( `changeAppState: error on getting all states of ${licenseName}: ${err.stack ||err}`, 'error', NAME );
                } else {
                    if(result === true){
                        Y.log( `additionalServices.inScribe.switchOff: on some tenant ${licenseName} is still on, so no need to turn off service`, 'info', NAME );
                        return;
                    }
                }

                if( !licenseProcessed[licenseName] || licenseProcessed[licenseName] === 'on' ){
                    licenseProcessed[licenseName] = 'off';
                }

                Y.log( 'additionalServices.inScribe.switchOff', 'info', NAME );
                setTimeout( function() {
                    Y.log(`inScribe license switched off. Disabling MMI service`, "info", NAME);

                    // No need to handle callback as everything is handled and logged in 'disableMMIService' and
                    // also that there are no results to be passed to anyother callback
                    Y.doccirrus.api.mmi.disableMMIService( ()=>{});
                }, 2000 );
            } );

            events.on( "additionalServices.inBackup.switchOff", () => {
                Y.log( 'additionalServices.inBackup.switchOff', 'info', NAME );
                //TODO: Extend the functionality here
            } );

            events.on( "additionalServices.inBackup.switchOn", () => {
                Y.log( 'additionalServices.inBackup.switchOn', 'info', NAME );
                //TODO: Extend the functionality here
            } );

            const
                DOQUVIDE = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                DQS = Y.doccirrus.schemas.casefolder.additionalTypes.DQS,
                INCARE = Y.doccirrus.schemas.company.systemTypes.INCARE,
                INSPECTOR_LEARNING_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_LEARNING_SYSTEM,
                INSPECTOR_EXPERT_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_EXPERT_SYSTEM,
                INSPECTOR_SELECTIVECARE_SYSTEM = Y.doccirrus.schemas.company.systemTypes.INSPECTOR_SELECTIVECARE_SYSTEM;

            events.on( "additionalServices.inSpectorLearningSystem.switchOff", () => {
                Y.log( 'additionalServices.inSpectorLearningSystem.switchOff', 'info', NAME );

                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => Y.doccirrus.api.partner.removeConfigurationForLicensedPartner( user, INSPECTOR_LEARNING_SYSTEM ) );
                }, 2000 );
            } );

            events.on( "additionalServices.inSpectorLearningSystem.switchOn", () => {
                Y.log( 'additionalServices.inSpectorLearningSystem.switchOn', 'info', NAME );

                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, INSPECTOR_LEARNING_SYSTEM );
                    } );
                }, 2000 );
            } );

            events.on( "additionalServices.inSpectorExpertSystem.switchOff", () => {
                Y.log( 'additionalServices.inSpectorExpertSystem.switchOff', 'info', NAME );

                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => Y.doccirrus.api.partner.removeConfigurationForLicensedPartner( user, INSPECTOR_EXPERT_SYSTEM ) );
                }, 2000 );
            } );

            events.on( "additionalServices.inSpectorExpertSystem.switchOn", () => {
                Y.log( 'additionalServices.inSpectorExpertSystem.switchOn', 'info', NAME );
                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, INSPECTOR_EXPERT_SYSTEM );
                    } );
                }, 2000 );
            } );

            events.on( "additionalServices.inSpectorSelectiveCareSystem.switchOff", () => {
                Y.log( 'additionalServices.inSpectorSelectiveCareSystem.switchOff', 'info', NAME );

                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => Y.doccirrus.api.partner.removeConfigurationForLicensedPartner( user, INSPECTOR_SELECTIVECARE_SYSTEM ) );
                }, 2000 );
            } );

            events.on( "additionalServices.inSpectorSelectiveCareSystem.switchOn", () => {
                Y.log( 'additionalServices.inSpectorSelectiveCareSystem.switchOn', 'info', NAME );
                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, INSPECTOR_SELECTIVECARE_SYSTEM );
                    } );
                }, 2000 );
            } );

            events.on( "specialModules.care.switchOn", tenants => {
                Y.log( 'specialModules.care.switchOn', 'info', NAME );
                setTimeout( () => {
                    Y.doccirrus.api.role.checkAndAddRole( null, Y.doccirrus.schemas.role.ROLES.CARE );
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, INCARE );
                    } );
                }, 2000 );
                Y.doccirrus.communication.onPUCSocketInitialized( () => {
                    // synchronization is possible after system is registered on PUC
                    setTimeout( () => {
                        synchronizePRCWithDispatcher( tenants, true, INCARE );
                    }, 40 * 1000 );
                });
            } );

            events.on( "specialModules.care.switchOff", tenants => {
                Y.log( 'specialModules.care.switchOff', 'info', NAME );
                setTimeout( function() {
                    synchronizePRCWithDispatcher( tenants, false, INCARE );
                }, 2000 );
            } );

            events.on( "specialModules.doquvide.switchOn", tenants => {
                Y.log( 'specialModules.doquvide.switchOn', 'info', NAME );
                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.role.checkAndAddRole( user, Y.doccirrus.schemas.role.ROLES.CARDIO );
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, DOQUVIDE );
                    } );

                }, 2000 );
                Y.doccirrus.communication.onPUCSocketInitialized( () => {
                    // synchronization is possible after system is registered on PUC
                    setTimeout( () => {
                        synchronizePRCWithDispatcher( tenants, true, DOQUVIDE );
                    }, 40 * 1000 );
                });
            } );

            events.on( "specialModules.doquvide.switchOff", tenants => {
                Y.log( 'specialModules.doquvide.switchOff', 'info', NAME );
                setTimeout( function() {
                    synchronizePRCWithDispatcher( tenants, false, DOQUVIDE );
                }, 2000 );
            } );

            events.on( "specialModules.dqs.switchOn", tenants => {
                Y.log( 'specialModules.dqs.switchOn', 'info', NAME );
                setTimeout( () => {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.role.checkAndAddRole( user, Y.doccirrus.schemas.role.ROLES.CARDIO );
                        Y.doccirrus.api.partner.checkAndAddLicensedPartner( user, DQS );
                    } );
                }, 2000 );
                Y.doccirrus.communication.onPUCSocketInitialized( () => {
                    // synchronization is possible after system is registered on PUC
                    setTimeout( () => {
                        synchronizePRCWithDispatcher( tenants, true, DQS );
                    }, 40 * 1000 );
                });
            } );

            events.on( "specialModules.dqs.switchOff", tenants => {
                Y.log( 'specialModules.dqs.switchOff', 'info', NAME );
                setTimeout( function() {
                    synchronizePRCWithDispatcher( tenants, false, DQS );
                }, 2000 );
            } );

            events.on( "specialModules.cardio.switchOn", () => {
                Y.log( 'specialModules.cardio.switchOn', 'info', NAME );
                setTimeout( function() {
                    Y.doccirrus.utils.runOnTenents( user => {
                        Y.doccirrus.api.role.checkAndAddRole( user, Y.doccirrus.schemas.role.ROLES.CARDIO );
                    } );
                }, 2000 );

            } );

            events.on( "additionalServices.inTi.switchOn", ( tenants ) => {
                Y.log( 'additionalService.inTi.switchOn', 'info', NAME );
                setTimeout( function() {
                    tenants.forEach( function( tenantId ) {
                        if( Y.doccirrus.licmgr.hasAdditionalService( tenantId, 'inTi' ) ) {
                            Y.doccirrus.api.timanager.init(
                                Y.doccirrus.auth.getSUForTenant( tenantId ),
                                () => {} );
                        }
                    } );
                }, 2000 );
            } );

            /**
             * These functions should only handle the installation/deinstallation
             * of the Sols, the database modifications are handled in refresh()
             */
            events.on( 'solutions.changes', async ( params ) => {
                if( !Y.doccirrus.api.appreg.isSolsSupported() ) {
                    return;
                }

                const
                    newSolutionsLicenses = params.added['0'] || [],
                    removedSolutionsLicense = params.removed['0'] || [];
                let
                    result;

                if( newSolutionsLicenses.length ) {
                    result = await installNewApps( newSolutionsLicenses );
                    Y.log( `installed ${result.successCount} new apps of ${result.total}`, 'info', NAME );
                }

                if( removedSolutionsLicense.length ) {
                    result = await uninstallApps( removedSolutionsLicense );
                    Y.log( `removed ${result.successCount} apps of ${result.total}`, 'info', NAME );
                }

                await removeUnlicensedApps();
            } );
        }

        Y.namespace( 'doccirrus' ).licmgr = new LicenseManager();

    },
    '0.0.1', { requires: [ 'dckronnd', 'dcauth', 'dchttps', 'practice-api', 'dcipc', 'dc-comctl', 'role-api', 'casefolder-schema', 'appreg-api' ] }
);
