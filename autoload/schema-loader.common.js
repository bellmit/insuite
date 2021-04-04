/*jslint anon:true, nomen:true*/
/*global YUI, YUI_config, _*/

/**
 * This driver takes a raw DC Schema, parses the types contained,
 * mixes in any referenced external types, and stores the new data
 * structures in place in the schema.
 *
 * Also contains utility functions required.
 *
 * Data structures added:
 *
 * schema --> the object description required to create a mongoose model
 * indexes --> the indexes and key fields
 * paths --> the paths that can be used to access things like validators for single fields.
 *
 */
YUI.add( 'dcschemaloader', function( Y, NAME ) {
        'use strict';

        const lodash = Y.doccirrus.commonutils.isClientSide() ? _ : require( 'lodash' ); // eslint-disable-line no-undef
        const validCountryCodes = Y.doccirrus.validator.factory.getValidCountryCodes();

        /**
         * Cache for (de)serializing schemas on client side
         *
         * Using server and client specific code in common files MUST be always avoided. Schema loader MUST be split
         * up into a server and client module. Current implementation becomes server side module only plus an
         * endpoint for the client which provides the mixed schemas as JSON resource. Client module just fetches from
         * the new endpoint when needed via XHR.
         *
         * @type {SchemaCache}
         */
        const cache = Y.config && !Y.config.debug && Y.doccirrus.schema && Y.doccirrus.schema.Cache &&
            Y.doccirrus.schema.Cache.create( Y.doccirrus.validator.registry );

        /**
         * Stores all processed schemas.
         *
         * @type {Set<any>}
         */
        const processed = new Set();

        /**
         * The loader instance
         *
         * @type {{}}
         */
        var loader = {};

        loader = Y.mix( loader, {

            /**
             * Mix schema for run-time usage into given schema
             *
             * @param {object} schema
             * @param {boolean} keepLists
             * @param {string[]} countryMode
             */
            mixSchema: function( schema, keepLists, countryMode ) {

                var isMirrorSchema = schema && schema.name.startsWith( 'mirror' );

                if( !schema || !schema.name || !schema.types ) {
                    throw new Error( 'Malformed schema given ' + JSON.stringify(schema) );
                }
                if( !schema.types.root ) {
                    throw new Error( 'No root type in schema ' + schema.name );
                }
                if( Array.isArray( countryMode ) && lodash.difference( countryMode, validCountryCodes ).length ) {
                    throw new Error( 'Country Mode [' + countryMode + '] includes non-valid country codes for schema name: ' + schema.name, 'error', NAME );
                }

                loader.prepare( schema );

                /**
                 * @property complexpath
                 * @type {Object}
                 * @deprecated [MOJ-4126]
                 */
                // reset paths
                schema.complexpath = {};

                function parseDoc( ts, nodename, path, pathTypes ) {
                    var
                        i,
                        tlen,
                        tkeys,
                        current,
                        curPath,
                        retschema,
                        localresult,
                        localtype = {},
                        copyPathTypes,
                        referredtypes;

                    // TODO MOJ-11007: Note the the keys are filtered two level deep at the moment. They need to be filtered across all levels however.

                    copyPathTypes = Y.mix( [], pathTypes );
                    // First check for schema loops (schema structural recursion),
                    // if we already had this type (for this schema) then somehow
                    // it is recursively including itself, which is NOT allowed.
                    if( -1 < copyPathTypes.indexOf( nodename ) && nodename !== 'root' ) { // TODO [os]: add proper check here
                        throw new Error( 'Type ' + nodename + ' already included, warning recursion in ' +
                                         schema.name + ', on path ' + JSON.stringify( pathTypes ) +
                                         '.', 'error', NAME );
                    } else {
                        copyPathTypes.push( nodename );
                    }

                    /**
                     * Index path to complex type.
                     * @method addPathToComplexTypeIndex
                     * @deprecated [MOJ-4126]
                     */
                    function addPathToComplexTypeIndex() {
                        schema.complexpath[current.type] = curPath;
                    }

                    /**
                     *
                     * @return {Object}
                     */
                    function getCurrentTypes() {
                        if( 'object' === typeof current.lib ) {
                            return ts;
                        }
                        if( current.lib && 'string' === typeof current.lib ) {
                            if( Y.doccirrus.schemas[current.lib] ) {
                                return Y.doccirrus.schemas[current.lib].types;
                            }
                            return {};
                        }
                    }

                    /**
                     * generates a mongoose style enum list from a more
                     * detailled DC enum list
                     * @param list
                     * @returns {Array}
                     */
                    function generateEnumsFromList( list ) {
                        var i, t, result = [];
                        if( list ) {
                            for( i = 0; i < list.length; i++ ) {
                                t = list[i];
                                if( t.type && t.type !== 'string' ) {
                                    Y.log( 'enum validation only applies to string type in mongoose', 'warn', NAME );
                                }
                                result.push( t.val );
                            }
                        }
                        return result;
                    }

                    /**
                     *  we are including a schema within an array in this
                     *  element,  e.g.  patientData: [ {inc_schema}, {inc_schema}]
                     */
                    function recursiveIncludeSubDoc( myTypes ) {
                        if( current.type && ('object' === typeof myTypes[current.type]) ) {
                            retschema = parseDoc(
                                myTypes,
                                current.type,
                                curPath,
                                copyPathTypes
                            );
                            if( retschema ) {
                                localresult = [];
                                localresult.push( retschema );
                                localtype[tkeys[i]] = localresult;
                                // add doc type
                                localtype[tkeys[i]].dctype = current.type;

                                localtype[tkeys[i]]['-de'] = current['-de']; // @deprecated
                                localtype[tkeys[i]]['-en'] = current['-en']; // @deprecated
                                // translation property
                                localtype[tkeys[i]].i18n = current.i18n;
                                localtype[tkeys[i]]['rule-engine'] = current['rule-engine'];
                                // support required for SubDoc
                                if( Y.Object.owns( current, 'required' ) && !isMirrorSchema ) {
                                    localtype[tkeys[i]].required = current.required;
                                }
                                // support validate for SubDoc
                                if( Y.Object.owns( current, 'validate' ) && !isMirrorSchema ) {
                                    localtype[tkeys[i]].validate = current.validate;
                                }
                                // support apiv for SubDoc
                                if( Y.Object.owns( current, 'apiv' ) ) {
                                    if( Array.isArray( localtype[tkeys[i]] ) && localtype[tkeys[i]][0] ) {
                                        // transfer to children
                                        Y.Object.each( localtype[tkeys[i]][0], function( child_prop ) {
                                            child_prop.apiv = Y.merge( {}, current.apiv, child_prop.apiv || {} );
                                        } );
                                    } else {
                                        localtype[tkeys[i]].apiv = current.apiv;
                                    }
                                }
                            }
                            // else warn about the empty subtype?
                        } else {
                            throw new Error( 'Cannot find referenced type: ' +
                                             schema.name +
                                             '.' +
                                             tkeys[i], 'error', NAME );
                        }
                    }

                    /**
                     * We are extending a schema and replacing this node
                     * element. localtype[tkeys[i]] will not exist in the target!
                     * We have to parse the target, hence also recursive.
                     */
                    function recursiveExtendSubDoc( myTypes ) {
                        if( current.type && ('object' === typeof myTypes[current.type]) ) {
                            //Y.log( '*--> merging ' + current.type );
                            Y.mix( localtype,
                                parseDoc(
                                    myTypes,
                                    current.type,
                                    path,
                                    copyPathTypes
                                )
                            );
                        }
                        else {
                            throw new Error( 'Trying to extend from custom type that cannot be found. Ref: ' +
                                             schema.name +
                                             '.' +
                                             tkeys[i], 'error', NAME );
                        }
                    }

                    /**
                     * We are setting the current element equal to the
                     * given reference (mainly autogenerated enums), i.e.
                     * the complex type refers to an object which is the
                     * actual type of this element.
                     */
                    function equalsComplexType( myTypes ) {
                        var
                            l;
                        if( current.type && ('object' === typeof myTypes[current.type]) ) {
                            //console.log( '*--> equals :: ' + current.type + ' :: ' + tkeys[i] );
                            l = localtype[tkeys[i]] = Y.merge( {}, myTypes[current.type] );
                            if( isMirrorSchema ) {
                                delete localtype[tkeys[i]].validate;
                                delete localtype[tkeys[i]].required;
                            }
                            if( l.list ) {
                                l.enum = generateEnumsFromList( l.list );
                                if( !keepLists ) {
                                    delete l.list;
                                }

                            }
                            if( current.required && !isMirrorSchema ) {
                                l.required = current.required;
                            }
                            if( current.validate && !isMirrorSchema ) {
                                l.validate = current.validate;
                            }
                            if( current.apiv ) {
                                l.apiv = current.apiv;
                            }
                        }
                        else {
                            throw new Error( 'Trying to equal custom type that cannot be found. Ref: ' +
                                             schema.name +
                                             '.' +
                                             tkeys[i], 'error', NAME );
                        }
                    }

                    tkeys = Y.Object.keys( ts[nodename] );

                    tlen = tkeys.length; // sanity check that there are no unused types.

                    for( i = 0; i < tlen; i++ ) {
                        curPath = ( path ? path + '.' + tkeys[i] : tkeys[i] );

                        current = ts[nodename][tkeys[i]];

                        // check that we have not already mixed in this
                        // element - can happen with commonly named elements,
                        // like 'name', 'type', etc. If so throw an error.
                        // The data modellers must make amends!
                        if( undefined !== localtype[tkeys[i]] && !current.override ) {
                            throw new Error( 'Element ' + nodename + '.' + tkeys[i] + ' already mixed in from another type in ' +
                                             schema.name + '. Types used were: ' +
                                             JSON.stringify( copyPathTypes ), 'error', NAME );
                        }

                        if( Array.isArray( current ) ) {
                            if( 1 === current.length ) {
                                if( String === current[0] ) {
                                    localtype[tkeys[i]] = [String];
                                } else if( Number === current[0] ) {
                                    localtype[tkeys[i]] = [Number];
                                }
                            } else {
                                throw new Error( 'Simple Array Types must have a single Type member e.g. [String]. Ref: ' +
                                                 schema.name +
                                                 '.' +
                                                 tkeys[i] );
                            }
                        } else if( 'object' === typeof current ) {
                            if( current.complex ) {
                                referredtypes = getCurrentTypes();
                                if( 'inc' === current.complex ) {
                                    // only here do we nest elements the other complex
                                    // operations do not affect the path.
                                    addPathToComplexTypeIndex();
                                    recursiveIncludeSubDoc( referredtypes );

                                    // support "required" for SubDoc arrays
                                    if( Y.Object.owns( current, 'required' ) && !isMirrorSchema ) {
                                        schema.subSchemaValidators[curPath] = {required: current.required};
                                    }

                                    // support validation for SubDoc arrays
                                    if( Y.Object.owns( current, 'validate' ) && !isMirrorSchema ) {
                                        schema.subSchemaValidators[curPath] = {validate: current.validate};
                                    }

                                } else if( 'ext' === current.complex ) {
                                    recursiveExtendSubDoc( referredtypes );
                                } else if( 'eq' === current.complex ) {
                                    equalsComplexType( referredtypes );
                                }
                            } else if( current.type && current.type.toLowerCase && 'any' === current.type.toLowerCase() ) {
                                // create just an empty object to create a mixed type
                                // drop all other attributes, for now
                                localtype[tkeys[i]] = {};
                            } else if( current.type && current.type.toLowerCase && 'array' === current.type.toLowerCase() ) {
                                throw new Error( 'Array Type unsupported by SchemaLoader, use complex type "inc" instead, ref. ' +
                                                 schema.name +
                                                 '.' +
                                                 tkeys[i] );
                            } else {
                                // carry over the object as is
                                localtype[tkeys[i]] = Y.merge( {}, current );
                                if( isMirrorSchema ) {
                                    delete localtype[tkeys[i]].validate;
                                    delete localtype[tkeys[i]].required;
                                }
                            }
                        } else {
                            throw new Error( 'Field type definition not an object: ' +
                                             schema.name +
                                             '.' +
                                             tkeys[i], 'error', NAME );
                        }
                    }

                    return localtype;
                }

                Y.log( 'Mixing in schemas ' + schema.name, 'debug', NAME );

                schema.subSchemaValidators = {}; // will contain validators for sub-documents (containing some meta data as well)

                // kick off the parsing process with the root node
                schema.schema = cache && cache.has( schema.name ) ? cache.get( schema.name ) : parseDoc( schema.types, 'root', '' );

                if ( cache && !cache.has( schema.name ) ) {
                    cache.set( schema.name, schema.schema );
                }
            },
            /**
             * Get schema name from a file name / YUI model name
             *
             * @param name  e.g. calendar-schema
             * @returns {*}  returns 'calendar'
             */
            deriveSchemaName: function( name ) {
                if( 'string' === typeof name ) {
                    return (/(\w*)-schema/).exec( name )[1];
                }
                return null;
            },
            /**
             * Get process name from a file name / YUI model name
             *
             * @param name  e.g. calendar-process
             * @returns {*}  returns 'calendar'
             */
            deriveProcessName: function( name ) {
                if( 'string' === typeof name ) {
                    return (/(\w*)-process/).exec( name )[1];
                }
                return null;
            },
            /**
             * Get ruleset name from a file name / YUI model name
             *
             * @param name  e.g. calendar-ruleset
             * @returns {*}  returns 'calendar'
             */
            deriveRuleSetName: function( name ) {
                if( 'string' === typeof name ) {
                    return (/(\w*)-ruleset/).exec( name )[1];
                }
                return null;
            },
            getSchemaForSchemaName: function( schemaname ) {
                if( !Y.Object.owns( Y.doccirrus, 'schemas' ) || !Y.Object.owns( Y.doccirrus.schemas, schemaname ) ) {
                    return false;
                }
                return Y.doccirrus.schemas[schemaname];
            },
            getTypeForSchemaPath: function( schema, path ) {
                var
                    i,
                    current,
                    pathlist = path.split( '.' );

                if( !schema ) {
                    return;
                }
                if( '_simple' === schema ) {
                    // just generate the typeObj
                    current = {};
                    current.type = 'String';
                    // MOJ-306 -> we use now simple types, but they must not be required
                    // this might cause collateral damage to other simple validations!!!!
                    current.required = 'mandatory' === path;
                    if( Y.doccirrus.validations.common[pathlist[0]] ) {
                        current.validate = Y.doccirrus.validations.common[pathlist[0]];
                    }
                }
                else {
                    if( !schema.complexpath || 'object' !== typeof schema.complexpath ) {
                        loader.mixSchema( schema );
                    }
                    current = schema.schema[pathlist.shift()];
                    for( i = 0; i < pathlist.length; i++ ) {
                        if( !Y.Lang.isUndefined( current && current[0] ) ) {
                            current = current[0][pathlist[i]]; // go next level
                        } else {
                            break; // as soon as we hit an unknown part of the path, we exit.
                        }
                    }
                }
                return current;
            },
            /**
             * @method getPathForComplexType
             * @param schema
             * @param type
             * @return {*}
             * @deprecated [MOJ-4126]
             */
            getPathForComplexType: function( schema, type ) {
                // cache the paths structure, which is derived when mixing the names
                if( !schema.complexpath || 'object' !== typeof schema.complexpath ) {
                    loader.mixSchema( schema );
                }
                return schema.complexpath[type];
            },
            getEmptyDataForSchema: function( schema ) {

                function isSimple( value ) {
                    if( Array.isArray( value ) ) {
                        if( value[0] && 'object' === typeof value[0].type ) {
                            return false;
                        }

                    }
                    return true;
                }

                function isEnum( value ) {
                    if( !isSimple( value ) ) {
                        return (value.enum);
                    }
                    return false;
                }

                if( !schema.schema || 'object' !== typeof schema.schema ) {
                    loader.mixSchema( schema );
                }

                function printSchemaLevel( cur ) {
                    var
                        result = {},
                        mycur = cur,
                        val,
                        item;
                    for( item in mycur ) {
                        if( mycur.hasOwnProperty( item ) ) {
                            val = mycur[item];
                            if( isSimple( val ) ) {
                                if( isEnum( val ) ) {
                                    result[item] = val.enum[0]; // select options...
                                } else if( Array.isArray( val ) ) {
                                    result[item] = [];
                                } else if( Array.isArray( val ) ) {
                                    result[item] = null;
                                } else {
                                    result[item] = '';
                                }
                            } else {
                                result[item] = [printSchemaLevel( val[0] )];
                            }

                        }
                    }
                    return result;
                }

                return printSchemaLevel( schema.schema );
            },
            /**
             * Also analyses paths as in Rulesets, can be used in getTranslation(),
             * to derive the first parameter.
             *
             * @param schemaNamePath,   e.g.  'patient'  or   'patient.firstname'
             * @returns {*}
             */
            getSchemaByName: function( schemaNamePath ) {
                var schema,
                    schemaNamePathArray = schemaNamePath.split( '.' ),
                    schemaName = schemaNamePathArray[0],
                    schemaSubPath = schemaNamePathArray.slice( 1 ).join( '.' );

                if( schemaName ) {
                    schema = loader.getSchemaForSchemaName( schemaName );
                    if( schema ) {
                        if( schemaSubPath ) {
                            schema = loader.getTypeForSchemaPath( schema, schemaSubPath );
                            if( Y.Lang.isArray( schema ) ) {
                                schema = schema[0];
                            }
                        } else {
                            schema = schema.schema;
                        }
                    }
                }

                return schema;
            },
            /**
             * Get translation for field.
             * Works on server or client.
             *
             * e.g. Y.doccirrus.schemaloader.getTranslation
             *   (
             *              Y.doccirrus.schemaloader.getSchemaByName( ruleSetField.schema ),
             *              getName( ruleSetField.path ),
             *              '-de'
             *   );
             *
             * Accesses the definition of the fields via the mixed schema, i.e. can
             * also resolve nested subtypes from the path easily.
             *
             * @param schema {Object} raw schema object carried in the DC schema
             * @param name {String} name of the field (only first level as yet)
             * @param country  {String}  e.g. '-de'
             * @returns {*}
             */
            getTranslation: function( schema, name, country ) {
                if( schema && name && country && schema[name] && schema[name].length ) {
                    return schema[name][country];
                }
                return null;
            },
            /**
             * Get translation for an enum in a field.
             * Accesses subtypes directly by schema / type pair.
             *
             * Works on server or client.
             *
             * @param schema  {String} e.g. 'patient'
             * @param type  {String}  e.g. 'Title_E'
             * @param value  {String}  e.g. 'MR'
             * @param lang  {String}  e.g. '-de'
             * @param def {String} e.g. 'MS'
             */
            getEnumListTranslation: function( schema, type, value, lang, def ) {
                var
                    s = Y.doccirrus.schemas[schema],
                    l = s && s.types[type] && s.types[type].list;
                return loader.translateEnumValue( lang, value, l, def );
            },
            /**
             * Filter out items without "CH" value in country mode if praxis does not contains "CH" in country mode
             *
             * @param values  {Array} e.g. Insurance_E.list
             */
            filterEnumByCountryMode: function( values ) {

                if (!values || !values.length) {
                    return [];
                }

                var countryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];

                return values.filter( function( item ) {
                    return countryMode.find( function( mode ) {
                        return item.countryMode.indexOf( mode ) !== -1;
                    });
                });
            },
            /**
             *
             * @param lang
             * @param key
             * @param list
             * @param def
             * @returns {*}
             */
            translateEnumValue: function( lang, key, list, def ) {
                def = def || '';
                var
                    i;
                if( key && Array.isArray( list ) ) {
                    for( i = 0; i < list.length; i++ ) {
                        if( list[i].val === key ) {
                            return list[i][lang];
                        }
                    }
                }
                return def;
            },

            /**
             * Gets array for enum list
             * @param {String} pathPrefix used to get translations e.g. "employee-schema.NotificationType_E"
             * @param {Object|Array} typeList
             * @returns {Array}
             * @example
             *  getSchemaTypeList( 'employee-schema.NotificationType_E', [ 'TEST' ] )
             *
             *  returns
             *  [
             *      {
             *          val: 'TEST',
             *          i18n: ( 'employee-schema.NotificationType_E.TEST.i18n'),
             *          '-en': 'TEST',
             *          '-de': 'TEST'
             *      }
             *  ]
             *
             *  getSchemaTypeList( 'employee-schema.NotificationType_E', { TEST: 'test' } )
             *
             *  returns
             *
             *  [
             *      {
             *          val: 'test',
             *          i18n: ( 'employee-schema.NotificationType_E.test.i18n'),
             *          '-en': 'TEST',
             *          '-de': 'TEST'
             *      }
             *  ]
             */
            getSchemaTypeList: function( pathPrefix, typeList ){
                var
                    result = [];
                if( '.' !== pathPrefix.slice( -1 ) ) {
                    pathPrefix += '.';
                }
                if( Array.isArray( typeList ) ) {
                    typeList.forEach( function( type ) {
                        result.push( {
                            val: type,
                            i18n: Y.doccirrus.i18n( pathPrefix + type + '.i18n' ),
                            '-en': type,
                            '-de': type
                        } );
                    } );
                } else {
                    Object.keys( typeList ).forEach( function( type ) {
                        result.push( {
                            val: typeList[ type ],
                            i18n: Y.doccirrus.i18n( pathPrefix + typeList[ type ] + '.i18n' ),
                            '-en': type,
                            '-de': type
                        } );
                    } );
                }

                return result;
            },

            /**
             * Iterates through the given schema.
             * 
             * @param {Object} schema
             * @param {Function} callback
             */
            forEach: function( schema, callback ) {
                const visited = new Set();
                const stack = [ schema ];
                var node, edge;

                while ( node = stack.pop() ) { // eslint-disable-line no-cond-assign
                    if ( visited.has( node ) ) {
                        continue;
                    }
                    for ( edge in node ) { // eslint-disable-line no-unused-vars
                        if ( !node.hasOwnProperty(edge) ) {
                            continue;
                        }
                        if ( node[edge] instanceof Object === false || node[edge] instanceof String || node[edge] instanceof Number ) {
                            callback( node, edge ); // eslint-disable-line callback-return
                            continue;
                        }
                        stack.push( node[edge] );
                    }
                    visited.add( node );
                }
            },

            /**
             * Prepare schema for runtime usage
             *
             * @param {object} schema
             */
            prepare: function( schema ) {
                // skipped when already processed
                if( processed.has( schema ) ) {
                    return;
                }

                // load all validators of the given schema
                loader.forEach( schema, function( object, key ) {
                    if ( key !== 'validate' ) {
                        return;
                    }

                    if ( typeof object[key] !== 'string' ) {
                        throw new Error( 'Unexpected validator reference in schema ' + schema.name );
                    }

                    const validator = Y.doccirrus.validator.registry.getValidator( object[key] );

                    object[key] = Y.doccirrus.validator.factory.createMultiValidator( validator, object[key] );

                    if ( object[key].length < 1 ) {
                        delete object[key];
                    }
                } );

                // each schema must have this function
                if( typeof schema.getReadOnlyFields !== 'function' ) {
                    schema.getReadOnlyFields = function () { return []; };
                }

                // @deprecated we should not use several layers for data types
                schema.dctype = schema.type;

                processed.add( schema );
            }
        } );

        Y.namespace( 'doccirrus' ).schemaloader = loader;

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dccommonutils',
            'validator-factory',
            'validator-registry',
            'schema-cache'
        ]
    }
);
