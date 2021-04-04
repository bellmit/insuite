/**
 * User: strix
 * Date: 2017-04-18
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'linkedattachedimagesmodal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_XLARGE,

            TITLE = i18n( 'MediaMojit.LinkedAttachedImagesModal.title' ),

            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable(),
            FineViewModel = KoViewModel.getConstructor( 'FineViewModel' ),

            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        function TabNavModel( activeTabId ) {
            var self = this;

            self.activeTab = ko.observable( activeTabId );

            self.reset = function() {
                self.activeTab( activeTabId );
            };

            self.isActive = function( id ) {
                return ko.computed( function() {
                    var activeTab = self.activeTab();
                    return activeTab === id;
                } );
            };

            self.activate = function( id ) {
                if( id ) {
                    self.activeTab( id );
                }
            };

            self.clicked = function( data, event ) {
                var currentTabId = self.activeTab(),
                    id = event.currentTarget && event.currentTarget.id;
                if( id && id !== currentTabId ) {
                    self.activeTab( id );
                }
            };
        }

        function LinkedAttachedImagesModel( config ) {
            LinkedAttachedImagesModel.superclass.constructor.call( this, config );
        }

        Y.extend( LinkedAttachedImagesModel, Disposable, {

            jqCache: null,
            currentActivity: null,
            linkedImages: null,
            linkedActivityLabels: null,
            debugText: null,
            mediaIds: null,
            loaded: null,
            imagesTable: null,
            tabNav: null,
            formCompatibleTypes: [ 'image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'application/pdf' ],
            allowImageTypes: [ 'image/jpeg', 'image/png', 'image/gif' ],
            baseParams: null,
            selectedDocument: null,
            selectedMediaId: null,
            locationId: '',
            formRole: '',
            formId: '',

            initializer: function( options ) {
                var self = this;

                self.tabsActivityI18n = i18n( 'MediaMojit.LinkedAttachedImagesModal.tabs.activity' );
                self.casefolderI18n = i18n( 'MediaMojit.LinkedAttachedImagesModal.tabs.casefolder' );
                self.patientI18n = i18n( 'MediaMojit.LinkedAttachedImagesModal.tabs.patient' );
                self.tabsAllI18n = i18n( 'MediaMojit.LinkedAttachedImagesModal.tabs.all' );

                self.jqCache = {};
                self.mediaIds = [];

                self.loaded = ko.observable( false );
                self.debugText = ko.observable( 'loading...' );
                self.linkedImages = ko.observableArray( [] );
                self.linkedActivityLabels = {};
                self.options = options;

                self.isLoaded = ko.computed( function() {
                    return self.loaded();
                } );

                self.selectedDocument = ko.observable();
                self.selectedMediaId = ko.observable();

                self.currentActivity = ko.observable( self.options.currentActivity );
            },

            destructor: function() {
                var self = this;
                self.currentActivity = null;
                self.linkedImages = null;
                self.options = null;
                self.loaded = null;

                self.fineViewModel.destroy();
                self.fineViewModel = null;
            },

            initTabNav: function() {
                var
                    self = this,
                    currentActivity = self.options.currentActivity,
                    initialTab = unwrap( currentActivity._id ) ? 'localLinkedTab' : 'patientLinkedTab';

                self.tabNav = new TabNavModel( initialTab );
                self.activeTabSubscribe = self.tabNav.activeTab.subscribe( function( val ) {

                    switch( val ) {

                        case 'allLinkedTab':
                            self.baseParams( {
                                query: {
                                    type: { $ne: 'FORM' },
                                    contentType: { $in: self.formCompatibleTypes }
                                }
                            } );
                            break;

                        case 'casefolderLinkedTab':
                            self.baseParams( {
                                query: {
                                    caseFolderId: unwrap( currentActivity.caseFolderId ),
                                    type: { $ne: 'FORM' },
                                    contentType: { $in: self.formCompatibleTypes }
                                }
                            } );
                            break;

                        case 'patientLinkedTab':
                            self.baseParams( {
                                query: {
                                    patientId: unwrap( currentActivity.patientId ),
                                    type: { $ne: 'FORM' },
                                    contentType: { $in: self.formCompatibleTypes }
                                }
                            } );
                            break;

                        default:
                            self.baseParams( {
                                query: {
                                    'activityId': { $in: self.getAllActivityIds() },
                                    type: { $ne: 'FORM' },
                                    contentType: { $in: self.formCompatibleTypes }
                                }
                            } );
                    }
                } );
            },

            /**
             *  Attachments of linked activities and parents are also shown be default in the 'Lokal' tab
             */

            getAllActivityIds: function() {
                var
                    self = this,
                    currentActivity = self.options.currentActivity,
                    allActivities = [ unwrap( currentActivity._id ) ];

                allActivities = allActivities.concat( unwrap( currentActivity.activities ) );
                allActivities = allActivities.concat( unwrap( currentActivity.icds ) );
                allActivities = allActivities.concat( unwrap( currentActivity.continuousIcds ) );
                allActivities = allActivities.concat( unwrap( currentActivity.icdsExtra ) );
                allActivities = allActivities.concat( unwrap( currentActivity.referencedBy ) );

                if ( currentActivity.receipts && Array.isArray( unwrap( currentActivity.receipts ) ) ) {
                    allActivities = allActivities.concat( unwrap( currentActivity.receipts ) );
                }

                return allActivities;
            },

            templateReady: function() {
                var
                    self = this,
                    currentActivity = self.options.currentActivity,
                    debugText = '';

                Y.log( 'jade template loaded and bound', 'debug', NAME );
                self.loaded( false );
                //  TODO: set a throbber here (self.loaded as observable?)
                if( currentActivity ) {
                    self.initFineViewModel();
                }
                self.debugText( debugText );
                self.initTabNav();
                self.initImagesTable();
            },

            initImagesTable: function() {
                var
                    self = this,
                    editableTypes = [ 'image/jpeg', 'image/png' ],
                    playableTypes = [ 'audio/mp3', 'audio/ogg' ],
                    currentActivity = self.options.currentActivity,
                    fileTypesDict = self.fileTypesToDict();

                if( unwrap( currentActivity ) ) {
                    self.baseParams = ko.observable( {
                        query: {
                            activityId: { $in: self.getAllActivityIds() },
                            type: { $ne: 'FORM' }
                        }
                    } );
                } else {
                    self.baseParams = ko.observable();
                }

                self.imagesTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-insight-table',
                        stateId: 'images_table_attached',
                        fillRowsToLimit: false,
                        limit: 5,
                        remote: true,
                        limitList: [ 5, 10, 20 ],
                        baseParams: self.baseParams,
                        proxy: self.expandMediaIdsForTable.bind( self ),
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false,
                                width: '20px'
                            },
                            {
                                label: '',
                                forPropertyName: 'thumbUrl',
                                isSortable: false,
                                isFilterable: false,
                                width: '100px',
                                renderer: function( meta ) {
                                    var
                                        link = _.template( '<div style="text-align: center"><img src="<%= thumbUrl %>" /></div>' );
                                    return link( { thumbUrl: meta.value } );
                                },
                                onCellClick: function( meta ) {
                                    var wnd = window.open( meta.row.fullUrl, "_blank" );
                                    wnd.opener = null;
                                    return false;
                                }
                            },
                            {
                                forPropertyName: 'createdOn',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                width: '80px',
                                isSortable: true,
                                direction: 'DESC',
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    //  MOJ-8394 Protect client-side code from broken data
                                    if( !meta || !meta.value || !meta.value.substring ) {
                                        return 'k.A.';
                                    }
                                    //return moment( new Date( parseInt( meta.value.substring( 0, 8 ), 16 ) * 1000 ) ).format( 'DD.MM.YYYY' );
                                    return moment( meta.value ).format( 'DD.MM.YYYY' );
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                width: '80px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var
                                        actType = meta.value;
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );
                                }
                            },
                            {
                                forPropertyName: 'caption',
                                label: i18n( 'InCaseMojit.documentSearchModal_clientJS.title.CAPTION' ),
                                title: i18n( 'InCaseMojit.documentSearchModal_clientJS.title.CAPTION' ),
                                isSortable: true,
                                isFilterable: true,
                                width: '160px'
                            },
                            {
                                forPropertyName: 'subType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                isSortable: true,
                                isFilterable: true,
                                width: '60px',
                                pdfRenderer: function( meta ) {
                                    var data = meta.row;
                                    return data.subType;
                                }
                            },


                            {
                                forPropertyName: 'contentType',
                                label: i18n( 'InCaseMojit.documentSearchModal_clientJS.title.DOCUMENT_TYPE' ),
                                title: i18n( 'InCaseMojit.documentSearchModal_clientJS.title.DOCUMENT_TYPE' ),
                                width: '80px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: self.fileTypesToEnum(),
                                    optionsText: 'name',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var mimeType = meta.value;
                                    return fileTypesDict.hasOwnProperty( mimeType ) ? fileTypesDict[ mimeType ] : mimeType;
                                }
                            },
                            {
                                forPropertyName: 'mediaId',
                                label: '',
                                title: '',
                                width: '50px',
                                renderer: function( meta ) {
                                    var
                                        contentType = meta.row.contentType ? meta.row.contentType : '',
                                        html = '';

                                    if ( contentType && -1 !== editableTypes.indexOf( contentType ) ) {
                                        html = html + '<button class="btn"><i class="fa fa-pencil"></i></button>';
                                    }

                                    if ( contentType && -1 !== playableTypes.indexOf( contentType ) ) {
                                        html = html + '<button class="btn"><i class="fa fa-play"></i></button>';
                                    }

                                    return html;
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                col = meta.col,
                                data = meta.row,
                                useId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId );

                            if (
                                !col.forPropertyName ||
                                'mediaId' !== meta.col.forPropertyName ||
                                !data.contentType
                            ) {
                                Y.log( 'Media is not editable or playable: ' + meta.value, 'warn', NAME );
                                return false;
                            }

                            if ( -1 !== editableTypes.indexOf( data.contentType ) ) {
                                Y.doccirrus.modals.editImageFabric.show( {
                                    'mediaId': meta.value,
                                    'ownerCollection': 'activity',
                                    'ownerId': useId,
                                    'onImageSaved': onEditedImageSaved
                                } );
                            }

                            if ( -1 !== playableTypes.indexOf( data.contentType ) ) {
                                Y.doccirrus.modals.playAudio.show( {
                                    'mediaId': meta.value
                                } );
                            }

                            function onEditedImageSaved( newMedia ) {
                                self.onMediaUpload( null, newMedia );
                                self.onSelected( newMedia );
                            }

                        }
                    }
                } );

                var componentColumnCheckbox = self.imagesTable.getComponentColumnCheckbox();

                self.addDisposable( ko.computed( function() {
                    var rowChecked = componentColumnCheckbox.checked();
                    self.selectedDocument( rowChecked[ 0 ] );
                } ) );

                self.listenFirstLoad = self.imagesTable.rows.subscribe( function( setRows ) {
                    self.listenFirstLoad.dispose();
                    self.preselectMedia( setRows );
                } );
            },

            preselectMedia: function( rows ) {
                var
                    self = this,
                    model = rows.filter( function( row ) {
                        //  MOJ-8394 Protect client-side code from broken media data
                        if( !row || !row.mediaId ) {
                            return false;
                        }
                        return row.mediaId === self.options.currentValue;
                    } )[ 0 ];
                if( model ) {
                    self.imagesTable.getComponentColumnCheckbox().check( model );
                }
            },

            expandMediaIdsForTable: function( params ) {
                var
                    self = this;

                return Y.doccirrus.jsonrpc.api.document.read( params ).then( onProxyData ).fail( onProxyFail );

                function onProxyFail( err ) {
                    Y.log( 'get documents failed: ' + JSON.stringify( err ), 'debug', NAME );
                }

                function onProxyData( result ) {
                    var
                        data = result.data ? result.data : [],
                        mediaStub,
                        i;

                    for ( i = 0; i < data.length; i++ ) {
                        mediaStub = {
                            _id: data[i].mediaId,
                            mime: Y.doccirrus.media.types.getMime( data[i].contentType )
                        };
                        data[i].thumbUrl = Y.doccirrus.media.getMediaThumbUrl( mediaStub, 68, false );
                        data[i].fullUrl = Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaStub, 'original' ) );
                        data[i].mediaName = data.caption;
                    }

                    self.loaded( true );
                    return result;
                }
            },

            /**
             *  Format our list of supported file types for select2 table column
             *
             *  Limited for now to only those types which can be added as images to forms, may be made configurable in future
             *
             *  @return {Array}
             */

            fileTypesToEnum: function() {
                var
                    options = [
                        { val: 'image/jpeg', name: i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_JPEG') },
                        { val: 'image/png', name: i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_PNG') },
                        { val: 'image/gif', name: i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_GIF') },
                        { val: 'image/tiff', name: i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_TIFF') },
                        { val: 'application/pdf', name: i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.APPLICATION_PDF') }
                    ];

                return options;
            },

            /**
             *  Format the list of filetypes into a simple object for fast lookup of name from mime type
             */

            fileTypesToDict: function() {
                return {
                    'image/jpeg': i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_JPEG'),
                    'image/png': i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_PNG'),
                    'image/gif': i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_GIF'),
                    'image/tiff': i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.IMAGE_TIFF'),
                    'application/pdf': i18n( 'MediaMojit.LinkedAttachedImagesModal.fileTypes.APPLICATION_PDF')
                };
            },

            /**
             *  Get all linked activities (expanded)
             *  @return {[Object]}
             */

            getAllLinkedActivities: function() {
                var
                    self = this,
                    currentActivity = self.options.currentActivity,
                    allLinkedItems = [];

                //  on the client we have observables, and there may be additional modified state from viewModels
                allLinkedItems = allLinkedItems.concat( unwrap( currentActivity._icdsObj ) || [] );
                allLinkedItems = allLinkedItems.concat( unwrap( currentActivity._icdsExtraObj ) || [] );
                allLinkedItems = allLinkedItems.concat( unwrap( currentActivity._activitiesObj ) || [] );
                allLinkedItems = allLinkedItems.concat( unwrap( currentActivity._continuousIcdsObj ) || [] );

                var i, j, mod;

                if( currentActivity._modifiedLinkedActivities ) {
                    for( i = 0; i < currentActivity._modifiedLinkedActivities.length; i++ ) {
                        mod = currentActivity._modifiedLinkedActivities[ i ];

                        for( j = 0; j < allLinkedItems.length; j++ ) {
                            if( allLinkedItems[ j ]._id === mod._id ) {
                                allLinkedItems[ j ] = mod;
                                //alert( 'inject ' + mod._id );
                                Y.log( 'Inserted modified version of activity ' + mod._id, 'debug', NAME );
                            }
                        }

                    }
                }

                return allLinkedItems;
            },

            /**
             *  Set up an upload/import control to add new media to this activity
             */

            initFineViewModel: function() {
                var
                    self = this,
                    currentActivity = unwrap( self.options.currentActivity ),
                    lookupId = unwrap( currentActivity._id ) || unwrap( currentActivity._randomId ),
                    hasInScanLicence = Y.doccirrus.auth.hasAdditionalService( 'inScan' ),
                    currentPatient = unwrap( self.options.currentPatient );

                function linkUploadEvent( facade, mediaObj ) {
                    self.onMediaUpload( facade, mediaObj );
                }

                self.fineViewModel = new FineViewModel();
                self.fineViewModel.allowScan = self.fineViewModel.allowScan && hasInScanLicence;
                self.fineViewModel.allowImport = false;

                self.fineViewModel.label( 'user' );
                self.fineViewModel.ownerCollection( 'activity' );
                self.fineViewModel.ownerId( lookupId );                         //  attach to provisional _id or real _id
                self.fineViewModel.patientId( peek( currentPatient._id ) );
                self.fineViewModel.activityId( peek( currentActivity._id ) );   //  attach only to real _id (after save)

                //  subscribe to _id changes
                self.idListener = currentActivity._id.subscribe( function() {
                    //  set _id after first save
                    self.fineViewModel.activityId( peek( currentActivity._id ) );
                    self.fineViewModel.ownerId( peek( currentActivity._id ) );
                } );

                //  subscribe to media upload event
                self.fineViewModel.events.on( 'fineMediaUpload', linkUploadEvent );

                self.fineViewModel.events.on( 'documentImported', function() {
                    self.onDocumentImported();
                } );

                if( !peek( currentActivity._id ) ) {
                    Y.doccirrus.communication.emit( 'incase.extDocumentTabOpened', {
                        activityId: self.fineViewModel.ownerId(),
                        isNew: true
                    } );
                }

            },

            //  EVENTS

            onMediaUpload: function( facade, mediaObj ) {
                var self = this;

                //  will create and add a document to current activity attachments (synchronous)
                self.options.onMediaAdded( facade, mediaObj );

                Y.log( 'Media and document added to activity ' + unwrap( self.options.currentActivity._id ), 'debug', NAME );
            },

            onDocumentImported: function() {
                Y.log( 'Media imported from flow - should be disabled in this dialog.', 'warn', NAME );
            },

            /**
             *  Query which button icon to use for the given image _id (called by KO when initializing buttons)
             *
             *  @param      _id     {String}
             *  @return             {String}
             */

            onGetButtonIcon: function( _id ) {
                var self = this;
                return ( _id === self.options.currentValue ) ? 'fa-check-square-o' : 'fa-sign-in';
            },

            onGetButtonState: function( _id ) {
                var self = this;
                return ( _id === self.options.currentValue ) ? 'btn-disabled' : 'btn-primary';
            },

            /**
             *  Raised by KO when user presses select button
             */

            onSelectImage: function( metaRow ) {
                var
                    self = this,
                    mediaObj;

                //  ignore spurious calls while loading
                if( false === self.loaded() ) {
                    return;
                }

                //  do not reload the current image in the form
                if( metaRow.mediaId === self.options.currentValue ) {
                    return;
                }

                //  pass the image back to caller
                mediaObj = {
                    '_id': metaRow.mediaId,
                    'mimeType': metaRow.contentType,
                    'mime': Y.doccirrus.media.getMime( metaRow.contentType )
                };
                self.options.onSelected( mediaObj, true );

                //  close the modal
                if( self.onComplete ) {
                    self.onComplete( _.assign( metaRow.attachedMedia, _.pick( metaRow, 'thumbUrl', 'fullUrl' ) ) );
                }
            }

        } );

        /**
         *  Create a modal to select an image attached to an activity or its linked activities
         *
         *  @param  options                 {Object}
         *  @param  options.currentActivity {Object}    Activity viewmodel
         *  @param  options.currentValue    {String}    Media _id of currently selected image
         */

        function showLinkedAttachedImages( options ) {

            Promise
                .props( {
                    modules: Y.doccirrus.utils.requireYuiModule( [
                        'node',
                        'JsonRpcReflection-doccirrus',
                        'JsonRpc',
                        'DCWindow'
                    ] ),
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'MediaMojit/views/modals/linkedattachedimages' } )
                        .then( function( response ) {
                            return response.data;
                        } )
                } )
                .then( function( props ) {
                    var
                        template = props.template,
                        bindings = new LinkedAttachedImagesModel( options ),
                        bodyContent = Y.Node.create( template ),
                        hasCurrentValue = ( options && options.currentValue && ( '' !== options.currentValue ) ),
                        btnClear = Y.doccirrus.DCWindow.getButton( 'CLEAR', {
                            isDefault: true,
                            classNames: 'btn-primary',
                            label: i18n( 'MediaMojit.LinkedAttachedImagesModal.label.clear' ),
                            action: onClearButtonClick
                        } ),
                        btnInsert = Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            label: i18n( 'MediaMojit.LinkedAttachedImagesModal.label.insert' ),
                            action: function() {
                                bindings.onSelectImage( ko.unwrap( bindings.selectedDocument ) );
                                this.close();
                            }
                        } ),

                        footerButtonSet = hasCurrentValue ? [ btnClear, btnInsert ] : [ btnInsert ],

                        dialog = new Y.doccirrus.DCWindow( {
                            id: 'DCWindow-LinkedAttachedImagesDialog',
                            className: 'DCWindow-LinkedAttachedImagesDialog',
                            bodyContent: bodyContent,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            height: WINDOW_SIZE,
                            width: WINDOW_SIZE,
                            maximizable: true,
                            resizeable: true,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: footerButtonSet
                            },
                            after: {
                                render: function() {
                                    onModalRendered( this );
                                },
                                destroy: onModalDestroy
                            }
                        } ),

                        listenForSelection = ko.computed( function() {
                            //  computed may fire after dialog is disposed
                            if( !dialog || !dialog.getButton || !dialog.getButton( 'OK' ) ) {
                                return;
                            }

                            var
                                selectedValue = unwrap( bindings.selectedDocument ),
                                insertBtn = dialog.getButton( 'OK' ).button;

                            if( !insertBtn ) {
                                return;
                            }

                            if( selectedValue ) {
                                insertBtn.enable();
                            } else {
                                insertBtn.disable();
                            }
                        } );

                    bindings.addDisposable( listenForSelection );

                    function onModalRendered( /* modalBody */ ) {
                        Y.log( 'Envelope modal rendered.', 'debug', NAME );
                    }

                    function onModalDestroy() {
                        //if( aDCWindowResizeEvent ) {
                        //    aDCWindowResizeEvent.detach();
                        //}
                        if( bindings && bindings._dispose ) {
                            bindings._dispose();
                        }
                        if( listenForSelection ) {
                            listenForSelection.dispose();
                        }
                    }

                    function onClearButtonClick() {
                        options.onSelected( null, true );
                        dialog.close();
                    }

                    bindings.onComplete = function( args ) {
                        if( options.onComplete ) {
                            options.onComplete( args );
                        }
                        dialog.close();
                    };

                    bindings.onSelected = function( mediaObj ) {
                        if ( options.onSelected ) {
                            options.onSelected( mediaObj );
                            dialog.close();
                        }
                    };

                    //  necessary to re-center after table node is added (similar to processNextTick)
                    window.setTimeout( function() {
                        dialog.centered();
                    }, 1 );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                } );
        }

        Y.namespace( 'doccirrus.modals' ).linkedAttachedImages = {
            show: showLinkedAttachedImages
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'FineViewModel',
            'dccamerainputmodal',
            'dceditimagemodal',
            'playaudiomodal',
            'dcmedia-filetypes'
        ]
    }
);