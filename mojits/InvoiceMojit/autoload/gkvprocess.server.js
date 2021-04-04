/**
 * User: do
 * Date: 17/05/15  20:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */




/*jslint anon:true, nomen:true*/
/*global YUI*/

YUI.add( 'dcgkvprocess', function( Y, NAME ) {

        var _ = require( 'lodash' ),
            Prom = require( 'bluebird' ),
            Path = require( 'path' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            getTmpDir = Y.doccirrus.tempFileManager.get;

        const invoiceProcessActivityFields = {
            locationFields: {
                locname: 1,
                zip: 1,
                kbvZip: 1,
                commercialNo: 1,
                street: 1,
                houseno: 1,
                city: 1,
                phone: 1,
                fax: 1,
                email: 1,
                kv: 1,
                gkvInvoiceReceiver: 1,
                konnektorProductVersion: 1,
                slMain: 1,
                slName: 1
            },
            physicianFields: {
                initials: 1,
                officialNo: 1,
                firstname: 1,
                lastname: 1,
                title: 1,
                nameaffix: 1,
                specialities: 1, // needed for krw
                asvTeamNumbers: 1,
                physicianInQualification: 1,
                rlvPhysician: 1
            },
            scheinFields: {
                scheinType: 1,
                locationId: 1,
                patientId: 1,
                employeeId: 1,
                actType: 1,
                timestamp: 1,
                icds: 1,
                continuousIcds: 1,
                scheinSpecialisation: 1,
                status: 1,
                locationFeatures: 1,
                scheinBillingArea: 1,
                fk4123: 1,
                fk4124: 1,
                fk4125from: 1,
                fk4125to: 1,
                fk4126: 1,
                fk4202: 1,
                fk4204: 1,
                fk4234: 1,
                fk4235Set: 1,
                scheinOrder: 1,
                fk4206: 1,
                scheinDiagnosis: 1,
                scheinFinding: 1,
                fk4217: 1,
                fk4241: 1,
                asvReferrer: 1,
                asvInitiator: 1,
                scheinEstablishment: 1,
                scheinRemittor: 1,
                fk4219: 1,
                scheinSubgroup: 1,
                scheinTransferType: 1,
                scheinTransferArrangementCode: 1,
                scheinTransferDateOfContact: 1,
                scheinTransferTypeInfo: 1,
                scheinSlipMedicalTreatment: 1,
                fk4229: 1,
                scheinClinicalTreatmentFrom: 1,
                scheinClinicalTreatmentTo: 1,
                fk4236: 1,
                scheinNextTherapist: 1,
                content: 1,
                caseFolderId: 1,
                scheinDate: 1,
                asvTeamnumber: 1,
                patientVersionId: 1,
                finishedWithoutPseudoCode: 1,
                pseudoGop: 1
            },
            treatmentFields: {
                patientId: 1,
                locationId: 1,
                employeeId: 1,
                employeeName: 1,
                actType: 1,
                timestamp: 1,
                code: 1,
                price: 1,
                unit: 1,
                actualPrice: 1,
                actualUnit: 1,
                content: 1,
                explanations: 1,
                daySeparation: 1,
                icds: 1,
                status: 1,
                fk5002: 1,
                fk5005: 1,
                fk5008: 1,
                fk5010BatchNumber: 1,
                fk5012Set: 1,
                fk5013: 1,
                fk5015: 1,
                fk5016: 1,
                fk5017: 1,
                fk5018: 1,
                fk5019: 1,
                fk5020Set: 1,
                fk5023: 1,
                fk5024: 1,
                fk5025: 1,
                fk5026: 1,
                fk5034: 1,
                fk5035Set: 1,
                fk5036Set: 1,
                fk5037: 1,
                fk5038: 1,
                fk5040: 1,
                fk5042Set: 1,
                fk5044: 1,
                omimCodes: 1,
                asvTeamnumber: 1,
                time: 1,
                noASV: 1,
                tsvDoctorNo: 1,
                'u_extra.pruefzeit.quartal': 1
            },
            diagnosisFields: {
                employeeId: 1,
                patientId: 1,
                actType: 1,
                timestamp: 1,
                code: 1,
                diagnosisCert: 1,
                diagnosisSite: 1,
                explanations: 1,
                diagnosisDerogation: 1,
                diagnosisType: 1,
                status: 1,
                content: 1
            }
        };

        function ensureInsuranceStatusIndex( insuranceStatus, caseFolderTypeSingle ) {
            var refinedInsurances = [];
            insuranceStatus.some( function( insurance ) {
                // MOJ-14319: [OK]
                if( caseFolderTypeSingle === insurance.type ) {
                    refinedInsurances.push( insurance );
                    return true;
                }
            } );
            return refinedInsurances;
        }

        function isReplacement( patient ) {
            // PUBLIC insurance will always be at index 0, see: ensureInsuranceStatusIndex
            var insurance = patient.insuranceStatus && patient.insuranceStatus[0];
            if( !insurance ) {
                return true;
            }
            return !insurance.cardSwipe && '00' === insurance.costCarrierBillingSection;
        }

        function getLocationZips( locationId, locations ) {
            var location = _.find( locations, {_id: locationId} );
            return {zip: location && location.zip, kbvZip: location && location.kbvZip};
        }

        function getLocationCommercialNo( locationId, locations ) {
            return _.result( _.find( locations, {_id: locationId} ), 'commercialNo' );
        }

        function getLocationGkvInvoiceReceiver( locationId, locations ) {
            return _.result( _.find( locations, {_id: locationId} ), 'gkvInvoiceReceiver' );
        }

        function getEmployee( locations, employeeId ) {
            var employee;

            locations.some( function( location ) {
                return location.physicians.some( function( physician ) {
                    if( physician._id.toString() === employeeId ) {
                        employee = physician;
                        return true;
                    }
                } );
            } );

            return employee;
        }

        function getFilename( filepath ) {
            return require( 'path' ).basename( filepath );
        }

        function generateFileName( mainLocationCommercialNo, date ) {
            var moment = require( 'moment' );
            return 'Z01' + mainLocationCommercialNo + '_' + moment( date ).format( "DD.MM.YYYY_HH.mm" ) + '.CON';
        }

        function noop() {

        }

        function mapToKrwData( schein, locations ) {
            var physician = getEmployee( locations, schein.employeeId ),
                icds = schein.diagnoses.concat( schein.continuousDiagnoses ),
                data = {
                    scheinId: schein._id.toString(),
                    patientId: schein.patientId,
                    SUG: schein.scheinSubGroup,
                    BAR: physician && physician.specialities || [],
                    diagnosis: [],
                    treatments: []
                };

            schein.treatments.forEach( function( activity ) {
                if( activity && activity.code ) {
                    data.treatments.push( {GNR: activity.code} );
                }
            } );

            icds.forEach( function( icd ) {
                if( !icd.code || !icd.diagnosisCert ) {
                    return;
                }
                data.diagnosis.push( {
                    ICD: icd.code,
                    DS: Y.doccirrus.kbvcommonutils.mapDiagnosisCert( icd.diagnosisCert ),
                    SL: icd.diagnosisSite && icd.diagnosisSite[0] || ''
                } );
            } );

            return data;
        }


        /**
         * @method start
         * @public
         *
         * run complete process of collecting activities related to invoice log, create needed invoiceEntries, etc.
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.quarter
         * @param {String} args.year
         * @param {Boolean} args.autoAssignmentOfDiagnosis
         * @param {Boolean} args.kbvFocusFunctionalityKRW
         * @param {Boolean} args.isPreValidation
         * @param {String} args.mainLocationId
         * @param {String} args.invoiceLogId
         * @param {Function|undefined} args.onProgress
         * @param {Array<String>} args.excludedPatientIds
         * @param {Array<String>} args.excludedScheinIds
         * @param {Array<String>} args.unknownInsuranceScheinIds
         * @param {Object} args.invoiceConfig
         * @param {String} args.slType
         * @param {Array<String>} args.slCommercialNo
         * @param {Array<String>} args.slReferences
         * @param {String} args.slLogId
         *
         * @returns {Promise<*>}
         */
        function start( args ) {
            const
                { user, quarter, year, autoAssignmentOfDiagnosis = false, kbvFocusFunctionalityKRW, isPreValidation = false, mainLocationId,
                  invoiceLogId, onProgress = noop, excludedPatientIds = [], excludedScheinIds = [], unknownInsuranceScheinIds = [],
                  invoiceConfig, slType, slCommercialNo, slReferences, slLogId } = args,
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                storeFile = Prom.promisify( Y.doccirrus.invoicelogutils.storeFile ),
                validateKrw = Prom.promisify( Y.doccirrus.KRWValidator.validate );


             let
                pseudoGnrLocationMap = {},
                tagtrennungLocationMap = {},

                tmpDir;

            function getPseudoGnr( locationId ) {
                return new Prom( function( resolve ) {
                    function pseudognrCb( err, pseudognr ) {
                        if( err ) {
                            Y.log( 'invoiceprocess: could not get pseudognr', 'debug', NAME );
                        }
                        pseudoGnrLocationMap[locationId] = pseudognr || {};
                        resolve( pseudognr || {} );
                    }

                    if( pseudoGnrLocationMap[locationId] ) {
                        resolve( pseudoGnrLocationMap[locationId] );
                    } else {
                        Y.doccirrus.api.kbv.pseudognr( {
                            user: args.user,
                            originalParams: {
                                locationId: locationId
                            },
                            callback: pseudognrCb
                        } );

                    }
                } );
            }

            function getDaySeparation( locationId ) {
                return new Prom( function( resolve ) {
                    function tagtrennungCb( err, tagtrennung ) {
                        if( err ) {
                            Y.log( 'invoiceprocess: could not get tagtrennung', 'debug', NAME );
                        }
                        tagtrennungLocationMap[locationId] = tagtrennung || {};
                        resolve( tagtrennung || {} );
                    }

                    if( tagtrennungLocationMap[locationId] ) {
                        resolve( tagtrennungLocationMap[locationId] );
                    } else {
                        Y.doccirrus.api.kbv.tagtrennung( {
                            user: args.user,
                            originalParams: {
                                locationId: locationId
                            },
                            callback: tagtrennungCb
                        } );
                    }
                } );

            }
            // GKV example

            return getTmpDir( args.user, 'pm' )
                .then( dir => {
                    tmpDir = dir;
                } )
                .then( () => {

                    return Y.doccirrus.invoiceprocess.collect( {
                        user,
                        mainLocationId,
                        invoiceLogId,
                        invoiceLogType: 'KBV',
                        doNotcheckCatalog: true,
                        preValidation: isPreValidation,
                        autoAssignmentOfDiagnosis,
                        excludedPatientIds,
                        excludedScheinIds,
                        unknownInsuranceScheinIds,
                        ...invoiceProcessActivityFields,
                        caseFolderType: ['PUBLIC', 'PUBLIC_A'],  // MOJ-14319: [OK]
                        isASV: Y.doccirrus.licmgr.hasSpecialModule( args.user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.ASV ) &&
                               !Y.doccirrus.licmgr.hasBaseServices( args.user.tenantId, Y.doccirrus.schemas.settings.baseServices.INVOICE ),
                        slType,
                        slCommercialNo,
                        slReferences,
                        slLogId,
                        patientFields: {
                            title: 1,
                            firstname: 1,
                            gender: 1,
                            lastname: 1,
                            nameaffix: 1,
                            addresses: 1,
                            fk3120: 1,
                            kbvDob: 1,
                            patientNo: 1,
                            sendPatientReceipt: 1,
                            'insuranceStatus._id': 1,
                            'insuranceStatus.insuranceKind': 1,
                            'insuranceStatus.insuranceGrpId': 1,
                            'insuranceStatus.costCarrierBillingGroup': 1,
                            'insuranceStatus.costCarrierBillingSection': 1,
                            'insuranceStatus.insuranceId': 1,
                            'insuranceStatus.insuranceName': 1,
                            'insuranceStatus.insurancePrintName': 1,
                            'insuranceStatus.persGroup': 1,
                            'insuranceStatus.dmp': 1,
                            'insuranceStatus.feeSchedule': 1,
                            'insuranceStatus.cardSwipe': 1,
                            'insuranceStatus.type': 1,
                            'insuranceStatus.insuranceNo': 1,
                            'insuranceStatus.cardType': 1,
                            'insuranceStatus.cardTypeGeneration': 1,
                            'insuranceStatus.cdmVersion': 1,
                            'insuranceStatus.locationFeatures': 1,
                            'insuranceStatus.fk4108': 1,
                            'insuranceStatus.fk4133': 1,
                            'insuranceStatus.fk4110': 1,
                            'insuranceStatus.fk3010': 1,
                            'insuranceStatus.fk3011': 1,
                            'insuranceStatus.fk3012': 1,
                            'insuranceStatus.fk3013': 1,
                            'insuranceStatus.createUniqCaseIdentNoOnInvoice': 1,
                            // patientversion fields
                            patientId: 1,
                            timestamp: 1
                        },
                        getScheinEnd: function( schein, nextSchein ) {
                            var end,
                                moment = require( 'moment' ),
                                scheineTimestamp = schein && schein.timestamp && moment( schein.timestamp ),
                                nextScheineTimestamp = nextSchein && nextSchein.timestamp && moment( nextSchein.timestamp );
                            if( nextScheineTimestamp && scheineTimestamp.quarter() === nextScheineTimestamp.quarter() &&
                                scheineTimestamp.year() === nextScheineTimestamp.year() ) {
                                end = nextSchein.timestamp;
                            } else {
                                end = Y.doccirrus.commonutils.getEndOfQuarter( schein.timestamp );
                            }
                            return end;
                        },
                        // optional
                        getPatientVersion: function( config, state, schein, patientFields ) {
                            return new Prom( function( resolve, reject ) {
                                if( schein.caseFolderTypeSingle === 'PUBLIC_A' ) {
                                    resolve();
                                    return;
                                }
                                Y.doccirrus.api.kbv.scheinRelatedPatientVersion( {
                                    user: args.user,
                                    originalParams: {
                                        fields: patientFields,
                                        schein: schein
                                    },
                                    callback: function( err, patient ) {
                                        if( err ) {
                                            return reject( err );
                                        }
                                        resolve( patient );
                                    }
                                } );
                            } );

                        },
                        onPatient: function( config, state, schein, patient ) {
                            return new Prom( function( resolve ) {
                                // ensure PUBLIC insurance is at index 0
                                patient.insuranceStatus = ensureInsuranceStatusIndex( patient.insuranceStatus, schein.caseFolderTypeSingle );
                                if( !isReplacement( patient ) || !patient.addresses || !patient.addresses.length ) {
                                    resolve( patient );
                                } else {
                                    Y.doccirrus.invoicelogutils.checkZip( patient.addresses, getLocationZips( schein.locationId, state.header.locations ) )
                                        .finally( function() {
                                            resolve( patient );
                                        } );
                                }
                            } );

                        },
                        getInvoiceEnd: function( state ) {
                            // pkv: return new Date()
                            return require( 'moment' )( '' + state.header.quarter + state.header.year, 'QYYYY' ).endOf( 'quarter' ).toDate();
                        },
                        // optional
                        onHeader: async function( state ) {
                            const moment = require( 'moment' );
                            state.header.quarter = quarter;
                            state.header.year = year;
                            state.header.version = Y.config.insuite.version;
                            state.header.kbvCertificationNumber = Y.config.insuite.kbv && Y.config.insuite.kbv.kvdtCertNumber;
                            state.header.mainLocationCommercialNo = getLocationCommercialNo( mainLocationId, state.header.locations );
                            state.header.destination = getLocationGkvInvoiceReceiver( mainLocationId, state.header.locations );
                            if( kbvFocusFunctionalityKRW ) {
                                state.krwValidation = {errors: []};
                            }

                            let [err, settings] = await formatPromiseResult( runDb( {
                                user: args.user,
                                model: 'settings',
                                query: {},
                                options: {
                                    fields: {
                                        avwgNo: 1
                                    }
                                }
                            } ) );

                            if( err ) {
                                Y.log( `could not get settings: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }
                            state.header.avwgNo = settings && settings[0] && settings[0].avwgNo;

                            let labDevices, labDeviceTests;

                            const locationIds = state.header.locations.map( location => location._id.toString() );

                            [err, labDevices] = await formatPromiseResult( runDb( {
                                user: args.user,
                                model: 'labdevice',
                                query: {
                                    locationId: {$in: locationIds}
                                }
                            } ) );

                            if( err ) {
                                Y.log( `could not get labdevices for locations: ${locationIds}: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }

                            [err, labDeviceTests] = await formatPromiseResult( runDb( {
                                user: args.user,
                                model: 'labdevicetest',
                                query: {
                                    locationId: {$in: locationIds}
                                }
                            } ) );

                            if( err ) {
                                Y.log( `could not get labdevicetests for locations: ${locationIds}: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }

                            state.header.locations.forEach( location => {
                                const locationLabDevices = labDevices.filter( labDevice => labDevice.locationId.toString() === location._id.toString() );
                                if( locationLabDevices.length ) {
                                    location.hasLabDevices = true;
                                    location.labDevicesIsUnitUse = locationLabDevices[0].isUnitUse;
                                    location.labDevices = locationLabDevices;
                                    location.labDeviceTests = labDeviceTests.filter( labDeviceTest => labDeviceTest.locationId.toString() === location._id.toString() );
                                } else {
                                    location.hasLabDevices = false;
                                }
                                if( moment( `${quarter}/${year}`, 'Q/YYYY' ).endOf( 'quarter' ).isAfter(
                                    moment( '1/2021', 'Q/YYYY' ).endOf( 'quarter' ) )
                                ) {
                                    location.tiServiceFlag = '0';
                                    location.tiSupportFlag = '0';
                                }
                            } );

                            return state;
                        },
                        onScheine: function( patient, scheine ) {
                            return Prom.map( scheine, async function( schein ) {
                                for( let schein of scheine ) {
                                    let [err, result] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                                        user: args.user,
                                        data: {
                                            schein
                                        },
                                        options: {silent: true}
                                    } ) );

                                    if( err ) {
                                        Y.log( `could not evaulte bl schein: ${err.stack || err}`, 'warn', NAME );
                                    } else {
                                        schein.blPseudoGnrStatus = !result.ok && 'KP2-965';
                                    }
                                }
                                return Y.doccirrus.invoicelogutils.scheinIcds( args.user, schein )
                                    .then( Y.doccirrus.invoicelogutils.populateScheinSpecialisation )
                                    .then( function( schein ) {

                                        return schein;
                                    } );
                            } );
                        },
                        onTreatments: function( isAsvCaseFolder, treatments ) {
                            const locations = this.header.locations;
                            const getObject = Y.doccirrus.commonutils.getObject;
                            treatments.forEach( treatment => {
                                treatment.quarterTime = getObject( 'u_extra.pruefzeit.quartal', treatment ) || 0;
                            } );
                            return Y.doccirrus.invoicelogutils.checkDaySeparation( treatments, getDaySeparation ).then( function( treatments ) {
                                if( true === isAsvCaseFolder ) {
                                    return treatments;
                                }
                                return Y.doccirrus.invoicelogutils.checkPseudoGnrs( treatments, getPseudoGnr );
                            } ).then( function( treatments ) {
                                return Y.doccirrus.invoicelogutils.addBsnrLanr( treatments, locations );
                            } );
                        },
                        filterTreatment: function( treatment ) {
                            return new Promise((resolve) => {
                                setImmediate( () => resolve(
                                    !Y.doccirrus.schemas.invoiceconfiguration.isTreatmentExcluded( 'INVOICE', invoiceConfig, treatment )
                                ) );
                            });
                        },
                        // optional
                        // returned patient data will be stored
                        onPatientData: function( patientData ) {
                            //console.log( "patient data", patientData.firstname, patient.patientId );
                            return patientData;
                        },
                        // optional
                        onPatientProgress: function( progress ) {
                            onProgress( progress );
                        }
                    } );
                } )
                .then( function( state ) {
                    var now = new Date(),
                        filepath = Path.join( tmpDir.path, generateFileName( state.header.mainLocationCommercialNo, now ) ),
                        filename = getFilename( filepath ),
                        conFileWriter = new Y.doccirrus.ConFileWriter( {
                            now: now,
                            filepath: filepath
                        } ),
                        blResults = [];
                    return Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                        user: args.user,
                        invoiceLogId: invoiceLogId,
                        startTime: state.stats.start,
                        excludedPatientIds: state.excludedPatientIds,
                        excludedScheinIds: state.excludedScheinIds,
                        unknownInsuranceScheinIds: state.unknownInsuranceScheinIds,
                        onProgress: function( progress ) {
                            // override progress type (iterate)
                            progress.type = 'write';
                            onProgress( progress );
                        },
                        iterator: async function( invoiceEntry ) {
                            if( slType === 'super' && invoiceEntry.type === 'header' && invoiceEntry.data && invoiceEntry.data.locations && invoiceEntry.data.locations.length){
                                //use only main location and superset of physicians
                                let physicians = invoiceEntry.data.locations.reduce( ( acc, loc ) => {
                                    acc = [...acc, ...(loc.physicians || []) ];
                                    return acc;
                                }, [] );
                                physicians = _.unique(physicians, '_id' );
                                let mainSuperLocation = invoiceEntry.data.locations.filter( loc => loc.slMain );
                                if( mainSuperLocation.length !== 1 ){
                                    let err = new Error( 'should be only one main location in super location');
                                    Y.log( `could not process super location ${err.stack || err}`, 'error', NAME );
                                    throw err;
                                }
                                mainSuperLocation.physicians = physicians;
                                mainSuperLocation.locname = Y.doccirrus.schemas.kbvlog.getSuperLocationName( invoiceEntry.data.locations[0].slName, invoiceEntry.data.locations[0].locname );

                                //keep only mainSuperLocation and all additional locations
                                invoiceEntry.data.locations = invoiceEntry.data.locations.filter( loc => loc.slMain || loc.isAdditionalLocation );
                            }

                            if( slCommercialNo && slType === 'super' && invoiceEntry.type === 'schein' && invoiceEntry.data ){
                                //remap commercial no to super location main
                                invoiceEntry.data.treatments = (invoiceEntry.data.treatments || []).map( act => {
                                    if( act._bsnr ){ act._bsnr = slCommercialNo; }
                                    return act;
                                });
                                invoiceEntry.data.diagnoses = (invoiceEntry.data.diagnoses || []).map( act => {
                                    if( act._bsnr ){ act._bsnr = slCommercialNo; }
                                    return act;
                                });
                            }

                            let [err] = await formatPromiseResult( conFileWriter.write( invoiceEntry ) );

                            if( err ) {
                                Y.log( `could not write invoiceEntry: ${invoiceEntry._id} to con file: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }

                            if( 'schein' === invoiceEntry.type && kbvFocusFunctionalityKRW ) {
                                let krwData = mapToKrwData( invoiceEntry.data, state.header.locations );
                                let [err, result] = await formatPromiseResult( validateKrw( require( '../../../autoload/krw/kbv.json' ), krwData, false ) );
                                if( err ) {
                                    Y.log( `could not validateKrw: ${err.stack || err}`, 'warn', NAME );
                                } else {
                                    const errors = result && result.errors || [];
                                    Array.prototype.push.apply( state.krwValidation.errors, errors );
                                }

                            }

                            if( 'schein' === invoiceEntry.type ) {
                                let ruleLogResults,
                                    affectedActivityIds = Y.doccirrus.ruleutils.collectAffectedActivitiesFromInvoiceEntry( invoiceEntry );

                                [err, ruleLogResults] = await formatPromiseResult( Y.doccirrus.api.rulelog.collectRuleLogEntries( {
                                    user: args.user,
                                    patientId: invoiceEntry.data.patientId,
                                    caseFolderId: invoiceEntry.data.caseFolderId,
                                    locationIds: state.header.locationIds,
                                    invoice: true,
                                    from: invoiceEntry.data.timestamp,
                                    to: invoiceEntry.data.end,
                                    affectedActivityIds
                                } ) );

                                if( err ) {
                                    Y.log( `could not collectRuleLogEntries for invoiceEntry: ${invoiceEntry._id}: ${err.stack || err}`, 'warn', NAME );
                                    throw err;
                                }

                                if( Array.isArray( state.ruleEngineResults ) ) {
                                    Array.prototype.push.apply( state.ruleEngineResults, ruleLogResults );
                                } else {
                                    state.ruleEngineResults = ruleLogResults;
                                }

                                let schein = invoiceEntry.data;
                                if( schein.blPseudoGnrStatus ) {
                                    blResults.push( {
                                        scheinId: schein._id.toString(),
                                        text: Y.doccirrus.schemas.kbvlog.getBlPseudoGnrStatusMessage( schein.blPseudoGnrStatus ),
                                        blPseudoGnrStatus: schein.blPseudoGnrStatus
                                    } );
                                }
                            }
                        }
                    } ).then( function() {
                        return conFileWriter.end();
                    } ).then( function() {
                        return storeFile( args.user, filename, {
                            content_type: 'application/octet-stream',
                            metadata: {charset: 'ISO-8859-1'}
                        }, conFileWriter.buffer );
                    } ).then( function( fileId ) {
                        state.conFileId = fileId;
                        state.conFileName = filename;
                        state.lines = conFileWriter.lines;
                        conFileWriter = undefined;
                        onProgress( {
                            total: 1,
                            current: 1,
                            durationElapsed: ((new Date()) - state.stats.start),
                            type: 'validate'
                        } );

                        let pm;

                        try {
                            pm = Y.doccirrus.xpm.getPm( {
                                type: 'KVDT',
                                quarter: quarter,
                                year: year
                            } );
                        } catch( err ) {
                            return Promise.reject(err);
                        }

                        return pm.execute( {
                            input: filepath,
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

                    } ).then( function( pmResults ) {
                        state.validationResults = pmResults.results;

                        // bl validation results of current invoice
                        Array.prototype.push.apply( state.validationResults.warnings, blResults );

                        return Prom.map( pmResults.statFiles, statFile => {
                            return storeFile( args.user, statFile.fileName, {
                                content_type: 'application/pdf'
                            }, statFile.data ).then( fileId => {
                                statFile.fileId = fileId;
                                delete statFile.data;
                                return statFile;
                            } );
                        } );
                    } ).then( function( statFiles ) {
                        state.statFiles = statFiles;
                        tmpDir.done();
                    } ).then( function() {
                        const validateBlScheins = promisifyArgsCallback(Y.doccirrus.api.kbv.validateBlScheins);
                        return validateBlScheins( {
                            user: args.user,
                            params: {
                                invoiceLogId, quarter, year,
                                locationIds: state.header.locations.map( location => location._id )
                            }
                        } );
                    } ).then( function(evaluateBLResult) {
                        Array.prototype.push.apply( state.validationResults.warnings, evaluateBLResult );
                        return state;
                    } ).catch( function( err ) {
                        tmpDir.done();
                        throw err;
                    } );

            } );

        }

        Y.namespace( 'doccirrus' ).gkvprocess = {
            start: start,
            invoiceProcessActivityFields
        };

    },
    '0.0.1',
    {
        requires: ['rulelog-api', 'dclicmgr']
    }
)
;
