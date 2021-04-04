/**
 * User: do
 * Date: 24/02/15  13:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcinvoicelogutils', function( Y, NAME ) {

        const
            DCError = Y.doccirrus.commonerrors.DCError,
            Prom = require( 'bluebird' ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        function getInvoiceModelName( type ) {
            switch( type ) {
                case'KBV':
                    return 'kbvlog';
                case 'PVS':
                    return 'pvslog';
                case 'CASH':
                    return 'cashlog';
            }
        }

        function pushActivity( activity, arr, noStatusCheck ) {
            if( 'VALID' === activity.status || true === noStatusCheck ) {
                arr.push( activity._id );
            }
        }

        function collectIdsToApprove( schein, noContinuousDiagnoses, noStatusCheck, noDiagnoses ) { // TODOOO kvc rename, because is now used 2 tw methods
            var _ = require( 'lodash' ),
                results = [], activities;

            activities = _.flatten( [[schein], schein.treatments, schein.medications, (true === noDiagnoses ? [] : schein.diagnoses), (true === noContinuousDiagnoses ? [] : schein.continuousDiagnoses)] ); // TODOOO kvc check caseFolderId or add flag to conDiag that are pulled from schein? or check against schein origianl conDia arr
            activities.forEach( function( activity ) {
                pushActivity( activity, results, noStatusCheck );
            } );

            return results;
        }

        function resetInvoiceLogContent(args) {
            const {user, invoiceLog, invoiceType, onlyApproved, onProgress} = args;
            const
                startTime = new Date(),
                invoiceLogId = invoiceLog && invoiceLog._id && invoiceLog._id.toString(),
                invoiceModelName = invoiceType && getInvoiceModelName( invoiceType );

            function reset() {

                return Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    user: user,
                    invoiceLogId,
                    startTime: startTime,
                    excludedPatientIds: invoiceLog.excludedPatientIds,
                    excludedScheinIds: invoiceLog.excludedScheinIds,
                    unknownInsuranceScheinIds: invoiceLog.unknownInsuranceScheinIds,
                    onProgress,
                    iterator: function( invoiceEntry ) {
                        if( 'schein' === invoiceEntry.type ) {
                            let nActivitiesToReset, activityIds;
                            return Prom.resolve()
                                .then( function() {
                                    // TODOOO kvc ignore continuousDiagnoses (for now) by setting last arg to true because they could come from different quarter, schein etc.
                                    return collectIdsToApprove( invoiceEntry.data, true, true, false );
                                } ).then( function( ids ) {
                                    activityIds = ids;
                                    nActivitiesToReset = ids.length;
                                    if(onlyApproved){
                                        //do not change status of activities if need only approved to be changed
                                        return Promise.resolve( {nModified: 0} );
                                    }

                                    return Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'update',
                                        model: 'activity',
                                        migrate: true,
                                        query: {
                                            _id: {$in: ids}
                                        },
                                        data: {
                                            status: 'VALID'
                                        },
                                        options: {multi: true}
                                    } );
                                } ).then( async ( result ) => {
                                    Y.log( `resetted ${result.nModified} activities of ${nActivitiesToReset} activities to be reseted`, 'debug', NAME );

                                    for (let activityId of activityIds){
                                        Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                                        let [ err ] = await formatPromiseResult(
                                            Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, { status: 'BILLED' }, { status: 'VALID' } )
                                        );
                                        if( err ){
                                            Y.log( `resetInvoiceLogContent: error creating audit entry for ${activityId} : ${err.stack || err}`, 'warn', NAME );
                                        }
                                    }

                                } ).catch( err => {
                                    Y.log( `error while resetting schein ID=${invoiceEntry.data._id} for ${invoiceModelName} ID=${invoiceLogId} err=${err.stack || err}`, 'error', NAME );
                                    throw err;
                                } );
                        }
                    }
                } ).then( () => {
                    Y.log( `resetted invoice log... start cleaning`, 'debug', NAME );
                    return Y.doccirrus.invoicelogutils.cleanMarkedActivities( user, invoiceLogId, onlyApproved, onlyApproved );
                } ).then( result => {
                    Y.log( `cleaned ${result.nModified} activities of invoiceLog ${invoiceLogId} after resetting`, 'debug', NAME );
                } ).catch( err => {
                    Y.log( `error while resetting ${invoiceModelName} ID=${invoiceLogId} err=${err.stack || err}`, 'error', NAME );
                    throw err;
                } );
            }

            return Promise.resolve().then( () => {
                if( !invoiceLog || !invoiceType || !invoiceModelName ) {
                    throw DCError( 500, {message: 'insufficient arguments'} );
                }
                return reset();
            } );

        }

        /**
         * Determines if a validation result from rule-engine or kbv-pm must be excluded from final result.
         * It matches the affected treatments like configured in invoice configuration.
         * @param {Object} args
         * @return {Promise<boolean>}
         */
        async function filterValidationResult( args ) {
            const {user, validationResult, invoiceConfig} = args;
            const affactedActivities = [];
            let excludeError = false;

            // collect treatment ids from dependant rule-engine results
            if( Array.isArray( validationResult.affectedActivities ) ) {
                [].push.apply( affactedActivities, validationResult.affectedActivities
                    .filter( a => a.actType === 'TREATMENT' ).map( a => a.id ) );
            }
            // collect possible treatment ids from dependant kbv-pm results
            if( Array.isArray( validationResult.map ) ) {
                [].push.apply( affactedActivities, validationResult.map
                    .filter( a => a.model === 'Activity_T' ).map( a => a.modelIds[0] ) );
            }

            if( affactedActivities.length ) {
                let [err, treatments] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: {$in: affactedActivities},
                        actType: 'TREATMENT'
                    },
                    options: {
                        select: {
                            code: 1,
                            locationId: 1,
                            employeeId: 1
                        }
                    }
                } ) );

                if( !err ) {
                    excludeError = treatments.some( treatment => Y.doccirrus.schemas.invoiceconfiguration.isTreatmentExcluded( 'VALIDATION', invoiceConfig, treatment ) );
                } else {
                    Y.log(`filterValidationResult: could not get affacted activities: ${affactedActivities}: ${err.stack || err}`, 'warn', NAME);
                }
            }

            return excludeError;
        }

        Y.namespace( 'doccirrus' ).invoicelogutils = {

            name: NAME,

            filterValidationResult,

            collectFileIds: function( invoicelog ) {
                let ids = [],
                    fileIdAttrNames = ['conFileId', 'xkmFileId', 'padnextFileId', 'encryptedPadnextFileId'];

                fileIdAttrNames.forEach( attrName => {
                    if( invoicelog[attrName] ) {
                        ids.push( invoicelog[attrName] );
                    }
                } );

                if( invoicelog.statFiles && invoicelog.statFiles.length ) {
                    invoicelog.statFiles.forEach( statFile => ids.push( statFile.fileId ) );
                }

                return ids;
            },

            /**
             * Deletes all invoicelog files specified by options.types.
             *
             * @param {Object} user
             * @param {Array<String>} ids file id or array of file ids
             * @param {Function} callback
             *
             * @return {Function} callback
             */
            cleanFiles: function( user, ids, callback ) {
                function clean( id, cb ) {

                    function deletedCb( err ) {
                        if( err ) {
                            Y.log( 'Could not delete file with id: ' + id + ' : ' + err, 'error', NAME );
                            return cb( err );
                        }
                        cb();
                    }

                    Y.doccirrus.gridfs.delete( user, id, deletedCb );
                }

                if( !ids ) {
                    return callback( new Error( 'ids must be specified' ) );
                }
                if( !Array.isArray( ids ) ) {
                    ids = [ids];
                }

                require( 'async' ).eachSeries( ids, clean, callback );
            },

            /**
             * Save file buffer in grid fs and updates kbvlog.
             *
             * @param {Object} user
             * @param {String} filename
             * @param {Object} options
             * @param {String} options.content_type
             * @param {Object} options.metadata
             * @param {String} options.metadata.charset
             * @param {Object} buffer
             * @param {Function} callback
             * @returns {*}
             */
            storeFile: function( user, filename, options, buffer, callback ) {
                return new Promise( ( resolve, reject ) => {

                    function storedCb( err, id ) {
                        if( err ) {
                            Y.log( 'Could not store ' + filename + ' file: ' + err, 'error', NAME );
                            if( callback ) {
                                return callback( err );
                            }
                                return reject( err );
                        }
                        if( callback ) {
                            return callback( null, id );
                        }
                        resolve( id );
                    }

                    Y.doccirrus.gridfs.store( user, filename, options, buffer, storedCb );
                } );
            },

            checkZip: function( addresses, locationZips ) {
                var zipCodes;

                function getCatalog() {
                    var descriptor = Y.doccirrus.api.catalog.getCatalogDescriptors( {short: 'SDPLZ'} );
                    if( descriptor && descriptor._CUSTOM && descriptor._CUSTOM.cat &&
                        descriptor._CUSTOM.cat[0] ) {
                        return descriptor._CUSTOM.cat[0].filename;
                    }
                }

                function findZip( zip, entries ) {
                    return entries.some( function( entry ) {
                        return entry.plz === zip;
                    } );
                }

                function isGerman() {
                    return addresses.some( function( address ) {
                        return 'D' === address.countryCode;
                    } );
                }

                zipCodes = addresses.map( function( address ) {
                    return address.zip;
                } );

                return runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        plz: {$in: zipCodes},
                        catalog: getCatalog()
                    }
                } ).then( function( entries ) {
                    addresses.forEach( function( address ) {
                        if( findZip( address.zip, entries ) ) {
                            return;
                        }
                        if( isGerman() ) {
                            if( address.zip === locationZips.zip ) {
                                address.zip = locationZips.kbvZip;
                            } else {
                                address.zip = locationZips.zip;
                            }
                        } else {
                            address.zip = '99999';
                        }
                    } );
                } );
            },

            checkPseudoGnrs: function( treatments, getPseudognr ) {

                var additionalTreatments = [],
                    stdPseudoGnr = '88999';

                function getGnrByExplanation( explanation, gnrs ) {
                    var found;
                    if( 'string' !== typeof explanation ) {
                        return;
                    }
                    gnrs.some( function( item ) {
                        if( explanation === item.title ) {
                            found = item.seq;
                            return true;
                        }
                        return false;
                    } );
                    return found;
                }

                function isPseudoGnr( gnr, gnrs ) {
                    return gnrs.some( function( item ) {
                        return item.seq === gnr;
                    } );
                }

                return Prom.resolve( treatments ).map( function( treatment, index ) {
                    return getPseudognr( treatment.locationId ).then( function( pseudognr ) {
                        var rule = pseudognr && pseudognr.rule,
                            gnrs = pseudognr && pseudognr.gnrs || [];

                        if( !rule || !treatment.fk5012Set || !treatment.fk5012Set.length ) {
                            return treatment;
                        }

                        if( !treatment.code ) {
                            treatment.code = getGnrByExplanation( treatment.explanations, gnrs ) || stdPseudoGnr;
                        } else if( '1' === rule && !isPseudoGnr( treatment.code, gnrs ) ) {
                            // split treatment
                            additionalTreatments.push( {
                                index: index,
                                treatment: {
                                    __additional: true, // flag to indicate this treatment is auto generated
                                    _id: Y.clone( treatment._id, true ),
                                    actType: 'TREATMENT',
                                    timestamp: Y.clone( treatment.timestamp, true ),
                                    code: Y.clone( stdPseudoGnr, true ),
                                    fk5012Set: Y.clone( treatment.fk5012Set, true ),
                                    employeeId: Y.clone( treatment.employeeId, true ),
                                    locationId: Y.clone( treatment.locationId, true ),
                                    content: 'Sachkosten'
                                }
                            } );
                            treatment.fk5012Set = [];
                        }
                        return treatment;
                    } );
                } ).then( function( treatments ) {
                    var i, addtionalTreatment;
                    // we do not know in which order the promises are resolved so sort by index
                    additionalTreatments.sort( function( a, b ) {
                        return a.index - b.index;
                    } );
                    // insert additional treatments from right to left to keep the right order
                    for( i = additionalTreatments.length - 1; i >= 0; i-- ) {
                        addtionalTreatment = additionalTreatments[i];
                        treatments.splice( addtionalTreatment.index + 1, 0, addtionalTreatment.treatment );
                    }
                    return treatments;
                } );
            },
            checkDaySeparation: function( treatments, getDaySeparation ) {
                var _ = require( 'lodash' ),
                    moment = require( 'moment' );

                function groupByDay( treatment ) {
                    return moment( treatment.timestamp ).format( 'MM.DD.YYYY' );
                }

                return Prom.resolve( _.groupBy( treatments, groupByDay ) )
                    .then( _.values )
                    .map( _.first )
                    .map( function( firstTreatmentOnDay ) {
                        firstTreatmentOnDay._isFirstOnDay = true;
                        if( !firstTreatmentOnDay.daySeparation ) {
                            return firstTreatmentOnDay;
                        }
                        return getDaySeparation( firstTreatmentOnDay.locationId )
                            .then( function( entries ) {
                                var daySep = entries && entries[0];
                                if( daySep && daySep && daySep.kvValue && '2' === daySep.kvValue.key ) {
                                    firstTreatmentOnDay.daySeparation = '';
                                }
                                return firstTreatmentOnDay;
                            } );
                    } ).then( function() {
                        return treatments;
                    } );
            },
            scheinIcds: function( user, schein ) {
                var _ = require( 'lodash' );
                return runDb( {
                    query: {
                        _id: {$in: schein.icds},
                        actType: 'DIAGNOSIS'
                    },
                    user: user,
                    model: 'activity',
                    options: {
                        fields: {
                            code: 1
                        }
                    }
                } ).map( function( diagnosis ) {
                    return _.result( diagnosis, 'code' );
                } ).then( function( scheinIcds ) {
                    schein.scheinIcds = scheinIcds;
                    return schein;
                } );
            },
            populateScheinSpecialisation: function( schein ) {

                function getCatalog() {
                    var descriptor = Y.doccirrus.api.catalog.getCatalogDescriptors( {short: 'EBM'} );
                    if( descriptor && descriptor.TREATMENT && descriptor.TREATMENT.cat &&
                        descriptor.TREATMENT.cat[0] ) {
                        return descriptor.TREATMENT.cat[0].filename;
                    }
                }

                var getFromTables = Prom.promisify( Y.doccirrus.catalogindex.getFromTables ),
                    catalog = getCatalog(),
                    key;

                if( schein.scheinSpecialisation && catalog ) {
                    key = schein.scheinSpecialisation;
                    return getFromTables( {
                        catalog: catalog,
                        table: 'fachgruppe',
                        key: key
                    } ).then( function( specialisation ) {
                        schein.scheinSpecialisation = (specialisation && specialisation[0]) ? specialisation[0].value : schein.scheinSpecialisation;
                        return schein;
                    } );
                } else {
                    return schein;
                }

            },
            addBsnrLanr: function( treatments, locations ) {
                var _ = require( 'lodash' );
                return Prom.resolve( treatments ).map( function( treatment ) {
                    var location = _.find( locations, {_id: treatment.locationId.toString()} ),
                        lanr,
                        isAsvPseudoNo;
                    if( location && location.physicians ) {
                        treatment._bsnr = _.result( location, 'commercialNo' ) || '';
                        let physician = _.find( location.physicians, {_id: treatment.employeeId} );
                        // write _lanr of actual physician instead
                        if( physician && physician.physicianInQualification && physician.rlvPhysician ) {
                            const rlvPhysician = _.find( location.physicians, {_id: physician.rlvPhysician} );
                            if( rlvPhysician ) {
                                Y.log( `override lanr of physician in qualification ${physician.officialNo} with ${rlvPhysician.officialNo}`, 'debug', NAME );
                            }
                            physician = rlvPhysician || physician;
                        }
                        lanr = _.result( physician, 'officialNo' ) || '';
                        isAsvPseudoNo = null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( lanr );
                        treatment._lanr = isAsvPseudoNo ? null : lanr;
                        treatment._pseudoLanr = isAsvPseudoNo ? lanr : null;
                    }
                    return treatment;
                } );
            },

            saveInvoiceLog: function( kbvlog, user, modelName ) {
                return new Prom( function( resolve, reject ) {
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: modelName,
                        action: 'put',
                        query: {
                            _id: kbvlog._id
                        },
                        fields: Object.keys( kbvlog ),
                        data: Y.doccirrus.filters.cleanDbObject( kbvlog )
                    }, function( err ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( kbvlog );
                        }
                    } );
                } );
            },

            /**
             * Check if schein or patient is included in invoice data.
             * @param {Object} invoiceEntrySchein
             * @param {Object} config
             * @returns {Boolean}
             */
            includeSchein: function( invoiceEntrySchein, config ) {
                const
                    excludedPatientIds = config.excludedPatientIds || [],
                    excludedScheinIds = config.excludedScheinIds || [],
                    scheinId = invoiceEntrySchein && invoiceEntrySchein._id,
                    patientId = invoiceEntrySchein && invoiceEntrySchein.patient && invoiceEntrySchein.patient._id;

                return !excludedScheinIds.includes( scheinId ) && !excludedPatientIds.includes( patientId );
            },

            /**
             *  Unset invoiceLogId in activities in chunks to large memory consumption
             *
             *  @param  {Object} user               REST user or equivalent
             *  @param  {String} invoiceLogId       ID of curently processed invoice entry to which activity is belong
             *  @param  {Boolean} forDelete         additionally set activity status = VALID for further deleting
             *  @param  {Boolean} onlyApproved
             *  @return {Object}                    Bluebird Promise
             */
            cleanMarkedActivities: async (user, invoiceLogId, forDelete, onlyApproved) => {
                Y.log( 'Entering Y.doccirrus.invoicelogutils.cleanMarkedActivities', 'info', NAME );
                    const
                        data = {$unset: {invoiceLogId: 1, invoiceLogType: 1}},
                        UPDATE_LIMIT = 1000,
                        hasInstock = Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inStock' ),
                        isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

                    let updated = 0,
                        query = {
                            invoiceLogId: invoiceLogId
                        };

                    if(onlyApproved){
                        query.status = {$in: ['APPROVED', 'VALID']};
                    }

                    if( forDelete ) {
                        data.$set = {status: 'VALID'};
                        // Need this $or, otherwise all medidataRejected invoices will get status VALID
                        query.$or = [
                            {medidataRejected: {$exists: false}},
                            {medidataRejected: false}
                        ];
                    }
                    if( !user || !invoiceLogId ) {
                        throw( new Error( 'missing arguments' ) );
                    }

                    //loop while exists activity to update
                    while( true ) { //eslint-disable-line no-constant-condition
                        let medicationsToDispense = [];
                        let [error, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'get',
                                query,
                                options: {
                                    limit: UPDATE_LIMIT,
                                    select: {_id: 1, actType: 1, isDispensed: 1, status: 1, code: 1, patientName: 1, content: 1}
                                }
                            } )
                        );
                        if( error ) {
                            Y.log( `cleanMarkedActivities: Error on getting activities: ${error.message}`, 'error', NAME );
                            throw( error );
                        }

                        updated += result.length;
                        if( !result.length ) {
                            break;
                        }

                        if( forDelete && hasInstock && isSwiss ) {
                            medicationsToDispense = result.filter( el => el.actType === 'MEDICATION' && el.isDispensed );
                        }

                        let activityIds = result.map( el => el._id.toString() );
                        [error] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                query: {
                                    _id: {$in: activityIds}
                                },
                                options: {
                                    multi: true
                                },
                                data
                            } )
                        );
                        if( error ) {
                            Y.log( `cleanMarkedActivities: Error on updating activities: ${error.message}`, 'error', NAME );
                            throw(error);
                        }
                        for (let activityId of activityIds){
                            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                            if( data.$set ){
                                let activity = result.find( el => el._id.toString() === activityId );
                                let [ err ] = await formatPromiseResult(
                                    Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, { status: activity.status }, { status: 'VALID' }, '', activity )
                                );
                                if( err ){
                                    Y.log( `cleanMarkedActivities: error creating audit entry for ${activityId} : ${err.stack || err}`, 'warn', NAME );
                                }
                            }
                        }
                        if( medicationsToDispense && medicationsToDispense.length ) {
                            let medicationsToDispenseIds = medicationsToDispense.map( el => el._id );
                            [error] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'activity',
                                    action: 'update',
                                    query: {
                                        _id: {$in: medicationsToDispenseIds}
                                    },
                                    options: {
                                        multi: true
                                    },
                                    data: {$set: {status: 'DISPENSED'}}
                                } )
                            );
                            if( error ) {
                                Y.log( `cleanMarkedActivities: Error on dispensing medicatons after removing invoicelog: ${error.message}`, 'error', NAME );
                                throw(error);
                            }
                            for (let activityId of medicationsToDispenseIds){
                                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
                                let activity = medicationsToDispense.find( el => el._id.toString() === activityId );
                                let [ err ] = await formatPromiseResult(
                                    Y.doccirrus.invoiceserverutils.auditChangeValues( user, activityId, {status: activity && activity.status}, {status: 'DISPENSED'}, '', activity )
                                );
                                if( err ){
                                    Y.log( `cleanMarkedActivities: error creating audit entry for medication ${activityId} : ${err.stack || err}`, 'warn', NAME );
                                }
                            }
                        }
                    }
                    Y.log( 'Exiting Y.doccirrus.invoicelogutils.cleanMarkedActivities', 'info', NAME );
                    return {nModified: updated};
            },

            /**
             *  Delete all entries in an invoice log
             *
             *  @param  {Object} user                REST user or equivalent
             *  @param  {String} invoiceLogId        May refer to several collections: pvslog, kbvlog? (CHECKME)
             *  @param  {Boolean} forDelete
             *  @return {Object}                     Promise
             */

            cleanInvoiceEntries: function( user, invoiceLogId, forDelete ) {
                if( !user || !invoiceLogId ) {
                    return Prom.reject( new Error( 'missing arguments' ) );
                }
                invoiceLogId = invoiceLogId.toString();

                return runDb( {
                    user: user,
                    action: 'delete',
                    query: {
                        invoiceLogId: invoiceLogId
                    },
                    options: {
                        override: true, // needed to override MAX_DELETE,
                        fast: true
                    },
                    model: 'invoiceentry'
                } ).then( function() {
                    return Y.doccirrus.invoicelogutils.cleanMarkedActivities( user, invoiceLogId, forDelete );
                } );
            },

            getInvoiceActivities: function( user, log, cb ) {
                let activityIds = [];
                Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    user: user,
                    invoiceLogId: log._id.toString(),
                    excludedPatientIds: log.excludedPatientIds,
                    excludedScheinIds: log.excludedScheinIds,
                    iterator: function( invoiceEntry ) {
                        var schein;
                        if( 'schein' === invoiceEntry.type ) {
                            schein = invoiceEntry.data;

                            schein.treatments.forEach( function( treatment ) {
                                if( !treatment._id || treatment.__additional ) {
                                    return;
                                }
                                activityIds.push( treatment._id );
                            } );
                            activityIds.push( schein._id );
                        }
                    }
                } ).then( () => {
                    cb( null, activityIds );
                } ).catch( err => cb( err ) );
            },

            validateInvoicesForActivities: function( user, activityIds, callback ) {
                if( !Array.isArray( activityIds ) ) {
                    activityIds = [activityIds];
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        actType: "INVOICE",
                        activities: {$in: activityIds}
                    },
                    options: {lean: true, select: {_id: 1}, hint: {activities:1}},
                    callback: ( err, results ) => {
                        if( err ) {
                            Y.log( 'Error getting invoices:' + err.message, 'error', NAME );
                        }
                        let invoices = [];
                        results.forEach( invoice => invoices.push( invoice._id ) );
                        if( !invoices.length ) {
                            return callback( err );
                        }

                        //validate related invoices on change
                        Y.doccirrus.api.activity.validateInvoices( {
                            'user': user,
                            'originalParams': {invoiceIds: invoices},
                            'callback': callback
                        } );
                    }
                } );
            },

            billInvoiceLog: function( user, log, isKBVLog ) {
                var billByIds = Y.doccirrus.api.activity.billByIds,
                    billPrivatescheinIds = [];

                function isScheinCompletePromisified( scheinId ) {
                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.activity.isScheinComplete( {
                            user,
                            originalParams: {
                                scheinId
                            },
                            callback: ( err, scheinIsComplete ) => {
                                if( err ) {
                                    reject( err );
                                } else {
                                    resolve( scheinIsComplete );
                                }
                            }
                        } );
                    } );
                }

                return Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    user: user,
                    invoiceLogId: log._id.toString(),
                    excludedPatientIds: log.excludedPatientIds,
                    excludedScheinIds: log.excludedScheinIds,
                    iterator: function( invoiceEntry ) {
                        var schein, activityIds = [];
                        if( 'schein' === invoiceEntry.type ) {
                            schein = invoiceEntry.data;

                            schein.treatments.forEach( function( treatment ) {
                                if( !treatment._id || treatment.__additional ) {
                                    return;
                                }
                                activityIds.push( treatment._id );
                            } );

                            // we bill PRIVATE scheins if all treatments are billed

                            if( isKBVLog ) {
                                activityIds.push( schein._id );
                            }

                            return billByIds( user, activityIds ).then( () => {
                                if( isKBVLog ) {
                                    return;
                                }
                                return isScheinCompletePromisified( schein._id ).then( isScheinComplete => {
                                    if( isScheinComplete ) {
                                        billPrivatescheinIds.push( schein._id.toString() );
                                    }
                                } );
                            } );
                        }
                    }
                } ).then( () => {
                    if( !isKBVLog && billPrivatescheinIds.length ) {
                        return billByIds( user, billPrivatescheinIds );
                    }
                } );
            },

            removeInvoiceLog: function( args ) {
                Y.log( 'Entering Y.doccirrus.invoicelogutils.removeInvoiceLog', 'info', NAME) ;
                const
                    user = args.user,
                    model = args.model,
                    MODEL_TO_ENTITY_MAP = {
                        kbvlog:  'GKV-Abrechnung',
                        tarmedlog:  'KVG-Abrechnung',
                        pvslog:  'PVS-Abrechnung',
                        cashlog:  'Rechnungen'
                    },
                    invoiceLogId = args.invoiceLogId,
                    testFn = args.testFn,
                    notRemovableError = Y.doccirrus.errors.rest( '1004', {$entity: MODEL_TO_ENTITY_MAP[model]} );

                return Prom.resolve( invoiceLogId ).then( logId => {
                    if( !logId || !model || 'function' !== typeof testFn ) {
                        throw notRemovableError;
                    }
                    return runDb( {
                        user: user,
                        model: model,
                        query: {
                            _id: invoiceLogId
                        },
                        options: {
                            limit: 1,
                            lean: true,
                            select: {
                                status: 1,
                                totalItems: 1
                            }
                        }
                    } );
                } ).get( 0 ).then( log => {
                    if( !log ) {
                        throw notRemovableError;
                    }

                    let removable = testFn( log );

                    if( !removable ) {
                        throw notRemovableError;
                    }

                    Y.log( 'Exiting Y.doccirrus.invoicelogutils.removeInvoiceLog', 'info', NAME );
                    return runDb( {
                        user: user,
                        model: model,
                        action: 'delete',
                        query: {
                            _id: invoiceLogId
                        }
                    } );

                } );
            },

            getInvoiceModelName,

            collectIdsToApprove,

            resetInvoiceLogContent

        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcgridfs',
            'dcregexp'
        ]
    }
);

