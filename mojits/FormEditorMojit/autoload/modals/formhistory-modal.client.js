/*global YUI, ko, Promise, $ */

'use strict';

YUI.add( 'formhistory-modal', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 200,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function FormHistoryModalVM( config ) {
        FormHistoryModalVM.superclass.constructor.call( this, config );
    }

    Y.extend( FormHistoryModalVM, Disposable, {

        //  properties

        //  setup and teardown

        initializer: function( options ) {
            var self = this;

            //  options
            self.canonicalId = options.canonicalId;
            self.isDebugMode = options.isDebugMode || false;
            self._options = options;

            //  translations
            self.LBL_NOVERSION = Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_NOVERSION');
            self.LBL_VERSIONNO = Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_VERSIONNO');
            self.LBL_TITLE = Y.doccirrus.i18n('FormEditorMojit.form_history.LBL_TITLE');
            self.BTN_PREVIEW = Y.doccirrus.i18n('FormEditorMojit.form_history.BTN_PREVIEW');
            self.BTN_REVERT = Y.doccirrus.i18n('FormEditorMojit.form_history.BTN_REVERT');

            //  form preview
            self.template = null;

            //  obervables
            self.revisions = ko.observableArray( [] );
            self.loaded = false;
            self.currentPreview = ko.observable( '' );
            self.previewTitle = ko.observable( '' );

            //  computeds
            self.showTable = ko.computed( function() {
                return ( '' === self.currentPreview() );
            } );

            self.showPreview = ko.computed( function() {
                return ( '' !== self.currentPreview() );
            } );

            //  event handlers from binding
            self._initButtonandlers();

            //  load history and identities associated with it
            Y.dcforms.getFormVersionHistory( self.canonicalId, function( err, result ) { self.onHistoryLoaded( err, result ); } );


        },

        /**
         *  Self is different when raised from binder
         *  @private
         */

        _initButtonandlers: function() {

            var self = this;

            /**
             *  Show preview of a selected form version
             *
             *  @param  versionMeta {Object}    reduced listing entry of this version
             */

            self.onPreviewClick = function( versionMeta ) {

                var
                    divId = 'divPreviewEmbedContainer',
                    jqDiv = $('#' + divId),
                    userLang = Y.dcforms.getUserLang(),

                    pxWidth = jqDiv.width();

                self.previewTitle( versionMeta.title[ userLang ] + ' ' + versionMeta.version + '.' + versionMeta.revision );
                self.currentPreview( versionMeta._id );

                Y.dcforms.createTemplate( {
                    'canonicalId': '',                                  //  not yet specifying a form
                    'formVersionId': '',                                //  not yet specifying a form version
                    'divId': divId,                                     //  container element to render into
                    'width': pxWidth,                                   //  pixel width of embedded form
                    'il8nDict': Y.dcforms.il8nDict,                     //  legacy, to be replaced
                    'doRender': false,                                  //  we'll render after load
                    'callback': onTemplateCreated
                } );

                //Y.dcforms.template.create(patientRegId, canonicalId, formVersionId, divId, il8nDict, false, onTemplateCreated);
                function onTemplateCreated(err, newTemplate) {
                    if (err) {
                        Y.log('Error creating form template:' + err, 'warn', NAME);
                        jqDiv.html(err);
                        return;
                    }

                    self.template = newTemplate;
                    self.template.load( self.canonicalId, versionMeta._id, onFormLoaded );

                }

                function onFormLoaded( err   ) {
                    if ( err ) {
                        Y.log( 'Could not load form version ' + self.canonicalId + 'v' + versionMeta._id + ': ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                    self.template.render( onFormRendered );
                }

                function onFormRendered( err ) {
                    if ( err ) {
                        Y.log( 'Problem locking form preview: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }

                    self.template.setMode( 'locked', Y.dcforms.nullCallback );
                }
            };

            /**
             *  Called by binding to button
             */

            self.onBackButtonClick = function() {
                self.template.destroy();
                self.currentPreview( '' );
                //  TODO: better way to destroy this view
                $('#divPreviewEmbedContainer').html('');
            };

            /**
             *  Replace canonical with the selected form version
             *
             *  LEGACY CODE FROM jQuery implementation, TODO: update
             *
             *  @param  versionId   {String}    database _id of a formtemplateversion
             */

            self.onRevertClick = function( versionMeta ) {
                var
                    versionId = versionMeta._id,
                    jqHC = $('#divFormHistoryContainer'),
                    canonicalForm,
                    previousForm;

                Y.log('Reverting form ' + self.canonicalId + ' to version ' + versionId + '', 'warn', NAME);

                jqHC.html(Y.doccirrus.comctl.getThrobber());
                Y.dcforms.loadForm('', self.canonicalId, '', onCanonicalLoaded);

                function onCanonicalLoaded(err, serializedCanonical) {
                    if (err) {
                        jqHC.html('<pre>Could not load canonical form ' + JSON.stringify(err) + '</pre>');
                        return;
                    }

                    canonicalForm = serializedCanonical;
                    Y.dcforms.loadForm('', self.canonicalId, versionId, onVersionLoaded);
                }

                function onVersionLoaded(err, serializedVersion) {
                    if (err) {
                        jqHC.html('<pre>Could not load previous version form ' + JSON.stringify(err) + '</pre>');
                        return;
                    }

                    previousForm = serializedVersion;

                    if (previousForm._id === canonicalForm.id) {
                        //  has fallen back to canonical because of missing version
                        jqHC.html('<pre>Could not load version ' + versionId + '</pre>');
                        return;
                    }

                    //  keep revision number and place at top of history
                    previousForm.jsonTemplate.version = canonicalForm.jsonTemplate.version;
                    previousForm.jsonTemplate.revision = canonicalForm.jsonTemplate.revision;

                    //  for legacy reasons, save only changes the jsonTemplate property of the form object
                    //jqHC.html('<pre>' + JSON.stringify(previousForm, 'undefined', 2) + '</pre>');

                    Y.dcforms.saveForm( self.canonicalId, previousForm.jsonTemplate, onRevertSaved);
                }

                function onRevertSaved(err, identifiers) {
                    if (err) {
                        jqHC.html('<pre>Could not save new version of form ' + JSON.stringify(err) + '</pre>');
                        return;
                    }

                    Y.log('Reverted form ' + self.canonicalId + ' to previous version ' + versionId + ': ' + JSON.stringify(identifiers), 'info', NAME);
                    jqHC.html('<pre>...' /* + JSON.stringify(identifiers, 'undefined', 2) */ + '</pre>');
                    window.location.reload();
                }

            };
        },

        destructor: function() {
            //var self = this;
        },

        //  event handlers

        onHistoryLoaded: function( err, revisions ) {
            var
                self = this,
                userLang = Y.dcforms.getUserLang(),
                i, hasRc;

            if ( err ) {
                Y.log( 'Problem loading forms history: ' + JSON.stringify( err ), 'error', NAME );
                return;
            }

            for ( i = 0; i < revisions.length; i++ ) {
                hasRc = (revisions[i].revComment && '' !== revisions[i].revComment);

                revisions[i].description = '' +
                    revisions[i].title[ userLang ] + '<br/>' +
                    '<small>' + revisions[i].tCreated + '</small><br/>' +
                    ( hasRc ? '<small>' + revisions[i].revComment + '</small><br/>' : '' ) +
                    revisions[i].userName;

                if ( self.isDebugMode ) {
                    revisions[i].description =  revisions[i].description
                        + '_id: ' + revisions[i]._id + '<br/>'
                        + 'userId: ' + revisions[i].userId + '<br/>';
                }

                revisions[i].versionRevision = revisions[i].version + '.' + revisions[i].revision;
            }

            self.revisions( revisions );
        }

    } );

    /**
     *  Provides a dialog for editing advanced table options
     *
     *  @method show
     *  @param  options                     {Object}
     *  @param  options.canonicalId         {Object}    Expanded dcforms table definition DEPRECATED
     *
     *  @returns {Y.EventTarget}
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showFormHistoryModal( options ) {
        if ( !options || !options.canonicalId ) {
            Y.log( 'Cannot create modal, needs set of table definition to present to user.', 'warn', NAME );
            return;
        }

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'FormEditorMojit/views/forms_history' } )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    formHistoryModalVM = new FormHistoryModalVM( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-TablePropertiesDialog',
                        className: 'DCWindow-TablePropertiesDialog',
                        bodyContent: bodyContent,
                        title: i18n('FormEditorMojit.form_history.LBL_VERSION'),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,

                        maximizable: true,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                {
                                    //  TRANSLATEME
                                    label: i18n( 'DCWindow.BUTTONS.OK' ),
                                    name: 'APPLYPROPERTIES',
                                    value: 'APPLYPROPERTIES',
                                    isDefault: true,
                                    action: onApplyProperties
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                /**
                 *  Raised when the CHOOSELOCATIONS button is clicked
                 *  @param e
                 */

                function onApplyProperties( e ) {
                    dialog.close( e );
                }

                function onVisibilityChange( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        setTimeout( function() {
                            formHistoryModalVM.dispose();
                            ko.cleanNode( bodyContent.getDOMNode() );

                        }, 10 );
                    }
                }

                ko.cleanNode( bodyContent.getDOMNode() );
                ko.applyBindings( formHistoryModalVM, bodyContent.getDOMNode() );
            } )
            .catch( function( err ) {
                Y.log( 'Could not initialize dialog: ' + JSON.stringify( err ), 'warn', NAME );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).formHistory = {
        show: showFormHistoryModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'DCWindow'
    ]
} );
