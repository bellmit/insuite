/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edoc-utils', function( Y, NAME ) {

        const
            Iconv = require( 'iconv' ).Iconv,
            iconv = new Iconv( 'utf-8', 'iso-8859-15//TRANSLIT//IGNORE' ),
            Promise = require( 'bluebird' ),
            joinPaths = require( 'path' ).join,
            readDir = Promise.promisify( require( 'fs' ).readdir ),
            readFile = Promise.promisify( require( 'fs' ).readFile ),
            writeFile = Promise.promisify( require( 'fs' ).writeFile ),
            extname = require( 'path' ).extname,
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            executeEvl = Y.doccirrus.evl.execute,
            actTypeArchivePathMap = {
                DM2: 'Diabetes_Mellitus_Typ_2/Dokumentation',
                DM1: 'Diabetes_Mellitus_Typ_1/Dokumentation',
                BK: 'Brustkrebs/Dokumentation',
                HGV: 'QSHGV/Dokumentation',
                HGVK: 'QSHGVK/Dokumentation',
                KHK: 'Koronare_Herzkrankheit/Dokumentation',
                COPD: 'COPD/Dokumentation',
                ASTHMA: 'Asthma_bronchiale/Dokumentation',
                EHKSD: 'eHKS/Dokumentation',
                EHKSND: 'eHKS/Dokumentation',
                QDOCU: 'qDocu/Dokumentation'
            };

        function getEmployeeIdAndLocationIdFromLastEdmpActivity( user, patientId, actType ) {
            return runDb( {
                user: user,
                model: 'activity',
                query: {
                    patientId: patientId,
                    actType: Array.isArray( actType ) ? {
                        $in: actType
                    } : actType,
                    status: {
                        $in: ['CREATED', 'VALID', 'APPROVED', 'SENT']
                    }
                },
                options: {
                    limit: 1,
                    sort: {
                        timestamp: -1
                    },
                    select: {
                        locationId: 1,
                        employeeId: 1
                    }
                }
            } ).get( 0 ).then( last => {
                if( !last ) {
                    return null;
                }
                return {
                    locationId: last.locationId,
                    employeeId: last.employeeId
                };
            } );
        }

        function getEmployeeIdAndLocationId( user, patientId, insuranceType ) {
            insuranceType = insuranceType || 'PUBLIC'; // MOJ-14319: [OK] [EDOCS]

            return runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: {
                    limit: 1,
                    lean: true,
                    select: {
                        'insuranceStatus.locationId': 1,
                        'insuranceStatus.employeeId': 1,
                        'insuranceStatus.type': 1
                    }
                }
            } ).get( 0 ).then( patient => {
                if( !patient ) {
                    throw Error( 'could not find patient with id ' + patientId );
                }

                const
                    userEmployeeId = user.specifiedBy,
                    publicInsurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, insuranceType ),
                    insuranceLocationId = publicInsurance && publicInsurance.locationId || null,
                    insuranceEmployeeId = publicInsurance && publicInsurance.employeeId || null;

                let
                    locationId = insuranceLocationId,
                    employeeId = insuranceEmployeeId || userEmployeeId;

                return (!employeeId ? Promise.resolve() : runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        _id: employeeId
                    },
                    options: {
                        limit: 1,
                        lean: true,
                        select: {
                            type: 1
                        }
                    }
                } ).get( 0 )).then( employee => {
                    if( (employee && 'PHYSICIAN' !== employee.type) || !employee ) {
                        employeeId = null;
                    }
                    if( employeeId && employeeId === userEmployeeId && insuranceLocationId ) {

                        const
                            userLocations = user.locations,
                            isInsuranceLocationIdInUserLocations = insuranceLocationId && userEmployeeId && userLocations.some( userLocation => {
                                return userLocation._id === insuranceLocationId;
                            } );
                        if( !isInsuranceLocationIdInUserLocations ) {
                            locationId = null;
                        }
                    }

                    return {
                        employeeId: employeeId,
                        locationId: locationId ? (new require( 'mongodb' ).ObjectID( locationId )) : null
                    };
                } );
            } );
        }

        function processResult( user, activity, processFns ) {
            let index = 0;
            const next = () => {
                if( index >= processFns.length ) {
                    return Promise.resolve();
                }
                return new Promise( ( resolve, reject ) => {
                    processFns[index]( user, activity, ( err, _activity ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( _activity );
                    } );
                    index++;
                } ).then( next );

            };

            return next();
        }

        function getDmpDeliveryInfo( activityContext ) {
            const
                patient = activityContext && activityContext.patient,
                location = activityContext && activityContext.location,
                kv = location && location.kv,
                publicInsurance = patient && patient.insuranceStatus;
            return {
                costCarrierBillingGroup: publicInsurance && publicInsurance.costCarrierBillingGroup,
                kv: kv
            };
        }

        function resetEdocStatus( activity ) {
            return Object.assign( activity, {
                dmpFileId: null,
                dmpErrors: null
            } );
        }

        function removeFile( user, id ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.gridfs.delete( user, id, ( err, result ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( result );
                } );
            } );
        }

        function getArchivePathByActType( actType ) {
            return actTypeArchivePathMap[actType];
        }

        function createEvlConfig( data ) {
            const
                configTemplatePath = joinPaths( __dirname, '..', 'assets', 'xml', 'konfigEVL_Praxis_template.xml' ),
                sddaTemplatePath = joinPaths( __dirname, '..', 'assets', 'xml', 'evl_sdda_template.xml' ); // create template
            if( !data.LISTS_PATH || !data.SDDA || !data.ADDRESSEE_IK || !data.ADDRESSEE_NAME ) {
                throw Error( 'could not create evl config: missing data' );
            }
            return Promise.props( {
                config: readFile( configTemplatePath ).then( xml => {
                    if( !xml ) {
                        throw Error( 'unable to read evl config template' );
                    }
                    return xml.toString()
                        .replace( '$LISTS_PATH', data.LISTS_PATH )
                        .replace( '$LISTS_PATH', data.LISTS_PATH )
                        .replace( '$LISTS_PATH', data.LISTS_PATH )
                        .replace( '$BSNR', data.BSNR || '' )
                        .replace( '$LANR', data.LANR || '' )
                        .replace( '$FIRSTNAME', data.FIRSTNAME || '' )
                        .replace( '$LASTNAME', data.LASTNAME || '' )
                        .replace( '$TITLE', data.TITLE || '' )
                        .replace( '$POB', data.POB || '' )
                        .replace( '$STREET', data.STREET || '' )
                        .replace( '$HOUSE_NO', data.HOUSE_NO || '' )
                        .replace( '$ZIP', data.ZIP || '' )
                        .replace( '$CITY', data.CITY || '' )
                        .replace( '$PHONE', data.PHONE || '' )
                        .replace( '$SDDA', data.SDDA );

                } ).then( iconv.convert ).catch( err => {
                    Y.log( `could not read evl config template ${err}`, 'error', NAME );
                    throw err;
                } ),
                sdda: readFile( sddaTemplatePath ).then( xml => {
                    if( !xml ) {
                        throw Error( 'unable to read evl sdda template' );
                    }
                    return xml.toString()
                        .replace( '$ADDRESSEE_IK', data.ADDRESSEE_IK )
                        .replace( '$ADDRESSEE_NAME', data.ADDRESSEE_NAME );
                } ).then( iconv.convert ).catch( err => {
                    Y.log( `could not read evl config template ${err}`, 'error', NAME );
                    throw err;
                } )
            } );
        }

        function writeEvlConfigs( configs ) {
            return Promise.each( configs, config => {
                return writeFile( config.filePath, config.data ).catch( err => {
                    Y.log( `could not write evl config ${config.fileName} ${err}`, 'error', NAME );
                    throw err;
                } );
            } );
        }

        function getEmployee( user, employeeId ) {
            return runDb( {
                user,
                model: 'employee',
                query: {
                    _id: employeeId
                },
                options: {
                    lean: true,
                    limit: 1,
                    select: {
                        officialNo: 1,
                        title: 1,
                        firstname: 1,
                        lastname: 1
                    }
                }
            } ).get( 0 );
        }

        function getLocation( user, locationId ) {
            return runDb( {
                user,
                model: 'location',
                query: {
                    _id: locationId
                },
                options: {
                    lean: true,
                    limit: 1,
                    select: {
                        street: 1,
                        houseno: 1,
                        zip: 1,
                        city: 1,
                        phone: 1
                    }
                }
            } ).get( 0 );
        }

        function getSenderData( user, employeeId, locationId ) {
            var props = {},
                data = {};

            if( employeeId ) {
                props.employee = getEmployee( user, employeeId );
            }

            if( locationId ) {
                props.location = getLocation( user, locationId );
            }

            if( !Object.keys( props ).length ) {
                return data;
            }

            return Promise.props( props ).then( result => {
                return {
                    LANR: result.employee && result.employee.officialNo,
                    TITLE: result.employee && result.employee.title,
                    FIRSTNAME: result.employee && result.employee.firstname,
                    LASTNAME: result.employee && result.employee.lastname,
                    STREET: result.location && result.location.street,
                    HOUSE_NO: result.location && result.location.houseno,
                    ZIP: result.location && result.location.zip,
                    CITY: result.location && result.location.city,
                    PHONE: result.location && result.location.phone
                };
            } );
        }

        function getEvlAckFilePath( tmpPath ) {
            const pdf = '.pdf';
            return readDir( tmpPath ).then( files => {
                let resultFileName;
                files.some( fileName => {
                    if( extname( fileName ).toLowerCase() === pdf ) {
                        resultFileName = fileName;
                        return true;
                    }
                } );
                if( !resultFileName ) {
                    throw Error( 'could find pdf in tmp folder' );
                }
                return resultFileName;
            } );
        }

        function createEvlFromArchive( user, zipFileName, cwd, delivery ) {
            const
                archivePath = joinPaths( cwd, zipFileName ),
                tmp = joinPaths( cwd, 'tmp' ),
                configFileName = 'config.xml',
                sddaFileName = 'sdda.xml',
                configPath = joinPaths( tmp, configFileName ),
                sddaPath = joinPaths( tmp, sddaFileName );

            return getSenderData( user, delivery.evlEmployeeId, delivery.locationId ).then( senderData => {
                if( !senderData ) {
                    throw Error( 'no sender senderData created' );
                }
                return createEvlConfig( Object.assign( senderData, {
                    LISTS_PATH: tmp,
                    BSNR: delivery.commercialNo,
                    SDDA: sddaPath, // create file...
                    ADDRESSEE_IK: delivery.addresseeIk,
                    ADDRESSEE_NAME: delivery.addresseeName
                } ) );

            } ).then( result => {
                return writeEvlConfigs( [
                    {
                        fileName: configFileName,
                        filePath: configPath,
                        data: result.config
                    }, {
                        fileName: sddaFileName,
                        filePath: sddaPath,
                        data: result.sdda
                    }
                ] );
            } ).then( () => {
                return executeEvl( {
                    archivePath,
                    configPath,
                    createAck: true,
                    cwd
                } );
            } ).then( () => {
                return getEvlAckFilePath( tmp );
            } ).then( ackFileName => {
                return Y.doccirrus.edmputils.readAndWriteFile( user, ackFileName, joinPaths( tmp, ackFileName ) ).then( ackFileId => {
                    return {ackFileName, ackFileId};
                } );
            } ).catch( err => {
                Y.log( `could not execute kbv-evl module ${err}`, 'error', NAME );
            } );
        }

        /**
         * Utility function for MOJ-8596 where and magical utf-8 xml header is inserted at the top of the file.
         * We generate xml files containing only one line.
         * @param {String} str
         * @param {String} comment
         * @param {String} moduleName
         * @param {Object} user
         */
        function inspectEdocXML( str, comment = '-', moduleName = '-', user ) {
            const
                maxNewLines = 1;
            if( 'string' === typeof str ) {
                const
                    nNewLines = str.split( '\n' ).length,
                    notify = maxNewLines < nNewLines || str.includes( 'UTF-8' ),
                    log = `inspectEdocXML call from ${moduleName} with comment ${comment}: len: ${str.length} nNewLines: ${nNewLines} notify: ${notify} excerpt: ${str.substring( 0, 1024 )}`;
                Y.log( log, 'debug', NAME );
                if( notify ) {
                    Y.doccirrus.email.sendEmail( {
                        user,
                        to: 'dev@doc-cirrus.com',
                        from: 'do@doc-cirrus.com',
                        subject: 'Eine vermeindlich fehlerhafte eDokumentation wurde geschrieben (MOJ-9034)',
                        text: `Log: ${log}`
                    }, () => {
                    } );
                }
            } else {
                Y.log( `inspectEdocXML call without string from ${moduleName} with comment ${comment}`, 'debug', NAME );
            }
        }

        function getFile( user, id ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.gridfs.get( user, id, ( err, result ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( result );
                } );
            } );
        }

        function readFileAndInspectXML( user, fileId, comment = '-', moduleName = '-' ) {
            return getFile( user, fileId ).catch( err => {
                Y.log( `could not read file to inspect edoc xml ${err && err.stack || err}`, 'error', NAME );
                throw err;
            } ).then( result => {
                const b = result && result.data && result.data.toString( 'latin1' ) || '';
                inspectEdocXML( b, comment, moduleName, user );
            } );
        }

        Y.namespace( 'doccirrus' ).edocutils = {

            name: NAME,
            getEmployeeIdAndLocationId,
            getEmployeeIdAndLocationIdFromLastEdmpActivity,
            process: processResult,
            getDmpDeliveryInfo,
            resetEdocStatus,
            removeFile,
            getArchivePathByActType,
            createEvlFromArchive,
            inspectEdocXML,
            readFileAndInspectXML
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'evl', 'dcemail']}
);