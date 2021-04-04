/*global YUI, _ */

YUI.add( 'validator-factory', function( Y, NAME ) {
        'use strict';

        const lodash = Y.doccirrus.commonutils.isClientSide() ? _ : require( 'lodash' ); // eslint-disable-line no-undef
        const countries = Y.doccirrus.commonutils.getCountryModeFromConfigs();

        /**
         * @constructor
         * @private
         */
        function ValidatorFactory() {
        }

        /**
         * Create a multi validator
         *
         * @param {[]} validator
         * @param {string} name
         * @return {*}
         * @static
         */
        ValidatorFactory.createMultiValidator = function( validator, name ) {
            if ( !Array.isArray( validator ) ) {
                throw new Error( 'Unexpected multi validator ' + name + ' ' + JSON.stringify( validator ) );
            }

            const result = validator.filter( function( validator ) {
                if ( validator.countries === undefined ) {
                    return true;
                }

                if ( !Array.isArray( validator.countries ) ) {
                    throw new Error( 'Invalid multi validator entry ' + name + '. Property \`countries\` is not an array.' );
                }

                if ( validator.countries.length < 1 ) {
                    throw new Error( 'Invalid multi validator entry ' + name + '. Property \`countries\` is empty.' );
                }

                if ( validator.countries.filter( function( code ) { return /^(D|CH)$/.test(code); } ).length !== validator.countries.length ) {
                    throw new Error( 'Invalid multi validator entry ' + name + '. Property \`countries\` contains invalid codes.' ); // eslint-disable-line prefer-template
                }

                return lodash.intersection( validator.countries, countries ).length > 0;
            } ).map( function( validator ) {
                const result = Object.assign( {}, validator );

                if ( validator.countries === undefined ) {
                    return result;
                }

                result.validate = function() {
                    if ( !Array.isArray( this.countryMode ) || this.countryMode.length < 1 ) {
                        Y.log( 'Missing \`countryMode\` in context of validation ' + name + '. Validation is skipped.', 'warn', NAME ); // eslint-disable-line prefer-template
                        return true;
                    }

                    if ( lodash.intersection( validator.countries, this.countryMode ).length > 0 ) {
                        return validator.validate.apply( this, arguments ); // eslint-disable-line prefer-rest-params
                    }

                    return true;
                };

                return result;
            } );

            result.__isCountrySpecific = validator.filter( function( validator ) {
                return validator.countries;
            } ).length > 0;

            // sets the identifier for reverse lookups
            result.__identifier = name;

            return result;
        };

        /**
         * Create a single validator
         * @param {string} type
         * @param {object} config
         * @return {ValidatorPrototype}
         * @static
         */
        ValidatorFactory.createValidator = function( type, config ) {
            config = config || {};

            if( typeof type !== 'string' && type instanceof String === false ) {
                throw new Error( 'Unexpected validator type identifier given.'  );
            }

            type = Y.doccirrus.validator.registry.getType( type );

            return new type( config );
        };

        /**
         * @return {[string, string]}
         * @deprecated
         */
        ValidatorFactory.getValidCountryCodes = function() {
            return ['D', 'CH']; // TODO [os]: get from a json config somewhere...
        };

        Y.namespace( 'doccirrus.validator' ).factory = ValidatorFactory;
    },
    '0.0.1',
    {
        requires: [
            'dccommonutils',
            'validator-registry'
        ]
    }
);
