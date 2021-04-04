/**
 * User: strix
 * Date: 05/04/15  14:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, $, window */

'use strict';

YUI.add( 'dcresizepapermodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n;

        function resizeTemplate(template, toWidth, toHeight) {

            function onTemplateSaved() {
                window.location.reload();
            }

            var
                scale = {
                    x: (toWidth / template.paper.width),
                    y: (toHeight / template.paper.height)
                },
                page,
                element,
                i, j;

            for (i = 0; i < template.pages.length; i++) {
                page = template.pages[i];
                for (j = 0; j < page.elements.length; j++) {
                    element = page.elements[j];

                    element.mm.left = element.mm.left * scale.x;
                    element.mm.top = element.mm.top * scale.y;
                    element.mm.width = element.mm.width * scale.x;
                    element.mm.height = element.mm.height * scale.y;

                    element.mm.lineHeight = element.mm.lineHeight * scale.y;
                }

            }

            template.paper.width = toWidth;
            template.paper.height = toHeight;

            template.autosave(onTemplateSaved);

        }

        Y.namespace( 'doccirrus.modals' ).resizePaper = {
            show: function( template ) {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' );

                function onResizeButtonClicked () {
                    var
                        toWidth = parseFloat($('#txtNewFormWidth').val()),
                        toHeight = parseFloat($('#txtNewFormHeight').val());

                    if (isNaN(toWidth) || isNaN(toHeight)) {
                        return;
                    }

                    resizeTemplate(template, toWidth, toHeight);
                }

                function onWindowCreated() {


                    node.passToBinder = {
                        'template': template
                    };

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'forms_resize',
                        'FormEditorMojit',
                        {},
                        node,
                        onViewLoaded
                    );
                }

                function onViewLoaded() {
                    Y.log('Paper resize window created.', 'debug', NAME);
                }

                function createModalWindow() {

                    var
                        closeButton = Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        resizeButton = Y.doccirrus.DCWindow.getButton( 'OK', {
                            label: i18n('FormEditorMojit.generic.BTN_CHANGE_FORMAT'),
                            isDefault: true,
                            action: onResizeButtonClicked
                        }),
                        windowDefinition = {
                            className: 'DCWindow-Resize',
                            bodyContent: node,
                            title: i18n('FormEditorMojit.generic.LBL_PAPER_SIZE'),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [ closeButton, resizeButton ]
                            }
                        };

                    modal = new Y.doccirrus.DCWindow( windowDefinition );
                    onWindowCreated();
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

