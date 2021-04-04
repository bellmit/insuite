/*global YUI */


/*eslint-disable no-console */

YUI.add( 'methodsTest-api', function( Y, NAME ) {
        const
            ObjectId = require( 'mongodb' ).ObjectID;

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        function processRules( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.processRules', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.processRules' );
            }
            const {user, callback} = args;

            var changed, dirs;

            function processValidation( validation ) {
                if( Array.isArray( validation ) ) {
                    validation.forEach( el => processValidation( el ) );
                } else if( 'object' === typeof validation ) {
                    let keys = Object.keys( validation );
                    if( 1 === keys.length && ['\\\\$and', '\\\\$or'].includes( keys[0] ) ) {
                        processValidation( validation[keys[0]] );
                    } else if( keys.includes( 'criteria' ) ) {
                        let criteria = validation.criteria;

                        if( criteria.actType &&
                            ('TREATMENT' === criteria.actType ||
                             criteria.actType['\\\\$eq'] && 'TREATMENT' === criteria.actType['\\\\$eq']) ) {
                            if( !criteria.hasOwnProperty( 'areTreatmentDiagnosesBillable' ) ) {
                                criteria.areTreatmentDiagnosesBillable = {'\\\\$eq': "1"};
                                changed = true;
                            }
                        }
                    } else {
                        Y.log( 'criteria is not found in the rule ' + JSON.stringify( keys ) + ' ' +
                               JSON.stringify( validation ), 'warn', NAME );
                    }
                } else {
                    Y.log( 'object expected ' + JSON.stringify( validation ), 'warn', NAME );
                }
            }

            function processDocCirrusRuleSets( ruleModel, query, callback ) {
                let error = null,
                    stream = ruleModel.mongoose.find( query, {}, {timeout: true} ).stream(),
                    selected,
                    processed;

                selected = 0;
                processed = 0;

                stream.on( 'data', function( ruleSet ) {
                    selected++;
                    stream.pause();

                    changed = false;
                    (ruleSet && ruleSet.rules || []).forEach( rule => processValidation( rule.validations ) );
                    if( changed ) {
                        processed++;

                        ruleModel.mongoose.update(
                            {_id: ruleSet._id},
                            {$set: {rules: ruleSet.rules}},
                            function( err ) {
                                if( err ) {
                                    Y.log( 'error updating ruleset ' + err, 'error', NAME );
                                    error = err;
                                }
                                stream.resume();
                            } );
                    } else {
                        stream.resume();
                    }

                } ).on( 'error', function( err ) {
                    Y.log( 'stream error' + err, 'error', NAME );
                    error = err;

                } ).on( 'close', function() {
                    Y.log( ' stream close', 'info', NAME );
                    callback( error, {selected: selected, processed: processed} );
                } );
            }

            function getDocCirrusRuleSetsDirectories( ruleModel, directories, cb ) {
                ruleModel.mongoose.find( {isDirectory: true, parent: {$in: directories}}, ( err, childs ) => {
                    if( err ) {
                        return cb( err );
                    }
                    let ids = (childs || []).map( el => el._id.toString() );
                    if( ids.length ) {
                        dirs = dirs.concat( ids );
                        getDocCirrusRuleSetsDirectories( ruleModel, ids, cb );
                    } else {
                        return cb( null );
                    }
                } );
            }

            Y.doccirrus.mongodb.getModel( user, 'rule', true, ( err, ruleModel ) => {
                if( err ) {
                    return callback( err );
                }

                dirs = ['000000000000000000000001'];
                getDocCirrusRuleSetsDirectories( ruleModel, dirs, ( err ) => {
                    if( err ) {
                        return callback( err );
                    }
                    processDocCirrusRuleSets( ruleModel, {isDirectory: false, parent: {$in: dirs}}, callback );
                } );

            } );

        }

        function setRuleMeta( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.setRuleMeta', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.setRuleMeta' );
            }
            const {user, callback} = args;

            function processDocCirrusRuleSets( ruleModel, query, callback ) {
                let error = null,
                    stream = ruleModel.mongoose.find( query, {}, {timeout: true} ).stream(),
                    selected,
                    processed;

                selected = 0;
                processed = 0;

                stream.on( 'data', function( ruleSet ) {
                    selected++;
                    stream.pause();

                    let data;
                    if( ruleSet.isDirectory === false && ruleSet.rules && ruleSet.rules.length ) {
                        let meta = Y.doccirrus.ruleutils.getMeta( ruleSet.rules, ruleSet );

                        ruleSet.rules = ruleSet.rules.map( rule => {
                            if( rule.ruleId ) {
                                return rule;
                            }
                            rule.ruleId = (new ObjectId()).toString();
                            return rule;
                        } );

                        data = {
                            idStr: ruleSet._id.toString(),
                            rules: ruleSet.rules,
                            metaActTypes: meta.actTypes,
                            metaActCodes: meta.actCodes,
                            metaCriterias: (meta.criterias || []).filter( el => el.indexOf( '$' ) !== 0 ),
                            metaFuzzy: meta.metaFuzzy,
                            metaCaseOpen: meta.metaCaseOpen
                        };
                    } else {
                        data = {
                            idStr: ruleSet._id.toString()
                        };
                    }

                    ruleModel.mongoose.update(
                        {_id: ruleSet._id},
                        {$set: data},
                        function( err ) {
                            if( err ) {
                                Y.log( 'error updating ruleset ' + err, 'error', NAME );
                                error = err;
                            }
                            processed++;
                            stream.resume();
                        } );
                } ).on( 'error', function( err ) {
                    Y.log( 'stream error' + err, 'error', NAME );
                    error = err;

                } ).on( 'close', function() {
                    Y.log( ' stream close', 'info', NAME );
                    callback( error, {selected: selected, processed: processed} );
                } );
            }

            Y.doccirrus.mongodb.getModel( user, 'rule', true, ( err, ruleModel ) => {
                if( err ) {
                    return callback( err );
                }
                processDocCirrusRuleSets( ruleModel, {}, callback );
            } );
        }

        function triggerReportings( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.triggerReportings', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.triggerReportings' );
            }
            const {user, callback, data} = args;
            let activityId = data._id;

            Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activityId );
            //http://2222222222.dev.dc/1/methodsTest/:triggerReportings?_id=591eb6befe83c59114c52f35

            callback( null, data );
        }

        function triggerAUX( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.triggerAUX', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.triggerAUX' );
            }
            const {user, callback, data} = args;

            Y.doccirrus.api.reporting.dailyReportingsAuxUpdate( user );

            callback( null, data );
        }

        function migrationTest( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.migrationTest', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migrationTest' );
            }
            const {user, callback} = args;

            const
                async = require( 'async' );
            Y.log( `migrateSupportUsers_3_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'rule', true, next );
                    },
                    function( rulesCollection, next ) {
                        const cursor = rulesCollection.mongoose.find( {
                            isDirectory: false,
                            parent: "594cce58ad3721e317bfcc80",
                            caseFolderType: {$type: 2}
                        } ).cursor();
                        cursor.eachAsync( doc => {

                            return new Promise( ( resolve, reject ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'rule',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: {caseFolderType: [doc.caseFolderType]}}
                                }, ( err ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            console.log( 'done!' );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }],
                (err => {
                    if( err ) {
                        Y.log( 'migrateSupportUsers_3_5 failed ' + err.message, 'error', NAME );
                    }
                    callback( err );
                })
            );
        }

        function updateRules( rules ) {

            function proccessCriteria( criteria ) {
                if( criteria.code ) {
                    delete criteria.code['\\\\$catalogShort'];
                }
            }

            function proccessValidation( vld ) {
                if( Array.isArray( vld ) ) {
                    vld.forEach( function( vl ) {
                        proccessValidation( vl );
                    } );
                } else {
                    Object.keys( vld ).forEach( function( vlk ) {
                        switch( vlk ) {
                            case '\\\\$and':
                            case '\\\\$or':
                                proccessValidation( vld[vlk] );
                                break;
                            case 'criteria':
                                proccessCriteria( vld[vlk] );
                                break;
                        }
                    } );
                }

            }

            rules.forEach( function( rl ) {
                proccessValidation( rl.validations );
            } );
            return rules;
        }

        function updateRulesFor3_5( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.updateRulesFor3_5', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.updateRulesFor3_5' );
            }
            //TODO befor runing rule-schema should be change caseFolderType [String] => String
            const
                async = require( 'async' ),
                {user, callback} = args;
            Y.log( `updateRulesFor3_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'rule', true, next );
                    },
                    function( rulesCollection, next ) {
                        const cursor = rulesCollection.mongoose.find( {
                            isDirectory: false,
                            parent: '59b0f392b82414172fe9fd33'
                        } ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve, reject ) => {
                                let setData = {
                                    caseFolderType: Array.isArray( doc.caseFolderType ) ? doc.caseFolderType[0] : doc.caseFolderType,
                                    rules: updateRules( doc.rules )
                                };

                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'rule',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: setData}
                                }, ( err ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `updateRulesFor3_5 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'updateRulesFor3_5 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateRulesMultiCaseFolderTypes_3_5 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        function xmlTest( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.xmlTest', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.xmlTest' );
            }
            const
                {callback} = args;

            var fs = require( 'fs' ),
                xml2js = require( 'xml2js' );

            var parser = new xml2js.Parser(), pathType = {};

            var types = {};

            function processXSD( path, obj ) {
                if( Array.isArray( obj ) ) {
                    obj.forEach( el => {
                        processXSD( path, el );
                    } );
                } else {
                    if( obj.$ && obj.$.name ) {
                        let subPath = obj.$.name;
                        path += ((path) ? '.' : '') + subPath.replace( /^section\_/, '' ).replace( /^value\_/, '' );
                    }
                    if( obj.$ && (obj.$.base || obj.$.mixed) ) {
                        let type = obj.$.base || 'Number'; //mixed treated as 'Number'
                        if( 0 === type.indexOf( 'String' ) || 0 < type.indexOf( '_ENUM_' ) || 'xs:string' === type ) {
                            type = 'String';
                        } else if( 0 === type.indexOf( 'Numeric' ) ) {
                            type = 'Number';
                        } else if( 'DateTime' === type ) {
                            type = 'Date';
                        }

                        types[type] = 1;
                        pathType[path] = type;
                    }
                    ['xs:complexType', 'xs:sequence', 'xs:element', 'xs:simpleContent', 'xs:extension'].forEach( nested => {
                        if( obj[nested] ) {
                            processXSD( path, obj[nested] );
                        }
                    } );

                    //check Other keys
                    let otherKeys = Object.keys( obj ).filter( key => ![
                        '$', 'xs:complexType', 'xs:sequence', 'xs:element', 'xs:annotation',
                        'xs:simpleContent', 'xs:extension', 'xs:attribute', 'xs:all'].includes( key ) );
                    if( otherKeys.length ) {
                        Y.log( 'Other keys ' + JSON.stringify( otherKeys ), 'warn' );
                    }

                }

            }

            /*
            function processSection(path, obj){
                if(obj.section) {
                    if( Array.isArray( obj.section ) ) {
                        obj.section.forEach( sect => {
                            processSection( path + (path ? '.' : '') + sect.$.name, sect );
                        } );
                    } else {
                        processSection( path + (path ? '.' : '') + obj.$.name, obj.section );
                    }
                } else {
                    obj.value.forEach( value => {
                        let key = path + '.' + value.$.name;
                        pathType[key] = value.$.type.includes('ENUM') ? 'String' : value.$.type;
                    } );

                }
            }
            */

            // __dirname /home/dcdev/doccirrus/dc-insuite/mojits/TestingMojit/autoload
            fs.readFile( __dirname + '/../../../src/biotronik/bio_ieee_xml_v4-7.xsd', function( err, data ) {//Cardio-With4Notifications05.xml bio_ieee_xml.xsd
                if( err ) {
                    console.warn( err );
                }
                parser.parseString( data, function( err, result ) {
                    if( err ) {
                        console.warn( err );
                    }
                    /*
                    let dataset = result['biotronik-ieee11073-export'].dataset;
                    dataset.forEach( data => processSection('', data) );
                    */
                    processXSD( '', result['xs:schema']['xs:element'] );
                    callback( null, pathType );
                } );
            } );
        }

        function testAggregate( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.testAggregate', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.testAggregate' );
            }
            const
                {user, callback} = args,
                dbUtils = require( 'dc-core' ).utils,
                DB = require( 'dc-core' ).db,
                configFile = DB.loadDbConfig(),
                mongo = require( 'mongodb' );

            let dbConfig;
            dbConfig = configFile && configFile.mongoDb;

            let options = JSON.parse( JSON.stringify( DB.checkAndGetMongoClientOptions( configFile ) ) ),
                uri, client, db;

            uri = dbUtils.getDBUri( 'admin', dbConfig );
            delete options.useMongoClient;

            mongo.MongoClient.connect( uri, options, ( err, mongoClient ) => {
                if( err ) {
                    console.warn( 'V: 001_01' + err.stack );
                    return callback( err );
                }
                client = mongoClient;
                db = mongoClient.db( user.tenantId );

                db.collection( 'invoiceentries' ).aggregate( [
                    {$project: {tms: "$data.treatments", schein: "$data._id"}},
                    {$unwind: "$tms"},
                    {$project: {code: "$tms.code", lanr: "$tms._lanr"}},
                    {$group: {_id: {"code": "$code", "lanr": "$lanr"}, N: {$sum: 1}}},
                    {$project: {code: "$_id.code", lanr: "$_id.lanr", N: 1, _id: 0}},
                    {$sort: {lanr: 1, code: 1}}
                ] ).toArray().then( results => {
                    console.warn( 'V: 001_02', results );
                    client.close( true, ( err ) => {
                        console.warn( 'V: 001_01_called_close', err );
                    } );
                } );

                db.on( 'error', ( err ) => {
                    console.warn( 'V: 001_01_1 error', err );
                    client.close( true, ( err ) => {
                        console.warn( 'V: 001_01_after_close', err );
                    } );
                } );

                db.on( 'close', ( arg ) => {
                    console.warn( 'V: 001_01_on_close', arg );
                    callback();
                } );

            } );

        }

        function testCircular( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.testCircular', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.testCircular' );
            }
            const
                {callback} = args;

            const
                ObjId = require( 'mongoose' ).Types.ObjectId;

            let
                circularReference = {otherData: 123, id: new ObjId(), date: new Date()};

            circularReference.myself = circularReference;
            try {
                let cleaned = Y.doccirrus.filters.cleanDbObject( circularReference );
                console.warn( 'V: 001_01', cleaned );
            } catch( error ) {
                console.warn( 'V: 001_01e', error );
            }

            callback();
        }

        function mongoOperation( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.mongoOperation', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.mongoOperation' );
            }
            const
                {user, callback} = args;

            let options = {
                "limit": 1000,
                "skip": 0,
                "sort": {},
                "paging": true,
                "lean": true
            };

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'company',
                action: 'get',
                query: {
                    prodServices: {
                        $elemMatch: {
                            config: {$elemMatch: {key: 'isTemplate', value: 'true'}},
                            ps: 'VPRC'
                        }
                    }, activeState: true
                },
                options: options,
                callback: ( err, result ) => {
                    let isArray = Array.isArray( result );
                    if( err || !result || (isArray && !result[0]) || (!isArray && (!result.result || !result.result.length)) ) {
                        Y.log( 'getTemplateTenants: no result, possible error: ' + err, (err) ? 'error' : 'warn', NAME );
                    }
                    callback( err, result );
                }
            } );
        }

        async function migrateMeasurementAddMDC_4_0( user, callback ) {
            let
                err,
                result,
                activityModel,
                measuremetsToProcess;

            Y.log( `migrateMeasurementAddMDC_4_0: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Error getting activity model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Failed to fetch activity model`, "error", NAME );
                return callback( `migrateMeasurementAddMDC_4_0: Failed to fetch activity model` );
            }

            activityModel = result;

            [err, result] = await formatPromiseResult(
                activityModel.mongoose.collection.find(
                    {actType: 'MEASUREMENT', 'd_extra.IDC': {$exists: true}, 'd_extra.MDC': {$exists: false}},
                    {fields: {d_extra: 1}}
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Error fetching unprocessed Measurements. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateMeasurementAddMDC_4_0: No more unprocessed MEASUREMENTs. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            measuremetsToProcess = result;

            for( let measurement of measuremetsToProcess ) {
                let obj = {}, color, userContent;
                color = measurement.d_extra && measurement.d_extra.color;
                if( color ) {
                    delete measurement.d_extra.color;
                    obj.color = color;
                }
                obj.MDC = measurement.d_extra;
                userContent = Y.doccirrus.api.cardio.getPrettyJson( obj );
                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.updateOne( {_id: measurement._id}, {
                        $set: {
                            d_extra: obj,
                            userContent: userContent
                        }
                    } )
                );

                if( err ) {
                    Y.log( `migrateMeasurementAddMDC_4_0: Error updating ${measurement._id.toString()}. Error: ${err.message || err}`, "error", NAME );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migrateMeasurementAddMDC_4_0: Failed to rewrite d_extra and userContent in ${measurement._id.toString()}`, "error", NAME );
                }
            }

            Y.log( `migrateMeasurementAddMDC_4_0: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function updateBIOTRONICrules( user, callback ) {
            let
                err,
                result,
                ruleModel,
                rulesToProcess,
                processed = 0,
                changed;

            function processValidation( validation ) {
                if( Array.isArray( validation ) ) {
                    validation.forEach( el => processValidation( el ) );
                } else if( 'object' === typeof validation ) {
                    let keys = Object.keys( validation );
                    if( 1 === keys.length && ['\\\\$and', '\\\\$or'].includes( keys[0] ) ) {
                        processValidation( validation[keys[0]] );
                    } else if( keys.includes( 'criteria' ) ) {
                        let criteria = validation.criteria;

                        if( criteria.actType && ('MEASUREMENT' === criteria.actType || 'MEASUREMENT' === criteria.actType['\\\\$eq']) ) {
                            Object.keys( criteria ).forEach( key => {
                                if( 0 === key.indexOf( 'd_extra\\\\-IDC\\\\-' ) || 0 === key.indexOf( 'd_extra\\\\-ATTR\\\\-' ) ) {
                                    changed = true;
                                    let
                                        value = criteria[key],
                                        newKey = key.replace( 'd_extra\\\\-', 'd_extra\\\\-MDC\\\\-' );
                                    delete criteria[key];
                                    criteria[newKey] = value;
                                }
                            } );
                        }

                    } else {
                        Y.log( 'criteria is not found in the rule ' + JSON.stringify( keys ) + ' ' +
                               JSON.stringify( validation ), 'warn', NAME );
                    }
                } else {
                    Y.log( 'object expected ' + JSON.stringify( validation ), 'warn', NAME );
                }
            }

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'rule', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `updateBIOTRONICrules: Error getting rule model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `updateBIOTRONICrules: Failed to fetch rule model`, "error", NAME );
                return callback( `updateBIOTRONICrules: Failed to fetch activity model` );
            }

            ruleModel = result;

            [err, result] = await formatPromiseResult(
                ruleModel.mongoose.collection.find( {isDirectory: false},
                    {fields: {rules: 1}}
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `updateBIOTRONICrules: Error fetching rules. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            rulesToProcess = result || [];
            Y.log( `Total ruleSets ${rulesToProcess.length.length}`, 'info', NAME );
            for( let ruleSet of rulesToProcess ) {
                if( !ruleSet.rules || !ruleSet.rules.length ) {
                    continue;
                }
                changed = false;
                ruleSet.rules.forEach( rule => {
                    processValidation( rule.validations );
                } );
                if( !changed ) {
                    continue;
                }

                [err, result] = await formatPromiseResult(
                    ruleModel.mongoose.collection.updateOne( {_id: ruleSet._id}, {$set: {rules: ruleSet.rules}} )
                );

                if( err ) {
                    Y.log( `updateBIOTRONICrules: Error updating ${ruleSet._id.toString()}. Error: ${err.message || err}`, "error", NAME );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `updateBIOTRONICrules: Failed to rewrite rules in ${ruleSet._id.toString()}`, "error", NAME );
                } else {
                    processed++;
                }

            }

            Y.log( `updateBIOTRONICrules: Successfully executed for tenant: ${user.tenantId} updated ${processed.toString()} of ${rulesToProcess.length.toString()}`, "info", NAME );
            callback();
        }

        function minimalCursorCrash( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.minimalCursorCrash', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.minimalCursorCrash' );
            }
            const
                {callback} = args;

            let userSU = Y.doccirrus.auth.getSUForLocal();

            let options = {
                "limit": 4700,
                //"lean": true,
                "select": {'_id': 1}
            };

            Y.doccirrus.mongodb.runDb( {
                user: userSU,
                model: 'catalog',
                action: 'get',
                query: {},
                options: options
            } ).then( result => {

                let currentExportPromise,
                    stream,
                    catalogs = result.map( el => el._id ),
                    processed = 0;

                console.time( 'cursor' );

                function onData( catalog ) {
                    stream.pause();
                    processed++;
                    currentExportPromise = () => {
                        return new Promise( resolve => {
                            console.log( processed, catalog );
                            setTimeout( resolve, 2000 );
                        } );
                    };

                    currentExportPromise().then( () => {
                        stream.resume();
                    } );
                }

                function onError( err ) {
                    console.warn( `onError ${err}` );
                    stream.close();
                }

                function onClose() {
                    console.timeEnd( 'cursor' );
                    stream.destroy();
                    /*
                    if( currentExportPromise && 'function' === typeof currentExportPromise.isPending && currentExportPromise.isPending() ) {
                        console.warn( 'wait 100ms and try again', 'info');
                        return setTimeout( onClose, 100 );
                    }
                    */
                }

                Y.doccirrus.mongodb.getModel( userSU, 'catalog', true, ( err, model ) => {
                    if( err ) {
                        throw err;
                    }
                    stream = model.mongoose.find( {_id: {$in: catalogs}}, {
                        title: 1,
                        catalog: 1
                    } ).cursor( /* {batchSize: 5000} */ ).addCursorFlag( 'noCursorTimeout', true );
                    stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );
                    callback( null ); //callback earlier
                } );

            } ).catch( err => {
                console.warn( `Error ${err.message}` );
                callback( err );
            } );

        }

        function testMongoCursor( args ) {
            Y.log( 'Entering Y.doccirrus.api.methodsTest.testMongoCursor', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.testMongoCursor' );
            }
            const
                {callback} = args,
                dbUtils = require( 'dc-core' ).utils,
                DB = require( 'dc-core' ).db,
                configFile = DB.loadDbConfig(),
                mongo = require( 'mongodb' );

            let dbConfig;
            dbConfig = configFile && configFile.mongoDb;

            let options = JSON.parse( JSON.stringify( DB.checkAndGetMongoClientOptions( configFile ) ) ),
                uri, client, db, stream, processed = 0, currentExportPromise;

            console.time( 'cursor' );

            function onData( catalog ) {
                stream.pause();
                processed++;
                currentExportPromise = () => {
                    return new Promise( resolve => {
                        console.log( processed, catalog );
                        setTimeout( resolve, 10 * 1000 );
                    } );
                };

                currentExportPromise().then( () => {
                    stream.resume();
                } );
            }

            function onError( err ) {
                console.warn( `onError ${err}` );
                stream.close();
            }

            function onClose() {
                console.timeEnd( 'cursor' );
            }

            uri = dbUtils.getDBUri( 'admin', dbConfig, options );
            delete options.useMongoClient;

            mongo.MongoClient.connect( uri, options, ( err, mongoClient ) => {
                if( err ) {
                    console.warn( 'Error opening monoDB connection', err );
                    return callback( err );
                }
                client = mongoClient;
                db = mongoClient.db( '0' );

                stream = db.collection( 'catalogs' ).find( {} ).project( {_id: 1, title: 1, catalog: 1} );
                stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );
                callback();

                db.on( 'error', ( err ) => {
                    console.warn( 'V: 001_01_1 error', err );
                    client.close( true, ( err ) => {
                        console.warn( 'V: 001_01_after_close', err );
                    } );
                } );

                db.on( 'close', ( arg ) => {
                    console.warn( 'V: 001_01_on_close', arg );
                } );
            } );

        }

        async function addProcessToCardioRules( user, callback ) {
            const
                async = require( 'async' ),
                ObjectId = require( 'mongodb' ).ObjectID;

            let
                err,
                result; // eslint-disable-line no-unused-vars

            Y.log( `addProcessToCardioRules: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            let rulesToUpdate;
            [err, rulesToUpdate] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'rule',
                    action: 'get',
                    migrate: true,
                    query: {
                        caseFolderType: Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                        $or: [
                            {'rules.validations.criteria.actType.\\\\$eq': 'MEASUREMENT'},
                            {'rules.validations.criteria.actType': 'MEASUREMENT'},
                            {'rules.validations.\\\\$and.criteria.actType.\\\\$eq': 'MEASUREMENT'},
                            {'rules.validations.\\\\$and.criteria.actType': 'MEASUREMENT'},
                            {'rules.validations.\\\\$or.criteria.actType.\\\\$eq': 'MEASUREMENT'},
                            {'rules.validations.\\\\$or.criteria.actType': 'MEASUREMENT'}
                        ],
                        'rules.validations.criteria.actType.\\\\$eq': {$ne: 'PROCESS'},
                        'rules.validations.criteria.actType': {$ne: 'PROCESS'},
                        'rules.validations.\\\\$and.criteria.actType.\\\\$eq': {$ne: 'PROCESS'},
                        'rules.validations.\\\\$and.criteria.actType': {$ne: 'PROCESS'},
                        'rules.validations.\\\\$or.criteria.actType.\\\\$eq': {$ne: 'PROCESS'},
                        'rules.validations.\\\\$or.criteria.actType': {$ne: 'PROCESS'}
                    },
                    options: {
                        select: {rules: 1}
                    }
                } )
            );

            if( err ) {
                Y.log( `addProcessToCardioRules: Error finding ruleSets to processing: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !rulesToUpdate.length ) {
                Y.log( 'addProcessToCardioRules: There are nothing more to duplicate', 'info', NAME );
            }

            function processValidations( validation ) {
                if( Array.isArray( validation ) ) {
                    let updated = false;
                    validation.forEach( el => {
                        updated = updated || processValidations( el );
                    } );
                    return updated;
                } else if( validation['\\\\$and'] ) {
                    return processValidations( validation['\\\\$and'] );
                } else if( validation['\\\\$ord'] ) {
                    return processValidations( validation['\\\\$or'] );
                } else if( validation.context === 'ACTIVITY' &&
                           (validation.criteria && validation.criteria.actType === 'MEASUREMENT' || validation.criteria && validation.criteria.actType['\\\\$eq'] === 'MEASUREMENT') ) {
                    validation.criteria.actType = {'\\\\$eq': 'PROCESS'};
                    return true;
                } else {
                    return false;
                }
            }

            async.eachSeries( rulesToUpdate, async ( ruleSet, nextSerie ) => {
                let duplicate = [];
                (ruleSet.rules || []).forEach( rule => {
                    let newRule = JSON.parse( JSON.stringify( rule ) );
                    if( newRule.validations ) {
                        let updated = processValidations( newRule.validations );
                        if( updated ) {
                            newRule.ruleId = new ObjectId().toString();
                            duplicate = [...duplicate, newRule];
                        }
                    }
                } );
                if( !duplicate.length ) {
                    return nextSerie();
                }

                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'rule',
                        action: 'update',
                        migrate: true,
                        query: {
                            _id: ruleSet._id
                        },
                        data: {
                            $set: {rules: [...ruleSet.rules, ...duplicate]}
                        }
                    } )
                );

                if( err ) {
                    Y.log( `addProcessToCardioRules: Error updating ruleSet: ${err.message || err}`, "error", NAME );
                }
                nextSerie();
            }, ( err ) => {
                if( err ) {
                    Y.log( `addProcessToCardioRules: Error processing ruleSets: ${err.message || err}`, "error", NAME );
                    return callback( err );
                }
            } );

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'rule',
                    action: 'update',
                    migrate: true,
                    query: {
                        caseFolderType: Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
                        $or: [
                            {'rules.validations.criteria.actType.\\\\$eq': 'PROCESS'},
                            {'rules.validations.criteria.actType': 'PROCESS'},
                            {'rules.validations.\\\\$and.criteria.actType.\\\\$eq': 'PROCESS'},
                            {'rules.validations.\\\\$and.criteria.actType': 'PROCESS'},
                            {'rules.validations.\\\\$or.criteria.actType.\\\\$eq': 'PROCESS'},
                            {'rules.validations.\\\\$or.criteria.actType': 'PROCESS'}
                        ],
                        metaActTypes: {$nin: ['PROCESS']}
                    },
                    data: {
                        $push: {metaActTypes: 'PROCESS'}
                    },
                    options: {multi: true}
                } )
            );

            if( err ) {
                Y.log( `addProcessToCardioRules: Error updating metaActTypes in ruleSet: ${err.message || err}`, "error", NAME );
            }

            Y.log( `addProcessToCardioRules: Successfully completed for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function updateLicensedPartners( user, callback ) {
            let
                err,
                result; // eslint-disable-line no-unused-vars

            Y.log( `updateLicensedPartners: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'update',
                    migrate: true,
                    query: {
                        status: 'LICENSED',
                        $or: [
                            {systemType: 'DQS'},
                            {systemType: 'DOQUVIDE'}
                        ]

                    },
                    data: {
                        $set: {systemType: 'DSCK'}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `updateLicensedPartners: Error updating partners: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `updateLicensedPartners: Successfully completed for tenant: ${user.tenantId} with result: ${JSON.stringify( result )}`, "info", NAME );
            callback( null, result );
        }

        async function cleanCalendarResources( user, callback ) {
            let
                err, result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'calendar',
                    action: 'update',
                    migrate: true,
                    query: {},
                    data: {
                        $set: {resources: []}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `cleanCalendarResources: Error clean up resources in calendars: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `cleanCalendarResources: Successfully completed for tenant: ${user.tenantId} with result: ${JSON.stringify( result )}`, "info", NAME );
            callback( null, result );
        }

        async function migrateActivityGtinVat( user, callback ) {
            let err,
                results,
                item;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migrateActivityGtinVat_4_13: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all activities of type Medication if on Swiss System
            // And check there reference in medicationscatalogs
            // Get the GTIN, vatType, vat if does not exist, set hasVat to true if vat

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    $and: [
                        {actType: "MEDICATION"},
                        {
                            $or: [
                                {
                                    phGTIN: {$exists: false}
                                },
                                {
                                    vat: {$nin: [1001, 1002, 1003]}
                                }
                            ]
                        }
                    ]
                },
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateActivityGtinVat_4_13: Could not get activities. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !results.length ) {
                return callback();
            }

            const arrayOfPhPZN = [];
            results.forEach( result => {
                if( !arrayOfPhPZN.find( phPZN => phPZN === result.phPZN ) ) {
                    arrayOfPhPZN.push( result.phPZN );
                }
            } );

            for( const phPZN of arrayOfPhPZN ) {
                let phGTIN,
                    vat,
                    hasVat;
                [err, item] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'medicationscatalog',
                    action: 'get',
                    query: {
                        phPZN: phPZN
                    }
                } ) );

                if( err ) {
                    Y.log( `migrateActivityGtinVat_4_13: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( item && item[0] ) {
                    if( item[0].phGTIN ) {
                        phGTIN = item[0].phGTIN;
                    }
                    if( item[0].vatType ) {
                        if( item[0].vatType === 1 || item[0].vatType === 2 || item[0].vatType === 3 ) {
                            vat = 1000 + item[0].vatType;
                            hasVat = true;
                        }
                    }

                    const activityIds = results.filter( a => a.phPZN === phPZN ).map( a => a._id );

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'update',
                        migrate: true,
                        query: {
                            _id: {$in: activityIds}
                        },
                        data: {
                            $set: {
                                phGTIN: phGTIN,
                                vat: vat,
                                hasVat: hasVat
                            }
                        },
                        multi: true
                    } ) );

                    if( err ) {
                        Y.log( `migrateBasecontactStatus_4_13: Could not update activity. Error: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

            }
        }
        async function migrateStockLocations( user, callback ) {
            let error, locations, countryMode, locationModel;
            const util = require( 'util' ),
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );
            Y.log( `migrateStockLocations_4_14: migrate storing stocklocations on tenant ${user.tenantId}`, 'info' );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'migrateStockLocations_4_14: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            [error, locationModel] = await formatPromiseResult( getModelProm( user, 'location', true ) );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error while getting 'location' model. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            // 1. Get all locations with stocklocations
            [error, locations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'get',
                migrate: true,
                query: {
                    stockLocations: {$gt: []}
                }
            } ) );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error while getting locations with stocklocations. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !Array.isArray( locations ) || !locations.length ) {
                Y.log( `migrateStockLocations_4_14: No locations with stocklocations. Exiting migration`, 'warn', NAME );
                return callback();
            }

            if( Y.doccirrus.comctl.isObjectId( locations[0].stockLocations[0] ) ) {
                Y.log( `migrateStockLocations_4_14: No need for migration. Exiting migration`, 'warn', NAME );
                return callback();
            }

            const stockLocations = locations.map( loc => loc.stockLocations )
                .reduce( ( result, array ) => result.concat( array ), [] );

            // 2. Post them to stocklocations collections keeping the same id
            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'stocklocation',
                migrate: true,
                data: Y.doccirrus.filters.cleanDbObject( stockLocations )
            } ) );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Failed to save stocklocations to new collection. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            // 3. Update location.stockLocations with ids
            for( let location of locations ) {
                [error] = await formatPromiseResult(
                    locationModel.mongoose.collection.update( {
                        _id: location._id
                    }, {
                        $set: {stockLocations: location.stockLocations.map( sl => new ObjectId( sl._id ) )}
                    } )
                );
            }

            Y.log( `migrateStockLocations_4_14: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        async function migratePhSaleStatusActivitiesCh_4_14( user, callback ) {
            let err,
                actIds,
                activityResults,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusActivitiesCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            [err, activityResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    $and: [
                        {actType: "MEDICATION"},
                        {phPZN: {$exists: true}}
                    ]
                },
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not get activities. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !activityResults.length ) {
                return callback();
            }

            // Filter items: phPZN must contain numbers only
            let validActivities = activityResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: Group objects by phPZN and add ids for each
            let activityItems = validActivities.reduce( ( acc, obj ) => {
                let objExists = acc.find( item => item.phPZN === obj.phPZN );
                if( objExists ) {
                    objExists.ids.push( obj._id );
                } else {
                    acc.push( {ids: [obj._id], phPZN: obj.phPZN} );
                }
                return acc;
            }, [] );

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not get medications from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus from catalog
            for( let item of activityItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                                salesStatus = 'PROVISIONAL';
                                break;
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }
                        item.phSalesStatus = salesStatus;
                    }
                }
            }


            let result;
            // Update
            for( let activity of activityItems ) {
                actIds = activity.ids;
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: activity.ids}
                    },
                    data: {
                        $set: {
                            phSalesStatus: activity.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: { multi: true }
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not update activities. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusActivitiesCh_4_14: Failed to update instock document in ${ actIds }`, "error", NAME );
                } else {
                    processed += result.n;
                }
            }

            Y.log( `migratePhSaleStatusActivitiesCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} activities`, "info", NAME );
            callback();

        }

        async function migratePhSaleStatusInstockCh_4_14( user, callback ) {
            let err,
                instockResults,
                result,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusInstockCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all activities of type Medication if on Swiss System
            // And check there reference in medicationscatalogs

            [err, instockResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'instock',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusInstockCh_4_14: Could not get instocks. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !instockResults.length ) {
                return callback();
            }

            // Filter: phPZN must contain numbers only
            let validInstocks = instockResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: each object to contain ids with same phPZN
            let instockItems = validInstocks.reduce((acc, obj) => {
                let objExists = acc.find(item => item.phPZN === obj.phPZN);
                if(objExists){
                    objExists.ids.push(obj._id);
                } else {
                    acc.push({ids: [obj._id], phPZN: obj.phPZN});
                }
                return acc;
            }, []);

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusInstockCh_4_14: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus to each object
            for( let item of instockItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                                salesStatus = 'PROVISIONAL';
                                break;
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }
                        item.phSalesStatus = salesStatus;
                    }
                }
            }


            // Update
            for(let instockItem of instockItems) {
                let inStockIds = instockItem.ids;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'instock',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: instockItem.ids}
                    },
                    data: {
                        $set: {
                            phSalesStatus: instockItem.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: {multi: true}
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusInstockCh_4_14: Could not update instock document. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusInstockCh_4_14: Failed to update instock document in ${ inStockIds }`, "error", NAME );
                } else {
                    processed += result.n;
                }

            }

            Y.log( `migratePhSaleStatusInstockCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} instock documents`, "info", NAME );
            callback();

        }

        async function migratePhSaleStatusCatalogueUsagesCh_4_14( user, callback ) {
            let err,
                catalogResults,
                result,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusCatalogueUsagesCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all activities of type Medication if on Swiss System
            // And check there reference in medicationscatalogs

            [err, catalogResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'get',
                migrate: true,
                query: {
                    catalogShort: "HCI",
                    phPZN: {$exists: true}
                },
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not get catalogusages. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogResults.length ) {
                return callback();
            }

            // Filter: phPZN must contain numbers only
            let validCatalogItems = catalogResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: each object to contain ids with same phPZN
            let houseCatItems = validCatalogItems.reduce((acc, obj) => {
                let objExists = acc.find(item => item.phPZN === obj.phPZN);
                if(objExists){
                    objExists.ids.push(obj._id);
                } else {
                    acc.push({ids: [obj._id], phPZN: obj.phPZN});
                }
                return acc;
            }, []);

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus to each object
            for( let item of houseCatItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                                salesStatus = 'PROVISIONAL';
                                break;
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }
                        item.phSalesStatus = salesStatus;
                    }
                }
            }

            // Update
            for(let houseCatItem of houseCatItems) {
                let ids = houseCatItem.ids;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalogusage',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: ids }
                    },
                    data: {
                        $set: {
                            phSalesStatus: houseCatItem.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: {multi: true}
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not update Hauskatalog document. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Failed to update Hauskatalog document in ${ ids }`, "error", NAME );
                } else {
                    processed += result.n;
                }

            }

            Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} Hauskatalog documents`, "info", NAME );
            callback();

        }

        async function migrateCatalogTexts_4_15( user, callback ) {
            let err,
                catalogTexts = [],
                catalogUsages = [],
                deleteResult,
                deleted = 0;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migrateCatalogTexts_4_15: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            // Get all items from catalogtexts collection
            // Get all items from catalogUsages
            // If an item from catalogusages is found that matches catalogtext item do nothing
            // If no match found delete the catalogtext

            [err, catalogTexts] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogtext',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        _id: 1,
                        catalogShort: 1,
                        locationId: 1,
                        code: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not get catalogtexts. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogTexts.length ) {
                Y.log( 'migrateCatalogTexts_4_15: No catalogtexts found. Nothing to be migrated.', 'info', NAME );
                return callback();
            }

            let codes = [ ... new Set(...catalogTexts.map(entry => entry.code))];
            let locationIds = [ ... new Set(...catalogTexts.map(entry => entry.locationId))];
            let catalogShorts = [ ... new Set(...catalogTexts.map(entry => entry.catalogShort))];

            [err, catalogUsages] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'get',
                migrate: true,
                query: {
                    seq: {$in: codes},
                    locationId: {$in: locationIds},
                    catalogShort: {$in: catalogShorts}
                },
                options: {
                    select: {
                        catalogShort: 1,
                        locationId: 1,
                        seq: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not get catalogusages. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            // Return array of Ids that have no match
            let toBeDeletedIds = catalogTexts.reduce((acc, obj) => {
                if( !acc.includes( obj._id.toString() ) ) { // prevent duplicates
                    let itemNotFound = !catalogUsages.find( cuItem => cuItem.seq === obj.code && cuItem.locationId === obj.locationId && cuItem.catalogShort === obj.catalogShort );
                    if( itemNotFound ) {
                        acc.push( obj._id.toString() );
                    }
                }
                return acc;
            }, []);

            [err, deleteResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogtext',
                action: 'delete',
                migrate: true,
                query: {_id: {$in: toBeDeletedIds }},
                options: {override: true}
            } ) );

            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not delete catalogtext documents. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !deleteResult ) {
                Y.log( `migrateCatalogTexts_4_15: Failed to delete catalogtext documents with ids: ${ toBeDeletedIds }`, "error", NAME );
            } else {
                deleted += deleteResult.length || 0;
            }

            Y.log( `migrateCatalogTexts_4_15: Successfully executed for tenant: ${user.tenantId} deleted ${deleted} catalogtexts documents`, "info", NAME );
            callback();
        }

        Y.namespace( 'doccirrus.api' ).methodsTest = {
            name: NAME,
            processRules: processRules,
            setRuleMeta: setRuleMeta,
            triggerReportings: triggerReportings,
            migrationTest: migrationTest,
            triggerAUX: triggerAUX,
            updateRulesFor3_5: updateRulesFor3_5,
            docCirrusImportAll: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.docCirrusImportAll', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.docCirrusImportAll' );
                }
                args.callback( null, 'DocCirrus rules import started! ' ); //
                args.callback = ( err ) => {
                    Y.log( 'Direct call of rule import all finished with err: ' + JSON.stringify( err ), 'debug', NAME );
                };
                Y.doccirrus.api.ruleimportexport.docCirrusImportAll( args );
            },
            reRunRuleEngine: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.reRunRuleEngine', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.reRunRuleEngine' );
                }
                args.callback( null, 'DocCirrus rules reEvaluating started! ' ); //
                args.callback = ( err ) => {
                    Y.log( 'Direct call of rule reEvaluate all finished with err: ' + JSON.stringify( err ), 'debug', NAME );
                };
                Y.doccirrus.api.ruleimportexport.reRunRuleEngine( args );
            },
            xmlTest: xmlTest,
            testMigration: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.testMigration', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.testMigration' );
                }
                migrateMeasurementAddMDC_4_0( args.user, args.callback );
            },
            testAggregate: testAggregate,
            testCircular: testCircular,
            mongoOperation: mongoOperation,
            updateBIOTRONICrules: args => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.updateBIOTRONICrules', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.updateBIOTRONICrules' );
                }
                updateBIOTRONICrules( args.user, args.callback );
            },
            minimalCursorCrash: minimalCursorCrash,
            testMongoCursor: testMongoCursor,
            addProcessToCardioRules: args => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.addProcessToCardioRules', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.addProcessToCardioRules' );
                }
                addProcessToCardioRules( args.user, args.callback );
            },
            updateLicensedPartners: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.updateLicensedPartners', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.updateLicensedPartners' );
                }
                updateLicensedPartners( args.user, args.callback );
            },
            cleanCalendarResources: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.cleanCalendarResources', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.cleanCalendarResources' );
                }
                cleanCalendarResources( args.user, args.callback );
            },
            migrateActivityGtinVat: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migrateActivityGtinVat', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migrateActivityGtinVat' );
                }
                migrateActivityGtinVat( args.user, args.callback );
            },
            migratePhSaleStatusActivitiesCh_4_14: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migratePhSaleStatusActivitiesCh_4_14', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migratePhSaleStatusActivitiesCh_4_14' );
                }
                migratePhSaleStatusActivitiesCh_4_14( args.user, args.callback );
            },
            migratePhSaleStatusInstockCh_4_14: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migratePhSaleStatusInstockCh_4_14', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migratePhSaleStatusInstockCh_4_14' );
                }
                migratePhSaleStatusInstockCh_4_14( args.user, args.callback );
            },
            migratePhSaleStatusCatalogueUsagesCh_4_14: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migratePhSaleStatusInstockCh_4_14', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migratePhSaleStatusCatalogueUsagesCh_4_14' );
                }
                migratePhSaleStatusCatalogueUsagesCh_4_14( args.user, args.callback );
            },
            migrateStockLocations: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migrateStockLocations', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migrateStockLocations' );
                }
                migrateStockLocations( args.user, args.callback );
            },
            testCardRead: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.testCardRead', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.testCardRead' );
                }
                Y.doccirrus.api.crlog.server.storeCardReadJSON( {
                    rawCardData: {
                        "stateID": "CH",
                        "insurerName": "Sanitas",
                        "insurerID": "01509",
                        "vekaCardNo": "80756015090037316824",
                        "firstName": "Michael",
                        "lastName": "HEILIG",
                        "expiryDate": {
                            "inputDate": "30.06.2025",
                            "_valid": true,
                            "_validator": {
                                "dateArray": [
                                    "30",
                                    "06",
                                    "2025"
                                ],
                                "dd": "30",
                                "mm": "06",
                                "yyyy": "2025",
                                "_valid": true,
                                "_diffYears": 1881
                            }
                        },
                        "countryMode": [
                            "CH"
                        ]
                    },
                    user: args.user,
                    deviceName: 'test'
                } );
            },
            migrateCatalogTexts_4_15: ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.migrateCatalogTexts_4_15', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.migrateCatalogTexts_4_15' );
                }
                migrateCatalogTexts_4_15( args.user, args.callback );
            },
            clearRuleLocations: async ( args ) => {
                Y.log( 'Entering Y.doccirrus.api.methodsTest.clearRuleLocations', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ).wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.methodsTest.clearRuleLocations' );
                }

                const {user, callback} = args;
                let [err, ruleSets] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'rule',
                    action: 'get',
                    query: {isDirectory: false, "rules.actions.template.locations": {$exists: true, $not: {$size: 0}}},
                    options: { select: { rules: 1 } }
                } ) );

                if( err ){
                    Y.log( `clearRuleLocations: Error getting rules: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                let changedRules = 0;

                for(let ruleSet of ruleSets ){
                    if( !ruleSet.rules || !ruleSet.rules.length ){
                        continue;
                    }
                    ruleSet.rules = ruleSet.rules.map( rule => { //eslint-disable-line no-loop-func
                        if( rule.actions && rule.actions.length ){
                            rule.actions = rule.actions.map( action => {
                                if( action.template && action.template.locations && action.template.locations.length ){
                                    action.template.locations = [];
                                    changedRules++;
                                }
                                return action;
                            } );
                        }
                        return rule;
                    } );

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'rule',
                        action: 'update',
                        query: {_id: ruleSet._id},
                        data: {$set: {rules: ruleSet.rules}}
                    } ) );

                    if( err ){
                        Y.log( `clearRuleLocations: Error updating rule ${ruleSet} : ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                }

                Y.log( `clearRuleLocations: Was updated ${changedRules} rules in ${ruleSets.length} ruleSets`, "info", NAME );
                callback( null, {updatedRules: changedRules, updatedRuleSets: ruleSets.length} );
            }
        };

    },
    '0.0.1', {requires: []}
);
