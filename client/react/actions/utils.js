/**
 * User: pi
 * Date: 27.02.18  15:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
export const actionList = {
};

/**
 * Un-registers the websocket listener for the given object
 * @param {Object} listenerObject
 * @returns {Function}
 */
export function unregisterWebSocketListener( listenerObject ) {
    return () => {
        if( listenerObject && listenerObject.removeEventListener ) {
            listenerObject.removeEventListener();
        }
    };
}

/**
 * Checks whether an appreg has a configuration UI endpoint registered
 * @param {Object} args
 * @param {Object} args.appReg
 * @param {Object} args.Y
 * @returns {boolean}
 */
export function appRegContainsConfigurationURL( args ) {
    const {appReg, Y} = args;
    return appReg.uiConfiguration.some( ( config ) => (config.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.CONFIGURATION) );
}