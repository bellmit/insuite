
/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing checkboxes
 *  (name is legacy, was originally boolean but checkboxes are now have more editable properties than just checked)
 *
 *  TODO: legacy, update this to neater KO pattern with a jade template
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-booleaneditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms checkbox types.', 'debug', NAME);

        /**
         *  Checkbox is the only boolean type for the moment
         *
         *  @param  domId           {String}        Dom ID to render this into
         *  @param  initialValue    {String}        Rendering context (edit/fill/renderpdf/etc)
         *  @param  element         {Object}        dc-forms element object
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.booleanEditor = function(domId, initialValue, element, onChange) {
            var
                i18n = Y.doccirrus.i18n,

                jq = {},                                //  cached jQuery selectors
                txtValue = initialValue,                //  internal representation of dcforms-element value
                callWhenChanged = onChange;             //  all-purpose 'change' event

            /**
             *  Discover if this element is checked by default
             *  @param      txt {String}    Value of this element
             *  @return         {Boolean}   True if checked by default, false if not
             */

            function txtToBool(txt) {
                while(-1 !== txt.indexOf('**')) {
                    txt = txt.replace('***', '*[bold]');
                    txt = txt.replace('**', '[bold]');
                }

                return (txt.indexOf('*') >= 0);
            }

            /**
             *  Get the label value for this element
             */

            function txtToLabel(txt) {
                var label = txt.replace(new RegExp('{newLine}', 'g'),'\n');

                //  double stars indicate bold text, single star indicates checked checkbox
                //  to allow typing of double stars we need to allow an extra single star
                while(-1 !== label.indexOf('**')) {
                    label = label.replace('***', '*[bold]');
                    label = label.replace('**', '[bold]');
                }

                label = label.replace(new RegExp('<br>', 'g'),'\n');
                label = label.replace(new RegExp('<br/>', 'g'),'\n');

                label = label.replace('[3mm]*','');
                label = label.replace('[4mm]*','');
                label = label.replace('[5mm]*','');
                label = label.replace('[7mm]*','');

                label = label.replace('*[3mm]','');
                label = label.replace('*[4mm]','');
                label = label.replace('*[5mm]','');
                label = label.replace('*[7mm]','');

                label = label.replace('[3mm]','');
                label = label.replace('[4mm]','');
                label = label.replace('[5mm]','');
                label = label.replace('[7mm]','');
                //label = label.replace('*','');
                //label = label.replace('*','');

                if ('*' === label.substr(0, 1)) {
                    label = label.substr(1);
                }

                return label;
            }

            function txtToSpriteSize(txt) {
                var spriteSize = 0;
                if (txt.indexOf('[3mm]') >= 0) { spriteSize = '[3mm]'; }
                if (txt.indexOf('[4mm]') >= 0) { spriteSize = '[4mm]'; }
                if (txt.indexOf('[5mm]') >= 0) { spriteSize = '[5mm]'; }
                if (txt.indexOf('[7mm]') >= 0) { spriteSize = '[7mm]'; }
                return spriteSize;
            }

            /**
             *  Update form elements with stored value
             */

            function updateFields() {
                $('#cb' + domId).prop('checked', txtToBool(txtValue));
                $('#taLabel' + domId).val(txtToLabel(txtValue));
                $('#selSpriteSize' + domId).val(txtToSpriteSize(txtValue));
            }

            //  EVENT HANDLERS

            function onCheckboxChanged() {
                //txtValue = (jq.cb.prop('checked') ? '*' : '') + txtToLabel(txtValue);
                //callWhenChanged(txtValue);
                onTaLabelChanged();
            }

            function onTaLabelChanged() {
                var
                    spriteSize = $('#selSpriteSize' + domId).val(),
                    maxLen = $('#selCbMaxLen' + domId).val(),
                    cleanedValue = jq.ta.val(); //jQuery.trim(jq.ta.val());

                while (-1 !== cleanedValue.indexOf('**')) {
                    cleanedValue = cleanedValue.replace('***', '*[bold]');
                    cleanedValue = cleanedValue.replace('**', '[bold]');
                }

                if (true === txtToBool(cleanedValue)) {
                    jq.cb.prop('checked', true);
                    //cleanedValue = cleanedValue.replace('*', '');
                    //cleanedValue = jQuery.trim(cleanedValue);
                    if (0 === cleanedValue.substr(0, 1)) {
                        cleanedValue = cleanedValue.substr(1);
                    }
                }

                element.maxLen = parseInt( maxLen );

                txtValue = spriteSize + (jq.cb.prop('checked') ? '*' : '') + cleanedValue;
                Y.log('txtValue = ' + txtValue);
                callWhenChanged(txtValue);
            }

            //  PUBLIC METHODS

            /**
             *  Public method to render the widget and set initial value
             */

            function render() {
                var
                    selectSpriteSize = '' +
                        '<select id="selSpriteSize' + domId + '" class="form-control">' +
                            '<option value="">' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_SCALE_WITH_FONT' ) + '</option>' +
                            '<option value="[3mm]">3mm</option>' +
                            '<option value="[5mm]">5mm</option>' +
                            '<option value="[7mm]">7mm</option>' +
                            '<option value="[4mm]">4mm (voll)</option>' +
                        '</select>',

                    selectMaxLen = '' +
                        '<select id="selCbMaxLen' + domId + '" class="form-control">' +
                            '<option value=0>' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_CBGROUP_SINGLE' ) + '</option>' +
                            '<option value=999>' + i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_CBGROUP_MULTIPLE' ) + '</option>' +
                        '</select>',

                    editGroups = '' +
                        '<b>Gruppe:</b><br/>' +
                        '<input id="cbGroup' + domId + '" class="form-control" type="text" />' +
                        selectMaxLen +
                        '<div id="divCbGroupButtons"></div>',

                    hasSprite = ( 'checkbox' === element.elemType || 'checkboxtrans' === element.elemType ),

                    editorHtml = '' +
                        '<table ' + 'noborder width="100%">' +
                            '<tr>' +
                                '<td ' + 'valign="top" width="20px">' +
                                    '<label><input type="checkbox" id="cb' + domId + '" /></label>' +
                                '</td>' +
                                '<td ' + 'valign="top">' +
                                    '<textarea id="taLabel' + domId + '" class="form-control"></textarea>' +
                                    selectSpriteSize +
                                    editGroups +
                                '</td>' +
                            '</tr>' +
                        '</table>';

                //  render the controls
                $('#' + domId).html( editorHtml );

                //  set initial value
                updateFields();

                jq.cbGroup = $('#cbGroup' + domId);

                //  set event handler for checkbox and textarea
                jq.cb = $('#cb' + domId);
                jq.cb.change( onCheckboxChanged );

                jq.ta = $('#taLabel' + domId);
                jq.ta.off('keyup.element').on('keyup.element', function() { onTaLabelChanged(); });
                jq.ta.change(function() { onTaLabelChanged(); });

                jq.selSprite = $('#selSpriteSize' + domId);
                jq.selSprite.off('keyup.element').on('keyup.element', function() { onTaLabelChanged(); });
                jq.selSprite.change( function() { onTaLabelChanged(); } );

                if ( !hasSprite ) {
                    jq.selSprite.hide();
                }

                jq.selMaxLen = $('#selCbMaxLen' + domId);
                jq.selMaxLen.val( element.maxLen );

                jq.selMaxLen.off('keyup.element').on('keyup.element', function() { onTaLabelChanged(); });
                jq.selMaxLen.change(function() { onTaLabelChanged(); });

                jq.cbGroup.val( getCbGroupName() );
                jq.cbGroup.off( 'keyup.element' ).on( 'keyup.element', function () { onCbGroupChanged(); } );

                jq.divCbGroupButtons = $( '#divCbGroupButtons' );
                initCbGroupButtons();
                updateSelMaxLenVisibility();
            }

            function initCbGroupButtons() {
                var
                    groups = getExistingGroups(),
                    html = '',
                    i;

                for ( i = 0; i < groups.length; i++ ) {
                    html = html + '<span id="spnCbGroupSC' + groups[i] + '" class="label label-default">' + groups[i] + '</span> ';
                }

                jq.divCbGroupButtons.html( html );

                for ( i = 0; i < groups.length; i++ ) {
                    makeGroupLabelClickHandler( groups[i] );
                }

                function makeGroupLabelClickHandler( groupName ) {
                    $( '#spnCbGroupSC' + groupName )
                        .off( 'click.label' )
                        .on( 'click.label', function() {
                            jq.cbGroup.val( groupName );
                            onCbGroupChanged();
                        } );
                }
            }

            function getCbGroupName() {
                var cbg = element.extra ? element.extra + '' : '';
                cbg = cbg.replace( /\s/g, '' );
                return cbg;
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue(newValue) {
                txtValue = newValue;
                updateFields();
            }

            /**
             *  Show or hide selMaxLen depending on whether this element has a group
             */

            function updateSelMaxLenVisibility() {
                if ( element.extra && '' !== element.extra ) {
                    jq.selMaxLen.show();
                } else {
                    jq.selMaxLen.hide();
                }
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return txtValue;
            }

            /**
             *  Get existing checkbox groups
             */

            function getExistingGroups() {
                var
                    form = element.page.form,
                    groups = [],
                    i, j, page, elem;

                for ( i = 0; i < form.pages.length; i++ ) {
                    page = form.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];
                        if ( elem.elemType === 'checkbox' || elem.elemType === 'checkboxtrans' ) {
                            if ( elem.extra && '' !== elem.extra ) {
                                if ( -1 === groups.indexOf( elem.extra ) ) {
                                    groups.push( elem.extra );
                                }
                            }
                        }
                    }
                }

                groups.sort();
                return groups;
            }

            /**
             *  Get whether this is checked by default
             *
             *  @return     {String}    'true' or 'false', element takes string values for this property
             */

            function isChecked() {
                return txtToBool(txtValue) ? 'true' : 'false';
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @param  newHandler  {Function}  of the form fn(txtSerializedList)
             */

            function setOnChanged(newHandler) {
                callWhenChanged = newHandler;
            }

            function onCbGroupChanged( ) {
                element.extra = jq.cbGroup.val();
                updateSelMaxLenVisibility();
                //  hack, cause save of new group value
                onTaLabelChanged();
            }

            return {
                'render': render,
                'getValue': getValue,
                'setValue': setValue,
                'setOnChanged': setOnChanged,
                'isChecked': isChecked
            };
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);