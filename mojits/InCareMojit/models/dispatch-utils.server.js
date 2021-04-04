/**
 * User: pi
 * Date: 02/02/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'dispatchUtils', function( Y, NAME ) {

        Y.namespace( 'doccirrus' ).dispatchUtils = {
            getModuleSystemType( tenantId, subType ){
                if( 'DOQUVIDE' === subType || 'DQS' === subType ){
                    subType = 'DSCK';
                }
                if( Y.doccirrus.licmgr.hasSupportLevel( tenantId, Y.doccirrus.schemas.settings.supportLevels.TEST ) ) {
                    subType += 'TEST';
                }
                Y.log( `System is using ${subType} system sub type to find InCare dispatcher`, 'info', NAME );
                return subType;
            }
        };

    },
    '0.0.1', {
        requires: [
            'dclicmgr',
            'settings-schema'
        ]
    }
);
