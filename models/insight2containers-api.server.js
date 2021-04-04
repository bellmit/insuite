/*global YUI */
'use strict';

YUI.add( 'insight2containers-api', function( Y, NAME ) {

    const
        moment = require( 'moment' ),
        {formatPromiseResult} = require('dc-core').utils;


    /**
     * If start or end date are out of min/max interval use current day instead
     *
     * @param dateRange {Object}
     * @param originalParams.query.containerName {String}
     * @param dateRange.startDate {String}
     * @param dateRange.endDate {String}
     * @return {Object}     with same or corrected startDate/endDate
     */
    function fixDateRange( dateRange ){
        if( dateRange ){
            let
                minDate = new Date( '1970-01-01' ),
                maxDate = new Date( '2100-01-01' ),
                startDate = new Date( dateRange.startDate ),
                endDate = new Date( dateRange.endDate );

            if( endDate < startDate || startDate < minDate || endDate > maxDate ){
                dateRange.startDate = moment().startOf( 'day' ).toISOString();
                dateRange.endDate = moment().endOf( 'day' ).toISOString();
            }
        }
        return dateRange;
    }

    /**
     * Get settings for running particular reporting own or standard
     *
     * @param args
     * @param args.user {Object}
     * @param originalParams.query.containerName {String}
     * @param args.callback {Function}
     * @return {Object}
     */
    async function getByName(args) {
        Y.log('Entering Y.doccirrus.api.insight2containers.getByName', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2containers.getByName');
        }
        const { user, originalParams: { query: { containerName } }, callback } = args;

        if (!containerName) {
            const errObj = new Y.doccirrus.errors.rest('25004');
            Y.log( `getByName: error: ${errObj.message}`, 'error', NAME );
            return callback(errObj);
        }

        let [err, res] = await formatPromiseResult(
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'insight2containers',
                action: 'get',
                query: {
                    name: containerName,
                    userId: user.id
                }
            } )
        );
        if( err ){
            Y.log( `getByName: error getting insight2containers ${err.stack || err}`, 'error', NAME );
            return callback(err);
        }
        if( !res.length ){
            Y.log( `getByName: no containers for ${containerName}`, 'info', NAME);
            return callback(null, {});
        }

        if( res[0].dateRange ){
            res[0].dateRange = fixDateRange( res[0].dateRange );
        }
        callback(null, res[0]);
    }

    function updateConfig(args) {
        Y.log('Entering Y.doccirrus.api.insight2containers.updateConfig', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2containers.updateConfig');
        }
        var user = args.user,
            callback = args.callback,
            containerName = args.query.name;

        getModel(user, 'insight2containers').then( function( model ) {
            model.mongoose.findOneAndUpdate({
                name: containerName,
                userId: user.id
            }, args.data, {
                upsert: true
            }).exec().then( function( res ) {
                callback(null, res);
            }, function( err ) {
                callback(err);
            });
        });
    }

    function resetUserConfigs(args) {
        Y.log('Entering Y.doccirrus.api.insight2containers.resetUserConfigs', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2containers.resetUserConfigs');
        }
        var user = args.user,
            callback = args.callback,
            params = args.originalParams,
            userId = params.userId;

        getModel(user, 'insight2containers').then( function( model ) {
            model.mongoose.find({
                userId: userId
            }).remove().exec().then( function( res ) {
                callback(null, res);
            }, function( err ) {
                callback(err);
            });
        });
    }

    function getModel(user, name) {
        return new Promise(function (resolve, reject) {
            Y.doccirrus.mongodb.getModel( user, name, true, function( err, model ) {
                if( err ) {
                    Y.log('ERR CANT GET '+name+' MODEL', 'error', NAME );
                    reject();
                } else {
                    resolve(model);
                }
            } );
        });
    }

    /**
     * Class case Schemas -- gathers all the schemas that the case Schema works with.
     */
    /**
     * @class insight2
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.api' ).insight2containers = {
        name: NAME,
        getByName,
        updateConfig,
        resetUserConfigs
    };

}, '0.0.1', {
    requires: [
    ]
});
