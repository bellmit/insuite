/**
 * User: pi
 * Date: 30/06/16  17:04
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/



YUI.add( 'DCMochaReporters', function( Y ) {

    
    function getXUnit(){
        let
            mocha = require( "mocha" ),
            Base = mocha.reporters.Base,
            utils = mocha.utils,
            escape = utils.escape,
            TIMESTAMP_FORMAT_LONG = Y.doccirrus.i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            moment = require( 'moment' );
        /**
         * @class XUnitReporter
         */
        class XUnitReporter extends Base {
            /**
             * @class XUnitReporter
             * @constructor
             *
             * @param {Object}          runner
             * @param {Object}          options
             */
            constructor( runner, options ) {

                super( runner );
                this.init( runner, options );

            }

            init( runner, options ) {
                let
                    self = this,
                    reporterOptions = options && options.reporterOptions || {},
                    useConsole = reporterOptions.useConsole,
                    stats = self.stats,
                    tests = [];
                self.output = '';
                self.suiteName = reporterOptions.suiteName || 'Mocha Tests';
                self.callback = reporterOptions.callback;

                runner.on( 'suite', function( suite ) {
                    if( useConsole ) {
                        console.log( '  ' + suite.title );
                    }
                } );

                runner.on( 'test', function( test ) {
                    if( useConsole ) {
                        console.log( '  ◦ ' + test.title );
                    }
                } );

                runner.on( 'pass', function( test ) {

                    tests.push( test );
                } );

                runner.on( 'fail', function( test ) {
                    if( useConsole ) {
                        console.log( '  - ' + test.title );
                    }
                    tests.push( test );
                } );

                runner.on( 'pending', function( test ) {
                    tests.push( test );
                } );

                runner.on( 'end', function() {

                    self.appendLine( self.tag( 'testsuite', {
                        name: self.suiteName,
                        tests: stats.tests,
                        failures: stats.failures,
                        errors: stats.failures,
                        skipped: stats.tests - stats.failures - stats.passes,
                        timestamp: moment().format( TIMESTAMP_FORMAT_LONG ),
                        time: stats.duration / 1000
                    }, false ) );

                    tests.forEach( item => self.test( item ) );
                    self.appendLine( '</testsuite>' );

                    if( 'function' === typeof self.callback ) {
                        self.callback( self.output );
                    }
                } );
            }

            appendLine( line ) {
                let
                    self = this;
                self.output += line + "\n";
            }

            tag( name, attrs, close, content ) {
                let
                    end = close ? '/>' : '>',
                    pairs = [],
                    tag;

                Object.keys( attrs ).forEach( prop => {
                    pairs.push( prop + '="' + escape( attrs[ prop ] ) + '"' );
                } );

                tag = '<' + name + (pairs.length ? ' ' + pairs.join( ' ' ) : '') + end;
                if( content ) {
                    tag += content + '</' + name + end;
                }
                return tag;
            }

            test( test ) {
                let
                    self = this,
                    attrs = {
                        classname: test.parent.fullTitle(),
                        name: test.title,
                        time: test.duration ? test.duration / 1000 : 0
                    };

                if( 'failed' === test.state ) {
                    let
                        err = test.err;
                    self.appendLine( self.tag( 'testcase', attrs, false, self.tag( 'failure', { message: escape( err.message ) }, false, self.cdata( err.stack ) ) ) );
                } else if( test.pending ) {
                    delete attrs.time;
                    self.appendLine( self.tag( 'testcase', attrs, false, self.tag( 'skipped', {}, true ) ) );
                } else {
                    self.appendLine( self.tag( 'testcase', attrs, true ) );
                }
            }

            cdata( str ) {
                return '<![CDATA[' + escape( str ) + ']]>';
            }

            getOutput() {
                return this.output;
            }

        }

        return XUnitReporter;
    }

    Y.namespace( 'doccirrus.test' ).mochaReporters = {
        getXUnit: getXUnit
    };
}, '0.0.1', { requires: [] } );




