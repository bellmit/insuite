/*
 * DEPRECATED: forms are no longer kept in this format, now used only to import data during legacy migration
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, __dirname */

YUI.add('formtemplate-flatfile', function (Y, NAME) {
    

    /**
     * The FormEditorMojitModelFormsDisk module.
     * @module FormEditorMojitModelFormsDisk
     */

    var
        fs = require('fs'),
        formAssetsBaseDir = (__dirname).replace('models', 'assets/'),    // inelegant TODO: fix
        defaultTemplateDir = formAssetsBaseDir + 'templates/',
        defaultImageDir = formAssetsBaseDir + 'userimages/',

    //  legacy, DEPRECATED, now handled by /autoload/pdf.server.js
        pdfDataDir = __dirname + '/../../../var/data/FormEditorMojit',
        pdfRenderDir = __dirname + '/../../../var/data/FormEditorMojit/render';

    /**
     *  Make sure that PDF rendering directory exists
     *
     *  DEPRECATED: now done by pdf.server.js autoload component, removeme // TODO
     *
     *  (security issue, but may need to be be fully accessible to
     *  scripts running under other user accounts)
     *
     *  Note also that JSLint doesn't like octal literals.
     */

    function tryCreateTempDirectories() {

        fs.exists(pdfDataDir, function (ddExtant) {
            if (false === ddExtant) {
                Y.log('PDF output dir does not exist, creating...', 'info', NAME );
                fs.mkdir(pdfDataDir, ['r', 'w', 'x'], function () {                      //  REVIEWME: security
                    fs.exists(pdfRenderDir, function (ddCreated) {
                        if (true === ddCreated) {
                            Y.log('Created PDF output directory: ' + pdfDataDir, 'info', NAME );
                        } else {
                            Y.log('Could not create directory: ' + pdfDataDir, 'warn', NAME );
                        }
                    });
                });
            }
        });

        fs.exists(pdfRenderDir, function (rdExtant) {
            if (false === rdExtant) {
                Y.log('PDF render dir does not exist, creating...', 'info', NAME );
                fs.mkdir(pdfRenderDir, ['r', 'w', 'x'], function () {                  //    REVIEWME: security
                    fs.exists(pdfRenderDir, function (rdCreated) {
                        if (true === rdCreated) {
                            Y.log('Created PDF render directory: ' + pdfRenderDir, 'info', NAME );
                        } else {
                            Y.log('Could not create directory: ' + pdfRenderDir, 'warn', NAME );
                        }
                    });
                });
            }
        });
    }

    /**
     * Constructor for the FormEditorMojitModelFormsDisk class.
     * @class FormEditorMojitModelFoo
     * @constructor
     */

    Y.namespace('mojito.models')[NAME] = {

        init: function (config) {
            this.config = config;
            tryCreateTempDirectories();
        },

        /**
         *  List forms serialized to disk
         *  @param callback {Function}  Of the form fn(err, data)
         */

        listForms: function (callback) {
            Y.log('Listing forms in ' + defaultTemplateDir, 'info', NAME);

            fs.readdir(defaultTemplateDir, function onDirRead(err, files) {
                if (err) {
                    Y.log('Could not list default reduced schema: ' + err, 'warn', NAME);
                    callback(err);
                    return;
                }

                var
                    i,
                    matching = [];

                Y.log('Directory contains ' + files.length + ' files', 'info', NAME);

                for (i = 0; i < files.length; i++) {
                    if (files[i].indexOf('.form') > 0) {
                        matching.push(files[i].replace('.form', ''));
                    }
                }

                callback(null, matching);
            });
        },

        /**
         *  Load a serialized form from disk
         *
         *  @param  formId      {String}    Corresponds to filename under which this is saved
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        loadForm: function (formId, callback) {

            formId = formId.replace('.form', '');       //  optional

            var
                fileName = formAssetsBaseDir + 'templates/' + formId + '.form';

            //  check for directory traversal, etc
            if (false === Y.doccirrus.filters.isLegalFileName(fileName)) {
                Y.log('SECURITY: invalid file name, possible attack or penetration test', 'warn', NAME);
                callback('Invalid file name');
                return;
            }

            Y.log('Loading default form template from disk: ' + fileName, 'debug', NAME);

            fs.exists(fileName, function onExistCheck(exists) {
                if (exists) {

                    //  file exists, attempt read and call back
                    Y.log('Template file confirmed: ' + fileName, 'debug', NAME);
                    fs.readFile(
                        fileName,
                        { 'encoding': 'utf8' },
                        callback
                    );
                } else {

                    //  file does not exist, call back with error
                    Y.log('Requested template file not found: ' + fileName, 'debug', NAME);
                    return callback('file does not exist: ' + fileName);

                }
            });

        },

        /**
         *  Check if a form exists on disk
         *
         *  @param formId       {String}    Collective identifier for a set of default forms
         *  @param callback     {Function}  Of the form fn(err, fileName)
         */

        formExists: function (formId, callback) {
            formId = formId.replace('.form', '');       //  optional

            var
                fileName = formAssetsBaseDir + 'templates/' + formId + '.form';

            //  check for directory traversal, etc
            if (false === Y.doccirrus.filters.isLegalFileName(fileName)) {
                Y.log('SECURITY: invalid file name, possible attack or penetration test', 'warn', NAME);
                callback('Invalid file name');
                return;
            }

            Y.log('Loading default form template from disk: ' + fileName, 'debug', NAME);

            fs.exists(fileName, function onExistCheck(exists) {
                if (false === exists) {
                    callback('File not found');
                    return;
                }
                callback(null, fileName);
            });
        },

        /**
         *  Serialize a form to disk
         *
         *  Note that this will also save any attached images
         *
         *  @param  form        {Object}    Form object as saved in the database
         *  @param  callback    {Function}  Of the form fn(err, fileName)
         */

        saveForm: function (form, callback) {

            //  check for directory traversal, etc
            if (false === Y.doccirrus.filters.isLegalFileName(form.templateFile)) {
                Y.log('SECURITY: invalid file name, possible attack or penetration test', 'warn', NAME);
                callback('Invalid file name');
                return;
            }

            //  some quick safety checks, just in case
            form.templateFile = form.templateFile.replace('/', '_');
            form.templateFile = form.templateFile.replace('\\', '_');
            form.templateFile = form.templateFile.replace(' ', '_');


            //  enforce .form file extension
            form.templateFile = form.templateFile.replace('.form', '') + '.form';

            //  allows forms to change id
            form.formId = form.templateFile;

            var
                fileName = defaultTemplateDir + form.templateFile;

            //Y.log('Saving form: ' + JSON.stringify(form, 'undefined', 2), 'debug', NAME);
            Y.log('Saving form: ' + fileName, 'info', NAME);

            fs.writeFile(
                fileName,
                JSON.stringify(form, undefined, 2),
                { 'encoding': 'utf8' },
                callback
            );
        },

        /**
         *  Serialize a form to disk
         *
         *  Note that this will also save any attached images
         *
         *  @param  mediaId     {string}    ID of a media item in the database
         *  @param  dataUrl     {string}    Base64 encoded jpeg image
         *  @param  callback    {Function}  Of the form fn(err, fileName)
         */

        saveImage: function (mediaId, dataUrl, callback) {

            var
                fileName = defaultImageDir + mediaId + '.dataurl';

            //  TODO: use images module to validate dataUrl before saving on disk

            //  check for directory traversal, etc
            if (false === Y.doccirrus.filters.isLegalFileName(fileName)) {
                Y.log('SECURITY: invalid file name, possible attack or penetration test', 'warn', NAME);
                callback('Invalid file name');
                return;
            }

            Y.log('Saving image: ' + fileName, 'info', NAME);

            fs.writeFile(
                fileName,
                dataUrl,
                { 'encoding': 'utf8' },
                callback
            );
        },

        /**
         *  Load a serialized form from disk
         *
         *  @param  mediaId     {String}    Corresponds to filename under which this is saved
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        loadImage: function (mediaId, callback) {

            mediaId = mediaId.replace('.dataurl', '');       //  optional

            var
                fileName = defaultImageDir + mediaId + '.dataurl';

            //  check for directory traversal, etc
            if (false === Y.doccirrus.filters.isLegalFileName(fileName)) {
                Y.log('SECURITY: invalid file name, possible attack or penetration test', 'warn', NAME);
                callback('Invalid file name');
                return;
            }

            Y.log('Loading default image from disk: ' + fileName, 'debug', NAME);

            fs.exists(fileName, function onExistCheck(exists) {
                if (exists) {

                    //  file exists, attempt read and call back
                    Y.log('Image file confirmed: ' + fileName, 'debug', NAME);
                    fs.readFile(
                        fileName,
                        { 'encoding': 'utf8' },
                        callback
                    );
                } else {

                    //  file does not exist, call back with error
                    Y.log('Requested image file not found: ' + fileName, 'debug', NAME);
                    return callback('file does not exist for: ' + mediaId);

                }
            });

        }

    };

}, '0.0.1', {requires: []});
