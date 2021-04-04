/*global YUI*/

YUI.add( 'employee-process', function( Y, NAME ) {
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            _ = require( 'lodash' ),
            DCError = Y.doccirrus.commonerrors.DCError,
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        var
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager,
            i18n = Y.doccirrus.i18n;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function checkLocations( user, employee, callback ) {
            var i, len, loc, originalData = employee.originalData_, removedLocations = [];

            function finalCb( err ) {
                if( err ) {
                    Y.log( 'could not check patient insurance employee ' + err, 'info', NAME );
                    return callback( err );
                }

                callback( null, employee );
            }

            function updatePatient( patient, cb ) {
                var modified = false;

                if( !Array.isArray( patient.insuranceStatus ) || !patient.insuranceStatus.length ) {
                    return cb();
                }

                patient.insuranceStatus.forEach( function( insurance ) {
                    if( insurance.employeeId === employee._id.toString() && -1 !== removedLocations.indexOf( insurance.locationId ) ) {
                        insurance.employeeId = null;
                        modified = true;
                    }

                } );

                if( !modified ) {
                    cb();
                } else {
                    Y.log( 'remove employee from patient ' + patient._id.toString(), 'info', NAME );
                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patient',
                        action: 'put',
                        query: {
                            _id: patient._id
                        },
                        fields: Object.keys(patient),
                        data: Y.doccirrus.filters.cleanDbObject(patient)
                    }, cb);
                }

            }

            function removeEmployees( err, patients ) {
                if( err ) {
                    return callback( err );
                }

                require( 'async' ).eachSeries( patients, updatePatient, finalCb );
            }

            function findById( id ) {
                return employee.locations.some( function( location ) {
                    return id === location._id;
                } );
            }

            if( originalData && Array.isArray( originalData.locations ) ) {
                len = originalData.locations.length;
                for( i = 0; i < len; i++ ) {
                    loc = originalData.locations[i];
                    if( !findById( loc._id ) ) {
                        removedLocations.push( loc._id );
                    }
                }
            }

            if( !removedLocations.length || !employee._id ) {
                return callback( null, employee );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                query: {
                    'insuranceStatus.employeeId': employee._id.toString(),
                    'insuranceStatus.locationId': { $in: removedLocations }
                },
                callback: removeEmployees
            } );
        }

        function changeActivityEmployeeName( user, employee, callback ) {
            var
                oldEmployeeData = employee.originalData_;
            Y.log( 'Employee post process. Checking if employee name was changed', 'debug', NAME );
            function updateActivities() {

                var
                    async = require( 'async' );
                Y.log( 'Employee post process. Update all activity which have employeeId: ' + employee._id.toString(), 'debug', NAME );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activity', true, function( err, model ) {
                            next( err, model );
                        } );
                    }, function( activityModel, next ) {
                        var
                            activityCount = 0,
                            updateName = {
                                employeeName: Y.doccirrus.schemas.person.personDisplay( employee ),
                                employeeInitials: employee.initials
                            },
                            actStream = activityModel.mongoose
                                .find( { employeeId: employee._id.toString() }, { _id: true }, { timeout: true } )
                                .stream();

                        actStream
                            .on( 'data', onStreamData )
                            .on( 'error', onStreamError )
                            .on( 'end', onStreamEnd );

                        function onStreamData( resultObj ) {
                            activityCount = activityCount + 1;
                            actStream.pause();

                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'update',
                                model: 'activity',
                                migrate: true,
                                query: { _id: resultObj._id },
                                data: updateName
                            }, onNextUpdated );

                            function onNextUpdated( err ) {
                                if ( err ) {
                                    Y.log( 'Problem while updating employee name on activity: ' + JSON.stringify( err ), 'warn', NAME );
                                    //  continue despite error
                                }
                                actStream.resume();
                            }
                        }

                        function onStreamEnd() {
                            Y.log( 'Finished processing all ' + activityCount + ' activities with this employee.', 'debug', NAME );
                            next( null );
                        }

                        function onStreamError( err ) {
                            Y.log( 'Error in activity stream: ' + JSON.stringify( err ), 'debug', NAME );
                            next( err );
                        }
                    }
                ], function( err ) {
                    callback( err, employee );
                } );
            }

            if( oldEmployeeData && !(oldEmployeeData.lastname === employee.lastname &&
                oldEmployeeData.middlename === employee.middlename &&
                oldEmployeeData.nameaffix === employee.nameaffix &&
                oldEmployeeData.firstname === employee.firstname &&
                oldEmployeeData.title === employee.title &&
                oldEmployeeData.initials === employee.initials)
            ) {
                updateActivities();
            } else {
                Y.log( 'Employee post process. Employee name was not changed.', 'debug', NAME );
                return callback( null, employee );
            }
        }

        function syncEmployeeOnWrite( user, employee, callback ) {
            callback( null, employee );
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'employee', employee, () => {} );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `employee_${ employee._id.toString()}`,
                entityName: 'employee',
                entryId: employee._id.toString(),
                lastChanged: employee.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncEmployeeOnDelete( user, employee, callback ) {
            callback( null, employee );
            let employeeCopy = JSON.parse( JSON.stringify( employee ) );
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'employee', Object.assign( employeeCopy, {isActive: false} ), () => {} );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `employee_${ employee._id.toString()}`,
                entityName: 'employee',
                entryId: employee._id.toString(),
                lastChanged: employee.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function checkEmployeePhone( user, employee, callback ) {
            Y.doccirrus.utils.checkPersonPhone( user, employee, 'EMPLOYEE', callback );
        }

        function removeEmployeePhoneNumbers( user, employee, callback ) {
            Y.doccirrus.utils.removePersonPhoneNumbers( user, employee, 'EMPLOYEE', callback );
        }

        function updateReporting( user, employee, callback ) {
            Y.log( 'employee-process updating all reportings with employee name....', 'debug', NAME );
            syncAuxManager.auxHook( employee, 'employee', user );
            callback( null, employee );
        }

        function runDb( config ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.runDb( config, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    }
                    else {
                        resolve( result );
                    }
                } );
            } );
        }

        function isEmployeeNew( user, employee, callback ) {
            employee.wasNew = employee.isNew;
            callback();
        }

        function setIsModified( user, employee, callback ) {
            employee.pvsCustomerNoWasModified = employee.isModified( 'pvsCustomerNo' );
            employee.firstnameWasModified = employee.isModified( 'firstname' );
            employee.lastnameWasModified = employee.isModified( 'lastname' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                employee.lastChanged = employee.lastChanged || new Date();
            } else {
                employee.lastChanged = new Date();
            }
            callback( null, employee );
        }


        function sendEmployeeMessage( user, employee, callback ) {
            if( !employee.wasNew && !user.changeLocation && !Y.doccirrus.auth.isMocha() ) {
                runDb( {
                    user: user,
                    model: 'identity',
                    query: {
                        specifiedBy: employee._id
                    }
                } )
                    .then( identities => {
                        if( identities.length > 0 ) {
                            if( String( user.identityId ) === String( identities[0]._id ) ) {
                                return callback();
                            }

                            Y.doccirrus.communication.emitEventForUser( {
                                targetId: identities[0]._id,
                                event: 'message',
                                msg: {
                                    data: i18n( 'InSuiteAdminMojit.tab_employees.messages.EMPLOYEE_CHANGED' )
                                }
                            } );
                        }
                        callback();
                    } )
                    .catch( callback );
            } else {
                return callback();
            }
        }

        /**
         *  Current location is set from employee profile, this must also be set on the identity object for use by
         *  inCase, etc.
         *
         *  @param  user
         *  @param  employee
         *  @param  callback
         */

        function updateIdentityCurrentLocation( user, employee, callback ) {
            var
                async = require( 'async' ),
                hasChanged = false,
                identity;

            async.series( [ findIdentity, saveIdentity ], onAllDone );

            function findIdentity( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'identity',
                    'query': { 'specifiedBy': employee._id + '' },
                    'callback': onIdentityLoaded
                } );

                function onIdentityLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    //  employee record does not currespond to a user (?), nothing further to do
                    if ( 0 === result.length ) { return itcb( null ); }

                    identity = result[0];
                    hasChanged = ( identity.currentLocation + '' !== employee.currentLocation + '' );
                    itcb( null );
                }
            }

            function saveIdentity( itcb ) {
                //  if the currentLocation is already set correctly then we're done
                if ( false === hasChanged ) { return itcb( null ); }

                var
                    putData = {
                        'currentLocation': employee.currentLocation + '',
                        'fields_': [ 'currentLocation' ]
                    };

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'identity',
                    'action': 'put',
                    'query': { '_id': identity._id },
                    'data': Y.doccirrus.filters.cleanDbObject( putData ),
                    'callback': itcb
                } );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not update identity with employee currentLocation: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null );
            }
        }

        function setInitials( user, employee, callback ) {

            if( !employee.initials ) {
                employee.initials = employee.firstname.charAt( 0 ) + employee.lastname.charAt( 0 );
            }

            callback( null, employee );
        }

        function updatePadxSettings( user, employee, callback ) {
            if( !employee.pvsCustomerNoWasModified && !employee.firstnameWasModified && !employee.lastnameWasModified ) {
                callback( null, employee );
                return;
            }
            Y.doccirrus.api.invoiceconfiguration.updatePadxSettingsOnLocationorEmployeeChange( user, 'employee', employee ).then( () => {
                callback( null, employee );
            } ).catch( () => {
                callback( null, employee );
            } );
        }

        function updateIdentityRoles( user, employee, callback ) {

            if( employee.wasNew ) {
                return callback( null, employee );
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'identity',
                query: { specifiedBy: employee._id.toString() },
                data: { $set: { roles: employee.roles } }
            }, callback );
        }

        function removeFromTaskTypeOnUpdate( user, employee, callback ) {
            var originalData = employee.originalData_ || {};

            if( originalData.status === 'ACTIVE' && employee.status !== 'ACTIVE' ) {
                return removeFromTaskType( user, employee, callback );
            } else {
                return callback( null, employee );
            }
        }

        async function removeFromTaskType( user, employee, callback ) {
            let err;

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'update',
                model: 'tasktype',
                query: {
                    employeeId: employee._id
                },
                data: {$unset: {employeeId: 1, employeeName: 1}},
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `removeFromTaskType: Error in $unset employee: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'update',
                model: 'tasktype',
                query: {
                    candidates: {$ne: [], $exists: true}
                },
                data: {
                    $pull: {
                        candidates: {$in: [employee._id]},
                        candidatesNames: {$in: [`${employee.lastname}, ${employee.firstname}`]}
                    }
                },
                options: {
                    multi: true
                }
            } ) );

            if( err ) {
                Y.log( `removeFromTaskType: Error in $pull employee from candidates: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            return callback( null, employee );
        }

        /**
         *
         * @param {module:authSchema.auth} user
         * @param {Document<module:employeeSchema.employee>} employee
         * @param {Function} callback
         * @return {Promise<Object>}
         */
        async function populateAddedLocations( user, employee, callback ) {
            const {
                originalData_: {
                    locations: originalLocations = []
                } = {},
                locations = []
            } = employee;
            let context = this && this.context || {};

            const originalDataLocationIds = originalLocations.map( elem => elem._id );
            const currentLocationIds = locations.map( elem => elem._id );
            context.originalDataLocationIds = originalDataLocationIds;
            context.currentLocationIds = currentLocationIds;

            let err, addedLocations = [];
            if( employee.isModified( 'locations' ) ) {
                const addedLocationIds = _.difference( currentLocationIds, originalDataLocationIds ).map( elem => ObjectId( elem ) );
                [err, addedLocations] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'location',
                        query: {
                            _id: {
                                $in: addedLocationIds
                            }
                        }
                    } )
                );
            }

            context.addedLocations = addedLocations;
            return handleResult( err, employee, callback );
        }

        /**
         *
         * @param {module:authSchema.auth} user
         * @param {Document<module:employeeSchema.employee>} employee
         * @param {Function} callback
         * @return {Promise<Object>}
         */
        async function populateRemovedLocations( user, employee, callback ) {
            let {
                context = {},
                context: {
                    originalDataLocationIds = [],
                    currentLocationIds = []
                } = {}
            } = this;

            let err, removedLocations = [];
            if( employee.isModified( 'locations' ) ) {
                const removedLocationIds = _.difference( originalDataLocationIds, currentLocationIds ).map( elem => ObjectId( elem ) );
                [err, removedLocations] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'location',
                        query: {
                            _id: {
                                $in: removedLocationIds
                            }
                        }
                    } )
                );
            }

            context.removedLocations = removedLocations;
            return handleResult( err, employee, callback );
        }


        /**
         * @class employeeProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'employee' ),
                        isEmployeeNew,
                        setIsModified,
                        setInitials,
                        populateAddedLocations,
                        populateRemovedLocations
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'employee' ),
                        syncEmployeeOnDelete
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        checkLocations,
                        updateReporting,
                        changeActivityEmployeeName,
                        syncEmployeeOnWrite,
                        sendEmployeeMessage,
                        updateIdentityCurrentLocation,
                        updatePadxSettings,
                        updateIdentityRoles,
                        checkEmployeePhone,
                        removeFromTaskTypeOnUpdate
                    ], forAction: 'write'
                },
                { run: [removeEmployeePhoneNumbers, removeFromTaskType], forAction: 'delete' }

            ],

            audit: {

                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param   {module:employeeSchema.employee} employee
                 * @returns {String}
                 */
                descrFn: function descrFn( employee ) {
                    const {
                        _context: {
                            context: {
                                addedLocations = [],
                                removedLocations = []
                            } = {}
                        } = {}
                    } = employee;

                    if( !Object.getOwnPropertyNames( employee ).length ) {
                        throw new DCError( 500, {message: 'no employee given'} );
                    }

                    let content = '';

                    if( addedLocations.length ||  removedLocations.length){
                        content += Y.doccirrus.schemas.person.personDisplay( employee );
                        content += ' ';
                    }
                    for( let i = 0; i < addedLocations.length; i++ ) {
                        const addedLocation = addedLocations[i];

                        if( i > 0 ) {
                            content += ', ';
                        }
                        content += Y.doccirrus.i18n( 'location-schema.audit.addedLocation', {
                            data: {
                                locationName: addedLocation.locname
                            }
                        } );
                    }
                    if( addedLocations.length && removedLocations.length ) {
                        content += ', ';
                    }
                    for( let i = 0; i < removedLocations.length; i++ ) {
                        const removedLocation = removedLocations[i];

                        if( i > 0 ) {
                            content += ', ';
                        }
                        content += Y.doccirrus.i18n( 'location-schema.audit.removedLocation', {
                            data: {
                                locationName: removedLocation.locname
                            }
                        } );
                    }
                    if( content ) {
                        content += '.';
                    }
                    return content;
                }
            },

            name: NAME
        };

    },
    '0.0.1', {
        requires: [
            'syncAuxManager',
            'dcschemaloader',
            'dcauth',
            'dccommonerrors'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcfilters',
            // 'dcschemaloader',
            // 'dcutils',
            // 'dcmongodb',
            // 'dispatch-api',
            // 'invoiceconfiguration-api',
            // 'person-schema',
        ]
    }
);
