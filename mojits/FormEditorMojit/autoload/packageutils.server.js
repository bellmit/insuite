/**
 *  Pack a form's dependencies into a single object
 *
 *  @author: strix
 *  @date: 2016 August
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-packageutils', function( Y , NAME ) {

        var
            async = require( 'async' );

        /**
         *  Add a form and all its dependencies to an object
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  formId          {String}    Canonical _id of a formtemplate
         *  @param  formVersionId   {String}    Optional, specific version of form to load
         *  @param  callback        {Function}  Of the form fn( err, pack )
         */

        function packageToObj( user, formId, formVersionId, callback ) {
            var
                pack = {
                    'formId': formId,
                    'formVersionId': formVersionId,
                    'template': null,               //  actual form to use
                    'formtemplate': {},             //  other forms we need
                    'formtemplateversion': {},      //  other form versions we need
                    'media': {},                    //  media we need,
                    'files': {},                    //  binary files,
                    'config': {}                    //  assigned forms roles etc
                };

            async.series(
                [
                    loadCanonicalForm,
                    loadFormVersion,
                    loadConfiguration,
                    loadDependencies
                ],
                onAllDone
            );


            //  1. Load the canonical form to find latest version (if necessary)
            function loadCanonicalForm( itcb ) {
                //  skip this step if we already have a version id
                if ( formVersionId && '' !== formVersionId ) { return itcb( null ); }

                function onCanonicalLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( 0 === result.length ) { return itcb( Y.doccirrus.errors.rest( 404, 'Form not found: ' + formId, true ) ); }

                    var canonical = result[0];
                    formVersionId = canonical.latestVersionId;
                    pack.formtemplate[formId] = canonical;
                    pack.formVersionId = canonical.latestVersionId;
                    itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'formtemplate',
                    'query': { _id: formId },
                    'callback': onCanonicalLoaded
                } );
            }

            //  2. Load the form version
            function loadFormVersion( itcb ) {
                function onVersionLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( 0 === result.length ) { return itcb( Y.doccirrus.errors.rest( 404, 'Form version not found', true ) ); }

                    pack.template = result[0];
                    itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'formtemplate',
                    'query': { _id: formId },
                    'callback': onVersionLoaded
                } );
            }

            //  3. Include forms configuration object in package (assigned roles, etc)
            function loadConfiguration( itcb ) {
                function onConfigLoaded( err, formsConfig ) {
                    if ( err  ) {
                        Y.log( 'Could not load forms config: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    pack.config = formsConfig;
                    itcb( null );
                }
                Y.doccirrus.formsconfig.getConfig(user, onConfigLoaded);
            }

            //  4. Load form dependencies
            function loadDependencies( itcb ) {
                var
                    lines = [],
                    directDeps,
                    pfId = pack.config['casefile-personalienfeld'] || '';

                //  get dependencies recorded in database
                if ( pack.template.dependsOn ) {
                    lines = pack.template.dependsOn.split( '\n' );
                } else {
                    pack.template.dependsOn = '';
                }

                //  add direct dependencies (some legacy forms seem to be unmigrated)
                directDeps = Y.doccirrus.forms.exportutils.listDirectDependencies( pack.template ).split('\n');
                lines = lines.concat( directDeps );

                //  Add personalienfeld to the package if not already in dependencies (legacy forms issue)
                if ( pfId && '' !==  pack.config['casefile-personalienfeld'] ) {
                    if  ( -1 === pack.template.dependsOn.indexOf( pfId ) ) {
                        lines.push( 'formtemplate::' + pfId );
                        Y.log( 'Added personalienfeld to dependencies: formtemplate::' + pfId, 'debug', NAME );
                    }
                }

                //  remove duplicates
                //  credit: http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
                lines = lines.filter( function uniqueDeps( item, pos, self ) {
                    return ( self.indexOf(item) === pos );
                });

                async.eachSeries( lines, loadDependency, itcb );
            }

            //  4.5 Load a single form dependency
            function loadDependency( line, itcb ) {
                if ( '' === line.trim() ) { return itcb( null ); }

                var
                    parts = line.split( '::' ),
                    modelName = parts[0],
                    objId = parts[1];

                function onObjLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    if ( 0 === result.length ) {
                        Y.log( 'Could not load dependency: ' + line, 'warn', NAME );
                        //  an error, but a not a fatal one, continue with best effort
                        return itcb( null );
                    }

                    //  only allow these object types (security)
                    switch ( modelName ) {
                        case 'formtemplate':            pack.formtemplate[objId] = result[0];               break;
                        case 'formtemplateversion':     pack.formtemplateversion[objId] = result[0];        break;
                        case 'media':                   pack.media[objId] = result[0];                      break;
                        default:
                            Y.log( 'Not adding invalid dependency: ' + line, 'warn', NAME );
                    }

                    //  if not media then we're done, otherwise we should load data from GridFS
                    if ( 'media' !== modelName ) {
                        return itcb( null );
                    }

                    if ( 'IMAGE_SVG' === result[0].mime ) {
                        Y.doccirrus.media.svgraster.svgToJpegDataUri( user, result[0], 1024, -1, onDataURICreated );
                        return;
                    }

                    Y.doccirrus.media.gridfs.exportBuffer( user, objId, false, onBinaryMediaLoaded );
                }

                function onDataURICreated( err, dataURI ) {
                    if ( err ) {
                        Y.log( 'Could not rasterize SVG from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                        //  not a fatal error, continue with best effort
                        return itcb( null );
                    }

                    //  strip off dataURI header
                    if ( 'data:image/jpeg;base64,' === dataURI.substr( 0, 23 ) ) {
                        dataURI = dataURI.substr( 23 );
                    }

                    pack.files[objId] = dataURI;
                    itcb( null );
                }

                function onBinaryMediaLoaded( err, mediaBuffer ) {
                    if ( err ) {
                        Y.log( 'Could not load binary from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                        //  not a fatal error, continue with best effort
                        return itcb( null );
                    }

                    pack.files[objId] = mediaBuffer.toString( 'base64' );
                    itcb( null );
                }

                Y.log( 'Adding form dependency: ' + line, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': modelName,
                    'query': { _id: objId },
                    'callback': onObjLoaded
                } );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not pack form dependencies: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                Y.log( 'Finished packing form: ' + formId + '-v-' + formVersionId, 'debug', NAME );
                callback( null, pack );
            }
        }

        /**
         *  Add a form and all its dependencies to an object, return as JSON string
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  formId          {String}    Canonical _id of a formtemplate
         *  @param  formVersionId   {String}    Optional, specific version of form to load
         *  @param  callback        {Function}  Of the form fn( err, pack )
         */

        function packageToJSON( user, formId, formVersionId, callback ) {
            function onPackageCreated( err, pack ) {
                if ( err ) { return callback( err ); }
                var jsonStr = JSON.stringify( pack );
                callback( null, jsonStr );
            }
            packageToObj( user, formId, formVersionId, onPackageCreated );
        }

        /**
         *  Add a form and all its dependencies to an object, return as Base64 encoded JSON string
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  formId          {String}    Canonical _id of a formtemplate
         *  @param  formVersionId   {String}    Optional, specific version of form to load
         *  @param  callback        {Function}  Of the form fn( err, pack )
         */

        function packageToBase64( user, formId, formVersionId, callback ) {
            function onJSONCreated( err, jsonStr ) {
                if ( err ) { return callback( err ); }
                var
                    base64Str = Buffer.from( jsonStr ).toString( 'base64' ),

                    //  credit, see: http://james.padolsey.com/snippets/wordwrap-for-javascript/
                    wrapBase64Str,
                    brk = 'n',
                    width =  75,
                    cut = true;

                var regex = '.{1,' + width + '}(\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\S+?(\s|$)');

                wrapBase64Str = base64Str.match( RegExp(regex, 'g') ).join( brk );
                callback( null, wrapBase64Str );
            }
            packageToJSON( user, formId, formVersionId, onJSONCreated );
        }

        /*
         *  Share this with the rest of mojito - renamed from Y.docirrus.forms.config due to strange YUI namespace issue
         */

        Y.namespace( 'doccirrus.forms' ).package = {
            toObj: packageToObj,
            toJSON: packageToJSON,
            toBase64: packageToBase64
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcforms-roles' ]}
);