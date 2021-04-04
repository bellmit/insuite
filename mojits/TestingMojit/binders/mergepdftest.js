/*
 *  Binder for testing concatenation of many PDFs into a single document
 *
 *  This is for a scheduled CUPS task printing all activities of a given type for a period
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $ */

YUI.add('TestingMojitBinderMergePDFTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderMergePDFTest module.
         *
         * @module TestingMojitBinderMergePDFTest
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderMergePDFTest with NAMEs ' + NAME, 'info');

        /**
         * Constructor for the TestingMojitBinderImageTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            formDocIds: [],
            mediaIds: [],
            batchProgress: 0,
            batchTotal: 0,
            jqCache: {},

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                var that = this;

                this.jqCache = {
                    btnTestMergePDF: $('#btnTestMergePDF'),
                    taExampleData: $('#taExampleData'),
                    divProgress: $('#divProgress'),
                    divStatus: $('#divStatus')
                };

                this.node = node;

                //  SET UP SOCKET IO

                Y.doccirrus.communication.openConnection();
                Y.doccirrus.communication.on({
                    event: 'mediaConcatenatePDFs',
                    socket: Y.doccirrus.communication.getSocket( '/' ),
                    done: function(msg) { that.onSIOMessage(msg); },
                    handlerId: 'mediaConcatenatePDFsActionHandler'
                });

                //  attach event handlers
                this.jqCache.btnTestMergePDF.off('click').on('click', function onRenderBtnClicked() {
                    Y.doccirrus.comctl.privatePost(
                        '/1/media/:concatenatepdfs',
                        { 'mediaIds': JSON.parse(that.jqCache.taExampleData.val())},
                        function (err, response) { that.onConcatPdfs(err, response); }
                    );
                    that.jqCache.btnTestMergePDF.hide();
                });

                //  load test data
                this.jqCache.taExampleData.val('loading');
                this.makeTestData(function(err, mediaIds) {
                    that.onTestDataLoaded(err, mediaIds);
                });

            },

            /**
             *  Look up form documents on this tenant
             *
             *  @param  callback    fn(err, testDataObj)
             */

            makeTestData: function(callback) {

                function onFormDocsLoaded(err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    data = data.data ? data.data : data;

                    var i, j, qsParams, parts;

                    //  for each formDoc, get the media _id from the url
                    for (i = 0; i < data.length; i++) {

                        data[i].url = data[i].url ? data[i].url : 'missing';

                        qsParams = data[i].url.replace('?', '&').split('&');

                        for (j = 0; j < qsParams.length; j++) {
                            parts = qsParams[j].split('=');
                            if ('id' === parts[0] || '_id' === parts[0]) {
                                that.formDocIds.push(data[i]._id);
                                that.mediaIds.push(parts[1]);
                            }
                        }

                    }

                    callback(null, that.mediaIds);
                }

                var that = this;

                that.formDocIds = [];
                that.mediaIds = [];

                Y.doccirrus.comctl.privateGet('/1/document/type/FORMPDF/', {}, onFormDocsLoaded);
            },

            /**
             *  Set the content of the status div
             *  @param msg
             */

            'setStatus': function(msg) {
                this.jqCache.divStatus.html('<pre>' + msg  +'</pre>');
            },

            /**
             *  Show and update progress bar
             */

            showProgress: function() {
                var pc = Math.floor(100 * (this.batchProgress / this.batchTotal));
                this.jqCache.divProgress.html(pc + '%');
                this.jqCache.divProgress.show();
            },

            //  EVENT HANDLERS

            onTestDataLoaded: function(err, mediaIds) {

                if (err) {
                    this.jqCache.taExampleData.val(JSON.stringify(err));
                    return;
                }

                this.jqCache.taExampleData.val(JSON.stringify(mediaIds));
            },

            onConcatPdfs: function(err /*, data */) {
                if (err) {
                    this.setStatus('Could not concatenate PDF set: ' + JSON.stringify(err));
                }
            },

            /**
             *  Server sends updates on merge process by websocket
             *  @param message
             */

            onSIOMessage: function(message) {
                var data = message.data && message.data[0];

                switch(data.status) {
                    case 'startBatch':
                        this.batchTotal = (data.num * 4) + 1;
                        this.batchProgress = 0;

                        this.setStatus('Preparing ' + data.num + ' PDF documents');
                        this.showProgress();
                        break;

                    case 'savedFile':
                        this.setStatus('Saved PDF: ' + data.mediaId);
                        this.batchProgress = this.batchProgress + 1;
                        this.showProgress();
                        break;

                    case 'mergingFiles':
                        this.setStatus('Merging with GhostScript: ' + data.num + ' PDF documents');
                        break;

                    case 'mergeComplete':
                        this.batchProgress = this.batchTotal - 1;
                        //this.setStatus('Done: ' + data.num);
                        this.jqCache.divProgress.hide();
                        break;

                    case 'endBatch':
                        this.setStatus('Download PDF: <a href="' + Y.doccirrus.infras.getPrivateURL(data.cacheUrl) + '">' + data.cacheUrl + '</a>');
                        break;

                }
            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcbatchpdfzip',
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcregexp',
            'dcvalidations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'DCWindow',
            'DCSystemMessages',
            'parallel',
            'dccommunication-client'
        ]
    }
);
