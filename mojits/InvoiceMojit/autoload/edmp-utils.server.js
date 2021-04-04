/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edmp-utils', function( Y, NAME ) {

        const
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            moment = require( 'moment' ),
            Prom = require( 'bluebird' ),
            path = require( 'path' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            readFile = Prom.promisify( require( 'fs' ).readFile ),
            exec = Prom.promisify( require( 'child_process' ).exec ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            getModel = Prom.promisify( Y.doccirrus.mongodb.getModel ),
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
            actTypeToSddaDmpType = Y.doccirrus.edmpcommonutils.actTypeToSddaDmpType,
            isEhks = Y.doccirrus.schemas.activity.isEhks,
            removeFile = Y.doccirrus.edocutils.removeFile,

            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,

            actTypePmPathMap = {},
            edmpMedDataMapper = {
                [MedDataTypes.WEIGHT]: function( data, activity ) {
                    activity.dmpWeight = data.value;
                },
                [MedDataTypes.HEIGHT]: function( data, activity ) {
                    activity.dmpHeight = data.value;
                },
                [MedDataTypes.BLOODPRESSURE]: function( data, activity ) {
                    const splittedBloodPresure = data.textValue && data.textValue.split( '/' );
                    if( !splittedBloodPresure || !splittedBloodPresure.length ) {
                        return;
                    }
                    activity.dmpBloodPressureSystolic = +splittedBloodPresure[0];
                    activity.dmpBloodPressureDiastolic = +splittedBloodPresure[1];
                },
                [MedDataTypes.SMOKER]: function( data, activity ) {
                    activity.dmpSmoker = 'Nichtraucher' === data.textValue ? 'NO' : 'YES';
                },
                [MedDataTypes.LDL]: function( data, activity ) {
                    if( 'KHK' !== activity.actType ) {
                        return;
                    }
                    activity.dmpLdlCholesterolValue = data.value;
                    activity.dmpLdlCholesterolUnit = 'mg/dl' === data.unit ? 'MGDL' : 'MMOLL';
                    activity.dmpLdlCholesterolNotDetermined = false;
                },
                [MedDataTypes.HBA1C]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpHbA1cValue = data.value;
                    activity.dmpHbA1cUnit = '%' === data.unit ? 'PERCENT' : 'MMOLMOL';
                },
                [MedDataTypes.EGFR]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpEGFR = data.value;
                    activity.dmpEGFRNotDetermined = false;
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.HBA1C_PERCENT]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpHbA1cValue = data.labTestResultVal;
                    activity.dmpHbA1cUnit = 'PERCENT';
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.HBA1C_MMOLMOL]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpHbA1cValue = data.labTestResultVal;
                    activity.dmpHbA1cUnit = 'MMOLMOL';
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.GFR]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpEGFR = data.labTestResultVal;
                    activity.dmpEGFRNotDetermined = false;
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.LDL_MGDL]: function( data, activity ) {
                    if( !['KHK'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpLdlCholesterolValue = data.labTestResultVal;
                    activity.dmpLdlCholesterolUnit = 'MGDL';
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.LDL_MMOL]: function( data, activity ) {
                    if( !['KHK'].includes( activity.actType ) ) {
                        return;
                    }
                    activity.dmpLdlCholesterolValue = data.labTestResultVal;
                    activity.dmpLdlCholesterolUnit = 'MMOLL';
                },
                [Y.doccirrus.schemas.v_labdata.labDataTypes.URIN]: function( data, activity ) {
                    if( !['DM1', 'DM2'].includes( activity.actType ) ) {
                        return;
                    }
                    //TODO: test data YES | NO | NOT_MEASURED
                    activity.dmpPathoUrinAlbAus = data.labTestResultVal;
                }
            },
            edmpMedDataTypes = Object.keys( edmpMedDataMapper ),
            mapUnitToEdmp = {
                '%': 'PERCENT',
                'mmol/mol': 'MMOLMOL',
                'mg/dl': 'MGDL',
                'mmol/l': 'MMOLL'

            },
            mapUnitToMedData = {
                'PERCENT': '%',
                'MMOLMOL': 'mmol/mol',
                'MGDL': 'mg/dl',
                'MMOLL': 'mmol/l'
            },
            getEmployeeIdAndLocationId = Y.doccirrus.edocutils.getEmployeeIdAndLocationId,
            getEmployeeIdAndLocationIdFromLastEdmpActivity = ( user, patientId ) => Y.doccirrus.edocutils.getEmployeeIdAndLocationIdFromLastEdmpActivity( user, patientId, Y.doccirrus.schemas.casefolder.eDmpTypes );

        /**
         * Get latest lab data, lab data tags and find mapped lab data for dmp
         *
         * @param {Object} user
         * @param {String} patientId
         *
         * @return {Promise} Promise that resolve array of mapped lab data (set type field with Standard Type from tag.mapping)
         */
        async function getMappedLabdataForPatient( user, patientId ) {
            const
                getLatestLabDataForPatient = promisifyArgsCallback( Y.doccirrus.api.labdata.getLatestLabDataForPatient );

            let mappedLabData = [];

            let [err, labData] = await formatPromiseResult(
                getLatestLabDataForPatient( {
                    user,
                    originalParams: {
                        patientId
                    }
                } )
            );

            if( err ){
                Y.log( `getLatestLabAndMeddataForPatient: Error getting latest lab data ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !labData || !labData.length ){
                return mappedLabData;
            }

            //get labData tag mapping
            let tagMappings;
            [err, tagMappings] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'tag',
                    action: 'get',
                    query: {
                        type: Y.doccirrus.schemas.tag.tagTypes.LABDATA,
                        "mapping.0": { $exists: true }
                    }
                } )
            );

            if( err ){
                Y.log( `getLatestLabAndMeddataForPatient: Error getting tag mapping data ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            if( !tagMappings || !tagMappings.length ){
                return mappedLabData;
            }

            labData.map( el => {
                let mappingTag = tagMappings.find( tag => tag.title && tag.title.toUpperCase() === (el.labHead || '').toUpperCase() );
                (mappingTag && mappingTag.mapping || []).map( mapType => {
                    mappedLabData.push( {...el, type: mapType} );
                } );
            } );

            return mappedLabData;
        }

        /**
         * Get latest med data
         *
         * @param {Object} user
         * @param {String} patientId
         *
         * @return {Promise}    Promise that resolve array of latest med data
         */
        async function getLatestMeddataForPatient( user, patientId ) {
            // TODOOO licence check? at least settings check!!!
            const
                getLatestMedDataForPatient = promisifyArgsCallback( Y.doccirrus.api.meddata.getLatestMeddataForPatient );

            let [err, medData] = await formatPromiseResult(
                getLatestMedDataForPatient( {
                    user,
                    originalParams: {
                        patientId
                    }
                } )
            );

            if( err ){
                Y.log( `getLatestLabAndMeddataForPatient: Error getting latest med data ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return medData;
        }

        /**
         * execute mapper functions for latest lab and med data
         *
         * @param {Array}   medData
         * @param {Object} activity
         *
         * @return {Object} activity - activity with new fields populated by mappers functions
         */
        function mapMedDataWithEdmpActivity( medData, activity ) {
            medData.filter( data => edmpMedDataTypes.includes( data.type ) ).forEach( data => {
                const mapper = edmpMedDataMapper[data.type];
                if( 'function' !== typeof mapper ) {
                    return;
                }
                mapper( data, activity );
            } );
            return activity;
        }

        function isMedDataEdmpDataTransferEnabled( user ) {
            return new Prom( ( resolve, reject ) => {
                Y.doccirrus.api.incaseconfiguration.readConfig( {
                    user: user,
                    callback: ( err, config ) => {
                        if( err ) {
                            Y.log( 'could not get incaseconfiguration ' + err, 'error', NAME );
                            reject( err );
                            return;
                        }

                        resolve( config && true === config.medDataEdmpDataTransfer );
                    }
                } );
            } );
        }

        async function setLatestLabAndMedData( user, activity, callback ) {

            let [err, isEnabled] = await formatPromiseResult(
                isMedDataEdmpDataTransferEnabled( user )
            );

            if( err ){
                Y.log( `setLatestLabAndMedData: Error checking Edmp data transfer Enabled ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !isEnabled ){
                return callback( null, activity );
            }

            let medData;
            [err, medData] = await formatPromiseResult(
                getLatestMeddataForPatient( user, activity.patientId )
            );

            if( err ){
                Y.log( `setLatestLabAndMedData: Error getting latest medData ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let labData;
            [err, labData] = await formatPromiseResult(
                getMappedLabdataForPatient( user, activity.patientId )
            );

            if( err ){
                Y.log( `setLatestLabAndMedData: Error getting latest labData ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            activity = mapMedDataWithEdmpActivity( [...(labData|| []), ...medData], activity );

            callback( null, activity );
        }

        function getMedDataByType( type, medData ) {
            return medData.find( data => data.type === type );
        }

        function getLatestMedDataCaseFolderId( user, patientId ) {
            return runDb( {
                user: user,
                model: 'activity',
                query: {
                    patientId: patientId,
                    actType: 'MEDDATA',
                    status: {$ne: 'CANCELLED'}
                },
                options: {
                    lean: true,
                    sort: {timestamp: -1},
                    limit: 1,
                    select: {
                        caseFolderId: 1
                    }
                }
            } ).get( 0 ).then( activity => {
                if( activity && activity.caseFolderId ) {
                    return activity.caseFolderId;
                }
                // get first GKV case folder, must exist because an valid eDMP doc needs a SCHEIN
                return runDb( {
                    user: user,
                    model: 'casefolder',
                    query: {
                        patientId: patientId,
                        type: 'PUBLIC', // MOJ-14319: [OK] [EDOCS]
                        additionalType: null
                    },
                    options: {
                        lean: true,
                        limit: 1
                    }
                } ).then( caseFolder => {
                    if( caseFolder && caseFolder[0] && caseFolder[0]._id ) {
                        return caseFolder[0]._id.toString();
                    }
                    Y.log( 'could not get casefolder id for new meddata created from edmp. patientId: ' + patientId, 'error', NAME );
                    return null;
                } );
            } );
        }

        function createMedData( user, activity ) {
            var newMedData = [];

            return getLatestMeddataForPatient( user, activity.patientId ).then( medData => {
                if( 0 === activity.dmpWeight || activity.dmpWeight ) {
                    let weightData = getMedDataByType( MedDataTypes.WEIGHT, medData );
                    if( !weightData || (weightData && weightData.value !== activity.dmpWeight) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.WEIGHT,
                            value: activity.dmpWeight,
                            unit: 'kg'
                        } );
                    }
                }

                if( 0 === activity.dmpHeight || activity.dmpHeight ) {
                    let heightData = getMedDataByType( MedDataTypes.HEIGHT, medData );
                    if( !heightData || (heightData && heightData.value !== activity.dmpHeight) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.HEIGHT,
                            value: activity.dmpHeight,
                            unit: 'm'
                        } );
                    }
                }

                if( activity.dmpBloodPressureSystolic && activity.dmpBloodPressureDiastolic ) {
                    let newVal = [activity.dmpBloodPressureSystolic, activity.dmpBloodPressureDiastolic].join( '/' );
                    let bloodPressureData = getMedDataByType( MedDataTypes.BLOODPRESSURE, medData );

                    if( !bloodPressureData || (bloodPressureData && bloodPressureData.textValue !== newVal) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.BLOODPRESSURE,
                            value: null,
                            textValue: newVal,
                            unit: 'mmHg'
                        } );
                    }
                }

                if( 'boolean' === typeof activity.dmpSmoker ) {
                    let smokerData = getMedDataByType( MedDataTypes.SMOKER, medData );
                    let isMedDataSmoker = smokerData && ['leichter Raucher', 'starker Raucher'].includes( smokerData.textValue );

                    if( !isMedDataSmoker || (isMedDataSmoker !== activity.smoker ) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.SMOKER,
                            textValue: activity.smoker ? 'leichter Raucher' : 'Nichtraucher',
                            unit: ''
                        } );
                    }
                }

                if( 'KHK' === activity.actType && (0 === activity.dmpLdlCholesterolValue || activity.dmpLdlCholesterolValue ) && activity.dmpLdlCholesterolUnit && false === activity.dmpLdlCholesterolNotDetermined ) {
                    let ldlData = getMedDataByType( MedDataTypes.LDL, medData );
                    if( !ldlData || (ldlData.value !== activity.dmpLdlCholesterolValue) || mapUnitToEdmp[ldlData.unit] !== activity.dmpLdlCholesterolUnit ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.LDL,
                            value: activity.dmpLdlCholesterolValue,
                            unit: mapUnitToMedData[activity.dmpLdlCholesterolUnit]
                        } );
                    }
                }

                if( ['DM1', 'DM2'].includes( activity.actType ) && (0 === activity.dmpHbA1cValue || activity.dmpHbA1cValue  ) ) {
                    let hba1cData = getMedDataByType( MedDataTypes.HBA1C, medData );
                    if( !hba1cData || (hba1cData.value !== activity.dmpHbA1cValue || mapUnitToEdmp[hba1cData.unit] !== activity.dmpHbA1cUnit) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.HBA1C,
                            value: activity.dmpHbA1cValue,
                            unit: mapUnitToMedData[activity.dmpHbA1cUnit]
                        } );
                    }
                }

                if( ['DM1', 'DM2'].includes( activity.actType ) && (0 === activity.dmpEGFR || activity.dmpEGFR  ) && false === activity.dmpEGFRNotDetermined ) {
                    let egfrData = getMedDataByType( MedDataTypes.EGFR, medData );

                    if( !egfrData || (egfrData.value !== activity.dmpEGFR) ) {
                        newMedData.push( {
                            category: MedDataCategories.BIOMETRICS,
                            type: MedDataTypes.EGFR,
                            value: activity.dmpEGFR,
                            unit: 'ml'
                        } );
                    }
                }

                if( newMedData.length ) {
                    return getLatestMedDataCaseFolderId( user, activity.patientId ).then( caseFolderId => {
                        return runDb( {
                            user: user,
                            action: 'post',
                            model: 'activity',
                            data: {
                                actType: 'MEDDATA',
                                timestamp: new Date(),
                                caseFolderId: caseFolderId,
                                patientId: activity.patientId,
                                employeeId: activity.employeeId,
                                locationId: activity.locationId,
                                medData: newMedData,
                                status: 'VALID',
                                skipcheck_: true
                            }
                        } ).then( () => {
                            Y.log( 'created new med data activity from eDMP change', 'debug', NAME );
                        } ).catch( err => {
                            Y.log( 'could not create new med data activity from eDMP change ' + err, 'error', NAME );
                        } );
                    } );
                }
            } );
        }

        if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
            actTypePmPathMap.DM1 = path.join( envConfig.directories.xpmKvdt, 'dm1' );
        }

        function processResult( user, activity ) {
            const processFns = [
                Y.doccirrus.schemaprocess.activity.updateEditor,
                Y.doccirrus.schemaprocess.activity.setEmployeeName,
                setDmpTypeProcess,
                setLatestLabAndMedData
            ];
            return Y.doccirrus.edocutils.process( user, activity, processFns );
        }

        function setDmpTypeProcess( user, activity, callback ) {
            function diagnosisChainInfoCb( err, result ) {

                if( err ) {
                    return callback( err );
                }

                // set the current activity's dmpType, depending on the history
                if ( result.firstDocumentationIsPreOperative && !result.postOperativeDocumentationExists ) {
                    activity.dmpType = 'PNP';
                } else if( result.firstDocumentationExists || result.docIds.length > 0 ) {
                    activity.dmpType = 'FOLLOWING';
                } else {
                    activity.dmpType = 'FIRST';
                }

                callback( null, activity );

            }

            Y.doccirrus.api.edmp.collectDiagnosisChainInfo( {
                user: user,
                originalParams: {
                    patientId: activity.patientId,
                    caseFolderId: activity.caseFolderId,
                    timestamp: activity.timestamp,
                    actType: activity.actType
                },
                callback: diagnosisChainInfoCb
            } );
        }

        function createFileName( context ) {
            let extension;

            if (context.edmp.type === "BK") {
                if (context.edmp.isFirst || context.edmp.isPnp) {
                    extension = 'EBK';
                } else if (context.edmp.isFollowing) {
                    extension = 'FBK';
                }
            }

            if (context.edmp.type !== "BK") {
                extension = context.edmp.isFollowing ? 'EV' : 'EE';
                switch( context.edmp.type ) {
                    case 'DM1':
                        extension += 'D1';
                        break;
                    case 'DM2':
                        extension += 'D2';
                        break;
                    case 'ASTHMA':
                        extension += 'AB';
                        break;
                    case 'COPD':
                        extension += 'CO';
                        break;
                    case 'KHK':
                        extension += 'KHK';
                        break;
                }
            }

            return `${context.location.institutionCode || context.location.commercialNo}_${context.patient.edmpCaseNo}_${moment( context.activity.dmpHeadDate ).format( 'YYYYMMDD' )}.${extension}`;
        }

        function getPmNameByActType( actType ) {
            switch( actType ) {
                case 'DM1':
                    return 'pm-dm1';
                case 'DM2':
                    return 'pm-dm2';
                case 'BK':
                    return 'pm-bk';
                case 'ASTHMA':
                    return 'pm-asthma';
                case 'COPD':
                    return 'pm-copd';
                case 'KHK':
                    return 'pm-khk';
            }
        }

        function getDocType( edmpActType, isFollowing ) {
            switch( edmpActType ) {
                case 'DM1':
                    return isFollowing ? {
                        id: 'EDMP_DIABETES1_EV',
                        text: 'Verlaufsdokumentation Diabetes Typ 1'
                    } : {
                        id: 'EDMP_DIABETES1_EE',
                        text: 'Erstmalige Dokumentation Diabetes Typ 1'
                    };
                case 'DM2':
                    return isFollowing ? {
                        id: 'EDMP_DIABETES2_EV',
                        text: 'Verlaufsdokumentation Diabetes Typ 2'
                    } : {
                        id: 'EDMP_DIABETES2_EE',
                        text: 'Erstmalige Dokumentation Diabetes Typ 2'
                    };
                case 'ASTHMA':
                    return isFollowing ? {
                        id: 'EDMP_ASTHMA_EV',
                        text: 'Verlaufsdokumentation Asthma bronchiale'
                    } : {
                        id: 'EDMP_ASTHMA_EE',
                        text: 'Erstmalige Dokumentation Asthma bronchiale'
                    };
                case 'COPD':
                    return isFollowing ? {
                        id: 'EDMP_COPD_EV',
                        text: 'Verlaufsdokumentation COPD'
                    } : {
                        id: 'EDMP_COPD_EE',
                        text: 'Erstmalige Dokumentation COPD'
                    };
                case 'KHK':
                    return isFollowing ? {
                        id: 'EDMP_KHK_EV',
                        text: 'Verlaufsdokumentation Koronare Herzkrankheit'
                    } : {
                        id: 'EDMP_KHK_EE',
                        text: 'Erstmalige Dokumentation Koronare Herzkrankheit'
                    };
                case 'BK':
                    return isFollowing ? {
                        id: 'DMP_BRK_EF',
                        text: 'Folge-Dokumentation Brustkrebs'
                    } : {
                        id: 'DMP_BRK_EE',
                        text: 'Erst-Dokumentation Brustkrebs'
                    };
            }
        }

        function getPmPathByActType( actType ) {
            return actTypePmPathMap[actType];
        }

        function translateEdmpType( type ) {
            let result;

            Y.doccirrus.schemas.casefolder.getEdmpTypes().some( entry => {
                if( entry.val === type ) {
                    result = entry.i18n;
                    return true;
                }
            } );

            return result || '';
        }

        function addCaseFolders( args ) {
            let user = args.user,
                patientId = args.patientId,
                types = args.types,
                newCaseFolders = types.map( type => ({
                    patientId: patientId,
                    title: translateEdmpType( type ),
                    type: 'PUBLIC', // MOJ-14319: [OK] [EDOCS]
                    additionalType: type
                }) );

            newCaseFolders.skipcheck_ = true;

            if( !newCaseFolders.length ) {
                return Prom.resolve();
            }

            Y.log( 'add new dmp casefolder(s) patientId ' + patientId + ' edmp types ' + types, 'debug', NAME );

            return runDb( {
                user: user,
                action: 'post',
                model: 'casefolder',
                data: newCaseFolders
            } );
        }

        /**
         * Disables edmp casefolders or deletes casefolders if they are empty
         * @param {Object}      args
         * @param {Object}      args.user
         * @param {ObjectId}    args.patientId
         * @param {Array}       args.caseFolderIds
         * @returns {*}
         */
        function disableCaseFolders( args ) {
            let user = args.user,
                patientId = args.patientId,
                caseFolderIds = args.caseFolderIds,
                cfToDisable = [],
                cfToDelete = [];

            if( !caseFolderIds.length ) {
                return Prom.resolve();
            }

            Y.log( 'mark dmp casefolder(s) as disabled or delete if empty: patientId ' + patientId + ' casefolder ids ' + caseFolderIds, 'debug', NAME );

            return runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    patientId: patientId,
                    _id: {
                        $in: caseFolderIds
                    }
                },
                options: {
                    lean: true
                }
            } ).each( casefolder => {

                return runDb( {
                    user: user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        patientId: patientId,
                        caseFolderId: casefolder._id.toString()
                    }
                } ).then( count => {
                    if( 0 < count ) {
                        cfToDisable.push( casefolder._id.toString() );
                    } else {
                        cfToDelete.push( casefolder._id.toString() );
                    }
                } );

            } ).then( () => {

                let promises = [];

                if( cfToDisable.length ) {
                    promises.push( runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'put',
                        query: {
                            patientId: patientId,
                            _id: {
                                $in: caseFolderIds
                            }
                        },
                        data: {
                            disabled: true,
                            skipcheck_: true,
                            multi_: true
                        },
                        fields: 'disabled',
                        options: {
                            override: true
                        }
                    } ) );
                }

                if( cfToDelete.length ) {
                    promises.push( runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'delete',
                        query: {
                            patientId: patientId,
                            _id: {
                                $in: caseFolderIds
                            }
                        },
                        options: {
                            override: true
                        }
                    } ) );
                }

                return Prom.all( promises );
            } );
        }

        function enableCaseFolders( args ) {
            let user = args.user,
                patientId = args.patientId,
                caseFolderIds = args.caseFolderIds;

            if( !caseFolderIds.length ) {
                return Prom.resolve();
            }

            Y.log( 'mark dmp casefolder(s) as enabled patientId ' + patientId + ' casefolder ids ' + caseFolderIds, 'debug', NAME );

            return runDb( {
                user: user,
                model: 'casefolder',
                action: 'put',
                query: {
                    patientId: patientId,
                    _id: {
                        $in: caseFolderIds
                    }
                },
                data: {
                    disabled: false,
                    skipcheck_: true,
                    multi_: true
                },
                fields: 'disabled',
                options: {
                    override: true
                }
            } );

        }

        function updatePartnerId( user, patientId, add ) {
            let query = {
                    _id: (new require( 'mongodb' ).ObjectID( patientId ))
                },
                operator;

            if( add ) {
                query['partnerIds.partnerId'] = {$ne: 'EDMP'};
                operator = {$push: {partnerIds: {partnerId: 'EDMP'}}};
            } else {
                query['partnerIds.partnerId'] = 'EDMP';
                operator = {$pull: {partnerIds: {partnerId: 'EDMP'}}};
            }

            getModel( user, 'patient', true ).then( patientModel => {
                patientModel.mongoose.update( query, operator, ( err, result ) => {
                    if( err ) {
                        Y.log( 'could not update edmp partnerId ' + (err && err.stack || err), 'error', NAME );
                    } else {
                        Y.log( 'updated edmp partnerId: ' + JSON.stringify( result ), 'info', NAME );
                    }
                } );
            } );

        }

        function syncCaseFolders( args ) {
            let user = args.user,
                patientId = args.patientId,
                edmpTypes = args.edmpTypes || [],
                callback = args.callback,
                updateOnClient = false;

            // update patient.partnerIds so it is visible in "Versorgungsart" column
            // currently we can not check if edmpTypes has changed (is always set to modified by dc-core)
            updatePartnerId( user, patientId, Boolean( edmpTypes && edmpTypes.length ) );

            return runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    patientId: patientId,
                    additionalType: {
                        $in: Y.doccirrus.schemas.casefolder.getEdmpTypes().map( function( entry ) {
                            return entry.val;
                        } )
                    }
                },
                options: {
                    lean: true
                }
            } ).then( casefolders => {
                let typesToAdd = [],
                    idsToRemove = [],
                    idsToEnable = [],
                    existingTypes = casefolders.map( cf => cf.additionalType );

                casefolders.forEach( casefolder => {
                    if( -1 === edmpTypes.indexOf( casefolder.additionalType ) ) {
                        // remove / deactivate?
                        idsToRemove.push( casefolder._id.toString() );
                    }
                } );

                edmpTypes.forEach( function( type ) {
                    if( -1 === existingTypes.indexOf( type ) ) {
                        typesToAdd.push( type );
                    } else {
                        casefolders.some( cf => {
                            if( cf.additionalType === type ) {
                                idsToEnable.push( cf._id.toString() );
                                return true;
                            }
                        } );
                    }
                } );

                if( typesToAdd.length || idsToRemove.length || idsToEnable.length ) {
                    updateOnClient = true;
                }

                return addCaseFolders( {
                    user: user,
                    patientId: patientId,
                    types: typesToAdd
                } ).then( () => {
                    return disableCaseFolders( {
                        user: user,
                        patientId: patientId,
                        caseFolderIds: idsToRemove
                    } );
                } ).then( () => {
                    return enableCaseFolders( {
                        user: user,
                        patientId: patientId,
                        caseFolderIds: idsToEnable
                    } );
                } );
            } ).then( () => callback( null, updateOnClient ) ).catch( err => callback( err ) );

        }

        function storeFile( user, fileName, buff ) {
            return new Prom( function( resolve, reject ) {
                Y.doccirrus.gridfs.store( user, fileName, {
                    content_type: 'application/octet-stream',
                    metadata: {charset: 'ISO-8859-1'}
                }, buff, ( err, id ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( id );
                } );
            } );
        }

        function getPatientSubscriptions( patient ) {
            const
                patientEdmpTypes = patient.edmpTypes,
                allTypes = Y.doccirrus.schemas.casefolder.getEdmpTypes(),
                matchedTypes = allTypes.filter( t => {
                    return -1 !== patientEdmpTypes.indexOf( t.val );
                } );

            return matchedTypes;
        }

        function mergePatient( user, patientVersion, patientId ) {

            function pathsToSelect( paths ) {
                const result = {};
                paths.forEach( path => {
                    result[path] = 1;
                } );
                return result;
            }

            const
                pathsToMerge = ['edmpTypes', 'edmpCaseNo', 'edmpParticipationChronicHeartFailure'],
                patientSelect = pathsToSelect( pathsToMerge );

            function mergePatientWithVersion( patient ) {
                if( !patient ) {
                    throw Error( 'Patient Not Found' );
                }
                pathsToMerge.forEach( path => {
                    patientVersion[path] = patient[path];
                } );
                return patientVersion;
            }

            return runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: {
                    select: patientSelect,
                    lean: true
                }
            } ).get( 0 ).then( mergePatientWithVersion );
        }

        function getContextForActivity( user, activity ) {
            return Prom.props( {
                patient: mergePatient( user, activity.patientShort, activity.patientId ),
                location: runDb( {
                    user: user,
                    model: 'location',
                    query: {
                        _id: activity.locationId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ),
                employee: runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        _id: activity.employeeId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ),
                caseFolder: runDb( {
                    user: user,
                    model: 'casefolder',
                    query: {
                        _id: activity.caseFolderId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ),
                schein: runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: activity.dmpScheinRef,
                        actType: 'SCHEIN'
                    },
                    options: {
                        lean: true,
                        select: {
                            locationFeatures: 1
                        }
                    }
                } ).get( 0 )
            } ).then( props => {
                let context = Object.assign( props, {
                    activity: activity,
                    user: user,
                    xpm: getPmNameByActType( activity.actType ),
                    edmp: {
                        isFirst: activity.dmpType === 'FIRST',
                        isFollowing: activity.dmpType === 'FOLLOWING',
                        isPnp: activity.dmpType === 'PNP',
                        subscriptions: getPatientSubscriptions( props.patient ),
                        type: activity.actType,
                        quarter: activity.dmpQuarter,
                        year: activity.dmpYear
                    }
                } );
                context.fileName = createFileName( context );
                return context;
            } ).then( context => {
                // some plausibility tests
                if( -1 === context.patient.edmpTypes.indexOf( context.edmp.type ) ) {
                    throw Error( 'edmp type not subscribed' );
                } else if( context.caseFolder.additionalType !== context.edmp.type ) {
                    throw Error( 'casefolder type and edmp type do not match' );
                }

                return context;
            } );
        }

        function updateActivity( user, actId, data, options ) {
            options = options || {};
            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: {
                    _id: actId
                },
                data: data,
                options: options
            } );
        }

        function updateActivities( user, query, data, options ) {
            options = options || {};
            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: query,
                data: data,
                options: options
            } );
        }

        function readAndWriteFile( user, filename, path, debugBufferFn ) {
            return readFile( path ).then( buffer => {
                // MOJ-8596
                if( debugBufferFn ) {
                    debugBufferFn( buffer );
                }
                return storeFile( user, filename, buffer );
            } );
        }

        function createFirstDocumentation( user, config ) {
            return createEdmpActivity( user, Object.assign( {
                dmpType: 'FIRST'
            }, config ) );
        }

        function createFollowingDocumentation( user, config ) {
            config.dmpDocumentationInterval = config.dmpDocumentationInterval || "EVERY_SECOND_QUARTER";

            return createEdmpActivity( user, Object.assign( {
                dmpType: 'FOLLOWING'
            }, config ) );
        }

        async function createEdmpActivity( user, config ) {
            let
                data,
                _data,
                employeeIdAndLocationId,
                employeeIdAndLocationIdFromLastEdmp;

            if( !config.patientId || !config.caseFolderId || !config.actType ) {
                throw Error( 'missing arguments' );
            }

            employeeIdAndLocationIdFromLastEdmp = await getEmployeeIdAndLocationIdFromLastEdmpActivity( user, config.patientId );

            if( !employeeIdAndLocationIdFromLastEdmp ) {
                if( !config.locationId || !config.employeeId ) {
                    employeeIdAndLocationId = await getEmployeeIdAndLocationId( user, config.patientId );
                    data = {...config, ...employeeIdAndLocationId};
                } else {
                    data = {...config};
                    if( data.locationId ){
                        data.locationId = new ObjectId( data.locationId );
                    }
                }
            } else {
                data = {...config, ...employeeIdAndLocationIdFromLastEdmp};
            }

            _data = await getActivityData( user, data );

            await processResult( user, _data );

            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'mongoInsertOne',
                data: _data
            } ).then( function onAddedActivity( result ) {
                const insertedId = result && result.insertedId;
                if ( insertedId ) {
                    Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', insertedId.toString() );
                }
                return result;
            } );
        }

        function getActivityData( user, data ) {
            return getModel( user, 'activity', true ).then( model => {
                const
                    schemaDefaults = (new model.mongoose()).toObject(),
                    commonDefaults = {
                        dmpDocSetId: (new require( 'mongodb' ).ObjectID()).toString(),
                        timestamp: new Date(),
                        content: 'Automatisch erstellt'
                    };

                return Object.assign( schemaDefaults, commonDefaults, data || {} );
            } );
        }

        function getIdentityIds( user, empIds ) {

            return runDb( {
                user: user,
                model: 'identity',
                query: {
                    specifiedBy: {$in: empIds}
                },
                options: {
                    lean: true,
                    select: {
                        _id: 1
                    }
                }
            } ).map( identity => {
                return identity._id.toString();
            } );

        }

        // pipeline factories

        function createLastDocsPipeline( match ) {
            return [
                {
                    $match: Object.assign( {
                        actType: {$in: Y.doccirrus.schemas.casefolder.eDmpTypes},
                        caseFolderDisabled: {$ne: true}
                    }, 'object' === typeof match ? match : {} )
                },
                {$sort: {dmpQuarter: 1, dmpYear: 1}},
                {
                    $group: {
                        _id: {
                            patientId: "$patientId",
                            actType: "$actType"
                        },
                        lastDmpDocumentationInterval: {$last: "$dmpDocumentationInterval"},
                        caseFolderId: {$last: "$caseFolderId"},
                        quarter: {$last: "$dmpQuarter"},
                        year: {$last: "$dmpYear"},
                        status: {$last: "$status"},
                        employeeId: {$last: "$employeeId"},
                        locationId: {$last: "$locationId"}
                    }
                },
                {
                    $project: {
                        _id: 0,
                        patientId: "$_id.patientId",
                        caseFolderId: 1,
                        actType: "$_id.actType",
                        lastDmpDocumentationInterval: 1,
                        quarter: 1,
                        year: 1,
                        status: 1,
                        employeeId: 1,
                        locationId: 1
                    }
                }];
        }

        function getConcurrentIndicationsForActivity( user, activity, pathsToSync ) {
            const diffCrtieria = pathsToSync.map( pathObj => {
                const
                    path = pathObj.path,
                    value = activity[path],
                    criteria = {
                        actType: {$in: pathObj.actTypes}

                    };

                criteria[path] = {$ne: undefined === value ? null : value};
                return criteria;
            } );
            if( !diffCrtieria.length ) {
                return Prom.resolve( [] );
            }
            const
                query = {
                    $and: [
                        {
                            _id: {$ne: activity._id},
                            patientId: activity.patientId,
                            dmpQuarter: activity.dmpQuarter,
                            dmpYear: activity.dmpYear,
                            status: {$in: ['CREATED', 'VALID', 'INVALID']},
                            caseFolderDisabled: {$ne: true}
                        },
                        {
                            $or: diffCrtieria
                        }
                    ]
                };
            return runDb( {
                user: user,
                model: 'activity',
                query: query,
                options: {
                    lean: true,
                    select: {
                        _id: 1,
                        actType: 1,
                        status: 1,
                        dmpFileId: 1
                    }
                }
            } ).then( activities => {
                Y.log( 'found ' + (activities && activities.length || 0 ) + ' concurrent activities', 'debug', NAME );
                return activities;
            } ).map( activity => {
                delete activity.user_;
                return activity;
            } );
        }

        function getSddaEntries( user, kv ) {
            return new Promise( ( resolve, reject ) => {

                Y.doccirrus.api.catalog.getSddaEntries( {
                    user: user,
                    query: {
                        kv: kv
                    },
                    callback: ( err, results ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( results );
                        }
                    }
                } );
            } );

        }

        function addSddaShortEntry( arr, entry ) {
            let data = {
                _id: entry._id,
                catalogUsage: entry.catalogUsage || false,
                orgianizationId: entry.orgianizationId,
                kv_connect: entry.kv_connect,
                kv: entry.kv,
                ukv: entry.ukv,
                orgianizationName: entry.orgianizationName,
                constraints: entry.constraints
            };

            arr.push( data );
        }

        function extractPossibleEntries( entries, actType, costCarrierBillingGroup ) {
            const
                possibleAddresses = [],
                dmpType = actTypeToSddaDmpType( actType );

            entries.forEach( entry => {
                if( entry.catalogUsage ) {
                    // for extended sdda entries from catalogusage we only match the kv
                    addSddaShortEntry( possibleAddresses, entry );
                } else if( entry.constraints ) {
                    // for original kbv entries we must also match the given constraints: empType(DM1, DM2, KHK,...) and costCarrierBillingGroup ("Kostenträgergruppe", eg. '01')
                    return (entry.constraints || []).some( constraint => {
                        if( constraint.dmpType.includes( dmpType ) ) {
                            if( -1 !== constraint.ktGroups.indexOf( costCarrierBillingGroup ) ) {
                                addSddaShortEntry( possibleAddresses, entry );
                                return true;
                            }
                        } else {
                            return false;
                        }
                    } );
                }
            } );

            return possibleAddresses;
        }

        function getAddressees( user, actType, dmpDeliveryInfo ) {
            const
                kv = dmpDeliveryInfo.kv,
                costCarrierBillingGroup = dmpDeliveryInfo.costCarrierBillingGroup;

            return getSddaEntries( user, kv ).then( entries => {
                return extractPossibleEntries( entries, actType, costCarrierBillingGroup );
            } );
        }

        // See MOJ-10747 and https://confluence.intra.doc-cirrus.com/display/SD/eDMP+Deliveries
        function selectAddressee( actType, addressees ) {
            const catalogAddressees = addressees.filter( addressee => !addressee.catalogUsage );
            const catalogUsageAddressees = addressees.filter( addressee => addressee.catalogUsage );
            const catalogUsageAddresseesWithUkv = catalogUsageAddressees.filter( addressee => addressee.ukv );

            if( ['EHKSD', 'EHKSND'].includes( actType ) ) {
                if( addressees.length === 1 ) {
                    return addressees[0].ukv || addressees[0].orgianizationId || null;
                } else if( catalogUsageAddresseesWithUkv.length >= 1 ) {
                    return catalogUsageAddressees.length === 1 ? catalogUsageAddresseesWithUkv[0].ukv : null;
                } else if( catalogAddressees.length === 1 ) {
                    return catalogAddressees[0].orgianizationId || null;
                } else {
                    return null;
                }
            } else { // All DMP other than 'HKS'
                if( addressees.length === 1 ) {
                    return addressees[0].orgianizationId || null;
                } else if( catalogAddressees.length === 1 ) {
                    return catalogAddressees[0].orgianizationId || null;
                } else {
                    return null;
                }
            }
        }

        async function makeZip( zipFileName, pathToZip, cwd ) {
            const [err, zipCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'zip',
                    shellArgs: [
                        '-r',
                        zipFileName,
                        pathToZip
                    ]
                } )
            );

            if( err ) {
                return Promise.reject( Error( 'zip binutil path not found' ) );
            }
            return exec( zipCmd, {cwd: cwd} );
        }

        function createArchiveName( actType, commericalNo, dateOfArchiveCreation, quarter, year ) {
            let documentationType = 'ASTHMA' === actType ? 'AB' : actType;
            const
                formattedDate = dateOfArchiveCreation.format( 'YYYYMMDDHHmmss' ),
                isAfterQ42017 = Y.doccirrus.edmpcommonutils.isAfterQ( {dmpQuarter: quarter, dmpYear: year}, '4/2017' );
            if( isEhks( actType ) ) {
                documentationType = 'eHKS';
            } else if( isAfterQ42017 && 'COPD' === actType ) {
                documentationType = 'COPDneu';
            }

            if( actType === 'HGV' ) {
                documentationType = 'QSHGV';
            } else if( actType === 'HGVK' ) {
                documentationType = 'QSHGVK';
            }

            if( Y.doccirrus.edmpcommonutils.isAfterQ( {
                dmpQuarter: quarter,
                dmpYear: year
            }, Y.doccirrus.edmpcommonutils.Q1_2021 ) ) {
                switch( actType ) {
                    case 'DM1':
                        documentationType = 'DM1_504';
                        break;
                    case 'DM2':
                        documentationType = 'DM2_604';
                        break;
                    case 'COPD':
                        documentationType = 'COPD_404';
                        break;
                    case 'ASTHMA':
                        documentationType = 'AB_445';
                        break;
                    case 'KHK':
                        documentationType = 'KHK_415';
                        break;
                    case 'BK':
                        documentationType = 'BK_423';
                        break;
                }
            } else if( Y.doccirrus.edmpcommonutils.isAfterQ( {
                dmpQuarter: quarter,
                dmpYear: year
            }, Y.doccirrus.edmpcommonutils.Q1_2019 ) ) {
                switch( actType ) {
                    case 'DM1':
                        documentationType = 'DM1_503';
                        break;
                    case 'DM2':
                        documentationType = 'DM2_603';
                        break;
                    case 'COPD':
                        documentationType = 'COPD_403';
                        break;
                    case 'ASTHMA':
                        documentationType = 'AB_444';
                        break;
                    case 'KHK':
                        documentationType = 'KHK_414';
                        break;
                    case 'BK':
                        documentationType = 'BK_423';
                        break;
                }
            } else if( Y.doccirrus.edmpcommonutils.isAfterQ( {
                dmpQuarter: quarter,
                dmpYear: year
            }, Y.doccirrus.edmpcommonutils.Q3_2018 ) ) {
                switch( actType ) {
                    case 'DM1':
                        documentationType = 'DM1_502';
                        break;
                    case 'DM2':
                        documentationType = 'DM2_602';
                        break;
                    case 'COPD':
                        documentationType = 'COPD_402';
                        break;
                    case 'ASTHMA':
                        documentationType = 'AB_443';
                        break;
                    case 'KHK':
                        documentationType = 'KHK_413';
                        break;
                    case 'BK':
                        documentationType = 'BK_423';
                        break;
                }
            } else if( Y.doccirrus.edmpcommonutils.isAfterQ( {
                dmpQuarter: quarter,
                dmpYear: year
            }, Y.doccirrus.edmpcommonutils.DMP_PERS_GROUP_CHANGES_LAST_QUARTER ) ) {
                switch( actType ) {
                    case 'DM1':
                        documentationType = 'DM1_502';
                        break;
                    case 'DM2':
                        documentationType = 'DM2_602';
                        break;
                    case 'COPD':
                        documentationType = 'COPD_402';
                        break;
                    case 'ASTHMA':
                        documentationType = 'AB_443';
                        break;
                    case 'KHK':
                        documentationType = 'KHK_413';
                        break;
                    case 'BK':
                        documentationType = 'BK_421';
                        break;
                }
            }
            return `${commericalNo}_${formattedDate}_1_${documentationType}.zip`;
        }
        function createForm( user, type, data, callback ) {
            const canonicalId = 'content' === type ? '57d17261de134d6836b42f96' : '57d93d470a7e0a241e7856a2',
                NOOP = () => {
                };
            let template;

            function compiledCb( err, result ) {
                if( err ) {
                    Y.log( 'could not compile form ' + err, 'error', NAME );
                    return callback( err );
                }
                callback( null, result );
            }

            function renderedCb( err, pdfState ) {
                if( err ) {
                    Y.log( 'could not render form ' + err, 'error', NAME );
                    return callback( err );
                }
                Y.doccirrus.media.hpdf.compileFromForm( user, pdfState, NOOP, compiledCb );
            }

            function mappedCb( err ) {
                if( err ) {
                    Y.log( 'could not map form ' + err, 'error', NAME );
                    return callback( err );
                }
                template.renderPdfServer( 'db', '', '', renderedCb );
            }

            function loadedCb( err ) {

                if( err ) {
                    Y.log( 'could not load template' + err, 'error', NAME );
                    return callback( err );
                }
                const mapper = Y.dcforms.mapper.edmp( template, data );
                mapper.map( mappedCb );
            }

            function formCb( err, tpl ) {

                if( err ) {
                    Y.log( 'could not create form with id ' + canonicalId, 'error', NAME );
                    return callback( err );
                }
                template = tpl;
                template.load( canonicalId, '', loadedCb );
            }

            Y.dcforms.template.createOnServer( user, '', canonicalId, '', '', {}, false, formCb );
        }

        function writeBackupdatedCaseNo( user, file, docId, oldDmpFileId, dmpCaseNo ) {
            let dmpFileId;

            return removeFile( user, oldDmpFileId ).then( () => {
                return storeFile( user, file.filename, file.data );
            } ).then( id => {
                dmpFileId = id;
                return updateActivity( user, docId, {dmpFileId: dmpFileId, 'patientShort.edmpCaseNo': dmpCaseNo} );
            } );
        }

        Y.namespace( 'doccirrus' ).edmputils = {

            name: NAME,
            syncCaseFolders: syncCaseFolders,
            storeFile: storeFile,
            getContextForActivity: getContextForActivity,
            updateActivity: updateActivity,
            getPmNameByActType: getPmNameByActType,
            getPmPathByActType: getPmPathByActType,
            readAndWriteFile: readAndWriteFile,
            getDocType: getDocType,
            createFirstDocumentation: createFirstDocumentation,
            createFollowingDocumentation: createFollowingDocumentation,
            getIdentityIds: getIdentityIds,
            createLastDocsPipeline: createLastDocsPipeline,
            getConcurrentIndicationsForActivity: getConcurrentIndicationsForActivity,
            getAddressees: getAddressees,
            selectAddressee: selectAddressee,
            createArchiveName: createArchiveName,
            makeZip: makeZip,
            createForm: createForm,
            updateActivities: updateActivities,
            writeBackupdatedCaseNo: writeBackupdatedCaseNo,
            createMedData: createMedData,
            isMedDataEdmpDataTransferEnabled: isMedDataEdmpDataTransferEnabled,
            getLatestMeddataForPatient: getLatestMeddataForPatient,
            mapMedDataWithEdmpActivity: mapMedDataWithEdmpActivity
        };
    },
    '0.0.1', {requires: [
        'dcmongodb',
        'casefolder-schema',
        'patient-schema',
        'dcgridfs',
        'catalog-api',
        'edmp-commonutils',
        'dcauth',
        'dcforms-map-edmp',
        'dcmedia-hpdf',
        'v_meddata-schema',
        'edoc-utils',
        'meddata-api',
        'v_labdata-schema'
    ]}
);

