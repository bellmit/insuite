/**
 * User: strix
 * Date: 11/02/2014  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jshint latedef:false */


/**
 * Prescription state machine implemented to add Weitere / Repeat action to prescription activities - a KBV compliant way
 * to repeat or duplicate a transition, see MOJ-2597 for details
 *
 * NB: the states and transitions are defined in activity-schema, this is an interchangeable unit of business
 * logic which is used to validate state changes.  Member names correspond to transitions, and all have a
 * common form called on the server by a REST action on CaseFileMojit.
 *
 * When calling back an error, the error message should refer to the CaseFileMojit il8n dictionary, so
 * that the client can inform the user about what needs to be done to before the transition will complete.
 *
 * Multiple error messages / informational strings can be comma separated (you need to do x,y,z first).
 *
 * @module activity-fsm
 */
YUI.add( 'dc-fsm-prescription', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-prescription
         * @requires activity-schema
         */

        var
            moment = require( 'moment' ),
            transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * Repeat an existing AU. Also copies and assigns diagnosis to new AU.
         *
         * @param {Object}          user
         * @param {Object}          activity
         * @param {Boolean}         isTest
         * @param {Function}        callback
         *
         * @return {Promise}
         */
        function repeatAU( user, activity, isTest, callback ) {

            var Prom = require( 'bluebird' ),
                _ = require( 'lodash' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
                now = new Date(),
                newActId = null;

            function getParent( parentId ) {
                if( !parentId ) {
                    Y.log('repeating AU: parentId not set, use this activity as parent', 'debug', NAME );
                    return Prom.resolve( activity );
                }
                Y.log( 'repeating AU: get parent ' + parentId, 'debug', NAME );
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: parentId
                    }
                } ).then( function( activities ) {
                    var parent = activities && activities[0];
                    if( !parent ) {
                        throw new Error( 'could not find parent' );
                    }
                    return parent;
                } );
            }

            function updateParent( parent ) {
                var noOfRepetitions;
                noOfRepetitions = parent.noOfRepetitions ? (parent.noOfRepetitions + 1) : 1;
                parent.noOfRepetitions = noOfRepetitions;
                Y.log( 'repeating AU: update parent with new noOfRepetitions ' + noOfRepetitions, 'debug', NAME );
                return runDb( {
                    user: user,
                    action: 'put',
                    model: 'activity',
                    query: {
                        _id: parent._id
                    },
                    data: {
                        noOfRepetitions: noOfRepetitions,
                        skipcheck_: true
                    },
                    fields: ['noOfRepetitions']
                } );
            }

            function copyIcd( diagnosis ) {
                var diagnosisCopy = JSON.parse( JSON.stringify( diagnosis ) );

                delete diagnosisCopy._id;

                _.assign( diagnosisCopy, {
                    timestamp: now,
                    status: 'VALID',
                    skipcheck_: true
                } );

                return runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: diagnosisCopy
                } ).then( function( result ) {
                    return result[0];
                } );
            }

            function copyIcds( icds ) {
                if( !icds || !icds.length ) {
                    Y.log( 'repeating AU: AU has no diagnoses', 'debug', NAME );
                    return Prom.resolve( [] );
                }
                Y.log( 'repeating AU: get AU icds ' + icds, 'debug', NAME );
                return runDb( {
                    user: user,
                    model: 'activity',
                    query: {
                        _id: {$in: icds}
                    }
                } ).map( copyIcd ).filter( Boolean );
            }

            function saveCopy( copy ) {
                return function( icds ) {
                    copy.icds = icds || [];
                    return runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: copy
                    } ).then( function onParentCopied( result ) {
                        //  MOJ-8309 return _id of new repetition to load in client
                        newActId = ( result && result[0] ) ? result[0] : null;
                        Y.log( 'Returning new AU activity id: ' + newActId, 'debug', NAME );
                        return result;
                    } );
                };
            }

            function copyParent( parent ) {
                const copy = JSON.parse( JSON.stringify( parent ) );

                //use most recent icds or from master activity if empty
                if( activity.icds && activity.icds.length ){
                    copy.icds = activity.icds;
                }

                const icds = copy.icds;
                const daysSinceFirstAU = Math.abs( moment( now ).diff( parent.auVon, 'days' ) );

                delete copy._id;
                delete copy.auVorraussichtlichBis;


                _.assign( copy, {
                    status: 'VALID',
                    timestamp: now,
                    festgestelltAm: now,
                    parentPrescriptionId: parent._id.toString(),
                    attachments: [],
                    erstBesch: false,
                    folgeBesc: true,
                    krankengeld: daysSinceFirstAU > 42,
                    skipcheck_: true
                } );

                return copyIcds( icds ).then( saveCopy( copy ) );
            }

            return getParent( activity.parentPrescriptionId )
                .then( updateParent )
                .then( copyParent )
                .then( function() {
                    Y.log('successfully repeated AU ' + activity._id, 'info', NAME);
                    callback( null, activity.status, newActId );
                } )
                .catch( function( err ) {
                    Y.log( 'could not create repeated AU ' + err.stack, 'error', NAME );
                    callback( err );
                } );
        }

        /**
         *  Utility method to make a duplicate copy of an object in the database, might be moved somewhere more central
         *
         *  @param  user            {Object}    REST user object or equivalent
         *  @param  collection      {String}    Collection holding object to be copied
         *  @param  id              {String}    Database _id of new object
         *  @param  updateFields    {Object | Function}    Object, keys and values of fields to update, or function that modifies the original data.
         *  @param  callback        {Function}  Of the form fn(err)
         */

        function copyDbObject( user, collection, id, updateFields, callback ) {

            loadDbObject();
            function loadDbObject() {
                var
                    dbSetup = {
                        user: user,
                        model: collection,
                        action: 'get',
                        query: {'_id': id },
                        options: { }
                    };

                Y.doccirrus.mongodb.runDb( dbSetup, onObjectLoaded );
            }

            function onObjectLoaded( err, result ) {

                var
                    dbSetup = {
                        user: user,
                        model: collection,
                        action: 'post',
                        data: result[0],
                        options: { }
                    },
                    k;

                function save() {
                    //  let it assign a new _id
                    delete dbSetup.data._id;

                    dbSetup.data = Y.doccirrus.filters.cleanMongoObject( dbSetup.data, Y.doccirrus.schemas[collection] );
                    Y.doccirrus.mongodb.runDb( dbSetup, onObjectSaved );
                }

                if( err ) {
                    Y.log( 'Could not copy object ' + collection + '::' + id + ':' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Objects loaded: ' + collection + '::' + id + ' - ' + result.length, 'info', NAME );

                if( 0 === result.length ) {
                    callback( new Error( 'Could not load from ' + collection + ' database' ) );
                    return;
                }

                if( 'function' === typeof updateFields ) {
                    updateFields( dbSetup.data, save );
                } else {
                    for( k in updateFields ) {
                        if( updateFields.hasOwnProperty( k ) ) {
                            Y.log( 'Updating field: ' + k + ' ' + updateFields[k], 'info', NAME );
                            dbSetup.data[k] = updateFields[k];
                        }
                    }
                    save();
                }
            }

            function onObjectSaved( err, result ) {
                if( err ) {
                    Y.log( 'Could not copy object ' + collection + '::' + id + ':' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Object saved: ' + collection + '::' + id, 'info', NAME );
                //Y.log('on object saved calls back: ' + JSON.stringify(result));
                callback( null, result[0] );
            }
        }

        /**
         * State machines for invoices (does not include schein)
         *
         * @class dc-fsm-prescription
         * @namespace doccirrus.fsm
         * @static
         */
        Y.namespace( 'doccirrus.fsm' )[NAME] = {

            /**
             * @property transitions
             * @type {Object}
             */
            transitions: transitions,
            /**
             * @property name
             * @type {String}
             * @protected
             */
            name: NAME,

            /**
             * The primary state change. Only here will you see a POST
             * i.e. doc without an _id. In other transitions, the record will always
             * be handled by PUT.
             *
             *  @method validate
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            validate: function( user, options, activity, isTest, callback ) {
                var
                    fsmName;
                fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                // 1. validate all linked treatments
                // TODO
                // 2. validate all diagnoses
                // TODO
                // 3. validate the invoice itself
                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method  approve
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  TODO: remove printOnPApprove and replace with option
             *
             *  @param  {Function}  options.onPdfGenerated Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}  options.onPdfProgress Called repeatedly as PDF is generated (optional)
             */
            approve: function( user, options, activity, isTest, callback ) {

                let
                    fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();

                if ( activity.printOnApprove ) {
                    //  after an invoice is approved we should update the VAT and other fields which may have been
                    //  recalculated by the mapper

                    options.printOnApprove = activity.printOnApprove;
                    delete activity.printOnApprove;
                }

                function onDefaultApprove( err, newState ) {

                    if( err ) {
                        Y.log( 'Could not approve invoice: ' + JSON.stringify( err ), 'warn', NAME );
                        callback( err );
                        return;
                    }

                    function onVATChangesSaved( err ) {
                        callback( err, newState );
                    }

                    var
                        dbData = {
                            'fields_': [ 'content' ],
                            'skipcheck_': true,
                            'content': activity.content
                        },
                        dbSetup = {
                            'user': user,
                            'model': 'activity',
                            'action': 'put',
                            'query': { '_id': (activity._id + '') },
                            'data': dbData,
                            'options': { ignoreReadOnly: true }
                        };

                    Y.doccirrus.mongodb.runDb( dbSetup, onVATChangesSaved );
                }

                Y.doccirrus.fsm[ fsmName ].approve( user, options, activity, isTest, onDefaultApprove );
            },

            /**
             *  @method delete
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method  cancel
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                // 1. change all linked treatments back to approved
                // TODO
                // 2. change all diagnoses back to approved
                // TODO
                // 3. cancel the invoice

                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             * Special transition to store a valid activity which has an invalid form, into state created
             * Similar to validate, but returns state 'CREATED'
             */

            store: function( user, options, activity, isTest, callback ) {
                var self = this;
                if ( !options ) { options = {}; }
                options.toState = 'CREATED';
                self.validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            archive: function( user, options, activity, isTest, callback ) {
                //  TODO: update linked treatments to this state on success

                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'ARCHIVED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  Special transition for quickPrint functionality
             *
             *  DEPRECATED
             *
             *  @method approveandprint
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */
            'approveandprint': function( user, options, activity, isTest, callback ) {
                var self = this;
                //  a little hacky, but simple
                activity.printOnApprove = true;
                self.approve(  user, options, activity, isTest, callback );
            },
            
            /**
             *  Duplicate a prescription and all of its medication entries
             *
             *  Note that this activity does not change 'status' of the original, what it does:
             *
             *      (*) Copy all medication activities linked by this prescription
             *      (*) Update medication, if mmi is enabled and pzn is available
             *      (*) Copy the prescription activity
             *      (*) Increment the noOfRepetitions field on the child prescription and parent as well
             *
             *  Overall process:
             *
             *      1. Check whether MMI service is enabled
             *      2. Load this activity's patient, get DOB and IKNR (insuranceId, policy number?).
             *      3. Load location for current activity, get BSNR
             *      4. load employee associated with current activity
             *      5. Load the original (parent) prescription activity
             *      6. Set new values on copy of parent
             *      7. Copy all medication activities linked from current activity
             *      8. Make copies of all attachments to this activity
             *      9. Copy the activity itself, with modifications collected in updatePrescription
             *      10. Update attached documents, relink to new activity
             *      11. Update the original parent prescription with number of repetitions
             *      X. Finally, call back with original status
             *
             *  @method repeat
             *  @param   {Object}     user          REST user or equivalent
             *  @param   {Object}     options       Extra options for event emitters, printing, etc
             *  @param   {Object}     activity     see activity-schema.common.js
             *  @param   {Boolean}    isTest        True if validation only, activity.status will not be changed
             *  @param   {Function}   callback      Of the form fn( err, newState )
             */

            repeat: function( user, options, activity, isTest, callback ) {
                var
                    async = require( 'async' ),
                    ObjectId = require( 'mongoose' ).Types.ObjectId,
                    mmiEnabled = false,
                    dob,
                    iknr,
                    bsnr,
                    lanr,
                    parent,
                    attachmentIds = [],
                    updatePrescription,
                    caseFolderType,
                    newActId = new ObjectId().toString();

                if( 'AU' === activity.actType ) {
                    return repeatAU( user, activity, isTest, callback );
                }

                async.series(
                    [
                        checkMMI,
                        loadCaseFolder,
                        loadPatient,
                        loadLocation,
                        loadEmployee,
                        loadParent,
                        updateParent,
                        copyMedications,
                        copyAttachments,
                        copyActivity,
                        updateForm,
                        //updateAttachments,
                        saveParent
                    ],
                    onAllDone
                );

                //  0. Check whether MMI service is enabled
                function checkMMI( itcb ) {
                    Y.doccirrus.api.mmi.getMetaData( { callback: isMmiEnabled } );

                    function isMmiEnabled( err, data ) {
                        if( err || !data ) {
                            Y.log( 'MMI not enabled, do not update medication copies: ' + err, 'info', NAME );
                        } else {
                            mmiEnabled = true;
                        }
                        itcb( null );
                    }
                }

                //  1. load casefolder associated with current activity
                async function loadCaseFolder( itcb ) {
                    let [err, caseFolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        query: {_id: activity.caseFolderId},
                        options: {
                            select: {
                                type: 1
                            },
                            limit: 1
                        }
                    } ) );

                    if( err ) {
                        Y.log( `loadCaseFolder: could not fetch case folder ${activity.caseFolderId}: ${err.stack || err}`, 'warn', NAME );
                    }

                    caseFolderType = caseFolders && caseFolders[0] && caseFolders[0].type;

                    itcb( null );
                }

                //  2. Load this activity's patient, get DOB and IKNR (insuranceId, policy number?).
                function loadPatient( itcb ) {
                    //  TODO: make this lean
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        query: { _id: activity.patientId },
                        callback: patientCb
                    } );

                    function patientCb( err, patient ) {
                        if( err || !patient || !patient.length ) {
                            err = err || new Error( 'Patient for activity Not Found' );
                            Y.log( 'Could not get activities patient for repeating prescriptions: ' + err, 'error', NAME );
                            return itcb( err );
                        }

                        patient = patient[0];
                        dob = patient.dob;

                        if( patient.insuranceStatus ) {
                            patient.insuranceStatus.some( function( status ) {
                                // MOJ-14319: [OK] [CASEFOLDER]
                                if( caseFolderType && caseFolderType === status.type || !caseFolderType && 'PUBLIC' === status.type ) {
                                    iknr = status.insuranceId;
                                    return true;
                                }
                            } );
                        }

                        itcb( null );
                    }
                }

                //  3. Load location for current activity, get BSNR
                function loadLocation( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'location',
                        query: { _id: activity.locationId },
                        callback: locationCb
                    } );

                    function locationCb( err, location ) {
                        if( err || !location || !location.length ) {
                            err = err || new Error( 'location for activity Not Found' );
                            Y.log( 'Could not get activities location for repeating prescriptions: ' + err, 'error', NAME );
                            return itcb( err );
                        }

                        location = location[0];
                        bsnr = location.commercialNo;
                        itcb( null );
                    }
                }

                //  4. load employee associated with current activity
                function loadEmployee( itcb ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        query: { _id: activity.employeeId },
                        callback: employeeCb
                    } );

                    function employeeCb( err, employee ) {
                        if( err || !employee || !employee.length ) {
                            err = err || new Error( 'employee for activity Not Found' );
                            Y.log( 'Could not get activities employee for repeating prescriptions: ' + err, 'error', NAME );
                            return itcb( err );
                        }

                        employee = employee[0];
                        lanr = employee.officialNo;
                        itcb( null );
                    }
                }

                //  5. Load the original (parent) prescription activity
                function loadParent( itcb ) {
                    var  hasParent = Boolean( activity.parentPrescriptionId );

                    //  if no parent to load then we can skip this step
                    if( !hasParent ) {
                        parent = activity;
                        return itcb( null );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: { _id: activity.parentPrescriptionId },
                        callback: getParentCb
                    } );

                    function getParentCb( err, _parent ) {
                        if( err || !_parent || !_parent.length ) {
                            err = err || new Error( 'Parent Activity Not Found' );
                            Y.log( 'Could not get parent activity for repeating prescriptions: ' + err, 'error', NAME );
                            callback( err );
                            return;
                        }
                        parent = _parent[0];
                        itcb( null );
                    }
                }

                //  6. Set new values on copy of parent
                function updateParent( itcb ) {
                    parent.noOfRepetitions = parent.noOfRepetitions ? ++parent.noOfRepetitions : 1;
                    setUpdatePrescription( parent.noOfRepetitions, parent._id.toString() );

                    function setUpdatePrescription( noOfRepetitions, parentId ) {
                        var timeNow = moment();
                        updatePrescription = {
                            '_id': newActId,
                            'noOfRepetitions': noOfRepetitions,
                            'timestamp': timeNow.format( 'YYYY-MM-DD HH:mm Z' ),
                            'scheinYear': timeNow.format( 'YYYY' ),
                            'scheinQuarter': timeNow.format( 'Q' ), //moment( moment(), 'Q' ),
                            'activities': [],
                            'parentPrescriptionId': parentId,
                            'attachments': [],
                            "status" : "VALID"
                        };
                    }

                    itcb( null );
                }

                //  7. Copy all medication activities linked from current activity
                //     Will try to update the medication from MMI if possible
                async function copyMedications( itcb ) {
                    // TODO: straighten this out and document it
                    var
                        medicationsToCopy = [],
                        updateMedication = {
                            'timestamp': moment( moment(), "YYYY-MM-DD HH:mm Z" ),
                            'scheinYear': moment( moment(), "YYYY" ),
                            'scheinQuarter': moment( moment(), 'Q' )
                        },
                        i;

                    let err, result;
                    // check if medications not discontinued
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        query: {
                            _id: {$in: activity.activities},
                            $or: [
                                { noLongerValid: { $exists: false } },
                                { noLongerValid: false }
                            ]
                        },
                        user,
                        options: {}
                    } ) );
                    if ( err ) {
                        Y.log( `Failed to get medications: ${err.stack || err}`, 'error', NAME );
                        return callback( err, activity );
                    }

                    // checking and remove already discontinued medications
                    let loadedMedications = result.filter( ( i ) => {
                        return -1 !== activity.activities.indexOf( i._id.toString() );
                    }).map( i => i._id );
                    activity.activities = loadedMedications;
                    for( i = 0; i < activity.activities.length; i++ ) {
                        medicationsToCopy.push( activity.activities[i] );
                    }

                    async.eachSeries( medicationsToCopy, copySingleMedication, itcb );

                    function copySingleMedication( nextMedication, medicationCb ) {
                        Y.log( 'Copying medication: ' + nextMedication, 'info', NAME );

                        copyDbObject(
                            user,                       //  REST user object or equivalent
                            'activity',                 //  Collection holding object to be copied
                            nextMedication,             //  Database _id of new object
                            updateMedicationData,       //  Object, keys and values of fields to update, or function that modifies the original data.
                            onMedicationCopied          //  Of the form fn(err)
                        );

                        function onMedicationCopied( err, newId ) {
                            if( err ) {
                                Y.log( 'Could not copy linked medication activity for repeating prescription: ' + JSON.stringify( err ), 'warn', NAME );
                                return medicationCb( err );
                            }

                            //  new prescription will link to new medication
                            updatePrescription.activities.push( newId );
                            medicationCb( null );
                        }
                    }

                    //  try to update medication activity from MMI API before saving a copy
                    function updateMedicationData( data, _cb ) {
                        var dataToUpdate = {};

                        function merge() {
                            var k;
                            dataToUpdate = Y.merge( dataToUpdate, updateMedication );
                            for( k in dataToUpdate ) {
                                if( dataToUpdate.hasOwnProperty( k ) ) {
                                    Y.log( 'Updating medication field: ' + k + ' ' + dataToUpdate[k], 'info', NAME );
                                    data[k] = dataToUpdate[k];
                                }
                            }
                            _cb();
                        }

                        function mappedProductCb( err, product ) {
                            if( err ) {
                                _cb();
                                return;
                            }
                            dataToUpdate = product;
                            merge();
                        }

                        if( mmiEnabled && data.phPZN ) {
                            Y.doccirrus.api.mmi.getMappedProduct( {
                                query: {
                                    phPZN: data.phPZN,
                                    patientDob: dob,
                                    insuranceIknr: iknr,
                                    bsnr: bsnr,
                                    lanr: lanr
                                },
                                callback: mappedProductCb
                            } );
                        } else {
                            merge();
                        }
                    }
                }


                //  8. Make copies of all attachments to this activity
                function copyAttachments( itcb ) {
                    Y.doccirrus.activityapi.copyActivityAttachments( user, false, activity, newActId, onAttachmentsCopied );

                    function onAttachmentsCopied( err, newAttachmentIds ) {
                        if ( err ) {
                            Y.log( 'Problem copying attachments: ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        if ( newAttachmentIds ) {
                            attachmentIds = newAttachmentIds;
                        }

                        Y.log( 'Done copying attachments, copying prescription: ' + activity._id, 'info', NAME );
                        Y.log( 'New date: ' + updatePrescription.timestamp, 'info', NAME );

                        updatePrescription.attachments = attachmentIds;
                        itcb( null );
                    }
                }


                //  9. Copy the activity itself, with modifications collected in updatePrescription
                function copyActivity( itcb ) {
                    copyDbObject(
                        user,                       //  REST user object or equivalent
                        'activity',                 //  Collection holding object to be copied
                        activity._id,               //  Database _id of object to copy
                        updatePrescription,         //  Object, keys and values of fields to update
                        onRepetitionCreated         //  Callback of the form fn(err)
                    );

                    function onRepetitionCreated( err, newId ) {
                        if( err ) {
                            Y.log( 'Could not copy prescription activity: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        newActId = newId;
                        Y.log( 'Created new repetition activity with _id: ' + newId, 'debug', NAME );
                        itcb( null );
                    }
                }

                //  10. Remap the prescription form to show any changes to Personalienfeld, etc
                function updateForm( itcb ) {
                    Y.doccirrus.forms.mappinghelper.remapInNewContext( user, newActId.toString(), null, onFormRemapped );
                    function onFormRemapped( err ) {
                        itcb( err );
                    }
                }

                //  11. Update the original parent prescription with number of repetitions
                function saveParent( itcb ) {
                    //mongooselean:save_fix
                    //  if no parent to update then we can skip this step
                    if ( !parent) { return itcb( null ); }

                    //  if custom method to handle update of parent
                    if( parent.save ) {
                        parent.save( parentSaved );
                        return;
                    }

                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'activity',
                            action: 'put',
                            data: Y.doccirrus.filters.cleanDbObject( {
                                noOfRepetitions: parent.noOfRepetitions
                            } ),
                            fields: 'noOfRepetitions',
                            query: {
                                _id: parent._id
                            },
                            callback: parentSaved
                        }
                    );

                    function parentSaved( err ) {
                        if( err ) {
                            Y.log( 'Could not save parent prescription activity: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        itcb( null );
                    }
                }

                //  X. Finally, call back with original status
                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Could not repeat prescription: ' + JSON.stringify( err ), 'debug', NAME );
                        return callback( err );
                    }

                    //  Does not change state of original activity, just call back
                    Y.log( 'Copied prescription activity to ' + newActId + ' with medications ' + JSON.stringify( updatePrescription.activities ), 'info', NAME );
                    callback( null, activity.status, newActId );
                }

            }

        };

    },
    '0.0.1', { requires: ['activity-schema'] }
);
