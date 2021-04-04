/**
 * User: strix
 * Date: 2016-04-27  14:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'dccamerainputmodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus.modals' ).cameraInput = {
            show: function( settings ) {
                var
                    onChange = settings.onChange || Y.dcforms.nullCallback,
                    onAdd = settings.onAdd || Y.dcforms.nullCallback,
                    ownerCollection = settings.ownerCollection || 'test',
                    ownerId = settings.ownerId || 'test',
                    patientRegId = settings.patientRegId || '',
                    label = settings.label || 'user',
                    modal,
                    _nodeObj,
                    node = Y.Node.create( '<div id="divModalCameraInput"></div>' );

                function createModalWindow() {

                    var
                        windowDefinition = {
                            className: 'DCWindow-Resize',
                            bodyContent: node,
                            title: i18n( 'general.button.WEBCAM' ), //---
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: false,
                            width: 560,
                            height: 550,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [ ]
                            },
                            after: {
                                destroy: function() {
                                    if(_nodeObj){
                                        _nodeObj.destroy();
                                    }
                                }
                            }
                        };

                    modal = new Y.doccirrus.DCWindow( windowDefinition );

                    onWindowCreated();

                    function onWindowCreated() {

                        node.passToBinder = {
                            'label': label,
                            'openCamera': true,
                            'ownerCollection': ownerCollection,
                            'ownerId': ownerId,
                            'patientRegId': patientRegId,
                            'keepOld': true,
                            'onChange': onChange,
                            'onAdd': onAddInterdict
                        };

                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            'img_edit',
                            'MediaMojit',
                            {},
                            node,
                            onViewLoaded
                        );
                    }

                    function onViewLoaded(err, status, nodeObj ) {
                        _nodeObj = nodeObj;
                        Y.log('Camera input window created.', 'debug', NAME);
                    }

                    function onAddInterdict( mediaId, mediaMeta ) {
                        onAdd( mediaId, mediaMeta );
                        modal.close();
                    }

                }

                createModalWindow();
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);