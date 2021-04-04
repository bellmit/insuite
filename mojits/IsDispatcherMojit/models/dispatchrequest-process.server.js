/**MDpi
 * Date: 18/02/2016  14:34
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*jshint esnext:true */
/*global YUI, Promise */

var mongodb = require( "mongodb" ),
    ObjectId = mongodb.ObjectID,
    moment = require("moment" );
    //extractQuantity = new RegExp(/(\d{1,2}) x (.*)/,'i');

YUI.add( 'dispatchrequest-process', function( Y, NAME ) {
        /**
         * The DC Task data process definition
         *
         * @class DispatchRequest
         */

        function getModelData( user, model, query ) {
            return new Promise( function( resolve ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: model,
                    action: 'get',
                    query: query
                }, function( err, result ) {
                    if( err ) {
                        Y.log( 'Dispatch request verification ' + model + ' ' + err.message, 'error', NAME );
                        resolve( [] );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        function processFile( user, file, callback ) {
            var ObjectId = require( 'mongodb' ).ObjectID,
                targetActivityId = new ObjectId(),
                async = require( 'async' ),
                ownerCollection = 'activity',
                mimeTypeReg = /^data:(.+);base64,/,
                mimeType = '',
                activity,
                mediaId = '',
                documentId = '',
                from = 'casefile';

            mimeType = mimeTypeReg.exec( file.dataURL )[1];

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.media.upload64( {
                        user: user,
                        originalParams: {
                            ownerCollection: ownerCollection,
                            ownerId: targetActivityId,
                            source: file.dataURL,
                            name: file.filename,
                            fileName: file.filename
                        },
                        callback: next
                    } );
                },
                function( mediaObjects, next ) {
                    var
                        mime = mimeType && mimeType.toLowerCase(),
                        data = {
                            type: 'OTHER',
                            contentType: mime,
                            createdOn: moment().utc().toJSON(),
                            isEditable: false,

                            //accessBy: [ user.identityId ],
                            accessBy: [],
                            url: '/media/' + Y.doccirrus.media.getCacheFileName( mediaObjects, false ) + '?from=' + from,
                            mediaId: mediaObjects._id,
                            caption: file.filename
                        };
                    mediaId = mediaObjects._id;
                    data = Y.doccirrus.filters.cleanDbObject( data );
                    Y.doccirrus.mongodb.runDb( {
                        model: 'document',
                        action: 'post',
                        user: user,
                        data: data
                    }, next );
                }
            ], function( err, results ) {
                if( err ) {
                    Y.log( 'Error while updating activity:' + activity._id, 'error', NAME );
                    if( documentId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            action: 'delete',
                            model: 'document',
                            query: {
                                _id: documentId.toString()
                            }
                        } );
                    }
                    if( mediaId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'media',
                            action: 'delete',
                            query: {
                                _id: mediaId.toString()
                            }
                        } );
                    }
                    return callback( err );
                }
                callback( err, results );
            } );
        }

        function verifyRequestAttributes( user, data ) {
            return new Promise( function( resolve ) {

                var verificationMessage = "",
                    activityData = {},
                    locationIds;

                getModelData( user, 'mirrorlocation', {"commercialNo": data.bsnr} ).then( function( locations ) {

                    if( locations.length === 0 || !data.bsnr || data.bsnr.trim() === '' ) {
                        verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unresolved_BSNR' ) +
                                               " (" + data.bsnr + ")";
                        resolve( {message: verificationMessage, data: activityData} );
                    } else {
                        locationIds = locations.map( el => {
                            return ( true === el.isMainLocation ) ? '000000000000000000000001' : el._id.toString();
                        } );
                        getModelData( user, 'prcdispatch', {"prcCustomerNo": locations[0].prcCustomerNo} ).then( function( val ) {
                            if( val[0] && val[0].activeState === false ) {
                                verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unresolved_BSNR' ) +
                                                       " (" + data.bsnr + ")";
                                resolve( {message: verificationMessage, data: activityData} );
                                return;
                            }

                            let employeeQuery = {
                                prcCustomerNo: locations[0].prcCustomerNo,
                                officialNo: data.lanr,
                                "locations._id": {$in: locationIds }
                            };
                            if( data.employeeId ) {
                                employeeQuery._id = new ObjectId( data.employeeId );
                            }

                            getModelData( user, 'mirroremployee', employeeQuery ).then( function( val ) {
                                if( val.length === 0 || !data.lanr || data.lanr.trim() === '' ) {
                                    verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unresolved_LANR' ) +
                                                           " (" + data.lanr + ")";
                                } else {
                                    activityData.employeeId = val[0]._id;
                                    //get location from Employee
                                    let employeeLocations = val[0].locations.map( el => el._id.toString() );
                                    employeeLocations = employeeLocations.filter( el => locationIds.includes( el ) );
                                    if(!employeeLocations.length){
                                        verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unresolved_LANR' ) +
                                                               " (" + data.lanr + ").";
                                    } else {
                                        activityData.locationId = employeeLocations[0];
                                    }
                                }
                                getModelData( user, 'mirrorpatient', {
                                    prcCustomerNo: locations[0].prcCustomerNo,
                                    partnerIds: {$elemMatch: {
                                        "partnerId": Y.doccirrus.schemas.patient.DISPATCHER.INCARE,
                                        "patientId": data.patientId
                                    }}
                                }).then( function( val ) {
                                    if( !data.patientId || val.length === 0 || !val[0]._id ) {
                                        verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unresolved_PatientId' ) +
                                                               " (" + data.patientId + ")";
                                    } else if( !data.dispatchActivities || data.dispatchActivities.length !== 1 ) {
                                        verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.only_one_activity' );
                                    } else {
                                        activityData.patientId = val[0]._id;
                                        //verify structure and content of dispatchActivities
                                        data.dispatchActivities.forEach( function( activityRow ) {

                                            let prescriptionDate = moment(activityRow.prescriptionDate);
                                            if (prescriptionDate > moment().endOf('day')) {
                                                verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.future_prescription_date' );
                                            }

                                            if( activityRow.actType === 'PROCESS' ) {
                                                //TODO what about filneames ???
                                                if( !activityRow.fileName || !activityRow.fileContentBase64 ) {
                                                    verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.filename_missed' );

                                                    // || !(activityRow.activities[0].codePZN && activityRow.actType === 'PUBPRESCR')
                                                    // || !(activityRow.activities.codeHMV && activityRow.actType === 'PRESASSISTIVE'

                                                }
                                            } else if( !activityRow.activities || activityRow.activities.length === 0 ) {
                                                verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.malformed_activity' );
                                            } else {
                                                let codeCount = activityRow.activities.length || 0;

                                                switch( activityRow.actType ) {
                                                    case 'PRESASSISTIVE':
                                                        if( codeCount === 0 || codeCount > 3 ) {
                                                            verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.malformed_activity' );
                                                        }
                                                        break;
                                                    case 'PUBPRESCR':
                                                        if( codeCount === 0 || codeCount > 3 ) {
                                                            verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.malformed_activity' );
                                                        }
                                                        break;
                                                    default:
                                                        verificationMessage += "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.unknown_activity_type' ) +
                                                                               " (" + activityRow.actType + ")";

                                                }
                                            }

                                        } );

                                    }
                                    resolve( {message: verificationMessage, data: activityData} );
                                } );
                            } );
                        } );
                    }
                } );
            } );
        }

        function addNewTask( user, title, urgency, details, requestId, requestType ) {

            const extendTitle = title.replace( '{{actType}}', Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', requestType, 'i18n', '' ) );

            // creating new task
            var taskData = {
                //employeeId: "100000000000000000000003",
                allDay: true,
                alertTime: (new Date()).toISOString(),
                title: extendTitle,
                urgency: urgency,
                details: details,
                group: true,
                roles: [Y.doccirrus.schemas.patient.DISPATCHER.INCARE],
                dispatchRequestId: requestId,
                creatorName: Y.doccirrus.i18n( 'dispatchrequest.task.creatorName' )
            };

            var cleanData = Y.doccirrus.filters.cleanDbObject( taskData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: "task",
                action: 'post',
                data: cleanData
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'Failed to add task: ' + title + '\n\t' + err.message, 'error', NAME );
                }
            } );
        }

        function addNewActivity( user, data, activityRow, verify ) {
            return function( cb ) {
                var verifyOnly = verify || false;

                if( !verifyOnly ) {

                    if (data.timestamp) {
                        data.timestamp = moment( data.timestamp ).add(10,'ms');
                    } else {
                        data.timestamp = (new Date()).toISOString();
                    }
                    data = JSON.parse( JSON.stringify( data ) );

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "mirroractivity",
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    }, ( err, result ) => {
                        if( err ) {
                            activityRow.activityIds.push( null );
                        } else {
                            activityRow.activityIds.push( result[0] );
                            activityRow.activityId = result[0];
                            Y.log( 'Added activity ' + JSON.stringify( data ), 'debug' );
                        }
                        cb();
                    } );
                } else {
                    cb();
                }

            };
        }

        function addNewAssistive( user, data, activityRow, activity, verify ) {
            return function( cb ) {
                var local_data = JSON.parse( JSON.stringify( data ) ),
                    verifyOnly = verify || false;

                if( !activityRow.errorMessage ) {
                    activityRow.errorMessage = [];
                }

                var catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'HMV-GHD'
                } );

                if( catalogDesc && catalogDesc.filename && local_data.codePZN ) {
                    //if (local_data.codePZN) {
                    Y.doccirrus.mongodb.runDb( {
                        user: Y.doccirrus.auth.getSUForLocal(),
                        model: 'catalog',
                        query: {
                            pzn: local_data.codePZN,
                            catalog: catalogDesc.filename
                        },
                        options: {
                            lean: true
                        }
                    }, ( err, result ) => {

                        if( err ) {
                            Y.log( 'isDispatcher querying ASSISTIVE error: ' + err.message, 'error' );
                            activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.code_not_found' ) +
                                                           ' (' + local_data.codePZN + ').' );
                            activityRow.activityIds.push( null );
                            activity.valid = false;
                            cb();
                        } else if( !result || !result[0] ) {
                            Y.log( 'try to get ASSISTIVE actual data failed with error:' + err, 'error', NAME );
                            activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.code_not_found' ) +
                                                           ' (' + local_data.codePZN + ')' );
                            activity.valid = false;
                            activityRow.activityIds.push( null );
                            cb();
                        } else {
                            activity.valid = true;
                            Y.log( 'try to get ASSISTIVE actual data success ' + JSON.stringify( result ), 'debug', NAME );

                            local_data.assId = result[0].hmvNo || local_data.codeHMV;
                            local_data.code = result[0].pzn || local_data.codePZN;
                            local_data.assManufacturer = result[0].hersteller;
                            local_data.assCharacteristics = result[0].merkmale;
                            local_data.assDateAdded = result[0].aufnahmedatum;
                            local_data.assDateChanged = result[0].aenderungsdatum;
                            local_data.assManArticleId = result[0].artikelNo;
                            local_data.assVat = result[0].mwst;
                            local_data.assPrice = result[0].apoek && parseFloat( (result[0].apoek).toString().replace( ',', '.' ) );
                            local_data.catalogShort = 'HMV'; //null; //'HMV-GHD'
                            local_data.catalogRef = result[0].catalog; //catalogDesc.filename;

                            if( !verifyOnly ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: "mirroractivity",
                                    action: 'post',
                                    data: Y.doccirrus.filters.cleanDbObject( local_data )
                                }, ( err, result ) => {
                                    if( err ) {
                                        if( err.name === 'ValidationError' ) {
                                            if( err.errors.assDescription ) {
                                                activity.valid = false;
                                                activityRow.errorMessage.push( '\n' + err.errors.assDescription.message );
                                            }
                                        }
                                        activityRow.activityIds.push( null );
                                    } else {
                                        activityRow.errorMessage.push( '' );
                                        activityRow.activityIds.push( result[0] );
                                        if( result[0] ){
                                            activity.activityId.push( result[0] );
                                        }
                                        Y.log( 'Added assistive ' + JSON.stringify( local_data ), 'debug' );
                                    }
                                    cb();
                                } );
                            } else {
                                activityRow.errorMessage.push( '' );
                                cb();
                            }

                        }

                    } );
                } else {
                    Y.log( 'isDispatcher not all data set for quering ASSISTIVE', 'error' );
                    activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.code_not_found' ) +
                                                   ' (' + local_data.codePZN + ').' );
                    activityRow.activityIds.push( null );
                    cb();
                }

            };
        }


        function checkGHDCatalog (codePZN, callback) {
            var catalogDesc = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: '_CUSTOM',
                short: 'HMV-GHD'
            } );

            if( catalogDesc && catalogDesc.filename && codePZN ) {
                Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        pzn: codePZN,
                        catalog: catalogDesc.filename
                    },
                    options: {
                        lean: true
                    },
                    callback: callback
                } );
            } else {
                return callback ('catalog not found');
            }
        }



        function addNewMedication( user, data, activityRow, activity, verify ) {
            return function( cb ) {
                var local_data = JSON.parse( JSON.stringify( data ) ),
                    verifyOnly = verify || false;

                if( !activityRow.errorMessage ) {
                    activityRow.errorMessage = [];
                }

                if( local_data.phPZN ) {
                    Y.doccirrus.api.catalogusage.getMMIActualData( {
                        user: user,
                        query: {
                            pzn: local_data.phPZN,
                            bsnr: activityRow.bsnr || '',
                            lanr: activityRow.lanr || ''
                        },
                        callback: function( err, result ) {

                            if( err || !result || !result.title ) {
                                //MMI service is down or code not found - check GHD catalog
                                checkGHDCatalog (local_data.phPZN, (GHDerr, GHDresult) => {
                                    if (!GHDerr && GHDresult.length) {
                                        //code found lets process GHD code instead of MMI

                                        local_data.phPZN = GHDresult[0].pzn || local_data.codePZN;
                                        local_data.phIngr = [{ "code" : "-", "name" : "-" } ];
                                        local_data.phNLabel = GHDresult[0].bezeichnung;


                                        local_data.catalogShort = 'HMV-GHD'; //null; //'HMV-GHD'
                                        local_data.catalogRef = GHDresult[0].catalog;

                                        wrapAction();
                                        return;
                                    }

                                    // not all customers have mmi installed so this maybe fails if MMI is not running
                                    if( err ) {
                                        Y.log( 'try to get MMI actual data failed ' + err, 'error', NAME );
                                        activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.mmi_processing_failed' ) );
                                        activityRow.activityIds.push( null );
                                        activity.valid = false;
                                        return cb();
                                    }

                                    if( !result || !result.title ) {
                                        Y.log( 'PZN code not found (' + local_data.phPZN + ')', 'error', NAME );
                                        activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.code_not_found' ) +
                                                                       ' (' + local_data.phPZN + ')' );
                                        activityRow.activityIds.push( null );
                                        activity.valid = false;
                                        return cb();
                                    }

                                    Y.log('Could newer be accesed', 'error', NAME);

                                });
                            } else {
                                Y.log( 'MMI code found: ' + JSON.stringify( result ), 'debug', NAME );

                                Object.keys( result ).forEach( ( k ) => {
                                    local_data[k] = result[k];
                                } );
                                local_data.catalogShort = 'MMI';
                                local_data.catalogRef = 'MMI';
                                local_data.userContent = result.content;

                                wrapAction();
                            }

                        }
                    } );
                } else {
                    activityRow.errorMessage.push( "\n" + Y.doccirrus.i18n( 'dispatchrequest.verification.code_not_found' ) +
                                                   ' (' + local_data.phPZN + ').' );
                    activityRow.activityIds.push( null );
                    cb();
                }

                function wrapAction() {
                    activity.valid = true;
                    activityRow.errorMessage.push( "" );

                    if( !verifyOnly ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: "mirroractivity",
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( local_data )
                        }, ( err, result ) => {
                            if( err ) {
                                activityRow.activityIds.push( null );
                            } else {
                                activityRow.activityIds.push( result[0] );

                                if( result[0] ){
                                    activity.activityId.push( result[0] );
                                }

                                Y.log( 'Added medication ' + JSON.stringify( local_data ), 'debug' );
                            }
                            cb();
                        } );
                    } else {
                        cb();
                    }
                }

            };
        }

        function activityData( el, activityRow ) {
            var data = {
                employeeId: el.employeeId,
                locationId: el.locationId,
                patientId: el.patientId,
                actType: el.actType,
                timestamp: (new Date()).toISOString(),
                status: "VALID"
            };

            if (activityRow.prescriptionDate) {
                let prescriptionDate = moment(activityRow.prescriptionDate);
                if (prescriptionDate <= moment().endOf('day')) {
                    data.timestamp = prescriptionDate.hour(0).minute(5);
                }
            }

            if( el.filename ) {
                data.fileName = el.filename;
            }

            return data;
        }

        function removeActivities( user, listIds ) {
            return new Promise( function( resolve ) {

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: "mirroractivity",
                    action: 'delete',
                    query: {"_id": {"$in": listIds}}
                }, function() {//err, result
                    resolve();
                } );
            } );
        }

        function processAll( promises, cb ) {
            var p;
            if( promises.length === 0 ) {
                cb();
            } else {
                p = promises.shift();
                p( () => {
                    processAll( promises, cb );
                } );
            }
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        var ErrorMessage = '';

        function checkProcess( user, dispatchrequest, callback ) {
            ErrorMessage = '';

            //process file in advance
            if( dispatchrequest.dispatchActivities && dispatchrequest.dispatchActivities[0] && dispatchrequest.dispatchActivities[0].actType === 'PROCESS' &&
                dispatchrequest.dispatchActivities[0].fileName && dispatchrequest.dispatchActivities[0].fileContentBase64 ) {

                processFile( user, {
                        name: dispatchrequest.dispatchActivities[0].fileName,
                        filename: dispatchrequest.dispatchActivities[0].fileName,
                        dataURL: dispatchrequest.dispatchActivities[0].fileContentBase64
                    }, ( err, result ) => {
                        if( err ) {
                            Y.log( "ISD Adding file error:  " + JSON.stringify( err ), 'error', NAME );
                        } else {

                            dispatchrequest.dispatchActivities[0].fileDocumentId = result[0];

                        }
                        verifyRequest( user, dispatchrequest, callback );
                    }
                );
            } else {
                verifyRequest( user, dispatchrequest, callback );
            }

        }

        function verifyRequest( user, dispatchrequest, callback ) {
            //dispatchrequest = JSON.parse(JSON.stringify(dispatchrequest));
            // Request marked as invalid
            if( dispatchrequest.status === 3 ) {
                callback( null, dispatchrequest );
                return;
            }

            var verify = false;

            //handle not fully populated request
            dispatchrequest.bsnr = dispatchrequest.bsnr || "";
            dispatchrequest.lanr = dispatchrequest.lanr || "";
            dispatchrequest.patientId = dispatchrequest.patientId || "";
            dispatchrequest.dispatchActivities = dispatchrequest.dispatchActivities || [];

            verifyRequestAttributes( user, dispatchrequest ).then( function( response ) {
                if( response.message !== "" ) {
                    ErrorMessage += response.message;
                    dispatchrequest.status = 0;
                    //addNewTask(user, Y.doccirrus.i18n('dispatchrequest.verification.failed'), 3, response.message, dispatchrequest._id, dispatchrequest.dispatchActivities[0].actType);
                    //callback(null, dispatchrequest);
                    verify = true;
                } else {
                    dispatchrequest.status = 1;
                }

                var medications = [], assistives = [], otherActivities = [];
                var data = {}, vdata = {};
                dispatchrequest.dispatchActivities.forEach( function( activityRow ) {
                    activityRow.activityIds = [];
                    let comment = Y.doccirrus.i18n( 'dispatchrequest.careComment.careTitle' ) + ': ' +
                                  (dispatchrequest.careTitle || "").trim() + '\n' +
                                  Y.doccirrus.i18n( 'dispatchrequest.careComment.carePhone' ) + ': ' +
                                  (dispatchrequest.carePhone || "").trim() + '\n' +
                                  Y.doccirrus.i18n( 'dispatchrequest.careComment.comment' ) + ': ' +
                                  (dispatchrequest.comment || "").trim();

                    switch( activityRow.actType ) {
                        case 'PUBPRESCR':
                            //populate MEDICATIONs
                            activityRow.activities.forEach( ( el ) => {
                                Object.assign( vdata, response.data );
                                vdata.actType = 'MEDICATION';
                                data = activityData( vdata, activityRow );
                                data.phPZN = el.codePZN;
                                data.phNLabel = el.note;

                                let quantity = el.quantity || 1;

                                if( el.dose ) {
                                    data.phDosisType = "TEXT";
                                    data.dosis = el.dose;

                                    /*
                                    let extractResult = extractQuantity.exec(el.dose) || [];
                                    if( extractResult.length > 1 ){
                                        quantity = extractResult[1];
                                        data.dosis = extractResult[2];
                                    } else {
                                        data.dosis = el.dose;
                                    }*/
                                } else {
                                    data.dosis = el.dose;
                                }
                                for(let i = 0; i < quantity; i++){
                                    medications.push( addNewMedication( user, data, activityRow, el, verify ) );
                                }
                            } );

                            if( !verify ) {
                                //populate PUBPRESCR
                                Object.assign( vdata, response.data );
                                vdata.actType = 'PUBPRESCR';
                                data = activityData( vdata, activityRow );
                                data.status = 'VALID';
                                data.activities = activityRow.activityIds;
                                data.careComment = comment;
                                otherActivities.push( addNewActivity( user, data, activityRow ) );
                            }
                            break;
                        case 'PRESASSISTIVE':
                            //populate ASSISTIVE
                            activityRow.activities.forEach( ( el ) => {
                                Object.assign( vdata, response.data );
                                vdata.actType = 'ASSISTIVE';
                                data = activityData( vdata, activityRow );
                                data.codePZN = el.codePZN; //TODO possible redundant
                                data.code = el.codePZN;
                                data.codeHMV = el.codeHMV;
                                data.assDescription = el.note;
                                data.assPrescPeriod = el.prescPeriod;

                                let quantity = el.quantity || 1;
                                data.assDose = el.dose;

                               for(let i = 0; i < quantity; i++){
                                    assistives.push( addNewAssistive( user, data, activityRow, el, verify ) );
                                }

                            } );

                            if( !verify ) {
                                //populate PRESASSISTIVE
                                vdata.actType = 'PRESASSISTIVE';
                                data = activityData( vdata, activityRow );
                                data.status = 'DISPATCHED';
                                data.activities = activityRow.activityIds;
                                data.careComment = comment;
                                otherActivities.push( addNewActivity( user, data, activityRow ) );
                            }
                            break;
                        case 'PROCESS':
                            if( !verify ) {
                                Object.assign( vdata, response.data );
                                vdata.actType = activityRow.actType;
                                data = activityData( vdata, activityRow );
                                data.userContent = dispatchrequest.comment;
                                otherActivities.push( addNewActivity( user, data, activityRow ) );

                            }
                            break;
                        default:
                            dispatchrequest.status = 0;
                        // unknown activity
                        //addNewTask(user, Y.doccirrus.i18n('dispatchrequest.verification.failed'), 3, message, dispatchrequest._id);
                    }

                } );

                processAll( assistives.concat( medications.concat( otherActivities ) ), () => {
                    var populated_activityIds = [], allPopulated = true, message = "";
                    dispatchrequest.dispatchActivities.forEach( ( activityRow ) => {

                        activityRow.activityIds.forEach( ( id, ind ) => {
                            if( id === null ) {

                                message += ((message) ? '\n' : '') +
                                           ((activityRow.errorMessage && activityRow.errorMessage[ind]) ? activityRow.errorMessage[ind] : '');
                                allPopulated = false;

                            } else {
                                populated_activityIds.push( id );
                            }
                        } );
                    } );

                    if( allPopulated ) {
                        sendData( user, dispatchrequest, () => {
                            if( dispatchrequest.status === 1 ) {
                                return callback( null, dispatchrequest );
                            }

                            //TODO refactor: remove code duplication
                            dispatchrequest.status = 0;
                            dispatchrequest.dispatchActivities.forEach( ( activityRow ) => {
                                activityRow.activityId = "";
                                if( activityRow.activities ) {
                                    activityRow.activities.forEach( ( activity ) => {
                                        activity.activityId = [];
                                    } );
                                }

                            } );
                            cleanUp( user, dispatchrequest, "\n" + Y.doccirrus.i18n( 'dispatchrequest.synchronization.failed' ), populated_activityIds, () => { callback( null, dispatchrequest ); } );

                        } );

                    } else {
                        dispatchrequest.status = 0;
                        dispatchrequest.dispatchActivities.forEach( ( activityRow ) => {
                            activityRow.activityId = "";
                            if( activityRow.activities ) {
                                activityRow.activities.forEach( ( activity ) => {
                                    activity.activityId = [];
                                } );
                            }

                        } );
                        cleanUp( user, dispatchrequest, message, populated_activityIds, () => { callback( null, dispatchrequest ); } );
                    }
                } );

            } );
        }

        function cleanUp( user, dispatchrequest, message, activityIds, cb ) {

            //If error happens notify existing user too
            user.specifiedBy = null;

            addNewTask( user, Y.doccirrus.i18n( 'dispatchrequest.verification.failed' ), 3, ErrorMessage + message, dispatchrequest._id, dispatchrequest.dispatchActivities[0].actType );

            removeActivities( user, activityIds ).then( cb );
        }

        function logActivityDispatch( activity, who ) {
            let description = Y.doccirrus.i18n( 'dispatchrequest.audit.send' ),
                entry = Y.doccirrus.api.audit.getBasicEntry( who, 'transfer', 'v_dispatch', description );

            entry.skipcheck_ = true;
            entry.objId = activity._id;

            return Y.doccirrus.api.audit.post( {
                user: who,
                data: entry
            } );
        }

        function sendData( user, dispatchrequest, callback ) {
            var activityIds, files;
            if( dispatchrequest.status === 1 ) {
                //collect payload
                activityIds = [];
                files = [];
                dispatchrequest.dispatchActivities.forEach( ( activityRow ) => {
                    if( activityRow.fileName && activityRow.fileContentBase64 ) {
                        files.push( {
                            id: activityRow.activityId,
                            name: activityRow.fileName,
                            content: activityRow.fileContentBase64
                        } );
                    }
                    activityRow.activityIds.forEach( ( id ) => {
                        activityIds.push( id );
                    } );
                } );

                Promise.all( [
                    getModelData( user, 'mirroractivity', {"_id": {"$in": activityIds}} ),
                    getModelData( user, 'mirrorlocation', {"commercialNo": dispatchrequest.bsnr} )
                ] ).then( function( values ) {
                    //let prcDispatchRequest = values[1][0];
                    //postExternalRequest(`http://${prcDispatchRequest.prcCustomerNo}.dev.dc/2/dispatch`, {type: 'activity', payload: JSON.stringify(values[0])});

                    let payloads = values[0].map( ( v ) => {
                        let file = files.filter( ( el ) => {
                            return el.id.toString() === v._id.toString();
                        } );
                        return {type: 'activity', payload: v, file: file};
                    } );

                    Y.log( 'Sending payload ' + JSON.stringify( payloads ), 'debug' );

                    //postExternalRequest('http://2222222222.dev.dc/2/dispatch', {payload: JSON.stringify(payloads)});

                    Y.doccirrus.communication.callExternalApiByCustomerNo( {
                        api: 'dispatch.post',
                        user: user,
                        useQueue: true,
                        data: {payload: JSON.stringify( payloads )},
                        query: {},
                        dcCustomerNo: values[1][0].prcCustomerNo,
                        options: {},
                        callback: function( err ) { //, result
                            if( err ) {
                                Y.log( 'ISD request synchronization error: ' + err && err.stack || err, 'error', NAME );
                                dispatchrequest.status = 0;
                                return callback();
                            } else {
                                payloads.forEach( ( p ) => {
                                    if( 'activity' === p.type ) {
                                        logActivityDispatch( p.payload, user );
                                    } else {
                                        Y.log( 'Unknown payload type ' + p.type, 'warn', NAME );
                                    }
                                } );
                                return callback();
                            }
                        }
                    } );

                } );
            } else {
                return callback();
            }

        }

        function postCloseTasks( user, dispatchrequest, callback ) {
            //mark created tasks as DONE if any
            if( dispatchrequest._id && (dispatchrequest.status === 1 || dispatchrequest.status === 3) ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'task',
                    action: 'put',
                    query: {dispatchRequestId: dispatchrequest._id},
                    fields: ['status'],
                    data: Y.doccirrus.filters.cleanDbObject( {"status": "DONE"} ),
                    skipcheck_: true,
                    callback: function() {
                    }
                } );
            }
            callback( null, dispatchrequest );
        }

        /**
         * Class Task Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param {Object} data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    var
                        content,
                        res;
                    if( data.bsnr ) {
                        res = 'BSNR: ' + data.bsnr;
                    }
                    if( data.lanr ) {
                        res += (res ? ', ' : '' ) + 'LANR: ' + data.lanr;
                    }
                    if( data.patientId ) {
                        res += (res ? ', ' : '' ) + 'Patient: ' + data.patientId;
                    }
                    if( data.status ) {
                        res += (res ? ', ' : '' ) + 'Status: ' + Y.doccirrus.schemaloader.getEnumListTranslation( 'dispatchrequest', 'Status_E', data.status, '-de', '' );
                    }
                    content = data.content || ' kein Inhalt';  // already generated in pre-process
                    return res + (res ? ', Inhalt: ' + content : content) || 'Eintrag ohne Titel';
                }

            },

            name: NAME,

            pre: [
                {
                    run: [
                        checkProcess
                    ],
                    forAction: 'write'
                }
            ],
            post: [
                {
                    run: [
                        postCloseTasks
                    ],
                    forAction: 'write'
                }
            ]
        };

    },
    '0.0.1', {requires: ['dchttps', 'dispatchrequest-schema', 'mirroractivity-schema', 'task-schema']}
);
