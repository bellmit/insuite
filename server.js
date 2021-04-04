/**
 * User: rrrw
 * Date: 29.06.14  13:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* eslint no-console:1 */

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    path = require('path');

var
    failedCount = 0,
    lastUpdate = new Date(),
    checkIfCommissionIsNeeded = require( './autoload/commission.server.js' ).checkIfCommissionIsNeeded,
    testForSecondaryRepl = require( './autoload/utils/replicaSets.server.js' ).testForSecondaryRepl,
    monitorDb = require( './autoload/utils/dbMonitor.server.js' ),
    packageJson = require( `${process.cwd()}/package.json` ),
    argv = require( 'yargs' )
        .usage( `inSuite Server Version ${packageJson.version}\n\nUsage: $0` )
        .example( '$0 start 3000 --debug --test --nofork', 'Start a server on port 3000 in debug mode and run tests beforehand.' )
        .demand( 2 )
        .alias( 'd', 'debug' )
        .alias( 'a', 'dev' )
        .alias( 'i', 'inspect' )
        .alias( 'f', 'nofork' )
        .alias( 'b', 'bindall' )
        .alias( 't', 'test' )
        .alias( 'm', 'migrate' )
        .alias( 's', 'server-type' )
        .alias( 'S', 'system-type' )
        .alias( 'v', 'version' )
        .alias( 'hd', 'heapdump' )
        .describe( 'd', 'Start up in debug mode (watch memory, allow heap dumps)' )
        .describe( 'b', 'Bind sockets on *, otherwise use 127.0.0.1' )
        .describe( 'f', 'Do not fork workers' )
        .describe( 't', 'Run tests once system is up' )
        .describe( 'm', 'Force migrate during migrate step, and ignore version in DB' )
        .describe( 'hd', 'Loads the node module "heapdump", which allows to dump the heap during runtime.' )
        .describe( 's', 'Server type is one of: dcprc, trial-vprc, dcprc, isd, puc, prc, other-vprc. ' )
        .describe( 'S', 'System type is fully configurable from DCPRC, including APPLIANCE, TRIAL, INCARE, DSCK, etc.' )
        .argv,
    dcauth = require( 'dc-core' ).auth,
    dcNodeRed = require( './middleware/dcnodered' ),
    dcAppProxyMiddleware = require( './middleware/dcapp-proxy' ),
    initial, port;

dcauth.readServerFlag( argv );

// calculating the port

initial = process.argv.slice( 2 );
port = 3000;

// required by the server runner (forever) in PROD
// param 1 = 'start'
// param 2 = portAsInteger
// other params are ignored  (we will introduce dev context later)
if( Array.isArray( initial ) && initial[1] ) {
    if( /\d{1,5}/.exec( initial[1] ) ) {
        port = initial[1];
    } else {
        console.log( 'Started with bad PORT parameter.' );
        // exit
        return -1;
    }
}

console.log( 'TESTING FOR MEMBER STATUS IN REPLICA SET' );
testForSecondaryRepl( cbReplicationTest, failedCount, lastUpdate );

async function cbReplicationTest( err, res, lastUpdateNew ) {
    if( lastUpdateNew ) {
        lastUpdate = lastUpdateNew;
    }
    if( err ) {
        if( !failedCount ) {
            console.warn( err );
            console.warn( "DB DOWN OR CORRUPT, RETRYING..." );
        }
        failedCount++;
    } else if( res ) {
        if( !failedCount ) {
            console.warn( "SECONDARY REPL DB, RETRYING..." );
        }
        //process.exit( 44 );
        failedCount++;
    } else {
        console.log( 'PRIMARY REPL DB / NO REPLICATION, PROCEEDING TO REGULAR STARTUP' );
        failedCount = 0;

        let
            [comissionError] = await formatPromiseResult( checkIfCommissionIsNeeded( {port, serverType: dcauth.getServerType()} ) );

        if( comissionError ) {
            console.log( `Error on check if commission is needed. Shutting down...`, comissionError );
            return process.exit( 44 );
        }

        // start the Auth Layer immediately
        dcauth.init( argv )
            .then( serverStartup )
            .catch( ( err ) => {
                console.warn( `Could not start Auth. Error: ${JSON.stringify( err )}\n${err.stack}` );
                process.exit( 44 );
            } );
    }

    if( failedCount ) {
        setTimeout( () => {
            testForSecondaryRepl( cbReplicationTest, failedCount, lastUpdate );
        }, 5000 );
    }
}

