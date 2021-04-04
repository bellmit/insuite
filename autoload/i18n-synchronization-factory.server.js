/*global YUI */

YUI.add( 'i18n-synchronization-factory', function( Y, NAME ) {

    const IPC_EVENT_LANGUAGE_CHANGE = 'SET_LANGUAGE';

    /**
     * Create proxy for the given i18n function to synchronize it settings in the cluster
     *
     * @param {Function} i18n
     * @return {Proxy}
     */
    Y.namespace( 'doccirrus.intl' ).createSynchronization = (i18n) => {
        // check if a proxy is already set up for synchonization
        if ( i18n.__synchonized ) {
            return i18n;
        }

        if ( typeof i18n !== 'function' || 'language' in i18n === false ) {
            throw new Error('Unexpected argument');
        }

        Y.doccirrus.ipc.subscribeNamed(
            IPC_EVENT_LANGUAGE_CHANGE,
            NAME,
            true,
            ( language ) => {
                if (i18n.language === language) {
                    return;
                }

                Y.log( `Change language to ${language}`, 'info', NAME );

                i18n.language = language;
            }
        );

        // intercept when the language will be
        // changed to propagate it in the cluster
        return new Proxy( i18n, {
            get: (target, property) => {
                if ( property === '__synchronized' ) {
                    return true;
                }
                return Reflect.get(target, property);
            },
            set: (target, property, value) => {
                if (property === 'language' && value !== Reflect.get(target, property)) {
                    Y.log( `Change language to '${value}' notify other workers`, 'info', NAME );
                    Y.doccirrus.ipc.send( IPC_EVENT_LANGUAGE_CHANGE, value, false, false );
                }
                return Reflect.set(target, property, value);
            }
        } );
    };

}, '1.0.0', {
    requires: [
        'dcipc'
    ]
} );
