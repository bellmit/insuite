/**
 *  Utilities to check and update the form history
 *
 *  @author: strix
 *  @date: 2014 May
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-historyutils', function( Y, NAME ) {

        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         *  Make a list of versions of this form template (from formtemplatversions collection)
         *
         *  A reduced listing is returned, summarizing the revision history
         *  This is for generalization with form inport and future migration of /r/forms/listformvversion
         *
         *  Response is array of objects like:
         *
         *      {
         *          _id:            String
         *          title:          Object, lang code -> localized title
         *          version:        Number
         *          revision:       Number
         *          revComment:     String, may be empty
         *          tCreated:       Date
         *      }
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  canonicalId {String}    Common to all form versions
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        async function listVersions(user, canonicalId, callback) {

            Y.log('Finding previous versions of form: ' + canonicalId, 'info', NAME);

            let
                //  TODO: more efficient query, so we are not loading and discarding data
                dbSetup = {
                    'user': user,
                    'model': 'formtemplateversion',
                    'action': 'get',
                    'query': { 'canonicalId': canonicalId }
                },
                err, data,
                minimized = [],
                identities = [],
                versionMeta,
                i;

            [ err, data ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( dbSetup ) );

            if (err) {
                Y.log('Could not find form version history for: ' + canonicalId, 'warn', NAME );
                callback(err);
                return;
            }

            Y.log('Found: ' + data.length + ' previous versions of this form.', 'info', NAME);

            //  remove extraneous fields
            for (i = 0; i < data.length; i++) {
                if ( data[i] && data[i].jsonTemplate && data[i].jsonTemplate.name ) {
                    minimized.push({
                        '_id': data[i]._id,
                        'title': data[i].jsonTemplate.name,
                        'version': data[i].version,
                        'revision': data[i].revision,
                        'revComment': data[i].revcomment || '',
                        'userId': data[i].userId,
                        'userName': '000' === data[i].userId ? 'Automatischer Prozess' : data[i].userId,
                        'tCreated': data[i].tCreated
                    });

                    //  make not of unique identities to load in next step
                    if ( data[i].userId && -1 === identities.indexOf( data[i].userId ) ) {
                        if( Y.doccirrus.comctl.isObjectId( data[i].userId ) ) {
                            identities.push( data[i].userId );
                        }
                    }
                }
            }

            //  load identities, where possible

            if ( identities.length > 0 ) {
                [ err, data ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'identity',
                    'action': 'get',
                    'query': { _id: { $in: identities } }
                } ) );

                if ( err ) {
                    Y.log( `Could not load identities for form history: ${err.stack||err}`, 'error', NAME );
                    //  return history without names
                }

                if ( !err && data ) {
                    for ( versionMeta of minimized ) {
                        for ( i = 0; i < data.length; i++ ) {
                            if ( versionMeta.userId === data[i]._id.toString() ) {
                                versionMeta.userName = data[i].username + ' / ' + data[i].firstname + data[i].lastname;
                            }
                        }
                    }
                }
            }

            //  sort these by version, then revision if matching (should not happen)
            minimized.sort(function(a,b){
                var
                    aVer = parseInt(a.version, 10),
                    bVer = parseInt(b.version, 10);

                return aVer - bVer;
            });

            callback( null, minimized );
        }

        /**
         *  List versions of a form my canonical ID and make the version numbers contiguous
         *
         *  This will also update the current version of the canonical template if necessary
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  canonicalId     {String}    _id of formtemplate
         *  @param  callback        {Function}  Of the form fn(err, formHistory)
         */

        function listVersionsAndCorrect(user, canonicalId, callback) {

            var
                currentHistory = [],
                toCorrect = [],
                canonicalShouldBe = 0,
                latestVersionId = '';

            listVersions(user, canonicalId, onCurrentHistoryLoaded);

            function onCurrentHistoryLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                currentHistory = data;

                var i;

                for (i = 0; i < currentHistory.length; i++) {
                    if (parseInt(currentHistory[i].version, 10) !== i) {
                        Y.log('Non-contiguous form history, correcting ' + currentHistory[i].version + ' ==> v' + i, 'debug', NAME);
                        toCorrect.push({'_id': currentHistory[i]._id, 'version': i });
                        currentHistory[i].version = i;
                    }
                    latestVersionId = currentHistory[i]._id;
                }

                canonicalShouldBe = currentHistory.length;
                correctNext();
            }

            function correctNext() {
                if (0 === toCorrect.length) {
                    checkCanonical();
                    return;
                }

                var
                    nextItem = toCorrect.pop(),
                    putData = {
                        'version': nextItem.version,
                        'fields_': ["version"]
                    };

                Y.doccirrus.filters.cleanDbObject(putData);

                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': 'formtemplateversion',
                    'action': 'put',
                    'query': { '_id': nextItem._id },
                    'data': putData,
                    'callback': correctNext
                });
            }

            function checkCanonical() {
                var
                    dbSetup = {
                        'user': user,
                        'model': 'formtemplate',
                        'action': 'get',
                        'query': { '_id': canonicalId }
                    };

                Y.doccirrus.mongodb.runDb( dbSetup, onCanonicalLoaded );

            }

            function onCanonicalLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                //  no canonical version of this form - not an error
                //  this can happen during import processes or if canonical is deleted by user
                if (0 === data.length) {
                    callback(null, currentHistory);
                    return;
                }

                var
                    canonical = data[0],
                    putData = {
                        'version': canonicalShouldBe,
                        'latestVersionId': latestVersionId,
                        'fields_': ['version', 'latestVersionId']
                    };

                if (parseInt(canonical.version, 10) === canonicalShouldBe && canonical.latestVersionId === latestVersionId) {
                    //  all are good, we're done
                    callback(null, currentHistory);
                    return;
                }

                Y.doccirrus.filters.cleanDbObject(putData);

                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'put',
                    'query': { '_id': canonicalId },
                    'data': putData,
                    'callback': onCanonicalVersionCorrected
                });
            }

            function onCanonicalVersionCorrected(err) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, currentHistory);
            }
        }

        /**
         *  Get the next version number for a form / what current canonical version should be
         */

        function getNextVersionNo(user, canonicalId, callback) {
            listVersionsAndCorrect(user, canonicalId, onCorrectedHistoryLoaded);

            function onCorrectedHistoryLoaded(err, formsHistory) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, formsHistory.length);
            }
        }

        /**
         *  Create a new form version - copy the current canonical version of the form to the
         *  formtemplateversion collection with a new version number and correct any inconsistencies in form history
         *
         *  TODO: review and tidy with async
         *
         *  @param  user        {Object}    ac REST user object
         *  @param  templateObj {Object}    a form template as loaded form database
         *  @param  revComment  {String}    comment on why a new version was created
         *  @param  callback    {Function}  of the form fn(err, newVersionId, newVersionNo)
         */

        function addVersion(user, templateObj, revComment, callback) {

            var formHistory;

            //templateObj.version = templateObj.version;
            //templateObj.revision = 0;
            //templateObj.canonicalId = templateObj._id;
            //templateObj.timestamp = Date.now();
            //templateObj.createdBy = user.identityId;

            listVersionsAndCorrect(user, templateObj._id, onCorrectHistoryLoaded);

            function onCorrectHistoryLoaded(err, correctedHistory) {
                if ( err ) {
                    Y.log( 'Problem creating form version: ' + JSON.stringify( err ), 'warn', NAME );
                }
                formHistory = correctedHistory || [];
                saveNewVersion();
            }

            function saveNewVersion() {
                var
                    //  deprecated, backwards compatability with legacy forms
                    useInstanceId = (templateObj.instanceId ? templateObj.instanceId : 'placeholder'),

                    newVersion = {
                        "canonicalId": templateObj._id,               //  future
                        "instanceId": useInstanceId,                  //  legacy, backward compatability
                        "formId": templateObj._id,                    //  legacy, for migration only
                        "title": templateObj.title,                   //  DEPRECATED, debugging use only
                        "category": templateObj.category,             //  see ../assets/formcategories.json

                        "jsonTemplate": templateObj.jsonTemplate,     //  The actual content of the form template

                        'formatVersion': 1.1,                         //

                        "version": formHistory.length,                //  will be incremented on canonical
                        "revision": templateObj.revision,             //  incremented by saves from the client
                        "revcomment": revComment,                     //  revision comment, if any
                        "userId": user.identityId,                    //  _id of the user who last edited this form                            "tCreated": Date.now(),
                        "tCreated": Date.now(),
                        "tModified": Date.now()                       //  should never be modified

                    },

                    dbSetup = {
                        'user': user,
                        'model': 'formtemplateversion',
                        'action': 'post'
                    };

                Y.doccirrus.filters.cleanDbObject(newVersion);
                dbSetup.data = newVersion;

                Y.log('Saving new version of ' + templateObj._id + ' with number: ' + newVersion.version + ' comment: ' + revComment, 'info', NAME);

                Y.doccirrus.mongodb.runDb( dbSetup, onVersionCreated );
            }

            function onVersionCreated(err, data) {

                if (err) {
                    return callback( Y.doccirrus.errors.rest( 500, 'Could not save new version of form: ' + err, true ) );
                }

                if (0 === data.length) {
                    return callback( Y.doccirrus.errors.rest( 500, 'Could not create new version of form: no _id returned', true ) );
                }

                templateObj.latestVersionId = data[0];

                updateCanonicalTemplate();

            }

            function updateCanonicalTemplate() {
                var
                    putData = {
                        'latestVersionId': templateObj.latestVersionId,
                        'version': (formHistory.length + 1),
                        'revision': 0
                    };

                Y.log('Updating version of canonical template to: ' + putData.version + ' from ' + templateObj.version, 'info', NAME);

                Y.doccirrus.filters.cleanDbObject(putData);

                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'put',
                    'query': { '_id': templateObj._id },
                    'fields': ['latestVersionId', 'version', 'revision'],
                    'data': putData,
                    'callback': onCanonicalUpdated
                });
            }

            function onCanonicalUpdated(err) {

                if (err) {
                    callback('Could not update canonical template: ' + err);
                    return;
                }

                callback( null, templateObj.latestVersionId, templateObj.version + 1 );
            }
        }

        /**
         *  Create a new form version - as above but taking the _id of the canonical
         *  template rather than the whole object, wrapper for convenience
         *
         *  @param  user        {Object}    ac REST user object
         *  @param  canonicalId {String}    database _id of a form template
         *  @param  revComment  {String}    comment on why we're making a version
         *  @param  callback    {Function}  of the form fn(err, versionId, versionNo)
         */

        function addVersionById(user, canonicalId, revComment, callback) {
            var
                dbSetup = {
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'get',
                    'query': { '_id': canonicalId }
                };

            function onCanonicalLoaded(err, data) {
                if (err || 0 === data.length) {
                    callback('Could not load form template from database: ' + err);
                    return;
                }

                addVersion(user, data[0], revComment, callback);
            }

            Y.doccirrus.mongodb.runDb( dbSetup, onCanonicalLoaded );
        }

        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.forms' ).historyutils = {
            'listVersions': listVersions,
            'listVersionsAndCorrect': listVersionsAndCorrect,
            'getNextVersionNo': getNextVersionNo,
            'addVersion': addVersion,
            'addVersionById': addVersionById
        };


    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcforms-confighelper', 'dcforms-migrationhelper' ]}
);