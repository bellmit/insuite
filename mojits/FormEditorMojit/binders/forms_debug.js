/**
 *  jadeLoaded view of form diagnostic / debug information
 *
 *  @author: strix
 *
 *  Copyright (c) 2012 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*exported _fn */
/*global $ */

function _fn(Y, NAME) {
    'use strict';


    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  private vars

            var
            //  myNode = node,                          //  YUI / DOM node this is rendered into
                userLang = Y.dcforms.getUserLang(),     //  user's language, may be overridden by template
                jqCache = {},                           //  cached jQuery selectors
                imgSize = 200,                          //  thumbnail width/height

                formDeps = [],                          //  dependencies

                canonicalId = '',                       //  form template to display history for
                versionId = '',                         //  specific version of form to show
                versionList = [];

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if ('undefined' !== node.passToBinder) {

                if (node.passToBinder.hasOwnProperty('canonicalId')) {
                    canonicalId = node.passToBinder.canonicalId;
                }

                if (node.passToBinder.hasOwnProperty('formVersionId')) {
                    versionId = node.passToBinder.formVersionId;
                }

            } else {
                // TRANSLATEME
                Y.doccirus.comctl.setModal('Warn', 'Please specify a form to show history for.');
            }

            /*
             *  Cache jQuery selectors for controls
             */

            jqCache = {
                'divDebugDeps': $('#divDebugDeps'),
                'divDebugHistory': $('#divDebugHistory'),
                'divDebugSerialized': $('#divDebugSerialized'),
                'divDebugMediaTxt': $('#divDebugMediaTxt'),
                'divDebugMediaBin': $('#divDebugMediaBin')
            };

            //  INITIALIZATION

            /**
             *  Set up event listeners and request forms list from server
             */

            function initDebug() {
                if ('' === canonicalId) {
                    Y.log('No form template specified.', 'warn', NAME);
                    return;
                }

                getSource();
                getDeps();
                getHistory();

            }

            initDebug();

            //  PRIVATE METHODS


            function getSource() {
                var
                    ajaxParams = {
                        'id': canonicalId,
                        'versionId': versionId
                    };

                function onSourceLoaded(err, source) {
                    if (err) {
                        source = err;
                    }
                    jqCache.divDebugSerialized.html('<pre>' + JSON.stringify(source, undefined, 2) + '</pre>');
                }

                Y.doccirrus.comctl.privateGet('/1/formtemplate/:loadform', ajaxParams, onSourceLoaded);
            }

            function getDeps() {
                var
                    ajaxParams = {
                        'id': canonicalId,
                        'versionId': versionId
                    };

                function onDepsLoaded(err, data) {
                    if (err) {
                        data = err;
                    } else {
                        formDeps = data;
                        showFormImages();
                    }

                    jqCache.divDebugDeps.html('<pre>' + JSON.stringify(data, undefined, 2) + '</pre>');
                }

                Y.doccirrus.comctl.privateGet('/1/formtemplate/:listdependencies', ajaxParams, onDepsLoaded);
            }

            /**
             *  Show table of revisions to this form
             */

            function getHistory() {
                Y.dcforms.getFormVersionHistory( canonicalId, onHistoryLoaded);
            }

            /**
             *
             */

            function showFormImages() {
                var
                    txtImages = '',
                    binImages = '',
                    imgUrl,
                    imgLink,
                    hasMedia = false,
                    i;

                for (i = 0; i < formDeps.length; i++) {
                    if ('media' === formDeps[i].type) {
                        hasMedia = true;

                        imgUrl = '/media/' + formDeps[i]._id + '_' + imgSize + 'x' + imgSize + '.IMAGE_JPEG.jpg';

                        imgUrl = Y.doccirrus.infras.getPrivateURL(imgUrl);

                        imgLink = '/media/' + formDeps[i]._id + '_original';
                        imgLink = Y.doccirrus.infras.getPrivateURL(imgLink);

                        txtImages = txtImages +
                            '<a href="' + imgLink + '">' +
                            '<span id="spanImg' + formDeps[i]._id + '"></span>' +
                            '</a>';

                        binImages = binImages +
                            '<a href="' + imgLink + '">' +
                            '<img ' +
                                'src="' + imgUrl + '" ' +
                                'width="' + imgSize + 'px" ' +
                                'height="' + imgSize + 'px" ' +
                            '/></a>';
                    }
                }

                if (true === hasMedia) {
                    jqCache.divDebugMediaTxt.html(txtImages);
                    jqCache.divDebugMediaBin.html(binImages);

                    for (i = 0; i < formDeps.length; i++) {
                        if ('media' === formDeps[i].type) {
                            getImageDataUrl(formDeps[i]._id);
                        }
                    }

                } else {
                    jqCache.divDebugMediaTxt.html('No referenced media.');
                    jqCache.divDebugMediaBin.html('No referenced images.');
                }
            }

            function getImageDataUrl(id) {

                function onDataUrlLoaded(err, data) {
                    if (err)  {
                        Y.log('Could not load image as dataurl: ' + JSON.stringify(params) + 'err: ' + err, 'warn', NAME);
                        return;
                    }

                    var imgTag = '<img src="' + data + '" width="' + imgSize + 'px" height="' + imgSize + 'px">';

                    //Y.log('Loaded image as dataUrl: ' + JSON.stringify(params));
                    $('#spanImg' + id).html(imgTag);
                }

                var
                    params = {
                        'dataurl': 'true',
                        'w': imgSize,
                        'h': imgSize,
                        '_id': id
                    };

                Y.doccirrus.comctl.privateGet('/1/media/:scale', params, onDataUrlLoaded);
            }

            /**
             *  Render and set event handlers
             */

            function renderHistoryTable() {
                var
                    html,
                    vsn,
                    i;

                if (0 === versionList.length) {
                    //  TRANSLATEME
                    jqCache.divDebugHistory.html(Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_NOVERSION'));
                }

                //  Make the table

                html = '<table noborder width="100%">' +
                    '<tr>' +
                    '<th>_id</th>' +
                    '<th>' + Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_VERSIONNO') + '</th>' +
                    '<th>' + Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_TITLE') + '</th>' +
                    '<th>' + Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_REVCOMMENT') + '</th>' +
                    '</tr>';

                for (i = 0; i < versionList.length; i++) {
                    vsn = versionList[i];

                    html = html + '<tr>' +
                        '<td>' + vsn._id + '</td>' +
                        '<td>' + vsn.version + '.' + vsn.revision + '</td>' +
                        '<td>' + vsn.title[userLang] + '</td>' +
                        '<td>' + vsn.revComment + '</td>' +
                        '</tr>';
                }

                html = html + '<table>';

                //  Add to modal

                jqCache.divDebugHistory.html(html);

            }

            //  EVENT HANDLERS

            /**
             *  Callback from Y.doccirrus.getFormsList - has a flat list of forms
             *
             *  @param  err         {String}    AJAX error message
             *  @param  data        {Object}    Array of form template metadata objects
             */

            function onHistoryLoaded(err, data) {

                if (err) {
                    Y.doccirrus.comctl.setModal('Error', Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_COULDNOTLOAD'));
                    return;
                }
                versionList = data;
                renderHistoryTable();
            }

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_history.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}