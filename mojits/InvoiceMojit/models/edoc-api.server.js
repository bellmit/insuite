/**
 * User: do
 * Date: 09/11/17  16:20
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/* global YUI */
YUI.add( 'edoc-api', function( Y, NAME ) {
        const
            noop = () => {
            },
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            moment = require( 'moment' ),
            libxml = require( 'libxmljs' ),
            fs = require('fs'),
            path = require('path'),
            joinPath = require( 'path' ).join,
            mongoose = require( 'mongoose' ),
            getTmpDir = Y.doccirrus.tempFileManager.get,
            createFileWriter = Y.doccirrus.edocFileWriter.createFileWriter,
            readAndWriteFile = Y.doccirrus.edmputils.readAndWriteFile,
            removeFile = Y.doccirrus.edocutils.removeFile,
            resetEdocStatus = Y.doccirrus.edocutils.resetEdocStatus,
            getDmpDeliveryInfo = Y.doccirrus.edocutils.getDmpDeliveryInfo,
            getAddressees = Y.doccirrus.edmputils.getAddressees,
            selectAddressee = Y.doccirrus.edmputils.selectAddressee,
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            isEhks = Y.doccirrus.schemas.activity.isEhks,
            isHgv = Y.doccirrus.schemas.activity.isHgv,
            isQDocu = Y.doccirrus.schemas.activity.isQDocu,
            xsdAssets = ['HGV/QSHGV.xsd', 'HGVK/QSHGVK.xsd'];

        let xsdData = {};

        xsdAssets.forEach( entry => {
            fs.readFile(path.join(__dirname, '/../assets/schema/' + entry), {encoding: 'latin1'}, function(err,data) {
                if( !err ) {
                    const key = entry.split('/')[0];
                    xsdData[key] = data;
                }
                else {
                    const errorMsg = `could not load XSD file for ${entry}`;
                    Y.log( errorMsg, 'error', NAME );
                }
            });
        } );


        function getConfigPath( activity ) {
            if (activity.actType === "BK") {
                return 'Konfig/' + ('FOLLOWING' === activity.dmpType ? 'konfigFD.xml' : 'konfigED.xml');
            } else if( isEdmp( activity.actType ) ) {
                return 'Konfig/' + ('FOLLOWING' === activity.dmpType ? 'konfigVD.xml' : 'konfigED.xml');
            } else if( isEhks( activity.actType ) ) {
                return 'Konfig/' + ('EHKSD' === activity.actType ? 'konfigD.xml' : 'konfigND.xml');
            }
        }

        function getContextForActivity( user, activity ) {
            if( isEdmp( activity.actType ) ) {
                return Y.doccirrus.edmputils.getContextForActivity( user, activity );
            } else if( isEhks( activity.actType ) ) {
                return Y.doccirrus.ehksutils.getContextForActivity( user, activity );
            }   else if( isHgv( activity.actType ) ) {
                return Y.doccirrus.hgvutils.getContextForActivity( user, activity );
            } else if( isQDocu( activity.actType ) ) {
                return Y.doccirrus.qdocuutils.getContextForActivity( user, activity );
            }
            let errorMsg = `could not find context adapter for actType ${activity.actType}`;
            Y.log( errorMsg, 'error', NAME );
            throw Error( errorMsg );
        }

        function buildEdocFile( actType, data ) {
            if( isEdmp( actType ) ) {
                return Y.doccirrus.edmpFileBuilder.buildDocXml( data );
            } else if( isEhks( actType ) ) {
                return Y.doccirrus.ehksFileBuilder.buildDocXml( data );
            } else if( isHgv( actType ) ) {
                return Y.doccirrus.hgvFileBuilder.buildDocXml( data );
            } else if( isQDocu( actType ) ) {
                return Y.doccirrus.qdocuFileBuilder.buildDocXml( data );
            }
            let errorMsg = `could not find buildDocXml adapter for actType ${actType}`;
            Y.log( errorMsg, 'error', NAME );
            throw Error( errorMsg );
        }

        // api

        function buildFile( args ) {
            Y.log('Entering Y.doccirrus.api.edoc.buildFile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edoc.buildFile');
            }
            const
                user = args.user,
                activity = args.activity,
                callback = args.callback || noop;

            let promise, context, tmpDir, filePath, dmpDeliveryInfo, params,
                dmpFileId = null,
                dmpErrors = null,
                isValid = false,
                isCanceled = false;


            if( activity.dmpFileId ) {
                Y.log( 'remove old edoc/edmp xml file with ID: ' + activity.dmpFileId, 'debug', NAME );
                promise = removeFile( user, activity.dmpFileId );
            } else {
                promise = Promise.resolve();
            }


            resetEdocStatus( activity );

            promise.then( () => {
                return getContextForActivity( user, activity );
            } ).then( _context => {
                context = _context;
                Object.assign( context, {
                    xsdSchema: Y.doccirrus.edocConverter.utils.getSchemaVersion( context )
                } );
                dmpDeliveryInfo = getDmpDeliveryInfo( context );
                return getTmpDir( user, context.xpm );
            } ).then( _tmpDir => {
                tmpDir = _tmpDir;
                if(isQDocu( activity.actType)) {
                    // qDocu requires tmpDir + '/input' + fileName
                    filePath = joinPath( tmpDir.path, context.fileName );
                    tmpDir.path = tmpDir.path.replace(/\/input/g,'');
                } else {
                    filePath = joinPath( tmpDir.path, context.fileName );
                }

                return buildEdocFile( activity.actType, {
                    context: context,
                    writer: createFileWriter( {destination: filePath, user} )
                } );
            } ).then( () => {

                if(isHgv( activity.actType)) {
                    return {isValid:1, isCanceled: false, nErrors: 0};
                }

                let xpmQuarter,
                    xpmYear;

                if( isEdmp( activity.actType ) || isQDocu( activity.actType ) ) {
                    xpmQuarter = activity.dmpQuarter;
                    xpmYear = activity.dmpYear;
                } else if( isEhks( activity.actType ) || isHgv( activity.actType ) ) {
                    let ts = moment( activity.timestamp );
                    xpmQuarter = ts.quarter();
                    xpmYear = ts.year();
                } else {
                    throw Error( `could not set xpm quarter/year for actType ${activity.actType}` );
                }

                let pm;

                if( isQDocu( activity.actType ) ) {
                    pm = Y.doccirrus.okfe.dpp.getPm( {
                        quarter: 'latest',
                        year: xpmYear,
                        type: 'OKFE'
                    } );
                } else {
                    pm = Y.doccirrus.xpm.getPm( {
                        type: isEdmp( activity.actType ) ? activity.actType : 'EHKS',
                        quarter: xpmQuarter,
                        year: xpmYear
                    } );
                }

                let configPath = getConfigPath( activity );
                const xpmOptions = {};
                if( isEdmp( activity.actType ) ) {
                    xpmOptions.isFollowing = 'FOLLOWING' === activity.dmpType;
                } else if( isEhks( activity.actType ) ) {
                    xpmOptions.isND = 'EHKSND' === activity.actType;
                }

                if( isQDocu( activity.actType ) ) {
                    params = {
                        tmpDir: tmpDir.path,
                        inputDir: joinPath(tmpDir.path, 'input'),
                        filename: context.fileName,
                        schemaType: "interface_LE_WEICH",
                        year: xpmYear
                    };
                } else {
                    params = {
                        input: filePath,
                        tmpDir: tmpDir.path,
                        options: xpmOptions,
                        parseAuditLog: 'XML',
                        configPath: configPath
                    };
                }

                return pm.execute( params );
            } ).then( result => {

                if(isQDocu(activity.actType)) {
                    // Result structured per Case - here only 1 case
                    dmpErrors = result || null;
                    dmpErrors.errors = result.errorsPerCase && result.errorsPerCase.length ? result.errorsPerCase[0].errors : null;
                    dmpErrors.warnings = result.errorsPerCase && result.errorsPerCase.length ? result.errorsPerCase[0].warnings : null;
                } else {
                    dmpErrors = result || null;
                }

                isCanceled = result.canceled;
                isValid = (0 === result.nErrors);

                /* if activity of type HGV validate against XSD schema */
                if( isHgv( activity.actType ) ) {
                    if(dmpErrors) {
                        dmpErrors.filename = context.fileName;
                    }

                    return readAndWriteFile( user, context.fileName, filePath, function moj8596( buf ) {
                        const buffer = buf && buf.toString( 'latin1' ) || '';
                        Y.doccirrus.edocutils.inspectEdocXML( buffer, 'edoc-api->buildFile xml read from disc after XPM execution iso8859', NAME, user );

                        if(activity.dmpAge) {

                            let xsdSchema = activity.actType;

                            let baseUrl = path.join(__dirname, '/../assets/schema/' + xsdSchema + '/'),
                                xsdDoc = libxml.parseXml(xsdData[xsdSchema],{ baseUrl: baseUrl }),
                                xmlDoc = libxml.parseXml(buffer);

                            xmlDoc.validate( xsdDoc );
                            // since schema version 1.12 "Skipping import of schema located at" occurs on validation
                            const filteredErrors = xmlDoc.validationErrors.filter( ( err ) => err.code !== 3083 );
                            if( filteredErrors.length > 0 ) {
                                isValid = false;
                                dmpErrors.errors = [];
                                dmpErrors.errors[0] = filteredErrors.map( ( item ) => {
                                    let obj = {};
                                    obj.text = item.message;
                                    return obj;
                                } );
                                dmpErrors.nErrors = filteredErrors.length;
                            }
                        }
                    } );

                }
                else {
                    return readAndWriteFile( user, context.fileName, filePath, function moj8596( buf ) {
                        const buffer = buf && buf.toString( 'latin1' ) || '';
                        Y.doccirrus.edocutils.inspectEdocXML( buffer, 'edoc-api->buildFile xml read from disc after XPM execution iso8859', NAME, user );
                    } );
                }

            } ).then( fileId => {

                Y.doccirrus.edocutils.readFileAndInspectXML( user, fileId, 'edoc-api->buildFile read file from gridfs after it was written', NAME );
                dmpFileId = fileId || null;

                return tmpDir.done();
            } ).then( () => {
                // get all possible sdda addresses
                if(isQDocu( activity.actType )) {
                    return [
                        {
                            "catalogUsage": true,
                            "orgianizationId" : "QDOCU",
                            "kv_connect" : "QDOCU",
                            "kv" : dmpDeliveryInfo.kv,
                            "orgianizationName" : "QDOCU",
                            "_id": new mongoose.Types.ObjectId()
                        }
                    ];
                } else {
                    return getAddressees( user, activity.actType, dmpDeliveryInfo );
                }

            } ).then( addressees => {
                Y.log( `found possible sdda addressees ${addressees}`, 'debug', NAME );
                dmpDeliveryInfo.addressees = addressees;
                let selectedAddressee;
                // if there is only addressee we can simple use this one,
                // MOJ-10747: In some situations we still want to automatically select an adressee, although several adressees were found
                // or if no possible sdda addresses found let the user decide to create new catalogusage entry or edit existing
                if(isQDocu( activity.actType )) {
                    selectedAddressee = "QDOCU";
                } else {
                    selectedAddressee = selectAddressee( activity.actType, addressees ); // returns a selected adressee or null if none could be selected automatically.
                }


                let data = {
                    actType: activity.actType,
                    dmpErrors: dmpErrors,
                    dmpFileId: dmpFileId,
                    dmpDeliveryInfo: dmpDeliveryInfo,
                    dmpAddressee: selectedAddressee
                };



                data.content = Y.doccirrus.edmpcommonutils.generateContent( data );
                Y.log( `successfully created and validated edoc xml file stats isCanceled: ${isCanceled} isValid: ${isValid}`, 'debug', NAME );
                callback( null, {
                    updateData: data,
                    isCanceled: isCanceled,
                    isValid: isValid
                } );
            } ).catch( err => {
                Y.log( 'could not build edoc xml file err: ' + (err && err.stack || err), 'error', NAME );
                callback( err );
            } );
        }

        function deleteFile( args ) {
            Y.log('Entering Y.doccirrus.api.edoc.deleteFile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edoc.deleteFile');
            }
            const
                user = args.user,
                activity = args.activity,
                callback = args.callback || noop;

            if( activity.dmpFileId ) {
                removeFile( user, activity.dmpFileId ).then( result => callback( null, result ) ).catch( err => callback( err ) );
            } else {
               return callback();
            }
        }

        function extractRefQuery( query, refPath ) {
            let refQuery = {};
            Object.keys( query ).map( path => {
                let pathParts = path.split( '.' );
                if( refPath === pathParts[0] ) {
                    refQuery[pathParts[1]] = query[path];
                    delete query[path];
                }
            } );
            return refQuery;
        }

        function getRefFilter( user, query, refPath, refModelName ) {
            let refQuery = extractRefQuery( query, refPath );

            if( !Object.keys( refQuery ).length ) {
                return Promise.resolve();
            }

            return runDb( {
                user: user,
                model: refModelName,
                query: refQuery,
                options: {
                    select: {
                        _id: 1
                    }
                }
            } ).map( doc => {
                return doc._id.toString();
            } ).then( docIds => {
                query[refPath] = {
                    $in: docIds
                };
                return query;
            } );
        }

        function GET( args ) {
            const overviewFilter = args.originalParams && args.originalParams.overviewFilter;
            var headDateFilter = {$gt: require( 'moment' )().subtract( 4, 'quarters' ).toDate()}; // eDMP Anforderungskatalog P1-112
            if( !args.query.actType ) {
                args.query.actType = {$in: Y.doccirrus.schemas.activity.eDocActTypes};
            }
            if( overviewFilter ) {
                args.query.caseFolderDisabled = {$ne: true};
                if( args.query.dmpHeadDate ) {
                    args.query.$and = [
                        {dmpHeadDate: headDateFilter},
                        {dmpHeadDate: args.query.dmpHeadDate}
                    ];
                    delete args.query.dmpHeadDate;
                } else {
                    args.query.$or = [
                            {dmpHeadDate: headDateFilter},
                            {dmpHeadDate: {$exists: false}}
                        ];
                }

            }
            return getRefFilter( args.user, args.query, 'patientId', 'patient' ).then( () => {
                return getRefFilter( args.user, args.query, 'locationId', 'location' );
            } ).then( () => {
                args.options.withReceipts = true; // must be set to not throw error on empty result
                Y.doccirrus.api.activity.getCaseFile( args );
            } );
        }

        /**
         * Counts or approves (the fast way) valid edoc docs.
         *
         * @param {Object}          args
         * @param {Object}          args.options
         * @param {boolean}          args.options.onlyCount - returns only the count
         */
        function approveValidDocs( args ) {
            Y.log('Entering Y.doccirrus.api.edoc.approveValidDocs', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edoc.approveValidDocs');
            }
            const
                {user, callback, originalParams} = args,
                query = {
                    actType: {$in: Y.doccirrus.schemas.activity.eDocActTypes},
                    status: 'VALID'
                },
                approve = () => {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'activity',
                        migrate: true,
                        query: query,
                        data: { status: 'APPROVED' },
                        options: { multi: true }
                    } )
                        .then( result => {
                            return {nApproved: result.nModified};
                        } );
                };

            Promise.resolve().then( () => {
                if( originalParams.onlyCount ) {
                    return runDb( {
                        user: user,
                        model: 'activity',
                        action: 'count',
                        query: query
                    } ).then( count => {
                        return {nValidDocs: count};
                    } );
                }
                return approve();
            } ).then( result => {
                callback( null, result );
            } ).catch( function( err ) {
                Y.log( 'could not approve valid edoc docs: ' + err, 'error', NAME );
                callback( err );
            } );
        }

        function isHgvCaseNoLocked( args ) {
            Y.log('Entering Y.doccirrus.api.edoc.isHgvCaseNoLocked', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edoc.isHgvCaseNoLocked');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.patientId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'activity',
                action: 'count',
                query: {
                    patientId: params.patientId,
                    dmpDeliveryRef: {$ne: null},
                    actType: {$in: Y.doccirrus.schemas.activity.eHgvActTypes}
                }
            } )
                .then( count => 0 < count )
                .then( isLocked => callback( null, {isLocked} ) )
                .catch( err => callback( err ) );
        }

        function checkHgvCaseNo( args ) {
            Y.log('Entering Y.doccirrus.api.edoc.checkHgvCaseNo', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.edoc.checkHgvCaseNo');
            }
            const
                user = args.user,
                patientId = args.originalParams && args.originalParams.patientId,
                HGVPatientNo = args.originalParams && args.originalParams.HGVPatientNo,
                callback = args.callback;

            if( !patientId || !HGVPatientNo ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            runDb( {
                user: user,
                model: 'patient',
                action: 'count',
                query: {
                    _id: {$ne: patientId},
                    HGVPatientNo
                }
            } ).then( count => {
                callback( null, {valid: !count} );
            } ).catch( err => {
                Y.log( 'could check edmp case no: ' + err, 'error', NAME );
                callback( err );
            } );
        }


        Y.namespace( 'doccirrus.api' ).edoc = {

            name: NAME,
            buildFile,
            deleteFile,
            get: GET,
            approveValidDocs,
            isHgvCaseNoLocked,
            checkHgvCaseNo
        };

    },
    '0.0.1', {requires: ['casefolder-schema', 'qdocu-utils', 'qdocu-filebuilder', 'edmp-utils', 'edmp-filebuilder', 'edoc-filewriter', 'tempdir-manager', 'xpm', 'activity-schema', 'edmp-commonutils', 'edmp-indication-mappings', 'activity-schema', 'edoc-converter', 'hgv-filebuilder']}
);
