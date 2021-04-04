/**
 * User: sabine.gottfried
 * Date: 22.01.21  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'qdocu-utils', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            Prom = require( 'bluebird' ),
            runDb = Prom.promisify( Y.doccirrus.mongodb.runDb ),
            actTypePmPathMap = {};


        function createFileName( context ) {
            let extension = '';
            const dateNow = new Date();

            if( context.activity.module ) {
                switch( context.activity.module ) {
                    case 'ZKA':
                        extension += 'ZKA';
                        break;
                    case 'ZKH':
                        extension += 'ZKH';
                        break;
                    case 'ZKP':
                        extension += 'ZKP';
                        break;
                    case 'ZKZ':
                        extension += 'ZKZ';
                        break;
                }
            }

            return `${context.location.institutionCode || context.location.commercialNo}_${context.activity.idnrpat}_${moment( dateNow ).format( 'YYYYMMDD' )}_${extension}.xml`;
        }

        function getPmNameByActType( actType ) {
            switch( actType ) {
                case 'QDOCU':
                    return 'pm-qdocu';
            }
        }

        function getPmPathByActType( actType ) {
            return actTypePmPathMap[actType];
        }

        async function getContextForActivity( user, activity ) {
            let props = {};

            props.patient = await runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: activity.patientId
                },
                options: {
                    lean: true
                }
            } ).get( 0 );

            if( props.patient && props.patient.insuranceStatus ) {
                props.patient.insuranceStatus = Y.doccirrus.schemas.patient.getInsuranceByType( props.patient, 'PUBLIC' );
            }

            props.location = await runDb( {
                user: user,
                model: 'location',
                query: {
                    _id: activity.locationId
                },
                options: {
                    lean: true
                }
            } ).get( 0 );

            props.employee = await runDb( {
                user: user,
                model: 'employee',
                query: {
                    _id: activity.employeeId
                },
                options: {
                    lean: true
                }
            } ).get( 0 );

            props.caseFolder = await runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    _id: activity.caseFolderId
                },
                options: {
                    lean: true
                }
            } ).get( 0 );

            props.schein = await runDb( {
                user: user,
                model: 'activity',
                query: {
                    _id: activity.dmpScheinRef,
                    actType: 'SCHEIN'
                },
                options: {
                    lean: true,
                    select: {
                        locationFeatures: 1
                    }
                }
            } ).get( 0 );

            let context = Object.assign( props, {
                activity: activity,
                user: user,
                xpm: getPmNameByActType( activity.actType ),
                edmp: {
                    type: activity.actType,
                    quarter: activity.dmpQuarter,
                    year: activity.dmpYear
                }
            } );
            context.fileName = createFileName( context );
            return context;
        }

        Y.namespace( 'doccirrus' ).qdocuutils = {

            name: NAME,
            getContextForActivity: getContextForActivity,
            getPmNameByActType: getPmNameByActType,
            getPmPathByActType: getPmPathByActType
        };
    },
    '0.0.1', {requires: [
            'dcmongodb',
            'casefolder-schema',
            'patient-schema',
            'dcgridfs',
            'catalog-api',
            'edmp-commonutils',
            'dcauth',
            'dcforms-map-edmp',
            'dcmedia-hpdf',
            'v_meddata-schema',
            'edoc-utils',
            'meddata-api',
            'v_labdata-schema'
        ]}
);

