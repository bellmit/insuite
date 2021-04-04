/**
 * User: dcdev
 * Date: 2/21/19  1:20 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add('ipc-monitor', function(Y, NAME) {
    const cluster = require('cluster');
    const { formatPromiseResult } = require( 'dc-core' ).utils;
    const N_MSGS_TO_STORE = 20;

    /**
     * Get redis data by key.
     * @param {String} key - redis key
     * @returns {Promise}
     */
    const getData = ( key ) => {
        return new Promise( ( resolve, reject ) => {
            Y.doccirrus.cacheUtils.dataCache.getData( { key: key }, ( err, result ) => {
                if ( err ) {
                    return reject( err );
                }
                return resolve( result );
            } );
        } );
    };

    /**
     * Set redis data.
     * @param {String} key - key
     * @param {Object} data - data to set
     * @returns {Promise}
     */
    const setData = ( { key, data} ) => {
        return new Promise( ( resolve, reject ) => {
            Y.doccirrus.cacheUtils.dataCache.setData( { key, data }, ( err, result ) => {
                if ( err ) {
                    return reject( err );
                }
                return resolve( result );
            } );
        } );
    };

    /**
     * Store information about blocked event loop to the redis.
     * Information about blocked event loop will be stored to the 'eventLoopBlock' collection.
     * @param {Number} time - how long event loop was blocked
     * @param {Number} workerId - cluster worker id
     */
    const saveEventLoopInfo = async ( time, workerId ) => {
        let eventLoopBlock = 'eventLoopBlock',
            workers = 'workers',
            timestamp = new Date().toISOString(),
            dataToStore = [];
        Y.log( `node.event-loop was blocked: threshold ${time}, worker ID ${workerId}, timespamp ${timestamp}`, 'warn', NAME );

        let [ err, result ] = await formatPromiseResult( getData( eventLoopBlock ) );
        if ( err ) {
            Y.log( `Error while tried to get redis data for key ${eventLoopBlock}: ${err}`, 'error', NAME );
            return;
        }
        if ( result ) {
            dataToStore = result;
        }

        if( dataToStore.length >= N_MSGS_TO_STORE ) {
            // reduce the length of this array, do not let it grow infinitely.
            let tmp = dataToStore.slice( 0, N_MSGS_TO_STORE-1 );
            dataToStore = tmp;
        }

        dataToStore.unshift( {
            blockTime: time,
            workerId: workerId,
            timestamp: new Date().toISOString()
        } );
        [ err, result ] = await formatPromiseResult( setData ( {
            key: eventLoopBlock,
            data: dataToStore
        } ) );
        if ( err ) {
            Y.log( `Error while tried to store new set of data for key ${eventLoopBlock}: ${err}`, 'error', NAME );
            return;
        }
        Y.log( `${result}: added new note about blocked event to the redis`, 'info', NAME );

        [ err, result ] = await formatPromiseResult( getData( workers ) );
        if ( err ) {
            Y.log( `Error while tried to receive workers data by key ${workers}: ${err}`, 'error', NAME );
            return;
        }
        if ( !result ) {
            Y.log( `Was not able to receive any results for key ${workers}`, 'error', NAME );
            return;
        }

        result = result.map( worker => {
            worker.blockCount = worker.blockCount ? ( worker.id.toString() === workerId.toString() ? worker.blockCount + 1 : worker.blockCount )
                : ( worker.id.toString() === workerId.toString() ? 1 : 0 );
            return worker;
        } );
        [ err, result ] = await formatPromiseResult( setData ( {
            key: workers,
            data: result
        } ) );
        if ( err ) {
            Y.log( `Error while tried to update workers data with event loop block issue: ${err}`, 'error', NAME );
        }
    };

    /**
     * Detects event loop block and report to redis in case if it was blocked.
     * Only detects very extreme blocks.
     */
    const ipcMonitor = () => {
        let start = process.hrtime();
        let interval = 10000;
        let threshold = 2000;

        return setInterval(async function () {
            let delta = process.hrtime(start);
            let sec = delta[0] * 1e9 + delta[1];
            let ms = sec / 1e6;
            let n = ms - interval;

            if (n > threshold) {
                await saveEventLoopInfo(Math.round(n), cluster.isWorker ? cluster.worker.id : 0 );
            }
            start = process.hrtime();
        }, interval).unref();
    };

    /**
     * Saves cluster - master/workers status to redis.
     */
    const saveWorkersInformation = async () => {
        let key = 'workers';
        let workers = [];

        let [ err, result ] = await formatPromiseResult( getData( key ) );
        if ( err ) {
            Y.log( `Error while tried to receive active workers data from redis: ${err}`, 'error', NAME );
            return;
        }
        if ( result ) {
            Y.log( `${result}: received workers from redis`, 'info', NAME );
            workers = result;
        }

        if ( cluster.isMaster ) {
            workers.push( {
                id: 0,
                updateTime: new Date().toISOString()
            } );
        }

        for ( let worker in cluster.workers ) { //eslint-disable-line
            if( worker ) {
                workers.push({
                    id: worker,
                    updateTime: new Date().toISOString()
                } );
            }
        }

        [ err, result ] = await formatPromiseResult( setData( {
            key: key,
            data: workers
        } ) );
        if ( err ) {
            Y.log( `Error while tried to store information to the redis: ${err}`, 'error', NAME );
            return;
        }
        Y.log( `${result}: stored information to the redis`, 'info', NAME );
    };

    /**
     * Update redis collection with workers. Add redis connection status.
     * If incoming worker is not stored in 'workers' collection - create new row with data.
     * @param {Object} worker - worker object with ID
     * @param {Boolean} isConnected - true - redis is connected, otherwise - not connected
     */
    const redisConnection = async ( worker, isConnected ) => {
        let workerId = worker.id;
        let [ err, result ] = await formatPromiseResult( getData( 'workers') );
        if ( err ) {
            Y.log( `Error while tried to receive workers data: ${err}`, 'error', NAME );
            return;
        }

        if( !result ) {
            result = [];
        }

        //During the first initialization of project only master instance will be active.
        if ( !result && worker && worker.id && worker.id === 0 ) {
            result = [];
            result.push( {
                id: workerId,
                updateTime: new Date().toISOString(),
                blockCount: 0
            } );
        }

        result = result.map( w => {
            if ( w.id.toString() === workerId.toString() ) {
                w.redisConnection = isConnected;
            }
            return w;
        } );

        if ( !result.some( w => w.id.toString() === workerId.toString() ) ) {
            result.push( {
                id: workerId,
                updateTime: new Date().toISOString(),
                redisConnection: isConnected,
                blockCount: 0
            } );
        }

        [ err, result ] = await formatPromiseResult( setData({ key: 'workers', data: result } ) );
        if ( err ) {
            Y.log( `Error while tried to update workers data with redis status: ${err}`, 'error', NAME );
            return;
        }
        Y.log( `${result}: updated workers data with redis connection status`, 'info', NAME );
    };

    /**
     * Create a redis note in case if any worker died.
     * @param {Object} deadWorker - dead worker
     * @param {Boolean} isReportingWorker - true - worker created for reporting died, it will be marked at the UI
     */
    const monitorDeadWorker = async ( deadWorker, isReportingWorker ) => {
        let storeData = [],
            deadWorkers = 'deadWorkers',
            workers = 'workers',
            data = {
                timestamp: new Date().toISOString(),
                worker: deadWorker.id,
                isReportingWorker,
                pid: deadWorker.process.pid
            };
        let [ err, result ] = await formatPromiseResult( getData( workers ) );
        if ( err ) {
            Y.log( `Error while tried to receive workers information: ${err}`, 'error', NAME );
            return;
        }

        result = result.filter( w => w.id.toString() !== deadWorker.id.toString() );
        [ err, result ] = await formatPromiseResult( setData( { key: 'workers', data: result } ) );
        if ( err ) {
            Y.log( `Error while tried to update workers information: ${err}`, 'error', NAME );
            return;
        }

        [ err, result ] = await formatPromiseResult( getData( deadWorkers ) );
        if ( err ) {
            Y.log( `Error while tried to receive dead workers information`, 'error', NAME );
            return;
        }
        if ( result ) {
            storeData = result;
        }
        storeData.unshift( data );
        [ err, result ] = await formatPromiseResult( setData( { key: deadWorkers, data: storeData } ) );
        if ( err ) {
            Y.log( `Error while tried to store new dead worker information`, 'error', NAME );
            return;
        }
        Y.log( `${result}: stored new data about dead worker ${data.worker}`, 'info', NAME );
    };

    const runOnStart = ( callback ) => {
        // Disabled for MOJ-12208
        // currently the ipcMonitor is disabled, so this function
        // just calls back. But when reqd we can just add it -
        // and not measure the startup load.
        // setTimeout( Y.doccirrus.eventloopmonitor.ipcMonitor, 10000 );
        return callback();
    };

    Y.namespace( 'doccirrus' ).eventloopmonitor = {
        ipcMonitor,
        saveWorkersInformation,
        monitorDeadWorker,
        runOnStart,
        redisConnection
    };

}, '0.0.1', {requires: ['cache-utils']});
