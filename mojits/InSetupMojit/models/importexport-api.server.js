/*global YUI */


YUI.add( 'importexport-api', function( Y, NAME ) {

        const
            _ = require( 'lodash' ),
            exportDir = Y.doccirrus.auth.getTmpDir() + '/export/',
            util = require('util'),
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * @method makeExportDir
         * @public
         *
         * return path to export folder for specific tenant (if folder not exists then create it)
         *
         * @param {Object} user
         *
         * @returns {Promise<String>}
         */
        async function makeExportDir( user ) {
            Y.log('Entering Y.doccirrus.api.importexport.makeExportDir', 'info', NAME);
            const
                tenantDir = ( exportDir + (user.tenantId ? user.tenantId : '') + '/' ).replace( '//', '/0/' ),
                mkdirIfMissing = util.promisify( Y.doccirrus.media.mkdirIfMissing );

            let [ err ] = await formatPromiseResult( mkdirIfMissing( tenantDir ) );
            if( err ){
                Y.log( `makeExportDir: error getting/creating ${tenantDir} : ${err.stack || err}`, 'error', NAME );
                Y.log('Exiting Y.doccirrus.api.importexport.makeExportDir', 'info', NAME);
                throw( err );
            }
            Y.log('Exiting Y.doccirrus.api.importexport.makeExportDir', 'info', NAME);
            return tenantDir;
        }

        /**
         * @method loadMetadata
         * @public
         *
         * load file in specific folder and parse it to JS object
         *
         * @param {String} path
         * @param {String} filename
         * @param {Boolean} notExpectedArray expected array returns empty array if file not found
         *
         * @returns {Promise<Object>}
         */
        async function loadMetadata( path, filename, notExpectedArray ) {
            const
                readFile = util.promisify( Y.doccirrus.media.readFile );

            let [ err, result ] = await formatPromiseResult( readFile( path + filename, path ) );
            if( !err && result ) {
                try{
                    result = JSON.parse( result );
                } catch ( err ){
                    Y.log( `loadMetadata: error parsing metadata file : ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }
            }
            if( err && -2 === err.errno ) {
                err = null;
            }
            if( err ){
                Y.log( `loadMetadata: error loading ${path + filename} : ${err.stack || err}`, 'error', NAME );
                throw( err );
            }

            return result || ( notExpectedArray ? undefined : [] );
        }

        /**
         * @method clearByMetadata
         * @public
         *
         * delete metadata file and all coresponding exported file in export folder for specific import/export type;
         * all other files not related to particular import/export type remain in folder
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.metaDataFileName - name of metadata file
         * @param {Function} args.callback
         *
         * @returns {Function} callback
         */
        async function clearByMetadata( args ) {
            Y.log('Entering Y.doccirrus.api.importexport.clearByMetadata', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.importexport.clearByMetadata');
            }
            const
                { user, data: { metaDataFileName }, callback} = args,
                genericError = new Y.doccirrus.commonerrors.DCError( 500, { message: 'Error getting data.' } ),
                tempRemove = util.promisify( Y.doccirrus.media.tempRemove );

            let [ err , exportDir ] = await formatPromiseResult( makeExportDir( user) );
            if( err ){
                Y.log( `clearByMetadata: error getting export dir ${err.stack || err}`, 'error', NAME );
                return callback( genericError );
            }

            let loadedMetadata;
            [ err, loadedMetadata ] = await formatPromiseResult( loadMetadata( exportDir, metaDataFileName ) );
            if( err ){
                Y.log( `clearByMetadata: loading metadata ${metaDataFileName} dir ${err.stack || err}`, 'error', NAME );
                return callback( genericError );
            }

            let
                fileName = metaDataFileName.replace( '_meta.json', '' ),
                files = _.chain( loadedMetadata )
                    .pluck( 'files' )
                    .flatten()
                    .filter()
                    .uniq()
                    .map( v => ({'_id': v}) )
                    .value();

            if( !files.length ) {
                files = loadedMetadata;
            }

            for( let fMeta of files ){
                [ err ] = await formatPromiseResult( tempRemove( `${exportDir}${fileName}_${fMeta._id}.json` ) );
                if( err ){
                    Y.log( `clearByMetadata: error on deleting ${fileName}_${fMeta._id}.json : ${err.stack || err}`, 'warn', NAME);
                }
            }
            [ err ] = await formatPromiseResult( tempRemove( `${exportDir}${metaDataFileName}` ) );
            if( err ){
                Y.log( `clearByMetadata: error on deleting ${metaDataFileName} : ${err.stack || err}`, 'warn', NAME);
            }

            callback();
        }

        Y.namespace( 'doccirrus.api' ).importexport = {

            name: NAME,

            makeExportDir,
            loadMetadata,
            clearByMetadata
        };
    },

    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dccommonerrors',
            // 'dcmedia-store'
        ]
    }
);