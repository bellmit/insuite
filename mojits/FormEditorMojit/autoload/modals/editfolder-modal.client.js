 /**
 * User: strix
 * Date: 28/10/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*eslint prefer-template:0, strict:0 */
/*global YUI, async, $, ko */

YUI.add( 'editfolder-modal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;


        /**
         *  Small ViewModel for binding form folders into modal
         */

        function EditFolderViewModel( folder ) {
            var
                self = this;

            function init() {
                var i, k, licences;

                self.isMasterDCFormTenant = 0 <= ((Y.doccirrus.infras.getPrivateURL() + '') || window.location.host).indexOf( (Y.doccirrus.utils.getMojitBinderByType( 'FormEditorMojit' ).mojitProxy.pageData.get( 'masterDCFormTenant' ) + '') );
                //  TRANSLATIONS

                self.LBL_TITLE = i18n( 'FormEditorMojit.forms_tree.LBL_TITLE' );
                self.LBL_COUNTRY_MODE = i18n( 'FormEditorMojit.forms_tree.LBL_COUNTRY_MODE' );
                self.LBL_LICENCE = i18n( 'FormEditorMojit.forms_tree.LBL_LICENCE' );
                self.LBL_DE = i18n( 'countrymode-schema.CountryMode_E.D' );
                self.LBL_CH = i18n( 'countrymode-schema.CountryMode_E.CH' );

                //  OBSERVABLES

                self._id = folder._id;
                self.isDefault = ko.observable( folder.isDefault );
                self.titleEn = ko.observable( folder.en );
                self.titleDe = ko.observable( folder.de );

                folder.countryMode = folder.countryMode || [];

                self.showInGermany = ko.observable( -1 !== folder.countryMode.indexOf( 'D' ) );
                self.showInSwitzerland = ko.observable( -1 !== folder.countryMode.indexOf( 'CH' ) );
                self.licence = ko.observable( folder.licence || '' );
                self.licenceObj = ko.observable( null );

                //  LICENCE OPTIONS

                licences = [ { name: '', label: '' } ];

                for ( k in Y.doccirrus.schemas.settings.specialModuleKinds ) {
                    if ( Y.doccirrus.schemas.settings.specialModuleKinds.hasOwnProperty( k ) ) {
                        licences.push( {
                            name: Y.doccirrus.schemas.settings.specialModuleKinds[k],
                            label: i18n( 'licenseManager.specialModules.' + Y.doccirrus.schemas.settings.specialModuleKinds[k] )
                        } );
                    }
                }

                for ( i = 0; i < licences.length; i++ ) {
                    if ( licences[i].name === folder.licence ) {
                        self.licenceObj( licences[i] );
                    }
                }

                self.allSpecialModulesNamed = ko.observableArray( licences );

                self.listenLicense = self.licenceObj.subscribe( function( changedValue ) {
                    self.licence( changedValue.name );
                } );
            }

            self.getFolder = function() {
                folder._id = self._id;
                folder.en = self.titleEn();
                folder.de = self.titleDe();
                folder.licence = self.licence();
                folder.countryMode = [];
                if ( self.showInGermany() ) {
                    folder.countryMode.push( 'D' );
                }
                if ( self.showInSwitzerland() ) {
                    folder.countryMode.push( 'CH' );
                }
                return folder;
            };


            init();
        }

        /**
         *  Modal to edit form folders
         *
         *  @param  config                      {Object}
         *  @param  config.folder               {Object}    Folder object to edit
         *  @param  config.onUpdate             {Function}  Called when changes to the folder are saved to the server
         */

        function show( config ) {
            var
                node = Y.Node.create( '<div></div>' ),

                folder = config.folder,
                onUpdate = config.onUpdate,
                editFolderViewModel,
                modal,

                btnSave = {
                    name: 'SAVE',
                    label:  i18n( 'FormEditorMojit.forms_tree.LBL_SAVE' ),
                    isDefault: true,
                    action: function() { onSaveButtonClick(); }
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.formimportexport_modal.BTN_CANCEL' ),
                    isDefault: true,
                    action: onCancelButtonClick
                },

                buttonSet = [ btnCancel, btnSave ];

            async.series(
                [
                    loadJade,
                    createModal,
                    initKoViewModel
                ],
                onModalReady
            );

            //  X. Load modal jade template (stub)
            function loadJade( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'editfolder_modal',
                    'FormEditorMojit',
                    {},
                    node,
                    itcb
                );
            }

            //  X. Instantiate the modal
            function createModal( itcb ) {

                modal = Y.doccirrus.DCWindow.dialog( {
                    title: i18n( 'FormEditorMojit.forms_tree.EDIT_FOLDER'),
                    type: 'info',
                    window: {
                        width: 'large',
                        maximizable: true,
                        buttons: { footer: buttonSet }
                    },
                    message: node
                } );

                itcb( null );
            }

            function initKoViewModel( itcb ) {
                //TODO: continue from here
                Y.log(  'Init edit modal for folder ' + folder._id, 'warn', NAME );

                editFolderViewModel = new EditFolderViewModel( folder );

                ko.applyBindings( editFolderViewModel, $('#editFolderModalConteiner')[0] );
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

            function onSaveButtonClick() {
                var changedFolder = editFolderViewModel.getFolder();

                Y.doccirrus.jsonrpc.api.formfolder.updateFolder( changedFolder )
                    .then( onFolderSaved )
                    .fail( onFolderSaveErr );

                function onFolderSaved() {
                    onUpdate( changedFolder );
                }

                function onFolderSaveErr( err ) {
                    Y.log( 'Problem saving folder to server: ' + JSON.stringify( err ), 'error', NAME );
                }

            }

            /**
             *  User pressed the cancel button, just close the modal
             *  Future: might delete the cached PDF here on a timeout, will be cleared on next restart
             */

            function onCancelButtonClick() {
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).editFolder = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dcforms-utils'
        ]
    }
);