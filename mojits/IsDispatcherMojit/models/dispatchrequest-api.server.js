/*jshint esnext:true */
/*global YUI */

var async = require( 'async' );

YUI.add( 'dispatchrequest-api', function( Y, NAME ) {

        function getModelData( user, model, query, cb ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: query
            }, function( err, result ) {
                if( err ) {
                    Y.log( 'DispatchRequest lookup failed:  ' + err.message, 'error', NAME );
                    return cb( [] );
                }
                cb( result );
            } );
        }

        function getFirstAuditEntries( user, objectId, callback ) {
            var data = {};

            if( !objectId ) {
                callback( null, data );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'audit',
                action: 'get',
                query: {objId: objectId},
                options: {
                    lean: true,
                    sort: {
                        timestamp: 1
                    }
                }
            }, ( err, audits ) => {
                if( err ) {
                    return callback( err, data );
                }
                audits.forEach( ( audit ) => {
                    let keys = Object.keys( audit.diff || {} );
                    keys.forEach( ( key ) => {
                        if( !data.hasOwnProperty( key ) ) {
                            data[key] = audit.diff[key].oldValue;
                        }
                    } );
                } );
                callback( null, data );
            } );
        }

        function processAudits( user, result, callback ) {

            //retrieve initial state of fields in the header of dispatchrequest
            let result_p = (result.result) ? result.result : result;
            async.forEachSeries( result_p,
                ( el, cb ) => {

                    if( el.is.status === 0 ) {
                        return cb();
                    }
                    getFirstAuditEntries( user, el._id, ( err, audit_data ) => {
                        if( err ) {
                            Y.log( 'Audits lookup failed:  ' + err.message, 'error', NAME );
                            return cb();
                        }
                        let keys = Object.keys( audit_data );
                        keys.forEach( ( key ) => {
                            if( key === 'dispatchActivities' ) {
                                return;
                            }
                            el.was[key] = audit_data[key];
                        } );

                        cb();
                    } );
                },
                () => {
                    callback( null, result );
                }
            );

        }

        function cleanValues( arr ) {
            arr.forEach( ( el, ind ) => {
                let keys = Object.keys( el );
                keys.forEach( ( key ) => {
                    if( key === '_id' || key === 'activityId' ) {
                        return;
                    }
                    if( 'object' === typeof el[key] && Array.isArray( el[key] ) ) {
                        arr[ind][key] = cleanValues( el[key] );
                    } else {
                        arr[ind][key] = null;
                    }
                } );
            } );
            return arr;
        }

        function pickActivityData( activity, requestActivity ) {
            var data = {
                activityId: [],
                actType: null,
                codePZN: null,
                note: null,
                dose: null
            }, cleanData = JSON.parse( JSON.stringify( data ) );
            data.activityId.push(activity._id.toString());
            data.actType = activity.actType;

            let adititonalKeys = [];

            switch( activity.actType ) {
                case 'MEDICATION':
                    data.codePZN = activity.phPZN;
                    data.note = activity.phNLabel;
                    data.dose = activity.dosis;
                    adititonalKeys = ["codePZN", "note", "dose"];
                    break;
                case 'ASSISTIVE':
                    data.codePZN = activity.code;
                    data.codeHMV = activity.assId;
                    data.note = activity.assDescription;
                    data.dose = activity.assDose;
                    data.prescPeriod = activity.assPrescPeriod;
                    adititonalKeys = ["codePZN", "codeHMV", "note", "dose", "prescPeriod"];
                    break;
                case 'DIAGNOSIS':
                    data = {
                        activityId: [ activity._id.toString() ],
                        actType: null,
                        note: null
                    };
                    cleanData = JSON.parse( JSON.stringify( data ) );
                    data.actType = activity.actType;
                    data.codePZN = activity.code;
                    data.note = activity.userContent;
                    adititonalKeys = ["codePZN", "actType", "note"];
                    break;
                default:
                    data = {
                        activityId: [],
                        actType: null
                    };
                    data.activityId.push( activity._id.toString() );
                    cleanData = JSON.parse( JSON.stringify( data ) );
                    data.actType = activity.actType;
                    Y.log( 'Unsupported activity type ' + activity.actType, 'debug' );
            }

            let keys = Object.keys( requestActivity );
            keys = keys.concat( adititonalKeys );
            keys.forEach( ( key ) => {
                if( data[key] || data[key] === null ) {
                    requestActivity[key] = data[key];
                }
            } );

            return cleanData;
        }

        function processActivities( user, result, callback ) {
            //get created activities to retrieve current state of request rows fields

            let result_p = (result.result) ? result.result : result;
            async.forEachSeries( result_p,
                ( el, cb ) => {
                    if( el.is.status === 0 ) {
                        return cb();
                    }
                    // clean activities fields for 'is' - for tracking deleted activities
                    el.is.dispatchActivities = cleanValues( el.is.dispatchActivities.slice() );

                    let parentActivityId = el.is.dispatchActivities[0] && el.is.dispatchActivities[0].activityId;
                    if( !parentActivityId || parentActivityId === null ) {
                        // parent activity is not created
                       return  cb();
                    }
                    // main activity is created so get it an get all child activities
                    getModelData( user, 'mirroractivity', {_id: parentActivityId}, ( parentActivities ) => {
                        if( parentActivities.length > 0 && parentActivities[0].activities.length > 0 ) {
                            // let's get child activities
                            let activityList = parentActivities[0].activities || [];
                            activityList = activityList.concat( parentActivities[0].icds );
                            getModelData( user, 'mirroractivity', {_id: {$in: activityList}}, ( childActivities ) => {
                                childActivities.forEach( ( activity ) => {
                                    let isActivity = el.is.dispatchActivities[0].activities.filter( ( isEl ) => {
                                        return isEl.activityId && isEl.activityId.includes( activity._id.toString() );
                                    } );
                                    if( isActivity.length > 0 ) {
                                        pickActivityData( activity, isActivity[0] );

                                    } else {
                                        // new activity created on PRC
                                        let cleanData = pickActivityData( activity, {} );
                                        cleanData._id = activity._id.toString();
                                        el.was.dispatchActivities[0].activities.push( JSON.parse( JSON.stringify( cleanData ) ) );
                                        pickActivityData( activity, cleanData );
                                        el.is.dispatchActivities[0].activities.push( cleanData );
                                    }
                                } );
                                cb();
                            } );
                        } else {
                            return cb();
                        }

                    } );
                },
                () => {
                    callback( null, result );
                }
            );

        }

        function generateTestData( args ) {
            Y.log('Entering Y.doccirrus.api.dispatchrequest.generateTestData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dispatchrequest.generateTestData');
            }
            let foundMainLocation;

            getModelData( args.user, 'prcdispatch', { prcCustomerNo: { $exists: true, $ne: '' } }, ( prcdispatches ) => {
                if( !prcdispatches || !prcdispatches.length ) {
                    Y.log( 'PRCDispatches not found ', 'error' );
                    args.callback( new Y.doccirrus.errors.rest( 400, 'PRCDispatches not found', true ) );
                    return;
                }
                let customerNumbers = prcdispatches.map( el => el.prcCustomerNo );
                getModelData( args.user, 'mirrorlocation', {
                    prcCustomerNo: {$in: customerNumbers},
                    commercialNo: { $exists: true, $ne: '' }
                }, ( locations ) => {
                    if( !locations || !locations.length ) {
                        Y.log( 'Locations not found ', 'error' );
                        args.callback( new Y.doccirrus.errors.rest( 400, 'Locations not found', true ) );
                        return;
                    }
                    let locationsIds = locations.map( ( lc ) => {
                        if( true === lc.isMainLocation ) {
                            if( foundMainLocation && foundMainLocation !== lc._id.toString() ){
                                Y.log( 'found several main locations', 'warn', NAME );
                            }
                            foundMainLocation = lc._id.toString();
                            return "000000000000000000000001";
                        } else {
                            return lc._id.toString();
                        }

                    } );
                    getModelData( args.user, 'mirroremployee', {
                        prcCustomerNo: {$in: customerNumbers},
                        locations: {$not: {$size: 0}},
                        "locations._id": {$in: locationsIds},
                        officialNo: {$exists: true, $ne: ''}

                    }, ( employee ) => {
                        if( !employee || !employee.length ) {
                            Y.log( 'Employee not found ', 'error' );
                            args.callback( new Y.doccirrus.errors.rest( 400, 'Employee not found.', true ) );
                            return;
                        }

                        //filter locations that has employees
                        let prc1cn = customerNumbers[0],
                            loc1 = locations.filter( el => el.prcCustomerNo === prc1cn ),
                            emp1 = employee.filter( el => el.prcCustomerNo === prc1cn ),
                            empLoc = [];

                        emp1.forEach( empl => empl.locations.forEach( el => {
                            if( el._id.toString() === "000000000000000000000001" ){
                                empLoc.push( foundMainLocation );
                            } else {
                                empLoc.push( el._id.toString() );
                            }
                        } ) );

                        loc1 = loc1.filter( el => empLoc.includes( el._id.toString() ) );

                        let dataPRE = {
                                "bsnr": loc1[0].commercialNo,
                                "lanr": emp1[0].officialNo,
                                "patientId": "fake_ID",
                                "comment": "Rezept H test request",
                                "careTitle": "Manager 01",
                                "carePhone": "333-222-333",
                                "dispatchActivities": [
                                    {
                                        "actType": "PRESASSISTIVE",
                                        //prescriptionDate: "2017-01-13T00:00:00.000Z",
                                        "activities": [
                                            {
                                                "codePZN": "00823575",
                                                "codeHMV": "20.29.99",
                                                "note": "test Assistive",
                                                "dose": "32g",
                                                "prescPeriod": "2017.01.15 - 2017.02.13"
                                            },
                                            {
                                                "codePZN": "00823575",
                                                "codeHMV": "20.29.99",
                                                "note": "test Assistive",
                                                "dose": "31g",
                                                "prescPeriod": "2017.01.15 - 2017.02.13"
                                            },
                                            {
                                                "codePZN": "00823575",
                                                "codeHMV": "20.29.99",
                                                "note": "test Assistive",
                                                "quantity": "3",
                                                "dose": "32g",
                                                "prescPeriod": "2016.01.15 - 2017.02.13"
                                            }
                                        ]
                                    }]
                            },
                            dataPUB = {
                                "bsnr": loc1[0].commercialNo,
                                "lanr": emp1[0].officialNo,
                                "patientId": "fake_ID",
                                //"bsnr": "111000700",
                                //"lanr": "999999900",
                                //"patientId": "3345",
                                "comment": "Kassenrezept test request",
                                "careTitle": "Manager 02",
                                "carePhone": "444-333-444",
                                "dispatchActivities": [
                                    {
                                        "actType": "PUBPRESCR",
                                        //prescriptionDate: "2017-01-12T00:00:00.000Z",
                                        "activities": [
                                            {
                                                "codePZN": "03875348",
                                                "codeHMV": "60.11.22",
                                                "note": "test Medication 01",
                                                "quantity": "2",
                                                "dose": "11St",
                                                "prescPeriod": " - "
                                            },
                                            {
                                                "codePZN": "03875348",
                                                "codeHMV": "60.11.22",
                                                "note": "test Medication 01",
                                                "dose": "11St",
                                                "prescPeriod": " - "
                                            },
                                        /*
                                             {
                                                "codePZN": "03875348",
                                                "codeHMV": "",
                                                "note": "test Medication 01",
                                                "dose": "some text",
                                                "prescPeriod": " - "
                                            },
                                            {
                                                "codePZN": "09710269",
                                                "codeHMV": "",
                                                "note": "test Medication 02",
                                                "dose": "some other text",
                                                "prescPeriod": " - "
                                            },
                                        */
                                            {
                                                "codePZN": "07200305",
                                                "codeHMV": "",
                                                "note": "test Medication 03",
                                                "dose": "text",
                                                "prescPeriod": " - "
                                            }
                                        ]
                                    }]
                            },
                            dataDOC = {
                                "bsnr": loc1[0].commercialNo,
                                "lanr": emp1[0].officialNo,
                                "patientId": "fake_ID",
                                "comment": "Vorgang test request",
                                "careTitle": "Manager 03",
                                "carePhone": "555-444-555",
                                "dispatchActivities": [
                                    {
                                        "actType": "PROCESS",
                                        "fileName": "sm_all.pdf",
                                        "fileContentBase64": "data:application/pdf;base64,JVBERi0xLjIgDQol4uPP0w0KIA0KOSAwIG9iag0KPDwNCi9MZW5ndGggMTAgMCBSDQovRmlsdGVyIC9GbGF0ZURlY29kZSANCj4+DQpzdHJlYW0NCkiJzZDRSsMwFIafIO/we6eyZuckTZPtbtIWBi0UjYKQGxFbJmpliuLb26QM8X6CJBfJyf99ycmFF6xJagWrrMxzwJeCEMd+gFjWBC1dLPeCJFkbl/fTKfwnTqt1CK0xIZyEwFYZ2T+fwT8KnmIxUmJinNKJyUiyW7mZVEQ6I54m2K3ZzFiupvgPaee7JHFuZqyDvxuGBbZdu8D1y+7jYf+2e//C2KOJm9dxfEqqTHMRXZlR0hRJuKwZau6EJa+MOdjpYN/gprq8xVW7aRp0ZY162ySbktoWvxpPZULGxJLSr+G4UuX+QHrcl/rz/2eqvPgGPPWhqg0KZW5kc3RyZWFtDQplbmRvYmoNCjEwIDAgb2JqDQoyNDYNCmVuZG9iag0KNCAwIG9iag0KPDwNCi9UeXBlIC9QYWdlDQovUGFyZW50IDUgMCBSDQovUmVzb3VyY2VzIDw8DQovRm9udCA8PA0KL0YwIDYgMCBSIA0KL0YxIDcgMCBSIA0KPj4NCi9Qcm9jU2V0IDIgMCBSDQo+Pg0KL0NvbnRlbnRzIDkgMCBSDQo+Pg0KZW5kb2JqDQo2IDAgb2JqDQo8PA0KL1R5cGUgL0ZvbnQNCi9TdWJ0eXBlIC9UcnVlVHlwZQ0KL05hbWUgL0YwDQovQmFzZUZvbnQgL0FyaWFsDQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZw0KPj4NCmVuZG9iag0KNyAwIG9iag0KPDwNCi9UeXBlIC9Gb250DQovU3VidHlwZSAvVHJ1ZVR5cGUNCi9OYW1lIC9GMQ0KL0Jhc2VGb250IC9Cb29rQW50aXF1YSxCb2xkDQovRmlyc3RDaGFyIDMxDQovTGFzdENoYXIgMjU1DQovV2lkdGhzIFsgNzUwIDI1MCAyNzggNDAyIDYwNiA1MDAgODg5IDgzMyAyMjcgMzMzIDMzMyA0NDQgNjA2IDI1MCAzMzMgMjUwIA0KMjk2IDUwMCA1MDAgNTAwIDUwMCA1MDAgNTAwIDUwMCA1MDAgNTAwIDUwMCAyNTAgMjUwIDYwNiA2MDYgNjA2IA0KNDQ0IDc0NyA3NzggNjY3IDcyMiA4MzMgNjExIDU1NiA4MzMgODMzIDM4OSAzODkgNzc4IDYxMSAxMDAwIDgzMyANCjgzMyA2MTEgODMzIDcyMiA2MTEgNjY3IDc3OCA3NzggMTAwMCA2NjcgNjY3IDY2NyAzMzMgNjA2IDMzMyA2MDYgDQo1MDAgMzMzIDUwMCA2MTEgNDQ0IDYxMSA1MDAgMzg5IDU1NiA2MTEgMzMzIDMzMyA2MTEgMzMzIDg4OSA2MTEgDQo1NTYgNjExIDYxMSAzODkgNDQ0IDMzMyA2MTEgNTU2IDgzMyA1MDAgNTU2IDUwMCAzMTAgNjA2IDMxMCA2MDYgDQo3NTAgNTAwIDc1MCAzMzMgNTAwIDUwMCAxMDAwIDUwMCA1MDAgMzMzIDEwMDAgNjExIDM4OSAxMDAwIDc1MCA3NTAgDQo3NTAgNzUwIDI3OCAyNzggNTAwIDUwMCA2MDYgNTAwIDEwMDAgMzMzIDk5OCA0NDQgMzg5IDgzMyA3NTAgNzUwIA0KNjY3IDI1MCAyNzggNTAwIDUwMCA2MDYgNTAwIDYwNiA1MDAgMzMzIDc0NyA0MzggNTAwIDYwNiAzMzMgNzQ3IA0KNTAwIDQwMCA1NDkgMzYxIDM2MSAzMzMgNTc2IDY0MSAyNTAgMzMzIDM2MSA0ODggNTAwIDg4OSA4OTAgODg5IA0KNDQ0IDc3OCA3NzggNzc4IDc3OCA3NzggNzc4IDEwMDAgNzIyIDYxMSA2MTEgNjExIDYxMSAzODkgMzg5IDM4OSANCjM4OSA4MzMgODMzIDgzMyA4MzMgODMzIDgzMyA4MzMgNjA2IDgzMyA3NzggNzc4IDc3OCA3NzggNjY3IDYxMSANCjYxMSA1MDAgNTAwIDUwMCA1MDAgNTAwIDUwMCA3NzggNDQ0IDUwMCA1MDAgNTAwIDUwMCAzMzMgMzMzIDMzMyANCjMzMyA1NTYgNjExIDU1NiA1NTYgNTU2IDU1NiA1NTYgNTQ5IDU1NiA2MTEgNjExIDYxMSA2MTEgNTU2IDYxMSANCjU1NiBdDQovRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZw0KL0ZvbnREZXNjcmlwdG9yIDggMCBSDQo+Pg0KZW5kb2JqDQo4IDAgb2JqDQo8PA0KL1R5cGUgL0ZvbnREZXNjcmlwdG9yDQovRm9udE5hbWUgL0Jvb2tBbnRpcXVhLEJvbGQNCi9GbGFncyAxNjQxOA0KL0ZvbnRCQm94IFsgLTI1MCAtMjYwIDEyMzYgOTMwIF0NCi9NaXNzaW5nV2lkdGggNzUwDQovU3RlbVYgMTQ2DQovU3RlbUggMTQ2DQovSXRhbGljQW5nbGUgMA0KL0NhcEhlaWdodCA5MzANCi9YSGVpZ2h0IDY1MQ0KL0FzY2VudCA5MzANCi9EZXNjZW50IDI2MA0KL0xlYWRpbmcgMjEwDQovTWF4V2lkdGggMTAzMA0KL0F2Z1dpZHRoIDQ2MA0KPj4NCmVuZG9iag0KMiAwIG9iag0KWyAvUERGIC9UZXh0ICBdDQplbmRvYmoNCjUgMCBvYmoNCjw8DQovS2lkcyBbNCAwIFIgXQ0KL0NvdW50IDENCi9UeXBlIC9QYWdlcw0KL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXQ0KPj4NCmVuZG9iag0KMSAwIG9iag0KPDwNCi9DcmVhdG9yICgxNzI1LmZtKQ0KL0NyZWF0aW9uRGF0ZSAoMS1KYW4tMyAxODoxNVBNKQ0KL1RpdGxlICgxNzI1LlBERikNCi9BdXRob3IgKFVua25vd24pDQovUHJvZHVjZXIgKEFjcm9iYXQgUERGV3JpdGVyIDMuMDIgZm9yIFdpbmRvd3MpDQovS2V5d29yZHMgKCkNCi9TdWJqZWN0ICgpDQo+Pg0KZW5kb2JqDQozIDAgb2JqDQo8PA0KL1BhZ2VzIDUgMCBSDQovVHlwZSAvQ2F0YWxvZw0KL0RlZmF1bHRHcmF5IDExIDAgUg0KL0RlZmF1bHRSR0IgIDEyIDAgUg0KPj4NCmVuZG9iag0KMTEgMCBvYmoNClsvQ2FsR3JheQ0KPDwNCi9XaGl0ZVBvaW50IFswLjk1MDUgMSAxLjA4OTEgXQ0KL0dhbW1hIDAuMjQ2OCANCj4+DQpdDQplbmRvYmoNCjEyIDAgb2JqDQpbL0NhbFJHQg0KPDwNCi9XaGl0ZVBvaW50IFswLjk1MDUgMSAxLjA4OTEgXQ0KL0dhbW1hIFswLjI0NjggMC4yNDY4IDAuMjQ2OCBdDQovTWF0cml4IFswLjQzNjEgMC4yMjI1IDAuMDEzOSAwLjM4NTEgMC43MTY5IDAuMDk3MSAwLjE0MzEgMC4wNjA2IDAuNzE0MSBdDQo+Pg0KXQ0KZW5kb2JqDQp4cmVmDQowIDEzDQowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDIxNzIgMDAwMDAgbg0KMDAwMDAwMjA0NiAwMDAwMCBuDQowMDAwMDAyMzYzIDAwMDAwIG4NCjAwMDAwMDAzNzUgMDAwMDAgbg0KMDAwMDAwMjA4MCAwMDAwMCBuDQowMDAwMDAwNTE4IDAwMDAwIG4NCjAwMDAwMDA2MzMgMDAwMDAgbg0KMDAwMDAwMTc2MCAwMDAwMCBuDQowMDAwMDAwMDIxIDAwMDAwIG4NCjAwMDAwMDAzNTIgMDAwMDAgbg0KMDAwMDAwMjQ2MCAwMDAwMCBuDQowMDAwMDAyNTQ4IDAwMDAwIG4NCnRyYWlsZXINCjw8DQovU2l6ZSAxMw0KL1Jvb3QgMyAwIFINCi9JbmZvIDEgMCBSDQovSUQgWzw0NzE0OTUxMDQzM2RkNDg4MmYwNWY4YzEyNDIyMzczND48NDcxNDk1MTA0MzNkZDQ4ODJmMDVmOGMxMjQyMjM3MzQ+XQ0KPj4NCnN0YXJ0eHJlZg0KMjcyNg0KJSVFT0YNCg=="
                                    }]
                            };

                        //Y.doccirrus.https.externalPost(url , dataPUB, {friend: true}, () => {}); //error, response, body

                        Y.doccirrus.communication.callExternalApiBySystemType( {
                            api: 'dispatchrequest.post',
                            user: args.user,
                            data: dataPRE,
                            useQueue: true,
                            query: {},
                            systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( args.user && args.user.tenantId, Y.doccirrus.schemas.company.systemTypes.INCARE ),
                            options: {},
                            callback: function( err ) { //, result
                                if( err ) {
                                    Y.log( 'ISD test PRESASSISTIVE generation error:' + JSON.stringify( err ), 'error', NAME );
                                    args.callback( new Y.doccirrus.errors.rest( 400, 'ISD test PRESASSISTIVE generation failed', true ) );
                                    return;
                                } else {

                                    Y.doccirrus.communication.callExternalApiBySystemType( {
                                        api: 'dispatchrequest.post',
                                        user: args.user,
                                        useQueue: true,
                                        data: dataPUB,
                                        query: {},
                                        systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( args.user && args.user.tenantId, Y.doccirrus.schemas.company.systemTypes.INCARE ),
                                        options: {},
                                        callback: function( err ) { //, result
                                            if( err ) {
                                                Y.log( 'ISD test PUBPRESCR generation error:' + JSON.stringify( err ), 'error', NAME );
                                                args.callback( new Y.doccirrus.errors.rest( 400, 'ISD test PUBPRESCR generation failed', true ) );
                                                return;
                                            } else {
                                                Y.doccirrus.communication.callExternalApiBySystemType( {
                                                    api: 'dispatchrequest.post',
                                                    user: args.user,
                                                    useQueue: true,
                                                    data: dataDOC,
                                                    query: {},
                                                    systemType: Y.doccirrus.dispatchUtils.getModuleSystemType( args.user && args.user.tenantId, Y.doccirrus.schemas.company.systemTypes.INCARE ),
                                                    options: {},
                                                    callback: function( err ) { //, result
                                                        if( err ) {
                                                            Y.log( 'ISD test PROCESS generation error:' + JSON.stringify( err ), 'error', NAME );
                                                        }
                                                        args.callback( null, [] );
                                                    }
                                                } );
                                            }
                                        }
                                    } );
                                }
                            }
                        } );

                    } );
                } );
            } );
        }

        function splitCombinedActivities(activitiesArray) {
            let resultArray = [];
            activitiesArray.forEach( el => {
                if( el.activityId.length === 1 ){
                    resultArray.push(el);
                } else {
                    el.activityId.forEach( subEl => {
                        let elCopy = Object.assign({}, el);
                        elCopy._id = subEl;
                        elCopy.activityId = [ subEl ];
                        resultArray.push(elCopy);
                    } );
                }
            } );
            return resultArray;
        }

        Y.namespace( 'doccirrus.api' ).dispatchrequest = {

            name: NAME,

            generateTestData: generateTestData,

            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.dispatchrequest.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dispatchrequest.get');
                }
                var options = Y.merge( {lean: true}, args.options || {} );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'dispatchrequest',
                    user: args.user,
                    query: args.query || {},
                    options: options,
                    callback: ( err, result ) => {
                        if( err ) {
                            return args.callback( err );
                        }
                        else {
                            let result_p = (result.result) ? result.result : result;
                            async.forEachSeries( result_p,
                                ( el, cb ) => {
                                    if( el.dispatchActivities && el.dispatchActivities[0] && el.dispatchActivities[0].actType ) {
                                        el.actType = el.dispatchActivities[0].actType;
                                    }
                                    getModelData( args.user, 'mirrorpatient', {
                                            partnerIds: {
                                                $elemMatch: {
                                                    "partnerId": Y.doccirrus.schemas.patient.DISPATCHER.INCARE,
                                                    "patientId": el.patientId
                                                }
                                            }
                                        }, ( res ) => {
                                            if( res[0] ) {
                                                el.patientName = res[0].firstname + ' ' + res[0].lastname;
                                            }
                                            getModelData( args.user, 'mirrorlocation', {"commercialNo": el.bsnr},
                                                ( res ) => {
                                                    if( res[0] ) {
                                                        el.locationName = res[0].locname;
                                                    }
                                                    if( el.dispatchActivities && el.dispatchActivities[0] && el.dispatchActivities[0].actType === 'PROCESS' ) {
                                                        if( el.dispatchActivities[0].fileDocumentId !== null ) {
                                                            getModelData( args.user, 'document', {"_id": el.dispatchActivities[0].fileDocumentId},
                                                                ( res ) => {
                                                                    if( res[0] ) {
                                                                        el.url = res[0].url;
                                                                        el.contentType = res[0].contentType;
                                                                        el.caption = res[0].caption;
                                                                    }
                                                                    cb( null );
                                                                }
                                                            );
                                                        } else {
                                                            getModelData( args.user, 'mirroractivity', {"_id": el.dispatchActivities[0].activityId},
                                                                ( act ) => {
                                                                    if( act[0] ) {
                                                                        getModelData( args.user, 'document', {"_id": act[0].attachments[0]},
                                                                            ( res ) => {
                                                                                if( res[0] ) {
                                                                                    el.url = res[0].url;
                                                                                    el.contentType = res[0].contentType;
                                                                                    el.caption = res[0].caption;
                                                                                }
                                                                                cb( null );
                                                                            }
                                                                        );
                                                                    } else {
                                                                        return cb( null );
                                                                    }

                                                                }
                                                            );
                                                        }

                                                    } else {
                                                        return cb( null );
                                                    }
                                                }
                                            );

                                        }
                                    );

                                },
                                () => {
                                    args.callback( null, result );
                                }
                            );

                        }
                    }
                } );
            },

            getDetails: function getDetails( args ) {
                Y.log('Entering Y.doccirrus.api.dispatchrequest.getDetails', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dispatchrequest.getDetails');
                }
                var
                    options = Y.merge( {lean: true}, args.options || {} );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'dispatchrequest',
                    user: args.user,
                    query: args.query || {},
                    options: options,
                    callback: ( err, result ) => {
                        if( err ) {
                            return args.callback( err );
                        }
                        else {
                            let result_p = (result.result) ? result.result : result;
                            result_p.forEach( ( el, ind ) => {
                                delete el.__v;

                                result_p[ind] = {
                                    _id: el._id.toString(),
                                    was: JSON.parse( JSON.stringify( el ) ),
                                    is: JSON.parse( JSON.stringify( el ) ),
                                    notified: el.dispatchActivities && el.dispatchActivities[0] && el.dispatchActivities[0].notifiedActivities &&
                                              JSON.parse( JSON.stringify( el.dispatchActivities[0].notifiedActivities ) ) || []
                                };

                                result_p[ind].was.dispatchActivities[0].activities = splitCombinedActivities( result_p[ind].was.dispatchActivities[0].activities );
                                result_p[ind].is.dispatchActivities[0].activities = splitCombinedActivities( result_p[ind].is.dispatchActivities[0].activities );

                                // cleanup "is" object for failed request
                                if( el.status === 0 ) {
                                    result_p[ind].is = cleanValues( [result_p[ind].is] );
                                    result_p[ind].is = result_p[ind].is[0];
                                }

                            } );

                            processAudits( args.user, result, () => {
                                return processActivities( args.user, result,
                                    args.callback );
                            } );

                        }
                    }
                } );
            }
        };

    },
    '0.0.1', {
        requires: ['dccommunication', 'prcdispatch-schema', 'dispatchrequest-schema', 'v_utility-schema', 'dispatchUtils']
    }
);
