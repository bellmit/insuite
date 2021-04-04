/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'sysnum-schema', function( Y, NAME ) {

        /**
         * The DC Numbering and locking data schema
         *
         * Uses findAndModify which circumvents mongoose validation.
         * WARNING!!
         * ==>  This model HAS NO USER INPUT IN IT AT ALL.
         * ==>  All data in this model is entirely server side SYSTEM GENERATED (i.e. trusted)!
         * -->  Extend at your peril.
         * Should never be shared to the client!
         */


        var
        // ------- private 'constants'  -------
            moment = require( 'moment' ),
            db = require( 'dc-core' ).db,

        // semaphores are temporary values, that can be reset when the server restarts
        // they are otherwise also autonums (automatically incrementing, system wide
        // synchronised)
            SEMAPHORE_ID = '000000000000000000000000',
            SEMAPHORE_DID = '99990000',
            SEMAPHORE_VAL = -1,
            /*SCHED_SEMAPHORE_ID = '000000000000000000000001', // Scheduling semaphore*/
            REALIGN_SEMAPHORE_ID = '000000000000000000000001', // Realign semaphore
            MONGORESTORE_SEMAPHORE_ID = '000000000000000000000004',
            DATAIMPORT_SEMAPHORE_ID = '000000000000000000000005',
            CUST_SEMAPHORE_ID = '000000000000000000000002',
            RULE_SEMAPHORE_ID = '000000000000000000000008',
            PVSLOG_SEMAPHORE_ID = '000000000000000000000009',
            INSTOCK_SEMAPHORE_ID = '000000000000000000000010',
            STOCKDELIVERY_SEMAPHORE_ID = '000000000000000000000012',
            //RECEIPT_SEMAPHORE_ID = '000000000000000000000096',          //  like CUST_SEMAPHORE_ID, but for receipts

        // autonums do not lose their values on a system restart
        // they also automatically increment
            DC_CUSTOMER_NO_ID = '000000000000000000000102',
            AUTONUM_DID = '99999009',
            START_DC_CUSTOMER_NO = 1201,

        //inPACS sequence
            AUTONUM_INPACS_NO_ID = '000000000000000000000105',
            START_INPACS_NO = 1,
            DEFAULT_INPACS_COUNTER = {
                _id: AUTONUM_INPACS_NO_ID,
                partition: AUTONUM_DID,
                number: START_INPACS_NO
            },

        //DQ sequence
            AUTONUM_DQ_NO_ID = '000000000000000000000106',
            START_DQ_NO = 1,
            DEFAULT_DQ_COUNTER = {
                _id: AUTONUM_DQ_NO_ID,
                partition: AUTONUM_DID,
                number: START_DQ_NO
            },

        //DQS sequence
            AUTONUM_DQS_NO_ID = '000000000000000000000107',
            START_DQS_NO = 1,
            DEFAULT_DQS_COUNTER = {
                _id: AUTONUM_DQS_NO_ID,
                partition: AUTONUM_DID,
                number: START_DQS_NO
            },

        //DQS activeActive sequence
            AUTONUM_AA_sequence_NO_ID = '000000000000000000000108',
            START_AA_Sequence_NO = 1,
            DEFAULT_AA_Sequence_COUNTER = {
                _id: AUTONUM_AA_sequence_NO_ID,
                partition: AUTONUM_DID,
                number: START_AA_Sequence_NO
            },

        //
            AUTONUM_CASE_NUMBER_ID = '000000000000000000000501',
            START_CASE_NUMBER = 1,
            DEFAULT_CASE_NUMBER_COUNTER = {
                _id: AUTONUM_CASE_NUMBER_ID,
                partition: AUTONUM_DID,
                number: START_CASE_NUMBER
            },

        // AUTONUM_PATIENT_NO_ID_UNUSED = '000000000000000000000333',// MOJ-2920, remove this line if not really used
            AUTONUM_PATIENT_NO_ID = '000000000000000000000334',
            START_PATIENT_NO = 1,
            DEFAULT_QUEUE_ID = '__',
            DEFAULT_PATIENT_COUNTER = {
                _id: AUTONUM_PATIENT_NO_ID,
                partition: AUTONUM_DID,
                number: START_PATIENT_NO
            },

            /*
             *  Invoice autonum, one per location, default for default location
             */

            getInvoiceCounterDomain = function( locationId ) {
                return locationId + '-';
            },

            AUTONUM_INVOICE_NO_ID = '000000000000000000000444',
            START_INVOICE_NO = 1,
            DEFAULT_INVOICE_COUNTER = {
                _id: AUTONUM_INVOICE_NO_ID,
                partition: getInvoiceCounterDomain( Y.doccirrus.schemas.location.getMainLocationId() ),
                number: START_INVOICE_NO
            },

            /*
             *  Receipt autonum, one per location, default for default location
             */

            getReceiptCounterDomain = function( locationId ) {
                return locationId + '-receipt';
            },

            /*
             *  Receipts schemes autonum, one per location, default for default location
             */

            getReceiptsSchemeCounterDomain = function( locationId, cashbookId ) {
                return locationId + (cashbookId ? '-' + cashbookId : '') + '-receipts-schemes';
            },

            AUTONUM_RECEIPT_NO_ID = '000000000000000000000445',
            START_RECEIPT_NO = 1,
            DEFAULT_RECEIPT_COUNTER = {
                _id: AUTONUM_RECEIPT_NO_ID,
                partition: getReceiptCounterDomain( Y.doccirrus.schemas.location.getMainLocationId() ),
                number: START_RECEIPT_NO
            },

            AUTONUM_RECEIPTS_SCHEMES_NO_ID = '000000000000000000000446',
            START_RECEIPTS_SCHEMES_NO = 1,
            DEFAULT_RECEIPTS_SCHEMES_COUNTER = {
                _id: AUTONUM_RECEIPTS_SCHEMES_NO_ID,
                partition: getReceiptsSchemeCounterDomain( Y.doccirrus.schemas.location.getMainLocationId() ),
                number: START_RECEIPTS_SCHEMES_NO
            },

            AUTONUM_PADNEXT_ID = '000000000000000000000003',
            PANEXT_START = 0,
            PADNEXT_COUNTER = {
                _id: AUTONUM_PADNEXT_ID,
                partition: AUTONUM_DID,
                number: PANEXT_START
            },

            //Supplier order number counter
            SUPPLIER_ORDER_NUMBER_ID = '000000000000000000000011',
            START_SUPPLIER_ORDER_NUMBER = 1,
            SUPPLIER_ORDER_NUMBER_COUNTER = {
                _id: SUPPLIER_ORDER_NUMBER_ID,
                partition: AUTONUM_DID,
                number: START_SUPPLIER_ORDER_NUMBER
            },

            //inCash uatoincrement
            INCASH_NUMBER_ID = '000000000000000000000013',
            START_INCASH_NUMBER = 1,
            INCASH_NUMBER_COUNTER = {
                _id: INCASH_NUMBER_ID,
                partition: AUTONUM_DID,
                number: START_INCASH_NUMBER
            },

        //  Type and state of single, long-running invoice process per tenant
            INVOICEPROCESS_NAME_SEMAPHORE_ID = '000000000000000000000450',
            INVOICEPROCESS_PROGRESS_SEMAPHORE_ID = '000000000000000000000451',

            template = [
                {
                    _id: SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: REALIGN_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: MONGORESTORE_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: CUST_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: INVOICEPROCESS_NAME_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: INVOICEPROCESS_PROGRESS_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: DC_CUSTOMER_NO_ID,
                    partition: AUTONUM_DID,
                    number: START_DC_CUSTOMER_NO
                },
                {
                    _id: RULE_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: PVSLOG_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: DATAIMPORT_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: INSTOCK_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                },
                {
                    _id: STOCKDELIVERY_SEMAPHORE_ID,
                    partition: SEMAPHORE_DID,
                    number: SEMAPHORE_VAL
                }
            ].concat( [ DEFAULT_PATIENT_COUNTER, DEFAULT_CASE_NUMBER_COUNTER, DEFAULT_INVOICE_COUNTER, DEFAULT_RECEIPT_COUNTER, DEFAULT_RECEIPTS_SCHEMES_COUNTER, DEFAULT_INPACS_COUNTER, PADNEXT_COUNTER, DEFAULT_DQ_COUNTER, DEFAULT_DQS_COUNTER, DEFAULT_AA_Sequence_COUNTER ] ),

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {
                "root": {
                    "partition": {
                        "type": "String",
                        i18n: i18n( 'sysnum-schema.root.partition' ),
                        "-en": "partition",
                        "-de": "partition"
                    },
                    "number": {
                        "type": "Number",
                        i18n: i18n( 'sysnum-schema.root.number' ),
                        "-en": "number",
                        "-de": "number"
                    }
                }
            };

        // -------- Our Schema Methods and Hooks are defined here -------

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Static Helper Functions defined here -------

        function devNull() {
        }

        function getLock( Model, lockId, callback ) {
            var
                myCb = callback;
            //console.log( 'getting: ' + lockId );

            function makeResponse( err, doc ) {
                if( err ) {
                    myCb( err, null );
                } else {
                    if( !doc ) {
                        // the error matters only if the db has not been deleted externally
                        db.existsDb( Model.db.name, function( err, exists ) {
                            if( err ) {
                                myCb( err, false );
                                return;
                            }
                            if( exists ) {
                                // system is in an undefined state, bail out.
                                throw new Error( 'ERR: semaphore not initialised (programmer error)' );

                            } else { // the db has been deleted externally after the model was created.
                                Y.log( 'getLock: the database does not exist, dbName: ' + Model.db.name, 'warn', NAME );
                                myCb( null, false );
                            }
                        } );

                    } else if( 0 === doc.number ) {
                        myCb( null, true );
                    } else {
                        Model.findByIdAndUpdate( lockId, { $inc: { number: -1 } }, {}, function( err ) {
                            if( err ) {
                                Y.log( `getLock. Mongorestore has been already locked. Could not release own(extra) mongorestore lock. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                return myCb( err );
                            }
                            myCb( null, false );
                        } );

                    }
                }
            }

            Model.findByIdAndUpdate( lockId, {$inc: {number: 1}}, {new: true}, makeResponse );
        }

        function releaseLock( Model, lockId, callback ) {
            //console.log( 'releasing: ' + lockId );

            function makeResponse( err, doc ) {
                if( err ) {
                    callback( err, null );
                } else {
                    //console.dir( doc );
                    if( doc ) {
                        callback( null, doc.number );
                    }
                    else {
                        callback( null, null );
                    }
                }
            }

            Model.findByIdAndUpdate( lockId, {$inc: {number: -1}}, {new: true}, makeResponse );
        }

        function resetLock( Model, lockId, callback ) {
            //console.log( 'resetting: ' + lockId );
            Model.findByIdAndUpdate( lockId, {$set: {number: -1}}, {new: true}, callback );
        }

        function handleGetAutoIncNum( Model, autonum, callback, limit ) {
            limit = limit || 1;

            function repeatFn() {
                var
                    myModel = Model,
                    myObj = autonum,
                    myCb = callback;
                // try rest the lock for good measure,
                // the original caller should be long gone
                resetLock( Model, CUST_SEMAPHORE_ID, devNull );
                // restart the process of getting the number
                handleGetAutoIncNum( myModel, myObj, myCb, 2 );
            }

            function lockCb( err, isMine ) {
                if ( err ) {
                    Y.log( 'Error while locking sysnum: ' + JSON.stringify( err ), 'warn', NAME );
                }
                if( isMine ) {
                    Model.create( {_id: autonum.id, number: autonum['default'], partition: AUTONUM_DID }, devNull ); // eslint-disable-line
                    releaseLock( Model, CUST_SEMAPHORE_ID, devNull );
                } else {
                    Y.log( 'COLLISION: Could not acquire lock for autoincrement, backing off', 'info', NAME );
                    if( 1 === limit ) {
                        setTimeout( repeatFn, 600 );
                    }
                    else {
                        callback( 'Inconsistent MUTEX.', null );
                    }
                }
            }

            function autoIncCb( err, doc ) {
                if( err || !doc ) {
                    getLock( Model, CUST_SEMAPHORE_ID, lockCb );

                } else {
                    // simply send back via callback
                    callback( err, doc );
                }
            }

            if( !autonum.id || isNaN( autonum['default'] ) ) { // eslint-disable-line
                return callback( 'AutoIncNum bad parameters', null );
            }

            Model.findOneAndUpdate( {_id: autonum.id}, {$inc: {'number': 1}}, {new: true}, autoIncCb );
        }

        // this code can be simplified according to the example handleGetAutoInc() above TODO
        // see also comments in public function below...
        function handleGetNextTicket( Model, queueId, callback ) {
            var
                mycallback = callback,
                did = moment().format( 'YYYYMMDD' ) + '-' + queueId,
                monthRegex = new RegExp( '/' + moment().subtract( 1, 'months' ).format( 'YYYYMM' ) + '\\d{2}-/' );

            Y.log( 'Getting Ticket for did: ' + did );
            // check user has rights.... FUTURE

            // HELPER FUNCTIONS
            function lockSemaphore( cb ) {
                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: 1}}, {new: true}, cb );
            }

            function unlockSemaphore( cb ) {
                cb = cb || devNull;
                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: -1}}, {new: true}, cb );
            }

            function forceCreateDidAndCallback( startNumber ) {
                //console.log( '-- forcing create of DID ' + startNumber );
                // first callback to release client
                mycallback( null, {number: startNumber} );
                // write to DB
                (new Model( {partition: did, number: startNumber} )).save( devNull );
            }

            function handleFirstOfDay( err, lock ) {
                // then go ahead and deal directly with the DB
                Y.log( 'First of day', 'info', NAME );
                if( err ) {
                    // there is no semaphore!
                    Y.log( 'handleGetNextTicket: error getting semaphore: ' + JSON.stringify( err ), 'error', NAME );
                } else {
                    if( 0 < lock.number ) {
                        // recursive call... must eventually callback...
                        // locked... wait a minute, then retry
                        setTimeout( doGetNextDailyNumber, 500 );
                        // and unlock immediately...
                    } else {
                        // this will callback...
                        forceCreateDidAndCallback( 1 );
                        // and unlock immediately...
                    }
                }

                // unlock ignoring the return result
                unlockSemaphore();

                // delete records from previous month
                Model.remove( {partition: {$regex: monthRegex}}, devNull );
            }

            function handleStandardCase( err, doc ) {
                //console.log( '-- Entering standard case' );
                if( err ) {
                    Y.log( 'could not update next ticket: ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );

                } else if( !doc ) {
                    // on the first try, small chance of collision on first number
                    // try set the lock with find and modify, and create new + clean up
                    lockSemaphore( handleFirstOfDay );
                } else {
                    // simply send back via callback
                    callback( err, doc );
                }

            }

            function doGetNextDailyNumber() {
                // find and modify number by dateYMD
                Model.findOneAndUpdate( {partition: did}, {$inc: {'number': 1}}, {new: true}, handleStandardCase );
            }

            doGetNextDailyNumber();
        }

        /**
         * @param {Object}          user
         * @param {Object}          Model
         * @param {String}          locationId
         * @param {Function}       callback
         */
        function handleGetNextInvoiceNumber( user, Model, locationId, callback ) {
            var
                did = getInvoiceCounterDomain( locationId ),
                secondCall = false;

            Y.log( 'Getting Invoice number for did: ' + did );
            // check user has rights.... FUTURE

            // HELPER FUNCTIONS
            //            function lockSemaphore( cb ) {
            //                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: 1}}, cb );
            //            }

            //            function unlockSemaphore( cb ) {
            //                cb = cb || devNull;
            //                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: -1}}, cb );
            //            }

            // get the numbering scheme and create the counter based on those data
            function getDefaultCounter( _cb ) {
                var
                    defaultLocId = Y.doccirrus.schemas.location.getMainLocationId(),
                    defaultDid = Y.doccirrus.schemas.sysnum.getInvoiceCounterDomain( defaultLocId );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: {partition: defaultDid},
                    options: {limit: 1},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            _cb( err || 'no default invoice counter found' );
                        } else {
                            secondCall = true;
                            Model.findOneAndUpdate( {partition: defaultDid}, {$inc: {'number': 1}}, {new: true}, handleStandardCase );
                        }
                    }
                } );
            }

            // if the counter doesn't exist then try with the default counter, else return the new number
            function handleStandardCase( err, doc ) {
                if( err ) {
                    Y.log( 'could not update next invoice number: ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                } else if( (!doc || !doc.number) && !secondCall ) { // the counter does not exists
                    getDefaultCounter( callback );
                } else {
                    doc.number--;
                    callback( err, doc );
                }

            }

            function doGetNextInvoiceNumber() {
                Model.findOneAndUpdate( {partition: did}, {$inc: {'number': 1}}, {new: true}, handleStandardCase );
            }

            doGetNextInvoiceNumber();
        }

        /**
         * TODO: refactor this with handleGetNextReceiptNumber to deduplicate
         *
         * @param {Object}          user
         * @param {Object}          Model
         * @param {String}          locationId
         * @param {Function}        callback
         */
        function handleGetNextReceiptNumber( user, Model, locationId, callback ) {
            var
                did = getReceiptCounterDomain( locationId ),
                secondCall = false;

            Y.log( 'Getting Receipt number for did: ' + did );
            // check user has rights.... FUTURE

            // HELPER FUNCTIONS
            //            function lockSemaphore( cb ) {
            //                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: 1}}, cb );
            //            }

            //            function unlockSemaphore( cb ) {
            //                cb = cb || devNull;
            //                Model.findByIdAndUpdate( SEMAPHORE_ID, {$inc: {number: -1}}, cb );
            //            }

            // get the numbering scheme and create the counter based on those data
            function getDefaultCounter( _cb ) {
                var
                    defaultLocId = Y.doccirrus.schemas.location.getMainLocationId(),
                    defaultDid = Y.doccirrus.schemas.sysnum.getReceiptCounterDomain( defaultLocId );

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: {partition: defaultDid},
                    options: {limit: 1},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            _cb( err || 'no default receipt counter found' );
                        } else {
                            secondCall = true;
                            Model.findOneAndUpdate( {partition: defaultDid}, {$inc: {'number': 1}}, {new: true}, handleStandardCase );
                        }
                    }
                } );
            }

            // if the counter doesn't exist then try with the default counter, else return the new number
            function handleStandardCase( err, doc ) {
                if( err ) {
                    Y.log( 'could not update next receipt number: ' + JSON.stringify( err ), 'error', NAME );
                    callback( err );

                } else if( (!doc || !doc.number) && !secondCall ) { // the counter does not exists
                    getDefaultCounter( callback );
                } else {
                    doc.number--;
                    callback( err, doc );
                }

            }

            function doGetNextReceiptNumber() {
                Model.findOneAndUpdate( {partition: did}, {$inc: {'number': 1}}, {new: true}, handleStandardCase );
            }

            doGetNextReceiptNumber();
        }

        /**
         * Class Auth Schemas -- gathers all the schemas that the Authorization Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            defaultItems: template,

            /**
             * Utility function to reset all the semaphores in the
             * tenant for the user.
             *
             * @param {Object}          user            DC user
             * @param {Function}        callback        (err, result)  currently result is ignored and err is output as a warning.
             */
            resetSemaphores: function resetSemaphores( user, callback ) {
                callback = callback || function( err ) {
                    if( err ) {
                        Y.log( 'Error occurred while resetting semaphore: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                };
                function resetCb( err, result ) {
                    var i,
                        len;
                    if( err ) {
                        callback( err );
                        return;
                    }
                    len = result && result.length;
                    for( i = len - 1; i >= 0; i-- ) {
                        result[i].number = SEMAPHORE_VAL;
                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'sysnum',
                            action: 'put',
                            query: {
                                _id: result[i]._id
                            },
                            fields: Object.keys(result[i]),
                            data: Y.doccirrus.filters.cleanDbObject(result[i])
                        } );

                    }
                    callback();
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: { partition: SEMAPHORE_DID },
                    callback: resetCb
                } );
            },

            //  Numbering is not shared with the client.

            /**
             * Makes available N ticketing systems, each under a queue Id.
             * Also automatically initialises these if it not yet initialised, on first call.
             *
             * The ticketing system uses the DAY as its partitioning unit of time, i.e. each
             * day begins with a '1' for the first ticket.
             *
             * Normally, updates the number for today transactionally and returns it
             * as fast as possible, without locking.
             *
             * Ticket Queue ID allows one to run several ticketing systems per server. You
             * will only be issued tickets for your particular Queue ID.
             *
             * Tenant sensitive. I.e. each tenant can have N ticketing systems.
             *
             * @param {Object}          Model              Model to use.
             * @param {Object}          user  user must have rights for this action.
             * @param {String}         queueId            optional, a string identifying a Queue.
             * @param {Function}       callback           (err, {number: n})  either an error, or an object
             *                                            containing 'number' are returned.
             */
            getNextTicket: function( Model, user, queueId, callback ) {
                if( 'function' === typeof queueId ) {
                    callback = queueId;
                    queueId = DEFAULT_QUEUE_ID;
                }
                // check user

                // handle request
                handleGetNextTicket( Model.mongoose, queueId, callback );
            },
            DC_CUSTOMER_NO_ID: DC_CUSTOMER_NO_ID,
            START_DC_CUSTOMER_NO: START_DC_CUSTOMER_NO,
            DATAIMPORT_LOCK_ID: DATAIMPORT_SEMAPHORE_ID,
            /**
             * get the next unique patient number
             * @param {Object}          user
             * @param {Function}        callback
             */
            getNextPatientNo: function( user, callback ) {
                // check user

                function modelCb( err, model ) {
                    if( err ) {
                        callback( err );

                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_PATIENT_NO_ID, 'default': START_PATIENT_NO}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', modelCb );
            },

            getNextInPacsNo: function( user, callback ) {
                // check user

                function modelCb( err, model ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_INPACS_NO_ID, 'default': START_INPACS_NO}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', modelCb );
            },

            getNextDQNo: function( user, callback ) {

                function modelCb( err, model ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_DQ_NO_ID, 'default': START_DQ_NO}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, modelCb );
            },

            getNextDQSNo: function( user, callback ) {

                function modelCb( err, model ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_DQS_NO_ID, 'default': START_DQS_NO}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, modelCb );
            },

            getNextAASequenceNo: function( user, callback ) {
                function modelCb( err, model ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_AA_sequence_NO_ID, 'default': START_AA_Sequence_NO}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, modelCb );
            },
            /**
             * if there exists an invoice counter for the location then use it, else use the counter for default location
             * @param {Object}          user
             * @param {String}          locationId
             * @param {Function}        callback
             */
            getNextInvoiceNumber: function( user, locationId, callback ) {
                // check user
                function modelCb( err, model ) {
                    if( err ) {
                        callback( err );
                    } else {
                        handleGetNextInvoiceNumber( user, model.mongoose, locationId, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', modelCb );
            },

            /**
             * if there exists a receipt counter for the location then use it, else use the counter for default location
             * @param {Object}          user
             * @param {String}          locationId
             * @param {Function}        callback
             */
            getNextReceiptNumber: function( user, locationId, callback ) {
                // check user

                function modelCb( err, model ) {
                    if( err ) {
                        callback( err );

                    } else {
                        handleGetNextReceiptNumber( user, model.mongoose, locationId, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', modelCb );
            },

            getInvoiceCounterDomain: getInvoiceCounterDomain,
            getReceiptCounterDomain: getReceiptCounterDomain,
            getReceiptsSchemeCounterDomain: getReceiptsSchemeCounterDomain,

            /**
             * set the next patient number
             * @param {Object}          user
             * @param {Number}          newNumber
             * @param {Function}        callback
             */
            updatePatientCounter: function( user, newNumber, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    action: 'put',
                    fields: ['number'],
                    query: {_id: AUTONUM_PATIENT_NO_ID},
                    data: {number: newNumber, skipcheck_: true},
                    callback: callback
                } );
            },

            getPatientCounter: function getPatientCounter( user, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: {_id: DEFAULT_PATIENT_COUNTER._id},
                    callback: callback
                } );
            },

            updateCaseCounter: function( args ) {
                let { user, newNumber, callback } = args;
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    action: 'put',
                    fields: ['number'],
                    query: {_id: DEFAULT_CASE_NUMBER_COUNTER._id},
                    data: {number: newNumber, skipcheck_: true},
                    callback: callback
                } );
            },

            getCaseCounter: function getCaseCounter( args ) {
                let { user, callback } = args;
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    query: {_id: DEFAULT_CASE_NUMBER_COUNTER._id},
                    callback: callback
                } );
            },

            /**
             * In the next section, each type of Lock has its own function that can
             * be called.  Internally this is mapped to a semaphore ID.
             *
             * If true, you must release the lock, otherwise the resource
             * is permanently blocked.
             * @param {Object}      user
             * @param {Function}    callback  err, result  where result is Boolean.
             */
            getSchedulingLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for scheduling', 'info', NAME );
                    getLock( Model.mongoose, REALIGN_SEMAPHORE_ID, callback );
                } );
            },
            releaseSchedulingLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'unlocking sem for scheduling', 'info', NAME );
                    releaseLock( Model.mongoose, REALIGN_SEMAPHORE_ID, callback );
                } );
            },
            resetSchedulingLock: function( Model, callback ) {
                if( !callback ) {
                    callback = function() {
                    };
                }
                Y.log( 'resetting sem for scheduling', 'info', NAME );
                resetLock( Model.mongoose, REALIGN_SEMAPHORE_ID, callback );
            },
            /**
             * @param {Object}          user
             * @param {Function}        callback  err, result  where result is Boolean.
             */
            getMongorestoreLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for mongorestore', 'info', NAME );
                    getLock( Model.mongoose, MONGORESTORE_SEMAPHORE_ID, callback );
                } );
            },
            releaseMongorestoreLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'unlocking sem for mongorestore', 'info', NAME );
                    releaseLock( Model.mongoose, MONGORESTORE_SEMAPHORE_ID, callback );
                } );
            },
            resetMongorestoreLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'resetting sem for mongorestore', 'info', NAME );
                    resetLock( Model.mongoose, MONGORESTORE_SEMAPHORE_ID, callback );
                } );
            },
            incPadnextCounter: function( user, callback ) {

                function modelCb( err, model ) {
                    if( err ) {
                        callback( err );

                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: AUTONUM_PADNEXT_ID, 'default': PANEXT_START}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', modelCb );
            },

            setSemaphoreValue: function __setSemaphoreValue( user, _id, val, callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'sysnum',
                    action: 'put',
                    fields: ['number'],
                    query: { _id: _id },
                    data: { number: val, skipcheck_: true },
                    callback: callback
                } );
            },

            getSemaphoreValue: function __getSemaphoreValue( user, _id, callback ) {
                function onSemaphoreLoaded( err, result ) {
                    if ( err ) { return callback( err ); }
                    var retVal = SEMAPHORE_VAL;
                    if ( result && result[0] && result[0].number ) {
                        retVal = result[0].number;
                    }
                    callback( null, retVal );
                }

                Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'sysnum',
                    query: {'_id': _id},
                    callback: onSemaphoreLoaded
                } );
            },

            getRuleImportLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for rule import', 'info', NAME );
                    getLock( Model.mongoose, RULE_SEMAPHORE_ID, callback );
                } );
            },
            releaseRuleImportLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'unlocking sem for rule import', 'info', NAME );
                    releaseLock( Model.mongoose, RULE_SEMAPHORE_ID, callback );
                } );
            },
            resetRuleImportLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'reseting sem for rule import', 'info', NAME );
                    resetLock( Model.mongoose, RULE_SEMAPHORE_ID, callback );
                } );
            },

            getPvsLogLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for pvslog prcess', 'info', NAME );
                    getLock( Model.mongoose, PVSLOG_SEMAPHORE_ID, callback );
                } );
            },
            releasePvsLogLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'unlocking sem for pvslog prcess', 'info', NAME );
                    releaseLock( Model.mongoose, PVSLOG_SEMAPHORE_ID, callback );
                } );
            },
            resetPvsLogLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'reseting sem for pvslog prcess', 'info', NAME );
                    resetLock( Model.mongoose, PVSLOG_SEMAPHORE_ID, callback );
                } );
            },
            /**
             * @param {Object}          user
             * @param {Function}        callback  err, result  where result is Boolean.
             */
            getDataImportCombineLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'getDataImportCombineLock: locking sem for DataImport', 'info', NAME );
                    getLock( Model.mongoose, DATAIMPORT_SEMAPHORE_ID, callback );
                } );
            },
            releaseDataImportCombineLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'releaseDataImportCombineLock: unlocking sem for DataImport', 'info', NAME );
                    releaseLock( Model.mongoose, DATAIMPORT_SEMAPHORE_ID, callback );
                } );
            },
            getInstockLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for instock updating', 'info', NAME );
                    getLock( Model.mongoose, INSTOCK_SEMAPHORE_ID, callback );
                } );
            },
            releaseInstockLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        Y.log(`releaseInstockLock: Failed to release instock lock ${err}`, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( 'releaseInstockLock: reseting sem for instock updating', 'info', NAME );
                    resetLock( Model.mongoose, INSTOCK_SEMAPHORE_ID, callback );
                } );
            },
            getNextOrderNo: function( user, callback ) {
                function modelCb( err, model ) {
                    if( err ) {
                        return callback( err );
                    } else {
                        handleGetAutoIncNum( model.mongoose, { id: SUPPLIER_ORDER_NUMBER_COUNTER, 'default': START_SUPPLIER_ORDER_NUMBER}, callback );
                    }
                }

                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, modelCb );
            },
            getNextInCashNo: function( user, id, callback ) {
                id = id || INCASH_NUMBER_COUNTER;
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, ( err, model ) => {
                    if( err ) {
                        return callback( err );
                    }
                    handleGetAutoIncNum( model.mongoose, { id, 'default': START_INCASH_NUMBER}, callback );
                } );
            },
            getStockDeliveryLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'locking sem for stockdelivery updating', 'info', NAME );
                    getLock( Model.mongoose, STOCKDELIVERY_SEMAPHORE_ID, callback );
                } );
            },
            releaseStockDeliveryLock: function( user, callback ) {
                Y.doccirrus.mongodb.getModel( user, 'sysnum', true, function( err, Model ) {
                    if( err ) {
                        return callback( err );
                    }
                    Y.log( 'reseting sem for stockdelivery updating', 'info', NAME );
                    resetLock( Model.mongoose, STOCKDELIVERY_SEMAPHORE_ID, callback );
                } );
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito',
            'location-schema'
        ]
    }
);
