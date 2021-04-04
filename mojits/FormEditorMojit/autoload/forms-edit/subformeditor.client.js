/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render UI for editing lists of things
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-subformeditor',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding editor for dcforms subform types.', 'debug', NAME);

        /**
         *  Render a table element into generic element div
         *  @param  domId           {Function}      Dom ID to render this into
         *  @param  initialValue    {Function}
         *  @param  onChange        {Function}      Alternate sprite set to overlay existing form
         */

        Y.dcforms.elements.subformEditor = function(domId, initialValue, onChange) {
            var
                jq = { 'me': $('#' + domId) },          //  cached jQuery selectors
                txtValue = initialValue,                //  current value
                callWhenChanged = onChange;             //  general purpose 'onchange' event

            //  EVENT SUBSCRIPTIONS - this should only change when the set of forms does

            //Y.dcforms.event.on('onIsSubformChange', NAME, onSubformsChange );
            //Y.dcforms.event.on('onFormNameChange', NAME, onSubformsChange );

            //  PUBLIC METHODS

            //alert('creating subform edit panel, intial value: ' + initialValue);

            /**
             *  Public method this object into the domId given to constructor
             */

            function render() {
                //  actual rendering is done when we have a list of subforms forms to select from
                Y.dcforms.getFormList('', false, onFormListLoaded);
            }

            /**
             *  Public method to set the value of this control
             *  @param  newValue    {String}    Serialized list
             */

            function setValue(newValue) {
                txtValue = newValue;
                jq.txt.val(newValue);
            }

            /**
             *  Public method to get the value of this control
             *  @return {String}
             */

            function getValue() {
                return txtValue;
            }

            /**
             *  Set a new event handler for when the list changes
             *
             *  @param  newHandler  {Function}  of the form fn(txtSerializedList)
             */

            function setOnChanged( newHandler ) {
                callWhenChanged = newHandler;
            }

            function setTxtVisibility() {
                if ( Y.doccirrus.comctlLib.isObjectId( txtValue ) ) {
                    jq.txt.hide();
                } else {
                    jq.txt.show();
                }
            }

            //  EVENT HANDLERS

            function onFormListLoaded( err, formsList ) {

                if ( err ) {
                    jq.me.html( 'Could not load list of subforms.' );
                    return;
                }

                var
                    userLang = Y.dcforms.getUserLang(),
                    foundSelected = false,
                    html = '',
                    i;

                //alert('forms list: ' + JSON.stringify(formsList));

                function sortFormList( a, b ) {
                    if ( a.title[userLang].toLowerCase() > b.title[userLang].toLowerCase() ) { return 1; }
                    if ( a.title[userLang].toLowerCase() < b.title[userLang].toLowerCase() ) { return -1; }
                    return 0;
                }

                formsList.sort( sortFormList );

                for ( i = 0; i < formsList.length; i++ ) {
                    if ( true === formsList[i].isSubform ) {

                        //  set value to 'Personalienfeld if blank
                        if ( '' === initialValue && 'DC_Personalienfeld' === formsList[i].title[userLang] ) {
                            txtValue = formsList[i].formId;
                        }

                        html = html +
                            '<option ' +
                                'value="' + formsList[i].formId + '"' +
                                ( ( txtValue === formsList[i].formId ) ? ' selected="selected"' : '' ) +
                            '>' +
                            formsList[i].title[userLang] +
                            '</option>' + "\n";

                        if ( txtValue === formsList[i].formId ) {
                            foundSelected = true;
                        }
                    }
                }

                if ( foundSelected ) {
                    html = html + '<option value="">...</option>' + "\n";
                } else {
                    html = html + '<option value="" selected="selected">...</option>' + "\n";
                }

                html = '<select id="selChangeSubform' + domId + '" class="form-control">' + "\n" + html + '</select>' + "\n" + '<br/>';

                html = html + '<input id="txtChangeSubform' + domId + '" type="text" class="form-control" />';

                jq.me.html( html );
                jq.sel = $( '#selChangeSubform' + domId );
                jq.sel.off( 'change.element' ).on( 'change.element', onChangeDropdown );

                jq.txt = $( '#txtChangeSubform' + domId );
                jq.txt.val( txtValue );
                jq.txt.off( 'keyup.element' ).on( 'keyup.element', onTxtChange );

                setTxtVisibility();
            }

            function onChangeDropdown() {
                //  raise event
                txtValue = jq.sel.val();
                jq.txt.val( txtValue );
                setTxtVisibility();
                callWhenChanged( txtValue );
            }

            function onTxtChange() {
                txtValue = jq.txt.val();

                if ( Y.doccirrus.comctlLib.isObjectId( txtValue ) ) {
                    jq.sel.val( txtValue );
                } else {
                    jq.sel.val( '' );
                }

                setTxtVisibility();
                callWhenChanged( txtValue );
            }

            /**
             *  Raised *before* form name or the set of subforms is changed
             *
             *  When this happens we will need to reload the set of subforms when the next save happens, so subscribe
             *
             *  TODO: centralize this, we should have a single list of forms and the utils layer should update it
             */

            //function onSubformsChange() {
            //    Y.dcforms.event.on('onFormSaved', NAME, onSubformsChanged);
            //}

            /**
             *  Raised *after* form name or the set of subforms is changed
             *
             *  We won't need the event listener after this, or it'll reload subforms on every load
             */

            //function onSubformsChanged() {
            //    Y.dcforms.getFormList('', true, onFormListLoaded);
            //    Y.dcforms.event.off('onFormSaved', NAME);
            //}

            return {
                'render': render,
                'getValue': getValue,
                'setValue': setValue,
                'setOnChanged': setOnChanged
            };
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'comctlLib' ]
    }
);