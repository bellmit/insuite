/**
 * User: pi
 * Date: 24/10/2016  12:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'tag-api', function( Y, NAME ) {

        const
            _ = require( 'lodash' ),
            i18n = Y.doccirrus.i18n,
            DCError = Y.doccirrus.commonerrors.DCError,
            { formatPromiseResult, promisifyArgsCallback, promisifiedCallback } = require( 'dc-core' ).utils,
            DELETE_MSG = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DELETE_MSG'),
            moment = require('moment'),
            async = require('async');

        /**
         * @module tag-api
         */

        /**
         * default post method
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.callback?
         * @param {Object} args.options?
         * @return {Promise}
         */
        function post( args ) {
            Y.log('Entering Y.doccirrus.api.tag.post', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.post');
            }
            let
                { user, data = {}, callback, options = {} } = args;
            data = Y.doccirrus.filters.cleanDbObject( data );
            return Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'tag',
                user,
                data,
                options
            }, callback );
        }

        /**
         * default get method
         * @method get
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.callback?
         * @param {Object} args.options?
         * @param {Object} args.migrate? = false
         * @return {Promise}
         */
        function get( args ) {
            Y.log('Entering Y.doccirrus.api.tag.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.get');
            }
            let
                { user, query = {}, callback, options = {}, migrate = false } = args;
            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'tag',
                user,
                options,
                migrate,
                query
            }, callback );
        }

        function getMedLabData( args ) {
            Y.log('Entering Y.doccirrus.api.tag.getMedLabData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.getMedLabData');
            }
            let
                { user, query = {}, callback, options = {}, migrate = false } = args;

            if( !query.type ) {
                query.type = {
                    $in: [
                        Y.doccirrus.schemas.tag.tagTypes.LABDATA,
                        Y.doccirrus.schemas.tag.tagTypes.MEDDATA
                    ]
                };
            }

            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'tag',
                user,
                options,
                migrate,
                query
            }, callback );
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
         * @param {Array} args.data.tagList
         * @param {String} args.data.type
         * @param {String} args.data.catalogShort required for CATALOG type
         * @param {String|undefined} args.data.tagTitleKey if the tag is an object, this key should be given to mark the tag's string version, e.g. MedData => tag.title
         * @param {Array|undefined} args.data.updateKeys element keys marked to be updated during the post, e.g. MedData => "unit"
         * @param {Boolean} [args.migrate=false]
         * @param {boolean} args.overwrite = false -> just sets values for non-existing properties
         * @param {Function} args.callback
         */
        function postUnique( args ) {
            let
                {
                    user,
                    data: { tagList, type, catalogShort, tagTitleKey, updateKeys, overwrite = true } = {},
                    migrate = false,
                    callback
                } = args,
                query = {
                    type
                },
                data = {
                    type
                };

            switch( type ) {
                case Y.doccirrus.schemas.tag.tagTypes.CATALOG:
                    query.catalogShort = catalogShort;
                    data.catalogShort = catalogShort;
                    break;
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'tag', migrate, next );
                },
                function( tagModel, next ) {
                    async.eachSeries( tagList, ( tag, done ) => {
                        let
                            tagTitle = (typeof tag === "object" && tag !== null && tag.hasOwnProperty( tagTitleKey )) ? tag[tagTitleKey] : tag,
                            _query = Object.assign( {title: tagTitle}, query ),
                            _data = {
                                $setOnInsert: Object.assign( {title: tagTitle}, data )
                            };

                        Y.log( `postUnique. Update tag ${JSON.stringify( tag )} in tags collection`, 'debug', NAME );

                        // extend the data to be updated by dynamically configured keys
                        if( Array.isArray( updateKeys ) ) {
                            // extending means (overwriting, if setOnInsert === false, or updating, if setOnInsert === true)
                            let action = (overwrite) ? "$set" : "$setOnInsert";
                            if( !_data.hasOwnProperty( action ) ) {
                                _data[action] = {};
                            }

                            updateKeys.forEach( ( key ) => {
                                if( typeof key === "string" || typeof key === "number" ) {
                                    // directly set a string or a number, i.e. values
                                    _data[action][key] = tag[key];
                                } else if( Array.isArray( key ) && key.length > 0 ) {
                                    // add array elements to sets, i.e. categories
                                    if( !_data.hasOwnProperty( "$addToSet" ) ) {
                                        _data.$addToSet = {};
                                    }
                                    key.forEach( ( propertyKey ) => {
                                        if( !_data.$addToSet.hasOwnProperty( propertyKey ) ) {
                                            _data.$addToSet[propertyKey] = {};
                                        }
                                        if( !_data.$addToSet[propertyKey].hasOwnProperty( "$each" ) || !Array.isArray( _data.$addToSet[propertyKey].$each ) ) {
                                            _data.$addToSet[propertyKey].$each = [];
                                        }

                                        // as the property is marked as array => push all values
                                        Array.prototype.push.apply(
                                            _data.$addToSet[propertyKey].$each,
                                            tag[propertyKey]
                                        );
                                    } );
                                } else if( typeof key === "object" && key !== null ) {
                                    /**
                                     * append object elements to the existing object,
                                     * i.e. { additionalData : { data1 : "test" } }
                                     * -> _data.$set[ "additionalData.data1" ] = "test";
                                     */
                                    Object.keys( key ).forEach( ( objectKey ) => {
                                        if( typeof tag[objectKey] === "object" ) {
                                            Object.keys( tag[objectKey] ).forEach( ( nestedKey ) => {
                                                _data[action][`${objectKey}.${nestedKey}`] = tag[objectKey][nestedKey];
                                            } );
                                        } else {
                                            _data[action][objectKey] = tag[objectKey];
                                        }
                                    } );
                                }
                            } );
                        }

                        // tagData = new tagModel.mongoose( _data ).toObject();

                        tagModel.mongoose.collection.findAndModify( _query, null, _data, { upsert: true }, done );

                    }, next );
                }
            ], callback );
        }

        /**
         * Helper.
         * Checks if tag is used in another documents. If not, will remove it.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.tag
         * @param {String} args.data.type
         * @param {String} args.data.documentId
         * @param {String} args.data.catalogShort required for CATALOG type
         * @param {Function} args.callback
         * @returns {Promise}
         */
        async function deleteIfNotUsed( args ) {
            let
                {
                    user,
                    data: { tag, type, documentId, catalogShort } = {},
                    callback = promisifiedCallback
                } = args,
                options = {
                    limit: 1,
                    lean: true,
                    select: {
                        _id: 1
                    }
                },
                command = null,
                records = null,
                err = null;

            Y.log( `deleteIfNotUsed. Check whether tag: ${tag} for type: ${type} should be removed or not`, 'debug', NAME );

            switch( type ) {
                case Y.doccirrus.schemas.tag.tagTypes.SUBTYPE:
                    command = {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            subType: tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.DOSE:
                    command = {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'MEDICATION',
                            dosis: tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.PHNOTE:
                    command = {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'MEDICATION',
                            phNote: tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.PHREASON:
                    command = {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'MEDICATION',
                            phReason: tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.DOCUMENT:
                    command = {
                        user,
                        model: 'document',
                        action: 'get',
                        query: {
                            tags: tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.CATALOG:
                    command = {
                        user,
                        model: 'catalogusage',
                        action: 'get',
                        query: {
                            tags: tag,
                            _id: { $ne: documentId },
                            catalogShort: catalogShort
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.MEDDATA:
                    command = {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: { $in: Y.doccirrus.schemas.activity.medDataActTypes },
                            'medData.type': tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.INPACSNAME:
                    command = {
                        user,
                        model: 'inpacsworklist',
                        action: 'get',
                        query: {
                            'workListData.name': tag,
                            _id: { $ne: documentId }
                        },
                        options
                    };
                    break;
                case Y.doccirrus.schemas.tag.tagTypes.JOBSTATUS:
                    command = {
                        user,
                        model: 'patient',
                        action: 'get',
                        query: {
                            jobStatus: tag,
                            _id: {$ne: documentId}
                        },
                        options
                    };
                    break;
            }

            // load the records
            if( command ) {
                [err, records] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( command ) );

                if( err ) {
                    Y.log( `deleteIfNotUsed. Tag: ${tag}. Error in querying for tag usage: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
            }

            if( !records || !records.length ) {
                Y.log( `deleteIfNotUsed. Tag: ${tag} is not used anymore. Tag will be deleted.`, 'debug', NAME );

                // query to delete the tag by the given type
                const query = {
                    title: tag,
                    type: type
                };

                // actType-specific extensions of the query
                switch( type ) {
                    case Y.doccirrus.schemas.tag.tagTypes.MEDDATA:
                        // only tags should be deleted, which have NO custom medDataItemConfig
                        query['medDataItemConfig.0'] = { $exists: false };
                }

                // delete the tag
                [err, records] = await formatPromiseResult( deleteTag( { user, query } ) );

                if( err ) {
                    Y.log( `deleteIfNotUsed. Tag: ${tag}. Error deleting tag: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }

                return callback( null, records );
            }

            Y.log( `deleteIfNotUsed. Tag: ${tag} is used by another document. Tag will not be deleted.`, 'debug', NAME );
            return callback( null );
        }

        /**
         * Updates distinct set of tags.
         * @method updateTags
         * @param {Object} args
         * @param {Object} args.user
         * @param {Boolean} [args.migrate=false]
         * @param {Object} args.data
         * @param {Array} [args.data.oldTags=[]] used to find new and deleted tags. oldTag - currentTags = deleted tags
         * @param {Array} [args.data.currentTags=[]] used to find new and deleted tags. currentTags - oldTag = new tags
         * @param {String} args.data.type type of tag (e.g. CATALOG, DOCUMENT). See schemas.tag.tagTypes
         * @param {String} args.data.documentId id of document which tags were updated (used to delete unused tags)
         * @param {String} args.data.catalogShort required for CATALOG type
         * @param {String|undefined} args.data.tagTitleKey if the tag is an object, this key should be given to mark the tag's string version, e.g. MedData => tag.title
         * @param {Array|undefined} args.data.updateKeys element keys marked to be updated during the post, e.g. MedData => "unit"
         * @param {boolean} args.overwrite = false, updates values on insert, = false, overwrites values
         * @param {Function} args.callback
         * @return {Promise}
         */
        async function updateTags( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateTags');
            }
            let
                {
                    user,
                    data: {
                        oldTags = [], currentTags = [],
                        type, documentId, catalogShort,
                        comparisonKeys, tagTitleKey, updateKeys,
                        overwrite
                    } = {},
                    migrate,
                    callback = promisifiedCallback
                } = args,
                newTags = [],
                deletedTags = [];

            if( !currentTags.length ) {
                // catch the case where no new tags are given: in that case, all tags get deleted
                deletedTags = oldTags;
            } else if( !oldTags.length ) {
                // catch the case where no old tags exist: in that case, all tags were added
                newTags = currentTags;
            } else {
                // in any other case, we compare the existing tags and the new tags, to decide which tags have to be added or deleted
                // => delete oldTags that are not anymore present in the currentTags
                deletedTags = Y.doccirrus.commonutils.getDifferenceBetweenArray( oldTags, currentTags, comparisonKeys );
                // => add tags that are new, and do not exist in oldTags
                newTags = Y.doccirrus.commonutils.getDifferenceBetweenArray( currentTags, oldTags, comparisonKeys );

                // filter deleted tags, that get immediately recreated
                deletedTags = deletedTags.filter(
                    function (tag) {
                        let tagTitle = (typeof tag === "object" && tag !== null && tag.hasOwnProperty( tagTitleKey )) ? tag[tagTitleKey] : tag,
                            tagsImmediatelyRecreated = newTags.filter(
                                function (newTag) {
                                    let newTagTitle = (typeof newTag === "object" && newTag !== null && newTag.hasOwnProperty( tagTitleKey )) ? newTag[tagTitleKey] : newTag;
                                    return newTagTitle === tagTitle;
                                }
                            );

                        return tagsImmediatelyRecreated.length === 0;
                    }
                );
            }

            if( !deletedTags.length && !newTags.length ) {
                // no tags to delete or add (tags stayed the same)
                Y.log( 'updateTags: no tags to delete or create, nothing to do here', 'info', NAME );
                return callback( null );
            }

            const
                asyncDeleteUnusedTags = async () => {
                    const results = [];
                    if( !deletedTags.length ) {
                        return Promise.resolve();
                    }

                    for( let tag of deletedTags ) {
                        const
                            tagTitle = (typeof tag === "object" && tag !== null && tag.hasOwnProperty( tagTitleKey )) ? tag[tagTitleKey] : tag,
                            [localErr, localResult] = await formatPromiseResult( deleteIfNotUsed( {
                                user,
                                data: {
                                    tag: tagTitle,
                                    type,
                                    documentId,
                                    catalogShort
                                }
                            } ) );

                        if( localErr ) {
                            Y.log( `updateTags: error deleting non-used tag "${tagTitle}": ${JSON.stringify( localErr )}`, 'error', NAME );
                            return Promise.reject( localErr );
                        }
                        results.push( localResult );
                    }

                    return Promise.resolve( results );
                },
                asyncPostUniqueTags = async () => {
                    if( !newTags.length ) {
                        return Promise.resolve();
                    }

                    const [localErr, localResult] = await formatPromiseResult( promisifyArgsCallback( postUnique )( {
                        user,
                        data: {
                            type,
                            tagList: newTags,
                            catalogShort,
                            tagTitleKey,
                            updateKeys,
                            overwrite
                        },
                        migrate
                    } ) );

                    if( localErr ) {
                        Y.log( `updateTags: error posting unique tags: ${JSON.stringify( localErr )}`, 'error', NAME );
                        return Promise.reject( localErr );
                    }
                    return Promise.resolve( localResult );
                };

            const [err, result] = await formatPromiseResult( Promise.all( [
                // delete unused tag entries
                asyncDeleteUnusedTags(),
                // update unique tag entries
                asyncPostUniqueTags()
            ] ) );

            if( err ) {
                Y.log( `updateTags: error updating tag collection: ${JSON.stringify( err )}`, 'error', NAME );
                return callback( err );
            }

            return callback( null, result );
        }

        /**
         * default delete method
         * @method delete
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.callback?
         * @param {Object} args.options?
         * @returns {Promise}
         */
        function deleteTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.delete', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.delete');
            }
            var
                { user, query, callback, options = {} } = args;

            return Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'tag',
                user,
                query,
                options
            }, callback );
        }

        /**
         * Update tag title
         * @param {Tag} subType object
         * @param {Object} user object
         * @returns {Promise}
         */
        function updateTagTitle( subType, user ) {
            return Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'tag',
                user,
                query: {
                    _id: subType._id
                },
                fields: ['title'],
                data: Y.doccirrus.filters.cleanDbObject( subType )
            } );
        }

        /**
         * Get the tag object from the DB.
         * Basically executes rundb with _id = subType._id.
         * @param {TagSchema} subType object
         * @param {Object} user object
         * @returns {Promise<TagSchema[]>}
         */
        function getTag( subType, user ) {
            return Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'tag',
                user,
                query: {
                    _id: subType._id
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } );
        }

        function updateActivitySubType( user, subType, newTitle, queued ) {
            let startOfYear = moment().startOf('year').toDate(),
                obj = {
                action: 'mongoUpdate',
                model: 'activity',
                user,
                query: {
                    subType: subType.title
                },
                options: {
                    multi: true
                },
                data: { $set: { subType: newTitle } }
            };
            if( queued ){
                obj.query.timestamp = { $lte: startOfYear };
            } else {
                obj.query.timestamp = { $gt: startOfYear };
            }
            return Y.doccirrus.mongodb.runDb( obj );
        }

        /**
         * Updates all existing MEDDATA-activities with data from a new Tag.
         * Each activity's medDataItems array is scanned for affected types
         * and the MedDataItem's type and unit get updated accordingly to the new tag.
         * Afterwards the content of the activity is getting re-generated
         * and the activity gets stored back to the database.
         * @param {object} args
         * @param {object} args.user
         * @param {TagSchema} args.oldTag
         * @param {TagSchema} args.newTag
         * @param {Map<string, boolean>} args.tagHashMap
         * @returns {Promise}
         */
        async function updateMedDataItemsWithNewTagData( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateMedDataItemsWithNewTagData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateMedDataItemsWithNewTagData');
            }

            const {
                user,
                oldTag,
                newTag,
                tagHashMap,
                callback = promisifiedCallback
            } = args;

            // fetch the activity model
            const [errorLoadingModel, activityModel] = await formatPromiseResult( getModel( user, 'activity' ) );

            if( errorLoadingModel ) {
                Y.log( `Error loading activity mongoose model to update MEDDATA: ${errorLoadingModel.message}`, 'error', NAME );
                return callback( errorLoadingModel );
            }

            /**
             * Fetch all MEDDATA activities, which have a medDataItems matching the oldTag's title.
             * These need to be updated with the new data.
             */
            const medDataEntriesWithTypeMatchingOldTitleCursor = activityModel.mongoose.find(
                {
                    actType: { $in: Y.doccirrus.schemas.activity.medDataActTypes },
                    medData: { $elemMatch: { type: oldTag.title } }
                },
                {},
                { lean: true }
            ).cursor();

            /**
             * Go through all the activities, and update the items with the values from the new tag.
             */
            const [errorUpdatingActivities] = await formatPromiseResult( medDataEntriesWithTypeMatchingOldTitleCursor.eachAsync( (activity) => {
                let
                    i, l,
                    medDataItemsUpdated = false,

                    // just update values, if they have changed
                    updateItemIfRequired = function updateItemIfRequired( object, key, value ) {
                        if( !_.isEqual( object[key], value ) ) {
                            object[key] = value;
                            medDataItemsUpdated = true;
                        }
                    };

                // update the medDataItems, if required
                for( i = 0, l = activity.medData.length; i < l; i++ ) {
                    if(
                        // only modify those items matching the oldTag's title
                        activity.medData[i].type === oldTag.title &&
                        // and having the same content hash
                        tagHashMap.has( createTagOrMedDataItemPropertyHash( activity.medData[i], true ) )
                    ) {
                        // set the values of the new tag
                        updateItemIfRequired( activity.medData[i], 'type', newTag.title );
                        updateItemIfRequired( activity.medData[i], 'unit', newTag.unit );
                        updateItemIfRequired( activity.medData[i], 'sampleNormalValueText', newTag.sampleNormalValueText );
                    }
                }

                if( !medDataItemsUpdated ) {
                    return Promise.resolve();
                }

                // update the content of the whole activity with the updated values (this is an async process now)
                return Y.doccirrus.api.meddata.generateContentForActivity( {
                    user,
                    activity
                } )
                    .then( ( updatedActivity ) => {
                        return Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'mongoUpdate',
                            model: 'activity',
                            query: {
                                _id: activity._id
                            },
                            data: {
                                $set: {
                                    'medData': updatedActivity.medData,
                                    'content': updatedActivity.content
                                }
                            }
                        } );
                    } );
            } ) );

            if( errorUpdatingActivities ) {
                Y.log( `Error on updating MedData activities with data of the new tag: ${errorUpdatingActivities.message}`, 'error', NAME );
                return callback( errorUpdatingActivities );
            }

            return callback();
        }

        function updateReportingSubType( user, subType, newTitle, queued ) {
            let startOfYear = moment().startOf('year').toDate(),
                obj = {
                    action: 'mongoUpdate',
                    user,
                    query: {
                        subType: subType.title
                    },
                    options: {
                        multi: true
                    },
                    data: { $set: { subType: newTitle } }
                };
            if( queued ){
                obj.query.timestampDate = { $lte: startOfYear };
            } else {
                obj.query.timestampDate = { $gt: startOfYear };
            }
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    ...obj, callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } );
        }

        function updateRelatedReportingSubType( user, newTitle, queued ) {
            let startOfYear = moment().startOf( 'year' ).toDate(),
                objGet = {
                    action: 'get',
                    user,
                    query: {
                        subType: newTitle
                    },
                    options: {
                        select: {activityId: 1}
                    }
                },
                objUpdate = {
                    action: 'mongoUpdate',
                    user,
                    query: {
                        subType: {$ne: newTitle}
                    },
                    options: {
                        multi: true
                    },
                    data: {$set: {subType: newTitle}}
                };
            if( queued ) {
                objGet.query.timestampDate = {$lte: startOfYear};
                objUpdate.query.timestampDate = {$lte: startOfYear};
            } else {
                objGet.query.timestampDate = {$gt: startOfYear};
                objUpdate.query.timestampDate = {$gt: startOfYear};
            }

            Y.doccirrus.api.reporting.reportingDBaction( {
                ...objGet, callback: ( err, result ) => {
                    if( err ) {
                        Promise.reject( err );
                    }
                    if( !result.length ) {
                        Promise.resolve( result );
                    }
                    objUpdate.query.activityId = {$in: result.map( el => el.activityId )};

                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.reporting.reportingDBaction( {
                            ...objUpdate, callback: ( err, res ) => {
                                if( err ) {
                                    reject( err );
                                }
                                resolve( res );
                            }
                        } );
                    } );
                }
            } );
        }

        function queueForNightUpdate( user, operation, oldTitle, newTitle ) {
            return Y.doccirrus.mongodb.runDb( {
                action: 'upsert',
                model: 'processingqueue',
                user,
                query: {
                    operation: operation,
                    operationKey: oldTitle
                },
                fields: [ 'operation', 'operationKey','tenant','data','timestamp' ],
                data: Y.doccirrus.filters.cleanDbObject( {
                    operation: operation,
                    operationKey: oldTitle,
                    tenant: user.tenantId,
                    data: {
                        subType : newTitle
                    },
                    timestamp: new Date()
                } )
            } );
        }
        /**
         *  Update tag of type SUBTYPE and do the same for all places where it uses
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function updateSubTypeTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateSubTypeTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateSubTypeTag');
            }

            let tagHolder = null;

            const
                { user, callback, data } = args;

            getTag( data, user )
                .then( tag => {
                    tagHolder = tag && tag[0];
                    return Promise.resolve( tagHolder );
                } )
                .then( () => updateTagTitle( data, user ) )
                .then( () => updateActivitySubType( user, tagHolder, data.title, false ) )
                .then( () => updateReportingSubType( user, tagHolder, data.title, false ) )
                .then( () => updateRelatedReportingSubType( user, data.title, false ) )
                .then( () => queueForNightUpdate( user, 'updateActivitySubType', tagHolder.title, data.title ) )
                .then( () => updateInCaseConfig( user, 'update', data ) )
                .then( () => callback( null ) )
                .catch( err => {
                    Y.log( `Failed to update sub type ${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                } );
        }

        /**
         *  If a subtype tag is deleted then remove it from incaseconfiguration object
         *
         *      1.  Load the settings
         *      2.  Remove/update the tag
         *      3.  Save the settings back to the database if they have changed
         *
         *  @param  {Object}    user
         *  @param  {String}    action  'update' or 'delete'
         *  @param  {Object}    data    Tag to be deleted
         *  @return {Promise<void>}
         */

        async function updateInCaseConfig( user, action, data ) {

            const
                readConfigP = promisifyArgsCallback( Y.doccirrus.api.activitysettings.loadActivitySettings );

            let
                err, actSettings,
                item, i, j,
                changed;

            //  1.  Load the settings

            [ err, actSettings ] = await formatPromiseResult( readConfigP( { user } ) );

            if( err || !actSettings || !actSettings.settings ) {
                Y.log( `updateInCaseConfig: could not get activitysettings ${err.stack||err}`, 'error', NAME );
                return;
            }

            //  2.  Remove/update the tag

            for ( i = 0; i < actSettings.settings.length; i++ ) {
                item = actSettings.settings[i];
                item.subTypes = item.subTypes || [];

                for ( j = 0; j < item.subTypes.length; j++ ) {
                    if ( 'delete' === action && item.subTypes[j] === data.title ) {
                        changed = true;
                        item.subTypes.splice(j, 1);
                    }
                    if ( 'update' === action && item.subTypes[j] === data.oldTitle ) {
                        changed = true;
                        item.subTypes[j] = data.title;
                    }
                }
                }

            if ( !changed ) { return; }

            //  3.  Save the settings back to the database if they have changed

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activitysettings',
                    action: 'put',
                    query: { _id: Y.doccirrus.schemas.activitysettings.getId() },
                    fields: [ 'settings' ],
                    data: Y.doccirrus.filters.cleanDbObject( { settings: actSettings.settings } )
                } )
            );

            if( err ) {
                Y.log( `updateInCaseConfig: could not update activitysettings ${err.stack||err}`, 'error', NAME );
            }
        }

        /**
         * Generate warning message before delete tags
         * e.g. 7 Activities, 3 Documents use this tag
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        async function generateTagDeleteText( args ) { //jshint ignore:line
            Y.log('Entering Y.doccirrus.api.tag.generateTagDeleteText', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.generateTagDeleteText');
            }

            const
                { user, callback, data } = args,
                messages = [
                    i18n( 'IncaseAdminMojit.incase_navJS.menu.RECORD_ENTRIES' ),
                    i18n( 'audit-schema.ModelMeta_E.media' ),
                    i18n( 'tag-schema.TagType_E.CATALOG.i18n' )
                ];
            let
                err,
                result;

            // ------ 1. Always fetch the tag from the DB and get the right title ---------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                                    getTag( data, user )
                                  );

            if( err ) {
                Y.log(`generateTagDeleteText: Error while fetching tag. Error: ${err.stack || err}`, "error", NAME);
                return callback(err);
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`generateTagDeleteText: Failed to fetch tag for input: ${JSON.stringify(data)}`, "warn", NAME);
                return callback(`TAG_NOT_FOUND`);
            }

            data.title = result[0].title; // Update the input with the correct title from the db tag
            // -------------- 1. END ------------------

            if ( data && "CANCELREASON" === data.type ) {
                return callback( null, DELETE_MSG );
            } else if(data && data.type === "LABDATA") {
                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            model: 'activity',
                                            action: 'count',
                                            query: {
                                                actType: 'LABDATA',
                                                'l_extra.testId.head': data.title,
                                                labText: {$exists: false},
                                                "l_extra.0": { "$exists": false }
                                            }
                                        } )
                                      );

                if( err ) {
                    Y.log(`generateTagDeleteText: Error while fetching LABDATA count. Error: ${err}`, "error", NAME);
                    return callback(err);
                }

                if( result > 0 ) {
                    return callback( null, { message: i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DELETE_LABDATA' ), default: false } );
                } else {
                    return callback( null, {message: DELETE_MSG, default: true} );
                }
            } else if(data && data.type === Y.doccirrus.schemas.activity.medDataActType.MEDDATA) {
                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Y.doccirrus.mongodb.runDb( {
                                            user,
                                            model: 'activity',
                                            action: 'count',
                                            query: {
                                                actType: { $in: Y.doccirrus.schemas.activity.medDataActTypes },
                                                medData: {$elemMatch: { 'type' : data.title } }
                                            }
                                        } )
                                    );

                if( err ) {
                    Y.log(`generateTagDeleteText: Error while fetching MEDDATA count. Error: ${err}`, "error", NAME);
                    return callback(err);
                }

                if( result > 0 ) {
                    return callback( null, { message: i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DELETE_MEDDATA' ), default: false } );
                } else {
                    return callback( null, {message: DELETE_MSG, default: true} );
                }
            } else {
                [err, result] = await formatPromiseResult( //jshint ignore:line
                                        Promise.all( [
                                            getActivityCount(),
                                            getDocumentCount(),
                                            getCatalogCount()
                                        ] )
                                      );

                if( err ) {
                    Y.log(`generateTagDeleteText: Failed to generateTagDeleteText ${JSON.stringify( err )}`, "error", NAME);
                    return callback(err);
                }

                let
                    deflt = false,
                    message;

                message = result
                            .map( ( count, i ) => {
                                return count > 0 ? i18n( 'IncaseAdminMojit.incase_tab_tags.messages.DELETE', { data: { title: data.title, count, messages: messages[i] } } ) : false;
                            } )
                            .filter( item => item )
                            .join( '' ).trim();

                if (!message || '' === message ){
                    deflt = true;
                    message = DELETE_MSG;
                }

                return callback( null, { message: message, default: deflt } );
            }

            function getActivityCount() {
                return Y.doccirrus.mongodb.runDb( {
                    action: 'count',
                    model: 'activity',
                    user,
                    query: {
                        subType: data.title,
                        timestamp: { $gt: moment().startOf('year').toISOString() }
                    }
                } );
            }

            function getDocumentCount() {
                return Y.doccirrus.mongodb.runDb( {
                    action: 'count',
                    model: 'document',
                    user,
                    query: {
                        tags: data.title
                    }
                } );
            }

            function getCatalogCount() {
                let query = {tags: {$in: [data.title]}};
                if( data.catalogShort ) {
                    query.catalogShort = data.catalogShort;
                }
                return Y.doccirrus.mongodb.runDb( {
                    action: 'count',
                    model: 'catalogusage',
                    user,
                    query: query
                } );
            }
        }

        /**
         * Update tags related to documents
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function updateDocumentTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateDocumentTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateDocumentTag');
            }

            const
                { user, data, callback } = args;

            let oldTag = null;

            function addDocumentNewTag( user, documentsToUpdate, newTag ) {
                return new Promise( ( res, rej ) => Y.doccirrus.mongodb.getModel( user, 'document', true, function getModelAndUpdate( error, document ) {
                    if( error ) {
                        return rej( error );
                    }
                    document.mongoose.collection.update(
                        { _id: { $in: documentsToUpdate.map( d => d._id ) } },
                        { $addToSet: { tags: newTag.title } },
                        { multi: true },
                        ( err ) => {
                            if(err) { return rej(err); }
                            res( documentsToUpdate );
                        }
                    );
                } ) );
            }

            function addReportingNewTag( user, documentsToUpdate, newTag ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.reporting.reportingDBaction( {
                        mongoose: true,
                        user,
                        action: 'update',
                        query: {documentId: {$in: documentsToUpdate.map( d => d._id.toString() )}},
                        data: {$addToSet: {documentTags: newTag.title}},
                        options: {multi: true},
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            }
                            resolve( result );
                        }
                    } );
                } );
            }

            getTag( data, user ).then( ( tag ) => {
                oldTag = tag && tag[0];
                return Promise.resolve( oldTag );
            } )
                .then( () => {
                    return new Promise( ( res, rej ) => {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'document',
                            user,
                            query: {
                                tags: oldTag.title
                            }
                        }, ( err, result ) => {
                            if( err ) {
                                return rej( err );
                            }
                            res( result );
                        } );
                    } );
                } )
                .then( ( result ) => addDocumentNewTag( user, result, data ) )
                .then( ( result ) => addReportingNewTag( user, result, data ) )
                .then( () => deleteDocumentTagFromDocument( user, oldTag ) )
                .then( () => deleteDocumentTagFromReporting( user, oldTag ) )
                .then( () => updateTagTitle( data, user ) )
                .then( () => callback( null ) )
                .catch( err => {
                    Y.log( `Failed to update document tag ${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                } );
        }

        /**
         * Update tags related to catalogusages
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function updateCatalogTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateCatalogTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateCatalogTag');
            }

            const
                {user, data, callback} = args;

            let oldTag = null;

            function addCatalogNewTag( user, catalogusageToUpdate, newTag ) {
                return new Promise( ( res, rej ) => Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, function getModelAndUpdate( error, catalogusage ) {
                    if( error ) {
                        return rej( error );
                    }
                    catalogusage.mongoose.collection.update(
                        {_id: {$in: catalogusageToUpdate.map( d => d._id )}},
                        {$addToSet: {tags: newTag.title}},
                        {multi: true},
                        ( err ) => {
                            if( err ) {
                                return rej( err );
                            }
                            res( catalogusageToUpdate );
                        }
                    );
                } ) );
            }

            function deleteTagFromCatalog( user, catalogusageToUpdate, tag ) {
                return new Promise( ( res, rej ) => Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, function getModelAndUpdate( error, catalog ) {
                    if( error ) {
                        return rej( error );
                    }
                    catalog.mongoose.collection.update(
                        {_id: {$in: catalogusageToUpdate.map( d => d._id )}},
                        {$pull: {tags: tag.title}},
                        {multi: true},
                        ( err ) => {
                            if( err ) {
                                return rej( err );
                            }
                            res( catalog );
                        }
                    );
                } ) );
            }

            getTag( data, user ).then( ( tag ) => {
                oldTag = tag && tag[0];
                return Promise.resolve( oldTag );
            } )
                .then( () => {
                    return new Promise( ( res, rej ) => {
                        let query = {
                            tags: {$in: [oldTag.title]}
                        };
                        if( oldTag.catalogShort ) {
                            query.catalogShort = oldTag.catalogShort;
                        }
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'catalogusage',
                            user,
                            query: query
                        }, ( err, result ) => {

                            if( err ) {
                                return rej( err );
                            }
                            res( result );
                        } );
                    } );
                } )
                .then( ( result ) => addCatalogNewTag( user, result, data ) )
                .then( ( result ) => deleteTagFromCatalog( user, result, oldTag ) )
                .then( () => updateTagTitle( data, user ) )
                .then( () => callback( null ) )
                .catch( err => {
                    Y.log( `Failed to update catalog tag ${JSON.stringify( err )}`, 'error', NAME );
                    callback( err );
                } );
        }

        /**
         * Update only Tag
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function updateOnlyTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateOnlyTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateOnlyTag');
            }

            const
                { user, data, callback } = args;

            let oldTag = null;

            getTag( data, user ).then( ( tag ) => {
                oldTag = tag && tag[0];
                return Promise.resolve( oldTag );
            } )
            .then( () => updateTagTitle( data, user ) )
            .then( () => callback( null ) )
            .catch( err => {
                Y.log( `Failed to update document tag ${JSON.stringify( err )}`, 'error', NAME );
                callback( err );
            } );
        }

        /**
         * This function takes a Tag or MedDataItem,
         * and computes a "hash" from the items parameters.
         * The has may be, i.e. used to compare if properties have changed.
         * @param {MedDataItemSchema|TagSchema} tagOrMedDataItem
         * @param {boolean} isMedDataItem (a Tag has a "title", a MedDataItem has a "type")
         * @returns {string}
         */
        function createTagOrMedDataItemPropertyHash( tagOrMedDataItem, isMedDataItem ) {
            const hashCollection = [];

            if( isMedDataItem ) {
                if( tagOrMedDataItem.type ) {
                    hashCollection.push( tagOrMedDataItem.type );
                }
            } else {
                if( tagOrMedDataItem.title ) {
                    hashCollection.push( tagOrMedDataItem.title );
                }
            }

            if( tagOrMedDataItem.unit ) {
                hashCollection.push( tagOrMedDataItem.unit );
            }
            if( tagOrMedDataItem.sampleNormalValueText ) {
                if( Array.isArray( tagOrMedDataItem.sampleNormalValueText ) ) {
                    // push the sorted array values to become order-independent
                    Array.prototype.push.apply( hashCollection, tagOrMedDataItem.sampleNormalValueText.sort() );
                } else {
                    hashCollection.push( tagOrMedDataItem.sampleNormalValueText );
                }
            }

            return hashCollection.join("");
        }

        /**
         * Returns true, if the tag has not changed.
         * @param {TagSchema} tagValueToUpdate
         * @param {TagSchema} newTag
         * @param {TagSchema|undefined} existingTagWithSameTitle
         * @returns {boolean}
         */
        function isTagValueEqualToExistingTagWithSameTitle(tagValueToUpdate, newTag, existingTagWithSameTitle) {
            const
                hasExistingTagWithSameTitle = !!existingTagWithSameTitle,
                isTitleEqual = (tagValueToUpdate.title === newTag.title),
                isUnitEqual = (tagValueToUpdate.unit === newTag.unit),
                isCategoryEqual = (
                    hasExistingTagWithSameTitle &&
                    Array.isArray( existingTagWithSameTitle.category ) && Array.isArray( newTag.category ) &&
                    existingTagWithSameTitle.category.length === newTag.category.length &&
                    _.difference( existingTagWithSameTitle.category, newTag.category ).length === 0
                ),
                isAdditionalDataObjectEqual = (
                    hasExistingTagWithSameTitle &&
                    _.isEqual( newTag.additionalData, existingTagWithSameTitle.additionalData )
                ),
                isMedDataItemConfigEqual = (
                    hasExistingTagWithSameTitle &&
                    _.isEqual( newTag.medDataItemConfig, existingTagWithSameTitle.medDataItemConfig )
                ),
                isSampleValueNormalTextEqual = (
                    (
                        !tagValueToUpdate.sampleNormalValueText &&
                        !newTag.sampleNormalValueText
                    ) ||
                    (
                        tagValueToUpdate.sampleNormalValueText &&
                        newTag.sampleNormalValueText &&
                        _.difference( tagValueToUpdate.sampleNormalValueText, newTag.sampleNormalValueText ).length === 0
                    )
                );

            return (
                isTitleEqual &&
                isUnitEqual &&
                isCategoryEqual &&
                isAdditionalDataObjectEqual &&
                isSampleValueNormalTextEqual &&
                isMedDataItemConfigEqual
            );
        }

        /**
         * Update a MEDDATA-tag. Checks which parameters have changes.
         * Updates all MEDDATA activities and their contained medDataItems,
         * which require an update, and in case tagValuesToUpdate
         * is filled with the old values of these items
         * to be replaced with the new data from the tag.
         * Leave tagValuesToUpdate empty, if no MEDDATA activity should be touched.
         * @param {Object} args object
         * @param {object} args.user user performing the action
         * @param {function} args.callback? optional callback function
         * @param {TagSchema} args.data tag object
         * @param {object} args.data.data
         * @param {TagSchema[]} args.data.tagValuesToUpdate
         * @param {boolean} args.data.isNew is newly created and not yet in the database
         * @param {boolean} args.data.isManually is manually created?
         */
        async function updateMedData( args ) {
            Y.log('Entering Y.doccirrus.api.tag.updateMedData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.updateMedData');
            }

            const
                {
                    user,
                    data: inputData,
                    callback = promisifiedCallback
                } = args;

            let
                {
                    data: newTag,
                    tagValuesToUpdate: tagValuesToUpdateArr,
                    isNew,
                    isManually: isManuallyCreated
                } = inputData,

                oldTag = null,
                tagHashMap = new Map(),
                existingTagWithSameTitle,
                err,
                result,
                /**
                 * Store any updated properties to push the changes to the audit-log.
                 * @type {{unit: Set<string>, sampleNormalValueText: Set<string>}}
                 */
                updatedAttributes = {
                    unit: new Set(),
                    sampleNormalValueText: new Set()
                };

            /**
             * ---------------------------------------------------------------------
             * Step 0. Validation
             * Ensure the input data is valid, and an update is required.
             * @type {boolean}
             */
            const
                // check if the data object is valid
                isDataObjectInvalid = (
                    // data is not null or undefined
                    !newTag || typeof newTag !== "object" ||
                    (
                        // if the data is NOT new
                        !isNew &&
                        // there must be a title OR an _id given
                        (!newTag.title || !newTag._id)
                    )
                ),

                // check if the tag is part of the default MedDataType collection (we don't create tags for these types)
                isInDefaultMedDataTypes = Object.prototype.hasOwnProperty.call( Y.doccirrus.schemas.v_meddata.medDataTypes, newTag.title );

            switch( true ) {
                case isDataObjectInvalid:
                    return callback( new DCError( 400, { message: Y.doccirrus.schemas.tag.tagErrors.INVALID_INPUT } ) );
                case isInDefaultMedDataTypes:
                    return callback( new DCError( 400, { message: Y.doccirrus.schemas.tag.tagErrors.DEFAULT_MED_TAG } ) );
            }

            /**
             * ---------------------------------------------------------------------
             * Step 1. check for existing tag of the same title NOT equaling the same id
             */
            if( !isNew || isManuallyCreated ) {
                [err, result] = await formatPromiseResult( get( {
                    user,
                    query: {
                        // tag with the same title
                        title: newTag.title,
                        // of type MEDDATA
                        type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA,
                        // ONLY search for those not matching the id
                        _id: { $ne: newTag._id || null }
                    }
                } ) );

                if( err ) {
                    Y.log(`updateMedData: Error while querying tags collection. Error: ${err}`, "error", NAME );
                    return callback( err );
                } else if( result && result.length ) {
                    Y.log( `updateMedData: Tag with title: ${newTag.title} and type: ${Y.doccirrus.schemas.tag.tagTypes.MEDDATA} already exists in database`, "info", NAME );
                    if( isManuallyCreated ) {
                        // creating a new Tag with the same content should return an error
                        return callback( new DCError( 400, { message: Y.doccirrus.schemas.tag.tagErrors.TAG_ALREADY_EXISTS } ) );
                    }
                    existingTagWithSameTitle = result[0];
                }
            }

            /**
             * ---------------------------------------------------------------------
             * Step 2. initialize missing parameters with default values for the newTag
             */
            if( typeof newTag.unit !== "string" ) {
                newTag.unit = "";
            }
            if( !newTag.sampleNormalValueText || !Array.isArray( newTag.sampleNormalValueText ) ) {
                newTag.sampleNormalValueText = [];
            }

            /**
             * ---------------------------------------------------------------------
             * Step 3. check which medDataItems need to be updated, filter out all others
             */
            tagValuesToUpdateArr = tagValuesToUpdateArr.filter( ( tagValueToUpdate ) => {
                // filter all MedDataItems that should be updated, but are already equal to the new Tag
                return !isTagValueEqualToExistingTagWithSameTitle( tagValueToUpdate, newTag, existingTagWithSameTitle );
            } );

            /**
             * ---------------------------------------------------------------------
             * Step 4. check if medDataItems need to be updated
             */
            tagValuesToUpdateArr.forEach((tagValueToUpdate) => {
                // to simplify comparison, we use a hash map for each item, to mark any item already updated
                tagHashMap.set( createTagOrMedDataItemPropertyHash( tagValueToUpdate, false ), true );

                // collect changed parameters to be updated
                // a) unit
                const
                    tagValueUnit = tagValueToUpdate.unit || "";
                if( tagValueUnit !== newTag.unit ) {
                    updatedAttributes.unit.add( tagValueUnit );
                }

                // b) sampleNormalValueText
                const
                    tagValueSampleNormalValueText = Array.isArray( tagValueToUpdate.sampleNormalValueText ) ? tagValueToUpdate.sampleNormalValueText : [],
                    differenceToNewData = _.difference( tagValueSampleNormalValueText, newTag.sampleNormalValueText );

                differenceToNewData.forEach( ( item ) => {
                    updatedAttributes.sampleNormalValueText.add( item );
                } );
            });

            /**
             * ---------------------------------------------------------------------
             * Step 5. load the old tag, if neither created manually, nor being a new entry
             */
            if( !isNew && !isManuallyCreated ) {
                [err, result] = await formatPromiseResult( getTag( newTag, user ) );

                if( err ) {
                    Y.log( `updateMedDataItemsWithNewTagData: error loading the oldTag ${JSON.stringify( newTag )} for existing MEDDATA activities: ${JSON.stringify( tagValuesToUpdateArr )}: ${err.message}`, "error", NAME );
                    return callback( err );
                }

                oldTag = result && result[0];

                if( !oldTag ) {
                    return callback( Y.doccirrus.schemas.tag.tagErrors.TAG_NOT_FOUND );
                }

                /**
                 * Step 5b. if the tag is neither new, nor manually created,
                 * there may be already existing MedDataItems which have to be updated
                 */
                if( tagValuesToUpdateArr.length > 0 ) {

                    [err, result] = await formatPromiseResult( updateMedDataItemsWithNewTagData( {
                        user, oldTag, newTag, tagHashMap
                    } ) );

                    if( err ) {
                        Y.log( `updateMedDataItemsWithNewTagData: error storing the new tag's parameters ${JSON.stringify( newTag )} for existing MEDDATA activities: ${JSON.stringify( tagValuesToUpdateArr )}: ${err.message}`, "error", NAME );
                        return callback( err );
                    }
                } else {
                    Y.log( `updateMedDataItemsWithNewTagData: parameters of the new tag ${JSON.stringify( newTag )} and the selected input: ${JSON.stringify( tagValuesToUpdateArr )} are the same. No update of existing MedDataItems required.`, "info", NAME );
                }
            }

            /**
             * ---------------------------------------------------------------------
             * Step 6. store the new tag / update the old tag in the database with the new properties
             */
            const idToUpdate = existingTagWithSameTitle ? existingTagWithSameTitle._id : newTag._id;
            if( !isNew && idToUpdate ) {
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'tag',
                    user,
                    query: {
                        _id: idToUpdate
                    },
                    fields: [
                        'title',
                        'unit',
                        'category',
                        'additionalData',
                        'sampleNormalValueText',
                        'medDataItemConfig'
                    ],
                    data: Y.doccirrus.filters.cleanDbObject( newTag )
                } ) );

                if( err ) {
                    Y.log( `error PUTing updated tag to tag collection ${JSON.stringify( newTag )}: ${err.message}`, "error", NAME );
                    return callback( err );
                }
            } else {
                [err, result] = await formatPromiseResult( post( {
                    user,
                    data: Y.doccirrus.filters.cleanDbObject( newTag )
                } ) );

                if( err ) {
                    Y.log( `error POSTing new tag to tag collection ${JSON.stringify( newTag )}: ${err.message}`, "error", NAME );
                    return callback( err );
                }
            }

            /**
             * ---------------------------------------------------------------------
             * Step 7. delete the new tag, if an old one existed, which was updated with the new parameters
             */
            if( existingTagWithSameTitle ) {
                [err, result] = await formatPromiseResult( deleteTag( {
                    user: user,
                    query: { _id: newTag._id }
                } ) );

                if( err ) {
                    Y.log( `error deleting existing tag with same title collection ${JSON.stringify( newTag )}: ${err.message}`, "error", NAME );
                    return callback( err );
                }
            }

            /**
             * ---------------------------------------------------------------------
             * Step 8. if updating any MedDataItems, add audit log entries
             */
            if( !isNew && !isManuallyCreated ) {
                const auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'updateTag', 'activity', `${Y.doccirrus.i18n('activity-schema.Activity_E.MEDDATA')} ${Y.doccirrus.i18n( 'IncaseAdminMojit.incase_tab_tags.audit.tagUpdate' )} ${newTag.title}` );

                auditEntry.actType = Y.doccirrus.schemas.activity.medDataActType.MEDDATA;
                auditEntry.diff = {};

                if( !oldTag || oldTag.title !== newTag.title ) {
                    auditEntry.diff.type = {
                        oldValue: oldTag && oldTag.title || "",
                        newValue: newTag.title
                    };
                }

                if( updatedAttributes.unit.size ) {
                    auditEntry.diff.unit = {
                        oldValue: [...updatedAttributes.unit].join(" | "),
                        newValue: newTag.unit
                    };
                }

                if( updatedAttributes.sampleNormalValueText.size ) {
                    auditEntry.diff.sampleNormalValueText = {
                        oldValue: [...updatedAttributes.sampleNormalValueText].join( " | " ),
                        newValue: [...newTag.sampleNormalValueText].join( " | " )
                    };
                }

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.audit.post( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(auditEntry)
                    } )
                );

                if( err ) {
                    Y.log( `updateMedData: error while posting tag update in audit collection. Error: ${err.stack || err}`, "warn", NAME );
                    return callback( err );
                }
            }

            return callback();
        }

        async function deleteLabDataTag( args ) { //jshint ignore:line
            Y.log('Entering Y.doccirrus.api.tag.deleteLabDataTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.deleteLabDataTag');
            }
            const
                {user, data, callback} = args;

            let
                err,
                result;

            // ------------ 1. Get tag from DB -----------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                                    getTag( data, user )
                                  );

            if( err ) {
                Y.log(`deleteLabDataTag: Error querying tagId : ${data._id} from DB. Error: ${err.stack || err}`, "error", NAME);
                return callback(err);
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                Y.log(`deleteLabDataTag: Tag ID: ${data._id} not found in DB.`, "error", NAME);
                return callback("TAG_NOT_FOUND");
            }

            data.title = result[0].title;
            // ------------ 1. END -------------

            // --------------- 2. Delete labtest -------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                                    new Promise((resolve, reject) => {
                                        Y.doccirrus.api.labtest.delete( {
                                            user,
                                            query: {head: data.title, userGenerated: true},
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
                Y.log(`deleteLabDataTag: Error while deleting labtest head: ${data.title} and userGenerated=true. Error: ${err}`, "error", NAME);
                return callback(err);
            }
            // ------------- 2. END -------------

            // -------------- 3. Delete tag ---------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                                    new Promise( (resolve, reject) => {
                                        deleteTag({
                                            user,
                                            query: { _id: data._id },
                                            options: args.options,
                                            callback(tagErr, tagRes) {
                                                if( tagErr ) {
                                                    reject( tagErr );
                                                } else {
                                                    resolve( tagRes );
                                                }
                                            }
                                        });
                                    } )
                                  );

            if( err ) {
                Y.log(`deleteLabDataTag: Error while deleting tag _id=${data._id}. Error: ${err}`, "error", NAME );
                return callback(err);
            }
            // ----------- 3. END -------------

            Y.log(`deleteLabDataTag: Successfully deleted tag Id= ${data._id} and its corresponding labtest`, "debug", NAME);
            callback( null, result);
        }

        function labTagObjToStringKey( tagObj, useTestResultUnit, useHead ) {
            let
                key = '';

            if( useHead ) {
                key = key + tagObj.head ? tagObj.head : '';
            } else {
                key = key + tagObj.title ? tagObj.title : '';
            }

            if( tagObj.testLabel ) {
                key = key + tagObj.testLabel;
            }

            if( useTestResultUnit ) {
                if( tagObj.TestResultUnit ) {
                    key = key + tagObj.TestResultUnit;
                }
            } else {
                if( tagObj.unit ) {
                    key = key + tagObj.unit;
                }
            }

            if( tagObj.sampleNormalValueText && Array.isArray(tagObj.sampleNormalValueText) && tagObj.sampleNormalValueText.length ) {
                for( let normalValueText of tagObj.sampleNormalValueText ) {
                    if( normalValueText ) {
                        key = key + normalValueText;
                    }
                }
            }

            return key;
        }

        /*
        * 1] Check if there is already an existing tag which user has typed, if yes then cache it in 'alreadyExistingTag' variable
        * 2] Get the old tag, from DB, by tag Id = data._id
        * 3] Update corresponding labtest record with data
        * 4] Update Tags collection with data
        * 5] If 'alreadyExistingTag' then delete old tag and labtest record as the 'alreadyExistingTag' record is updated with data
        * 5] Update all corresponding activities with updated tag data
        * 6] Audit operation
        *
        * if mappingUpdate is true then update only mapping field of tag and audit operation
        * */
        async function updateLabDataTag( args ) {
            Y.log( 'Entering Y.doccirrus.api.tag.updateLabDataTag', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.tag.updateLabDataTag' );
            }
            const
                {user, data: inputData, callback} = args,
                {data, tagValuesToUpdate: tagValuesToUpdateArr, mappingUpdate, isNew, isManually} = inputData;

            let
                err,
                result,
                oldTag,
                alreadyExistingTag,
                activitiesToUpdateArr,
                tagKeyMap = {},
                // ----- For auditing -----
                attributesToUpdate = {
                    testLabel: new Set(),
                    unit: new Set(),
                    sampleNormalValueText: new Set()
                },
                auditEntry,
                updateLabData = tagValuesToUpdateArr && Array.isArray( tagValuesToUpdateArr ) && tagValuesToUpdateArr.length;

            // ---------------------- Validation -----------------------------------------------------------------
            if( !isNew && !isManually && ( !(updateLabData || mappingUpdate) ) ) {
                return callback( `NO_TAGS_TO_UPDATE` );
            }

            if( !data || typeof data !== "object" || !isNew && ( !data.title || !data._id ) ) {
                return callback( `INVALID_INPUT` );
            }
            // ------------------------ END ----------------------------------------------------------------------

            if( updateLabData ) {


                // -------------------------- Default Initialization -------------------------------------------------
                for( let tagObj of tagValuesToUpdateArr ) {
                    tagKeyMap[labTagObjToStringKey( tagObj )] = true;

                    if( (tagObj.testLabel || "") !== (data.testLabel || "") ) {
                        attributesToUpdate.testLabel.add( tagObj.testLabel || "" );
                    }

                    if( (tagObj.unit || "") !== (data.unit || "") ) {
                        attributesToUpdate.unit.add( tagObj.unit || "" );
                    }

                    if( ((tagObj.sampleNormalValueText && tagObj.sampleNormalValueText[0]) || "") !== ((data.sampleNormalValueText && data.sampleNormalValueText[0]) || "") ) {
                        attributesToUpdate.sampleNormalValueText.add( (tagObj.sampleNormalValueText && tagObj.sampleNormalValueText[0]) || "" );
                    }
                }

                if( !data.unit ) {
                    data.unit = "";
                }

                if( !data.testLabel ) {
                    data.testLabel = "";
                }

                if( !data.sampleNormalValueText || !Array.isArray( data.sampleNormalValueText ) ) {
                    data.sampleNormalValueText = [];
                }
                // -------------------------- END --------------------------------------------------------------------
            }


            // ------------ 1. Check if there is already an existing tag which user has typed ------------------------------------
            if( isNew ) {
                oldTag = data;
            } else if( !isNew || isManually ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'tag',
                        user,
                        query: {
                            title: data.title,
                            type: Y.doccirrus.schemas.tag.tagTypes.LABDATA,
                            _id: {$ne: data._id}
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateLabDataTag: Error while querying tags collection. Error: ${err}`, "error", NAME );
                    return callback( err );
                } else if( result && result.length ) {
                    Y.log( `updateLabDataTag: Tag with title: ${data.title} and type: ${Y.doccirrus.schemas.tag.tagTypes.LABDATA} already exists in database`, "info", NAME );
                    alreadyExistingTag = result[0];
                }
                // ------------------------------------------ 1. End ------------------------------------------------------------

                // ---------------------------------- 2. Get the tag by tag Id = data._id --------------------------------------
                [err, result] = await formatPromiseResult(
                    getTag( data, user )
                );

                if( err ) {
                    Y.log( `updateLabDataTag: Error while fetching tagId: ${data._id} from db. Error: ${err} `, "error", NAME );
                    return callback( err );
                } else if( !result || !result[0] ) {
                    Y.log( `updateLabDataTag: TagId: ${data._id} not found in DB`, "error", NAME );
                    return callback( `TAG_NOT_FOUND` );
                }

                oldTag = result[0];
            }
            // ------------------------------------------- 2. End -------------------------------------------------------------

            // -----------------  Check if there is any need to proceed -------------------------------------------
            if( tagValuesToUpdateArr.length === 1 && !isNew ) {
                let titleEqual = tagValuesToUpdateArr[0].title === data.title,
                    testLabelEqual = tagValuesToUpdateArr[0].testLabel === data.testLabel,
                    unitEqual = tagValuesToUpdateArr[0].unit === data.unit,
                    categoryEqual = !!oldTag && Array.isArray( oldTag.category ) && Array.isArray( data.category ) &&
                                    oldTag.category.length === data.category.length &&
                                    _.difference( oldTag.category, data.category ).length === 0,
                    sampleValueNormalTextEqual = ((!tagValuesToUpdateArr[0].sampleNormalValueText && !data.sampleNormalValueText) || (tagValuesToUpdateArr[0].sampleNormalValueText && data.sampleNormalValueText && tagValuesToUpdateArr[0].sampleNormalValueText[0] === data.sampleNormalValueText[0]));

                if( titleEqual && testLabelEqual && unitEqual && categoryEqual && sampleValueNormalTextEqual ) {
                    Y.log( `updateLabDataTag: input LABDATA: ${JSON.stringify( data )} and selected input: ${JSON.stringify( tagValuesToUpdateArr[0] )} are same. Nothing to do...`, "info", NAME );
                    return callback();
                }
            }
            // ----------------- END ---------------------------------------------------------------------------

            if( updateLabData || isNew ) {
                // ------------------------------ 3. Update corresponding labtest --------------------------------------------------
                let upsertData = {
                    head: data.title,
                    testLabel: data.testLabel,
                    sampleNormalValueText: data.sampleNormalValueText,
                    TestResultUnit: data.unit,
                    userGenerated: true
                };

                if( !alreadyExistingTag ){
                    upsertData.sampleResultText = [ '' ];
                }

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'upsert',
                        model: 'labtest',
                        user,
                        query: {
                            head: alreadyExistingTag ? alreadyExistingTag.title : oldTag.title,
                            userGenerated: true
                        },
                        fields: Object.keys( upsertData ),
                        data: Y.doccirrus.filters.cleanDbObject( upsertData )
                    } )
                );

                if( err ) {
                    if( err.errors && err.errors.head && err.errors.head.$isValidatorError ) {
                        Y.log( `updateLabDataTag: Validation error for key: head while updating labtest. Error: ${err.stack || err}`, "error", NAME );
                        return callback( "LABTEST_T_HEAD_ERR" );
                    } else {
                        Y.log( `updateLabDataTag: Error while updating labtest for query: ${JSON.stringify( {
                            head: alreadyExistingTag ? alreadyExistingTag.title : oldTag.title,
                            userGenerated: true
                        } )}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                }

                if( !result ) {
                    Y.log( `updateLabDataTag: Failed to update labtest for query: ${JSON.stringify( {
                        head: alreadyExistingTag ? alreadyExistingTag.title : oldTag.title,
                        userGenerated: true
                    } )}`, "error", NAME );
                    return callback( `Failed to update labtest` );
                }
                // ------------------------------------------------- 3. End -------------------------------------------------------------
            }

            // ------------------------------------- 4. Update Tags collection --------------------------------------------------------
            // for now mappin on client is single select
            data.mapping = data.mapping ? [ data.mapping ] : [];

            if( !isNew || isManually ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'put',
                        model: 'tag',
                        user,
                        query: {
                            _id: alreadyExistingTag ? alreadyExistingTag._id : data._id
                        },
                        fields: updateLabData || isManually ? ['title', 'testLabel', 'sampleNormalValueText', 'unit', 'mapping', 'category'] : ['mapping'],
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    } )
                );
                if( err ) {
                    Y.log(`updateLabDataTag: Error while updating tag. Error: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }

                if( !result ) {
                    Y.log(`updateLabDataTag: Failed to update tag Id: ${alreadyExistingTag ? alreadyExistingTag._id : data._id}`, "error", NAME);
                    return callback(`Failed to update tag`);
                }
            } else {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'tag',
                        user,
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    } )
                );
                if( err ) {
                    Y.log(`updateLabDataTag: Error while creating tag. Error: ${err.stack || err}`, "error", NAME);
                    return callback(err);
                }
            }
            // ------------------------------------------------- 4. End ------------------------------------------------------------------

            if( updateLabData ) {
                // ---------------------------- 5. If 'alreadyExistingTag' then delete 'labtest' and 'tag' record ---------------------------
                if( alreadyExistingTag ) {
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'labtest',
                            action: 'delete',
                            query: {
                                head: oldTag.title,
                                userGenerated: true
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateLabDataTag: Error while deleting 'labtest' record for query: ${JSON.stringify( {
                            head: oldTag.title,
                            userGenerated: true
                        } )}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result ) {
                        Y.log( `updateLabDataTag: Failed to delete 'labtest' record for query: ${JSON.stringify( {
                            head: oldTag.title,
                            userGenerated: true
                        } )}`, "error", NAME );
                        return callback( `Failed to delete 'labtest' record for query: ${JSON.stringify( {
                            head: oldTag.title,
                            userGenerated: true
                        } )}` );
                    }

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'tag',
                            action: 'delete',
                            query: {
                                _id: data._id
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateLabDataTag: Error while deleting 'tag' for _id = ${data._id}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result ) {
                        Y.log( `updateLabDataTag: Failed to delete 'tag' record for query: ${JSON.stringify( {_id: data._id} )}`, "error", NAME );
                        return callback( `Failed to delete 'tag' record for query: ${JSON.stringify( {_id: data._id} )}` );
                    }
                }
                // ------------------------------------------ 5. END --------------------------------------------------------------------------------

                // ------------------------------- 6. Get all LABDATA activities which have l_extra.testId.head = oldTag.title --------------------------------
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'LABDATA',
                            'l_extra.testId.head': oldTag.title,
                            labText: {$exists: false},
                            "l_extra.0": {"$exists": false}
                        },
                        options: {
                            // fields: {
                            //     _id: 1,
                            //     l_extra: 1,
                            //     content: 1
                            // }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateLabDataTag: Error while fetching activities with 'l_extra.testId.head': ${oldTag.title} from db. Error: ${err} `, "error", NAME );
                    return callback( err );
                }
                // ----------------------------------------------------- 6. End -------------------------------------------------------

                // -------------- 7. update the queried activities "l_extra" and "content" with new tag value ---------
                if( result && result.length ) {
                    activitiesToUpdateArr = result.filter( ( item ) => {
                        if( item.l_extra && !Array.isArray( item.l_extra ) && Array.isArray( item.l_extra.testId ) ) {
                            return true;
                        }
                    } );

                    for( let currActivity of activitiesToUpdateArr ) {
                        let
                            hasUpdated;

                        currActivity.l_extra.testId = currActivity.l_extra.testId.map( ( testIdObj ) => {
                            if( testIdObj.head === oldTag.title && tagKeyMap[labTagObjToStringKey( testIdObj, true, true )] ) {
                                hasUpdated = true;
                                testIdObj = {
                                    ...testIdObj, ...{
                                        head: data.title,
                                        testLabel: data.testLabel,
                                        TestResultUnit: data.unit,
                                        sampleNormalValueText: data.sampleNormalValueText
                                    }
                                };
                            }

                            return testIdObj;
                        } );

                        if( !hasUpdated ) {
                            //Should not happened
                            continue;
                        }

                        [err, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'mongoUpdate',
                                model: 'activity',
                                query: {
                                    _id: currActivity._id
                                },
                                data: {
                                    $set: {
                                        'l_extra': currActivity.l_extra,
                                        'content': Y.doccirrus.schemas.activity.generateContent( currActivity )
                                    }
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `updateLabDataTag: Error while updating 'l_extra' for activity ID: ${currActivity._id}. Error: ${err}`, "error", NAME );
                            return callback( err );
                        }

                        if( !result || !result.result || result.result.n !== 1 ) {
                            Y.log( `updateLabDataTag: Failed to update activity ID = ${currActivity._id.toString()} with updated 'l_extra' and 'content'`, "error", NAME );
                            return callback( `Failed to update activity ID = ${currActivity._id.toString()} with updated 'l_extra' and 'content'` );
                        }
                    }
                }
                // -------------- 7. End ----------------------------------------------------------------------------------------------------------
            }

            if( updateLabData && !isNew ) {
                // ------------------------- 8. Log operation in audit -----------------------------------------------------------------
                auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'updateTag', 'activity', `${Y.doccirrus.i18n( 'activity-schema.Activity_E.LABDATA' )} ${Y.doccirrus.i18n( 'IncaseAdminMojit.incase_tab_tags.audit.tagUpdate' )} ${data.title}` );

                auditEntry.actType = "LABDATA";
                auditEntry.diff = {};

                if( oldTag.title !== data.title ) {
                    auditEntry.diff.head = {
                        oldValue: oldTag.title,
                        newValue: data.title
                    };
                }

                if( attributesToUpdate.testLabel.size ) {
                    auditEntry.diff.testLabel = {
                        oldValue: [...attributesToUpdate.testLabel].join( " | " ),
                        newValue: data.testLabel
                    };
                }

                if( attributesToUpdate.unit.size ) {
                    auditEntry.diff.TestResultUnit = {
                        oldValue: [...attributesToUpdate.unit].join( " | " ),
                        newValue: data.unit
                    };
                }

                if( attributesToUpdate.sampleNormalValueText.size ) {
                    auditEntry.diff.sampleNormalValueText = {
                        oldValue: [...attributesToUpdate.sampleNormalValueText].join( " | " ),
                        newValue: data.sampleNormalValueText[0] || ""
                    };
                }
            } else {
                auditEntry = Y.doccirrus.api.audit.getBasicEntry( user, 'updateTag', 'tag', `${Y.doccirrus.i18n( 'activity-schema.Activity_E.LABDATA' )} ${Y.doccirrus.i18n( 'IncaseAdminMojit.incase_tab_tags.audit.tagUpdate' )} ${data.title}` );
                auditEntry.diff = {};
            }
            if( !isNew ) {
                if( oldTag.mapping !== data.mapping ) {
                    auditEntry.diff.mapping = {
                        oldValue: oldTag.mapping,
                        newValue: data.mapping
                    };
                }
                [err] = await formatPromiseResult(
                    Y.doccirrus.api.audit.post( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(auditEntry)
                    } )
                );

                if( err ) {
                    Y.log(`updateLabDataTag: Error while posting operation in audit collection. Error: ${err.stack || err}`, "warn", NAME);
                }
            }
            // -------------------------- 8. END ----------------------------------------------------------------------------------------

            Y.log(`updateLabDataTag: Successfully updated LABDATA tag from: ${JSON.stringify(oldTag)} to ${JSON.stringify(data)}`, "info", NAME);
            callback();
        }

        /**
         * Delete tag and remove from the activity
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function deleteSubTypeTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.deleteSubTypeTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.deleteSubTypeTag');
            }
            const
                { user, data, callback } = args;

            updateActivitySubType( user, data, null, false )
                .then( () => updateReportingSubType( user, data, null, false ) )
                .then( () => updateRelatedReportingSubType( user, null, false ) )
                .then( () => queueForNightUpdate( user, 'updateActivitySubType', data.title, null ) )
                .then( () => deleteTag( Object.assign( args, {
                    query: {
                        _id: data._id
                    }
                } ) ) )
                .then( () => updateInCaseConfig( user, 'delete', data ) )
                .catch( err => callback( err ) );
        }

        /**
         * Helper function ro remove tag from document in the db
         * @param {Object} user object
         * @param {Tag} tag tag object
         * @returns {Promise}
         */
        function deleteDocumentTagFromDocument( user, tag ) {
            return new Promise( ( res, rej ) => Y.doccirrus.mongodb.getModel( user, 'document', true, function getModelAndUpdate( error, document ) {
                if( error ) {
                    return rej( error );
                }
                document.mongoose.collection.update(
                    {},
                    { $pull: { tags: tag.title } },
                    { multi: true },
                    ( err ) => {
                        if(err) { return rej(err); }
                        res( document );
                    }
                );
            } ) );
        }

        /**
         * Helper function ro remove tag from reporting in the db
         * @param {Object} user object
         * @param {Tag} tag tag object
         * @returns {Promise}
         */
        function deleteDocumentTagFromReporting( user, tag ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.reporting.reportingDBaction( {
                    mongoose: true,
                    user,
                    action: 'update',
                    query: {},
                    data: {$pull: {documentTags: tag.title}},
                    options: {multi: true},
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                        }
                        resolve( result );
                    }
                } );
            } );
        }

        /**
         * Delete tag and remove from the document
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function deleteDocumentTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.deleteDocumentTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.deleteDocumentTag');
            }
            const
                { user, data, callback } = args;

            deleteDocumentTagFromDocument( user, data )
                .then( () => deleteDocumentTagFromReporting( user, data ) )
                .then( () => deleteTag( Object.assign( args, {
                query: {
                    _id: data._id
                }
            } ) ) ).catch( err => callback( err ) );
        }

        /**
         * Delete tag and remove from the document
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function deleteCatalogTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.deleteCatalogTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.deleteCatalogTag');
            }
            const
                {user, data, callback} = args;

            var oldTag = null;

            getTag( data, user ).then( ( tag ) => {
                oldTag = tag && tag[0];
                return Promise.resolve( oldTag );
            } )
                .then( () => {
                    return new Promise( ( res, rej ) => {
                        let query = {
                            tags: {$in: [oldTag.title]}
                        };
                        if( oldTag.catalogShort ) {
                            query.catalogShort = oldTag.catalogShort;
                        }
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'catalogusage',
                            user,
                            query: query
                        }, ( err, result ) => {

                            if( err ) {
                                return rej( err );
                            }
                            res( result );
                        } );
                    } );
                } ).then( ( result ) => {
                if( result && result.length ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 405, {message: 'Tag wird im haus katalog zugewiesen.'} ) );
                }
                deleteTag( Object.assign( args, {
                    query: {
                        _id: data._id
                    }
                } ) );
            } ).catch( err => callback( err ) );
        }

        /**
         * Delete tag
         * @param {Object} args object
         * @param {Tag} args.data tag object
         */
        function deleteOnlyTag( args ) {
            Y.log('Entering Y.doccirrus.api.tag.deleteOnlyTag', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.deleteOnlyTag');
            }
            const
                { data } = args;

            deleteTag( Object.assign( args, {
                    query: {
                        _id: data._id
                    }
                } ) );
        }

        /**
         * Promisified version of getModel.
         * @param {object} user
         * @param {string} collection
         * @returns {Promise<mongoose>}
         */
        function getModel(user, collection){
            return new Promise( ( resolve, reject ) =>{
                Y.doccirrus.mongodb.getModel(user, collection, true, (err, model) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( model );
                } );
            } );
        }

        /**
         * Queued processing tags
         * @param user
         * @param cb callback
         */
        function queuedProcessingTag( user, cb ) {
            let tagUpdateModel, item;
            getModel( user, 'processingqueue' ).then( model => {
                tagUpdateModel = model;
                return model.mongoose.find( { operation: 'updateActivitySubType', tenant: user.tenantId } ).sort( 'timestamp' ).limit( 1 ).exec();
            } ).then( items => {
                if( !items.length ) {
                    //there are any more queued items
                    return Promise.reject( null );
                }
                item = items[0];
                //process item
                return updateActivitySubType( user, { title: item.operationKey }, item.data.subType, true );
            } ).then( () => {
                return updateReportingSubType( user, { title: item.operationKey }, item.data.subType, true );
            } ).then( () => {
                return updateRelatedReportingSubType( user, item.data.subType, true );
            } ).then( () => {
                return tagUpdateModel.mongoose.remove( {_id: item._id} ).exec();
            } ).then( () => {
                queuedProcessingTag( user, cb );
            } ).catch( err => {
                if( err ){
                    Y.log( 'Error on queued processing tags ' + err.message, 'error', NAME );
                }
                return cb( err );
            } );
        }

        async function getDistinctLabDataTags( args ) {
            Y.log('Entering Y.doccirrus.api.tag.getDistinctLabDataTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.getDistinctLabDataTags');
            }
            const
                {user, data, callback} = args;

            let
                err,
                result,
                tagKeyMap = {},
                distinctLabDataTagsArr = [];

            if( !data || !data.title ) {
                return callback( `MISSING_TITLE` );
            }

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        model: 'activity',
                                        action: 'get',
                                        query: {
                                            actType: 'LABDATA',
                                            'l_extra.testId.head': data.title,
                                            labText: {$exists: false},
                                            "l_extra.0": { "$exists": false }
                                        },
                                        options : {
                                            fields: {
                                                _id: 1,
                                                l_extra: 1
                                            }
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`getDistinctLabDataTags: Error while querying LABDATA activities for title = ${data.title}. Error: ${err.stack || err}`, "error", NAME);
                return callback(err);
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                return callback( null, [] );
            }

            result = result.filter( (item) => {
                if( item.l_extra && !Array.isArray(item.l_extra) && Array.isArray(item.l_extra.testId) ) {
                    return true;
                }
            } );

            for( let currActivity of result ) {
                currActivity.l_extra.testId.forEach(( testObj ) => {
                    if( testObj.head === data.title ) {
                        const labTagKey = labTagObjToStringKey(testObj, true, true);

                         if( !tagKeyMap[labTagKey] ) {
                             tagKeyMap[labTagKey] = true;
                             distinctLabDataTagsArr.push({title: testObj.head, unit: testObj.TestResultUnit, sampleNormalValueText: testObj.sampleNormalValueText, testLabel: testObj.testLabel});
                         }
                    }
                });
            }

            return callback( null, distinctLabDataTagsArr );
        }

        async function getDistinctMedDataTags( args ) {
            Y.log('Entering Y.doccirrus.api.tag.getDistinctMedDataTags', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.getDistinctMedDataTags');
            }
            const
                {user, data, callback} = args;

            let
                err,
                result,
                tagKeyMap = {},
                distinctMedDataTagsArr = [];

            if( !data || !data.title ) {
                return callback( `MISSING_TITLE` );
            }

            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        model: 'activity',
                                        action: 'get',
                                        query: {
                                            actType: { $in: Y.doccirrus.schemas.activity.medDataActTypes },
                                            'medData.type': data.title
                                        },
                                        options : {
                                            fields: {
                                                _id: 1,
                                                medData: 1
                                            }
                                        }
                                    } )
                                  );

            if( err ) {
                Y.log(`getDistinctMedDataTags: Error while querying MEDDATA activities from DB. Error: ${err.stack || err}`, "error", NAME);
                return callback( err );
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                return callback( null, [] );
            }

            for( let activity of result ) {
                for( let medDataObj of activity.medData ) {
                    if( medDataObj.type === data.title ) {
                        const medDataTagKey = createTagOrMedDataItemPropertyHash( medDataObj, true );

                        if( !tagKeyMap[medDataTagKey] ) {
                            tagKeyMap[medDataTagKey] = true;
                            distinctMedDataTagsArr.push({title: medDataObj.type, unit: medDataObj.unit, sampleNormalValueText: medDataObj.sampleNormalValueText});
                        }
                    }
                }
            }

            return callback( null, distinctMedDataTagsArr );
        }

        /**
         * Gets all the LABDATA tags from the TAG API (the manually created) plus all the tags from the labtest API (The imported ones)
         * @param args
         * @returns {Promise<*>}
         */
        async function getAllAvailableLabDataTags (args) {
            let
                err,
                result,
                queryTerm,
                finalResult,
                { user, query = {}, callback, options = {} } = args;

            Y.log('Entering Y.doccirrus.api.tag.getAllAvailableLabDataTags', 'info', NAME);

            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tag.getAllAvailableLabDataTags');
            }

            queryTerm = query.title || '';

            [err, result] = await formatPromiseResult( Promise.all([
                Y.doccirrus.mongodb.runDb({
                    action: 'get',
                    model: 'tag',
                    user,
                    options,
                    query: {
                        type: {
                            $in: ["LABDATA"]
                        },
                        title: {
                            $regex: queryTerm,
                            $options: 'i'
                        }
                    }
                }),
                Y.doccirrus.mongodb.runDb({
                    action: 'get',
                    model: 'labtest',
                    user,
                    options: {
                        ...options,
                        fields: {
                            head: 1
                        }
                    },
                    query: {
                        head: {
                            $regex: queryTerm,
                            $options: 'i'
                        }
                    }
                })
            ]));

            if( err ) {
                Y.log(`getAllAvailableLabDataTags: Error while fetching tag. Error: ${err.stack || err}`, "error", NAME);
                return callback(err);
            }

            finalResult = _.chain(result)
                .reduce((acc, apiResult) => {
                    apiResult.result.forEach(apiResultItem => {
                        if (apiResultItem.head) {
                            apiResultItem.title = apiResultItem.head;
                            delete apiResultItem.head;
                        }

                        acc.push(apiResultItem);
                    });

                    return acc;
                }, [])
                .uniq(function (apiResultItem) {
                    return apiResultItem.title;
                })
                .value();

            return callback(null, {
                count: finalResult.length,
                query,
                result: finalResult
            });
        }

        function removeAllAMTSTags( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.removeAllAMTSTags( args.user, false, args.callback );
        }


        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class tag
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).tag = {

            name: NAME,
            post,
            get,
            ['delete']( args ){
                deleteTag( args );
            },
            getMedLabData,
            updateTags,
            updateSubTypeTag,
            updateDocumentTag,
            updateCatalogTag,
            updateOnlyTag,
            updateMedData,
            deleteSubTypeTag,
            deleteDocumentTag,
            deleteCatalogTag,
            deleteOnlyTag,
            generateTagDeleteText,
            queuedProcessingTag,
            updateLabDataTag,
            deleteLabDataTag,
            getDistinctLabDataTags,
            getDistinctMedDataTags,
            getAllAvailableLabDataTags,


            // testing
            removeAllAMTSTags
        };

    },
    '0.0.1', {
        requires: [
            'activity-schema',
            'tag-schema',
            'v_meddata-schema',
            'meddata-api',
            'dccommonutils',
            'dccommonerrors'
        ]
    }
);
