/**
 * User: do
 * Date: 09/11/17  13:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'ehks-filebuilder', function( Y, NAME ) {

        /**
         * @module edmp-filebuilder
         *
         */

        async function buildDocXml( data ) {
            const xsdSchemaVersion = data.context.xsdSchema.version;
            const fileBuilderFileName = `ehksFileBuilder${xsdSchemaVersion}`.replace( '.', '_' );
            const fb = Y.doccirrus[fileBuilderFileName];

            if( !fb ) {
                throw Error( `could not find ehks-filebuilder with version ${xsdSchemaVersion}` );
            }
            Y.log( `build ehks file with version ${xsdSchemaVersion}`, 'info', NAME );
            return fb.buildDocXml( data );
        }

        Y.namespace( 'doccirrus' ).ehksFileBuilder = {
            name: NAME,
            buildDocXml: buildDocXml
        };
    },
    '0.0.1', {requires: ['ehks-filebuilder-2_31', 'ehks-filebuilder-2_32', 'ehks-filebuilder-2_33']}
);