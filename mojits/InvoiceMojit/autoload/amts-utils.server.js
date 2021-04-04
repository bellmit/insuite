/**
 * User: dcdev
 * Date: 6/17/20  10:22 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'amts-utils', function( Y, NAME ) {

        const
            {formatPromiseResult} = require('dc-core').utils,
            i18n = Y.doccirrus.i18n;
        /**
         * syncs case folder
         *
         * @param {object} user - user.
         * @param {object} patient - patient.
         * @param {bool} shouldHaveCaseFolder - shouldHaveCaseFolder.
         * @return {promise} casefolder.
         */

        async function syncCaseFolder( user, patient, shouldHaveCaseFolder ) {

            let
                patientId = patient._id,
                insuranceType = 'SELFPAYER',// TODO: switch to patient.amtsSelectiveCareContractType, when available
                caseFolderType,
                caseFolderTitle;

            // MOJ-14319: [OK] [AMTS] - please check this ticket about additional insurances when implementing PUBLIC and PRIVATE insurances
            switch( insuranceType ) {
                case 'PRIVATE':
                    caseFolderType = 'PRIVATE';
                    caseFolderTitle = i18n( 'InCaseMojit.amts.caseFolderTitle.PRIVATE' );
                    break;
                case 'PUBLIC':
                    caseFolderType = 'PUBLIC';
                    caseFolderTitle = i18n( 'InCaseMojit.amts.caseFolderTitle.PUBLIC' );
                    break;
                case 'BG':
                    caseFolderType = 'BG';
                    caseFolderTitle = i18n( 'InCaseMojit.amts.caseFolderTitle.BG' );
                    break;
                default:
                    caseFolderType = 'SELFPAYER';
                    caseFolderTitle = i18n( 'InCaseMojit.amts.caseFolderTitle.SELFPAYER' );
                    break;
            }

            Y.log( `sync AMTS CaseFolder: patient ${patientId} should have case folder = ${(shouldHaveCaseFolder ? 'YES' : 'NO')}`, 'debug', NAME );

            let [err, res] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                query: {
                    patientId: patientId,
                    type: caseFolderType,
                    additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.AMTS
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `sync AMTS CaseFolder: error while fetcing caseFolder for patient ${patientId} ${err}`, 'error', NAME );
                return;
            }

            let caseFolder = res && res[0];

            if( (!shouldHaveCaseFolder && (!caseFolder || true === caseFolder.disabled)) ||
                (shouldHaveCaseFolder && caseFolder && !caseFolder.disabled) ) {
                Y.log( `sync AMTS CaseFolder: patient ${patientId} nothing to do here`, 'debug', NAME );
                return;
            }

            if( shouldHaveCaseFolder && !caseFolder ) {
                Y.log( `sync AMTS CaseFolder: patient ${patientId} create new AMTS CaseFolder`, 'debug', NAME );

                try {
                    let hasSelfPayerInsurance = patient.insuranceStatus.some(insurance => insurance.type === 'SELFPAYER');

                    if (!hasSelfPayerInsurance) {
                        await Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'update',
                            model: 'patient',
                            query: { _id: patientId },
                            data: {
                                $push: {
                                    insuranceStatus: {
                                        type : 'SELFPAYER',
                                        billingFactor : 'privatversicherte'
                                    }
                                }
                            }
                        } );
                    }

                    let res = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'casefolder',
                        data: {
                            patientId: patientId,
                            title: caseFolderTitle,
                            type: caseFolderType,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.AMTS,
                            skipcheck_: true
                        }
                    } );

                    return {updateOnClient: Boolean( res && res[0] )};

                } catch( err ) {
                    Y.log( `sync AMTS CaseFolder: patient ${patientId} could create new AMTS CaseFolder: ${err}`, 'error', NAME );
                }

            }

            if( caseFolder ) {
                Y.log( `sync AMTS CaseFolder: patient ${patientId} disable AMTS CaseFolder`, 'debug', NAME );
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

                } catch( err ) {
                    Y.log( `sync AMTS CaseFolder: patient ${patientId} could not disable AMTS CaseFolder ${caseFolder._id}: ${err}`, 'error', NAME );
                }
            }

        }

        Y.namespace( 'doccirrus' ).amtsutils = {

            name: NAME,
            syncCaseFolder
        };
    },
    '0.0.1', {requires: ['dcmongodb', 'casefolder-schema']}
);

