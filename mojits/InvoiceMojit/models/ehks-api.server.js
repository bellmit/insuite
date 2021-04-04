/*global YUI */


YUI.add( 'ehks-api', function( Y, NAME ) {

        const
            eHksActTypes = ['EHKSD', 'EHKSND'],
            getEmployeeIdAndLocationId = Y.doccirrus.edocutils.getEmployeeIdAndLocationId,
            getEmployeeIdAndLocationIdFromLastEhksActivity = ( user, patientId ) => Y.doccirrus.edocutils.getEmployeeIdAndLocationIdFromLastEdmpActivity( user, patientId, eHksActTypes );

        function processResult( user, activity ) {
            const processFns = [
                Y.doccirrus.schemaprocess.activity.updateEditor,
                Y.doccirrus.schemaprocess.activity.setEmployeeName
            ];
            return Y.doccirrus.edocutils.process( user, activity, processFns );
        }

        function createEhksDoc( args ) {
            Y.log('Entering Y.doccirrus.api.ehks.createEhksDoc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ehks.createEhksDoc');
            }
            const
                {user, originalParams: {patientId, caseFolderId, ehksDocType}, callback} = args;

            if( !patientId || !caseFolderId ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'insufficient arguments'} ) );
            }

            if( !eHksActTypes.includes( ehksDocType ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: `unknown eHKS doc type ${ehksDocType}`} ) );
            }

            const
                timestamp = new Date(),
                content = 'Automatisch erzeugt',
                data = {
                    actType: ehksDocType,
                    status: 'CREATED',
                    timestamp,
                    patientId,
                    caseFolderId,
                    content,
                    userContent: content,
                    dmpHeadDate: new Date( 9999, 12 ),
                    skipcheck_: true
                };

            return Promise.resolve().then( () => {
                return getEmployeeIdAndLocationIdFromLastEhksActivity( user, patientId );
            } ).then( result => {
                if( result ) {
                    return Promise.resolve( result );
                }
                return getEmployeeIdAndLocationId( user, patientId );
            } ).then( result => {
                return Object.assign( data, result || {} );
            } ).then( () => {
                return processResult( user, data );
            } ).then( () => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'mongoInsertOne',
                    data
                } );
            } ).then( () => {
                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: user.sessionId,
                    event: 'refreshCaseFolder',
                    msg: {
                        data: {
                            caseFolderId
                        }
                    }
                } );
                callback( null );
            } ).catch( err => {
                callback( err );
            } );
        }

        function isEhksPatientNoLocked( args ) {
            Y.log('Entering Y.doccirrus.api.ehks.isEhksPatientNoLocked', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ehks.isEhksPatientNoLocked');
            }
            const
                user = args.user,
                params = args.originalParams,
                callback = args.callback;

            if( !params.patientId ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'count',
                query: {
                    patientId: params.patientId,
                    dmpDeliveryRef: {$ne: null},
                    actType: {$in: Y.doccirrus.schemas.activity.eHksActTypes}
                }
            } )
                .then( count => 0 < count )
                .then( isLocked => callback( null, {isLocked} ) )
                .catch( err => callback( err ) );
        }

        function checkEhksPatientNo( args ) {
            Y.log('Entering Y.doccirrus.api.ehks.checkEhksPatientNo', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.ehks.checkEhksPatientNo');
            }
            const
                user = args.user,
                patientId = args.originalParams && args.originalParams.patientId,
                ehksPatientNo = args.originalParams && args.originalParams.ehksPatientNo,
                callback = args.callback;

            if( !patientId || !ehksPatientNo ) {
                return callback( Error( 'insufficient arguments' ) );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'count',
                query: {
                    _id: {$ne: patientId},
                    ehksPatientNo: ehksPatientNo
                }
            } ).then( count => {
                callback( null, {valid: !count} );
            } ).catch( err => {
                Y.log( 'could check ehksPatientNo: ' + err, 'error', NAME );
                callback( err );
            } );

        }



        Y.namespace( 'doccirrus.api' ).ehks = {

            name: NAME,
            createEhksDoc,
            isEhksPatientNoLocked,
            checkEhksPatientNo
        };

    },
    '0.0.1', {requires: ['casefolder-schema', 'activity-schema', 'edoc-utils']}
);
