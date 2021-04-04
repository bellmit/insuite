/**
 * User: pi
 * Date: 19/12/2016  09:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'labtest-api', function( Y, NAME ) {
        const
            {formatPromiseResult} = require( 'dc-core' ).utils; //jshint ignore:line

        /**
         * @module labtest-api
         */

        /**
         * default post method
         * @method post
         * @param {Object} args
         */
        function post( args ) {
            let
                { user, data = {}, callback, options = {} } = args;
            data = Y.doccirrus.filters.cleanDbObject( data );
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'labtest',
                user,
                data,
                options
            }, callback );
        }

        /**
         * default get method
         * @method get
         * @param {Object} args
         */
        function get( args ) {
            let
                { user, query = {}, callback, options = {}, migrate = false, data = {} } = args,
                async = require( 'async' );

            if( data && data.overrideOptions ) {
                if( args.originalParams && args.originalParams.options ) {
                    options = args.originalParams.options;
                }
            }

            async.waterfall( [
                function( next ) {
                    generateTestsIfEmpty( {
                        user,
                        migrate,
                        callback( err ){
                            next( err );
                        }
                    } );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'labtest',
                        user,
                        options,
                        migrate,
                        query
                    }, next );
                },
                function( labTests, next ) {
                    let
                        uniqueHead = {},
                        finalResult = [];

                    if( labTests && Array.isArray(labTests) && labTests.length ) {
                        finalResult = labTests.filter( (labtest) => {
                            if( labtest.head && !uniqueHead[labtest.head] ) {
                                uniqueHead[labtest.head] = true;
                                return true;
                            }
                        } );
                    }
                    next( null, finalResult );
                }
            ], callback );

        }

        /**
         * helper to post only unique documents.
         * For DOCUMENT type unique is:
         *  title, type
         * For CATALOG type unique is:
         *  title, type, catalogShort
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Array} args.data.labTests
         * @param {Boolean} [args.migrate=false]
         * @param {Function} args.callback
         */
        function postUnique( args ) {
            let
                { user, data:{ labTests, isUserGenerated } = {}, migrate = false, callback } = args,
                tagModel,
                async = require( 'async' );

            if( labTests && Array.isArray(labTests) && labTests.length) {
                //Filter labTests which does not have head key
                labTests = labTests.filter((test) => {
                    if( test.head ) {
                        return true;
                    }
                });
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'tag', migrate, next );
                },
                function( tagsModel, next ) {
                    tagModel = tagsModel;
                    Y.doccirrus.mongodb.getModel( user, 'labtest', migrate, next );
                },
                function( labTestModel, next ) {
                    async.eachSeries( labTests, ( labTest, done ) => {
                        try {
                            labTest = JSON.parse( JSON.stringify( labTest ) );
                        } catch( e ) {
                            Y.log(`postUnique: Error while parsing labTest. Error: ${e}`, "error", NAME);
                            return done(e);
                        }

                        if( isUserGenerated ) {
                            labTest.userGenerated = true;
                        } else {
                            labTest.userGenerated = false;
                        }

                        let
                            labTestData = new labTestModel.mongoose( labTest ).toObject(),
                            query = { head: labTest.head};

                        if( isUserGenerated ) {
                            query.userGenerated = true;
                        } else {
                            query.userGenerated = false;
                        }

                        labTestModel.mongoose.collection.findAndModify( query, null, {
                            $setOnInsert: labTestData
                        }, {
                            upsert: true
                        }, done );
                    }, next );
                },
                function( next ) {
                    if(isUserGenerated) {
                        //Post or Update corresponding tag
                        async.eachSeries( labTests, ( labTest, done ) => {
                            try {
                                labTest = JSON.parse( JSON.stringify( labTest ) );
                            } catch( e ) {
                                Y.log(`postUnique: Error while parsing labTest. Error: ${e}`, "error", NAME);
                                return done(e);
                            }

                            let
                                _query = {
                                    title: labTest.head,
                                    type: Y.doccirrus.schemas.tag.tagTypes.LABDATA
                                },
                                _data = {
                                    title: labTest.head,
                                    type: Y.doccirrus.schemas.tag.tagTypes.LABDATA
                                },
                                tagData;

                            if( typeof labTest.testLabel === "string" ) {
                                _data.testLabel = labTest.testLabel;
                            }

                            if( typeof labTest.TestResultUnit === "string" ) {
                                _data.unit = labTest.TestResultUnit;
                            }

                            if( labTest.sampleNormalValueText && Array.isArray(labTest.sampleNormalValueText) ) {
                                _data.sampleNormalValueText = labTest.sampleNormalValueText;
                            } else {
                                _data.sampleNormalValueText = [];
                            }

                            tagData = new tagModel.mongoose( _data ).toObject();

                            tagModel.mongoose.collection.findAndModify( _query, null, {
                                $setOnInsert: tagData
                            }, {
                                upsert: true
                            }, done );
                        }, next );
                    } else {
                        next();
                    }
                }
            ], callback );
        }

        /**
         * Helper.
         * Checks if tag is used in another documents. If not, will remove it.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.head
         * @param {String} args.data.documentId
         * @param {Function} args.callback
         */
        function deleteIfNotUsed( args ) {
            let
                { user, data:{ head, documentId,isUserGenerated } = {}, callback } = args, //jshint ignore:line
                async = require( 'async' ),
                options = {
                    limit: 1,
                    lean: true,
                    select: {
                        _id: 1
                    }
                };
            Y.log( `deleteIfNotUsed. Check whether labTest: ${head} should be removed or not`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    let
                        query = {
                            actType: 'LABDATA',
                            _id: { $ne: documentId },
                            'l_extra.testId.head': head,
                            "l_extra.0": { "$exists": false }
                        };

                    if( isUserGenerated ) {
                        query.labText = { $exists: false };
                    } else {
                        query.labText = { $exists: true };
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: query,
                        options
                    }, next );
                },
                /* jshint ignore:start */
                async function( records, next ) {
                    if( !records.length ) {
                        Y.log( `deleteIfNotUsed. labTest: ${head} is not used anymore. It will be deleted. isUserGenerated: ${isUserGenerated}`, 'debug', NAME );

                        let
                            err,
                            labTestQuery = { head: head };

                        if( isUserGenerated ) {
                            labTestQuery.userGenerated = true;
                        } else {
                            labTestQuery.userGenerated = false;
                        }

                        // 1. Delete labtest with query head
                        [err] = await formatPromiseResult(
                                                new Promise((resolve, reject) => {
                                                    Y.doccirrus.api.labtest.delete( {
                                                        user,
                                                        query: labTestQuery,
                                                        callback(cberr, cbres) {
                                                            if(cberr) {
                                                                reject( cberr );
                                                            } else {
                                                                resolve( cbres );
                                                            }
                                                        }
                                                    } );
                                                })
                                              );

                        if( err ) {
                            return next(err);
                        }

                        if( !isUserGenerated ) {
                            //means this lablog was imported. In this case no need to manipulate 'tags' collection
                            return next();
                        }

                        // 2. Delete corresponding tag in tags collection
                        Y.log( `deleteIfNotUsed. Tag: ${head} is not used anymore. Tag will be deleted.`, 'debug', NAME );
                        Y.doccirrus.api.tag.delete( {
                            user,
                            query: {
                                title: head,
                                type: Y.doccirrus.schemas.tag.tagTypes.LABDATA
                            },
                            callback: next
                        } );
                    } else {
                        Y.log( `deleteIfNotUsed. LabTest: ${head} is used by another LABDATA. It will not be deleted. isUserGenerated: ${isUserGenerated}`, 'debug', NAME );
                        setImmediate( next );
                    }
                }
                /* jshint ignore:end */
            ], callback );
        }

        /**
         * Updates distinct set of tags.
         * @method updateLabTests
         * @param {Object} args
         * @param {Object} args.user
         * @param {Boolean} [args.migrate=false]
         * @param {Object} args.data
         * @param {Array} [args.data.oldLabTests=[]] used to find new and deleted tags. oldTag - currentLabTests = deleted tags
         * @param {Array} [args.data.currentLabTests=[]] used to find new and deleted tags. currentLabTests - oldTag = new tags
         * @param {String} args.data.type type of tag (e.g. CATALOG, DOCUMENT). See schemas.tag.tagTypes
         * @param {String} args.data.documentId id of document which tags were updated (used to delete unused tags)
         * @param {String} args.data.catalogShort required for CATALOG type
         * @param {Function} args.callback
         */
        function updateLabTests( args ) {
            let
                { user, data:{ oldLabTests = [], currentLabTests = [], documentId, isUserGenerated } = {}, migrate, callback } = args,
                newLabTests = [],
                deletedLabTests = [],
                async = require( 'async' );

            if( !currentLabTests.length ) {
                deletedLabTests = oldLabTests;
            } else if( !oldLabTests.length ) {
                newLabTests = currentLabTests;
            } else {
                deletedLabTests = oldLabTests.filter( oldLabTest => currentLabTests.every( item => item.head !== oldLabTest.head ) );
                newLabTests = currentLabTests.filter( currentLabTest => oldLabTests.some( item => item.head !== currentLabTest.head ) );
            }
            if( !deletedLabTests.length && !newLabTests.length ) {
                return callback();
            }
            async.parallel( [
                function( done ) {
                    if( !deletedLabTests.length ) {
                        return setImmediate( done );
                    }
                    async.eachSeries( deletedLabTests, function( labTest, next ) {
                        deleteIfNotUsed( {
                            user,
                            data: {
                                isUserGenerated,
                                documentId,
                                head: labTest.head
                            },
                            callback: next
                        } );
                    }, done );
                },
                function( done ) {
                    if( !newLabTests.length ) {
                        return setImmediate( done );
                    }
                    postUnique( {
                        user,
                        data: {
                            isUserGenerated,
                            labTests: newLabTests
                        },
                        migrate,
                        callback: done
                    } );
                }
            ], callback );
        }

        /**
         * default delete method
         * @method delete
         * @param {Object} args
         */
        function deleteLabTest( args ) {
            var
                { user, query, callback, options = {} } = args;

            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'labtest',
                user,
                query,
                options
            }, callback );
        }

        function generateTestsIfEmpty( args ) {
            let
                { user, callback, migrate = false } = args,
                async = require( 'async' );

            function generate( isUserGenerated, callback ) {
                let
                    moment = require( 'moment' );
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activity', migrate, next );
                    },
                    function( model, next ) {
                        model.mongoose.aggregate( [
                            {
                                $match: {
                                    actType: 'LABDATA',
                                    timestamp: {
                                        $gt: new Date( moment().subtract( 1, 'year' ).toISOString() )
                                    },
                                    labText: isUserGenerated ? {$exists: false} : {$exists: true},
                                    "l_extra.0": { "$exists": false }
                                }
                            },
                            { $project: { testId: '$l_extra.testId' } },
                            { $unwind: '$testId' },
                            {
                                $group: {
                                    _id: '$testId.head',
                                    head: { $last: '$testId.head' },
                                    testLabel: { $last: '$testId.testLabel' },
                                    gnr: { $last: '$testId.gnr' },
                                    sampleId: { $last: '$testId.sampleId' },
                                    TestResultUnit: { $last: '$testId.TestResultUnit' },
                                    sampleTestNotes: { $last: '$testId.sampleTestNotes' },
                                    sampleNormalValueText: { $last: '$testId.sampleNormalValueText' },
                                    testResultVal: { $last: '$testId.testResultVal' },
                                    sampleResultText: { $last: '$testId.sampleResultText' }
                                }
                            }
                        ], next );
                    },
                    function( results, next ) {
                        let
                            labTests = results.map( item => {
                                Object.keys( item ).forEach( prop => {
                                    if( null === item[ prop ] ) {
                                        delete item[ prop ];
                                    }
                                } );
                                return item;
                            } );
                        Y.doccirrus.api.labtest.postUnique( {
                            user,
                            migrate,
                            data: { labTests, isUserGenerated },
                            callback: next
                        } );
                    }
                ], callback );

            }

            /**
             * 1. check if labTest collection is empty
             * if empty then step 2. If not - skip rest of the steps
             * 2. if empty check activity collection for LABDATA
             * if not empty then generate labTest entries, if empty - call callback
             */
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        migrate,
                        model: 'labtest',
                        action: 'count',
                        query: {
                            head: { $exists: true }
                        }
                    }, next );
                },
                function( count, next ) {
                    if( count ) {
                        return setImmediate( next, null, false );
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        migrate,
                        model: 'activity',
                        action: 'count',
                        query: {
                            actType: 'LABDATA'
                        }
                    }, next );
                },
                function( count, next ) {
                    if( !count ) {
                        return setImmediate( next );
                    }

                    generate(true, (aggErr) => {
                        if( aggErr ) {
                           return next(aggErr);
                        }
                        generate( false, next );
                    } );
                }
            ], callback );

        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class labtest
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).labtest = {

            name: NAME,
            post( args ) {
                Y.log('Entering Y.doccirrus.api.labtest.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.post');
                }
                post( args );
            },
            postUnique( args ){
                Y.log('Entering Y.doccirrus.api.labtest.postUnique', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.postUnique');
                }
                postUnique( args );
            },
            get( args ){
            Y.log('Entering Y.doccirrus.api.labtest.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.get');
                }
                get( args );
            },
            ['delete']( args ){
            Y.log('Entering Y.doccirrus.api.labtest.undefined', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.undefined');
                }
                deleteLabTest( args );
            },
            updateLabTests( args ){
            Y.log('Entering Y.doccirrus.api.labtest.updateLabTests', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.updateLabTests');
                }
                updateLabTests( args );
            },
            generateTestsIfEmpty( args ){
            Y.log('Entering Y.doccirrus.api.labtest.generateTestsIfEmpty', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.labtest.generateTestsIfEmpty');
                }
                generateTestsIfEmpty( args );
            }

        };

    },
    '0.0.1', { requires: [ 'labtest-schema' ] }
);
