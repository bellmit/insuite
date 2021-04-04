function mockAppregApi( Y ) {
    const
        EventEmitter = require( 'events' ).EventEmitter,
        event = new EventEmitter(),
        {handleResult} = require( 'dc-core' ).utils,
        original = Y.doccirrus.api.appreg;

    Y.doccirrus.api.appreg._writeConfigFile = function( params, callback ) {
        event.emit( 'onWriteConfigFile', params );
        if( params.deleteConfig ) {
            return callback( null );
        }
        callback( null, params.configString );
    };

    Y.doccirrus.api.appreg._executeSolCommand = async function( params, callback ) {
        event.emit( 'onExecuteSolCommand', params );
        const
            {commandName} = params,
            solUpdatesList = '{"updateSols":[{"name":"batsol","version":"2.0.0"}]}',
            solsList = [{}];
        switch( commandName ) {
            case 'listUpdatesCommand':
                event.emit( 'onExecuteListUpdatesCommand', params );
                return handleResult( null, solUpdatesList, callback );
            case 'listCommand':
                event.emit( 'onExecuteSolsListCommand', params );
                return handleResult( null, solsList, callback );
            case 'enableCommand':
                event.emit( 'onExecuteEnableCommand', params );
                return handleResult( null, '{}', callback );
            case 'restartCommand':
                event.emit( 'onExecuteRestartCommand', params );
                return handleResult( null, '{}', callback );
            case 'disableCommand':
                event.emit( 'onExecuteDisableCommand', params );
                return handleResult( null, '{}', callback );
            case 'removeCommand':
                event.emit( 'onExecuteRemoveCommand', params );
                return handleResult( null, null, callback );
            case 'installCommand':
                event.emit( 'onExecuteInstallCommand', params );
                return handleResult( null, null, callback );
            default:
                return handleResult( null, '{}', callback );
        }
    };

    Y.doccirrus.api.appreg.event = event;

    Y.doccirrus.api.appreg._getSolsConfig = function() {
        const
            solsConfig = {};
        solsConfig.enableCommand = `enableCommand`;
        solsConfig.disableCommand = `disableCommand`;
        solsConfig.restartCommand = 'restartCommand';
        solsConfig.installCommand = 'installCommand';
        solsConfig.removeCommand = 'removeCommand';
        solsConfig.removeCommand = 'removeCommand';
        solsConfig.listCommand = 'listCommand';
        solsConfig.configBaseDir = 'configBaseDir';
        solsConfig.mongoDBHost = 'mongoDBHost';
        solsConfig.mongoDBPort = 'mongoDBPort';
        solsConfig.inSuiteHost = 'inSuiteHost';
        solsConfig.inSuitePort = 'inSuitePort';
        solsConfig.minLocalPort = 4200;
        solsConfig.maxLocalPort = 4399;
        return solsConfig;
    };
    return original;
}

module.exports = mockAppregApi;