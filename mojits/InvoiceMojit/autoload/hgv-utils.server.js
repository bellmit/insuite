/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'hgv-utils', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb ),
            {formatPromiseResult} = require('dc-core').utils;

        /**
         * syncs case folder
         *
         * @param {object} user - user.
         * @param {int} patientId - id.
         * @param {bool} shouldHaveCaseFolder - shouldHaveCaseFolder.
         * @return {promise} casefolder.
         */

        async function syncCaseFolder( user, patientId, shouldHaveCaseFolder ) {


            Y.log( `sync HGV CaseFolder: patient ${patientId} should have case folder = ${(shouldHaveCaseFolder ? 'YES' : 'NO')}`, 'debug', NAME );

            let [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    patientId: patientId,
                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.HGV
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `sync HGV CaseFolder: error while fetcing caseFolder for patient ${patientId} ${err}`, 'error', NAME );
                return;
            }

            let caseFolder = res && res[0];

            if( (!shouldHaveCaseFolder && (!caseFolder || true === caseFolder.disabled)) ||
                (shouldHaveCaseFolder && caseFolder && !caseFolder.disabled) ) {
                Y.log( `sync HGV CaseFolder: patient ${patientId} nothing to do here`, 'debug', NAME );
                return;
            }

            if( shouldHaveCaseFolder && !caseFolder ) {
                Y.log( `sync HGV CaseFolder: patient ${patientId} create new HKS CaseFolder`, 'debug', NAME );

                try {

                    let res = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'casefolder',
                        data: {
                            patientId: patientId,
                            title: 'HGV',
                            type: 'PUBLIC',
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.HGV,
                            skipcheck_: true
                        }
                    } );

                    return {updateOnClient: Boolean( res && res[0] )};

                } catch (err) {
                    Y.log( `sync HGV CaseFolder: patient ${patientId} could create new HGV CaseFolder: ${err}`, 'error', NAME );
                }

            }

            if( caseFolder ) {
                Y.log( `sync HGV CaseFolder: patient ${patientId} disable HGV CaseFolder`, 'debug', NAME );
                try {

                    let res = await Y.doccirrus.mongodb.runDb( {
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
                    } );

                    return {updateOnClient: Boolean( res )};

                } catch (err) {
                    Y.log( `sync HGV CaseFolder: patient ${patientId} could not disable HGV CaseFolder ${caseFolder._id}: ${err}`, 'error', NAME );
                }
            }

        }

        /**
         * creates file name
         *
         * @param {object} context - activity context.
         * @return {string} filename.
         */
        function createFileName( context ) {
            const actType = context.activity.actType;
            const dmpType = context.activity.dmpType;
            const HGVPatientNo = context.patient.HGVPatientNo;
            const commercialNo = context.location.commercialNo;
            const timestamp = moment( context.activity.timestamp ).format( 'YYYYMMDD' );
            let extension = actType === 'HGV' ? 'QSHGV' : 'QSHGVK';
            switch( actType ) {
                case 'HGV':
                    extension = dmpType === 'FIRST' ? 'QSHGVVV' : 'QSHGVNV';
                    break;
                case 'HGVK':
                    extension = dmpType === 'FIRST' ? 'QSHGVKVV' : 'QSHGVKNG';
                    break;
                default:
                    throw Error( `${actType} is not a valid hgv actType` );
            }
            return `${commercialNo}_${HGVPatientNo}_${timestamp}.${extension}`;
        }

        /**
         * returns context for activity
         *
         * @param {object} user - user.
         * @param {object} activity - activity.
         * @return {object} the context.
         */

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

            props.caseFolder = runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    _id: activity.caseFolderId
                },
                options: {
                    lean: true
                }
            } ).get( 0 );

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

        }

        Y.namespace( 'doccirrus' ).hgvutils = {

            name: NAME,
            syncCaseFolder,
            getContextForActivity
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'casefolder-schema']}
);

