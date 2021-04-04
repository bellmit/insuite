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
 * Test suite runner for fast integration tests.
 *
 * Runs tests serially to avoid test task interference.
 *
 * Assumes loadTestData was run.
 *
 */

YUI.add( 'test-runner', function( Y, NAME ) {


        var runnerTest;

        function Test() {
            this.errCnt = 0;
            this.currentTest = 0;
            //this.tests = Object.keys( Y.doccirrus.test );

            // run just one test:
            this.tests = ['bsnr-lanr'];
        }

        Test.prototype.start = function( test, callback ) {
            var
                that = this,
                tests = Object.keys( test ),
                curT = 0;

            function runner( val, key ) {
                Y.log( 'TEST: ' + key, 'info', NAME );
                val( startNext );
            }

            function startNext( err, result ) {
                var key;
                if( 0 !== curT ) {
                    if( err ) {
                        that.errCnt++;
                        Y.log( 'TEST ERROR: ' + that.errCnt, 'info', NAME );
                    } else {
                        console.log( 'TEST OK:    ', result );
                    }
                }
                if( curT >= tests.length ) {
                    callback();
                } else {
                    key = tests[curT];
                    curT++;
                    runner( test[key], key );
                    //runner( Y.doccirrus.test['patient-api'][key], key );
                }
            }

            // don't execute tests in parallel!
            if( tests.length > 0 ) {
                startNext();
            }
        };

        Test.prototype.end = function() {
            if( runnerTest.errCnt ) {
                Y.log( runnerTest.tests[runnerTest.currentTest] + ' ::: TESTS COMPLETED WITH ERRORS: ' + runnerTest.errCnt, 'info', NAME );
            } else {
                Y.log( runnerTest.tests[runnerTest.currentTest] + ' ::: TESTS COMPLETED OK ', 'info', NAME );
            }

            // do next test
            runnerTest.currentTest++;
            // reset errCnt
            runnerTest.errCnt = 0;
            // run it
            if( runnerTest.currentTest < runnerTest.tests.length ) {
                runnerTest.start(runnerTest.getNextTest(), runnerTest.end);
            }

            // hook in external test framework here
        };

        Test.prototype.getNextTest = function() {
            return Y.doccirrus.test[this.tests[this.currentTest]];
        };

        runnerTest = new Test();
        // self run

        if( -1 < process.argv.indexOf( '--test' ) ) {

            console.log( ' starting tests! ');
            setTimeout( function() {
                runnerTest.start( runnerTest.getNextTest(), runnerTest.end );
            }, 2500 );

        } else if( -1 < process.argv.indexOf( '--mocha' ) ) {
            Y.doccirrus.test.mochaRunner.runMochaSuites();
        }

        Y.namespace( 'doccirrus.test' ).runner = runnerTest;
    },
    '0.0.1',
    //
    // add your tests to this list.
    //
    {requires: ['test-dcdb', 'test_bsnr-lanr', 'test_patient-api', 'test_activity-api', 'mocha-runner']}
);
