/**
 * User: rrrw
 * Date: 24/09/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/**
 * Virtual REST API for physicians, is mapped to the basecontact model.
 */


/*global YUI*/
YUI.add( 'physician-api', function( Y, NAME ) {
        'use strict';

        var PHYSICIAN_TYPE = 'PHYSICIAN';

        function isTypePhysician( str ) {
            return ( str === PHYSICIAN_TYPE );
        }

        function filterArgs( args, action ) {
            args.model = 'basecontact';

            switch( action ) {
                case 'get':
                    args.query = args.query || {};
                    args.query.baseContactType = PHYSICIAN_TYPE;
                    break;
                case 'delete':
                    if( args.query && Object.keys( args.query ).length ) {
                        args.query.baseContactType = PHYSICIAN_TYPE;
                    }
                    // otherwise, leave it empty and the
                    // the DB Layer will utomatically stop
                    // the delete.
                    break;
                case 'post': /*nobreak*/
                case 'upsert':/*nobreak*/
                case 'put':
                    if( !isTypePhysician( args.data.baseContactType ) ) {
                        args.data.actType = 'SCHEIN';
                        args.data.baseContactType = PHYSICIAN_TYPE;
                    }
                    break;
            }

            Y.log( 'Physician Request converted to activity request.', 'debug', NAME );
        }

        /**
         *  Load a physician contact with specialization text as string, MOJ-8446
         *
         *  Necessary now that specializations are catalog and not an enum
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams._id     _id of a PHYSICIAN contact which may have expertise
         */

        function getWithSpecializationString( args ) {
            Y.log('Entering Y.doccirrus.api.physician.getWithSpecializationString', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.getWithSpecializationString');
            }
            var
                async = require( 'async' ),
                params = args.originalParams,
                contactId = params._id || null,
                physician = null,
                specializations = [];

            if ( !contactId || '' === contactId ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'Not _id given' ) );
            }

            async.series( [ getContact, expandOldSpecialization, expandNewSpecialization], onAllDone );

            function getContact( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'basecontact',
                    'query': { _id: contactId },
                    'callback': onContactLoaded
                } );

                function onContactLoaded( err, result ) {
                    if ( !err && !result[0] ) { return itcb( null ); }
                    if ( err ) { return itcb( err ); }

                    physician = result[0];
                    physician.expertiseText = '';

                    itcb( null );
                }

            }

            function expandOldSpecialization( itcb ) {
                //  if physician not found then we can skip this step
                if ( !physician || !physician.expertise ) { return itcb( null ); }

                var
                    oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                    i, j;

                //  may be a reference to previous enum value
                if ( 'string' === typeof physician.expertise ) {
                    for ( i = 0; i < oldExpertiseList.length; i++ ) {
                        if ( oldExpertiseList[i].val === physician.expertise ) {
                            specializations.push( oldExpertiseList[i]['-de'] );
                        }
                    }
                }

                //  may be serveral references to previous enum value
                if ( Array.isArray( physician.expertise ) ) {
                    for ( j = 0; j < physician.expertise.length; j++ ) {
                        for ( i = 0; i < oldExpertiseList.length; i++ ) {
                            if ( oldExpertiseList[i].val === physician.expertise[j] ) {
                                specializations.push( oldExpertiseList[i]['-de'] );
                            }
                        }
                    }
                }

                itcb( null );
            }

            function expandNewSpecialization( itcb ) {
                //  if physician not found then we can skip this step
                if ( !physician || !physician.expertise ) { return itcb( null ); }
                //  if not array of expertise references then nothing to look up in catalog, skip this step
                if ( !Array.isArray( physician.expertise ) ) { return itcb( null ); }

                //  try look up expertise / specialization in new KBV calendar
                Y.doccirrus.api.kbv.fachgruppe( {
                    'user': args.user,
                    'originalParams': { 'key': { $in: physician.expertise } },
                    'callback': onSpecializationTypesLoaded
                } );

                function onSpecializationTypesLoaded( err, result ) {
                    if ( err ) {
                        Y.log( 'Could not load KBV specialization types' );
                        return itcb( err );
                    }

                    var
                        types = ( ( result[0] && result[0].kvValue ) ? result[0].kvValue : [] ),
                        i;

                    for ( i = 0; i < types.length; i++ ) {
                        if ( types[i].value ) {
                            specializations.push( types[i].value );
                        }
                    }

                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not load physician object with expertise: ' + JSON.stringify( err ), 'warn', NAME );
                    return args.callback( err );
                }

                if ( physician && specializations.length > 0 ) {
                    physician.expertiseText = specializations.join( ', ' );
                    Y.log( 'Expanded expertise text: ' + physician.expertiseText, 'debug', NAME );
                }

                args.callback( null, ( physician ? [ physician ] : [] ) );
            }
        }

        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).physician = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.physician.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.get');
                }
                filterArgs( args, 'get' );
                Y.doccirrus.RESTController_1.defaultHandlers.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.physician.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.post');
                }
                filterArgs( args, 'post' );
                // 1. add casefolder
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.RESTController_1.defaultHandlers.post( args );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.physician.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.put');
                }
                filterArgs( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.RESTController_1.defaultHandlers.put( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.physician.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.delete');
                }
                filterArgs( args, 'delete' );
                Y.doccirrus.RESTController_1.defaultHandlers.delete( args );
            },
            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.physician.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.physician.upsert');
                }
                filterArgs( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.RESTController_1.defaultHandlers.upsert( args );
            },

            getWithSpecializationString: getWithSpecializationString,

            isTypePhysician: isTypePhysician
        };
    },
    '0.0.1', {
        requires: [
            'dcschemaloader', 'casefolder-schema', 'v_physician-schema'
        ]
    }
);
