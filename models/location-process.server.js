/**
 * User: rrrw
 * Date: 5/12/2013  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'location-process', function( Y, NAME ) {
        /**
         * The DC Location data schema definition
         *
         * @class DCLocationProcess
         */


        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( `../server/utils/logWrapping.js` )( Y, NAME ),
            _ = require( 'lodash' ),
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager;

        function setIsModified( user, location, callback ) {
            location.locnameWasModified = location.isModified( 'locname' );
            location.institutionCodeWasModified = location.isModified( 'institutionCode' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                location.lastChanged = location.lastChanged || new Date();
            } else {
                location.lastChanged = new Date();
            }
            callback( null, location );
        }

        /**
         *
         * NB:
         * Must be called by the DB layer
         * using Function.call()
         *
         * @method changeLocation
         * @param data {Object} A mongoose object being changed in its updated state.
         * @param callback {Function} function(err, data) passes data on unchanged, or an err.
         */
        function changeLocation( user, data, callback ) {
            function renameLocationInEmployees( err, employees ) {

                if( err ) {
                    Y.log( 'renameLocationInEmployees' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }

                function rename( employee, _cb ) {

                    if( Array.isArray( employee.locations ) && employee.locations.length ) {
                        const employeeLocations = JSON.stringify(employee.locations);
                        Y.Array.each( employee.locations, function( location ) {
                            if( location._id === data._id ) {
                                location.locname = data.locname;
                            }
                        } );

                        //MOJ-13236 update employee locations only if locname has changed
                        if (employeeLocations === JSON.stringify(employee.locations)) {
                            return _cb();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'employee',
                            action: 'put',
                            query: {
                                _id: employee._id
                            },
                            fields: [ 'locations' ],
                            data: {
                                locations: employee.locations,
                                skipcheck_: true
                            }
                        }, function( err ) {
                            if( err ) {
                                Y.log( 'renameLocationInEmployees' + JSON.stringify( err ), 'error', NAME );
                                _cb( err );
                                return;
                            }
                            _cb();
                        } );
                    } else {
                        return _cb();
                    }
                }

                require( 'async' ).each( employees, rename, function( err ) {
                    if( err ) {
                        Y.log( 'error renaming locname in employee.locations' + JSON.stringify( err ), 'error', NAME );
                    }
                    callback( err, data );
                } );
            }

            // mongoose hack
            data = JSON.parse( JSON.stringify( data ) );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    'locations._id': data._id
                },
                options: {
                    lean: true
                },
                useCache: false,
                callback: renameLocationInEmployees
            } );
        }

        /**
         * check if this location is used elsewhere then block deletion
         * @param {module:authSchema.auth} user
         * @param {module:locationSchema.location} location
         * @param {Function} callback
         * @return {module:locationSchema.location|Object} location|ERR
         */
        async function checkReferences( user, location, callback ) {
            const
                timer = logEnter( 'Y.doccirrus.schemaprocess.location.checkReferences' ),
                refs = [
                    {
                        model: 'calendars',
                        schema: 'calendar',
                        path: 'calendar.types.Calendar_T.locationId',
                        field: 'locationId'
                    },
                    {
                        model: 'activities',
                        schema: 'activity',
                        path: 'activity.types.Activity_T.locationId',
                        field: 'locationId'
                    },
                    {
                        model: 'patients',
                        schema: 'patient',
                        path: 'person.types.InsuranceStatus_T.locationId',
                        field: 'insuranceStatus.locationId'
                    },
                    {
                        model: 'employees',
                        schema: 'employee',
                        path: 'employee.types.EmployeeLocations_T._id',
                        field: 'locations._id'
                    }
                ];

            let
                pipeline = [
                    {
                        $match: {
                            _id: location._id
                        }
                    },
                    {
                        $addFields: {
                            locationIdString: {
                                $toString: "_id"
                            }
                        }
                    }
                ],
                errorData = {},
                isError = false;

            for( let i = 0; i < refs.length; i++ ) {
                let localField = '_id';
                if( refs[i].path ) {
                    localField = _.get( Y.doccirrus.schemas, refs[i].path );
                    if( localField && localField.type === 'ObjectId' ) {
                        localField = '_id';
                    } else {
                        localField = 'locationIdString';
                    }
                }
                pipeline.push( {
                    $lookup: {
                        from: refs[i].model,
                        localField: localField,
                        foreignField: refs[i].field,
                        as: `_${refs[i].model}`
                    }
                } );
            }

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'aggregate',
                    user: user,
                    pipeline: pipeline,
                    model: 'location',
                    useCache: true
                } )
            );
            if( err ) {
                Y.log( `error in counting location references: ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                return handleResult( err, undefined, callback );
            }
            if( result && result.result && Array.isArray( result.result ) && result.result.length ) {
                result = result.result[0];
            }

            for( let i = 0; i < refs.length; i++ ) {
                if( result[`_${refs[i].model}`] && Array.isArray( result[`_${refs[i].model}`] ) ) {
                    errorData['$' + refs[i].schema + 'Count'] = result[`_${refs[i].model}`].length;
                    isError = isError || result[`_${refs[i].model}`].length;
                }
            }

            if( isError ) {
                logExit( timer );
                return handleResult( Y.doccirrus.errors.rest( 2022, errorData, true ), undefined, callback );
            }
            logExit( timer );
            return handleResult( null, location, callback );
        }


        /**
         *  Allow or disallow same commercial number depending on allowSameCommercialNo setting
         *
         * @param user
         * @param location
         * @param callback
         */
        async function checkCommercialNo( user, location, callback ) {
            const
                isCommercialNoModified = location.isModified( 'commercialNo' ),
                isCommercialNoAlreadyAssigned = promisifyArgsCallback( Y.doccirrus.api.location.isCommercialNoAlreadyAssigned );

            if( !location.commercialNo || !isCommercialNoModified ) {
                return callback( null, location );
            }

            let [err, settings] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                migrate: true,
                model: 'settings',
                query: {},
                options: {
                    quiet: true,
                    select: { allowSameCommercialNo: 1 }
                }
            } ) );
            if( err ){
                Y.log( `checkCommercialNo: Error getting settings ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            // if configuration allow same commercial numbers skip further checks
            if( settings && settings[0] && settings[0].allowSameCommercialNo ) {
                return callback( null, location );
            }

            [err] = await formatPromiseResult( isCommercialNoAlreadyAssigned( {
                user,
                originalParams: {
                    locationId: location._id || null,
                    commercialNo: location.commercialNo
                }
            } ) );
            if( err ) {
                //no need of extra logging, error is expected result if there are BSNR duplicates
                return callback( err );
            }

            callback( null, location );
        }

        /**
         * Ensure that location's mixed in BankAccount_T.isOptional is always set to true.
         *
         * @param user
         * @param location
         * @param callback
         */
        function setBankAccountIsOptional( user, location, callback ) {
            if( 'CH' === location.countryCode ) {
                location.isOptional = false;
            } else {
                location.isOptional = true;
            }
            callback( null, location );
        }

        function syncLocation( user, location, callback ){
            callback( null, location );
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'location', location, () => {} );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `location_${  location._id.toString()}`,
                entityName: 'location',
                entryId: location._id.toString(),
                lastChanged: location.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncLocationOnDelete( user, location, callback ){
            callback( null, location );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `location_${  location._id.toString()}`,
                entityName: 'location',
                entryId: location._id.toString(),
                lastChanged: location.lastChanged,
                onDelete: true
            }, () => {} );
        }

        function updateReporting( user, location, callback ) {
            syncAuxManager.auxHook(location, 'location', user);
            callback(null, location);
        }

        function setModifications( user, location, callback ) {
            location.locnameIsModified = location.isModified( 'locname' );
            location.commercialNoIsModified = location.isModified( 'commercialNo' );
            location.kvIsModified = location.isModified( 'kv' );
            callback( null, location );
        }

        async function setRemovedEmployees( user, location, callback ) {
            const {
                employees = []
            } = location;
            if( employees.length ){
                const [err, removedEmployees = []] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: {
                                $nin: employees.map( employee => employee._id )
                            },
                            'locations._id': location._id.toString()
                        },
                        options: {
                            lean: true
                        }
                    } )
                );
                location.removedEmployees = removedEmployees;
                return callback( err, location );
            }
            return callback( undefined, location );
        }

        function updateInvoiceLogs( user, location, callback ) {
            const
                Prom = require( 'bluebird' ),
                getModel = Prom.promisify( Y.doccirrus.mongodb.getModel );
             let kbvlogDestinationChanged = false;

            if( !location.locnameIsModified && !location.commercialNoIsModified && !location.kvIsModified ) {
                return callback( null, location );
            }

            Prom.map( ['kbvlog', 'pvslog', 'gkv_deliverysettings'], modelName => {
                return getModel( user, modelName, true );
            } ).each( model => {
                return new Prom( ( resolve, reject ) => {
                    const modelName = model.mongoose.modelName;
                    let data = {
                        locname: location.locname,
                        commercialNo: location.commercialNo
                    };
                    if( 'kbvlog' === modelName && location.kvIsModified ) {
                        kbvlogDestinationChanged = true;
                        data.destination = location.kv;

                    } else if( 'gkv_deliverysettings' === modelName  && location.kvIsModified ) {
                        data.kv = location.kv;
                    }
                    model.mongoose.update( {mainLocationId: location._id.toString()}, data, {multi: true}, function( err, result ) {
                        if( err ) {
                            reject( err );
                        } else {
                            if( result && result.ok && result.nModified ) {
                                Y.log( 'updated ' + result.nModified + ' ' + modelName + '(s) on location change', 'debug', NAME );
                            }
                            resolve();
                        }
                    } );
                } );
            } ).then( () => {
                if( kbvlogDestinationChanged ) {
                    Y.doccirrus.api.kbvlog.kbvlogDestinationChanged( {
                        user,
                        originalParams: {destination: location.kv}
                    } );
                }
                callback( null, location );
            } ).catch( err => {
                Y.log( 'an error occurred while updating invoicelogs on location change ' + err, 'error', NAME );
                callback( err );
            } );
        }

        function updatePadxSettings( user, location, callback ) {
            if( !location.institutionCodeWasModified && !location.institutionCodeWasModified ) {
                callback( null, location );
                return;
            }

            Y.doccirrus.api.invoiceconfiguration.updatePadxSettingsOnLocationorEmployeeChange( user, 'location', location ).then( () => {
                callback( null, location );
            } ).catch( () => {
                callback( null, location );
            } );
        }

        /**
         *  Ensure that location.enabledPrinters and location.defaultPrinter are known to CUPS
         *
         *  @param  user        {Obejct}
         *  @param  location    {Object}
         *  @param  callback    {Function}
         */

        function checkPrintersExist( user, location, callback ) {

            var
                async = require( 'async' ),
                cupsPrinters = [];

            async.series( [ loadPrinterList, checkEnabledPrinters, checkDefaultPrinter ], onAllDone );

            //  get printer list from the CUPS interface
            function loadPrinterList( itcb ) {
                Y.doccirrus.api.printer.getPrinter( {callback: onListPrinters} );

                function onListPrinters( err, allPrinters ) {
                    if ( err ) {
                        Y.log( 'CUPS error, could not load list of printers, setting empty: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( null );
                    }
                    cupsPrinters = allPrinters || [];
                    Y.log( 'Loaded list of ' + cupsPrinters.length + ' printers from CUPS.', 'debug', NAME );
                    itcb( null );
                }
            }

            function checkEnabledPrinters( itcb ) {
                var
                    validPrinters = [],
                    i, j, found;

                location.enabledPrinters = location.enabledPrinters || [];

                for ( i = 0; i < location.enabledPrinters.length; i++ ) {
                    found = false;
                    for ( j = 0; j < cupsPrinters.length; j++ ) {
                        if ( cupsPrinters[j].name === location.enabledPrinters[i] ) {
                            found = true;
                        }
                    }
                    if ( true === found ) {
                        validPrinters.push( location.enabledPrinters[i] );
                    } else {
                        Y.log( 'Removed printer enabled at location: ' + location.enabledPrinters[i] + ' (missing from CUPS)', 'warn', NAME );
                    }
                }

                location.enabledPrinters = validPrinters;
                itcb( null );
            }

            function checkDefaultPrinter( itcb ) {
                //  if there are no enabled printers then there cannot be a default among them
                if ( 0 === location.enabledPrinters.length ) {
                    location.defaultPrinter = '';
                    return itcb( null );
                }

                //  if the default printer is not enabled then it must be cleared
                if ( -1 === location.enabledPrinters.indexOf( location.defaultPrinter ) ) {
                    location.defaultPrinter = '';
                }

                //  if there is no default printer then use the first enabled printer
                if ( '' === location.defaultPrinter ) {
                    location.defaultPrinter = location.enabledPrinters[0];
                }

                itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) { return callback( err ); }
                return callback( null, location );
            }

        }

        function deleteReferenceInOrganisationalUnit( user, location, callback) {
            Y.doccirrus.mongodb.runDb({
                user,
                model: 'organisationalunit',
                action: 'mongoUpdate',
                query: {},
                data: { $pull: { locations: location._id } },
                options: { multi: true }
            }, callback);
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class Location Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'location' ),
                    setIsModified,
                    setBankAccountIsOptional,
                    checkCommercialNo,
                    checkPrintersExist,
                    setModifications,
                    setRemovedEmployees
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'location' ),
                    checkReferences
                ], forAction: 'delete'}
            ],
            //
            //            post: [
            //                {run: changeLocation, forAction: 'write' },
            //            ],
            post: [
                {run: [
                    syncLocation,
                    updateReporting,
                    updateInvoiceLogs,
                    updatePadxSettings
                ], forAction: 'write'},
                {
                    run: [
                        deleteReferenceInOrganisationalUnit,
                        syncLocationOnDelete
                    ] ,
                    forAction: 'delete'
                }
            ],
            changeLocation: changeLocation,   // hack until MOJ-805 done.

            name: NAME
        };

    },
    '0.0.1', {
        requires: [
            'location-schema',
            'syncAuxManager',
            'location-api',
            'print-api'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dcerror',
            // 'dcmongodb',
            // 'dcschemaloader',
            // 'dispatch-api',
            // 'invoiceconfiguration-api',
            // 'kbvlog-api'
        ]
    }
);
