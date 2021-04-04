/**
 * User: pi
 * Date: 17/01/2018  11:15
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
'use strict';
YUI.add( 'company-lib', function( Y ) {
        var
            systemTypes = Object.freeze( {
                TRIAL: 'TRIAL',
                APPLIANCE: 'APPLIANCE',
                MEDNEO: 'MEDNEO',
                INCARE: 'INCARE',
                INSPECTOR_LEARNING_SYSTEM: 'INSPECTOR_LEARNING_SYSTEM',
                INSPECTOR_EXPERT_SYSTEM: 'INSPECTOR_EXPERT_SYSTEM',
                INSPECTOR_SELECTIVECARE_SYSTEM: 'INSPECTOR_SELECTIVECARE_SYSTEM',
                AB: 'AB',
                DSCK: 'DSCK'
            } );

        function createSchemaSystemTypeList() {
            var
                result = [];
            Object.keys( systemTypes ).forEach( function( type ) {
                result.push( {
                    val: systemTypes[ type ],
                    i18n: systemTypes[ type ]
                } );
            } );

            return result;
        }

        /**
         * @property company
         * @for Y.doccirrus.helpers
         */
        Y.namespace( 'doccirrus' ).companyLib = {
            createSchemaSystemTypeList: createSchemaSystemTypeList,
            systemTypes: systemTypes
        };
    },
    '0.0.1', { requires: [] }
);
