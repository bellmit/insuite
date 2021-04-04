/**
 * User: do
 * Date: 25/02/15  17:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true, -W030*/
/*global YUI, ko*/

YUI.add( 'dctelekardioeditdialog', function( Y ) {

        var
            i18n = Y.doccirrus.i18n;

        function showDialog( patient, callback ) {

            var
                modal,
                node = Y.Node.create( '<div></div>' ),
                selectedOptionA = 'optionA',
                selectedOptionB = 'optionB';

            var dialogModel = {
                patient: patient,
                optionSelected: ko.observable(),
                optionAClick: function() {
                    this.optionSelected( selectedOptionA );
                    modal.getButton( 'SAVE' ).button.enable();
                },
                optionBClick: function() {
                    this.optionSelected( selectedOptionB );
                    modal.getButton( 'SAVE' ).button.enable();
                },
                optionATitleI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionA.title' ),
                optionAShortDescriptionI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionA.shortDescription' ),
                optionADescriptionI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionA.description' ),
                optionBTitleI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionB.title' ),
                optionBShortDescriptionI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionB.shortDescription' ),
                optionBDescriptionI18n: i18n( 'InCaseMojit.cardio.telecardioEditDialog.optionB.description' )
            };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'TelekardioEditDialog',
                'InCaseMojit',
                {},
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-TelekardioDialog',
                        bodyContent: node,
                        title: i18n( 'InCaseMojit.cardio.telecardioEditDialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_EDIT,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        modal.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    label: Y.doccirrus.i18n( 'general.button.CONFIRM' ),
                                    action: function( e ) {
                                        var optionSelected = ko.unwrap( dialogModel.optionSelected );
                                        e.target.button.disable();
                                        if(  optionSelected === selectedOptionA || optionSelected === selectedOptionB ) {
                                            callback && callback( optionSelected );
                                            modal.close();
                                        } else {
                                            modal.close();
                                            throw new Error( 'Unknown option selected.' );
                                        }
                                    }
                                } )
                            ]
                        }
                    } );

                    modal.getButton( 'SAVE' ).button.disable();
                    ko.applyBindings( dialogModel, node.getDOMNode() );
                }
            );
        }

        Y.namespace( 'doccirrus.modals' ).telekardioEditDialog = {
            show: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
