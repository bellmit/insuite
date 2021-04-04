/*global YUI*/
'use strict';
YUI.add( 'v_worklistdata-schema', function( Y, NAME ) {

    var
        // ------- Schema definitions  -------
        types = {};

    Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    types = Y.mix( types,
        {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "VWorkListData_T",
                    "lib": types
                }
            },

            "VWorkListData_T": {
                "Base": {
                    "complex": "ext",
                    "type": "WorkListData_T",
                    "lib": "inpacsworklist"
                }
            }
        }
    );

    Y.namespace( 'doccirrus.schemas' )[NAME] = {

        name: NAME,
        types: types
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'dcschemaloader',
        'inpacsworklist-schema'
    ]
} );