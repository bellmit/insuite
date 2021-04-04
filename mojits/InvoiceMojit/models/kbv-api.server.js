/**
 * User: do
 * Date: 09/05/14  13:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'kbv-api', function( Y, NAME ) {

        /**
         * @module kbv-api
         * @requires patient-schema, dckrwvalidator
         */
        const {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        var async = require( 'async' ),
            _ = require( 'lodash' ),
            inspect = require( 'util' ).inspect;

        function publicInsurance( patient ) {
            return Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' );
        }

        function getInsurance( data, callback ) {
            Y.log( 'KBV API getInsurance ' + inspect( data ), 'debug', NAME );

            function patientCb( err, patient ) {
                if( err || !patient.length || !patient[0].insuranceStatus || !patient[0].insuranceStatus.length ) {
                    Y.log( 'KBV API patientCb:' + err || 'Patient Not Found', 'error', NAME );
                    callback( err || new Error( 'Insurance Not Found' ) );
                    return;
                }
                var insurance = publicInsurance( patient[0] );
                data.locationId = (insurance && insurance.locationId ) ? insurance.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                data.insurance = insurance;
                callback( null, data );
            }

            if( !data.user || !data.patientId ) {
                Y.log( 'KBV API getInsurance: Invalid Parameter', 'error', NAME );
                callback( new Error( 'Invalid Parameter' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: data.user,
                model: 'patient',
                query: {
                    _id: data.patientId
                }
            }, patientCb );
        }

        function getKV( data, callback ) {

            Y.log( 'KBV API getKV ' + inspect( data ), 'debug', NAME );

            function locationCb( err, location ) {

                if ( Y.doccirrus.auth.isISD() && !location.length ) {
                    //  Calling back without error, skip failure causing EXTMOJ-796
                    return callback( null, [] );
                }

                if( err || !location.length ) {
                    Y.log( 'KBV API locationCb:' + err || 'Location Not Found', 'error', NAME );
                    callback( err || new Error( 'Location Not Found' ) );
                    return;
                }

                function setKvCb( err, kv ) {
                    if( err ) {
                        Y.log( 'KBV API setKvCb:' + err, 'error', NAME );
                        callback( err );
                        return;
                    }
                    data.kv = kv;
                    callback( null, data );
                }

                Y.doccirrus.utils.getKvFromLocation( data.user, location[0], setKvCb );
            }

            var query = {};
            query._id = data.locationId;

            Y.doccirrus.mongodb.runDb( {
                user: data.user,
                model: Y.doccirrus.auth.isISD() ? 'mirrorlocation' : 'location',
                query: query
            }, locationCb );
        }

        function getCatalog( data, query, callback ) {

            Y.log( 'KBV API getCatalog ' + inspect( data ), 'debug', NAME );
            var passes = true;

            function catalogCb( err, catalog ) {
                if( err ) {
                    Y.log( 'KBV API catalogCb:' + err, 'error', NAME );
                    callback( err );
                    return;
                }
                data.catalog = catalog;
                callback( null, catalog );
            }

            query.kv = data.kv;

            if( 'function' === typeof data.transformQuery ) {
                passes = data.transformQuery( query, data );
            }
            if( false === passes ) {
                Y.log( 'KBV API patientCb: Missing Paramter', 'error', NAME );
                callback( new Error( 'Missing Paramter' ) );
                return;
            }

            Y.log( 'KBV API getCatalog query ' + inspect( query ), 'debug', NAME );

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: query,
                options: {
                    fields: {
                        _id: 0
                    }
                }
            }, catalogCb );
        }

        function getFromKvCatalog( params, query, callback ) {
            async.waterfall( [
                function( _cb ) {
                    Y.log( 'KBV API getFromKvCatalog ', 'debug', NAME );
                    if( !params.patientId || params.locationId ) {
                        Y.log( 'KBV API getFromCatalog use locationId instead of patientId to locate KV', 'debug', NAME );
                        _cb( null, params );
                        return;
                    }
                    getInsurance( params, _cb );
                },
                function( params, _cb ) {
                    getKV( params, _cb );
                },
                function( params, _cb ) {
                    getCatalog( params, query, _cb );
                }
            ], callback );
        }

        function getSDKVCatalogName( params, callback ) {
            async.waterfall( [
                function( _cb ) {
                    Y.log( 'KBV API getFromKvCatalog ', 'debug', NAME );
                    if( !params.patientId || params.locationId ) {
                        Y.log( 'KBV API getFromCatalog use locationId instead of patientId to locate KV', 'debug', NAME );
                        _cb( null, params );
                        return;
                    }
                    getInsurance( params, _cb );
                },
                function( params, _cb ) {
                    getKV( params, _cb );
                }, function( params, _cb ) {
                    var name, desc;
                    if( params.kv ) {
                        name = 'sdkv' + params.kv;
                    }
                    desc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: '_CUSTOM',
                        short: name
                    } );

                    _cb( null, desc && desc.filename );
                }
            ], callback );
        }

        function mapWithTable( table, kvArr, callback ) {

            if( !kvArr.length || !kvArr[0].kvValue || !kvArr[0].kvValue.length ) {
                callback( null, kvArr );
                return;
            }

            function tableCb( err, tableEntries ) {

                if( err ) {
                    Y.log( 'KBV API tableCb ' + err, 'debug', NAME );
                    callback( err );
                    return;
                }
                if( !tableEntries.length ) {
                    callback( null, kvArr );
                    return;
                }
                kvArr[0].kvValue = Y.Array.map( kvArr[0].kvValue, function( val ) {
                    var tableEntry = Y.Array.find( tableEntries, function( entry ) {
                        return entry.key === val;
                    } );
                    if( tableEntry ) {
                        return {
                            key: val,
                            value: tableEntry.value
                        };
                    }
                } );

                callback( null, kvArr );
            }

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: {
                    title: table,
                    key: {$exists: true}
                },
                options: {
                    fields: {
                        _id: 0,
                        key: 1,
                        value: 1
                    }

                }
            }, tableCb );
        }

        function transformKVX3Query( query, data ) {
            if( data.costCarrierBillingSection && data.costCarrierBillingGroup ) {
                query.kvAB = data.costCarrierBillingGroup;
                query.kvKTAB = data.costCarrierBillingSection;
            } else if( data.insurance && data.insurance.costCarrierBillingGroup && data.insurance.costCarrierBillingSection ) {
                query.kvAB = data.insurance.costCarrierBillingGroup;
                query.kvKTAB = data.insurance.costCarrierBillingSection;
            }
            return Boolean( query.kvAB && query.kvKTAB );
        }

        function getFromTable( params, query, callback ) {

            function addkvValue( err, entries ) {
                if( err ) {
                    Y.log( 'KBV API getFromTable addkvValue:', 'error', NAME );
                    callback( err );
                    return;
                }
                // must be sorted: MOJ-1936
                if( Array.isArray( entries ) ) {
                    entries.sort( function( a, b ) {
                        a = (a && a.key) || '';
                        b = (b && b.key) || '';
                        return (a < b ? -1 : ( a === b ? 0 : 1));
                    } );
                }
                callback( null, [
                    {kvValue: entries}
                ] );
            }

            query = query || {};
            params = params || {};
            if( params.table && !query.table ) {
                query.key = params.table;
            }
            if( params.key ) {
                query.key = params.key;
            }
            if( !query.key ) {
                query.key = {$exists: true};
            }
            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'catalog',
                query: query,
                options: {
                    fields: {
                        _id: 0,
                        key: 1,
                        value: 1
                    }
                }
            }, addkvValue );
        }

        function ifEmptyGetTable( table, catalog, callback ) {
            return function( err, result ) {

                var query = {
                    title: table
                };
                if( catalog ) {
                    query.catalog = catalog;
                }

                Y.log( 'KBV API ifEmptyGetTable table: ' + table + ' catalog: ' + catalog, 'debug', NAME );
                if( err ) {
                    Y.log( 'KBV API ifEmptyGetTable catalogCb ' + table + ' catalog: ' + catalog + err, 'error', NAME );
                    callback( err );
                    return;
                }
                if( !result || !result.length || !result[0].kvValue || !result[0].kvValue.length ) {
                    Y.log( 'KBV API ifEmptyGetTable result is empty get from' + table + ' catalog: ' + catalog, 'debug', NAME );
                    getFromTable( {}, query, callback );
                    return;
                }
                callback( null, result );
            };
        }

        function getCatalogSDKT() {
            var result = null,
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'SDKT'
                } );
            if( catalog ) {
                result = catalog.filename;
            }
            return result;
        }

        function getCatalogEBM() {
            var result = null,
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );
            if( catalog ) {
                result = catalog.filename;
            }
            return result;
        }

        async function validateBlScheins( args ) {
            Y.log( 'Entering Y.doccirrus.api.kbv.validateBlScheins', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.kbv.validateBlScheins' );
            }

            const getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel );
            const moment = require( 'moment' );
            const {user, params = {}, callback} = args;
            const locationIds = params.locationIds;
            const invoiceLogId = params.invoiceLogId;
            const quarter = params.quarter;
            const year = params.year;
            const blWarnings = [];

            if( !quarter || !year || !locationIds ) {
                return handleResult( Error( 'insufficent arguments' ), undefined, callback );
            }

            const invoiceQuarter = moment( `${quarter}/${year}`, 'Q/YYYY' );
            const startOfQuarter = invoiceQuarter.clone().startOf( 'quarter' );
            const twoQuartersBeforeStart = startOfQuarter.clone().subtract( 2, 'quarter' );

            let [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );
            if( err ) {
                Y.log( `validateBlScheins: could not get activity model: ${err.stack || err}`, "error", NAME );
                return handleResult( err, undefined, callback );
            }
            const query = {
                actType: 'SCHEIN',
                invoiceLogId: {$ne: invoiceLogId},
                status: {$nin: ['CANCELED']},
                locationId: {$in: locationIds},
                timestamp: {
                    $lt: startOfQuarter.toDate(),
                    $gte: new Date( '2020-01-01T00:00:00.000Z' )
                },
                fk4235Set: {$exists: true, $not: {$size: 0}},
                'fk4235Set.0.finishedWithoutPseudoCode': {$ne: true},
                'fk4235Set.0.pseudoGop': {$not: {$type: 'string'}},
                'fk4235Set.0.pseudoGopId': {$not: {$type: 'string'}}
            };

            let activityCursor = activityModel.mongoose.find( query, {
                patientId: 1,
                timestamp: 1,
                fk4235Set: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let schein;
            while( schein = await activityCursor.next() ) { // eslint-disable-line no-cond-assign

                let [err, result] = await formatPromiseResult( Y.doccirrus.api.activity.evaluateBL( {
                    user: args.user,
                    data: {
                        schein
                    },
                    options: {silent: true}
                } ) );

                if( err ) {
                    Y.log( `could not evaluate bl schein: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( !result.ok && moment( schein.timestamp ).isAfter( twoQuartersBeforeStart ) ) {
                    // KP2-966 Erinnerungsfunktion bei bewilligter Psychotherapie ohne Restkontingent aus einem Vorquartal
                    Y.log( `validateBlScheins:  check FINISHED BL schein in last two quarters [KP2-966]`, 'debug', NAME );
                    blWarnings.push( {
                        scheinId: schein._id.toString(),
                        text: Y.doccirrus.schemas.kbvlog.getBlPseudoGnrStatusMessage( 'KP2-966' ),
                        blPseudoGnrStatus: 'KP2-966'
                    } );
                } else if( result.ok && moment( schein.timestamp ).isBefore( twoQuartersBeforeStart ) ) {
                    // KP2-967 Erinnerungsfunktion bei bewilligter Psychotherapie mit Restkontingent und ohne APK seit zwei Quartalen
                    // check if there was an apk in between
                    let [err, nScheins] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'count',
                        query: {
                            actType: 'SCHEIN',
                            _id: {$ne: schein._id},
                            status: {$nin: ['CANCELED']},
                            $and: [
                                {invoiceLogId: {$exists: true}},
                                {invoiceLogId: {$ne: ''}}
                            ],
                            patientId: schein.patientId,
                            locationId: {$in: locationIds},
                            timestamp: {
                                $gte: schein.timestamp
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `validateBlScheins: could not check if there was an apk before this schein ${schein._id}: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( nScheins === 0 ) {
                        Y.log( `validateBlScheins: check UNFINISHED BL schein without APK KP2-967`, 'debug', NAME );
                        blWarnings.push( {
                            scheinId: schein._id.toString(),
                            text: Y.doccirrus.schemas.kbvlog.getBlPseudoGnrStatusMessage( 'KP2-967' ),
                            blPseudoGnrStatus: 'KP2-967'
                        } );
                    } else {
                        Y.log( `validateBlScheins: check UNFINISHED BL schein without APK KP2-967: SKIP found ${nScheins} APKs`, 'debug', NAME );
                    }

                } else {
                    Y.log( `validateBlScheins: nothing to do`, 'debug', NAME );
                }

            }

            return handleResult( null, blWarnings, callback );
        }

        /**
         * @class kbv
         * @constructor
         */
        Y.namespace( 'doccirrus.api' ).kbv = {
            /**
             * @property name
             * @type {String}
             * @default kbv-api
             * @protected
             */
            name: NAME,
            /**
             * Get handling of 'Tagtrennung'
             * @method tagtrennung
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {String}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             * @param {Function}    args.callback
             */
            tagtrennung: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.tagtrennung', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.tagtrennung');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                getFromKvCatalog( params, {
                    kvType: 'kvx1',
                    kvKey: '9400'
                }, callback );
            },
            /**
             * Get handling of 'DKM'
             * @method dkm
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             * @param {Function}    args.callback
             */
            dkm: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.dkm', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.dkm');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                getFromKvCatalog( params, {
                    kvType: 'kvx1',
                    kvKey: '9401'
                }, callback );
            },
            /**
             * Get handling of 'Übertragung Pseudo-GNR'
             * @method pseudognr
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {Object}          args.originalParams
             *                          locationId: {String} ID of the 'Betriebsstätte or
             *                          patientId: {String} ID of the patient
             * @param {Function}        args.callback
             */
            pseudognr: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.pseudognr', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.pseudognr');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;

                function mapPseudoGnrs( item ) {
                    return {seq: item['9410'], title: item['9411']};
                }

                function pseudoGnrCb( err, results ) {
                    var i, item, data = {gnrs: []};

                    if( err ) {
                        if ( Y.doccirrus.auth.isISD() ) {
                            Y.log( 'Skipping error check on mirror mojit, err: ', err, 'debug', NAME );
                            return callback( null );
                        }

                        callback( err );
                        return;
                    }

                    for( i = 0; i < results.length; i++ ) {
                        item = results[i];
                        if( Array.isArray( item.kvValue ) ) {
                            data.gnrs = item.kvValue.map( mapPseudoGnrs );
                        } else {
                            data.rule = item.kvValue.key;
                            data.text = item.kvValue.value;
                        }
                    }
                    callback( null, data );
                }

                getFromKvCatalog( params, {
                    kvType: 'kvx1',
                    $or: [
                        {kvKey: '9405'},
                        {kvKey: 'pseudognr_liste'}
                    ]
                }, pseudoGnrCb );
            },
            /**
             * Get allowed 'KTABS'
             * @method ktabs
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             * @param {Function}    args.callback
             */
            ktabs: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.ktabs', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.ktabs');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                getFromKvCatalog( params, {
                    kvType: 'kvx2',
                    kvKey: '4106'
                }, callback );
            },
            /**
             * Get allowed 'Scheinunterarten'
             * @method scheinunterarten
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             * @param {Function}    args.callback
             */
            scheinunterarten: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.scheinunterarten', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.scheinunterarten');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                getFromKvCatalog( params, {
                    kvType: 'kvx2',
                    kvKey: '4239'
                }, callback );
            },
            /**
             * Get allowed 'Abrechnungsgebiete'
             * @method abrechnungsgebiete
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {Object}          args.originalParams
             *                          locationId: {String} ID of the 'Betriebsstätte or
             *                          patientId: {String} ID of the patient
             * @param {Function}        args.callback {Function}
             */
            abrechnungsgebiete: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.abrechnungsgebiete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.abrechnungsgebiete');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                if( !params.scheinSubgroup ) {
                    Y.log( 'KBV API abrechnungsgebiete: Missing  scheinSubgroup Parameter', 'warn', NAME );
                    callback( new Error( 'Missing scheinSubgroup Parameter' ) );
                    return;
                }

                function abrechnungsgebietCb( err, abrechnungsgebiete ) {
                    if( err ) {
                        Y.log( 'KBV API abrechnungsgebietCb' + err, 'error', NAME );
                        callback( err );
                        return;
                    }
                    mapWithTable( 'abrechnungsgebiet', abrechnungsgebiete, callback );
                }

                getFromKvCatalog( params, {
                    kvType: 'kvx2',
                    kvKey: '4239',
                    kvSU: params.scheinSubgroup
                }, abrechnungsgebietCb );
            },
            /**
             * Get required 'Personenkreis / Untersuchungskategorie' information
             * @method personenkreis
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             *                      costCarrierBillingGroup: {String} Abrchnungsberech needed if only locationId is specified
             *                      costCarrierBillingSection: {String} ktab needed if only locationId is specified
             * @param {Object}      args.callback {Function}
             */
            personenkreis: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.personenkreis', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.personenkreis');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                params.transformQuery = transformKVX3Query;

                function catalogCb( err, results ) {
                    // frist, get sdkv catalog name for table
                    getSDKVCatalogName( params, function( _err, catalogName ) {
                        ifEmptyGetTable( 'T9402', catalogName, callback )( err || _err, results );
                    } );
                }

                getFromKvCatalog( params, {
                    kvType: 'kvx3',
                    kvKey: '9402'
                }, catalogCb );
            },
            /**
             * Get required 'SKT Zusatzangaben'
             * @method sktzusatz
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId: {String} ID of the 'Betriebsstätte or
             *                      patientId: {String} ID of the patient
             *                      costCarrierBillingGroup: {String} Abrchnungsberech needed if only locationId is specified
             *                      costCarrierBillingSection: {String} ktab needed if only locationId is specified
             * @param {Function}    args.callback {Function}
             */
            sktzusatz: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.sktzusatz', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.sktzusatz');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                params.transformQuery = transformKVX3Query;
                getFromKvCatalog( params, {
                    kvType: 'kvx3',
                    kvKey: '9403'
                }, callback );
            },
            /**
             * Get required 'Abrechnungsinformationen SKT'
             * @method sktinfo
             * @param {Object}          args
             * @param {Object}          args.user
             * @param {Object}          args.originalParams
             *                          locationId: {String} ID of the 'Betriebsstätte or
             *                          patientId: {String} ID of the patient
             *                          costCarrierBillingGroup: {String} Abrchnungsberech needed if only locationId is specified
             *                          costCarrierBillingSection: {String} ktab needed if only locationId is specified
             * @param {Function}        args.callback
             */
            sktinfo: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.sktinfo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.sktinfo');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                params.transformQuery = transformKVX3Query;
                getFromKvCatalog( params, {
                    kvType: 'kvx3',
                    kvKey: '9404'
                }, callback );
            },
            /**
             * Get allowed 'Scheinarten' and 'Scheinunterarten'
             * @method scheinarten
             * @param {Object}         args
             * @param {Object}         args.user
             * @param {Object}         args.originalParams
             *                         locationId: {String} ID of the 'Betriebsstätte or
             *                         patientId: {String} ID of the patient
             *                         costCarrierBillingGroup: {String} Abrchnungsberech needed if only locationId is specified
             *                         costCarrierBillingSection: {String} ktab needed if only locationId is specified
             * @param {Function}       args.callback
             */
            scheinarten: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.scheinarten', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.scheinarten');
                }
                var self = this,
                    params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;

                params.transformQuery = transformKVX3Query;

                function scheinunterartenCb( err, scheinunterarten ) {
                    if( err ){
                        Y.log( `Error in schein types ${err.message}`, 'error', NAME );
                    }

                    var scheinarten = {},
                        result = scheinunterarten.map( function( su ) {
                            scheinarten[su.kvSU[0]] = true;
                            return su.kvSU;
                        } );

                    Object.keys( scheinarten ).forEach( function( scheinart ) {
                        if( '0' === scheinart ) {
                            result.push( '0101' );
                        } else if( '2' === scheinart ) {
                            result.push( '0102' );
                        } else if( '3' === scheinart ) {
                            result.push( '0103' );
                        } else if( '4' === scheinart ) {
                            result.push( '0104' );
                        }
                    } );

                    mapWithTable( 'scheinart', [
                        {kvValue: result}
                    ], ifEmptyGetTable( 'scheinart', getCatalogEBM(), callback ) );
                }

                function scheinartenCb( err, scheinarten ) {
                    Y.log( 'KBV API scheinarten scheinartenCb ', 'debug', NAME );
                    if( err ) {
                        Y.log( 'KBV API scheinarten scheinartenCb ' + err, 'error', NAME );
                        callback( err );
                        return;
                    }

                    // if there is no complete list of "Scheinarten" and "Scheinunterarten" for this costCarrierBillingSection/costCarrierBillingGroup combination
                    // we get only the allowed "Scheiunterarten" and add the necessary "Scheinarten" by hand
                    if( !scheinarten.length ) {
                        args.callback = scheinunterartenCb;
                        delete params.costCarrierBillingSection;
                        delete params.costCarrierBillingGroup;
                        delete params.transformQuery;
                        self.scheinunterarten( args );
                    } else {
                        mapWithTable( 'scheinart', scheinarten, callback );
                    }
                }

                getFromKvCatalog( params, {
                    kvType: 'kvx3',
                    kvKey: '9406'
                }, scheinartenCb );
            },
            /**
             * Get prohibited 'Versicherungsarten'
             * @method versichertenarten
             * @method scheinarten
             * @param {Object}         args
             * @param {Object}         args.user
             * @param {Object}          args.originalParams
             *                         locationId: {String} ID of the 'Betriebsstätte or
             *                         patientId: {String} ID of the patient
             *                         costCarrierBillingGroup: {String} Abrchnungsberech needed if only locationId is specified
             *                         costCarrierBillingSection: {String} ktab needed if only locationId is specified
             * @param {Function}       args.callback
             */
            versichertenarten: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.versichertenarten', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.versichertenarten');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                params.transformQuery = transformKVX3Query;
                getFromKvCatalog( params, {
                    kvType: 'kvx3',
                    kvKey: '9407'
                }, callback );
            },
            /**
             * Get all 'Fachgruppen' or one specified by the optional key param
             * @method fachgruppe
             * @param {Object}      args
             * @param {Object}      args.user
             * @param  {Object}     args.originalParams {Object} optional params object
             *                      key: {String} return only the table entry with this key
             *@param {Function}     args.callback
             */
            fachgruppe: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.fachgruppe', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.fachgruppe');
                }
                var params = args.originalParams,
                    ebmDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'TREATMENT',
                        short: 'EBM'
                    } ),
                    callback = args.callback;
                params.user = args.user;
                getFromTable( params, {
                    title: 'fachgruppe',
                    catalog: ebmDesc && ebmDesc.filename // get table entries from non kv specific ebm catalog
                }, callback );
            },
            /**
             * Get all 'Gebührenordnungen' or one specified by the optional key param
             * @method gebuehrenordnung
             * @param {Object}      args
             * @param {Object}      args.user
             * @param  {Object}     args.originalParams {Object} optional params object
             *                      key: {String} return only the table entry with this key
             *@param {Function}     args.callback
             */
            gebuehrenordnung: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.gebuehrenordnung', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.gebuehrenordnung');
                }
                var params = args.originalParams,
                    callback = args.callback;
                params.user = args.user;
                getFromTable( params, {
                    title: 'gebuehrenordnung',
                    catalog: getCatalogSDKT()
                }, callback );
            },
            /**
             * Validates ICDs and GNRs against KBV "Kodierregelwerk" (KRW)
             * @method codeValidation
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
                     *              data: {Object} Data to validate:
                     *                  {
                     *                      scheinId: '',
                     *                      patientId: '',
                     *                      SUG: '01',                  // Scheinuntergruppe
                     *                      BAR: '086',                 // Fachgruppe
                     *                      diagnosis: [
                     *                          {
                     *                              ICD: 'Z49.2',       // ICD-Code
                     *                              DS: 'G',            // Diagnosesicherheit
                     *                              SL: 'X'             // Seitenlokalisation
                     *                          }
                     *                      ],
                     *                      treatments: [
                     *                          {
                     *                              GNR: '13611'        // GNR-Code
                     *                          }
                     *                      ]
                     *                  };
                     *              realtime: {Boolean} optional default: false if true only realtime flaged rules are tested
             *@param {Function}     args.callback
             */
            codeValidation: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.codeValidation', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.codeValidation');
                }
                var params = args.originalParams,
                    callback = args.callback;
                if( !params.data ) {
                    Y.log( 'codeValidation no data passed', 'error', NAME );
                    callback( Y.doccirrus.errors.http( 500 ) );
                    return;
                }
                function finalCb( err, result ) {
                    if( err ) {
                        Y.log( 'KRWValidation error occured ' + JSON.stringify( err ), 'error', NAME );
                        callback( Y.doccirrus.errors.rest( err.code || 500 ) );
                        return;
                    }
                    callback( null, result );
                }

                Y.doccirrus.KRWValidator.validate( require( '../autoload/krw/kbv.json' ), params.data, params.realtime || false, finalCb );
            },
            /**
             * Returns KV of the specified location.
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      locationId {String}
             * @param {Function}    args.callback
             */
            kvFromLocationId: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.kvFromLocationId', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.kvFromLocationId');
                }
                var params = args.originalParams,
                    user = args.user,
                    callback = args.callback;

                function kvCb( err, kv ) {
                    if( err ) {
                        Y.log( 'kbv apiu kvFromLocationId ' + err, 'error', NAME );
                        callback( err );
                        return;
                    }
                    callback( null, kv );
                }

                function locationCb( err, location ) {
                    if( err || !location[0] ) {
                        err = err || 'Location Not Found';
                        Y.log( 'kbv api kvFromLocationId ' + err, 'error', NAME );
                        callback( err );
                        return;
                    }
                    Y.doccirrus.utils.getKvFromLocation( user, location[0], kvCb );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    migrate: true,
                    query: {
                        _id: params.locationId || Y.doccirrus.schemas.location.getMainLocationId()
                    }
                }, locationCb );
            },

            /**
             * Find patient version related to a given GKV "Schein".
             * @param {Object}      args
             * @param {Object}      args.user
             * @param {Object}      args.originalParams
             *                      scheinId | schein
             *@param {Function}      args.callback
             *@return {Promise<*>}
             */
            scheinRelatedPatientVersion: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.scheinRelatedPatientVersion', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.scheinRelatedPatientVersion');
                }
                var moment = require( 'moment' ),
                    user = args.user,
                    params = args.originalParams || args.data,
                    scheinId = params && params.scheinId,
                    schein = params && params.schein,
                    rulePatientId = params && params.rulePatientId,
                    getAll = params && params.getAll,
                    caseFolderType = (params && params.caseFolderType) || 'PUBLIC',
                    callback = args.callback,
                    scheinDate;

                function publicInsurance( patient ) {
                    return Y.doccirrus.schemas.patient.getInsuranceByType(patient, caseFolderType);
                }

                function getInsuranceText( insurance ) {
                    var textArr = [];

                    textArr.push( insurance.insuranceName );
                    if( insurance.cardSwipe ) {
                        textArr.push( '(' + moment( insurance.cardSwipe ).format( 'DD.MM.YYYY' ) + ')' );
                    }
                    if( insurance.insuranceId ) {
                        textArr.push( insurance.insuranceId );
                    }
                    if( insurance.insuranceGrpId ) {
                        textArr.push( insurance.insuranceGrpId );
                    }
                    if( insurance.costCarrierBillingSection ) {
                        textArr.push( insurance.costCarrierBillingSection );
                    }
                    if( insurance.insuranceKind ) {
                        textArr.push( insurance.insuranceKind );
                    }
                    if( insurance.persGroup ) {
                        textArr.push( insurance.persGroup );
                    }
                    return textArr.join( ' ' );
                }

                function formatLatest( latest ) {
                    let latestPatient = JSON.parse( JSON.stringify( latest ) );
                    latestPatient._originalId = latestPatient._id;
                    latestPatient._id = latestPatient.patientId;
                    delete latestPatient.patientId;
                    return latestPatient;
                }

                function processSelected( err, patients ) {
                    if( err ) {
                        callback( err );
                        return;
                    }

                    if( patients.length ) {
                        return callback( null, formatLatest( patients[0] ) );
                    } else {
                        return callback( Y.doccirrus.errors.rest( '4052', 'Patient Not Found' ) );
                    }
                }

                function processPatients( err, patients ) {
                    var i, len, patient, lastPatient, latestPatient,
                        patientInsurance, lastPatientInsurance, distinctVersions = {}, scheinVersionText;

                    if( err ) {
                        callback( err );
                        return;
                    }

                    if( getAll ) {
                        for( i = 0, len = patients.length; i < len; i++ ) {
                            let p = patients[i];
                            patientInsurance = publicInsurance( p );
                            if( !patientInsurance ) {
                                continue;
                            }

                            let versionText = getInsuranceText( patientInsurance ),
                                patientVersionId = schein.patientVersionId && schein.patientVersionId.toString();

                            if( versionText ) {
                                p.versionText = versionText;
                                p.order = i;

                                if( patientVersionId === p._id.toString() ) {
                                    scheinVersionText = versionText;
                                    distinctVersions[versionText] = p;
                                }

                                if( scheinVersionText && scheinVersionText !== versionText || !scheinVersionText ) {
                                    distinctVersions[versionText] = p;
                                }
                            }
                        }
                    }

                    for( i = 0, len = patients.length; i < len; i++ ) {
                        patient = patients[i];
                        patient.versionSchein = schein.patientVersionId;

                        patientInsurance = publicInsurance(patient);
                        if( !patientInsurance ) {
                            continue;
                        }

                        if( 0 !== i ) {
                            lastPatient = patients[i - 1];
                            lastPatientInsurance = publicInsurance(lastPatient);
                            if( !lastPatientInsurance ) {
                                latestPatient = patient;
                                continue;
                            }
                            if( Y.doccirrus.schemas.patient.hasPublicInsuranceChanged( patientInsurance, lastPatientInsurance ) ) {
                                // Kassen- oder Statuswechsel
                                let patientTimestamp = moment( patient.timestamp );
                                if( scheinDate.isSame( patientTimestamp, 'day' ) || scheinDate.isAfter( patientTimestamp ) ) {
                                    latestPatient = patient;
                                } else {
                                    latestPatient = lastPatient;
                                    break;
                                }
                            } else {
                                latestPatient = patient;
                            }
                        } else {
                            latestPatient = patient;
                        }
                    }
                    if( getAll ) {
                        if( latestPatient ) {
                            let latestVersionText = getInsuranceText( publicInsurance( latestPatient ) );
                            if( latestVersionText !== scheinVersionText ) {
                                latestPatient.latestVersion = true;
                                latestPatient.order = patients.length;
                                distinctVersions[latestVersionText] = latestPatient;
                            }
                        }

                        let patientsWithInsurance = Object.keys( distinctVersions ).map( key => distinctVersions[key] ) || [];
                        patientsWithInsurance = _.sortBy( patientsWithInsurance, 'order' ).reverse();

                        return callback( null, patientsWithInsurance );
                    }

                    if( latestPatient ) {
                        return callback( null, formatLatest( latestPatient ) );
                    } else {
                        return callback( Y.doccirrus.errors.rest( '4052', 'Patient Not Found' ) );
                    }

                }

                function getPatients() {
                    var
                        patientId = (schein && schein.patientId && schein.patientId._id) || schein.patientId || rulePatientId,
                        scheinQuarterRange, query, cb;

                    scheinDate = moment( schein && schein.timestamp );
                    scheinQuarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( scheinDate.quarter(), scheinDate.year() );

                    if( schein.patientVersionId && !getAll ) {
                        query = {
                            _id: schein.patientVersionId
                        };
                        cb = processSelected;
                    } else {
                        query = {
                            patientId: patientId,
                            timestamp: {
                                $gte: scheinQuarterRange.start,
                                $lte: scheinQuarterRange.end
                            }
                        };
                        cb = processPatients;
                    }

                    Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patientversion',
                            query: query,
                            options: {
                                fields: params.fields,
                                sort: {
                                    timestamp: 1
                                }
                            }},
                        cb );
                }

                function scheinCb( err, scheins ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    if( (!scheins || !scheins[0]) && !rulePatientId ) {
                        callback( Y.doccirrus.errors.rest( '4500', 'Schein Not Found' ) );
                        return;
                    }
                    schein = scheins[0] || {};
                    getPatients();
                }

                if( scheinId ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {
                            _id: scheinId,
                            actType: {$in: ['SCHEIN', 'PKVSCHEIN']}
                        }
                    }, scheinCb );
                } else if( schein ) {
                    getPatients();
                } else {
                    return callback( Y.doccirrus.errors.rest( '4501', 'Missing Parameter' ) );
                }

            },
            /**
             * Get all KBV Certification Numbers.
             * @param {Object} args
             * @param {Function}    args.callback
             */
            certNumbers: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.certNumbers', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.certNumbers');
                }
                args.callback( null, Y.config.insuite.kbv );
            },

            /**
             * Check if bsnr number, lanr number pair is valid and listed in kbv catalog
             * @param {Object} args
             */
            checkLanrAndBsnr: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.checkLanrAndBsnr', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.checkLanrAndBsnr');
                }
                function catalogCb( err, results ) {
                    if( err ) {
                        args.callback( err );
                        return;
                    }
                    args.callback( null, {exists: Boolean( results && results.length )} );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        bsnr: args.query.bsnr,
                        lanrList: args.query.lanr
                    },
                    options: {
                        limit: 1
                    }
                }, catalogCb );
            },

            /**
             * Check if lanr number is listed in kbv catalog
             * @param {Object} args
             */
            checkLanr: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.checkLanr', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.checkLanr');
                }
                function catalogCb( err, results ) {
                    if( err ) {
                        args.callback( err );
                        return;
                    }
                    args.callback( null, {exists: Boolean( results && results.length )} );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        lanr: args.query.lanr
                    },
                    options: {
                        limit: 1
                    }
                }, catalogCb );
            },

            /**
             * Check if bsnr number is listed in kbv catalog
             * @param {Object} args
             */
            checkBsnr: function( args ) {
                Y.log('Entering Y.doccirrus.api.kbv.checkBsnr', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.kbv.checkBsnr');
                }
                function catalogCb( err, results ) {
                    if( err ) {
                        args.callback( err );
                        return;
                    }
                    args.callback( null, {exists: Boolean( results && results.length )} );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        bsnr: args.query.bsnr
                    },
                    options: {
                        limit: 1
                    }
                }, catalogCb );
            },
            validateBlScheins


        };

    },
    '0.0.1', {
        requires: [
            'patient-schema',
            'dckrwvalidator',
            'catalog-api',
            'kbvcon-api'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'activity-api',
            // 'dcauth',
            // 'dcerror',
            // 'dcmongodb',
            // 'dcutils',
            // 'kbvlog-schema',
            // 'location-schema'
        ]
    }
);