async function serverStartup() {
    /**
     * Setup clustering and do first log
     */
    var
        NAME,
        cluster = require( 'cluster' );

    if( cluster.isMaster ) {
        NAME = 'app-master';
        console.log( 'INIT SYSTEM STARTING' );
    } else {
        NAME = 'app-worker';
    }

    /**
     * load function for dcbaseapp
     *
     * NB: when using flow.sh environment (in v1.x), use "refresh" to make the new server.js available.
     *
     */
    const
        { Factory } = await import( './lib/settings/index' ),
        { Connection } = await import( './lib/fhir/index' ),
        { FhirProxyMiddleware } = await import( './middleware/fhir-proxy' ),
        { AppLicenseSerialsMiddleware } = await import('./middleware/appLicenseSerials'),
        libmojito = require( 'mojito' ),
        express = require( 'express' ),
        OAuthServer = require('express-oauth-server'),
        cookieParser = require( 'cookie-parser' ),
        bodyParser = require( 'body-parser' ),
        upload_max_filesize = 157286400,
        favicon = require( 'serve-favicon' ),
        dcUtil = require( './middleware/dc-util.js' ),
        dcServerMiddleware = dcUtil.getServerMiddleware(),
        languageDetect = require( './autoload/languageDetect.server.js' ),
        oauthModelFactory = require('./oauthmodels/oauthModel.server.js');

    let
        server,
        app,
        nofork = argv.nofork || false,
        mocha = false,
        bindall = argv.bindall,
        debug = argv.debug,                 //  eslint-disable-line no-unused-vars
        dcCore = require( 'dc-core' ),
        config = dcCore.config.load( `${process.cwd()}/application.json` ),
        multerConfig = config && config[0] && config[0].express && config[0].express.multer || {},
        multer,
        dcAppProxy,
        datensafeProxyUrl,
        datensafeProxyError,
        settings = await Factory();

    /**
     * [MOJ-11839]
     * Loads the node module heapdump, to dump the heap during runtime by sending the process a -USR2 signal.
     */
    if( argv.heapdump ) {
        require( "heapdump" );
        console.log( `(HEAPDUMP) Run "kill -USR2 ${process.pid}" to dump a heap snapshot into ${process.cwd()}/heapdump-*.*.heapsnapshot` );
        console.log( `(HEAPDUMP) !!! WARNING: Dumping is a synchronous operation, and will halt the server during processing.` );
        console.log( `(HEAPDUMP) !!! WARNING: Dumping will double the amount of currently allocated memory, and requires enough disk space to store the dump.` );
    }

    dcCore.init();

    app = express();
    app.disable( 'x-powered-by' );
    server = require( 'http' ).Server( app ); // eslint-disable-line new-cap

    libmojito.extend( app, {context: {runtime: 'server', environment: 'production'}} );
    // at this point, access mojito instance via `app.mojito`

    // get Y
    var Y = app.mojito.Y;

    // provide settings API singleton through YUI
    Y.config.api = settings;

    dcauth.setY( Y );
    monitorDb.initDbMonitor( Y )();

    Connection.initialize( settings.get( 'fhir' ), Y.log.bind( Y ) );

    multerConfig.dest = Y.doccirrus.auth.getTmpDir();
    multerConfig.onFileSizeLimit = ( file ) => {
        file.error = 'File too large';
    };
    multerConfig.onFileUploadComplete = ( file, req, res ) => {
        if( file.error ) {
            req.multerError = file.error;
            res.status( 500 ).send( {error: file.error} );
        }
    };
    multerConfig.onParseEnd = ( req, next ) => {
        if( req.multerError ) {
            return next( req.multerError );
        }
        next();
    };

    multer = require( 'multer' )( multerConfig );

    if( -1 !== process.argv.indexOf( '--mocha' ) ) {
        mocha = true;
        Y.config.logLevel = 'error';
    } // otherwise read the logLevel from the application.json

    Y.config.logExclude = {
        //  YUI modules no longer excluded from log, EXTMOJ-1931, re-add any here if necessary
    };

    // initialise server with required variables
    Y.doccirrus.server.init( {
        app: app,
        port: port,
        server: server,
        nofork: nofork,
        mocha,
        bindall: bindall
    } );

    // make config available through Y
    Y.config.argv = argv;
    Y.config.insuite = packageJson;
    Y.namespace( 'config.doccirrus.Env' );
    Y.config.doccirrus.Env.upload_max_filesize = upload_max_filesize; // size in bytes
    Y.config.doccirrus.Env.systemType = dcauth.getSystemType();
    Y.config.doccirrus.Env.serverType = dcauth.getServerType();

    app.oauthServer = new OAuthServer({
        model: oauthModelFactory( Y )
    });

    // ------------------ Check and cache if any proxy set on datensafe (Important: This will be used by handbuch proxy middleware) ----------------
    [datensafeProxyError, {proxy: datensafeProxyUrl} = {}] = await formatPromiseResult(Y.doccirrus.api.cli.getProxyConfig());

    if( datensafeProxyError ) {
        if( datensafeProxyError.code === "userMgmtMojit_01" ) {
            Y.log(`serverStartup: dc-cli is not present and so proxy feature is not supported by current datensafe`, "info", `server.js/${NAME}`);
        } else {
            Y.log(`serverStartup: Error getting proxy configuration from 'cli.getProxyConfig'. Error: ${datensafeProxyError.stack || datensafeProxyError}. Stringified error: ${JSON.stringify(datensafeProxyError)}`, "error", `server.js/${NAME}`);
        }
    }

    if( datensafeProxyUrl ) {
        Y.log(`serverStartup: proxy = ${datensafeProxyUrl} detected on datensafe`, "info", `server.js/${NAME}`);
    } else {
        Y.log(`serverStartup: No proxy detected on datensafe`, "info", `server.js/${NAME}`);
    }
    // ------------------------------------------------------------------- END ---------------------------------------------------------------------

    // This is the DC middleware stack.

    // Initialize middleware for rate limits
    const rateLimitsConfigurationFile = `${process.cwd()}/rate-limits.json`;

    try {
        const rateLimitsConfiguration = dcCore.config.load( rateLimitsConfigurationFile );

        if( Object.keys( rateLimitsConfiguration ).length !== 0 ) {
            const RateLimiterFactory = require( './middleware/dcrate-limiter' )( Y ).RateLimiterFactory;
            RateLimiterFactory.setup( app, rateLimitsConfiguration, Y.doccirrus.cacheUtils.rateLimiterCache );
        }
    } catch ( error ) {
        Y.log(
            `Failed to initialize rate limits from ${rateLimitsConfigurationFile}: ${JSON.stringify( error )}`,
            'warning',
            `server.js/${NAME}`
        );
    }

    dcAppProxy = dcAppProxyMiddleware( Y, app, server );
    // Initialised middleware for /sol/:appName/_rest_
    dcAppProxy.initRestProxy();
    // Initialised middleware for /3/webhook/:appName
    dcAppProxy.initWebHookProxy();
    // setup middleware for DCPRC /3/appLicenseSerials
    app.use( `/3/appLicenseSerials`, AppLicenseSerialsMiddleware.create( Y ) );

    app.use( function( req, res, next ) {
        let
            dev = argv && argv.dev;
        /**
         * There is not ETag for dev. It means browser will receive fresh client side files every request.
         */
        if( !dev ) {
            res.set( 'ETag', packageJson.version );
        }

        next();
    } );
    app.use( '/lang', express.static( path.join(__dirname, 'lang') ) );
    app.use( require( process.cwd() + '/middleware/cors-all.js' ) );
    app.use( require( process.cwd() + '/middleware/mts.js' )( [] ) );
    app.use( favicon( __dirname + '/assets/favicon.ico' ) );
    app.use( require( process.cwd() + '/middleware/dcrealm' )( Y ) );
    app.use( cookieParser() );
    app.use( bodyParser.json( {limit: upload_max_filesize} ) );
    app.use( bodyParser.urlencoded( {extended: true} ) );
    app.use( require( './middleware/expresssession-init' )( Y ) );
    app.use( require( './middleware/passport-init' ) );
    app.use( require( './middleware/passportsession-init' ) );

    // ---------------------- Oauth token management endpoints ----------------------------
    app.post('/oauth/token', app.oauthServer.token({allowExtendedTokenAttributes: true}));
    app.post('/oauth/validateToken', app.oauthServer.authenticate(), (req, res) => {
        res.send({valid: true});
    });
    // ----------------------------------------- END --------------------------------------

    app.use( dcServerMiddleware.dcOauth( Y ) );
    app.use( dcServerMiddleware.dcfriend( Y ) );
    app.use( dcServerMiddleware.dcsession( Y ) );
    app.use( dcServerMiddleware.dclogout( Y ) );
    app.use( /^\/(?!cups|inpacs).*/i, function( req, res, next ) {
        if( req.baseUrl.indexOf( "uploadBdtFile" ) !== -1 ) {
            next();
        } else {
            multer( req, res, next );
        }
    } );

    app.use( settings.get( 'passport' ).get( 'strategies.basic.path', '/2/' ), dcServerMiddleware.passportBasicauth( Y ) );
    app.use( settings.get( 'fhir' ).get( 'proxy.path', '/fhir/' ), FhirProxyMiddleware.create( Y, settings.get( 'fhir' ) ) );
    //app.use( require( process.cwd() + '/middleware/passport-google-oauth2' )( Y ) );
    app.use( require( './middleware/passport-ldapauth' )( Y ) );
    app.use( require( './middleware/passport-supportauth' )( Y ) );
    app.use( require( './middleware/dcmojito-context' )( Y ) );
    app.use( dcServerMiddleware.mojitoDoccirrus( Y ) );
    app.use( '/cups', require( './middleware/dccups' )( Y ) );
    app.use( '/manual/', require( './middleware/dchandbuch' )( Y, app, datensafeProxyUrl ) );
    app.use( '/inpacs', require( './middleware/dcinpacs' )( Y, '/inpacs', app ) );
    dcNodeRed( Y, app, server ); // order is important
    dcAppProxy.initUIProxy();
    app.use( dcServerMiddleware.timeoutHandler( Y ) );
    app.use( require( './middleware/mojito-dcimagecache' )( Y ) );

    app.use( libmojito.middleware['mojito-handler-static']() );

    app.get( '/asv/*', require( './middleware/dcsendhtml' )( Y, 'asv' ) );
    app.get( '/2/media/*', require( './middleware/dcmedia' )( Y ) );
    app.get( '/media/*', require( './middleware/dcmedia' )( Y ) );
    app.get( '/barcode/*', require( './middleware/dcbarcode' )( Y ) );
    app.get( '/fonts/*', require( './middleware/dcfont' )( Y ) );

    app.get( `/dicomUserInputCsvTemplate`, require( './middleware/downloadDicomCsvTemplate' )( Y ) );
    app.get( '/download/:id', require( './middleware/dcdownload' )( Y ) );
    app.get( '/mmi-download/:typecode/:code', require( './middleware/dcmmidownload' )( Y ) );

    // setup download folder
    app.get( '/download-file/:filename', require( './middleware/expressdownload' )( Y, '/download-file' ) );

    // setup download from Imported folder
    app.get( '/imported-file/:filename', require( './middleware/expressdownload' )( Y, '/imported-file' ) );

    app.use( languageDetect( Y ) );

    // set up routes automatically
    app.mojito.attachRoutes();

    // add the error handler (not sure if this is correct here)
    app.use( require( './middleware/dc-error' ) );

    // At this point you can reliably call all Y.doccirrus.auth API methods, e.g.:
    Y.log( `Starting VPRC server: ${Y.doccirrus.auth.isVPRC()}`, 'info', NAME );

    // indicate that express is completely ready
    // but on this call dcdb will not be ready so just wait till next call from dcdb.server.js (for master)
    Y.doccirrus.server.signalReady();


    module.exports = app;
}
