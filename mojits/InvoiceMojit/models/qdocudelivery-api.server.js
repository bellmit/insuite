/**
 * User: do
 * Date: 09/09/16  19:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'qdocudelivery-api', function( Y, NAME ) {
        const
            getTmpDir = Y.doccirrus.tempFileManager.get,
            Promise = require( 'bluebird' ),
            joinPath = require( 'path' ).join,
            mkdirp = Promise.promisify( require( 'mkdirp' ) ),
            rmdirSync = Promise.promisify( require( 'fs' ).rmdir ),
            writeFile = Promise.promisify( require( 'fs' ).writeFile ),
            readFile = Promise.promisify( require( 'fs' ).readFile ),
            readdir = Promise.promisify( require( 'fs' ).readdir ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            readAndWriteFile = Y.doccirrus.edmputils.readAndWriteFile,
            {formatPromiseResult} = require( 'dc-core' ).utils,
            libxml = require( 'libxmljs' );

        function getEditor( user ) {
            return user ? [{name: user.U, employeeNo: ''}] : undefined;
        }

        function getFile( user, id ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.get( user, id, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        async function _getQDocuConfigs( args ) {
            const {user, delivery} = args;
            let [err, configs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceconfiguration',
                    action: 'get',
                    query: {}
                } )
            );

            if( err ) {
                Y.log( `_getQDocuConfigs: could not get invoiceconfigs for location: ${delivery.locationId}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            configs = configs && configs[0] ? configs[0] : configs;

            return {
                tPackerPassword: configs && configs.tPackerPassword,
                tPackerUsername: configs && configs.tPackerUsername,
                qsDataKey: configs && configs.qsDataKey,
                patientKey: configs && configs.patientKey,
                xPackerConfigs: [
                    {node: 'qs_data', key: configs && configs.qsDataKey},
                    {node: 'patient', key: configs && configs.patientKey}
                ]
            };
        }

        async function _validateXML( args ) {
            const {mainDir, inputDir, resultFileName, schemaType, yearOfDelivery} = args;
            const pm = Y.doccirrus.okfe.dpp.getPm( {
                quarter: "latest",
                year: yearOfDelivery,
                type: 'OKFE'
            } );

            const pmParams = {
                tmpDir: mainDir,
                inputDir: inputDir,
                filename: resultFileName,
                schemaType: schemaType,
                year: yearOfDelivery
            };

            let [err, validationResult] = await formatPromiseResult( pm.execute( pmParams ) );

            if( err ) {
                Y.log( `_validateXML: validate could get validation results of merged file, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return validationResult;
        }

        async function _cleanUpDir( args ) {
            const {tempDir} = args;

            let [err] = await formatPromiseResult( rmdirSync( tempDir, {recursive: true} ) );
            if( err ) {
                Y.log( `_cleanUpDir: could not remove dir: ${tempDir}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }
        }

        async function _encryptAndZipFiles( args ) {
            const {user, contentObj, inputDir, configs } = args;
            let username, password;
            let path = '', fileId, docs = [], files, zipFileId, errorDetails = '';

            let [err, xmlFiles] = await formatPromiseResult( readdir( inputDir ) );
            if( err ) {
                Y.log( `_encrypAndZipFiles: could not read content of dir: ${inputDir}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            xmlFiles.forEach( ( file, i, array ) => {
                path += (i < array.length - 1) ? joinPath(inputDir, file) + ',' : joinPath(inputDir, file);
            } );

            if(configs && configs.tPackerPassword && configs.tPackerUsername) {
                username = configs.tPackerUsername;
                password = configs.tPackerPassword;

                let packerParams = {
                    packerType: 'TPacker',
                    filePath: path,
                    password: password,
                    outputFile: joinPath( inputDir, username )
                };

                [err] = await formatPromiseResult( Y.doccirrus.okfe.packer.execute( packerParams ) );

                if( err ) {
                    Y.log( `_encrypAndZipFiles: could not execute TPacker, error: ${err.stack || err}`, 'error', NAME );
                    errorDetails = err;
                }
            }

            [err, files] = await formatPromiseResult( readdir( inputDir ) );
            if( err ) {
                Y.log( `_encrypAndZipFiles: could not read files in dir: ${inputDir}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            for( let file of files ) {
                const regex = new RegExp( '\.xml');
                const isXml = regex.test( file );

                if(isXml) {
                    [err, fileId] = await formatPromiseResult( readAndWriteFile( user, file, joinPath( inputDir, file ) ) );
                    if( err ) {
                        Y.log( `_encrypAndZipFiles: could not save file: ${file.path} to gridfs, error: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    docs.push({xmlFileId: fileId, xmlFileName: file});
                }
            }

            const regex = new RegExp( '^' + username );
            const zipFileName = files.find( file => regex.test( file ) );

            if(zipFileName) {
                [err, zipFileId] = await formatPromiseResult( readAndWriteFile( user, zipFileName, joinPath( inputDir, zipFileName ) ) );
                if( err ) {
                    Y.log( `_encrypAndZipFiles: could not save file: ${zipFileName} to gridfs, error: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            }

            contentObj.xmlFiles = docs;
            contentObj.archiveFileId = zipFileId || null;
            contentObj.archiveFileName = zipFileName || null;
            return {contentObj, errorDetails};
        }

        async function _encryptXmlFile( args ) {
            let packerParams, err;
            const { filePath, encryptSteps } = args;

            for( let i of encryptSteps ) {
                packerParams = {
                    elNode: i.node,
                    key: i.key,
                    packerType: 'XPacker',
                    filePath
                };

                [err] = await formatPromiseResult( Y.doccirrus.okfe.packer.execute( packerParams ) );

                if( err ) {
                    Y.log( `packQDocuDelivery: could not execute XPacker, error: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }
            }
        }

        async function _checkActivityErrorsAndUpdate( args ) {
            let errors = args.errors,
                err;
            const
                activities = args.activities,
                user = args.user,
                validationResult = args.validationResult;

            for( let error of errors ) {
                let actToUpdate = activities.find( activity => error.guid === activity.guid );

                if( actToUpdate ) {
                    let dmpErrors = validationResult;
                    delete error.guid; // remove the caseId
                    delete dmpErrors.errors; // we remove errors for all cases
                    dmpErrors.errors = error.errors; // we re-append errors for this particular case
                    dmpErrors.warnings = error.warnings;
                    dmpErrors.nErrors = dmpErrors.errors.group.length; // we re-count errors for this particular case
                    dmpErrors.nWarnings = dmpErrors.warnings.group.length;

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'update',
                            query: {_id: actToUpdate._id},
                            data: {$set: {dmpErrors: dmpErrors, status: 'INVALID'}}
                        } ) );

                    if( err ) {
                        Y.log( `_checkActivityErrorsAndUpdate: could not update validation errors to activity: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }
                }
            }
        }

        async function _updateActivitiesAndExit( args ) {
            const {validationResult, activities, user, tempDir} = args;

            let [err] = await formatPromiseResult( _checkActivityErrorsAndUpdate( {
                errors: validationResult.errorsPerCase,
                validationResult,
                activities,
                user
            } ) );

            if( err ) {
                Y.log( `_updateActivitiesAndExit: could not update validation errors to activity: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            // remove the Dir
            [err] = await formatPromiseResult( rmdirSync( tempDir, {recursive: true} ) );
            if( err ) {
                Y.log( `_updateActivitiesAndExit: could not remove dir: ${tempDir}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return {validationError: true};
        }

        async function _mergeActsToXML( args ) {
            let
                {activities, file, i, inputDir, resultFileName, resultFilePath} = args,
                docToWrite, caseGuidNode, err, resultFile,
                xmlDoc = libxml.parseXmlString( file.data, {noblanks: true} ),
                ns = xmlDoc.root().namespace().href();

            // Get first file in row and save it as result-XML
            // From any following files extract the case and append it after the last caseNode in result-XML
            if( i === 0 ) {
                // Get id
                let guidNode = xmlDoc.get( '//xmlns:document/xmlns:id', ns ).attr( 'V' ).value();
                let guid = guidNode.replace( /{|}/gi, '' ); // remove curly braces

                // set the correct count
                let count = activities.length;
                let sentNode = xmlDoc.get( '//xmlns:statistic/xmlns:sent', ns );
                let createNode = xmlDoc.get( '//xmlns:statistic/xmlns:sent/xmlns:create', ns );
                sentNode.attr( 'count', count );
                createNode.attr( 'V', count );

                // add CaseGuid to Activity
                caseGuidNode = xmlDoc.get( '//xmlns:case_admin/xmlns:guid', ns ).attr( 'V' ).value();
                activities[i].guid = caseGuidNode.replace( /{|}/gi, '' );

                resultFileName = `${guid}_Q_LE.xml`;
                resultFilePath = joinPath( inputDir, resultFileName );
                docToWrite = xmlDoc.toString();
            } else {
                // Read the resultXML
                [err, resultFile] = await formatPromiseResult( readFile( resultFilePath ) );
                if( err ) {
                    throw err;
                }
                let resultXML = libxml.parseXmlString( resultFile, {noblanks: true} );
                let casesNode = resultXML.get( '//xmlns:cases/xmlns:case', ns );

                // add CaseGuid to Activity
                caseGuidNode = xmlDoc.get( '//xmlns:case_admin/xmlns:guid', ns ).attr( 'V' ).value();
                activities[i].guid = caseGuidNode.replace( /{|}/gi, '' );

                // Add new case
                let caseNode = xmlDoc.get( '//xmlns:cases/xmlns:case', ns );
                casesNode.addPrevSibling( caseNode );
                docToWrite = resultXML.toString();
            }

            [err] = await formatPromiseResult( writeFile( resultFilePath, docToWrite ) );

            if( err ) {
                Y.log( `packQDocuDelivery: could not write file of merged activities, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return {resultFileName, resultFilePath};
        }

        async function packQDocuDelivery( args ) {
            Y.log( 'Entering Y.doccirrus.api.edmpdelivery.packQDocuDelivery', 'info', NAME );

            const
                user = args.user,
                params = args.originalParams;

            let err, tempDir, qdocuActivities, delivery, arrayOfContentObj = [], errorDetails = '', qDocuConfigs = {}, deliveryError = "", yearOfDelivery;
            const deliveryId = params.deliveryId;

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'edmpdelivery',
                        action: 'update',
                        query: {
                            _id: deliveryId
                        },
                        data: {
                            $set: {
                                edmpDeliveryStatus: 'PACKING',
                                lastUpdate: new Date(),
                                includedEdocTypes: [],
                                editor: getEditor( user ),
                                error: deliveryError
                            }
                        }
                    }
                ) );

            if( err ) {
                Y.log( `packQDocuDelivery: could update delivery for deliveryId: ${deliveryId}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err, delivery] = await formatPromiseResult( runDb( { // group here by doc type already?
                user: user,
                model: 'edmpdelivery',
                query: {
                    _id: deliveryId
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `packQDocuDelivery: could find delivery for deliveryId: ${deliveryId}, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            delivery = delivery[0];
            if( !delivery ) {
                throw Error( 'could not find edmp delivery ' + deliveryId );
            }

            yearOfDelivery = delivery && delivery.year;

            [err, tempDir] = await formatPromiseResult( getTmpDir( user, 'edmp-delivery' ) );
            if( err ) {
                Y.log( `packQDocuDelivery: could get tempDir, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            const pipeline = [
                {
                    $match: {dmpDeliveryRef: deliveryId}
                },
                {
                    $group: {
                        _id: {lanr: '$lanr', module: '$module'},
                        activities: {
                            $push: {
                                dmpFileId: '$dmpFileId',
                                patientId: '$patientId',
                                _id: '$_id',
                                patientShort: '$patientShort',
                                actType: '$actType',
                                bsnrambulant: '$bsnrambulant',
                                dmpYear: '$dmpYear',
                                dmpQuarter: '$dmpQuarter'
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$_id.lanr',
                        modules: {
                            $push: {
                                module: "$_id.module",
                                activities: '$activities'
                            }
                        }
                    }
                }

            ];

            [err, qdocuActivities] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'aggregate',
                    pipeline
                } ) );

            qdocuActivities = qdocuActivities.result || qdocuActivities;
            if( err ) {
                Y.log( `packQDocuDelivery: could get activities to merge into XML, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err, qDocuConfigs] = await formatPromiseResult(_getQDocuConfigs({user, delivery}));

            if(!qDocuConfigs || !qDocuConfigs.qsDataKey || !qDocuConfigs.patientKey) {
                return {validationError: true, deliveryError: "1"};
            }

            if(!qDocuConfigs.tPackerPassword || !qDocuConfigs.tPackerUsername) {
                deliveryError = "2";
            }

            if( err ) {
                Y.log( `packQDocuDelivery: could get qDocuConfigs, error: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            // eslint-disable-next-line guard-for-in
            for( let doctor of qdocuActivities ) {
                let lanr, moduleName, modules, activities, dmpFileId, mainDir, inputDir, contentObj = {actType: 'QDocu'};
                lanr = doctor._id;

                modules = doctor.modules;
                for( let module of modules ) {
                    let resultFileName = '', resultFilePath = '', result, isValid, validationResult;
                    moduleName = module.module;
                    activities = module.activities;

                    mainDir = joinPath( tempDir.path, lanr );
                    inputDir = joinPath( tempDir.path, lanr, 'input' );
                    let [err] = await formatPromiseResult( mkdirp( inputDir ) );
                    if( err ) {
                        Y.log( `packQDocuDelivery: could not makeDir for module: ${moduleName} of lan: ${lanr}, error: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    for( let i = 0; i < activities.length; i++ ) {
                        // Get the file
                        dmpFileId = activities[i].dmpFileId;
                        let [err, file] = await formatPromiseResult( getFile( user, dmpFileId ) );
                        if( err ) {
                            Y.log( `packQDocuDelivery: could not get file of dmpFileId: ${activities[i].dmpFileId}, error: ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        if( !file || !file.data ) {
                            Y.log( `packQDocuDelivery: could not get file of dmpFileId: ${activities[i].dmpFileId}`, 'warn', NAME );
                        }

                        activities[i].xmlFile = file;

                        [err, result] = await formatPromiseResult( _mergeActsToXML( {
                            i,
                            activities,
                            inputDir,
                            file,
                            resultFileName,
                            resultFilePath
                        } ) );
                        if( err ) {
                            Y.log( `packQDocuDelivery: could not merge activities to XML File., error: ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }

                        if( result ) {
                            resultFilePath = result.resultFilePath;
                            resultFileName = result.resultFileName;
                        }

                    }

                    [err, validationResult] = await formatPromiseResult( _validateXML( {
                        schemaType: 'interface_LE_WEICH',
                        mainDir,
                        inputDir,
                        resultFileName,
                        yearOfDelivery
                    } ) );

                    if( err ) {
                        Y.log( `packQDocuDelivery: error from validate XML, error: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    isValid = (0 === validationResult.nErrors);

                    if( !isValid ) {
                        let [err, validationError] = _updateActivitiesAndExit( {
                            activities,
                            user,
                            tempDir: tempDir.path,
                            validationResult
                        } );
                        if( err ) {
                            Y.log( `packQDocuDelivery: update activites and exit, error: ${err.stack || err}`, 'error', NAME );
                            throw err;
                        }
                        return validationError;
                    } else {

                        [err] = await formatPromiseResult( _encryptXmlFile( {filePath: resultFilePath, encryptSteps: qDocuConfigs && qDocuConfigs.xPackerConfigs} ) );

                        if( err ) {
                            Y.log( `packQDocuDelivery: could not execute XPacker to encrypt File, error: ${err.stack || err}`, 'error', NAME );
                            return {errorDetails: err && err.message};
                        }
                    }
                }

                let [err, result] = await formatPromiseResult( _encryptAndZipFiles( {inputDir, user, contentObj, configs: qDocuConfigs} ) );
                if( err ) {
                    Y.log( `packQDocuDelivery: could not save to gridfs, error: ${err.stack || err}`, 'error', NAME );
                    throw err;
                }

                if(result.contentObj) {
                    arrayOfContentObj.push( result.contentObj );
                }

                if(result.errorDetails) {
                    errorDetails = result.errorDetails;
                }
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'edmpdelivery',
                    action: 'update',
                    query: {_id: deliveryId},
                    data: {
                        $set: {
                            edmpDeliveryStatus: errorDetails ? 'PACK_ERR' : 'PACKED',
                            content: arrayOfContentObj,
                            dateOfPacking: null,
                            labelFormId: null,
                            contentFormId: null,
                            lastUpdate: new Date(),
                            editor: getEditor( user ),
                            error: deliveryError,
                            errorDetails: errorDetails
                        }
                    }
                } ) );

            if( err ) {
                Y.log( `packQDocuDelivery: could not update edmpDelivery to activity: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err] = await formatPromiseResult( _cleanUpDir( {tempDir: tempDir.path} ) );

            if( err ) {
                Y.log( `packQDocuDelivery: could not remove directory: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: args.user.identityId,
                event: 'edmpPackingFinished',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                msg: {}
            } );

            return {deliveryId};
        }

        Y.namespace( 'doccirrus.api' ).qdocudelivery = {

            name: NAME,
            packQDocuDelivery: packQDocuDelivery
        };

    },
    '0.0.1', {requires: ['casefolder-schema', 'catalog-api', 'edmp-commonutils', 'tempdir-manager', 'dcgridfs', 'xkm', 'dccommunication', 'edmp-utils', 'edoc-utils']}
);
