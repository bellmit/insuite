/**
 * User: do
 * Date: 20.03.19  18:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'shiftpatients-api', function( Y, NAME ) {
        const i18n = Y.doccirrus.i18n;
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const DCError = Y.doccirrus.commonerrors.DCError;

        /**
         * @module shiftpatients-api
         */

        // TODO: also include sub locations !!!!

        /**
         * Abstraction layer to query invoiceentries of type 'schein'.
         *
         * @param {object}  args
         * @return {Promise<void>}
         */
        async function get( args ) {
            Y.log( 'Entering Y.doccirrus.api.shiftpatients.get', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.shiftpatients.get' );
            }

            const {user, query, originalParams, options, callback} = args;
            const exactSearch = originalParams.exactSearch;

            if( !query.invoiceLogType || !query.invoiceLogId || !query.timestamp || !query.locationId || !query.employeeId ) {
                callback( Y.doccirrus.errors.rest( 500, 'Missing Query' ) );
                return;
            }

            // get invoicelog because we need excluded schein and patient ids to exclude them from invoiceentry query
            let [err, results] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.invoicelog.get( {
                    user,
                    originalParams: {
                        invoiceLogType: query.invoiceLogType
                    },
                    query: {
                        _id: query.invoiceLogId
                    },
                    callback: ( err, res ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( res );
                        }
                    }
                } );
            } ) );

            if( err ) {
                Y.log( `could not get invoicelog of type ${query.invoiceLogType} with id ${query.invoiceLogId} to shift patients: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            if( !results || !results[0] ) {
                const notFoundError = `invoicelog of type ${query.invoiceLogType} with id ${query.invoiceLogId} not found`;
                Y.log( notFoundError, 'warn', NAME );
                callback( notFoundError );
                return;
            }

            const invoiceLog = results[0];

            if( !options.limit ) {
                options.limit = 10;
            }

            const invoiceEntriesQuery = {
                invoiceLogId: query.invoiceLogId,
                'data.treatments.locationId': query.locationId,
                'data.treatments.employeeId': query.employeeId,
                'data.timestamp': query.timestamp
            };

            if( query.invoiceLogType === 'ASV' ) {
                invoiceEntriesQuery['data.treatments.asvTeamnumber'] = {$ne: null};
            }

            if( query['data.treatments.code'] ) {
                invoiceEntriesQuery['data.treatments.code'] = query['data.treatments.code'];
            }

            if( query.$or ) {
                invoiceEntriesQuery.$or = query.$or;
            }

            if( query.$and ) {
                invoiceEntriesQuery.$and = query.$and;
            }

            if( invoiceLog.excludedScheinIds && invoiceLog.excludedScheinIds.length ) {
                invoiceEntriesQuery['data._id'] = {$nin: invoiceLog.excludedScheinIds};
            }
            if( invoiceLog.excludedPatientIds && invoiceLog.excludedPatientIds.length ) {
                invoiceEntriesQuery['data.patientId'] = {$nin: invoiceLog.excludedPatientIds};
            }

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'invoiceentry',
                query: invoiceEntriesQuery,
                options: options
            } ) );

            if( err ) {
                Y.log( `could not get scheins to shift: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            results.result = results.result.map( invoiceentry => {
                const matchingTreatments = invoiceentry.data.treatments.filter( ( treatment ) => {
                    return query.employeeId.$in.includes( treatment.employeeId ) && // TODO: make more generic
                           treatment.locationId === query.locationId;
                } ).filter( function( treatment ) {
                    return exactSearch && exactSearch.length ? exactSearch.includes( treatment.code ) : true;
                } );
                const matchingTreatmentsPrice = matchingTreatments.reduce( ( sum, treatment ) => {
                    return Y.doccirrus.comctl.dcSum( sum, treatment.price );
                }, 0 );
                return {
                    invoiceEntryId: invoiceentry._id.toString(),
                    patientId: invoiceentry.data.patient._id,
                    patientName: Y.doccirrus.schemas.person.personDisplay( invoiceentry.data.patient ),
                    physicianName: matchingTreatments && matchingTreatments[0] && matchingTreatments[0].employeeName || '-',
                    treatments: matchingTreatments.map( treatment => ({
                        _id: treatment._id,
                        text: treatment.code
                    }) ),
                    diagnoses: invoiceentry.data.diagnoses.concat( invoiceentry.data.continuousDiagnoses ).map( diagnosis => {
                        const continuousDiagnosisStr = diagnosis.diagnosisType === 'CONTINUOUS' ? '<span class="label label-info">DD</span>' : '';
                        const diagnosisCertStr = diagnosis.diagnosisCert ? ` ${Y.doccirrus.kbvcommonutils.mapDiagnosisCert( diagnosis.diagnosisCert )}` : '';
                        const diagnosisSite = diagnosis.diagnosisSite ? ` ${diagnosis.diagnosisSite[0]}` : '';
                        return {
                            _id: diagnosis._id,
                            text: `${continuousDiagnosisStr}${diagnosis.code} ${diagnosisCertStr}${diagnosisSite}`
                        };
                    } ),
                    sum: matchingTreatmentsPrice
                };
            } ).filter( result => Boolean( result.treatments.length ) );

            callback( null, results );
        }

        async function shift( args ) {
            Y.log( 'Entering Y.doccirrus.api.shiftpatients.shift', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.shiftpatients.shift' );
            }

            const {user, originalParams, callback} = args;

            const data = originalParams;
            const modifiedTreatmentIds = [];

            if( !data || !data.targetEmployeeId ) {
                Y.log( `missing targetEmployeeId`, 'warn', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'insufficient params' ) );
                return;
            }

            if( !data.changes || !data.changes ) {
                Y.log( `no changes passed to shiftpatients.shift`, 'debug', NAME );
                callback();
                return;
            }

            const query = {
                _id: {$in: data.changes.map( change => change.treatmentId )}
            };

            let [err, treatments] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                query,
                options: {
                    limit: 100 // max of ko table
                }
            } ) );

            Y.log( `going to update ${treatments.length} found of ${data.changes.length} send treatment ids`, 'info', NAME );

            if( err ) {
                Y.log( `could not get treatments to shift employee: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            for( let treatment of treatments ) {
                const update = {
                    backupEmployeeIds: treatment.backupEmployeeIds,
                    employeeId: treatment.employeeId,
                    employeeName: data.targetEmployeeNames && data.targetEmployeeNames[0]
                };

                if( !Array.isArray( update.backupEmployeeIds ) ) {
                    update.backupEmployeeIds = [];
                }

                // take care of array growth
                if( update.backupEmployeeIds.length <= 50 ) {
                    update.backupEmployeeIds.shift();
                }

                if( update.employeeId === data.targetEmployeeId ) {
                    Y.log( `found treatment ${treatment._id} already has targetEmployeeId ${data.targetEmployeeId} assigned`, 'debug', NAME );
                    continue;
                }

                const lastBackupEmployeeId = update.backupEmployeeIds[update.backupEmployeeIds.length - 1];
                if( lastBackupEmployeeId !== update.employeeId ) {
                    update.backupEmployeeIds.push( update.employeeId );
                }

                update.employeeId = data.targetEmployeeId;

                Y.log( `update treatment ${treatment._id} to ${update}`, 'debug', NAME );

                let result;
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    query: {_id: treatment._id},
                    data: update,
                    options: {
                        limit: 1
                    }
                } ) );

                if( err ) {
                    Y.log( `could not update treatment ${treatment._id}: ${err.stack || err}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                const treatmentWasModified = (result && result.nModified || 0) > 0;
                if( treatmentWasModified ) {
                    modifiedTreatmentIds.push( treatment._id );
                    const targetNames = (data.targetEmployeeNames || []).join( ', ' );
                    const sourceNames = (data.sourceEmployeeNames || []).join( ', ' );

                    Y.doccirrus.api.audit.postBasicEntry( user, 'put', 'activity', i18n( 'InvoiceMojit.shiftpatients.shift_patientsJS.audit.put', {
                        data: {
                            code: treatment.code,
                            invoiceLogType: data.invoiceLogType,
                            invoiceLogText: data.invoiceLogText,
                            sourceNames,
                            targetNames
                        }
                    } ) );
                }

            }

            // Queue treatment for report regeneration because of update action was used to be able to update approved treatments

            modifiedTreatmentIds.forEach( id => Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', id.toString() ) );

            // Update invoice entries containing modified treatments

            const invoiceEntryIdsToUpdate = data.changes
                .filter( change => modifiedTreatmentIds.map( oId => oId.toString() ).includes( change.treatmentId ) )
                .reduce( ( acc, change ) => {
                    if( !acc.includes( change.invoiceEntryId ) ) {
                        acc.push( change.invoiceEntryId );
                    }
                    return acc;
                }, [] );

            if( invoiceEntryIdsToUpdate.length ) {
                Y.log( `update invoice entries containing updated treatments: ${invoiceEntryIdsToUpdate}`, 'info', NAME );
                let invoiceEntries;
                [err, invoiceEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceentry',
                    query: {
                        _id: {$in: invoiceEntryIdsToUpdate}
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get invoice entries ${invoiceEntryIdsToUpdate} to update`, 'warn', NAME );
                    callback( err );
                    return;
                }

                for( let invoiceEntry of invoiceEntries ) {
                    invoiceEntry.data.treatments.forEach( invoiceEntryTreatment => {
                        if( modifiedTreatmentIds.map( oId => oId.toString() ).includes( invoiceEntryTreatment._id.toString() ) ) {
                            invoiceEntryTreatment.employeeId = data.targetEmployeeId;
                            invoiceEntryTreatment.employeeName = data.targetEmployeeNames && data.targetEmployeeNames[0];
                        }
                    } );

                    let invoiceEntryUpdateResult;
                    [err, invoiceEntryUpdateResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'invoiceentry',
                        action: 'update',
                        query: {
                            _id: invoiceEntry._id
                        },
                        data: {
                            'data.treatments': invoiceEntry.data.treatments
                        }
                    } ) );

                    if( err ) {
                        Y.log( `could not update invoice entry: ${err.stack | err}`, 'error', NAME );
                        callback( err );
                        return;
                    }
                    if( invoiceEntryUpdateResult.nModified ) {
                        Y.log( `modified invoice entry ${invoiceEntry._id} after treatments were shifted to another employee`, 'debug', NAME );
                    } else {
                        Y.log( `could not modify invoice entry ${invoiceEntry._id} after treatments were shifted to another employee`, 'debug', NAME );
                    }
                }
            }

            const results = {warnings: []};

            if( modifiedTreatmentIds.length !== data.changes.length ) {
                Y.log( `not all treatments could be modified ${modifiedTreatmentIds.length}/${data.changes.length}`, 'debug', NAME );
                results.warnings.push( (new DCError( 2300 )).message );
            }

            callback( null, results );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class shiftpatients
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).shiftpatients = {
            name: NAME,
            get,
            shift
        };

    },
    '0.0.1', {requires: []}
);
