/*	Client-side PDF renderer for form templates
 *	Requires ../css/treeview.css
 *
 *  @Author: Richard Strickland <strix@ekhayaict.com>
 *  @Copyright: Doc Cirrus GmbH
 *
 *  PDF rendering code is being gradually moved out of template-yui.js and other modules to reduce complexity and make
 *  this feature easier to debug / maintain.
 */

/*jshint latedef:false */
/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-pdf',

    /* Callback */
    function( Y, NAME ) {

        /*
         *  Outer function encapsulates the render process
         *
         *  @method public_makePDF
         *  @param  template    {Object}    a dcforms-template object, as in template-yui.js
         *  @param  saveTo      {String}    Where to put the new PDF ('zip'|'db'|'temp')
         *  @param  zipId       {String}    Handle to a zip file (optional), default is to save to db
         *  @param  preferName  {String}    FileName when rendering to zip (not guaranateed)
         *  @param  callback    {Function}  Of the form fn(err, mediaId)
         */
        function public_makePDF(template, saveTo, zipId, preferName, callback) {

            /**
             * Queue and render all pages
             * @param divId
             */

            var
            //  progress = 0,
            //  il8nDict = Y.dcforms.il8nDict,      //  typing shortcut / tidy [object]
            //  numCompleted = 0,                   //  progress bar step [int]
                ownModal = true;                    //  Display render status in own modal

            //$('#' + template.domId).hide();

            if (true === Y.doccirrus.comctl.inModal()) {
                ownModal = false;

                if (0 === $('#divPDFRender').length) {
                    Y.doccirrus.comctl.setModalAlert(
                        '<div id="divPDFRender">' +
                            '<div id="divPDFRenderTitle"></div>' +
                            '<div id="divPDFRenderBody"></div>' +
                       '</div>'
                    );
                }

            }

            Y.log('Rendering PDF: ' + (ownModal ? 'ownmodal' : 'not own modal'), 'debug', NAME);
            compilePDF();

            /**
             *  Update the display - either in own modal or a section of an existing modal
             *
             *  @param  title       {String}    Title of rendering display / modal, html
             *  @param  body        {String}    Body of rendering display / modal, html
             *  @param  closeButton {Bool}      Show close button if true
             */

            function updateDisplay(title, body, closeButton) {

                function onReRender() {
                    Y.log('Re-rendering form in modal.', 'debug', NAME);
                }

                if (true === ownModal) {
                    Y.doccirrus.comctl.setModal(title, body, closeButton);
                } else {
                    $('#divPDFRenderTitle').html('<h4>' + title + '</h4>');
                    $('#divPDFRenderBody').html(body);
                }

                if (true === closeButton) {
                    template.render(onReRender);
                }
            }

            /**
             *  Collect all page images and convert into a single PDF document on server
             *  Final step in rendering process, issues the parent's callback
             */

            function compilePDF() {

                if ((!template.orientation) ||('landscape' !== template.orientation)) { template.orientation = 'portrait'; }

                Y.log('Compiling PDF with owner ' + template.ownerId + ' on collection ' + template.ownerCollection, 'info', NAME);

                template.renderPdfServer(saveTo, zipId, preferName, onDocumentReady);
                function onDocumentReady( err, formForPDF ) {
                    if ( err ) { return onSuccess( err ); }

                    //  call formtemplate API via REST
                    Y.doccirrus.comctl.privatePost('1/media/:makepdf', { 'document': formForPDF }, onSuccess );
                }

                function onSuccess(err, mediaId) {

                    var errMsg;

                    if (err) {
                        Y.log('Could not render PDF: ' + JSON.stringify(err), 'warn', NAME);

                        errMsg = 'Ungültige Daten.';

                        if (err.status === 500) {
                            errMsg = '' +
                            'Ein interner Serverfehler ist aufgetreten. ' +
                            'Bitte melden Sie das Problem an Doc Cirrus Support';
                        }

                        if (err.status === 502) {
                            errMsg = '' +
                                'Ein interner Serverfehler ist aufgetreten. ' +
                                'Bitte versuchen sie den Vorgang nochmal in einer Minute.';
                        }

                        updateDisplay(
                            'Fehler beim Erstellen eines PDFs',
                            errMsg,
                            true
                        );
                        callback(err);
                        return;
                    }

                    //Y.log('Server response: ' + JSON.stringify(mediaId), 'info', NAME);

                    if ('object' === typeof mediaId && mediaId.data) {
                        mediaId = mediaId.data;
                    }
                    if ('object' === typeof mediaId && mediaId._id) {
                        mediaId = mediaId._id;
                    }

                    Y.log('Saved PDF as: ' + JSON.stringify(mediaId), 'info', NAME);

                    var
                        targetPage = 'newWindow' + (Math.random() * 9999999),
                        pdfUrl = '',
                        downloadUrl = '';

                    if (mediaId && mediaId.tempId) {
                        pdfUrl = '/pdf/' + mediaId.tempId.split('/').pop();
                        downloadUrl = Y.doccirrus.infras.getPrivateURL(pdfUrl);
                    }

                    if (mediaId && mediaId._id) {
                        pdfUrl = public_getMediaUrl( mediaId._id );
                        downloadUrl = Y.doccirrus.infras.getPrivateURL(pdfUrl);
                    }

                    if (mediaId && mediaId.zipId) {
                        pdfUrl = '/zip/' + mediaId.zipId;
                        downloadUrl = Y.doccirrus.infras.getPrivateURL(pdfUrl);
                    }

                    if ('' === downloadUrl) {
                        updateDisplay(
                            Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_OPEN'),
                            Y.doccirrus.comctl.getThrobber(),
                            true
                        );
                        return;
                    }

                    if (!zipId || '' === zipId) {
                        updateDisplay(
                            Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_OPEN'),
                            '<a class="btn" href="' + downloadUrl + '" target="' + targetPage + '">' + Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_OPEN') + '</a>' +
                            '&nbsp;' +
                            '<a class="btn" href="' + downloadUrl + '" download>' + Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_DOWNLOAD') + '</a>',
                            true
                        );
                    } else {
                        //TODO: translateme
                        updateDisplay('Hinzugefügt von PDF in ZIP-Archiv.', zipId);
                    }

                    Y.dcforms.setStatus('Rendered.', false);

                    if ('' === (mediaId + '')) {
                        callback('PDF could not be created');
                        return;
                    }

                    template.raiseBinderEvent('onPdfCreated', mediaId);
                    callback(null, mediaId);
                }

            }

        }

        /**
         *  Update the metadata of an attached PDF in the database
         *
         *  @method public_changePDFMeta
         *  @param  mediaId     {String}    Database ID of attached media
         *  @param  metaData    {Object}    Keys and values corresponding to media schema
         *  @param  callback    {Function}  Of the form fn(err, data);
         */

        function public_changePDFMeta(mediaId, metaData, callback) {

            var putArgs = { 'metadata': metaData };

            Y.doccirrus.comctl.privatePut( '/1/media/' + mediaId, putArgs, onMetaSaved );

            function onMetaSaved( err, data ) {
                if ( err ) {
                    Y.log( 'Could not update media metadata: ' + err, 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Updated PDF metadata for item: ' + data, 'info', NAME );
                callback( null, data );
            }
        }

        /**
         *  Get metadata of all PDFs attached to some object
         *
         *  @method public_listPDFs
         *  @param ownerCollection  {String}    model name / database collection name
         *  @param ownerId          {String}    unique ID of owner
         *  @param callback         {Function}  of the form fn(err, data)
         */

        function public_listPDFs(ownerCollection, ownerId, callback) {
            Y.log('Loading list of pdfs belonging to ' + ownerId + ' of ' + ownerCollection, 'info', NAME);

            function onMediaSetLoaded(data) {
                if ('string' === typeof data) {
                    data = JSON.parse(data);
                }

                Y.log('Loaded meta of ' + data.length + ' PDF documents.', 'debug', NAME);
                //TODO: filter to PDF, probably move to DC common module before that

                callback(null, data);
            }

            function onMediaSetError(err) {
                callback(err);
            }

            $.ajax( {
                url: Y.doccirrus.infras.getPrivateURL( '/1/media/:list' ),
                data: { 'collection': ownerCollection, 'id': ownerId },
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                success: onMediaSetLoaded,
                error: onMediaSetError
            } );

        }

        /**
         *  Render a list of attached PDFs into the given DOM id
         *
         *  @method public_renderPDFlist
         *  @param divId            {String}    DOM ID of a div
         *  @param ownerCollection  {String}    model name / database collection name
         *  @param ownerId          {String}    unique ID of owner
         *  @param callback         {Function}  of the form fn(err)
         */

        function public_renderPDFlist(divId, ownerCollection, ownerId, callback) {
            Y.log('Rendering list of pdfs belonging to ' + ownerId + ' of ' + ownerCollection, 'info', NAME);

            var jqDiv = $('#' + divId);

            if (!jqDiv.length) {
                callback('No such div: ' + divId);
                return;
            }

            function onPDFMetaLoaded(err, data) {
                if (err) {
                    callback('Could not load list of PDFs: ' + err);
                    return;
                }
                renderPDFData(data);
            }

            function renderPDFData(data) {
                var
                    i,
                    dnLink,
                    html = '' +
                        '<tr>' +
                            '<th>PDF</td>' +
                            '<th>' + Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_DOWNLOAD') + '</td>' +
                            '<th>' + Y.doccirrus.i18n('FormEditorMojit.pdf_render.LBL_PDF_OPEN') + '</td>' +
                        '</tr>';


                for (i = 0; i < data.length; i++) {

                    dnLink = public_getMediaUrl( data[i]._id );
                    dnLink = Y.doccirrus.infras.getPrivateURL( dnLink );

                    html = html +
                        '<tr>' +
                        '<td>' + data[i].name + '</td>' +
                        '<td><a href="' + dnLink + '">PDF</a></td>' +
                        '<td><a href="' + dnLink + '" download>PDF</a></td>' +
                        '</tr>';
                }

                jqDiv.html('<table ' + 'width="100%">' + html + '</table>');
                callback();
            }

            public_listPDFs(ownerCollection, ownerId, onPDFMetaLoaded);
        }

        /**
         * Given a mediaId, returns the download URL for this image.
         *
         * Single point to create download URLs must be used.
         *
         * @method public_getMediaUrl
         * @param mediaId
         * @returns {string}
         */
        function public_getMediaUrl( mediaId ) {
            return '/media/' + mediaId + '_original';
        }

        /*
         *  Add to YUI
         */

        Y.log( 'Adding Y.dcforms.makePdf', 'info', NAME );

        if( !Y.dcforms ) {
            Y.dcforms = {};
        }

        Y.dcforms.makePDF = public_makePDF;
        Y.dcforms.changePDFMeta = public_changePDFMeta;
        Y.dcforms.listPDFs = public_listPDFs;
        Y.dcforms.renderPDFList = public_renderPDFlist;
        Y.dcforms.getMediaUrl = public_getMediaUrl;

    },

    /* Req YUI version */
    '0.0.1',

    /* YUI module config */
    {
        requires: ['node']
    }

);  // end YUI.add
