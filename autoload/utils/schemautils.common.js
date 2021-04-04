'use strict';

YUI.add( 'schemautils', function( Y ) {

        var
            // this is the singleton Utils Object for the application
            // at the moment offers static functions
            myUtils;

        /**
         * Constructor for the module class.
         *
         * @class SchemaUtils
         * @private
         */
        function SchemaUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        SchemaUtils.prototype.recoverKey = function recoverKey( obj ) {
            // Skip view models on UI to avoid infinite loop
            if( typeof obj !== 'object' || ! obj || (Y.doccirrus.KoViewModel && (obj instanceof Y.doccirrus.KoViewModel.getBase())) ) {
                return obj;
            }
            Object.keys( obj ).forEach( function( k ) {
                var ov = obj[k];
                if( /\\\\\$|\\\\\-/g.test( k ) ) {
                    var newK = k.replace( /\\\\\$/g, '$' ).replace( /\\\\\-/g, '.' );
                    obj[newK] = ov;
                    delete obj[k];
                }
                recoverKey( ov );
            } );
            return obj;
        };

        SchemaUtils.prototype.prepareKey = function prepareKey( obj ) {
            if( typeof obj !== 'object' || ! obj) {
                return obj;
            }
            Object.keys( obj ).forEach( function( k ) {
                var ov = obj[k];
                if( /[$.]/g.test( k ) ) {
                    var newK = k.replace( /\$/g, '\\\\$' ).replace( /\./g, '\\\\-' );
                    obj[newK] = ov;
                    delete obj[k];
                }
                prepareKey( ov );
            } );
            return obj;
        };

        /**
         * Creates a schema type list from a given enum (key-value object).
         * @param {object} typeObject
         * @param {string|undefined} i18nPrefix?
         * @param {string|undefined} i18nSuffix?
         * @return {{val: string, i18n: string}[]}
         */
        SchemaUtils.prototype.createSchemaTypeList = function createSchemaTypeList( typeObject, i18nPrefix, i18nSuffix ) {
            var result = [];

            Object.keys( typeObject ).forEach( function( type ) {
                result.push( {
                    val: typeObject[type],
                    i18n: Y.doccirrus.i18n(
                        ((typeof i18nPrefix === "string") ? i18nPrefix : "") +
                        typeObject[type] +
                        ((typeof i18nSuffix === "string") ? i18nSuffix : "")
                    )
                } );
            } );

            return result;
        };

        myUtils = new SchemaUtils();

        Y.namespace( 'doccirrus' ).schemautils = myUtils;

    },
    '0.0.1', {
        requires: ['doccirrus']
    }
);
