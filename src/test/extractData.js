/**
 * User: dcdev
 * Date: 12/20/18  5:59 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * Middleware script that will extract xunit.json file (created during runAllMochaSuites step)
 * and console this. The results of console will be added to xunit.xml.
 * See run-mocha.sh or run-mocha-dev.sh for more details.
 */
try {
    const xunitJson = require( './xunit.json' );
    console.log( xunitJson.data ); // eslint-disable-line

} catch ( err ) {
    console.log( `Received an error while tried to read xunit results: [${err.message}]` ); // eslint-disable-line
}
