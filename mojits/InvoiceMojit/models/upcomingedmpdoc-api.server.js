/*global YUI */


YUI.add( 'upcomingedmpdoc-api', function( Y, NAME ) {
        const
            NUM_OF_DOCS_TO_GENERATE = 2,
            //i18n = Y.doccirrus.i18n,
            //UPCOMING_EDMP_DOCS_UPDATED = i18n( 'upcomingedmpdoc-api.messages.UPCOMING_EDMP_DOCS_UPDATED' ),
            increaseQuarter = Y.doccirrus.edmpcommonutils.increaseQuarter,
            mapIntervalEnumToQuarterCount = Y.doccirrus.edmpcommonutils.mapIntervalEnumToQuarterCount,
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            getModel = Promise.promisify( Y.doccirrus.mongodb.getModel ),
            createLastDocsPipeline = Y.doccirrus.edmputils.createLastDocsPipeline;

        function getPatientData( user, patientId ) {
            return runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: patientId
                },
                options: {
                    lean: true,
                    select: {
                        _id: 0,
                        firstname: 1,
                        lastname: 1,
                        dob: 1,
                        patientNo: 1
                    }
                }
            } ).get( 0 );
        }

        function getNextQuarters( quarter, year, documentationInterval ) {
            const increaseBy = mapIntervalEnumToQuarterCount( documentationInterval );
            let quarters = [];

            for( let i = 0; i < NUM_OF_DOCS_TO_GENERATE; i++ ) {
                let nextQuarter = increaseQuarter( quarter, year, increaseBy );
                quarter = nextQuarter.quarter;
                year = nextQuarter.year;
                quarters.push( nextQuarter );
            }

            return quarters;
        }

        function invalidate( user, match ) {

            let patientDataCache = {},
                docs = [];

            getModel( user, 'activity' ).then( activityModel => {
                return new Promise( ( resolve, reject ) => {
                    activityModel.mongoose.aggregate( createLastDocsPipeline( match ),
                        ( err, result ) => (err ? reject( err ) : resolve( result )) );
                } );
            } ).each( result => {
                let patientId = result.patientId,
                    promise;
                if( !patientDataCache[patientId] ) {
                    promise = getPatientData( user, patientId ).then( data => {
                        patientDataCache[patientId] = data;
                    } );
                }

                return Promise.resolve( promise ).then( () => {
                    // cant create upcoming docs without lastDmpDocumentationInterval
                    if( !result.lastDmpDocumentationInterval ) {
                        return;
                    }
                    let patientData = patientDataCache[patientId],
                        upcomingQuarters = getNextQuarters( result.quarter, result.year, result.lastDmpDocumentationInterval );

                    upcomingQuarters.forEach( _quarter => docs.push( {
                        quarter: _quarter.quarter,
                        year: _quarter.year,
                        type: result.actType,
                        patientId: patientId,
                        patientFirstname: patientData.firstname,
                        patientLastname: patientData.lastname,
                        patientDob: patientData.dob,
                        patientNo: patientData.patientNo,
                        interval: result.lastDmpDocumentationInterval,
                        locationId: result.locationId
                    } ) );
                } );
            } ).then( () => {
                patientDataCache = null;
                return storeUpcomingDocs( user, docs ).then( () => docs );
            } ).catch( err => Y.log( 'could not invalidate upcoming edmp docs ' + (err && err.stack || err), 'error', NAME ) );
        }

        function storeUpcomingDocs( user, docs ) {
            return Promise.resolve().then( () => {
                if( !Array.isArray( docs ) || !docs.length ) {
                    return;
                }
                docs.skipcheck_ = true;
                return runDb( {
                    user: user,
                    model: 'upcomingedmpdoc',
                    action: 'post',
                    data: docs
                } ).then( result => {
                    Y.log( 'stored ' + result.length + ' upcoming edmp docs', 'info', NAME );
                    return result;
                }, err => {
                    Y.log( 'could not store upcoming docs ' + (err && err.stack || err), 'error', NAME );
                    throw err;
                } );
            } );
        }

        function removeDocs( user, patientId ) {
            return runDb( {
                user: user,
                model: 'upcomingedmpdoc',
                action: 'delete',
                query: {
                    patientId: patientId
                },
                options: {
                    override: true
                }
            } );
        }

        /**
         * recreates upcoming docs for specified patientId
         *
         * @param {Object}          args
         * @param {Object}          args.user
         * @param {ObjectId}        args.patentId
         * @param {Function}        args.callback
         *
         * @returns {*}
         */
        function invalidatePatient( args ) {
            Y.log('Entering Y.doccirrus.api.upcomingedmpdoc.invalidatePatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.upcomingedmpdoc.invalidatePatient');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params || !params.patientId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            callback();

            return removeDocs( user, params.patientId )
                .then( () => invalidate( user, {patientId: params.patientId} ) )
                .catch( err => Y.log( 'could not invalidate upcoming edmp docs ' + (err && err.stack || err), 'error', NAME ) );
        }

        Y.namespace( 'doccirrus.api' ).upcomingedmpdoc = {

            name: NAME,
            invalidatePatient: invalidatePatient
        };

    },
    '0.0.1', {requires: ['edmp-api', 'edmp-utils']}
);
