/**
 * User: pi
 * Date: 01/10/15  11:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'casefolder-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager,
            { formatPromiseResult, promisifyArgsCallback, handleResult } = require( 'dc-core' ).utils;

        function checkCaseFolderActivities( user, caseFolder, callback ) {
            //mark user to skip location restriction for deleting check
            const nonRestrictedByLocationUser = {...user, id: 'su'};

            Y.doccirrus.mongodb.runDb( {
                user: nonRestrictedByLocationUser,
                model: 'activity',
                migrate: true,
                action: 'count',
                query: {
                    caseFolderId: caseFolder._id && caseFolder._id.toString(),
                    patientId: caseFolder.patientId
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                if( results ) {
                    return callback( Y.doccirrus.errors.rest( 14000, Y.doccirrus.errorTable.getMessages( {code: 14000} ), true ) );
                }
                callback( null, caseFolder );
            } );
        }

        /**
         * when delete might be successful also delete activeCaseFolderId at patient if is same
         * @param {Object} user
         * @param {Object} caseFolder
         * @param {Function} callback
         */
        function deleteActiveCaseFolderIdAtPatient( user, caseFolder, callback ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'patient',
                migrate: true,
                user: user,
                query: {
                    _id: caseFolder.patientId,
                    activeCaseFolderId: caseFolder._id && caseFolder._id.toString()
                },
                data: Y.doccirrus.filters.cleanDbObject( {} ),
                fields: 'activeCaseFolderId',
                callback: function( error ) {
                    if( error ) {
                        return callback( error );
                    }
                    callback( null, caseFolder );
                }
            } );
        }

        function checkASVCaseFolder( user, casefolder, callback ) {
            if( Y.doccirrus.schemas.casefolder.additionalTypes.ASV === casefolder.additionalType ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'count',
                    migrate: true,
                    query: {
                        _id: casefolder.patientId,
                        'partnerIds.asvTeamNumbers': casefolder.identity
                    }
                }, function( err, count ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( 0 !== count ) {
                        return callback( Y.doccirrus.errors.rest( 14001, { $title: casefolder.title }, true ) );
                    }
                    callback( null, casefolder );
                } );
            } else {
                return callback( null, casefolder );
            }

        }

        function preventDeleting( user, casefolder, callback ) {
            var CARDIOfolders = [
                Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
                Y.doccirrus.schemas.patient.CardioOptions.CARDIACFAILURE,
                Y.doccirrus.schemas.patient.CardioOptions.STROKE
            ];
            if( !Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.ADMIN ) && !Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.identity.userGroups.SUPPORT ) && CARDIOfolders.indexOf( casefolder.additionalType ) >=0 ) {
                return callback( Y.doccirrus.errors.rest( 14003, {}, true ) );
            } else {
                return callback( null, casefolder );
            }
        }

        function setWasNew( user, casefolder, callback ) {
            casefolder.wasNew = casefolder.isNew;
            casefolder.disabledWasModified = casefolder.isModified( 'disabled' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                casefolder.lastChanged = casefolder.lastChanged || new Date();
            } else {
                casefolder.lastChanged = new Date();
            }
            callback( null, casefolder );
        }

        function updateActivitiesOnDisabledCaseFolder( user, casefolder, callback ) {
            let caseFolderId;

            callback( null, casefolder );       //  eslint-disable-line callback-return

            if( !Y.doccirrus.licmgr.hasSpecialModule( user.tenantId, Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ) ||
                !Y.doccirrus.schemas.casefolder.isEDMP( casefolder ) || !casefolder.disabledWasModified ) {
                return;
            }

            caseFolderId = casefolder._id.toString();
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'update',
                model: 'activity',
                query: {caseFolderId: caseFolderId},
                data: {caseFolderDisabled: casefolder.disabled},
                options: {
                    multi: true
                }
            }, function( err, result ) {
                if( err ) {
                    Y.log( 'could not update activities inside casefolder ' + caseFolderId, 'error', NAME );
                } else {
                    Y.log( 'updated activities inside casefolder ' + caseFolderId + ': ' + result, 'debug', NAME );
                }
            } );
        }

        /**
         * "Partner" can not create case folder
         * @param {Object} user
         * @param {Object} caseFolder
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        function partnerCheck( user, caseFolder, callback ) {
            let
                isPartner = user.groups && user.groups.some( item => Y.doccirrus.schemas.employee.userGroups.PARTNER === item.group );
            if( isPartner && caseFolder.isNew ) {
                if( !caseFolder.identity ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 14002 ) );
                }
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'count',
                    model: 'employee',
                    query: {
                        _id: user.specifiedBy,
                        asvTeamNumbers: caseFolder.identity
                    }
                }, function( err, count ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !count ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 14002 ) );
                    }
                    callback( null, caseFolder );
                } );
            } else {
                return callback( null, caseFolder );
            }
        }

        function updateReporting(user, caseFolder, callback) {
            syncAuxManager.auxHook(caseFolder, 'caseFolder', user);

            callback(null, caseFolder);
        }

        function triggerRuleEngine( user, caseFolder, onDelete, callback ) {
            // return early, user should not wait for rule engine to complete
            callback( null, caseFolder );         //  eslint-disable-line callback-return

            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            let data = JSON.parse( JSON.stringify( caseFolder ) );
            data.new = caseFolder.wasNew || false;

            Y.doccirrus.api.rule.triggerIpcQueue( {
                user,
                type: 'casefolder',
                tenantId: user.tenantId,
                patientId: caseFolder.patientId,
                caseFolderId: caseFolder._id.toString(),
                onDelete,
                data
            } );
        }

        function checkPatientInsurance( user, caseFolder, callback ) {
            const
                async = require( 'async' );
            if( !caseFolder.type ) {
                return setImmediate( callback );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            _id: caseFolder.patientId
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results || !results[ 0 ] ) {
                            Y.log( `Case folder process. checkPatientInsurance error: patient with id:${caseFolder.patientId} not found`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'patient not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( patient, next ) {
                    const
                        insurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, caseFolder.type );
                    if( !insurance && 'PREPARED' !== caseFolder.type ) {
                        return next( new Y.doccirrus.commonerrors.DCError( 14004, { data: { $type: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', caseFolder.type, Y.doccirrus.schemas.person.types.Insurance_E.list, caseFolder.type ) } } ) );
                    }
                    setImmediate( next );

                }
            ], callback );

        }

        /**
         * AMTS uses consecutive case numbers. For other case folders, this is not required.
         * @param {Object} user
         * @param {Object} caseFolder
         * @param {Function} callback
         * @returns {Promise<Object>}
         */
        async function assignCaseNumber( user, caseFolder, callback ) {
            if (caseFolder.additionalType !== 'AMTS') {
                return handleResult( null, caseFolder, callback );
            }

            const checkCaseNumberP = promisifyArgsCallback(Y.doccirrus.api.casefolder.checkCaseNumber);

            if( caseFolder.caseNumber ) {
                if( caseFolder.isModified( 'caseNumber' ) ) {
                    let [err] = await formatPromiseResult(
                        checkCaseNumberP( {
                            user: user,
                            query: {
                                caseNumber: caseFolder.caseNumber,
                                caseFolderId: caseFolder._id
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `assignCaseNumber: error checking caseNumber for casefolder ${caseFolder._id}:  ${err.message}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    caseFolder.caseNumber = caseFolder.caseNumber + '';
                }
            } else {
                const getNextCaseNumberP = promisifyArgsCallback( Y.doccirrus.api.casefolder.getNextCaseNumber );

                let [err, nextNumber] = await formatPromiseResult(getNextCaseNumberP({ user }));

                if( err ) {
                    Y.log( `assignCaseNumber: error getting next caseNumber for casefolder:  ${err.message}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }

                const updateCaseCounterP = promisifyArgsCallback(Y.doccirrus.schemas.sysnum.updateCaseCounter);

                let [err1] = await formatPromiseResult(updateCaseCounterP({ user, newNumber: nextNumber + 1 }));

                if( err1 ) {
                    Y.log( `assignCaseNumber: error updating caseCounter:  ${err.message}`, 'error', NAME );
                    return handleResult( err1, undefined, callback );
                }
                nextNumber = nextNumber + '';
                caseFolder.caseNumber = nextNumber;
            }
            return handleResult( null, caseFolder, callback );
        }

        function syncCaseFolder( user, caseFolder, callback){
            callback( null, caseFolder); //eslint-disable-line callback-return

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `caseFolder_${ caseFolder._id.toString()}`,
                entityName: 'casefolder',
                entryId: caseFolder._id.toString(),
                lastChanged: caseFolder.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncCaseFolderOnDelete( user, caseFolder, callback){
            callback( null, caseFolder); //eslint-disable-line callback-return

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `caseFolder_${ caseFolder._id.toString()}`,
                entityName: 'casefolder',
                entryId: caseFolder._id.toString(),
                lastChanged: caseFolder.lastChanged,
                onDelete: true
            }, () => {} );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        checkCaseFolderActivities,
                        deleteActiveCaseFolderIdAtPatient, // when delete might be successful also delete activeCaseFolderId at patient if is same,
                        preventDeleting,
                        checkASVCaseFolder
                    ], forAction: 'delete'
                },
                {
                    run: [
                        checkPatientInsurance,
                        partnerCheck,
                        assignCaseNumber,
                        setWasNew
                    ], forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        updateActivitiesOnDisabledCaseFolder,
                        updateReporting,
                        (user, caseFolder, callback) => { triggerRuleEngine(user, caseFolder, false, callback); },
                        syncCaseFolder
                    ], forAction: 'write'
                },
                {
                    run: [
                        (user, caseFolder, callback) => { triggerRuleEngine(user, caseFolder, true, callback); },
                        syncCaseFolderOnDelete
                    ], forAction: 'delete'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: [ 'casefolder-schema', 'edmp-utils', 'employee-schema', 'syncAuxManager' ]}
);
