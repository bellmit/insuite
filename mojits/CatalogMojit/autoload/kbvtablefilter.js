/**
 * User: do
 * Date: 09/04/14  19:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvtablefilter', function( Y, NAME ) {
        

        var
            async = require( 'async' ),
        // our singleton
            tableFilter;

        function KBVTableFilter() {
            Y.log( 'Init KBV Insurance Catalog Parser ', 'info', NAME );
        }

        function getInsurance( params, user, patientId, callback ) {
            function patientCb( err, patient ) {
                if( err || !patient.length || !patient[0].insuranceStatus || !patient[0].insuranceStatus.length ) {
                    callback( err || new Error( 'Insurance Not Found' ) );
                    return;
                }
                var insurance = patient[0].insuranceStatus[0];
                params.locationId = (insurance && insurance.locationId ) ? insurance.locationId : Y.doccirrus.schemas.location.getMainLocationId();
                params.insurance = insurance;
                callback( null, params );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                query: {
                    _id: patientId
                }
            }, patientCb );
        }

        function getKV( params, user, callback ) {

            function locationCb( err, location ) {

                if( err || !location.length ) {
                    callback( err || new Error( 'Location Not Found' ) );
                    return;
                }

                function setKvCb( err, kv ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    params.kv = "46" || kv;
                    callback( null, params );
                }

                Y.doccirrus.utils.getKvFromLocation( user, location[0], setKvCb );
            }

            var query = {};
            query._id = params.locationId;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                query: query
            }, locationCb );
        }

        function getCatalog( params, options, callback ) {
            function catalogCb( err, catalog ) {
                if( err || !catalog.length ) {
                    callback( err || new Error( 'catalog Not Found' ) );
                    return;
                }
                params.catalog = catalog;
                callback( null, params );
            }

            var query = {
                kv: params.kv,
                kvType: options.kvType
            };
            if( options.kvKey ) {
                query.kvKey = options.kvKey;
            }

            Y.doccirrus.mongodb.runDb( {
                user: options.user,
                model: 'catalog',
                query: query
            }, catalogCb );
        }

        KBVTableFilter.prototype.filter = function( data, options, callback ) {
            async.waterfall( [
                function( _cb ) {
                    var params = {};
                    Y.log( 'KBVTableFilter.filter patientId:' + options.patientId + ' locationId: ' + options.locationId, 'debug', NAME );
                    if( !options.patientId || options.locationId ) {
                        params.locationId = options.locationId;
                        _cb( null, params );
                        return;
                    }
                    getInsurance( params, options.restUser, options.patientId, _cb );
                },
                function( params, _cb ) {
                    getKV( params, options.restUser, _cb );
                },
                function( params, _cb ) {
                    getCatalog( params, options, _cb );
                }
            ], function( err, params ) {
                if( err ) {
                    callback( err );
                    return;
                }
                data = Y.Array.filter( data, function( tableEntry ) {
                    return options.filter( tableEntry, params );
                } );

                callback( null, data );
            } );
        };

        KBVTableFilter.prototype.filterMainScheinarten = function( results, allowed ) {
            return Y.Array.filter( results, function( scheinart ) {
                return Boolean( Y.Array.find( allowed, function( allowedScheinart ) {
                    if( scheinart.key.length === 2 ) {
                        var key = ('0' === scheinart.key[0]) ? '1' : scheinart.key[0];
                        return key === allowedScheinart.key[3];
                    } else {
                        return scheinart.key === allowedScheinart.key;
                    }
                } ) );
            } );
        };

        KBVTableFilter.prototype.filterScheinarten = function( results, user, restUser, params, callback ) {

            this.filter( results, {
                kvKey: '4239',
                kvType: 'kvx2',
                restUser: restUser,
                user: user,
                patientId: params.patientId,
                locationId: params.locationId,
                filter: function( tableEntry, params ) {
                    // remain scheinGruppen in tableEntrys
                    if( 2 < tableEntry.key.length ) {
                        return true;
                    }
                    var kvxEntry = params.catalog[0],
                        keys,
                        scheinUnterGruppe = Y.Array.find( kvxEntry.kvValue, function( val ) {
                            keys = Object.keys( val );
                            if( !keys.length ) {
                                return;
                            }
                            return (tableEntry.key === keys[0]);
                        } );
                    return (scheinUnterGruppe) ? true : false;
                }
            }, callback );

        };

        KBVTableFilter.prototype.filterAbrechnungsgebiete = function( results, user, restUser, params, callback ) {

            if( !params.patientId ) {
                callback( new Error( 'patientId Not Passed' ) );
                return;
            }

            if( !params.scheinSubgroup ) {
                callback( new Error( 'scheinSubgroup Not Passed' ) );
                return;
            }

            this.filter( results, {
                kvKey: '4239',
                kvType: 'kvx2',
                restUser: restUser,
                user: user,
                patientId: params.patientId,
                filter: function( tableEntry, _params ) {
                    var kvxEntry = _params.catalog[0],
                        keys, key, i, len, scheinUnterGruppe2, abrechnungsgebiete;
                    for( i = 0, len = kvxEntry.kvValue.length; i < len; i++ ) {
                        scheinUnterGruppe2 = kvxEntry.kvValue[i];
                        keys = Object.keys( scheinUnterGruppe2 );
                        key = (keys.length) ? keys[0] : undefined;
                        if( key === params.scheinSubgroup ) {
                            abrechnungsgebiete = scheinUnterGruppe2[key];
                            break;
                        }
                    }
                    if( !abrechnungsgebiete || !abrechnungsgebiete.length ) {
                        return false;
                    }
                    return Boolean( Y.Array.find( abrechnungsgebiete, function( abrechnungsgebiet ) {
                        return abrechnungsgebiet === tableEntry.key;
                    } ) );
                }
            }, callback );
        };

        KBVTableFilter.prototype.filterKVX3 = function( table, results, user, restUser, params, options, callback ) {
            this.filter( results, {
                kvType: 'kvx3',
                restUser: restUser,
                user: user,
                patientId: params.patientId,
                locationId: params.locationId,
                filter: function( tableEntry, _params ) {
                    var i, j, len, len_j, cat, rule,
                        ktab,
                        ktGruppe,
                        field4106;

                    if( params.costCarrierBillingSection ) {
                        ktab = params.costCarrierBillingSection;
                    } else if( _params.insurance && _params.insurance.costCarrierBillingSection ) {
                        ktab = _params.insurance.costCarrierBillingSection;
                    } else {
                        return false;
                    }

                    if( params.costCarrierBillingGroup ) {
                        ktGruppe = params.costCarrierBillingGroup;
                    } else if( _params.insurance && _params.insurance.costCarrierBillingGroup ) {
                        ktGruppe = _params.insurance.costCarrierBillingGroup;
                    } else {
                        return false;
                    }

                    if( !ktab || !ktGruppe ) {
                        return true;
                    }
                    for( i = 0, len = _params.catalog.length; i < len; i++ ) {
                        cat = _params.catalog[i].kvValue;
                        if( cat['2018'] && ktGruppe === cat['2018'].key && cat['2018']['4106'] ) {
                            field4106 = cat['2018']['4106'];
                            rule = undefined;
                            for( j = 0, len_j = field4106.length; j < len_j; j++ ) {
                                if( field4106[j].key === ktab ) {
                                    rule = field4106[j];
                                    break;
                                }
                            }
                            if( rule && rule[table] ) {
                                var b;
                                if( Array.isArray( rule[table] ) ) {
                                    b = -1 !== rule[table].indexOf( tableEntry.key );
                                } else {
                                    b = rule[table] === tableEntry.key;
                                }
                                return options.exclusive ? !b : b;
                            } else {
                                return options.onlyAllowed ? false : true;
                            }
                        }
                    }
                    return options.exclusive ? true : false;
                }
            }, callback );
        };

        KBVTableFilter.prototype.filterKVX1 = function( table, results, user, restUser, params, options, callback ) {
            this.filter( results, {
                kvType: 'kvx1',
                restUser: restUser,
                user: user,
                patientId: params.patientId,
                locationId: params.locationId,
                filter: function( tableEntry, params ) {
                    var i, len, catEntry;
                    for( i = 0, len = params.catalog.length; i < len; i++ ) {
                        catEntry = params.catalog[i];
                        if( '9401' === catEntry.kvKey && tableEntry.key === catEntry.kvValue ) {
                            return true;
                        }
                    }
                    return false;
                }
            }, callback );
        };

        // create our KBVTableFilter
        tableFilter = new KBVTableFilter();
        Y.namespace( 'doccirrus' ).kbvtablefilter = tableFilter;

    },
    '0.0.1', {requires: ['']}
);