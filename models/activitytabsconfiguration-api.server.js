/*global YUI */
YUI.add( 'activitytabsconfiguration-api', function( Y, NAME ) {
        'use strict';
        /** @module activitytabsconfiguration-api */

        function get( args ){

            Y.log('Entering Y.doccirrus.api.activitytabsconfiguration.get', 'info', NAME);

            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.activitytabsconfiguration.get');
            }
            const
                { callback } = args;


            Y.doccirrus.api.appreg.get( {
                query: {},
                options: {},
                callback: ( err, res ) => {
                    if( err ) {
                        Y.log( `Error occurred while querying appreg to check if at least one app licensed: ${err}`, 'error', NAME );
                        callback( {
                            status: '500',
                            data: err
                        } );
                    } else {
                        callback(null, getActivityTabsOnly(res) );
                    }
                }
            } );


            function getActivityTabsOnly(appregs) {
                let result = appregs.reduce( (accum, currentAppreg) => {

                    if ( currentAppreg.hasAccess ) {
                        currentAppreg.uiConfiguration.forEach(item => {
                            if ( item.type === 'ACTIVITY_TAB' ) {
                                item.port = currentAppreg.appCurrentPort;
                                accum.push(item);
                            }
                        });
                    }


                    return accum;
                }, []);

                return result.length > 0 ? result : null;
            }
        }

        Y.namespace( 'doccirrus.api' ).activitytabsconfiguration = {
            name: NAME,
            get
        };

    },
    '0.0.1', { requires: [] }
);
