/**
 *  Utilities to create and map forms for activities created on the server, see MOJ-8793, MOJ-8756
 *
 *  Future: should also be used to streamline PDF generation when using DCDB contexts
 *
 *  @author: strix
 *  User: strix
 *  Date: 07.11.17
 *  (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/



YUI.add( 'dcforms-mappinghelper', function( Y, NAME ) {

        const
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            prune = require( 'json-prune' ),
            util = require( 'util' );

        /**
         *  Used by FSM to relate activities to the mapper/reduced schema which should be used
         *
         *  @param      {String}    actType
         *  @returns    {String}    mapper name
         */

        function getMapperForActType( actType ) {

            switch(actType) {
                case 'INVOICE':         return 'Invoice_T';
                case 'PRESCRIPTION':    return 'Prescription_T';
                case 'DOCLETTER':       return 'DocLetter_T';
                case 'PUBRECEIPT':      return 'PubReceipt_T';
                case 'PATIENT':         return 'Patient_T';
            }

            return 'CaseFile_T';
        }


        /**
         *  The activity loaded on the server does not have available all of the context available on the client
         *  This method loads these additional linked objects:
         *
         *      currentPatient from patientId
         *      locationObj from locationId
         *      locations (all available to user)
         *      employeeObj from employeeId
         *      currentPractice (assumed only one per PRC)
         *
         *  TODO: remove patching of other objects onto fullActivity
         *  TODO: accept a pre-filled context object
         *  TODO: document additional data loaded by this
         *  TODO: remove dependencies on populated activity from mappers, simplify caching
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {String}    activityId  Database _id
         *  @param  {Object}    useCache    Reporting cache to share objects in batch operations
         *  @param  {Function}  onProgress  Progress event, of the form fn( { percentage, mapId, label } )
         *  @param  {Function}  callback    Of the form fn(err, fullActivity)
         */

        function createActivityMapperContext( user, activityId, useCache, onProgress, callback ) {
            var
                async = require( 'async' ),
                fullActivity,
                isISD = Y.doccirrus.auth.isISD(),
                rCache = ( useCache && useCache.cacheModels ) ? useCache : Y.doccirrus.insight2.reportingCache.createReportingCache(),
                context = {
                    'user': user,
                    'useReportingCache': true,      //  DEPRECATED: now always true on server
                    'rCache': rCache
                };

            async.series(
                [
                    loadActivityPopulated,
                    loadPatient,
                    loadEmployee,
                    loadSchein,
                    loadLocations,
                    loadPractice,
                    loadPracticeISD,
                    loadAttachments,
                    loadInCaseConfiguration,
                    loadCaseFolder,
                    loadPatientContacts,
                    loadCatalogUsage,
                    loadPatientMarkers,
                    loadScheinRelatedPatientVersion,
                    loadReferringDoctor
                ],
                onAllDone
            );

            //  (1) load the activity with linked activities expanded
            function loadActivityPopulated( itcb ) {
                var
                    progressEvt = {
                        percent: 10,
                        mapId: activityId,
                        label: 'Expanding activity...'                                                  //  TRANSLATEME
                    };

                Y.log( 'calling getActivitiesPopulated: ' + activityId, 'debug', NAME);
                if ( onProgress ) { onProgress( progressEvt ); }

                Y.doccirrus.insight2.reportingCache.getActivityPopulated( user, activityId, rCache, onCacheActivityLoaded );

                function onCacheActivityLoaded( err, activityObj ) {
                    onActivityLoaded( err, activityObj ? [ activityObj ] : [] );
                }

                function onActivityLoaded(err, activityObj) {

                    if (!err && Array.isArray(activityObj) && 0 === activityObj.length) {
                        err = Y.doccirrus.errors.rest( 404, 'Could not load activity ' + activityId, true );
                    }

                    if (err) {
                        Y.log('Could not load activity ' + activityId + ': ' + JSON.stringify(err), 'warn', NAME);
                        itcb( err );
                        return;
                    }

                    try {
                        fullActivity = JSON.parse( JSON.stringify( activityObj[0] ) );
                    } catch( outerException ) {
                        Y.log( `onActivityLoaded. Error while copying activityObj ${activityId}: ${outerException}`, 'warn', NAME );

                        try {
                            Y.log( `onActivityLoaded. Will try to use 'prune' function instead of JSON.stringify.`, 'debug', NAME );
                            fullActivity = JSON.parse( prune( activityObj[0] ) );
                        } catch( innerException ) {
                            Y.log( `onActivityLoaded. Error while copying activityObj ${activityId} with 'prune' function: ${innerException}`, 'warn', NAME );
                            return itcb( Y.doccirrus.errors.rest( 500, `Could not copy activity ${activityId}`, true ) );
                        }
                    }

                    fullActivity.activities = fullActivity.activities || [];
                    fullActivity._user = user;
                    context.activity = fullActivity;

                    //  ensure we have an _activitiesObj
                    if (0 === fullActivity.activities.length && !fullActivity._activitiesObj) {
                        //Y.log('_activitiesObj not initialized by activity-api, adding', 'debug', NAME);
                        fullActivity._activitiesObj = [];
                    }

                    //Y.log('... loaded ' + ( (isISD) ? 'mirroractivity ' : 'activity ' ) + fullActivity._id, 'debug', NAME);
                    itcb( null );
                }
            }

            //  (2) load the patient and add it to the activity
            function loadPatient( itcb ) {
                //Y.log('Loading patient record: ' + fullActivity.patientId, 'debug', NAME);

                //  hack to fix issue with patientId being expanded to full object in a way server-side mapper
                //  does not expect (extended to take care of null object).

                if ('object' === typeof fullActivity.patientId && fullActivity.patientId && fullActivity.patientId._id) {
                    fullActivity.patientId = fullActivity.patientId._id;
                }

                var

                    patientModelName = (isISD) ? 'mirrorpatient' : 'patient',
                    progressEvt = {
                        percent: 30,
                        mapId: activityId,
                        label: 'Adding patient...'                                                      //  TRANSLATEME
                    },
                    dbSetup = {
                        'user': user,
                        'model': patientModelName,
                        'action': 'get',
                        'query': { '_id': fullActivity.patientId },
                        'options': {}
                    };


                if ( rCache.has( patientModelName, fullActivity.patientId ) ) {
                    context.patient = rCache.get( patientModelName, fullActivity.patientId );
                    return itcb( null );
                }

                //Y.log('Loading patient: ' + fullActivity.patientId, 'debug', NAME);
                if ( onProgress ) { onProgress( progressEvt ); }

                Y.doccirrus.mongodb.runDb( dbSetup, onPatientLoaded );

                function onPatientLoaded(err, result) {
                    if (!err && 0 === result.length) {
                        err = new Error( `Patient not found: ${fullActivity.patientId}` );
                    }

                    if ( err ) {
                        Y.log(`Could not load patient ${fullActivity.patientId}: ${JSON.stringify(err)}`, 'warn', NAME);
                        itcb( err );
                        return;
                    }

                    //Y.log('... loaded patient record ' + fullActivity.patientId, 'debug', NAME);

                    context.patient = JSON.parse(JSON.stringify(result[0]));   //  deprecated
                    context.patient.getAddressByKind = function(kind) {
                        Y.log('Looking up address: ' + kind + 'on patient ' + fullActivity.patientId, 'debug', NAME);
                        return Y.doccirrus.schemas.patient.getAddressByKind(fullActivity._currentPatient.addresses, kind);
                    };

                    //  initialize array of additional contacts if not defined
                    context.patient.additionalContacts = context.patient.additionalContacts || [];

                    if ( !isISD ) { rCache.store( patientModelName, fullActivity.patientId, context.patient ); }

                    itcb( null );
                }
            }

            //  (3) load employee associated with current activity
            function loadEmployee( itcb ) {
                var
                    employeeModelName = (isISD) ? 'mirroremployee' : 'employee',
                    progressEvt = {
                        percent: 50,
                        mapId: activityId,
                        label: 'Adding employee...'                                                     //  TRANSLATEME
                    },
                    dbSetup = {
                        'user': user,
                        'model': employeeModelName,
                        'action': 'get',
                        'query': { '_id': fullActivity.employeeId },
                        'options': { 'lean': true }
                    };

                if ( !isISD && rCache.has( employeeModelName, fullActivity.employeeId ) ) {
                    context.employee = rCache.get( employeeModelName, fullActivity.employeeId );
                    return itcb( null );
                }

                //Y.log('Loading employee ' + fullActivity.employeeId, 'debug', NAME);
                if ( onProgress ) { onProgress( progressEvt ); }

                if( fullActivity.employeeId ) {
                    Y.doccirrus.mongodb.runDb( dbSetup, onEmployeeLoaded );
                } else {
                    //skip employee mapping for malformed employeeId and process other mappings
                    return itcb(null);
                }

                function onEmployeeLoaded(err, result) {
                    if (err) {
                        Y.log('Could not load employee ' + fullActivity.employeeId + ': ' + JSON.stringify(err), 'warn', NAME);
                        itcb(err);
                        return;
                    }

                    if (0 === result.length) {
                        //  happens occasionally with activities transferred from another instance, imported data and tests
                        //err = Y.doccirrus.errors.rest( 404, 'Unknown employee record: ' + fullActivity.employeeId, true );
                        return itcb( null );
                    }

                    context.employee = JSON.parse( JSON.stringify( result[0] ) );
                    if ( !isISD ) { rCache.store( employeeModelName, fullActivity.employeeId, context.employee ); }
                    itcb( null );
                }
            }

            //  (4) load any schein associated with this activity, if one exists
            async function loadSchein( itcb ) {
                //  if not an INVOICE activity then we can skip this step, MOJ-9048
                //  also enabled for TREATMENT activities for reporting, EXTMOJ-2066
                //  also enabled for DIAGNOSIS activities for reporting, KUN-204
                if( !Y.doccirrus.schemas.activity.generatesLastScheinContext( fullActivity.actType ) ) {
                    return itcb( null );
                }

                const
                    getLastSchein = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein ),
                    getBaseContact = promisifyArgsCallback( Y.doccirrus.api.basecontact.get );

                let
                    cacheKey = '' +
                               fullActivity.patientId + '_' +
                               fullActivity.timestamp + '_' +
                               fullActivity.locationId + '_' +
                               fullActivity.caseFolderId;

                function onScheinLookup( err, result ) {
                    if( err ) {
                        Y.log( `Error while finding schein for invoice: ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    context.lastSchein = (result && result[0]) ? result[0] : null;

                    if( context.lastSchein ) {
                        rCache.store( 'lastSchein', cacheKey, context.lastSchein );
                    }

                    itcb( null );
                }

                if( 'DOCLETTER' === fullActivity.actType ) {
                    //  with DOCLETTER we also look up referringDoctor from schein by LANR
                    const [err, schein] = await formatPromiseResult(
                        getLastSchein( {
                            user: user,
                            query: {
                                caseFolderId: fullActivity.caseFolderId,
                                locationId: fullActivity.locationId,
                                patientId: fullActivity.patientId,
                                timestamp: fullActivity.timestamp
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `Error while getting last Überweisungsschein: ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    if( schein && schein[0] ) {
                        const [err, referringDoctor] = await formatPromiseResult(
                            getBaseContact( {
                                user: user,
                                query: {
                                    officialNo: schein[0].scheinRemittor
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `Error while getting base contact from last Überweisungsschein: ${err.stack || err}`, 'error', NAME );
                            return itcb( err );
                        }

                        if( referringDoctor && referringDoctor[0] ) {
                            context.referringDoctor = referringDoctor[0];
                        }
                    }
                    return itcb( null );
                } else {
                    if( rCache.has( 'lastSchein', cacheKey ) ) {
                        context.lastSchein = rCache.get( 'lastSchein', cacheKey );
                        return itcb( null );
                    }

                    Y.doccirrus.api.patient.lastSchein( {
                        'user': user,
                        'query': {
                            'caseFolderId': fullActivity.caseFolderId,
                            'patientId': fullActivity.patientId,
                            'timestamp': fullActivity.timestamp,
                            'locationId': fullActivity.locationId
                        },
                        'callback': onScheinLookup
                    } );
                }
            }

            //  (5) load all locations
            function loadLocations( itcb ) {
                var
                    locationModelName = (isISD) ? 'mirrorlocation' : 'location',
                    progressEvt = {
                        percent: 40,
                        mapId: activityId,
                        label: 'Adding locations...'                                                    //  TRANSLATEME
                    },
                    dbSetup = {
                        'user': user,
                        'model': locationModelName,
                        'action': 'get',
                        'query': { },
                        'options': { 'lean': true }
                    };

                if ( !isISD && rCache.has( locationModelName, 'all' ) ) {
                    context.locations = rCache.get( locationModelName, 'all' );
                    addSingleLocation();
                    return itcb( null );
                }

                Y.log('Loading all locations and checking ' + fullActivity.locationId + ' cached: ' + rCache.has( locationModelName, 'all' ), 'debug', NAME);
                if ( onProgress ) { onProgress( progressEvt ); }

                Y.doccirrus.mongodb.runDb( dbSetup, onLocationLoaded );

                function onLocationLoaded(err, result) {
                    if ( err || 0 === result.length ) {
                        Y.log( 'Could not load location ' + fullActivity.locationId + ': ' + JSON.stringify(err), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    //  keep all locations for looking up against linked activities MOJ-6270
                    Y.log('... all ' + result.length + ' locations loaded', 'debug', NAME);
                    context.locations = result;

                    if ( !isISD ) {
                        rCache.store( 'location', 'all', result );
                        result.forEach( item => rCache.store( locationModelName, item._id.toString(), item ) );
                    }

                    addSingleLocation();
                    itcb( null );
                }

                function addSingleLocation() {
                    //  find location of this activity
                    var i;

                    fullActivity._currentLocation = null;      //  deprecated
                    context.location = null;

                    for (i = 0; i < context.locations.length; i++ ) {
                        if ( context.locations[i]._id + '' === fullActivity.locationId + '' ) {
                            context.location = JSON.parse( JSON.stringify( context.locations[i] ) );
                        }
                    }
                }
            }

            //  (6) load the practice associated with the current activity
            function loadPractice( itcb ) {
                var
                    progressEvt = {
                        percent: 60,
                        mapId: activityId,
                        label: 'Adding practice...'                                                     //  TRANSLATEME
                    },
                    dbSetup = {
                        'user': user,
                        'model': 'practice',
                        'action': 'get',
                        'query': { }
                    };

                if ( onProgress ) { onProgress( progressEvt ); }

                if ( isISD ) {
                    //  practice is not present on dispatcher, used to map customerNo, dcCustomerNo and
                    //  practice address, also used for reporting MOJ-8673
                    return itcb( null );
                }

                if ( rCache.has( 'practice', 'default' ) ) {
                    context.practice = rCache.get( 'practice', 'default' );
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( dbSetup, onPracticesLoaded );

                function onPracticesLoaded(err, result) {
                    if (0 === result.length) {
                        err = Y.doccirrus.errors.rest( 404, 'Could not load practice', true );
                    }
                    if (err) {
                        Y.log('Could not load practice for employee ' + fullActivity.employeeId + ': ' + JSON.stringify(err), 'warn', NAME);
                        itcb( err );
                        return;
                    }

                    context.practice = result[0];

                    if ( context.practice ) {
                        rCache.store( 'practice', 'default', context.practice );
                    }

                    itcb( null );
                }
            }

            //  (6.1) Alternate - load practice information on ISD server
            //  mirrorpatient.prcCustomerNo === prcdispatches.prcCustomerNo
            function loadPracticeISD( itcb ) {
                if ( !isISD ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'prcdispatch',
                    'query': { 'prcCustomerNo': context.patient.prcCustomerNo },
                    'callback': onDispatchEntryLoaded
                } );

                function onDispatchEntryLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    if ( result && result[0] ) {
                        Y.log('Loaded prcdispacth object as practice ' + result[0]._id, 'debug', NAME);
                        context.practice = result[0];
                        context.practice.dcCustomerNo = context.practice.prcCustomerNo;
                        fullActivity._currentPractice = context.practice;          //  deprecated
                    }

                    itcb( null );
                }
            }

            //  (7) Instantiate an attachments model to manage documents
            function loadAttachments( itcb ) {
                var
                    attachments = Y.dcforms.AttachmentsModel(),
                    progressEvt = {
                        percent: 70,
                        mapId: activityId,
                        label: 'Adding attachments...'                                                  //  TRANSLATEME
                    };

                if ( onProgress ) { onProgress( progressEvt ); }

                //  disable load of attachments when in cached mode
                //if ( useCache ) {
                //    context.attachments = attachments;
                //    return itcb( null );
                //}

                attachments.loadFromActivity(user, fullActivity, onAttachmentsLoaded);

                function onAttachmentsLoaded(err) {
                    if (err) {
                        Y.log('Error initializing attachment set: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    //Y.log('... loaded ' + attachments.documents + ' attachments, initialized attachments model', 'debug', NAME );
                    context.attachments = attachments;
                    itcb(null);
                }
            }

            //  (8) Load the incase configuration (settings affect mapper behavior)
            function loadInCaseConfiguration( itcb ) {
                var
                    progressEvt = {
                        percent: 90,
                        mapId: activityId,
                        label: 'Adding inCase configuration...'                                         //  TRANSLATEME
                    };

                if ( rCache.has( 'incaseconfiguration', 'default' ) ) {
                    context.incaseconfiguration = rCache.get( 'incaseconfiguration', 'default' );
                    return itcb( null );
                }

                if ( onProgress ) { onProgress( progressEvt ); }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'incaseconfiguration',
                    options: { limit: 1 },
                    callback: onInCaseConfigLoaded
                } );

                function onInCaseConfigLoaded( err, inCaseConfig ) {
                    if ( err ) {
                        Y.log( 'Could not read inCase configuration: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    //Y.log( '... loaded inCase configuration ' + inCaseConfig._id, 'debug', NAME );
                    context.incaseconfiguration = inCaseConfig;
                    rCache.store( 'incaseconfiguration', 'default', context.incaseconfiguration );
                    itcb( null );
                }
            }

            //  (9) Load casefolder (some casefolder types are excluded inr reporting)
            function loadCaseFolder( itcb ) {
                let
                    caseFolderModelName = isISD ? 'mirrorcasefolder' : 'casefolder',
                    caseFolderId = context.activity.caseFolderId;
                if ( !caseFolderId ) { return itcb( null ); }

                if ( rCache.has( caseFolderModelName, caseFolderId ) ) {
                    context.caseFolder = rCache.get( caseFolderModelName, caseFolderId );
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: caseFolderModelName,
                    query: { '_id': caseFolderId },
                    options: { limit: 1 },
                    callback: onCaseFolderLoaded
                } );

                function onCaseFolderLoaded( err, result ) {
                    if ( err || !result[0] ) {
                        //  continue without casefolder, best effort
                        return itcb( null );
                    }

                    rCache.store( caseFolderModelName, caseFolderId, result[0] );
                    context.caseFolder = result[0];
                    itcb( null );
                }
            }


            //  (10) Load patient contacts (physician, family doctor, additional contacts)
            function loadPatientContacts( itcb ) {
                let contactIds = [], contactsToLoad, i;

                context.contacts = [];
                context.patientAdditionalContacts = [];
                context.patient.additionalContactsObj = [];     //  deprecated

                if ( context.patient.familyDoctor ) {
                    contactIds.push( context.patient.familyDoctor );
                }

                if ( context.patient.physicians && context.patient.physicians.length ) {
                    for ( i = 0; i < context.patient.physicians.length; i++ ) {
                        contactIds.push( context.patient.physicians[i] );
                    }
                }

                if ( context.patient.institution ) {
                    contactIds.push( context.patient.institution );
                }

                if ( context.patient.additionalContacts && context.patient.additionalContacts.length ) {
                    for ( i = 0; i < context.patient.additionalContacts.length; i++ ) {
                        contactIds.push( context.patient.additionalContacts[i] );
                    }
                }

                //  if patient has no contacts set up then we can skip this step
                if ( 0 === contactIds.length ) { return itcb( null ); }

                //  don't re-load contacts which are already cached
                contactsToLoad = rCache.checkMissing( 'basecontact', contactIds );

                //  if all contacts are already cached, jump straight to assigning them
                if ( 0 === contactsToLoad.length ) { return onContactsLoaded( null, [] ); }

                Y.doccirrus.api.basecontact.getExpandedPhysicians( {
                    user: user,
                    query: { '_id': { $in: contactsToLoad } },
                    callback: onContactsLoaded
                } );

                function onContactsLoaded( err, result ) {

                    if ( err ) {
                        return itcb( null );
                    }

                    result = result.result ? result.result : result;

                    //  store these in the cache
                    for ( i = 0; i < result.length; i++ ) {
                        for ( i = 0; i < result.length; i++ ) {
                            rCache.store( 'basecontact', result[i]._id.toString(), result[i] );
                        }
                    }

                    //  mix results with those that were already in the cache

                    for ( i = 0; i < contactIds.length; i++ ) {
                        context.contacts.push( rCache.get( 'basecontact', contactIds[i] ) );

                        //  TODO: remove familyDoctorObj, physicianObj, institutionObj, additionalContactsObj from patient

                        //  deprecated streamline handling of contacts via expanded activities
                        if ( context.patient.physicians && contactIds[i] === context.patient.physicians[0] ) {
                            context.patientPhysician = rCache.get( 'basecontact', contactIds[i] );
                            //  deprecated, better not to monkey patch the patient
                            context.patient.physiciansObj = context.patientPhysician;
                        }

                        //  deprecated streamline handling of contacts via expanded activities
                        if ( context.patient.institution && contactIds[i] === context.patient.institution ) {
                            context.patientInstitution = rCache.get( 'basecontact', contactIds[i] );

                            //  deprecated, better not to monkey patch the patient
                            context.patient.institutionObj = context.patientInstitution;
                        }

                        //  deprecated streamline handling of contacts via expanded activities
                        if ( context.patient.familyDoctor && contactIds[i] === context.patient.familyDoctor ) {
                            context.patientFamilyDoctor = rCache.get( 'basecontact', contactIds[i] );
                            //  deprecated, better not to monkey patch the patient
                            context.patient.familyDoctorObj = context.patientFamilyDoctor;
                        }

                        //  deprecated, handle this directly in the mapper syncronously
                        if (
                            ( context.patient.additionalContacts ) &&
                            ( -1 !== context.patient.additionalContacts.indexOf( contactIds[i] ) )
                        ) {
                            context.patient.additionalContactsObj.push( rCache.get( 'basecontact', contactIds[i] ) );
                        }

                        context.patientAdditionalContacts = context.patient.additionalContactsObj;

                    }

                    itcb( null );
                }
            }

            //  (11) Get catalog usages
            function loadCatalogUsage( itcb ) {
                //  if no catalog usage then we can skip this step
                if ( !fullActivity.code && !fullActivity.catalogShort ) { return itcb( null ); }

                let cacheKey = fullActivity._id + '_lastCatalogUsage';

                if ( rCache.has( 'actcatusage', cacheKey ) ) {
                    context.catalogUsages = rCache.get( 'actcatusage', cacheKey );
                    return itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'catalogusage',
                    user: user,
                    query: Y.doccirrus.api.catalogusage.getQueryForActivity( fullActivity ),
                    options: {
                        lean: true
                    },
                    callback: onCatUsageLoaded
                } );

                function onCatUsageLoaded( err, result ) {
                    if( err ) {
                        Y.log( 'Error getting catalogusage tags', 'error', NAME );
                        //  not ciritical, contionue despote error
                        return itcb( null );
                    }

                    context.catalogUsages = result[0];
                    rCache.store( 'actcatusage', cacheKey, context.catalogUsages );
                    itcb( null );
                }
            }

            //  (12) On the server the patient will have an array of _ids of marker records, EXTMOJ-1281
            function loadPatientMarkers( itcb ) {

                //  if no markers then skip this step
                if ( !context.patient || !context.patient.markers || context.patient.markers.length === 0 ) { return itcb( null ); }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'marker',
                    'query': { '_id': { $in: context.patient.markers } },
                    'callback': onMarkersLoaded
                } );

                function onMarkersLoaded( err, result ) {
                    //  do not halt on failure here, best effort
                    if ( err ) { return itcb( null ); }
                    context.patientMarkers = result;
                    itcb( null );
                }

            }

            // (13) load the scheinrelated patientversion
            async function loadScheinRelatedPatientVersion( itcb ) {

                // if no patient exists in context or the activity is not a schein, skip this step
                if( !context.patient || !Y.doccirrus.schemas.activity.isScheinActType( fullActivity.actType ) ) {
                    return itcb( null );
                }

                const getScheinRelatedPatientVersion = promisifyArgsCallback( Y.doccirrus.api.kbv.scheinRelatedPatientVersion );

                let
                    err, scheinRelatedPatientVersion, patientVersions, query;

                // 1) In case of public casefolder use getScheinRelatedPatientversion
                if( fullActivity.actType === "SCHEIN" ) {
                    [err, scheinRelatedPatientVersion] = await formatPromiseResult( getScheinRelatedPatientVersion(
                        {
                            user: user,
                            data: {
                                schein: fullActivity
                            }
                        }
                    ) );

                    if( err ) {
                        Y.log( `loadScheinRelatedPatientVersion: Error while getting public patient Version for schein with ID ${activityId}: ${err.stack || err}`, 'error', NAME );
                        return itcb( null );
                    }

                    if( !scheinRelatedPatientVersion ) {
                        Y.log( `loadScheinRelatedPatientVersion: No patient version found for schein with ID ${activityId}.`, 'warn', NAME );
                        return itcb( null );
                    }

                    // The Id of the patientVersion is stored in the field _originalId, but for consistency in the mappers the _id field should have that value as well
                    context.patientVersion = {...scheinRelatedPatientVersion, _id: scheinRelatedPatientVersion._originalId};
                    return itcb( null );
                }

                // 2) In case of non public casefolder, look chronologically for latest patientVersion
                query = { patientId: fullActivity.patientId };

                // In case schein is already settled, look for the last version before the settled date
                if( fullActivity.scheinSettledDate ) {
                    query.timestamp = {$lte: fullActivity.scheinSettledDate};
                }

                [err, patientVersions] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patientversion',
                        query,
                        options: {
                            sort: {
                                timestamp: -1
                            },
                            limit: 1
                        }
                    } )
                );

                if( err ) {
                    Y.log( `loadScheinRelatedPatientVersion: Error while getting non public patient Version for schein with ID ${activityId}: ${err.stack || err}`, 'error', NAME );
                    return itcb( null );
                }
                if( !patientVersions ) {
                    Y.log( `loadScheinRelatedPatientVersion: No patient version found for schein with ID ${activityId}.`, 'warn', NAME );
                    return itcb( null );
                }

                context.patientVersion = patientVersions && patientVersions[0];
                return itcb( null );
            }

            // (14) load referring doctor
            // MOJ-13320: Referring doctors from Schein needed as context, so added all schein types as additional actTypes for which this context is generated.
            async function loadReferringDoctor( itcb ) {

                // if activity is not a schein, return early
                if( !Y.doccirrus.schemas.activity.isScheinActType( fullActivity.actType ) ) {
                    return itcb( null );
                }

                const getBaseContact = promisifyArgsCallback( Y.doccirrus.api.basecontact.get );

                const [err, referringDoctor] = await formatPromiseResult(
                    getBaseContact( {
                        user: user,
                        query: {
                            officialNo: fullActivity.scheinRemittor,
                            bsnrs: fullActivity.scheinEstablishment
                        }
                    } )
                );

                if( err ) {
                    Y.log( `loadReferringDoctor: Error while getting base contact from schein: ${err.stack || err}`, 'error', NAME );
                }

                if( referringDoctor && referringDoctor[0] ) {
                    context.referringDoctor = referringDoctor[0];
                }

                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                var
                    progressEvt = {
                        percent: 100,
                        mapId: activityId,
                        label: 'Mapper context complete'                                                //  TRANSLATEME
                    };

                if ( onProgress ) { onProgress( progressEvt ); }

                //Y.log( 'Activity Mapper Context all done.' , 'debug', NAME );
                callback( err, context );
            }

        }

        /**
         *  Create mapper context to render a CaseFolder table to PDF
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  dataTable       {Object}    Casefolder
         *  @param  callback        {Function}  Of the form fn( err, context )
         */

        function createCaseFolderTableMapperContext( user, dataTable, callback ) {

            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                locationId = ( ( user.locations && user.locations[0] ) ? user.locations[0]._id : null ),

                context = {
                    'activity': {
                        '_id': 'placeholder',
                        '_user': user,
                        'actType': 'REPORT',
                        'editor': [],
                        'employeeId': user.specifiedBy,
                        'locationId': locationId
                    },
                    locations: [],
                    'patient': {
                        'addresses': []
                    }
                };

            //  TODO: consider moving getCaseFileLight call here
            async.series( [ loadLocations, reformatColumns ], onAllDone);

            function loadLocations( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'location',
                    'query': {},
                    'callback': onLocationsLoaded
                } );
                function onLocationsLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    context.locations = result;
                    itcb( null );
                }
            }

            //  Expand / reformat columns
            function reformatColumns( itcb ) {
                var i, j;
                for ( i = 0; i < dataTable.length; i++ ) {

                    //  reformart the date
                    if ( dataTable[i].timestamp ) {
                        dataTable[i].timestamp = moment( dataTable[i].timestamp ).format( 'DD.MM.YYYY' );
                    }

                    if ( dataTable[i].content ) {
                        dataTable[i].content = dataTable[i].content.replace( '<br/>', '\n' );
                    }

                    //  Look up / translate activity type names
                    if ( dataTable[i].actType ) {
                        dataTable[i].actTypeName = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', dataTable[i].actType, '-de', 'k.A.' );
                    }

                    //  Look up location names
                    if ( dataTable[i].locationId ) {
                        for ( j = 0; j < context.locations.length; j++ ) {
                            if ( context.locations[j]._id + '' === dataTable[i].locationId + '' ) {
                                dataTable[i].locationName = context.locations[j].locname + '';
                            }
                        }
                    }

                    //  Add editor name
                    if ( dataTable[i].editor && dataTable[i].editor.length ) {
                        dataTable[i].editorName = dataTable[i].editor[ dataTable[i].editor.length - 1 ].name;
                    }
                }

                itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not create table mapper context: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, context );
            }


        }

        /**
         *  Load employee, location and other data for embedding in a report
         *
         *  @param user
         *  @param callback
         */

        function createReportMapperContext( user, callback ) {
            var
                async = require( 'async' ),
                locationId = ( ( user.locations && user.locations[0] ) ? user.locations[0]._id : null ),

                context = {
                    'activity': {
                        '_id': 'placeholder',
                        '_user': user,
                        'actType': 'REPORT',
                        'editor': [],
                        'employeeId': user.specifiedBy,
                        'locationId': locationId
                    },
                    'patient': {
                        'addresses': []
                    }
                };

            async.series( [ loadEmployee, loadLocation ], onAllDone );

            function loadEmployee( itcb ) {
                context.employee = user;
                itcb( null );
            }

            function loadLocation( itcb ) {
                var
                    dbSetup = {
                        'user': user,
                        'model': 'location',
                        'action': 'get',
                        'query': { '_id': locationId }
                    };

                Y.log('Loading location ' + locationId, 'debug', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onLocationLoaded );

                function onLocationLoaded(err, result) {
                    if (err || 0 === result.length) {
                        Y.log('Could not load location ' + locationId + ': ' + JSON.stringify(err), 'warn', NAME);
                        itcb(err);
                        return;
                    }

                    Y.log('... location loaded', 'debug', NAME);
                    context.location = JSON.parse(JSON.stringify(result[0]));
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                callback( err, context );
            }
        }

        /**
         *  Load the expanded activity (along with linked objects)
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  mapperName  {String}    Name of reduced schema to use for this form (mapper will claim it)s
         *  @param  template    {Object}    A dcforms template object
         *  @param  activityId  {String}    Database _id into activities collection
         *  @param  useCache    {Object}    Reporting cache to use for batch operations
         *  @param  onProgress  {Function}  Progress event
         *  @param  callback    {Function}  Of the form fn( err, mapper )
         */

        function setupMapperForActivity(user, mapperName, template, activityId, useCache, onProgress, callback) {

            var
                async = require( 'async' ),
                moment = require( 'moment' ),

                mapper,
                mapperContext,
                firstMapEvent = true;

            Y.log( 'Loading, populating and expanding activity: ' + activityId, 'debug', NAME);

            async.series(
                [
                    createContext,
                    applyFormTranslation,
                    createMapper,
                    mapExtraFields
                ],
                onAllDone
            );

            //  1. Load activity and related objects from database into context for generic form mappers
            function createContext( itcb ) {
                Y.log( 'Creating mapper context from activity: ' + activityId, 'debug', NAME );
                createActivityMapperContext( user, activityId, useCache, onContextProgress, onActivityContextLoaded );
                function onActivityContextLoaded(err, newContext) {

                    var noNewContext = ( !newContext || !newContext.activity || !newContext.activity._id );

                    if ( !err && noNewContext ) {
                        // no error occurred, this activity does not exist in this DB
                        err = Y.doccirrus.errors.rest( 1005, 'Could not create activity context for form mapping', true );
                    }

                    if ( err ) {
                        Y.log( 'Could not load/expand activity ' + activityId + ': ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    mapperContext = newContext;
                    itcb( null );
                }
            }

            //  2. check if useFormTranslation is configured, iterate through all for elements to find that have translations and set
            //     correct variant based on language and patient gender
            function applyFormTranslation( itcb ) {
                let context = mapperContext || {},
                    useFormTranslation = context.incaseconfiguration && context.incaseconfiguration[0] && context.incaseconfiguration[0].useFormTranslation,
                    patientGender = context.patient && context.patient.gender,
                    gender = patientGender === 'MALE' ? 'm' : (patientGender === 'FEMALE' ? 'f' : 'n'),
                    userLang = Y.dcforms.getUserLang();

                if( useFormTranslation ) {
                    //for fields that have been changed do not need to pick data from attached form document
                    template.remapTranslationOnElements = [];
                    for( let page of template.pages ) {

                        for( let element of page.elements ) {
                            let haveSeveralTranslations = [];
                            for( const [key, value] of Object.entries( element.translationDirty || {} ) ) {
                                if( !value || value === 'false' ) {
                                    haveSeveralTranslations.push( key );
                                }
                            }
                            // skip formTranslation for element if only one default value is configured
                            if( haveSeveralTranslations.length === 1 && haveSeveralTranslations[0] === 'de' ) {
                                continue;
                            }
                            template.gender = gender;
                            element.page.form.userLang = userLang;
                            let translationLang = element.getBestLang(),
                                needTranslation = haveSeveralTranslations.includes( translationLang );
                            if( needTranslation ) {
                                template.remapTranslationOnElements.push( element.elemId );
                                element.setValue( element.defaultValue[translationLang], Y.dcforms.nullCallback );
                            }
                        }
                    }
                }
                itcb( null );
            }

            //  3. Create a new form mapper instance according to form schema and context
            function createMapper( itcb ) {

                function onMapComplete( ) {
                    if (false === firstMapEvent) {
                        Y.log( 'Template has sent more the one "mapcomplete" event for this form', 'warn', NAME );
                        return;
                    }

                    firstMapEvent = false;

                    Y.log( 'Form has been mapped on server by: ' + template.mapperName, 'debug', NAME );
                    itcb( null );
                }

                onOwnProgress( { percent: 60, label: 'Instantiating mapper...' } );                  //  TRANSLATEME

                if( !template ) {
                    return itcb( null );
                }

                Y.log('Loaded and expanded activity: ' + mapperContext.activity._id + ', initializing mapper', 'debug', NAME);
                template._stashActivity = mapperContext.activity;

                //  subscribe to mapper, this will be called when current form has been initialized with new mapper
                template.on( 'mapcomplete', 'server-side-render', onMapComplete );

                Y.log('Expanded activity with ' + mapperContext.activity._activitiesObj.length + ' linked activities.', 'debug', NAME);
                switch (mapperName) {
                    case 'incase':
                    case 'InCase_T':
                    case 'MedicationActivity_T':
                        //  incase mapper causes multiple map operations
                        template.off( 'mapcomplete', 'server-side-render', onMapComplete );

                        //  incase mapper fires this when complete
                        template.on( 'mapperinitialized', 'server-side-render', onMapComplete );

                        template.mapperName = 'incase';
                        mapper = Y.dcforms.mapper.incase( template, mapperContext );
                        break;

                    case 'casefile':
                    case 'CaseFile_T':
                        template.mapperName = 'casefile';
                        mapper = Y.dcforms.mapper.casefile( template, mapperContext );
                        break;

                    case 'invoice':
                    case 'Invoice_T':
                        template.mapperName = 'invoice';
                        mapper = Y.dcforms.mapper.invoice( template, mapperContext );
                        break;

                    case 'prescription':
                    case 'Prescription_T':
                        template.mapperName = 'prescription';
                        mapper = Y.dcforms.mapper.prescription( template, mapperContext );
                        break;

                    case 'docletter':
                    case 'DocLetter_T':
                        template.mapperName = 'docletter';
                        mapper = Y.dcforms.mapper.docletter( template, mapperContext );
                        break;

                    case 'pubreceipt':
                    case 'PubReceipt_T':
                        template.mapperName = 'pubreceipt';
                        mapper = Y.dcforms.mapper.pubreceipt( template, mapperContext );
                        break;

                    case 'insuite':
                    case 'InSuite_T':
                        template.mapperName = 'insuite';
                        mapper = Y.dcforms.mapper.insuite( template, mapperContext );
                        break;

                    default:
                        return itcb( Y.doccirrus.errors.rest( 501, 'Unhandled mapper: ' + mapperName, true ) );

                }
            }

            //  4. On some transitions the PDF needs to be updated to invoice number, revalidated data, etc
            function mapExtraFields( itcb ) {

                function onMapExtraComplete(err) {
                    if (err) {
                        Y.log('Could not map extra data into activity: ' + JSON.stringify(err), 'warn', NAME);
                        return itcb(err);
                    }

                    var currentAttachments = mapperContext.attachments;

                    Y.log('updating formDoc from template', 'debug', NAME);
                    onOwnProgress( { percent: 80, label: 'Updating form document...' } );            //  TRANSLATEME
                    currentAttachments.updateFormDoc(mapperContext, template, onFormDocUpdated);
                }

                function onFormDocUpdated() {
                    //  once this activity and linked data have been mapped into form, re-render the form with this data
                    Y.log('Activity ' + activityId + ' has been mapped into form.', 'debug', NAME);
                    onOwnProgress( { percent: 70, label: 'Re-rendering form...' } );                 //  TRANSLATEME
                    template.render( itcb );
                }

                //  NOTE: quickprint may cause invoice to be BILLED at this point, instead of APPROVED

                if( !template ) {
                    return itcb( null );
                }

                var
                    approvedStates = [ 'APPROVED', 'BILLED' ],
                    isReceipt = ( 'RECEIPT' === mapperContext.activity.actType ),
                    isInvoice = ( 'INVOICE' === mapperContext.activity.actType ),
                    isInvoiceMapper = ( 'Invoice_T' === mapperName || 'invoice' === mapperName ),
                    isApproved = ( -1 !== approvedStates.indexOf( mapperContext.activity.status ) ),
                    needsInvoiceNumber = ( ( isInvoice || isInvoiceMapper) && isApproved ),
                    schemaReferences,
                    mapExtra, qrBc, qrBcData,
                    hasQrMeta = false;

                onOwnProgress( { percent: 70, label: 'Mapping extra fields...' } );                  //  TRANSLATEME

                //  special case for invoices, which get an invoice number on approve
                if ( needsInvoiceNumber ) {

                    mapExtra = {
                        'invoiceNo': (  mapperContext.activity.invoiceNo + '' ) || '----',
                        'date': moment(  mapperContext.activity.timestamp + '' ).format( 'DD.MM.YY' )
                    };

                    Y.log('Adding invoiceNo into form: ' + JSON.stringify(mapExtra), 'debug', NAME);

                    template.map( mapExtra, true, onMapExtraComplete );
                    return;
                }

                if ( isReceipt && isApproved ) {
                    mapExtra = {
                        'receiptNo': (  mapperContext.activity.receiptNo + '' ) || '----',
                        'date': moment(  mapperContext.activity.timestamp + '' ).format( 'DD.MM.YY' )
                    };

                    Y.log('Adding receiptNo into form: ' + JSON.stringify(mapExtra), 'debug', NAME);

                    template.map( mapExtra, true, onMapExtraComplete );
                    return;
                }

                //  if there is a metadata QR code, ensure that it is up to date, MOJ-9826

                schemaReferences = template.getSchemaReferences();
                schemaReferences.map( function( refItem ) {
                    if ( 'documentMetaDataQrCode' === refItem.name ) {
                        hasQrMeta = true;
                    }
                } );

                if ( hasQrMeta ) {

                    qrBcData = {
                        'dateNormal': moment( mapperContext.activity.timestamp + '' ).format( 'DD.MM.YYYY' ),
                        'activityId': mapperContext.activity._id,
                        'patientId': mapperContext.activity.patientId,
                        'patientNo': mapperContext.patient.patientNumber || '',
                        'actType': mapperContext.activity.actType,
                        'subType':  mapperContext.activity.subType || '',
                        'userContent':  mapperContext.activity.userContent || ''
                    };

                    qrBc = Y.dcforms.mapper.objUtils.getBarcode( 'documentMetaDataQrCode', qrBcData, { 'context': mapperContext } );

                    mapExtra = { documentMetaDataQrCode: qrBc };

                    Y.log( 'Adding QR metadata into form: ' + JSON.stringify( mapExtra ), 'debug', NAME);
                    template.map( mapExtra, true, onMapExtraComplete );
                    return;
                }

                //  once this activity and linked data have been mapped into form, re-render the form with this data
                Y.log('Activity ' + activityId + ' has been mapped into form.', 'debug', NAME);
                template.render( itcb );
            }

            //  Finally, ensure that callback is only invoked once
            function onAllDone(err) {

                if ( err ) {
                    Y.log( 'Problem applying mapper context for activity: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                if( !mapper ) {
                    return callback( null, null );
                }

                mapper.context = mapperContext;

                Y.log( 'Activity is mapped into form.', 'debug', NAME );
                onOwnProgress( { percent: 100, label: 'Form mapper ready.' } );            //  TRANSLATEME
                callback( null, mapper );
            }

            //  Progress updates raised by createActivityMapperContext
            function onContextProgress( evt ) {
                //  first half of this process is creating the context
                evt.percent = evt.percent / 2;
                onOwnProgress( evt );
            }

            //  Progress updates raised by self
            function onOwnProgress( evt ) {
                evt.mapId = activityId;

                if ( onProgress && 'function' === typeof onProgress ) {
                    onProgress( evt );
                } else {
                    evt.targetId = user.identityId;
                    Y.dcforms.raisePdfProgressEvent( evt );
                }
            }

        }

        /**
         *  Load and map a form for the given activity, then save the form doc as an attachment
         *
         *  @param  {Object}    user            REST user or equivalent
         *  @param  {String}    activityId      database _id of an activity which may have a form
         *  @param  {Object}    mapData         Optional initial mapped properties of form
         *  @param  {Object}    useCache        A reporting cache object (optional)
         *  @param  {Function}  callback        Of the form fn( err, activity, template, mapper, mapperContext )
         */

        function initializeFormForActivity( user, activityId, mapData, useCache, callback ) {
            var
                async = require( 'async' ),
                activity,
                template,
                mapper,
                mapperContext;

            useCache = useCache ? useCache : Y.doccirrus.insight2.reportingCache.createReportingCache();

            async.series(
                [
                    loadActivity,
                    lookupForm,
                    lookupFormVersion,
                    createTemplate,
                    createMapper,
                    saveDocument
                ],
                onAllDone
            );

            //  1.  Load activity to get formId or actType
            function loadActivity( itcb ) {
                useCache.loadOrGet( user, 'activity', activityId, onActivityLoaded );
                function onActivityLoaded( err, result ) {
                    if ( err ) {
                        Y.log( `Could not initialize form for activity, activity not found: ${err.stack||err}`, 'warn', NAME );
                        return itcb( err );
                    }
                    activity = result;
                    itcb( null );
                }
            }

            //  2.  Lookup formId if not specified
            async function lookupForm( itcb ) {
                //  if formId is already present then we can skip this step, otherwise assume from form role
                let formRole = "";

                if ( activity.formId && '' !== activity.formId ) {
                    return itcb( null );
                }

                try {
                    formRole = await Y.doccirrus.formsconfig.getRoleForActTypeCaseFolderId( user, activity.actType, activity.caseFolderId );
                } catch (err) {
                    return itcb(err);
                }

                //  if necessary to initialize LABREQUEST, UTILITY, KBVUTILITY forms here then form roles can be
                //  interpreted as in activity-api.client.js

                if ( !formRole || '' === formRole ) {
                    return itcb( Y.doccirrus.errors.rest( 500, 'Cannot automatically assign form to this activity' ) );
                }

                Y.dcforms.getConfigVar( user, formRole, false, onFormLookup );

                function onFormLookup( err, formId )  {
                    if ( err ) { return itcb( err ); }

                    if ( !formId || '' === formId ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Cannot automatically assign form to this activity' ) );
                    }

                    activity.formId = formId;
                    itcb( null );
                }
            }

            //  3.  Look up formVersion if not specified, switch to BFB alternative if licence requires
            //      note: this is similar to code in activity-api.client.js, could be centralized
            function lookupFormVersion( itcb ) {
                //  if formVersion is already present then we can skip this step
                if ( activity.formVersion && '' !== activity.formVersion ) {
                    return itcb( null );
                }

                //Y.dcforms.getFormListing( '', activity.formId, onFormListingLoaded );
                Y.doccirrus.api.formtemplate.listforms( {
                    'user': user,
                    'callback': onFormListingLoaded
                } );

                function onFormListingLoaded( err, list ) {
                    if ( err ) { return itcb( err ); }

                    let
                        userLang = Y.dcforms.getUserLang(),
                        clientBFB = Y.dcforms.clientHasBFB(),
                        listing, i;

                    for ( i = 0; i < list.length; i++ ) {
                        listing = list[i];

                        if ( listing.formId === activity.formId && listing.title && listing.title[userLang] ) {

                            activity.formVersion = listing.latestVersionId;
                            Y.log( 'set formversion: ' + activity.formVersion, 'debug', NAME );

                            if ( !activity.userContent || '' === activity.userContent ) {
                                activity.userContent = listing.title[ userLang ];
                            }

                            if ( !clientBFB && listing.bfbAlternative && '' !== listing.bfbAlternative ) {
                                Y.log( 'using BFB alternative form: ' + listing.bfbAlternative, 'debug', NAME );
                                activity.formId = listing.bfbAlternative;
                                onFormListingLoaded( null, list );
                            }
                        }

                    }

                    itcb( null );
                }
            }

            //  4.  Create a form template
            function createTemplate( itcb ) {
                var
                    templateOptions = {
                        'user': user,
                        'canonicalId': activity.formId,
                        'formVersionId': activity.formVersion,
                        'callback': onTemplateLoaded
                    };

                Y.dcforms.createTemplate( templateOptions );

                function onTemplateLoaded( err, newTemplate ) {
                    if ( err ) { return itcb( err ); }
                    template = newTemplate;

                    //  MOJ-10953 used when caller will manage slow post-processes of activities
                    template._skipTriggerRules = useCache._skipTriggerRules || false;
                    template._skipTriggerSecondary = useCache._skipTriggerSecondary || false;

                    itcb( null );
                }
            }

            //  5.  Create a mapper and context
            function createMapper( itcb ) {
                var mapperName = 'incase';

                if( template && template.reducedSchema && '' !== template.reducedSchema ) {
                    mapperName = template.reducedSchema;
                }

                useCache.store( 'activity', activity._id.toString(), activity );

                setupMapperForActivity(
                    user,
                    mapperName,
                    template,
                    activityId,
                    useCache,
                    onMapperProgress,
                    onMapperCreated
                );

                function onMapperCreated( err , newMapper ) {

                    if ( err ) { return itcb( err ); }
                    mapper = newMapper;
                    mapperContext = newMapper && newMapper.context;

                    //  may have changed during initialization of form, will be needed when updating activity with document
                    //mapperContext.activity.userContent = activity.userContent;
                    //mapperContext.activity.formId = activity.formId;
                    //mapperContext.activity.formVersion = activity.formVersion;

                    if ( mapData && 'object' === typeof mapData && template ) {
                        template.map( mapData, false, itcb );
                        return;
                    }

                    itcb( null );
                }

                function onMapperProgress( /* evt */ ) {
                    //console.log( '(****) mapper progress on form creation: ', evt );
                }
            }

            //  6.  Save the form document after initial mapping (also update activity)
            function saveDocument( itcb ) {
                if( mapperContext && mapperContext.attachments ) {
                    mapperContext.attachments.updateFormDoc( mapperContext, template, onUpdateFormDoc );
                } else {
                    return itcb( null );
                }
                function onUpdateFormDoc( err ) {
                    if ( err ) { return itcb( err ); }
                    //  update the set of attachments on activity to include any new form document
                    mapperContext.attachments.updateActivity( activity );
                    itcb( null );
                }
            }

            //  TODO: check that document and activity links are correct
            //  TODO: check that formId and formVersionId are saved

            //  X.
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not initialize form on server: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, activity, template, mapper, mapperContext );
           }
        }

        /**
         *  Remap a form copied into a new context (used by activitysequences / kette)
         *
         *  @param  {Object}    user        REST user or equivalent
         *  @param  {String}    activityId  Database _id of an activity
         *  @param  {Object}    rCache      Reporting cache which may contain context
         *  @param  {Function}  callback
         */

        async function remapInNewContext( user, activityId, rCache, callback ) {
            const
                useCache = rCache ? rCache : Y.doccirrus.insight2.reportingCache.createReportingCache(),

                loadOrGetP = util.promisify( useCache.loadOrGet ),
                setupMapperForActivityP = util.promisify( setupMapperForActivity );

            let
                mapperName = 'incase',

                err,
                activity,
                template,
                mapper,
                mapperContext;

            //  utility to catch and silence spurious progress events, MOJ-11026
            function onProgress( evt ) {
                if ( evt.hasOwnProperty( 'percent' ) ) {
                    Y.log( `Remap in new context, mapper progress: ${evt.percent}`, 'debug', NAME );
                }
            }

            //  (1) Load the activity, using preloaded version in reporting cache if possible
            [ err, activity ] = await formatPromiseResult( loadOrGetP( user, 'activity', activityId ) );

            if ( err ) {
                Y.log( `Could not load activity ${activityId} via reporting cache: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            //  (2) Instantiate the form template for this activity
            [ err, template ] = await formatPromiseResult( createTemplateP( user, activity.formId, activity.formVersion ) );
            if ( err ) {
                Y.log( `Could not create form template ${activity.formId}-v-${activity.formVersion} for activity ${activityId}:: ${err.stack||err}`, 'warn', NAME );
                return callback( err );
            }

            //  (3) Create a mapper and context
            if ( template.reducedSchema && '' !== template.reducedSchema ) { mapperName = template.reducedSchema; }

            [ err, mapper ] = await formatPromiseResult( setupMapperForActivityP( user, mapperName, template, activityId, null, onProgress ) );
            if ( err ) {
                Y.log( `Could not create form mapper ${mapperName} for activity ${activityId}: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            mapperContext = mapper.context;

            //  (4) Remap the form
            const remapP = util.promisify( mapper.map );

            [ err ] = await formatPromiseResult( remapP() );

            if ( err ) {
                Y.log( `Could not remap form: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            //  (5) Update the form document
            const updateFormDocP = util.promisify( mapperContext.attachments.updateFormDoc );
            [ err ] = await formatPromiseResult( updateFormDocP( mapperContext, template ) );

            if ( err ) {
                Y.log( `Could not remap form: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            callback( null );
        }

        /**
         *  Utility function, promise to create a form template
         *
         *  TODO: move to server form utils
         *
         *  @param itcb
         */
        //  Promise to create a form template
        function createTemplateP( user, formId, formVersion ) {
            function wrapCreateTemplate( resolve, reject ) {
                var
                    templateOptions = {
                        'user': user,
                        'canonicalId': formId,
                        'formVersionId': formVersion,
                        'callback': onTemplateLoaded
                    };

                Y.dcforms.createTemplate( templateOptions );

                function onTemplateLoaded( err, newTemplate ) {
                    if ( err ) { return reject( err ); }
                    resolve( newTemplate );
                }
            }
            return new Promise( wrapCreateTemplate );
        }

        /**
         *  Save a placeholder form document to the database
         *
         *  Used when creating an activity on the server, and we don't want to trigger an extra save of the activity
         *  to link the form (rules running too often in MOJ-10966, EXTMOJ-1985
         *
         *  @param  {String}    activityId
         *  @param  {String}    formId
         *  @param  {String}    formVersionId
         *  @return {Promise<void>}
         */

        async function createStubFormDocument( user, activityId, locationId, formId, formVersionId ) {

            let
                err, result,

                newDoc = {
                    type: 'FORM',
                    contentType: 'dc/form',
                    formId: formId,
                    formInstanceId: formVersionId,
                    formData: 'remap',
                    formState: { 'remap': true },
                    mapData: {},
                    usesMedia: [],
                    publisher: '',
                    activityId: `${activityId}`,
                    printerName: '',
                    locationId: `${locationId}`,
                    createdOn: (new Date()).toJSON(),
                    accessBy: [],
                    attachedTo: `${activityId}`,
                    caption: `stub`,
                    isEditable: false
                },

                postRequest = {
                    user: user,
                    model: 'document',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( newDoc )
                };

            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( postRequest ) );

            if ( err ) {
                Y.log( `Could not save stub document: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            if ( result && result[0] ) {
                newDoc._id = result[0];
            }

            return newDoc;
        }

        function inStockOrderContext( user, template, order, onProgress, callback) {
            var
                async = require( 'async' ),
                moment = require( 'moment' ),
                mapper,
                mapperContext = {},
                firstMapEvent = true;

            async.series(
                [
                    createContext,
                    createMapper
                ],
                onAllDone
            );

            //  1. Load activity and related objects from database into context for generic form mappers
            function createContext( itcb ) {
                var
                    electronicData = order.electronicData || {},
                    dateFormat =  'DD.MM.YYYY',
                    stock,
                    i;
                
                order.supplierAddress = order.supplier ? order.supplier.addresses || [] : [];
                order.dateSent = moment(order.dateSent).format(dateFormat);
                order.dateCreated = moment(order.dateCreated).format(dateFormat);
                order.supplierId = electronicData.humanReadableCartNumber ? electronicData.humanReadableCartNumber : '';

                order.supplierCustomerId = '';
                if ( order.supplier && order.supplier.supplierCustomerId ) {
                    order.supplierCustomerId = order.supplier.supplierCustomerId;
                }

                //  try to find stock locations and add name and description to the table
                if ( order.stocks ) {
                    for ( i = 0; i < order.stocks.length; i++ ) {
                        stock = order.stocks[i];
                        stock.stockLocationName = '';
                        stock.stockLocationDescription = '';

                        if ( stock.stockLocation && stock.stockLocation ) {
                            stock.stockLocationName = stock.stockLocation.title;
                            stock.stockLocationDescription = stock.stockLocation.description;
                        }

                        if ( order.stockItems && order.stockItems[i] ) {
                            order.stockItems[i].stockLocationName = stock.stockLocationName;
                            order.stockItems[i].stockLocationDescription = stock.stockLocationDescription;
                        }
                    }
                }

                mapperContext.order = order;
                itcb( null );
            }

            //  2. Create a new form mapper instance according to form schema and context
            function createMapper( itcb ) {
                function onMapComplete( ) {

                    if (false === firstMapEvent) {
                        Y.log( 'Template has sent more the one "mapcomplete" event for this form', 'warn', NAME );
                        return;
                    }

                    firstMapEvent = false;

                    Y.log( 'Form has been mapped on server by: ' + template.mapperName, 'debug', NAME );
                    itcb( null );
                }

                onOwnProgress( { percent: 60, label: 'Instantiating mapper...' } );

                //  subscribe to mapper, this will be called when current form has been initialized with new mapper
                template.on( 'mapcomplete', 'server-side-render', onMapComplete );

                        template.mapperName = 'instock';
                        mapper = Y.dcforms.mapper.instock( template, mapperContext );
            }

            //  Finally, ensure that callback is only invoked once
            function onAllDone(err) {
                if ( err ) {
                    Y.log( 'Problem applying mapper context for activity: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'Order is mapped into form.', 'debug', NAME );
                onOwnProgress( { percent: 100, label: 'Form mapper ready.' } );

                mapper.context = mapperContext;
                callback( null, mapper );
            }

           //  Progress updates raised by self
           function onOwnProgress( evt ) {
                evt.mapId = order._id;

                if ( onProgress && 'function' === typeof onProgress ) {
                    onProgress( evt );
                } else {
                    evt.targetId = user.identityId;
                    Y.dcforms.raisePdfProgressEvent( evt );
                }
            }
        }

        /**
         *  Mapper context for making reporting entries from calendar events, moved from calevent API
         *
         *  @param  {Object}    user
         *  @param  {String}    scheduleId
         *  @param  {Function}  callback
         */

        function createScheduleMapperContext( user, scheduleId, callback ) {

            let context = {};

            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                async = require( 'async' );

            async.waterfall( [
                function getScheduleModel( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'schedule', ( err, model ) => {
                            if( err ) {
                                Y.log( `Error in createScheduleMapperContext. Can't get schedule model. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            model.mongoose.findOne( {_id: new ObjectId( scheduleId )}, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createScheduleMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.schedule = res && res.toObject();

                                return next( null, context );
                            } );
                        }
                    );
                },

                function getCalendarModel( ctx, next ) {
                    if( context.schedule && context.schedule.calendar ) {
                        Y.doccirrus.mongodb.getModel( user, 'calendar', ( err, model ) => {
                                if( err ) {
                                    Y.log( `Error in createScheduleMapperContext. Can't get calendar model. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                model.mongoose.findOne( {_id: context.schedule.calendar}, ( err, res ) => {
                                    if( err ) {
                                        Y.log( `Error in createScheduleMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                    context.calendar = res && res.toObject();
                                    return next( null, context );
                                } );
                            }
                        );
                    } else {
                        return next( null, context );
                    }
                },

                function getScheduletypeModel( ctx, next ) {
                    if( context.schedule && context.schedule.scheduletype ) {
                        Y.doccirrus.mongodb.getModel( user, 'scheduletype', ( err, model ) => {
                                if( err ) {
                                    Y.log( `Error in createScheduleMapperContext. Can't get scheduletype model. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                model.mongoose.findOne( {_id: new ObjectId( context.schedule.scheduletype )}, ( err, res ) => {
                                    if( err ) {
                                        Y.log( `Error in createScheduleMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                    context.scheduletype = res && res.toObject();
                                    return next( null, context );
                                } );
                            }
                        );
                    } else {
                        return next( null, context );
                    }
                },

                function getPatientModel( ctx, next ) {
                    if( context.schedule && context.schedule.patient ) {
                        Y.doccirrus.mongodb.getModel( user, 'patient', ( err, model ) => {
                                if( err ) {
                                    Y.log( `Error in createScheduleMapperContext. Can't get patient model. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                model.mongoose.findOne( {_id: context.schedule.patient}, ( err, res ) => {
                                    if( err ) {
                                        Y.log( `Error in createScheduleMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                    context.patient = res && res.toObject();
                                    return next( null, context );
                                } );
                            }
                        );
                    } else {
                        return next( null, context );
                    }
                },

                function getEmployeeModel( ctx, next ) {
                    if( context.task && context.schedule.employee ) {
                        Y.doccirrus.mongodb.getModel( user, 'employee', ( err, model ) => {
                                if( err ) {
                                    Y.log( `Error in createScheduleMapperContext. Can't get employee model. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                model.mongoose.findOne( {_id: context.schedule.employee}, ( err, res ) => {
                                    if( err ) {
                                        Y.log( `Error in createScheduleMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                    context.employee = res && res.toObject();
                                    return next( null, context );
                                } );
                            }
                        );
                    } else {
                        return next( null, context );
                    }
                }

            ], ( err ) => {
                callback( err, context );
            } );

        }

        //  add module

        Y.namespace( 'doccirrus.forms' ).mappinghelper = {
            getMapperForActType,
            createActivityMapperContext,
            createCaseFolderTableMapperContext,
            createReportMapperContext,
            createScheduleMapperContext,
            setupMapperForActivity,
            initializeFormForActivity,
            remapInNewContext,
            createStubFormDocument,
            inStockOrderContext
        };

    },
    '0.0.1',
    {
        requires: [ 'reporting-cache' ]
    }
);
