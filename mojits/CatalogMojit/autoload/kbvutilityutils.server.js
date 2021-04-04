/**
 * User: do
 * Date: 26/01/17  16:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvutilityutils', function( Y, NAME ) {
        
        const
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

        function invalidateKbvUtilityAgreements( user, lastPatient, patientId ) {
            // MOJ-14319: [DEPRACATED]
            const
                lastPublicInsurance = lastPatient && Y.doccirrus.schemas.patient.getInsurancesByType( lastPatient, 'PUBLIC' );

            Y.log( 'public insurance changed, reset agreement approval if  necessary', 'debug', NAME );

            if( !lastPublicInsurance ) {
                return;
            }
            let query = {
                actType: 'KBVUTILITY',
                status: {$nin: ['CANCELLED', 'APPROVED']},
                utAgreementApprovedTill: {$ne: null},
                patientId: patientId,
                'utAgreementApprovedForInsurance.0.insuranceGrpId': lastPublicInsurance.insuranceGrpId,
                'utAgreementApprovedForInsurance.0.costCarrierBillingSection': lastPublicInsurance.costCarrierBillingSection,
                'utAgreementApprovedForInsurance.0.insuranceKind': lastPublicInsurance.insuranceKind,
                'utAgreementApprovedForInsurance.0.persGroup': lastPublicInsurance.persGroup
            };

            return runDb( {
                user: user,
                model: 'activity',
                query: query,
                options: {
                    lean: true,
                    select: {
                        _id: 1
                    }
                }
            } ).map( kbvutility => {
                return kbvutility._id;
            } ).then( ids => {
                return Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: {_id: {$in: ids}},
                    data: {
                        utAgreementApprovedTill: null,
                        utAgreementApprovedForInsurance: []
                    },
                    options: {
                        multi: true
                    }
                } );
            } ).then( results => {
                Y.log( 'reseted agreement approval for ' + (results && results.nModified ) + ' kbvutilities', 'debug', NAME );
            } ).catch( err => {
                Y.log( 'could not reset agreement approval: ' + err, 'error', NAME );
            } );
        }

        Y.namespace( 'doccirrus' ).kbvutilityutils = {
            invalidateKbvUtilityAgreements: invalidateKbvUtilityAgreements
        };

    },
    '0.0.1', {
        requires: ['activity-schema', 'patient-schema']
    }
);
