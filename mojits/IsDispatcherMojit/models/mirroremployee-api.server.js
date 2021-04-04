/*global YUI */

//var _ = require("lodash");

YUI.add( 'mirroremployee-api', function( Y, NAME ) {

        function getLocations( user ) {
            return new Promise( ( resolve ) => {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'mirrorlocation'
                }, function( err, result ) {
                    if( err ) {
                        Y.log( 'Failed to get locations: ' + err.message, 'error', NAME );
                        resolve( [] );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        // function getPRCDispatch( user ) {
        //     return new Promise( ( resolve ) => {
        //
        //         Y.doccirrus.mongodb.runDb( {
        //             user: user,
        //             action: 'get',
        //             model: 'prcdispatch',
        //         }, function( err, result ) {
        //             if( err ) {
        //                 Y.log( 'Failed to get prcdispatch: ' + err.message, 'error', NAME );
        //                 resolve( [] );
        //             } else {
        //                 resolve( result );
        //             }
        //         } );
        //     } );
        // }

        Y.namespace( 'doccirrus.api' ).mirroremployee = {

            name: NAME,

            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.mirroremployee.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME).wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirroremployee.get');
                }

                let options = Y.merge( {lean: true}, args.options || {} ),
                    callback = args.callback;

                Promise.all( [
                    getLocations( args.user )
                ] ).then( ( res ) => {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'mirroremployee',
                        user: args.user,
                        query: args.query || {},
                        options: options,
                        callback: ( err, result ) => {
                            if( err ) {
                                return callback( err );
                            }
                            let result_p = (result.result) ? result.result : result;

                            if( res[0] ) {

                                res[0].forEach( ( location ) => {

                                    result_p = result_p.map( ( el ) => {

                                        el.locations = el.locations.map( ( elLoc ) => {
                                            let locationId = (true === location.isMainLocation) ? "000000000000000000000001" : location._id.toString();

                                            if( location.prcCustomerNo === el.prcCustomerNo &&
                                                elLoc._id.toString() === locationId ) {
                                                elLoc.commercialNo = location.commercialNo;
                                            }
                                            return elLoc;
                                        } );
                                        return el;
                                    } );

                                } );
                            }

                            callback( null, result );
                        }
                    } );
                } );

            }
        };

    },
    '0.0.1', {
        requires: ['dccommunication', 'dcauth']
    }
);
