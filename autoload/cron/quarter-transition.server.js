/**
 * User: do
 * Date: 29/07/14  16:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'dcquarter-transition', function( Y, NAME ) {
        "use strict";

        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult} = require( 'dc-core' ).utils,
            moment = require( 'moment' ),
            migrate = require( 'dc-core' ).migrate,
            cluster = require( 'cluster' );

        /**
         * Initialize kronnd 'EndOfQuarterX'events and call reset on every start if needed.
         * Will be executed on VPRC and PRC master only.
         */
        function init() {
            if( cluster.isMaster ) {
                if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
                    Y.doccirrus.kronnd.on( 'EndOfQuarter1', delayedReset );
                    Y.doccirrus.kronnd.on( 'EndOfQuarter2', delayedReset );
                    Y.doccirrus.kronnd.on( 'EndOfQuarter3', delayedReset );
                    Y.doccirrus.kronnd.on( 'EndOfQuarter4', delayedReset );

                    checkIfResetIsNeeded();
                }
            }
        }

        /**
         * EnfOfQuarter events will be fired shortly before midnight, we delay the execution of reset() by 5 minutes
         * to ensure it will be called in new quarter.
         */
        function delayedReset() {
            setTimeout( reset, 1000 * 60 * 5 );
        }

        /**
         * Checks quarter transition admin doc for last cardSwipe reset date. And calls reset() if date is in
         * different quarter than current date.
         */
        function checkIfResetIsNeeded() {

            const SU = Y.doccirrus.auth.getSUForLocal();

            Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'admin',
                query: {
                    _id: Y.doccirrus.schemas.admin.getQuarterTransitionId()
                },
                options: {
                    limit: 1
                },
                callback: ( err, adminDocs ) => {
                    if( err ) {
                        Y.log( `quarter transition: could not get quarterTransitionAdminDoc: ${err}`, 'error', NAME );
                        return;
                    }
                    const
                        rightNow = moment(),
                        quarterTransitionDoc = adminDocs && adminDocs[0];

                    if( !quarterTransitionDoc || !quarterTransitionDoc.cardSwipeResetDate ) {
                        Y.log( `quarter transition: cardSwipeResetDate not set: reset anyway`, 'debug', NAME );
                        reset();
                        return;
                    }
                    const
                        cardSwipeResetDate = moment( quarterTransitionDoc.cardSwipeResetDate );
                    if( rightNow.quarter() !== cardSwipeResetDate.quarter() || rightNow.year() !== cardSwipeResetDate.year() ) {
                        Y.log( `quarter transition: cardSwipeResetDate is set but old ${cardSwipeResetDate.toDate()} so reset`, 'debug', NAME );
                        reset();
                        return;
                    }

                    Y.log( `quarter transition: no need to reset cardSwipes. cardSwipeResetDate is ${cardSwipeResetDate.toDate()}`, 'debug', NAME );
                }
            } );
        }

        /**
         * Iterates all tenants and removes cardSwipes and vsdm proof on all 4 possible insuranceStatus array positions,
         * if one of the array elements is of type public and cardSwipe is less than start of current quarter.
         */
        function reset() {
            const
                startOfQuarter = moment().startOf( 'quarter' ).toDate(),
                query = {
                    $or: [
                        {'insuranceStatus.0.type': 'PUBLIC', 'insuranceStatus.0.cardSwipe': {$lt: startOfQuarter}},
                        {'insuranceStatus.1.type': 'PUBLIC', 'insuranceStatus.1.cardSwipe': {$lt: startOfQuarter}},
                        {'insuranceStatus.2.type': 'PUBLIC', 'insuranceStatus.2.cardSwipe': {$lt: startOfQuarter}},
                        {'insuranceStatus.3.type': 'PUBLIC', 'insuranceStatus.3.cardSwipe': {$lt: startOfQuarter}}
                    ]
                },
                data = {
                    $unset: {
                        'insuranceStatus.0.cardSwipe': 1,
                        'insuranceStatus.1.cardSwipe': 1,
                        'insuranceStatus.2.cardSwipe': 1,
                        'insuranceStatus.3.cardSwipe': 1,

                        'insuranceStatus.0.fk3010': 1,
                        'insuranceStatus.1.fk3010': 1,
                        'insuranceStatus.2.fk3010': 1,
                        'insuranceStatus.3.fk3010': 1,

                        'insuranceStatus.0.fk3011': 1,
                        'insuranceStatus.1.fk3011': 1,
                        'insuranceStatus.2.fk3011': 1,
                        'insuranceStatus.3.fk3011': 1,

                        'insuranceStatus.0.fk3012': 1,
                        'insuranceStatus.1.fk3012': 1,
                        'insuranceStatus.2.fk3012': 1,
                        'insuranceStatus.3.fk3012': 1,

                        'insuranceStatus.0.fk3013': 1,
                        'insuranceStatus.1.fk3013': 1,
                        'insuranceStatus.2.fk3013': 1,
                        'insuranceStatus.3.fk3013': 1
                    }
                };

            async function updateTenant( user, cb ) {
                if( !user ) {
                    Y.log( 'quarter transition: card swipe reset no tenants found ', 'error', NAME );
                    cb();
                    return;
                }

                Y.log( `quarter transition: reset cardSwipes before ${startOfQuarter} for tenant ${user.tenantId}`, 'debug', NAME );

                let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'patient',
                    query,
                    data,
                    migrate: true,
                    options: {
                        multi: true
                    }
                } ) );

                if( err ) {
                    Y.log( `updateTenant: could not reset patients on quarter transition: ${err.stack || err} `, 'error', NAME );
                    return cb( err );
                }
                const nModifiedPatients = result && result.nModified;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'incaseconfiguration',
                    query: {_id: ObjectId( '000000000000000000000001' )},
                    data: {
                        $unset: {
                            kimTreatmentAutoCreationOnEDocLetterReceived: 1,
                            kimTreatmentAutoCreationOnEDocLetterSent: 1
                        }
                    },
                    migrate: true,
                    options: {
                        multi: true
                    }
                } ) );

                if( err ) {
                    Y.log( `updateTenant: could not reset KIM treatment auto creation config on quarter transition: ${err.stack || err} `, 'error', NAME );
                    return cb( err );
                }

                const nModifiedIncaseConfig = result && result.nModified;

                cb( null, `${user.tenantId}: reset cardSwipe of ${nModifiedPatients} patients and ${nModifiedIncaseConfig} incaseconfigs` );

            }

            function count( err, results ) {
                if( err ) {
                    Y.log( 'quarter transition: not all cardSwipes were reset ' + err, 'error', NAME );
                    return;
                } else if( results ) {
                    Y.log( `quarter transition: card swipe reset affected ${(results && results.length)} tenants: \n${results && results.join( '\n' )}`, 'info', NAME );
                }

                const SU = Y.doccirrus.auth.getSUForLocal();

                Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'admin',
                    action: 'update',
                    query: {
                        _id: Y.doccirrus.schemas.admin.getQuarterTransitionId()
                    },
                    options: {
                        upsert: true
                    },
                    data: {$set: {cardSwipeResetDate: startOfQuarter}}
                }, ( err ) => {
                    if( err ) {
                        Y.log( `quarter transition: could not update cardSwipeResetDate: ${err}`, 'error', NAME );
                        return;
                    }
                    Y.log( `quarter transition: updated cardSwipeResetDate to ${startOfQuarter}`, 'debug', NAME );
                } );

            }

            migrate.eachTenantParallelLimit( updateTenant, 1, count );
        }

        Y.doccirrus.auth.onReady( function() {
            // MOJ-2445
            setTimeout( init, 20000 );
        } );

    },
    '0.0.1', {requires: ['dckronnd', 'dcauth', 'dchttps', 'admin-schema']}
);
