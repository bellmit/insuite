/*global YUI */


YUI.add( 'kbvlog-api', function( Y, NAME ) {

        const
            DCError = Y.doccirrus.commonerrors.DCError,
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
            XPM_DIR = envConfig.directories.xpmKvdt,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            LATEST_LOG_VERSION = Y.doccirrus.schemas.invoicelog.LATEST_LOG_VERSION,
            schemaPathsMap = Y.doccirrus.schemas.invoicelog.schemaPathsMap,
            moment = require( 'moment' );

        var Prom = require( 'bluebird' ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            kbvDirNames = {
                km: 'kbv-km-tmp',
                pm: 'kbv-pm-tmp'
            },
            accessError = Y.doccirrus.errors.rest( 401, '', true ),
            OID = require( 'mongodb' ).ObjectID;

        function _generateGUID( oid ) {
            var
                _oid = (oid ? (('string' === typeof oid) ? OID.createFromHexString( oid ) : oid) : new OID()).toHexString(),
                parts = {
                    time: _oid.substring( 0, 8 ),
                    mach: _oid.substring( 8, 14 ),
                    proc: _oid.substring( 14, 18 ),
                    incr: _oid.substring( 18 )
                };

            return [
                'feefee',
                parts.mach.substring( 0, 2 ),
                '-',
                parts.mach.substring( 2 ),
                '-',
                parts.proc,
                '-70',
                parts.time.substring( 0, 2 ),
                '-',
                parts.time.substring( 2 ),
                parts.incr
            ].join( '' ).toUpperCase();
        }

        function emitEventToAdminsInTenant( tenantId, message, logInfo ) {
            function isAdmin( user ) {
                if( !Array.isArray( user.groups ) ) {
                    return false;
                }
                return user.groups.some( function( group ) {
                    return 'ADMIN' === group.group;
                } );
            }

            function onlineUsersCb( err, users ) {
                if( err ) {
                    Y.log( 'Could not emit event to admins in tenant ' + tenantId + ' error ' + err, 'error', NAME );
                }

                users.forEach( function( user ) {
                    if( tenantId === user.tenantId && isAdmin( user ) ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'invoicelogAction',
                            eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                            msg: {
                                data: {
                                    logInfo: logInfo,
                                    warnings: [],
                                    invoiceType: 'KBV',
                                    action: 'send',
                                    state: 'finished',
                                    errors: (message._errors || []).length ? [Y.doccirrus.errors.rest( '2021' )] : [],
                                    text: message.text || ''
                                }
                            }
                        } );

                    }
                } );
            }

            Y.doccirrus.communication.getOnlineUsersPRC( onlineUsersCb );
        }

        function getKbvPathFor( name ) {
            var Path = require( 'path' ),
                dir = kbvDirNames[name],
                tmpDir = Y.doccirrus.auth.getTmpDir();
            if( !dir ) {
                return;
            }
            return Path.join( tmpDir, dir );
        }

        function createKbvTmpDirs() {
            var fs = require( 'fs' );
            Object.keys( kbvDirNames ).forEach( function( key ) {
                var path = getKbvPathFor( key );
                Y.log( 'create kbv tmp dir for ' + key + ' at ' + path, 'info', NAME );
                if( !fs.existsSync( path ) ) {
                    fs.mkdirSync( path );
                }
            } );
        }

        function getXpmPath() {
            return XPM_DIR;
        }

        function getConFilePath() {
            var Path = require( 'path' ),
                path = getXpmPath();
            if( !path ) {
                return null;
            }
            return Path.join( path, 'Daten' );
        }

        function createKbvLog( user, data ) {
            var
                schema = Y.doccirrus.schemaloader.getSchemaForSchemaName( 'kbvlog' ),
                kbvlog = Y.mix( Y.doccirrus.schemaloader.getEmptyDataForSchema( schema ), data, true );
            return Y.doccirrus.kvconnectutils.get1ClickKvcaEntryByKv( user, data.destination ).then( kvcaEntry => {
                kbvlog.kvcaEntry = [kvcaEntry] || null;

                if( kvcaEntry && kvcaEntry.kvcaAddress ) {
                    kbvlog.addressee = kvcaEntry.kvcaAddress;
                }

                return runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( kbvlog )
                } );

            } );
        }

        function makeQuarterList( quarterDate, nQuartersBack ) {
            const quarterList = [];
            for( let i = nQuartersBack; i > 0; i-- ) {
                quarterList.push( {
                    date: quarterDate,
                    quarter: quarterDate.quarter(),
                    year: quarterDate.year()
                } );
                quarterDate = quarterDate.clone().subtract( 1, 'quarter' );
            }
            return quarterList;
        }

        /**
         *
         *  @method checkLocation
         *  @private
         *
         *  check if log entry can be created in specific year/quarter/location
         *
         *  @param  {Object} args
         *  @param  {Object} args.user                  REST user or equivalent
         *  @param  {Array<String>} args.warnings
         *  @param  {String} args.quarter
         *  @param  {String} args.year
         *  @param  {Object} args.location
         *
         *  @return {Array<Object>}                      Array of locations for ranfe of quaters, alos warnings array is mutated
         */
        async function checkLocation( args ) {
            const
                { user, warnings, quarter, year, location } = args,
                result = {
                    passed: false,
                    nFound: 0,
                    quarter: quarter,
                    year: year,
                    locationId: location._id,
                    locname: location.locname,
                    kv: location.kv,
                    commercialNo: location.commercialNo
                };

            if( !location.commercialNo ) {
                warnings.push( Y.doccirrus.errors.rest( '2003', {
                    $locname: location.locname
                } ) );
                return result;
            }

            if( location.superLocation ){
                result.superLocation = true;
                result.slMembers = location.slMembers;
                result.slName = location.slName;
                result.slMembersData = location.slMembersData;
            }

            let [err, kbvlogs ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'kbvlog',
                query: {
                    mainLocationId: location._id.toString()
                },
                options: {
                    lean: true,
                    limit: 1,
                    sort: {_id: -1}
                }
            } ) );
            //originally was not stopped on error here
            if( err ){
                Y.log( `checkLocation: eroor on getting kbvLog: ${err.message || err}`, 'warn', NAME );
            }
            const
                kbvlog = kbvlogs && kbvlogs[0],
                currentQuarterDate = moment( quarter + '/' + year, 'Q/YYYY' ),
                logQuarterDate = kbvlog && moment( kbvlog.quarter + '/' + kbvlog.year, 'Q/YYYY' ),
                sameQuarter = logQuarterDate && currentQuarterDate.isSame( logQuarterDate, 'quarter' ),
                isLastKbvLogFinished = kbvlog && ('ACCEPTED' === kbvlog.status || 'REPLACED' === kbvlog.status || 'REPLACE_ERR' === kbvlog.status),
                isComplete = kbvlog && kbvlog.complete;

            if( kbvlog && !isLastKbvLogFinished && !isComplete ) {
                // last log must be finished before considering new one
                warnings.push( Y.doccirrus.errors.rest( '2018', {
                    $quarter: kbvlog.quarter,
                    $year: kbvlog.year,
                    $commercialNo: location.commercialNo
                } ) );
            } else if( !kbvlog || (kbvlog && isLastKbvLogFinished && sameQuarter) ) {
                // create log in current quarter because last is finished and in same quarter
                result.passed = true;
                result.nFound = kbvlog ? kbvlog.number : 0; // how many invoices in same quarter
                result.complete = isComplete;
            } else if( kbvlog && isLastKbvLogFinished && !sameQuarter ) {
                // last finished log is not same quarter so let the user decide for which quarter he wants to create the log
                let
                    nQuartersBack = currentQuarterDate.diff( logQuarterDate, 'quarter' );

                if( !isComplete ) {
                    // it is save to create new log in same quarter as last
                    nQuartersBack += 1;
                }

                result.passed = true;
                result.quarterList = makeQuarterList( currentQuarterDate, nQuartersBack );
            }

            return result;
        }

        function onInvoiceProgress( user, id, progress ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'invoicelogAction',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        invoiceType: 'KBV',
                        action: 'validate',
                        state: 'progress',
                        progress: progress,
                        id: id
                    }
                }
            } );
        }

        function findByPath( path, context ) {
            var tmp = context;
            Y.Array.each( path, function( part ) {
                if( !context[part] || !context[part] ) {
                    return;
                }
                context = context[part];
            } );

            return (tmp !== context) ? context : undefined;
        }

        function getPathRelatedIds( path, context ) {
            var
                i,
                ids = [],
                pathArr = path.split( '.' ),
                parent;

            if( !context ) {
                Y.log( `CON file line for path "${path}" was mapped without context. See MOJ-10616 and fix!`, 'warn', NAME );
                return ids;
            }

            if( 1 === pathArr.length ) {
                if( context._id ) {
                    ids.push( context._id );
                }
            } else if( pathArr.length ) {
                for( i = 0; i < pathArr.length; i++ ) {
                    parent = findByPath( pathArr.slice( 0, pathArr.length - (i + 1) ), context );
                    if( parent ) {
                        if( Y.Lang.isArray( parent ) && parent[0] && parent[0]._id ) {
                            ids.push( parent[0]._id );
                        } else if( Y.Lang.isObject( parent ) && parent._id ) {
                            ids.push( parent._id );
                        }
                    }
                }
            }
            return ids;
        }

        function getName( path ) {
            var arr;
            if( 'string' === typeof path ) {
                arr = path.split( '.' );
                return arr[arr.length - 1];
            }
            return null;
        }

        function replaceFieldCodesInText( fields, text ) {
            text = text || '';
            if( text && fields && fields.length ) {
                fields.forEach( function( field ) {
                    var
                        name = '',
                        ruleSetFields = Y.doccirrus.ruleset.kbv.getFieldsByCode( field );

                    if( ruleSetFields && ruleSetFields.length ) {
                        Y.Array.each( ruleSetFields, function( ruleSetField, index ) {
                            var tmpName = Y.doccirrus.schemaloader.getTranslation(
                                Y.doccirrus.schemaloader.getSchemaByName( ruleSetField.schema ), getName( ruleSetField.path ), '-de' );
                            if( tmpName ) {
                                name += tmpName;
                                if( index !== ruleSetFields.length - 1 ) {
                                    name += '/';
                                }
                            }
                        } );
                    }

                    if( !name ) {
                        return;
                    }
                    text = text.replace( new RegExp( 'Feld\\s\'?(\\b' + field + '\\b)\'?', 'g' ), 'Feld ' + name );
                } );
            }
            return text;
        }

        function buildUrl( error ) {
            var
                path = null,
                hashPath = '';

            if( error && error.map && error.map.length && error.map[0] && error.map[0].modelIds && error.map[0].modelIds.length && ('string' === typeof error.map[0].schem) ) {
                error.map[0].schem.split( '.' ).forEach( function( schema, index ) {
                    var paths = schemaPathsMap[schema],
                        hash;
                    if( paths ) {
                        hash = paths.hashPath;
                        hashPath += hash;
                        hashPath += ('/' !== hash[hash.length - 1]) ? '/' : '';
                        hashPath += error.map[0].modelIds.reverse()[index];
                        if( 0 === index ) {
                            path = paths.path;
                        }
                    }
                } );
            }

            return path ? path + '#' + hashPath : null;
        }

        async function mapKbvErrors( errors, lines, kbvlog, user, type, invoiceConfig ) {
            const result = [];
            for( let error of errors ) {
                let line,
                    ruleSetFields;
                if( error.line && error.fields ) {
                    line = lines[error.line - 1];
                    if( line ) {
                        ruleSetFields = Y.doccirrus.ruleset.kbv.getFieldsByCode( line.key );
                        error.originalText = error.text;
                        error.text = replaceFieldCodesInText( error.fields, error.text );
                        error.value = line.value;
                        error.fieldCode = line.key;
                        error.map = [];

                        if( '8000' !== error.fieldCode ) {
                            Y.Array.each( ruleSetFields, function( ruleSetField ) {
                                var errorMap = {};
                                errorMap.model = ruleSetField.st;
                                errorMap.schem = ruleSetField.schema;
                                errorMap.path = ruleSetField.path;
                                errorMap.modelIds = getPathRelatedIds( errorMap.path, line.context );
                                errorMap.name = getName( errorMap.path );
                                error.map.push( errorMap );
                            } );

                            error.link = buildUrl( error );
                        }

                        if( !error.link && error.scheinId ) {
                            error.link = schemaPathsMap.activity.path + '#' + schemaPathsMap.activity.hashPath + error.scheinId + schemaPathsMap.patient.hashPath + error.patientId + schemaPathsMap.patient.caseFolder + error.caseFolderId;
                        }
                    } else {
                        if( !error.link && error.scheinId ) {
                            error.link = schemaPathsMap.activity.path + '#' + schemaPathsMap.activity.hashPath + error.scheinId + schemaPathsMap.patient.hashPath + error.patientId + schemaPathsMap.patient.caseFolder + error.caseFolderId;
                        }
                    }

                    const excludeError = await Y.doccirrus.invoicelogutils.filterValidationResult( {
                        user,
                        validationResult: error,
                        invoiceConfig
                    } );

                    if( !excludeError ) {
                        result.push( error );
                        await Y.doccirrus.api.invoicelog.saveEntry( {
                            user,
                            entry: error,
                            ruleLogType: type,
                            inVoiceLogId: kbvlog._id,
                            logType: 'KBV'
                        } );
                    }

                } else {
                    result.push( error );
                }
            }
            return result;
        }

        /**
         * Map KRWErrors to "Prüfmodul"-Errors
         * @param {Array}   krwData
         * @param {Object} kbvlog
         * @param {Object} user
         */
        function mapKRWErrors( krwData, kbvlog, user ) {
            krwData.forEach( function( data ) {
                if( Array.isArray( data.errors ) && data.errors.length ) {
                    data.errors.forEach( async _error => {
                        let path = schemaPathsMap.patient,
                            error = {
                                text: _error.message,
                                corrections: _error.corrections,
                                link: path.path + '#' + path.hashPath + data.data.patientId + path.section
                            },
                        type;
                        switch( _error.status ) {
                            case 'Fehler':
                                kbvlog.output.push( error );
                                type = 'ERROR';
                                break;
                            case 'Warnung':
                                kbvlog.warnings.push( error );
                                type = 'WARNING';
                                break;
                            case 'Hinweis':
                                kbvlog.advices.push( error );
                                type = 'ADVICE';
                        }
                        await Y.doccirrus.api.invoicelog.saveEntry({ user, entry: error, ruleLogType: type, inVoiceLogId: kbvlog._id, logType: 'KBV' });
                    } );
                }
            } );
        }



        function isAsvMode( user ) {
            return Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.ASV ) && !Y.doccirrus.licmgr.hasBaseServices( user.tenantId, Y.doccirrus.schemas.settings.baseServices.INVOICE );
        }

        /**
         * @method getLocationIdsByUser
         * @private
         *
         * get list of locations id assigned to particular employee
         *
         * @param {Object} user     logged in user that have related employee record
         *
         * @returns {Array<String>} list of location ids
         */
        async function getLocationIdsByUser( user ) {
            let [err, employees ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                query: { _id: user.specifiedBy },
                options: {
                    lean: true,
                    fields: {locations: 1}
                }
            } ) );
            if( err ){
                Y.log( `getLocationIdsByUser: could not get location ids by user: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return (employees && employees[0] && employees[0].locations || []).map( location => location._id );
        }

        /**
         * @method _createLogs
         * @private
         *
         * create log entries and expand them for super locations
         *
         * @param {Object} user
         * @param {Array<Object>} defs
         * @param {Object<Moment>} now
         * @param {Object} replaceData
         *
         * @returns {Promise}
         */
        async function _createLogs( user, defs, now, replaceData ) {
            for( let def of defs ){
                let tmpDate, quarter, year;
                if( true === def.complete ) {
                    tmpDate = moment( def.quarter + '/' + def.year, 'Q/YYYY' ).add( 1, 'quarter' );
                }

                quarter = tmpDate ? tmpDate.quarter() : def.quarter;
                year = tmpDate ? tmpDate.year() : def.year;

                let data = replaceData || {
                    created: now.toDate(),
                    quarter: quarter,
                    year: year,
                    status: 'CREATED',
                    lastUpdate: now.toDate(),
                    commercialNo: def.commercialNo,
                    locname: def.locname,
                    mainLocationId: def.locationId,
                    destination: def.kv,
                    number: 'number' === def.nFound ? ++def.nFound : 0,
                    version: 1,
                    conFileName: '',
                    conFileId: '',
                    xkmFileName: '',
                    xkmFileId: '',
                    _log_version: LATEST_LOG_VERSION,
                    excludedScheinIds: [],
                    unknownInsuranceScheinIds: [],
                    excludedPatientIds: []
                }, err;

                if( !def.superLocation ){
                    [err] = await formatPromiseResult( createKbvLog( user, data ) );
                    if( err ){
                        Y.log( `_createLogs: Error saving KBVLog: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    return;
                }

                // super location
                data.locname = Y.doccirrus.schemas.kbvlog.getSuperLocationName( def.slName, def.locname );
                data.slType = 'super';
                data.slReferences = [...def.slMembers, def.locationId];
                data.slCommercialNo = def.commercialNo;
                let logId;
                [err, logId] = await formatPromiseResult( createKbvLog( user, data ) );
                if( err ){
                    Y.log( `_createLogs: Error saving KBVLog: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                // main location of super location
                data.locname = def.locname;
                data.slType = 'main';
                data.slReferences = [def.locationId];
                data.slLogId = logId && logId[0];
                [err] = await formatPromiseResult( createKbvLog( user, data ) );
                if( err ){
                    Y.log( `_createLogs: Error saving KBVLog: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                //other members of super location
                for( let memberData of def.slMembersData ){
                    data.locname = memberData.locname;
                    data.commercialNo =  memberData.commercialNo;
                    data.mainLocationId = memberData._id;
                    data.destination =  memberData.kv;
                    data.slType = 'member';
                    [err] = await formatPromiseResult( createKbvLog( user, data ) );
                    if( err ){
                        Y.log( `_createLogs: Error saving KBVLog: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                }
            }
        }

        /**
         * @method createLogsForced
         * @private
         *
         * force log creation after specifying exact year/quarter on client
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array<Object>} args.originalParams.quartersToCreate
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function createLogsForced( args ) {
            const
                {user, originalParams: {quartersToCreate}, callback} = args,
                now = moment();

            if( !quartersToCreate || !quartersToCreate.length ) {
                return handleResult( null, undefined, callback );
            }

            let err;
            for( let quarterDef of quartersToCreate) {
                let
                    quarter = quarterDef.quarter,
                    year = quarterDef.year,
                    locationId = quarterDef.locationId;

                if( !quarter || !year || !locationId ) {
                    Y.log( `createLogsForced: Insuficient parameters: ${quarter}/${year}/${locationId}`, 'error', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ), undefined, callback );
                }
                // add checks...
                let kbvlogs;
                [err, kbvlogs] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kbvlog',
                    query: {
                        mainLocationId: locationId
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {_id: -1}
                    }
                } ) );
                if( err ) {
                    Y.log( `createLogsForced: Error getting logs: ${err.stack || err}`, 'error', NAME );
                    return handleResult( Y.doccirrus.errors.rest( '500' ), undefined, callback );
                }
                let kbvlog = kbvlogs && kbvlogs[0],
                    isSameQuarter = kbvlog && moment( kbvlog.quarter + '/' + kbvlog.year, 'Q/YYYY' )
                        .isSame( moment( quarter + '/' + year, 'Q/YYYY' ), 'quarter' );

                quarterDef.nFound = isSameQuarter ? kbvlog.number : 0;
            }


            [err] = await formatPromiseResult( _createLogs( user, quartersToCreate, now ) );
            if( err ){
                Y.log( `createLogsForced: Error  saving KBVLog: ${err.stack || err}`, 'error', NAME );
                return handleResult( Y.doccirrus.errors.rest( '500' ), undefined, callback );
            }

            Y.log( 'createLogsForced: created new forced kbvlogs', 'debug', NAME );
            return handleResult( null, undefined, callback );
        }

        function kbvlogDestinationChanged( args ) {
            Y.log('Entering Y.doccirrus.api.kbvlog.kbvlogDestinationChanged', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.kbvlogDestinationChanged');
            }
            const
                {user, originalParams} = args,
                destination = originalParams && originalParams.destination,
                query = {
                    destination,
                    status: {$nin: ['SENT_ERR', 'SENT', 'ACCEPTED', 'REJECTED', 'ARCHIVED', 'TIMEOUT', 'CANCELED', 'SENDING']},
                    $and: [
                        {'kvcaEntry.kv': {$ne: null}},
                        {'kvcaEntry.kv': {$ne: destination}}
                    ]
                };

            let callback = args.callback || (() => {
            });

            function getKvcaEntryAndUpdate() {
                // TODOOO check delSettings first if oneclick??
                return Y.doccirrus.kvconnectutils.get1ClickKvcaEntryByKv( user, destination ).then( kvcaEntry => {

                    const
                        data = {
                            kvcaEntry: [],
                            addressee: null,
                            skipcheck_: true
                        };
                    if( kvcaEntry ) {
                        data.kvcaEntry = [kvcaEntry];
                        data.addressee = kvcaEntry.kvcaAddress;
                    }

                    return runDb( {
                        user: user,
                        model: 'kbvlog',
                        action: 'put',
                        query,
                        data: data,
                        fields: ['kvcaEntry', 'addressee']
                    } );

                } );
            }

            if( !destination ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            Y.log( `try to update kvca entries of kbvlogs after kv changed to ${destination}`, 'debug', NAME );

            runDb( {
                model: 'kbvlog',
                action: 'count',
                user: user,
                query
            } ).then( count => {
                Y.log( `updating kvca entries of ${count} kbvlogs after kv changed to ${destination}`, 'debug', NAME );
                if( 0 < count ) {
                    return getKvcaEntryAndUpdate();
                }
            } ).then( () => {
                callback();
            } ).catch( err => {
                Y.log( `could not update kvca entry in kbvlogs after kv changed to ${destination}: ${err && err.stack || err}`, 'error', NAME );
                callback( err );
            } );
        }

        function generateQPZ( args ) {
            Y.log('Entering Y.doccirrus.api.kbvlog.generateQPZ', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.generateQPZ');
            }
            const {user, originalParams, callback} = args;

            let ebmDesc,
                promise;

            let kbvLogId, kbvlog;

            if( originalParams && originalParams.kbvLogId ) {
                kbvLogId = originalParams.kbvLogId;
                promise = runDb( {
                    user: user,
                    model: 'kbvlog',
                    query: {
                        _id: kbvLogId
                    },
                    options: {
                        select: {destination: 1}
                    }
                } ).get( 0 );
            } else if( originalParams && originalParams.kbvLog && originalParams.kbvLog._id ) {
                kbvLogId = originalParams.kbvLog._id.toString();
                promise = Prom.resolve( originalParams.kbvLog );
            } else {
                promise = Prom.reject( new DCError( 500, {message: 'missing kbvlogId or kbvlog argument'} ) );
            }
            promise.then( _kbvlog => {
                kbvlog = _kbvlog;
                if( !kbvlog ) {
                    throw new DCError( 500, {message: 'kbvlog not found'} );
                }

                if( !kbvlog.destination ) {
                    throw new DCError( 500, {message: 'could not get ebm descriptor: kbvlog has no kv assigned'} );

                }

                ebmDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM' + kbvlog.destination
                } );

                if( !ebmDesc ) {
                    throw new DCError( 500, {message: `could not get ebm descriptor: catalogShort EBM${kbvlog.destination}`} );
                }

                return runDb( {
                    user: user,
                    model: 'invoiceentry',
                    query: {
                        invoiceLogId: kbvLogId,
                        type: 'header'
                    },
                    options: {
                        select: {'data.locations': 1}
                    }
                } );
            } ).get( 0 ).then( invoiceEntryHeader => {

                if( !invoiceEntryHeader ) {
                    throw new DCError( 500, {message: `invoiceEntryHeader not found for invoiceLogId ${kbvLogId}`} );
                }

                const physicians = [];

                invoiceEntryHeader.data.locations.forEach( location => {
                    location.physicians.forEach( physician => {
                        // Do not count QPZ for physician in qualification; its lanr was already changed in  treatments
                        // to lanr of rlvPhysician.
                        const isPhysicianInQualification = physician.physicianInQualification && physician.rlvPhysician;
                        if( !isPhysicianInQualification && !physicians.find( _physician => _physician._id === physician._id ) ) {
                            physicians.push( physician );
                        }
                    } );
                } );

                return Prom.map( physicians, physician => {
                    const officialNo = physician.officialNo;

                    return runDb( {
                        user: user,
                        model: 'invoiceentry',
                        action: 'aggregate',
                        pipeline: [
                            {
                                $match: {
                                    invoiceLogId: kbvLogId,
                                    type: 'schein',
                                    'data._id': {$nin: kbvlog.excludedScheinIds},
                                    'data.patientId': {$nin: kbvlog.excludedPatientIds},
                                    'data.treatments._lanr': officialNo
                                }
                            },
                            {$project: {treatments: '$data.treatments'}},
                            {$unwind: '$treatments'},
                            {$match: {'treatments._lanr': officialNo}},
                            {$group: {_id: {'code': '$treatments.code'}, codeTime: {$sum: '$treatments.quarterTime'}}},
                            {$group: {_id: null, totalTime: {$sum: '$codeTime'}}}
                        ]
                    } ).then( result => {
                        return {
                            physician,
                            totalTime: result && result.result && result.result[0] && result.result[0].totalTime || 0
                        };
                    } );
                } );

            } ).then( result => {
                callback( null, result );
            } ).catch( err => {
                Y.log( `could not calculate QPZ for kbvlog ${kbvLogId}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
            } );
        }

        /**
         *  Create activities in patient casefolders referencing KBV log
         *
         *  Overview:
         *
         *      1.  Load KBV log from database
         *      2.  Create description of invoice log
         *      3.  Create INVOICEREFGKV activities for invoicelogEntries corresponding to scheine
         *      4.  Notify casefile of new activities
         *
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.kbvlogId    Database _id of a knbvlog
         *  @param  {Function}  args.callback                   Of the forn fn( err, [ activityIds ] )
         */

        async function createReferenceActivities( args ) {
            Y.log('Entering Y.doccirrus.api.kbvlog.createReferenceActivities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.createReferenceActivities');
            }
            const
                params = args.originalParams,
                kbvlogId = params.kbvlogId;

            let
                kbvLog,
                description,
                activityIds = [],
                newId,

                err, result;

            //  1.  Load KBV log from database

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'kbvlog',
                    query: {
                        _id: kbvlogId
                    }
                } )
            );

            if ( !err && 0 === result.length ) {
                err = Y.doccirrus.errors.rest( 404, 'KBV log not found' );
            }

            if ( err ) {
                Y.log( `Could not load KBV log by id: ${kbvlogId}`, 'warn', NAME );
                throw err;
            }

            kbvLog = result[0];

            //  2.  Create description of invoice log
            description =
                'Q ' + kbvLog.quarter + ' ' + kbvLog.year + ' ' +
                ( kbvLog.locname ? kbvLog.locname: '' );

            Y.log( `Created description for invoice log entries: ${description}`, 'debug', NAME );

            //  3.  Create INVOICEREFGKV activities for invoicelog entries corresponding to scheine
            [err] = await formatPromiseResult(
                Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    'user': args.user,
                    'invoiceLogId': kbvlogId,
                    'iterator': createSingleReferenceActivity
                } )
            );

            if (err) {
                Y.log( `Problem while creating reference activities: ${kbvlogId}`, 'warn', NAME);
                return args.callback(err);
            }

            async function createSingleReferenceActivity( invoiceEntry ) {
                //  reference activities are created for each schein, but not for headers, etc
                if ('schein' !== invoiceEntry.type) { return; }

                [err, newId] = await formatPromiseResult(
                    Y.doccirrus.api.invoicelog.createReferenceActivity(
                        args.user,
                        invoiceEntry,
                        'INVOICEREFGKV',
                        description
                    )
                );

                if (err) {
                    Y.log( `Problem creating reference activity for ${invoiceEntry._id}: ${err.stack || err}`, 'warn', NAME );
                    //  continue with other casefolders, best effort
                }

                Y.log( `Created INVOICEREFGKV ${newId} for ${invoiceEntry._id}`, 'debug', NAME );
                activityIds.push( newId );
            }

            //  4.  Notify casefile of new activities
            Y.doccirrus.communication.emitEventForUser( {
                targetId: args.user.identityId,
                event: 'treatmentCopiesCreated',        //  causes casefile table reload
                msg: {
                    data: activityIds
                }
            } );

            Y.log( 'Completed creation og INVOICEREFGKV activities: ' + JSON.stringify( activityIds ), 'debug', NAME );
            args.callback( null, activityIds );
        }

        async function isContentOutdated( activity ) {
            const invoiceProcessActivityFields = Y.doccirrus.gkvprocess.invoiceProcessActivityFields;
            let activityFields;

            switch( activity.actType ) {
                case 'DIAGNOSIS':
                    activityFields = invoiceProcessActivityFields.diagnosisFields;
                    break;
                case 'TREATMENT':
                    // TODO: check seems like that fk5020Set,fk5042Set are always changed...
                    activityFields = invoiceProcessActivityFields.treatmentFields;
                    break;
                case 'SCHEIN':
                    activityFields = invoiceProcessActivityFields.scheinFields;
                    break;
                default:
                    Y.log( `could not find kbvlog activity fields for actType ${activity.actType}`, 'debug', NAME );
                    return false;
            }
            return Y.doccirrus.mongooseUtils.areFieldsModified( activityFields, activity );
        }

        /**
         * @method createLogsForced
         * @public
         *
         * entry point of public invoice log creation
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {String} args.originalParams.mainLocationId
         * @param {Boolean} args.originalParams.forceCreation
         * @param {String} args.originalParams.fromSuperLocationId
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function createLogs( args ) {
            Y.log('Entering Y.doccirrus.api.kbvlog.createLogs', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.createLogs');
            }
            const
                { user, originalParams: { mainLocationId, forceCreation, fromSuperLocationId }, callback } = args,
                settings = Y.doccirrus.api.settings.getSettings( user ),
                isASV = isAsvMode( user ),
                errors = [],
                warnings = [],
                now = moment(),
                quarter = now.quarter(),
                year = now.year();

            let
                locQuery = {
                    isAdditionalLocation: {$ne: true}
                },
                err;

            if( forceCreation === true ) {
                createLogsForced( args );
                return;
            }

            if( mainLocationId ) {
                Y.log( `createLogs: get kbvlogs with specified locationId ${mainLocationId}`, 'debug', NAME );
                locQuery._id = mainLocationId;
            } else if( isASV || ( settings && settings.noCrossLocationAccess ) ) {
                Y.log( `createLogs: get kbvlogs in ASV Mode`, 'debug', NAME );
                let locationIds;
                [err, locationIds] = await formatPromiseResult( getLocationIdsByUser( user ) );
                if( err ){
                    Y.log( `createLogs: error getting locations for user ${user.U}:${user.specifiedBy} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `createLogs: get kbvlogs in ASV mode user has following locationIds ${locationIds}`, 'debug', NAME );
                locQuery._id = {$in: locationIds};
            } else {
                Y.log( `createLogs: get kbvlogs for all locations (exept additional locations)`, 'debug', NAME );
            }

            let locations;
            [err, locations ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                query: locQuery,
                useCache: false,
                options: {
                    lean: true,
                    select: {
                        commercialNo: 1,
                        locname: 1,
                        kv: 1,
                        slName: 1,
                        slMain: 1,
                        slMembers: 1
                    }
                }
            } ) );
            if( err ){
                Y.log( `createLogs: error getting locations by query ${JSON.stringify(locQuery)} : ${err.stack || err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.http( 500 ) );
            }

            //create new logs for exact super location
            if( fromSuperLocationId ){
                let sl = locations.find( loc => loc._id.toString() === fromSuperLocationId );
                if( sl ){
                    locations = [ sl, ...locations.filter( loc => (sl.slMembers || []).includes( loc._id.toString() ) ) ];
                }
            }

            if( !locations || !locations.length ) {
                Y.log( 'createLogs: locations not found', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( '1003', {
                    $entity: {
                        '-de': 'Betriebsstätten',
                        '-en': 'locations'
                    }
                } ) );
            }

            locations = locations.map( loc => {
                loc._id = loc._id.toString();
                return loc;
            } );

            //reorganise if there are super locations
            let locIds = locations.map( loc => loc._id ),
                superLocations = locations.filter( loc => loc.slMain && loc.slMembers && loc.slMembers.length && loc.slMembers.every( member => locIds.includes( member ) ) );

            //copy member data into super locations
            superLocations.forEach( sl => {
                sl.slMembersData = locations.filter( loc => sl.slMembers.includes( loc._id ) );
                sl.superLocation = true;
            } );

            //remove locations that are member and pass next only main locations and locations not related to super locations
            superLocations.forEach( sl => {
                sl.slMembers.forEach( member => {
                    locations = locations.filter( loc => loc._id !== member );
                });
            } );

            let passedLocations = [];
            for( let location of locations ){
                let [err, processedLocation] = await formatPromiseResult( checkLocation( { user, warnings, location, quarter, year } ) );
                if( err ){
                    Y.log( `createLogs: error checking location ${location.locname}(${location._id}) : ${err.stack || err}`, 'warn', NAME );
                    continue;
                }
                if( !processedLocation.passed ){
                    Y.log( `createLogs: location ${location.locname}(${location._id}) not passed`, 'warn', NAME );
                    continue;
                }
                passedLocations.push( processedLocation );
            }

            locations = passedLocations;

            const
                logsToCreateNow = locations.filter( result => !result.quarterList ),
                logsUserNeedToCheck = locations.filter( result => Boolean( result.quarterList ) );


            if( logsToCreateNow.length ) {
                [err] = await formatPromiseResult( _createLogs( user, logsToCreateNow, now ) );
                if( err ){
                    Y.log( `createLogs: error creating logs for ${JSON.stringify(logsToCreateNow.map( loc => {
                        return {
                            _id: loc._id,
                            quarterList: loc.quarterList
                        };
                    }))} : ${err.stack || err}`, 'error', NAME );
                    return callback( Y.doccirrus.errors.http( 500 ) );
                }
            }

            callback( null, {meta: {warnings: warnings, errors: errors}, data: logsUserNeedToCheck} );
        }


        Y.namespace( 'doccirrus.api' ).kbvlog = {

            name: NAME,

            server: {
                isContentOutdated
            },


            getKbvPathFor: getKbvPathFor,

            get: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.get');
                }
                const
                    _ = require( 'lodash' ),
                    user = args.user,
                    query = args.query,
                    options = args.options,
                    settings = Y.doccirrus.api.settings.getSettings( user ),
                    isASV = isAsvMode( user );

                let promise, mainLocationIds, allowedLocations;

                if( query.slType && query.slType.$in && query.slType.$in.includes( 'location' ) ){
                    if( !query.$or ){
                        query.$or = [];
                    }
                    query.$or.push( {slType: {$exists: false}} );
                    query.$or.push( {slType: {$in: query.slType.$in.filter( el => el !== 'location' )}} );
                    delete query.slType;
                }

                function getKbvLog() {
                    return runDb( {
                        model: 'kbvlog',
                        user: user,
                        query: query,
                        options: Object.assign( {}, options, {lean: true} )
                    } ).then( function( result ) {
                        if( result && result.result ) {
                            mainLocationIds = result.result.map( kbvlog => kbvlog.mainLocationId );
                            mainLocationIds = _.uniq( mainLocationIds );
                        }
                        return result;
                    } );
                }

                function getDeliverySettings() {
                    return runDb( {
                        user: user,
                        model: 'gkv_deliverysettings',
                        query: {
                            mainLocationId: {$in: mainLocationIds}
                        },
                        options: {
                            lean: 1
                        }
                    } );
                }

                if( isASV || ( settings && settings.noCrossLocationAccess ) ) {
                    promise = getLocationIdsByUser( user ).then( locationIds => {
                        allowedLocations = locationIds;
                        query.mainLocationId = {$in: locationIds};
                        return getKbvLog();
                    } );
                } else {
                    promise = getKbvLog();
                }
                // TODOOO maybe do this step only for not sent or only for encrypted logs?
                promise = promise.then( result => {

                    //additionally filter out super locations if not all sub locations are allowed
                    if( result && result.result && result.result.length && ( isASV || ( settings && settings.noCrossLocationAccess ) ) ) {
                        result.result = result.result.filter( log => log.slType !== 'super' || log.slReferences.every( locId => allowedLocations.includes(locId)) );
                    }

                    if( result && result.result && result.result.length && mainLocationIds && mainLocationIds.length ) {
                        Y.log( 'add deliverysettings to kbvlog', 'debug', NAME );
                        return getDeliverySettings().then( settings => {
                            return settings;
                        } ).each( deliverySetting => {
                            result.result.forEach( kbvlog => {
                                if( deliverySetting.mainLocationId === kbvlog.mainLocationId ) {
                                    kbvlog._deliverySettings = JSON.parse( JSON.stringify( deliverySetting ) );
                                }
                            } );
                        } ).then( () => {
                            return result;
                        } );
                    }
                    return result;
                } );

                promise.then( async result => {
                    for( let item of result.result ) {
                        let [ err, res ] = await formatPromiseResult(
                            new Promise( (resolve, reject) => {
                                Y.doccirrus.invoiceserverutils.calculateErrors( user, item._id, ( err, res ) => {
                                    if( err ){
                                        return reject(err);
                                    }
                                    resolve( res );
                                } );
                            } )
                        );
                        if( err ) {
                            Y.log(`calculateErrors: Error calculating: ${err.stack || err}`, 'error', NAME);
                            throw err;
                        }

                        if( res ) {
                            item.output = res.output;
                            item.warnings = res.warnings;
                            item.advices = res.advices;
                        }
                    }
                    args.callback( null, result );
                } ).catch( err => {
                    Y.log( 'could not get kbvlogs ' + err, 'error', NAME );
                    args.callback( err );
                } );
            },
            createLogs,

            /**
             * Creates new KBVLog linked to KBVLog to be replaced with incremented version and same guid as the replaced
             * KBVLog. Resets complete contents of corresponding invoice-log-entries referenced by KBVLog to replace.
             * After new KBVLog is created successfully method returns and socket io events will inform about reset
             * progress.
             *
             * Rules for creation of replacements:
             * - Must be last KBVLog for corresponding main location
             * - Only latest replacement can be replaced again
             *
             *
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {Object}          args.originalParams
             * @param {String}          args.originalParams.id       KBVLog ID
             * @param {Function}        args.callback
             */
            replaceKBVLog: async function replaceKBVLog( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvlog.replaceKBVLog', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvlog.replaceKBVLog' );
                }
                const ALLOWED_STATUSS = ['ACCEPTED', 'REPLACE_ERR'];
                const {user, originalParams, callback} = args;
                let checkLocationResult;

                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.replaceKBVLog' ) ) {
                    return callback( accessError );
                }

                let [err] = await formatPromiseResult( Y.doccirrus.api.invoicelog.server.replace( {
                    user,
                    invoiceLogId: originalParams.id,
                    invoiceLogType: 'KBV',
                    preChecks: async ( kbvLog ) => {
                        const statusTransitionAllowed = ALLOWED_STATUSS.includes( kbvLog.status );

                        if( !statusTransitionAllowed ) {
                            throw new DCError( 2037 );
                        }

                        let [err, results] = await formatPromiseResult( runDb( {
                            user: user,
                            model: 'location',
                            query: {
                                _id: kbvLog.slType === 'super' ? {$in: kbvLog.slReferences} : kbvLog.mainLocationId
                            },
                            options: {
                                lean: true,
                                select: {
                                    commercialNo: 1,
                                    locname: 1,
                                    kv: 1,
                                    slName: 1,
                                    slMain: 1,
                                    slMembers: 1
                                }
                            }
                        } ) );

                        if( err ) {
                            Y.log( `preChecks: could not get location ${kbvLog.mainLocationId}: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        }

                        let location;
                        if( kbvLog.slType === 'super' ){
                            location = results.find( loc => loc.slMain );
                            if( location ){
                                location.superLocation = true;
                                location.slMembersData = results.filter( loc => location.slMembers.includes( loc._id.toString() ) );
                            }
                        } else {
                            location = results && results[0];
                        }

                        if( !location ) {
                            throw DCError( 2032 );
                        }

                        [err, results] = await formatPromiseResult( checkLocation( {
                            user,
                            warnings: [],
                            location,
                            quarter: kbvLog.quarter,
                            year: kbvLog.year
                        } ) );

                        if( err ) {
                            Y.log( `preChecks: could not check location ${kbvLog.mainLocationId}: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        }

                        checkLocationResult = results;
                        if( !checkLocationResult.passed ) {
                            throw  new DCError( 2033 );
                        }
                    },
                    createNewLog: async ( kbvLog ) => {
                        let result;

                        const
                            nowMoment = moment(),
                            now = nowMoment.toDate(),
                            data = {
                                created: now,
                                status: 'CREATED',
                                lastUpdate: now,
                                // use checkLocationResult if present because it will update changed data
                                commercialNo: checkLocationResult && checkLocationResult.commercialNo || kbvLog.commercialNo,
                                locname: checkLocationResult && checkLocationResult.locname || kbvLog.locname,
                                destination: checkLocationResult && checkLocationResult.kv || kbvLog.destination,
                                number: 'number' === typeof (checkLocationResult && checkLocationResult.nFound) ? ++checkLocationResult.nFound : 0,
                                conFileName: '',
                                conFileId: '',
                                xkmFileName: '',
                                xkmFileId: '',
                                mainLocationId: kbvLog.mainLocationId,
                                quarter: kbvLog.quarter,
                                year: kbvLog.year,
                                complete: kbvLog.complete,
                                test: kbvLog.test,
                                replacement: true,
                                replacedLogId: kbvLog._id.toString(),
                                guid: kbvLog.guid, // must stay the same so the kbv knows which invoice was replaced
                                excludedScheinIds: kbvLog.excludedScheinIds,
                                unknownInsuranceScheinIds: kbvLog.unknownInsuranceScheinIds,
                                excludedPatientIds: kbvLog.excludedPatientIds,
                                version: kbvLog.version += 1,
                                _log_version: LATEST_LOG_VERSION
                            };

                        if( kbvLog.slType === 'super' ){
                            [err, result] = await formatPromiseResult( _createLogs( user, [checkLocationResult], nowMoment, data ) );
                            if( err ) {
                                Y.log( `createNewLog: could not create super location kbvlog: ${err.stack || err}`, 'error', NAME );
                                throw err;
                            }
                        } else {
                            [err, result] = await formatPromiseResult( createKbvLog( user, data ) );
                            if( err ) {
                                Y.log( `createNewLog: could not create kbvlog: ${err.stack || err}`, 'error', NAME );
                                throw err;
                            }
                        }

                        return result;
                    }
                } ) );

                if( err ) {
                    Y.log( `could not replace kbvlog ${err.stack || err}`, 'warn', NAME );
                    callback( err );
                    return;
                }
                callback();
            },

            createReferenceActivities: createReferenceActivities,

            deleteKBVLog: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.deleteKBVLog', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.deleteKBVLog');
                }
                var user = args.user,
                    params = args.originalParams,
                    callback = args.callback;
                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.deleteKBVLog' ) ) {
                    return callback( accessError );
                }

                function finalCb( err, results ) {
                    if( err ) {
                        callback( Y.doccirrus.errors.rest( '1004', {
                            $entity: {
                                '-de': 'Abrechnungseintrag',
                                '-en': 'Invoice entry'
                            }
                        } ) );
                        return;
                    }
                    if( !results || !results.length ) {
                        return callback( Y.doccirrus.errors.rest( '1004', {
                            $entity: {
                                '-de': 'Abrechnungseintrag',
                                '-en': 'Invoice entry'
                            }
                        } ) );
                    }
                    callback();
                }

                if( !params.id ) {
                    Y.log( 'deleteKBVLog missing param id', 'error', NAME );
                    callback( Y.doccirrus.errors.http( 500 ) );
                    return;
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'delete',
                    query: {
                        _id: params.id
                    }
                }, finalCb );
            },

            /**
             *  Mark a kbvlog as having been manually delivered (user downloaded and sent the file)
             *
             *  @param  {Object}    args
             *  @param  {Object}    args.user
             *  @param  {Object}    args.originalParams
             *  @param  {String}    args.originalParams.id      A kbvlog _id
             *  @param  {Function}  args.callback
             *  @return {*}
             */

            manualSend: function manualSend( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.manualSend', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.manualSend');
                }
                Y.log( 'kbvlog API - manualSend', 'info', NAME );

                var
                    user = args.user,
                    id = args.originalParams.id,
                    callback = args.callback,
                    data = {
                        status: 'ACCEPTED',
                        lastUpdate: new Date(),
                        complete: true
                    };

                //  (1) Initial checks

                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.manualSend' ) ) {
                    return callback( accessError );
                }

                if( !id ) {
                    callback( Y.doccirrus.errors.http( 500, 'Missing Paramter id' ) );
                    return;
                }

                //  (2) Update kbvlog status, date and completion status

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'put',
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    fields: ['status', 'lastUpdate', 'complete'],
                    query: {
                        _id: id
                    }
                }, onLogStatusUpdated );

                //  (3) Create INVOICEREFGKV activities and call back

                function onLogStatusUpdated( err ) {
                    if( err ) {
                        callback( Y.doccirrus.errors.rest( '2010' ) );
                        return;
                    }

                    createReferenceActivities( {
                        'user': user,
                        'originalParams': {
                            'kbvlogId': id
                        },
                        'callback': onActivitiesCreated
                    } );


                    callback();
                }

                function onActivitiesCreated( err, result ) {
                    if ( err ) {
                        Y.log( 'Problem creating reference activities: ' + JSON.stringify( err ), 'warn', NAME );
                    } else {
                        Y.log( 'Created reference activities: ' + JSON.stringify( result ), 'debug', NAME );
                    }
                }
            },

            cleanXpmPath: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.cleanXpmPath', 'info', NAME);
                if (args && args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.cleanXpmPath');
                }
                var
                    fs = require( 'fs' ),
                    async = require( 'async' ),
                    Path = require( 'path' ),
                    CONFilePath = getConFilePath(),
                    callback = args && args.callback || function() {
                    },
                    files;
                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.cleanXpmPath' ) ) {
                    return callback( accessError );
                }

                function filteredCb( results ) {
                    async.each( results, fs.unlink, callback );
                }

                function filter( file, cb ) {

                    function statCb( err, stats ) {
                        if( err || (stats && stats.isDirectory()) ) {
                            return cb( false );
                        }
                            cb( true );
                    }

                    fs.stat( file, statCb );
                }

                fs.readdir( CONFilePath, function( err, filenames ) {
                    if( err ) {
                        callback( err );
                        return;
                    }

                    files = filenames.map( function( file ) {
                        return Path.join( CONFilePath, file );
                    } );

                    async.filter( files, filter, filteredCb );

                } );

            },

            /**
             * collect invoice related activities and validate the data using associated kbv module
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.originalParams
             * @param {Object} args.options
             * @param {Function} args.callback
             *
             * @return {Function} callback
             */
            validate: async function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.validate', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.validate');
                }
                const
                    { user, originalParams: params, options, callback } = args,
                    cleanFiles = Prom.promisify( Y.doccirrus.invoicelogutils.cleanFiles ),
                    lateCallback = options && options.lateCallback;

                let
                    isPreValidation = Boolean( params.preValidation ),
                    xpmPath = getXpmPath(),
                    logInfo = {},
                    invoiceConfig,
                    fileIdsToDelete = [],
                    kbvErrors = 0,
                    kbvWarnings = 0,
                    kbvAdvices = 0;

                async function finish( err, kbvlog, state, resultsQPZ ) {
                    state = state || {};
                    let msg = {
                        data: {
                            state: 'finished',
                            action: 'validate',
                            invoiceType: 'KBV',
                            logInfo: logInfo,
                            warnings: [],
                            errors: []
                        }
                    };

                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );

                    function notify( msg ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: args.user.identityId,
                            event: 'invoicelogAction',
                            eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                            msg: msg
                        } );

                        let notifyFor = Array.isArray( resultsQPZ ) && resultsQPZ.filter( item => (780 * 60) < item.totalTime );
                        if( notifyFor && notifyFor.length ) {
                            const qpzMsg = notifyFor.map( item => Y.doccirrus.i18n( 'InvoiceMojit.gkv_browserJS.message.QPZ_TOO_HIGH', {
                                data: {
                                    phyName: `${item.physician.firstname} ${item.physician.lastname}`,
                                    time: item.totalTime
                                }
                            } ) ).join( '<br>' );
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                event: 'message',
                                msg: {data: qpzMsg},
                                meta: {
                                    level: 'ERROR'
                                }
                            } );
                        }
                    }

                    kbvlog.lastUpdate = new Date();
                    kbvlog.pid = '';
                    kbvlog.user = {
                        name: args.user.U,
                        employeeNo: args.user.identityId
                    };
                    kbvlog.output = [];
                    kbvlog.warnings = [];
                    kbvlog.advices = [];
                    kbvlog.excludedPatientIds = state.excludedPatientIds || [];
                    kbvlog.excludedScheinIds = state.excludedScheinIds || [];
                    kbvlog.unknownInsuranceScheinIds = state.unknownInsuranceScheinIds || [];


                    if( err ) {
                        Y.log( 'kbvlog validation finished with error: ' + (err && err.stack || err), 'error', NAME );
                        kbvlog.status = 'VALIDATION_ERR';
                    } else {
                        if( state.validationResults.errors.length ) {
                            let err,
                                result;
                            for( let item of state.validationResults.errors ) {
                                if( item.scheinId ) {
                                    //get patient data from schein
                                    [err, result] = await formatPromiseResult(
                                        new Promise( (resolve, reject) => {
                                            Y.doccirrus.api.activity.get( {
                                                user: args.user,
                                                query: {_id: item.scheinId},
                                                options: {
                                                    lean: true
                                                },
                                                callback: function( err, result ) {
                                                    var
                                                        schein = result && result[0];
                                                    if( err ) {
                                                        reject( err );
                                                    }
                                                    resolve( schein );
                                                }
                                            } );
                                        } )
                                    );

                                    if( err ) {
                                        Y.log(`Failed get schein data. Error: ${err.stack || err}`, "error", NAME);
                                    }

                                    if( !result ) {
                                        Y.log(`Could not get schein data`, "error", NAME);
                                    }

                                    if( result ) {
                                        item.patientName = `${result.patientFirstName} ${result.patientLastName}`;
                                        item.caseFolderId = result.caseFolderId;
                                        item.patientId = result.patientId;
                                        item.employeeName = result.employeeName;
                                    }
                                }
                            }
                            kbvlog.output = await mapKbvErrors( state.validationResults.errors, state.lines, kbvlog, user, "ERROR", invoiceConfig );
                        }

                        if( state.validationResults.warnings.length ) {
                            let err,
                                result;
                            for( let item of state.validationResults.warnings ) {
                                if( item.scheinId ) {
                                    // get patient data from schein
                                    [err, result] = await formatPromiseResult(
                                        new Promise( (resolve, reject) => {
                                            Y.doccirrus.api.activity.get( {
                                                user: args.user,
                                                query: {_id: item.scheinId},
                                                options: {
                                                    lean: true
                                                },
                                                callback: function( err, result ) {
                                                    var
                                                        schein = result && result[0];
                                                    if( err ) {
                                                        reject( err );
                                                    }
                                                    resolve( schein );
                                                }
                                            } );
                                        } )
                                    );

                                    if( err ) {
                                        Y.log(`Failed get schein data. Error: ${err.stack || err}`, "error", NAME);
                                    }

                                    if( !result ) {
                                        Y.log(`Could not get schein data`, "error", NAME);
                                    }

                                    if( result ) {
                                        item.patientName = `${result.patientFirstName} ${result.patientLastName}`;
                                        item.caseFolderId = result.caseFolderId;
                                        item.patientId = result.patientId;
                                        item.employeeName = result.employeeName;
                                    }
                                }
                            }
                            kbvlog.warnings = await mapKbvErrors( state.validationResults.warnings, state.lines, kbvlog, user, "WARNING", invoiceConfig );
                        }

                        if( state.krwValidation && state.krwValidation.errors && state.krwValidation.errors.length ) {
                            Y.log( 'going to map krw errors ' + state.krwValidation.errors.length + ' results', 'debug', NAME );
                            mapKRWErrors( state.krwValidation.errors, kbvlog, user );
                        }

                        if( state.ruleEngineResults && state.ruleEngineResults.length ) {
                            let err, result, invoiceLogRuleEntries;
                            Y.log( 'going to map rule engine ' + state.ruleEngineResults.length + ' results', 'debug', NAME );
                            for( let item of state.ruleEngineResults ) {

                                // get patient data
                                if( item.patientId ) {
                                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                        new Promise( (resolve, reject) => {
                                            Y.doccirrus.api.patient.get( {
                                                user: args.user,
                                                query: {_id: item.patientId},
                                                options: {
                                                    lean: true
                                                },
                                                callback: function( err, result ) {
                                                    var
                                                        patient = result && result[0];
                                                    if( err ) {
                                                        reject( err );
                                                    }
                                                    resolve( patient );
                                                }
                                            } );
                                        } )
                                    );

                                    if( err ) {
                                        Y.log(`Failed get patient data. Error: ${err.stack || err}`, "error", NAME);
                                    }

                                    if( !result ) {
                                        Y.log(`Could not get patient data`, "error", NAME);
                                    }

                                    if( result ) {
                                        item.patient = `${result.firstname} ${result.lastname}`;
                                    }
                                }

                                // get fact Id Codes data
                                if( item.ruleSetId ) {
                                    [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            action: 'get',
                                            model: 'rule',
                                            query: {
                                                _id: item.ruleSetId
                                            },
                                            options: {}
                                        } )
                                    );

                                    if( err ) {
                                        Y.log(`Failed get rules data. Error: ${err.stack || err}`, "error", NAME);
                                    }

                                    if( !result ) {
                                        Y.log(`Could not get rules data`, "error", NAME);
                                    }

                                    if( result ) {
                                        item.activity = result && result[0] && result[0].rules.filter((i) => {
                                            return i.ruleId === item.ruleId;
                                        });
                                    }
                                }
                            }

                            [err, invoiceLogRuleEntries] = await formatPromiseResult(Y.doccirrus.api.invoicelog.mapRuleEngineResults( user, state.ruleEngineResults, kbvlog,  "KBV", invoiceConfig ));
                            if( err ) {
                                Y.log(`Failed get map rule engine results for kbvlog ${kbvlog._id}. Error: ${err.stack || err}`, "error", NAME);
                            }
                            if(invoiceLogRuleEntries && invoiceLogRuleEntries.length) {
                                const errorsFromRulelog = invoiceLogRuleEntries.filter(invoiceLog => invoiceLog.ruleLogType === 'ERROR');
                                const warningsFromRulelog = invoiceLogRuleEntries.filter(invoiceLog => invoiceLog.ruleLogType === 'WARNING');
                                kbvlog.output = kbvlog.output.concat(errorsFromRulelog);
                                kbvlog.warnings = kbvlog.warnings.concat(warningsFromRulelog);
                            }
                        }

                        kbvErrors += kbvlog.output.length;
                        kbvWarnings += kbvlog.warnings.length;
                        kbvAdvices += kbvlog.advices && kbvlog.advices.length || 0;

                        if( kbvErrors ) {
                            kbvlog.status = "INVALID";

                        } else {
                            kbvlog.status = "VALID";
                        }

                        kbvlog.output = kbvErrors;
                        kbvlog.warnings = kbvWarnings;
                        kbvlog.advices = kbvAdvices;

                        kbvlog.conFileId = state.conFileId;
                        kbvlog.conFileName = state.conFileName;
                        kbvlog.statFiles = state.statFiles;
                        kbvlog.priceTotal = state.stats.priceTotal;
                        kbvlog.pointsTotal = state.stats.pointsTotal;
                        kbvlog.pricePerPatient = state.stats.pricePerPatient;
                        kbvlog.pointsPerPatient = state.stats.pointsPerPatient;

                        kbvlog.QPZ = resultsQPZ || '';

                        kbvlog._log_version = LATEST_LOG_VERSION;

                        if( isPreValidation ) {
                            kbvlog.notApproved = [
                                state.stats.nScheineNotApproved,
                                state.stats.nTreatmentsNotApproved,
                                state.stats.nDiagnosesNotApproved
                            ];
                        }

                        kbvlog.totalItems = state.stats.nQuarters + '/' + state.stats.nScheine + '/' + state.stats.nTreatments;
                    }

                    Y.doccirrus.invoicelogutils.saveInvoiceLog( kbvlog, user, 'kbvlog' ).then( function() {

                        if( kbvWarnings || kbvErrors || kbvAdvices ) {
                            msg.data.warnings.push( Y.doccirrus.errors.rest( '2011', {
                                $warnings: kbvWarnings.toString(),
                                $errors: kbvErrors.toString(),
                                $advices: kbvAdvices.toString()
                            } ) );
                        }

                        if( err ) {
                            let e = err.message ? {code: err.message} : err;
                            msg.data.errors.push( e );
                        }

                        notify( msg );
                        if( lateCallback ) {
                            return callback( err );
                        }
                    }, function( err ) {
                        Y.log( "Couldn't save KBV-Log: " + err, 'error', NAME );
                        msg.data.errors.push( Y.doccirrus.errors.rest( '500', err ) );
                        notify( msg );

                        if( lateCallback ) {
                            return callback( err );
                        }

                    } );
                }

                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.validate' ) && !(isPreValidation && Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.preValidate' )) ) {
                    return callback( accessError );
                }
                if( !params.id ) {
                    callback( Y.doccirrus.errors.http( 500, 'Missing Parameter: id' ) );
                    return;
                }
                Y.log( 'XPM dir set to ' + xpmPath, 'debug', NAME );

                let [ err, getLock] = await formatPromiseResult(
                    Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                        key: 'invoicing',
                        data: `kbvlog|${isPreValidation ? 'prevalidate' : 'validate'}|${user.U}|${(new Date()).getTime()}|0`
                    } )
                );
                if (err) {
                    Y.log(`validate KBV log: Error acquiring invoice log: ${err.stack || err}`, 'error', NAME);
                }
                if (!getLock || !getLock.length || 1 !== getLock[0]) {
                    return callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
                }

                runDb( {
                    model: 'invoiceconfiguration',
                    user: user,
                    options: {
                        limit: 1
                    }
                } ).then( function( config ) {
                    if( !config || !config.length ) {
                        throw new Error( 'No Invocie Config Found' );
                    }
                    invoiceConfig = config[0];

                    return runDb( {
                        user: user,
                        model: 'kbvlog',
                        query: {
                            _id: params.id
                        }
                    } );
                } ).then( function( kbvlogs ) {
                    let kbvlog,
                        validStatus = ['CREATED', 'VALID', 'INVALID', 'APPROVING', 'ENCRYPTED', 'SENT_ERR', 'VALIDATION_ERR', 'TIMEOUT', 'CANCELED'];

                    if( !kbvlogs || !kbvlogs.length ) {
                        throw new Y.doccirrus.commonerrors.DCError( 2031 );
                    }

                    kbvlog = kbvlogs[0];

                    if( !validStatus.includes( kbvlog.status ) ) {
                        throw new Y.doccirrus.commonerrors.DCError( 2035 );
                    }

                    Y.doccirrus.invoicelogutils.collectFileIds( kbvlog );

                    kbvlog.status = 'VALIDATING';
                    kbvlog.isPreValidated = isPreValidation;
                    kbvlog.isContentOutdated = false;
                    kbvlog.notApproved = [0, 0, 0];
                    kbvlog.totalItems = '';

                    kbvlog.QPZ = [];

                    kbvlog.conFileName = '';
                    kbvlog.conFileId = '';
                    kbvlog.xkmFileName = '';
                    kbvlog.xkmFileId = '';

                    kbvlog.statFiles = [];

                    kbvlog.pid = Y.doccirrus.ipc.pid();

                    // will be send to client after validation
                    logInfo.id = kbvlog._id.toString();
                    logInfo.isPreValidation = isPreValidation;
                    logInfo.commercialNo = kbvlog.commercialNo;
                    return Y.doccirrus.invoicelogutils.saveInvoiceLog( kbvlog, user, 'kbvlog' );
                } ).then( function( kbvlog ) {
                    let conFileIdsToDelete = [];
                    if (kbvlog.sourceConFiles) {
                        kbvlog.sourceConFiles.forEach(
                            function f(sourceConFile) {
                                conFileIdsToDelete.push(sourceConFile.conFileId);
                            });
                    }
                    // delete con and xkm from gridfs
                    return cleanFiles( user, fileIdsToDelete.concat(conFileIdsToDelete) ).then( function() {
                        kbvlog.sourceConFiles = [];
                        return kbvlog;
                    } );
                } ).then( function( kbvlog ) {
                    if( !lateCallback ) {
                        callback(); //eslint-disable-line callback-return
                    }

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: {
                            data: {
                                quarter: kbvlog.quarter,
                                year: kbvlog.year,
                                invoiceType: 'KBV',
                                action: 'validate',
                                state: 'started'
                            }
                        }
                    } );

                    Y.doccirrus.gkvprocess.start( {
                        user,
                        autoAssignmentOfDiagnosis: invoiceConfig.autoAssignmentOfDiagnosis,
                        kbvFocusFunctionalityKRW: invoiceConfig.kbvFocusFunctionalityKRW,
                        isPreValidation: isPreValidation,
                        invoiceLogId: kbvlog._id.toString(),
                        excludedPatientIds: kbvlog.excludedPatientIds || [],
                        excludedScheinIds: kbvlog.excludedScheinIds || [],
                        unknownInsuranceScheinIds: kbvlog.unknownInsuranceScheinIds || [],
                        quarter: kbvlog.quarter,
                        year: kbvlog.year,
                        invoiceConfig: invoiceConfig,
                        slType: kbvlog.slType,
                        slReferences: kbvlog.slReferences,
                        slLogId: kbvlog.slLogId,
                        slCommercialNo: kbvlog.slCommercialNo,
                        onProgress: function( progress ) {
                            onInvoiceProgress( user, kbvlog._id.toString(), progress );
                        },
                        mainLocationId: kbvlog.mainLocationId // kbvlog must store main locationId
                    } ).then( function( state ) {
                        Y.doccirrus.api.kbvlog.generateQPZ( {
                            user,
                            originalParams: {
                                kbvLog: kbvlog
                            },
                            callback: ( err, resultsQPZ ) => {
                                if( err ) {
                                    Y.log( `could not generate QPZ ${err}`, 'error', NAME );
                                }
                                // update kbvlog errors warnings etc. send socket.io
                                finish( null, kbvlog, state, resultsQPZ );
                            }
                        } );
                    } ).catch( function( err ) {
                        finish( err, kbvlog );
                    } );

                }, function( err ) {
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    if( 2035 === err.code || 2031 === err.code ) {
                        Y.log( err.message, 'warn', NAME );
                        callback( err );
                        return;
                    }
                    Y.log( 'Error setting kbv log status to "VALIDATING" ' + err, 'error', NAME );
                    callback( Y.doccirrus.errors.http( 500, 'Error setting kbv log status to "VALIDATING" ' ) );
                } ).catch( function(err) {
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    if( lateCallback ) {
                        return callback( err );
                    }
                    require( 'cluster' ).worker.kill();
                } );
            },

            deliverySettings: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.deliverySettings', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.deliverySettings');
                }
                var
                    callback = args.callback;

                function finalCb( err, settings ) {
                    if( err ) {
                        callback( Y.doccirrus.errors.rest( '2006' ) );
                        return;
                    }
                    callback( null, settings );
                }

                Y.doccirrus.api.gkv_deliverysettings.getDeliverySettings( {
                    user: args.user,
                    callback: finalCb
                } );
            },

            /**
             * encrypt attached to invoice log file(s)
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.originalParams
             * @param {Object} args.originalParams.id   id of a kbvlog entity
             * @param {Function} args.callback
             *
             * @return {Function} callback
             */
            encryptAccountStatement: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.encryptAccountStatement', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.encryptAccountStatement');
                }
                var
                    kbv,
                    user = args.user,
                    params = args.originalParams,
                    callback = args.callback;

                function fileSavedCb( err, fileId ) {

                    if( err ) {
                        Y.log( 'unable to store xkm file: ' + err, 'error', NAME );
                        return callback( Y.doccirrus.errors.http( 500, 'unable to store xkm file: ' + err ) );
                    }
                    kbv.xkmFileId = fileId;
                    kbv.lastUpdated = new Date();
                    kbv.status = err ? 'CRYPT_ERR' : 'ENCRYPTED';
                    kbv.user = {
                        name: user.U,
                        employeeNo: user.identityId
                    };

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'kbvlog',
                        action: 'put',
                        query: {
                            _id: kbv._id
                        },
                        fields: Object.keys( kbv ),
                        data: Y.doccirrus.filters.cleanDbObject( kbv )
                    }, function( err ) {
                        callback( err );
                    } );
                }

                function encryptCb( err, result ) {
                    if( err ) {
                        Y.log( 'while trying to encrypt KVDT payload: ' + err, 'error', NAME );
                        return callback( Y.doccirrus.errors.rest( '2013' ) );
                    }

                    Y.log( 'xkm encrypted', 'debug', NAME );
                    kbv.xkmFileName = result.fileName;
                    Y.doccirrus.invoicelogutils.storeFile( args.user, result.fileName, {
                        content_type: 'application/octet-stream',
                        metadata: {charset: 'ISO-8859-1'}
                    }, result.fileBinary, fileSavedCb );
                }

                function conFileCb( err, result ) {
                    if( err || !result || !result.data ) {
                        return callback( Y.doccirrus.errors.http( 500, 'could not find CON file' + err ) );
                    }

                    // KV-Connect test systems need test encryption mode to decrypt
                    const kvconnectConfig = Y.doccirrus.kvconnect.getConfig();
                    const isTest = kvconnectConfig && true === kvconnectConfig.test;

                    Y.doccirrus.xkm.encrypt( {
                        user: user,
                        query: {
                            mode: isTest ? 'TEST_Verschluesselung' : 'Abrechnungs_Verschluesselung',
                            fileName: kbv.conFileName,
                            fileBinary: result.data
                        },
                        callback: encryptCb
                    } );
                }

                function cleanedFilesCb( err ) {
                    if( err ) {
                        return callback( Y.doccirrus.errors.http( 500, err ) );
                    }
                    Y.doccirrus.gridfs.get( user, kbv.conFileId, conFileCb );
                }

                function kbvlogCb( err, kbvlog ) {
                    kbv = (kbvlog && kbvlog.length) ? kbvlog[0] : kbvlog;
                    if( err ) {
                        Y.log( 'no kbv log with id ' + params.id + ': ' + err, 'error', NAME );
                        return callback( Y.doccirrus.errors.http( 500, 'no kbv log with id ' + params.id + ': ' + err ) );
                    }
                    if( 'VALID' !== kbv.status || kbv.isPreValidated ){
                        return callback( new Y.doccirrus.commonerrors.DCError( 2036 ) );
                    }
                    if( kbv.xkmFileId.xkmFileId ) {
                        Y.doccirrus.invoicelogutils.cleanFiles( args.user, [kbv.xkmFileId], cleanedFilesCb );
                    } else {
                        cleanedFilesCb();
                    }
                }

                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.encryptAccountStatement' ) ) {
                    return callback( accessError );
                }

                if( !params.id ) {
                    callback( Y.doccirrus.errors.http( 500, 'Missing Parameter id' ) );
                    return;
                }

                if( Y.doccirrus.kvconnect.activated() ) {
                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'kbvlog',
                            query: {
                                _id: params.id
                            }
                        },
                        kbvlogCb );
                } else {
                    Y.log( 'KVConnect is not activated!', 'error', NAME );
                    return callback( Y.doccirrus.errors.rest( '2012' ) );
                }
            },

            /**
             * Sends kbv invoice via rest to kvconnect server.
             *
             * @param {Object}      args
             * @param {ObjectId}    args.id
             * @param {Object}            args.shippingType
             * @return {Promise<*>}
             */
            sendAccountStatement: async function sendAccountStatement( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvlog.sendAccountStatement', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvlog.sendAccountStatement' );
                }
                var
                    user = args.user,
                    callback = args.callback,
                    params = args.originalParams,
                    complete, replacement, test, kbvlog, deliverySettings;

                //  (1) Initial checks

                if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'kbvlog.sendAccountStatement' ) ) {
                    return handleResult( accessError, undefined, callback );
                }

                if( !params.id ) {
                    return handleResult( Y.doccirrus.errors.http( 500, 'Missing Parameter id' ), undefined, callback );
                }

                if( !params.shippingType ) {
                    return handleResult( Y.doccirrus.errors.http( 500, 'Missing Paramter shippingType' ), undefined, callback );
                }

                if( !Y.doccirrus.kvconnect.activated() ) {

                    Y.log( 'KVConnect is not activated!', 'error', NAME );
                    return handleResult( Y.doccirrus.errors.rest( '2012' ), undefined, callback );
                }

                //  (2) Get kbvlog object, check properties, load delivery settings, make envelope

                //  (2.1) Load the kbvlog from database

                let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    query: {
                        _id: params.id
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get kbvlog with id ${params.id}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                kbvlog = results && results[0];

                if( !kbvlog ) {
                    Y.log( 'Could not find kbvlog for sending account statement', 'error', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 500, 'Could not find kbvlog for sending account statement' ), undefined, callback );
                }

                if( !kbvlog.addressee ) {
                    return handleResult( Y.doccirrus.errors.rest( '2015' ), undefined, callback );
                }

                if( kbvlog.replacement ) {
                    complete = kbvlog.complete;
                    test = kbvlog.test;
                } else {
                    complete = ['INVOICE', 'TEST_INVOICE'].includes( params.shippingType );
                    test = ['TEST_INVOICE', 'TEST_PARTIAL_INVOICE'].includes( params.shippingType );
                }

                replacement = kbvlog.replacement;

                kbvlog.test = test;
                kbvlog.complete = complete;

                if( !kbvlog.replacement || !kbvlog.guid ) { // msut stay the same for all replacem,ents
                    kbvlog.guid = _generateGUID( kbvlog._id );
                }

                //  (2.2) Load delivery settings from database

                [err, deliverySettings] = await formatPromiseResult( runDb( {
                    user: user,
                    model: 'gkv_deliverysettings',
                    query: {
                        mainLocationId: kbvlog.mainLocationId
                    },
                    options: {
                        lean: 1,
                        limit: 1
                    }
                } ).get( 0 ) );

                if( err ) {
                    Y.log( `could not get gkv_deliverysettings for mainLocationId: ${kbvlog.mainLocationId}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( !deliverySettings ) {
                    return handleResult( Y.doccirrus.errors.rest( '2028' ), undefined, callback );
                }

                //  (2.3) Get xkm file from gridFS

                [err, results] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.gridfs.get( user, kbvlog.xkmFileId, ( err, result ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( result );
                        }
                    } );
                } ) );

                if( err || !results || !results.data ) {
                    Y.log( 'Could not get xkm file ' + (err || 'File Not Found'), 'warn', NAME );
                    return handleResult( Y.doccirrus.errors.rest( 500, 'Could not get xkm file' ), undefined, callback );
                }

                //  (4) Update kbv object to record new status once xkm file is sent
                //  additionally, create INVOICEREFGKV activities referencing this from patient casefolders

                let message;
                [err, message] = await  formatPromiseResult( Y.doccirrus.kvconnect.service.oneClick.send( {
                    user,
                    kbvlogId: kbvlog._id.toString(),
                    version: kbvlog.version,
                    guid: kbvlog.guid,
                    commercialNo: kbvlog.commercialNo,
                    quarter: kbvlog.quarter,
                    year: kbvlog.year,
                    complete, replacement, test,
                    sender: kbvlog.sender,
                    addressee: kbvlog.addressee,
                    xkmFileName: kbvlog.xkmFileName,
                    xkmFileBinary: results.data,
                    username: deliverySettings.kvcUsername
                } ) );


                kbvlog.lastUpdate = message && message.sentAt || (new Date());
                kbvlog.status = err ? 'SENT_ERR' : 'SENT';

                if( !err ) {
                    kbvlog.sentId = message && message.messageId;
                    kbvlog.delivered = message && message.sentAt;
                }

                let putErr;
                [putErr] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'put',
                    query: {
                        _id: kbvlog._id
                    },
                    fields: Object.keys( kbvlog ),
                    data: Y.doccirrus.filters.cleanDbObject( kbvlog )
                } ) );

                //  Create INVOICEREFGKV activities
                createReferenceActivities( {
                    user,
                    originalParams: {kbvlogId: kbvlog._id},
                    callback: ( _err, result ) => {
                        if( _err ) {
                            Y.log( 'Problem creating INVOICEREFGKV activities: ' + JSON.stringify( _err ), 'warn', NAME );
                        } else {
                            Y.log( 'Created INVOICEREFGKV activities: ' + JSON.stringify( result ), 'debug', NAME );
                        }
                    }
                } );

                if( err || putErr ) {
                    return handleResult( Y.doccirrus.errors.http( 500, err ? `unable to send delivery: ${err}` : `unable to persist delivery: ${putErr}` ), undefined, callback );
                }

                return handleResult( null, undefined, callback );
            },
            processMessage: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.processMessage', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.processMessage');
                }
                var user = args.user,
                    params = args.params,
                    kvcmessage = params.message,
                    callback = args.callback || (() => {
                    }),
                    tenantId = user.tenantId,
                    kbvlog, logInfo = {},
                    now = new Date();

                Y.log( 'processing kvcmessage ' + JSON.stringify( kvcmessage ) + ' for user' + JSON.stringify( user ), 'debug', NAME );

                function setSentErr( result, cb ) {
                    // set SENT_ERR, s
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'kbvlog',
                        action: 'put',
                        query: {
                            _id: kbvlog._id,
                            status: 'SENT'
                        },
                        fields: ['status'],
                        data: Y.doccirrus.filters.cleanDbObject( {
                            status: 'SENT_ERR'
                        } )
                    }, function( err ) {
                        Y.log( `processing kvcmessage report sent error ended with ${ err ? 'error: ' + err : 'success'}`, 'info', NAME );
                        cb( null, result );
                    } );

                }

                function kbvlogCb( err, logs ) {
                    if( err ) {
                        Y.log( 'could not process kvcmessage, an error occurred while getting kbvlog for sentId ' + kvcmessage.originalMessageId, 'error', NAME );
                        callback( err );
                        return;
                    }
                    if( !logs || !logs.length ) {
                        let err = new Y.doccirrus.commonerrors.DCError( 2029, {data: {$messageId: kvcmessage.originalMessageId}} );
                        Y.log( err.message, 'warn', NAME );
                        callback( err );
                        return;
                    }

                    kbvlog = logs[0];

                    let result = {kbvlogId: kbvlog._id.toString()};

                    // for none MDNs the journey ends here
                    if( 'PARSED' !== kvcmessage.messageStatus ) {
                        Y.log( `processing for kvcmessage: ${kvcmessage._id} done: message seems to be already process. returning match kbvlog ${kbvlog._id} anyway and do not change kbvlog status`, 'debug', NAME );
                        callback( null, result );
                        return;
                    }
                    // if something wents really wrong
                    if( 'UNKNOWN' === kvcmessage.messageType && 0 < kvcmessage._errors.length ) {
                        Y.log( `processing for kvcmessage: ${kvcmessage._id} done: message contains errors so return early with matched kbvlog ${kbvlog._id} and change kbvlog status to SENT_ERR`, 'debug', NAME );
                        setSentErr( result, callback );
                        return;
                    }

                    // TODOOO kvc check if delSet destination kv sends also FEEDBACK. then next check should be different
                    if( 'MDN' !== kvcmessage.messageType ) {
                        Y.log( `processing for kvcmessage: ${kvcmessage._id} done: non MDN found return early with matched kbvlog ${kbvlog._id} and do not change kbvlog status`, 'debug', NAME );
                        callback( null, result );
                        return;
                    }

                    logInfo.id = kbvlog._id.toString();
                    logInfo.commercialNo = kbvlog.commercialNo;

                    if( kvcmessage._errors && kvcmessage._errors.length ) {
                        kbvlog.status = 'REJECTED';
                    } else {
                        kbvlog.status = 'ACCEPTED';
                    }

                    kbvlog.lastUpdate = now;
                    kbvlog.responded = now;
                    kbvlog.from = kvcmessage.from;

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'kbvlog',
                        action: 'put',
                        query: {
                            _id: kbvlog._id
                        },
                        fields: Object.keys( kbvlog ),
                        data: Y.doccirrus.filters.cleanDbObject( kbvlog )
                    }, function( err ) {
                        Y.log( 'processing kvcmessage ' + (err ? ('failed on save with error ' + err) : 'succeeded' ), 'info', NAME );
                        emitEventToAdminsInTenant( tenantId, kvcmessage, logInfo );
                        callback( null, result );
                    } );
                }

                if( !kvcmessage ) {
                    Y.log( 'could not process message, no message passed!', 'error', NAME );
                    callback( new Error( 'no message passed' ) );
                    return;
                }

                let
                    kbvlogQuery;

                if( kvcmessage.originalMessageId ) {
                    kbvlogQuery = {
                        sentId: {$regex: kvcmessage.originalMessageId, $options: 'i'}
                    };
                } else if( 'FEEDBACK' === kvcmessage.messageType ) {
                    let result = Y.doccirrus.schemas.kvcmessage.getGUIDAnVersionFromFeedbackAttachments( kvcmessage );
                    if( null !== result ) {
                        kbvlogQuery = {
                            guid: result.guid,
                            version: +result.version
                        };
                    }
                }

                if( !kbvlogQuery ) {
                    Y.log( 'could not process message, no originalMessageId or "begleitdatei" found in message ' + JSON.stringify( kvcmessage ), 'error', NAME );
                    callback( new Error( 'no originalMessageId set' ) );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    query: kbvlogQuery
                }, kbvlogCb );

            },

            remove: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbvlog.remove', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbvlog.remove');
                }
                const
                    user = args.user,
                    params = args.originalParams,
                    callback = args.callback;

                Y.doccirrus.invoicelogutils.removeInvoiceLog( {
                    user: user,
                    invoiceLogId: params && params.id,
                    testFn: ( kbvlog ) => {
                        return -1 !== ['CREATED', 'VALID', 'VALIDATION_ERR', 'CRYPT_ERR', 'ENCRYPTED', 'INVALID', 'MERGING_ERR', 'MERGED'].indexOf( kbvlog.status );
                    },
                    model: 'kbvlog'
                } ).then( () => callback( null ) ).catch( err => callback( err ) );

            },
            kbvlogDestinationChanged,
            generateQPZ
        };

        Y.doccirrus.auth.onReady( function() {
            var cluster = require( 'cluster' );
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                return;
            }
            if( cluster.isMaster ) {
                createKbvTmpDirs();
            }
        } );

    },
    '0.0.1', {requires: ['dcmongooseutils', 'gkv_deliverysettings-schema', 'dcerror', 'dckbvutils', 'dckrwvalidator', 'dcgridfs', 'dcinvoicelogutils', 'DCSocketIO', 'dckvconnectutils', 'settings-schema', 'dclicmgr', 'dcutils', 'KVConnectManager', 'xkm']}
);
