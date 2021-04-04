/**
 * User: pi
 * Date: 24/02/2017  10:50
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'sysnum-api', function( Y, NAME ) {
        /**
         * @module sysnum-api
         */
        const
            DC_CUSTOMER_NO_ID = Y.doccirrus.schemas.sysnum.DC_CUSTOMER_NO_ID;

        function getNextDcCustomerNo( args ) {
            let
                { user, callback, migrate } = args,
                async = require( 'async' ),
                mongoose = require( 'mongoose' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'sysnum', migrate, next );
                },
                function( sysnumModel, next ) {
                    sysnumModel.mongoose.collection.findAndModify( {
                            _id: new mongoose.Types.ObjectId( DC_CUSTOMER_NO_ID )
                        }, null,
                        {
                            $inc: { number: 1 }
                        }, {
                            new: true
                        }, next );
                }
            ], function( err, result ) {
                let
                    newNumber = result && result.value && result.value.number;
                if( err ) {
                    return callback( err );
                }
                if( !newNumber ) {
                    Y.log( 'getNextDcCustomerNo. sysnum entry can not be updated.', 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'sysnum entry can not be updated.' } ) );
                }
                callback( null, newNumber );
            } );

        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class sysnum
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).sysnum = {
            /**
             * @property name
             * @type {String}
             * @default identity-api
             * @protected
             */
            name: NAME,
            getNextDcCustomerNo( args ){
                Y.log('Entering Y.doccirrus.api.sysnum.getNextDcCustomerNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sysnum.getNextDcCustomerNo');
                }
                getNextDcCustomerNo( args );
            },
            getNextInPacsNo( args ){
                Y.log('Entering Y.doccirrus.api.sysnum.getNextInPacsNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sysnum.getNextInPacsNo');
                }
                Y.doccirrus.schemas.sysnum.getNextInPacsNo( args.user, args.callback );
            },
            getNextDQNo( args ){
                Y.log('Entering Y.doccirrus.api.sysnum.getNextDQNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sysnum.getNextDQNo');
                }
                Y.doccirrus.schemas.sysnum.getNextDQNo( args.user, (err, DQnum) => {
                    if( err ) {
                        Y.log( 'Error on getting next DQ sequence ' + err.message, 'error', NAME );
                        return args.callback(err);
                    }
                    DQnum = DQnum && DQnum.number && DQnum.number.toString();
                    DQnum = ( '00000' + DQnum ).substring( DQnum.length );
                    Y.doccirrus.api.practice.getMyPractice( args.user || Y.doccirrus.auth.getSUForLocal() , (err, practice) => {
                        if( err ) {
                            Y.log( 'Error on getting practice data ' + err.message, 'error', NAME );
                            return args.callback(err);
                        }
                        args.callback(err, (practice && practice.dcCustomerNo || '') + '-DQ-' + DQnum );
                    } );
                } );
            },
            getNextDQSNo( args ){
                Y.log('Entering Y.doccirrus.api.sysnum.getNextDQSNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.sysnum.getNextDQSNo');
                }
                Y.doccirrus.schemas.sysnum.getNextDQSNo( args.user, (err, DQSnum) => {
                    if( err ) {
                        Y.log( 'Error on getting next DQS sequence ' + err.message, 'error', NAME );
                        return args.callback(err);
                    }
                    DQSnum = DQSnum && DQSnum.number && DQSnum.number.toString();
                    DQSnum = ( '00000' + DQSnum ).substring( DQSnum.length );
                    Y.doccirrus.api.practice.getMyPractice( args.user || Y.doccirrus.auth.getSUForLocal() , (err, practice) => {
                        if( err ) {
                            Y.log( 'Error on getting practice data ' + err.message, 'error', NAME );
                            return args.callback(err);
                        }
                        args.callback(err, (practice && practice.dcCustomerNo || '') + '-DS-' + DQSnum );
                    } );
                } );
            }

        };

    },
    '0.0.1', { requires: [ 'sysnum-schema' ] }
);
