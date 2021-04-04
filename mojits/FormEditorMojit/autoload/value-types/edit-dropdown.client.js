/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI model for flyover for dropdown elements, showing options (DOM textarea hovers over canvas)
 */

/*eslint prefer-template:0, strict:0 */

/*global YUI, $ */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-editvalue-dropdown',

    /* Module code */
    function( Y , NAME ) {

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        Y.dcforms.createDropdownValueEditor = function(selectedOn, elem, callWhenChanged) {
            var
                //stageDomId = elem.page.getDomId(),
                stageDomId = 'divFloatEditor',
                self = {
                    //  public methods
                    'inRender': false,
                    'jqEditor': $('#' + stageDomId),
                    'jqFloat': null,
                    'jqTxt': null,
                    'jqDivItemContainer': null,
                    'bounds': null,
                    'setValue': setValue,
                    'updateItems': updateItems,
                    'reposition': reposition,
                    'destroy': destroy
                };

            if (!self.jqEditor.length) {
                $('body').prepend('<div id="' + stageDomId + '" style="position: relative;"></div>');
                self.jqEditor = $('#' + stageDomId + '');
            }

            function render() {

                var
                    bounds = Y.dcforms.handle.getBounds(elem, selectedOn),
                    items = elem.renderer.getItems(),
                    i,
                    html = '' +
                        '<div ' +
                            'id="' + stageDomId + 'divFloatEditor" ' +
                            'style="position: absolute; left: ' + bounds.left + ';top: ' + (bounds.top  + bounds.lineHeight) + ';"' +
                            '>' +
                            '<textarea ' +
                                'rows="1" ' +
                                'id="' + stageDomId + 'taFloatEditor" ' +
                                'style="width: ' + bounds.width + 'px; height: ' + bounds.height + 'px; overflow: hidden;"' +
                                ' /></textarea>' +
                            '<div id="' + stageDomId + 'itemset">' +
                            getItemsAsHtml(elem.renderer.getItems()) +
                            '</div>' +
                        '</div>';

                for (i = 0; i < items.length; i++) {
                    $('#divDD' + i).off('click').on('click', makeOptionSelect(items[i]));
                }

                self.bounds = bounds;
                self.jqEditor.html(html);
                self.jqDivItemContainer = $('#' + stageDomId + 'itemset');

                self.jqFloat = $('#' + stageDomId + 'divFloatEditor');
                self.jqFloat.css('position', 'absolute');
                self.jqFloat.css('left', bounds.left + 'px').css('top', (bounds.top + bounds.lineHeight) + 'px');
                self.jqFloat.css('width', bounds.width + 'px').css('height', bounds.height + 'px');
                self.jqFloat.css('z-index', 2001);

                for (i = 0; i < items.length; i++) {
                    $('#ulDDA' + elem.getDomId() + i).off('click').on('click', makeOptionSelect(items[i]));
                }

                self.jqTxt = $('#' + stageDomId + 'taFloatEditor');

                //  set here rather than in HTML to prevent "... injection
                self.jqTxt.val( elem.renderer.removeInlineBreaks( elem.display.replace('*', '') ) );
                //self.jqTxt.css('font', toFont);

                self.jqTxt.off('keyup').on('keyup', onTaKeyUp);
                self.jqTxt.off('keydown').on('keydown', onTaKeyDown);
                self.jqTxt.off('change').on('change', onTaKeyUp);
                self.jqTxt.off('blur').on('blur', onBlur);

                self.jqMenu = $('#ulDDMenu' + elem.getDomId());
                self.jqMenu.show();
                self.jqMenu.focus();
                self.jqMenu.off('blur').on('blur', onBlur);

                //TODO: keyboard events
            }

            function getItemsAsHtml(items) {
                var i, html, itemValue, hideThis;

                html = '<ul id="ulDDMenu' + elem.getDomId() + '" class="dropdown-menu" role="menu">';

                for (i = 0; i < items.length; i++) {
                    hideThis = '';

                    itemValue = items[i].value.replace( new RegExp( '{{br}}', 'g' ), '<br/>' );

                    //  in edit mode items are displayed with embeds
                    if ( 'edit' !== elem.page.form.mode ) {
                        itemValue = elem.page.cleanUnmappedEmbeds( itemValue );

                        //  if nothing except newlines then do not display this
                        if ( itemValue.replace( new RegExp( '<br/>', 'g' ), '' ).trim() === '' ) {
                            hideThis = ' style="display: none;"';
                        }
                    }

                    html = html +
                        '<li role="presentation"' + hideThis + '>' +
                        '<a id="ulDDA' + elem.getDomId() + i + '" role="menuitem" tabindex="-1" href="javascript:void(0);">' +
                        itemValue +
                        '</a>' +
                        '</li>';
                }

                html = html + '</ul>';
                return html;
            }

            function makeOptionSelect(item) {
                return function onDropdownEditorSelect(evt) {
                    Y.log('selected dropdown item: ' + item.value, 'debug', NAME);
                    callWhenChanged(item.value, true);
                    evt.preventDefault();
                };
            }

            function destroy() {
                self.jqEditor.html('');
            }

            function onTaKeyUp() {
                callWhenChanged(self.jqTxt.val(), false);
                self.jqDivItemContainer.html(getItemsAsHtml(elem.renderer.getItems()));
            }


            /**
             *  Listen for control keys (tab, shift, etc)
             *
             *  credit: http://stackoverflow.com/questions/3362/capturing-tab-key-in-text-box
             */

            function onTaKeyDown(evt) {
                /*
                if(evt.preventDefault) {
                    evt.preventDefault();
                }
                */

                if (9 === evt.keyCode) {
                    elem.page.form.tabNext(selectedOn, elem.elemId);
                    return false;
                }
            }

            function onBlur() {
                //  lost focus, should cause this editor to be destroyed
                if ('edit' !== elem.page.form.mode) {
                    elem.page.form.setSelected(selectedOn, null);
                }
            }

            /**
             *  Canvas position to move to
             *  @param  x
             *  @param  y
             */

            function reposition() {
                if ( !elem ) { return destroy(); }

                var bounds = Y.dcforms.handle.getBounds( elem, selectedOn );

                if ( !bounds.allOk && elem === elem.page.form.selectedElement ) {
                    //  render in progress or canvas not visible
                    Y.log('Could not get element bounds, waiting for canvas to be available', 'debug', NAME);
                    window.setTimeout( function() { reposition(); }, 300 );
                    return;
                }

                self.jqFloat.css('left', bounds.left + 'px').css('top', bounds.top + (bounds.lineHeight) + 'px');
            }

            function setValue(newValue) {
                self.jqTxt.val( elem.renderer.removeInlineBreaks( newValue ) );
            }

            function updateItems( ) {
                var
                    items = elem.renderer.getItems(),
                    itemsHtml = getItemsAsHtml( items ),
                    i;

                $( '#' + stageDomId + 'itemset' ).html( itemsHtml );

                //  rebind click events
                for ( i = 0; i < items.length; i++ ) {
                    $( '#divDD' + i).off( 'click' ).on( 'click', makeOptionSelect(items[i] ) );
                }

                //  pop dropdown
                self.jqMenu = $( '#ulDDMenu' + elem.getDomId() );
                self.jqMenu.show();
                self.jqMenu.focus();
            }

            render();

            return self;
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);