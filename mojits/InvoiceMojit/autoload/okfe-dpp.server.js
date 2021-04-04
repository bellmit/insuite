/**
 * User: do
 * Date: 17/06/16  16:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'okfe-dpp', function( Y, NAME ) {

        const
            CONFIG_FILE_NAME = 'dc_config.xml',
            {spawn} = require( 'child_process' ),
            {join} = require( 'path' ),
            XmlParser = require( 'xml2js' ).Parser,
            {writeFile, readFile} = require( 'fs' ).promises,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            getObject = Y.doccirrus.commonutils.getObject,
            schemaMap = {
                2020: {
                    interface_LE_WEICH: 'xsd/interface_LE_WEICH/2020_kv_pid_1.0_Export.xsd',
                    interface_LE_DAS: 'xsd/interface_LE_DAS/interface_LE_KV.xsd',
                    xslPath: 'xsl/2020_DPP_V08.aqxsl'
                },
                2021: {
                    interface_LE_WEICH: 'xsd/interface_LE_WEICH/2021_kv_pid_1.0_Export.xsd',
                    interface_LE_DAS: 'xsd/interface_LE_DAS/interface_LE_KV.xsd',
                    xslPath: 'xsl/2021_DPP_V04.aqxsl'
                }
            };


        function
        createConfigFile( config ) {
            const {inputDir, outputDir, schemaType, year} = config;
            const schemaPath = schemaMap[year][schemaType];
            const xslPath = schemaMap[year].xslPath;

            // TODO: registration??
            return `<?xml version="1.0" encoding="UTF-8"?>
<config>
    <provider>
        <address>Bessemerstr. 82, 12103 Berlin</address>
        <email>info@doc-cirrus.com</email>
        <fax>+49.30.20898729.9</fax>
        <function>Softwarehersteller</function>
        <name>Doc Cirrus GmbH</name>
        <phone>+49.30.20898729.0</phone>
        <registration>sw12345</registration>
    </provider>
    <gui>false</gui>
    <input_path recursive="false">${inputDir}</input_path>
    <output_path>${outputDir}</output_path>
    <xsd_path>${schemaPath}</xsd_path>
    <xsl_path>${xslPath}</xsl_path>
</config>`;
        }

        async function writeConfigFile( args ) {
            const {tmpDir, inputDir, outputDir, schemaType, year} = args;
            const configFile = createConfigFile( {inputDir, outputDir, schemaType, year} );
            const configFilePath = join( tmpDir, CONFIG_FILE_NAME );
            await writeFile( configFilePath, configFile );
            return configFilePath;
        }

        async function spawnValidationTool( args ) {
            const {configFilePath, xpmDir} = args;

            let [err, command] = await formatPromiseResult( Y.doccirrus.binutilsapi.constructShellCommand( {
                bin: 'java',
                shellArgs: [
                    '-Xmx1G',
                    '-XX:+UseG1GC',
                    '-jar datenpruefprogramm-4.2.0-jar-with-dependencies.jar',
                    `-c ${configFilePath}`
                ]
            } ) );

            if( err ) {
                Y.log( `could not construct shell okfe-dpp command: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            Y.log( `executing okfe-pm ${command} in ${xpmDir}`, 'info', NAME );
            return new Promise( ( resolve, reject ) => {

                let params = command.split( ' ' ).filter( el => el.trim() ),
                    returnedAlready = false;

                const processExitStatus = ( code ) => {
                    if( !returnedAlready ) { //return only once
                        returnedAlready = true;
                        resolve( code );
                    }
                };

                if( !params.length ) {
                    return reject( Error( 'okfe-pm: command not given' ) );
                }

                const pmProcess = spawn( params[0], params.slice( 1 ), {cwd: xpmDir, shell: true} );

                pmProcess.stderr.on( 'data', ( data ) => {
                    Y.log( `okfe-pm stderr: ${data}`, 'warn', NAME );
                } );

                pmProcess.stdout.on( 'data', ( data ) => {
                    Y.log( `okfe-pm stdout: ${data}`, 'info', NAME );
                } );

                pmProcess.on( 'error', ( error ) => {
                    Y.log( `okfe-pm  error spawning kbv-pm  ${error}`, 'warn', NAME );
                    processExitStatus( error && error.code );
                } );

                pmProcess.on( 'close', ( code ) => {
                    Y.log( `okfe-pm  ${command} in ${xpmDir} exited with code ${code}`, 'info', NAME );
                    processExitStatus( code );
                } );
            } );
        }

        // QDOCU: error: type === H, warning: type === W
        function _formatErrors( arrayOfErrors ) {
            let errors = {};
            let warnings = {};
            errors.group = [];
            warnings.group = [];
            // eslint-disable-next-line guard-for-in
            for( let result of arrayOfErrors ) {
                let type = getObject( 'rule_type.0.$.V', result );
                if(type === 'H') {
                    errors.group.push( {
                        text: getObject( 'error_message.0.$.V', result )
                    } );
                } else if (type === 'W') {
                    warnings.group.push( {
                        text: getObject( 'error_message.0.$.V', result )
                    } );
                }

                if(!type && result) {
                    errors.group.push( {
                        text: getObject( 'error_message.0.$.V', result )
                    } );
                }

            }
            return {errors, warnings};
        }

        async function checkOutput( args ) {
            let err, buffer, result = {}, parsedXml, body, header, cases, errors, root, errorObj = {}, schemaError;
            const { filePath, filename } = args;

            [err, buffer] = await formatPromiseResult(readFile( filePath ));
            if(err) {
                Y.log( 'okfe-dpp: could not get validation result XML-file err: ' + (err && err.stack || err), 'error', NAME );
                throw err;
            }

            const xmlParser = new XmlParser();

            [err, parsedXml ] = await formatPromiseResult( xmlParser.parseStringPromise( buffer ));
            if(err) {
                Y.log( 'okfe-dpp: could not parse validation result XML-file to JS: ' + (err && err.stack || err), 'error', NAME );
                throw err;
            }

            body = getObject('root.body.0', parsedXml);
            header = getObject('root.header.0', parsedXml);
            result.filename = filename; // same as input filename
            cases = getObject('data_container.0.cases.0.case', body);
            root = getObject('root', parsedXml);
            schemaError = getObject('protocol.0.validation_provider.0.validation_item.0.status.0.error', root);

            errors = [];
            let nErrors = 0;
            let nWarnings = 0;

            // Specification errors
            if( cases && cases.length ) {
                // If cases we are in the validation when packing eDocu
                cases.forEach( ( currentCase ) => {
                    let arrayOfErrors = getObject( 'case_admin.0.protocol.0.validation_item.0.status.0.error', currentCase );
                    let guidStr = getObject( 'case_admin.0.guid.0.$.V', currentCase );
                    let formattedErrors = arrayOfErrors && arrayOfErrors.length ? _formatErrors( arrayOfErrors ) : null;

                    if( formattedErrors ) {
                        errorObj = formattedErrors;
                        errorObj.guid = guidStr.replace( /{|}/gi, '' );
                        nErrors += formattedErrors.errors && formattedErrors.errors.group ? formattedErrors.errors.group.length : 0;
                        nWarnings += formattedErrors.warnings && formattedErrors.warnings.group ? formattedErrors.warnings.group.length : 0;
                    }

                    if( Object.keys( errorObj ).length > 0 ) {
                        errors.push( errorObj );
                    }

                    return;
                } );

            }

            // Schema validation errors will throw first and then there wont be specification errors
            // Only look for schema errors in initial validation for each activity, because we cant keep track of activity with those type of errors
            if( !cases && schemaError ) {
                let formattedErrors = schemaError ? _formatErrors( schemaError ) : null;
                if( formattedErrors ) {
                    errorObj = formattedErrors;
                    nErrors += formattedErrors.errors && formattedErrors.errors.group ? formattedErrors.errors.group.length : 0;
                    nWarnings += formattedErrors.warnings && formattedErrors.warnings.group ? formattedErrors.warnings.group.length : 0;
                    if( Object.keys( errorObj ).length > 0 ) {
                        errors.push( errorObj );
                    }
                }
            }

            result.errorsPerCase = errors;
            result.nErrors = nErrors;
            result.nWarnings = nWarnings;

            result.fileTimestamp = getObject('document.0.modification_dttm.0.$.V', header);
            result.timestamp = getObject('document.0.origination_dttm.0.$.V', header);
            result.xpmVersion = getObject('data_container.0.cases.0.case.0.case_admin.0.version.0.$.V', body);
            result.returnCode = getObject('data_container.0.cases.0.case.0.case_admin.0.protocol.0.status_case.0.$.V', body);
            result.canceled = false; // Ignored for QDOCU
            return result;
        }

        async function execute( args ) {
            let checkedOutput;
            const {tmpDir, inputDir, callback, filename, schemaType, year} = args;
            const xpmDir = this.xpmDir;

            if( !xpmDir ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'xpm dir not given' ), undefined, callback );
            }

            if( !tmpDir || !inputDir ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ), undefined, callback );
            }

            const outputDir = join( tmpDir, 'output' );

            let [err, configFilePath] = await formatPromiseResult( writeConfigFile( {tmpDir, inputDir, outputDir, schemaType, year} ) );

            if( err ) {
                Y.log( `okfe-dpp: execute: could not create config file inside temp dir at ${tmpDir}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            [err] = await formatPromiseResult( spawnValidationTool( {configFilePath, xpmDir} ) );

            if( err ) {
                Y.log( `okfe-dpp: execute: could not spawn validation tool: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const outputFilePath = join( outputDir, 'protocol', filename );
            [err, checkedOutput] = await formatPromiseResult(
                checkOutput( {
                    filePath: outputFilePath,
                    filename
                } ) );

            if( err ) {
                Y.log( 'okfe-dpp: could not get results (errors) from validation-output XML-file: ' + (err && err.stack || err), 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( undefined, checkedOutput, callback );
        }

        function getPm(...args) {
            const pm = Y.doccirrus.xpm.getPm.apply( null, args );
            return {...pm, execute};
        }

        Y.namespace( 'doccirrus.okfe' ).dpp = {

            name: NAME,
            getPm
        };
    },
    '0.0.1', {requires: ['xpm']}
);

