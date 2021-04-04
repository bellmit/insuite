/**
 * User: pi
 * Date: 05/10/16  11:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'basecontact-api', function( Y, NAME ) {

        /**
         * module basecontact-api
         */

        const {formatPromiseResult, handleResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

        /**
         * Default post method
         * @method post
         * @param {Object} args
         */
        async function post( args ) {
            let
                {user, data = {}, callback, options = {}} = args,
                v_supportcontantSchema = Y.doccirrus.schemas.v_supportcontact,
                basecontantSchema = Y.doccirrus.schemas.basecontact,
                comctl = Y.doccirrus.comctl,
                _data;

            switch( data.baseContactType ) {
                case basecontantSchema.baseContactTypes.SUPPORT:
                    _data = comctl.getObjectForSchema( {
                        schemaFields: Object.keys( v_supportcontantSchema.schema ),
                        data
                    } );
                    break;
                default:
                    _data = data;
            }

            _data = Y.doccirrus.filters.cleanDbObject( _data );

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'basecontact',
                user,
                data: _data,
                options
            } ) );

            if( err ) {
                Y.log( `post: Could not save new Base Contact: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Search for autocomplete
         * @method searchContact
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.term
         * @param {String} args.query.baseContactType
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        async function searchContact( args ) {
            const
                {user, query: {term = '', baseContactType, status, searchParam}, callback, options = {}} = args;
            let _query, _term, err, result;

            _term = term.split( ' ' );
            _query = {
                baseContactType,
                $or: [
                    {
                        firstname: {
                            $regex: _term[0] || '',
                            $options: 'i'
                        },
                        lastname: {
                            $regex: _term[1] || '',
                            $options: 'i'
                        }
                    },
                    {
                        firstname: {
                            $regex: _term[1] || '',
                            $options: 'i'
                        },
                        lastname: {
                            $regex: _term[0] || '',
                            $options: 'i'
                        }
                    }
                ]
            };

            if( baseContactType === Y.doccirrus.schemas.basecontact.baseContactTypes.VENDOR ) {
                _query = {
                    $and: [
                        {
                            institutionName: new RegExp( term, 'i' )
                        },
                        {
                            baseContactType
                        },
                        {
                            status
                        }
                    ]
                };

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'basecontact',
                    action: 'aggregate',
                    options,
                    pipeline: [
                        {
                            $lookup: {
                                from: 'formtemplates',
                                localField: 'defaultFormId',
                                foreignField: '_id',
                                as: 'form'
                            }
                        },
                        {
                            $match: _query
                        }
                    ]
                } ) );

                if( err ) {
                    Y.log( `searchContact: Failed to find base contact, query: ${_query}`, 'error', NAME );
                }

                return handleResult( err, result, callback );
            }

            /**
             * If bsnrs in args is given a basecontacts search for matching bsnr numbers is initiated and returns all
             * basecontacts with this bsnr. Only with the search bsnr in bsnrs array. Contacts is found if the searchterm is found in any
             * part of the bsnr in the bsnrs-array by regex.
             */
            if( searchParam === 'bsnrs' ) {
                const regularExpressionForBSNRBaseContactSearch = new RegExp( term, 'i' ) ;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'basecontact',
                    action: 'aggregate',
                    options,
                    pipeline: [
                        {
                            $match: {bsnrs: regularExpressionForBSNRBaseContactSearch}
                        },
                        {
                            $unwind: '$bsnrs'
                        },
                        {
                            $match: {bsnrs: regularExpressionForBSNRBaseContactSearch}
                        }
                    ]
                } ) );

                if( err ) {
                    Y.log( `searchContact: Failed to find base contact, query: ${_query}`, 'error', NAME );
                }

                return handleResult( err, result, callback );
            }
            /**
             * If officialNo in args is given a basecontacts search for matching officialNo numbers is initiated and returns all
             * basecontacts with this officialNo. Contacts is found if the searchterm is found in any
             * part of the officialNo by regex.
             */
            if( searchParam === 'officialNo' ) {
                const regularExpressionForLANRBaseContactSearch = new RegExp( term, 'i' ) ;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'basecontact',
                    action: 'aggregate',
                    options,
                    pipeline: [
                        {
                            $match: {officialNo: regularExpressionForLANRBaseContactSearch}
                        }
                    ]
                } ) );

                if( err ) {
                    Y.log( `searchContact: Failed to find base contact, query: ${_query}`, 'error', NAME );
                }

                return handleResult( err, result, callback );
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'basecontact',
                action: 'get',
                query: _query,
                options: options
            } ) );

            if( err ) {
                Y.log( `searchContact: Failed to find base contact, query: ${_query}`, 'error', NAME );
            }

            return handleResult( err, result, callback );
        }

        /**
         * Gets base contact which contains only support contact fields
         * @method getSupportContact
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} [args.options]
         * @param {Function} args.callback
         */
        function getSupportContact( args ) {
            let
                {user, query, options = {}, callback} = args,
                v_supportcontantSchema = Y.doccirrus.schemas.v_supportcontact,
                select = {};
            Object.keys( v_supportcontantSchema.schema ).forEach( key => {
                select[key] = 1;
            } );
            options.select = select;
            Y.doccirrus.api.basecontact.get( {
                user,
                options,
                query,
                callback
            } );
        }

        /**
         * Default get method
         * @method get
         * @param {Object} args
         */
        function getBaseContact( args ) {
            let
                {user, query, options, callback} = args,
                pipeline = [],
                communicationQuery = query.communications && query.communications.$regex || null,
                async = require( 'async' );

            if( args.originalParams && ( args.originalParams.forContactsTable || args.originalParams.forSelectContactModal ) ) {
                if( query.communications ) {
                    query.communications = {
                        $elemMatch: {
                            value: query.communications
                        }};
                }
                if( query.contacts ) {
                    pipeline = [
                        {
                            $match: {'$or': [{firstname: query.contacts}, {lastname: query.contacts}]}
                        },
                        {
                            $unwind: "$contacts"
                        },
                        {
                            "$lookup": {
                                "from": "basecontacts",
                                "localField": "contacts",
                                "foreignField": "_id",
                                "as": "contactsObjects"
                            }
                        }];
                }

                async.waterfall( [
                    function( done ) {
                        if( !query.contacts ) {
                            return setImmediate( done, null, [] );
                        }
                        let desiredResults = [];
                        Y.doccirrus.mongodb.runDb( {
                                action: 'aggregate',
                                pipeline: pipeline,
                                model: 'basecontact',
                                options: options,
                                user: user
                            },
                            function( err, res ) {
                                if( err ) {
                                    return done( err );
                                }
                                if( res && res.result ) {
                                    res.result.forEach( contact => {
                                        desiredResults.push( contact.contactsObjects[0]._id );
                                    } );
                                }
                                return done( null, desiredResults );
                            } );

                    },
                    function( contacts, done ) {

                        if( query.contacts ) {
                            query._id = {$in: contacts};
                            delete query.contacts;
                        }
                        async.series( [
                            function( next ) {
                                if( !query.expertise ) {
                                    return setImmediate( next );
                                }

                                function fachgruppeCb( err, entries ) {
                                    if( err ) {
                                        return next( err );
                                    }

                                    entries = entries && entries[0] && entries[0].kvValue || [];

                                    let
                                        filteredExpertise,
                                        filteredValue = query.expertise.$regex.toJSON(),
                                        oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                                        kbvSpecialities = (Array.isArray( entries ) ? entries.map( entry => ({
                                            id: entry.key,
                                            text: entry.value
                                        }) ) : []);

                                    oldExpertiseList.forEach( function( oldExpertise ) {
                                        kbvSpecialities.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                                    } );

                                    filteredValue = filteredValue.substring( 1, filteredValue.lastIndexOf( "/" ) );

                                    filteredExpertise = kbvSpecialities.filter( function( spec ) {
                                        return spec.text.toLowerCase().indexOf( filteredValue.toLowerCase() ) > -1;
                                    } );
                                    query.expertise = {};

                                    query.expertise.$in = filteredExpertise.map( function( item ) {
                                        return item.id;
                                    } );

                                    return next();
                                }

                                Y.doccirrus.api.kbv.fachgruppe( {
                                    user: user,
                                    originalParams: {},
                                    callback: fachgruppeCb
                                } );
                            },
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    action: 'get',
                                    model: 'basecontact',
                                    user,
                                    query,
                                    options
                                }, function( error, res ) {
                                    if( error ) {
                                        return next( error );
                                    }
                                    if( res && res.result && res.result[0] ) {
                                        if( args.originalParams && args.originalParams.forPhysicianTable ) {
                                            return next( null, res );
                                        }
                                        async.eachSeries( res.result, function( entry, innerNext ) {
                                            if( !Array.isArray( entry.contacts ) || !entry.contacts.length ) {
                                                entry.contacts = [];
                                                return innerNext();
                                            }
                                            Y.doccirrus.mongodb.runDb( {
                                                    action: 'get',
                                                    model: 'basecontact',
                                                    user,
                                                    query: {_id: {$in: entry.contacts}}
                                                },
                                                function( err, results ) {
                                                    if( err ) {
                                                        return innerNext( err );
                                                    }
                                                    if( results && results[0] ) {
                                                        entry.contacts = [];
                                                        results.forEach( function extractNames( contact ) {
                                                            entry.contacts.push( `${contact.lastname} ${contact.firstname}` );
                                                        } );
                                                    }
                                                    return innerNext();
                                                } );
                                        }, function( err ) {
                                            if( err ) {
                                                return next( err );
                                            }
                                            return next( null, res );
                                        } );
                                    } else {
                                        return next();
                                    }

                                } );
                            }
                        ], function( _err, result ) {
                            if( _err ) {
                                return done( _err );
                            }
                            return done( null, result && result.length && result[1] );
                        } );
                    }
                ], function( err, finalResults ) {
                    if( err ) {
                        return callback( err );
                    }
                    if( !finalResults ) {
                        finalResults = {
                            count: 0,
                            query: {},
                            result: []
                        };
                        return callback( null, finalResults );
                    }
                    if( finalResults.result && finalResults.result.length && communicationQuery ) {
                        // we display baseContacts' communications differently in searchContact modal and in baseContact table
                        // so we should filter out some results if proper communication value doesn't match regex from query
                        finalResults.result = finalResults.result.filter( ( baseContact ) => {
                            let
                                baseContactEmail = Y.doccirrus.schemas.simpleperson.getEmail( baseContact.communications ),
                                baseContactProperCommunication = baseContact.communications.filter( function( item ) {
                                    return item.preferred;
                                } ),
                                baseContactProperCommunicationValue;
                            if( baseContactProperCommunication && baseContactProperCommunication[0] ) {
                                baseContactProperCommunicationValue = baseContactProperCommunication[0].value || '';
                            } else {
                                baseContactProperCommunicationValue = (baseContact.communications[0] && baseContact.communications[0].value) ? baseContact.communications[0].value : '';
                            }
                            if( args.originalParams.forSelectContactModal ) {
                                // for selectContact modal we show only one email of baseContact
                                baseContactProperCommunicationValue = baseContactEmail && baseContactEmail.value;
                            }

                            return baseContactProperCommunicationValue && communicationQuery.test(baseContactProperCommunicationValue);
                        } );
                        finalResults.count = finalResults.result.length;
                    }
                    return callback( null, finalResults );
                } );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'basecontact',
                    user,
                    query,
                    options
                }, callback );

            }
        }

        /**
         * Returns full info about a contact and all related of the contacts
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getFullContactData( args ) {
            let
                {user, query, callback} = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.basecontact.get( {
                        user,
                        query,
                        options: {
                            lean: true,
                            limit: 1
                        },
                        callback( err, results ) {
                            next( err, results && results[0] );
                        }
                    } );
                },
                function( contact, next ) {
                    let
                        contactData = {
                            contact: contact,
                            contactsObj: []
                        };
                    if( contact && contact.contacts ) {
                        Y.doccirrus.api.basecontact.get( {
                            user,
                            query: {
                                _id: {$in: contact.contacts}
                            },
                            options: {
                                lean: true
                            },
                            callback( err, results ) {
                                contactData.contactsObj = results || [];
                                next( err, contactData );
                            }
                        } );
                    } else {
                        setImmediate( next, null, contactData );
                    }
                }
            ], callback );
        }

        /**
         *  Get basecontacts with PHYSICIAN expertiseText strings expanded
         *
         *  @param  args            {Object}
         *  @param  args.user       {Object}
         *  @param  args.query      {Object}
         *  @param  args.callback   {Function}
         *  @return                 {Promise}
         */

        async function getExpandedPhysicians( args ) {
            Y.log( 'Entering Y.doccirrus.api.basecontact.getExpandedPhysicians', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.getExpandedPhysicians' );
            }

            const
                getBasecontactP = promisifyArgsCallback( Y.doccirrus.api.basecontact.get ),
                callback = args.callback;

            let
                err,
                result,
                expandedContactArr = [],
                baseContactsArr,
                baseContact;

            [err, baseContactsArr] = await formatPromiseResult(
                getBasecontactP( {
                    user: args.user,
                    query: args.query
                } )
            );

            if( err ) {
                Y.log( `Could not load basecontacts: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            baseContactsArr = baseContactsArr.result ? baseContactsArr.result : baseContactsArr;

            //  (2) Expand base contacts with specialization
            async function expandSinglePhysician( contactId ) {
                function expandSingleWrap( resolve, reject ) {
                    Y.doccirrus.api.physician.getWithSpecializationString( {
                        user: args.user,
                        originalParams: {_id: contactId},
                        callback: onSpecializationExpanded
                    } );

                    function onSpecializationExpanded( error, res ) {
                        if( error ) {
                            return reject( error );
                        }
                        resolve( res );
                    }
                }

                return new Promise( expandSingleWrap );
            }

            for( baseContact of baseContactsArr ) {
                if( baseContact.baseContactType && 'PHYSICIAN' === baseContact.baseContactType ) {

                    [err, result] = await formatPromiseResult( expandSinglePhysician( baseContact._id ) );

                    if( err ) {
                        Y.log( `Could not expand specialization of physician ${baseContact._id}: ${err.stack || err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( !result || !Array.isArray( result ) || !result.length ) {
                        err = new Error( `Could not expand specialization string on contact ${baseContact._id}` );
                        Y.log( `${err}`, 'error', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    expandedContactArr.push( result[0] );
                } else {
                    expandedContactArr.push( baseContact );
                }
            }

            //  Done
            return handleResult( null, expandedContactArr, callback );
        }

        async function doesVendorHaveOrdersOrDeliveries( args ) {
            Y.log( 'Entering Y.doccirrus.api.basecontact.doesVendorHaveOrdersOrDeliveries', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.doesVendorHaveOrdersOrDeliveries' );
            }

            const {query = {}, callback, user} = args;
            let
                err,
                count,
                result;

            // 1. Check in stockOrders
            try {
                count = await _countOrdersOrDeliveries( query, user, 'stockorders' );
            } catch( err ) {
                Y.log( `_countOrdersOrDeliveries: Failed to get count orders. ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            if( count && count > 0 ) {
                result = {hasOrdersOrDeliveries: true};
                return handleResult( null, result, callback );
            } else {
                // 2. Check in stockDelivery
                try {
                    count = await _countOrdersOrDeliveries( query, user, 'stockdelivery' );
                } catch( err ) {
                    Y.log( `_countOrdersOrDeliveries: Failed to get count deliveries. ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }

                if( count && count > 0 ) {
                    result = {hasOrdersOrDeliveries: true};
                    return handleResult( null, result, callback );
                } else {
                    result = {hasOrdersOrDeliveries: false};
                    return handleResult( null, result, callback );
                }
            }

            /* Check stockorders or stockdeliveries if have items with basecontactId */
            async function _countOrdersOrDeliveries( query, user, model ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: model,
                        action: 'count',
                        query: {basecontactId: query.basecontactId}
                    } ) );

                if( err ) {
                    Y.log( `_countOrdersOrDeliveries:Failed to find orders or deliveries. ${err.stack || err}`, 'error', NAME );
                }

                return result;
            }
        }

        /*
         *  Publish the interface
         */

        Y.namespace( 'doccirrus.api' ).basecontact = {
            post( args ) {
                Y.log( 'Entering Y.doccirrus.api.basecontact.post', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.post' );
                }
                return post( args );
            },
            get( args ) {
                Y.log( 'Entering Y.doccirrus.api.basecontact.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.get' );
                }
                getBaseContact( args );
            },
            searchContact( args ) {
                Y.log( 'Entering Y.doccirrus.api.basecontact.searchContact', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.searchContact' );
                }
                return searchContact( args );
            },
            getSupportContact( args ) {
                Y.log( 'Entering Y.doccirrus.api.basecontact.getSupportContact', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.getSupportContact' );
                }
                getSupportContact( args );
            },
            getFullContactData( args ) {
                Y.log( 'Entering Y.doccirrus.api.basecontact.getFullContactData', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.basecontact.getFullContactData' );
                }
                getFullContactData( args );
            },
            doesVendorHaveOrdersOrDeliveries,
            getExpandedPhysicians
        };

    },
    '0.0.1', {requires: ['v_supportcontact-schema', 'basecontact-schema', 'dc-comctl']}
);
