/*global YUI */


YUI.add( 'inpacsmodality-api', function( Y, NAME ) {

    const
        net = require( 'net' ),
        Prom = require( 'bluebird' ),
        runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

    /**
     * Testing modality connection
     * @returns {string} success message if connection is pinged successfuly or failure/error
     * @param {object} args arguments
     * @param {object} args.query.modality modality object to test
     * @param {function} args.callback return success, failure or error
     */
    function testModalityConnection( args ) {
        Y.log('Entering Y.doccirrus.api.inpacsmodality.testModalityConnection', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsmodality.testModalityConnection');
        }
        const
            query = args.query,
            cb = args.callback,
            modality = JSON.parse( query.modality );

        if( modality ) {
            let client = new net.Socket();
            client.connect( modality.port, modality.ip, ( err ) => {
                if( err ) {
                    Y.log( 'Failed to ping. Error: ' + JSON.stringify( err ), 'error', NAME );
                    client.end();
                    return cb( new Y.doccirrus.commonerrors.DCError( 500, { message: "Failed to ping." } ) );
                }
                client.end();
                return cb( null, `Success!` );
            } );
            client.on( 'error', function( err ) {
                if( err ) {
                    Y.log( 'Failure. Error: ' + JSON.stringify( err ), 'error', NAME );
                    return cb( new Y.doccirrus.commonerrors.DCError( 500, { message: "Failure." } ) );
                }
            } );

        }
        else {
            Y.log( 'Failed test modality request.', 'error', NAME );
            return cb( new Y.doccirrus.commonerrors.DCError( 400, { message: "Bad request." } ) );
        }
    }

    /**
     *  CRUD for modalities
     * @param {Object} args arguments
     * @params {Array} args.data.configsToDelete Modalities objects with _id to delete
     * @params {Array} args.data.configsToCreate Modalities objects to crate
     * @params {Array} args.data.configsToUpdate Modalities objects to update
     * @returns {callback}
     */
    function saveModalityConfig( args ) {
        Y.log('Entering Y.doccirrus.api.inpacsmodality.saveModalityConfig', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsmodality.saveModalityConfig');
        }
        const
            { callback, user, data: { configsToDelete = [], configsToCreate = [], configsToUpdate = [], selectedEncoding = null } } = args;

        if( !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inPacs' ) ) {
            return callback( new Error( 'saveOrthancConfigs: no inPacs license was found.' ) );
        }

        function deleteModalities() {
            if( configsToDelete.length ) {
                return runDb( {
                    user: user,
                    model: 'inpacsmodality',
                    action: 'delete',
                    query: { '_id': { $in: configsToDelete.map( ( deleteItem ) => deleteItem._id ) } }
                } );
            }
            return Prom.resolve();
        }

        function createModalities() {
            return Prom.all( configsToCreate.map( configToCreate => runDb( {
                user: user,
                model: 'inpacsmodality',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( JSON.parse( configToCreate ) ),
                options: { entireRec: true }
            } ) ) );
        }

        function updateModalities() {
            return Prom.all( configsToUpdate.map( configToUpdate => runDb( {
                user: user,
                model: 'inpacsmodality',
                action: 'put',
                data: Y.doccirrus.filters.cleanDbObject( JSON.parse( configToUpdate ) ),
                fields: ['name', 'ip', 'port'],
                options: { entireRec: true },
                query: { '_id': JSON.parse( configToUpdate )._id }
            } ) ) );
        }

        function readModalities() {
            return runDb( {
                user: user,
                model: 'inpacsmodality'
            } ).catch(( err )=>{ Y.log( 'ERROR  ' + err, err, NAME ); });
        }

        function reloadOrthancService( args ) {
            Y.doccirrus.api.inpacsconfiguration.restartOrthanc( Object.assign( {}, args, {
                callback: ( err ) => {
                    if( err ) {
                        Y.doccirrus.communication.emitEventForSession( {
                            sessionId: user.sessionId,
                            event: 'reloadOrthancServiceError',
                            msg: {
                                data: {
                                    err: err
                                }
                            }
                        } );
                    }
                }
            } ) );
        }

        function getInpacsConfig() {
            return new Prom( ( resolve, reject ) => Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig ) => {
                if( err ) {
                    reject( err );
                } else {
                    resolve( inpacsConfig );
                }
            } ) );
        }

        let inpacsConfiguration = {};

        deleteModalities()
            .then( createModalities )
            .then( updateModalities )
            .then( getInpacsConfig )
            .then( inpacsConfig => { inpacsConfiguration = inpacsConfig; } )
            .then( () => {
                if( selectedEncoding ) {
                    return Y.doccirrus.api.inpacsconfiguration.updateInpacsConfiguration({
                        user,
                        fields: ['defaultEncoding'],
                        data: { defaultEncoding: selectedEncoding }
                    });
                }
            } )
            .then( readModalities )
            .then( ( updatedModalities ) => {
                Y.log( 'Reload Orthanc for modality change. ', 'info', NAME );
                if( configsToDelete.length || configsToCreate.length || configsToUpdate.length || selectedEncoding ) {
                    reloadOrthancService( { data: inpacsConfiguration, user } );
                }

                attachRealIpAddressOfPrc( updatedModalities );

                callback( null, updatedModalities );
            } )
            .catch( ( err ) => {
                Y.log( `Failed to save modality config... ${JSON.stringify( err )}`, 'error', NAME );
                callback( new Y.doccirrus.commonerrors.DCError( 500, { message: JSON.stringify( err ) } ) );
            } );

    }

    function attachRealIpAddressOfPrc( modalities ) {
        if( modalities && Array.isArray(modalities) ) {
            modalities.forEach( (modality) => {
                if( modality._id.toString() === Y.doccirrus.schemas.inpacsmodality.getDefaultData()._id && Y.doccirrus.auth.getPRCIP()) {
                    modality.ip = Y.doccirrus.auth.getPRCIP();
                }
            } );
        }
    }

    function GET( args ) {
        Y.doccirrus.mongodb.runDb( {
            action: 'get',
            model: args.model,
            user: args.user,
            query: args.query,
            options: args.options
        }, ( err, res ) => {
            if( res && res.result && Array.isArray(res.result) ) {
                attachRealIpAddressOfPrc( res.result );
            }
            args.callback( err, res );
        } );
    }

    Y.namespace( 'doccirrus.api' ).inpacsmodality = {
        name: NAME,
        testModalityConnection: testModalityConnection,
        saveModalityConfig: saveModalityConfig,
        get: GET
    };

}, '0.0.1', {
    requires: [
        'inpacsworklist-schema',
        'inpacsconfiguration-schema'
    ]
} );
