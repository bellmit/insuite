/**
 * User: nicolas.pettican
 * Date: 16.12.19  11:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

const
    {formatPromiseResult} = require( 'dc-core' ).utils;

/**
 * Used to delay in Promise chains
 * @param {Object} self
 * @param {Number} ms milliseconds
 * @returns {Promise}
 */
async function wait( self, ms = 200 ) {
    self.timeout( self.timeout() + ms );
    return await formatPromiseResult(
        new Promise( ( resolve ) => {
            setTimeout( resolve, ms );
        } )
    );
}

module.exports = {
    wait
};