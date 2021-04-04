/**
 * User: ma
 * Date: 26/06/2014  09:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'bdtimporttest-api', function( Y, NAME ) {

        var async = require( 'async' );

        function mapErrors( errors ) {
            var r = '';
            for (var i in errors){//eslint-disable-line
                if(errors.hasOwnProperty(i)){
                    var e = errors[i];//eslint-disable-line
                    r += ' Path: ' + e.path + ' value: ' + e.value + ' message: ' + e.message + '\n';
                }
            }
            return r;
        }

        Y.namespace( 'doccirrus.api' ).bdtimporttest = {

            name: NAME,

            testPatients: function( args ) {
                Y.log('Entering Y.doccirrus.api.bdtimporttest.testPatients', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.bdtimporttest.testPatients');
                }
                var
                    errors = [],
                    user = args.user,
                    callback = args.callback;

                user.tenantId = '1bc60d1800';

                function patientCb( err, patients ) {

                    if( err ) {
                        callback( err );
                        return;
                    }
                    function finialCb() {

                        callback( null, JSON.stringify( errors ) );
                    }

                    function savePat( patient, cb ) {

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            action: 'put',
                            query: {
                                _id: patient._id
                            },
                            fields: Object.keys(patient),
                            data: Y.doccirrus.filters.cleanDbObject(patient)
                        }, function( err ) {
                            if( err ) {
                                errors.push( err );
                            }
                            cb();
                        });

                    }

                    async.each( patients, savePat, finialCb );
                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'patient',
                    user: user,
                    callback: patientCb
                } );
            },

            testActivities: function( args ) {
                Y.log('Entering Y.doccirrus.api.bdtimporttest.testActivities', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.bdtimporttest.testActivities');
                }
                var
                    errors = [],
                    user = args.user,
                    callback = args.callback;

                //user.tenantId = '1bc60d1800';

                function activityCb( err, activities ) {

                    if( err ) {
                        callback( err );
                        return;
                    }
                    function finialCb() {

                        callback( null, JSON.stringify( errors ) );
                    }

                    function mapErrors( errors ) {
                        var r = '';
                        for (var i in errors){//eslint-disable-line
                            if(errors.hasOwnProperty(i)){
                                var e = errors[i];//eslint-disable-line
                                r += ' Path: ' + e.path + ' value: ' + e.value + ' message: ' + e.message + '\n';
                            }
                        }
                        return r;
                    }

                    function saveAct( activity, cb ) {

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            action: 'put',
                            query: {
                                _id: activity._id
                            },
                            fields: Object.keys(activity),
                            data: Y.doccirrus.filters.cleanDbObject(activity)
                        }, function( err ) {
                            if( err ) {
                                console.log("error", typeof err, err);//eslint-disable-line
                                if(err.name === 'ValidationError'){
                                    err = mapErrors(err.errors);
                                }
                                errors.push('Id: ' + activity._id + ' actType ' + activity.actType + ' ' + err );
                            }
                            cb();
                        });

                    }

                    console.log( "activities", activities.length );//eslint-disable-line
                    async.each( activities, saveAct, finialCb );
                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    callback: activityCb
                } );
            },

            testIdentities: function( args ) {
                Y.log('Entering Y.doccirrus.api.bdtimporttest.testIdentities', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.bdtimporttest.testIdentities');
                }

                var
                    errors = [],
                    user = args.user,
                    callback = args.callback;

                function finialCb() {
                    callback( null, JSON.stringify( errors ) );
                }

                function save( identity, cb ) {

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'put',
                        query: {
                            _id: identity._id
                        },
                        fields: Object.keys(identity),
                        data: Y.doccirrus.filters.cleanDbObject(identity)
                    }, function( err ) {
                        console.log("error", typeof err, err);//eslint-disable-line
                        if(err && err.name === 'ValidationError'){
                            err = mapErrors(err.errors);
                            errors.push('Id: ' + identity._id + ' ' + err );
                        }
                        cb();
                    });
                }
                
                function identityCb( err, identities ) {//eslint-disable-line
                    
                    
                    async.each( identities, save, finialCb );

                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'identity',
                    user: user,
                    callback: identityCb
                } );
            },

            testEmployees: function( args ) {
                Y.log('Entering Y.doccirrus.api.bdtimporttest.testEmployees', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.bdtimporttest.testEmployees');
                }

                var
                    errors = [],
                    user = args.user,
                    callback = args.callback;

                function finialCb() {
                    callback( null, JSON.stringify( errors ) );
                }

                function save( employee, cb ) {

                    //mongooselean.save_fix
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'put',
                        query: {
                            _id: employee._id
                        },
                        fields: Object.keys(employee),
                        data: Y.doccirrus.filters.cleanDbObject(employee)
                    }, function( err ) {
                        console.log("error", typeof err, err);//eslint-disable-line
                        if(err && err.name === 'ValidationError'){
                            err = mapErrors(err.errors);
                            errors.push('Id: ' + employee._id + ' ' + err );
                        }
                        cb();
                    });
                }

                function employeeCb( err, employees ) {//eslint-disable-line


                    async.each( employees, save, finialCb );

                }

                Y.doccirrus.mongodb.runDb( {
                    model: 'employee',
                    user: user,
                    callback: employeeCb
                } );
            }



        };

    },
    '0.0.1', {requires: []}
);
