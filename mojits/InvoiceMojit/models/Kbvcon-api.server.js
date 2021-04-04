/*global YUI */


YUI.add( 'kbvConFiles-api', function( Y, NAME ) {

        const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        Y.namespace( 'doccirrus.api' ).kbvConFiles = {
            delete: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.kbvlog.delete', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvlog.remove' );
                }
                let
                    {originalParams, user, callback} = args;

                if( !originalParams.length ) {
                    return handleResult( Y.doccirrus.errors.rest( 404, 'Parameter is missing', true ), undefined, callback );
                }
                Y.log( 'KbvCon-Api: delete: originalParams' + originalParams, 'debug', NAME );

                let [errDeletion] = await formatPromiseResult( Promise.all( originalParams.map( async ( mediaObj ) => {
                    if (!mediaObj.isMainMergeFile){
                        let [err] = await formatPromiseResult(
                            new Promise( ( resolve, reject ) => Y.doccirrus.media.gridfs.removeFile(
                                user, mediaObj.mediaId, false, ( err, res ) => {
                                    if( err ) {
                                        return reject( err );
                                    }
                                    resolve( res );
                                }
                            ) ) );
                        if( err ) {
                            Y.log( `error in deleting file ${mediaObj.mediaId} .\n${err && err.stack || err}`, 'error', NAME );
                            return handleResult( err, undefined, callback );
                        }
                    }
                } ) ) );
                if( errDeletion ) {
                    Y.log( `error in deleting files  .\n${errDeletion && errDeletion.stack || errDeletion}`, 'error', NAME );
                    return handleResult( errDeletion, undefined, callback );
                }
                return handleResult( null, true, callback );
            },
            /**
             * User: do
             * Date: 09.07.20  08:28
             * (c) 2012, Doc Cirrus GmbH, Berlin
             *
             * goal outPutFilePath string (absolut)
             * files = input files as array (absolut)
             * @param {String} outPutFilePath
             * @param {String} files
             * @param {Boolean} keepBsnr
             */
            _doMerge: async function( outPutFilePath, files, keepBsnr ) {
                const START_CON0 = 'con0';
                const START_BESA = 'besa';
                const START_RVSA = 'rvsa';
                const START_ADT0 = 'adt0';
                const START_ADT9 = 'adt9';
                const START_CON9 = 'con9';
                const blockNameRegex = /^\d\d\d8000([a-z0-9]+)/gm;
                const getBlockName = ( line ) => {
                    const match = blockNameRegex.exec( line.toString() );
                    const blockName = match && match[1];
                    return blockName;
                };

                const util = require( 'util' );
                const fs = require( 'fs' );
                const appendFile = util.promisify( fs.appendFile );

                const eachLine = function( path, iterator ) {
                    let pending = false;
                    return new Promise( ( resolve, reject ) => {
                        let buff = Buffer.concat( [] );
                        const readStream = fs.createReadStream( path );

                        async function getLines() {
                            let indexLineSeparator = buff.indexOf( Buffer.from( '\r\n' ) );
                            if( indexLineSeparator >= 0 ) {
                                indexLineSeparator += 2;
                                const lineBuffer = Buffer.allocUnsafe( indexLineSeparator );
                                const tmp = Buffer.allocUnsafe( buff.length - indexLineSeparator );
                                buff.copy( lineBuffer, 0, 0, indexLineSeparator );
                                buff.copy( tmp, 0, indexLineSeparator );
                                buff = tmp;
                                await iterator( lineBuffer );
                                return getLines();
                            }
                        }

                        function endStream() {
                            if( pending ) {
                                setTimeout( endStream, 1000 );
                            } else {
                                resolve();
                            }
                        }

                        readStream.on( 'data', async function( data ) {
                            pending = true;
                            this.pause();
                            buff = Buffer.concat( [buff, data] );
                            await getLines();
                            this.resume();
                            pending = false;
                        } );

                        readStream.on( 'end', endStream );
                        readStream.on( 'error', function( err ) {
                            reject( err );
                        } );
                    } );
                };

                async function writeLine( originalFilePath, mode, line ) {
                    const targetFilePath = `${originalFilePath}.${mode}`;
                    return appendFile( targetFilePath, line );
                }

                async function splitFile( filePath ) {
                    let MODE = null;
                    return eachLine( filePath, async function( line ) {
                        const blockName = getBlockName( line );

                        if( ['0101', '0102', '0103', '0104'].includes( blockName ) && MODE === START_ADT0 ) {
                            MODE = 'schein';
                        }

                        switch( blockName ) {
                            case START_CON0:
                            case START_BESA:
                            case START_RVSA:
                            case START_ADT0:
                            case START_ADT9:
                            case START_CON9:
                                MODE = blockName;
                                break;
                            default:
                                return writeLine( filePath, MODE, line );
                        }
                    } );
                }

                async function main() {
                    // eslint-disable-next-line no-unused-vars
                    for( let file of files ) {
                        await splitFile( file );
                    }
                    await appendFile( outPutFilePath, '0138000con0\r\n' );
                    await eachLine( `${files[0]}.${START_CON0}`, async function( line ) {
                        await appendFile( outPutFilePath, line );
                    } );
                    await appendFile( outPutFilePath, '0138000besa\r\n' );
                    // eslint-disable-next-line no-unused-vars
                    let besaFiles = keepBsnr ? [files[0]] : files;
                    for( let file of besaFiles) {
                        await eachLine( `${file}.${START_BESA}`, async function( line ) {
                            await appendFile( outPutFilePath, line );
                        } );
                    }
                    await appendFile( outPutFilePath, '0138000rvsa\r\n' );
                    // eslint-disable-next-line no-unused-vars
                    for( let file of files ) {
                        await eachLine( `${file}.${START_RVSA}`, async function( line ) {
                            await appendFile( outPutFilePath, line );
                        } );
                    }
                    await appendFile( outPutFilePath, '0138000adt0\r\n' );
                    await eachLine( `${files[0]}.${START_ADT0}`, async function( line ) {
                        await appendFile( outPutFilePath, line );
                    } );
                    // eslint-disable-next-line no-unused-vars
                    for( let file of files ) {
                        try {
                            await eachLine( `${file}.schein`, async function( line ) {
                                await appendFile( outPutFilePath, line );
                            } );
                        } catch( err ) {
                            if( err.code !== 'ENOENT' ) {
                                throw(err);
                            }
                        }
                    }
                    await appendFile( outPutFilePath, '0138000adt9\r\n0138000con9\r\n' );

                    return 0;
                }

                return await main();
            },
            /**
             * scan .CON files for doublespendings of 5001 blocks and delet duplicates
             *
             * @param {String} FilePath of merged CON File
             * @param {Boolean} show lines which has been deleted in protocol.
             * @returns {Object} {foundDoubleSpending {Boolean},  filePathScan {String} , filePathScanProtocol {String} }
             */
            _scanForDoubleSpendings: async function( file, detailed = false ) {

                const START_CON0 = 'con0';
                const START_BESA = 'besa';
                const START_RVSA = 'rvsa';
                const START_ADT0 = 'adt0';
                const START_ADT9 = 'adt9';
                const START_CON9 = 'con9';

                const protocol = {};
                const toWatch5001 = [
                    "03001",
                    "03002", "03003", "03004", "03005", "03220", "03221", "18210", "18211",
                    "18212", "18220", "18222", "08210", "08211", "08212", "08220", "08222", "08227",
                    "08230", "08231", "26210", "26211", "26212", "26220", "26222", "26227", "09210",
                    "09211", "09212", "09220", "09222", "09227", "04001", "04002", "04221", "04222",
                    "13490", "13491", "13492", "13494", "13497"];

                const contextToSave = {
                    surname: '3101',
                    name: '3102',
                    dob: '3103',
                    scheinid: '3003',
                    insurenceNumber: '3105',
                    patientnumber: '3000'
                };

                let foundDoubleSpending = false;
                let lineNumber = 0;
                let gpObj = { // GRUNDPAUSCHAL OBJ
                    line: null,
                    subBlock: []
                };
                let subGpObj = {
                    line: null,
                    subBlock: []
                };
                let writeToFile = true;
                let context = {};

                const getFkAndValue = ( line ) => { // FELDKENNUNG
                    line = line.toString();
                    return [line.substring( 3, 7 ), line.substring( 7, line.length - 2 )];
                };

                let fileName = file.substr( 0, file.length - 4 );
                let filePathScan = fileName + '_scan.CON';
                let filePathScanProtocol = fileName + '_scan.JSON';

                const util = require( 'util' );
                const fs = require( 'fs' );
                const appendFile = util.promisify( fs.appendFile );

                let concatGpObjToWriteLine = ( gpObj ) => {
                    // For one 5000 Block
                    let res = '';
                    if( gpObj.line ) {
                        res = gpObj.line;
                        // For every 5001 Block
                        gpObj.subBlock.forEach( item => {
                            res += item.line;
                            // for every Line in  5001 block
                            item.subBlock.forEach( ( subline ) => {
                                res += subline;
                            } );
                        } );

                    }
                    return res;
                };
                let filterGpObj = ( gpObj ) => {
                    let fkAndValue1,
                        details,
                        lineNum,
                        subBlock;
                    if( gpObj.subBlock.length ) {
                        let i;
                        for( i = 0; i < gpObj.subBlock.length; i++ ) {
                            subGpObj = gpObj.subBlock[i];
                            fkAndValue1 = getFkAndValue( subGpObj.line );
                            if( toWatch5001.includes( fkAndValue1[1] ) ) {

                                let contextID = context.name + '.' + context.surname + '.' + context.dob;

                                // write protocol context
                                if( !protocol[contextID] ) {
                                    protocol[contextID].context = context;
                                    protocol[contextID].zugehoerigePauschalen = {};
                                }

                                // add protocol grundpauschale / zusatzpauschale OR delete lines.
                                if( !protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]] ) {
                                    // no duplication detected

                                    protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]] = [{['Zeile: ' + subGpObj.lineNumber]: 'Block gefunden'}];
                                } else {
                                    // duplication detected
                                    foundDoubleSpending = true;
                                    if( detailed ) {
                                        details = {['Zeile: ' + subGpObj.lineNumber]: subGpObj.line.toString().substring( 0, subGpObj.line.toString().length - 2 )};
                                        lineNum = subGpObj.lineNumber;
                                        for( let j = 0; j < subGpObj.subBlock.length; j++ ) {
                                            details['Zeile: ' + (lineNum + 1 + j)] = subGpObj.subBlock[j].toString().substring( 0, subGpObj.subBlock[j].toString().length - 2 );
                                        }
                                        protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]].push( {
                                            ['Zeile: ' + subGpObj.lineNumber]: {
                                                state: 'Block gelöscht',
                                                deleted: details
                                            }
                                        } );
                                    } else {
                                        protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]].push( {['Zeile: ' + subGpObj.lineNumber]: 'Block gelöscht'} );
                                    }
                                    gpObj.subBlock[i].delete = true;
                                }
                            }
                        }
                        for( i = gpObj.subBlock.length - 1; i >= 0; i-- ) {
                            subBlock = gpObj.subBlock[i];
                            if( subBlock.delete === true ) {
                                gpObj.subBlock.splice( i, 1 );
                            }
                        }
                        if( !gpObj.subBlock.length ) {
                            //delete 5000 header as well.
                            gpObj.line = null;
                        }
                        return gpObj;
                    }
                };
                const eachLine = function( path, iterator ) {
                    let pending = false;
                    return new Promise( ( resolve, reject ) => {
                        let buff = Buffer.concat( [] );
                        const readStream = fs.createReadStream( path );

                        async function getLines() {
                            let indexLineSeparator = buff.indexOf( Buffer.from( '\r\n' ) );
                            if( indexLineSeparator >= 0 ) {
                                indexLineSeparator += 2;
                                const lineBuffer = Buffer.allocUnsafe(
                                    indexLineSeparator );
                                const tmp = Buffer.allocUnsafe( buff.length -
                                                                indexLineSeparator );
                                buff.copy( lineBuffer, 0, 0, indexLineSeparator );
                                buff.copy( tmp, 0, indexLineSeparator );
                                buff = tmp;
                                await iterator( lineBuffer );
                                return getLines();
                            }
                        }

                        function endStream() {
                            if( pending ) {
                                setTimeout( endStream, 1000 );
                            } else {
                                resolve();
                            }
                        }

                        readStream.on( 'data', async function( data ) {
                            pending = true;
                            this.pause();
                            buff = Buffer.concat( [buff, data] );
                            await getLines();
                            this.resume();
                            pending = false;
                        } );

                        readStream.on( 'end', endStream );
                        readStream.on( 'error', function( err ) {
                            reject( err );
                        } );
                    } );
                };

                async function writeLine( originalFilePath, mode, line ) {
                    const targetFilePath = `${originalFilePath}${mode}`;
                    return appendFile( targetFilePath, line );
                }

                async function parseFile( filePath ) {
                    let MODE = null;
                    return eachLine( filePath, async function( line ) {
                        let fkAndValue = getFkAndValue( line ); // returns Feldkennung and Value of that.
                        let fk5xxx = Boolean( fkAndValue[0].match( /5\d\d\d/ ) );
                        lineNumber++;

                        switch( fkAndValue[0] ) {
                            case '0101': // DATENPAKETE
                            case '0102':
                            case '0103':
                            case '0104':
                                MODE = 'schein';
                                break;
                            case START_CON0:
                            case START_BESA:
                            case START_RVSA:
                            case START_ADT0:
                            case START_ADT9:
                            case START_CON9:
                                MODE = fkAndValue[0];
                                break;
                        }

                        if( MODE === 'schein' ) {
                            // build context
                            for( const [key, fk] of Object.entries( contextToSave ) ) {
                                if( fkAndValue[0] === fk ) {//strLine.includes( fk ) ) {

                                    context[key] = fkAndValue[1]; // insert found match
                                    if( context.name && context.surname && context.dob ) {
                                        let contextID = context.name + '.' + context.surname + '.' + context.dob;
                                        if( !protocol[contextID] ) {
                                            protocol[contextID] = {};
                                            protocol[contextID].context = context;
                                            protocol[contextID].zugehoerigePauschalen = {};
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        // Found 5xxx

                        if( fk5xxx ) {
                            writeToFile = false;
                            if( fkAndValue[0] === '5000' ) {
                                // create grundpausch Obj
                                gpObj = {
                                    lineNumber: lineNumber,
                                    line: line,
                                    subBlock: []
                                };

                            } else if( fkAndValue[0] === '5001' ) {

                                if( subGpObj.line !== null ) {
                                    gpObj.subBlock.push( subGpObj );
                                }

                                // create new grundpauschale block
                                subGpObj = {
                                    lineNumber: lineNumber,
                                    line: line,
                                    subBlock: []
                                };

                            } else {
                                subGpObj.subBlock.push( line );
                            }

                        } else {
                            // no 5xxx
                            if( gpObj.line !== null ) {
                                if( subGpObj.line ) {
                                    gpObj.subBlock.push( subGpObj );
                                }

                                // extend Protocol
                                // filter Object
                                gpObj = filterGpObj( gpObj );

                                //write object to file
                                line = concatGpObjToWriteLine( gpObj ) + line;
                                writeToFile = true;

                                // reset gpObj
                                subGpObj = {
                                    line: null,
                                    subBlock: []
                                };
                                gpObj = {
                                    line: null,
                                    subBlock: []
                                };
                            }

                        }

                        if( writeToFile ) {
                            return writeLine( filePathScan, '', line );
                        }
                    } );
                }

                async function main() {
                    await parseFile( file );
                    Object.keys( protocol ).forEach( function( key ) {
                        if( Object.keys( protocol[key].zugehoerigePauschalen ).length === 0 ) {
                            delete protocol[key];
                        }
                    } );

                    fs.writeFileSync( filePathScanProtocol, JSON.stringify( protocol, null, 2 ), 'utf-8' );

                    return ({foundDoubleSpending, filePathScan, filePathScanProtocol});

                }

                return await main();
            },
            _readFromDbAndAddConFileId: async function( mediaObjs, tmpDir, user ) {
                let newMediaObjs = [];

                await Promise.all( mediaObjs.map( async ( mediaObj ) => {
                    let
                        tempPath = `${tmpDir}${mediaObj.filename}`;

                    let [err, filePath] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => Y.doccirrus.media.gridfs.exportFile(
                            user,
                            mediaObj.mediaId,
                            tempPath,
                            false,
                            ( err, res ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve( res );
                            } ) ) );

                    if( err ) {
                        Y.log( `error in loading file ${mediaObj} .\n${err && err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                    newMediaObjs.push( {
                        ...mediaObj,
                        filePath
                    } );
                } ) );

                let [errFiles, files] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'fs.files',
                    query: {
                        filename: {$in: newMediaObjs.map( newMediaObj => newMediaObj.mediaId )}
                    }

                } ) );
                if( errFiles || !files.length ) {
                    let err = errFiles || Y.doccirrus.errors.rest( 2039, 'mediaFiles not found', true );
                    Y.log( `error while loading mediaFiles for user: ${user.id} ${err && err.stack || err}`, 'error', NAME );
                    throw err;
                }

                for( let i = 0; i < newMediaObjs.length; i++ ) {
                    if( !newMediaObjs[i].conFileId ) {
                        files.map( file => {
                            if( newMediaObjs[i].mediaId === file.filename ) {
                                newMediaObjs[i].conFileId = file._id;
                            }
                        } );
                    } else {
                        // make sure isMainMergeFile comes first
                        if( 0 !== i ) {
                            let tmp = newMediaObjs[0];
                            newMediaObjs[0] = newMediaObjs[i];
                            newMediaObjs[i] = tmp;
                        }
                    }
                }
                return newMediaObjs;
            },

            _doValidation: async function( outPutFilePath, tmpDir, year, quarter ) {
                let pm;
                try {
                    pm = Y.doccirrus.xpm.getPm( {
                        type: 'KVDT',
                        quarter: quarter,
                        year: year
                    } );
                } catch( err ) {
                    Y.log( `error in loading kbv pruefmodul ${err} .\n${err && err.stack || err}`, 'error', NAME );
                    return (err);
                }

                return pm.execute( {
                    input: outPutFilePath,
                    tmpDir: tmpDir.path,
                    parseAuditLog: 'PDT',
                    kvdtStats: {
                        cases: true,
                        gnr: true,
                        bracket: true,
                        delivery: true,
                        errors: true,
                        schein: true,
                        sort: true,
                        ueschein: true,
                        uescheinplus: true
                    }
                } );
            },
            _onMergeProcess: function( user, id, progress ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                    msg: {
                        data: {
                            invoiceType: 'KBV',
                            action: 'merge',
                            state: 'progress',
                            progress: progress,
                            id: id
                        }
                    }
                } );
            },
            merge: async function( args ) {

                Y.log( 'Entering Y.doccirrus.api.kbvlog.merge', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbvlog.merge' );
                }

                let
                    self = this,
                    {originalParams, user, callback} = args,
                    filesFromMediaUpload = originalParams.files || [],

                    kbvLogId = originalParams.KbvLogId,
                    keepBsnr = originalParams.keepBsnr || false,
                    checkForDoubleSpendings = originalParams.flatfee || false,
                    tmpDir = await Y.doccirrus.tempFileManager.get( args.user, 'pm' ),
                    storeFile = Y.doccirrus.invoicelogutils.storeFile,
                    fs = require( 'fs' ).promises,
                    bufferOutputFile,
                    outPutFilePath,
                    errScanProtocolID, scanProtocolID,
                    valStatFiles = [];
                Y.log( 'KbvCon-Api: merge: 0. originalParams' + JSON.stringify( originalParams ), 'debug', NAME );

                if( !kbvLogId ) {
                    Y.log( `KbvCon-api.server error: KbvLogId is ${kbvLogId}. for user: ${user}`, NAME );
                    return handleResult( Y.doccirrus.errors.rest( 404, 'KbvLogId is missing', true ), undefined, callback );
                }

                if( filesFromMediaUpload.length < 2 ) {
                    Y.log( `KbvCon-api.server error: Less then two CON-Files have been uploaded. ${filesFromMediaUpload} ${user}`, NAME );
                    return handleResult( Y.doccirrus.errors.rest( 404, 'Please upload at least one CON-File to merge with original file', true ), undefined, callback );
                }

                // 0. GET KBVLOG with ID and PERFORM CHECKS

                let [errkbvLogEntry, kbvLogEntry] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    query: {
                        _id: kbvLogId
                    }
                } ) );
                if( errkbvLogEntry || !kbvLogEntry.length ) {
                    let err = errkbvLogEntry || Y.doccirrus.errors.rest( 404, 'kbvlog not found', true );
                    Y.log( `KbvCon-api.server error: KBVLogEntry for id: ${kbvLogId} not found. ${kbvLogEntry} user: ${user} ${err && err.stack || err}`, `warn`, NAME );
                    return handleResult( err, undefined, callback );
                }
                kbvLogEntry = kbvLogEntry[0];

                if( !kbvLogEntry ) {
                    Y.log( `KbvCon-api.server error: KbvLog with ID: ${kbvLogId} not found. for user: ${user}`, NAME );
                    return handleResult( Y.doccirrus.errors.rest( 404, 'KbvLogId: ' + kbvLogId + ' not found', true ), undefined, callback );
                }
                if( kbvLogEntry.status !== 'VALID' ) {
                    Y.log( `KbvCon-api.server error in KbvLog ${kbvLogId} status ${kbvLogEntry.status} should be valid. For user: ${user}`, NAME );
                    return handleResult( Y.doccirrus.errors.rest( 500, `KbvCon-api.server error in KbvLog ${kbvLogId}  with  should be valid but has status ${kbvLogEntry.status}.`, true ), undefined, callback );
                }
                kbvLogEntry.status = 'MERGING';
                kbvLogEntry.pid = Y.doccirrus.ipc.pid();
                let [errPutKbvlog] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'put',
                    query: {
                        _id: kbvLogId
                    },
                    fields: ["status", "pid"],
                    data: Y.doccirrus.filters.cleanDbObject( kbvLogEntry )
                } ) );
                if( errPutKbvlog ) {
                    Y.log( `error in updating KbvLog Status = MERGING for id ${kbvLogId} for user: ${user} .\n${errKbvlog && errKbvlog.stack || errKbvlog}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2041' ) );
                    return handleResult( errKbvlog, undefined, callback );
                }
                handleResult( null, null, callback );

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                    msg: {
                        data: {
                            quarter: kbvLogEntry.quarter,
                            year: kbvLogEntry.year,
                            invoiceType: 'KBV',
                            action: 'merge',
                            state: 'started'
                        }
                    }
                } );

                // CHANGE NAME OF ORGINAL FILE
                filesFromMediaUpload[0].filename = 'ORIG_' + filesFromMediaUpload[0].filename; // overwrite

                Y.log( 'KbvCon-Api: merge: 0. kbvLogEntry' + JSON.stringify( kbvLogEntry ), 'debug', NAME );

                // 1. Read all .CON-FILES from gridFs in parallel and wait till everything is finished.
                // gridFs operates filenames media upload uses own ids kbvLog uses Filename
                let [errFilesToMerge, filesToMerge] = await formatPromiseResult( self._readFromDbAndAddConFileId( filesFromMediaUpload, tmpDir.path + '/', user ) );
                if( errFilesToMerge ) {
                    Y.log( `ERROR: KbvCon-Api: _readFromDbAndAddConFileId: error in reading files from DB  ${filesFromMediaUpload} ${errFilesToMerge && errFilesToMerge.stack || errFilesToMerge}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2040' ) );
                    return 0;
                }
                Y.log( 'KbvCon-Api: merge: 1. filesToMerge' + JSON.stringify( filesToMerge ), 'debug', NAME );

                // 2. merge files

                outPutFilePath = tmpDir.path + '/' + kbvLogEntry.conFileName;
                let [errMerge] = await formatPromiseResult( self._doMerge( outPutFilePath, filesToMerge.map( file => file.filePath ), keepBsnr ) );
                if( errMerge ) {
                    Y.log( `ERROR: KbvCon-Api: _doMerge: ${errMerge && errMerge.stack || errMerge}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2042' ) );
                    return 0;
                }
                Y.log( 'KbvCon-Api: merge: 2. outPutFilePath ' + outPutFilePath, 'debug', NAME );

                // 3. Scan merged Con File checkForDoubleSpendings
                if( checkForDoubleSpendings ) {
                    let [errfoundDoubleSpending, resCheckForDoubleSpendings] = await formatPromiseResult( self._scanForDoubleSpendings( outPutFilePath, true ) );
                    if( errfoundDoubleSpending ) {
                        Y.log( `ERROR: KbvCon-Api: _scanForDoubleSpendings: ${errfoundDoubleSpending && errfoundDoubleSpending.stack || errfoundDoubleSpending}`, 'error', NAME );
                        self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2045' ) );
                        return 0;
                    }
                    if( resCheckForDoubleSpendings.foundDoubleSpending ) {
                        // update con file only if doublespendings are found
                        outPutFilePath = resCheckForDoubleSpendings.filePathScan;
                    }
                    Y.log( 'KbvCon-Api: _scanForDoubleSpendings: 3. outPutFilePath ' + outPutFilePath, 'debug', NAME );

                    // add protocol always to file
                    bufferOutputFile = await fs.readFile( resCheckForDoubleSpendings.filePathScanProtocol );

                    [errScanProtocolID, scanProtocolID] = await formatPromiseResult( storeFile(
                        args.user,
                        kbvLogEntry.conFileName + '.json',
                        {content_type: 'application/txt'},
                        bufferOutputFile ) );
                    if( errScanProtocolID ) {
                        Y.log( `Error: KbvCon-Api: _scanForDoubleSpendings:  saving scan protocol file to DB: ${errScanProtocolID && errScanProtocolID.stack || errScanProtocolID}`, 'error', 'warn', NAME );
                        self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2043' ) );
                        return 0;
                    }
                }

                self._onMergeProcess( user, kbvLogId, {
                    total: 3,
                    current: 2,
                    durationElapsed: 0,
                    type: 'mergeValidate'
                } );

                // 3. Do Validation
                let [errValResults, valResults] = await formatPromiseResult( self._doValidation( outPutFilePath, tmpDir, kbvLogEntry.year, kbvLogEntry.quarter ) );
                if( errValResults ) {
                    Y.log( `ERROR: KbvCon-Api: _doValidation: ${errValResults && errValResults.stack || errValResults}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2043' ) );
                    return 0;
                }
                Y.log( 'KbvCon-Api: merge: _doValidation ' + JSON.stringify( valResults ), 'debug', NAME );

                self._onMergeProcess( user, kbvLogId, {
                    total: 3,
                    current: 3,
                    durationElapsed: 0,
                    type: 'mergeSave'
                } );

                // 4. Push validation files to DB
                await Promise.all( valResults.statFiles.map( async statFile => {
                    let [errfileId, fileId] = await formatPromiseResult( storeFile(
                        args.user,
                        statFile.fileName,
                        {content_type: 'application/pdf'},
                        statFile.data ) );
                    if( errfileId ) {
                        Y.log( `Error: KbvCon-Api: merge:  saving validation file to DB: ${JSON.stringify( statFile )}  user: ${user.id} .\n${errfileId.stack || errfileId}`, 'warn', NAME );
                        self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2043' ) );
                        return 0;
                    }
                    statFile.fileId = fileId;
                    delete statFile.data;
                    valStatFiles.push( statFile );
                } ) );
                Y.log( 'KbvCon-Api: merge: 4. validation StatFiles ' + JSON.stringify( valStatFiles ), 'debug', NAME );

                //5. delete entries of last kbv log run
                let [errDeletion] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'delete',
                    query: {
                        invoiceLogId: kbvLogId,
                        type: {$in: ['ERROR', 'WARNING', 'ADVICES']}
                    },
                    options: {
                        override: true,
                        fast: true
                    },
                    model: 'invoiceentry'
                } ) );
                if( errDeletion ) {
                    Y.log( `error in deleting Entries of last kbv log run for user: ${user} .\n${errDeletion && errDeletion.stack || errDeletion}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2041' ) );
                    return 0;
                }

                //5.B Clean old statFiles
                if( kbvLogEntry.sourceConFiles && Array.isArray( kbvLogEntry.sourceConFiles ) ) {
                    await formatPromiseResult(
                        new Promise( ( resolve, reject ) => Y.doccirrus.invoicelogutils.cleanFiles(
                            user, kbvLogEntry.sourceConFiles.map( entry => entry.conFileId ), ( err, res ) => {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( res );
                            }
                        ) ) );
                }
                Y.log( 'KbvCon-Api: merge: 5B. delete sourceConFiles:', 'debug', NAME );

                // 6. Save new KBV log entry's

                let
                    pmRes = [
                        valResults && valResults.results && valResults.results.errors || null,
                        valResults && valResults.results && valResults.results.warnings || null,
                        valResults && valResults.results && valResults.results.advices || null];

                let type, errSaveEntrie;
                let [errSaveEntries] = await formatPromiseResult( Promise.all( pmRes.map( async ( data ) => {
                    errSaveEntrie = null;
                    type = null;
                    if( data.length ) {
                        switch( data[0].level ) {
                            case "2":
                                type = 'ERROR';
                                break;
                            case "1":
                                type = 'WARNING';
                                break;
                            default:
                                type = 'ADVICES';
                                break;
                        }
                        [errSaveEntrie] = await formatPromiseResult( Y.doccirrus.api.invoicelog.saveEntries( {
                            user,
                            entries: data,
                            ruleLogType: type,
                            inVoiceLogId: kbvLogId,
                            logType: 'KBV',
                            source: ''
                        } ) );
                        if( errSaveEntrie ) {
                            Y.log( `error in saveEntrie ${type} for user: ${user} .\n${errSaveEntrie && errSaveEntrie.stack || errSaveEntrie}`, 'error', NAME );
                            self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2043' ) );
                            return 0;
                        }
                    }
                } ) ) );
                if( errSaveEntries ) {
                    Y.log( `error in errSaveEntries for user: ${user} .\n${errSaveEntries && errSaveEntries.stack || errSaveEntries}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2043' ) );
                    return 0;
                }

                let [errUpdateFile] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'fs.files',
                    action: 'put',
                    query: {
                        filename: kbvLogEntry.conFileName
                    },
                    data: Y.doccirrus.filters.cleanDbObject( {
                        filename: 'ORIG_' + kbvLogEntry.conFileName
                    } ),
                    fields: ['filename']
                } ) );
                if( errUpdateFile ) {
                    Y.log( `error in updating old output file name ${kbvLogEntry.conFileName} for user: ${user} .\n${errUpdateFile && errUpdateFile.stack || errUpdateFile}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2041' ) );
                    return 0;
                }

                // 5. store output file in db
                bufferOutputFile = await fs.readFile( outPutFilePath );

                let [errNewConFileId, newConFileId] = await formatPromiseResult( storeFile(
                    args.user,
                    kbvLogEntry.conFileName,
                    {
                        "metadata": {
                            "charset": "ISO-8859-1"
                        }
                    },
                    bufferOutputFile
                ) );
                if( errNewConFileId ) {
                    Y.log( `Error in storing NEW merged output file ${kbvLogEntry.conFileName} for user: ${user} .\n${errNewConFileId && errNewConFileId.stack || errNewConFileId}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2041' ) );
                    return 0;
                }
                if( checkForDoubleSpendings ) {
                    kbvLogEntry.scanProtocolId = scanProtocolID;
                }
                kbvLogEntry.statFiles = valStatFiles;
                kbvLogEntry.conFileId = newConFileId;
                kbvLogEntry.sourceConFiles = filesToMerge;
                kbvLogEntry.status = (valResults.results && valResults.results.errors && valResults.results.errors.length > 0) ? 'INVALID' : 'VALID';
                Y.log( 'KbvCon-Api: merge: 7. save kbvLogEntrys:' + JSON.stringify( kbvLogEntry ), 'debug', NAME );

                let [errKbvlog] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'put',
                    query: {
                        _id: kbvLogId
                    },
                    fields: ["conFileId", "status", "statFiles", "sourceConFiles", "scanProtocolId"],
                    data: Y.doccirrus.filters.cleanDbObject( kbvLogEntry )
                } ) );
                if( errKbvlog ) {
                    Y.log( `error in saveKbvLog for id ${kbvLogId} for user: ${user} .\n${errKbvlog && errKbvlog.stack || errKbvlog}`, 'error', NAME );
                    self._onMergeFinished( user, kbvLogEntry, Y.doccirrus.errors.rest( '2041' ) );
                    return 0;
                }

                tmpDir.done();

                self._onMergeFinished( user, kbvLogEntry, '' );
                return 0;
            },
            _onMergeFinished: function( user, kbvLogEntry, _errors ) {
                let
                    self = this,
                    logInfo = {
                        id: kbvLogEntry.conFileId,
                        commercialNo: kbvLogEntry.commercialNo
                    };

                if( _errors ) {
                    self._addErrorStateToKbvlog( user, kbvLogEntry );
                }

                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                    msg: {
                        data: {
                            logInfo: logInfo,
                            warnings: [],
                            invoiceType: 'KBV',
                            action: 'merge',
                            state: 'finished',
                            errors: _errors ? [_errors] : []
                        }
                    }
                } );
            },
            _addErrorStateToKbvlog: async function( user, kbvLogEntry ) {
                kbvLogEntry.status = 'MERGING_ERR';
                let [errPutKbvlog] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    action: 'put',
                    query: {
                        _id: kbvLogEntry._id
                    },
                    fields: ["status"],
                    data: Y.doccirrus.filters.cleanDbObject( kbvLogEntry )
                } ) );
                if( errPutKbvlog ) {
                    Y.log( `error in updating KbvLog Status = MERGING_ERR for id ${kbvLogEntry.kbvLogId} for user: ${user} .\n${errPutKbvlog && errPutKbvlog.stack || errPutKbvlog}`, 'error', NAME );
                }
            }
        };

    },
    '0.0.1', {
        requires: ['dcinvoicelogutils', 'DCSocketIO', 'dckvconnectutils']
    }
);

