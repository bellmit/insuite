/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Simple YUI module, central place to store paper size data
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $, jQuery */

YUI.add(
    /* YUI module name */
    'dcforms-reorder',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        /**
         *  Open a modal dialog to reorder the elements on a page qith jQuery sortable
         *  @param page
         */

        Y.dcforms.reorderElements = function(page) {

            var
                sortableId = 'olReorder' + page.domId;

            /**
             *  Render the modal
             */

            function elementsToHtml() {
                var
                    html = '',
                    i;

                html = html + '<ol class="drag_form_element" id="' + sortableId + '">';

                for (i = 0; i < page.elements.length; i++) {
                    html = html +
                        '<li class="drag_form_element" formelemid="' + page.elements[i].elemId + '"><button class="btn btn-info">' +
                            page.elements[i].elemId + '&nbsp;' +
                            '<small>(' + page.elements[i].elemType + ')</small>' +
                            '<div style="display:none;" class="drag_dom_id">' + page.elements[i].domId + '</div>' +
                        '</button></li>';
                }

                html = html + '</ol>';

                return html;
            }

            /**
             *  Once list of elements has been added to the DOM, make them sortable
             */

            function makeSortable() {
                var adjustment;

                $('ol.drag_form_element').sortable({
                    group: 'drag_form_element',
                    pullPlaceholder: false,
                    // animation on drop
                    onDrop: function  (item, targetContainer, _super) {

                        var clonedItem = $('<li/>').css({height: 0});

                        item.before(clonedItem);
                        clonedItem.animate({'height': item.height()});

                        item.animate(clonedItem.position(), function  () {
                            clonedItem.detach();
                            _super(item);
                        });
                    },

                    // set item relative to cursor position
                    onDragStart: function ($item, container, _super) {
                        var offset = $item.offset(),
                            pointer = container.rootGroup.pointer;

                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };

                        _super($item, container);
                    },
                    onDrag: function ($item, position) {
                        $item.css({
                            left: position.left - adjustment.left,
                            top: position.top - adjustment.top
                        });
                    }
                });

            }

            /**
             *  Called when modal 'OK/Save' button is pressed
             */


            function onModalApply() {
                Y.log('Reorder all elements on page ' + page.name + '...', 'info', NAME);

                var
                    i,
                    tempElement,
                    newElements = [];

                $('div.drag_dom_id').each(function (idx) {
                    var uniqueDomId = jQuery.trim($(this).html());
                    Y.log('Searching page for ' + idx.toString() + ' --> ' + uniqueDomId, 'debug', NAME);
                    tempElement = page.getElementByDomId(uniqueDomId);
                    newElements.push(tempElement);
                    Y.log('Reordered: ' + tempElement.domId + ' ('  + tempElement.elemType + ')', NAME);
                });


                //  remove all elements from the DOM, render() will add them back in new order
                for (i = 0; i < page.elements.length; i++) {
                    page.elements[i].jqSelf().remove();
                }

                page.elements = newElements;

                page.redraw();
                page.onDirty();
                Y.dcforms.clearModal();
            }

            Y.doccirrus.comctl.setModal(Y.doccirrus.i18n('FormEditor.TITLE_REORDER'), elementsToHtml(), true, onModalApply);
            makeSortable();

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);