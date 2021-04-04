/*global Y, should, it, describe, after, before, afterEach, beforeEach, context, expect */

const
    util = require( 'util' ),
    moment = require( 'moment' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    ObjectId = require( 'mongoose' ).Types.ObjectId,
    mochaUtils = require( '../../server/mochaUtils' )( Y );

describe( 'tasks', () => {

    context( 'given a local user and a single practice', function() {

        before( async function() {
            this.timeout( 20000 );

            this.user = Y.doccirrus.auth.getSUForLocal();

            // TODO should not necessary if the other tests are written cleaner
            await util.promisify( mochaUtils.cleanDB )( {user: this.user} );

            await Y.doccirrus.mongodb.runDb( {
                user: this.user,
                model: 'practice',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( {...mochaUtils.getPracticeData(), skipcheck_: true} )
            } );
        } );

        after( async function() {
            await util.promisify( mochaUtils.cleanDB )( {user: this.user} );
        } );

        context( 'given a task and 1 column (list)', async function() {

            before( async function() {
                this.column = '100000000000000000000001';
                this.task = {
                    "_id": "100000000000000000000001",
                    "dateCreated" : moment("2017-11-17T12:30:17.756Z"),
                    "title" : "task 1 title",
                    "alertTime" : moment("2017-11-18T12:30:17.495Z"),
                    "details" : "task 1 description",
                    "status" : "NEW",
                    "urgency" : 2,
                    "templateAlertTimeInterval" : "Seconds",
                    "allDay" : false,
                    "activities" : [],
                    "candidates": [],
                    "roles" : [
                        "Telecardio"
                    ],
                    "candidatesNames" : [],
                    "links" : [],
                    "locations" : [],
                    "sessionWide" : false,
                    "dateDone" : moment("2020-12-15T08:09:44.104Z")
                };
                await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'list',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( {
                        _id: this.column,
                        "name" : "test list 1",
                        "color" : "#257ce6",
                        "details" : true,
                        "title" : true,
                        "candidates" : true,
                        "patientName" : true,
                        "creatorName" : true,
                        "employeeName" : true,
                        "roles" : true,
                        "tasks" : true,
                        "urgency" : true,
                        "dateCreated" : true,
                        "alertTime" : true,
                        "schedule" : true,
                        "linkedSchedule" : true,
                        "lastSchedule" : true,
                        "order" : 0
                    } )
                } );
            } );

            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user: this.user,
                    model: 'list',
                    action: 'delete',
                    query: {_id: {$exists: true}},
                    options: {
                        override: true
                    }
                } );
            } );

            context( 'given not assigned task', async function() {

                describe( '.post()', function() {

                    context( '1 not assigned task and 1 list(column)', function() {

                        beforeEach( async function() {
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'task',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    ...this.task
                                } )
                            } );
                        } );

                        afterEach( async function() {
                            // TODO use a lib for fixtures instead of using the internal API
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'task',
                                action: 'delete',
                                query: {_id: {$exists: true}},
                                options: {
                                    override: true
                                }
                            } );
                        } );

                        it( 'returns 1 not assigned task', async function() {
                            const [err, tasks] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'task',
                                    action: 'get'
                                } )
                            );
                            should.not.exist( err );
                            should.exist( tasks );
                            expect( tasks ).have.lengthOf( 1 );
                            expect( tasks[0] ).to.not.have.property( 'columnId' );
                            expect( tasks[0] ).to.not.have.property( 'orderInColumn' );
                        } );
                    } );
                } );
                describe( '.put()', function() {

                    context( '1 assigned task to list(column)', function() {

                        beforeEach( async function() {
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'task',
                                action: 'post',
                                data: Y.doccirrus.filters.cleanDbObject( {
                                    ...this.task
                                } )
                            } );
                        } );

                        afterEach( async function() {
                            // TODO use a lib for fixtures instead of using the internal API
                            await Y.doccirrus.mongodb.runDb( {
                                user: this.user,
                                model: 'task',
                                action: 'delete',
                                query: {_id: {$exists: true}},
                                options: {
                                    override: true
                                }
                            } );
                        } );

                        it( 'returns 1 column(list) ', async function() {
                            const [err, lists] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'list',
                                    action: 'get',
                                    options: {
                                        lean: true
                                    }
                                } )
                            );
                            should.not.exist( err );
                            should.exist( lists );
                            expect( lists ).have.lengthOf( 1 );
                            expect( lists[0] ).to.be.an( 'Object' ).that.have.property( '_id' ).to.deep.equal( ObjectId( this.column ) );
                        } );

                        it( 'returns column assigned task', async function() {
                            const [error] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'task',
                                    action: 'update',
                                    query: {
                                        _id: this.task._id
                                    },
                                    data: {
                                        $set: {
                                            "columnId": "100000000000000000000001",
                                            "orderInColumn": 0
                                        }
                                    }
                                } )
                            );
                            should.not.exist( error );
                            const [err, tasks] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user: this.user,
                                    model: 'task',
                                    action: 'get',
                                    options: {
                                        lean: true
                                    }
                                } )
                            );

                            should.not.exist( err );
                            should.exist( tasks );
                            expect( tasks ).have.lengthOf( 1 );
                            expect( tasks[0] ).to.be.an( 'Object' ).that.have.property( 'columnId' ).to.deep.equal( this.column );
                            expect( tasks[0] ).to.be.an( 'Object' ).that.have.property( 'orderInColumn' ).that.equal( 0 );
                        } );
                    } );
                } );
            } );
        } );
    } );
} );