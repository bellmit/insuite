/*global YUI */

const
    child = require( 'child_process' ),
    {formatPromiseResult} = require( 'dc-core' ).utils;

YUI.add( 'settings-process', function( Y, NAME ) {

        function syncPRCWithNewSettings( user, settings, callback ) {
            // eslint-disable-next-line callback-return
            callback( null, settings );

            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(
                user,
                'prcSettings',
                {
                    restoreStatus: settings.isRestoreFromISCD ? 'REQUESTED' : 'OFF'
                },
                () => {}
            );
        }

        /**
         * Switch the external prescription software
         *
         * @param {object} user
         * @param {Document} settings
         * @param {Function} callback
         * @returns {void}
         */
        function switchExternalPrescriptionSoftware( user, settings, callback ) {
            if ( !settings.isModified( 'useExternalPrescriptionSoftware' ) ) {
                return callback( null, settings );
            }

            const state = settings.useExternalPrescriptionSoftware ? 'enable' : 'disable';

            if ( !Y.config.api.get( 'insuite-admin' ).has( `externalPrescriptionSoftware.command.${state}` ) ) {
                return callback( null, settings );
            }

            const command = Y.config.api.get( 'insuite-admin' ).get( `externalPrescriptionSoftware.command.${state}` );

            Y.log( `Try to ${state} external prescription software`, 'info', NAME );

            child.exec( command, ( error ) => {
                if (error) {
                    Y.log( `Command to ${state} external prescription software failed. ${error}`, 'error', NAME );
                    return callback( `Unable to ${state} external prescription software` );
                }
                callback( null, settings );
            } );
        }

        /**
         * check if there are duplicates in location commercialNo, if exists then prevent
         * switching allowSameCommercialNo property OFF
         *
         * @param {object} user
         * @param {Document} settings
         * @param {Function} callback
         * @returns {void}
         */
        async function checkIfSwitchingOfSameCommercialNoIsAllowed( user, settings, callback ) {
            let originalData = settings.originalData_ || {};
            //only check if option is toggled from ON to OFF
            if ( originalData.allowSameCommercialNo !== true || settings.allowSameCommercialNo !== false ) {
                return callback( null, settings );
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.api.location.areThereSameCommercialNoAssigned( { user } ) );
            if( err ){
                Y.log( `checkIfSwitchingOfSameCommercialNoIsAllowed: error looking for locations with same commercial No : ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( result.length ){
                return callback( new Y.doccirrus.commonerrors.DCError( '40010', { data: {
                    $foundLocations: result.map( loc => {
                        return `${loc._id} (${loc.locations.join(', ')})\n`;
                    }).join(';')}
                } ) );
            }

            callback( null, settings );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[
            Y.doccirrus.schemaloader.deriveProcessName( NAME )
        ] = {

            pre: [
                {
                    run: [
                        switchExternalPrescriptionSoftware,
                        checkIfSwitchingOfSameCommercialNoIsAllowed
                    ],
                    forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        syncPRCWithNewSettings
                    ],
                    forAction: 'write'
                }
            ],

            audit: {
                /**
                 * Return decription of the audit log
                 *
                 * @param {Document} data
                 * @return {string}
                 */
                descrFn: function( data ) {
                    if ( data.insightRegenerationFlag !== ( data.originalData_ && data.originalData_.insightRegenerationFlag ) ){
                        return ( data.insightRegenerationFlag ) ?
                            Y.doccirrus.i18n( 'InSight2Mojit.audit.description_begin', {
                                data: {
                                    fromDate: data.settings_extra && data.settings_extra.start,
                                    toDate: data.settings_extra && data.settings_extra.end
                                }
                            } ) :
                            Y.doccirrus.i18n( 'InSight2Mojit.audit.description_end' );
                    } else {
                        return data._id; //default
                    }
                }
            },
            name: NAME
        };

    },
    '0.0.1', { requires: ['settings-schema', 'dclicmgr'] }
);
