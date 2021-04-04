/*global YUI */


YUI.add( 'inpacsconfiguration-api', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            util = require('util'),
            mkdirp = require( 'mkdirp' ),
            mkdirpProm = util.promisify( mkdirp ),
            async = require( 'async' ),
            exec = require( 'child_process' ).exec,
            moment = require( 'moment' ),
            ObjectId = require( 'mongodb' ).ObjectID,
            cluster = require( 'cluster' ),
            path = require( 'path' ),
            Promise = require( 'bluebird' ),
            _ = require( 'lodash' ),
            {formatPromiseResult} = require('dc-core').utils,
            binutilsapi = Y.doccirrus.binutilsapi,
            readFileProm = util.promisify( fs.readFile ),
            gridFsStoreProm = util.promisify(Y.doccirrus.gridfs.store).bind(Y.doccirrus.gridfs),
            writeFile = Promise.promisify( fs.writeFile ),
            WORK_LIST_TMP_DIR_NAME = 'worklistsTmp',
            orthancStateConstants = {
                DISABLED:"disabled"
            };

        let
            orthancState = "";

        /**
         * Each time create a new extraConf.json file with the actual data from db
         * @param {String} inPacsConfig location
         * @param {Object} user user object
         * @returns {Promise} promise object
         */
        function generateInPacsExtraConf( inPacsConfig, user ) {
            var runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            Y.log( 'Generating inpacs extra conf... ', 'info', NAME );

            const
                { extraConfigFileName, orthancDirectory } = inPacsConfig;

            function readModalitiesFromDb() {
                return runDb( {
                    user: user,
                    model: 'inpacsmodality',
                    action: 'get',
                    options: {
                        lean: true
                    }
                } );
            }

            function readLuaScriptsFromDb() {
                return runDb( {
                    user: user,
                    model: 'inpacsluascript',
                    action: 'get',
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    }
                } );
            }

            function readInpacsConfigurationFromDb() {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsconfiguration',
                    action: 'get',
                    query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                    useCache: false
                });
            }

            function writeExtraConf( DicomModalities = [], LuaScripts = [], inpacsDbConfig = [] ) {
                const
                    extraConfFullPath = path.join( orthancDirectory, extraConfigFileName );
                Y.log( `Writing extraConf.json to destination: ${extraConfFullPath}`, 'info', NAME );
                try {
                    let modalityObject = {};
                    DicomModalities.forEach( ( modality ) => {
                        modalityObject[modality.name] = [modality.name.toUpperCase(), modality.ip, modality.port];
                    } );

                    let logLevel = "";

                    if(inpacsDbConfig[0] && inpacsDbConfig[0].logLevel) {
                        logLevel = inpacsDbConfig[0].logLevel.replace(/-/g,"");
                    }

                    let extraConf = {
                        DicomModalities: modalityObject,
                        LuaScripts: LuaScripts.map( ( luaScript ) => (`${orthancDirectory}/${luaScript._id}.lua`) ),
                        InSuiteHostURL: inPacsConfig.InSuiteHostURL,
                        ServiceLoglevel: logLevel
                    };

                    if( inpacsDbConfig[0] && inpacsDbConfig[0].defaultEncoding ) {
                        extraConf.DefaultEncoding = inpacsDbConfig[0].defaultEncoding;
                    } else {
                        extraConf.DefaultEncoding = Y.doccirrus.schemas.inpacsconfiguration.getDefaultData().defaultEncoding;
                    }

                    return writeFile( extraConfFullPath, JSON.stringify( extraConf ), 'utf8' );
                } catch( err ) {
                    return Promise.reject( err );
                }
            }

            function readModalitiesAndLuaScriptsAndConfig() {
                return Promise.all( [
                    readModalitiesFromDb(),
                    readLuaScriptsFromDb(),
                    readInpacsConfigurationFromDb()
                ] );
            }

            return readModalitiesAndLuaScriptsAndConfig()
                .then( ( inpacsValues ) => {
                    return writeExtraConf( ...inpacsValues );
                } )
                .catch( ( err ) => {
                    Y.log( `Failed to save extraConf.json. Error:${JSON.stringify( err )}`, "error", NAME );
                    throw err;
                } );

        }

        function isInPacsLicenseEnabled( user ) {
            return Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inPacs' );
        }

        /**
         * This method checks and creates Orthanc worklists directory and Orthanc worklist temporary
         * directory
         *
         * @param {Object} inpacsConfig
         *    @param {string} inpacsConfig.orthancDirectory
         * @returns {Promise<void>}
         */
        async function createOrthancTmpRoot( inpacsConfig ) {
            if( !inpacsConfig ) {
                throw new Error(`'inpacsConfig' argument not passed`);
            }

            if( !inpacsConfig.orthancDirectory ) {
                throw new Error(`Missing key 'orthancDirectory' from 'inpacsConfig' argument object `);
            }

            const wlDir = getWorkListsPath( inpacsConfig );
            const wlTmpDir = path.join( Y.doccirrus.auth.getTmpDir(), WORK_LIST_TMP_DIR_NAME );

            let err;

            Y.log( `createOrthancTmpRoot: Creating directories '${wlDir}' and '${wlTmpDir}' if missing`, 'info', NAME );

            if( !fs.existsSync( wlDir ) ) {
                [err] = await formatPromiseResult( mkdirpProm(wlDir) );

                if(err) {
                    Y.log(`createOrthancTmpRoot: Error creating orthanc worklist directory at path = '${wlDir}'. Error: ${err.stack || err}`, "error", NAME);
                    throw err;
                }

                Y.log(`createOrthancTmpRoot: Successfully created orthanc worklist directory at path = '${wlDir}'.`, "info", NAME);
            } else {
                Y.log(`createOrthancTmpRoot: Orthanc worklist directory = '${wlDir}' already exists. Nothing to do...`, "info", NAME);
            }

            if( !fs.existsSync(wlTmpDir) ) {
                [err] = await formatPromiseResult( mkdirpProm(wlTmpDir) );

                if( err ) {
                    Y.log(`createOrthancTmpRoot: Error creating orthanc worklist temp directory at path = '${wlTmpDir}'. Error: ${err.stack || err}`, "error", NAME);
                    throw err;
                }

                Y.log(`createOrthancTmpRoot: Successfully created orthanc worklist temp directory at path = '${wlTmpDir}'.`, "info", NAME);
            } else {
                Y.log(`createOrthancTmpRoot: Orthanc worklist temp directory = '${wlTmpDir}' already exists. Nothing to do...`, "info", NAME);
            }
        }

        if( cluster.isMaster && Y.doccirrus.auth.isPRC() ) {
            (async ()=>{
                let err;
                let inpacsConfig;

                [err, inpacsConfig] = getInPacsConfig();

                if(err) {
                    Y.log(`inpacsconfiguration(global init): Failed to get inpacs(-dev).json. Will not call 'createOrthancTmpRoot' method. Error: ${err.stack || err}`, "error", NAME);
                    return;
                }

                Y.log(`inpacsconfiguration(global init): Got inpacs(-dev).json: ${JSON.stringify( inpacsConfig )}`, "debug", NAME);

                [err] = await formatPromiseResult( createOrthancTmpRoot(inpacsConfig) );

                if(err) {
                    Y.log(`inpacsconfiguration(global init): Error in method 'createOrthancTmpRoot'. Error: ${err.stack || err}`, "error", NAME);
                }
            })();
        }

        /**
         * @typedef {Object} DicomTagValueObj -  user configured value option for a particular dicom tag
         * @property {string} id - The id of the record. Typically it is the record number ex. 1, 2 etc.
         * @property {string} value - The user configured value of a particular DICOM tag
         * @property {string} comment - The description of the value as a comment
         */

        /**
         * @typedef {Object} DicomTagValue - DICOM tag value object
         * @property {string} dicomTag - a dicom tag whose value needs to be configured
         * @property {string} dicomCommentTag - a DICOM tag whose value needs be filled as a comment from the CSV file
         * @property {string} fileDownloadId - "fs.files" database id for uploaded CSV file to be downloaded form the UI
         * @property {Array.<DicomTagValueObj>} values - See {@link DicomTagValueObj}
         */

        /**
         * @typedef {Array.<DicomTagValue>} DicomTagValues - See {@link DicomTagValue}
         */

        /**
         * @typedef {Object} WorkList - A worklist object for inpacsworklist collection to update or create
         * @property {Array} workListData - workListData array to be inserted/updated
         * @property {string} [_id] - inpacsworklists database id. If present then it will be a put operation else post operation.
         * @property {DicomTagValues} [dicomTagValues] - If present then it represents user configured values
         *                                               for a particular dicom tag. See {@link DicomTagValues}
         */

        /**
         * @method PRIVATE
         *
         * Create/Update inpacsworklist collection based on worklistId
         *
         * @param {Object} user - user object
         * @param {string} [workListId] -  work list database id. If not present then will be a post operation. BTW, workList._id === workListId
         *                                 So if workListId is present then workList._id will be present.
         * @param {WorkList} workList - The {@link WorkList} object to update/create
         * @param {function} callback - result of update/create or error
         */
        function updateOrCreateWorkList( user, workListId, workList, callback ) {
            /**
             * Use this variable only for put operation
             */
            let
                worklistPutObj = {};

            const
                worklistInputFormat = "{_id: string, workListData: []}",
                dicomTagValuesInputFormat = "{ _id: string, workListData: [], dicomTagValues: [ {dicomTag: string, dicomCommentTag: string, fileDownloadId: string, values: [{id: string, value: string, comment: string}] } ] }";


            // ------------------------------ 1. Validate 'workList.workListData' and if everything is fine then set it in worklistPutObj.workListData -----------------
            if( !workList ) {
                return callback({message: `Missing 'workList' object argument. Minimum expected input is workList =  ${worklistInputFormat}`});
            }

            if( !workList.workListData ) {
                return callback({message: `Missing 'workListData' key from workList object. Minimum expected input is workList = ${worklistInputFormat}`});
            }

            if( !Array.isArray(workList.workListData) ) {
                return callback({message: `'workListData' key must be an array for workList object. Minimum expected input is workList = ${worklistInputFormat}`});
            }

            worklistPutObj.workListData = workList.workListData;
            // ---------------------------------------------------------------- 1. END ---------------------------------------------------------------------------------


            // ------------------------------- 2. If dicomTagValues is present then validate and set worklistPutObj.dicomTagValues --------------------------------------
            if( Array.isArray(workList.dicomTagValues) && workList.dicomTagValues.length ) {
                /**
                 * Currently we expect only 1 value in array. If in future we want to configure more DICOM tags with user defined values enum
                 * then below approach is future proof
                 */
                for( const [dicomIndex, dicomTagValuesObj] of workList.dicomTagValues.entries() ) {
                    if( !dicomTagValuesObj || typeof dicomTagValuesObj !== "object" ) {
                        return callback({message: `Invalid value for dicomTagValues[${dicomIndex}]. Expected object with format: ${dicomTagValuesInputFormat}`});
                    }

                    if( !dicomTagValuesObj.dicomTag ) {
                        return callback({message: `missing 'dicomtag' key from object at dicomTagValues[${dicomIndex}]. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    if( !dicomTagValuesObj.dicomCommentTag ) {
                        return callback({message: `missing 'dicomCommentTag' key from object at dicomTagValues[${dicomIndex}]. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    if( dicomTagValuesObj.dicomTag === dicomTagValuesObj.dicomCommentTag ) {
                        return callback({message: `dicomTag and dicomCommentTag should not be equal`});
                    }

                    if( !dicomTagValuesObj.values ) {
                        return callback({message: `missing 'values' key from object at dicomTagValues[${dicomIndex}] and dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    if( !Array.isArray(dicomTagValuesObj.values) ) {
                        return callback({message: `'values' key must be an array for dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    if( !dicomTagValuesObj.values.length ) {
                        return callback({message: `'values' key array is empty for dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    if( !dicomTagValuesObj.fileDownloadId ) {
                        return callback({message: `missing 'fileDownloadId' key from object at dicomTagValues[${dicomIndex}] and dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`});
                    }

                    for( const [valIndex, dicomTagValue] of dicomTagValuesObj.values.entries() ) {
                        if( !dicomTagValue || typeof dicomTagValue !== "object" ) {
                            return callback( {message: `Incorrect dicomTag value for dicomTagValues[${dicomIndex}].values[${valIndex}] having dicomTag: ${dicomTagValuesObj.dicomTag}. Expected object. Expected input format is: ${dicomTagValuesInputFormat}`} );
                        }

                        if( !dicomTagValue.id || typeof dicomTagValue.id !== "string" ) {
                            return callback( {message: `'id' key must be present and should be a string at dicomTagValues[${dicomIndex}].values[${valIndex}] having dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`} );
                        }

                        if( !dicomTagValue.value || typeof dicomTagValue.value !== "string" ) {
                            return callback( {message: `'value' key must be present and should be a string at dicomTagValues[${dicomIndex}].values[${valIndex}] having dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`} );
                        }

                        if( !dicomTagValue.comment || typeof dicomTagValue.comment !== "string" ) {
                            return callback( {message: `'comment' key must be present and should be a string at dicomTagValues[${dicomIndex}].values[${valIndex}] having dicomTag: ${dicomTagValuesObj.dicomTag}. Expected input format is: ${dicomTagValuesInputFormat}`} );
                        }
                    }
                }

                worklistPutObj.dicomTagValues = workList.dicomTagValues;
            } else if( Array.isArray(workList.dicomTagValues) && workList.dicomTagValues.length === 0 ) {
                // Means empty dicomTagValues array in database and save as []
                worklistPutObj.dicomTagValues = workList.dicomTagValues;
            }
            // ------------------------------------------------------------------ 2. END ---------------------------------------------------------------------------------------

            if( workListId ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsworklist',
                    action: 'put',
                    query: {
                        _id: workListId
                    },
                    fields: Object.keys(worklistPutObj),
                    data: Y.doccirrus.filters.cleanDbObject( worklistPutObj ),
                    callback: ( err, result ) => callback( err, result )
                } );
            } else {
                // Not changing anything here as we are not sure about this case
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsworklist',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( workList ),
                    callback: ( err, result ) => callback( err, result )
                } );
            }
        }

        /**
         * Save work list with and connect/update it in configuration
         * @param {object} args arguments
         * @param {InPacsWorkList_T} args.workList  work list object
         * @param {InPacsConfiguration_T} args.configuration configuration object
         * @returns {Function}
         */
        function saveWorkList( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.saveWorkList', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.saveWorkList');
            }
            const
                { user, callback, data } = args,
                { workList, configuration } = data;

            if( !isInPacsLicenseEnabled( user ) ) {
                const errorMessage = 'inPacsConfig is missing or there is no license';
                Y.log( errorMessage, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: errorMessage } ) );
            }

            // 1. Save work list

            updateOrCreateWorkList( user, workList._id, workList, ( err, result ) => {
                if( err ) {
                    Y.log( 'Failed to updateOrCreateWorkList - Error: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                Y.log( " Worklist id:" + result._id + " is updated/created. ", "debug", NAME );
                attachWorkList( result[0] );
            } );

            //2. Attach workList
            function attachWorkList( workListId ) {

                configuration.modalities = configuration.modalities.map( ( modality ) => {
                    if( !modality.workListId ) {
                        modality.workListId = workListId;
                    }
                    return modality;
                } );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsconfiguration',
                    action: 'put',
                    query: {
                        _id: configuration._id
                    },
                    data: Y.doccirrus.filters.cleanDbObject( configuration ),
                    fields: ['modalities']
                }, ( err ) => {
                    callback( err, workListId );
                } );
            }
        }

        function getRandomIntFromRange(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        }

        /**
         *
         * returns UID generated by format <vendor_part>.<dcCustomerNo>.<moment().format("DDMMYYYY.HHmmss.xxx")>
         * vendor_part is constant provided by https://www.medicalconnections.co.uk/FreeUID/
         *
         * @public
         * @param {string} dcCustomerNo
         * @returns {string} StudyInstanceUID
         */
        function getStudyInstanceUID(dcCustomerNo){
            const
                vendor_part = '1.2.826.0.1.3680043.10.94';
            return `${vendor_part}.${dcCustomerNo}.${moment().format('DDMMYYYY.HHmmss.SSS')}`;
        }

        /**
         * Takes a work list and map all the data to it
         * return an new mapped work list
         * @param {object} args arguments
         * @param {string} args.patientId patient id
         * @param {string} args.activity activity
         * @param {string} args.workListId work list id
         */
        function getMappedData( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.getMappedData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.getMappedData');
            }
            const
                { user, callback, data } = args,
                { patientId, activity, workListId } = data;

            async.waterfall( [

                ( next ) => createInPacsMapperContext( user, patientId, activity._id, next ),
                ( context, next ) => {
                    // Newly created activity doesn't have an id so use an object from UI
                    if( !activity._id ) {
                        context.activity = activity;
                    }
                    if( context.activity ) {
                        context.activity._user = user;
                    }
                    next( null, context );
                },
                ( context, next ) => Y.dcforms.mapper.genericUtils.getWorkListData( context, next ),
                ( mappedFields, next ) => Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsworklist',
                    query: {
                        _id: workListId
                    },
                    callback: ( err, result ) => next( err, mappedFields, result[0] )
                } ),
                ( mappedFields, workList, next ) => { Y.doccirrus.api.practice.getMyPractice( user, (err, result) => next( err, mappedFields, workList, result)); },
                ( mappedFields, workList, myPrac, next ) => {
                    const
                        {workListData, dicomTagValues} = workList,
                        // workListData = workList.workListData,
                        uniqueId = (+new Date()).toString(36) + getRandomIntFromRange(100, 999).toString(36), //Append random string for extra uniqueness
                        inPacsNo = { number: uniqueId.toUpperCase() };

                    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

                    let
                        dcCustomerNo = myPrac && myPrac.dcCustomerNo,
                        mappedData = [],
                        optionalTags = [],
                        optionalDicomTagToValues = {};

                    for( const dt of workListData ) {
                        if( dt.content === "eingabe" ) {
                            dt.contentType = Y.doccirrus.schemas.inpacsworklist.getContentTypeForUnMappedTag( dt.dicomTag );

                            // Build array of optional tags
                            optionalTags.push( dt.dicomTag );
                        } else {
                            dt.contentType = Y.doccirrus.schemas.inpacsworklist.getContentTypeForMappedTag( dt.dicomTag );
                        }

                        switch( dt.contentType ) {
                            case 0:
                                // If mapped field - substitute
                                dt.content = mappedFields[dt.content] || '';
                                break;
                            case 1:
                                // If unmapped leave empty
                                dt.content = '';
                                break;
                            case 3:
                                dt.content = inPacsNo.number.toString();
                                break;
                            case 4:
                                dt.content = getStudyInstanceUID( dcCustomerNo );
                                break;
                        }

                        if( dt.template ) {
                            let text = `<% with(map) { %>${dt.template}<% } %>`,
                                compiled,
                                result = dt.template;

                            try {
                                compiled = _.template( text );
                                result = compiled( { 'map': mappedFields, 'moment': moment } );
                            } catch( error ) {
                                Y.log( 'error compiling template: ' + error, 'error', NAME );
                            }

                            dt.content = result;
                        }

                        mappedData.push(dt);
                    }

                    if( Array.isArray(dicomTagValues) && dicomTagValues.length ) {
                        for( const dicomTagValue of dicomTagValues ) {
                            if( dicomTagValue && dicomTagValue.dicomTag && Array.isArray(dicomTagValue.values) && dicomTagValue.values.length ) {
                                if( optionalTags.includes( dicomTagValue.dicomTag ) ) {
                                    optionalDicomTagToValues[dicomTagValue.dicomTag] = {values: dicomTagValue.values};

                                    if( dicomTagValue.dicomCommentTag && optionalTags.includes( dicomTagValue.dicomCommentTag ) ) {
                                        optionalDicomTagToValues[dicomTagValue.dicomTag].dicomCommentTag = dicomTagValue.dicomCommentTag;
                                    }
                                }
                            }
                        }
                    }

                    return next( null, {
                        inPacsNo,
                        mappedData,
                        optionalDicomTagToValues,
                        optionalTags: optionalTags.length ? optionalTags : undefined
                    } );
                }

            ], ( err, result ) => {
                if( err ) {
                    Y.log( `Failed to get form data inpacs. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }

                return callback( err, result );
            } );
        }

        /**
         * Prepare all object that need to do the mapping
         * @protected
         * @param {object} user User
         * @param {string} patientId patient id
         * @param {string} activityId activity id
         * @param {function} callback error or context
         */
        function createInPacsMapperContext( user, patientId, activityId, callback ) {

            let context = {};

            async.waterfall( [
                // GetPatientModel
                ( next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'patient', ( err, model ) => {
                            if( err ) {
                                return callback( err );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( patientId ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createInPacsMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.patient = res;
                                return next( null, context );
                            } );
                        }
                    );
                },
                // GetActivityModel
                ( ctx, next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', ( err, model ) => {
                            if( err ) {
                                return callback( err );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( activityId ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createInPacsMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.activity = res;
                                return next( null, context );
                            } );
                        }
                    );
                },

                // GetLocationModel
                ( ctx, next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'location', ( err, model ) => {
                            if( err ) {
                                return callback( err );
                            }
                            model.mongoose.findOne( { _id: new ObjectId( Y.doccirrus.schemas.location.getMainLocationId() ) }, ( err, res ) => {
                                if( err ) {
                                    Y.log( `Error in createInPacsMapperContext: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                                context.locations = [res];
                                return next( null, context );
                            } );
                        }
                    );
                }

            ], ( err ) => {
                callback( err, context );
            } );

        }

        /**
         * Reading log from Orthanc log file to string
         * @returns {object} log file last 1000 strings or less in callback
         * @param {object} args arguments
         * @param {object} args.user user
         * @param {function} args.callback log file string or error
         */
        function getLogFile( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.getLogFile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.getLogFile');
            }
            const { user, callback } = args,
                WIDTH = 150,
                MAX_LINES = 1000;
            let logFilePath;

            return Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig ) => {
                if( err ) {
                    return callback( err );
                }
                logFilePath = inpacsConfig.logFileName; //As per MOJ-8931, logFileName is now absolute path
                if( fs.existsSync( logFilePath ) ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inpacsconfiguration',
                        action: 'get',
                        option: {
                            limit: 1
                        },
                        useCache: false
                    }, function( err, res ) {
                        if( err ) {
                            Y.log( `Failed inpacsconfiguration db request. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: err.message } ) );
                        }
                        if( res && res[0] ) {
                            const
                                configs = res[0];
                            if( configs.lastLogLine > 0 ) {
                                const
                                    bytesToSkip = configs.lastLogLine,
                                    bytesToGet = bytesToSkip + WIDTH * MAX_LINES,
                                    readStream = fs.createReadStream( logFilePath, {
                                        start: bytesToSkip,
                                        end: bytesToGet
                                    } ),
                                    chunks = [];

                                readStream.on( 'data', ( chunk ) => {
                                    chunks.push( chunk );
                                } );
                                readStream.on( 'error', ( err ) => {
                                    Y.log( "Error while reading Orthanc log file: " + JSON.stringify( err ), "error", NAME );
                                    return callback( err );
                                } );
                                readStream.on( 'end', () => {
                                    const log = Buffer.concat( chunks ).toString();
                                    let lastChar = log.lastIndexOf( '\n' );

                                    if(lastChar < 0 ) {
                                        lastChar = 0;
                                    }

                                    return callback( null, {
                                        'length': lastChar,
                                        'config': configs,
                                        'log': log.substring( 0, lastChar )
                                    } );
                                } );
                            }
                            else {
                                configs.lastLogLine = 0;
                                fs.stat( logFilePath, ( err, stat ) => {
                                    if( err ) {
                                        Y.log( "Error while getting file's info: " + JSON.stringify( err ), "error", NAME );
                                        return callback( err );
                                    }
                                    const
                                        fileSize = stat.size,
                                        chunks = [];

                                    let bytesToSkip = fileSize - WIDTH * MAX_LINES;

                                    if(bytesToSkip < 0) {
                                        bytesToSkip = 0;
                                    }

                                    let readStream = fs.createReadStream( logFilePath, {
                                        start: bytesToSkip,
                                        end: fileSize
                                    } );

                                    readStream.on( 'data', ( chunk ) => {
                                        chunks.push( chunk );
                                    } );
                                    readStream.on( 'error', ( err ) => {
                                        Y.log( "Error while reading Orthanc log file: " + JSON.stringify( err ), "error", NAME );
                                        return callback( err );
                                    } );
                                    readStream.on( 'end', () => {
                                        const log = Buffer.concat( chunks ).toString(),
                                            firstChar = log.indexOf( '\n' ),
                                            lastChar = log.lastIndexOf( '\n' );

                                        let length = bytesToSkip + (lastChar > 0 ? lastChar : 0);

                                        return callback( null, {
                                            'length': length,
                                            'config': configs,
                                            'log': log.substring( firstChar, lastChar )
                                        } );
                                    } );
                                } );
                            }
                        }
                    } );
                }
                else {
                    Y.log( ' Error. Log file is not available. ', 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error. Log file is not available. ' } ) );
                }
            } );

        }

        /**
         * Change last log line for displaying Orthanc log from that line
         * @protected
         * @param {object} args arguments
         * @param {object} args.query.data  {InPacsConfiguration_T} config data
         * @param {object} args.user user
         * @param {function} args.callback log string or error
         */
        function changeLastLogLine( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.changeLastLogLine', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.changeLastLogLine');
            }
            const
                { data: config = {}, user, callback } = args;
            if(!config.lastLogLine || config.lastLogLine < 0) {
                config.lastLogLine = 0;
            }

            if( config ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsconfiguration',
                    action: 'put',
                    query: {
                        _id: config._id
                    },
                    data: Y.doccirrus.filters.cleanDbObject( config ),
                    fields: ['lastLogLine']
                }, ( err, res ) => {
                    if( err ) {
                        Y.log( 'Failed inpacsconfiguration db request. Error: ' + err, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: err.message } ) );
                    }
                    return callback( null, res );
                } );
            }
        }

        /**
         * Create a text file from mapped work list data
         * @param {object} args arguments
         * @param {WorkListData_T[]} args.mappedWorkListData mapped work list data
         * @returns {function}
         */
        function createWorkListTxt( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.createWorkListTxt', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.createWorkListTxt');
            }
            const
                { data: { mappedWorkListData = [] }, user, callback } = args;
            if( !isInPacsLicenseEnabled( user ) ) {
                const errorMessage = 'inPacsConfig is missing or there is no license';
                Y.log( errorMessage, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: errorMessage } ) );
            }

            getInPacsConfig( ( err, inpacsConfig ) => {
                if( err ) {
                    return callback( err );
                }

                const
                    name = `worklist_${user.sessionId}${moment().unix()}.txt`,
                    wlPath = path.join( Y.doccirrus.auth.getTmpDir(), WORK_LIST_TMP_DIR_NAME ),
                    pathToTxt = path.join( wlPath, name ),
                    workListTxtStream = fs.createWriteStream( pathToTxt );
                //e.g. "PatientID":"1": 0010,0020, "PatientName":"test": 0010,0010 , "PatientSex":"M": 0010,0040, "PatientBirthDate":"10.10.1990": 0010,0030, "AccessionNumber":"666": 0008,0050
                let mockData = [
                    { "dicomTag": "0008,0050", "value": "" },
                    { "dicomTag": "0010,0010", "value": "" },
                    { "dicomTag": "0010,0020", "value": "" },
                    { "dicomTag": "0010,0030", "value": "" },
                    { "dicomTag": "0010,0040", "value": "" },
                    { "dicomTag": "0020,0010", "value": "" },
                    { "dicomTag": "0020,000d", "value": "" },
                    { "dicomTag": "0008,0060", "value": "" }
                ];

                function formatWorkListItemToTxt( workListItem ) {
                    const name = workListItem.name ? workListItem.name.slice( 0, 2 ).toUpperCase() : '-';
                    mockData.forEach( item => {
                        if( workListItem.dicomTag === item.dicomTag ) {
                            item.value = _.trim( workListItem.content );
                        }
                    } );

                    return `(${workListItem.dicomTag}) ${_.trim( name )} ${2 !== workListItem.contentType ? _.trim( workListItem.content ) : _.trim( workListItem.content.name )}\n`;
                }

                mappedWorkListData.forEach( ( workListItem ) => workListTxtStream.write( formatWorkListItemToTxt( workListItem ) ) );
                workListTxtStream.end();
                workListTxtStream.on( 'finish', () => {
                    Y.log( " Worklist txt format is written. Name: " + name, "info", NAME );
                    convertTxtToBinary( inpacsConfig, pathToTxt, name, mockData, user, callback );
                } );
                workListTxtStream.on( 'error', ( err ) => {
                    Y.log( "Error while writing worklists to txt. Error: " + JSON.stringify( err ), "error", NAME );
                    callback( err );
                } );
            } );
        }

        async function convertTxtToBinary( inpacsConfig, pathToTxt, name, mockData, user, cb ) {
            const
                wlPath = getWorkListsPath( inpacsConfig ),
                wlName = `${name.substring( 0, name.length - 3 )  }wl`,
                tmpWl = `${pathToTxt}.wl`,
                tmpTxt = `${tmpWl}.txt`;

            let
                dcmdump,
                dump2dcm;

            try {
                dcmdump = binutilsapi.getPathToBinUtil( 'dcmdump' );
                dump2dcm = binutilsapi.getPathToBinUtil( 'dump2dcm' );
            } catch( e ) {
                return cb( e );
            }

            // e.g. dump2dcm t1.txt t1.tmpwl; dcmdump t1.tmpwl > t1.tmpwl.txt; dump2dcm t1.tmpwl.txt t1.wl
            let [err, dumpCmd] = await formatPromiseResult(
                binutilsapi.constructShellCommand( {
                    bin: 'dump2dcm',
                    shellArgs: [
                        pathToTxt,
                        tmpWl,
                        ';',
                        dcmdump,
                        tmpWl,
                        '>',
                        tmpTxt,
                        ';',
                        dump2dcm,
                        tmpTxt,
                        path.join( wlPath, wlName )
                    ]
                } )
            );

            if( err ) {
                return cb( err );
            }

            // selection of the right mock series depending on the modality
            let modality = mockData[7].value.trim(), mockSeries;
            switch( modality ) {
                case "CR":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/CR_Series_Mock" );
                    break;
                case "CT":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/CT_Series_Mock" );
                    break;
                case "DX":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/DX_Series_Mock" );
                    break;
                case "MG":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/MG_Series_Mock" );
                    break;
                case "MR":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/MR_Series_Mock" );
                    break;
                case "NM":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/NM_Series_Mock" );
                    break;
                case "OT":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/OT_Series_Mock" );
                    break;
                case "PT":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/PT_Series_Mock" );
                    break;
                case "US":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/US_Series_Mock" );
                    break;
                case "XC":
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/XC_Series_Mock" );
                    break;
                default:
                    mockSeries = Y.doccirrus.fileutils.resolve( "mojits/InPacsAdminMojit/config/mocks/MR_Series_Mock" );
                    break;
            }

            function createTmpDir( files, next ) {
                if( files ) {
                    const { sep } = require( 'path' );
                    const dir = `${Y.doccirrus.auth.getDirectories( 'tmp' )}${sep}`;
                    Y.log( `Creating a tmp directory ${dir}`, 'info', NAME );
                    fs.mkdtemp( dir, ( err, tmpfolder ) => {
                        if( err ) {
                            Y.log( " Error while creating tmp dir for mocking. Error: " + JSON.stringify( err ), "error", NAME );
                            return next( err );
                        }
                        next( null, files, tmpfolder );
                    } );
                }
                else {
                    return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Empty mock series.' } ) );
                }
            }

            function copyFile( from, name, where, callback ) {
                from = path.join( from, name );
                where = path.join( where, name );
                var readStream = fs.createReadStream( from ),
                    writeStream = fs.createWriteStream( where );

                readStream.on( 'error', callback );
                writeStream.on( 'error', callback );

                writeStream.on( 'open', () => Y.log( "Copying mock series to tmp dir: " + where, "info", NAME ) );
                readStream.pipe( writeStream );
                readStream.once( 'end', callback );
            }

            function copyFiles( from, files, tmpfolder, next ) {
                async.each( files, ( file, cb ) => {
                    copyFile( from, file, tmpfolder, cb );
                }, ( err ) => {
                    if( err ) {
                        Y.log( "Error while copying for mocking. Error: " + JSON.stringify( err ), "error", NAME );
                        return next( err );
                    }
                    Y.log( "Copied mock series to tmp folder.", "info", NAME );
                    return next( null, files, tmpfolder );
                } );
            }

            async function modifyDcms( files, tmpfolder, next ) {
                mockData[5].value = mockData[0].value;
                mockData[6].value = mockData[0].value;
                let shellArguments = [];
                mockData.forEach( item => {
                    shellArguments.push( `-i "(${item.dicomTag})=${item.value}"` );
                } );

                let [err, cmd] = await formatPromiseResult(
                    binutilsapi.constructShellCommand( {
                        bin: 'dcmodify',
                        shellArgs: [
                            ...shellArguments,
                            `${tmpfolder}/*`
                        ]
                    } )
                );

                if( err ) {
                    Y.log( "modifyDcms: Binutils dcmodify not found.", "error", NAME );
                    return next( new Y.doccirrus.commonerrors.DCError( 500, {message: 'dcmodify is not available.'} ) );
                }

                Y.log( `Executing command ${cmd}`, "debug", NAME );
                exec( cmd, ( err, stderr, stdout ) => {
                    if( err ) {
                        Y.log( `Error while modifying series for mocking. Error: ${JSON.stringify( err )}`, "error", NAME );
                        return next( err, stderr, stdout );
                    }
                    Y.log( "Modified tmp mock series.", "info", NAME );
                    return next( null, files, tmpfolder );
                } );
            }

            function deleteTmpDir( files, tmpfolder, next ) {
                Y.log( "Cleaning tmp directory.", "debug", NAME );
                async.forEach( files, ( file, cb ) => {
                    fs.unlink( path.join( tmpfolder, file ), err => {
                        if( err ) {
                            Y.log( `Failed to delete file: ${file}. Error: ${JSON.stringify( err )}`, "error", NAME );
                            return cb( err );
                        }
                        return cb();
                    } );
                }, err => {
                    if( err ) {
                        Y.log( "Error while deleting tmp directory with seria:  " + JSON.stringify( err ), "error", NAME );
                        return next( err );
                    }
                    Y.log( "Deleting tmp folder.", "debug", NAME );
                    fs.rmdir( tmpfolder, next );
                } );
            }

            async.waterfall( [
                ( next ) => {
                    Y.log( `1. Executing dump command: ${dumpCmd}`, 'info', NAME );
                    exec( dumpCmd, next );
                },
                ( out, code, next ) => {
                    Y.log( `2. Getting inpacsconfiguration...`, 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        'user': user,
                        'model': 'inpacsconfiguration',
                        'action': 'get',
                        options: { limit: 1 },
                        useCache: false,
                        callback: next
                    } );
                },
                ( inpacsconfiguration, next ) => {
                    Y.log( `3. Dumping finished. Worklists name: ${wlName}`, 'info', NAME );
                    if( !inpacsconfiguration[0].isMocking ) {
                        Y.log( 'Not in the demo mode, no further steps required.', 'debug', NAME );
                        return cb();
                    }
                    Y.log( 'Inpacs mocking is on.', 'debug', NAME );
                    if( !fs.existsSync( mockSeries ) ) {
                        return next();
                    }
                    fs.readdir( mockSeries, next );
                },
                ( files, next ) => {
                    Y.log( '4. Creating tmp dir...', 'info', NAME );
                    createTmpDir( files, next );
                },
                ( files, tmpfolder, next ) => {
                    Y.log( '5. Start coping files...', 'info', NAME );
                    if( files && files.length > 0 ) {
                        copyFiles( mockSeries, files, tmpfolder, next );
                    } else {
                        return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Mock directory is empty.' } ) );
                    }
                },
                ( files, tmpfolder, next ) => {
                    Y.log( '6. ModifyDcms...', 'info', NAME );
                    modifyDcms( files, tmpfolder, next );
                },
                ( files, tmpfolder, next ) => {
                    Y.log( '7. Uploading tmp series to Orthanc.', 'info', NAME );
                    async.each( files, ( file, cb ) => {
                        Y.doccirrus.api.inpacsrest.uploadInstance( {
                            httpRequest: { query: { path: path.join( tmpfolder, file ) } },
                            callback: ( err ) => {
                                if( err ) {
                                    return cb( err );
                                }
                                Y.log( "Uploaded file: " + file, "info", NAME );
                                return cb();
                            }
                        } );
                    }, ( err ) => next( err, tmpfolder ) );
                },
                //read dir one more time to delete content
                ( tmpfolder, next ) => {
                    Y.log( '8. Reading tmp directory with series.', 'info', NAME );
                    fs.readdir( tmpfolder, ( err, files ) => next( err, files, tmpfolder ) );
                },
                ( files, tmpfolder, next ) => {
                    Y.log( '9. Ready to clean tmp directory.', 'info', NAME );
                    deleteTmpDir( files, tmpfolder, next );
                }
            ], ( err, stdout, stderr ) => {
                if( err ) {
                    Y.log( " Error while dumping/mocking. Error: " + JSON.stringify( err ), "error", NAME );
                    Y.log( " Error while dumping/mocking. Stderr: " + JSON.stringify( stderr ), "error", NAME );
                    return cb( err );
                }
                return cb();
            } );
        }

        /**
         *  Execute enable orthanc command
         * @param {String} inPacsConfig inpacs.json
         * @param {Function} cb callback
         */
        /*function runEnableOrthancCmd( inPacsConfig, cb ) {
            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'inpacsconfiguration',
                action: 'get',
                query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                options: {
                    lean: true
                },
                useCache: false,
                callback: function( err, data ) {
                    if( err ) {
                        return cb( err );
                    }
                    const
                        logLevel = data[0] && data[0].logLevel,
                        launchOrthancCmd = `${inPacsConfig.enableCommand} ${inPacsConfig.orthancDirectory} ${logLevel || ''}`;
                    Y.log( `Enabling orthanc with parameters: ${launchOrthancCmd}`, 'info', NAME );
                    exec( launchOrthancCmd, function( errLaunch ) {
                        if( errLaunch ) {
                            Y.log( `Error executing: ${inPacsConfig.enableCommand}. Error: ${JSON.stringify( errLaunch )}`, 'error', NAME );
                        }
                        return cb( errLaunch ? errLaunch : null );
                    } );
                }
            } );
        }*/

        function getInpacsConfiguration(args, cb) {
            let user = args && args.user || Y.doccirrus.auth.getSUForLocal();

            return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'inpacsconfiguration',
                        action: 'get',
                        query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                        useCache: false
                    }, cb);
        }

        /**
         *  Execute restart orthanc command
         * @param {String} inPacsConfig inpacs.json
         * @param {Function} cb callback
         */
        /*function runRestartOrthancCmd( inPacsConfig, cb ) {
            const reloadCmd = inPacsConfig.reloadCommand;
            exec( `${reloadCmd} ${inPacsConfig.logLevel || ''}`, function( err ) {
                if( err ) {
                    Y.log( `Error executing: ${reloadCmd}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                }
                return cb( err ? err : null );
            } );
        }*/

        function configureAndStartOrthanc(args, callback) {
            const
                cmd = args.cmd,
                timeout = args.timeout,
                spawn = require( 'child_process' ).spawn,
                options = {
                    cwd: process.cwd(),
                    detached: false,
                    shell:true
                };


            if( !cmd ) {
                const err = new Y.doccirrus.commonerrors.DCError( 500, { message: 'No enable command in inpacs.json.' } );
                Y.log( JSON.stringify( err ), "error", NAME );
                return callback( err );
            }


            Y.log(`Spawning Orthanc as: ${cmd}`, 'info', NAME);
            const orthanc = spawn( cmd, [], options );

            if( orthanc && orthanc.pid ) {
                setTimeout(()=>{
                    Y.log( "Orthanc started.", "info", NAME );
                    callback();
                },timeout);
            }
            else {
                const err = new Y.doccirrus.commonerrors.DCError( 500, { message: 'Failed to spawn Orthanc.' } );
                Y.log( JSON.stringify( err ), "error", NAME );
                return callback( err );
            }
        }

        /**
         * Starts the orthanc server.
         * Note: In Dev and Production environment Orthanc is started differently.
         *
         * @returns {Promise<boolean>} - Whether Orthanc was started successfully or not
         */
        async function enableOrthancService() {
            if( !Y.doccirrus.auth.isPRC() ) {
                throw new Error(`enableOrthancService: Can only start on PRC server`);
            }

            const
                user = Y.doccirrus.auth.getSUForLocal(),
                luaScriptRunOnStartProm = util.promisify( Y.doccirrus.api.inpacsluascript.runOnStart );

            let
                err,
                stdout,
                inpacsDbConfiguration,
                hasOrthancStartedInProd = false,
                inpacsConfig;

            // ------------------------------ 1. Get inpacs configuration json file (i.e inpacs.json) ------------------------
            [err, inpacsConfig] = getInPacsConfig();

            if( err ) {
                Y.log( `enableOrthancService: Error reading inpacs(-dev).json. Error: ${err.stack || err}`, "error", NAME );
                throw err;
            }

            if( !inpacsConfig.enableCommand || !inpacsConfig.orthancDirectory || !inpacsConfig.logFileName || !inpacsConfig.extraConfigFileName || !inpacsConfig.reloadCommand ) {
                Y.log( `enableOrthancService: Bad inpacs(-dev).json. Expecting keys: 'enableCommand', 'orthancDirectory', 'logFileName', 'extraConfigFileName', 'reloadCommand'`, "error", NAME );
                throw new Error(`Bad inpacs(-dev).json. Expecting keys: 'enableCommand', 'orthancDirectory', 'logFileName', 'extraConfigFileName', 'reloadCommand'`);
            }
            // ---------------------------------------------------- 1. END --------------------------------------------------


            // -------------------------- 2. Check and create missing 'worklists' and 'worklist temp' directories ------------------------------
            [err] = await formatPromiseResult( createOrthancTmpRoot(inpacsConfig) );

            if(err) {
                Y.log(`enableOrthancService: Error in method 'createOrthancTmpRoot'. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }
            // -------------------------------------------------------- 2. END -----------------------------------------------------------------


            // -------------- 3. Import 'LUA' scripts in DB and write them in orthanc directory and generate extraconf.json ---------------------
            [err] = await formatPromiseResult( luaScriptRunOnStartProm(user) );

            if(err) {
                Y.log(`enableOrthancService: Error in Y.doccirrus.api.inpacsluascript.runOnStart. Error: ${err.stack || err} `, "error", NAME );
                throw err;
            }
            // --------------------------------------------------------- 3. END -----------------------------------------------------------------


            // ------------------------------------- 4. If dev server then start orthanc using local dev scripts --------------------------------
            if( Y.doccirrus.auth.isDevServer() ) {
                // -------------------- 4a. Check if Orthanc is running. If yes then no need to do anything --------------
                [err, stdout] = await formatPromiseResult( checkOrthancRunState() );

                if( err ) {
                    Y.log(`enableOrthancService (dev): Error checking on dev if orthanc server is running or not. Error: ${err}`, "error", NAME);
                    throw new Error(`enableOrthancService: Error checking on dev if orthanc server is running or not. Error: ${err}`);
                }

                if( stdout ) {
                    Y.log(`enableOrthancService (dev): Orthanc is already running. stdout = ${stdout}`, 'warn', NAME);
                    return true;
                }
                // ---------------------------------------------- 4a. END ----------------------------------------------


                // ------------ 4b. If Orthanc then get inpacsconfiguration from DB ----------------------------------------
                [err, inpacsDbConfiguration] = await formatPromiseResult( getInpacsConfiguration() );

                if(err) {
                    Y.log(`enableOrthancService (dev): Error getting inpacsconfiguration from db. ${err.stack || err}`, "error", NAME );
                    throw err;
                }

                if( !inpacsDbConfiguration || !Array.isArray(inpacsDbConfiguration) || !inpacsDbConfiguration[0] ) {
                    Y.log(`enableOrthancService (dev): No inpacsconfiguration found in db.`, "error", NAME );
                    throw new Error(`enableOrthancService (dev): No inpacsconfiguration found in db.`);
                }
                // ---------------------------------- 4b. END ------------------------------------------------------------


                // ---------------------------- 4c. Start Orthanc server with the user configured loglevel from DB ------------------------
                inpacsConfig.logLevel = inpacsDbConfiguration[0].logLevel || '';
                Y.log(`enableOrthancService (dev): Starting Orthanc service with log level: ${inpacsConfig.logLevel}`, 'info', NAME );

                [err] = await formatPromiseResult(
                                new Promise( (resolve, reject) => {
                                    spawnOrthanc( inpacsConfig, ( spawnErr ) => {
                                        if( err ) {
                                            reject( spawnErr );
                                        } else {
                                            resolve();
                                        }
                                    } );
                                } )
                              );

                if(err) {
                    Y.log(`enableOrthancService (dev): Error starting Orthanc in DEV. Error: ${err}`, 'warn', NAME );
                    throw new Error(`enableOrthancService (dev): Error starting Orthanc in DEV. Error: ${err}`);
                }

                return true;
                // ------------------------------------------------------ 4c. END --------------------------------------------------------
            }
            // ---------------------------------------------------- 4. END ----------------------------------------------------------------------

            /**
             * --------- 5. This is production server. Now that we have written a new extraConf.json file via
             * luaScriptRunOnStartProm method we don't know whether Orthanc server is started or not.
             * We first need to reload Orthanc server with the latest extraConf.json. If orthanc server is already
             * running then this command will be successful else this command will fail.
             *
             * Next we will then try to enable Orthanc server. If the The server is already running then this command will
             * have no effect else it will start with orthanc server with extraConf.json ----------------------------------------
             */
            Y.log(`enableOrthancService: Reloading Orthanc service on production...`, 'info', NAME );

            // First reload Orthanc server with newly written extraConf.json
            [err] = await formatPromiseResult(
                            new Promise( (resolve, reject) => {
                                configureAndStartOrthanc({
                                    cmd: inpacsConfig.reloadCommand,
                                    timeout: 2000
                                }, (reloadErr) => {
                                    if(err) {
                                        reject(reloadErr);
                                    } else {
                                        resolve();
                                    }
                                });
                            } )
                          );

            if( err ) {
                Y.log(`enableOrthancService: Error while reloading orthanc server: ${err}`, 'warn', NAME );
            } else {
                Y.log(`enableOrthancService: Successfully reloaded orthanc server`, 'info', NAME );
                hasOrthancStartedInProd = true;
            }


            // Secondly enable Orthanc server (if not running) with newly generated extraConf.json
            Y.log(`enableOrthancService: Enabling Orthanc service on production...`, 'info', NAME );
            [err] = await formatPromiseResult(
                            new Promise( (resolve, reject) => {
                                configureAndStartOrthanc({
                                    cmd: inpacsConfig.enableCommand,
                                    timeout: 2000
                                }, (startErr) => {
                                    if( startErr ) {
                                        reject( startErr );
                                    } else {
                                        resolve();
                                    }
                                });
                            } )
                          );

            if(err) {
                Y.log(`enableOrthancService: Error enabling Orthanc server on prod: ${err}`, 'warn', NAME );
            } else {
                Y.log('enableOrthancService: Successfully enabled Orthanc service on prod...', 'info', NAME );
                hasOrthancStartedInProd = true;
            }

            return hasOrthancStartedInProd;
            // ---------------------------------------------- 5. END ----------------------------------------------
        }

        /**
         * Stopping Orthanc.
         * @returns {Object} result status of service or error
         * @param {function} cb function
         */
        function disableOrthancService( cb ) {
            if( !Y.doccirrus.auth.isPRC() ) {
                return cb();
            }

            let [err, inpacsConfig] = getInPacsConfig();

            if( err ) {
                Y.log( `disableOrthancService: Error in getInPacsConfig. Error: ${err}`, "error", NAME );
                return cb(new Error(`disableOrthancService: Error in getInPacsConfig. Error: ${err}`));
            }

            if( !inpacsConfig.disableCommand ) {
                Y.log( "disableOrthancService: No disable command found in inpacs.json. ", "error", NAME );
                return cb(new Error("disableOrthancService: No disable command found in inpacs.json."));
            }

            killOrthanc( inpacsConfig, (err, res) => {
                if(!err) {
                    setOrthancState(orthancStateConstants.DISABLED);
                }
                cb(err, res);
            } );
        }

        /**
         * Checks whether Orthanc server is running or not.
         * If stout is present then only the service is running.
         *
         * @returns {Promise<undefined|string>} - Ex: '1290'
         */
        function checkOrthancRunState() {
            return new Promise( (resolve, reject) => {
                exec( 'pgrep Orthanc', ( err, stdout ) => {
                    if( err ) {
                        if( 1 === err.code ) {
                            return resolve();
                        }
                        Y.log( "Error checking if Orthanc is running. Error: " + JSON.stringify( err ), "error", NAME );
                        return reject( err );
                    }

                    resolve(stdout);
                } );
            } );
        }

        function setOrthancState(state) {
            orthancState = state;
        }

        function spawnOrthanc( inpacsConfig, callback ) {
            Y.log( 'Spawning Orthanc.', 'info', NAME );

            const
                logFilePath = inpacsConfig.logFileName, //path.join( inpacsConfig.orthancDirectory, inpacsConfig.logFileName ),
                cmd = inpacsConfig.enableCommand,
                //0 - Orthanc cmd; 1 - configs dir; 2 - --trace; 3 - log path    /var/tmp/orthanc/ --trace /var/tmp/orthanc/Orthanc.log
                spawn = require( 'child_process' ).spawn,
                stdout = fs.openSync( logFilePath, 'a' ),
                stderr = fs.openSync( logFilePath, 'a' ),
                options = {
                    cwd: process.cwd(),
                    env: { DC_ENV: process.env.DC_ENV },
                    detached: true,
                    stdio: ['ignore', stdout, stderr]
                },
                LOGDEBUG = inpacsConfig.logLevel || '';

            if( !cmd ) {
                const err = new Y.doccirrus.commonerrors.DCError( 500, { message: 'No enable command in inpacs.json.' } );
                Y.log( JSON.stringify( err ), "error", NAME );
                return callback( err );
            }

            if( !stdout || !stderr || !logFilePath ) {
                const err = new Y.doccirrus.commonerrors.DCError( 500, { message: `Failed to read log file. Path: ${logFilePath}` } );
                Y.log( JSON.stringify( err ), "error", NAME );
                return callback( err );
            }

            Y.log("Spawning Orthanc as follows: "+cmd+" "+inpacsConfig.orthancDirectory+" "+LOGDEBUG, 'info', NAME);
            const orthanc = spawn( cmd, [inpacsConfig.orthancDirectory, LOGDEBUG], options );

            function checkAndRestartOrthanc() {
                setTimeout( async () => {
                    if(orthancState !== orthancStateConstants.DISABLED){
                        let [err, stdout] = await formatPromiseResult( checkOrthancRunState() );

                        if( err ) {
                            Y.log( "Error while checking running state of Orthanc: " + JSON.stringify( err ), "error", NAME );
                        }

                        if( stdout ) {
                            Y.log( "Orthanc is already running.", "warn", NAME );
                        } else {
                            Y.log( "Restarting Orthanc.", "info", NAME );
                            spawnOrthanc( inpacsConfig, () => {
                            } );
                        }
                    }
                }, 1000 * 60 );
            }

            orthanc.on('exit', function (code, signal) {
                Y.log(`Orthanc process exited with code: ${code} and signal: ${signal}`,'debug', NAME);
                checkAndRestartOrthanc();
            });

            orthanc.on( 'error', ( err ) => {
                Y.log( " Spawning Orthanc error: " + JSON.stringify( err ), "error", NAME );
            } );

            orthanc.unref();
            if( orthanc && orthanc.pid ) {
                Y.log( "Orthanc started.", "info", NAME );
                return callback();
            }
            else {
                const err = new Y.doccirrus.commonerrors.DCError( 500, { message: 'Failed to spawn Orthanc.' } );
                Y.log( JSON.stringify( err ), "error", NAME );
                return callback( err );
            }
        }

        function killOrthanc( inpacsConfig, cb ) {
            const disableServiceCmd = inpacsConfig.disableCommand;
            if( disableServiceCmd ) {
                exec( disableServiceCmd, function( err ) {
                    if( err ) {
                        if( 2 === err.code ) {
                            Y.log( 'Orthanc has been already disabled.', 'warn', NAME );
                        }
                        Y.log( `Error executing: ${disableServiceCmd}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                        return cb( err );
                    } else {
                        return cb( null, true );
                    }
                } );
            }
            else {
                Y.log( 'Inpacs disabling command doesn\'t exist.', 'error', NAME );
                return cb( 'Inpacs disabling command doesn\'t exist.' );
            }
        }

        function restartOrthanc( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.restartOrthanc', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.restartOrthanc');
            }
            const { data, callback, user } = args;
            var runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            if( data && typeof data.modalities !== 'undefined' ) {
                reloadService( callback, data, user );
            } else {
                runDb( {
                    user: user,
                    model: 'inpacsconfiguration',
                    action: 'get',
                    query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                    options: {
                        lean: true
                    },
                    useCache: false
                } ).then( result => reloadService( args.callback, result[0], user ) );
            }
        }

        function reloadService( cb, newConf, user ) {
            Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig ) => {
                if( err ) {
                    Y.log( 'Failed to reload service. Error: ' + JSON.stringify( err ), 'error', NAME );
                    return cb( err );
                }
                inpacsConfig.logLevel = newConf.logLevel;
                Y.log( `Reloading orthanc with log level: ${newConf.logLevel}`, 'info', NAME );

                generateInPacsExtraConf( inpacsConfig, user )
                .then( () => {
                    if( Y.doccirrus.auth.isDevServer() ) {
                        killOrthanc( inpacsConfig, async () => {
                            let [err, stdout] = await formatPromiseResult( checkOrthancRunState() );

                            if( err ) {
                                return cb( err );
                            }

                            if( !stdout ) {
                                spawnOrthanc( inpacsConfig, ( err ) => {
                                    if( err ) {
                                        return cb( err, newConf );
                                    }
                                    return cb( null, newConf );
                                } );
                            } else {
                                Y.log( 'Orthanc is already running.', 'warn', NAME );
                                return cb( null );
                            }
                        } );
                    } else {
                        configureAndStartOrthanc({
                            cmd: inpacsConfig.reloadCommand,
                            timeout: 4000
                        }, (err) => {
                            if(err) {
                                Y.log( `Error restarting orthanc: ${err}`, 'error', NAME );
                                return cb(err);
                            }
                            Y.log( `Restarted orthanc with loglevel: ${newConf.logLevel}`, 'info', NAME );
                            cb( );
                        });
                    }
                } )
                .catch( (err) => {
                    Y.log( `Failed to write extraConfig.json. ${JSON.stringify( err )}`, "error", NAME );
                    cb(err);
                } );
            } );
        }

        function getInPacsConfig( callback ) {
            let conf;
            try {
                conf = require( 'dc-core' ).config.load( process.cwd() + '/inpacs.json' );

                if( callback ) {
                    return callback( null, conf );
                }

                return [ null, conf ];
            } catch( e ) {
                Y.log( ` Error getting inpacs.json. Error: ${e.stack || e}`, "warn", NAME );

                if( callback ) {
                    return callback( e );
                }

                return [e];
            }
        }

        function getExtraConfPath( callback ) {
            getInPacsConfig( ( err, inpacsConfig ) => {
                if( err ) {
                    return callback( err );
                }
                if( inpacsConfig && inpacsConfig.extraConfigFileName ) {
                    return callback( null, path.join( inpacsConfig.orthancDirectory, inpacsConfig.extraConfigFileName ) );
                } else {
                    Y.log( 'InPacs config data empty. ', 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'InPacs config data empty.' } ) );
                }
            } );
        }

        /**
         * Returns Orthanc worklist path
         *
         * @param {Object} inpacsConfig - inpacs configuration
         *    @param {string} inpacsConfig.orthancDirectory
         * @returns {String} - Path to Orthanc worklists directory
         */
        function getWorkListsPath( inpacsConfig ) {
            if( !inpacsConfig || !inpacsConfig.orthancDirectory ) {
                throw new Error(`'inpacsConfig.orthancDirectory' must be present in input argument`);
            }

            return path.join( inpacsConfig.orthancDirectory, 'worklists' );
        }

        function getExtraConfFile( callback ) {
            getExtraConfPath( ( err, extraConfPath ) => {
                if( err ) {
                    return callback( err );
                }
                if( fs.existsSync( extraConfPath ) ) {
                    fs.readFile( extraConfPath, 'utf-8', ( err, res ) => {

                        if( err ) {
                            Y.log( "Error while reading orthanc extra config file. Error: " + JSON.stringify( err ), "error", NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 503, { message: 'Error. Orthanc root extra config is not available.' } ) );
                        }
                        else if( res ) {
                            try {
                                return callback( null, JSON.parse( res ) );
                            } catch( err ) {
                                return callback( err );
                            }
                        }
                        else {
                            Y.log( "Error. Orthanc path for extra config is empty.", "error", NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 503, { message: 'Error. Orthanc root extra config is not available.' } ) );
                        }

                    } );
                } else {
                    Y.log( "Error. Orthanc path for extra config doesnt exist.", "error", NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 503, { message: 'Error. Orthanc extra config is not available.' } ) );
                }
            } );
        }

        function setMocking( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.setMocking', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.setMocking');
            }
            const
                { callback, query, user } = args,
                { isMocking } = query;
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'inpacsconfiguration',
                fields: 'isMocking',
                query: { _id: Y.doccirrus.schemas.inpacsconfiguration.getDefaultData()._id },
                options: { limit: 1 },
                data: Y.doccirrus.filters.cleanDbObject( { 'isMocking': isMocking } ),
                user: user
            }, ( err ) => {
                if( err ) {
                    return callback( err );
                }
                return callback();
            } );
        }

        async function runOnStartOrthanc( callback ) {
            if( cluster.isMaster && Y.doccirrus.auth.isPRC() ) {
                if( isInPacsLicenseEnabled( Y.doccirrus.auth.getSUForLocal() ) ) {
                    const [error, isOrthancStarted] = await formatPromiseResult( Y.doccirrus.api.inpacsconfiguration.enableOrthancService() );

                    if( error ) {
                        Y.log(`runOnStartOrthanc: Error in 'enableOrthancService()': ${error.stack || error}`, "error", NAME);
                        return callback( error );
                    }

                    if(!isOrthancStarted) {
                        Y.log(`runOnStartOrthanc: Failed to start Orthanc server. isOrthancStarted = ${isOrthancStarted}`, "error", NAME);
                    } else {
                        Y.log(`runOnStartOrthanc: Orthanc server started successfully`, "info", NAME);
                    }

                    return callback();
                }
                disableOrthancService( ( err, res ) => {
                    if( err ) {
                        Y.log( `Error disabling Orthanc on start up: ${err.stack || err}`, "error", NAME );
                    }
                    if( res ) {
                        Y.log( "Orthanc disabled.", "debug", NAME );
                    }
                    callback( err, res );
                } );
            } else {
                return callback();
            }
        }

        function setLogLevelAndRestart( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.setLogLevelAndRestart', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.setLogLevelAndRestart');
            }
            const { user, data: { logLevel = '' }, callback } = args;
            var runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

            runDb( {
                user: user,
                query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                model: 'inpacsconfiguration',
                action: 'put',
                fields: ['logLevel'],
                data: Y.doccirrus.filters.cleanDbObject( { logLevel: logLevel } )
            } )
                .then(() => {
                    restartOrthanc( args );
                })
                .catch( err => {
                    Y.log( `Failed to save new logLevel: ${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                } );
        }

        function updateInpacsConfiguration( args ) {
            Y.log('Entering Y.doccirrus.api.inpacsconfiguration.updateInpacsConfiguration', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsconfiguration.updateInpacsConfiguration');
            }
            const { user, data, fields } = args;

            if( !user || !data || !fields || !Array.isArray(fields) ) {
                throw "Invalid input";
            }

            return Y.doccirrus.mongodb.runDb({
                user,
                query: {_id: Y.doccirrus.schemas.inpacsconfiguration.getId()},
                model: 'inpacsconfiguration',
                action: 'put',
                fields: fields,
                data: Y.doccirrus.filters.cleanDbObject( data )
            });
        }

        /**
         * @method PUBLIC
         * @JsonRpc
         *
         * This method parses the uploaded CSV file (the CSV file is already saved in the temp location by multer middleware
         * before reaching this method), validates it, saves it in DB using gridfs api (if validation was successful)
         * and responds with file database ID and CSV parsed rows (see returns).
         *
         * NOTE: Bloew CSV file structure is the correct structure for this method to successfully parse it
         * 1;value;caluemeaning
         * 2;value;valuemeaning
         *
         *
         * @param {Object} args
         * @param {Object} args.user - user object
         * @param {Object} args.httpRequest - Express request object
         * @param {Object} args.httpRequest.files - Files object parsed by multer
         * @param {Object} args.httpRequest.files.csvFile - CSV file details uploaded by user and saved by multer
         *                                                  middleware
         * @param {function} args.callback - function to respond with results.
         *                                   If successful responds with below structure:
         *                                   {
         *                                       gridFsFileDownloadId: <string>,
         *                                       dicomTagValuesArr: [
         *                                           {
         *                                               id: <string>,
         *                                               value: <string>,
         *                                               comment: <string>
         *                                           },
         *                                           ...
         *                                       ]
         *                                   }
         *
         *                                   If unsuccessful then responds as below:
         *                                   {message: <string>}
         * @returns {Promise<void>}
         */
        async function parseCsvFileForDicomTagValues( args ) {
            const
                {httpRequest: {files: {csvFile} = {} }, callback, user } = args;

            let
                err,
                csvFileBuffer,
                csvFileContent,
                dicomTagValuesArr = [],
                gridFsFileDownloadId;

            // -------------------------------- 1. CSV file validations ----------------------------------------
            if( !csvFile ) {
                return callback( {message: `missing 'csv' file`} );
            }

            if( csvFile.mimetype !== "text/csv" && csvFile.mimetype !== "application/vnd.ms-excel" ) {
                return callback( {message: `Uploaded file is not 'csv'`} );
            }

            if( csvFile.extension !== "csv" ) {
                return callback( {message: `Uploaded file does not have '.csv' extension`} );
            }

            if( !csvFile.size ) {
                return callback( {message: `Empty 'csv' file uploaded`} );
            }

            if( !csvFile.originalname ) {
                return callback( {message: `Uploaded 'csv' file does not have any name`} );
            }

            if( !csvFile.path ) {
                // This should never happen as we expect multer would have saved the
                // file on a temporary path on the disk
                return callback( {message: `Temporary path of 'csv' file is not available.`} );
            }
            // -------------------------------------- 1. END ----------------------------------------------------


            // -------------------------------- 2. Read contents of csv file from temporary path csvFile.path (saved by multer) ---------------------------------------
            [err, csvFileBuffer] = await formatPromiseResult( readFileProm( csvFile.path ) );

            if( err ) {
                Y.log(`parseCsvFileForDicomTagValues: Error reading uploaded csv file contents from temporary path at: ${csvFile.path}. Error: ${err.stack || err}`, "error", NAME);
                return callback({message: `Error reading uploaded csv file contents from temporary path at: ${csvFile.path}. Error mesage: ${err.message || err}`});
            }

            if( !csvFileBuffer ) {
                Y.log(`parseCsvFileForDicomTagValues: csvFile uploaded at temporary path: ${csvFile.path} by multer is empty. Content: ${csvFileBuffer}.`, "error", NAME);
                return callback( {message: `csvFile does not have any content`} );
            }

            csvFileContent = csvFileBuffer.toString();
            // ------------------------------------------------------------------ 2. END --------------------------------------------------------------------------------


            // ------------- 3. Read CSV file line by line and validate whether all the expected fields are there in every line. If not then respond with error -------------
            for( const [index, dicomTagValueLine] of csvFileContent.split("\n").entries() ) {
                const
                    dicomTagValueLineContentsArr = dicomTagValueLine.split(";"),
                    lineNumber = index+1;

                if( dicomTagValueLineContentsArr.length !== 3 ) {
                    Y.log(`parseCsvFileForDicomTagValues: Invalid line value = ${dicomTagValueLine}. Line number = ${lineNumber} in uploaded csv file. Expected 3 value fields but got ${dicomTagValueLineContentsArr.length}`, "warn", NAME);
                    return callback({message: `Invalid line value = ${dicomTagValueLine}. Expected 3 values separated by ';' but got ${dicomTagValueLineContentsArr.length} value(s) at line number = ${lineNumber} in uploaded csv file`});
                }

                for( const valueContent of dicomTagValueLineContentsArr ) {
                    if( !valueContent ) {
                        Y.log(`parseCsvFileForDicomTagValues: Missing value in uploaded csv file at line: ${dicomTagValueLine}. Line number = ${lineNumber} and valueContent = ${valueContent}`, "warn", NAME);
                        return callback( {message: `Missing value in uploaded csv file at line: ${dicomTagValueLine}. Line number = ${lineNumber} and valueContent = ${valueContent}`} );
                    }
                }

                dicomTagValuesArr.push({
                    id: dicomTagValueLineContentsArr[0],
                    value: dicomTagValueLineContentsArr[1],
                    comment: dicomTagValueLineContentsArr[2]
                });
            }
            // -------------------------------------------------------------- 3. END ------------------------------------------------------------------------------------


            // ---------------------------------------------------------- 4. Save CSV file in database ----------------------------------------------------------------
            [err, gridFsFileDownloadId] = await formatPromiseResult( gridFsStoreProm( user, csvFile.originalname, {content_type: csvFile.mimetype}, csvFileBuffer ) );

            if( err ) {
                Y.log(`parseCsvFileForDicomTagValues: Error while saving csvFile in the database. Error: ${err.stack || err}`, "error", NAME);
                return callback({message: `Error while saving csvFile in the database. Error message: ${err.message || err}`});
            }

            if( !gridFsFileDownloadId ) {
                Y.log(`parseCsvFileForDicomTagValues: Failed to save csvFile in the database as gridFsfileDownloadId = ${gridFsFileDownloadId}`, "error", NAME);
                return callback({message: `Failed to save csvFile in the database as gridFsfileDownloadId = ${gridFsFileDownloadId}`});
            }
            // -------------------------------------------------------------------- 4. END -----------------------------------------------------------------------------


            callback(null, { dicomTagValuesArr, gridFsFileDownloadId });
        }

        Y.namespace( 'doccirrus.api' ).inpacsconfiguration = {
            name: NAME,
            getInpacsConfiguration,
            getMappedData,
            saveWorkList,
            createWorkListTxt,
            changeLastLogLine,
            getLogFile,
            enableOrthancService,
            disableOrthancService,
            reloadService,
            getInPacsConfig,
            getExtraConfPath,
            getExtraConfFile,
            setMocking,
            generateInPacsExtraConf,
            runOnStartOrthanc,
            restartOrthanc,
            setLogLevelAndRestart,
            getWorkListsPath,
            updateInpacsConfiguration,
            WORK_LIST_TMP_DIR_NAME,
            getStudyInstanceUID,
            parseCsvFileForDicomTagValues
        };

    }, '0.0.1', {
        requires: [
            'dclicmgr',
            'inpacsworklist-schema',
            'inpacsconfiguration-schema',
            'sysnum-schema'
        ]
    }
);
