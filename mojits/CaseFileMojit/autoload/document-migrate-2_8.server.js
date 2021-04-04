/*
 @author: strix
 @date: 2015 September
 */

/**
 *  Code to migrate documents and activites to support new batch operations and tidy load
 *
 *  Steps
 *
 *      (1) Extract mediaId from URLS and store on documents in mediaId property
 *
 *      Documents were originally meant to get a forward reference only, linking a URL, but the mediaId in this
 *      URL is now used for making thumbnails, compiling PDFs and other unintended purposes.  This updates the
 *      document object to be better suited to these new uses.
 *
 *      (2) Copy mediaId property of FORMPDF documents into the activity which owns it.
 *
 *      For safety, in case there are multiple or unlinked FORMPDF documents in the database somewhere, this is done
 *      by loading all activities with forms (formId property is set), loading their attachments, getting the mediaId
 *      and re-saving it to the activity.
 *
 *      This mediaId is used for match operations to collect and print PDFs for certain classes of activity.
 *
 *  Both of these steps should produce reports on actions taken and be available for testing from the documents API
 */

/*global YUI*/
/*jslint latedef:false */

YUI.add(
    'document-migrate-2-8',
    function( Y, NAME ) {
        

        /**
         *  Set the mediaId property from the URL property if possible for all documents
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function setMediaIdsOnDocuments(user, callback) {

            var
                docModel,
                report = '',
                idx = 0,
                nextDoc,
                toFix = [];

            Y.doccirrus.mongodb.getModel( user, 'document', true, modelCb );

            function modelCb(err, newModel) {
                docModel = newModel;

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'action': 'get'
                }, onDocumentsLoaded );

            }

            function onDocumentsLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                report = report + 'Found ' + data.length + ' documents in database.' + "\n";
                Y.log('Found ' + data.length + ' documents in database.', 'debug', NAME);

                toFix = data;
                fixNextDocument();
            }

            function fixNextDocument() {
                if (idx >= toFix.length) {
                    report = report + 'Checked all documents, step complete.' + "\n";
                    callback(null, report);
                    return;
                }

                nextDoc = toFix[idx];
                idx = idx + 1;

                if (!nextDoc.url || '' === nextDoc.url) {
                    report = report + nextDoc._id + ' ' + nextDoc.type + ' (no url)' + "\n";
                    Y.log(nextDoc._id + ' ' + nextDoc.type + ' Set mediaId ' + mediaId, 'debug', NAME);
                    fixNextDocument();
                    return;
                }

                var
                    query = { '_id': nextDoc._id },
                    putData = {},
                    opts = { multi: false },
                    url = (nextDoc.url + '').replace('?', '&'),
                    qsvars= url.split('&'),
                    parts,
                    mediaId = '',
                    i;

                for (i = 0; i < qsvars.length; i++) {
                    parts = qsvars[i].split('=', 2);
                    if ('id' === parts[0] && parts[1]) {
                        mediaId = parts[1];
                    }
                }

                nextDoc.mediaId = parts[1];

                report = report + nextDoc._id + ' ' + nextDoc.type + ' Set mediaId ' + mediaId + "\n";
                Y.log(nextDoc._id + ' ' + nextDoc.type + ' Set mediaId ' + mediaId, 'debug', NAME);

                /*
                putData = Y.doccirrus.filters.cleanDbObject({
                    'mediaId': mediaId,
                    'fields_': ['mediaId']
                });
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'action': 'put',
                    'query': { '_id': nextDoc._id + '' },
                    'data': putData,
                    'options': { 'ignoreReadOnly': ['mediaId'] }
                }, onDocumentSaved );
                */

                putData.mediaId = mediaId;
                docModel.mongoose.update(query, putData, opts, onDocumentSaved);
            }

            function onDocumentSaved(err) {
                if (err) {
                    callback(err);
                    return;
                }
                fixNextDocument();
            }

        }

        /**
         *  Set the formPdf activity property on existing data
         *
         *  This property should contain the _id of a pdf document saved in the media table if the activity has a form
         *  and this has been rendered to PDF (happens automatically on approval of activities)
         *
         *  @param  user        {Object}    A REST user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function setPdfIdsOnActivities(user, callback) {
            var
                report = '',
                idx = 0,
                nextAct,
                nextDocId,
                nextFormPdf = '',
                toLoad = [],
                toFix = [];

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'activity',
                'action': 'get',
                'query': { 'formId': { $ne: '' } }
            }, onActivitiesLoaded );

            function onActivitiesLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                toFix = data;

                report = report + 'Loaded ' + toFix.length + ' activities with forms, checking formPdf attachments...' + "\n";
                Y.log('Loaded ' + toFix.length + ' activities, checking formPdf attachments...', 'debug', NAME);
                fixNextActivity();
            }

            function fixNextActivity() {
                if (idx >= toFix.length) {
                    report = report + 'Checked all activities with forms noted for formPdf documents.' + "\n";
                    callback(null, report);
                    return;
                }

                nextAct = toFix[idx];
                nextFormPdf = nextAct.formPdf || '';
                idx = idx + 1;

                var i;

                if (!nextAct.attachments || 0 === nextAct.attachments.length) {
                    report = report + nextAct._id + ' ' + nextAct.actType + ' ' + nextAct.status + ' has no attachments, skipping.' + "\n";
                    fixNextActivity();
                    return;
                }

                toLoad =  [];
                for (i = 0; i < nextAct.attachments.length; i++) {
                    toLoad.push(nextAct.attachments[i] + '');
                }

                loadNextDoc();
            }

            function loadNextDoc() {
                if (0 === toLoad.length) {
                    onAllDocumentsLoaded();
                    return;
                }

                nextDocId = toLoad.pop();

                report = report + 'Loading document ' + nextDocId + ' for activity ' + nextAct._id + "\n";
                Y.log('Loading document ' + nextDocId + ' for activity ' + nextAct._id, 'debug', NAME);

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'document',
                    'action': 'get',
                    'query': { '_id': nextDocId }
                }, onDocumentLoaded );

            }

            function onDocumentLoaded(err, data) {
                if (err || 0 === data.length) {
                    //  possibly a broken link from activity, not a big deal
                    Y.log('Could not load linked document ' + nextDocId, 'warn', NAME);
                    report = report + 'Could not load linked document ' + nextDocId + "\n";
                    loadNextDoc();
                    return;
                }

                var nextDoc = data[0];

                if (nextDoc && nextDoc.type === 'FORMPDF' && nextDoc.mediaId && '' !== nextDoc.mediaId) {
                    nextFormPdf = nextDoc.mediaId;
                }

                loadNextDoc();
            }

            //  at this point we have searched any and all documents linked from the nextAct, if there is a formPdf
            //  the mediaId will be in nextFormPdf, save that back to the db and move on

            function onAllDocumentsLoaded() {

                if (nextFormPdf === nextAct.formPdf) {
                    //  no change to this activity, no need to save, moving along
                    fixNextActivity();
                    return;
                }

                var
                    query = { '_id': nextAct._id + ''},
                    putData = { 'formPdf': nextFormPdf},
                    opts = { multi: false };

                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'activity',
                    migrate: true,
                    query: query,
                    data: putData,
                    options: opts
                }, onActivityUpdated );

                /*
                var
                    putData = {
                        'formPdf': nextFormPdf,
                        'fields_': ['formPdf']
                    };

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'activity',
                    'action': 'put',
                    'query': { '_id': nextAct._id + '' },
                    'data': Y.doccirrus.filters.cleanDbObject(putData),
                    'options': { 'ignoreReadOnly': [ 'formPdf' ] }
                }, onActivityUpdated);
                */
            }

            function onActivityUpdated(err) {
                if (err) {
                    callback(err);
                    return;
                }
                if (!nextFormPdf || '' === nextFormPdf) {
                    nextFormPdf = '(empty value)';
                }

                report = report + 'Set activity ' + nextAct._id + ' formPdf to ' + nextFormPdf + "\n";
                Y.log('Set activity ' + nextAct._id + ' formPdf to ' + nextFormPdf, 'debug', NAME);

                //  saved, moving along
                fixNextActivity();
            }
        }

        Y.namespace( 'doccirrus' ).documentMigration = {
            'setMediaIdsOnDocuments': setMediaIdsOnDocuments,
            'setPdfIdsOnActivities': setPdfIdsOnActivities
        };
    },
    '0.0.1', { requires: [
        'dcschemaloader',
        'document-schema',
        'activity-schema'
    ]
    }
);