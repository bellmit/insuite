/**
 * User: do
 * Date: 20/02/15  17:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/


YUI.add('pvslog-api', function (Y, NAME) {

        const
            Promise = require('bluebird'),
            async = require('async'),
            moment = require('moment'),
            _ = require('lodash'),
            {formatPromiseResult} = require('dc-core').utils,

            i18n = Y.doccirrus.i18n,

            LATEST_LOG_VERSION = Y.doccirrus.schemas.invoicelog.LATEST_LOG_VERSION,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),

            START_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.FROM' ),
            END_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.TO' ),

            accessError = Y.doccirrus.errors.rest(401, '', true),
            
            //  properties to expand when collecting invoice items for pvslog

            usePhysicianFields = {
                officialNo: 1,
                firstname: 1,
                lastname: 1,
                title: 1,
                nameaffix: 1,
                specialities: 1 // needed for krw
            },

            useLocationFields = {
                locname: 1,
                institutionCode: 1,
                zip: 1,
                commercialNo: 1,
                street: 1,
                houseno: 1,
                city: 1,
                phone: 1,
                fax: 1,
                email: 1
            },

            useTreatmentFields = {
                patientId: 1,
                locationId: 1,
                employeeId: 1,
                employeeName: 1,
                actType: 1,
                catalogShort: 1,
                timestamp: 1,
                costType: 1,
                code: 1,
                content: 1,
                explanations: 1,
                daySeparation: 1,
                icds: 1,
                status: 1,
                billingFactorValue: 1,
                price: 1,
                unit: 1,
                actualPrice: 1,
                actualUnit: 1,
                hasVat: 1,
                vat: 1,
                fk5015: 1,
                vatAmount: 1,
                catalog: 1,
                comment:1,
                time:1
            },

            useScheineFields = {
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
                scheinOrder: 1,
                scheinDiagnosis: 1,
                scheinFinding: 1,
                scheinEstablishment: 1,
                scheinRemittor: 1,
                scheinSubgroup: 1,
                scheinSlipMedicalTreatment: 1,
                code: 1,
                scheinClinicalTreatmentFrom: 1,
                scheinClinicalTreatmentTo: 1,
                scheinNextTherapist: 1,
                uvGoaeType: 1,
                dayOfAccident: 1,
                accidentCompany: 1,
                accidentCompanyStreet: 1,
                accidentCompanyHouseno: 1,
                accidentCompanyPLZ: 1,
                accidentCompanyCity: 1,
                content: 1,
                caseFolderId: 1,
                fk4235Set: 1,
                treatmentType: 1,
                scheinClinicID: 1,
                isChiefPhysician: 1,
                includesBSK: 1,
                isTiersGarant: 1,
                isTiersPayant: 1

            },

            useDiagnosisFields = {
                employeeId: 1,
                patientId: 1,
                actType: 1,
                timestamp: 1,
                code: 1,
                catalogShort: 1,
                diagnosisCert: 1,
                diagnosisSite: 1,
                explanations: 1,
                diagnosisDerogation: 1,
                diagnosisType: 1,
                status: 1,
                content: 1
            },

            usePatientFields = {
                title: 1,
                firstname: 1,
                gender: 1,
                talk: 1,
                lastname: 1,
                communications: 1,
                nameaffix: 1,
                addresses: 1,
                kbvDob: 1,
                patientNo: 1,
                sendPatientReceipt: 1,
                dataTransmissionToPVSApproved: 1,
                'insuranceStatus._id': 1,
                'insuranceStatus.billingFactor': 1,
                'insuranceStatus.insuranceKind': 1,
                'insuranceStatus.insuranceGrpId': 1,
                'insuranceStatus.costCarrierBillingGroup': 1,
                'insuranceStatus.costCarrierBillingSection': 1,
                'insuranceStatus.insuranceId': 1,
                'insuranceStatus.insuranceName': 1,
                'insuranceStatus.insurancePrintName': 1,
                'insuranceStatus.address1': 1,
                'insuranceStatus.address2': 1,
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
                // patientversion fields
                patientId: 1,
                timestamp: 1
            };

        /**
         *  Raises a websocket event on the client to update progress bar in pvs_browser
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  id          {String}    _id of a pvslog object
         *  @param  progress    {Number}    Percent (TODO: CHECKME)
         */

        function onInvoiceProgress(user, id, progress, cashlog) {
            Y.log('Reporting invoice progress on ' + id + ' to client: ' + progress, 'debug', NAME);
            Y.doccirrus.communication.emitEventForUser({
                targetId: user.identityId,
                event: 'invoicelogAction',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        invoiceType: cashlog? 'CASH' : 'PVS',
                        action: 'validate',
                        state: 'progress',
                        progress: progress,
                        id: id
                    }
                }
            });
        }

        /**
         *  Since EXTMOJ-1040 all overlapping checks (locationId, startTime endTime) have been removed, but activities
         *  get marked with invoiceLogId on invoice process aggregation to ensure that they will not be collected more
         *  then once by invoice log or cashbook.
         *
         *  Note that 'additional' locations are not considered - items are billed from the main location.
         *
         *  Process:
         *
         *      1. Check request arguments
         *      2. Create a log for each candidate location which does not already have one open
         *      --> 2.1 Try create a pvs log for a (main) location
         *          2.1.2 Create a new pvslog for the location
         *          2.1.3 Save the new log to the database
         *      Finally, call back with any errors or warnings
         *
         *  @param  {Object}    args                                        /1/ REST API
         *  @param  {Object}    args.user                                   REST user or equivalent
         *  @param  {Object}    args.originalParams
         *
         *  @param  {Object}    args.originalParams.settings
         *  @param  {Object}    args.originalParams.settings.employees
         *  @param  {Boolean}   args.originalParams.settings.useStartDate   True if max date for billed treatments
         *  @param  {Boolean}   args.originalParams.settings.useEndDate     True if min date for billed treatments
         *  @param  {String}    args.originalParams.settings.startDate      Date string
         *  @param  {String}    args.originalParams.settings.endDate        Date string
         *  @param  {Object}    args.originalParams.settings.insuranceTypes See pvslog-schema getInsuranceTypes()
         *
         *  @param  {Object}    args.originalParams.locationDescriptors     See getCandiateLocations in invoiceprocess API
         *  @param  {Function}  args.callback                               Of the form fn( err, meta, pvsLogIds )
         */
        function createLogs({user, originalParams: {settings, locationDescriptors, insuranceDescriptors, cashlog}, callback}) {
            Y.log('Entering Y.doccirrus.api.pvslog.createLogs', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            var
                employees = settings.employees || [],
                errors = [],
                warnings = [],
                newPvsLogs = [],
                currentDate = new Date();

            async.series( [ checkSettings, addLocations, createAllPvsLogs ], onAllDone);

            //  1. Check request arguments
            function checkSettings(itcb) {
                if (!settings.insuranceTypes) {
                    settings.insuranceTypes = Y.doccirrus.schemas.pvslog.getInsuranceTypes();
                }
                if (0 === settings.insuranceTypes.length) {
                    // should never happen, is checked for on the client
                    return itcb(Y.doccirrus.errors.rest(500, 'Must have at least one insuranceType'));
                }
                if (!settings.useStartDate) {
                    settings.useStartDate = false;
                    settings.startDate = '';
                }
                if (!settings.useEndDate) {
                    settings.useEndDate = false;
                    settings.endDate = '';
                }

                //  modal to select insurance companies disabled at present
                settings.useInsuranceDescriptors = false;

                if (!insuranceDescriptors) {
                    settings.insuranceDescriptors = [];
                } else {
                    if (insuranceDescriptors.length) {
                        settings.insuranceDescriptors = insuranceDescriptors;
                        settings.useInsuranceDescriptors = true;
                    }
                }

                if (0 === locationDescriptors.length && 0 === employees.length) {
                    // should never happen, is checked for on the client
                    return itcb(new Y.doccirrus.commonerrors.DCError(500, {message: "Must have at least one location or employee"}));
                }
                itcb(null);
            }

            function addLocations(itcb) {
                var pipeline,
                    employeeIds,
                    timestampRange = {},
                    $match = {
                        actType: {$in: ["PKVSCHEIN", "BGSCHEIN"]}
                    };

                if (locationDescriptors.length) {
                    return itcb(null);
                }

                if (settings.endDate) {
                    timestampRange.$lt = new Date(settings.endDate);
                }
                if (settings.startDate) {
                    timestampRange.$gt = new Date(settings.startDate);
                }

                if (Object.keys(timestampRange).length) {
                    $match.timestamp = timestampRange;
                }

                employeeIds = employees.map((item) => {
                    return item._id;
                });

                $match.employeeId = {$in: employeeIds};

                pipeline = [
                    {
                        $match: $match
                    },
                    {
                        $group: {
                            _id: null,
                            locationIds: {$addToSet: '$locationId'}
                        }
                    }
                ];

                async.waterfall([
                    (next) => {
                        Y.doccirrus.mongodb.runDb({
                            user,
                            model: 'activity',
                            action: 'aggregate',
                            pipeline: pipeline
                        }, next);
                    },
                    (result, next) => {
                        if (result && result.result && result.result[0] && result.result[0].locationIds && result.result[0].locationIds[0]) {
                            Y.doccirrus.mongodb.runDb({
                                user,
                                model: 'location',
                                action: 'get',
                                query: {
                                    _id: {$in: result.result[0].locationIds}
                                },
                                options: {
                                    select: {
                                        locname: 1,
                                        commercialNo: 1
                                    }
                                }
                            }, (err, result) => {
                                if (err) {
                                    return next(err);
                                }
                                if (result && result[0]) {
                                    locationDescriptors = result;
                                } else {
                                    return next(new Y.doccirrus.commonerrors.DCError(500, {message: "Could not expand location details"}));
                                }
                                return next();
                            });
                        } else {
                            //  if no locations have activites matching employees from padx settings, then nothing to create
                            Y.log( `No scheine found for any of the requested employees, nothing to add to pvs logs: ${JSON.stringify( employeeIds )}`, 'debug', NAME );
                            locationDescriptors = [];
                            return next();
                        }
                    }
                ], itcb);
            }

            //  2. Create a log for each given location which does not already have one open
            function createAllPvsLogs(itcb) {
                if ( 0 === locationDescriptors.length ) { return itcb( null ); }
                async.each(locationDescriptors, createSinglePvsLog, itcb);
            }

            //  2.1 Try create a pvs log for a (main) location
            function createSinglePvsLog(locDesc, itcb) {
                var
                    schema = Y.doccirrus.schemaloader.getSchemaForSchemaName('pvslog'),
                    data;

                //  2.1.1 Create a new pvslog for the location
                data = Y.mix(Y.doccirrus.schemaloader.getEmptyDataForSchema(schema), {
                    created: currentDate,
                    mainLocationId: locDesc._id,
                    locname: locDesc.locname,
                    commercialNo: locDesc.commercialNo || '',

                    //  options restrictions on which insurance companies may appear in the log
                    useInsuranceStatus: settings.useInsuranceDescriptors,
                    insuranceStatus: settings.insuranceDescriptors,
                    withEmptyInsurance: settings.withEmptyInsurance,
                    doNotcheckCatalog: settings.doNotcheckCatalog,

                    //  record optional restrictions on date range and insurance types (MOJ-6647, MOJ-6637, MOJ-6650)
                    useStartDate: settings.useStartDate,
                    useEndDate: settings.useEndDate,
                    startDate: settings.startDate,
                    endDate: settings.endDate,
                    minTotal: settings.minTotal,
                    employees: settings.employees || [],
                    employeeFilterEnabled: settings.employeeFilterEnabled || false,

                    //  begin in created state, totalItems will be queried / set on validation
                    status: 'CREATED',
                    lastUpdate: currentDate,
                    totalItems: '',

                    insuranceTypes: settings.insuranceTypes,
                    excludedScheinIds: [],
                    unknownInsuranceScheinIds: [],
                    excludedPatientIds: [],

                    padnextSettingId: settings.padnextSettingId,
                    padnextSettingTitle: settings.padnextSettingTitle,
                    padnextSettingCustomerNo: settings.padnextSettingCustomerNo,

                    user: [
                        {
                            name: user.U,
                            employeeNo: user.identityId
                        }
                    ]
                }, true);

                //  2.1.3 Save the new log to the database
                Y.doccirrus.mongodb.runDb({
                    user,
                    model: cashlog ? 'cashlog' : 'pvslog',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject(data),
                    callback: pvslogCreated
                });

                function pvslogCreated(err, result) {
                    if (err) {
                        Y.log('Error saving PVSLog: ' + err, 'error', NAME);
                        errors.push(Y.doccirrus.errors.rest('500'));
                    } else {
                        newPvsLogs = newPvsLogs.concat(result);
                    }
                    itcb(null);
                }

            }

            //  Finally, call back with any errors or warnings
            function onAllDone(err) {
                if (err) {
                    Y.log('Could not create PVS logs: ' + JSON.stringify(err));
                    return callback(err);
                }

                Y.log('Finished creating PVS logs: ' + JSON.stringify(newPvsLogs), 'debug', NAME);
                callback(null, {meta: {warnings: warnings, errors: errors}, data: newPvsLogs});
            }

        } // end createLogs

        /**
         *  Load and check a pvslog.
         *  ATTENTION: Only one validation at a time is allowed. So releaseLock must be called on all success and error cases.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.id              Database _id of a pvslog
         *  @param  {Boolean}   args.originalParams.preValidation
         *  @param  {Function}  args.callback                       Of the form fn( err )
         */

        async function validatePvsLog({user, originalParams: {id, preValidation, cashlog}, callback}) {
            let
                invoiceConfig,
                fileIdsToDelete = [],
                logInfo = {},
                isPreValidation = Boolean(preValidation),
                pvslog;

            if (!cashlog && !Y.doccirrus.auth.hasAPIAccess(user, 'pvslog.validate') && !(isPreValidation && Y.doccirrus.auth.hasAPIAccess(user, 'pvslog.preValidate'))) {
                return callback(accessError);
            }

            if (!id) {
                return callback(Y.doccirrus.errors.http(500, 'Missing Parameter id'));
            }

            let [ err, getLock ] = await formatPromiseResult(
                Y.doccirrus.cacheUtils.dataCache.acquireLock( {
                    key: 'invoicing',
                    data: `${cashlog ? 'cashlog' : 'pvslog'}|${isPreValidation ? 'prevalidate' : 'validate'}|${user.U}|${(new Date()).getTime()}|0`
                } )
            );
            if (err) {
                Y.log(`validatePvsLog: Error acquiring invoice log: ${err.stack || err}`, 'error', NAME);
            }
            if (!getLock || !getLock.length || 1 !== getLock[0]) {
                return callback( Y.doccirrus.invoiceserverutils.getLockNotification( getLock ) );
            }

            if(cashlog){
                return invoiceConfigCb(null, {});
            }

            Y.doccirrus.mongodb.runDb({
                model: 'invoiceconfiguration',
                user,
                options: {
                    limit: 1
                },
                callback: invoiceConfigCb
            });

            function invoiceConfigCb(err, config) {

                if (err || (!cashlog && !config.length)) {
                    err = err ? JSON.stringify(err) : 'No Invoice Config Found';
                    Y.log('Error retrieving invoice config' + err, 'error', NAME);
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    return callback(Y.doccirrus.errors.http(500, err));
                }

                invoiceConfig = config[0];
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: cashlog ? 'cashlog' : 'pvslog',
                    query: {
                        _id: id
                    }
                }, pvslogCb);
            }

            function pvslogCb(err, pvslogs) {
                if( err ) {
                    Y.log( 'Error retrieving pvs log data ' + JSON.stringify( err ), 'warn', NAME );
                    callback( Y.doccirrus.errors.http( 500, 'Error retrieving pvs logs' ) ); //eslint-disable-line callback-return
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    return;
                }

                if( !pvslogs || !pvslogs.length ) {
                    Y.log( 'PVSLog entry not found id: ' + id, 'warn', NAME );
                    callback( Y.doccirrus.errors.http( 2031, 'PVSLog entry not found' ) ); //eslint-disable-line callback-return
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    return;
                }
                pvslog = pvslogs[0];

                let validStatus = ['CREATED', 'VALID', 'INVALID', 'APPROVING', 'SENT_ERR', 'VALIDATION_ERR', 'TIMEOUT', 'CANCELED'];

                if( !validStatus.includes( pvslog.status ) ) {
                    Y.log( `PVSLog entry ${id} has status ${pvslog.status} and can not be validated`, 'warn', NAME );
                    callback( new Y.doccirrus.commonerrors.DCError( 2035 ) ); //eslint-disable-line callback-return
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    return;
                }

                if (pvslog.padnextFileId) {
                    fileIdsToDelete.push(pvslog.padnextFileId);
                }

                pvslog = pvslogs[0];
                pvslog.totalItems = '';
                pvslog.status = 'VALIDATING';
                pvslog.isPreValidated = isPreValidation;
                pvslog.isContentOutdated = false;
                pvslog.notApproved = [0, 0, 0];

                pvslog.padnextFileName = '';
                pvslog.padnextFileId = '';

                pvslog.pid = Y.doccirrus.ipc.pid();

                pvslog._log_version = LATEST_LOG_VERSION;

                pvslog.output = [];
                pvslog.warnings = [];

                logInfo.id = pvslog._id.toString();
                logInfo.isPreValidation = isPreValidation;
                logInfo.commercialNo = pvslog.commercialNo;

                //  Older pvslog objects may not have filter options set, MOJ-6648, MOJ-6637
                if (!pvslog.insuranceTypes) {
                    pvslog.insuranceTypes = ['PRIVATE', 'BG'];
                }

                if (!pvslog.useStartDate) {
                    pvslog.useStartDate = false;
                    pvslog.startDate = '';
                }

                if (!pvslog.useEndDate) {
                    pvslog.useEndDate = false;
                    pvslog.endDate = '';
                }

                //  TODO: remove duplication with media API file and GridFS utils
                Y.doccirrus.invoicelogutils.cleanFiles(user, fileIdsToDelete, cleanedCb);
            }

            function cleanedCb(err) {
                if (err) {
                    Y.log('Error cleaning pvs files' + err, 'error', NAME);
                    return callback(Y.doccirrus.errors.http(500, 'Error cleaning pvs files' + err));
                }
                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: cashlog ? 'cashlog' : 'pvslog',
                    action: 'put',
                    query: {
                        _id: pvslog._id
                    },
                    fields: Object.keys(pvslog),
                    data: Y.doccirrus.filters.cleanDbObject(pvslog)
                }, validatingStatusSetCb);
            }

            function validatingStatusSetCb(err) {
                if (err) {
                    Y.log('Error setting kbv log status to "VALIDATING" ' + err, 'error', NAME);
                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                    callback(Y.doccirrus.errors.http(500, 'Error setting kbv log status to "VALIDATING" '));
                    return;
                }

                //  TODO: check this early callback
                callback();                                 //  eslint-disable-line

                Y.doccirrus.communication.emitEventForUser({
                    targetId: user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: cashlog ? 'CASH' : 'PVS',
                            action: 'validate',
                            state: 'started'
                        }
                    }
                });

                // MOJ-14319: Expand PRIVATE insurance/casefolder type to also fetch additional insurances
                const hasPrivateInsurance = pvslog.insuranceTypes.some( insuranceType => {
                    return insuranceType === 'PRIVATE';
                } );

                if( hasPrivateInsurance ) {
                    pvslog.insuranceTypes.push( 'PRIVATE_A' );
                }

                //  clear and rebuild the invoiceentries for this pvslog

                Y.doccirrus.invoiceprocess.collect({
                    user: user,
                    mainLocationId: pvslog.mainLocationId,
                    invoiceLogId: pvslog._id.toString(),
                    invoiceLogType: ( cashlog ? 'CASH' : 'PVS' ),
                    preValidation: isPreValidation,
                    doNotcheckCatalog: pvslog.doNotcheckCatalog,
                    excludedPatientIds: pvslog.excludedPatientIds,
                    excludedScheinIds: pvslog.excludedScheinIds,
                    unknownInsuranceScheinIds: pvslog.unknownInsuranceScheinIds,
                    autoAssignmentOfDiagnosis: ( cashlog ? true : invoiceConfig.autoAssignmentOfDiagnosis ),
                    locationFields: useLocationFields,
                    physicianFields: usePhysicianFields,
                    scheinFields: useScheineFields,
                    treatmentFields: useTreatmentFields,
                    diagnosisFields: useDiagnosisFields,
                    patientFields: usePatientFields,

                    //  filter entries by insurance/casefolder type
                    caseFolderType: pvslog.insuranceTypes,

                    //  filter entries by specific insurance companies
                    useInsuranceStatus: pvslog.useInsuranceStatus,
                    insuranceStatus: pvslog.insuranceStatus,
                    withEmptyInsurance: pvslog.withEmptyInsurance || false,

                    //  filter entries by date (optional)
                    useStartDate: pvslog.useStartDate,
                    useEndDate: pvslog.useEndDate,
                    startDate: pvslog.startDate,
                    endDate: pvslog.endDate,
                    minTotal: pvslog.minTotal,
                    employees: pvslog.employees,
                    employeeFilterEnabled: pvslog.employeeFilterEnabled,

                    getScheinEnd: onGetSchineEnd,
                    getInvoiceEnd: onGetInvoiceEnd,
                    onPatientProgress: progress => onPatientProgress( progress, cashlog )                        // optional
                }).then(function onInvoiceEntriesCollected(state) {
                    collectCb(null, state);
                }).catch(function onInvoiceEntriesCollectionError(err) {
                    Y.log('Error while collecting invoice log entries (getCurPrivScheine): ' + err, 'error', NAME);
                    //console.log( 'Stack trace follows: ', err.stack );
                    collectCb(err);
                });

                //  given two scheine in a sequence:
                //      (*) use the start date for the second to return the end date for the first
                //      (*) or return the current date if second schein is null
                function onGetSchineEnd(schein, nextSchein) {
                    var end,
                        moment = require('moment'),
                        nextScheineTimestamp = nextSchein && nextSchein.timestamp && moment(nextSchein.timestamp);
                    if (nextScheineTimestamp) {
                        end = nextSchein.timestamp;
                    } else {
                        end = new Date();
                    }
                    return end;
                }

                //  called by the invoiceprocess to query the end date of the invoicelog
                function onGetInvoiceEnd() {
                    return new Date();
                }

                function onPatientProgress(progress, cashlog) {
                    onInvoiceProgress(user, pvslog._id.toString(), progress, cashlog);
                    Y.log('Collecting invoice items for pvslog ' + pvslog._id.toString() + ', progress: ' + JSON.stringify(progress), 'debug', NAME);
                }

            }

            function collectCb(err, state) {
                state = state || {};

                if (err) {
                    Y.log('Could not get pvs export' + JSON.stringify(err), 'error', NAME);
                    finalCb(Y.doccirrus.errors.http(500, 'Could not get pvs export'));
                    return;
                }

                if (0 === state.stats.nScheine && 0 === state.stats.xnScheine && !(state.skippedDueNotPVSapproved || []).length) {
                    return finalCb(Y.doccirrus.errors.rest('2020', {$scheinType: 'PKV' }));
                }

                if (isPreValidation) {
                    pvslog.notApproved = [
                        state.stats.nScheineNotApproved,
                        state.stats.nTreatmentsNotApproved,
                        state.stats.nDiagnosesNotApproved
                    ];
                }

                pvslog.priceTotal = state.patients.reduce((sum, item) => {
                    return Y.doccirrus.comctl.dcSum(sum, item.priceTotal || 0);
                }, 0);

                pvslog.excludedPatientIds = state.excludedPatientIds || [];
                pvslog.excludedScheinIds = state.excludedScheinIds || [];
                pvslog.unknownInsuranceScheinIds = state.unknownInsuranceScheinIds || [];

                pvslog.totalItems = `${state.stats.nScheine}/${state.stats.nTreatments}/${state.stats.nDiagnoses}|(${state.stats.xnScheine}/${state.stats.xnTreatments}/${state.stats.xnDiagnoses})`;

                if (0 === state.stats.nScheine && 0 === state.stats.xnScheine) {
                    return finalCb(Y.doccirrus.errors.rest('2020', {$scheinType: 'PKV' }));
                }

                validatePvsLogRules( user, pvslog, state )
                    .then(_.flatten)
                    .then(async ( results ) => {
                        if (results && results.length) {
                            let [err, affectedActivities] = await formatPromiseResult( Y.doccirrus.invoiceserverutils.employeesForRuleLog( user,  results) );
                            if( err ) {
                                Y.log( `mapRuleEngineResults: Failed to get employees for invoicelog ${pvslog._id}. \nError: ${err.message || err}`, 'error', NAME );
                                throw err;
                            }

                            for ( let result of results ) {
                                let schemaPathsMap = Y.doccirrus.schemas.invoicelog.schemaPathsMap,
                                    entry = {
                                        ruleId: result.ruleId,
                                        ruleSetId: result.ruleSetId,
                                        text: result.message,
                                        ruleLogId: result._id,
                                        caseFolderId: result.caseFolderId
                                    };

                                if( result.factId ) {
                                    entry.link = schemaPathsMap.activity.path + '#' + schemaPathsMap.activity.hashPath + result.factId + schemaPathsMap.patient.hashPath + result.patientId + schemaPathsMap.patient.caseFolder + result.caseFolderId;
                                } else {
                                    entry.link = schemaPathsMap.patient.path + '#' + schemaPathsMap.patient.hashPath + result.patientId + schemaPathsMap.patient.section + schemaPathsMap.patient.caseFolder + result.caseFolderId;
                                }

                                if( result.factId || result.affectedActivities && result.affectedActivities.length ) {
                                    entry.employeeName = affectedActivities[result.factId] ||
                                                         [...new Set( result.affectedActivities.map( el => affectedActivities[el.id]).filter( Boolean ) )].join( '; ' );
                                }

                                if( result.affectedActivities ) {
                                    entry.affectedActivities = result.affectedActivities;
                                }

                                if( result.patientId ) {
                                    // get patient name
                                    entry.patientId = result.patientId;
                                    let [err, patients] = await formatPromiseResult(
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            action: 'get',
                                            model: 'patient',
                                            query: {
                                                _id: result.patientId
                                            }
                                        } )
                                    );
                                    if( err ) {
                                        Y.log(`Failed get patient data. Error: ${err.stack || err}`, "error", NAME);
                                    }
                                    if( patients && patients.length ){
                                        entry.patientName = `${patients[0].firstname} ${patients[0].lastname}`;
                                    }

                                }

                                // get fact Id Codes data
                                if( result.ruleSetId ) {
                                    // get codes and actTypes from rules
                                    let [err, rules] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            action: 'get',
                                            model: 'rule',
                                            query: {
                                                _id: result.ruleSetId
                                            }
                                        } )
                                    );

                                    if( err ) {
                                        Y.log(`Failed get rules data. Error: ${err.stack || err}`, "error", NAME);
                                    }

                                    if( rules && rules.length ) {
                                       let filteredRules = rules[0].rules.filter( i => i.ruleId === result.ruleId ),
                                           factCodes = [],
                                           requiredCodes = [],
                                           actTypes = [];
                                       filteredRules.forEach( item => {
                                            factCodes = [ ...factCodes, ...(item.metaCodes || []) ];
                                            requiredCodes = [ ...requiredCodes, ...(item.metaRequiredCodes || []) ];
                                            actTypes = [ ...actTypes, ...(item.metaActTypes || []) ];
                                       } );
                                       if( 20 < factCodes.length ) {
                                            entry.factIdCode = ( entry.affectedActivities || [] ).map( activity => activity.code );
                                            entry.allCodes = factCodes;
                                       } else {
                                            entry.factIdCode = factCodes;
                                       }
                                       if( requiredCodes.length ) {
                                            entry.requiredCodes = requiredCodes;
                                       }
                                       if( actTypes.length ) {
                                            entry.actTypes = actTypes;
                                       }
                                    }
                                }
                                if ('ERROR' === result.ruleLogType) {
                                    pvslog.output.push(entry);
                                } else if ('WARNING' === result.ruleLogType) {
                                    pvslog.warnings.push(entry);
                                }
                                await Y.doccirrus.api.invoicelog.saveEntry({ user, entry, ruleLogType: result.ruleLogType, inVoiceLogId: pvslog._id, logType: (cashlog ? 'CASH' : 'PVS') });
                            }
                        }
                        finalCb();
                    })
                    .catch(finalCb);
            }

            function finalCb(err) {

                var msg = {
                    data: {
                        state: 'finished',
                        action: 'validate',
                        invoiceType: cashlog ? 'CASH' : 'PVS',
                        logInfo: logInfo,
                        warnings: [],
                        errors: []
                    }
                };

                if (err) {
                    Y.log(`an error occurred while validating ${cashlog ? 'cash' : 'pvs'}log. Error: ${err.stack || err}`, 'warn', NAME);
                    pvslog.status = 'VALIDATION_ERR';
                } else if (pvslog.output.length) {
                    pvslog.status = 'INVALID';
                } else {
                    pvslog.status = 'VALID';
                }
                pvslog.pid = '';

                if (pvslog.output.length || pvslog.warnings.length) {
                    msg.data.warnings.push(Y.doccirrus.errors.rest('2011', {
                        $warnings: pvslog.warnings.length.toString(),
                        $errors: pvslog.output.length.toString()
                    }));
                }

                pvslog.lastUpdate = new Date();
                pvslog.user = [
                    {
                        name: user.U,
                        employeeNo: user.identityId
                    }
                ];

                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model:  cashlog ? 'cashlog' : 'pvslog',
                    action: 'put',
                    query: {
                        _id: pvslog._id
                    },
                    fields: Object.keys(pvslog),
                    data: Y.doccirrus.filters.cleanDbObject(pvslog)
                }, function (_err) {
                    var error = err || _err;
                    if (error) {
                        msg.data.errors.push(err);
                    }

                    if (!cashlog && 'VALID' === pvslog.status) {
                        setTimeout(function () {
                            pregeneratePadX(pvslog);
                        }, 500);
                    }

                    Y.doccirrus.communication.emitEventForUser({
                        targetId: user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: msg
                    });

                    Y.doccirrus.invoiceserverutils.releaseLock( 'invoicing' );
                });

            }

            function pregeneratePadX() {
                Y.doccirrus.api.padx.generateProvisionalPadXFile({
                    'originalParams': {
                        'pvslog': pvslog
                    },
                    'user': user,
                    'callback': onPadXGenerated
                });

                function onPadXGenerated(err /*, result */) {
                    if (err) {
                        Y.log('Could not pregenerate PadX file: ' + JSON.stringify(err), 'warn', NAME);
                        return;
                    }

                    var msg = {
                        data: {
                            state: 'pregenerated',
                            action: 'validate',
                            invoiceType: cashlog? 'CASH' : 'PVS',
                            logInfo: logInfo,
                            warnings: [],
                            errors: []
                        }
                    };

                    //  send success message to reload table
                    Y.doccirrus.communication.emitEventForUser({
                        targetId: user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: msg
                    });

                }
            }

        } // end validatePvsLog

        function createPvsLog( user, pvsLog, cashlog ) {
            const now = new Date();
            const data = {
                created: now,
                status: 'CREATED',
                lastUpdate: now,
                padnextFileName: '',
                padnextFileId: '',
                encryptedPadnextFileName: '',
                encryptedPadnextFileId: '',
                _log_version: LATEST_LOG_VERSION,
                mainLocationId: pvsLog.mainLocationId,
                replacement: true,
                replacedLogId: pvsLog._id.toString(),
                excludedScheinIds: [],
                unknownInsuranceScheinIds: [],
                excludedPatientIds: [],
                commercialNo: pvsLog.commercialNo,
                locname: pvsLog.locname,
                padnextSettingId: pvsLog.padnextSettingId,
                padnextSettingTitle: pvsLog.padnextSettingTitle,
                padnextSettingCustomerNo: pvsLog.padnextSettingCustomerNo,
                startDate: pvsLog.startDate,
                useStartDate: pvsLog.useStartDate,
                endDate: pvsLog.endDate,
                useEndDate: pvsLog.useEndDate,
                useInsuranceStatus: pvsLog.useInsuranceStatus,
                withEmptyInsurance: pvsLog.withEmptyInsurance,
                employees: pvsLog.employees,
                employeeFilterEnabled: pvsLog.employeeFilterEnabled,
                doNotcheckCatalog: pvsLog.doNotcheckCatalog,
                insuranceStatus: pvsLog.insuranceStatus,
                insuranceTypes: pvsLog.insuranceTypes,
                version: pvsLog.version += 1
            };

            const schema = Y.doccirrus.schemaloader.getSchemaForSchemaName( 'pvslog' );
            const newLog = Y.mix( Y.doccirrus.schemaloader.getEmptyDataForSchema( schema ), data, true );

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: cashlog ? 'cashlog' : 'pvslog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( newLog )
            } );
        }

        /**
         * Sets pvslog to status 'REPLACED' and makes copy of the pvslog with relevant data only.
         * Resets all scheins, treatments and diagnosis to status 'VALID' and removes refs to replaced
         * pvslog. Invoice entries will be kept for documentation and history.
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.id
         *  @param  {Function}  args.callback
         */
        async function replacePVSLog( {user, originalParams: params, callback} ) {
            const
                DCError = Y.doccirrus.commonerrors.DCError,
                ALLOWED_STATUSES = ['ACCEPTED', 'REPLACE_ERR'];

            if( !Y.doccirrus.auth.hasAPIAccess( user, 'pvslog.replacePVSLog' ) ) {
                return callback( accessError );
            }

            let [err] = await formatPromiseResult( Y.doccirrus.api.invoicelog.server.replace( {
                user,
                invoiceLogId: params.id,
                invoiceLogType: 'PVS',
                preChecks: ( cashLog ) => {
                    const statusTransitionAllowed = ALLOWED_STATUSES.includes( cashLog.status );
                    if(!statusTransitionAllowed){
                        throw new DCError( 2037 );
                    }
                },
                createNewLog: async (pvsLog) => {
                    let result;
                    [err, result] = await formatPromiseResult( createPvsLog( user, pvsLog, false ) );

                    if( err ) {
                        Y.log( `createNewLog: could not create kbvlog: ${err.stack || err}`, 'warn', NAME );
                        throw err;
                    }

                    return result;
                }
            } ) );

            if( err ) {
                Y.log( `could not replace pvslog ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }
            callback();
        }

        /**
         *  Apply rules to each entry in the invoice
         *  This is a utility of the Y.doccirrus.api.pvslog.validate action
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  pvslogId        {String}    _id of an open pvslog object
         *  @param  isPreValidation {Boolean}   True if we are not going to finalize this pvslog
         */

        function validatePvsLogRules( user, pvslog, state ) { //, isPreValidation

            let results = [];

            return Y.doccirrus.invoiceprocess.forEachInvoiceEntry({
                user: user,
                invoiceLogId: pvslog._id.toString(),
                startTime: Date.now(),
                excludedPatientIds: pvslog.excludedPatientIds,
                excludedScheinIds: pvslog.excludedScheinIds,
                iterator: function (invoiceEntry) {

                    if ('schein' === invoiceEntry.type) {
                        let
                            affectedActivityIds = Y.doccirrus.ruleutils.collectAffectedActivitiesFromInvoiceEntry( invoiceEntry );

                        return Y.doccirrus.api.rulelog.collectRuleLogEntries({
                            user,
                            patientId: invoiceEntry.data.patientId,
                            caseFolderId: invoiceEntry.data.caseFolderId,
                            locationIds: state.header.locationIds,
                            invoice: true,
                            from: invoiceEntry.data.timestamp,
                            to: invoiceEntry.data.end,
                            affectedActivityIds
                        }).then(ruleLogResults => {
                            return new Promise(function (resolve) {
                                Array.prototype.push.apply(results, ruleLogResults);
                                resolve();
                            });
                        });


                    }

                }
            }).then(() => {
                return results;
            });
        }

        /**
         *  Create activities in patient casefolders referencing PVS log
         *
         *  Overview:
         *
         *      1.  Load PVS log from database
         *      2.  Create description of PVS log settings for activity userContent
         *      3.  Create activities for invoicelogEntries corresponding to scheine
         *      4.  Notify casefile of new activities and call back
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.query
         *  @param  {Object}    args.originalParams     Optional, replaces query if ivoking over REST /1/
         *  @param  {Object}    args.query.pvslogId     Database _id of a pvslog
         *  @param  {Function}  args.callback
         */

        async function createReferenceActivities(args) {
            Y.log('Entering Y.doccirrus.api.pvslog.createReferenceActivities', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.pvslog.createReferenceActivities');
            }
            let
                query = args.query || args.originalParams || {},
                pvslogId = query.pvslogId || null,
                description,
                activityIds = [],
                pvsLog,
                newId,

                err, result;

            //  1.  Load PVS log from database
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    user: args.user,
                    model: 'pvslog',
                    query: {
                        _id: pvslogId
                    }
                })
            );

            if (!err && 0 === result.length) {
                err = Y.doccirrus.errors.rest(404, 'PVS log not found');
            }

            if (err) {
                Y.log( `Could not load PVS log by id: ${pvslogId}`, 'warn', NAME);
                return args.callback(err);
            }

            pvsLog = result[0];

            //  2.  Create description of PVS log settings for activity userContent
            description = '';

            if( !pvsLog.insuranceTypes || 0 === pvsLog.insuranceTypes.length ) {
                pvsLog.insuranceTypes = ['BG', 'PRIVATE', 'SELFPAYER'];
            }

            pvsLog.insuranceTypes.forEach( function( item ) {
                switch( item ) {
                    case 'BG':
                        description = description + 'BG ';
                        break;
                    case 'PRIVATE':
                        description = description + 'PKV ';
                        break;
                    case 'SELFPAYER':
                        description = description + 'SZ ';
                        break;
                }
            } );

            if( pvsLog.useStartDate ) {
                description = description  + START_DATE + ' ' + moment( pvsLog.startDate ).format( TIMESTAMP_FORMAT) + ' ';
            }

            if( pvsLog.useEndDate ) {
                description = description + END_DATE + ' ' + moment( pvsLog.endDate ).format( TIMESTAMP_FORMAT ) + ' ';
            }

            if( true === pvsLog.employeeFilterEnabled && pvsLog.employees && pvsLog.employees.length ) {
                pvsLog.employees.forEach( function( emp ) {
                    description = description + emp.firstname + ' ' + emp.lastname + ' ';
                } );
            }

            if( pvsLog.padnextSettingTitle ) {
                description = description + pvsLog.padnextSettingTitle + ' ';
            }

            //  3.  Create activities for invoicelogEntries corresponding to scheine
            [ err, result] = await formatPromiseResult (
                Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    'user': args.user,
                    'invoiceLogId': pvslogId,
                    'iterator': createSingleReferenceActivity
                } )
            );

            if (err) {
                Y.log( `Problem while creating reference activities: ${pvslogId}`, 'warn', NAME);
                return args.callback(err);
            }

            async function createSingleReferenceActivity( invoiceEntry ) {
                //  activities are created for each schein, but not for headers, etc
                if ('schein' !== invoiceEntry.type) { return; }

                [err, newId] = await formatPromiseResult(
                    Y.doccirrus.api.invoicelog.createReferenceActivity(
                        args.user,
                        invoiceEntry,
                        'INVOICEREFPVS',
                        description
                    )
                );
                if (err) {
                    Y.log( `Problem creating reference activity for ${invoiceEntry._id}: ${err.stack || err}`, 'warn', NAME );
                    //  continue with other casefolders, best effort
                }

                Y.log( `Created INVOICEREFPVS ${newId} for ${invoiceEntry._id}`, 'debug', NAME );
                activityIds.push( newId );
            }

            //  4.  Notify casefile of new activities and call back
            Y.doccirrus.communication.emitEventForUser( {
                targetId: args.user.identityId,
                event: 'treatmentCopiesCreated',        //  causes casefile table reload
                msg: {
                    data: activityIds
                }
            } );

            args.callback(null, activityIds);
        }

        /**
         *  Temporary development method to trigger generation of INVOICEREFPVS
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user               REST user or equivalent
         *  @param  {Function}  args.callback           Of the form fn( err, [ activityIds ]
         */

        function testCreateRef(args) {
            Y.log('Entering Y.doccirrus.api.pvslog.testCreateRef', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.pvslog.testCreateRef');
            }
            let
                passArgs = {
                    'user': args.user,
                    'query': {'pvslogId': '58061d8d7ac139807f60f7ab'},
                    'callback': args.callback
                };

            createReferenceActivities(passArgs);
        }


        /**
         *  TEST/DEV method to return all items in a pvslog
         *  TODO: remove once tested
         *  @param  args
         *  @param  args.originalParams
         *  @param  args.originalParams._id
         */

        function showRawLog(args) {
            Y.log('Entering Y.doccirrus.api.pvslog.showRawLog', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.pvslog.showRawLog');
            }

            var
                params = args.originalParams,
                meta = {'transform': 'original', 'mime': 'TXT_PLAIN', 'widthPx': -1, 'heightPx': -1, '_id': 'temp'},
                cacheDir = Y.doccirrus.media.getCacheDir(),
                fileName = Y.doccirrus.media.getCacheFileName(meta),
                retval = {'fileName': cacheDir + fileName};

            async.series([loadPvsLog, loadLogItems, saveToDisk], onAllDone);

            function loadPvsLog(itcb) {
                Y.doccirrus.mongodb.runDb({
                    'user': args.user,
                    'model': 'pvslog',
                    'query': {_id: params.id},
                    'callback': onPvsLogLoaded
                });

                function onPvsLogLoaded(err, result) {
                    if (err) {
                        return itcb(err);
                    }
                    retval.pvslog = result[0];
                    itcb(null);
                }
            }

            function loadLogItems(itcb) {
                Y.doccirrus.mongodb.runDb({
                    'user': args.user,
                    'model': 'invoiceentry',
                    'query': {invoiceLogId: params.id},
                    'callback': onPvsLogLoaded
                });

                function onPvsLogLoaded(err, result) {
                    if (err) {
                        return itcb(err);
                    }
                    retval.items = result;
                    itcb(null);
                }
            }

            function saveToDisk(itcb) {
                Y.doccirrus.media.writeFile(cacheDir + fileName, cacheDir, JSON.stringify(retval, undefined, 8), itcb);
            }

            function onAllDone(err) {
                args.callback(err, retval);
            }
        }

        /**
         * @method get
         * @public
         *
         * get pvslog|cashlog depends on params.cashlog
         * for pvslog addtionally collect invoiceconfiguration with employee and locations
         */
        async function GET( {user, query, originalParams: {filterOnLocations, cashlog}, options, callback} ) {
            const
                userLocationsId = (user.locations || []).map(item => item._id.toString()),
                settings = Y.doccirrus.api.settings.getSettings(user),
                model = cashlog ? 'cashlog' : 'pvslog';

            if (filterOnLocations && settings && settings.noCrossLocationAccess) {
                query.mainLocationId = {$in: userLocationsId};
            }

            let err, logs;
            [ err, logs ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    action: 'get',
                    query,
                    options: { ...options, lean: true }
                } )
            );
            if( err ) {
                Y.log(`pvsLog Get: Error getting ${model}: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }

            for( let item of logs.result ) {
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

            if(cashlog){
                return callback(null, logs);
            }

            let invoiceconfigs;
            [ err, invoiceconfigs ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    action: 'get',
                    options: {
                        limit: 1,
                        fields: {
                            padxSettings: 1
                        }
                    }
                } )
            );
            if( err ) {
                Y.log(`pvsLog Get: Error getting invoiceConfig.padxSettings: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }

            if(invoiceconfigs && invoiceconfigs.length && invoiceconfigs[0].padxSettings && invoiceconfigs[0].padxSettings.length){
                logs.result.forEach((log) => {
                    if (log.padnextSettingId) {
                        log._deliverySettings = invoiceconfigs[0].padxSettings.find(padSetting => {
                            return padSetting._id.toString() === log.padnextSettingId;
                        }) || null;
                    }
                });
            }

            callback(null, logs);
        }

        /**
         *  Send PVS log to billing provider
         *
         *  Overview:
         *
         *      (1) Initial checks on request
         *      (2) Load the PVS log from database and set status to SENDING
         *      (3) Notify client that send is in progress and count accepted pvslogs
         *          -->call back to client at this point, further comms use websocket events
         *      (4) Use count of existing logs to make a transaction number and then generate PADX file
         *      (5) Send PADX file via padLine if oneClick enabled
         *      (6) Update pvslog status with outcome of padLine transfer, send WS event to client
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.id      A pvslog _id
         *  @param  {Function}  args.callback
         *  @return {*}
         */

        function sendLog(args) {
            var user = args.user,
                logInfo = {},
                params = args.originalParams,
                callback = args.callback,
                pvslog, version,
                generatePadX = Y.doccirrus.api.padx.generatePadX,
                sendFileToPadline = Y.doccirrus.api.padx.sendFileToPadline;

            //  (1) Initial checks on request

            if (!Y.doccirrus.auth.hasAPIAccess(user, 'pvslog.send')) {
                return callback(accessError);
            }

            if (!params.id) {
                return callback(Y.doccirrus.errors.http(500, 'Missing Parameter id'));
            }

            //  (2) Load the PVS log from database and set status to SENDING

            Y.doccirrus.mongodb.runDb({
                user: user,
                model: 'pvslog',
                query: {
                    _id: params.id
                }
            }, pvslogCb);

            function pvslogCb(err, pvslogs) {
                if (err) {
                    Y.log('Error retrieving pvs log data ' + err, 'error', NAME);
                    callback(Y.doccirrus.errors.http(500, 'Error retreiving pvs logs'));
                    return;
                }
                if (!pvslogs || !pvslogs.length) {
                    Y.log('PVSLog entry not found id: ' + params.id, 'error', NAME);
                    callback(Y.doccirrus.errors.http(500, 'PVSLog entry not foound'));
                    return;
                }

                pvslog = pvslogs[0];

                logInfo.id = pvslog._id.toString();
                logInfo.commercialNo = pvslog.commercialNo;

                pvslog.status = 'SENDING';

                //mongooselean.save_fix
                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'pvslog',
                    action: 'put',
                    query: {
                        _id: pvslog._id
                    },
                    fields: Object.keys(pvslog),
                    data: Y.doccirrus.filters.cleanDbObject(pvslog)
                }, updatedPvsLog);

            }

            //  (3) Notify client that send is in progress and count accepted pvslogs
            //  call back to client at this point, further comms use websocket events

            function updatedPvsLog(err) {

                if (err) {
                    Y.log('error pvslog.send() ' + err, 'error', NAME);
                    return callback(err);
                }

                //  TODO: check this early callback
                callback();                             //  eslint-disable-line

                Y.doccirrus.communication.emitEventForUser({
                    targetId: user.identityId,
                    event: 'invoicelogAction',
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                    msg: {
                        data: {
                            invoiceType: 'PVS',
                            action: 'send',
                            state: 'started'
                        }
                    }
                });

                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'pvslog',
                    action: 'count',
                    query: {
                        status: 'ACCEPTED'
                    },
                    options: {
                        fields: {
                            _id: 1
                        }
                    }
                }, countExistingLogsCb);

            }

            //  (4) Use count of existing logs to make a transaction number and then generate PADX file

            function countExistingLogsCb(err, nAcceptedLogs) {
                if (err) {
                    Y.log('Error retrieving  all existing and accepted pvs log data ' + err, 'error', NAME);
                    finalCb(err);
                    return;
                }

                version = nAcceptedLogs + 1;
                Y.log('Calculated version of pvslog before generating files ' + version, 'debug', NAME);

                generatePadX({
                    user: user,
                    invoiceLogId: pvslog._id.toString(),
                    padnextSettingId: pvslog.padnextSettingId,
                    excludedPatientIds: pvslog.excludedPatientIds,
                    excludedScheinIds: pvslog.excludedScheinIds,
                    unknownInsuranceScheinIds: pvslog.unknownInsuranceScheinIds,
                    transferNo: version,
                    oneClick: 'true' === params.oneClick,
                    messageType: 'ADL',
                    onProgress: function (progress) {
                        onInvoiceProgress(user, pvslog._id.toString(), progress);
                    },
                    callback: generatedPadX
                });

            }

            //  (5) Send PADX file via padLine if oneClick enabled

            function generatedPadX(err, result) {
                if (err) {
                    Y.log('Error generating padx files' + err, 'error', NAME);
                    finalCb(err);
                    return;
                }

                pvslog.padnextFileName = result.fileName;

                Y.doccirrus.invoicelogutils.storeFile(user, result.fileName, {
                    content_type: 'application/zip'
                }, result.data, (err, fileId) => {
                    if ('true' === params.oneClick) {
                        if (err) {
                            finalCb(err);
                        } else {
                            Y.log("calling sendFileToPadline...", 'warn', NAME);
                            sendFileToPadline({
                                user: args.user,
                                fileName: result.fileName,
                                fileBytes: result.data,
                                baseConfig: result.baseConfig,
                                callback: function (err, success) {
                                    if (err) {
                                        Y.log("sendFileToPadline err: " + err, 'warn', NAME);
                                    }
                                    if (success) {
                                        Y.log("sendFileToPadline success: " + success);
                                    }
                                    finalCb(err, fileId);
                                }
                            });
                        }
                    } else {
                        finalCb(err, fileId);
                    }
                });
            }

            //  (6) Update pvslog status with outcome of padLine transfer, send WS event to client

            function finalCb(err, fileId) {
                var errors = [],
                    data = {},
                    text,
                    msg;

                if (err) {
                    data.status = 'SENT_ERR';
                    data.padnextFileName = '';
                    text = ' Ihre Abrechnung wurde nicht akzeptiert!';
                    if (err.code) {
                        text += "<br><br>Grund: " + Y.doccirrus.errorTable.getMessage(err);
                    }
                    errors.push(Y.doccirrus.errors.http(500, 'Could not save pvslog'));
                } else {
                    data.status = 'ACCEPTED';
                    data.padnextFileId = fileId;
                    data.padnextFileName = pvslog.padnextFileName;
                    text = 'Ihre Abrechnung wurde akzeptiert!';
                }
                msg = {
                    data: {
                        text: text,
                        state: 'finished',
                        action: 'send',
                        invoiceType: 'PVS',
                        logInfo: logInfo,
                        warnings: [],
                        errors: errors
                    }
                };
                data.lastUpdate = new Date();
                data.user = [
                    {
                        name: user.U,
                        employeeNo: user.identityId
                    }
                ];

                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'pvslog',
                    action: 'put',
                    data: Y.doccirrus.filters.cleanDbObject(data),
                    fields: Object.keys(data),
                    query: {
                        _id: pvslog._id
                    }
                }, function (err) {

                    if (err) {
                        Y.log('could not save pvslog ' + err, 'error', NAME);
                        msg.data.errors.push(Y.doccirrus.errors.http(500, 'Could not save pvslog'));
                    }
                    Y.doccirrus.communication.emitEventForUser({
                        targetId: args.user.identityId,
                        event: 'invoicelogAction',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.DISPLAY,
                        msg: msg
                    });
                });

                //  lastly, trigger generation fo reference activities in the casefile to point this invoice entry
                //  this happens independently in the background, we don't need to wait for it
                createReferenceActivities({
                    'user': user,
                    'query': {'pvslogId': pvslog._id},
                    'callback': onRefActivitiesCreated
                });
            }

            function onRefActivitiesCreated(err /*, result */) {
                if (err) {
                    Y.log('Problem creating pvslog reference activities: ' + JSON.stringify(err), 'warn', NAME);
                }
            }

        }

        function removeLog( { user, originalParams: {id, cashlog}, callback } ) {
            Y.doccirrus.invoicelogutils.removeInvoiceLog({
                user,
                invoiceLogId: id,
                testFn: (pvslog) => {
                    if (Y.doccirrus.auth.memberOf(user, Y.doccirrus.schemas.employee.userGroups.SUPPORT)) {
                        return true;
                    }
                    return ['CREATED', 'VALID', 'VALIDATION_ERR', 'INVALID'].includes(pvslog.status);
                },
                model: ( cashlog ? 'cashlog' : 'pvslog' )
            }).then(() => callback(null)).catch(err => callback(err));
        }

        async function isContentOutdated( activity ) {
            let activityFields;

            switch( activity.actType ) {
                case 'DIAGNOSIS':
                    activityFields = useDiagnosisFields;
                    break;
                case 'TREATMENT':
                    activityFields = useTreatmentFields;
                    break;
                case 'PKVSCHEIN':
                case 'BGSCHEIN':
                    activityFields = useScheineFields;
                    break;
                default:
                    Y.log( `could not find pvslog/cashlog activity fields for actType ${activity.actType}`, 'debug', NAME );
                    return false;
            }

            return Y.doccirrus.mongooseUtils.areFieldsModified( activityFields, activity );
        }


        Y.namespace('doccirrus.api').pvslog = {

            name: NAME,

            server: {
                isContentOutdated,
                createPvsLog
            },

            get: GET,

            createLogs: createLogs,
            showRawLog: showRawLog,
            validate: validatePvsLog,
            replace: replacePVSLog,

            send: sendLog,
            remove: removeLog,

            createReferenceActivities: createReferenceActivities,
            testCreateRef: testCreateRef

        };
    },
    '0.0.1', {requires: ['dcmongooseutils', 'padx-api', 'dcinvoicelogutils', 'dc-comctl', 'dcauth', 'employee-schema']}
);
