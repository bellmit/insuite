/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'ehks-utils', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

        function syncCaseFolder( user, patientId, shouldHaveCaseFolder ) {
            Y.log( `sync HKS CaseFolder: patient ${patientId} should have case folder = ${(shouldHaveCaseFolder ? 'YES' : 'NO')}`, 'debug', NAME );

            return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    patientId: patientId,
                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.HKS
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) ).get( 0 ).then( caseFolder => {
                if( (!shouldHaveCaseFolder && (!caseFolder || true === caseFolder.disabled)) ||
                    (shouldHaveCaseFolder && caseFolder && !caseFolder.disabled) ) {
                    Y.log( `sync HKS CaseFolder: patient ${patientId} nothing to do here`, 'debug', NAME );
                    return;
                }

                if( shouldHaveCaseFolder && !caseFolder ) {
                    Y.log( `sync HKS CaseFolder: patient ${patientId} create new HKS CaseFolder`, 'debug', NAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'casefolder',
                        data: {
                            patientId: patientId,
                            title: 'eHKS',
                            type: 'PUBLIC', // MOJ-14319: [OK] [EDOCS]
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.HKS,
                            skipcheck_: true
                        }
                    } ).then( ( res ) => {
                        return {updateOnClient: Boolean( res && res[0] )};
                    } ).catch( err => {
                        Y.log( `sync HKS CaseFolder: patient ${patientId} could create new HKS CaseFolder: ${err}`, 'error', NAME );
                    } );
                }

                if( caseFolder ) {
                    Y.log( `sync HKS CaseFolder: patient ${patientId} disable HKS CaseFolder`, 'debug', NAME );
                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'casefolder',
                        action: 'put',
                        query: {
                            patientId: patientId,
                            _id: caseFolder._id
                        },
                        data: {
                            disabled: !shouldHaveCaseFolder,
                            skipcheck_: true
                        },
                        fields: 'disabled',
                        options: {
                            override: true
                        }
                    } ).then( ( res ) => {
                        return {updateOnClient: Boolean( res )};
                    } ).catch( err => {
                        Y.log( `sync HKS CaseFolder: patient ${patientId} could not disable HKS CaseFolder ${caseFolder._id}: ${err}`, 'error', NAME );
                    } );
                }

            } );
        }

        function getDocType( actType, additionalContract ) {
            switch( actType ) {
                case 'EHKSD':
                    if( additionalContract ) {
                        return {
                            id: 'EHKS_D_EV',
                            text: 'eDokumentation Hautkrebs-Screening – Dermatologe – Ergänzende Verträge'
                        };
                    }
                    return {
                        id: 'EHKS_D',
                        text: 'eDokumentation Hautkrebs-Screening – Dermatologe'
                    };
                case 'EHKSND':
                    if( additionalContract ) {
                        return {
                            id: 'EHKS_ND_EV',
                            text: 'eDokumentation Hautkrebs-Screening – Nicht-Dermatologe – Ergänzende Verträge'
                        };
                    }
                    return {
                        id: 'EHKS_ND',
                        text: 'eDokumentation Hautkrebs-Screening – Nicht-Dermatologe'
                    };
            }
        }

        function createFileName( context ) {
            const actType = context.activity.actType;
            if( !['EHKSD', 'EHKSND'].includes( actType ) ) {
                throw Error( 'could not create filename from context: unknown actType' );
            }
            let extension;
            if( context.activity.hasAdditionalContract ) {
                extension = 'EHKSND' === actType ? 'HKSNDEV' : 'HKSDEV';
            } else {
                extension = 'EHKSND' === actType ? 'HKSND' : 'HKSD';
            }
            return `${context.location.commercialNo}_${context.patient.ehksPatientNo}_${moment( context.activity.timestamp ).format( 'YYYYMMDD' )}.${extension}`;
        }

        function getContextForActivity( user, activity ) {
            return Promise.props( {
                patient: runDb( {
                    user: user,
                    model: 'patient',
                    query: {
                        _id: activity.patientId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ).then( patient => {
                    if( patient && patient.insuranceStatus ) {
                        patient.insuranceStatus = Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' ); // MOJ-14319: [OK] [EDOCS]
                    }
                    return patient;
                } ),
                location: runDb( {
                    user: user,
                    model: 'location',
                    query: {
                        _id: activity.locationId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ),
                employee: runDb( {
                    user: user,
                    model: 'employee',
                    query: {
                        _id: activity.employeeId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 ),
                caseFolder: runDb( { // TODO: needed?
                    user: user,
                    model: 'casefolder',
                    query: {
                        _id: activity.caseFolderId
                    },
                    options: {
                        lean: true
                    }
                } ).get( 0 )
            } ).then( props => {
                const timestamp = moment( activity.timestamp );
                const quarter = timestamp.quarter();
                const year = timestamp.year();
                let context = Object.assign( props, {
                    activity: activity,
                    xpm: 'pm-ehks',
                    user: user,
                    edmp: {
                        quarter,
                        year
                    }
                } );
                context.fileName = createFileName( context );
                return context;
            } );
        }

        Y.namespace( 'doccirrus' ).ehksutils = {

            name: NAME,
            syncCaseFolder,
            getDocType,
            getContextForActivity
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'casefolder-schema']}
);

