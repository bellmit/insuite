/**
 * User: do
 * Date: 17/06/16  16:57
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'xpm', function( Y, NAME ) {

        const
            joinPaths = require( 'path' ).join,
            Promise = require( 'bluebird' ),
            { spawn } = require( 'child_process' ),
            moment = require( 'moment' ),
            XmlParser = require( 'xml2js' ).Parser,
            readFile = Promise.promisify( require( 'fs' ).readFile ),
            readDir = Promise.promisify( require( 'fs' ).readdir ),
            Iconv = require( 'iconv' ).Iconv,
            envConfig = Y.doccirrus.utils.getConfig( 'env.json' ),
            baseXpm = envConfig.directories.xpmKvdt,
            STATS = {
                CASES: {fileName: 'FallStatistik.pdf', param: 'FallListe'},
                GNR: {fileName: 'GNRListe.pdf', param: 'GNRListe'},
                BRACKET: {fileName: 'KlammerListe.pdf', param: 'KlammerListe'},
                DELIVERY: {fileName: 'DokuAbgabeListe.pdf', param: 'DokuAbgabeListe'},
                ERRORS: {fileName: 'Prüfprotokoll.pdf', param: 'FehlerListe'},
                SCHEIN: {fileName: 'ScheinAbgabeListe.pdf', param: 'ScheinAbgabeListe'},
                SORT: {fileName: 'SortierListe.pdf', param: 'SortierListe'},
                UESCHEIN: {fileName: 'UeScheinAbgabeListe.pdf', param: 'UeScheinAbgabeListe'},
                UESCHEINPLUS: {fileName: 'UeScheinPlusAbgabeListe.pdf', param: 'UeScheinPlusAbgabeListe'}
            };

        let xpm = {};
        if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
            xpm.KVDT = joinPaths( baseXpm, 'kvdt' );
            xpm.DM1 = joinPaths( baseXpm, 'dm1' );
            xpm.DM2 = joinPaths( baseXpm, 'dm2' );
            xpm.BK = joinPaths( baseXpm, 'bk' );
            xpm.KHK = joinPaths( baseXpm, 'khk' );
            xpm.ASTHMA = joinPaths( baseXpm, 'asthma' );
            xpm.COPD = joinPaths( baseXpm, 'copd' );
            xpm.EHKS = joinPaths( baseXpm, 'ehks' );
            xpm.LDK = joinPaths( baseXpm, 'ldk' );
            xpm.OKFE = joinPaths( baseXpm, 'okfe' );
        }

        function extractFields( text ) {
            var regex = /Feld\s'?(\b\d{4}\b)'?/g,
                match,
                fieldNumbers = [];
            while( match !== null ) {
                match = regex.exec( text );
                if( match ) {
                    fieldNumbers.push( match[1] );
                }
            }

            return fieldNumbers;
        }

        function extractLineNumber( text, isWarning ) {
            var regex,
                match;
            if( isWarning ) {
                regex = /\(W\/(\d+)\)/;
            } else {
                regex = /\(F\*\/(\d+)\)/;
            }
            match = regex.exec( text );
            return (match) ? match[1] : null;
        }

        function parseLine( line ) {
            let fieldCode = line.substring( 3, 7 );
            let value = line.substring( 7, line.length );
            if( !fieldCode || !value ) {
                return;
            }
            return {
                fieldCode: fieldCode,
                value: value
            };
        }

        function onPdtError( error, result ) {
            if( 'string' === typeof error.text ) {
                error.fields = extractFields( error.text );
            }
            switch( error.level ) {
                case '1':
                    error.line = extractLineNumber( error.code, true );
                    result.warnings.push( error );
                    break;
                case '2':
                    error.line = extractLineNumber( error.code );
                    result.errors.push( error );
                    break;
                case '3':
                    error.line = '';
                    result.errors.push( error );
                    break;
                default:
                    Y.log( `error level not found ${error}`, 'warn', NAME );
            }
        }

        function parseAuditLogPdt( path ) {

            const fs = require( 'fs' );
            let error;
            let result = {errors: [], warnings: [], advices: []};

            return new Promise( ( resolve, reject ) => {

                fs.readFile( path, {encoding: 'UTF-8'}, function( err, file ) {

                    if( err ) {
                        return reject( err );
                    }

                    const lines = file.split( '\r\n' );

                    lines.forEach( line => {

                        line = parseLine( line );

                        if( !line ) {
                            return;
                        }

                        if( ('8000' === line.fieldCode && ('prot' === line.value || 'pro9' === line.value) ||
                             '9424' === line.fieldCode && 'con0' === line.value) ) {
                            if( error ) {
                                onPdtError( error, result );
                                error = null;
                            }
                            if( 'pro9' !== line.value ) {
                                error = {scheinId: '', level: '', text: ''};
                            }
                        } else if( '9420' === line.fieldCode ) {
                            error.code = line.value;
                        } else if( '9421' === line.fieldCode ) {
                            error.level = line.value;
                        } else if( '9423' === line.fieldCode ) {
                            error.text += line.value;
                        } else if( '3003' === line.fieldCode ) {
                            error.scheinId = line.value;
                        } else if( '9232' === line.fieldCode && '3' === line.value ) {
                            onPdtError( {
                                scheinId: '',
                                level: line.value,
                                text: 'Abbruchfehler - Bitte kontaktieren Sie den Support!'
                            }, result );
                        }

                    } );

                    resolve( result );

                } );

            } );

        }

        function executePm( cwd, command ) {
            Y.log( `executing ${command} in ${cwd}`, 'info', NAME );
            return new Promise( ( resolve, reject ) => {

                let params = command.split( ' ' ).filter( el => el.trim() ),
                    returnedAlready = false;

                const processExitStatus = ( code ) => {
                    //-- HACK: We catch only code `127` which means the script
                    //-- was not found. Then all the other errors will be caught
                    //-- in the .XML so we unify where to catch the errors `extractErrors`
                    if( !returnedAlready ){ //return only once
                        returnedAlready = true;
                        if( 127 === code ) {
                            reject( Error( 'dc-pruefung.sh not found' ) );
                        } else {
                            resolve();
                        }
                    }
                };

                if( !params.length){
                    return reject( Error( 'KBV validation: command not given' ) );
                }

                const pmProcess = spawn( params[0], params.slice(1), { cwd, shell: true } );

                pmProcess.stderr.on('data', (data) => {
                    Y.log( `kbv-pm stderr: ${data}`, 'warn', NAME );
                });

                pmProcess.stdout.on('data', (data) => {
                    Y.log( `kbv-pm stdout: ${data}`, 'info', NAME );
                });

                pmProcess.on('error', (error) => {
                    Y.log( `error spawning kbv-pm  ${error}`, 'warn', NAME );
                    processExitStatus( error && error.code );
                });

                pmProcess.on('close', (code) => {
                    Y.log(`${command} in ${cwd} exited with code ${code}`, 'info', NAME);
                    processExitStatus( code );
                });
            } );
        }

        function parseAuditLogXml( autoLogPath ) {
            return readFile( autoLogPath ).then( buffer => {
                const
                    xmlParser = new XmlParser(),
                    iconv = new Iconv( 'iso-8859-15', 'utf-8//TRANSLIT//IGNORE' ),
                    converted = iconv.convert( buffer );

                return new Promise( ( resolve, reject ) => {
                    xmlParser.parseString( converted, ( err, result ) => {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( restructurePmXMLResult( result && result.data ) );
                    } );
                } );
            } );
        }

        function val( obj, attrName ) {
            return obj[attrName] && obj[attrName][0] || '';
        }

        function sanitizeString( str ) {
            if( 'string' !== typeof str ) {
                return '';
            }
            return str.replace( /\./gm, '' );
        }

        function restructurePmXMLResult( pmResult ) {
            if( !pmResult || !pmResult.parameter || !pmResult.parameter[0] || !pmResult.record ) {
                return null;
            }
            const
                result = {
                    errors: {},
                    warnings: {},
                    info: {}
                },
                params = pmResult.parameter[0],
                record = pmResult.record;


            result.filename = val( params, 'DATEI' );
            result.fileTimestamp = val( params, 'DATEI_DATUM' );
            result.timestamp = val( params, 'DATUM' );
            result.nErrors = +val( params, 'FEHLER' );
            result.nWarnings = +val( params, 'WARNUNGEN' );
            result.nInfo = +val( params, 'INFOS' );
            result.xpmVersion = val( params, 'XPM_VERSION' );
            result.returnCode = val( params, 'RETURN_CODE' );
            result.canceled = '0' !== val( params, 'ABBRUCH' ) || Boolean( result.nErrors );

            record.forEach( entry => {
                let group = sanitizeString( val( entry, 'GRUPPE' ) ),
                    id = val( entry, 'FEHLER_NR' ),
                    text = val( entry, 'MELDUNG' ),
                    isError = -1 !== id.indexOf( '(F*' ),
                    isInfo = isError ? false : -1 !== id.indexOf( '(I' ),
                    list;

                if( isInfo ) {
                    list = result.info;
                } else {
                    list = isError ? result.errors : result.warnings;
                }

                if( 'Das Prüfmodul hat keine Fehler gefunden' === group ) {
                    return;
                }

                if( !Array.isArray( list[group] ) ) {
                    list[group] = [];
                }
                list[group].push( {
                    id: id,
                    text: text
                } );
            } );
            return result;
        }

        function addKvdtStatsArgs( command, stats, tmpDir ) {
            Object.keys( stats ).forEach( statName => {
                const statConfig = STATS[statName.toUpperCase()];
                if( !statConfig ) {
                    Y.log( `could not find statConfig for statName ${JSON.stringify( statConfig )}`, 'warn', NAME );
                    return;
                }
                command += ` -p ${statConfig.param}=${joinPaths( tmpDir, statConfig.fileName )}`;
            } );

            return command;
        }

        function getStatFiles( stats, tmpDir ) {
            return Promise.map( Object.keys( stats ), statName => {
                const statConfig = STATS[statName.toUpperCase()];
                if( !statConfig ) {
                    Y.log( `could not find statConfig for statName ${JSON.stringify( statConfig )}`, 'warn', NAME );
                    return null;
                }
                const statFilePath = joinPaths( tmpDir, statConfig.fileName );
                return readFile( statFilePath ).then( buffer => ({
                    fileName: statConfig.fileName,
                    data: buffer
                }) ).catch( err => {
                    Y.log( `could not read stat file ${statFilePath}: ${err}`, 'warn', NAME );
                    return null;
                } );
            } ).filter( Boolean );
        }

        function addAddtionalParams( params, command ) {
            Object.keys( params ).forEach( paramName => {
                command += ` -p ${paramName}=${params[paramName]}`;
            } );
            return command;
        }

        function wrapperFileName( options ) {
            if( this.legacy === true ) {
                return 'dc-pruefung-legacy.sh';
            }
            switch( this.name ) {
                case 'KVDT':
                case 'LDK':
                    return 'dc-pruefung.sh';
                case 'ASTHMA':
                case 'BK':
                case 'DM1':
                case 'DM2':
                case 'KHK':
                case 'COPD':
                    return options.isFollowing ? 'dc-pruefung-verlauf.sh' : 'dc-pruefung.sh';
                case 'EHKS':
                    return options.isND ? 'dc-pruefung-nd.sh' : 'dc-pruefung.sh';
            }

            throw Error( `Could not determine wrapper file name for xpm ${this.name} with options: ${options && JSON.stringify( options )}` );
        }

        /**
         *
         *
         * @param {Object}          args
         * @param {String}          args.input
         * @param {String}          args.tmpDir
         * @param {Array}           args.options.isND only needed for non legacy eHKS xpms to determine xpm wrapper script
         * @param {Array}           args.options.isFollowing only needed for non legacy eDMP xpms to determine xpm wrapper script
         * @param {String}          args.parseAuditLog
         * @param {Array}           args.additionalParams
         * @param {Object}          args.kvdtStats
         * @param {Object}          args.kvdtStats.cases
         *
         * @return {Promise<*>}
         */
        function execute( args ) {
            args = args || {};
            let errorListPath, pdtFilePath, tmpDir;

            return Promise.resolve().then( () => {
                if( !args.tmpDir ) {
                    throw Error( 'Missing argument tmpDir' );
                }

                if( !args.input ) {
                    throw Error( 'Missing argument input' );
                }

                if( !this.xpmDir ) {
                    throw Error( 'Missing xpmDir' );
                }

                tmpDir = args.tmpDir;
                errorListPath = joinPaths( tmpDir, 'Pruefprotokoll.xml' );
                pdtFilePath = joinPaths( tmpDir, 'PDTListe.pdt' );
                let xpmDir = this.xpmDir,
                    xpmTmpPath = joinPaths( tmpDir, 'tmp' ),
                    command = joinPaths( xpmDir, this.wrapperFileName( args.options || {} ) ) +
                              ' -f "' + args.input + '" -p PDTListe=' + pdtFilePath +
                              ' -p tempdaten=' + xpmTmpPath +
                              ' -p FehlerListe=' + errorListPath;

                if( args.kvdtStats ) {
                    command = addKvdtStatsArgs( command, args.kvdtStats, tmpDir );
                }

                if( args.additionalParams ) {
                    command = addAddtionalParams( args.additionalParams, command );
                }

                if( args.configPath ) {
                    command += (' -c ' + args.configPath);
                }
                return executePm( xpmDir, command );
            } ).then( () => {
                return new Promise( resolve => {
                    setTimeout( resolve, 10000 );
                } );
            }).then( () => {
                if( 'XML' === args.parseAuditLog ) {
                    return parseAuditLogXml( errorListPath );
                } else if( 'PDT' === args.parseAuditLog ) {
                    return parseAuditLogPdt( pdtFilePath ).then( results => {
                        if( !args.kvdtStats ) {
                            return {results, statFiles: {}};
                        }
                        return getStatFiles( args.kvdtStats, tmpDir ).then( statFiles => ({results, statFiles}) );
                    } );
                }
                return null;
            } ).catch( err => {
                Y.log( `error executing xpm ${err}`, 'error', NAME );
                throw err;
            } );
        }

        let xpmInstanceProto = {
            execute,
            wrapperFileName
        };

        function createYearFromDir( dir ) {
            return {
                year: '20' + dir.slice( 2 ),
                qarter: dir.slice( 1, 2 ),
                xpmDir: dir
            };
        }

        /**
         * MOJ-10912 Since Q2 2019 xpm wrapper script had to be adjusted.
         * Before Q2 2019 'dc-pruefung-legacy.sh' must be called.
         *
         * @param {String}      quarter
         * @param {String}      year
         * @return {Boolean}
         */
        function isLegacyModule( quarter, year ) {
            const format = 'Q/YYYY';
            const xpmQuarter = `${quarter}/${year}`;
            const beginOfNewXpmDate = '2/2019';
            return moment( xpmQuarter, format ).isBefore( moment( beginOfNewXpmDate, format ) );
        }

        function initXpmInstance( module ) {
            readDir( module.baseDir )
                .then( dir => {


                    let years = {};
                    let availableYears = dir
                        .filter( d => d.match( /Q\d{3}/ ) )
                        .map( createYearFromDir );

                    availableYears.forEach( i => {
                        if( !years[i.year] ) {
                            years[i.year] = {};
                        }
                        if( !years[i.year][i.qarter] ) {
                            years[i.year][i.qarter] = Object.create( xpmInstanceProto );
                            years[i.year][i.qarter].name = module.name;
                            years[i.year][i.qarter].legacy = isLegacyModule( i.qarter, i.year );
                            years[i.year][i.qarter].xpmDir = joinPaths( module.baseDir, i.xpmDir );
                        }
                    } );

                    Object.keys( years ).forEach( yearKey => {
                        let latestQuarter = Math.max( ...Object.keys( years[yearKey] ) );
                        years[yearKey].latest = years[yearKey][latestQuarter];
                    } );

                    let latestYear = Math.max( ...Object.keys( years ) );
                    years.latest = years[latestYear];

                    Object.assign( module, years );

                } )
                .catch( () => Y.log( `no available XPM found in '${module.baseDir}'`, 'warn', NAME ) );

        }

        function getPm( {year = 'latest', quarter = 'latest', type = 'KVDT'} ) {
            type = type.toUpperCase();

            if( !xpm || !xpm[type] ) {
                throw new Error( 2023 );
            }

            let instance = xpm[type][year];

            if( !instance ) {
                quarter = 4;
            }

            while( !instance ) {
                if( year < 1990 ) {
                    throw new Error( 2024 );
                }

                year--;
                instance = xpm[type][year];

            }

            instance = xpm[type][year][quarter];

            while( !instance ) {

                if( quarter < 1 ) {
                    throw new Error( 2025 );
                }

                quarter--;
                instance = xpm[type][year][quarter];

            }

            return instance;

        }

        if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() ) {
            setTimeout( () => {
                const xpmModules = Object.keys( xpm );
                Promise.each( xpmModules, key => {
                    xpm[key] = {baseDir: xpm[key], name: key};
                    initXpmInstance( xpm[key] );
                } ).then( () => {
                    Y.log( `initialized ${xpmModules.length} external xpm modules ${xpm}`, 'debug', NAME );
                } ).catch( err => {
                    Y.log( `could not initialize ${xpmModules.length} external xpm modules ${err}`, 'error', NAME );
                } );
            }, 5000 );
        }

        Y.namespace( 'doccirrus' ).xpm = {

            name: NAME,
            getPm: getPm
        };
    },
    '0.0.1', {requires: []}
);

