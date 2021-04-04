/**
 * User: rrrw
 * Date: 19/11/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add('treatment-api', function (Y, NAME) {

        Y.log();

        var
            util = require('util'),
            { formatPromiseResult } = require( 'dc-core' ).utils,
            DCError = Y.doccirrus.commonerrors.DCError,
            getCaseFolderByIdProm = util.promisify( Y.doccirrus.api.casefolder.getCaseFolderById ),
            getPatientByIdProm = util.promisify( Y.doccirrus.api.patient.getPatientById ),
            getEmployeeByIdProm = util.promisify( function( user, query, callback ) { Y.doccirrus.api.employee.get( {user, query, callback} ); } ),
            getLocationByIdProm = util.promisify( function( user, query, callback ) { Y.doccirrus.api.location.get( {user, query, callback} ); } ),
            virtualActivity = new Y.doccirrus.ActivityUtils('treatment');

        async function validateRequest( args, callback ) {
            let
                err,
                location,
                caseFolder,
                caseFolderType,
                caseFolderAdditionalType,
                patient,
                insuranceStatus,
                _doNotSetUserContent = false,
                useOriginalValues =  false,
                { user, data: activity, treatmentApi } = args,
                { caseFolderId, patientId, employeeId, locationId, catalogShort } = activity,
                title = catalogShort,
                insuranceTypes,
                countryModes;

            // If no timestamp has been given in the request, set timestamp of activity to now
            if( !activity.timestamp ) {
                activity.timestamp =  new Date();
            }

            [err, location] = await formatPromiseResult( getLocationByIdProm( user, { _id: locationId } ) );
            if ( err ) {
                return callback( err );
            }
            if ( !location && !location.length ) {
                return callback( new DCError( 'complexprescription_03' ) );
            }

            [err, caseFolder] = await formatPromiseResult( getCaseFolderByIdProm( user, caseFolderId ) );
            if ( err ) {
                return callback( err );
            }
            if ( !caseFolder || !caseFolder.length ) {
                return callback( new DCError( 18023 ) );
            }
            caseFolderType = caseFolder[0].type;
            caseFolderAdditionalType = caseFolder[0].additionalType;

            countryModes = location[0].countryMode;
            insuranceTypes = [];
            countryModes.forEach( countryMode => {
                let types = Y.doccirrus.schemas.catalog.getInsuranceTypesByShortName( countryMode, activity.catalogShort );
                insuranceTypes = [ ...insuranceTypes, ...types ];
            } );

            if ( !insuranceTypes.includes( caseFolderType ) ) {
                return callback( new DCError( 18038 ) );
            }

            [err, patient] = await formatPromiseResult( getPatientByIdProm( user, { patientId } ) );
            if ( err ) {
                return callback( err );
            }
            if ( !patient || !patient.length ) {
                return callback( new DCError( 115006 ) );
            }
            insuranceStatus = patient[0].insuranceStatus;

            [err] = await formatPromiseResult( getEmployeeByIdProm( user, { _id: employeeId } ) );
            if ( err ) {
                return callback( err );
            }

            callback( null, {
                user,
                activity,
                timestamp: activity.timestamp,
                useOriginalValues,
                insuranceStatus,
                caseFolderType,
                caseFolderAdditionalType,
                title,
                _doNotSetUserContent,
                treatmentApi
            } );
        }

        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).treatment = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.treatment.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.treatment.get');
                }
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: async function POST( args ) {
                Y.log('Entering Y.doccirrus.api.treatment.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.treatment.post');
                }
                virtualActivity.filterActivity( args, 'post' );
                // update some auto-generated fields
                if( args.data.vat && 0 < args.data.vat ) {
                    args.data.hasVat = true;
                }

                if ( args.data.code && args.data.catalogShort ) {
                    args.treatmentApi = true;
                    await validateRequest( args, async function( err, treatment ) {
                        if( err ) {
                            return args.callback( err );
                        }
                        await Y.doccirrus.treatmentutils.updateTreatment( treatment, function( err, activity ) {
                            if( err ) {
                                return args.callback( err );
                            }
                            args.data = Y.doccirrus.filters.cleanDbObject( activity );
                            Y.doccirrus.api.activity.post( args );
                        } );
                    } );
                } else {
                    args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                    Y.doccirrus.api.activity.post( args );
                }
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.treatment.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.treatment.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.treatment.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.treatment.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.upsert( args );
            },

            getActivitiesLinkedToContract: function( args ) {
                // install activity type filter, to only return results of this activity type
                args.activityQuery = {
                    actType: "TREATMENT"
                };
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.treatment.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.treatment.delete');
                }
                var callback = args.callback;
                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils',
            'dcschemaloader',
            'treatmentutils',
            'catalog-schema',
            'casefolder-api',
            'patient-api',
            'employee-api',
            'location-api'
        ]
    }
);
