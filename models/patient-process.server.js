/**
 * User: rrrw
 * Date: 28/3/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

// add this to the DBLayer TODO MOJ-805

YUI.add( 'patient-process', function( Y, NAME ) {

        const
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager,
            i18n = Y.doccirrus.i18n,
            ASV_TITLE = i18n( 'patient-process.text.ASV_TITLE' ),
            async = require( 'async' ),
            _ = require( 'lodash' ),
            util = require( 'util' ),
            { formatPromiseResult, promisifyArgsCallback } = require( 'dc-core' ).utils;

        // MOJ-14319: [OK] [CARDREAD]
        function publicMainInsurance( patient ) {
            return Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' );
        }

        /**
         * if the patient has already a number then just check if it is valid, otherwise assign a number
         * a numerical patientNo is valid if it is larger that assigned numbers
         * a string patientNo is valid if it is unique
         * IMPORTANT: it should be the last preprocess because the patient counter (in sysnum) may increase by 1
         *
         * @param user
         * @param patient
         * @param callback
         */

        async function assignPatientNo( user, patient, callback ) {

            const
                updatePatientCounterP = util.promisify( Y.doccirrus.schemas.sysnum.updatePatientCounter ),
                checkPatientNoP = promisifyArgsCallback( Y.doccirrus.api.patient.checkPatientNo );

            let
                err, nextNumber;

            if( patient.patientNo ) {

                //  Have a patient number check if valid if it has ben changed
                if( !patient.isModified( 'patientNo' ) ) {
                    return callback( null, patient );
                }

                [ err ] = await formatPromiseResult(
                    checkPatientNoP( {
                            user,
                            query: {
                                patientNo: patient.patientNo,
                                patientId: patient._id
                            }
                        }
                    )
                );

                if( err ) {
                    Y.log( `assignPatientNo: Could not validate change to patient number ${patient.patientNo}: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                patient.patientNo = patient.patientNo + '';
                patient.patientNumber = undefined; // this field is meant only for system generated numbers
                return callback( null, patient );

            } else {

                //  No patient number, assign the next one

                [ err, nextNumber ] = await formatPromiseResult( Y.doccirrus.api.patient.getNextPatientNumber( user, 0 ) );

                if( err ) {
                    Y.log( `error getting next number for patient: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                [ err ] = await formatPromiseResult( updatePatientCounterP( user, nextNumber + 1 ) );

                if( err ) {
                    Y.log( `error updating patient number sysnum: ${err.stack||err}`, 'error', NAME );
                    return callback( err );
                }

                Y.log( `Assigning new patient number to new patient: ${nextNumber}`, 'info', NAME );
                patient.patientNumber = nextNumber;
                patient.patientNo = nextNumber + ''; // for display
                return callback( null, patient );

            }
        }

        /**
         * The DC Patient data schema definition
         *
         * @module DCPatientProcess
         */

        function copyPatient( user, result, callback ) {
            // have to start using this fast promise library
            var
                copy,
                Promise = require( "bluebird" ),
                l = (result && result.length) || 0,
                isNew = result.wasNew;

            function finalCb( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, result );
            }

            function postCopy( data, callback ) {
                var timestamp;
                var cardSwipe = Y.doccirrus.utils.getPublicCardSwipe( data );

                function patientVersionSaved( err, data ) {
                    result._patientVersionId = data && data[0];
                    callback( err, data );
                }

                if( isNew && cardSwipe ) {
                    timestamp = cardSwipe;
                } else {
                    timestamp = Date.now();
                }

                data.patientId = data._id;
                delete data._id;
                data.timestamp = timestamp;
                data.skipcheck_ = true;
                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    action: 'post',
                    model: 'patientversion',
                    data: data
                }, patientVersionSaved );
            }

            if( !l && result ) {
                // single object
                if( result.toObject ) {
                    postCopy( result.toObject(), finalCb );
                }
                else {
                    postCopy( _.cloneDeep( result ), finalCb );
                }
            } else {
                //WARN: not very well tested this code -- works for array of length zero.
                //
                // patientversion model has a virtual timestamp field, the _id.
                //
                (function loop( sum, stop ) {
                    if( sum < stop ) {
                        return new Promise( function( resolve, reject ) {
                            //mongooselean.toObject
                            copy = result[sum].toObject ? result[sum].toObject() : _.cloneDeep(result[sum]);
                            sum++;
                            postCopy( copy, function( err, result ) {
                                if( err ) {
                                    reject();
                                }
                                else {
                                    resolve( result );
                                }
                            } );

                            return loop( sum, stop );
                        } );
                    } else {
                        // done
                        return new Promise( function( resolve ) {
                            resolve();
                        } );
                    }
                })( 0, l ).then( function() {
                    finalCb();
                } );
            }
            // write result to the patientversion  model

        }

        function checkPatientOrder( user, patient, callback ) {
            var actualPatient,
                insurance = publicMainInsurance( patient ); // MOJ-14319: [OK] [CARDREAD]

            function discardSave( err/*, data*/ ) {
                if( err ) {
                    Y.log( 'checkPatientOrder error: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                callback( Y.doccirrus.errors.rest( 4001, actualPatient || {}, true ) );
            }

            function isNewVersionCb( err, result ) {
                if( err ) {
                    Y.log( 'checkPatientOrdecr error: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                if( result && result.isNewestVersion ) {
                    Y.log( "checkPatientOrder patient is newest version", 'info', NAME );
                    callback( null, patient );
                    return;
                }

                Y.log( "checkPatientOrder patient is old version: save in patientversions", 'info', NAME );

                patient = patient.toObject ? patient.toObject() : patient;
                patient.patientId = patient._id;
                delete patient._id;
                patient.timestamp = insurance.cardSwipe;
                patient.skipcheck_ = true;

                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    action: 'post',
                    model: 'patientversion',
                    data: patient
                }, discardSave );

            }

            function currentPatientCb( err, currentPatient ) {
                var currentPatientInsurance,
                    moment = require( 'moment' );
                if( err ) {
                    Y.log( 'checkPatientOrder err:' + JSON.stringify( err ), 'info', NAME );
                }
                currentPatientInsurance = currentPatient && currentPatient[0] && publicMainInsurance( currentPatient[0] ); // MOJ-14319: [OK] [CARDREAD]
                actualPatient = currentPatient && currentPatient[0];

                if( currentPatientInsurance && currentPatientInsurance.cardSwipe && !moment( currentPatientInsurance.cardSwipe ).isSame( insurance.cardSwipe ) ) {
                    // get patient version from cardSwipe to newest
                    Y.doccirrus.api.patient.isNewestVersion( {
                        migrate: true,
                        user: user,
                        originalParams: {
                            patientId: patient._id.toString(),
                            timestamp: insurance.cardSwipe
                        },
                        callback: isNewVersionCb
                    } );

                } else {
                    if( !currentPatient || !currentPatient[0] ) {
                        patient.wasNew = true;
                    }
                    return callback( null, patient );
                }
            }

            // check if their is a patientversion, that is newer than cardSwipe
            if( insurance && 'PUBLIC' === insurance.type && insurance.cardSwipe ) { // MOJ-14319: [OK] [CARDREAD]

                // get current patient
                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    model: 'patient',
                    query: { _id: patient._id.toString() }
                }, currentPatientCb );

            } else {
                return callback( null, patient );
            }
        }

        /**
         * revise the readonly filtering
         * if new data has newer cardSwipe then overwrite let all fields be overwritten.
         * @param user
         * @param doc mongoose document
         * @param callback
         */
        function readOnlyCheck( user, doc, callback ) {
            var
                moment = require( 'moment' ),
                insurance = doc.insuranceStatus && publicMainInsurance( doc ); // MOJ-14319: [OK] [CARDREAD]
            if( doc.isNew ) {
                Y.log( 'ignore readonly fields for patient', 'debug', NAME );
                doc.ignoreReadOnly_ = true;
                return callback( null, doc );

            } else if( insurance && insurance.cardSwipe ) {
                Y.doccirrus.mongodb.runDb( {
                    migrate: true,
                    user: user,
                    action: 'get',
                    model: 'patient',
                    query: { _id: doc._id },
                    callback: function( err, result ) {
                        var resultInsurance;
                        if( err || !result || !result[0] ) {
                            callback( err || 'could not retrieve the patient' );
                            return;
                        }
                        resultInsurance = publicMainInsurance( result[0] );
                        if( resultInsurance && resultInsurance.cardSwipe ) {
                            if( moment( insurance.cardSwipe ).isAfter( moment( resultInsurance.cardSwipe ) ) ) {
                                doc.ignoreReadOnly_ = true;
                            }
                        }

                        if( doc.ignoreReadOnly_ ) {
                            Y.log( 'ignore readonly fields for patient PUT', 'debug', NAME );
                        } else {
                            Y.log( 'readonly checking being enforced for patient PUT', 'debug', NAME );
                        }
                        callback( null, doc );
                    }
                } );

            } else {
                doc.ignoreReadOnly_ = true;
                return callback( null, doc );
            }
        }

        function checkPublicInsuranceStatus( user, patient, callback ) {
            // MOJ-14319: [OK] [CARDREAD]
            var publicInsurance = patient && Y.doccirrus.schemas.patient.getInsurancesByType( patient, 'PUBLIC' )[0];
            if( !publicInsurance ) {
                return callback( null, patient );
            }

            if( Y.doccirrus.auth.isMVPRC() ) {
                Y.log( 'MVPRC => skipping automatic addSchein' );
                return callback( null, patient );
            }

            function scheinCreated() {
                callback( null, patient );
            }

            function lastPatientCb( err, lastPatient ) {
                var lastPublicInsurance, statusChange, insuranceChange, persGroupChange;

                if( err || !lastPatient || !lastPatient[0] ) {
                    Y.log( 'Error finding last patient ' + (err || 'patient not found') );
                    callback( null, patient );
                    return;
                }
                // use the next to last patient version if there is one
                lastPatient = lastPatient[1] || lastPatient[0];

                // MOJ-14319: [OK] [CARDREAD]
                lastPublicInsurance = lastPatient && Y.doccirrus.schemas.patient.getInsurancesByType( lastPatient, 'PUBLIC' )[0];

                if( !lastPublicInsurance ) {
                    // skip non gkv patients
                    callback( null, patient );
                    return;
                }

                // new vknr - ktab combi?
                insuranceChange = !publicInsurance.fused &&
                                  (publicInsurance.insuranceGrpId !== lastPublicInsurance.insuranceGrpId ||
                                   publicInsurance.costCarrierBillingSection !== lastPublicInsurance.costCarrierBillingSection);
                statusChange = publicInsurance.insuranceKind !== lastPublicInsurance.insuranceKind;
                persGroupChange = publicInsurance.persGroup !== lastPublicInsurance.persGroup;

                if( insuranceChange || statusChange || persGroupChange ) {
                    Y.doccirrus.api.activity.addSchein0101( user, patient, scheinCreated );
                    Y.doccirrus.kbvutilityutils.invalidateKbvUtilityAgreements( user, lastPatient, patient._id.toString() );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'REPORT_PATIENT_INSURANCE_CHANGED',
                        msg: {
                            data: {
                                firstname: patient.firstname,
                                lastname: patient.lastname,
                                insuranceName: publicInsurance.insuranceName
                            }
                        }
                    } );
                } else {
                    return callback( null, patient );
                }
            }

            // get last patient version
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patientversion',
                query: { patientId: patient._id.toString() },
                options: {
                    limit: 2,
                    sort: {
                        timestamp: -1
                    }
                },
                callback: lastPatientCb
            } );

        }

        function addLocalPacticeId( user, patient, callback ) {
            if( patient.localPracticeId ) {
                return callback( null, patient );
            }
            let
                DOQUVIDE = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                isDOQUVIDE = patient && partnerIdExists( patient, DOQUVIDE ),
                doquvideObj = patient.partnerIds.filter( function( p ) {
                    return p.partnerId === DOQUVIDE;
                } );

            doquvideObj = doquvideObj && doquvideObj[0] || {};

            if( !isDOQUVIDE ) {
                return callback( null, patient );
            }

            Y.doccirrus.api.patient.getLocalPracticeId({
                user: user,
                callback: ( err, localId ) => {
                    patient.localPracticeId = localId;
                    doquvideObj.patientId = localId;
                    return callback( err, patient );
                }
            } );
        }

        function addDQSId( user, patient, callback ) {
            let
                DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                dqsObj = patient.partnerIds.filter( function( p ) {
                    return p.partnerId === DQS && false === p.isDisabled && '' === p.patientId ;
                } );

            if( !dqsObj.length ) {
                //not required or already set
                return callback( null, patient );
            }

            Y.doccirrus.api.patient.getDQSId({
                user: user,
                callback: ( err, dqsId ) => {
                    dqsObj.forEach( el => {
                        el.patientId = dqsId;
                    } );

                    return callback( err, patient );
                }
            } );
        }

        function addKBVDoBIfMissing( user, patient, callback ) {
            var mom = require( 'moment' );
            if( !patient.kbvDob && patient.dob ) {
                patient.kbvDob = mom( patient.dob ).format( "DD.MM.YYYY" );
            }
            callback( null, patient );
        }

        /**
         *  if the firstname / lastname has changed, update all the activities related to this patient silently
         * @param user
         * @param patient
         * @param callback
         */
        function updatePatientActivities( user, patient, callback ) {
            var
                originalData = patient.originalData_;
            if( !originalData || ( patient.firstname === originalData.firstname && patient.lastname === originalData.lastname && patient.talk === originalData.talk) ) {
                callback( null, patient );
                return;
            }
            Y.doccirrus.mongodb.getModel(
                user,
                'activity',
                true,
                function( err, model ) {
                    var
                        patientName;
                    if( err ) {
                        return callback( err );
                    }
                    patientName = Y.doccirrus.schemas.person.getFullName( patient.firstname, patient.lastname, patient.talk );
                    Y.log( 'updating activities for patientId: ' + patient._id, 'debug', NAME );
                    model.mongoose.collection.update( { patientId: patient._id.toString() }, { $set: { patientName: patientName } }, { multi: true }, function( err ) {
                        callback( err, patient );
                    } );
                }
            );
        }

        function checkInsurance( user, patient, callback ) {
            var
                originalData = patient.originalData_,
                deletedInsurance = [],
                insuranceTypes = [];

            function doCheck( insurance, done ) {
                if( insurance.cardSwipe ) {
                    return done( Y.doccirrus.errors.rest( 400, 'Can not remove insurance with read-only cardSwipe', true ) );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'count',
                    model: 'casefolder',
                    query: {
                        patientId: patient._id.toString(),
                        type: insurance.type
                    }
                }, function( err, count ) {
                    if( err ) {
                        return done( err );
                    }
                    if( count ) {
                        return done( Y.doccirrus.errors.rest( 4002, '', true ) );
                    }
                    done();
                } );
            }

            if( !patient.isNew && originalData && Array.isArray( patient.insuranceStatus ) && Array.isArray( originalData.insuranceStatus ) ) {
                insuranceTypes = patient.insuranceStatus.map( function( insurance ) {
                    return insurance.type && insurance.type.toString();
                } );
                originalData.insuranceStatus.forEach( function( insurance ) {
                    // if there is a new insurance id from card reader it does not have an ID yet
                    if( insurance.type && -1 === insuranceTypes.indexOf( insurance.type.toString() ) ) {
                        deletedInsurance.push( insurance );
                    }
                } );
                async.each( deletedInsurance, doCheck, function( err ) {
                    callback( err, patient );
                } );

            } else {
                return callback( null, patient );
            }
        }

        // control the "confirmed" flag
        function checkEmailchange( user, patient, callback ) {
            var
                originalData = patient.originalData_ || {},
                email = Y.doccirrus.schemas.simpleperson.getEmail( patient.communications || [] ),
                origEmail = Y.doccirrus.schemas.simpleperson.getEmail( originalData.communications || [] );

            if( !patient.isNew && email && email.confirmNeeded && origEmail && origEmail._id && email._id.toString() === origEmail._id.toString() ) {
                if( email.value.toLowerCase() === origEmail.value.toLowerCase() ) {
                    email.confirmed = origEmail.confirmed; // don't change the current value
                } else {
                    email.confirmed = false;
                }
            }
            callback( null, patient );
        }

        function checkPatientPortal( user, patient, callback ) {
            var
                params = {},
                originalData = patient.originalData_,
                runDbRequest = Boolean( originalData ),
                originalContacts = originalData && Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( originalData ),
                contacts = Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( patient ),
                accessChanged = originalData && ( Boolean( originalData.createPlanned ) !== Boolean( patient.createPlanned ) || Boolean( originalData.accessPRC ) !== Boolean( patient.accessPRC )),
                emailChanged = contacts && contacts.email && (!originalContacts || contacts.email !== originalContacts.email) && (patient.accessPRC || patient.createPlanned);
            if( ( Boolean( originalData.createPlanned ) && !Boolean( patient.createPlanned ) ) || ( Boolean( originalData.accessPRC ) && !Boolean( patient.accessPRC ) ) ) {
                params.removingRights = true;
            }
            if( runDbRequest && ( accessChanged || emailChanged) ) {
                params.createPlanned = patient.createPlanned;
                params.lastname = patient.lastname;
                params.firstname = patient.firstname;
                params.dob = patient.dob;
                params.talk = patient.talk;
                params.accessPRC = patient.accessPRC;
                params = Y.merge( params, contacts );
                params.patientId = patient._id;
                params.phone = patient.mobile;
                Y.doccirrus.api.patientreg.setPortalAuth( {
                    user: user,
                    data: params,
                    callback: function( err ) {
                        if( err ) {
                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: user.identityId,
                                event: 'message',
                                msg: {
                                    data: err.toString()
                                },
                                meta: {
                                    level: 'ERROR'
                                }
                            } );
                            return callback();
                        }
                        callback( null, patient );
                    }
                } );
            } else {
                return callback( null, patient );
            }
        }

        function checkPatientPortalForEmailDuplication( user, patient, callback ) { // eslint-disable-line no-unused-vars
            var
                originalData = patient.originalData_,
                runDbRequest = Boolean( originalData ),
                url = Y.doccirrus.auth.getPUCUrl( '/1/patientreg/:checkEmailDuplication' ),
                originalContacts = originalData && Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( originalData ),
                contacts = Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( patient ),
                accessChanged = originalData && ( Boolean( originalData.createPlanned ) !== Boolean( patient.createPlanned ) || Boolean( originalData.accessPRC ) !== Boolean( patient.accessPRC )),
                emailChanged = contacts && contacts.email && (!originalContacts || contacts.email !== originalContacts.email) && (patient.accessPRC || patient.createPlanned);
            if( patient._id && runDbRequest && ( accessChanged || emailChanged ) ) {
                Y.doccirrus.https.externalPost( url, {
                        email: contacts.email,
                        patientId: patient._id
                    }, { friend: true }, ( error, response, body ) => {
                        error = error || body && body.meta && body.meta.errors[0];
                        if( error || !body ) {
                            Y.log( 'Error: ' + ( response && response.statusCode ) + '\nError checking email duplication: ' + JSON.stringify( body ), 'error', NAME );

                            callback( ( 60001 === error.code ) ? new Y.doccirrus.commonerrors.DCError( 60001 ) :
                                ( 503 === error.code ? new Y.doccirrus.commonerrors.DCError( 'patientreg_1' ) : error ) );
                        } else {
                            callback( null, patient );
                        }
                    }
                );
            } else {
                return callback( null, patient );
            }
        }

        function needSynchroType( type, originalData, patient ){
            let
                wasDSCK = originalData && partnerIdExists( originalData, type ),
                isDSCK = patient && partnerIdExists( patient, type ),
                existDSCKbefore = originalData && partnerIdExistsAnyState( originalData, type ),
                existDSCKnow = patient && partnerIdExistsAnyState( patient, type ),
                serialDSCKbefore = originalData && getPartnerId( originalData, type ),
                serialDSCKnow = patient && getPartnerId( patient, type ),
                needSynchro = false;

            if(
                (existDSCKbefore || existDSCKnow ) && // DOQUVIDE/DQS defined
                ( wasDSCK !== isDSCK || serialDSCKbefore !== serialDSCKnow ) // DOQUVIDE/DQS changed
            ){
                Y.log(`${type} status changed from ${wasDSCK} to ${isDSCK} and/or
                       ${type} serial changed from ${serialDSCKbefore} to ${serialDSCKnow}`, 'info', NAME);

                needSynchro = true;
            }
            return {existNow: existDSCKnow, needSynchro: needSynchro };
        }

        function syncPatientWithDispatcher( user, patient, callback ) {
            let originalData = !patient.wasNew && patient.originalData_ || {},
                INCARE = Y.doccirrus.schemas.company.systemTypes.INCARE,
                wasINCARE = originalData && partnerIdExists( originalData, INCARE ),
                isINCARE = patient && partnerIdExists( patient, INCARE ),

                synchroCare = false,
                synchroDOQUVIDE = false,
                synchroDQS = false,

                DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                DQS = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS;


            callback( null, patient );
            let patientCopy = JSON.parse( JSON.stringify( patient ) );

            if( isINCARE !== wasINCARE ) { //INCARE not changed
                Y.log(`INCARE status changed from ${wasINCARE} to ${isINCARE}`, 'info', NAME);
                if(isINCARE){ //Switched ON
                    Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'checkCaseFolder', {patientId: patient._id.toString()} , ( err, casefolderId ) => {
                        if(err){
                            Y.log('Error on creating Care casefolder ' + err.message, 'error', NAME);
                        } else {
                            Y.log('Get Care casefolder for patient ' + casefolderId, 'info', NAME);
                            Y.doccirrus.communication.emitEventForSession( {
                                sessionId: user.sessionId,
                                event: 'system.UPDATE_CASEFOLDER_LIST',
                                msg: { data: { patientId: patient._id.toString() } }
                            } );
                        }

                    } );
                }

                synchroCare = true;
            }

            let needDoquvideResult = needSynchroType( DOQUVIDE, originalData, patient );
            synchroDOQUVIDE = needDoquvideResult.needSynchro;
            let needDQSResult = needSynchroType( DQS, originalData, patient );
            synchroDQS = needDQSResult.needSynchro;

            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'patient', Object.assign( patientCopy, { sync_to: {
                care: synchroCare,
                doquvide: synchroDOQUVIDE,
                dqs: synchroDQS
            } } ), () => {} );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `patient_${ patient._id.toString()}`,
                entityName: 'patient',
                entryId: patient._id.toString(),
                lastChanged: patient.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncPatientWithDispatcherOnDelete( user, patient, callback ) {
            callback( null, patient );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `patient_${ patient._id.toString()}`,
                entityName: 'patient',
                entryId: patient._id.toString(),
                lastChanged: patient.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function checkEdmpStatus( user, patient, callback ) {
            var
                edmpTypes = patient.edmpTypes;

            Y.doccirrus.edmputils.syncCaseFolders( {
                user: user,
                patientId: patient._id.toString(),
                edmpTypes: edmpTypes,
                callback: ( err, updateOnClient ) => {
                    if( updateOnClient ) {
                        Y.doccirrus.communication.emitNamespaceEvent( {
                            nsp: 'default',
                            tenantId: user.tenantId,
                            event: 'system.UPDATE_CASEFOLDER_LIST',
                            msg: { data: { patientId: patient._id.toString() } },
                            doNotChangeData: true
                        } );
                    }
                    callback( err, patient );
                }
            } );

        }

        function checkEhksStatus( user, patient, callback ) {
            const
                shouldHaveCaseFolder = true === patient.ehksActivated;
            Y.doccirrus.ehksutils.syncCaseFolder( user, patient._id, shouldHaveCaseFolder ).then( result => {
                if( result && result.updateOnClient ) {
                    Y.log( 'checkEhksStatus: update client case folder list', 'debug', NAME );
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user.tenantId,
                        event: 'system.UPDATE_CASEFOLDER_LIST',
                        msg: {data: {patientId: patient._id.toString()}},
                        doNotChangeData: true
                    } );
                }
            } ).finally( () => callback() );
        }

        function checkHgvStatus( user, patient, callback ) {
            const
                shouldHaveCaseFolder = true === patient.HGVActivated;
            Y.doccirrus.hgvutils.syncCaseFolder( user, patient._id, shouldHaveCaseFolder ).then( result => {
                if( result && result.updateOnClient ) {
                    Y.log( 'checkHgvStatus: update client case folder list', 'debug', NAME );
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user.tenantId,
                        event: 'system.UPDATE_CASEFOLDER_LIST',
                        msg: {data: {patientId: patient._id.toString()}},
                        doNotChangeData: true
                    } );
                }
            } ).finally( () => callback() );
        }

        function checkZervixZytologieStatus( user, patient, callback ) {
            const
                shouldHaveCaseFolder = true === patient.zervixZytologieActivated,
                caseFolderType = Y.doccirrus.schemas.casefolder.additionalTypes.ZERVIX_ZYTOLOGIE;

            Y.doccirrus.casefolderutils.syncCaseFolder( user, patient._id, shouldHaveCaseFolder, caseFolderType ).then( result => {
                if( result && result.updateOnClient ) {
                    Y.log( 'checkZervixZytologieStatus: update client case folder list', 'debug', NAME );
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user.tenantId,
                        event: 'system.UPDATE_CASEFOLDER_LIST',
                        msg: {data: {patientId: patient._id.toString()}},
                        doNotChangeData: true
                    } );
                }
            } ).finally( () => callback() );
        }

        function checkAmtsStatus( user, patient, callback ) {
            const
                shouldHaveCaseFolder = true === patient.amtsActivated;
            Y.doccirrus.amtsutils.syncCaseFolder( user, patient, shouldHaveCaseFolder ).then( result => {
                if( result && result.updateOnClient ) {
                    Y.log( 'checkAmtsStatus: update client case folder list', 'debug', NAME );
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user.tenantId,
                        event: 'system.UPDATE_CASEFOLDER_LIST',
                        msg: {data: {patientId: patient._id.toString()}},
                        doNotChangeData: true
                    } );
                }
            } ).finally( () => callback() );
        }

        function checkAmtsSelectiveContractInsuranceId( user, patient, callback ) {
            if( !patient || !patient.amtsSelectiveContractInsuranceId ) {
                return callback( null, patient );
            }

            const insurances = patient.insuranceStatus;

            // search for one of the patient's insurances matching the selective care insurance id
            if( Array.isArray( insurances ) && insurances.some( insurance => insurance.insuranceId === patient.amtsSelectiveContractInsuranceId ) ) {
                return callback( null, patient );
            }

            // if not, reset the selective care status of the patient (does not affect ongoing cases)
            Y.log( 'checkAmtsSelectiveContractInsuranceId: no patient insurance matches amtsSelectiveContractInsuranceId, resetting selective care status', 'debug', NAME );
            patient.amtsSelectiveContractInsuranceId = undefined;
            patient.amtsParticipationInSelectiveContract = false;

            return callback( null, patient );
        }

        function updateReporting( user, patient, callback ) {
            var updateItems = updateReportingSplitPatient( patient );

            Y.doccirrus.insight2.utils.flushReportingCache( user.tenantId, 'patient', patient._id.toString() );

            updateItems.forEach( function( item ) {
                syncAuxManager.auxHook( item, 'patient', user );
            } );

            callback( null, patient );
        }

        function updateReportingSplitPatient( patient ) {
            var res = [],
                insurances = patient.insuranceStatus;

            if( !insurances.length ) {
                insurances = [{ type: null }];
            }

            insurances.forEach( function( ins ) {
                var newPatient = Object.create( patient );
                newPatient.caseFolderType = ins.type;
                res.push( newPatient );
            } );

            return res;
        }

        function chekcASVCasefolders( user, patient, callback ) {
            let
                originalData = patient.originalData_,
                prevASVTeamNumbres = [],
                currentTeamNumbers = [],
                isChanged = false;
            if( originalData && originalData.partnerIds ) {
                let
                    asvPartnerEntry = originalData.partnerIds.find( item => {
                        return Y.doccirrus.schemas.patient.PartnerIdsPartnerId.ASV === item.partnerId;
                    } );
                if( asvPartnerEntry ) {
                    prevASVTeamNumbres = prevASVTeamNumbres.concat( asvPartnerEntry.asvTeamNumbers );
                }
            }
            if( patient && patient.partnerIds ) {
                let
                    asvPartnerEntry = patient.partnerIds.find( item => {
                        return Y.doccirrus.schemas.patient.PartnerIdsPartnerId.ASV === item.partnerId;
                    } );
                if( asvPartnerEntry ) {
                    currentTeamNumbers = currentTeamNumbers.concat( asvPartnerEntry.asvTeamNumbers );
                }
            }
            if( prevASVTeamNumbres.length === currentTeamNumbers.length && currentTeamNumbers.every( number => -1 !== prevASVTeamNumbres.indexOf( number ) ) ) {
                return callback( null, patient );
            }

            async.parallel( [
                function( done ) {
                    let
                        newASVTeamNumbers = [];
                    // 1 create case folders for new team numbers
                    currentTeamNumbers.forEach( number => {
                        if( -1 === prevASVTeamNumbres.indexOf( number ) ) {
                            newASVTeamNumbers.push( number );
                        }
                    } );
                    isChanged = isChanged || newASVTeamNumbers.length;
                    async.eachSeries( newASVTeamNumbers, function( number, next ) {
                        Y.doccirrus.api.casefolder.checkCaseFolder( {
                            user: user,
                            query: {
                                patientId: patient._id.toString(),
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                                identity: number
                            },
                            data: {
                                title: Y.Lang.sub( ASV_TITLE, { asvTeamNumber: number } ),
                                type: 'PUBLIC', // MOJ-14319: [OK] [ASV]
                                patientId: patient._id.toString(),
                                additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ASV,
                                identity: number
                            },
                            callback: next
                        } );
                    }, done );
                }, function( done ) {
                    let
                        deletedASVTeamNumbers = [];
                    // 2 delete all empty case folders for deleted numbers
                    prevASVTeamNumbres.forEach( number => {
                        if( -1 === currentTeamNumbers.indexOf( number ) ) {
                            deletedASVTeamNumbers.push( number );
                        }
                    } );
                    if( !deletedASVTeamNumbers.length ) {
                        return setImmediate( done );
                    }
                    isChanged = true;
                    Y.doccirrus.api.casefolder.deleteEmpty( {
                        user: user,
                        query: {
                            patientId: patient._id.toString(),
                            identity: { $in: deletedASVTeamNumbers }
                        },
                        callback: done
                    } );
                }
            ], function( err ) {
                if( !err && isChanged ) {
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: 'default',
                        tenantId: user.tenantId,
                        event: 'system.UPDATE_CASEFOLDER_LIST',
                        msg: {
                            data: {
                                patientId: patient._id.toString()
                            }
                        },
                        doNotChangeData: true
                    } );
                } else {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: err.toString()
                        },
                        meta: {
                            level: 'ERROR'
                        }
                    } );
                }
                callback( err, patient );
            } );

        }

        function checkEdmpCaseNo( user, patient, callback ) {

            function lastPatientCb( err, lastPatients ) {
                var lastPatient = lastPatients && lastPatients[0];

                if( err ) {
                    return callback( err );
                }

                if( !lastPatient ) {
                    return callback( Error( 'could not find last patient to check edmpCaseNo' ) );
                }

                if( lastPatient.edmpCaseNo !== patient.edmpCaseNo ) {
                    return callback( Y.doccirrus.errors.rest( '28001', {}, true ) );
                }

                callback( null, patient );
            }

            function isEdmpCaseNoLockedCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                if( result.isLocked ) {
                    // check if

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: {
                            _id: patient._id.toString()
                        },
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                edmpCaseNo: 1
                            }
                        },
                        callback: lastPatientCb
                    } );

                    return;
                }

                callback( null, patient );
            }

            function caseNoCheckedCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                let isValid = result && true === result.valid;

                if( !isValid ) {
                    return callback( Y.doccirrus.errors.rest( '28000', {
                        $caseNo: patient.edmpCaseNo
                    }, true ) );
                }
                Y.doccirrus.api.edmp.isEdmpCaseNoLocked( {
                    user: user,
                    originalParams: {
                        patientId: patient._id
                    },
                    callback: isEdmpCaseNoLockedCb
                } );
            }

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ||
                !patient.edmpTypes || 0 >= patient.edmpTypes.length || !patient.edmpCaseNo || !patient._id ) {
                return callback( null, patient );
            }

            Y.doccirrus.api.edmp.checkEdmpCaseNo( {
                user: user,
                originalParams: {
                    patientId: patient._id,
                    edmpCaseNo: patient.edmpCaseNo
                },
                callback: caseNoCheckedCb
            } );
        }

        function checkHgvCaseNo( user, patient, callback ) {

            function lastPatientCb( err, lastPatients ) {
                var lastPatient = lastPatients && lastPatients[0];

                if( err ) {
                    return callback( err );
                }

                if( !lastPatient ) {
                    return callback( Error( 'could not find last patient to check edmpCaseNo' ) );
                }

                if( lastPatient.HGVPatientNo !== patient.HGVPatientNo ) {
                    return callback( Y.doccirrus.errors.rest( 28601, {}, true ) );
                }

                callback( null, patient );
            }

            function isHgvPatientNoLockedCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                if( result.isLocked ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: {
                            _id: patient._id.toString()
                        },
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                HGVPatientNo: 1
                            }
                        },
                        callback: lastPatientCb
                    } );

                    return;
                }

                callback( null, patient );
            }

            function caseNoCheckedCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                let isValid = result && true === result.valid;

                if( !isValid ) {
                    return callback( Y.doccirrus.errors.rest( 28600, {
                        $caseNo: patient.HGVPatientNo
                    }, true ) );
                }
                Y.doccirrus.api.edoc.isHgvCaseNoLocked( {
                    user: user,
                    originalParams: {
                        patientId: patient._id
                    },
                    callback: isHgvPatientNoLockedCb
                } );
            }

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.HGV ) ||
                !patient.HGVActivated || !patient.HGVPatientNo || !patient._id ) {
                return callback( null, patient );
            }

            Y.doccirrus.api.edoc.checkHgvCaseNo( {
                user: user,
                originalParams: {
                    patientId: patient._id,
                    HGVPatientNo: patient.HGVPatientNo
                },
                callback: caseNoCheckedCb
            } );
        }

        function checkEhksPatientNo( user, patient, callback ) {

            function lastPatientCb( err, lastPatients ) {
                var lastPatient = lastPatients && lastPatients[0];

                if( err ) {
                    return callback( err );
                }

                if( !lastPatient ) {
                    return callback( Error( 'could not find last patient to check ehksPatientNo' ) );
                }

                if( lastPatient.ehksPatientNo !== patient.ehksPatientNo ) {
                    return callback( Y.doccirrus.errors.rest( '28501', {}, true ) );
                }

                callback( null, patient );
            }

            function isEhksPatientNoLockedCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                if( result.isLocked ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: {
                            _id: patient._id.toString()
                        },
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                ehksPatientNo: 1
                            }
                        },
                        callback: lastPatientCb
                    } );

                    return;
                }

                callback( null, patient );
            }

            function ehksPatientNoCb( err, result ) {
                if( err ) {
                    return callback( err );
                }

                let isValid = result && true === result.valid;

                if( !isValid ) {
                    return callback( Y.doccirrus.errors.rest( '28500', {
                        $patNo: patient.ehksPatientNo
                    }, true ) );
                }
                Y.doccirrus.api.ehks.isEhksPatientNoLocked( {
                    user: user,
                    originalParams: {
                        patientId: patient._id
                    },
                    callback: isEhksPatientNoLockedCb
                } );
            }

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.EHKS ) ||
                !patient.ehksActivated || !patient.ehksPatientNo || !patient._id ) {
                return callback( null, patient );
            }

            Y.doccirrus.api.ehks.checkEhksPatientNo( {
                user: user,
                originalParams: {
                    patientId: patient._id,
                    ehksPatientNo: patient.ehksPatientNo
                },
                callback: ehksPatientNoCb
            } );
        }

        function getPartnerId( patient, partnerId, checkDisabled ) {
            checkDisabled = checkDisabled || false;
            if( !patient.partnerIds || !Array.isArray( patient.partnerIds ) ) {
                return '';
            }

            let patientIdPartner = patient.partnerIds.filter( function( p ) {
                return p.partnerId === partnerId && !( checkDisabled && p.isDisabled );
            } );

            return (patientIdPartner && patientIdPartner.length) ? (patientIdPartner[0].patientId || '') : '';
        }

        function partnerIdExists( patient, partnerId ) {

            if( !patient.partnerIds || !Array.isArray( patient.partnerIds ) ) {
                return false;
            }

            let patientIdPartner = patient.partnerIds.filter( function( p ) {
                return ( typeof p.isDisabled !== 'undefined' ) ? p.partnerId === partnerId && !p.isDisabled : p.partnerId === partnerId;
            } );

            return !!patientIdPartner.length;
        }

        function partnerIdExistsAnyState( patient, partnerId ) {

            if( !patient.partnerIds || !Array.isArray( patient.partnerIds ) ) {
                return false;
            }

            let patientIdPartner = patient.partnerIds.filter( function( p ) {
                return p.partnerId === partnerId;
            } );

            return !!patientIdPartner.length;
        }

        function verifyRequest( user, patient, callback ) {

            const modelName = 'patient',
                originalData = patient.originalData_,
                partnerId_CARDIO = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                partnerId_DOQUVIDE = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE;

            let cardioPartner = getPartnerId( patient, partnerId_CARDIO ),
                doquvidePartner = getPartnerId( patient, partnerId_DOQUVIDE ),
                query;

            async.waterfall( [
                    ( next ) => {
                        //CARDIO serial number verification
                        if( cardioPartner.trim() !== '' ) {
                            query = {
                                $and: [
                                    {partnerIds: {$elemMatch: {"partnerId": partnerId_CARDIO, "patientId": cardioPartner}}}
                                ]
                            };

                            if( originalData && originalData._id ) {
                                query.$and.push( {'_id': {'$ne': originalData._id}} );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: modelName,
                                action: 'count',
                                query: query
                            }, ( err, count ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( Number( count ) > 0 ) {
                                    return next( Y.doccirrus.errors.rest( 400, i18n( 'InCaseMojit.cardio.error.CARDIO_SERIAL_NOT_UNIQUE' ), true ) );
                                }
                                next();
                            } );
                        } else {
                            next();
                        }
                    },
                    ( next ) => {
                        //DOQUVIDE serial number verification
                        if( doquvidePartner.trim() !== '' ) {
                            query = {
                                $and: [
                                    {
                                        partnerIds: {
                                            $elemMatch: {
                                                "partnerId": partnerId_DOQUVIDE,
                                                "patientId": doquvidePartner
                                            }
                                        }
                                    }
                                ]
                            };

                            if( originalData && originalData._id ) {
                                query.$and.push( {'_id': {'$ne': originalData._id}} );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: modelName,
                                action: 'count',
                                query: query
                            }, ( err, count ) => {
                                if( err ) {
                                    return next( err );
                                }
                                if( Number( count ) > 0 ) {
                                    return next( Y.doccirrus.errors.rest( 400, i18n( 'InCaseMojit.cardio.error.DOQUVIDE_SERIAL_NOT_UNIQUE' ), true ) );
                                }
                                next();
                            } );
                        } else {
                            next();
                        }
                    }
                ],
                ( error ) => {
                    if( error ) {
                        Y.log( 'ERROR validation ' + JSON.stringify( error ), 'error', NAME );
                        callback( error );
                    } else {
                        callback( null, patient );
                    }
                }
            );
        }

        /**
         *
         * @method PRIVATE
         *
         * look for certain changes in patient CARDIO related data and do actions (create, or makes disabled) casefolders
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.patient
         * @param {Function} args.callback
         */
        async function processModuleCaseFolders( user, patient, callback ) {

            const
                originalData = !patient.wasNew && patient.originalData_ || {},
                CARDIO_partnerId = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                DOQUVIDE_partnerId = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                DQS_partnerId = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
                CARDIACFAILURE = Y.doccirrus.schemas.patient.CardioOptions.CARDIACFAILURE,
                STROKE = Y.doccirrus.schemas.patient.CardioOptions.STROKE,
                CHD = Y.doccirrus.schemas.patient.CardioOptions.CHD,

                DOQUVIDElicense = Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) || false,
                DQSlicense = Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) || false,

                patientId = patient._id.toString();

            async function actionForCaseFolderType( user, patientId, partnerId, oldValue, newValue ) {
                if( oldValue === newValue ) {
                    return {updated: false};
                }

                let err, results;
                if( oldValue === false && newValue === true ) {
                    [err, results] = await formatPromiseResult(
                        Y.doccirrus.cardioutils.createCaseFolderOfType( user, patientId, partnerId )
                    );
                    if( err ) {
                        Y.log( `Error on processing casefoler for ${partnerId} : ${err.message}`, 'error', NAME );
                        throw err;
                    }
                    return {updated: true, results};
                }
                if( oldValue === true && newValue === false ) { // remove or lock casefolder
                    [err, results] = await formatPromiseResult(
                        Y.doccirrus.cardioutils.removeOrLockCaseFolderOfType( user, patientId, partnerId )
                    );
                    if( err ) {
                        Y.log( `Error on processing casefoler for ${partnerId} : ${err.message}`, 'error', NAME );
                        throw err;
                    }
                    return {updated: true, results};
                }
            }

            let updatedCaseFolder = false,
                err, updated, caseFolderId, oldValue, newValue;

            // CARDIO
            oldValue = originalData && partnerIdExists( originalData, CARDIO_partnerId );
            newValue = patient && partnerIdExists( patient, CARDIO_partnerId );
            [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                actionForCaseFolderType( user, patientId, CARDIO_partnerId, oldValue, newValue )
            );
            if( !err && updated && caseFolderId){
                updatedCaseFolder = updatedCaseFolder || updated;
                Y.doccirrus.communication.emitNamespaceEvent( {
                    nsp: 'default',
                    tenantId: user.tenantId,
                    event: 'system.UPDATE_ACTIVE_CASEFOLDER',
                    msg: {
                        data: {
                            patientId: patientId,
                            activeCaseFolderId: caseFolderId
                        }
                    }
                } );
            }


            // DOQUVIDE
            if( DOQUVIDElicense ){
                oldValue = originalData && partnerIdExists( originalData, DOQUVIDE_partnerId );
                newValue = patient && partnerIdExists( patient, DOQUVIDE_partnerId );
                [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                    actionForCaseFolderType( user, patientId, DOQUVIDE_partnerId, oldValue, newValue )
                );
                if( !err && updated && caseFolderId){
                    updatedCaseFolder = updatedCaseFolder || updated;
                }
            }

            // DQS
            if( DQSlicense ){
                oldValue = originalData && partnerIdExists( originalData, DQS_partnerId );
                newValue = patient && partnerIdExists( patient, DQS_partnerId );
                [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                    actionForCaseFolderType( user, patientId, DQS_partnerId, oldValue, newValue )
                );
                if( !err && updated && caseFolderId){
                    updatedCaseFolder = updatedCaseFolder || updated;
                }
            }

            // CARDIOFAILURE
            oldValue = ( originalData && originalData.cardioHeartFailure === true || !originalData );
            newValue = ( patient && patient.cardioHeartFailure === true );
            [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                actionForCaseFolderType( user, patientId, CARDIACFAILURE, oldValue, newValue )
            );
            if( !err && updated && caseFolderId){
                updatedCaseFolder = updatedCaseFolder || updated;
            }

            // STROKE
            oldValue = ( originalData && originalData.cardioCryptogenicStroke === true || !originalData );
            newValue = ( patient && patient.cardioCryptogenicStroke === true );
            [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                actionForCaseFolderType( user, patientId, STROKE, oldValue, newValue )
            );
            if( !err && updated && caseFolderId){
                updatedCaseFolder = updatedCaseFolder || updated;
            }

            // CHD
            oldValue = ( originalData && originalData.cardioCHD === true || !originalData );
            newValue = ( patient && patient.cardioCHD === true );
            [err, {updated, results: caseFolderId }] = await formatPromiseResult(
                actionForCaseFolderType( user, patientId, CHD, oldValue, newValue )
            );
            if( !err && updated && caseFolderId){
                updatedCaseFolder = updatedCaseFolder || updated;
            }

            //set title of DQS casefolder
            let dqsPartner = patient.partnerIds.find( item => {
                        return DQS_partnerId === item.partnerId;
                    } ) || {},
                casefolderTitle = dqsPartner.licenseModifier;
            let casefolders;
            [err, casefolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'casefolder',
                    action: 'get',
                    query: {
                        patientId: patientId,
                        additionalType: DQS_partnerId
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        fields: {title: 1}
                    }
                } )
            );
            if( err ){
                Y.log( `Error getting casefolder title for DQS : ${err.message}`, 'error', NAME );
            } else if( casefolderTitle && casefolders && casefolders.length && casefolderTitle !== casefolders[0].title ){
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'casefolder',
                        action: 'update',
                        query: {
                            _id: casefolders[0]._id
                        },
                        fields: ['title'],
                        data: {$set: {title: casefolderTitle} }
                    } )
                );
                if(err){
                    Y.log( `Error on updating DQS casefolder title ${err.message}`, 'error', NAME );
                }
            }

            if( updatedCaseFolder ){
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'system.UPDATE_CASEFOLDER_LIST',
                    msg: { data: { patientId: patientId } }
                } );
            }

            callback( null, patient );
        }

        function assignCardio( user, patient, callback ) {

            const
                originalData = patient.wasNew && patient.originalData_ || {},
                CARDIO_partnerId = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO;

            let
                oldValue = originalData && getPartnerId( originalData, CARDIO_partnerId, true ),
                newValue = patient && getPartnerId( patient, CARDIO_partnerId, true );

            if( oldValue !== newValue && newValue !== '' ) {
                Y.doccirrus.api.cardio.attachToPatientId( user, patient, newValue, err => callback( err, patient ) );
            } else {
                return callback( null, patient );
            }

        }

        function checkPatientPhone( user, patient, callback ) {
            Y.doccirrus.utils.checkPersonPhone( user, patient, 'PATIENT', callback );
        }

        function removePatientPhoneNumbers( user, patient, callback ) {
            Y.doccirrus.utils.removePersonPhoneNumbers( user, patient, 'PATIENT', callback );
        }

        function setWasModified( user, patient, callback ) {
            patient.wasNew = patient.isNew;
            patient.lastnameWasModified = patient.isModified( 'lastname' );
            patient.firstnameWasModified = patient.isModified( 'firstname' );
            patient.patientNoWasModified = patient.isModified( 'patientNo' );
            patient.kbvDobWasModified = patient.isModified( 'kbvDob' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                patient.lastChanged = patient.lastChanged || new Date();
            } else {
                patient.lastChanged = new Date();
            }
            setImmediate( callback, null, patient );
        }

        function checkPatientSince( user, patient, callback ) {
            let
                isAdmin = Y.doccirrus.auth.isAdminUser( user ),
                isNotNew = !patient.isNew;
            if (patient.isModified( 'patientSince' ) && !isAdmin && isNotNew) {
                return callback( new Y.doccirrus.commonerrors.DCError( 403 ) );
            }
            setImmediate( callback, null, patient );
        }

        function changeActivityPatientName( user, patient, callback ) {
            if( patient.lastnameWasModified || patient.firstnameWasModified || patient.patientNoWasModified || patient.kbvDobWasModified ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: { patientId: patient._id.toString() },
                    data: {
                        $set: {
                            patientLastName: patient.lastname,
                            patientFirstName: patient.firstname,
                            patientNo: patient.patientNo,
                            patientKbvDob: patient.kbvDob
                        }
                    },
                    options: {
                        multi: true
                    }
                }, err => callback( err, patient ) );
            } else {
                setImmediate( callback, null, patient );
            }
        }

        function setDobMMAndDobDD( user, patient, callback ) {

            if( patient.kbvDob ) {
                patient.dob_DD = patient.kbvDob.slice( 0, 2 );
                patient.dob_MM = patient.kbvDob.slice( 3, 5 );
            }

            setImmediate( callback, null, patient );
        }

        function triggerRuleEngine( user, patient, onDelete, callback ) {
            // return early, user should not wait for rule engine to complete
            callback( null, patient );         //  eslint-disable-line callback-return

            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            let
                data = JSON.parse( JSON.stringify( patient ) ),
                context = this && this.context || {};

            if ( context._skipTriggerRules ) {
                Y.log( `Skipping rules in this context, _skipTriggerRules: patient._id ${patient._id}`, 'debug', NAME );
                return;
            }

            data.new = patient.wasNew || false;

            Y.doccirrus.api.rule.triggerIpcQueue( {
                user,
                type: 'patient',
                tenantId: user.tenantId,
                patientId: patient._id.toString(),
                caseFolderId: patient.activeCaseFolderId,
                onDelete,
                activeActive: context.activeActiveWrite,
                data: {
                    patientId: data
                }
            } );
        }

        /**
         * @method removeFromTransferCache
         * @private
         *
         * remove cache entry for current patient on POST write and delete
         *
         * @param {Object} user
         * @param {Object} patient
         * @param {String} callback
         *
         * @returns {Function} callback
         */
        async function removeFromTransferCache( user, patient, callback ) {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'transfercache',
                    query: {
                        patientId: patient._id
                    },
                    options: {
                        override: true
                    }
                } )
            );
            if( err ) {
                Y.log( `removeFromTransferCache: could not remove for patient: ${err.stack || err}`, 'error', NAME );
            }
            callback( null, patient );
        }

        /**
         * @method deactivatePatientRegOnPuc
         *
         * Set noPRC property to 'true' in patientreg entry related to deleted patient
         *
         * @param {Object} user
         * @param {Object} patient
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        async function deactivatePatientRegOnPuc( user, patient, callback ) {
            if( -1 !== process.argv.indexOf( '--mocha' ) ) { //do not deactivate patient on PUC during mocha tests
                //NOTE Y.doccirrus.auth.isMocha() can't be used because during rule engine test is OFF
                return callback( null, patient );
            }
            let [err, practice] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.practice.getMyPractice( {
                        user,
                        callback: ( err, result ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `deactivatePatientRegOnPuc: could not get practice. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( practice && practice.dcCustomerNo ) {
                Y.doccirrus.communication.callPUCAction( {
                    ensureDelivery: true,
                    action: 'deactivatePatientReg',
                    params: {
                        patientId: patient._id,
                        customerIdPrac: practice.dcCustomerNo
                    }
                }, ( err ) => {
                    if( err ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            msg: {
                                data: i18n( 'practice-process.text.PUC_UNAVAILABLE' )
                            },
                            meta: {
                                level: 'WARNING'
                            }
                        } );
                    }
                } );
            } else {
                Y.log( `deactivatePatientRegOnPuc: could not get practice.`, 'error', NAME );
            }
            return callback( null, patient );
        }

        /**
         * This method should check family member and add to chosen new family record
         * @param user
         * @param patient
         * @param callback
         * @returns {Function} callback
         */
        function updateInvoiceRecipient( user, patient, callback ) {
            // if hasn't any patient family members, not need to check
            if( !patient.patientsFamilyMembers || !patient.patientsFamilyMembers.length ) {
                return callback( null, patient );
            }

            return Y.doccirrus.api.patient.linkPatientFamilyMember( user, patient, callback );
        }

        /**
         * This method is used to update customized relationship status in tags collection
         * default Relationship status list is not saved/updated in tags collections
         * @param user
         * @param patient
         * @param callback
         * @returns {Function} callback
         */
        async function updateFamilyRelationShipTag( user, patient, callback ) {
            const
                updateTagsP = promisifyArgsCallback( Y.doccirrus.api.tag.updateTags );
            let
                oldFamilyMembersStatus = ( patient.originalData_ && patient.originalData_.patientsFamilyMembers || [] ).map( ( member ) => {
                    return member.relationStatus;
                }),
                currentFamilyMembersStatus = ( patient.patientsFamilyMembers || [] ).map( ( member ) => {
                    return member.relationStatus;
                }),
                oldFamilyContactsStatus = ( patient.originalData_ && patient.originalData_.additionalFamilyMembers || [] ).map( ( member ) => {
                    return member.relationStatus;
                }),
                currentFamilyContactsStatus = ( patient.additionalFamilyMembers || [] ).map( ( member ) => {
                    return member.relationStatus;
                }),
                defaultFamilyMembersList = Y.doccirrus.schemas.patient.getPatientRelationList().map( ( {value} ) => value ),
                oldFamilyMembersStatusFiltered,
                currentFamilyMembersStatusFiltered;

            oldFamilyMembersStatus = oldFamilyMembersStatus.concat( oldFamilyContactsStatus );
            currentFamilyMembersStatus = currentFamilyMembersStatus.concat( currentFamilyContactsStatus );
            // Empty array is assigned if the family members is from default list so that it is not saved/updated in tags collection
            oldFamilyMembersStatusFiltered = oldFamilyMembersStatus.filter( ( i ) => {
                return !defaultFamilyMembersList.includes( i );
            });
            currentFamilyMembersStatusFiltered = currentFamilyMembersStatus.filter( ( i ) => {
                return !defaultFamilyMembersList.includes( i );
            });

            // No operation is required when both oldFamilyMembersStatus and currentFamilyMembersStatus are from default list or empty.
            if( !currentFamilyMembersStatusFiltered.length && !oldFamilyMembersStatusFiltered.length ) {
                return callback( null, patient );
            }

            if( !Array.isArray( oldFamilyMembersStatusFiltered ) ) {
                oldFamilyMembersStatusFiltered = [oldFamilyMembersStatusFiltered];
            }

            if( !Array.isArray( currentFamilyMembersStatusFiltered ) ) {
                currentFamilyMembersStatusFiltered = [currentFamilyMembersStatusFiltered];
            }

            let [err] = await formatPromiseResult(
                updateTagsP( {
                    user,
                    data: {
                        type: Y.doccirrus.schemas.tag.tagTypes.RELATIONSHIPSTATUS,
                        oldTags: oldFamilyMembersStatusFiltered,
                        documentId: patient._id.toString(),
                        currentTags: currentFamilyMembersStatusFiltered
                    }
                } )
            );

            if( err ) {
                Y.log( `updateFamilyRelationShipTag. Error while updating tags: ${err.stack || err}`, 'error', NAME );
                return callback( err, patient );
            }
            callback( null, patient );
        }

        /**
         * This method is used to update customized job status in tags collection
         * Job status from Default job status list is not saved/updated in tags collections
         * @param user
         * @param patient
         * @param callback
         * @returns {Function} callback
         */
        function updateJobStatusTag( user, patient, callback ) {
            let
                oldJobStatus = patient.originalData_ && patient.originalData_.jobStatus || [],
                currentJobStatus = patient.jobStatus || [],
                defaultJobStatusList = Y.doccirrus.schemas.person.types.JobStatus_E.list.map( ( {val} ) => val ),
                isCurrentJobStatusDefault = defaultJobStatusList.includes( currentJobStatus ),
                isOldJobStatusDefault = defaultJobStatusList.includes( oldJobStatus );

            // Empty array is assigned if the job status is from default list so that it is not saved/updated in tags collection
            oldJobStatus = patient.wasNew || isOldJobStatusDefault ? [] : oldJobStatus;
            currentJobStatus = isCurrentJobStatusDefault ? [] : currentJobStatus;

            // No operation is required when both oldJobStatus and currentJobStatus are from default list or empty.
            if( (isOldJobStatusDefault && isCurrentJobStatusDefault) || (!oldJobStatus.length && !currentJobStatus.length) ) {
                return callback( null, patient );
            }

            if( !Array.isArray( oldJobStatus ) ) {
                oldJobStatus = [oldJobStatus];
            }

            if( !Array.isArray( currentJobStatus ) ) {
                currentJobStatus = [currentJobStatus];
            }

            Y.doccirrus.api.tag.updateTags( {
                user,
                data: {
                    type: Y.doccirrus.schemas.tag.tagTypes.JOBSTATUS,
                    oldTags: oldJobStatus,
                    documentId: patient._id.toString(),
                    currentTags: currentJobStatus
                },
                callback: function( err ) {
                    if( err ) {
                        Y.log();
                    }
                    callback( err, patient );
                }
            } );
        }

        /**
         * Calls function to update title of this patient' schedules
         * if any of defined fields was changed
         *
         * @param user
         * @param patient
         * @param callback
         * @returns {Function} callback
         */
        async function updateScheduleTitle( user, patient, callback ) {
            const oldData = patient.originalData_,
                fieldsToCheckForChange = ['firstname', 'lastname', 'patientNo', 'kbvDob', 'title', 'nameaffix', 'fk3120'],
                isChanged = oldData && fieldsToCheckForChange.some( field => oldData[field] !== patient[field] );

            if( isChanged ) {
                let [err] = await formatPromiseResult( Y.doccirrus.utils.updateScheduleTitle( user, {
                    model: 'patient',
                    entryId: patient._id
                } ) );
                if( err ) {
                    Y.log( `updateScheduleTitle. Error while updating schedules: ${err.stack || err}`, 'error', NAME );
                }
            }
            return callback( null, patient );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class Patient Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        setWasModified,
                        checkPatientSince,
                        addLocalPacticeId,
                        addDQSId,
                        addKBVDoBIfMissing,
                        checkPatientOrder,
                        readOnlyCheck,
                        assignPatientNo,
                        checkInsurance,
                        checkEmailchange,
                        checkEdmpCaseNo,
                        checkEhksPatientNo,
                        checkHgvCaseNo,
                        checkPatientPortalForEmailDuplication,
                        checkAmtsSelectiveContractInsuranceId,
                        setDobMMAndDobDD,
                        Y.doccirrus.filtering.models.patient.resultFilters[0],
                        verifyRequest,
                        updateJobStatusTag,
                        updateFamilyRelationShipTag
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.filtering.models.patient.resultFilters[0],
                        syncPatientWithDispatcherOnDelete
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        chekcASVCasefolders,
                        copyPatient,
                        changeActivityPatientName,
                        checkPublicInsuranceStatus,
                        updatePatientActivities,
                        checkPatientPortal,
                        updateReporting,
                        checkEdmpStatus,
                        checkEhksStatus,
                        checkHgvStatus,
                        checkZervixZytologieStatus,
                        checkAmtsStatus,
                        processModuleCaseFolders,
                        syncPatientWithDispatcher,
                        assignCardio,
                        checkPatientPhone,
                        function( user, caseFolder, callback ) {
                            triggerRuleEngine.call( this, user, caseFolder, false, callback );
                        },
                        removeFromTransferCache,
                        updateScheduleTitle,
                        updateInvoiceRecipient
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        removePatientPhoneNumbers,
                        function( user, caseFolder, callback ) {
                            triggerRuleEngine.call( this, user, caseFolder, true, callback );
                        },
                        removeFromTransferCache,
                        deactivatePatientRegOnPuc
                    ], forAction: 'delete'
                }
            ],

            assignPatientNo,

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                noteAttempt: false,  // optional:  true = in addition to regular auditing note down actions
                // on this model that were attempted as well as ones that failed.
                // Descr. in this case will always be "Versuch".
                //
                // false = note down only things that actually took place,
                // not attempts that failed

                descrFn: // optional: here we can override what is shown in the audit log description
                // only used when the action succeeds (see noteAttempt)
                    function( data ) {
                        return data && (data.lastname + ', ' + data.firstname) || 'no data';
                    }

            },

            processQuery: Y.doccirrus.filtering.models.patient.processQuery,
            processAggregation: Y.doccirrus.filtering.models.patient.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {
        requires: [
            'patient-schema',
            'casefolder-schema',
            'patient-api',
            'dcerror',
            'dcutils',
            'dcsdmanager',
            'dcdatafilter',
            'dckbvutils',
            'simpleperson-schema',
            'reporting-api',
            'edmp-utils',
            'syncAuxManager',
            'dccommunication',
            'edmp-api',
            'cardio-api',
            'kbvutilityutils',
            'ehks-utils',
            'amts-utils'
        ]
    }
);
