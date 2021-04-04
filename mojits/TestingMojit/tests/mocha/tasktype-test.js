/*global Y, should, it, describe */

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    templateDefaultId = Y.doccirrus.schemas.tasktype.templateDefault._id,
    templatePrintId = Y.doccirrus.schemas.tasktype.templatePrint._id,
    templateSystemId = Y.doccirrus.schemas.tasktype.templateSystem._id,
    templateTranscribeId = Y.doccirrus.schemas.tasktype.templateTranscribe._id,
    cleanDbObject = Y.doccirrus.filters.cleanDbObject,
    user = Y.doccirrus.auth.getSUForLocal();

let
    tasktypeTemplate = {
        type: 'USER',
        name: 'tasktypeTemplate'
    },
    tasktypeTemplateId;

describe( 'TaskType test.', () => {
    describe( '0. Setup.', function() {
        it( 'cleans db', function( done ) {
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
    } );
    describe( '1. Check for default types', function() {
        it( 'count a number of task types', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'tasktype',
                action: 'count'
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.equal( 4 );
                done();
            } );
        } );
        it( 'check default task types', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'tasktype',
                action: 'get',
                query: {},
                options: {
                    sort: {
                        _id: 1
                    }
                }
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                result.should.be.an( 'array' ).which.has.lengthOf( 4 );
                result[0]._id.toString().should.be.equal( templateSystemId );
                result[1]._id.toString().should.be.equal( templateDefaultId );
                result[2]._id.toString().should.be.equal( templatePrintId );
                result[3]._id.toString().should.be.equal( templateTranscribeId );
                done();
            } );
        } );
    } );
    describe( '2. Check getting taskType from type', function() {
        let taskTemplateDefault = {
                type: ''
            },
            taskTemplatePrint = {
                type: Y.doccirrus.schemas.task.systemTaskTypes.PRINT
            },
            taskTemplateSystem = {
                type: Y.doccirrus.schemas.task.systemTaskTypes.RULE_ENGINE
            },
            tasksArray = [taskTemplateDefault, taskTemplatePrint, taskTemplateSystem];
        it( 'apply getTaskTypeFromType function to array of tasks', function( done ) {
            tasksArray.forEach( function( task ) {
                task.taskType = Y.doccirrus.schemas.tasktype.getTaskTypeFromType( task.type );
            } );

            taskTemplateDefault.taskType.should.be.equal( templateDefaultId );
            taskTemplatePrint.taskType.should.be.equal( templatePrintId );
            taskTemplateSystem.taskType.should.be.equal( templateSystemId );
            done();
        } );
    } );
    describe( '3. Check CRUD operations for tasktype', function() {
        it( 'GET tasktype', function( done ) {
            Y.doccirrus.api.tasktype.get( {
                user: user,
                query: {},
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    done();
                }
            } );
        } );

        it( 'POST tasktype', function( done ) {
            Y.doccirrus.api.tasktype.post( {
                user: user,
                data: cleanDbObject( tasktypeTemplate ),
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    tasktypeTemplateId = result[0];
                    done();
                }
            } );
        } );

        it( 'PUT tasktype', function( done ) {
            tasktypeTemplate.name = 'updatedTasktypeTemplate';
            Y.doccirrus.api.tasktype.updateTaskType( {
                user: user,
                query: {_id: tasktypeTemplateId},
                data: cleanDbObject( tasktypeTemplate ),
                fields: ['name'],
                callback: function( err ) {
                    should.not.exist( err );
                    done();
                }
            } );
        } );

        it( 'PUT tasktype (set name which already exists in db)', function( done ) {
            tasktypeTemplate.name = 'updatedTasktypeTemplate';
            Y.doccirrus.api.tasktype.updateTaskType( {
                user: user,
                query: {_id: tasktypeTemplateId},
                data: cleanDbObject( tasktypeTemplate ),
                fields: ['name'],
                callback: function( err, result ) {
                    should.not.exist( result );
                    should.exist( err );
                    err.should.be.an( 'object' );
                    err.code.should.equal( 1130000 );
                    done();
                }
            } );
        } );

        it( 'DELETE tasktype', function( done ) {
            Y.doccirrus.api.tasktype.deleteType( {
                user: user,
                query: {_id: tasktypeTemplateId},
                callback: function( err, result ) {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' );
                    result[0]._id.toString().should.equal( tasktypeTemplateId );
                    done();
                }
            } );
        } );
    } );
} );

