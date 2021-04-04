/*global YUI */


YUI.add( 'inpacsrest-api', function( Y, NAME ) {

        const
            needle = require( "needle" ),
            sanitize = require( "sanitize-filename" ),
            exec = require( 'child_process' ).exec,
            URL = 'http://localhost:8042',
            PATIENTS = "patients",
            SERIES = "series",
            STUDIES = "studies",
            INSTANCES = "instances",
            MODULE = "module",
            TAGS = "simplified-tags",
            ARCHIVE = "archive",
            MEDIA = "media",
            STATISTICS = "statistics",
            CHANGES = "changes",
            MODIFY = "modify";

        function urlError( URL, err, cb ) {
            Y.log( 'Error requesting: ' + URL + ' , error: ' + err, 'error', NAME );
            return cb( err );
        }

        function getId( query ) {
            if( query && query.id ) {
                return sanitize( query.id );
            }
            else {
                return '';
            }
        }

        function getData( dataUrl, cb ) {
            const requestUrl = URL + '/' + dataUrl;

            if( requestUrl ) {
                Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig )=>{
                    if ( err ){
                        return cb( err );
                    }
                    else if ( inpacsConfig ) {
                        let options = {};
                        if( inpacsConfig.username && inpacsConfig.password ) {
                            options = {
                                username: inpacsConfig.username,
                                password: inpacsConfig.password
                            };
                        }
                        needle.get( requestUrl, options, function( err, response ) {
                            if( err ) {
                                urlError( requestUrl, err, cb );
                            }
                            else if( response.statusCode !== 200 ) {
                                return cb( new Y.doccirrus.commonerrors.DCError( response.statusCode, { message: response.statusMessage } ) );
                            }
                            return cb( null, response.body );
                        } );
                    } else {
                        Y.log(" InPacs config data empty. ", "error", NAME);
                        return cb( new Y.doccirrus.commonerrors.DCError( 500, { message: 'InPacs config data empty.' } ) );
                    }

                } );
            } else {
                return cb( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Bad URL request.' } ) );
            }
        }

        function getDataById( id, dataUrl, cb ) {
            let requestUrl = dataUrl + '/' + id;
            if( id && dataUrl ) {
                getData( requestUrl, cb );
            }
            else {
                return cb( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Not valid patient id or data URL.' } ) );
            }
        }

        function getDatasData( datasUrl, datasId, dataUrl, cb ) {
            const requestUrl = datasUrl + '/' + datasId + '/' + dataUrl;
            if( datasUrl && datasId && dataUrl ) {
                getData( requestUrl, cb );
            }
            else {
                return cb( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Not valid id or data URL.' } ) );
            }
        }

        function deleteData( dataId, dataUrl, cb ) {
            if( dataId && dataUrl ) {
                const requestUrl = URL + '/' + dataUrl + '/' + dataId;
                needle.delete( requestUrl, null, function( err, res ) {
                    if( err ) {
                        urlError( requestUrl, err, cb );
                    } else if( res.statusCode !== 200 ) {
                        return cb( new Y.doccirrus.commonerrors.DCError( res.statusCode, { message: res.statusMessage } ) );
                    }
                    return cb( null, res.statusCode + ' ' + res.statusMessage );
                } );
            }
        }

        function modifyData( dataUrl, dataId, data, cb ){ //PatientID, PatientName, PatientSex, PatientBirthDate, AccessionNumber

            if ( data ) {

                Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig )=> {
                    if( err ) {
                        return cb( err );
                    }
                    else if( inpacsConfig && inpacsConfig.username && inpacsConfig.password ) {
                        const options = {
                            username: inpacsConfig.username,
                            password: inpacsConfig.password
                        };
                        needle.post( [URL, dataUrl, dataId, MODIFY].join( '/' ), data, options, ( err, res )=> {
                            return cb( err, res );
                        } );
                    } else {
                        Y.log( " InPacs config data empty. ", "error", NAME );
                        return cb( new Y.doccirrus.commonerrors.DCError( 500, { message: 'InPacs config data empty.' } ) );
                    }

                } );
            } else {
                return cb( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Not valid id or data URL.' } ) );
            }
        }

        function getChanges( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getChanges', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getChanges');
            }
            let requestUrl = CHANGES,
                cb = args.callback,
                query = args.httpRequest.query;
            if( query ) {
                requestUrl += '?';
                if( query.limit ) {
                    requestUrl += 'limit=' + query.limit + '&';
                }
                if( query.since ) {
                    requestUrl += 'since=' + query.since;
                }
            }
            getData( requestUrl, cb );
        }

        function getPatients( cb ) {
            getData( PATIENTS, cb );
        }

        function getPatientById( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientById', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientById');
            }
            const cb = args.callback,
                patientId = getId( args.httpRequest.query );
            getDataById( patientId, PATIENTS, cb );
        }

        function getSeries( cb ) {
            getData( SERIES, cb );
        }

        function getSeriesById( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesById', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesById');
            }
            const cb = args.callback,
                seriesId = getId( args.httpRequest.query );
            getDataById( seriesId, SERIES, cb );
        }

        function getStudies( cb ) {
            getData( STUDIES, cb );
        }

        function getStudyById( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyById', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyById');
            }
            const cb = args.callback,
                studyId = getId( args.httpRequest.query );
            getDataById( studyId, STUDIES, cb );
        }

        function getInstances( cb ) {
            getData( INSTANCES, cb );
        }

        function getInstanceById( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceById', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceById');
            }
            const cb = args.callback,
                instanceId = getId( args.httpRequest.query );
            getDataById( instanceId, INSTANCES, cb );
        }

        function getPatientStudies( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientStudies', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientStudies');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, STUDIES, cb );
        }

        function getPatientSeries( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientSeries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientSeries');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, SERIES, cb );
        }

        function getPatientInstances( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientInstances', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientInstances');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, INSTANCES, cb );
        }

        function getPatientModule( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientModule', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientModule');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, MODULE, cb );
        }

        function getSeriesStudies( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesStudies', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesStudies');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, STUDIES, cb );
        }

        function getSeriesPatients( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesPatients', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesPatients');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, SERIES, cb );
        }

        function getSeriesInstances( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesInstances', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesInstances');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, INSTANCES, cb );
        }

        function getSeriesModule( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesModule', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesModule');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, MODULE, cb );
        }

        function getStudySeries( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudySeries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudySeries');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, STUDIES, cb );
        }

        function getStudyPatients( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyPatients', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyPatients');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, SERIES, cb );
        }

        function getStudyInstances( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyInstances', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyInstances');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, INSTANCES, cb );
        }

        function getStudyModule( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyModule', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyModule');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, MODULE, cb );
        }

        function getInstanceSeries( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceSeries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceSeries');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, SERIES, cb );
        }

        function getInstancePatients( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstancePatients', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstancePatients');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, "patient", cb );
        }

        function getInstanceStudies( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceStudies', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceStudies');
            }
            const instanceId = getId(args.httpRequest.query),
                cb = args.callback;
            getDatasData(INSTANCES, instanceId, 'study', cb);
    }
        function getInstanceModule( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceModule', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceModule');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, MODULE, cb );
        }

        function getPatientTags( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientTags');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, TAGS, cb );
        }

        function getStudyTags( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyTags');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, TAGS, cb );
        }

        function getSeriesTags( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesTags');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, TAGS, cb );
        }

        function getInstanceTags( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceTags');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, TAGS, cb );
        }

        function getPatientArchive( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientArchive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientArchive');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, ARCHIVE, cb );
        }

        function getStudyArchive( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyArchive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyArchive');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, ARCHIVE, cb );
        }

        function getSeriesArchive( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesArchive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesArchive');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, ARCHIVE, cb );
        }

        function getInstanceArchive( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceArchive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceArchive');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, ARCHIVE, cb );
        }

        function getPatientMedia( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientMedia');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, MEDIA, cb );
        }

        function getStudyMedia( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyMedia');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, MEDIA, cb );
        }

        function getSeriesMedia( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesMedia');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, MEDIA, cb );
        }

        function getInstanceMedia( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceMedia', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceMedia');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, MEDIA, cb );
        }

        function getPatientStatistics( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getPatientStatistics', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatientStatistics');
            }
            const patientId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( PATIENTS, patientId, STATISTICS, cb );
        }

        function getStudyStatistics( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getStudyStatistics', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudyStatistics');
            }
            const studyId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( STUDIES, studyId, STATISTICS, cb );
        }

        function getSeriesStatistics( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getSeriesStatistics', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeriesStatistics');
            }
            const seriesId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( SERIES, seriesId, STATISTICS, cb );
        }

        function getInstanceStatistics( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.getInstanceStatistics', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstanceStatistics');
            }
            const instanceId = getId( args.httpRequest.query ),
                cb = args.callback;
            getDatasData( INSTANCES, instanceId, STATISTICS, cb );
        }

        function deletePatient( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.deletePatient', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.deletePatient');
            }
            const cb = args.callback,
                patientId = getId( args.httpRequest.query );
            deleteData( patientId, PATIENTS, cb );
        }

        function deleteStudy( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.deleteStudy', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.deleteStudy');
            }
            const cb = args.callback,
                studyId = getId( args.httpRequest.query );
            deleteData( studyId, STUDIES, cb );
        }

        function deleteSeries( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.deleteSeries', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.deleteSeries');
            }
            const cb = args.callback,
                seriesId = getId( args.httpRequest.query );
            deleteData( seriesId, SERIES, cb );
        }

        function deleteInstance( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsrest.deleteInstance', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.deleteInstance');
            }
            const cb = args.callback,
                instanceId = getId( args.httpRequest.query );
            deleteData( instanceId, INSTANCES, cb );
        }

        function uploadInstance( args ){
            Y.log('Entering Y.doccirrus.api.inpacsrest.uploadInstance', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.uploadInstance');
            }
            const pathToDcm = args.httpRequest.query.path,
                cb = args.callback;
            Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig )=>{
                if ( err ){
                    return cb( err );
                }
                else if ( inpacsConfig ) {
                    let userString = '';
                    if( inpacsConfig.username && inpacsConfig.password ) {
                        userString = `--user ${inpacsConfig.username}:${inpacsConfig.password} `;
                    }
                    let cmd = `curl ${userString}-X POST http://localhost:8042/instances --data-binary @${pathToDcm}`;
                    exec ( cmd, ( err, out )=>{
                        if ( err ){
                            Y.log( "Uploading instance failed. Error: " + JSON.stringify( err ), "error", NAME );
                            return cb( err );
                        }
                        try {
                            out = JSON.parse( out );
                            return cb( null, out );
                        }
                        catch (e) {
                            Y.log( "Uploading instance failed. Bad response. Error: " + JSON.stringify( e ), "error", NAME );
                            return cb( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Uploading instance failed. Bad response.' } ) );
                        }
                    } );
                } else {
                    Y.log("Empty inpacs.json aborting uploadInstance. ", "warn", NAME);
                    return cb();
                }
            } );
        }
        /**
         * @class devicelog
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).inpacsrest = {
            /**
             * @property name
             * @type {String}
             * @default inpacsrest-api
             * @protected
             */
            name: NAME,

            modifyData,

            getChanges,

            getPatients: function( args ) {
                Y.log('Entering Y.doccirrus.api.inpacsrest.getPatients', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getPatients');
                }
                getPatients( args.callback );
            },
            getPatientById,
            getPatientStudies,
            getPatientSeries,
            getPatientInstances,
            getPatientModule,
            getPatientTags,
            getPatientArchive,
            getPatientMedia,
            getPatientStatistics,
            deletePatient,

            getStudies: function( args ) {
                Y.log('Entering Y.doccirrus.api.inpacsrest.getStudies', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getStudies');
                }
                getStudies( args.callback );
            },
            getStudyById,
            getStudyPatients,
            getStudySeries,
            getStudyInstances,
            getStudyModule,
            getStudyTags,
            getStudyArchive,
            getStudyMedia,
            getStudyStatistics,
            deleteStudy,

            getSeries: function( args ) {
                Y.log('Entering Y.doccirrus.api.inpacsrest.getSeries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getSeries');
                }
                getSeries( args.callback );
            },
            getSeriesById,
            getSeriesStudies,
            getSeriesPatients,
            getSeriesInstances,
            getSeriesModule,
            getSeriesTags,
            getSeriesArchive,
            getSeriesMedia,
            getSeriesStatistics,
            deleteSeries,

            getInstances: function( args ) {
                Y.log('Entering Y.doccirrus.api.inpacsrest.getInstances', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsrest.getInstances');
                }
                getInstances( args.callback );
            },
            getInstanceById,
            getInstanceStudies,
            getInstanceSeries,
            getInstancePatients,
            getInstanceModule,
            getInstanceTags,
            getInstanceArchive,
            getInstanceMedia,
            getInstanceStatistics,
            deleteInstance,
            uploadInstance
        };

    },

    '0.0.1', {
        requires: [
            'inpacs-api'
        ]
    }
);

