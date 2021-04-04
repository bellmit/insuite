/*
 * DEPRECATED: Now used only to import forms during legacy migration
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */

YUI.add('formimage-flatfile', function(Y, NAME) {


/**
 * Module for loading and saving images to disk
 * @module formimage-flatfile
 */

    var fs = require('fs' ),
        formAssetsBaseDir = __dirname + '/../assets/',
        imagesBaseDir = formAssetsBaseDir + 'userimages/';


    /**
     * Constructor for the FormEditorMojitModelFormsDisk class.
     * @class FormEditorMojitModelFoo
     * @constructor
     */

    Y.namespace('mojito.models')[NAME] = {

        init: function(config) {

            this.config = config;

            /**
             * Method that will be invoked by the mojit controller to obtain data.
             * @param callback {function(err,data)} The callback function to call when the data has been retrieved.
             */

            //this.getFormTemplatesTree = function(callback) {
                //callback(null, getListingSync(formAssetsBaseDir + 'forms/', ''));
                //getListingAsync(imagesBaseDir + 'forms/', '', callback);
            //};

        },

        /**
         * Method that will be invoked by the mojit controller to obtain data.
         * @param fileName relative ../assests/
         * @param callback {function(err,data)} The callback function to call when the data has been retrieved.
         */

        getDataUrl: function(fileName, callback) {
            fileName = imagesBaseDir + fileName + '.dataurl';
            //fileName = fileName.replace('..', '__ATTEMPTED_DIRECTORY_TRAVERSAL__');     //  crude

            Y.log('getDataUrl (disk) fileName: ' + fileName);

            fs.readFile(fileName, 'utf8', callback);
        },

        /**
         * Method that will be invoked by the mojit controller to save data (master image).
         * @param   fileName    {String}                relative to ../assests/
         * @param   dataUrl     {String}                new contents of image
         * @param   callback    {function(err,data)}    Called when the data has been saved
         */

        setDataUrl: function(fileName, dataUrl, callback) {

            fileName = imagesBaseDir + fileName + '.dataurl';
            fileName = fileName.replace('..', '__ATTEMPTED_DIRECTORY_TRAVERSAL__');     //  crude

            Y.log('setDataUrl (disk) fileName: ' + fileName);

            //  note: this is utf8
            fs.writeFile(fileName, dataUrl, callback);
        },

        /**
         *  List images in ../assets/userimages/ - stored as data URIs
         *  @param callback {function(err,data)} The callback function to call when the data has been retrieved.
         */

        listImages: function(callback) {
            Y.log('Listing images in ' + imagesBaseDir, 'info', NAME);

            fs.readdir(imagesBaseDir, function onDirRead(err, files) {
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
                    if (files[i].indexOf('.dataurl') > 0) {
                        matching.push(files[i]);
                    }
                }

                callback (null, matching);
            });
        }

        /**
         *
         */

    };

}, '0.0.1', {requires: []});
