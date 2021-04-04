/**
 * User: oliversieweke
 * Date: 10.04.18  17:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'workstation-process', function( Y, NAME ) {
        /**
         * @module workstation-proces;
         */

        const
            runDb = Y.doccirrus.mongodb.runDb,
            {formatPromiseResult} = require( 'dc-core' ).utils;

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function preventDeletingWorkstationUsedByProfile( user, workStation, callback) {
            runDb({
                user,
                model: 'profile',
                action: 'get',
                query: { workStation: workStation._id }
            }, ( err, res ) => {
                if ( err ) {
                    Y.log( `Could not verify if work station to be deleted was in use by a profile, Error: ${err}`, 'debug', NAME );
                }
                if ( res.length ) {
                    let profilesGroupedByUsers = res.reduce( ( groupedByUsers, profile ) => {
                        if( groupedByUsers[profile.userId] ) {
                            groupedByUsers[profile.userId].push( profile.profileLabel );
                        } else {
                            groupedByUsers[profile.userId] = [profile.profileLabel];
                        }

                        return groupedByUsers;
                    }, {} );

                    let inUseByUserAndProfilesTable = '<table style="border-collapse: separate; border-spacing: 10px">';
                    for ( user in profilesGroupedByUsers ) {
                        if (profilesGroupedByUsers.hasOwnProperty(user)) {
                            inUseByUserAndProfilesTable += `<tr><td><strong>${user}</strong>:</td><td>${profilesGroupedByUsers[user].join(", ")}</td></tr>`;
                        }
                    }
                    inUseByUserAndProfilesTable += '</table>';

                    return callback( new Y.doccirrus.commonerrors.DCError( 120000, {
                        data: {
                            $workStationName: workStation.name,
                            $inUseByUserAndProfiles: inUseByUserAndProfilesTable
                        }
                    } ) );
                }
                return callback( null );
            });
        }

        async function updateReference( user, organisationalUnit, callback ) {
            let [err, data] = await formatPromiseResult(
                Y.doccirrus.api.ticontext.reloadSMCBs( {user} )
            );

            if( err ) {
                return callback( err );
            }

            return callback( null, data );
        }

        /**
         * @class workstation
         * @namespace doccirrus.schemaprocess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            pre: [
                {
                    run: [ preventDeletingWorkstationUsedByProfile ] ,
                    forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [updateReference],
                    forAction: 'write'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {
        requires: []
    }
);
