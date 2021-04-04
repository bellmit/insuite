/**
 * User: strix
 * Date: 09/05/17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, $, async, ko */

YUI.add( 'chooseinvoiceform-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            userLang = Y.dcforms.getUserLang();

        /**
         *  ViewModel for choosing and updating display of form to be unsed in invoice generation
         *
         *  Future: this may be made more general, used for selecting any form
         *
         *  @param  config                  {Object}
         *  @param  config.formCats         {Object}
         *  @param  config.formList         {Object}    Array of formMeta objects
         *  @param  config.canonicalId      {String}    Default value, database _id of a form template
         *  @param  config.formDivId        {String}    DOM ID to render the form into (default is divFormRender)
         *  @param  config.onFormChosen     {Function}  Of the form fn( formMeta)
         *
         *  @class SelectInvoiceFormModel
         *  @constructor
         *  @extends KoViewModel
         */
        function SelectInvoiceFormModel( config ) {
            SelectInvoiceFormModel.superclass.constructor.call( this, config );
        }

        SelectInvoiceFormModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            type: {
                value: null,
                lazyAdd: false
            }
        };

        Y.extend( SelectInvoiceFormModel, KoViewModel.getBase(), {
                template: null,
                formId: null,
                formDivId: 'divFormRender',

                initializer: function __SelectInvoiceFormModel_initializer( config ) {
                    var self = this;

                    //  DOM ID to render form into, if not default
                    if ( config.divFormId ) { self.divFormId = config.divFormId; }

                    self.formId = ko.observable( config.canonicalId || '' );
                    self.initSelect2Form( config );

                    self.__listenForFormChange = ko.computed( function() {
                        var canonicalId = self.formId();

                        //  update parent / instantiator
                        if ( config.onFormChosen ) {
                            config.onFormChosen( canonicalId );
                        }

                        if ( !canonicalId || '' === canonicalId ) {
                            Y.log( 'No form selected, not updating preview.', 'debug', NAME );
                            return;
                        }

                        if ( !self.template ) {
                            Y.log( 'Creating initial form template to preview invoice form.', 'debug', NAME );
                            self.initTemplate();
                        } else {
                            Y.log( 'Changing form template to: ' + canonicalId, 'debug', NAME );
                            self.setTemplate();
                        }

                    } );

                    self.initTemplate();
                },
                destructor: function __SelectInvoiceFormModel_destructor() {
                    var self = this;
                    self.template.destroy();
                    self.__listenForFormChange.dispose();
                },
                /**
                 * Saves or updates current task
                 * @method save
                 */
                save: function() {
                    return false;
                },

                initSelect2Form: function( config ) {
                    var
                        self = this,
                        //  we don't want the Archive or Recovered folders here
                        schm = Y.doccirrus.schemas.formfolder,
                        excludeFolders = [ schm.recoveryFolderId, schm.archivFolderId ];

                    self.isValid = function() {
                        return ko.unwrap( self.formId );
                    };

                    if( self.select2FormDC ) {
                        //  already initialized
                        return;
                    }

                    var
                        emptyFolder = {
                            id: '',
                            text: self.LBL_TITLE = i18n( 'FormEditorMojit.forms_tree.NO_ENTRIES' ),
                            formVersion: ''
                        };

                    var
                        folders = config.preloadFolders,
                        dataGroupedDC = [],
                        dataGroupedUser = [],
                        i;

                    //  add root folders, with subfolders nested beneath
                    for ( i = 0; i < folders.length; i++ ) {
                        if ( !folders[i].parent || '' === folders[i].parent ) {
                            addFolder( folders[i], '', [] );
                        }
                    }

                    function addFolder( folder, path, parents ) {
                        var j, k, dcForms = [], userForms = [];

                        if ( -1 !== excludeFolders.indexOf( folders[i]._id ) ) {
                            //  this folder is not shown in this context
                            return;
                        }

                        //  sanity check for circular references
                        if ( -1 !== parents.indexOf( folder._id ) ) {
                            Y.log( 'Breaking infinte loop on circular folder structure.', 'error', NAME );
                            return;
                        }

                        parents.push( folder._id );

                        for ( j = 0; j < folder.forms.length; j++ ) {
                            if ( folder.forms[j].isReadOnly ) {
                                dcForms.push( formToChild( folder.forms[j] ) );
                            } else {
                                userForms.push( formToChild( folder.forms[j] ) );
                            }
                        }

                        if ( dcForms.length === 0 ) {
                            dcForms.push( emptyFolder );
                        }

                        if ( userForms.length === 0 ) {
                            userForms.push( emptyFolder );
                        }

                        userForms.sort( compareFormsAlphabetical );
                        dcForms.sort( compareFormsAlphabetical );   //

                        if ( dcForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedDC.push( { text: path + folder[ userLang ], children: dcForms } );
                        }

                        if ( userForms.length > 0 || folder.subfolders.length > 0 ) {
                            dataGroupedUser.push( { text: path + folder[ userLang ], children: userForms } );
                        }

                        //  recursively add child folders

                        for ( j = 0; j < folder.subfolders.length; j++ ) {
                            for ( k = 0; k < folders.length; k++ ) {

                                if ( folders[k]._id === folder.subfolders[j] ) {
                                    addFolder( folders[k], path + '.\\', parents );
                                }
                            }
                        }
                    }

                    function compareFormsAlphabetical( a, b ) {
                        var
                            aText = a.text.toLowerCase(),
                            bText = b.text.toLowerCase();

                        if( aText < bText ) {
                            return -1;
                        }
                        if( aText > bText ) {
                            return 1;
                        }
                        return 0;
                    }

                    function formToChild( form ) { //
                        return {
                            id: form._id,
                            text: form.title[ userLang ] + ' v' + form.version,
                            formVersion: form.version
                        };
                    }

                    function createSelect2Form( data, placeholder ) {
                        return {
                            val: self.addDisposable( ko.computed( {
                                read: function() {
                                    return ko.unwrap( self.formId );
                                },
                                write: function( $event ) {
                                    self.formId( $event.val );
                                }
                            } ) ),
                            select2: {
                                allowClear: true,
                                placeholder: placeholder,
                                width: '100%',
                                data: data
                            }
                        };
                    }

                    self.select2FormDC = createSelect2Form( dataGroupedDC, 'Doc Cirrus Formulare' );
                    self.select2FormPRAC = createSelect2Form( dataGroupedUser, 'Praxis Formulare' );                    //  TODO: translateme
                },

                initTemplate: function() {
                    var self = this;

                    if ( self.template ) {
                        Y.log( 'Form template already exists, not recreating.', 'warn', NAME );
                        return;
                    }

                    Y.dcforms.createTemplate( {
                        canonicalId: '',
                        divId: self.formDivId,
                        width: 400,                 //  smaller than available space by default, overwritten before display
                        doRender: false,
                        callback: onFormInitialized
                    } );

                    function onFormInitialized( err, newTemplate ) {
                        if ( err ) {
                            Y.log( 'Problem loading form: ' + JSON.stringify( err ), 'warn', NAME );
                            return;
                        }

                        self.template = newTemplate;
                        self.setTemplate();
                    }
                },

                setTemplate: function() {
                    var self = this;

                    if ( !self.formId || '' === ko.unwrap( self.formId ) ) {
                        Y.log( 'No form selected, cannot load into template.', 'warn', NAME );
                        return;
                    }

                    if ( !self.template ) {
                        Y.log( 'Form template not yet initialized, cannot change value.', 'warn', NAME );
                        return;
                    }

                    if ( self.template.canonicalId === self.formId() && '' !== self.formId() ) {
                        Y.log( 'Form template not changed, not resetting: ' + self.formId(), 'warn', NAME );
                        return;
                    }

                    if ( self.template.isLoading ) {
                        Y.log( 'Form load is already in progress, will retry on completion.', 'warn', NAME );
                        return;
                    }

                    async.series( [ loadNewForm, resizeForm, renderNewForm, lockNewForm ], onAllDone );

                    function loadNewForm( itcb ) {
                        $( '#' + self.formDivId ).html( '' );
                        self.template.domInitComplete = false;
                        self.template.load( ko.unwrap( self.formId ), '', onFormLoad );

                        function onFormLoad( err ) {
                            if ( err ) {
                                Y.log( 'Could not load form: ' + JSON.stringify( err ), 'warn', NAME );
                                return itcb( err );
                            }

                            //  for selection may have changed while form was loading, load again if so
                            if ( ko.unwrap( self.formId ) !== self.template.canonicalId ) {
                                Y.log( 'Current formId has changed during form load, reloading... ' + self.template.canonicalId + ' !== ' + self.formId(), 'debug', NAME );
                                self.setTemplate();
                                return;
                            }

                            itcb( null );
                        }
                    }

                    //  select2 can mess with column width / remaining space for form
                    function resizeForm( itcb ) {
                        self.template.resize( $( '#divFormRender' ).width(), itcb );
                    }

                    function renderNewForm( itcb ) {
                        self.template.render( onInitialRender );
                        function onInitialRender( err ) {
                            if ( err ) {
                                Y.log( 'Could not render form: ' + JSON.stringify( err ), 'warn', NAME );
                            }
                            itcb( null );
                        }
                    }

                    function lockNewForm( itcb ) {
                        self.template.setMode( 'locked', itcb );
                    }

                    function onAllDone( err ) {
                        if ( err ) {
                            Y.log( 'Problem loading form: ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        Y.log( 'Loaded invoice form sample: ' + self.template.canonicalId, 'debug', NAME );
                    }
                },

                /**
                 * Removes current task
                 * @method remove
                 */
                remove: function() {
                    return false;
                }
            },
            {
                //schemaName: 'selectinnvoiceformtemplate',
                NAME: 'SelectInvoiceFormModel'
            }
        );

        KoViewModel.registerConstructor( SelectInvoiceFormModel );

        /**
         *  Select a form to use in invoice generation
         *
         *  @param  config                      {Object}
         *  @param  config.defaultIdentifier    {String}    Default for identifier to use (canonicalId or role)
         *  @param  config.userLang             {String}    For form titles ('en'|'de')
         *  @param  config.title                {String}    Modal title. Default: FormEditorMojit.chooseinvoiceform_modal.title
         *  @param  config.onFormSelected       {Function}  Of the form fn( printerName, locationId, canonicalId )
         */

        function show( config ) {

            var
                node = Y.Node.create( '<div></div>' ),
                jq = {},

                modal,
                preloadFolders,

                defaultIdentifier = config.defaultIdentifier ? config.defaultIdentifier : 'casefile-invoice',
                //userLang = config.userLang ? config.userLang : 'de',
                canonicalId,
                formTitle,

                selectFormVM,

                btnSelect = {
                    name: 'SELECTFORM',
                    label: i18n( 'FormEditorMojit.chooseinvoiceform_modal.buttons.SELECT' ),
                    isDefault: true,
                    action: onSelectButtonClick
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.chooseinvoiceform_modal.buttons.CANCEL' ),
                    isDefault: true,
                    action: onCancelButtonClick
                },

                buttonSet = [ btnCancel, btnSelect ],
                modalTitle = config.title || i18n('FormEditorMojit.chooseinvoiceform_modal.title');

            if ( config.dropDown ) { jq.dropDown = config.dropDown; }

            async.series(
                [
                    getFormsList,
                    loadJade,
                    createModal,
                    createAndBindKoModel
                    //updateFormsSelect
                ],
                onModalReady
            );

            //  4. Get nested list of forms and folders
            function getFormsList( itcb ) {
                Y.doccirrus.jsonrpc.api.formfolder.getFoldersWithForms().then( onFormListLoaded ).fail( onFormListErr );

                function onFormListLoaded( result ) {
                    var i, j;

                    preloadFolders = result.data;

                    //  check for default invoice form here
                    for ( i = 0; i < preloadFolders.length; i++ ) {
                        for ( j = 0; j < preloadFolders[i].forms.length; j++ ) {
                            if ( preloadFolders[i].forms[j].defaultFor === defaultIdentifier ) {
                                canonicalId = preloadFolders[i].forms[j]._id;
                            }
                        }
                    }

                    itcb( null );
                }

                function onFormListErr( err ) {
                    Y.log( 'Problem loading form folder list: ' + JSON.stringify( err ), 'warn', NAME );
                    //  should not happen, in this case the default invoice for is used, continue despite error
                    itcb( null );
                }
            }

            //  5. Load modal jade template (stub)
            function loadJade( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'chooseinvoiceform_modal',
                    'FormEditorMojit',
                    {},
                    node,
                    itcb
                );
            }

            //  6. Instantiate the modal
            function createModal( itcb ) {

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-ChooseInvoiceForm',
                    title: modalTitle,
                    bodyContent: node,
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: 800,
                    minHeight: 750,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    dragable: true,
                    focusOn: [],
                    maximizable: false,
                    resizeable: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: buttonSet
                    }
                } );

                jq = {
                    'divFormRender': $('#divFormRender')
                };

                itcb( null );
            }

            function createAndBindKoModel( itcb ) {
                selectFormVM = KoViewModel.createViewModel( {
                    NAME: 'SelectInvoiceFormModel',
                    config: {
                        preloadFolders: preloadFolders,
                        formDivId: 'divFormRender',
                        canonicalId: canonicalId,
                        onFormChosen: function( newFormId ) { onSelectionChanged( newFormId ); }
                    }
                } );

                selectFormVM.labelExplanationsI18n = i18n( 'FormEditorMojit.chooseinvoiceform_modal.labels.EXPLANATION' );

                ko.applyBindings( selectFormVM, node.getDOMNode() );
                itcb( null );
            }

            //  Event handlers

            /**
             *  Raised after modal is created
             *
             *  @param err
             */

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Could not set printer modal: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

            /**
             *  User pressed the select button, dismiss this modal and inform parent
             */

            function onSelectButtonClick() {
                var form = "", i, j;

                if ( !canonicalId || '' === canonicalId ) {
                    Y.log( 'Not invoice form, none chosen.', 'debug', NAME );
                    return;
                }

                Y.log( 'Invoice form selected from dialog box: ' + canonicalId, 'debug', NAME );

                if ( !config.onFormSelected ) {
                    Y.log( 'No handler: onFormSelected', 'warn', NAME );
                    return;
                }

                //  find the formMeta corresponding to selected canonicalId
                for ( i = 0; i < preloadFolders.length; i++ ) {
                    for ( j = 0; j < preloadFolders[i].forms.length; j++ ) {
                        if ( preloadFolders[i].forms[j]._id === canonicalId ) {
                            form = preloadFolders[i].forms[j];
                        }
                    }
                }

                if (form) {
                    formTitle = form.title[userLang] + " v" + form.version;
                }

                config.onFormSelected( canonicalId, formTitle );
                modal.close( true );
            }

            /**
             *  Raised when value changes in form select dropdown
             *  @param  newFormId
             */

            function onSelectionChanged( newFormId ) {
                Y.log( 'Selected form changed to: ' + newFormId, 'debug', NAME );
                canonicalId = newFormId;
            }

            /**
             *  User pressed the cancel button, just close the modal
             *  Future: might delete the cached PDF here on a timeout, will be cleared on next restart
             */

            function onCancelButtonClick() {
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).chooseInvoiceForm = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'node-event-simulate',
            'dcforms-template',
            'dcforms-utils'
        ]
    }
);