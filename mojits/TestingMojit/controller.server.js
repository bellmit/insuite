/*
 * Copyright DocCirrus GmbH 2013
 * author: Richard Strickland
 *
 * This a place to add examples and experiments which would otherwise clutter production mojits.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:true */
/*jshint latedef:false */
/*global YUI */

YUI.add('TestingMojit', function(Y, NAME) {

/**
 * The TestingMojit module.
 *
 * @module TestingMojit
 */

        /**
         *  ac.error() no longer used for REST calls, this is a quick way to migrate to new scheme
         *
         *  2013-11-12
         *
         *  @param ac       {object}    action context of a REST call
         *  @param msg      {string}    error message
         *  @param code     {number}    optional HTTP status code, default is 404
         */

        function acRestError(ac, msg, code) {

            if (!msg) {
                msg = 'Undefined REST error from FormEditorMojit';
            }

            if (!code) {
                code = 404;
            }

            Y.log('REST error: ' + msg + ' (code: ' + code + ')', 'warn', NAME);
            Y.doccirrus.utils.reportErrorJSON(ac, code, msg);
        }

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace('mojito.controllers')[NAME] = {

        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */

        testing: function(ac) {

            var meta = {http: {}};

            //ac.assets.addCss( './css/ko.css' );
            //ac.assets.addCss( './css/CaseFileMojit.css' );
            //Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );

        },

        /**
         *  Method corresponding to the '/formstest' route
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        formstest: function(ac) {
            //see: ../FormEditorMojit/autoload/assethelper.server.js
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({ 'status': 'ok' });
        },

        /**
         *  Method corresponding to the '/formsbindingtest' route
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        formsbindingtest: function(ac) {
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({}, {http: {}});
        },

        /**
         *  Method corresponding to the '/subformsbindingtest' route
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        subformsbindingtest: function(ac) {
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({}, {http: {}});
        },


        /**
         *  Method corresponding to the '/subformsbindingtest' route
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        mappingdescription: function(ac) {
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({}, {http: {}});
        },

        /**
         *  Method corresponding to the '/formstablebindingtest' route
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        formstablebindingtest: function(ac) {
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({ 'status': 'ok' });
        },

        /**
         *  Method corresponding to the '/svgpathtest' route
         *  Development / debug route to show the content of form documents
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        svgpathtest: function(ac) {
            Y.doccirrus.forms.assethelper(ac);
            ac.assets.addCss('/static/FormEditorMojit/assets/css/ko.css');
            ac.done({ 'status': 'ok' });
        },

        /**
         *  Test creation of PDFs in batches and packing in .zip
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        batchpdftest: function(ac) {

            var
                meta = {http: {}},
                req = ac.http.getRequest(),
                catalogDescriptors,
                countryCode = Y.doccirrus.auth.getCountryCode( req.user );

            catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                {
                    actType: '',
                    country: countryCode || 'D'
                } );

            // MOJ-3453: if country has no catalogs fall back to german catalogs
            if( Y.Object.isEmpty( catalogDescriptors ) ) {
                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                    actType: '',
                    country: 'D'
                } );
            }

        //  ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },

        /**
         *  Load testing jig for PDF creation
         *  This is diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        bulkpdftest: function(ac) {

            var
                meta = {http: {}},
                req = ac.http.getRequest(),
                catalogDescriptors,
                countryCode = Y.doccirrus.auth.getCountryCode( req.user );

            catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                {
                    actType: '',
                    country: countryCode || 'D'
                } );

            // MOJ-3453: if country has no catalogs fall back to german catalogs
            if( Y.Object.isEmpty( catalogDescriptors ) ) {
                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                    actType: '',
                    country: 'D'
                } );
            }

            //  ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },

        /**
         *  Support / OPS rescue method to regenerate PDFs created in a certain perio
         *
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        batchregeneratepdfs: function(ac) {

            var meta = {http: {}};

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },

        /**
         *  Support / OPS rescue method to replace forms which may be broken or misdeployed
         *
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        batchreplaceforms: function(ac) {

            var meta = {http: {}};

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },


        /**
         *  Test chunked uploads of large files to GridFS
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        gridfstest: function( ac ) {

            var
                meta = {http: {}};

            //ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            //ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            ac.done( {}, meta );
        },

        /**
         *  Test creation of PDFs concatenated from a set of other PDFs in the database
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        mergepdftest: function(ac) {

            var
                meta = {http: {}};

            //  ac.pageData.set( 'catalog-descriptors', catalogDescriptors );

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            ac.done( {}, meta );
        },

        /**
         *  Test instantiation of form without using REST APIs
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        formisolationtest: function( ac ) {

            var
                req = ac.http.adapter.req,
                pageData = { 'testfield': 'testvalue' },
                params = req.query,
                formId = params.formId || '',
                formVersionId = params.formVersionId || '',
                meta = {
                    http: { }
                };

            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );

            //  if no formId given then we're done
            if ( !params.formId ) { ac.done( pageData , meta ); }

            pageData.formId = formId;
            Y.doccirrus.forms.package.toJSON( req.user, formId, formVersionId, onPackageCreated );

            function onPackageCreated( err, jsonStr ) {
                if ( err ) { return ac.done( err ); }
                pageData.formpackage = jsonStr;
                ac.done( pageData, meta );
            }

        },

        /**
         *  Test route to generate font tables
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        fontmetrics: function( ac ) {

            var meta = { http: { } };

            ac.assets.addCss( '/fonts/ttf.css' );
            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );
            ac.done( {}, meta );
        },

        /**
         *  Test route show output of labdata renderers
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        labdatatest: function( ac ) {

            var meta = { http: { } };

            ac.assets.addCss( '/fonts/ttf.css' );
            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );
            ac.done( {}, meta );
        },


        /**
         *  Test route for live labdata interpreter
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        labdataparse: function( ac ) {

            var meta = { http: { } };

            ac.assets.addCss( '/fonts/ttf.css' );
            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );
            ac.done( {}, meta );
        },

        /**
         *  Dev/Suppoet route to regenerate reporting data by patient
         *  This is a diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        reportinghelper: function( ac ) {

            var meta = { http: { } };

            ac.assets.addCss( '/fonts/ttf.css' );
            ac.assets.addCss( '/static/FormEditorMojit/assets/css/ko.css' );
            ac.assets.addCss( '/static/CaseFileMojit/assets/css/CaseFileMojit.css' );
            ac.done( {}, meta );
        },

        medsdbtest: function( ac ) {
            var meta = {http: {}};
            ac.done( {}, meta );
        },

        dotestplayground: function( ac ) {
            var meta = {http: {}};
            ac.done( {}, meta );
        },

        sdkttest: function( ac ) {
            var meta = {http: {}};
            ac.done( {}, meta );
        },

        /**
         *  Method corresponding to the '/xsstest' route
         *  This is temporary/diagnostic and should be restricted to admins and developers
         *  @param ac {Object} The ActionContext that provides access to the Mojito API.
         */

        xsstest: function( ac ) {

            ac.done( {}, {} );

        },

        /**
         *  REST action to actually run the XSS tests
         *
         *  Sample XSS exploits are passed in ?test=base64EncodedSample, decoded, filtered and returned in a page
         *
         *
         *  @param ac
         */

        xsstestrunner: function(ac) {
            var
                html,
                params = ac.rest.originalparams,
                testString64 = (params.hasOwnProperty('test') ? params.test : ''),
                testString = Buffer.from(testString64, 'base64' ).toString('ascii' ),
                filterObj = {
                    'anything': 'here',
                    'hostile': testString
                };

            filterObj = Y.doccirrus.filters.cleanDbObject(filterObj);

            html = '<!doctype html>' +
                '<html>' +
                '<head>' +
                '<title>XSS TEST</title>' +
                '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">' +
                '</head>' +
                '<body>' +
                '<pre>' + filterObj.hostile + '</pre>' +
                '<br>' + filterObj.hostile + '<br/>' +
                '<input type="text" value="' + filterObj.hostile + '"/><br/>' +
                '<script>eval(' + '\"' + filterObj.hostile + '\");</script>' +
                '</body>' +
                '</html>';

            //this._getCallback(html, { 'http': { headers: { 'content-type': 'text/html' } } });
            ac.done(html, { 'http': { headers: { 'content-type': 'text/html' } } });
        },

        /**
         *  temporary, for table binding test
         *  @method getModelname
         *  @return {String}    Just while testing brings
         */

        getModelName: function() {
            return 'patient';
        },

        /**
         *  Rest action to load test patients from database
         *
         *  @method getpatientstest
         *  @param  ac  {Object}    ac through KOHTMLFrameMojit
         */

        getpatientstest: function(ac) {

            Y.log('Loading patients available to this user: ' + ac.rest.user.id, 'info', NAME);

            var
                finish = this._getCallback(ac);

            //  (3) In case of failure, this works around a bug where HTTP error codes were not being sent
            function onFailure(err) {
                acRestError(ac, err, 404);
            }

            //  (2) Return the set of pateitns to client
            function onDataLoaded(err, data) {

                if (err) {
                    onFailure(err);
                    return;
                }

                finish(null, data);
            }

            //  (1) Get a 'patient' db model and load all patients in the database

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'patient',
                user: ac.rest.user,
                query: ac.rest.query
            }, onDataLoaded );

        },

        /**
         *  REST action to check the presence of external helper utilities
         *  @param ac
         */

        testbinutils: function(ac) {
            var
                toLookup = [
                    'convert',
                    'identify',
                    'gs',
                    'zip',
                    'tar',
                    'file',
                    'gzip',
                    'base64'
                ],
                inDebugMode = (Y.config.argv.hasOwnProperty('debug') && Y.config.argv.debug),
                results = [];


            if (!inDebugMode) {
                results.push('This action is restricted to debug mode for security reasons.');
                results.push('Please start the server with --debug to enable.');
                ac.done(JSON.stringify(results, undefined, 2), { 'http': { headers: { 'content-type': 'text/plain' } } });
                return;
            }

            for( let i = 0; i < toLookup.length; i++ ) {
                let location;
                try {
                    location = Y.doccirrus.binutilsapi.getPathToBinUtil( toLookup[i] );
                } catch( e ) {
                    location = 'NOT FOUND';
                }
                results.push( {
                    'binutil': toLookup[i],
                    'tool': toLookup[i],
                    'location': location,
                    'configured': location
                } );
            }

            ac.done( JSON.stringify( results, undefined, 2 ), {'http': {headers: {'content-type': 'text/plain'}}} );
        },

        /**
         *  REST action to perform once-off filtering of entire database
         *
         *  DEPRECATED, should no longer be unfiltered data in db
         *  REMOVED 2014-04-02
         *
         *  @method applyfiltertodb
         *  @param  ac {Object} The ActionContext that provides access to the Mojito API.
         */

        applyfiltertodb: function(ac) {
            var finish = this._getCallback(ac);
            finish(Y.doccirrus.errors.http( 404, 'Removed, restore from git if needed.' ));
        },

        jsonrpctest: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        testDCWindow: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        testKoViewModel: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        testKoUI: function( ac ) {
            ac.assets.addCss( '/static/TestingMojit/assets/index.css' );
            ac.done( {}, {http: {}} );
        },

        testKoTableLinked: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        testHasFeedback: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        moj2687: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        testDynamsoftTwain: function( ac ) {
            ac.done( {}, {http: {}} );
        },

        moj5958: function( ac ) {
            ac.done( {}, {http: {}} );
        }

    };

},
'0.0.1',
{
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-models-addon',
        'mojito-params-addon',
        'mojito-http-addon',
        'mojito-intl-addon',
        'dcmedia-store',
        'dcmedia-svg'
        ]
    }
);
