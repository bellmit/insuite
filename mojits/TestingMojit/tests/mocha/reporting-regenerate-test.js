/**
 * User: dcdev
 * Date: 1/24/20  2:35 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, it, describe, after,should, before, after */

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    moment = require( 'moment' ),
    user = Y.doccirrus.auth.getSUForLocal();
describe( 'Test regenerate reporting from audit log', function() {
    describe( 'Test one "put" entry in audit log', function() {
        before( async function() {
            //clean all audit entries which were created by previous tests
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'delete',
                query: {
                    _id: {$exists: true}
                },
                options: {
                    override: true
                }
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'audit',
                data: Y.doccirrus.filters.cleanDbObject( {
                    "_id": "5e2ada8552b21a3121ea6c02",
                    "user": "Jhony Dredn04",
                    "userId": "100000000000000000000004",
                    "timestamp": moment().startOf( 'd' ).toDate(),
                    "model": "activity",
                    "action": "put",
                    "ip": "192.168.56.1",
                    "sessionId": "IAiY0Z9-bY4-niEZyhk_2rDyk5qKJeCh",
                    "diff": {
                        "attachedMedia": [
                            {
                                "oldValue": {
                                    "mediaId": "5e2ada8452b21a3121ea6bd8",
                                    "contentType": "application/pdf",
                                    "caption": "PDF",
                                    "_id": "5e2ada8452b21a3121ea6bf5"
                                }
                            },
                            {
                                "newValue": {
                                    "mediaId": "5e2ada8452b21a3121ea6bd8",
                                    "contentType": "application/pdf",
                                    "caption": "PDF",
                                    "_id": "5e2ada8552b21a3121ea6bf9"
                                }
                            }
                        ],
                        "editor": [
                            {
                                "oldValue": {
                                    "_id": "5e2ada8452b21a3121ea6bed",
                                    "name": "Jhony Dredn04",
                                    "employeeNo": "01234",
                                    "initials": "JD"
                                }
                            },
                            {
                                "newValue": {
                                    "_id": "5e2ada8452b21a3121ea6bf7",
                                    "name": "Jhony Dredn04",
                                    "employeeNo": "01234",
                                    "initials": "JD"
                                }
                            }
                        ],
                        "formPdf": {
                            "oldValue": "",
                            "newValue": "5e2ada8452b21a3121ea6bd8"
                        },
                        "lastChanged": {
                            "oldValue": "2020-01-24T11:52:36.507Z",
                            "newValue": "2020-01-24T11:52:36.879Z"
                        },
                        "locationId": {
                            "id": {
                                "oldValue": {
                                    "type": "Buffer",
                                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
                                },
                                "newValue": {
                                    "type": "Buffer",
                                    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
                                }
                            }
                        }
                    },
                    "objId": "5e2ada7452b21a3121ea6ba8",
                    "descr": "0user, DQS,  Medikament,  4032651501021,  Aspirmatic Konz Fl 2 lt",
                    "relatedActivities": []
                } )
            } ) );
        } );

        after( 'Clean audit document', async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'audit',
                action: 'delete',
                query: {
                    _id: {$exists: true}
                }
            } ) );
        } );

        it( 'Test one "put" entry in audit log', async function() {
            let startDate = moment().subtract( 24, 'hours' ).startOf( 'day' ).toDate(),
                endDate = moment().toDate();
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.insight2.regenerate.regenerateFromAuditLog( user, startDate, endDate )
            );
            should.not.exist( err );
            result.should.deep.equal( {auditlogs: 1, syncreportings: 1} );
        } );
    } );

    describe( 'Test  "delete" entry in audit log', function() {
        before( async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'audit',
                data: Y.doccirrus.filters.cleanDbObject( {
                    "_id": "5e2afe7e36805d47d71109ba",
                    "user": "Jhony Dredn04",
                    "userId": "100000000000000000000004",
                    "timestamp": moment().startOf( 'd' ).toDate(),
                    "model": "document",
                    "action": "delete",
                    "ip": "192.168.56.1",
                    "sessionId": "IAiY0Z9-bY4-niEZyhk_2rDyk5qKJeCh",
                    "objId": "5e2ada7452b21a3121ea6ba7",
                    "descr": "0user, DQS, Med label",
                    "relatedActivities": []
                } )
            } ) );
        } );

        it( 'Test "delete" entry in audit log', async function() {
            let startDate = moment().subtract( 24, 'hours' ).startOf( 'day' ).toDate(),
                endDate = moment().toDate();
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.insight2.regenerate.regenerateFromAuditLog( user, startDate, endDate )
            );
            should.not.exist( err );
            result.should.deep.equal( {auditlogs: 1, syncreportings: 0} );
        } );
    } );

} );