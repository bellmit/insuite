/**
 * User: pi
 * Date: 12/11/15   09:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*global YUI, $, jQuery, moment, fun:true, async, ko */
/*eslint prefer-template:0 strict:0 */
/*exported fun */

'use strict';

fun = function _fn( Y, NAME ) {

    var
        node,
        activityCache,
        locationCache,
        jqCache,
        i18n = Y.doccirrus.i18n,
        EMAIL_SENT_EXTRA = i18n('PatPortalMojit.intime_documents_tab.text.EMAIL_SENT_EXTRA'),
        EMAIL_SENT = i18n('PatPortalMojit.intime_practices_tab.text.EMAIL_SENT'),
        NOT_REGISTERED = i18n('PatPortalMojit.intime_documents_tab.text.NOT_REGISTERED'),
        REGISTER = i18n('PatPortalMojit.intime_documents_tab.label.REGISTER'),
        PIN_CONFIRMATION_MODAL = i18n('PatPortalMojit.intime_documents_tab.title.PIN_CONFIRMATION_MODAL'),
        FORM_IS_SENT = i18n('PatPortalMojit.intime_documents_tab.text.FORM_IS_SENT'),
        ERROR_WHILE_SENDING_FORM = i18n('PatPortalMojit.intime_documents_tab.text.ERROR_WHILE_SENDING_FORM'),
        INVALID_PIN = i18n('PatPortalMojit.intime_documents_tab.text.INVALID_PIN');

    /**
     *  Query each practice this patient is registered with and group any shared documents
     *
     *  This first step is to get the list of patientreg objects used for polling
     */

    function loadAllDocuments() {

        //  TRANSLATEME
        jqCache.divDocumentPanelBody.html( 'Bitte warten...' );

        function onPatientRegLoaded( err, data ) {
            var
                shouldLockEntry;
            if( err ) {
                jqCache.divDocumentPanelBody.html( 'Praxis ist gerade nicht erreichbar.' );
                return;
            }

            data = data.hasOwnProperty( 'data' ) ? data.data : data;
            jqCache.divDocumentPanelBody.html( '' );

            var
                i, panelId;

            for( i = 0; i < data.length; i++ ) {
                shouldLockEntry = true !== Y.doccirrus.utils.hasDeviceKeys( data[i].patientId );
                panelId = 'divMR' + data[i]._id;
                if( (data[i].hasOwnProperty( 'accessPRC' )) && (true === data[i].accessPRC) ) {
                    //Y.log('Adding documents via patientreg: ' + JSON.stringify(data[i]), 'info', NAME);
                    jqCache.divDocumentPanelBody.append( '<div id="' + panelId + '"></div>' );

                    if( shouldLockEntry ) {
                        showLockedPractice( data[i], panelId );

                    } else {
                        loadDocumentsFromPRC( data[i] /*, practiceInfo.data[j] */ );
                    }

                } else {
                    jqCache.divDocumentPanelBody.append( '' +
                                                         '<div id="' + panelId + '">' +
                                                         //'This pracice has not enabled remote access for your account.' +
                                                         'Praxis (' + data[i].customerIdPrac + ') hat Ihnen kein Zugriffsrecht erteilt' +
                                                         '</div>'
                    );
                    showBlockedWarning( data[i] );
                }

            }
        }

        Y.doccirrus.comctl.pucGet( '/1/patientreg/:listmine', {}, onPatientRegLoaded );
    }

    function showBlockedWarning( patientReg ) {

        function onPracticeLoaded( err, body ) {
            var
                practice = body && body.data,
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display', 'error' );
            }

            if( err ) {
                jqDivPrc.html( '<span id="spanWait' + patientReg._id + '"><i></i></span>' );
                return;
            }

            jqDivPrc.html( '' +
                           '<h4>' + practice.coname + '</h4>' +
                           '<i>Sie haben bei dieser Praxis noch kein Zugriffsrecht.</i>'
            );
        }

        var
            jqDivPrc = $( '#divMR' + patientReg._id ),
            proxyData = {};

        jqDivPrc.html( '<span id="spanWait' + patientReg._id + '"><i>Anfrage läuft, bitte warten...</i></span>' );

        Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/practice/:getMyPractice', proxyData, onPracticeLoaded );
    }

    function showLockedPractice( patientReg, panelId ) {
        var
            jqDivPrc = $( '#' + panelId );

        function onPracticeLoaded1( err, body ) {
            var
                btnId,
                practice = body && body.data,
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( body ),
                envelopId = !patientReg.confirmed && 'practice-' + practice._id,
                envelopSpan = (envelopId && ('<span id="' + envelopId + '" class="text-danger fa fa-envelope pull-right" style="cursor: pointer"></span>')) || '';

            if( errors.length ) {
                Y.Array.invoke( errors, 'display', 'error' );
            }
            if( err ) {
                jqDivPrc.html( '<span id="spanWait' + patientReg._id + '"><i></i></span>' );
                return;
            }
            jqDivPrc.html( '' +
                           '<h4>' + practice.coname +
                           envelopSpan +
                           '</h4>' +
                           '<i>'+NOT_REGISTERED+'</i>' );

            btnId = 'btnUnlock' + patientReg._id;
            jqDivPrc.append( '<a class="btn btn-default pull-right" id="' + btnId + '">'+REGISTER+'</button>' );
            bindUnlockButton( patientReg, btnId, envelopId );
        }

        jqDivPrc.html( '<span id="spanWait' + patientReg._id + '"><i>Anfrage läuft, bitte warten...</i></span>' );

        Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/practice/:getMyPractice', patientReg, onPracticeLoaded1 );
    }

    /**
     *  Given a single redacted patientreg, load any documents which their doctor at this PRC has shared with them
     *
     *  Sample URL going through the blind proxy:
     *
     *      http://1111111111.dev.dc/r/activities
     *          ?action=patientdocument
     *          &itemsPerPage=1000
     *          &page=1
     *          &sort=createdOn,0
     *          &patientId=10000000000000000000000b
     *          &query=
     *          &_=1398558570439
     *
     *  @param  patientReg         {Object}    Must have patientreg _id
     */

    function loadDocumentsFromPRC( patientReg ) {

        if( Y.config.debug ) {
            Y.log( 'Loading documents from PRC: ' + JSON.stringify( patientReg ), 'debug', NAME );
        }

        function onLocationsLoaded( err ) {

            if( err ) {
                Y.log( 'Could not load list of locations from this PRC: ' + JSON.stringify( err ), 'warn', NAME );
                //  try continue, we may be able to load locations individually
            }
            Y.doccirrus.blindproxy.getSingle( patientReg, '/1/document/:patientDocument', proxyData, onDocumentsLoaded );
        }

        function onDocumentsLoaded( err, data ) {
            if( err ) {
                Y.log( 'Can not load documents from PRC: ' + err, 'warn', NAME );
                jqDivPrc.html( 'Dokumente konnten nicht geladen werden.' );
                return;
            }

            data = (data && data.data) ? data.data : data;
            if( !Array.isArray( data ) ) {
                return;
            }
            //Y.log('Loaded patient documentset: ' + JSON.stringify(data));

            preExpandAllDocuments( data, onPreExpandComplete );
        }

        function onPreExpandComplete( err, fixedData ) {

            if( err ) {
                Y.log( 'Could not pre-expand the set of documents: ' + err, 'debug', NAME );
                jqDivPrc.html( 'Dokumente konnten nicht geladen werden: ' + err );
                return;
            }

            //Y.log('Pre-expanded document set for patientReg: ' + JSON.stringify(patientReg), 'debug', NAME);
            //Y.log('onPreExpandComplete: Pre-expanded document set', 'debug', NAME);

            arrangeByLocation( patientReg, fixedData );
        }

        function preExpandAllDocuments( allDocuments, callbackAfterExpandAll ) {
            var
                inCursor = -1,
                toPreExpand = [],
                preExpanded = [],
                i;

            function preExpandNext() {

                //Y.log('preExpandNext: ' + inCursor + ' ' + toPreExpand.length + ' documents  remain', 'debug', NAME);

                if( ((inCursor + 1) === allDocuments.length) ) {
                    Y.log( 'preExpandNext: finished expanding ' + preExpanded.length + ' documents.', 'debug', NAME );
                    callbackAfterExpandAll( null, preExpanded );
                    return;
                }

                inCursor = inCursor + 1;
                if( toPreExpand[inCursor] ) {
                    preExpandDocument( toPreExpand[inCursor] );
                }
            }

            function preExpandDocument( myDocument ) {

                if( !myDocument ) {
                    preExpandNext();
                    return;
                }

                //Y.log('Pre-expanding single document: ' + myDocument._id + ' (' + toPreExpand.length + ' remain)', 'debug', NAME);

                function onActivityExpand( err, myAct ) {
                    if( err ) {
                        Y.log( 'Could not load activity to pre-expand row: ' + err, 'warn', NAME );
                        preExpandNext();
                        return;
                    }

                    if( 'undefined' === typeof myAct ) {
                        //  bad data, skip it
                        if( Y.config.debug ) {
                            Y.log( 'No activity for document, skipping: ' + JSON.stringify( myDocument, undefined, 2 ), 'warn', NAME );
                        }
                        preExpandNext();
                        return;
                    }

                    myDocument.activityId = myAct._id;
                    myDocument.locationId = myAct.locationId;
                    myDocument.location = myAct.location;
                    myDocument.contentLine = myAct.content;

                    myDocument.typeLabel = myDocument.hasOwnProperty( 'contentType' ) ? myDocument.contentType : 'Unknown';
                    myDocument.description = (myDocument.hasOwnProperty( 'caption' ) ? myDocument.caption : myAct.content);
                    myDocument.author = myDocument.hasOwnProperty( 'publisher' ) ? myDocument.publisher : 'System';
                    myDocument.actions = '<span id="spanActions' + myDocument._id + '">...</span>';

                    myDocument.dateObj = myDocument.hasOwnProperty( 'createdOn' ) ? myDocument.createdOn : myAct.timestamp;

                    myDocument.dateStr = moment( myDocument.dateObj ).format( 'DD.MM.YYYY' );

                    var typeDe = Y.doccirrus.schemaloader.translateEnumValue( '-de', myDocument.type, Y.doccirrus.schemas.document.types.DocType_E.list, 'Dokument' );

                    switch( myDocument.contentType ) {
                        case 'application/pdf':
                            myDocument.typeLabel = typeDe + ' (PDF)';
                            break;
                        case 'image/jpeg':
                            myDocument.typeLabel = typeDe + ' (JPEG)';
                            break;
                        case 'image/png':
                            myDocument.typeLabel = typeDe + ' (PNG)';
                            break;
                        case 'image/gif':
                            myDocument.typeLabel = typeDe + ' (GIF)';
                            break;
                        case 'video/quicktime':
                            myDocument.typeLabel = typeDe + ' (MOV)';
                            break;
                        case 'video/mp4':
                            myDocument.typeLabel = typeDe + ' (MP4)';
                            break;

                        case 'dc/form':
                        case 'dc/questionnaire':
                            myDocument.typeLabel = 'Formular';
                            break;

                        case 'dc/frompatient':
                            myDocument.typeLabel = 'von Patient';
                            break;

                        default:
                            if( myDocument.hasOwnProperty( 'formId' ) && myDocument.hasOwnProperty( 'formInstanceId' ) ) {
                                myDocument.typeLabel = 'Questionnaire';
                                myDocument.contentType = 'dc/questionnaire';
                            } else {
                                myDocument.typeLabel = 'Unknown';
                            }

                            myDocument.typeLabel = myDocument.contentType;

                            break;

                    }

                    if( !myDocument.description || ('' === myDocument.description) ) {
                        myDocument.description = 'Keine Beschreibung vorhanden...';
                    }

                    //Y.log('Pre-expanded: ' + JSON.stringify(myDocument, undefined, 2), 'undefined', 2);

                    if( 'Unknown' !== myDocument.typeLabel ) {
                        preExpanded.push( myDocument );
                    }

                    preExpandNext();
                }

                getActivityForDocument( patientReg, myDocument, onActivityExpand );
            }

            for( i = 0; i < allDocuments.length; i++ ) {
                toPreExpand.push( jQuery.extend( true, {}, allDocuments[i] ) );
            }

            preExpandNext();
        }

        function arrangeByLocation( patientReg, data ) {
            var
                segmented = {},
                doc,
                i,
                k;

            //Y.log('Arranging by location: ' + JSON.stringify(data, undefined, 2), 'debug', NAME);

            for( i = 0; i < data.length; i++ ) {
                doc = data[i];

                if( !segmented.hasOwnProperty( '' + doc.locationId ) ) {
                    segmented['' + doc.locationId] = [];
                    addLocationBlock( patientReg, doc.location );

                }

                segmented['' + doc.locationId].push( doc );
            }

            $( '#spanWait' + patientReg._id ).html( '' );

            //  add documents from each location

            for( k in segmented ) {
                if( segmented.hasOwnProperty( k ) ) {
                    Y.log( 'Adding documents section for location: ' + k, 'info', NAME );
                    addApproxDataTable( patientReg, k, segmented[k] );
                }
            }

            //  add upload buttons for any locations which have no documents
            //  for each location served by this (V)PRC
            for( i = 0; i < locationCache.length; i++ ) {
                if( locationCache[i]._patientRegId === patientReg._id ) {
                    //  if not already added
                    if( !segmented.hasOwnProperty( locationCache[i]._id ) ) {
                        addLocationBlock( patientReg, locationCache[i] );
                    }
                }
            }
        }

        function addLocationBlock( patientReg, location ) {
            Y.log( 'Adding location ' + location._id + ' for patientReg ' + patientReg._id, 'debug', NAME );

            var
                uploadBtnId = 'btnUpload' + location._id + patientReg._id,
                uploadBtn = '<button class="btn" id="' + uploadBtnId + '">Hinzufügen</button>' ,
                html = '' +
                       '<br/>' +
                       '<h4 id="hloc' + location._id + patientReg._id + '">' + location.locname + '</div>' +
                       '<div id="divLoc' + location._id + patientReg._id + '"></div>' +
                       '<div id="divLocUpload' + location._id + patientReg._id + '" style="text-align: right;">' +
                       uploadBtn +
                       '</div><hr/><br/>';

            jqDivPrc.append( html );

            bindUploadButton( patientReg, location._id, uploadBtnId );
            if( false === patientReg.accessPRC ) {
                $( '#divLoc' + location._id + patientReg._id ).html( 'Diese Praxis hat Ihnen noch kein Zugriffsrecht erteilt.' );
            }

        }

        var
            jqDivPrc = $( '#divMR' + patientReg._id ),
            proxyData = {
                'itemsPerPage': patientReg.accessPRC ? 1000 : 0,
                'page': 1,
                'isFromPortal': true,
                'sort': 'createdOn',
                'patientId': patientReg.patientId
            };

        jqDivPrc.html( '<span id="spanWait' + patientReg._id + '"><i>bitte warten...</i></span>' );

        getLocationsFromPRC( patientReg, onLocationsLoaded );

    }

    /**
     *  Get the complete set of locations from PRC (including those for which we have no documents, MOJ
     *  @param patientReg
     *  @param callback
     */

    function getLocationsFromPRC( patientReg, callback ) {

        function onLocationsLoaded( err, data ) {

            if( err ) {
                callback( err );
                return;
            }
            //  new API response format
            data = (data && data.data) ? data.data : data;

            var i, j, found;

            //  add to location cache
            for( i = 0; i < data.length; i++ ) {
                found = false;
                for( j = 0; j < locationCache.length; j++ ) {
                    if( (locationCache[j]._id) === data[i]._id && (locationCache[j]._patientRegId === patientReg._id) ) {
                        found = true;
                    }
                }
                if( false === found ) {
                    data[i]._patientRegId = patientReg._id;
                    locationCache.push( data[i] );
                }
            }

            callback( null, data );
        }

        Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/location', patientReg, onLocationsLoaded );
    }

    /**
     *  Used to patch up document metadata on legacy records and set the description for this entry
     *
     *  @param  patientReg         {Object}
     *  @param  document        {Object}
     *  @param  callbackWithAct {Function}
     */

    function getActivityForDocument( patientReg, document, callbackWithAct ) {
        var
            thisActivity;//,
        //i;

        function onActivityLookup( err, data ) {
            //  new API response format
            data = (data && data.data) ? data.data : data;

            if( err || (0 === data.length) ) {
                callbackWithAct( 'Could not load activity from patientReg ' + patientReg._id + ':' + err );
                return;
            }
            thisActivity = data[0];

            //Y.log('Loaded activity: ' + JSON.stringify(thisActivity, undefined, 2), 'debug', NAME);

            if( !document.hasOwnProperty( 'locationId' ) || !document.locationId ) {
                document.locationId = thisActivity.locationId;
            }

            if( !document.hasOwnProperty( 'activityId' ) || !document.activityId ) {
                document.activityId = thisActivity._id;
            }

            if( !thisActivity.hasOwnProperty( 'locationId' ) || !thisActivity.locationId ) {
                thisActivity.locationId = 'unknown';
                thisActivity.location = {
                    '_id': 'unknown',
                    'locname': 'Unkown Location',
                    'country': '',
                    'city': ''
                };

                //  add to cache before calling back
                activityCache.push( thisActivity );
                callbackWithAct( null, thisActivity );
            } else {
                getLocation( patientReg, thisActivity.locationId, onLocationLoaded );
            }
        }

        /**
         *  Called then location has been retrieved from PRC or cache
         *
         *  @param  err         {String}    Error message
         *  @param  myLocation  {Object}    See location-schema.common.js
         */

        function onLocationLoaded( err, myLocation ) {

            if( err ) {
                callbackWithAct( 'Could not set up document: ' + err );
                return;
            }

            //Y.log('Loaded location: ' + JSON.stringify(myLocation, 'undefined', 2), 'debug', NAME);
            thisActivity.location = myLocation;

            //  Add to cache before calling back
            activityCache.push( thisActivity );
            callbackWithAct( null, thisActivity );
        }

        if( document.hasOwnProperty( 'activityId' ) && '' !== document.activityId ) {

            //  Not in cache, try load from PRC
            Y.log( 'Loading activity for document ' + document._id + ' by id: ' + document.activityId + ' on patientReg: ' + patientReg._id, 'debug', NAME );
            Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/activity/' + document.activityId, patientReg, onActivityLookup );

        } else {

            //  No backref on document, cannot check cache, look up by forward reference on the activity
            Y.log( 'Loading activity for document ' + document._id + ' by forward reference ' + ' on patientReg: ' + patientReg._id + '.', 'debug', NAME );
            Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/activity/attachments/' + document._id, patientReg, onActivityLookup );

        }
    }

    function getLocation( patientReg, locationId, callback ) {

        var i;

        //  First check the cache
        for( i = 0; i < locationCache.length; i++ ) {
            if( (locationCache[i]._id) === locationId && (locationCache[i]._patientRegId === patientReg._id) ) {
                //Y.log('Location ' + locationId + ' from cache...' + JSON.stringify(locationCache[i]), 'debug', NAME);
                Y.log( 'Location ' + locationId + ' from cache, patientReg._id: ' + patientReg._id, 'debug', NAME );

                callback( null, locationCache[i] );
                return;
            }
        }

        function onLocationLookup( err, data ) {

            if( err || (0 === data.length) ) {
                callback( 'Could not look up location: ' + err );
                return;
            }

            data = (data && data.data) ? data.data : data;
            data[0]._patientRegId = patientReg._id;

            locationCache.push( data[0] );
            callback( null, data[0] );
        }

        if ( !locationId || '' === locationId ) {
            //  TODO: translateme
            return callback( 'Missing location _id' );
        }

        Y.doccirrus.blindproxy.getSingle( patientReg._id, '/1/location/' + locationId, { 'query': '_id,' + locationId }, onLocationLookup );
    }

    /**
     *  Approximate a datatable (we're behind the puc proxy so CaseFile viewModels won't work)
     *
     *  @param  patientReg      {Object}
     *  @param  locationId      {String}
     *  @param  tableRows       {Object}
     */

    function addApproxDataTable( patientReg, locationId, tableRows ) {

        function onTableCreated() {

            var
                jqTd,
                jqSpan,
                tdDesc,
                mediaId,
                mime,
                dnUrl,
                row,
                i;

            //  make links from the description column

            for( i = 0; i < tableRows.length; i++ ) {
                row = tableRows[i];

                jqTd = $( '#tdDesc' + row._id );

                tdDesc = jqTd.text();

                jqSpan = $( '#spanActions' + row._id );

                mediaId = row.mediaId || '';
                mime = row.contentType.replace( '/', '_' ).toUpperCase();

                if ( row.url && -1 !== row.url.indexOf('id=') ) {
                    mediaId = row.url.split( 'id=' )[1];
                    mediaId = mediaId.split( '?' )[0];
                    mediaId = mediaId.split( '&' )[0];
                }

                if ( row.mediaId ) {
                    mediaId = row.mediaId;
                }

                switch( row.contentType ) {
                    case 'dc/form':             //  deliberate fallthrough
                    case 'dc/questionnaire':
                        //  TODO: translateme
                        //Y.log('Creating questionnaire link for: ' + row._id, 'info', NAME);
                        jqTd.html( '<a href="#" id="aFillQuestionnaire' + row._id + '">' + tdDesc + '</a>' );

                        $( '#aFillQuestionnaire' + row._id )
                            .off( 'click.patientportal' )
                            .on( 'click.patientportal', makeOnClickQuestionnaire( patientReg, row ) );

                        break;

                    case 'dc/frompatient':

                        //Y.log('Creating fromPatient link for: ' + row._id, 'info', NAME);
                        jqTd.html( '<a href="#" id="aShowFromPatient' + row._id + '">' + tdDesc + '</a>' );

                        $( '#aShowFromPatient' + row._id )
                            .off( 'click.patientportal' )
                            .on( 'click.patientportal', makeOnClickFromPatient( patientReg, row ) );

                        break;

                    case 'image/jpeg':
                    case 'image/jpg':
                    case 'image/png':
                    case 'image/gif':

                        if( !row.hasOwnProperty( 'url' ) || !row.url ) {

                            Y.log( 'Could not create proxy link for image: ' + row._id, 'warn', NAME );
                            jqSpan.append( 'Missing image' );
                            jqTd.hide();

                        } else {

                            tdDesc = tdDesc + ' <i class="fa fa-external-link"></i>';
                           //Y.log('Creating image link for: ' + row._id + ' to ' + row.url + ' via blind proxy', 'info', NAME);

                            dnUrl = '/1/metaprac/:mediaproxy?id=' + mediaId + '&mime=' + mime + '&metaregid=' + patientReg._id;
                            jqTd.html( '' +
                                       '<a ' +
                                       'href="' + dnUrl + '" ' +
                                       'target="pdf' + row._id + '" ' +
                                       'id="aMedia' + mediaId + '"' +
                                       '>' + tdDesc + '</a>'
                            );
                        }

                        break;

                    case 'video/mp4':
                    case 'video/quicktime':
                    case 'application/pdf':

                        if( !row.hasOwnProperty( 'url' ) || !row.url ) {

                            Y.log( 'Could not create proxy link for PDF: ' + row._id, 'warn', NAME );
                            jqSpan.append( 'Missing PDF' );
                            jqTd.hide();

                        } else {

                            tdDesc = tdDesc + ' <i class="fa fa-external-link"></i>';

                            //Y.log('Creating image link for: ' + row._id + ' to ' + row.url + ' via blind proxy', 'info', NAME);

                            dnUrl = '/1/metaprac/:mediaproxy?id=' + mediaId + '&mime=' + mime + '&metaregid=' + patientReg._id;
                            jqTd.html( '' +
                                       '<a ' +
                                       'href="' + dnUrl + '" ' +
                                       (('video/mp4' === row.contentType) ? '' : 'target="pdf' + row._id + '" ') +
                                       'id="aMedia' + mediaId + '"' +
                                       '>' + tdDesc + '</a>'
                            );
                        }

                        break;

                    case 'audio/ogg':
                    case 'audio/mpeg':
                    case 'audio/mp3':

                        if( !row.hasOwnProperty( 'url' ) || !row.url ) {

                            Y.log( 'Could not create proxy link for MP3: ' + row._id, 'warn', NAME );
                            jqSpan.append( 'Missing MP3' );
                            jqTd.hide();

                        } else {

                            tdDesc = tdDesc + ' <i class="fa fa-external-link"></i>';

                            //Y.log('Creating image link for: ' + row._id + ' to ' + row.url + ' via blind proxy', 'info', NAME);
                            dnUrl = '/1/metaprac/:mediaproxy?id=' + mediaId + '&mime=' + mime + '&metaregid=' + patientReg._id;
                            jqTd.html( '' +
                                       '<a ' +
                                       'href="' + dnUrl + '" ' +
                                       'target="pdf' + row._id + '" ' +
                                       'id="aMedia' + mediaId + '"' +
                                       '>' + tdDesc + '</a>'
                            );
                        }

                        break;

                }

                if( row.url && -1 !== row.url.indexOf( 'from=patient' ) ) {
                    jqTd.append( '<button class="btn" id="btnDel' + row._id + '" style="float: right;"><i class="fa fa-trash-o"></i></button>' );
                    bindRowDeleteButton( patientReg, row );
                }

                if ( row.malwareWarning ) {
                    jqTd.append( '<div style="color:red;">Malware-Warnung: ' + row.malwareWarning + '</div>' );
                }
            }
        }

        function bindRowDeleteButton( patientReg, row ) {
            $( '#btnDel' + row._id ).off( 'click.ppdel' ).on( 'click.ppdel', function() {
                onDeletePatientDoc( patientReg, row, 'btnDel' + row._id );
            } );
        }

        //  First sort table rows by date

        tableRows.sort( function( row1, row2 ) {
            if( moment( row2.dateObj ).diff( moment( row1.dateObj ) ) > 0 ) {
                return 1;
            }

            if( moment( row1.dateObj ).diff( moment( row2.dateObj ) ) > 0 ) {
                return -1;
            }

            return  0;
        } );

        //  TRANSLATEME

        var
            dtNode = Y.one( '#divLoc' + locationId + patientReg._id ),
            dtVars = {
                '_selectMode': 'none',
                '_tableId': 'dt' + patientReg._id,
                '_css': 'table table-bordered table-hover table-condensed',
                '_columns': [
                    { 'name': 'dateStr', 'title': 'Datum', 'filterType': 'plain' },
                    { 'name': 'type', 'title': 'Typ', 'filterType': 'plain' },
                    { 'name': 'description', 'title': 'Beschreibung', 'filterType': 'plain' },
                    { 'name': 'author', 'title': 'Nutzer', 'filterType': 'plain' } //,
                    //    { 'name': 'actions', 'title': 'Aktionen', 'filterType': 'plain' }
                ],
                '_data': tableRows
            };

        //Y.log('Making data table for: ' + JSON.stringify(tableRows, undefined, 2), 'debug', NAME);

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'documenttable',
            'PatPortalMojit',
            dtVars,
            dtNode,
            onTableCreated
        );
    }

    /**
     *  Click handler for dc/questionnaire documents - load the form and sets return path
     *
     *  @param  patientReg     {Object}
     *  @param  document    {Object}
     *  @return             {Function}
     */

    function makeOnClickQuestionnaire( patientReg, document ) {
        var
            notice = null;

        function onSubmitComplete( err, data ) {

            Y.log( 'Saved document: ' + JSON.stringify( data, 'undefined', 2 ), 'info', NAME );

            if( notice ) {
                notice.close();
            }

            if( err ) {
                Y.log( 'Could not post form to PRC: ' + err, 'warn', NAME );
                Y.doccirrus.DCWindow.notice( { message: ERROR_WHILE_SENDING_FORM + err } );
                return;
            }

            Y.doccirrus.DCWindow.notice( { type: 'success', message: FORM_IS_SENT } );

            //  return to table view
            jqCache.divQuestionnairePanel.hide();
            jqCache.divDocumentPanel.show();
            jqCache.divQuestionnairePanelBody.html( 'Loading...' );

            //  reload the table for this PRC to show new entry
            $( '#divMR' + patientReg._id ).html( '...' );
            loadDocumentsFromPRC( patientReg );
        }

        function onSubmitQuestionnaire( formData, template ) {

            notice = Y.doccirrus.DCWindow.notice( {
                title: 'Übertragung...',
                message: 'Start',
                forceDefaultAction: true
            } );
            notice.close = function() {
                notice = null;
                Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
            };
            makeActivity( patientReg, formData, template, document, onSubmitComplete );
        }

        function onRequestAudioPlay( options ) {
            options.patientRegId = patientReg._id;
            Y.doccirrus.modals.playAudio.show( options );
        }

        function onRequestAudioRecord( options ) {
            options.patientId = patientReg.patientId;
            options.patientName = 'Audio Upload';
            options.locationId = document.locationId || '000000000000000000000001';
            Y.doccirrus.modals.recordAudio.show( options );
        }

        /**
         *  Create new FROMPATIENT activity in the originating CaseFile
         */

        function makeActivity( patientReg, formData, template, document, callback ) {
            var
                patientProfile,
                attribName,
                originalActivity,
                newActivity,
                newDocument;

            if( !document.activityId ) {
                callback( 'Original activity not available, cannot reply.' );
                return;
            }

            async.series(
                [
                    getPatientProfile,
                    loadOriginalActivity,
                    createNewDocument,
                    saveNewDocument,
                    createNewActivity,
                    saveNewActivity,
                    updateNewDocument
                ],
                onAllDone
            );


            //  1. load the current patient's profile (TODO: add to tab init)
            function getPatientProfile( itcb ) {
                Y.doccirrus.jsonrpc.api.patientportal.getPatientProfile()
                    .done( function( response ) {

                        response = response.data ? response.data : response;
                        response = response[0] ? response[0] : response;

                        patientProfile = patientProfile = response;
                        attribName = 'Patient Profile';

                        if ( patientProfile && patientProfile.firstname && patientProfile.lastname ) {
                            attribName = patientProfile.firstname + ' ' + patientProfile.lastname;
                        }

                        itcb( null );
                    } )
                    .fail( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        itcb( err );
                    } );

            }

            //  2. load the activity this is based on from remote PRC
            function loadOriginalActivity( itcb ) {
                getActivityForDocument( patientReg, document, onLoadOriginalActivity );

                function onLoadOriginalActivity( err, myOldAct ) {

                    if( err ) {
                        itcb( 'Cannot load original activity: ' + err );
                        return;
                    }

                    notice.setAttrs( {
                        title: 'Übertragung... (1/4)',
                        bodyContent: 'Bitte warten'
                    } );

                    originalActivity = myOldAct;

                    //  remove location record (not part of activity-schema, will keep the reference in locationId)
                    delete originalActivity.location;

                    itcb( null );
                }
            }

            //  3. create a document object based on original activity, document and user input from form
            function createNewDocument( itcb ) {

                //  create a copy of the original document from physician
                newDocument = jQuery.extend( true, {}, document );
                delete newDocument._id;

                if( !newDocument.hasOwnProperty( 'data' ) ) {
                    newDocument.data = {
                        'dataName': 'questionnaire',
                        'srcDev': template.formVersionId
                    };
                }

                if( !newDocument.hasOwnProperty( 'form' ) ) {
                    newDocument.form = {
                        'tempVersion': template.version,
                        'formId': template.canonicalId,
                        'formInstanceId': template.formVersionId
                    };
                }

                newDocument.formData = '';
                newDocument.formState = formData;
                newDocument.type = 'FROMPATIENT';
                newDocument.contentType = 'dc/frompatient';
                newDocument.createdOn = moment().utc().toJSON();
                newDocument.isEditable = false;
                newDocument.publisher = attribName;
                newDocument.formStateHash = Y.dcforms.fastHash( JSON.stringify( formData ) );

                delete newDocument.typeLabel;
                delete newDocument.actions;
                delete newDocument.author;
                delete newDocument.description;
                delete newDocument.contentline;
                delete newDocument.dateStr;
                delete newDocument.dateObj;

                itcb( null );
            }

            //  4. Save the new document back to originating PUC
            function saveNewDocument( itcb ) {

                //  save a new document
                Y.doccirrus.blindproxy.postSingle( patientReg, '/1/document', newDocument, onNewDocumentCreated );

                function onNewDocumentCreated( err, newDocId ) {
                    if( err ) { return itcb( 'Cannot create new document: ' + err ); }

                    newDocId = ( newDocId && newDocId.data ) ? newDocId.data : newDocId;
                    newDocId = ( newDocId && newDocId[0] ) ? newDocId[0] : newDocId;

                    notice.setAttrs( {
                        title: 'Übertragung... (2/4)',
                        bodyContent: 'Bitte warten'
                    } );

                    newDocument._id = newDocId;

                    itcb( null );
                }
            }

            //  5. Create a new activity to reference the document which was just saved from the casefile
            function createNewActivity( itcb ) {

                //  create a new activity object, copy of activity from physician with some changes

                newActivity = jQuery.extend( true, {}, originalActivity );
                delete newActivity._id;
                delete newActivity.__v;
                //MOJ-4284
                newActivity.__t = 'FROMPATIENT';
                newActivity.status = 'VALID';
                newActivity.actType = 'FROMPATIENT';
                newActivity.formPdf = '';
                newActivity.attachments = [];
                newActivity.attachedMedia = [];
                // following is a hack for MOJ-2335, should be cleaned out in MOJ-2336
                newActivity.timestamp = moment().utc().toJSON();
                newActivity.content = originalActivity.content + ' (ausgefüllt)';
                newActivity.userContent = originalActivity.content + ' (ausgefüllt)';

                newActivity.attachments.push( newDocument._id );

                itcb( null );
            }

            //  6. Save the new activity back to the originating PRC
            function saveNewActivity( itcb ) {
                //  save a new activity
                Y.doccirrus.blindproxy.postSingle( patientReg, '/1/activity', newActivity, onNewActivitySaved );

                function onNewActivitySaved( err, newActivityId ) {

                    if( newActivityId && newActivityId.data ) {
                        newActivityId = newActivityId.data;
                    }

                    if( 'object' === typeof newActivityId && newActivityId.length > 0 ) {
                        newActivityId = newActivityId[0];
                    }

                    if( err ) {
                        itcb( 'Cannot create new activity: ' + err );
                        return;
                    }

                    notice.setAttrs( {
                        title: 'Übertragung... (3/4)',
                        bodyContent: 'Bitte warten'
                    } );

                    newActivity._id = newActivityId;

                    itcb( null );
                }
            }

            //  7. Update the new document to reference the new owner activity
            function updateNewDocument( itcb ) {

                var
                    params = {
                        'fields_': ['activityId', 'patientId', 'accessBy', 'attachedTo', 'publisher', 'caption' ],
                        'caption':  originalActivity.content + ' (ausgefüllt)',
                        'activityId': newActivity._id,              //  link to activity, fixes deletion
                        'patientId': patientReg.patientId,
                        'attachedTo': patientReg.patientId,         //  prevent this from showing up under patient tab
                        'accessBy': [ patientReg.patientId ],       //  patient has access to their own submission
                        'publisher': attribName,
                        'updateFromPP': true
                    };

                Y.doccirrus.blindproxy.putSingle( patientReg, '/1/document/' + newDocument._id, params, onNewDocumentUpdated );

                function onNewDocumentUpdated( err /*, data */ ) {

                    if( err ) { return itcb( err ); }

                    notice.setAttrs( {
                        title: 'Übertragung... (4/4)',
                        bodyContent: 'Bitte warten'
                    } );

                    itcb( null );
                }
            }

            //  finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem creating new activity on origin casefile: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Created new activity in originating case with _id: ' + newActivity._id, 'debug', NAME );
                callback( null, newActivity._id );
            }

        }

        return function(e) {
            e.preventDefault();
            jqCache.divDocumentPanel.hide();
            jqCache.divQuestionnairePanelBody.html( '<div id="divFormsCompose">Loading...</div>' );
            jqCache.divQuestionnairePanel.show();

            jqCache.aQuestionnaireBack.off( 'click.patientportal' ).on( 'click.patientportal', function() {
                jqCache.divQuestionnairePanel.hide();
                jqCache.divDocumentPanel.show();
                jqCache.divQuestionnairePanelBody.html( 'Loading...' );
            } );

            function onQuestionnaireCreated() {
                Y.log( 'Questionnaire container created.', 'info', NAME );
            }

            var questionnaireNode = node.one( '#divQuestionnairePanelBody' );

            questionnaireNode.passToBinder = {
                'patientRegId': patientReg._id,

                'ownerId': document.activityId || document._id || 'missing_id',
                'ownerCollection': 'activity',

                'canonicalId': document.formId,             //  preferred
                'formVersionId': document.formInstanceId,   //  preferred

                'formId': document.formId,                  //  deprecated
                'instanceId': document.formInstanceId,      //  deprecated

                'onSubmit': onSubmitQuestionnaire,
                'onRequestAudioPlay': onRequestAudioPlay,
                'onRequestAudioRecord': onRequestAudioRecord
            };

            if ( document.hasOwnProperty( 'formState' )) {
                questionnaireNode.passToBinder.serialized = document.formState;
            } else {
                if ( document.hasOwnProperty( 'formData' ) && '' !== document.formData ) {
                    questionnaireNode.passToBinder.serialized64 = document.formData;
                }
            }

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'forms_embed',
                'FormEditorMojit',
                {},
                questionnaireNode,
                onQuestionnaireCreated
            );

        };
    }

    /**
     *  Click handler to open a patient response for viewing
     *
     *  @param  patientReg     {Object}
     *  @param  document    {Object}
     *  @returns            {Function}
     */

    function makeOnClickFromPatient( patientReg, document ) {

        function onSubmitQuestionnaire( /* formData, template */ ) {
            Y.doccirrus.DCWindow.notice( { message: 'Übertragung zu Ihrer Praxis ist abgeschlossen.' } );
        }

        return function() {

            jqCache.divDocumentPanel.hide();
            jqCache.divQuestionnairePanelBody.html( '<div id="divFormsCompose">Loading...</div>' );
            jqCache.divQuestionnairePanel.show();

            jqCache.aQuestionnaireBack.off( 'click.patientportal' ).on( 'click.patientportal', function() {
                jqCache.divQuestionnairePanel.hide();
                jqCache.divDocumentPanel.show();
                jqCache.divQuestionnairePanelBody.html( 'Loading...' );
            } );

            function onQuestionnaireCreated() {
                Y.log( 'Questionnaire container created.', 'info', NAME );
            }

            var questionnaireNode = node.one( '#divQuestionnairePanelBody' );

            questionnaireNode.passToBinder = {
                'ownerCollection': 'activity',
                'ownerId': document.activityId || 'unknown',
                'patientRegId': patientReg._id,
                'formId': document.formId,
                'instanceId': document.formInstanceId,
                'onSubmit': onSubmitQuestionnaire,
                'onSubmitDisabled': true,
                'lockForm': true
            };

            if ( document.hasOwnProperty( 'formState' )) {
                questionnaireNode.passToBinder.serialized = document.formState;
            } else {
                if ( document.hasOwnProperty( 'formData' ) && '' !== document.formData ) {
                    questionnaireNode.passToBinder.serialized64 = document.formData;
                }
            }

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'forms_embed',
                'FormEditorMojit',
                {},
                questionnaireNode,
                onQuestionnaireCreated
            );

        };
    }

    /**
     *  Create modal and handlers to accept uploads and relay back to PRC as new documents + activities
     *
     *  @param patientReg      {object}    Describes the V/PRC to which the partient can upload documents
     *  @param locationId   {object}    A required property of activities and documents
     *  @param btnId        {string}    DOM Id of upload button
     */

    function bindUploadButton( patientReg, locationId, btnId ) {

        function getModalUpload() {
            if( getModalUpload.instance ) {
                return getModalUpload.instance;
            }
            //  TRANSLATEME: Upload document for practice

            var modalContent = '' +
                               '<b>Beschreibung für das Dokument</b><br>' +
                               '<input type="text" class="form-control" value="" id="txtUploadCaption" /><br/>' +
                               //  '<b>Dateien</b><br>' +
                               '<div id="' + modalDivId + '"></div>' +
                               '';

            getModalUpload.instance = new Y.doccirrus.DCWindow( {
                title: 'Dokument für Praxis bereitstellen',
                bodyContent: Y.Node.create( modalContent ),
                render: document.body,
                width: Y.doccirrus.DCWindow.SIZE_SMALL,
                centered: true,
                modal: true,
                resizeable: false,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        {
                            label: 'Hinzufügen',
                            name: 'btnMulti',
                            isDefault: true
                        }
                    ]
                }
            } );
            getModalUpload.instance.close = function() {
                getModalUpload.instance = null;
                Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
            };
            return getModalUpload.instance;
        }

        function onUploadComplete() {
            getModalUpload().close();
            //  reload the table for this PRC to show new entry
            $( '#divMR' + patientReg._id ).html( '...' );
            loadDocumentsFromPRC( patientReg );
        }

        function onFormUploadVisible() {
            Y.log( 'Ready to upload files back to PRC: ' + patientReg._id, 'debug', NAME );
        }

        function onModalVisible() {
            var uploadNode = Y.one( '#' + modalDivId );

            uploadNode.passToBinder = {
                modal: getModalUpload(),
                'patientRegId': patientReg._id,
                'locationId': locationId,
                'patientReg': patientReg,
                'onUploadComplete': onUploadComplete
            };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'document_upload',
                'PatPortalMojit',
                {},
                uploadNode,
                onFormUploadVisible
            );
        }

        function onBtnClicked() {
            getModalUpload();
            onModalVisible();
        }

        var
            modalDivId = 'divUploadPP' + patientReg._id,
            jqBtnUpload = $( '#' + btnId );

        jqBtnUpload.off( 'click.ppupload' ).on( 'click.ppupload', onBtnClicked );
    }

    function bindUnlockButton( patientReg, btnId, envelopId ) {

        function submitPin( userPin ) {

            var
                prcKey = patientReg.prcKey,
                patientId = patientReg.patientId,
                myKP, // store key pair on browser
                sharedSecret, prcPackage,
                data;

            if( !userPin ){
                Y.doccirrus.DCWindow.notice({
                    type: 'error',
                    message: INVALID_PIN
                });
                return;
            }
            if( !patientId || !prcKey ) {
                Y.log( 'missing params', 'error', NAME );
                return;
            }
            myKP = Y.doccirrus.utils.setKeysForDevice( patientId );

            sharedSecret = Y.doccirrus.authpub.getSharedSecret( myKP.secret, prcKey );
            prcPackage = {patientPin: userPin};
            prcPackage = Y.doccirrus.authpub.encJSON( sharedSecret, prcPackage );

            data = {
                prcPackage: prcPackage,
                patientId: patientId,
                patientPublicKey: myKP.publicKey,
                pinHash: Y.doccirrus.authpub.generateHash( userPin ),
                prcKey: prcKey,
                browser: Y.doccirrus.comctl.getBrowser()
            };

            Y.doccirrus.ajax.send( {
                type: 'post',
                url: '/1/patientreg/:submitPatientDeviceKey',
                data: data,
                success: function( body ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

                    if( errors && errors[0] ) {
                        Y.doccirrus.utils.removeMyKeyForDevice( patientId );
                        Y.Array.invoke( errors, 'display', 'error' );
                    } else {
                        window.location.reload();
                    }
                },
                error: function() {
                }
            } );
        }

        function showConfirmationModal( additionalModalText ) {
            var
                text = '';
            if(additionalModalText){
                text = Y.Lang.sub( EMAIL_SENT_EXTRA, { email: patientReg.email, newLine: '<br/>' });
            } else {
                text = Y.Lang.sub( EMAIL_SENT, { email: patientReg.email, newLine: '<br/>' });
            }
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: text,
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        }

        function sendConfirmationRequest( customerIdPrac, button, additionalModalText ) {
            button.attr( 'disabled', true );
            Y.doccirrus.jsonrpc.api.patientreg.sendEmailConfirmationAgain( {
                data: { customerIdPrac: customerIdPrac }
            } )
                .done( function() {
                    showConfirmationModal( additionalModalText );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    button.attr( 'disabled', false );
                } );

        }

        function showPinModal() {
            var
                modalContent = node.one( '#pinModal' ).cloneNode( true ),
                pinModal;                                                       //  eslint-disable-line no-unused-vars
            Y.use( 'DCWindow', function() {
                pinModal = new Y.doccirrus.DCWindow( {                          //  eslint-disable-line no-unused-vars
                    className: 'DCWindow-PinModal',
                    bodyContent: modalContent,
                    title: PIN_CONFIRMATION_MODAL,
                    width: Y.doccirrus.DCWindow.SIZE_SMALL,
                    centered: true,
                    modal: true,
                    render: document.body,
                    visible: true,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                    submitPin( modalContent.one( 'input' ).get( 'value' ) );
                                }
                            })
                        ]
                    }
                } );
            } );

            modalContent.removeClass( 'hidden' );
        }

        function sendPinResquest() {
            Y.doccirrus.ajax.send( {
                type: 'post',
                url: '/1/patientreg/:requestForPin',
                data: {patientId: patientReg.patientId},
                success: function( body ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );
                    if( errors && errors[0] ) {
                        Y.Array.invoke( errors, 'display', 'error' );
                    } else {
                        showPinModal();
                    }
                }
            } );
        }
        var
            jqBtnUnlock = $( '#' + btnId ),
            jqBtnEnvelop = $( '#' + envelopId );
        if( envelopId  ) {
            jqBtnEnvelop.off( 'click.documents' ).on( 'click.documents', function() {
                sendConfirmationRequest( patientReg.customerIdPrac, jqBtnEnvelop );
            } );
            jqBtnUnlock.off( 'click.documents' ).on( 'click.documents', function() {
                sendConfirmationRequest( patientReg.customerIdPrac, jqBtnEnvelop, true );
            } );
        } else {
            jqBtnUnlock.on( 'click', sendPinResquest );
        }


    }

    /**
     *  Patient is deleting one of their documents
     *
     *  We will need to delete the media and document, then unlink the document from the activity
     *
     *  @param  patientReg     {object}
     *  @param  tableRow    {object}    Expanded version of the document object
     *  @param  buttonId    {String}    DOM id
     */

    function onDeletePatientDoc( patientReg, tableRow, buttonId ) {

        var
            documentId = tableRow._id,
            activityId = tableRow.activityId,
            mediaId = tableRow.mediaId.replace( '&from=casefile', '' ).replace( '&from=patient', '' ).replace( '&from=teleconsult', '' ),
            notice = null;

        function onActivityChanged( err ) {
            if( err ) {
                Y.log( 'Could not update/delete activity ' + activityId + ':' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            //  reload this PRC / location, and we're done
            $( '#divMR' + patientReg._id ).html( '...' );
            loadDocumentsFromPRC( patientReg );
        }

        function onActivityLoaded( err, acts ) {
            if( err ) {
                Y.log( 'Could not load activity ' + activityId + ':' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            acts = (acts && acts.data) ? acts.data : acts;

            var
                activity = acts[0],
                newAttachments = [],
                putParams = {
                    'fields_': 'attachments'
                },
                i;

            //  ensure that there is an attachment array
            if( !activity.hasOwnProperty( 'attachments' ) ) {
                activity.attachments = [];
            }

            //  retain all attachments except the one being deleted
            for( i = 0; i < activity.attachments.length; i++ ) {
                if( activity.attachments[i] !== documentId ) {
                    newAttachments.push( activity.attachments[i] );
                }
            }

            //  update the activity if there are any attachments remaining, otherwise delete
            if( newAttachments.length > 0 ) {
                putParams.attachments = newAttachments;
                Y.doccirrus.blindproxy.putSingle( patientReg, '/1/activity/' + activityId, putParams, onActivityChanged );
                return;
            }

            Y.doccirrus.blindproxy.deleteSingle( patientReg, '/1/activity/_id/' + activityId, {}, onActivityChanged );
        }

        function onDocumentDeleted( err ) {
            if( err ) {
                Y.log( 'Could not delete document ' + documentId + ':' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            Y.doccirrus.blindproxy.getSingle( patientReg, '/1/activity/_id/' + activityId, {}, onActivityLoaded );
        }

        function onMediaDeleted( err ) {

            if( err ) {
                Y.log( 'Could not delete media ' + mediaId + ':' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            Y.doccirrus.blindproxy.deleteSingle( patientReg, '/1/document/' + documentId, {'deleteFromPP': true}, onDocumentDeleted );
        }

        function onDeleteConfirm() {
            $( '#' + buttonId ).hide();

            if( mediaId ) {
                Y.doccirrus.blindproxy.deleteSingle( patientReg, '/1/media/' + mediaId, { }, onMediaDeleted );
            } else {
                onMediaDeleted( null );
            }

            if( notice ) {
                notice.close();
            }
        }

        notice = Y.doccirrus.DCWindow.notice( {
            title: 'Löschen',
            message: 'Sind Sie sicher?',
            window: {
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.target.button.disable();
                                onDeleteConfirm();
                            }
                        } )
                    ]
                }
            }
        } );
        notice.close = function() {
            notice = null;
            Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
        };

    }

    return {
        registerNode: function( _node ) {

            activityCache = [];
            locationCache = [];
            jqCache = {
                'divDocumentPanel': $( '#divDocumentPanel' ),
                'divDocumentPanelBody': $( '#divDocumentPanelBody' ),
                'divQuestionnairePanel': $( '#divQuestionnairePanel' ),
                'divQuestionnairePanelBody': $( '#divQuestionnairePanelBody' ),
                'aQuestionnaireBack': $( '#aQuestionnaireBack' )
            };
            node = _node;
            //  page will be assumed to be in .de for now, like CaseFile
            //  disabled to test MOJ-1172
            //Y.doccirrus.comctl.setUserLang('de');

            loadAllDocuments();

            function IntimeDocumetsTabVM() {
                var
                    self = this;

                self.pinConfirmationI18n = i18n("PatPortalMojit.intime_documents_tab.text.PIN_CONFIRMATION");
                self.placeholderPinI18n = i18n('PatPortalMojit.intime_documents_tab.placeholder.PIN');
            }

            ko.applyBindings( new IntimeDocumetsTabVM(), document.querySelector( '#pinModal' ) );



        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + ( node || node._yuid ), 'debug', NAME );
        }
    };
};
