/**MDpi
 * Date: 18/02/2016  14:34
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'mirrorpatient-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function verifyRequest( user, mirrorpatient, callback ) {

            const modelName = 'mirrorpatient',
                originalData = mirrorpatient.originalData_;

            let patientId = Y.doccirrus.schemas.patient.getGHDPartnerId( mirrorpatient );

            if (patientId === '') {
                return callback( null, mirrorpatient );
            }

            let query = {
                $and: [
                    {'partnerIds.partnerId': Y.doccirrus.schemas.patient.DISPATCHER.INCARE},
                    {'partnerIds.patientId': patientId}
                ]
            };

            if (originalData && originalData._id) {
                query.$and.push( {'_id': {'$ne': originalData._id}} );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: modelName,
                action: 'count',
                query: query
            }, ( err, count ) => {
                if( err ) {
                    callback( err );
                } else {
                    if( Number( count ) === 0 ) {
                        callback( null, mirrorpatient );
                    } else {
                        Y.log( 'ERROR PatientId is not unique ' + err, 'error', NAME );
                        callback( Y.doccirrus.errors.rest( 400, 'PatientId is not unique', true ) );
                    }
                }
            } );
        }

        /**
         * Class Task Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        verifyRequest
                    ],
                    forAction: 'write'
                }
            ]
        };

    },
    '0.0.1', {requires: ['dchttps', 'mirrorpatient-schema']}
);
