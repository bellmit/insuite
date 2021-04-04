/*jslint anon:true, nomen:true*/
/*global YUI */

YUI.add( 'validator-registry', function( Y, NAME ) {
        'use strict';

        /**
         * Default ValidatorPrototype
         * @constructor
         */
        function ValidatorPrototype() {
        }

        ValidatorPrototype.prototype = {};

        /**
         * @constructor
         */
        function ValidatorRegistry() {
            this.type = {};
        }

        /**
         * Get a validator by its name or throw an error if the validator was not found
         *
         * @param {string} name Name of the validator
         * @return {object[]}
         * @todo Half-baked since all validators in `Y.doccirrus.validations`. Validators SHOULD be bound to a domain module like schemas by a specific file convention (e.g. <module>/schema/validators.js) and collected during an initialisation phase of all required modules and their dependencies. Also validators SHOULD be parameterizable but stateless functions.
         */
        ValidatorRegistry.prototype.getValidator = function( name ) {
            if ( name.indexOf('.') === -1 ) {
                name = 'common.' + name;
            }

            return name.split('.').reduce( function( namespace, segment ) {
                if ( namespace === undefined || segment in namespace === false ) {
                    throw new Error( 'Unknown multi validator ' + name );
                }

                return namespace[segment];
            }, Y.doccirrus.validations);
        };

        /**
         * @method getType
         * @param {String} type
         * @return {ValidatorPrototype}
         */
        ValidatorRegistry.prototype.getType = function( type ) {
            if( type in this.type === false ) {
                // TODO when this is logged as an error why no throw?
                Y.log( 'Unknown type ' + type, 'error', NAME );
            }
            return this.type[type];
        };

        /**
         * @method registerType
         * @param {String} type
         * @param {Function} func
         * @return {function}
         */
        ValidatorRegistry.prototype.registerType = function( type, func ) {
            if( type in this.type ) {
                // TODO when this is logged as an error why no throw?
                Y.log( 'Validator ' + type + ' is already registered', 'error', NAME );
            }
            this.type[type] = func;
            func.prototype = new ValidatorPrototype();
            return func;
        };

        Y.namespace( 'doccirrus.validator' ).registry = new ValidatorRegistry();
    },
    '0.0.1',
    {
        requires: []
    }
);

