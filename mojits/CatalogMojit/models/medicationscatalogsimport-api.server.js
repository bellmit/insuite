/**
 * User: altynai.iskakova
 * Date: 10.12.20  20:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global YUI */

YUI.add( 'medicationscatalogsimport-api', function( Y, NAME ){
    
    /** @module medicationscatalogsimport-api */

    const
        catalogName = 'medicationscatalogs',
        dirName = 'catalogs-hci',
        hashName = 'hciCatalogHash';

    /**
     * Calls the hciCatalogsImport with arguments specific for medicationscatalogs
     * @param {Function} callback
     * @return {*}
     */
    function medicationsCatalogsImport( callback )  {
        if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
            Y.log( 'Skipping medications catalogs import for non PRC or VPRC', 'info', NAME );
            return callback();
        }
        if( !Y.doccirrus.auth.getDirectories( dirName ) ) {
            Y.log( 'Skipping medications catalogs import, because of missing env.json entry', 'info', NAME );
            return callback();
        }

        Y.doccirrus.catalogsimportutils.genericCatalogImport( {
            catalogName: catalogName,
            dirName: dirName,
            hashName: hashName,
            callback
        } );
    }
    Y.namespace( 'doccirrus.api' ).medicationscatalogsimport = {
        name: NAME,
        init: medicationsCatalogsImport
    };

    },
    '0.0.1', {
        requires: [
            'dccommonutils',
            'dcmongoutils',
            'catalogsimportutils',
            'dccatalogparser',
            'dcauth',
            'admin-schema'
        ]}
);