/**
 * User: do
 * Date: 07/03/2017  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


/**
 * NB: the states and transitions are defined in activity-schema, this is an interchangeable unit of business
 * logic which is used to validate state changes.  Member names correspond to transitions, and all have a
 * common form called on the server by a REST action on CaseFileMojit.
 *
 * When calling back an error, the error message should refer to the CaseFileMojit il8n dictionary, so
 * that the client can inform the user about what needs to be done to before the transition will complete.
 *
 * Multiple error messages / informational strings can be comma separated (you need to do x,y,z first).
 *
 */
YUI.add( 'dc-fsm-kbvutility', function( Y, NAME ) {

        /**
         * @module activity-fsm
         * @submodule dc-fsm-kbvutility
         * @requires activity-schema
         */

        var transitions = Y.doccirrus.schemas.activity.getFSM( NAME ),
            Promise = require( 'bluebird' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            runDb = Y.doccirrus.mongodb.runDb;

        function getParentChain( user, rootId ) {
            return runDb( {
                user: user,
                model: 'activity',
                query: {
                    rootPrescriptionId: rootId,
                    status: {$in: ['VALID', 'APPROVED']}
                },
                options: {
                    lean: true,
                    sort: {
                        timestamp: -1
                    }
                }
            } );
        }

        function updateRootActivity( user, rootId, data ) {
            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: { _id: rootId },
                data
            } );
        }

        /**
         * State machines for KBVUTILITIES
         *
         * @class dc-fsm-kbvutility
         * @constructor
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
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            validate: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].validate( user, options, activity, isTest, callback );
            },

            /**
             *  @method approve
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             *
             *  Unique to this transition
             *
             *  @param  {Function}              options.onPdfGenerated  Called when PDF render queue has regenerated PDF for this activity (optional)
             *  @param  {Function}              options.onPdfProgress   Called repeatedly as PDF is generated (optional)
             */
            approve: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].approve( user, options, activity, isTest, callback );
            },

            /**
             *  @method delete
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            delete: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].delete( user, options, activity, isTest, callback );
            },

            /**
             *  @method cancel
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            cancel: function( user, options, activity, isTest, callback ) {
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[fsmName].cancel( user, options, activity, isTest, callback );
            },

            /**
             *  @method archive
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            archive: function( user, options, activity, isTest, callback ) {
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
             *  @method reject
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            reject: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'BILLINGREJECTED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method bill
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            bill: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'BILLED',
                    fast: (options.fast && true)
                }, callback );
            },

            /**
             *  @method pay
             *  @param  {Object}                user            REST user or equivalent
             *  @param  {Object}                options         Extra options for event emitters, printing, etc
             *  @param  {Boolean}               options.fast    Skip pre-and post-processes
             *  @param  {Object}                activity        see activity-schema.common.js
             *  @param  {Boolean}               isTest          True if validation only, activity.status will not be changed
             *  @param  {Function}              callback        Of the form fn( err, newState )
             */
            pay: function( user, options, activity, isTest, callback ) {
                //TODO: add any special handling or events here (InvoiceMojit, emails sent, etc)
                var fsmName = Y.doccirrus.schemas.activity.getDefaultFSMName();
                Y.doccirrus.fsm[ fsmName ]._changeState( {
                    user,
                    activity,
                    isTest,
                    toState: 'PAID',
                    fast: (options.fast && true)
                }, callback );
            },
            repeat: async function( user, options, activity, isTest, callback ) {
                const
                    rootActivityUpdateData = {},
                    pathsToDelete = [
                        '_id',
                        'attachedMedia',
                        'attachments',
                        'editor'

                    ],
                    kbvUtilityCopy = JSON.parse( JSON.stringify( activity ) );

                let rootActivity;

                //  MOJ-8309 Return new activity _id to client so that repetition can be loaded
                var newActId = null;

                pathsToDelete.forEach( function( path ) {
                    delete kbvUtilityCopy[path];
                } );

                kbvUtilityCopy.status = 'VALID';
                kbvUtilityCopy.skipcheck_ = true;
                kbvUtilityCopy.parentPrescriptionId = activity._id.toString();
                kbvUtilityCopy.rootPrescriptionId = (activity.rootPrescriptionId ? activity.rootPrescriptionId : activity._id.toString());
                kbvUtilityCopy.timestamp = new Date();
                kbvUtilityCopy.utRemedy1ParentsSeasons = 0;
                kbvUtilityCopy.utRemedy2ParentsSeasons = 0;
                kbvUtilityCopy.apkState = Y.doccirrus.schemas.activity.types.ApkState_E.default;
                // only switch from first to following
                if( 'FIRST' === activity.utPrescriptionType ) {
                    kbvUtilityCopy.utPrescriptionType = 'FOLLOWING';
                }

                // Invalidate prices of repeated kbvutility
                const utilityNames = kbvUtilityCopy.utRemedy1List.concat( kbvUtilityCopy.utRemedy2List ).map( function( utility ) {
                    utility.price = null; // clean existing prices
                    return utility.name;
                } );
                let [err, caseFolders] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.casefolder.get )( {
                    user,
                    query: {
                        _id: kbvUtilityCopy.caseFolderId
                    },
                    options: {
                        limit: 1
                    }
                } ) );
                if( err ) {
                    Y.log( `could not get caseFolder ${kbvUtilityCopy.caseFolderId} for repeating kbvutility: ${err.stack | err}`, 'warn', NAME );
                } else if( !caseFolders.length ) {
                    Y.log( `could not find caseFolder ${kbvUtilityCopy.caseFolderId} for repeating kbvutility: ${err.stack | err}`, 'warn', NAME );
                } else {
                    const insuranceType = caseFolders[0].type;
                    let patients;
                    [err, patients] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.patient.get )( {
                        user,
                        query: {
                            _id: kbvUtilityCopy.patientId
                        },
                        options: {
                            limit: 1
                        }
                    } ) );
                    if( err ) {
                        Y.log( `could not get patient ${kbvUtilityCopy.patientId} for repeating kbvutility: ${err.stack | err}`, 'warn', NAME );
                    } else if( !caseFolders.length ) {
                        Y.log( `could not find patient ${kbvUtilityCopy.patientId} for repeating kbvutility: ${err.stack | err}`, 'warn', NAME );
                    } else {
                        const patient = patients[0];
                        let insurance = patient.insuranceStatus.find( insuranceStatus => {
                            return insuranceStatus.type === insuranceType;
                        } );
                        if( !insurance ) {
                            Y.log( `patient ${patient._id} has no insurance of type ${insuranceType}`, 'warn', NAME );
                        } else if( !insurance.insuranceGrpId ) {
                            Y.log( `patient ${patient._id} has no insuranceGrpId`, 'warn', NAME );

                        } else {
                            let vknrSerialNo = Y.doccirrus.kbvcommonutils.getVknrSerialNo( insurance.insuranceGrpId );
                            let prices;
                            [err, prices] = await formatPromiseResult( promisifyArgsCallback( Y.doccirrus.api.kbvutilityprice.getPrices )( {
                                user,
                                originalParams: {
                                    insuranceType: insuranceType,
                                    utilityNames: utilityNames,
                                    locationId: kbvUtilityCopy.locationId,
                                    serialNo: vknrSerialNo
                                }
                            } ) );

                            if( err ) {
                                Y.log( `could not get prices for repeating kbvutility: ${err.stack | err}`, 'warn', NAME );
                            } else if( prices.length ) {
                                Y.log( `set new prices on repeating kbvutility`, 'debug', NAME );
                                kbvUtilityCopy.utRemedy1List.concat( kbvUtilityCopy.utRemedy2List ).forEach( function( utility ) {
                                    const utPrice = prices.find( priceConfig => utility.name === priceConfig.utilityName );
                                    if( utPrice ) {
                                        utility.price = utPrice.price;
                                    }
                                } );
                            }
                        }
                    }
                }

                getParentChain( user, activity.rootPrescriptionId || activity._id.toString() ).then( parentChain => {
                    rootActivity = 0 < parentChain.length ? parentChain[parentChain.length - 1] : activity;
                    (parentChain.length ? parentChain : [rootActivity].filter( Boolean )).forEach( ( kbvutility ) => {
                        kbvUtilityCopy.utRemedy1ParentsSeasons += (kbvutility.utRemedy1Seasons || 0);
                        kbvUtilityCopy.utRemedy2ParentsSeasons += (kbvutility.utRemedy2Seasons || 0);
                    } );

                    rootActivityUpdateData.rootPrescriptionId = kbvUtilityCopy.rootPrescriptionId;
                    rootActivityUpdateData.parentPrescriptionId = null;
                    rootActivityUpdateData.noOfRepetitions = kbvUtilityCopy.noOfRepetitions = rootActivity.noOfRepetitions ? ++rootActivity.noOfRepetitions : 1;
                    return runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: kbvUtilityCopy
                    } ).then( function( result ) {
                        newActId = result && result[0] ? result[0] : null;
                        Y.log( 'New KBVUTILITY activity _id: ' + newActId, 'debug', NAME );
                        return new Promise( ( resolve, reject ) => {
                            Y.doccirrus.forms.mappinghelper.initializeFormForActivity( user, newActId, {}, null, err => err ? reject( err ) : resolve() );
                        } );
                    } );
                } ).then( () => {
                    return updateRootActivity( user, rootActivity._id, rootActivityUpdateData );
                } ).then( () => {
                    callback( null, activity.status, newActId );
                } ).catch( err => {
                    Y.log( 'could not repeat kbvutility: ' + err, 'error', NAME );
                    callback( err );
                } );

            }

        };

    },
    '0.0.1', {requires: ['activity-schema', 'dccommonerrors', 'dcforms-mappinghelper']}
);