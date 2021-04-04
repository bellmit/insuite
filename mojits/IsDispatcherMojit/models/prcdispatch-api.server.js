/*global YUI */

const
    mongodb = require( 'mongodb' ),
    ObjectId = mongodb.ObjectID,
    _ = require( 'lodash' ),
    async = require( 'async' ),
    {formatPromiseResult} = require( 'dc-core' ).utils;

YUI.add( 'prcdispatch-api', function( Y, NAME ) {

        function getModelData( user, model, query ) {
            return new Promise( function( resolve ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: query
                }, function( err, result ) {
                    if( err ) {
                        Y.log( `PRCDispatch lookup failed: ${err.stack || err}`, 'error', NAME );
                        resolve( [] );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        function upsertPRCDispatch( user, data, cb ) {
            var prcData = JSON.parse( JSON.stringify( data ) );

            Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'prcdispatch',
                    query: {'prcCustomerNo': prcData.prcCustomerNo}
                }, function( err, result ) {

                    if( err ) {
                        Y.log( `Failed to get prcdispatch: ${err.stack || err}`, 'error', NAME );
                    }

                    let employeesFromPayload = (prcData.employeeId || []).map( ( e ) => e.toString() );

                    if( result[0] ) {
                        let wasEmployeeId = result[0].employeeId || [],
                            wasOfficialNo = (result[0].officialNo || []),
                            newEmployeeId = [],
                            changedEmployeId = [];
                        wasOfficialNo.splice( wasEmployeeId.length, wasOfficialNo.length - wasEmployeeId.length );

                        (employeesFromPayload).forEach( ( id, ind ) => {
                            let index = wasEmployeeId.indexOf( id );

                            if( index !== -1 ) {
                                changedEmployeId.push( id );
                                wasOfficialNo[index] = (prcData.officialNo || [])[ind];
                            } else {
                                newEmployeeId.push( id );
                                wasEmployeeId.push( id );
                                wasOfficialNo.push( (prcData.officialNo || [])[ind] );
                            }
                        } );

                        if( (prcData.inActiveEmployeId || []).length > 0 ) { //removed employee
                            //prcData.employeeId = wasEmployeeId.filter( ( prcEmployee ) => prcData.inActiveEmployeId.indexOf( prcEmployee ) < 0 );
                            prcData.inActiveEmployeId.forEach( ( prcEmployee ) => {
                                let ind = wasEmployeeId.indexOf( prcEmployee.toString() );
                                if( ind >= 0 ) {
                                    wasEmployeeId.splice( ind, 1 );
                                    wasOfficialNo.splice( ind, 1 );
                                }
                            } );
                            prcData.employeeId = wasEmployeeId;
                        } else if( newEmployeeId.length > 0 ) { //added employee
                            prcData.employeeId = wasEmployeeId;
                        } else if( employeesFromPayload.length > 1 ) { // synchronization on prc boot
                            prcData.employeeId = employeesFromPayload;
                            wasOfficialNo = prcData.officialNo;
                            Y.doccirrus.mongodb.runDb( {
                                action: 'put',
                                model: 'mirroremployee',
                                user: user,
                                query: {_id: {$nin: employeesFromPayload}},
                                data: Y.doccirrus.filters.cleanDbObject( {isActive: false} ),
                                fields: 'isActive',
                                callback: ( err ) => {
                                    if( err ) {
                                        Y.log( `Failed to deactivete employee: ${err.stack || err}`, 'error', NAME );
                                    }
                                }
                            } );
                        } else { //updated employee
                            prcData.employeeId = wasEmployeeId;
                        }

                        prcData.officialNo = wasOfficialNo;

                        let wasLocationId = result[0].locationId || [],
                            wasCommercialNo = result[0].commercialNo || [];
                        (prcData.locationId || []).forEach( ( id, ind ) => {
                            let index = wasLocationId.indexOf( id );
                            if( index !== -1 ) {
                                wasCommercialNo[index] = prcData.commercialNo[ind];
                            } else {
                                wasLocationId.push( id );
                                wasCommercialNo.push( prcData.commercialNo[ind] );
                            }
                        } );

                        prcData.locationId = wasLocationId;
                        prcData.commercialNo = wasCommercialNo;

                        let wasPatientId = result[0].patientId || [];
                        (prcData.patientId || []).forEach( ( id, ind ) => {

                            let index = wasPatientId.indexOf( id );
                            if( index === -1 ) {
                                wasPatientId.push( id );
                            } else {
                                if( !prcData.patientGHD[ind] ) {
                                    wasPatientId.splice( index, 1 );
                                }
                            }
                        } );

                        prcData.patientId = wasPatientId;
                    }

                    delete prcData.mainLocation;
                    prcData = JSON.parse( JSON.stringify( prcData ) );
                    let prcDispatchData = {
                        user: user,
                        action: 'upsert', //(_id) ? 'put' : 'post',
                        model: 'prcdispatch',
                        data: Y.doccirrus.filters.cleanDbObject( prcData ),
                        query: {'prcCustomerNo': prcData.prcCustomerNo},
                        options: {omitQueryId: true},
                        fields: Object.keys( prcData ).filter( ( item ) => item !== '__v' && item !== 'customerId' )
                    };

                    Y.doccirrus.mongodb.runDb( prcDispatchData, function( err ) {
                        if( err ) {
                            Y.log( `Failed to add prcdispatch: ${err.stack || err}`, 'error', NAME );
                            cb( err, {} );
                        } else {
                            cb( null, {} );
                        }
                    } );

                }
            );
        }

        /**
         * @method getMirrorPatientsCount
         * @private
         *
         * group mirrorpatients count by prcCustomerNo filtered by prcCustomerNumbers
         *
         * @param {Object} user
         * @param {Array} prcCustomerNumbers                - list of prcCustomerNo
         *
         * @returns {Promise}
         */
        function getMirrorPatientsCount( user, prcCustomerNumbers ) {
            let pipeline = [
                {
                    $group: {
                        _id: {prcCustomerNo: '$prcCustomerNo'},
                        patientIds: {$push: '$_id'},
                        count: {$sum: 1}
                    }
                }
            ];
            if (prcCustomerNumbers && prcCustomerNumbers.length){
                pipeline.unshift( { $match: { prcCustomerNo: {$in: prcCustomerNumbers} } } );
            }

            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'aggregate',
                model: 'mirrorpatient',
                pipeline
            } );
        }

        /**
         * @method getEmployees
         * @private
         *
         * get PHYSICIAN mirroremployees filtered by prcCustomerNumbers
         *
         * @param {Object} user
         * @param {Array} prcCustomerNumbers                - list of prcCustomerNo
         *
         * @returns {Promise}
         */
        function getEmployees( user, prcCustomerNumbers ) {
            let query = {'type': 'PHYSICIAN'};
            if( prcCustomerNumbers ){
                query = {...query, prcCustomerNo: {$in: prcCustomerNumbers}};
            }

            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'mirroremployee',
                query
            } );
        }

        /**
         * @method getLocations
         * @private
         *
         * get mirrorlocations filtered by prcCustomerNumbers
         *
         * @param {Object} user
         * @param {Array} prcCustomerNumbers                - list of prcCustomerNo
         *
         * @returns {Promise}
         */
        function getLocations( user, prcCustomerNumbers ) {
            let query = prcCustomerNumbers ? { prcCustomerNo: {$in: prcCustomerNumbers} } : {};

            return Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'mirrorlocation',
                query
            } );
        }

        /**
         * @method getOnlinePrc
         * @private
         *
         * get active systems from communication layer
         *
         * @returns {Promise}                               - failed state not propagate
         */
        function getOnlinePrc() {
            return new Promise( function( resolve ) {
                Y.doccirrus.communication.getFreshOnlineServerList( function( err, list ) {
                    if( err ) {
                        //continue with other collections in case getting status failed
                        Y.log( `Error getting online PRC ${err.stack || err}`, 'warn', NAME );
                        return resolve( [] );
                    }
                    resolve( list );
                } );
            } );
        }

        function getLogic( op, num ) {
            switch( op ) {
                case '<':
                    return ( n ) => {
                        return (n < num);
                    };
                case '>':
                    return ( n ) => {
                        return (n > num);
                    };
                case '<=':
                    return ( n ) => {
                        return (n <= num);
                    };
                case '>=':
                    return ( n ) => {
                        return (n >= num);
                    };
                case '!=':
                case '<>':
                    return ( n ) => {
                        return (n !== num);
                    };
                default:
                    return ( n ) => {
                        return (n === num);
                    };
            }
        }

        function sendToPRC( user, prcCustomerNo, type, data, cb ) {
            if( data && !data.length ) {
                data = [data];
            }

            Y.doccirrus.communication.callExternalApiByCustomerNo( {
                api: 'dispatch.restore',
                user: user,
                data: {payload: JSON.stringify( {type: type, payload: data} )},
                query: {},
                useQueue: true,
                dcCustomerNo: prcCustomerNo,
                options: {},
                callback: function( err ) {
                    if( err ) {
                        Y.log( `ISD recovery of ${type} error: ${err.stack || err}`, 'error', NAME );
                        cb( err );
                    } else {
                        cb( null );
                    }
                }
            } );
        }

        function getMedia( user, media, next ) {
            media.fields_ = Object.keys( media ).filter( ( item ) => item !== '__v' );
            next( null, {type: 'media', obj: JSON.stringify( media )} );
        }

        function getFsFiles( user, media, options, next ) {
            let raw = options && true === options.raw;
            Y.doccirrus.media.gridfs.loadFileMeta( user, media._id + '', false, ( err, fileMeta ) => {
                if( err ) {
                    Y.log( `failed to get filemeta: ${err.stack || err}`, 'error', NAME );
                    next( err );
                } else if( fileMeta ) {
                    next( null, {
                        type: 'filemeta',
                        obj: raw ? fileMeta:  JSON.stringify( fileMeta )
                    } );
                } else {
                    next( null, {type: 'skip'} );
                }
            } );
        }

        function getFsChunks( user, media, options, next ) {
            let raw = options && true === options.raw;
            getModelData( user, 'fs.files', {filename: media._id} ).then( ( file ) => {
                if( file.length ) {
                    Y.doccirrus.media.gridfs.listFileChunks( user, media._id + '', false, ( err, fileChunks ) => {
                        if( err ) {
                            Y.log( `failed to get filemeta: ${err.stack || err}`, 'error', NAME );
                            next( err );
                        } else {
                            let chunks = [];
                            async.each( fileChunks, ( file, cb ) => {
                                Y.doccirrus.media.gridfs.loadChunk( user, file._id + '', false, ( err, sourceChunk ) => {
                                    if( err ) {
                                        cb( err );
                                    } else {
                                        chunks.push( Object.assign( sourceChunk, {data: sourceChunk.data.toString( 'base64' )} ) );
                                        cb();
                                    }
                                } );
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `failed to load chunks: ${err.stack || err}`, 'error', NAME );
                                } else {
                                    next( null, {
                                        type: 'filechunks',
                                        obj: raw ? chunks :  JSON.stringify( chunks )
                                    } );
                                }
                            } );
                        }
                    } );
                } else {
                    next( null, {type: 'skip'} );
                }
            } );

        }

        function restorePRCData( user, prcCustomerNo ) {
            Y.log( 'PRC restore process start', 'debug', NAME );

            async.waterfall( [
                    function restoreLocations( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirrorlocation',
                            query: {prcCustomerNo: prcCustomerNo},
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting locations: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    result = result.map( ( el ) => {
                                        if( true === el.isMainLocation ) {
                                            el._id = '000000000000000000000001';
                                        }
                                        return el;
                                    } );
                                    sendToPRC( user, prcCustomerNo, 'location', result, ( error ) => {
                                        return next( error );
                                    } );
                                }
                            }
                        } );
                    },
                    function restoreEmployees( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirroremployee',
                            query: {prcCustomerNo: prcCustomerNo},
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting employees: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    sendToPRC( user, prcCustomerNo, 'employee', result, ( error ) => {
                                        return next( error );
                                    } );
                                }
                            }
                        } );
                    },
                    function restorePatients( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirrorpatient',
                            query: {
                                prcCustomerNo: prcCustomerNo,
                                partnerIds: {
                                    $elemMatch: {
                                        "partnerId": Y.doccirrus.schemas.patient.DISPATCHER.INCARE
                                    }
                                }
                            },
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting patients: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    let
                                        patientIds = result.map( ( el ) => {
                                            return el._id.toString();
                                        } );
                                    sendToPRC( user, prcCustomerNo, 'patient', result, ( error ) => {
                                        return next( error, patientIds );
                                    } );

                                }
                            }
                        } );
                    },
                    function restoreCaseFolders( patientIds, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirrorcasefolder',
                            query: {patientId: {$in: patientIds}},
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting mirrorcasefolder: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    sendToPRC( user, prcCustomerNo, 'casefolder', result, ( error ) => {
                                        return next( error, patientIds );
                                    } );
                                }
                            }
                        } );
                    },
                    function restoreActivities( patientIds, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'mirroractivity',
                            query: {patientId: {$in: patientIds}},
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting activities: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    let
                                        activityIds = result.map( ( el ) => {
                                            return el._id.toString();
                                        } );

                                    sendToPRC( user, prcCustomerNo, 'activity', result, ( error ) => {
                                        return next( error, activityIds );
                                    } );
                                }
                            }
                        } );
                    },
                    function restoreDocuments( activityIds, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'document',
                            query: {activityId: {$in: activityIds}},
                            options: {lean: true},
                            callback: function( err, result ) {
                                if( err ) {
                                    Y.log( `Error getting documents: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    sendToPRC( user, prcCustomerNo, 'document', result, ( error ) => {
                                        return next( error, activityIds );
                                    } );
                                }
                            }
                        } );
                    },
                    function restoreMedia( activityIds, next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'media',
                            query: {ownerId: {$in: activityIds}},
                            options: {lean: true},
                            callback: function( err, medias ) {
                                if( err ) {
                                    Y.log( `Error getting media: ${err.stack || err}`, 'error', NAME );
                                    next( err );
                                } else {
                                    async.each( medias, ( media, next ) => {
                                        async.parallel( [
                                            getMedia.bind( null, user, media ),
                                            getFsFiles.bind( null, user, media, {} ),
                                            getFsChunks.bind( null, user, media, {} )
                                        ], ( err, result ) => {
                                            if( result && Array.isArray( result ) ) {
                                                async.each( result, ( res, cb ) => {
                                                    if( res.type === 'skip' ) {
                                                        return cb();
                                                    }
                                                    sendToPRC( user, prcCustomerNo, res.type, res, ( error ) => {
                                                        cb( error );
                                                    } );
                                                }, ( err ) => {
                                                    next( err );
                                                } );
                                            } else {
                                                Y.log( `Expected array ${JSON.stringify( result )}`, 'error', NAME );
                                                next( err || new Error( 'Array expected' ) );
                                            }

                                        } );
                                    }, ( err ) => {
                                        return next( err );
                                    } );

                                }
                            }
                        } );
                    },
                    function finish( next ) {
                        sendToPRC( user, prcCustomerNo, 'finish', {}, ( error ) => {
                            return next( error );
                        } );

                    }
                ],
                function done( err ) {
                    if( err ) {
                        Y.log( `Error during restore ${err.stack || err}`, 'error', NAME );
                    }

                    Y.doccirrus.mongodb.getModel( user, 'prcdispatch', ( error, model ) => {
                        if( error ) {
                            Y.log( `Error during set restore status ${error.stack || error}`, 'error', NAME );
                        } else {
                            model.mongoose.update(
                                {prcCustomerNo: prcCustomerNo},
                                {$set: {restoreStatus: ((err) ? 'ERROR' : 'DONE')}},
                                ( error ) => {
                                    if( error ) {
                                        Y.log( `Error during restore ${error.stack || error}`, 'error', NAME );
                                    } else {
                                        Y.log( 'PRC restore process successfully completed!', 'debug', NAME );
                                    }
                                }
                            );
                        }
                    } );
                }
            );

        }

        Y.namespace( 'doccirrus.api' ).prcdispatch = {

            name: NAME,

            /**
             * @method get
             * @public
             *
             * get prcdispatch documents with query, sorting and pagination
             * and extend elements with mirrorpatients count and mirrorlocations and mirroremployees
             *
             * @param {Object} user
             * @param {Object} options
             * @param {Object} query                            - common query by filters od by _id (for details)
             * @param {Object} originalParams
             * @param {String} originalParams.query             - additional query for patient count
             * @param {Function} callback
             *
             * @returns {Function} callback
             */
            get: async function GET( {user, query = {}, options = {}, originalParams: params, callback} ) {
                Y.log('Entering Y.doccirrus.api.prcdispatch.get', 'info', NAME);
                if (callback) {
                    callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.prcdispatch.get');
                }
                options = {...options, lean: true};

                let patientCountFilters = [];
                if( params && params.query ) {
                    if( params.query.patientsCount && params.query.patientsCount.hasOwnProperty( '$eq' ) ) {
                        let patientCountA = params.query.patientsCount.$eq.split( ';' );
                        patientCountA.forEach( ( el ) => {
                            if( el.trim() !== '' ) {
                                let match = /(<|>|<=|>=|!=|<>){0,1}\s*(\d+)/.exec( el );
                                if( !isNaN( parseInt( match[2], 10 ) ) ) {
                                    patientCountFilters.push( getLogic( match[1], parseInt( match[2], 10 ) ) );
                                }
                            }
                        } );
                    }
                }

                //remove additional filters from the main query
                if( query.patientsCount ) {
                    delete query.patientsCount;
                }

                let [ err, dispatches ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'prcdispatch',
                        query,
                        options
                    } )
                );
                if( err ) {
                    Y.log(`get: Error getting prcdispatch: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                let
                    dispatchesResult = (dispatches.result) ? dispatches.result : dispatches,
                    prcCustomeNumbers = dispatchesResult.map( el => el.prcCustomerNo );

                let res;
                [ err, res ] = await formatPromiseResult(
                    Promise.all( [
                        getMirrorPatientsCount( user, prcCustomeNumbers  ),
                        getEmployees( user, prcCustomeNumbers ),
                        getLocations( user, prcCustomeNumbers ),
                        getOnlinePrc()
                    ] )
                );
                if( err ){
                    Y.log(`get: Error getting additional data: ${err.stack || err}`, 'error', NAME);
                    return callback( err );
                }

                if( res[0] ) {
                    let patientCounts = res[0] && res[0].result;

                    // patient count per dispatch
                    patientCounts.forEach( cntEl => {
                        dispatchesResult = dispatchesResult.map( ( el ) => {
                            if( el.prcCustomerNo === cntEl._id.prcCustomerNo ) {
                                el.patientsCount = cntEl.count;
                                el.patientId = cntEl.patientIds || [];
                            }
                            return el;
                        } );

                    } );
                }

                if( res[1] && res[2] ) {
                    //unwind, project and group employees by prcCustomerNo
                    let employees = res[1].filter( e => e.prcCustomerNo ).map( ( employee ) => {
                        let empl = {
                            'firstname': employee.firstname || '',
                            'lastname': employee.lastname || '',
                            'lanr': employee.officialNo || '',
                            'locationId': null,
                            'prcCustomerNo': employee.prcCustomerNo
                        };
                        if( (employee.locations || []).length === 0 ) {
                            return empl;
                        } else {
                            // single employee is assigned to several locations - so clone it for each location
                            let unwind = [];
                            _.uniq( employee.locations, '_id' ).forEach(loc => {
                                let empl_copy = { ...empl };
                                empl_copy.locationId = loc._id.toString();
                                unwind.push( empl_copy );
                            } );
                            return unwind;
                        }
                    } );

                    let employeesPerPRC = _.groupBy( _.flatten( employees ), 'prcCustomerNo' );

                    // project and group locations by prcCustomerNo
                    let locations = res[2].filter( e => e.prcCustomerNo ).map( ( l )=> {
                        return {
                            'id': {
                                'id': l._id.toString(),
                                'name': l.locname || '',
                                'bsnr': l.commercialNo || '',
                                'isMainLocation': l.isMainLocation || false
                            },
                            'prcCustomerNo': l.prcCustomerNo
                        };
                    } );
                    let locationsPerPRC = _.groupBy( locations, 'prcCustomerNo' );

                    dispatchesResult = dispatchesResult.map( ( el ) => {
                        // get locations and employees for this prcDispatch by prcCustomerNo
                        let locations = locationsPerPRC[el.prcCustomerNo] || [],
                            employees = employeesPerPRC[el.prcCustomerNo] || [];

                        locations = locations.map(loc => {
                            if( loc.id.id && true === loc.id.isMainLocation ) {
                                loc.id.id = '000000000000000000000001';
                            }
                            return loc;
                        } );

                        if( employees.length ) {
                            locations.forEach( ( loc )=> {
                                loc.employee = employees.filter( empl => empl.locationId === loc.id.id );

                                //keep employees that not assigned to location
                                employees = employees.filter( empl => empl.locationId !== loc.id.id );
                            } );
                        }

                        //here employee array have only those that are not connected to any location
                        let
                            grp = _.groupBy( employees, 'locationId' ),
                            restLocations = [];

                        _.forEach( Object.keys( grp ), ( key ) => {
                            restLocations.push( {
                                id: {
                                    id: key.toString(),
                                    name: 'Not defined location',
                                    bsnr: '',
                                    isMainLocation: false
                                },
                                employee: grp[key]
                            } );
                        } );

                        el.locationsStructure = locations.concat( restLocations ) || [];
                        return el;
                    } );
                    // finally get following structure to show on ISD, DSCK
                    //      prcCustomerNo
                    //        locations
                    //          employees
                    //        {Not defined location}
                    //          employees
                }

                if( res[3] && res[3].length > 0 ) {
                    let
                        onlineMap = {};
                    res[3].forEach( prcData => {
                        onlineMap[prcData.dcCustomerNo] = true;
                    } );
                    dispatchesResult.forEach( ( entry ) => {
                        entry.online = onlineMap[entry.prcCustomerNo];
                    } );
                }

                if( patientCountFilters.length > 0 ) {
                    dispatchesResult = dispatchesResult.filter( el => {
                        let partial = true;
                        patientCountFilters.forEach(compareFunction => {
                            partial = ( partial && compareFunction( el.patientsCount || 0 ) );
                        } );
                        return partial;
                    } );
                    dispatches.result = dispatchesResult;
                    dispatches.count = dispatchesResult.length;
                }

                //sort by custom fields
                if( options && options.sort && options.sort.patientsCount ) {
                    dispatchesResult = dispatchesResult.sort( ( a, b ) => {
                        return (options.sort.patientsCount === 1) ? ((a.patientsCount || 0) - (b.patientsCount || 0))
                            : ((b.patientsCount || 0) - (a.patientsCount || 0));
                    } );
                    dispatches.result = dispatchesResult;
                }

                callback( null, dispatches );
            },

            // check for the allowed payload types
            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.prcdispatch.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prcdispatch.post');
                }
                var
                    localDBUser = args.user || Y.doccirrus.auth.getSUForLocal(),
                    data = args.data || args;

                upsertPRCDispatch( localDBUser, data, args.callback );
            },

            processLocation: function processLocation( user, locationId, tenantId ) {
                return new Promise( function( resolve ) {
                    //synchronization of the PRC locations
                    var id = locationId;

                    if( id.toString() === '000000000000000000000001' ) {
                        getModelData( user, 'mirrorlocation', {
                            prcCustomerNo: tenantId,
                            isMainLocation: true
                        } ).then( ( result ) => {
                            if( result && result[0] ) {
                                resolve( {id: result[0]._id.toString(), mainLocation: true} );
                            } else {
                                resolve( {id: new ObjectId(), mainLocation: true} );
                            }
                        } );
                    } else {
                        resolve( {id: id} );
                    }
                } );
            },

            upsertPRCDispatch: ( user, data, cb ) => {
                upsertPRCDispatch( user, data, cb );
            },

            restorePRCData: ( args ) => {
                Y.log('Entering Y.doccirrus.api.prcdispatch.restorePRCData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prcdispatch.restorePRCData');
                }
                let
                    callback = args.callback,
                    id = args.data.prcCustomerNo;

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'prcdispatch',
                    user: args.user,
                    query: {
                        prcCustomerNo: id,
                        $or: [
                            {restoreStatus: 'REQUESTED'},
                            {restoreStatus: 'ERROR'}
                        ]
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            callback( err );
                        } else {
                            if( result && result.length > 0 ) {
                                restorePRCData( args.user, id );
                            }
                            callback( null, result.length );
                        }
                    }
                } );

            },

            collect: async ( args ) => {
                Y.log('Entering Y.doccirrus.api.prcdispatch.collect', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prcdispatch.collect');
                }
                const { user, query, callback } = args,
                    notFoundOrError = Y.doccirrus.errors.rest( 404, '', true );

                if( !query || !query._id ){
                    Y.log( 'Required parameters not provided', 'error', NAME );
                    return callback( notFoundOrError );
                }

                let error, dispatch;
                [ error, dispatch ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'prcdispatch',
                    query: query,
                    user: user
                } )
                );
                if( error ) {
                    Y.log( `Error on getting prcdispatch ${error.stack || error}`, "error", NAME );
                    return callback( notFoundOrError );
                }
                if(!dispatch || !dispatch[0]){
                    Y.log( 'prcdispatch not found', "warn", NAME );
                    return callback( notFoundOrError );
                }

                dispatch = dispatch[0];

                let patients;
                [ error, patients ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'mirrorpatient',
                        query: { prcCustomerNo: dispatch.prcCustomerNo },
                        user: user
                    } )
                );
                if( error ) {
                    Y.log( `Error on getting mirrorpatients for prcdispatch ${error.stack || error}`, "warn", NAME );
                }
                patients = patients || [];

                let activitiesQuery = {}, activities;
                if( dispatch.locationId && dispatch.locationId.length ){
                    activitiesQuery.locationId = {$in: ['000000000000000000000001', ...dispatch.locationId] };
                }
                if( dispatch.employeeId && dispatch.employeeId.length ){
                    activitiesQuery.employeeId = {$in: dispatch.employeeId};
                }
                if( patients.length ){
                    activitiesQuery.patientId = {$in: patients.map( el => el._id )};
                }

                if( patients.length ){ //do not get activities without patient, to not get other activities with 00..01 location id
                    [ error, activities ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'mirroractivity',
                            query: activitiesQuery,
                            user: user
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting mirroractivities ${error.stack || error}`, "error", NAME );
                    }
                }
                activities = activities || [];

                let documents;
                if( activities.length ){ //do not get activities without patient, to not get other activities with 00..01 location id
                    [ error, documents ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'document',
                            query: {activityId: {$in: activities.map( el => el._id) } },
                            user: user
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting documents ${error.stack || error}`, "error", NAME );
                    }
                }

                let media;
                if( activities.length ){ //do not get activities without patient, to not get other activities with 00..01 location id
                    [ error, media ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'media',
                            query: {ownerId: {$in: activities.map( el => el._id) } }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting media ${error.stack || error}`, "error", NAME );
                    }
                }
                media = media || [];
                let filemetas = [],
                    filechunks = [],
                    result; //eslint-disable-line no-unused-vars
                if( media.length ){
                    [ error, result ] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            async.eachSeries( media,
                                (mediaObj, nextSerie) => {
                                    async.parallel( [
                                        getFsFiles.bind( null, user, mediaObj, {raw: true} ),
                                        getFsChunks.bind( null, user, mediaObj, {raw: true} )
                                    ], (err, result) => {
                                        filemetas = [...filemetas, ...(result || []).filter( el => el && 'filemeta' === el.type ).map( el => el.obj ) ];
                                        filechunks = [...filechunks, ...(result || []).filter( el => el && 'filechunks' === el.type ).map( el => el.obj ) ];
                                        nextSerie( err );
                                    } );
                                }, (err) => {
                                    if( err ){
                                        return reject(err);
                                    }
                                    resolve();
                                }
                            );
                         } )
                    );
                    if( error ) {
                        Y.log( `Error on getting files for prcdispatch ${error.stack || error}`, "warn", NAME );
                    }
                }

                let casefolders;
                if( patients.length ){
                    [ error, casefolders ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'mirrorcasefolder',
                            query: { patientId: {$in: patients.map( el => el._id )} }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting mirrorcasefolders for prcdispatch ${error.stack || error}`, "warn", NAME );
                    }
                }

                let locations;
                if( dispatch.locationId && dispatch.locationId.length ){
                    [ error, locations ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'mirrorlocation',
                            query: {_id: {$in: dispatch.locationId}, prcCustomerNo: dispatch.prcCustomerNo }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting mirrorlocations for prcdispatch ${error.stack || error}`, "warn", NAME );
                    }
                }

                let employees;
                if( dispatch.employeeId && dispatch.employeeId.length ){
                    [ error, employees ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'get',
                            model: 'mirroremployee',
                            query: {_id: {$in: dispatch.employeeId}, prcCustomerNo: dispatch.prcCustomerNo }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on getting mirroremployee for prcdispatch ${error.stack || error}`, "warn", NAME );
                        return callback( error );
                    }
                }

                callback( null, {
                    dispatcher: dispatch,
                    locations,
                    employees,
                    patients,
                    casefolders,
                    activities,
                    documents,
                    media,
                    filemetas,
                    filechunks
                } );
            },

            delete: async ( args ) => {
                Y.log('Entering Y.doccirrus.api.prcdispatch.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.prcdispatch.delete');
                }
                const { user, query, data: { forceDelete = false }, callback } = args,
                    restErr = Y.doccirrus.errors.rest,
                    notFoundOrError = restErr( 404, '', true );

                if( !Y.doccirrus.auth.memberOf( user, Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ) {
                    return callback( Y.doccirrus.errors.rest( 401, '', true ) );
                }
                if( !query || !query._id ){
                    Y.log( 'Required parameters not provided', 'error', NAME );
                    return callback( notFoundOrError );
                }

                let error, collectedData;
                [ error, collectedData ] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.prcdispatch.collect({
                            user,
                            query,
                            callback: (err, result ) => {
                                if( err ){
                                    return reject( err );
                                }
                                resolve( result );
                            }
                        });
                    } )
                );
                if( error ) {
                    Y.log( `Error on collecting dispatcher data: ${error.stack || error}`, "error", NAME );
                    return callback( restErr( 412, `Error on collecting dispatcher data: ${error.message}`, true ) );
                }
                collectedData = collectedData || {};

                let dispatch = collectedData.dispatcher,
                    patients = collectedData.patients || [],
                    activities = collectedData.activities || [];

                if( (patients.length || activities.length) && !forceDelete ){
                    //ask for activity deleting
                    return callback( null, {ok: 1, activitiesCount: activities.length, patients: patients.map( el => {
                        return {
                            name: `${el.lastname} ${el.firstname}`,
                            activitiesCount: activities.filter( act => act.patientId === el._id.toString() ).length
                        };
                    } ) } );
                }

                let result; //eslint-disable-line no-unused-vars
                if( collectedData ){
                    [ error, result ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'post',
                            model: 'archive',
                            data: {
                                identityId: user.identityId,
                                timestamp: new Date(),
                                payload: collectedData,
                                reason: 'delete',
                                skipcheck_: true
                            },
                            options: { entireRec: true }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on storing archive ${error.stack || error}`, "error", NAME );
                        return callback( restErr( 412, `Error on storing archive ${error.message}`, true ) );
                    }
                }

                function removeReporting( user, activity, callback ) {
                    let activityId = activity._id.toString();
                    Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'ACTIVITY', activityId );
                    callback( null, activity );
                }

                if(activities.length && true === forceDelete ){
                    let deleteResult; //eslint-disable-line no-unused-vars
                    [ error, deleteResult ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'mirroractivity',
                            query: {_id: {$in: activities.map( el => el._id )}},
                            user: user,
                            options: { override: true }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on deleting mirroractivities for prcdispatch ${error.stack || error}`, "error", NAME );
                        return callback( error );
                    }

                    let deleteAttachmentsResult; //eslint-disable-line no-unused-vars
                    [ error, deleteAttachmentsResult ] = await formatPromiseResult(
                        new Promise( ( resolve, reject ) => {
                            async.eachSeries(activities, (activity, nextSerie) => {
                                async.series( [
                                    ( next ) => { Y.doccirrus.api.mirroractivity.deleteAttachments( user, activity, next ); },
                                    ( next ) => { removeReporting( user, activity, next ); }
                                ], nextSerie );
                            }, (err, result) => {
                                if( err ){
                                    return reject(err);
                                }
                                resolve( result );
                            });
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on deleting mirroractivity attachments for prcdispatch ${error.stack || error}`, "error", NAME );
                        return callback( error );
                    }
                }

                let deletedPatients; //eslint-disable-line no-unused-vars
                [ error, deletedPatients ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'delete',
                        model: 'mirrorpatient',
                        query: { _id: (patients || []).map( el => el._id ) },
                        user: user,
                        options: { override: true }
                    } )
                );
                if( error ) {
                    Y.log( `Error on deleting patients for prcdispatch ${error.stack || error}`, "warn", NAME );
                }

                let deleteCasefolders; //eslint-disable-line no-unused-vars
                if( patients.length ){
                    [ error, deleteCasefolders ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'mirrorcasefolder',
                            query: { patientId: {$in: patients.map( el => el._id )} },
                            user: user,
                            options: { override: true }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on removing mirrorcasefolders for prcdispatch ${error.stack || error}`, "warn", NAME );
                        return callback( error );
                    }
                }

                let deleteLocations; //eslint-disable-line no-unused-vars
                if( dispatch.locationId && dispatch.locationId.length ){
                    [ error, deleteLocations ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'mirrorlocation',
                            query: {_id: {$in: dispatch.locationId}, prcCustomerNo: dispatch.prcCustomerNo },
                            user: user,
                            options: { override: true }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on removing mirrorlocations for prcdispatch ${error.stack || error}`, "warn", NAME );
                        return callback( error );
                    }
                }

                let deleteEmployees; //eslint-disable-line no-unused-vars
                if( dispatch.employeeId && dispatch.employeeId.length ){
                    [ error, deleteEmployees ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'mirroremployee',
                            query: {_id: {$in: dispatch.employeeId}, prcCustomerNo: dispatch.prcCustomerNo },
                            user: user,
                            options: { override: true }
                        } )
                    );
                    if( error ) {
                        Y.log( `Error on removing mirroremployee for prcdispatch ${error.stack || error}`, "warn", NAME );
                        return callback( error );
                    }
                }

                let deletedDispatcher; //eslint-disable-line no-unused-vars
                [ error, deletedDispatcher ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        action: 'delete',
                        model: 'prcdispatch',
                        query: {_id: dispatch._id },
                        user: user,
                        options: { override: true }
                    } )
                );
                if( error ) {
                    Y.log( `Error on removing prcdispatch ${error.stack || error}`, "warn", NAME );
                    return callback( error );
                }

                Y.log( `Dispatcher and all relations removed succesfully. ${JSON.stringify(dispatch)}`, 'debug', NAME );
                callback( null, {ok: 0} );
            }
        };

    },
    '0.0.1', {
        requires: ['dccommunication', 'prcdispatch-schema', 'v_utility-schema', 'archive-schema', 'dcauth']
    }
);
