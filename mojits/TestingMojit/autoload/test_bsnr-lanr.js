/**
 * User: rrrw
 * Date: 15.08.13  16:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/



/**
 *
 * Work-in-Progress:  after the actual test is run, needs ASSERT statements
 * to pick up the true success of the call -- i.e. inspect the DB (directly?)
 * and see what objects are contained in it.
 *
 *
 */

YUI.add( 'test_bsnr-lanr', function( Y ) {

        var
        //            user = Y.doccirrus.auth.getSUForTenant( config.tenantId ),
            combinations = '',
            mismatches = [],
            testSuite = {};

        Y.mix( testSuite, {

            testReadFile: function( callback ) {
                combinations = require( 'fs' ).readFileSync(
                    '/Users/rrrw/Projects/Node/Mojito/doccirrus/dc-server/dcbaseapp/src/mongoscripts/medneo-imports/BSNR_LIST.csv',
                    {encoding: 'utf-8'}
                );
                console.log('testReadfile',combinations.length);
                callback();
            },
            testBsnrLanr: function( callback ) {
                var async = require('async'),
                    lines = combinations.split( '\n' );

                console.log('testBsnrLanr',lines.length);

                async.eachSeries(lines, function( item, _cb ){
                    var line = item.split(',');

                    if( line.length !== 3 ) {
                        console.warn('WARN: Line does not have 3 entries');
                        return _cb();
                    }
                    if( '999999900'===line[1] ) {
                        return _cb();
                    }

                    Y.doccirrus.api.kbv.checkLanrAndBsnr( {
                        query: {
                            lanr: line[1],
                            bsnr: line[2]
                        },
                        callback: function checkComplete( err, result ) {
                            if( err ) {
                                console.warn('WARN: DB ERR');
                                _cb( new Y.doccirrus.errors.rest( 500, 'Datenbank Fehler.' ) );
                            } else if( result.exists ) {
                                console.log('.');
                                _cb();
                            } else {
                                console.warn('WARN: BAD LANR/BSNR Combo');
                                console.log('https://3652b7434d2f.doccirrus.medneo.de/incase#/activity/'+line[0]);
                                mismatches.push('https://3652b7434d2f.doccirrus.medneo.de/incase#/activity/'+line[0]);
                                _cb(); // setup in error table!!
                            }

                        }

                    } );

                }, function final( err ){
                    if( err ) {
                        console.log('A line failed to process');
                    } else {
                        console.log('All lines have been processed successfully');
                        mismatches.join('\n');
                    }
                    process.exit();
                    callback();
                });

            }

        } );

        Y.namespace( 'doccirrus.test' )['bsnr-lanr'] = testSuite;
    },
    '0.0.1', {requires: []}
);
