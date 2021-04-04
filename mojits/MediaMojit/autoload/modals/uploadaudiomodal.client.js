/**
 *  Modal for uploading audio, or selecting from existing attachments in casefile
 *
 *  Audio will then be used in forms or activity attachments, and may be shared via patient portal
 *
 *  TEMPORARY / requirements currently being discussed
 *
 *  User: strix
 *  Date: 2019-03-28
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'dcaudiouploadmodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus.modals' ).audioUpload = {

            /**
             *  Show the modal and set upload / ownership options of audio files
             *
             *  @param  {Object}    settings
             *
             *  Options for media upload / ownership
             *
             *  @param  {String}    settings.ownerCollection    Type of owner (activity, document, etc)
             *  @param  {String}    settings.ownerId            Database_id of object which will own recorded audio
             *  @param  {String}    settings.patientRegId       Used when passing data to and from the patient portal
             *  @param  {String}    settings.label              Media label, set to 'user' unless automatically created
             *
             *  Callback when new audio files are created and uploaded to media collection.
             *
             *  @param  {Function}  settings.onAdd              Of the form fn( err, mediaObj )
             */

            show: function( settings ) {
                var
                    onAdd = settings.onAdd || Y.dcforms.nullCallback,

                    ownerCollection = settings.ownerCollection || 'test',
                    ownerId = settings.ownerId || 'test',
                    patientRegId = settings.patientRegId || '',
                    label = settings.label || 'user',

                    modal,
                    _nodeObj,
                    node = Y.Node.create( '<div id="divModalAudioUpload"></div>' ),

                    windowDefinition = {
                        className: 'DCWindow-Resize',
                        bodyContent: node,
                        title: i18n( 'general.button.MICROPHONE' ),
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

                node.passToBinder = {
                    'label': label,
                    'ownerCollection': ownerCollection,
                    'ownerId': ownerId,
                    'patientRegId': patientRegId,
                    'keepOld': true,
                    'onAdd': onAddInterdict
                };

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'upload_audio',
                    'MediaMojit',
                    {},
                    node,
                    onViewLoaded
                );

                function onViewLoaded(err, status, nodeObj ) {
                    _nodeObj = nodeObj;
                    Y.log('Microphone input window created.', 'debug', NAME);
                }

                function onAddInterdict( mediaId, mediaMeta ) {
                    onAdd( mediaId, mediaMeta );
                    modal.close();
                }

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