/**
 * User: strix
 * Date: 08/06/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*eslint prefer-template:0, strict:0 */
/*global YUI, async */

YUI.add( 'chooselabdata-modal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        /**
         *  Modal to select and filter labdata to be mapped into a form element
         *
         *  @param  config                      {Object}
         *  @param  config.patient              {String}    KO patient viewmodel
         *  @param  config.activity             {String}    KO activity viewmodel
         *  @param  config.onSelect             {Function}  Raised when the user chooses a set of data to map
         */

        function show( config ) {

            var
                node = Y.Node.create( '<div></div>' ),
                jq = {},                                                    //  eslint-disable-line no-unused-vars

                currentPatient = config.patient || null,                    //  eslint-disable-line no-unused-vars
                currentActivity = config.activity || null,                  //  eslint-disable-line no-unused-vars
                onSelect = config.onSelect || Y.dcforms.nullCallback,       //  eslint-disable-line no-unused-vars

                modal,

                btnSelect = {
                    name: 'SELECTLABDATA',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.SELECT' ),        //  TODO: new translation
                    isDefault: true,
                    action: onSelectButtonClick
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.CANCEL' ),        //  TODO: new translation
                    isDefault: true,
                    action: onCancelButtonClick
                },

                buttonSet = [ btnSelect, btnCancel ];

            async.series(
                [
                    loadJade,
                    createModal,
                    initKoLabdataTable
                ],
                onModalReady
            );

            //  X. Load modal jade template (stub)
            function loadJade( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'chooselabdata_modal',
                    'FormEditorMojit',
                    {},
                    node,
                    itcb
                );
            }

            //  X. Instantiate the modal
            function createModal( itcb ) {

                modal = Y.doccirrus.DCWindow.dialog( {
                    title: i18n( 'FormEditorMojit.chooseprinter_modal.title' ),
                    type: 'info',
                    window: {
                        width: 'large',
                        maximizable: true,
                        buttons: { footer: buttonSet }
                    },
                    message: node
                } );

                jq = {
                    //  TODO: this
                };

                itcb( null );
            }

            function initKoLabdataTable( itcb ) {
                //alert( 'initialize labdata table here' );
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
                //alert( 'onSelectButtonClick' );
            }

            /**
             *  User pressed the cancel button, just close the modal
             *  Future: might delete the cached PDF here on a timeout, will be cleared on next restart
             */

            function onCancelButtonClick() {
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).chooseLabdata = {
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
            'dcforms-utils'
        ]
    }
);