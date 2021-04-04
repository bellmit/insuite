/**
 * User: abhijit.baldawa
 * Date: 2019-06-18  14:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

let
    Y;

const
    util = require('util'),
    fs = require('fs'),
    {formatPromiseResult} = require('dc-core').utils,
    readFileProm = util.promisify( fs.readFile ),
    NAME = "DownloadDicomCsvTemplate";

/**
 *
 * @route /dicomUserInputCsvTemplate
 *
 * This middleware returns input_template.csv file
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function handleRequest( req, res ) {
    const
        FILE_NAME = "input_template.csv",
        TEMPLATE_PATH = `${__dirname}/../mojits/InPacsAdminMojit/config/${FILE_NAME}`,
        CONTENT_TYPE = "text/csv",
        CHARSET = "UTF-8";

    let
        err,
        csvFileBuffer;

    [err, csvFileBuffer] = await formatPromiseResult( readFileProm( TEMPLATE_PATH ) );

    if( err  ) {
        Y.log( `handleRequest: Error loading file at path: ${TEMPLATE_PATH}. Error: ${err.stack || err}`, 'error', NAME );
        return res.status( 500 ).send(`Error loading file. Error message: ${err.message || err}`);
    }

    if( !csvFileBuffer ) {
        // Should never come here but still keeping the check
        Y.log(`handleRequest: Empty file buffer found at path: ${TEMPLATE_PATH}`, "error", NAME);
        return res.status(500).send(`Empty file buffer received`);
    }

    res.setHeader( 'Content-disposition', `attachment; filename=${FILE_NAME}` );
    res.setHeader( 'Content-type', `${CONTENT_TYPE}; charset="${CHARSET}"` );
    res.write( csvFileBuffer );
    res.end();
}

module.exports = function( _Y ) {
    Y = _Y;

    return handleRequest;
};