/**
 * User: MD
 * Date: 13/12/18 12:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'complexprescription-api', function( Y, NAME ) {
        /**
         * @module complexprescription-api
         */

        const
            {formatPromiseResult} = require('dc-core').utils,
            ObjectId = require('mongoose').Types.ObjectId,
            moment = require( 'moment' );

        /**
         * @method checkHomeCatalog
         * @private
         *
         * search in home catalog : phPZN = codePZN, assId = codeHMV, catalogShort = MMI or HMV
         *
         * @param {Object} user
         * @param {String} codePZN
         * @param {String} codeHMV
         * @param {String} catalogShort
         *
         * @returns {Promise}
         */
        async function checkHomeCatalog( user, codePZN, codeHMV, catalogShort ) {
            let queryOr = [];
            if ( codePZN ) {
                queryOr = [ ...queryOr, { phPZN: codePZN } ];
            }
            if ( codeHMV ) {
                queryOr = [ ...queryOr, { assId: codeHMV } ];
            }
            if ( queryOr.length === 0 ) {
                throw new Error( Y.doccirrus.errorTable.getMessage( { code: 'complexprescription_01' } ) );
            }
            let query = {
                $or: queryOr,
                catalogShort: catalogShort
            };

            let [err, catalogs] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalogusage',
                    query
                } )
            );
            if( err ){
                Y.log( `checkHousCatalog: Error on getting home ${catalogShort} catalog: ${err.stack||err}`, 'error', NAME );
                throw( err );
            }

            return catalogs;
        }

        /**
         * @method addNewMedication
         * @private
         *
         * search in home catalog : phPZN = codePZN and catalogShort = MMI'
         *
         * @param {Object} user
         * @param {Object} data - prepared data for activity creation
         * @param {Object} request - top level of request to get general attributes
         *
         * @returns {Promise}
         */
        async function addNewMedication( user, data, request ) {
            let local_data = JSON.parse( JSON.stringify( data ) );

            if( !local_data.phPZN ) {
                local_data.catalog = false;
                local_data.modifyHomeCat = true;
                local_data.phIngr = [{ "code" : "-", "name" : "-" } ];
                local_data.catalogShort = 'MED';
                local_data.catalogRef = 'MED';

                ///  SHORT-CIRCUIT END HERE. REZEPTUR
                return local_data;
            }

            let [err, MMIdata] = await formatPromiseResult(
                new Promise( (resolve, reject) => {
                    Y.doccirrus.api.catalogusage.getMMIActualData( {
                        user,
                        query: {
                            pzn: local_data.phPZN,
                            bsnr: request.bsnr || '',
                            lanr: request.lanr || ''
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } )
            );
            if( err || !MMIdata || !MMIdata.title ) {
                //MMI service is down or code not found - check GHD catalog

                let [err, GHDresult] = await formatPromiseResult(
                    checkHomeCatalog( user, local_data.phPZN, local_data.codeHMV, 'MMI' )
                );

                if(err) {
                    Y.log( `addNewMedication: Error MMI code search: ${err.stack||err}`, 'warn', NAME );
                }
                if(GHDresult.length) {
                    //code found lets process GHD code instead of MMI

                    local_data.phPZN = GHDresult[0].phPZN || local_data.codePZN;
                    local_data.phIngr = [{ "code" : "-", "name" : "-" } ];
                    local_data.phNLabel = GHDresult[0].phNLabel;
                    local_data.catalogShort = 'MMI';
                    local_data.catalogRef = 'MMI';
                } else {
                    //new catalogusage
                    local_data.code = local_data.phPZN;
                    local_data.catalog = true;
                    local_data.modifyHomeCat = true;
                    local_data.phIngr = [{ "code" : "-", "name" : "-" } ];
                    local_data.catalogShort = 'MMI';
                    local_data.catalogRef = 'MMI';
                }

            } else {
                Y.log( `addNewMedication: MMI code found: ${JSON.stringify( MMIdata )}`, 'debug', NAME );
                //populate data from MMI catalog to activity
                local_data = {...local_data, ...MMIdata};
                local_data.catalogShort = 'MMI';
                local_data.catalogRef = 'MMI';
                local_data.userContent = MMIdata.content;
            }

            return local_data;
        }

        /**
         * @method addNewAssistive
         * @private
         *
         * search in home catalog : assId = codeHMV and catalogShort = 'HMV'
         *
         * @param {Object} user
         * @param {Object} data - prepared data for activity creation
         * @param {Object} request - top level of request to get general attributes
         *
         * @returns {Promise}
         */
        async function addNewAssistive( user, data, request ) {
            let localData = JSON.parse( JSON.stringify( data ) );

            let [ err, GHBresult ] = await formatPromiseResult(
                checkHomeCatalog( user, localData.codePZN, localData.codeHMV, 'HMV' )
            );

            if ( err ) {
                Y.log( `addNewAssistive: Error checking home catalog ${err.stack || err}`, 'warn', NAME );
                throw( err );
            }

            if ( GHBresult.length ) {
                let result = GHBresult[ 0 ];
                localData.assId = result.hmvNo || localData.codeHMV;
                localData.code = request.pzn || localData.codePZN;
                localData.catalogShort = 'HMV';
                localData.catalogRef = 'HMV';
            } else {
                localData.assId = localData.codeHMV;
                localData.code = localData.codePZN;
                localData.catalog = true;
                localData.modifyHomeCat = true;
                localData.catalogShort = 'HMV';
                localData.catalogRef = 'HMV';

                let [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'catalogusage',
                        action: 'upsert',
                        query: {
                            $or: [ { assId: localData.codeHMV } ],
                            catalogShort: localData.catalogShort
                        },
                        options: { omitQueryId: true },
                        data: {
                            assId: localData.codeHMV,
                            code: localData.codePZN,
                            catalogShort: localData.catalogShort,
                            catalogRef: localData.catalogRef,
                            skipcheck_: true
                        }
                    } )
                );
                if( err ){
                    Y.log( `addNewAssistive: Error on writing in home catalog: ${err.stack||err}`, 'error', NAME );
                    throw( err );
                }
            }
            return localData;
        }

        /**
         * @method activityData
         * @private
         *
         * populate common activity data
         *
         * @param {String} employeeId
         * @param {String} locationId
         * @param {String} patientId
         * @param {String} caseFolderId
         * @param {String} actType
         * @param {String} prescriptionDate
         *
         * @returns {Object}
         */
        function activityData( {employeeId, locationId, patientId, caseFolderId, actType, prescriptionDate} ) {
            let data = {
                employeeId,
                locationId,
                patientId,
                caseFolderId,
                actType,
                timestamp: (new Date()).toISOString(),
                status: "VALID"
            };

            if (prescriptionDate) {
                let pd = moment(prescriptionDate);
                if (pd <= moment().endOf('day')) {
                    data.timestamp = pd.hour(0).minute(5).toISOString();
                }
            }

            return data;
        }

        /**
         * @method preparePayload
         * @private
         *
         * validate IDs in requested system, prepare valid payload for activitytransfer
         *
         * @param {Object} user
         * @param {Object} requestData
         *
         * @returns {Object} - contains activity Array and patient Object
         */
        async function preparePayload( user, requestData ){
            let
                warnings = [],
                activities = [],
                medicationIds = [],
                assistiveIds = [],
                patient,
                patientFound = false,
                err,
                cnt;

            //validate provided request IDs
            if (requestData.locationId) {
                [err, cnt] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'count',
                        query: {
                            _id: requestData.locationId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting location ${requestData.locationId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === cnt ) {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_03',
                            data: { $locationId: requestData.locationId }
                        }
                    )];
                    delete requestData.locationId;
                }
            }

            if(!requestData.locationId && requestData.bsnr){
                let locations;
                [err, locations] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'get',
                        query: {
                            commercialNo: requestData.bsnr
                        },
                        options: { select: { _id: 1 } }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting location by bsnr ${requestData.bsnr}: ${err.stack || err}`, 'error', NAME );
                }
                if( locations && locations.length ) {
                    requestData.locationId = locations[0]._id.toString();
                } else {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_04',
                            data: { $bsnr: requestData.bsnr }
                        }
                    )];
                }
            }

            if (requestData.employeeId){
                let [ countErr, employeeCount] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        action: 'count',
                        query: {
                            _id: requestData.employeeId
                        }
                    } )
                );
                if( countErr ) {
                    Y.log( `preparePayload: Error on getting employee ${requestData.employeeId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === employeeCount ) {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_05',
                            data: { $employeeId: requestData.employeeId }
                        }
                    )];
                    delete requestData.employeeId;
                }
            }

            if(!requestData.employeeId && requestData.lanr){
                let employees;
                [err, employees] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            officialNo: requestData.lanr
                        },
                        options: { select: { _id: 1 } }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting employee by lanr ${requestData.lanr}: ${err.stack || err}`, 'error', NAME );
                }
                if( employees && employees.length ) {
                    requestData.employeeId = employees[0]._id.toString();
                } else {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_06',
                            data: { $lanr: requestData.lanr }
                        }
                    )];
                }
            }

            if (requestData.patientId){
                let patients;
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: requestData.patientId
                        },
                        options: { select: { firstname: 1, lastname: 1, dob: 1, gender: 1} }
                    } )
                );

                if( err ) {
                    Y.log( `preparePayload: Error on getting patient ${requestData.patientId}: ${err.stack || err}`, 'error', NAME );
                }
                if( !patients || !patients.length ) {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_07',
                            data: { $patientId: requestData.patientId }
                        }
                    )];
                    patient = {_id: requestData.patientId, firstname: 'firstname', lastname: 'lastname', dob: '2000-01-01', gender: 'UNKNOWN' };
                } else {
                    patientFound = true;
                    patient = patients[0];
                }
            }

            if (requestData.caseFolderId){
                [err, cnt] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'count',
                        query: {
                            _id: requestData.caseFolderId,
                            patientId: requestData.patientId
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting casefolder ${requestData.caseFolderId}: ${err.stack || err}`, 'error', NAME );
                }
                if( 0 === cnt ) {
                    warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage(
                        {
                            code: 'complexprescription_08',
                            data: { $caseFolderId: requestData.caseFolderId }
                        }
                    )];
                    delete requestData.caseFolderId;
                }
            }

            //if required for activity IDs not valid or not provided - populate with default values
            if (!requestData.locationId){
                //use default location
                warnings = [ ...warnings, Y.doccirrus.errorTable.getMessage( { code: 'complexprescription_10' } ) ];
                requestData.locationId = Y.doccirrus.schemas.location.getMainLocationId();
            }

            if (!requestData.employeeId) {
                //use one Phisician from selected location
                let employees;
                [err, employees] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        query: {
                            type: 'PHYSICIAN',
                            status: 'ACTIVE',
                            'locations._id': requestData.locationId
                        },
                        options: {
                            fields: {_id: 1},
                            limit: 1
                        }
                    } )
                );
                if( err ) {
                    Y.log( `preparePayload: Error on getting employee for location ${requestData.locationId}: ${err.stack || err}`, 'error', NAME );
                }
                requestData.employeeId = employees && employees.length && employees[0]._id;
                if ( !requestData.employeeId ) {
                    throw new Error(
                        Y.doccirrus.errorTable.getMessage(
                            {
                                code: 'complexprescription_09',
                                data: { $locationId: requestData.locationId }
                            }
                        )
                    );
                }
            }

            //process requested activities
            for( let activityRow of requestData.dispatchActivities || []) {
                switch( activityRow.actType ) {
                    case 'PRIVPRESCR':
                    case 'PRESCRBTM':
                    case 'PRESCRG':
                    case 'PRESCRT':
                    case 'PUBPRESCR':
                    case 'LONGPRESCR': {
                        //populate MEDICATIONs
                        for( let el of activityRow.activities || []){
                            let data = activityData( {...requestData, prescriptionDate: activityRow.prescriptionDate } );
                            data.actType = el.actType || 'MEDICATION';
                            data.phPZN = el.codePZN;
                            data.phNLabel = el.note;

                            if( el.dose ) {
                                data.phDosisType = "TEXT";
                                data.dosis = el.dose;
                            } else {
                                data.dosis = el.dose;
                            }

                            for(let i = 0; i < (el.quantity || 1); i++){
                                let [err, medication] = await formatPromiseResult(
                                    addNewMedication( user, data, requestData )
                                );
                                if( err ){
                                    Y.log( `checkGHDCatalog: Error on creating medication ${i}: ${err.stack||err}`, 'error', NAME );
                                    throw( err );
                                }
                                medication._id = new ObjectId();
                                medicationIds.push( medication._id );
                                activities.push( medication );
                            }
                        }

                        //populate PUBPRESCR
                        let prescription = activityData( {...requestData, prescriptionDate: activityRow.prescriptionDate } );
                        prescription.actType = prescription.actType || activityRow.actType;
                        prescription.activities = medicationIds;
                        prescription.careComment = requestData.comment;
                        prescription.requestId = requestData.requestId;
                        prescription.timestampmoment = moment( prescription.timestamp ).add(10,'ms').toISOString();
                        prescription._id = new ObjectId();
                        activities.push( prescription );

                        break;
                    }
                    case 'PRESASSISTIVE': {
                        let assistiveCount = 0;
                        for ( let el of activityRow.activities || [] ) {
                            let data = activityData( {...requestData, prescriptionDate: activityRow.prescriptionDate } );
                            data.actType = el.actType || 'ASSISTIVE';
                            data.codePZN = el.codePZN;
                            data.code = el.codePZN;
                            data.codeHMV = el.codeHMV;
                            data.assDescription = el.note;
                            data.assPrescPeriod = el.prescPeriod;
                            data.assDose = el.dose;

                            for ( let i = 0; i < ( el.quantity || 1 ); i++ ) {
                                let [ err, assistive ] = await formatPromiseResult(
                                    addNewAssistive( user, data, requestData )
                                );
                                if ( err ) {
                                    Y.log( `checkGHDCatalog: Error on creating assistive ${i}: ${err.stack||err}`, 'error', NAME );
                                    throw( err );
                                }
                                assistive._id = new ObjectId();
                                if ( data.actType === 'ASSISTIVE' ) {
                                    assistiveCount++;
                                }
                                assistiveIds.push( assistive._id );
                                activities.push( assistive );
                            }
                        }
                        // populate PRESASSISTIVE
                        if ( assistiveCount === 0 ) {
                            throw new Error( Y.doccirrus.errorTable.getMessage( { code: 'complexprescription_02' } ) );
                        }
                        let presassistive = activityData( {...requestData, prescriptionDate: activityRow.prescriptionDate } );
                        presassistive.actType = 'PRESASSISTIVE';
                        presassistive.status = 'DISPATCHED';
                        presassistive.activities = assistiveIds;
                        presassistive.careComment = requestData.comment;
                        presassistive.timestampmoment = moment( presassistive.timestamp ).add(10,'ms').toISOString();
                        presassistive._id = new ObjectId();
                        activities.push( presassistive );
                        break;
                    }
                    default:
                        throw 'Unknown Activity type';
                }
            }

            return [{
                activities,
                patient,
                patientFound
            }, warnings];
        }


        /**
         * @method post
         * @public
         *
         * validate request data, prepare valid payload and do internal activitytransfer api call
         * as result of activiyu transfer can be either :
         * new record in patienttransfer with ability to choose
         *  - patient (one time)
         *  - casefolder ( each time )
         *  or automatically crated prescription and medications if request contains already existed patientId and caseFolderId
         *
         * @param {Object} user
         * @param {Object} data - payload
         * @param {Function} callback
         *
         * @returns {Function} callback - returns generated requestId (stored in created PUBPRESCR|MEDICATION in restRequestId )
         */
        async function post( {user, data, callback} ) {
            Y.log('Entering Y.doccirrus.api.complexprescription.post', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.complexprescription.post');
            }
            if( !data || !data.patientId || !data.dispatchActivities || !data.dispatchActivities.length){
                return callback( Y.doccirrus.errors.rest( 400, 'insufficient request parameters' ) );
            }

            data.requestId = new ObjectId();
            let [err, results] = await formatPromiseResult(
                preparePayload( user, data )
            );

            if( err ){
                Y.log( `POST: Error on preparing data: ${err.stack||err}`, 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 400, err.message ));
            }
            let [ payload, warnings ] = results;

            Y.doccirrus.api.activityTransfer.receive({
                user,
                data: { payload: JSON.stringify( {payload: {
                            ...payload,
                            requestId: data.requestId,
                            dcCustomerNo: 'rest2',
                            commercialNo: 'rest2',
                            coname: 'rest2',
                            doctorName: 'rest2',
                            automaticTransfer: !!(payload.patientFound && data.caseFolderId),
                            caseFolderId: data.caseFolderId
                    } } )
                },
                callback: ( err, result ) => {
                    callback( err, [ {...(result || {}), requestId: data.requestId} ], warnings );
                }
            });
        }

        /**
         * @class complexprescription
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).complexprescription = {
            name: NAME,
            post
        };
    },
    '0.0.1', {
        requires: []
    }
);