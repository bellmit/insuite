/**
 * User: mahmoud
 * Date: 24/06/15  16:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'mocha-runner', function( Y, NAME ) {

    const
        TENANTID = '1213141513Mocha',
        STARTUP_TIMEOUT = Y.doccirrus.auth.isDevServer() ? 5000 : 15000,       //  wait a bit after instance start for log spam to quiet down
        HR_CONSOLE = '--------------------------------------------------------------------------------------------------',
        MOCHA_REPORT_FOLDER = `${process.cwd()}/assets/`,
        REPORT_FILENAME = 'xunit.xml',
        REPORT_FULL_PATH = `${MOCHA_REPORT_FOLDER}${REPORT_FILENAME}`,
        fs = require( 'fs' );

    Y.doccirrus.communication.setListenerForNamespace( 'default', 'runSingleMochaSuite', function( msg ) {
        let
            socket = this;
        Y.doccirrus.test.mochaRunner.runSingleMochaSuite( {
            data: {
                reporter: msg.reporter,
                filename: msg.filename
            },
            callback: function( err, result ) {
                socket.emit( 'runSingleMochaSuite', {
                    err: err,
                    result: result
                } );
            }
        } );
    } );

    Y.doccirrus.communication.setListenerForNamespace( 'default', 'getLastMochaReport', function( msg ) {
        let socket = this;

        Y.doccirrus.test.mochaRunner.getLastMochaReport( {
            data: msg,
            callback: function( err, result ) {
                socket.emit( 'getLastMochaReport', {
                    err: err,
                    result: result
                } );
            }
        } );
    } );

    Y.doccirrus.communication.setListenerForNamespace( 'default', 'runAllMochaSuites', function( msg ) {
        let socket = this;

        Y.doccirrus.test.mochaRunner.runAllMochaSuites( {
            data: msg,
            callback: function( err, result ) {
                socket.emit( 'runAllMochaSuites', {
                    err: err,
                    result: result
                } );
            }
        } );
    } );

    Y.namespace( 'doccirrus.test' ).mochaRunner = {

        /**
         * Get the last mocha reports. Function will search in reports folder and take
         * the last created.
         *
         * @param {Function} callback
         * @returns {Promise} - promise that contains parsed data;
         */
        getLastMochaReport: function( {callback} ) {
            try {
                Y.log( `Trying to get mocha tests results from ${REPORT_FULL_PATH}`, 'info', NAME );
                let content = fs.readFileSync( REPORT_FULL_PATH, 'utf8' );
                return callback( null, content );
            } catch( err ) {
                Y.log( `Received an error while tried to read xunit.xml. Error ${err.message}`, 'error', NAME );
                return callback( err, null );
            }
        },

        /**
         * Get tests to run. If allMochaSuites argument was added - it will return all possible suites.
         * @returns {Array} - tests to run
         */
        getMochaSuites: function() {
            return [
                'access-test.js',
                'activities-test.js',
                'activity-api-test.js',
                'activity-sequence-test.js',
                'appreg-test.js',
                'apptoken-test.js',
                'basecontact-api-test.js',
                'basecontact-test.js',
                'binutils-api-test.js',
                'bl-schein-pseudognr-test.js',
                'blob-api-test.js',
                'budgets-test.js',
                'cache-utils-test.js',
                'calevent-api-test.js',
                'card-parsers-test.js',
                'cardio-api-test.js',
                'casefolder-test.js',
                'catalogsimportutils.server-test.js',
                'catalogusage-test.js',
                'cli-api-test.js',
                'client-log-api-unit.js',
                'communication-client-test.js',
                'conference-test.js',
                'continuous-diagnosis-test.js',
                'crlog-api-test.js',
                'dcRouteOverride-test.js',
                'dcauth-test.js',
                'dcbarcode-test.js',
                'dcrate-limiter-unit.js',
                'drug-api-test.js',
                'edoc-api-test.js',
                'edocletter-api-test.js',
                'egk-parser-test.js',
                'email-test.js',
                'employee-test.js',
                'eraser-test.js',
                'flow-api-test.js',
                'flow-transformers-test.js',
                'gdt-api-test.js',
                'general-test.js',
                'hcicatalogupdater-test.js',
                'importexport-test.js',
                'incash-api-test.js',
                'inphone-api-test.js',
                'instock-api-test.js',
                'jsonRpcInvocationPrivilegeEvaluator-test.js',
                'jsonrpcController-test.js',
                'kbvCon-test.js',
                'kbvutilityprice-api-test.js',
                'kimaccount-api.test.js',
                'lab-api-test.js',
                'ldt-api-test.js',
                'linked-activities-test.js',
                'location-test.js',
                'malware-scan-test.js',
                'marker-test.js',
                'medicationscatalog-api-test.js',
                'migration-test.js',
                'mongoose-hooks-test.js',
                'mongoose-validation-test.js',
                'okfeFileBuilder-test.js',
                'padx-api-test.js',
                'partner-test.js',
                'patient-api-test.js',
                'patientportal-api-test.js',
                'prescribe-medication-test.js',
                'pvs-invoice-api-test.js',
                'qes-api-test.js',
                'redis-test.js',
                'reporting-cache-test.js',
                'reporting-regenerate-test.js',
                'restController1-test.js',
                'rule-engine-test.js',
                'rundb-test.js',
                'schedule-api-test.js',
                'shared-calendars-test.js',
                'stocklocation-api-test.js',
                'stockorders-api-test.js',
                'strict-mode-casefile-test.js',
                'sysnum-api-test.js',
                'tarmed-invoice-api-test.js',
                'tarmedlog-api-test.js',
                'task-notification-test.js',
                'tasks-test.js',
                'tasktype-test.js',
                'tenant-api-test.js',
                'tiDirectoryService-api.test.js',
                'validations.common-test.js',
                'vprc-hostname-change-test.js',
                'warning-api-test.js',

                // tests that dont run properly in dev
                ...!Y.doccirrus.auth.isDevServer() ? [
                    'https-test.js',
                    'friends-test.js'
                ] : []
            ];
        },

        runAllMochaSuites: async function() {
            let Mocha, chai;
            try {
                Mocha = require( 'mocha' );
                chai = require( 'chai' );
            } catch( err ) {
                Y.log( `Missed tests dependencies, failed with ${err.message}. Stopping execution`, 'error', NAME );
                return;
            }

            const
                dcauth = require( 'dc-core' ).auth,
                {formatPromiseResult} = require( 'dc-core' ).utils,
                sinonChai = require( 'sinon-chai' ),
                deepEqualInAnyOrder = require( 'deep-equal-in-any-order' ),
                chaiAsPromised = require( 'chai-as-promised' ),
                {promisify} = require( 'util' ),
                writeFile = promisify( fs.writeFile ),
                mochaDir = `${process.cwd()}/mojits/TestingMojit/tests/mocha`,
                suites = this.getMochaSuites(),
                TENANT_ID = '1213141513Mocha',
                mochaOptions = {};
            let report;

            Y.log( 'Preparing mocha tests for the running', 'info', NAME );

            Y.doccirrus.errors.pauseExceptionHandling();
            chai.use( sinonChai );
            chai.use( chaiAsPromised );
            chai.use( deepEqualInAnyOrder );

            global.should = chai.should();
            global.expect = chai.expect;
            global.assert = chai.assert;
            global.Y = Y;

            mochaOptions.reporter = Y.doccirrus.test.mochaReporters.getXUnit();
            mochaOptions.reporterOptions = {
                callback( output ) {
                    report = output;
                }
            };

            //allow re-run test on same file
            suites.forEach( ( suite ) => {
                delete require.cache[`${mochaDir}/${suite}`];
            } );
            const mocha = new Mocha( mochaOptions );
            suites.forEach( ( suite ) => {
                mocha.addFile( `${mochaDir}/${suite}` );
            } );

            Y.log( 'Mock services', 'info', NAME );
            const
                mockCommunication = require( '../server/communication-mock' ),
                mockPatientPortalApi = require( '../server/patientportal-mock' ),
                mockCompanyApi = require( '../server/company-mock' ),
                mockEmail = require( '../server/email-mock' ),
                mockPrinter = require( '../server/printer-mock' ),
                mockHttps = require( '../server/https-mock' ),
                mockCacheUtils = require( '../server/cache-utils-mock' ),
                mockAuth = require( '../server/auth-mock' ),
                mockAppregApi = require( '../server/appreg-mock' );
            const originalCommunication = mockCommunication( Y ),
                originalEmail = mockEmail( Y ),
                originPrinter = mockPrinter( Y ),
                originalCompany = mockCompanyApi( Y ),
                originalAuth = mockAuth( Y, TENANT_ID ),
                originalAppreg = mockAppregApi( Y, Y.doccirrus.auth.getSUForTenant( TENANT_ID ) ),
                originalCacheUtils = mockCacheUtils( Y );

            const {
                originalPatientPortalApi,
                originalMetaPracApi,
                originalDcprcKnowsEmailOrPhone,
                originalDcprcSetPatientAsContact
            } = mockPatientPortalApi( Y );
            const {
                originalHttps,
                getTenantFromHost
            } = mockHttps( Y, Y.doccirrus.auth.getSUForTenant( TENANT_ID ) );

            Y.log( `Gonna run ${suites.length} test suites`, 'info', NAME );
            const [num] = await formatPromiseResult( new Promise( ( resolve ) => {
                mocha.run( function( numFailures ) {
                    resolve( numFailures );
                } );
            } ) );
            Y.log( `Mocha tests finished with ${num} failures`, 'info', NAME );
            // making correct xml format
            const xmlReport = '<?xml version="1.0" encoding="UTF-8"?>\n' + report;
            const [err] = await formatPromiseResult( writeFile( REPORT_FULL_PATH, xmlReport ) );

            if( err ) {
                Y.log( `Error during creating mocha xunit.xml report in /assets folder. Error: ${err}`, 'error', NAME );
            }
            Y.log( `Mocha:Run finished, created xunit.xml file in /assets folder`, 'info', NAME );

            // return to original, mocked
            Y.log( `Returning services to original`, 'info', NAME );
            Y.doccirrus.communication = originalCommunication;
            Y.doccirrus.email = originalEmail;
            Y.doccirrus.printer = originPrinter;
            Y.doccirrus.api.company = originalCompany;
            Y.doccirrus.auth = originalAuth;
            Y.doccirrus.api.appreg = originalAppreg;
            Y.doccirrus.cacheUtils.adapter = originalCacheUtils;
            Y.doccirrus.api.patientportal = originalPatientPortalApi;
            Y.doccirrus.api.metaprac = originalMetaPracApi;
            Y.doccirrus.utils.dcprcKnowsEmailOrPhone = originalDcprcKnowsEmailOrPhone;
            Y.doccirrus.utils.dcprcSetPatientAsContact = originalDcprcSetPatientAsContact;
            Y.doccirrus.https = originalHttps;
            dcauth.getTenantFromHost = getTenantFromHost;

            Y.log( `Finished mocha tests execution, services restored to the original state...`, 'info', NAME );
        },

        runMochaSuites: function() {
            var
                Mocha = require( 'mocha' ),
                DCDB = require( 'dc-core' ).db,
                reporter = 'console',
                chai = require( 'chai' ),
                sinonChai = require( 'sinon-chai' ),
                deepEqualInAnyOrder = require( 'deep-equal-in-any-order' ),
                chaiAsPromised = require( 'chai-as-promised' ),
                fs = require( 'fs' ),
                cwd = process.cwd(),
                report,
                mochaOptions = {
                    useColors: true,
                    slow: 10
                },
                mochaDir = cwd + '/mojits/TestingMojit/tests/mocha',
                filename = 'xunit.xml',
                mocha,
                files,
                i,
                useSuiteList,
                user = Y.doccirrus.auth.getSUForTenant( TENANTID ),
                suiteList = this.getMochaSuites();

            i = process.argv.indexOf( '--reporter' );
            if( -1 < i && process.argv[i + 1] ) {
                reporter = process.argv[i + 1];
            }

            i = process.argv.indexOf( '--outfile' );
            if( -1 < i && process.argv[i + 1] ) {
                filename = process.argv[i + 1];
            }

            i = process.argv.indexOf( '--useSuiteList' );
            useSuiteList = -1 < i;

            switch( reporter ) {
                case 'dc-xunit':
                    mochaOptions.reporter = Y.doccirrus.test.mochaReporters.getXUnit();
                    mochaOptions.reporterOptions = {
                        callback( output ) {
                            report = output;
                        }
                    };
                    break;
                case 'console':
                    break;
                default:
                    mochaOptions.reporter = reporter;
                    if( filename ) {
                        process.env.XUNIT_FILE = filename;
                    }
            }

            Y.doccirrus.errors.pauseExceptionHandling();
            chai.use( chaiAsPromised );
            chai.use( deepEqualInAnyOrder );
            chai.use( sinonChai );

            global.should = chai.should();
            global.expect = chai.expect;
            global.assert = chai.assert;
            global.Y = Y;
            // switch off console.log and Y.log suppression by setting the reporter to console.
            mocha = new Mocha( mochaOptions );
            files = fs.readdirSync( mochaDir );

            files = suiteList.filter( name => {
                if( !useSuiteList && 'rule-engine-test.js' !== name ) {
                    return false;
                }
                return !(useSuiteList && -1 === files.indexOf( name ));
            } );
            files.forEach( function( name ) {
                mocha.addFile( `${mochaDir}/${name}` );
            } );

            setTimeout( function() {
                DCDB.dropDb( TENANTID, function( err ) {
                    const
                        mockCommunication = require( '../server/communication-mock' ),
                        mockPatientPortalApi = require( '../server/patientportal-mock' ),
                        mockCompanyApi = require( '../server/company-mock' ),
                        mockEmail = require( '../server/email-mock' ),
                        mockPrinter = require( '../server/printer-mock' ),
                        mockHttps = require( '../server/https-mock' ),
                        mockCacheUtils = require( '../server/cache-utils-mock' ),
                        mockAuth = require( '../server/auth-mock' ),
                        mockAppregApi = require( '../server/appreg-mock' );

                    if( err ) {
                        Y.log( `!!!! Mocha could not be run !!!! Error: ${JSON.stringify( err )}`, 'error', NAME );
                        return process.exit( 0 );
                    }

                    console.log( "\n\n\n\n\n" );                                //  eslint-disable-line no-console
                    console.log( HR_CONSOLE );                                  //  eslint-disable-line no-console
                    console.warn( `***** running mocha suites:` );              //  eslint-disable-line no-console
                    console.log( HR_CONSOLE );                                  //  eslint-disable-line no-console
                    console.warn( JSON.stringify( files, undefined, 2 ) );      //  eslint-disable-line no-console
                    console.log( HR_CONSOLE, "\n" );                            //  eslint-disable-line no-console

                    mockCommunication( Y );
                    mockEmail( Y );
                    mockPrinter( Y );
                    mockPatientPortalApi( Y );
                    mockCompanyApi( Y );
                    mockHttps( Y, user );
                    mockAuth( Y, TENANTID );
                    mockAppregApi( Y, user );
                    mockCacheUtils( Y );
                    mocha.run( function( num ) {
                        if( report ) {
                            try {
                                const xmlReport = '<?xml version="1.0" encoding="UTF-8"?>\n' + report;
                                fs.writeFileSync( REPORT_FULL_PATH, xmlReport );
                            } catch( e ) {
                                Y.log( `runMochaSuites: Error while writing test report to path: ${REPORT_FULL_PATH}. Latest test results cannot be viewed by jenkins because of Error: ${e.stack || e}`, "error", NAME );
                            }
                        }
                        setTimeout( function() {
                            console.warn( '***** mocha finished with ' + num + ' errors' ); //eslint-disable-line no-console
                            // process.exit( 0 );
                            DCDB.dropDb( TENANTID, ( err ) => {
                                if( err ) {
                                    Y.log( `Could not drop test db after mocha finished. Error:${JSON.stringify( err )}`, 'error', NAME );
                                }
                                process.exit( 0 );
                            } );
                        }, 1000 );
                    } );
                } );
            }, STARTUP_TIMEOUT );
        },
        /**
         * The white box tests running inside the server are accessible from outside
         * the server in the CI etc. stages.
         *
         * They allow customer tests, e.g. for medneo to be run.
         * !!!!WARNING!!!!!!
         * This call will create database for tenantId 1213141513Mocha
         *
         * @param {Object} args
         */
        runSingleMochaSuite: function( args ) {
            var
                Mocha = require( 'mocha' ),
                chai = require( 'chai' ),
                sinonChai = require( 'sinon-chai' ),
                chaiAsPromised = require( 'chai-as-promised' ),
                deepEqualInAnyOrder = require( 'deep-equal-in-any-order' ),
                data = args.data || {},
                reporter = data.reporter || 'console',
                cwd = process.cwd(),
                mochaDir = cwd + '/mojits/TestingMojit/tests/mocha',
                mocha,
                callback = args.callback,
                mochaOptions = {
                    useColors: true,
                    clearRequireCache: true
                },
                report,
                filename,
                tenantId = '1213141513Mocha';

            var useCoverage = false,
                istanbul;
            // if( !args.fromUrl || !args.fromUrl.filename || !query.filename ) {
            //     console.warn(JSON.stringify(args.fromUrl, args.originalQuery,args.fromBody,args.originalParams));
            //     return args.callback( null, {success: 'Test: Nothing to do. '} );
            // }
            filename = data.filename || args.fromUrl.filename;

            // unify argument setting

            Y.doccirrus.errors.pauseExceptionHandling();
            chai.use( sinonChai );
            chai.use( chaiAsPromised );
            chai.use( deepEqualInAnyOrder );

            global.should = chai.should();
            global.expect = chai.expect;
            global.assert = chai.assert;
            global.Y = Y;

            switch( reporter ) {
                case 'dc-xunit':
                    mochaOptions.reporter = Y.doccirrus.test.mochaReporters.getXUnit();
                    mochaOptions.reporterOptions = {
                        callback( output ) {
                            report = output;
                        }
                    };
                    break;
                case 'console':
                    break;
                default:
                    mochaOptions.reporter = reporter;
            }

            // switch off console.log and Y.log suppression by setting the reporter to console.

            //allow re-run test on same file
            delete require.cache[`${mochaDir}/${filename}`];

            if( useCoverage ) {
                istanbul = require( 'istanbul-api' );
                let
                    instrumentor = istanbul.libInstrument.createInstrumenter(),
                    hook = istanbul.libHook,
                    myMatcher = function( file ) {
                        return !file.match( /node_modules/ );
                    },
                    myTransformer = function( code, file ) {
                        code = instrumentor.instrumentSync( code, file.filename );
                        return code;
                    };
                hook.hookRequire( myMatcher, myTransformer );
            }

            mocha = new Mocha( mochaOptions );
            mocha.addFile( `${mochaDir}/${filename}` );

            //mocha.loadFiles();

            const
                mockCommunication = require( '../server/communication-mock' ),
                mockEmail = require( '../server/email-mock' ),
                mockHttps = require( '../server/https-mock' ),
                originalCommunication = mockCommunication( Y ),
                originalHttps = mockHttps( Y, Y.doccirrus.auth.getSUForTenant( tenantId ) ),
                originalEmail = mockEmail( Y );

            console.warn( '***** running single mocha suite: ', JSON.stringify( filename ) ); //eslint-disable-line no-console
            mocha.run( function( num ) {
                console.warn( `***** mocha finished with ${num} errors` ); //eslint-disable-line no-console
                Y.doccirrus.communication = originalCommunication;
                Y.doccirrus.email = originalEmail;
                Y.doccirrus.https = originalHttps;

                if( useCoverage ) {
                    const reporter = istanbul.createReporter();
                    reporter.add( 'text' );
                    reporter.add( 'lcov' );

                    const coverageMap = istanbul.libCoverage.createCoverageMap( global.__coverage__ || {} );
                    reporter.write( coverageMap, {} );
                }

                Y.doccirrus.errors.continueExceptionHandling();
                if( callback ) {
                    if( num ) {
                        return callback( null,
                            {fail: num, report: report} );
                    }
                    return callback( null, {success: 'Test: ' + filename + ' ok', report: report} );
                }
            } );
        }
    };

}, '0.0.1', {
    requires: [
        'dcTi',
        'dcauth',
        'dcgenericmapper-util',
        'activityapi',
        'DCMochaReporters',
        'dccommunication',
        'casefolder-schema',
        'dispatchUtils',
        'sysnum-schema',
        'cache-utils',
        'DCRouteOverride',
        'DCRouteOverrideCollection'
    ]
} );
