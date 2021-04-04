/**
 * User: oliversieweke
 * Date: 21.12.18  14:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'tarmed-utils', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * This method streams the schein entries for a given tarmedlog. The handler function is
         * executed for each entry.
         *
         * @PUBLIC
         * @method handleScheinsInBatch
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :REQUIRED: Invoice log ID. Needed to fetch the corresponding invoice entries.
         * @param {Function} args.handler :REQUIRED: Handle function. The handler may be async and gets called for each patient with the params {tarmedlogId, tarmedlog, data: {_id, scheins}, user}.
         * @param {Object} args.user :REQUIRED: User making the validation request. The user object is used for the DB calls.
         * @param {Object} args.excludedScheinIds :REQUIRED: Do not include these scheins into invoicing
         * @param {Object} args.excludedPatientIds :REQUIRED: Do not include these patients into invoicing
         *
         * @returns {Promise} Resolving to undefined when no errors are thrown (results are handled by the handler).
         */

        async function handleScheinsInBatch( {user, tarmedlogId, excludedScheinIds = [], excludedPatientIds = [], medidataRejected, handler } ) {
            let error, scheins;
            const query = {
                invoiceLogId: tarmedlogId,
                type: 'schein',
                'data.patientId': {$nin: excludedPatientIds}
            };

            if( medidataRejected ) {
                query['data.invoiceRefId'] = {$nin: excludedScheinIds};
            } else {
                query['data._id'] = {$nin: excludedScheinIds};
            }

            [error, scheins] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'invoiceentry',
                query
            } ) );

            if( error || !Array.isArray(scheins) ) {
                Y.log( `SUMEX: handleScheinsInBatch(): Failed to get scheins for tarmedlog ${tarmedlogId}.\n${error && error.stack || error}`, 'error', NAME );
                throw error || new Y.doccirrus.commonerrors.DCError( 400, { message: `scheins not found` } );
            }

            //todo implement getWorkerCount from sumex-sol
            const batch = 20,
                scheinsLength = scheins.length,
                firstBatchScheins = scheins.splice( 0, batch );

            let promises = firstBatchScheins.map( async function( schein ) {
                [error] = await formatPromiseResult( handler( {tarmedlogId, schein, user, scheinsLength} ) );

                if( error ) {
                    Y.log( `SUMEX: handleScheinsInBatch(): Unexpected error in schein handler for schein ${schein._id} and tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                    throw error;
                }
                let nextSchein;
                while( nextSchein = scheins.shift() ) { // eslint-disable-line no-cond-assign
                    [error] = await formatPromiseResult( handler( {tarmedlogId, schein: nextSchein, user, scheinsLength} ) );
                    if( error ) {
                        Y.log( `SUMEX: handleScheinsInBatch(): Unexpected error in schein handler for schein ${nextSchein._id} and tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                        throw error;
                    }
                }
            } );

            [error] = await formatPromiseResult( Promise.all( promises ) );

            if( error ) {
                Y.log( `handleScheinsInBatch(): Unexpected error in handling scheins for tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                throw error;
            }
        }

        /**
         * Retries handling scheins for failed cases
         *
         * @PUBLIC
         * @method retryScheinsHandle
         *
         * @param {Object} args :REQUIRED:
         * @param {String} args.tarmedlogId :REQUIRED: Invoice log ID. Needed to fetch the corresponding invoice entries.
         * @param {Function} args.handler :REQUIRED: Handle function. The handler may be async and gets called for each patient with the params {tarmedlogId, tarmedlog, data: {_id, scheins}, user}.
         * @param {Object} args.user :REQUIRED: User making the validation request. The user object is used for the DB calls.
         * @param {Object} args.scheins :REQUIRED: scheins to retry
         *
         * @returns {Promise} Resolving to undefined when no errors are thrown (results are handled by the handler).
         */
        async function retryScheinsHandle( {user, tarmedlogId, scheins, handler} ) {
            //todo implement getWorkerCount from sumex-sol
            const batch = 20,
                firstBatchScheins = scheins.splice( 0, batch );
            let error;
            let promises = firstBatchScheins.map( async function( schein ) {
                [error] = await formatPromiseResult( handler( {tarmedlogId, schein, user} ) );

                if( error ) {
                    Y.log( `SUMEX: retryScheinsHandle(): Unexpected error in schein handler for schein ${schein._id} and tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                    throw error;
                }
                let nextSchein;
                while( nextSchein = scheins.shift() ) { // eslint-disable-line no-cond-assign
                    [error] = await formatPromiseResult( handler( {tarmedlogId, schein: nextSchein, user} ) );
                    if( error ) {
                        Y.log( `SUMEX: retryScheinsHandle(): Unexpected error in schein handler for schein ${nextSchein._id} and tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                        throw error;
                    }
                }
            } );

            [error] = await formatPromiseResult( Promise.all( promises ) );

            if( error ) {
                Y.log( `retryScheinsHandle(): Unexpected error in handling scheins for tarmedlog ${tarmedlogId}.\n${error.stack || error}`, 'error', NAME );
                throw error;
            }
        }

        /**
         * This method generates standard sumex error which will be displayed in invoicelogError modal and saved as
         * invoiceentry type = "error"
         *
         * @PUBLIC
         * @method generateSumexError
         *
         * @param {Object} args         :REQUIRED:
         * @param {String} args.text    :REQUIRED:
         * @param {Object} args.schein  :REQUIRED:
         * @param {String} args.link    :OPTIONAL:
         *
         * @returns {Object}
         */
        function generateSumexError( {text, schein = {}, link, errorCode} ) {
            const {locationId, patientId,caseFolderId} = (schein.data || {});
            return {
                source: "SUMEX",
                text,
                originalText: text,
                locationId,
                patientId,
                scheinId: schein._id,
                caseFolderId,
                link,
                ...( errorCode ? {errorCode} : {} )
            };
        }

        Y.namespace( 'doccirrus' ).tarmedUtils = {
            name: NAME,
            retryScheinsHandle,
            handleScheinsInBatch,
            generateSumexError
        };
    },
    '0.0.1', {requires: ['dcmongodb']}
);
