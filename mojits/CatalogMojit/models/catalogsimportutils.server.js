/**
 * User: altynai.iskakova
 * Date: 05.01.21  10:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */

YUI.add( 'catalogsimportutils', function( Y, NAME ) {

        /** @module catalogsimportutils */

        const
            sh = require( 'child_process' ).execSync,
            util = require( 'util' ),
            {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( '../../../server/utils/logWrapping' )( Y, NAME ),
            moment = require( 'moment' ),
            fs = require( 'fs' ),
            fsPromises = require( 'fs' ).promises,
            Path = require( 'path' ),
            crypto = require( 'crypto' ),
            renameKey = ( object, key, newKey ) => {
                const clonedObj = clone( object );
                const targetKey = clonedObj[key];
                delete clonedObj[key];
                clonedObj[newKey] = targetKey;
                return clonedObj;
            },
            clone = ( obj ) => Object.assign( {}, obj );

        /**
         * Method for calculating a hash of the input file
         * Method is imported from ruleimportexport-api and slightly adapted
         * @param {String} file path
         * @param callback
         * @returns {String} hash of a file
         */

        function calculateFileHash( file, callback ) {
            // Algorithm depends on availability of OpenSSL on platform
            let algorithm = 'sha1';
            let shasum = crypto.createHash( algorithm );
            let s = fs.ReadStream( file );

            // Updating shasum with file content
            s.on( 'data', function( data ) {
                shasum.update( data );
            } );

            // making digest
            s.on( 'end', function() {
                let hash = shasum.digest( 'hex' );
                callback( null, hash );
            } );

            s.on( 'error', function( err ) {
                callback( err );
            } );
        }

        /**
         * Method for getting Metadata of input files (of all zip files in the var/catalogs-hci/{currentYear}_catalogdump/ or var/catalogs-hci/{lastYear}_catalogdump/)
         * @param {Object} args
         * @param {String} args.importDir
         * @param {Function} [args.callback]
         * @returns {Array} results
         */
        async function getImportFilesMetaData( args ) {
            const timer = logEnter( 'Y.doccirrus.catalogsimportutils.getImportFilesMetaData' );
            const {
                importDir,
                callback
            } = args;
            let
                importFile = null,
                importFileExt,
                importFileHash,
                results = [],
                result = {
                    file: importFile
                };
            const listRecursiveP = util.promisify( Y.doccirrus.media.listRecursive );
            let [err, listRecursiveResult] = await formatPromiseResult( listRecursiveP( importDir, '*tar.gz, *.zip' ) );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            const calculateFileHashP = util.promisify( calculateFileHash );
            for( const file of listRecursiveResult ) {
                if( file.length === 0 ) {
                    Y.log( 'getImportFilesMetaData - No files in the zip file', 'info', NAME );
                    continue;
                }
                importFile = file.filename;
                importFileExt = file.ext;
                let importFileStat;

                [err, importFileStat] = await formatPromiseResult( fsPromises.stat( importDir + importFile ) );
                if( err ) {
                    logExit( timer );
                    return handleResult( err, undefined, callback );
                }
                if( !importFile ) {
                    continue;
                }
                [err, importFileHash] = await formatPromiseResult( calculateFileHashP( importDir + importFile ) );
                if( err ) {
                    logExit( timer );
                    return handleResult( err, undefined, callback );
                }
                result = {
                    file: importFile,
                    ext: importFileExt,
                    hash: importFileHash,
                    modifyDate: importFileStat && importFileStat.mtime && moment( importFileStat.mtime ).format( 'DD.MM.YYYY' )
                };
                results.push( result );
            }
            logExit( timer );
            return handleResult( undefined, results, callback );
        }

        /**
         * Method for restoring/importing the medicationscatalogs from the dump into the DB
         * Creates a hash (combinedHash) of concatenated hashes of all input files
         * Checks the combinedHash and sets the attribute wasImported to true if it is identical to the hciCatalogHash in the admins collection
         * Imports the catalog if wasImported === false and saves the combinedHash in the admins collection after restore, otherwise skips the restore
         * @param {Object} args
         * @param {String} args.catalogName
         * @param {String} args.dirName
         * @param {String} args.hashName
         * @param {Function} [args.callback]
         */
        async function genericCatalogImport( args ) {
            const timer = logEnter( 'Y.doccirrus.catalogsimportutils.genericCatalogImport' );
            const {
                catalogName,
                dirName,
                hashName,
                callback
            } = args;

            if( !catalogName || !dirName || !hashName ) {
                logExit( timer );
                return handleResult( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ), undefined, callback );
            }

            let
                importFile,
                importFileHash,
                wasImported = false,
                adminFileHash,
                combinedHash,
                catalogsPath = Y.doccirrus.auth.getDirectories( dirName ),
                concatHashes = '',
                currentYear = new Date().getFullYear(),
                catalogDumpDir;

            //check if the catalogdump folder for the current year exists
            if( fs.existsSync( `${catalogsPath}/${String( currentYear )}_catalogdump` ) ) {
                catalogDumpDir = `/${String( currentYear )}_catalogdump/`;
            }
            //check if the catalogdump folder for the last year exists
            else if( fs.existsSync( `${catalogsPath}/${String( currentYear - 1 )}_catalogdump` ) ) {
                catalogDumpDir = `/${String( currentYear - 1 )}_catalogdump/`;
            }
            // no catalogdump folder found
            else {
                Y.log( 'genericCatalogImport - No directory found for catalogdump', 'info', NAME );
                logExit( timer );
                return handleResult( undefined, undefined, callback );
            }

            const getImportFilesMetaDataP = promisifyArgsCallback( getImportFilesMetaData );
            let [err, getImportFilesMetaDataResult] = await formatPromiseResult( getImportFilesMetaDataP( {importDir: catalogsPath + `${catalogDumpDir}`} ) );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }

            async function restoreP( catalogName, catalogsPath ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongoutils.restore( catalogName, '0', '0', Path.join( catalogsPath, `${catalogName}.bson` ), ( err, data ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( data );
                    } );
                } );
            }

            let adminHash;
            [err, adminHash] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                },
                useCache: false
            } ) );
            if( err ) {
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            adminFileHash = adminHash && adminHash[0] && adminHash[0][hashName];

            for( const zipFile of getImportFilesMetaDataResult ) {
                if( zipFile && zipFile.file ) {
                    importFileHash = zipFile.hash;
                }
                concatHashes += importFileHash;
            }
            combinedHash = Y.doccirrus.commonutils.fastHash( concatHashes );
            wasImported = String( adminFileHash ) === String( combinedHash );

            if( wasImported ) {
                Y.log( `genericCatalogImport - Medicationscatalog is up-to-date. DocCirrus catalog already imported from ${combinedHash}`, 'info', NAME );
                logExit( timer );
                return handleResult( null, `DocCirrus catalogs already imported from ${combinedHash}`, callback );
            } else {
                for( const zipFile of getImportFilesMetaDataResult ) {
                    if( zipFile && zipFile.file ) {
                        importFile = zipFile.file;
                    }
                    if( !importFile ) {
                        Y.log( 'genericCatalogImport - DocCirrus catalog import file not found', 'warn', NAME );
                        logExit( timer );
                        return handleResult( new Y.doccirrus.commonerrors.DCError( 404, {message: 'DocCirrus catalog import file not found'} ), undefined, callback );
                    }
                    Y.log( `genericCatalogImport - Current file: ${importFile}`, 'info', NAME );
                    try {
                        if( sh( `cd ${catalogsPath}/ && ls` ).toString().includes( 'medicationscatalogs.bson' ) ) {
                            sh( `cd ${catalogsPath}; rm ${catalogName}.bson` );
                        }
                        if( sh( `cd ${catalogsPath}${catalogDumpDir} && unzip -l ${importFile} dump/catalog_dump/${catalogName}.bson` ).toString().includes( '1 file' ) ) {
                            const unzipBson = `cd ${catalogsPath}${catalogDumpDir}; unzip -j ${importFile} dump/catalog_dump/${catalogName}.bson -d ../`;
                            sh( unzipBson );
                        }
                    } catch( e ) {
                        logExit( timer );
                        throw e;
                    }
                    // eslint-disable-next-line no-unused-vars
                    let [err] = await formatPromiseResult( restoreP( catalogName, catalogsPath ) );
                    if( err ) {
                        logExit( timer );
                        return handleResult( err, undefined, callback );
                    }

                    try {
                        sh( `cd ${catalogsPath}; rm ${catalogName}.bson` );
                    } catch( e ) {
                        logExit( timer );
                        return handleResult( e, undefined, callback );
                    }
                }
                let dataObj = {
                    catalogHash: combinedHash,
                    skipcheck_: true
                };
                dataObj = renameKey( dataObj, 'catalogHash', hashName );

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'admin',
                    action: 'put',
                    query: {
                        _id: Y.doccirrus.schemas.admin.getId()
                    },
                    data: dataObj,
                    fields: [`${hashName}`]
                } ) );
            }
            if( err ) {
                Y.log( `genericCatalogImport - Error on processing Doccirrus catalogs import, err: ${JSON.stringify( err )}`, 'error', NAME );
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            Y.log( 'genericCatalogImport - DocCirrus catalog imported successfully', 'info', NAME );
            logExit( timer );
            return handleResult( null, 'DocCirrus catalog imported successfully', callback );
        }

        Y.namespace( 'doccirrus' ).catalogsimportutils = {
            name: NAME,
            calculateFileHash: calculateFileHash,
            getImportFilesMetaData: getImportFilesMetaData,
            genericCatalogImport: genericCatalogImport
        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'dccommonutils',
            'dcmongoutils',
            'ruleimportexport-api',
            'dccatalogparser',
            'dcauth',
            'admin-schema',
            'catalogviewerindex-schema'
        ]
    }
);