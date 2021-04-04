/*global YUI*/
YUI.add('treatmentutils', function (Y) {

        const
            util = require('util'),
            { formatPromiseResult } = require( 'dc-core' ).utils,
            DCError = Y.doccirrus.commonerrors.DCError,
            getLastSchein = util.promisify( function( user, activity, callback ) {
                const query = {
                    patientId: activity.patientId,
                    locationId: activity.locationId,
                    timestamp: activity.timestamp,
                    caseFolderId: activity.caseFolderId
                };
                Y.doccirrus.api.patient.lastSchein( {user, query, callback} );
            } ),
            getTreatmentCatalogEntryForActivity = util.promisify( function( user, activity, callback ) {
                const originalParams = {
                    code: activity.code,
                    catalogShort: activity.catalogShort,
                    locationId: activity.locationId
                };
                Y.doccirrus.api.catalog.getTreatmentCatalogEntry( {user, originalParams, callback} );
            } );


        /**
         * Get invoicefactor and cache it
         * @param {Object}   user
         * @param {Date}    timestamp
         *
         * @return {Function}
         */
        function getEBMInvoiceFactor( user, timestamp ) {
            return (function() {
                let
                    currentInvoiceFactor;
                return new Promise( ( resolve, reject ) => {
                    if( currentInvoiceFactor ) {
                        resolve( currentInvoiceFactor );
                    } else {
                        Y.doccirrus.api.invoiceconfiguration.invoicefactor( {
                            user,
                            data: {
                                timestamp
                            },
                            callback( err, factor ) {
                                if( err ) {
                                    reject( err );
                                } else {
                                    currentInvoiceFactor = factor;
                                    resolve( currentInvoiceFactor );
                                }
                            }
                        } );
                    }
                } );
            })( user, timestamp );
        }

        /**
         *
         * @param user
         * @param activity
         * @param catEntry
         * @param useOriginalValues
         * @param _doNotSetUserContent
         * @returns {*}
         */

        function setTreatmentData( user, activity, catEntry, useOriginalValues, _doNotSetUserContent = true ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.schemas.activity._setActivityData( {
                        user,
                        entry: catEntry,
                        ignoreList: useOriginalValues ? ["hasVat", "vat"] : [],
                        initData: activity,
                        options: {
                            _doNotSetUserContent,
                            skipBillingFactorCalculation: true
                        }
                    }, ( err, result ) => {
                        if( err ) {
                            return reject( err );
                        } else {
                            Object.assign( activity, result );
                            return resolve( result );
                        }
                    }
                );
            } );
        }

        /**
         * MOJ-14004
         * Sets catalog data and billing information for treatment.
         * Used in
         * - activitysequence-api.server
         * - treatment-api.server
         *
         * @param {Object}      params
         * @param {Function}    callback
         * @returns {Promise<*>}
         */
        async function updateTreatment( params, callback ) {
            const {
                user,
                activity,
                activityData = {},
                timestamp,
                useOriginalValues = false,
                insuranceStatus,
                caseFolderType,
                caseFolderAdditionalType,
                title,
                _doNotSetUserContent = true,
                treatmentApi = false
            } = params;
            let
                err,
                catEntry;

            [err, catEntry] = await formatPromiseResult( Y.doccirrus.treatmentutils.getTreatmentCatalogEntryForActivity( user, activity ) );
            if( err ) {
                return callback( err );
            }

            if( !catEntry ) {
                return callback( new DCError( 18100, {
                    data: {
                        $title: title,
                        $treatmentCode: activity.code
                    }
                } ) );
            }

            // MOJ-14215 see DO comment
            const defaultDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: activity.catalogShort
            } );
            catEntry.catalogRef = defaultDescriptor.filename;

            if( activity.catalogShort === 'AMTS' && ( caseFolderType !== 'SELFPAYER' || caseFolderAdditionalType !== 'AMTS' ) ) {
                return callback( new Error('Activity with AMTS catalog could only be created in SELFPAYER AMTS caseFolder') );
            }
            // set gkv invoice factor of quarter matching timestamp
            if( activity.catalogShort === 'EBM' ) {
                let invoiceFactor;
                [err, invoiceFactor] = await formatPromiseResult( Y.doccirrus.treatmentutils.getEBMInvoiceFactor( user, timestamp ) );
                if( err ) {
                    return callback( err );
                }
                activity.billingFactorValue = invoiceFactor && `${invoiceFactor.factor}`;
            }
            // --------------------------------------- UPDATE BILLING FACTOR ---------------------------------------
            // GOÄ billingFactorValue is determined as follows:
            //    1) If it was changed manually on the client, keep that value
            //    2) If it was provided via Treatment API, use that value
            //    3) If it was not changed manually, or not provided
            //          a) If useOriginalValues was checked, keep the old value.d // does not apply to REST calls
            //          b) If useOriginalValues was unchecked, update as follows
            //              i)  Is there a SCHEIN? Then use the value from that SCHEIN
            //              ii) If not, check the private insurance status of the patient and update accordingly
            //
            if( ['GOÄ', 'AMTS'].includes( activity.catalogShort ) ) {
                if( !treatmentApi && activity.billingFactorValue !== activityData.billingFactorValue &&
                    !Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( activity.code ) ) { // 1)

                    activity.billingFactorValue = activityData.billingFactorValue;
                    activity.billingFactorType = activity.billingFactorType || 'privatversicherte';
                } else if ( treatmentApi && activity.billingFactorValue ) {
                    activity.billingFactorType = activity.billingFactorType || 'privatversicherte';
                } else if( !useOriginalValues ) { // 3.b)
                    let result, lastScheinBillingFactorValue;
                    [err, result] = await formatPromiseResult( Y.doccirrus.treatmentutils.getLastSchein( user, activity ) );
                    lastScheinBillingFactorValue = result[0] && result[0].scheinBillingFactorValue;

                    if( lastScheinBillingFactorValue ) { // 3.b.i)
                        activity.billingFactorValue = lastScheinBillingFactorValue;
                        activity.billingFactorType = activity.billingFactorType || 'privatversicherte';
                    } else { // 3.b.ii)
                        const relevantInsurance = Array.isArray( insuranceStatus ) && insuranceStatus.find( function( insurance ) {
                            return insurance.type === caseFolderType;
                        } );
                        const billingFactorType = relevantInsurance && relevantInsurance.billingFactor;

                        if( billingFactorType ) {
                            activity.billingFactorType = billingFactorType;
                            if ( treatmentApi ) {
                                // activity does not have u_extra therefore we take the billingFactorValue from catEntry
                                activity.billingFactorValue = catEntry.u_extra && catEntry.u_extra.rechnungsfaktor && catEntry.u_extra.rechnungsfaktor[billingFactorType];
                            } else {
                                activity.billingFactorValue = activity.u_extra && activity.u_extra.rechnungsfaktor && activity.u_extra.rechnungsfaktor[billingFactorType] || activity.billingFactorValue;
                            }
                        }
                    }
                }
            }
            if( activity.catalogShort === 'AMTS' ) {
                activity.billingFactorValue = 1;
                activity.billingFactorType = 'selektivvertrag';
            }

            [err] = await formatPromiseResult( Y.doccirrus.treatmentutils.setTreatmentData( user, activity, catEntry, useOriginalValues, _doNotSetUserContent ) );
            if( err ) {
                return callback( err );
            }

            activity.updatedUserContent = catEntry.title;

            callback( null, activity );
        }

        Y.namespace( 'doccirrus' ).treatmentutils = {
            getEBMInvoiceFactor,
            getLastSchein,
            getTreatmentCatalogEntryForActivity,
            setTreatmentData,
            updateTreatment
        };

    },
    '0.0.1',
    {
        requires: [
            'dccommonerrors',
            'activity-schema',
            'patient-api',
            'catalog-api',
            'invoiceconfiguration-api',
            'v_treatment-schema'
        ]
    }
);
