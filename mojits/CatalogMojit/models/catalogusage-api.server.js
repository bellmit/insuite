/**
 * User: pi
 * Date: 03/09/2014  15:13
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'catalogusage-api', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCCatalog
         */

        var
            queue = [];
        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        /**
         * Returns object which can be used to catch catalogusage entry for specified activity.
         * @param {Object} activityData
         * @param {String} activityData.actType
         * @param {String} activityData.code
         * @param {String} activityData.catalogShort
         * @param {String} activityData.locationId
         * @returns {Object}
         */
        function getSeqId( activityData ) {
            return {
                seqId: {
                    actType: activityData.actType,
                    seq: activityData.code
                },
                catalogShort: activityData.catalogShort,
                locationId: activityData.locationId && activityData.locationId.toString()
            };
        }

        /**
         * Returns object which should be used to query catalogusage entry for specified activity.
         * @method getQueryForActivity
         * @param {Object} activityData
         * @param {String} activityData.code
         * @param {String} activityData.catalogShort
         * @param {String} activityData.locationId
         * @returns {Object}
         */
        function getQueryForActivity( activityData ) {
            return {
                seq: activityData.code,
                catalogShort: activityData.catalogShort,
                locationId: activityData.locationId.toString()
            };
        }

        /**
         * Returns queue object for specified index
         *  if does not exist, creates one
         * @param {Object} index
         * @param {String} index.locationId
         * @param {String} index.catalogShort
         * @param {Object} index.seqId
         * @param {String} index.seqId.actType
         * @param {String} index.seqId.seq
         * @returns {Object}
         */
        function getQueueFor( index ) {
            var queueObj;
            if( !queue.some( function( data ) {
                    var _index = data.index,
                        result;
                    result = index.catalogShort === _index.catalogShort &&
                             index.locationId.toString() === _index.locationId.toString() &&
                             index.seqId.actType === _index.seqId.actType &&
                             index.seqId.seq === _index.seqId.seq;
                    if( result ) {
                        queueObj = data;
                    }
                    return result;
                } ) ) {
                queueObj = {
                    index: index,
                    lock: false,
                    queue: []
                };
                queue.push( queueObj );
            }
            return queueObj;

        }

        /**
         * Removes queue object
         * @param {Object} queueObj object which should be removed(should be ref to real object)
         */
        function removeQueue( queueObj ) {
            if( !queueObj.lock && !queueObj.queue.length ) {
                queue.splice( queue.indexOf( queueObj ), 1 );
            }
        }

        /**
         * Helper function which can creates queue
         * @param {Object} args
         * @see _calculateUsageIndexSeq
         */
        function calculateUsageIndexSeq( args ) {
            let
                data = args.data,
                user = args.user,
                activity = (args.data && args.data.activity) || {},
                callback = args.callback,
                nextData,
                queueObj;
            queueObj = getQueueFor( getSeqId( activity ) );
            if( !queueObj.lock ) {
                queueObj.lock = true;
                _calculateUsageIndexSeq( {
                    user: user,
                    data: data,
                    callback: function( ...rest ) {
                        callback( ...rest ); // eslint-disable-line callback-return
                        queueObj.lock = false;

                        nextData = queueObj.queue.shift();
                        if( nextData ) {
                            calculateUsageIndexSeq( nextData );
                        } else {
                            removeQueue( queueObj );
                        }
                    }
                } );
            } else {
                queueObj.queue.push( args );
            }
        }

        /**
         * Aggregates specific record ('seq' and 'actType') in 'activities' collection
         * and updates only this record in 'catalogusage' collection.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.activity activity data
         * @param {Function} args.callback
         */
        function _calculateUsageIndexSeq( args ) {
            var async = require( 'async' ),
                { data = {}, user, callback } = args,
                activity = data.activity || {},
                seqIdentity = getQueryForActivity( activity ),

                /**
                 * Array of fields which come to catalogUsage entry from Catalog entry.
                 * They can have DIFFERENT "name", that is why they should be mapped.
                 * This array is used:
                 *  1. during catalogUsage update - to catch all "catalog based" fields.
                 *  2. during creation of catalogUsage entry to catch data from Catalog entry.
                 */
                fieldsFromCatalog = [
                    {
                        catalog: 'title',
                        activity: 'content'
                    },
                    {
                        catalog: 'infos',
                        activity: 'comment'
                    },
                    {
                        catalog: 'u_extra',
                        activity: 'u_extra'
                    },
                    {
                        catalog: 'unit',
                        activity: 'actualUnit'
                    },
                    {
                        catalog: 'value',
                        activity: 'actualPrice'
                    },
                    {
                        catalog: 'bezeichnung',
                        activity: 'assDescription'
                    },
                    {
                        catalog: 'hersteller',
                        activity: 'assManufacturer'
                    },
                    {
                        catalog: 'merkmale',
                        activity: 'assCharacteristics'
                    },
                    {
                        catalog: 'aufnahmedatum',
                        activity: 'assDateAdded'
                    },
                    {
                        catalog: 'aenderungsdatum',
                        activity: 'assDateChanged'
                    },
                    {
                        catalog: 'seq',
                        activity: 'assId'
                    }

                ],
                /**
                 * Array of fields which come to catalogUsage entry from Activity entry.
                 * They can have SAME "name". There is no need to map names.
                 * This array is used:
                 *  1. during catalogUsage update - to catch all "activity based" fields.
                 */
                fieldsFromActivity = [
                    'chapter',
                    'locationId',
                    'assDose',
                    'assPrescPeriod',
                    'billingFactorType',
                    "phPZN",
                    "phCompany",
                    "phForm",
                    "phFormCode",
                    "phPackSize",
                    "phPriceSale",
                    "phRefundAmount",
                    "phPatPay",
                    "phPatPayHint",
                    "phCheaperPkg",
                    "phFixedPay",
                    "phIngr",
                    "phAtc",
                    "phOnly",
                    "phTer",
                    "phTrans",
                    "phImport",
                    "phNegative",
                    "phLifeStyle",
                    "phAMR",
                    "phGBA",
                    "phDisAgr",
                    "phDisAgrAlt",
                    "phMed",
                    "phPrescMed",
                    "phRecipeOnly",
                    "phBTM",
                    "phContraceptive",
                    "phNLabel",
                    "phLifeStyleCond",
                    "phOTC",
                    "phOTX",
                    "phARV",
                    "phDosisMorning",
                    "phDosisAfternoon",
                    "phDosisEvening",
                    "phDosisNight",
                    "phDosisType",
                    "phUnit",
                    "phNote",
                    "phReason",
                    "phSelfMedication",
                    "phHeader",
                    "dosis",
                    "vat",
                    "hasVat",
                    'billingFactorValue',
                    'explanations',
                    'costType',
                    'areTreatmentDiagnosesBillable',
                    'insuranceCode',
                    'paidByInsurance',
                    'supplyCategory',
                    'insuranceDescription',
                    'phGTIN',
                    'prdNo'

                ],
                defaultEBM = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );

            function generateCatalogUsageByActivity( params ) {
                let
                    { activity } = params,
                    catalogUsageData = Object.assign( {}, activity );
                catalogUsageData.seqId = getSeqId( activity ).seqId;
                catalogUsageData.seq = activity.code;
                catalogUsageData.count = 1;
                catalogUsageData.title = activity.content;
                catalogUsageData.infos = activity.comment;
                catalogUsageData.unit = activity.actualUnit;
                catalogUsageData.value = activity.actualPrice;
                return catalogUsageData;
            }

            /**
             * @param {Array} fieldsToReset - array of fields that are to be reset to default schema values
             * @param {Object} objToUpdate - The object that is updated
             * @param {Object} defaultHomeCatObject - Default object retrieved from the Model which contains default values from schema
             * @returns {Object}
             * @private
             */
            function _resetToDefaultValues(fieldsToReset, objToUpdate, defaultHomeCatObject) {
                fieldsToReset.forEach( field => {
                    if(objToUpdate.hasOwnProperty(field) && defaultHomeCatObject.hasOwnProperty(field)) {
                        objToUpdate[field] = defaultHomeCatObject[field] ;
                    }
                });
                return objToUpdate;
            }

            /**
             * Updates catalogusage entry
             * @param {Object} params
             * @param {Object} params.entry catalogusage entry
             * @param {Object} params.catalogUsageModel mongoose catalogUsage model
             * @param {Function} params.callback
             */
            function updateCatalogUsage( params ) {
                let
                    { catalogUsageModel, callback, entry } = params,
                    updateData = Object.assign( {}, entry );
                delete updateData._id;
                Y.log( '_calculateUsageIndexSeq. Record with such combination exists. => update.', 'info', NAME );

                /**
                 * Data is updated in 2 steps:
                 * 1. go through fieldsFromActivity - fields in this array are activity ONLY fields,
                 *  it means catalog entry DOES NOT any of these fields.
                 *  Copy these fields from activity.
                 * 2. go through fieldsFromCatalog - fields in this array are catalog fields,
                 *  they exist in catalog AND in activity, but may have different "name".
                 *  Copy and map these fields from activity.
                 */
                fieldsFromActivity.forEach( fieldName => {
                    if( undefined !== activity[ fieldName ] ) {
                        updateData[ fieldName ] = activity[ fieldName ];
                    }
                } );
                if( !activity.catalog ) {
                    fieldsFromCatalog.forEach( fieldDesc => {
                        if( undefined !== activity[ fieldDesc.activity ] ) {
                            updateData[ fieldDesc.catalog ] = activity[ fieldDesc.activity ];
                        }
                    } );
                }
                // MOJ-3396
                if( 'GebüH' === activity.catalogShort ) {
                    updateData.value = activity.actualPrice;
                    updateData.u_extra = updateData.u_extra || {};
                    updateData.u_extra.pkv1 = activity.actualPrice;
                }
                // MOJ-13527
                if(!activity.catalog) {
                    if( Y.doccirrus.commonutilsCh.getSwissCatalogsShort().includes( activity.catalogShort )) {
                        updateData.value = activity.price;
                        updateData.price = activity.price;
                        updateData.u_extra = updateData.u_extra || {};
                        updateData.u_extra.housecatalogPrice = activity.price;
                    } else {
                        updateData.price = activity.price;
                    }
                }
                async.waterfall( [
                    function( next ) {
                        if( activity.catalog ) {
                            return setImmediate( next, null, true );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'incaseconfiguration',
                            action: 'get',
                            query: {},
                            options: {
                                limit: 1,
                                select: {
                                    customCodeDataPerLocation: 1
                                }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, results[ 0 ] && results[ 0 ].customCodeDataPerLocation );
                        } );
                    },
                    function( codeDataPerLocation, next ) {
                        if( codeDataPerLocation ) {
                            return setImmediate( next, null, [ activity.locationId.toString() ] );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'location',
                            action: 'get',
                            query: {},
                            options: {
                                select: {
                                    _id: 1
                                }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, results.map( item => item._id.toString() ) );
                        } );

                    },
                    function( locationList, next ) {
                        async.eachSeries( locationList, ( locationId, next ) => {
                            const
                                query = getQueryForActivity( {
                                    code: activity.code,
                                    catalogShort: activity.catalogShort,
                                    locationId
                                } );
                            updateData.locationId = locationId;
                            catalogUsageModel.mongoose.findOneAndUpdate( query, updateData, {
                                upsert: true,
                                new: true
                            }, next );
                        }, next );

                    }
                ], callback );

            }

            function postCatalogUsage( params ) {
                let
                    { callback } = params,
                    catalogUsageModel;
                Y.log( '_calculateUsageIndexSeq. There is no record with such combination. => create', 'info', NAME );

                /*
                 * This means that the record with combination of current 'code', 'actType', 'catalogShort' and 'locationId' does not exist.
                 * Aggregate data from 'activity' collection.
                 * If such 'code' exists in appropriate original catalog, replace important(displayed) data with original
                 *
                 */
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, ( err, model ) => {
                            catalogUsageModel = model;
                            next( err );
                        } );
                    },
                    function( next ) {
                        let
                            catalog = activity.catalogRef;
                        if( defaultEBM.filename === catalog && activity.locationId ) {
                            Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                                user: user,
                                originalParams: {
                                    locationId: activity.locationId
                                },
                                callback: function( err, desc ) {
                                    if( err ) {
                                        Y.log( 'Error getting kv from locationId for EBM(851)' );
                                        next( err );
                                        return;
                                    }
                                    catalog = desc.filename;
                                    next( null, catalog );
                                }
                            } );
                        } else {
                            setImmediate( next, null, catalog );
                        }
                    },
                    function( catalog, next ) {
                        const
                            superUser = Y.doccirrus.auth.getSUForLocal();
                        const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                        if( !activity.catalog ) {
                            next( null, null );
                            return;
                        }
                        let catQuery = {
                            'seq': activity.code,
                            'catalog': catalog
                        };

                        // In Swiss dont store catalogEntries, which are no longer valid
                        if(isSwiss) {
                            catQuery.validUntil = null;
                        }

                        Y.doccirrus.mongodb.runDb( {
                            user: superUser,
                            model: 'catalog',
                            action: 'get',
                            query: catQuery,
                            options: {
                                limit: 1,
                                lean: true
                            },
                            callback: function( err, results ) {
                                if( err ) {
                                    return next( err );
                                }
                                next( err, results[ 0 ] );
                            }
                        } );
                    },
                    function( originData, next ) {
                        if( originData ) {
                            return setImmediate( next, null, originData, true );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'incaseconfiguration',
                            action: 'get',
                            query: {},
                            options: {
                                limit: 1,
                                select: {
                                    customCodeDataPerLocation: 1
                                }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, null, results[ 0 ] && results[ 0 ].customCodeDataPerLocation );
                        } );
                    },
                    function( originData, customCodeDataPerLocation, next ) {
                        if( originData || customCodeDataPerLocation ) {
                            return setImmediate( next, null, originData, [ activity.locationId ] );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'location',
                            action: 'get',
                            query: {},
                            options: {
                                select: {
                                    _id: 1
                                }
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            next( null, originData, results.map( item => item._id.toString() ) );
                        } );
                    },
                    async function( originData, locationList, next ) {
                        delete activity._id;
                        const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                            instance = new catalogUsageModel.mongoose(),
                            defaultHomeCatObject = instance.toObject(); // default homeCatObject with default values from schema
                        let fieldsToReset;

                        let
                            catalogUsageData = generateCatalogUsageByActivity( {
                                activity
                            } ),
                            schemaprocess = Y.doccirrus.schemaprocess.catalogusage,
                            preChain = schemaprocess && schemaprocess.pre && schemaprocess.pre.filter( item => 'write' === item.forAction )[ 0 ];

                        if( catalogUsageData ) {
                            if( 'EBM' === activity.catalogShort ) {
                                if( !originData ) {
                                    catalogUsageData.catalog = false;
                                }

                                if( !catalogUsageData.catalog ) {
                                    catalogUsageData.billingFactorValue = 1;
                                    catalogUsageData.unit = 'Euro';
                                    catalogUsageData.value = catalogUsageData.price;
                                }
                            }

                            if( 'GebüH' === activity.catalogShort ) {
                                // MOJ-3396
                                catalogUsageData.u_extra = catalogUsageData.u_extra || {};
                                catalogUsageData.u_extra.pkv1 = catalogUsageData.value;
                            } else if( originData ) {
                                // merge catalogusage data with origin data;
                                fieldsFromCatalog.forEach( fieldDesc => {
                                    if( 'ASSISTIVE' !== activity.actType || ('title' !== fieldDesc.catalog && 'u_extra' !== fieldDesc.catalog) ) {
                                        catalogUsageData[ fieldDesc.catalog ] = originData[ fieldDesc.catalog ]; // catalog fields only
                                    }
                                } );
                            }
                            if( !catalogUsageData.u_extra && catalogUsageData.billingFactorType && catalogUsageData.billingFactorValue ) {
                                catalogUsageData.u_extra = {
                                    rechnungsfaktor: {
                                        [catalogUsageData.billingFactorType]: catalogUsageData.billingFactorValue
                                    }
                                };
                            }

                            if( isSwiss && !activity.modifyHomeCat ) {
                                // We dont want to save userEdits of those fields. We reset to defaults schema values (with which the front end was initalised).
                                // We get these values by creating an object from the Model and replace the values received from the activity with the values of this object.
                                fieldsToReset = [
                                    'explanations',
                                    'dosis',
                                    'phDosisMorning',
                                    'phDosisAfternoon',
                                    'phDosisEvening',
                                    'phDosisNight',
                                    'phDosisType',
                                    'phNote',
                                    'phReason',
                                    'phSampleMed',
                                    'phContinuousMed',
                                    'phSelfMedication',
                                    'billingRole',
                                    'treatmentTypeCh',
                                    'hasVat',
                                    'vat',
                                    'areTreatmentDiagnosesBillable'
                                ];


                                catalogUsageData = _resetToDefaultValues(fieldsToReset, catalogUsageData, defaultHomeCatObject);

                                if( 'TREATMENT' === activity.actType && originData ) {
                                    // Use title from catalog
                                    if( originData.title ) {
                                        catalogUsageData.content = originData.title;
                                        catalogUsageData.userContent = originData.title;
                                        catalogUsageData.title = originData.title;
                                    }

                                    // Use price from catalog
                                     if( catalogUsageData.catalogRef && catalogUsageData.catalogRef.includes('DC-MIGEL-CH') ) {
                                        catalogUsageData.price = originData.taxPoints;
                                        catalogUsageData.taxPoints = originData.taxPoints;
                                    }
                                }
                            }

                            if( preChain ) {
                                async.eachSeries( preChain.run, ( fn, callback ) => {
                                    fn.call( {}, user, catalogUsageData, callback );
                                }, err => next( err, catalogUsageData, locationList ) );
                            } else {
                                setImmediate( next, null, catalogUsageData, locationList );
                            }
                        } else {
                            setImmediate( next, null, null, null );
                        }
                    },
                    function( catalogUsageData, locationList, next ) {
                        let
                            datForPostProcess;
                        if( !catalogUsageData ) {
                            setImmediate( next, null, null );
                        }
                        async.eachSeries( locationList, ( locationId, done ) => {
                            const
                                data = Object.assign( {}, catalogUsageData, { locationId } ),
                                query = getQueryForActivity( {
                                    code: activity.code,
                                    catalogShort: activity.catalogShort,
                                    locationId: data.locationId
                                } );
                            catalogUsageModel.mongoose.findOneAndUpdate(
                                query,
                                {
                                    $setOnInsert: new catalogUsageModel.mongoose( data ).toObject()
                                }, {
                                    upsert: true,
                                    new: true
                                }, ( err, result ) => {
                                    if( result ) {
                                        if( activity.locationId.toString() === result.locationId ) {
                                            datForPostProcess = result;
                                        }
                                    }
                                    done( err );
                                } );
                        }, err => next( err, datForPostProcess ) );
                    },
                    function( datForPostProcess, next ) {
                        let
                            schemaprocess = Y.doccirrus.schemaprocess.catalogusage,
                            postChain;
                        if( !datForPostProcess ) {
                            return setImmediate( next );
                        }
                        postChain = schemaprocess && schemaprocess.post && schemaprocess.post.filter( item => 'write' === item.forAction )[ 0 ];

                        if( postChain ) {
                            async.eachSeries( postChain.run, ( fn, callback ) => {
                                fn.call( {}, user, datForPostProcess, callback );
                            }, err => {
                                if( err ) {
                                    Y.log( `Catalogusage post process error: ${JSON.stringify( err )}`, 'error', NAME );
                                }
                            } );
                        }

                        setImmediate( next ); //we do not wait for post process
                    }
                ], callback );

            }

            Y.log( `_calculateUsageIndexSeq. Going to update or create HK entry for, code:${activity.code}, catalogShot: ${activity.catalogShort}, locationId: ${activity.locationId}`, 'info', NAME );
            async.waterfall( [
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'catalogusage', done );
                },
                function( catalogUsageModel, done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'catalogusage',
                        action: 'get',
                        query: seqIdentity,
                        options: {
                            limit: 1,
                            lean: true
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return done( err );
                        }
                        done( null, catalogUsageModel, results );
                    } );
                },
                function( catalogUsageModel, entries, done ) {
                    if( entries.length ) {
                        /**
                         * This means that the record with combination of current 'code', 'actType', 'catalogShort' and 'locationId' exists.
                         * System will update fields if "modifyHomeCat" was set to true.
                         */
                        if( activity.modifyHomeCat ) {
                            updateCatalogUsage( {
                                entry: entries[ 0 ],
                                catalogUsageModel,
                                callback: done
                            } );
                        } else {
                            Y.log( `_calculateUsageIndexSeq. Record with such combination exists, but "activity.modifyHomeCat" is set to ${activity.modifyHomeCat}. => skip update.`, 'info', NAME );
                            setImmediate( done );
                        }

                    } else {
                        postCatalogUsage( {
                            callback: done
                        } );
                    }
                }
            ], callback );
        }

        /**
         * removes all entries with specified catalog short name from 'catalogusage' collection
         * @param {Object}          args
         */
        function removeAllByShortName( args ) {
            var queryParams = args.query;
            Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'delete',
                    model: 'catalogusage',
                    query: { catalogShort: queryParams.catalogShort },
                    options: { override: true }
                }, args.callback
            );
        }

        /**
         * Returns top of used codes for specific catalog short name and location id
         * @method getTopByShortName
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.catalogShort short name of catalog
         * @param {String} args.query.locationId location id
         * @param {Array} [args.query.tags] tags
         * @param {Function} args.callback
         * @for doccirrus.api.catalogusage
         */
        async function getTopByShortName( args ) {
            const queryParams = args.query || {},
                {tags, locationId} = queryParams,
                query = {
                    locationId
                };

            if( queryParams.catalogShort ) {
                query.catalogShort = queryParams.catalogShort;
            }
            if( tags ) {
                query.tags = { $in: tags };
            }
            Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'get',
                    model: 'catalogusage',
                    query: query,
                    options: { sort: { count: -1 }, limit: 20 }
                }, args.callback
            );
        }

        /**
         * Returns all tags for specified catalog short name
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.catalogShort short name of catalog, e.g. EBM, GOÄ.
         * @param {Function} args.callback
         */
        function getTags( args ) {
            var queryParams = args.query || {},
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( args.user, 'catalogusage', true, next );
                },
                function( catalogusageModel, next ) {
                    var query = {};
                    if( queryParams.catalogShort ) {
                        query.catalogShort = queryParams.catalogShort;
                    }
                    if( queryParams.term ) {
                        query.tags = new RegExp( '^' + queryParams.term );
                    }
                    catalogusageModel.mongoose.aggregate( [
                        { $match: query },
                        {
                            $project: {
                                tags: 1,
                                catalogShort: 1
                            }
                        },
                        { $unwind: "$tags" },
                        {
                            $group: {
                                _id: null,
                                tags: { $addToSet: "$tags" }
                            }
                        }
                    ], next );
                }
            ], function( err, results ) {
                var tagList = [];
                if( err ) {
                    return args.callback( err );
                }
                if( results && results[ 0 ] ) {
                    tagList = results[ 0 ].tags;
                }
                args.callback( err, tagList );
            } );
        }

        function addCodeBatch( args ) {
            let
                { data = {}, user, callback } = args,
                async = require( 'async' ),
                superUser = Y.doccirrus.auth.getSUForLocal(),
                mmiEntry = data.mmiEntry,
                defaultEBM = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );

            function addCode( code, locationId, done ) {
                async.waterfall( [
                    function( next ) {
                        let
                            catalog = code.filename;
                        if( defaultEBM.filename === catalog && locationId ) {
                            Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                                user: user,
                                originalParams: {
                                    locationId: locationId
                                },
                                callback: function( err, desc ) {
                                    if( err ) {
                                        Y.log( 'Error getting kv from locationId for EBM(851)' );
                                        next( err );
                                        return;
                                    }
                                    catalog = desc.filename;
                                    next( null, catalog );
                                }
                            } );
                            return;
                        }
                        setImmediate( next, null, catalog );
                    },
                    function( catalog, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: superUser,
                            action: 'get',
                            model: 'catalog',
                            query: {
                                seq: code.seq,
                                catalog: catalog
                            },
                            options: {
                                limit: 1,
                                lean: true
                            }
                        }, next );
                    },
                    function( catalogEntries, next ) {
                        let
                            entry = catalogEntries && catalogEntries[ 0 ],
                            catalogData = entry && Y.doccirrus.api.catalog.getCatalogDescriptorForName( entry.catalog );
                        if( !entry ) {
                            return setImmediate( next );
                        }
                        entry.count = 0;
                        delete entry._id;
                        entry.catalogRef = entry.catalog;
                        entry.locationId = locationId;
                        if( data.tags && data.tags.length ) {
                            entry.tags = data.tags;
                        }
                        if( entry.u_extra && entry.u_extra.rechnungsfaktor && entry.u_extra.rechnungsfaktor.privatversicherte ) {
                            entry.billingFactorValue = entry.u_extra.rechnungsfaktor.privatversicherte;
                        }
                        if( catalogData ) {
                            entry.catalogShort = (-1 !== catalogData.short.indexOf( 'EBM' )) ? 'EBM' : catalogData.short;
                            if( !entry.billingFactorValue && 'GOÄ' === entry.catalogShort ) {
                                entry.billingFactorValue = 1;
                            }
                            entry.seqId = getSeqId( {
                                actType: catalogData.actType,
                                code: entry.seq,
                                locationId: entry.locationId,
                                catalogShort: entry.catalogShort
                            } ).seqId;
                        }
                        Y.doccirrus.filters.cleanDbObject( entry );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'upsert',
                            query: {
                                seq: entry.seq,
                                locationId: entry.locationId,
                                catalogShort: entry.catalogShort
                            },
                            model: 'catalogusage',
                            data: entry,
                            options: {
                                omitQueryId: true
                            }
                        }, next );
                    }
                ], done );
            }

            function addCodesToLocation( locationId, done ) {
                async.eachSeries( data.codes || [], function( code, _done ) {
                    addCode( code, locationId, _done );
                }, done );
            }

            function addMMIEntryToLocation( locationId, done ) {
                let
                    entry = {
                        code: '',
                        title: mmiEntry.product.originalData.title,
                        phTer: mmiEntry.product.originalData.phTer,
                        phTrans: mmiEntry.product.originalData.phTrans,
                        phImport: mmiEntry.product.originalData.phImport,
                        phNegative: mmiEntry.product.originalData.phNegative,
                        phLifeStyle: mmiEntry.product.originalData.phLifeStyle,
                        phLifeStyleCond: mmiEntry.product.originalData.phLifeStyleCond,
                        phGBA: mmiEntry.product.originalData.phGBA,
                        phGBATherapyHintName: mmiEntry.product.originalData.phGBATherapyHintName,
                        phDisAgr: mmiEntry.product.originalData.phDisAgr,
                        phDisAgrAlt: mmiEntry.product.originalData.phDisAgrAlt,
                        phMed: mmiEntry.product.originalData.phMed,
                        phPrescMed: mmiEntry.product.originalData.phPrescMed,
                        phCompany: mmiEntry.product.originalData.phCompany,
                        phOnly: mmiEntry.product.originalData.phOnly,
                        phRecipeOnly: mmiEntry.product.originalData.phRecipeOnly,
                        phBTM: mmiEntry.product.originalData.phBTM,
                        phContraceptive: mmiEntry.product.originalData.phContraceptive,
                        phOTC: mmiEntry.product.originalData.phOTC,
                        phOTX: mmiEntry.product.originalData.phOTX,
                        phAMR: mmiEntry.product.originalData.phAMR,
                        phAMRContent: mmiEntry.product.AMRInfo,
                        phAtc: mmiEntry.product.originalData.phAtc,
                        phIngr: mmiEntry.product.originalData.phIngr,
                        phForm: mmiEntry.product.originalData.phForm,
                        phFormCode: mmiEntry.package.originalData.phFormCode,

                        phPriceSale: mmiEntry.package.originalData.phPriceSale,
                        phRefundAmount: mmiEntry.package.originalData.phRefundAmount,
                        phPriceRecommended: mmiEntry.package.originalData.phPriceRecommended,
                        phPatPay: mmiEntry,
                        phPatPayHint: mmiEntry,
                        phFixedPay: mmiEntry.package.originalData.phFixedPay,
                        phCheaperPkg: mmiEntry.package.originalData.phCheaperPkg,

                        phNLabel: mmiEntry.package.originalData.phNLabel,

                        phPZN: mmiEntry.package.originalData.phPZN,
                        phSalesStatus: mmiEntry.package.originalData.phSalesStatus,
                        phNormSize: mmiEntry.package.originalData.phNormSize,
                        seq: mmiEntry.package.originalData.phPZN,
                        phPackSize: mmiEntry.package.originalData.phPackSize,
                        phPackQuantity: mmiEntry.package.originalData.phPackQuantity,
                        phARV: mmiEntry.package.originalData.phARV,
                        phARVContent: mmiEntry.package.originalData.phARVContent
                    },
                    catalogData = entry && Y.doccirrus.api.catalog.getCatalogDescriptorForName( 'MMI' );
                entry.count = 0;
                entry.catalogRef = 'MMI';
                entry.catalogShort = 'MMI';
                entry.locationId = locationId;
                if( data.tags && data.tags.length ) {
                    entry.tags = data.tags;
                }
                if( catalogData ) {
                    entry.seqId = getSeqId( {
                        actType: catalogData.actType,
                        code: entry.seq,
                        locationId: entry.locationId,
                        catalogShort: entry.catalogShort
                    } ).seqId;
                }

                Y.doccirrus.filters.cleanDbObject( entry );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'upsert',
                    query: {
                        seq: entry.seq,
                        locationId: entry.locationId,
                        catalogShort: entry.catalogShort
                    },
                    model: 'catalogusage',
                    data: entry,
                    options: {
                        omitQueryId: true
                    }
                }, done );
            }

            if( mmiEntry ) {
                async.eachSeries( data.locations || [], addMMIEntryToLocation, callback );
            } else {
                async.eachSeries( data.locations || [], addCodesToLocation, callback );
            }

        }

        async function deleteBatch( args ) {
            let
                {user, callback, options = {}, query = {}} = args,
                {catalogTextsRefs = [], ids = []} = query,
                err, result,
                queries = [];

            options.override = true;

            for ( let item of catalogTextsRefs ) {
                item = Y.doccirrus.filters.cleanDbObject( item );
                queries.push(
                    {
                        catalogShort: item.catalogShort,
                        code: item.code,
                        locationId: item.locationId
                    }
                );
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'delete',
                    model: 'catalogtext',
                    user,
                    query: {$or: queries },
                    options
                } )
            );

            if( err ) {
                Y.log( `Failed to delete catalogtexts item ${err.stack || err}`, 'error', NAME );
            }

            Y.log( 'Removing following HK entry: ' + JSON.stringify( ids ), 'info', NAME );
            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                model: 'catalogusage',
                user,
                action: 'delete',
                query: {_id: {$in: ids}},
                options
            } ) );

            if( err ) {
                Y.log( `Failed to delete catalogusage item ${err.stack || err}`, 'error', NAME );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Returns actual data for specified(by PZN) mmi product
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.query.patientAge age of patient
         * @param {Object} args.query.pzn product PZN
         * @param {Object} args.query.bsnr
         * @param {Object} args.query.lanr
         * @param {Object} args.query.insuranceIknr
         * @param {Object} args.callback
         */
        function getMMIActualData( args ) {
            var queryParams = args.query || {};
            Y.doccirrus.api.mmi.getMappedProduct( {
                query: {
                    patientAge: queryParams.patientAge,
                    phPZN: queryParams.pzn,
                    bsnr: queryParams.bsnr,
                    lanr: queryParams.lanr,
                    insuranceIknr: queryParams.insuranceIknr
                },
                callback: args.callback
            } );
        }

        function changeTags( args ) {
            var
                { user, data: { tags = [] } = {}, query = {}, callback } = args,
                codeMap = {},
                codes = query.codes || [],
                commonTags = [],
                async = require( 'async' );
            codes.forEach( function( codeId ) {
                codeMap[ codeId ] = {
                    tags: []
                };
            } );
            tags.forEach( function( tag ) {
                if( tag.common ) {
                    commonTags.push( tag.id );
                } else {
                    tag.codesIds.forEach( function( targetCode ) {
                        if( codeMap[ targetCode ] ) {
                            codeMap[ targetCode ].tags.push( tag.id );
                        }
                    } );
                }
            } );

            function saveTags( codeId, done ) {

                var tagsToSave = { tags: codeMap[ codeId ].tags.concat( commonTags ) };
                if( !codeId ) {
                    return done( Y.doccirrus.errors.rest( 400, 'invalid code id, ' + codeId ) );
                }
                Y.doccirrus.filters.cleanDbObject( tagsToSave );
                Y.doccirrus.mongodb.runDb( {
                    model: 'catalogusage',
                    action: 'put',
                    user: user,
                    query: {
                        _id: codeId
                    },
                    fields: 'tags',
                    data: tagsToSave

                }, done );
            }

            async.each( codes, saveTags, callback );
        }

        function copyBatch( args ) {
            var
                {user, data: {codeIds = [], locationIds = []} = {}, callback} = args,
                async = require( 'async' ),
                alreadyExists = {};

            if( !codeIds.length || !locationIds.length ) {
                Y.log( 'Not all required data provided for catalogusage copying', 'warn', NAME );
                return callback( null, {} );
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'catalogusage',
                action: 'get',
                user: user,
                query: {
                    _id: {$in: codeIds}
                }
            }, ( err, codes ) => {
                if( err ) {
                    Y.log( 'Error on getting catalogusge ' + err.message, 'error', NAME );
                    return callback( err );
                }
                if( !codes.length ) {
                    Y.log( 'Catalogusages not found for ' + JSON.stringify( codeIds ), 'warn', NAME );
                    return callback( null, {} );
                }

                async.eachSeries( codes, ( code, done ) => {
                    delete code._id;
                    async.eachSeries( locationIds, ( locationId, doneLocation ) => {
                        code.locationId = locationId;
                        Y.doccirrus.mongodb.runDb( {
                            model: 'catalogusage',
                            action: 'get',
                            user: user,
                            query: {
                                seq: code.seq,
                                catalogShort: code.catalogShort,
                                locationId: code.locationId
                            }
                        }, ( err, destinationCodes ) => {
                            if( err ) {
                                return doneLocation( err );
                            }
                            if( destinationCodes.length ) {
                                destinationCodes.forEach( el => {
                                    alreadyExists[`${el.seq} (${el.catalogShort})` + ' {' + locationId + '}'] = true;
                                } );
                                return doneLocation();
                            }
                            Y.doccirrus.mongodb.runDb( {
                                model: 'catalogusage',
                                action: 'post',
                                user: user,
                                query: {
                                    seq: code.seq,
                                    catalogShort: code.catalogShort,
                                    locationId: code.locationId
                                },
                                fields: Object.keys( code ),
                                data: Y.doccirrus.filters.cleanDbObject( code )

                            }, doneLocation );
                        } );
                    }, done );
                }, ( err ) => {
                    callback( err, {exists: Object.keys( alreadyExists )} );
                } );
            } );
        }

        function getSortedByLocation( args ) {
            var
                { user, query = {}, originalParams, options = {}, callback } = args;

            options.sort = options.sort || {};
            if( 'undefined' !== typeof options.sort.seq ) {
                options.sort.unifiedSeq = options.sort.seq;
                delete options.sort.seq;
            }
            if( 'undefined' === typeof options.sort.locationId ) {
                options.sort = Object.assign( { locationId: 1 }, options.sort );
            }

            if( originalParams && originalParams.catalogShortList && originalParams.catalogShortList.length &&
                !query.catalogShort ) {

                query.catalogShort = {$in: originalParams.catalogShortList};
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'get',
                query,
                options
            }, callback );

        }

        function updateBySeqId( args ) {
            var query = args.query,
                data = args.data,
                user = args.user,
                callback = args.callback,
                fields = [];
            if( !query || !data ) {
                return callback( Y.doccirrus.errors.rest( 400, 'Missing query:' + JSON.stringify( query ) + ', or data: ' + JSON.stringify( data ) ) );
            }
            if( data.updateAttr ) {
                delete data.updateAttr;
                fields = Object.keys( data );
            } else {
                fields.push( 'tags' );
            }
            data.multi_ = true;
            Y.doccirrus.filters.cleanDbObject( data );
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                user: user,
                model: 'catalogusage',
                fields: fields,
                data: data,
                query: query
            }, callback );
        }

        /**
         * Replicates catalogusage collection from user tenant to the rest in the system.
         * @method replicateEntries
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.user.tenantId
         * @param {Object} [args.data]
         * @param {Array} [args.data.tenantList] if not present, will be catch from db.
         * @param {Function} args.callback
         */
        function replicateEntries( args ) {
            let
                { user, data: { tenantList } = {}, callback } = args,
                async = require( 'async' );

            function prepareData( callback ) {
                async.parallel( {
                    tenantList( done ) {
                        if( tenantList ) {
                            setImmediate( done, null, tenantList );
                        } else {
                            Y.doccirrus.api.company.getActiveTenants( {
                                user,
                                callback( err, results ) {
                                    if( err ) {
                                        return done( err );
                                    }
                                    done( null, results.map( doc => doc.tenantId ) );
                                }
                            } );
                        }
                    },
                    cuModel( done ) {
                        Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, done );
                    }
                }, callback );
            }

            function insertEntry( config, callback ) {
                let
                    { data, user } = config;
                async.series( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'catalogusage',
                            action: 'delete',
                            query: {
                                locationId: data.locationId,
                                seq: data.seq
                            }
                        }, next );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'post',
                            model: 'catalogusage',
                            data: Y.doccirrus.filters.cleanDbObject( data )
                        }, next );
                    }
                ], callback );

            }

            function insertEntryForEachLocation( config, callback ) {
                let
                    { catalogUsage, tenantId } = config,
                    su = Y.doccirrus.auth.getSUForTenant( tenantId );
                if( tenantId === user.tenantId ) {
                    return setImmediate( callback );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: su,
                    model: 'location',
                    action: 'get',
                    options: {
                        fields: { _id: 1 },
                        lean: true
                    }
                }, function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    async.each( results, function( location, done ) {
                        let
                            data = Object.assign( {}, catalogUsage );
                        data.locationId = location._id.toString();
                        insertEntry( {
                            user: su,
                            data
                        }, done );
                    }, callback );
                } );
            }

            Y.log( 'replicateEntries. Starting replication process.', 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    prepareData( next );
                },
                function( preparedData, next ) {
                    let
                        { cuModel, tenantList } = preparedData,
                        error = null,
                        alreadySaved = {},
                        stream = cuModel.mongoose.find( {} ).stream();

                    stream.on( 'data', function( catalogUsage ) {
                        stream.pause();
                        if( 'function' === typeof catalogUsage.toObject ) {
                            catalogUsage = catalogUsage.toObject();
                        }
                        delete catalogUsage._id;
                        if( alreadySaved[ catalogUsage.seq ] ) {
                            stream.resume();
                            return;
                        }
                        alreadySaved[ catalogUsage.seq ] = true;
                        async.each( tenantList, function( tenantId, done ) {
                            insertEntryForEachLocation( {
                                tenantId,
                                catalogUsage
                            }, done );
                        }, function( err ) {
                            if( err ) {
                                return stream.destroy( err );
                            }
                            stream.resume();
                        } );
                    } ).on( 'error', function( err ) {
                        Y.log( 'replicateEntries. stream error' + err, 'error', NAME );
                        error = err;

                    } ).on( 'close', function() {
                        Y.log( 'replicateEntries. stream close, process finished.', 'debug', NAME );
                        next( error );
                    } );
                }
            ], callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.api' ).catalogusage = {
            name: NAME,
            calculateUsageIndexSeq: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.calculateUsageIndexSeq', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.calculateUsageIndexSeq');
                }
                calculateUsageIndexSeq( args );
            },
            removeAllByShortName: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.removeAllByShortName', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.removeAllByShortName');
                }
                removeAllByShortName( args );
            },
            getTopByShortName: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.getTopByShortName', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.getTopByShortName');
                }
                getTopByShortName( args );
            },
            getTags: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.getTags', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.getTags');
                }
                getTags( args );
            },
            addCodeBatch: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.addCodeBatch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.addCodeBatch');
                }
                addCodeBatch( args );
            },
            deleteBatch: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.deleteBatch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.deleteBatch');
                }
                deleteBatch( args );
            },
            getMMIActualData: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.getMMIActualData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.getMMIActualData');
                }
                getMMIActualData( args );
            },
            changeTags: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.changeTags', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.changeTags');
                }
                changeTags( args );
            },
            copyBatch: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.copyBatch', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.copyBatch');
                }
                copyBatch( args );
            },
            getSortedByLocation: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.getSortedByLocation', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.getSortedByLocation');
                }
                getSortedByLocation( args );
            },
            updateBySeqId: function( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.updateBySeqId', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.updateBySeqId');
                }
                updateBySeqId( args );
            },
            replicateEntries( args ) {
                Y.log('Entering Y.doccirrus.api.catalogusage.replicateEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogusage.replicateEntries');
                }
                replicateEntries( args );
            },
            getSeqId( activity ) {
                return getSeqId( activity );
            },
            getQueryForActivity( activity ) {
                return getQueryForActivity( activity );
            }
        };

    },
    '0.0.1', {requires: ['catalogusageimportexport-api']}
);
