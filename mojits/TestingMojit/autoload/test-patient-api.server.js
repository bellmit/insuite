/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, nomen:true*/
/*global YUI*/



/**
 *
 * Whitebox integration tests.
 *
 * Test suite for low level DCDB (and discriminator) functionality.
 *
 * Assumes loadTestData was run.
 *
 * Work-in-Progress:  after the actual test is run, needs ASSERT statements
 * to pick up the true success of the call -- i.e. inspect the DB (directly?)
 * and see what objects are contained in it.
 *
 *
 */

YUI.add( 'test-patient-api', function( Y ) {

        var
            config = { tenantId: '1111111111' },
            user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),

            testSuite = {};

        Y.mix( testSuite, {

            timeFullActivity: function( cb ) {
                var
                    a = Date.now(),
                    b;

                Y.doccirrus.api.activity.getActivitiesPopulated({user: user, query: {}, options: {withEmployee:true, objPopulate: true}, callback:function(err, result) {
                    b = Date.now();
                    if(err) {
                        console.log('TIME TAKEN UNTIL ERROR:  ' + (b - a) / 1000 + '  seconds' );
                        cb(err);
                        return;
                    }
                    cb( null, 'TIME TAKEN FOR FULLACTIVITY WITH ' + result.length + ' ACTIVITIES :  ' + (b - a) / 1000 + '  seconds' );
                }});
            }

        } );

        Y.namespace( 'doccirrus.test' )['patient-api'] = testSuite;
    },
    '0.0.1', {requires: ['patient-api']}
);
