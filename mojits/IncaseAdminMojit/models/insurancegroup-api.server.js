/**
 * User: do
 * Date: 18.10.18  13:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'insurancegroup-api', function( Y, NAME ) {
        const DCError = Y.doccirrus.commonerrors.DCError;
        const {promisify} = require( 'util' );
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const getModel = promisify( Y.doccirrus.mongodb.getModel );
        const moment = require( 'moment' );

        async function init() {
            const SU = Y.doccirrus.auth.getSUForLocal();
            const NOW = moment().subtract( 1, 'year' ).toDate();
            const pipeline = [
                {
                    $match: {
                        key: null,
                        catalog: /SDKT/,
                        $and: [{$or: [{kt_gueltigkeit_end: {$gt: NOW}}, {kt_gueltigkeit_end: {$gt: NOW}}, {$or: [{ik_gueltigkeit_end: {$gt: NOW}}, {ik_gueltigkeit_end: {$gt: NOW}}]}, {$or: [{ktab_gueltigkeit_end: {$gt: NOW}}, {ktab_gueltigkeit_end: {$gt: NOW}}]}]}]
                    }
                },
                {$group: {_id: {vknr: '$vknr', name: '$name'}}},
                {
                    $project: {
                        _id: 0,
                        kt: '$_id',
                        serialNo: {$substr: ["$_id.vknr", 2, 4]}
                    }
                },
                {
                    $group: {
                        _id: '$serialNo',
                        serialNo: {$first: '$serialNo'},
                        content: {$addToSet: '$kt'}
                    }
                },
                {$project: {_id: 0, serialNo: 1, content: 1}},
                {$out: 'vknrbyserialnos'}
            ];
            let err, vknrBySerialNoModel, catalogModel;

            [err, vknrBySerialNoModel] = await formatPromiseResult( getModel( SU, 'vknrbyserialno', true ) );

            if( err ) {
                Y.log( `could not get catalog model: ${err.stack || err}`, 'error', NAME );
                return;
            }

            [err] = await formatPromiseResult( vknrBySerialNoModel.mongoose.remove( {} ) );

            if( err ) {
                Y.log( `could not remove vknrbyserialno entries on init: ${err.stack || err}`, 'error', NAME );
                return;
            }

            [err, catalogModel] = await formatPromiseResult( getModel( SU, 'catalog', true ) );

            if( err ) {
                Y.log( `could not get catalog model: ${err.stack || err}`, 'error', NAME );
                return;
            }

            [err] = await formatPromiseResult( catalogModel.mongoose.aggregate( pipeline ) );

            if( err ) {
                Y.log( `could not get get insurances grouped by serial No.: ${err.stack || err}`, 'error', NAME );
                return;
            }

            Y.log( `initialized vknrbyserialno collection for insurancegroups`, 'debug', NAME );
        }

        function search( args ) {
            Y.log('Entering Y.doccirrus.api.insurancegroup.search', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insurancegroup.search');
            }
            const SU = Y.doccirrus.auth.getSUForLocal();
            let query;

            if( args.originalParams && args.originalParams.selectedContent && args.originalParams.selectedContent.length ) {
                query = {$and: [args.query, {serialNo: {$nin: args.originalParams.selectedContent}}]};
            } else {
                query = args.query;
            }
            Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'vknrbyserialno',
                query: query,
                options: args.options,
                callback: args.callback
            } );
        }

        async function saveAsync( args ) {
            const {user, originalParams = {}} = args;
            const data = originalParams.data;
            const id = data._id;
            delete data._id;

            if( !data ) {
                const message = 'No data passed';
                Y.log( `could not save insurance group with action and id ${id} "${message}"`, 'error', NAME );
                throw DCError( 500, {message} );
            }

            const action = id ? 'put' : 'post';

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action,
                model: 'insurancegroup',
                query: 'put' === action ? {_id: id} : undefined,
                data: Y.doccirrus.filters.cleanDbObject( data ),
                fields: 'put' === action ? Object.keys( data ) : undefined,
                options: {entireRec: true}
            } ) );

            if( err ) {
                Y.log( `could not save insurance group with action ${action} and id ${id} ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return result;
        }

        function save( args ) {
            Y.log('Entering Y.doccirrus.api.insurancegroup.save', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insurancegroup.save');
            }
            saveAsync( args ).then( result => args.callback( null, result ) ).catch( err => args.callback( err ) );
        }

        async function getInsuranceGroupIdsBySerialNo( args ) {
            const {user, serialNo} = args;
            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'insurancegroup',
                query: {
                    ['items.serialNo']: serialNo
                },
                options: {
                    lean: true,
                    select: {_id: 1}
                }
            } ) );

            if( err ) {
                Y.log( `getInsuranceGroupIdsBySerialNo: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            return result.length ? result.map( insuranceGroup => insuranceGroup._id.toString() ) : ['000000000000000000000222'];
        }

        Y.doccirrus.auth.onReady( function() {
            // MOJ-2445
            setTimeout( init, 7000 );
        } );

        Y.namespace( 'doccirrus.api' ).insurancegroup = {
            name: NAME,
            server: {
                getInsuranceGroupIdsBySerialNo
            },
            search,
            save
        };

    },
    '0.0.1', {requires: ['dcmongodb', 'insurancegroup-schema', 'vknrbyserialno-schema', 'dccommonerrors']}
);
