/**
 * User: florian
 * Date: 11.01.21  14:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

/**
 * Provides the dc-Ti libary functionality for inSuite.
 */
YUI.add( 'dcTi', async function( Y, NAME ) {

    let ti = await import( '@dc/ti' );
    const {getCache} = require( '../helpers/cachingUtils' )( Y, NAME );

    function getTi() {
        return ti;
    }

    /**
     * Initalize an instance of the KIM libary, if there is a instance give it back. Singleton pattern.
     * @returns {Object}
     * @private
     */
    function getKim() {
        let {KIM} = ti;
        return new KIM( Y.log );
    }

    async function createConnector( args ) {
        const {Connector} = ti;
        return new Connector( args );
    }

    async function getConnectorServiceDeps( {user} ) {
        const serviceInfo = await getCache( `${user.tenantId}tiServicesInfo` );
        const tiSettings = await Y.doccirrus.api.tisettings.get( {user} );

        if( !serviceInfo ) {
            throw Error( 'Can not get connector deps: TI service infos are not cached!' );
        }
        if( !tiSettings || !tiSettings.length ) {
            throw Error( 'Can not get connector deps: TI settings not found!' );
        }

        return {tiSettings: tiSettings[0], serviceInfo};
    }

    async function createVSDM( args ) {
        const {user} = args;
        const {VSDM} = ti;
        const deps = await getConnectorServiceDeps( {user} );
        return new VSDM( {user, ...deps, log: Y.log} );
    }

    async function createQES( args ) {
        const {user} = args;
        const {QES} = ti;
        const deps = await getConnectorServiceDeps( {user} );
        return new QES( {user, ...deps, log: Y.log} );
    }

    function getQES() {
        const {QES} = ti;
        return QES;
    }

    Y.namespace( 'doccirrus' ).dcTi = {
        /**
         * @property name
         * @type {String}
         * @default dcTi
         * @protected
         */
        name: NAME,
        getTi,
        getKim,
        getQES,
        createVSDM,
        createQES,
        createConnector

    };
}, '0.0.1', {
    requires: []
} );