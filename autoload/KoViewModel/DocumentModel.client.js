/**
 * User: strix
 * Date: 11/01/16
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
/*jshint latedef:false */
'use strict';

YUI.add( 'DocumentModel', function( Y, NAME ) {
        /**
         * @module DocumentModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n;

        /**
         * @class DocumentModel
         * @constructor
         * @extends KoViewModel
         */
        function DocumentModel( config ) {
            DocumentModel.superclass.constructor.call( this, config );
        }

        DocumentModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            /**
             * Can be used to set initial tag list. It is merged into db results
             * @attribute tagInitList
             * @type {Array}
             * @default []
             */
            tagInitList: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( DocumentModel, KoViewModel.getBase(), {

                inToggle: false,            //  prevent race on double-click
                thumbSize: null,
                //  non-schema observables

                _isDeleted: null,           //  true if document deleted on client but not yet on server
                _patientAccess: null,       //  true if shared with patient

                initializer: function DocumentModel_initializer() {
                    var self = this;

                    self.thumbSize = DocumentModel.thumbSize;
                    self._isDeleted = self.addDisposable( ko.observable( false ) );

                    // this document can be viewed in patient portal if patient is in the accessBy array

                    self._patientAccess = ko.computed( function() {
                        var
                            ownId = unwrap( self._id ),
                            accessBy = self.accessBy(),
                            attachedTo = self.attachedTo(),
                            patientId = self.patientId(),
                            hasAccess = false;

                        //  if not yet migrated, initialize patientId from attachedTo
                        if ( attachedTo && !patientId && attachedTo !== self.activityId() ) {
                            self.patientId( attachedTo );
                            patientId = attachedTo;
                        }

                        if( !ownId ) {
                            Y.log( 'Document not yet saved to server, cannot grant patient accesss.' );
                            hasAccess = false;
                        } else {
                            hasAccess = (-1 !== accessBy.indexOf( patientId ));
                        }
                        //Y.log('Checking if patient has access to document: ' + (hasAccess ? 'TRUE' : 'FALSE'), 'debug', NAME);
                        return hasAccess;
                    } );
                    self.fileExt = ko.computed(function(){
                        var
                            contentType = unwrap( self.contentType );
                        return Y.doccirrus.media.getExt( contentType ).toUpperCase();
                    });

                    self.initSelect2Tags();

                    self.hasMalwareWarning = ko.computed( function() {
                        var malwareWarning = unwrap( self.malwareWarning );
                        return !( !malwareWarning || 'falsepositive' === malwareWarning );
                    } );

                    self.MARK_FALSE_POSITIVE = i18n( 'InCaseMojit.casefile_attachments.text.MARK_FALSE_POSITIVE' );
                },
                select2TagMapper: function( item ) {
                    return {
                        id: item,
                        text: item
                    };
                },
                initSelect2Tags: function() {
                    var
                        self = this,
                        TAGS = Y.doccirrus.i18n( 'IncaseAdminMojit.incase_tab_catalogsJS.label.TAGS' );

                    self.select2Tags = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    tags = unwrap( self.tags );
                                return tags.map( self.select2TagMapper );
                            },
                            write: function( $event ) {
                                var
                                    tagInitList = self.get('tagInitList');
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.tags.push( $event.added.id );
                                    tagInitList.push( $event.added.id );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    if( -1 !== tagInitList.indexOf( $event.removed.id ) ) {
                                        tagInitList.splice( tagInitList.indexOf( $event.removed.id ), 1 );
                                    }
                                    self.tags.remove( $event.removed.id );
                                }

                            }
                        } ) ),
                        placeholder: ko.observable( TAGS ),
                        select2: {
                            multiple: true,
                            minimumInputLength: 1,
                            createSearchChoice: self.select2TagMapper,
                            formatSelection: function( item ) {
                                return item.text;
                            },
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.tag.read( {
                                    query: {
                                        type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                                        title: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    },
                                    options: {
                                        itemsPerPage: 15
                                    },
                                    fields: [ 'title' ]
                                } ).done( function( response ) {
                                    var data = response && response.data || [],
                                        tagInitList = self.get( 'tagInitList' ).filter( function( tag ) {
                                            return -1 !== tag.indexOf( query.term );
                                        } ),
                                        mergedData = data.map(function( item ){
                                            return item.title;
                                        });
                                    tagInitList.forEach( function( tag ) {
                                        if( -1 === mergedData.indexOf( tag ) ) {
                                            mergedData.push( tag );
                                        }
                                    } );
                                    query.callback( {
                                        results: mergedData.map( self.select2TagMapper )
                                    } );
                                } );

                            }

                        }
                    };
                },
                destructor: function DocumentModel_destructor() {
                },

                /**
                 *  Record the state of a dcforms-template object into this document
                 *  @param context
                 *  @param template
                 *  @param callback
                 */

                createFromForm: function( context, template, callback ) {
                    var
                        self = this,
                        dictString,
                        attachedTo,         //  deprecated, see MOJ-9190
                        patientId,          //  initialized in migration in 3.12
                        formState;

                    if( !context || !context.activity || !context.patient ) {
                        Y.log( 'missing form context, cannot create document', 'warn', NAME );
                        return callback( new Error( 'Missing form context' ) );
                    }

                    self.type( ('QUESTIONNAIRE' === unwrap( context.activity.actType )) ? 'QUESTIONNAIRE' : 'FORM' );
                    self.contentType( ('QUESTIONNAIRE' === unwrap( context.activity.actType )) ? 'dc/questionnaire' : 'dc/form' );
                    self.formId( template.canonicalId );
                    self.formInstanceId( template.formVersionId );
                    self.formData( '' );

                    dictString = JSON.stringify( template.toDict() );
                    formState = JSON.parse( dictString );

                    self.formState( formState );
                    self.formInitialState( formState );
                    self.formStateHash( Y.dcforms.fastHash( dictString ) );

                    self.mapData( JSON.parse( JSON.stringify( template.mapData ) ) );
                    self.publisher( Y.doccirrus.comctl.fullNameOfUser );
                    self.activityId( unwrap( context.activity._id ) );
                    self.printerName( '' );
                    self.locationId( unwrap( context.activity.locationId ) );
                    self.createdOn( ( new Date() ).toJSON() );
                    self.accessBy( [] );

                    if ( 'APPROVED' === unwrap( context.activity.status ) ) {
                        attachedTo = unwrap( context.patient._id );
                        patientId = context.patient._id;
                    } else {
                        attachedTo = unwrap( context.activity._id ) || unwrap( context.activity.randId );
                        patientId = null;
                    }

                    self.attachedTo( attachedTo );
                    self.patientId( patientId );
                    self.caption( unwrap( context.activity.content ) );
                    self.isEditable( 'QUESTIONNAIRE' === unwrap( context.activity.actType ) );

                    //  look up any configured printer for this form, user and location
                    //  DEPRECATED, prints now chosen at print time

                    Y.doccirrus.comctl.privateGet(
                        '/1/formprinter/:getprinter',
                        {
                            'canonicalId': template.canonicalId,
                            'locationId': unwrap( context.activity.locationId )
                        },
                        onPrinterLookup
                    );

                    function onPrinterLookup( err, response ) {
                        if( err ) {
                            Y.log( 'Error looking up printer assignment: ' + JSON.stringify( err ), 'warn', NAME );
                            self.printerName( '' );
                        } else {

                            response = response && response.data ? response.data : response;
                            if( response && '' !== response ) {
                                Y.log( 'Assigning configured printer: ' + JSON.stringify( response ), 'debug', NAME );
                                self.printerName( response );
                            }

                        }

                        callback( null, self, true, true );
                    }
                },

                /**
                 *  Add or remove current patient from this document's ACL (ie, share or unshare in patient portal)
                 *  @param  granted     {Boolean}
                 *  @param  callback    {Function}  Not used at present, may be replaced by a promise
                 *  @param isPatientDoc {Boolean} used to check if the patient is added or removed from Documente portal
                 */

                setPatientAccess: function( granted, callback, isPatientDoc ) {
                    var
                        self = this,
                        putData;

                    //  prevent strange feedback loop in some cases
                    if( self.inToggle ) {
                        Y.log( 'Currently toggling patient access, not repeating action', 'warn', NAME );
                        return;
                    }

                    //  clean up some broken legacy data

                    Y.log( 'setPatientAccess', self, self.patientId(), self.attachedTo(), 'debug', NAME );

                    if (
                        !ko.unwrap( self.patientId ) &&
                        self.attachedTo() &&
                        self.activityId() !== self.attachedTo()
                    ) {
                        //  not yet migrated, initialize patientId from attachedTo, MOJ-9190
                        self.patientId( self.attachedTo() );
                    }

                    if( !ko.unwrap( self.patientId ) && ! ko.unwrap( self.attachedTo ) ) {
                        //  document not attached to a patient
                        Y.log( 'Document ' + unwrap( self._id ) + ' not linked to any patient, legacy data?', 'warn', NAME );
                        return;
                    }

                    if( self._patientAccess() === granted ) {
                        Y.log( 'Document share state not changed.', 'debug', NAME );
                        return;
                    }

                    if( !granted ) {
                        Y.log( 'Removing patient accesss to document: ' + self._id, 'info', NAME );

                        if( 'dc/frompatient' === self.contentType() ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'Dokument stammt vom Patienten. Zugriffsänderung daher nicht möglich.'
                            } );
                            return;
                        }

                        self.accessBy.removeAll();

                    } else {

                        if( Y.config.debug ) {
                            Y.log( 'Granting patient ' + self.patientId() + ' accesss to document: ' + unwrap( self._id ), 'info', NAME );
                        }
                        self.accessBy.push( self.patientId() + '' );

                    }

                    //  save back to PRC / tenant database
                    //  documents should always exist on the server at this point

                    self.inToggle = true;

                    putData = {
                        'query': { _id: unwrap( self._id ) },
                        'data': {
                            'accessBy': unwrap( self.accessBy ),
                            'attachedTo': unwrap( self.attachedTo ),
                            'patientId': unwrap( self.patientId ),
                            'mediaId': unwrap( self.mediaId ),
                            'activityId': unwrap( self.activityId ),
                            'fields_': [ 'accessBy', 'patientId', 'attachedTo' ],
                            'updateFromPractice': true
                        }
                    };

                    if( isPatientDoc ) {
                        putData.data.isPatientDoc = true;
                    }

                    Y.doccirrus.jsonrpc.api.document.update( putData ).then( onDocShared );

                    function onDocShared( err ) {
                        Y.log( 'Updated share status of document: ' + self._id(), 'debug', NAME );
                        self.inToggle = false;
                        if( !callback ) { return; }
                        callback( err );
                    }
                },

                /**
                 *  Returns true if this attachment should be in the Ext Dokument array
                 *
                 *  @return {Boolean}
                 */

                isExtDoc: function() {
                    var self = this;
                    if( 'FORM' === unwrap( self.type ) ) {
                        return false;
                    }
                    if( 'FORMPDF' === unwrap( self.type ) ) {
                        return false;
                    }
                    return true;
                },

                /**
                 *  Returns true if this image can be edited the fabric.js modal
                 *
                 *  @return {Boolean}
                 */

                isEditableImage: function() {
                    var self = this;
                    if( self.contentType && 'image/jpeg' === unwrap( self.contentType ) ) {
                        return true;
                    }
                    if( self.contentType && 'image/png' === unwrap( self.contentType ) ) {
                        return true;
                    }
                    return false;
                },

                /**
                 *  Thumbnail of attached media
                 */

                thumbUrl: function() {
                    var
                        self = this;
                    return DocumentModel.thumbUrl({
                        contentType: unwrap( self.contentType ),
                        thumbSize: self.thumbSize,
                        mediaId: self.mediaId()
                    });
                },

                /**
                 *  Download URL of attached media
                 */

                fullUrl: function() {
                    var
                        self = this;
                    return DocumentModel.fullUrl({
                        contentType: unwrap( self.contentType ),
                        mediaId: self.mediaId()
                    });
                },

                /**
                 *  Malware warning text
                 */

                malwareWarningHtml: function() {
                    var self = this;
                    if ( !self.hasMalwareWarning() || 'falsepositive' === self.malwareWarning() ) { return ''; }

                    var
                        heading = i18n( 'InCaseMojit.casefile_attachments.text.AV_WARNING' ),
                        message = i18n( 'InCaseMojit.casefile_attachments.text.AV_MESSAGE' );

                    return '<h2>' + heading + ': ' + self.malwareWarning() + '</h2>' + '<p>' + message + '</p>';
                },

                /**
                 *  Mark false positive from malware scan
                 */

                markFalsePositive: function() {
                    var self = this;

                    Y.doccirrus.DCWindow.confirm( {
                        title: self.MARK_FALSE_POSITIVE,
                        message: i18n( 'InCaseMojit.casefile_attachments.text.FALSE_POSITIVE_MSG' ),
                        callback: onConfirmed
                    } );

                    function onConfirmed( result ) {
                        if( !result.success ) { return; }
                        var args = { mediaId: self.mediaId(), isFalsePositive: true };
                        Y.doccirrus.jsonrpc.api.media.markFalsePositive( args ).then( onMarked ).fail( onMarkFailed );
                    }

                    function onMarked() {
                        Y.log( 'Marked file false positive: ' + self.mediaId, 'warn', NAME );
                        self.malwareWarning( null );
                    }

                    function onMarkFailed( err ) {
                        Y.log( 'Could not mark media false positive: ' + JSON.stringify( err ), 'error', NAME );
                    }
                }

            },
            {
                schemaName: 'document',
                NAME: 'DocumentModel',
                fullUrl: function( params ){
                    var
                        mime = params.contentType.replace( '/', '_' ).toUpperCase(),
                        ext = Y.doccirrus.media.getExt( mime ),
                        fullUrl = '/media/' + params.mediaId + '_original.' + mime + '.' + ext;

                    return Y.doccirrus.infras.getPrivateURL( fullUrl );
                },
                thumbSize: 68,              //  pixels
                thumbUrl: function( params ){
                    var
                        mediaStub = {
                            '_id': params.mediaId,
                            'mime': params.contentType.replace( '/', '_' ).toUpperCase()
                        },
                        thumbUrl = Y.doccirrus.media.getMediaThumbUrl( mediaStub, params.thumbSize, false );

                    return thumbUrl;
                }
            }
        );
        KoViewModel.registerConstructor( DocumentModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'document-schema',
            'tag-schema',
            'dc-comctl'
        ]
    }
);
