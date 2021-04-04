/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'flow-api', function( Y, NAME ) {
        const
            util = require('util'),
            fs = require('fs'),
            {formatPromiseResult} = require( 'dc-core' ).utils,
            unlinkProm = util.promisify(fs.unlink);
    
        var blacklist = {};

        var pool,
            RUN_FILE_WATCHER = 'RUN_FILE_WATCHER',
            STOP_FILE_WATCHER = 'STOP_FILE_WATCHER',
            REASSIGNSERIALLISTENERS = "REASSIGNSERIALLISTENERS";

        let serialListeners = [];

        /**
         * @module flow-api
         */

        /**
         * API methods
         */

        /**
         * Executes flow. First matched flow(with flowType or _id) will be executed.
         * @method execute
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.flowType type of flow which should be executed. Can be skipped if _id is set.
         * @param {String} args.query._id flow id which should be executed. Can be skipped if flowType is set.
         * @param {Object} [args.data]
         * @param {Object} args.data.sourceQuery
         * @param {Object} args.data.extraData
         * @param {Object} [args.data.overwrite]
         * @param {String} args.data.selectedCasefolderId would be present for GDT flow if user exports for a casefolder
         * @param {String} [args.test]
         * @param {String} args.data.serialData  data from serial device
         * @param {String} args.data.sourceQuery  query to source api
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function execute( args ) {
            var
                flow,
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {},
                testData = args.test,
                isTest = Boolean( testData ),
                data = args.data || {},
                async = require( 'async' ),
                overwrite = data.overwrite = data.overwrite || {};

            // depending on if execute() has been rest-called or not, this will return the IP or null
            // overwrite.ip = Y.doccirrus.api.sdManager.getIpOfRequestArgs( args );

            // Y.log( 'Flow api. execute flow. FlowType: ' + queryParams.flowType + ', _id: ' + queryParams._id, 'debug', NAME );

            if( !queryParams.flowType && !queryParams._id && !isTest ) {
                return callback( Y.doccirrus.errors.rest( 400, 'flowType or _id must be set', true ) );
            }

            /**
             * Gets data from source resource
             * @param {Object} config
             * @param {Object} config.source source object
             * @param {Object} [config.sourceQuery] query for source
             * @param {Object} [config.overwrite] overwrite data
             * @param {Function} callback
             */
            function getDataFromSource( config, callback ) {
                var source = config.source;

                config.fileBlacklist = blacklist;

                if( !source ) {
                    callback(null, true);
                    return;
                }
                // Y.log( 'Flow api. Try to get data from source. Source type: ' + source.resourceType + ', query: ' + JSON.stringify( config.sourceQuery ), 'debug', NAME );

                var sourceFn = Y.doccirrus.api.flow_sources[source.resourceType];

                if (sourceFn) {
                    sourceFn(config, data, user, callback, isTest);
                } else {
                    Y.log( 'getDataFromSource can not find resourceType: ' + source.resourceType, 'debug', NAME );
                    callback("unsupported source");
                }
            }

            /**
             * Applies transformer to data
             * @param {Object} config
             * @param {Object} config.input data
             * @param {Object} config.transformer transformer
             * @param {Function} callback
             */
            async function applyTransformer( config, callback ) {
                var
                    transformer = config.transformer || {},
                    transformerType = transformer.transformerType,
                    input = config.input;
                if (input.data && input.data.data && Array.isArray(input.data.data)) {
                    input.data = new Buffer(input.data.data);
                }
                Y.log( 'Flow api. Applying transformer. Transformer type: ' + transformerType, 'debug', NAME );
                Y.log( require('util').inspect(flow, {depth: 10, colors: true}), 'debug', NAME );

                try {
                    let transformerFn = Y.doccirrus.api.flow_transformers[transformerType];

                    if (transformerFn) {

                        if( transformerType !== "GDT_JSON" ) {
                            delete config.gdtLogId;
                        }

                        if( transformerType === "GDTPATIENT" || transformerType === "GDTSTUDY" || transformerType === "GDTVIEW" ) {
                            // We need this for creating gdtExport log
                            config.configuredFlow = flow;

                            /**
                             * 'selectedCasefolderId' will be present if user is trying to export patient details by selecting a casefolder.
                             */
                            if( data.selectedCasefolderId ) {
                                config.selectedCasefolderId = data.selectedCasefolderId;
                            }
                        }

                        await transformerFn(config, user, (err, res) => {
                            if( err ) {
                                Y.log( `Transformer finished; err: ${err.stack || err}`, 'warn', NAME );
                                Y.log( 'config/input:', 'debug', NAME );
                                Y.log( require( 'util' ).inspect( config.input, {
                                    depth: 10,
                                    colors: true
                                } ), 'debug', NAME );
                            }
                            if( err && config.input && config.input.path ) {
                                blacklist[config.input.path] = Date.now();
                            }
                            callback( err, res );
                        });
                    } else {
                        Y.log( 'Transformer type: ' + transformerType + ' is not supported', 'warn', NAME );
                        callback("unsupported transformer");
                    }
                } catch( e ) {
                    callback( Y.doccirrus.errors.rest( 400, e.stack || e, true ) );
                }
            }

            /**
             * Applies all flow transformers to data.
             *  Next transformer gets data from previous
             * @param {Object} config
             * @param {Array} config.transformers
             * @param {Object} config.input data
             * @param {Object} [config.overwrite] overwrite data
             * @param {Function} callback
             *
             * @return {Function} callback
             */
            function applyTransformers( config, callback ) {
                var
                    transformers = config.transformers,
                    input = config.input;

                if( !input ) {
                    return callback(null, true);
                }

                input.customLocation = data.customLocation;
                input.customEmployee = data.customEmployee;
                input.lastSchein = data.lastSchein;
                input.selectedActivities = data.selectedActivities;
                input.activeCaseFolderTab = data.activeCaseFolderTab;

                async.eachSeries( transformers || [], async function( transformer, next ) {
                    await applyTransformer( {
                            //transformerType: transformer.transformerType,
                            transformer: transformer,
                            input: input,
                            overwrite: config.overwrite,
                            title: config.title,
                            gdtLogId: config.gdtLogId
                        },
                        function( err, output ) {
                            if( err ) {
                                return next( err );
                            }
                            input = output;
                            next();
                        }
                    );
                }, function( err ) {
                    callback( err, input );
                } );
            }

            /**
             * Sends data to sink source
             * @param {Object} config
             * @param {Object} config.data
             * @param {Object} config.sink
             * @param {Function} config.callback
             *
             * @return {Function} callback
             */
            function sendDataToSink( config ) {
                var
                    dataObj = config.data,
                    sink = config.sink,
                    callback = config.callback;

                if( !sink || !dataObj ) {
                    return callback(null, dataObj || true);
                }
                Y.log( 'Flow api. Try to send data to sink. Source type: ' + sink.resourceType, 'debug', NAME );

                var sinkFn = Y.doccirrus.api.flow_sinks[sink.resourceType];

                if (sinkFn) {
                    sinkFn(config, user, callback, isTest);
                } else {
                    Y.log( 'sendDataToSink can not find resource type: ' + sink.resourceType, 'error', NAME );
                    callback("unsupported sink");
                }
            }

            /**
             * Runs post-process of source
             * @param {Object} config
             * @param {Object} config.flow
             * @param {String} config.postAction
             * @param {String} config.key
             * @param {Function} callback
             */
            function runSourcePostProcess( config, callback ) {
                let { flow, meta: { postAction, key } } = config;
                let source = flow.sources[0] || {};
                Y.log( 'Run post process for resource type: ' + source.resourceType + ', key: ' + key + ', postAction: ' + postAction, 'debug', NAME );

                var sourcePostFn = Y.doccirrus.api.flow_sourcesPostProcess[source.resourceType];

                if (sourcePostFn) {
                    sourcePostFn(config, user, callback);
                } else {
                    Y.log( 'runSourcePostProcess can not find resourceType: ' + source.resourceType, 'debug', NAME );
                    callback("unsupported source postprocess");
                }
            }

            /**
             * Applies transformers and sends data to sink.
             * @param {Object} flow
             * @param {Object} dataDesc can contain data
             * @param {Object} dataDesc.data data
             * @param {Object} [dataDesc._meta] meta data
             * @param {String} dataDesc._meta.postAction post action
             * @param {String} dataDesc._meta.key key of source entry. e.g. filename for file source
             * @param {Object} [dataDesc._data] data
             * @param {Function} callback
             */
            async function processSourceResult( flow, dataDesc, callback ) {
                var
                    data = (dataDesc && dataDesc._data) || dataDesc,
                    meta = dataDesc && dataDesc._meta || {};

                //Only For GDT
                let
                    gdtLogErr,
                    gdtLogId;

                flow.input = data;
                if( flow.flowType === "GDT" && flow.sources && flow.sources[0] && flow.sources[0].resourceType === "FILE" ) {
                    // Means incoming GDT file
                    if( dataDesc && dataDesc._data && dataDesc._data.data && dataDesc._data.path ) {
                        [gdtLogErr, gdtLogId] = await formatPromiseResult(
                                                  Y.doccirrus.api.gdtlog.checkAndCreate({
                                                      user,
                                                      data: {
                                                         buffer: dataDesc._data.data,
                                                         filePath: dataDesc._data.path,
                                                         fileSourceType: "INCOMING",
                                                         flowTitle: flow.title
                                                      }
                                                    })
                                               );

                        if( gdtLogErr ) {
                            if( gdtLogErr.customMessage === "EXISTS" ) {
                                /**
                                 * Only if the file is found in the gtdlogs collection then log the file details in flowlogs collection and delete the file.
                                 * This is not a error scenario and we just want to skip this file neatly.
                                 */
                                let
                                    error;

                                // ----------------- Log duplicate file details in the flowlogs collection ----------------------------------------------
                                [error] = await formatPromiseResult(
                                                    Y.doccirrus.api.flowlog.logDeletedFileDetails({
                                                        user,
                                                        data: {
                                                            flowName: flow.title || "",
                                                            flowComponentName: Y.doccirrus.i18n( 'flow-schema.Flow_T.sources.i18n' ),
                                                            msg: Y.doccirrus.errorTable.getMessage( { code: 21008, data: {$filePath: gdtLogErr.filePath, $fileHash: gdtLogErr.fileHash} }),
                                                            fileDownloadUrl: gdtLogErr.fileDownloadUrl
                                                        }
                                                    })
                                                );

                                if( error ) {
                                    Y.log(`processSourceResult: Error while creating flowlog for duplicate GDT import file: '${gdtLogErr.filePath}' with hash: '${gdtLogErr.fileHash}'. Not deleting the file. Error: ${error.stack || error}`, "error", NAME);
                                } else if( !meta.deviceServer ) {
                                    // ---------------- Now delete the duplicate file from the file system if it is not coming from deviceServer -------------------------
                                    [error] = await formatPromiseResult( unlinkProm(gdtLogErr.filePath) );

                                    if(error) {
                                        Y.log(`processSourceResult: Error while deleting duplicate GDT import file: '${gdtLogErr.filePath}' with hash: '${gdtLogErr.fileHash}'. Error: ${error.stack || error}`, "error", NAME);
                                    }
                                }

                                if(user.id !== 'su') {
                                    // Notify UI via system message as a warning that the duplicate gdt file was received
                                    Y.doccirrus.api.gdtlog.sendDuplicateGdtSystemNotification(user, Y.doccirrus.errorTable.getMessage( { code: 21008, data: {$filePath: gdtLogErr.filePath, $fileHash: gdtLogErr.fileHash} }));
                                }

                                return callback( "GDT_LOG_EXISTS" );
                            } else if( gdtLogErr.customMessage === "SKIP_DUPLICATE" ) {
                                // This condition can only happen on master cluster (mostly from GDT file coming from device server in quick succession).
                                // In this case we skip the file
                                return callback( "GDT_LOG_EXISTS" );
                            }

                            Y.log(`processSourceResult: Error in 'gdtlog.checkAndCreate' for flow name: ${flow.title}. Error: ${gdtLogErr.stack || gdtLogErr}`, "error", NAME);
                            return callback( gdtLogErr );
                        }
                    }
                }

                async.waterfall( [
                    function( next ) {
                        applyTransformers( {
                                input: data,
                                overwrite: overwrite,
                                transformers: flow.transformers,
                                title: flow.title,
                                gdtLogId
                            },
                            function( err, data ) {
                                next( err, data );
                            }
                        );
                    },
                    function( input, next ) {
                        sendDataToSink( {
                            data: input,
                            overwrite,
                            sink: flow.sinks && flow.sinks[0],
                            callback: function( err, data ) {
                                next( err, data );
                            }
                        } );
                    },
                    function( data, next ) {
                        if( !meta ) {
                            return next( null, data );
                        }
                        runSourcePostProcess( {
                            flow,
                            meta
                        }, function( err ) {
                            next( err, data );
                        } );
                    }
                ], function( err, data ) {
                    if( err && err.data && meta && meta.key ) {
                        if ("object" === typeof err.data) {
                            err.metaKey = meta;
                        } else {
                            err.data += ' ' + meta.key;
                        }
                    }
                    callback( err, data );
                } );

            }

            function templateMap( template, data ) {
                if ( template ) {
                    let matches = template.match( /\${.+?}/ );
                    if ( matches ) {
                        matches.forEach( t => {
                            let attributes = t.substring( 2, t.length - 1 ).split(".");
                            var element = data;
                            for (let i = 0; i < attributes.length; i++) {
                                if ( element[ attributes[i] ] ) {
                                    element = element[ attributes[i] ];
                                } else {
                                    Y.log( "obj chain " + attributes, 'info', NAME );
                                    Y.log( "obj chain failed at element "+i+", "+attributes[i], 'info', NAME );
                                    Y.log( "with data:", 'info', NAME );
                                    Y.log( data, 'info', NAME );
                                    element = "null";
                                    break;
                                }
                            }
                            template = template.replace( t, element );
                        } );
                    }
                }
                return template;
            }

            /**
             * Execute app if sink requires it.
             * @param {Object} flow
             * @param {Function} callback
             */
            function postProcessExecuteApp( flow, callback ) {

                var sink = flow.sinks && flow.sinks[0];

                if( sink && sink.executeApp ) {
                    sink.executePath = templateMap( sink.executePath, flow );
                    sink.executeArgs = templateMap( sink.executeArgs, flow );

                    Y.doccirrus.api.device.executeApp( {
                        query: {
                            path: sink.executePath,
                            args: sink.executeArgs,
                            s2eClientName: sink.executeClient,
                            overwrite: flow.overwrite
                        },
                        callback: callback
                    } );
                } else {
                    setImmediate( function() {
                        callback();
                    } );
                }

            }

            /**
             * Adds extra data to data object.
             *  If key from extraData exists in target object, this property(object)
             *  will be updated.
             * @param {Object} target
             * @param {Object} extraData
             */
            function addExtraData( target, extraData ) {
                if( 'object' === typeof extraData && extraData ) {
                    Y.each( extraData, function( value, key ) {
                        if( 'object' === typeof target[key] && target[key] ) {
                            setImmediate( function() {
                                addExtraData( target[key], value );
                            } );
                        } else {
                            target[key] = value;
                        }
                    } );
                }
            }

            /**
             * Runs flow post process.
             *  Will be called ONLY once after flow is finished, even if flow generates several output sources.
             * @param {Object} params
             * @param {Object} params.flow
             * @param {Function} params.callback
             */
            function runFlowPostProcess( params ) {
                var
                    flow = params.flow,
                    callback = params.callback;
                Y.log( 'Flow api. running flow post process.', ' debug', NAME );
                async.series( [
                    function( next ) {
                        flow.overwrite = overwrite;
                        postProcessExecuteApp( flow, function( err ) {
                            next( err, flow );
                        } );
                    }
                ], function( err ) {
                    callback( err );
                } );
            }

            async.waterfall( [
                function( next ) {
                    var
                        query = {};

                    if( testData ) {
                        return next( null, [testData] );
                    }
                    if( queryParams.flowType ) {
                        query.flowType = queryParams.flowType;
                    }
                    if( queryParams._id ) {
                        query._id = queryParams._id;
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'flow',
                        action: 'get',
                        query: query,
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, next );
                },
                function( flows, next ) {
                    flow = flows && flows[0];
                    if( !flow ) {
                        Y.log( 'Flow not found. flowType: ' + queryParams.flowType + ', _id: ' + queryParams._id, 'debug', NAME );
                        return next( Y.doccirrus.errors.rest( 20400, '', true ) );
                    }
                    async.waterfall( [
                        function( _next ) {
                            if( flow.sinks[0] !== undefined ){
                                overwrite.ip = Y.doccirrus.api.sdManager.getIpOfRequestArgs( args );
                            }
                            getDataFromSource(
                                {
                                    title: flow.title,
                                    source: flow.sources && flow.sources[0],
                                    sourceQuery: data.sourceQuery,
                                    overwrite: overwrite
                                },
                                function( err, data ) {
                                    _next( err, data );
                                }
                            );
                        },
                        function( inputs, _next ) {
                            // data that come from Mediport flow has object type
                            // need to wrap it in array in order to proceed with flow execution
                            if ( !Array.isArray( inputs ) ) {
                                inputs = [ inputs ];
                            }
                            let output = [];
                            async.eachSeries( inputs || [], function( input, done ) {
                                if( input._data && input._data.data && input._data.data && 'Buffer' === input._data.data.type ){
                                    input._data.data = new Buffer( input._data.data.data );
                                }
                                // inject extra data
                                addExtraData( input, data && data.extraData );
                                processSourceResult( flow, input, function( error, result ){
                                    output.push( {
                                        result,
                                        error
                                    } );
                                    // TODO MOJ-13226: possible process flag from flow which controls either to stop or continue the batch on an error
                                    done();
                                } );
                            }, function( err ) {
                                // in order to handle SendControl.xml creation for MediPort
                                // this code was added TODO think about better implementation
                                if ( flow.flowType === 'KVG' ) {
                                    let sink = flow.sinks[ 0 ];
                                    Y.doccirrus.api.mediport.putSendControlToMediportDir( {
                                        xmlFiles: inputs,
                                        user,
                                        path: sink.incomingFileDirPath,
                                        deviceServer: sink.deviceServers[ 0 ],
                                        callback: _next
                                    } );
                                } else {
                                    _next( err, output );
                                }
                            } );
                        },
                        function( data, next ) {
                            runFlowPostProcess( {
                                flow: flow,
                                callback: function( err ) {
                                    next( err, data );
                                }
                            } );
                        }
                    ], function( err, data ) {
                        next( err, data );
                    } );
                }
            ], function( err, data ) {
                // Y.log( 'Flow has been executed. Flow type: ' + queryParams.flowType + ', _id: ' + queryParams._id, 'debug', NAME );
                callback( err, data );
            } );
        }

        /**
         * Tests flow
         * @method testFlow
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.flowType type of flow which should be executed. Can be skipped if _id is set.
         * @param {String} args.query._id flow id which should be executed. Can be skipped if flowType is set.
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function testFlow( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                data = args.data || {},
                callback = args.callback,
                async = require( 'async' );

            if( !queryParams.flowType && !queryParams._id && !data ) {
                return callback( Y.doccirrus.errors.rest( 400, 'flowType or _id must be set', true ) );
            }

            function prepareTestSourceData( flow, callback ) {
                var
                    source = flow.sources[0] || {};
                let collectionName = flow.sources[0].collectionName !== 'gridFS'
                    ? flow.sources[0].collectionName
                    : 'fs.files';
                switch( source.resourceType ) {
                    case Y.doccirrus.schemas.v_flowsource.resourceTypes.XDTSERIAL:
                        callback();
                        break;
                    case Y.doccirrus.schemas.v_flowsource.resourceTypes.FILE:
                        callback();
                        break;
                    case Y.doccirrus.schemas.v_flowsource.resourceTypes.DATABASE:
                        //if api method requires more that _id, query should be created here!
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: collectionName,
                            action: 'get',
                            options: {
                                sort: {
                                    _id: -1
                                },
                                limit: 1,
                                lean: true
                            }
                        }, function( err, results ) {
                            if( err ) {
                                if( !err.code ) {
                                    return callback( Y.doccirrus.errors.rest( 400, err.message, true ) );
                                }
                                return callback( err );
                            }
                            callback( err, {_id: results[0] && results[0]._id && results[0]._id.toString()} );
                        } );
                        break;
                    default:
                        callback();
                }
            }

            async.waterfall( [
                function( next ) {
                    if( data ) {
                        next( null, [data] );
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'get',
                            model: 'flow',
                            query: {
                                flowType: queryParams.flowType
                            },
                            options: {
                                limit: 1,
                                lean: true
                            }
                        }, next );
                    }

                }, function( results, next ) {
                    var
                        flow = results[0];
                    if( !flow ) {
                        Y.log( 'Can not find flow. flowType: ' + queryParams.flowType, 'error', NAME );
                        return next( Y.doccirrus.errors.rest( 400, 'Flow not found.', true ) );
                    }
                    if( !data ) {
                        data = flow;
                    }
                    prepareTestSourceData( flow, function( err, data ) {
                        next( err, data );
                    } );
                }, function( options, next ) {
                    let overwrite = args.data.overwrite || {};
                    if (!overwrite.ip) {
                        overwrite.ip = Y.doccirrus.api.sdManager.getIpOfRequestArgs(args);
                    }
                    Y.doccirrus.api.flow.execute( {
                        user: user,
                        data: {
                            sourceQuery: options,
                            overwrite: overwrite
                        },
                        test: data,
                        query: {
                            flowType: queryParams.flowType,
                            _id: queryParams._id
                        },
                        callback: function( err ) {
                            next( err );
                        }
                    } );
                }
            ], function( err ) {
                callback( err );
            } );
        }

        /**
         * Initializes file watcher which executes all file source based flow of every tenant.
         * The watcher executes the flows again in 1 min after all of them have been executed.
         * If none of the tenants has file source based flow, the watcher won't do anything,
         *  until flow collection is changed.
         */
        function initFileWatcher() {
            var
                EventEmitter = require( 'events' ).EventEmitter,
                Migrate = require( 'dc-core' ).migrate,
                interval = 10000;

            require( 'dc-core' ).migrate.eachTenantParallelLimit(
                ( user, cb ) => {
                    reassignSerialListeners( user, cb );
                },
                null,
                ( err ) => {
                    if ( err ) {
                        Y.log( "problem resetting serial listeners:", 'warn', NAME );
                        Y.log( err, 'warn', NAME );
                    }
                }
            );

            Y.log( 'initFileWatcher. Initialize file watcher for flows.', 'debug', NAME );
            function executeFlows() {

                Y.log( ' File watcher is executing all file source based flows of every tenant in system.', 'debug', NAME );
                Migrate.eachActiveTenantParallelLimit( function( superUser, done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: superUser,
                        action: 'get',
                        model: 'flow',
                        query: {
                            'sources.0.resourceType': Y.doccirrus.schemas.v_flowsource.resourceTypes.FILE,
                            '$or': [
                                {'sources.0.triggerManually': false},
                                {'sources.0.triggerManually': {$exists: false}}
                            ]
                        },
                        options: {
                            lean: true,
                            quiet: true
                        }
                    }, async function( err, flows ) {
                        var flowsIds = [];

                        if( err ) {
                            Y.log( 'File watcher can not get flows for tenant user: ' + superUser + '. Error: ' + JSON.stringify( err ), 'debug', NAME );
                            return done();
                        }

                        for( let flow of flows ) {
                            let [err, output] = await formatPromiseResult(
                                new Promise( ( resolve, reject ) => {  // eslint-disable-line
                                    pool.emit('flowExecute', {
                                        _id: flow._id && flow._id.toString(),
                                        user: superUser
                                    }, function( err, data ) {
                                        if( err ) {
                                            return reject( err );
                                        }
                                        // TODO log error to DeviceLog
                                        resolve( data );
                                    });
                                }));

                            if( err ) {
                                Y.log( `executeFlows: Error executing flow: ${flow.title} and flowType: ${flow.flowType}. Error: ${err}`, 'warn', NAME );
                            } else if( Array.isArray( output ) && output.filter( entry => 'error' in entry).length > 0 ) {
                                let errors = output.filter( entry => 'error' in entry ).map( entry => entry.error );
                                Y.log( `Executing flow '${flow.title}' (${flow.flowType}) failed partially: ${JSON.stringify(errors)}`, 'warn', NAME );
                            }
                            flowsIds.push( flow._id );
                        }
                        done( null, flowsIds );
                    } );
                }, 5, function( err, results ) {
                    if( err ) {
                        // errors should not stop process.
                        Y.log( 'File watcher error: ' + JSON.stringify( err ), 'debug', NAME );
                    }
                    if( !results || !results.length ) {
                        Y.log( 'File watcher no result: eachActiveTenantParallelLimit returned with no tenants', 'debug', NAME );
                    }

                    // if there is no flow with File source, then stop watching till the one would not be created
                    if( pool.shouldCallAgain ) {
                        pool.timeout = setTimeout( function() {
                            executeFlows();
                        }, interval );
                    }
                } );
            }

            pool = new EventEmitter();

            pool.watch = function() {
                if( !pool.shouldCallAgain ) {
                    pool.shouldCallAgain = true;
                    executeFlows();
                }
            };

            pool.clearInterval = function() {
                clearInterval( pool.timeout );
            };
            pool.stop = function() {
                pool.shouldCallAgain = false;
                pool.clearInterval();
            };
            pool.on( 'flowExecute', function( config, callback ) {
                var
                    flowId = config._id,
                    user = config.user,
                    calledBackYet = false;

                //  check for duplicate callbacks from execute(), see SUP-11502
                function guardCallback( err, result ) {
                    if ( calledBackYet ) {
                        Y.log( `Duplicate callback on executing flow, stack trace follows: ${new Error().stack}`, 'error', NAME );
                        return;
                    }
                    calledBackYet = true;
                    callback( err, result );
                }

                execute( {
                    user: user,
                    query: {
                        _id: flowId
                    },
                    callback: guardCallback
                } );

            } );
            pool.watch();
        }

        /**
         * Starts ot initializes file watcher
         * @method runFileWatcher
         * @param {Object} args
         * @param {Object} [args.callback]
         */
        function runFileWatcher( args ) {
            var
                callback = args && args.callback;
            Y.log( 'runFileWatcher. run file watcher for flows.', 'debug', NAME );
            if( Y.doccirrus.ipc.isMaster() ) {
                if( pool ) {
                    pool.watch();
                } else {
                    initFileWatcher();
                }
                if( 'function' === typeof callback ) {
                    callback();
                }
            } else {
                Y.doccirrus.ipc.sendAsync( RUN_FILE_WATCHER, {},
                    function() {
                        if( 'function' === typeof callback ) {
                            callback();
                        }
                    } );
            }
        }

        /**
         * Stops file watcher
         * @method stopFileWatcher
         * @param {Object} args
         * @param {Object} [args.callback]
         */
        function stopFileWatcher( args ) {
            var
                callback = args.callback;
            if( Y.doccirrus.ipc.isMaster() ) {
                if( pool ) {
                    pool.stop();
                }
                if( 'function' === typeof callback ) {
                    callback();
                }
            } else {
                Y.doccirrus.ipc.sendAsync( STOP_FILE_WATCHER, {},
                    function() {
                        if( 'function' === typeof callback ) {
                            callback();
                        }
                    } );
            }
        }

        if( (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC()) && Y.doccirrus.ipc.isMaster() ) {
            setTimeout( initFileWatcher, 8000 );
            Y.doccirrus.ipc.subscribeNamed( RUN_FILE_WATCHER, NAME, true, function( params, callback ) {
                runFileWatcher( {
                    callback: callback
                } );
            } );
            Y.doccirrus.ipc.subscribeNamed( STOP_FILE_WATCHER, NAME, true, function( params, callback ) {
                stopFileWatcher( {
                    callback: callback
                } );
            } );
        }

        /**
         * Runs serial source flow
         * @method runSerialSourceFlow
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.serialPath serial path of a device
         * @param {Object} args.data serial data from the device
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function runSerialSourceFlow( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                data = args.data,
                callback = args.callback,
                async = require( 'async' );
            if( !data || queryParams.serialPath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Data and query are required.', true ) );
            }
            async.waterfall( [
                function( next ) {
                    if( queryParams._id ) {
                        return setImmediate( function() {
                            next( null, queryParams._id );
                        } );
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'flow',
                            action: 'get',
                            query: {
                                'sources.resourceType': Y.doccirrus.schemas.v_flowsource.resourceTypes.XDTSERIAL,
                                'sources.serialPath': queryParams.serialPath
                            },
                            options: {
                                limit: 1,
                                lean: true,
                                sort: {
                                    _id: -1
                                }
                            }
                        }, function( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            next( err, results[0] && results[0]._id && results[0]._id.toString() );
                        } );
                    }
                }, function( flowId, next ) {
                    Y.doccirrus.api.flow.execute( {
                        user: user,
                        query: {
                            _id: flowId
                        },
                        data: {
                            serialData: data
                        },
                        callback: next
                    } );
                }
            ], callback );
        }

        /**
         * Gets source config of serial source flow by serial path
         * @method getSourceBySerialPath
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.serialPath
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getSourceBySerialPath( args ) {
            var
                user = args.user,
                queryParams = args.query || {},
                callback = args.callback;
            if( !queryParams.serialPath ) {
                return callback( Y.doccirrus.errors.rest( 400, 'serialPath is missing.', true ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'flow',
                action: 'get',
                query: {
                    'sources.resourceType': Y.doccirrus.schemas.v_flowsource.resourceTypes.XDTSERIAL,
                    'sources.serialPath': queryParams.serialPath
                },
                options: {
                    limit: 1,
                    lean: true,
                    sort: {
                        _id: -1
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, results[0] && results[0].sources[0] );
            } );
        }

        /**
         * Gets flows which have database source and at least one api method of specified collection
         * @method getFlowsForCollection
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.query.collectionName name of the collection
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function getFlowsForCollection( args ) {
            var
                user = args.user,
                queryParams = args.query,
                callback = args.callback,
                apiMethods;

            function flowMapper( flow ) {
                return {
                    _id: flow._id && flow._id.toString(),
                    title: flow.title,
                    flowType: flow.flowType
                };
            }

            if( !queryParams.collectionName ) {
                return callback( Y.doccirrus.errors.rest( 400, 'collection name is missing', true ) );
            }
            if( !Y.doccirrus.schemas[queryParams.collectionName] ) {
                return callback( Y.doccirrus.errors.rest( 400, 'collection does not exist', true ) );
            }

            apiMethods = Y.doccirrus.schemas[queryParams.collectionName].apiMethods || [];
            apiMethods = apiMethods.filter( function( apiMethod ) {
                return 'read' === apiMethod.operationType;
            } ).map( function( apiMethod ) {
                return apiMethod.name;
            } );
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'flow',
                query: {
                    'sources.resourceType': Y.doccirrus.schemas.v_flowsource.resourceTypes.DATABASE,
                    'sources.apiMethod': {$in: apiMethods}
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, results.map( flowMapper ) );
            } );
        }

        /**
         * Gets flows based on query
         * @method getFlows
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getFlows( args ) {
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'get',
                model: 'flow',
                query: args.query
            }, args.callback );
        }

        async function create( args ) {
            let [err, flowId] = await formatPromiseResult(Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'post',
                model: 'flow',
                data: Y.doccirrus.filters.cleanDbObject(args.data),
                options: args.options
            } ) );
            if(err) {
                Y.log(`Failed to create flow. Error: ${err.message || err}`, "error", NAME);
                throw err;
            }
            return {
                ...args.data,
                _id: flowId[0]
            };
        }

        async function update( args ) {
            let [err, flow] = await formatPromiseResult(Y.doccirrus.mongodb.runDb( {
                user: args.user,
                action: 'put',
                model: 'flow',
                query: args.query,
                fields: args.fields,
                data: Y.doccirrus.filters.cleanDbObject(args.data),
                options: args.options
            } ) );
            if(err) {
                Y.log(`Failed to create flow. Error: ${err.message || err}`, "error", NAME);
                throw err;
            }
            return flow[0];
        }

        function filterActiveFlows(flows, callback) {
            Y.doccirrus.api.sdManager.getS2eClients({callback: (err, devices) => {
                if (err) {
                    callback(err);
                } else {
                    flows = flows.filter(flow=>{
                        if ( flow.sources && flow.sources[0] && Array.isArray(flow.sources[0].deviceServers) && Y.doccirrus.schemas.file.fileTypes && Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER === flow.sources[0].fileType ) {
                            for( let deviceServer of flow.sources[0].deviceServers ) {
                                if( devices.indexOf( deviceServer ) > -1 ) {
                                    return true;
                                }
                            }
                            return false;
                        } else if ( flow.sinks && flow.sinks[0] && Array.isArray( flow.sinks[0].deviceServers ) && Y.doccirrus.schemas.file.fileTypes && Y.doccirrus.schemas.file.fileTypes.DEVICE_SERVER === flow.sinks[0].fileType ) {
                            for( let deviceServer of flow.sinks[0].deviceServers ) {
                                if( devices.indexOf( deviceServer ) > -1 ) {
                                    return true;
                                }
                            }
                            return false;
                        } else if ( flow.sources[0].executeClient ) {
                            return devices.indexOf( flow.sources[0].executeClient ) > -1;
                        } else if ( flow.sinks[0] && flow.sinks[0].executeClient ) {
                            return devices.indexOf( flow.sinks[0].executeClient ) > -1;
                        }
                        return true;
                    });
                }
                callback(null, flows);
            }});
        }

        /**
         * Gets flows based on query
         * @method getFlows
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getActiveFlows( args ) {
            var {user, query, callback} = args;
            getFlows({
                user: user,
                query: query,
                callback: (err, flows) => {
                    if (err) {
                        callback(err);
                    } else {
                        filterActiveFlows(flows, callback);
                    }
                }
            });
        }
        function getLaunchers( args ) {
            args.query = {
                flowType: "LAUNCHER"
            };
            getActiveFlows( args );
        }


        /**
         * @method resetSerial
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function resetSerial( args ) {
            Y.log('Entering Y.doccirrus.api.flow.resetSerial', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.resetSerial');
            }
            let callback = args.callback;
            args.callback = ()=>{};
            Y.doccirrus.api.sdManager.reloadDevices( args );
            reassignSerialListeners( args.user );
            callback(null, true);
        }
        
        function reassignSerialListeners( user, callback ) {
            if( Y.doccirrus.ipc.isMaster() ) {
                // Y.doccirrus.api.sdManager.serialEvents
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'flow',
                    action: 'get',
                    query: {
                        flowType: Y.doccirrus.schemas.flow.flowTypes.XDTSERIAL
                    },
                    options: { lean: true }
                }, function( err, res ) {
                    if( err ) {
                        Y.log("could not read flows:" , 'warn', NAME );
                        Y.log(err , 'warn', NAME );
                        return;
                    }
                    let { serialEvents } = Y.doccirrus.api.sdManager;
                    //remove all listeners
                    serialListeners.forEach( eventData => {
                        serialEvents.removeListener( eventData.eventName, eventData.listener );
                    } );
                    
                    //add all listeners
                    res.forEach( flow => {
                        if (flow.sources && flow.sources[0] && flow.sources[0].serialPath) {
                            let newListener = msg => {
                                execute( {
                                    user,
                                    query: { _id: flow._id },
                                    data: msg.serialData,
                                    callback: ()=>{}
                                } );
                            };
                            serialEvents.on( flow.sources[0].serialPath, newListener );
                            serialListeners.push( { eventName: flow.sources[0].serialPath, listener: newListener } );
                        }
                    } );
                    callback(null, true);
                } );
            } else {
                Y.doccirrus.ipc.send( REASSIGNSERIALLISTENERS, user );
            }
        }
        if( Y.doccirrus.ipc.isMaster() ) {
            Y.doccirrus.ipc.subscribeNamed( REASSIGNSERIALLISTENERS, NAME, true, function( params, callback ) {
                reassignSerialListeners( params, callback );
            } );
        }

        Y.doccirrus.ipc.subscribeNamed( "clearBlacklist", NAME, true, function() {
            blacklist = {};
        } );

        /**
         * @class flow
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).flow = {
            /**
             * @property name
             * @type {String}
             * @default flow-api
             * @protected
             */
            name: NAME,
            create,
            update,
            testFlow: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.testFlow', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.testFlow');
                }
                testFlow( args );
            },
            execute: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.execute', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.execute');
                }
                execute( args );
            },
            runFileWatcher: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.runFileWatcher', 'info', NAME);
                if (args && args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.runFileWatcher');
                }
                runFileWatcher( args );
            },
            stopFileWatcher: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.stopFileWatcher', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.stopFileWatcher');
                }
                stopFileWatcher( args );
            },
            runSerialSourceFlow: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.runSerialSourceFlow', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.runSerialSourceFlow');
                }
                runSerialSourceFlow( args );
            },
            getSourceBySerialPath: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.getSourceBySerialPath', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.getSourceBySerialPath');
                }
                getSourceBySerialPath( args );
            },
            getFlowsForCollection: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.getFlowsForCollection', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.getFlowsForCollection');
                }
                getFlowsForCollection( args );
            },
            getFlows: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.getFlows', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.getFlows');
                }
                getFlows( args );
            },
            getActiveFlows: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.getActiveFlows', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.getActiveFlows');
                }
                getActiveFlows( args );
            },
            getLaunchers: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.getLaunchers', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.getLaunchers');
                }
                getLaunchers( args );
            },
            clearBlacklist: function( args ) {
                Y.log('Entering Y.doccirrus.api.flow.clearBlacklist', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.flow.clearBlacklist');
                }
                Y.doccirrus.ipc.send( 'clearBlacklist', {} );
                args.callback(null, true);
            },
            resetSerial
        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'v_flowsource-schema',
            'flow_sources',
            'flow_transformers',
            'flow_sinks',
            'dcipc',
            'dc-core',
            'dc-comctl',
            'dccommunication',
            'gdtlog-api'
        ]
    }
)
;
