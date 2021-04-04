/**
 * User: abhijit.baldawa
 * Date: 23.08.19  12:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add('jsdoc-api', function( Y, NAME ) {

    const
        fs = require('fs'),
        util = require('util'),
        {formatPromiseResult, handleResult} = require('dc-core').utils,
        statProm = util.promisify(fs.stat),
        mkdirProm = util.promisify(fs.mkdir),
        writeFileProm = util.promisify(fs.writeFile),
        TYPES_DIR_PATH = `${process.cwd()}/types`;

    /**
     * @private
     *
     * This method writes the jsDocOfSchema string of a <schemaName>-schema.common.js file to a
     * <schemaName>-schema-typedef.js file in types directory
     *
     * @param {string} schemaName - schema name of the *-schema.common.js file
     * @param {string} jsDocOfSchema - generated JSDOC of the schema file
     *
     * @returns {Promise<void>}
     */
    async function writeJsDoc( schemaName, jsDocOfSchema ) {
        const
            filePath = `${TYPES_DIR_PATH}/${schemaName}-schema-typedef.js`;

        let
            err;

        [err] = await formatPromiseResult( writeFileProm(filePath, jsDocOfSchema) );

        if(err) {
            Y.log(`writeJsDoc: Error while writing generated jsDoc for schemaName: '${schemaName}' at path: '${filePath}'. Error: ${err.stack || err}`, "error", NAME);
            throw new Error(`Error while writing generated jsDoc for schemaName: '${schemaName}' at path: '${filePath}'. Error: ${err}`);
        }
    }

    /**
     * @private
     *
     * This method checks if "types" directory is there in project root path i.e "dc-insuite/types".
     * If no, then it creates the types directory
     *
     * @returns {Promise<void>}
     */
    async function checkAndCreateTypesDir() {
        let
            err;

        // ------------------------- 1. Check if TYPES_DIR_PATH exists --------------------------------------------------------
        [err] = await formatPromiseResult( statProm(TYPES_DIR_PATH) );

        if( !err ) {
            Y.log(`checkAndCreateTypesDir: Directory path '${TYPES_DIR_PATH}' already exists, nothing to do...`, "info", NAME);
            return;
        }
        // ------------------------------------------ 2. END -------------------------------------------------------------------


        // ---------------------------- 2. Create TYPES_DIR_PATH directory ----------------------------------------------------
        Y.log(`checkAndCreateTypesDir: Directory path '${TYPES_DIR_PATH}' does not exist. Error: ${err}. Creating directory.`, "info", NAME);

        [err] = await formatPromiseResult( mkdirProm(TYPES_DIR_PATH) );

        if( err ) {
            Y.log(`checkAndCreateTypesDir: Error creating directory at path '${TYPES_DIR_PATH}'. Error: ${err}`, "error", NAME);
            throw new Error(`Error creating directory at path '${TYPES_DIR_PATH}'. Error: ${err}`);
        }
        // ------------------------------------------ 2. END ----------------------------------------------------------------
    }

    /**
     * @private
     *
     * This method returns the JSDOC of a passed in schema object.
     *
     * @param {string} schemaName - Name of the schema
     * @param {Object} schemaObj - A very complex schema object build by reading *-schema.common.js files
     *                  EX. (NOTE: includes all possible fields including OPTIONAL):
     *                      {
     *                          "schemaProp1": [
     *                              {
     *                                  "<subSchemaProp>": {
     *                                      type: <string ex. 'String', 'Boolean' etc. | function (ex. String, Boolean, Date etc.) | [function | "any" | string ex. 'String', 'Boolean' etc.]>,
     *                                      default: <string ex: "">,
     *                                      i18n: <string>,
     *                                      "-en": <string>,
     *                                      "-de": <string>,
     *                                      apiv: {
     *                                          v: <number ex: 2>,
     *                                          queryParam: <boolean ex: true/false>
     *                                      }
     *                                  },
     *                                  ...
     *                              },
     *                              dctype: <string ex: "UtRemedyEntry_T">,
     *                              i18n: <string>,
     *                              "-en": <string>,
     *                              "-de": <string>,
     *                              ...
     *                          ],
     *                          "schemaProp2": {
     *                              type: <string ex. 'String', 'Boolean' etc. | function (ex. String, Boolean, Date etc.) | [function | "any" | string ex. 'String', 'Boolean' etc.]>,
     *                              "-en": <string>,
     *                              "-de": <string>,
     *                              i18n: <string>,
     *                              default: <string>,
     *                              required: <boolean>,
     *                              enum: ["string",...],
     *                              list: <[Object]>,
     *                              apiv: {
     *                                  v: <number ex: 2>,
     *                                  queryParam: <boolean ex. true/false>,
     *                                  readOnly: <boolean ex: true/false>
     *                              }
     *                          },
     *                          "schemaProp3": {}, //NOTE: this is the case if in schema.common.js file type: "any"
     *                          "schemaProp4": {
     *                              "<subSchemaProp>": {
     *                                      type: <string ex. 'String', 'Boolean' etc. | function (ex. String, Boolean, Date etc.) | [function | "any" | string ex. 'String', 'Boolean' etc.]>,
     *                                      default: <string ex: "">,
     *                                      i18n: <string>,
     *                                      "-en": <string>,
     *                                      "-de": <string>,
     *                                      apiv: {
     *                                          v: <number ex: 2>,
     *                                          queryParam: <boolean ex: true/false>
     *                                      }
     *                                  },
     *                                  ...
     *                          }
     *                      }
     *
     *
     * @param {string} moduleName - The module name of JSDOC ex: <schema_name>Schema
     * @param {boolean} [addModuleHeader] - Should add prefix @module <moduleName> at the
     *                                      top of JSDOC or not
     *
     * @returns {string} - JSDOC string
     */
    function getJsDocOfSchemaObject( schemaName, schemaObj, moduleName, addModuleHeader ) {
        const
            modulePrefix = `module:${moduleName}`,
            typeDefName = `${modulePrefix}.${schemaName}`;

        let
            typeDefStr = `/**\n * @typedef {Object} ${typeDefName}`,
            moduleDefStr;

        for( const [schemaProp, schemaPropObj] of Object.entries(schemaObj) ) {
            if( Array.isArray(schemaPropObj) ) {
                const
                    subDocJsDoc = getJsDocOfSchemaObject( `${schemaProp}Obj`, schemaPropObj[0], moduleName ),
                    referSubJsDoc = `\n * @property {Array.<${modulePrefix}.${schemaProp}Obj>} ${schemaProp} - `;

                typeDefStr = `${subDocJsDoc}\n\n\n${typeDefStr}${referSubJsDoc}`;
            } else {
                if( typeof schemaPropObj === "string" ) {
                    /**
                     * This was defined a non standard way meaning, key: "String | Number etc."
                     * An example is: catalogusage-schema.common.js filed "seqId"
                     */
                    typeDefStr += `\n * @property {${schemaPropObj}} ${schemaProp} - `;
                } else if( Object.keys(schemaPropObj).length === 0 ) {
                    // if type is "any" then the schemaObj is empty i.e {}
                    typeDefStr += `\n * @property {Object} ${schemaProp} - `;
                } else if( schemaPropObj.type === undefined ) {
                    // Means this is a sub-object
                    const
                        subDocJsDoc = getJsDocOfSchemaObject( `${schemaProp}Obj`, schemaPropObj, moduleName ),
                        referSubJsDoc = `\n * @property {${modulePrefix}.${schemaProp}Obj} ${schemaProp} - `;

                    typeDefStr = `${subDocJsDoc}\n\n\n${typeDefStr}${referSubJsDoc}`;
                } else if( Array.isArray(schemaPropObj.type) ) {
                    if( typeof schemaPropObj.type[0] === "function" ) {
                        typeDefStr += `\n * @property {Array.<${schemaPropObj.type[0].name}>} ${schemaProp} - `;
                    } else if( schemaPropObj.type[0] === "any" ) {
                        typeDefStr += `\n * @property {Array.<Object>} ${schemaProp} - `;
                    } else if( schemaPropObj.type[0] === false ){
                        /**
                         * This means this field was skipped from being created. Ex _id field inside array of object
                         * and so can safely be ignored
                         */
                        continue;
                    } else if( schemaPropObj.type[0] === "date" ) {
                        typeDefStr += `\n * @property {Date} ${schemaProp} - `;
                    } else {
                        typeDefStr += `\n * @property {Array.<${schemaPropObj.type[0]}>} ${schemaProp} - `;
                    }
                } else if( typeof schemaPropObj.type === "function" ) {
                    typeDefStr += `\n * @property {${schemaPropObj.type.name}} ${schemaProp} - `;
                } else if( schemaPropObj.type === "Bool" ) {
                    // Very rare non standard usages (only 3 in entire codebase)
                    typeDefStr += `\n * @property {Boolean} ${schemaProp} - `;
                } else if( schemaPropObj.type === false ) {
                    // Reason already mentioned above
                    continue;
                } else if( schemaPropObj.type === "date" ) {
                    typeDefStr += `\n * @property {Date} ${schemaProp} - `;
                } else {
                    typeDefStr += `\n * @property {${schemaPropObj.type}} ${schemaProp} - `;
                }
            }
        }

        typeDefStr += `\n */`;

        if( addModuleHeader ) {
            moduleDefStr = `/**\n * @module ${moduleName}\n */`;

            return `${moduleDefStr}\n\n${typeDefStr}`;
        }

        return typeDefStr;
    }

    /**
     * @private
     * @generator
     *
     * This method yields schema name and its corresponding JSDOC one by one and can be
     * iterated in for...of loop
     *
     * @param {string} [onlyForSchemaName] - If present then returns JSDOC only for this schema else
     *                                       returns JSDOC string for all the schema
     * @yields {(string[] | [null, {schemaName: string, schemaJsDoc: string}])}
     */
    function* getJsDocPerSchema( onlyForSchemaName ) {
        if( onlyForSchemaName ) {
            if( Y.doccirrus.schemas[onlyForSchemaName] ) {
                const schemaJsDoc = getJsDocOfSchemaObject( onlyForSchemaName, Y.doccirrus.schemas[onlyForSchemaName].schema, `${onlyForSchemaName}Schema`, true );
                yield [null, {schemaName: onlyForSchemaName, schemaJsDoc}];
            } else {
                yield [`Schema: '${onlyForSchemaName}' does not exist`];
            }
        } else {
            for( const [schemaName, schemaMetaObj] of Object.entries(Y.doccirrus.schemas) ) {
                if( schemaMetaObj.schema ) {
                    const schemaJsDoc = getJsDocOfSchemaObject( schemaName, schemaMetaObj.schema, `${schemaName}Schema`, true );
                    yield [null, {schemaName, schemaJsDoc}];
                }
            }
        }
    }
    /**
     * @public
     * @async
     * @JsonRpcApi
     *
     * This method generates JSDOC for all the schemas and write them in "types" directory under project root directory.
     * If "args.data.onlyForSchemaName" is present then it only generates and writes JSDOC for then mentioned schema
     *
     * @param {Object} args
     *    @param {function(Error, string):void} [args.callback] - If present then response will be sent via callback
     *    @param {Object} args.data
     *       @param {string} [args.data.onlyForSchemaName] - If present then generate JSDOC only for this schema name
     *
     * @returns {Promise<string>}
     */
    async function generateJsDocForSchemas( args ) {
        const
            {callback, data = {}} = args,
            {onlyForSchemaName} = data;

        let
            err,
            schemaGenerateErrors = [],
            schemaGenerateSuccess = [],
            startTime,
            endTime,
            totalTime;

        // ------------------------------------------- 1. Validations ----------------------------------------------------------------
        if( !Y.doccirrus.auth.isDevServer() ) {
            return handleResult( Y.doccirrus.errors.createError(`'JSDOC' can only be generated in development environment`), undefined, callback );
        }

        if( onlyForSchemaName && typeof onlyForSchemaName !== "string" ) {
            return handleResult( Y.doccirrus.errors.createError(`'onlyForSchemaName' parameter can only be a valid string`), undefined, callback );
        }
        // -------------------------------------------------- 1. END ------------------------------------------------------------------


        // ----------------------------------- 2. Check and create types directory if absent ------------------------
        [err] = await formatPromiseResult( checkAndCreateTypesDir() );

        if( err ) {
            Y.log(`generateJsDocForSchemas: Error in checkAndCreateTypesDir. Error: ${err.stack || err}`, "error", NAME);
            return handleResult( Y.doccirrus.errors.createError(err.message), undefined, callback );
        }
        // -------------------------------------------------- 2. END ----------------------------------------------


        // -------------------------------- 3. Generate and write JSDOC of each schema one by one --------------------------
        startTime = +new Date();

        for( const [SCHEMA_NOT_FOUND, {schemaName, schemaJsDoc} = {}] of getJsDocPerSchema(onlyForSchemaName) ) {
            if( SCHEMA_NOT_FOUND ) {
                return handleResult( Y.doccirrus.errors.createError(SCHEMA_NOT_FOUND), undefined, callback );
            } else {
                [err] = await formatPromiseResult( writeJsDoc(schemaName, schemaJsDoc) );

                if(err) {
                    Y.log(`generateJsDocForSchemas: Error in writeJsDoc() for schemaName: '${schemaName}'. Error: ${err.stack || err}`, "error", NAME);
                    schemaGenerateErrors.push(schemaName);
                } else {
                    Y.log(`generateJsDocForSchemas: Generated JSDOC for schema: '${schemaName}'`, "info", NAME);
                    schemaGenerateSuccess.push(schemaName);
                }
            }
        }

        endTime = +new Date();
        totalTime = `${endTime - startTime} ms`;
        // ---------------------------------------------- 3. END -------------------------------------------------------------

        Y.log(`generateJsDocForSchemas: Completed in '${totalTime}'. Total JSDOC's generated = '${schemaGenerateSuccess.length}'${schemaGenerateErrors.length > 0 ? `. Total JSDOC failed = '${schemaGenerateErrors.length}' for schemas: '${schemaGenerateErrors}'` : ''}`);
        return handleResult(null, `Completed in '${totalTime}'. Total JSDOC's generated = '${schemaGenerateSuccess.length}'${schemaGenerateErrors.length > 0 ? `. Total JSDOC failed = '${schemaGenerateErrors.length}' for schemas: '${schemaGenerateErrors}'` : ''}`, callback);
    }

    Y.namespace( 'doccirrus.api' ).jsdoc = {
        name: NAME,
        generateJsDocForSchemas
    };
}, '0.0.1', {
    requires: []
});