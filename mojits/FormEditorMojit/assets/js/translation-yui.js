/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  YUI module to show translation dialog for FEM fields
 */

/*eslint prefer-template:0 strict:0*/
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-translation',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            NO_VALUE = i18n( 'FormEditorMojit.translations_modal.LBL_NO_VALUE' ),
            PLEASE_USE_EDITOR = i18n( 'FormEditorMojit.translations_modal.LBL_PLEASE_USER_EDITOR' );

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        /**
         *  Opens a dialog for editing table translations
         *
         *  TODO: tidy and reimplement with DCWindow and editable ko table
         *
         *  @param  {Object}    template    A form template
         *  @param  {Function}  callback    Called when modal is closed
         */

        Y.dcforms.editTranslations = function( template, callback ) {

            /**
             *  Creates a table showing values and translation status of elements in EN and DE
             *
             *  @returns    {String}    HTML table of edit
             */

            function renderTable(divId) {
                var
                    i,
                    j,
                    skipElemTypes = [ ],
                    element,
                    html,
                    mini;

                html = '' +
                    '<table class="table table-hover">' +
                        '<tr>' +
                            '<td>DOM-ID</td>' +
                            '<td>' + genderSymbol( 'n' ) + i18n('FormEditorMojit.translations_modal.LBL_GERMAN_DEFAULT') + '</td>' +
                            '<td>' + i18n('FormEditorMojit.translations_modal.LBL_OK') + '</td>' +
                            '<td>' + genderSymbol( 'f' ) + i18n('FormEditorMojit.translations_modal.LBL_GERMAN') + '</td>' +
                            '<td>' + i18n('FormEditorMojit.translations_modal.LBL_OK') + '</td>' +
                            '<td>' + genderSymbol( 'm' ) + i18n('FormEditorMojit.translations_modal.LBL_GERMAN') + '</td>' +
                            '<td>' + i18n('FormEditorMojit.translations_modal.LBL_OK') + '</td>' +
                            '<td>' + genderSymbol( 'n' ) + i18n('FormEditorMojit.translations_modal.LBL_ENGLISH') + '</td>' +
                            '<td>' + i18n('FormEditorMojit.translations_modal.LBL_OK') + '</td>' +
                        '</tr>';

                if( Y.config.debug ) {
                    Y.log('Translation: ' + JSON.stringify(Y.dcforms.il8nDict, undefined, 2));
                }

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        element = template.pages[i].elements[j];

                        if ( -1 === skipElemTypes.indexOf( element.elemType ) ) {
                            html = html +
                                '<tr>' +
                                '<td>' + element.elemId + '</td>' +
                                '<td>' + makeInput(element, 'de') + '</td>' +
                                '<td>' + makeButton(element, 'de') + '</td>' +
                                '<td>' + makeInput(element, 'de_f') + '</td>' +
                                '<td>' + makeButton(element, 'de_f') + '</td>' +
                                '<td>' + makeInput(element, 'de_m') + '</td>' +
                                '<td>' + makeButton(element, 'de_m') + '</td>' +
                                '<td>' + makeInput(element, 'en') + '</td>' +
                                '<td>' + makeButton(element, 'en') + '</td>' +
                                '</tr>';
                        }

                    }
                }

                html = html + '</table>';

                html = '' +
                    '<table noboroder="noborder" width="100%">' +
                    '<tr>' +
                    '<td width="100px" valign="top"><div id="divMiniForm">loading...</div></td>' +
                    '<td width="20px"></td>' +
                    '<td valign="top">' + html + '</td>' +
                    '</tr>' +
                    '</table>';

                $('#' + divId).html(html);

                mini = Y.dcforms.createCanvasMini( template, 200, 'divMiniForm' );

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {

                        element = template.pages[i].elements[j];

                        bindInput( element, 'de', mini );
                        bindButton( element, 'de' );
                        bindInput( element, 'de_f', mini );
                        bindButton( element, 'de_f' );
                        bindInput( element, 'de_m', mini );
                        bindButton( element, 'de_m' );
                        bindInput( element, 'en', mini );
                        bindButton( element, 'en' );

                    }
                }

            }

            /**
             *  Element DOM IDs are derived from element UIDs, to simplify event handling
             *
             *  @param  elementUid  {String}    Unique to a single instance of dcforms-element
             *  @param  lang        {String}    Two digit language code
             *  @param  isButton    {Bool}      Whether for dirty bit or value
             */

            function getDomId(elementUid, lang, isButton) {
                return 'e' + elementUid + 'trans' + (isButton ? 'btn' : '') + lang;
            }

            /**
             *  Render a single table cell representing an element value, according to element type
             *
             *  @param  element {Object}    A dcforms element object
             *  @param  lang    {String}    ('en'|'de') default translation to show
             */

            function makeInput(element, lang) {
                var
                    domId = getDomId(element.UID, lang, false),
                    dv = element.defaultValue[lang],
                    html;

                switch(element.elemType) {

                    case 'checkbox':
                    case 'togglebox':
                    case 'checkboxtrans':
                    case 'label':               //  deliberate fallthrough
                    case 'input':
                        html = '<input ' +
                            'class="form-control" ' +
                            'type="text" ' +
                            'id="' + domId + '" ' +
                            'value="' + dv + '"' +
                            'style="width: 100%" ' +
                            '/>';
                        break;

                    case 'textmatrix':          //  deliberate fallthrough
                    case 'date':                //  deliberate fallthrough
                    case 'textarea':            //  deliberate fallthrough
                    case 'radio':               //  deliberate fallthrough
                    case 'radiotrans':          //  deliberate fallthrough
                    case 'dropdown':
                        html = formatTextArea( element, lang, dv );
                        break;

                    case 'image':
                        html = formatImageType( dv );
                        break;

                    case 'table':
                        html = formatTableType( element, lang, dv );
                        break;

                    default:
                        html = 'Untranslated element type: ' + element.elemType;
                        break;
                }

                return html;
            }

            /**
             *  Make HTML for a button to toggle translation 'approved state
             *
             *  @param  element     {object}    A dcforms element object
             *  @param  lang        {string}    ('en'|'de')
             *  @returns            {string}
             */

            function makeButton(element, lang) {
                var
                    domId = getDomId(element.UID, lang, true),
                    icon = element.translationDirty[lang] ? 'fa-square-o' : 'fa-check-square-o',
                    html;

                html = '<button ' +
                            'type="text" ' +
                            'class="form-control" ' +
                            'id="' + domId + '" ' +
                            'value="' + element.defaultValue[lang] + '"' +
                            '><i class="fa ' + icon + '"></i></button>';

                return html;

            }

            /**
             *  Render an image value, given a reference to a media object
             *
             *  @param  mediaId     {String}    _is of a media object
             */

            function formatImageType(mediaId) {
                var
                    thumbUrl,
                    imgUrl,
                    html;

                imgUrl = '/media/' + mediaId + '_original.IMAGE_JPEG.jpg';
                imgUrl = Y.doccirrus.infras.getPrivateURL( imgUrl );

                thumbUrl = '/media/' + mediaId + '_200x-1.IMAGE_JPEG.jpg';
                thumbUrl = Y.doccirrus.infras.getPrivateURL( thumbUrl );

                if (mediaId.length > 30) {
                    mediaId = mediaId.substring(0, 27) + '...';
                }

                html = '<a href="' + imgUrl + '" target="_new">' + mediaId + '<br/>' +
                    '<img src="' + thumbUrl + '" width="200px" />' +
                    '</a><br/>';

                if ( '' === mediaId.trim() ) { html = '<small><i>' + NO_VALUE + '</i></small><br/>'; }
                html = html + '<small><i>' + PLEASE_USE_EDITOR + '</i></small>';

                return html;
            }

            /**
             *  Render a text or list type element value into an editable textarea
             *
             *  @param  element {object}    A dcforms element object
             *  @param  text    {string}    Default value of an element
             *  @returns        {string}
             */

            function formatTextArea(element, lang, text) {
                var html;

                text = text.replace(new RegExp('<', 'g'), '&lt;');
                text = text.replace(new RegExp('>', 'g'), '&gt;');
                text = text.replace(new RegExp('{newline}', 'g'), '\n');

                html = '' +
                    '<textarea ' +
                        'id="' + getDomId(element.UID, lang, false) + '" ' +
                        'rows="5" ' +
                        'style="width: 100%" ' +
                        'class="form-control"' +
                    '>' +
                    text +
                    '</textarea>';

                return html;
            }

            /**
             *  Show table columns and massage requesting the user edit this type in the element properties
             *
             *  @param  element {Object}
             *  @param  lang    {String}
             *  @param  value   {String}
             *  @return         {string}    HTML
             */

            function formatTableType(element, lang, serialized ) {
                var
                    lines = serialized.split( '\n' ),
                    parts,
                    line,
                    html = '',
                    i;

                for ( i = 0; i < lines.length; i++ ) {
                    line = lines[i];
                    if ( '**' === line.substr( 0, 2 ) ) {
                        html = html + '<b>' + line.substr( 2 ) + '</b><br/>\n';
                    } else {
                        if ( '' !== line.trim() ) {
                            parts = line.split( '|' );
                            if ( parts[3] ) {
                                html = html + '<small>' + parts[3] + '</small><br/>\n';
                            }
                        }
                    }
                }

                if ( '' === serialized.trim ) {
                    html = '<small><i>' + NO_VALUE + '</i></small><small><br/>';
                }

                html = html + '<small><i>' + PLEASE_USE_EDITOR + '</i></small>';

                return html;
            }

            /**
             *  Add event listeners for change to the default value of an input type element
             *
             *  @param  element     {Object}    A dcforms element object
             *  @param  lang        {String}    ('en'|'de')
             *  @param  mini        {Object}    Minimap of form
             */

            function bindInput( element, lang, mini ) {

                function onInputChange() {
                    //  note that this will have to deal with more than two languages in future
                    var
                        userVal = jqInput.val();

                    userVal = userVal.replace( new RegExp("\n", 'g'), '{newline}' );  // eslint-disable-line no-control-regex
                    userVal = userVal.replace( new RegExp("&lt;", 'g'), '<' );
                    userVal = userVal.replace( new RegExp("&gt;", 'g'), '>' );

                    //console.log( '(****) setting default value for ' + element.elemId + ' ' + lang + ': ', userVal );

                    //element.setTranslationDirty( otherLang, true );
                    element.defaultValue[ lang ] = userVal;
                    element.isDirty = true;

                    //console.log( '(****) new default values: ', element.defaultValue );
                }

                function onFocusOut() {
                    onInputChange();
                    mini.redraw( '' );
                }

                function onFocusIn() {
                    mini.redraw( element.elemId );
                }

                var jqInput = $( '#' + getDomId( element.UID, lang, false ) );
                jqInput.off( 'keyup.translate' ).on( 'keyup.translate', onInputChange );
                jqInput.off( 'change.translate' ).on( 'change.translate', onInputChange );
                jqInput.off( 'focusin.translate' ).on( 'focusin.translate', onFocusIn );
                jqInput.off( 'focusout.translate' ).on( 'focusout.translate', onFocusOut );
            }

            /**
             *  Set event handler for 'approve' translation button for some element and language
             *
             *  @param element  {Object}    A dcforms element object
             *  @param lang     {String}    ('en'|'de')
             */

            function bindButton(element, lang) {

                function onToggleOKButton() {
                    element.setTranslationDirty(lang,  !element.translationDirty[lang]);
                }

                var jqButton = $('#' + getDomId(element.UID, lang, true));
                jqButton.off('click.translate').on('click.translate', onToggleOKButton);
            }

            //  event handlers

            function onDirtyFieldUpdated(evt) {
                var
                    domId = getDomId(evt.source, evt.lang, true),
                    icon = evt.isDirty ? 'fa-square-o' : 'fa-check-square-o';

                $('#' + domId).html('<i class="fa ' + icon + '"></i>');
            }

            function genderSymbol( gender ) {
                var icon = 'fa-genderless';
                switch( gender ) {
                    case 'm':   icon = 'fa-mars';   break;
                    case 'f':   icon = 'fa-venus';  break;
                }
                return '<i class="fa ' + icon + '"></i>&nbsp;';
            }

            //  subscribe to events from this template

            Y.dcforms.event.off('formTranslationDirty', 'translation-yui.js');
            Y.dcforms.event.on('formTranslationDirty', 'translation-yui.js', onDirtyFieldUpdated);

            //  show the modal

            function onModalLoaded() {
                renderTable('divEditTranslations');
            }

            function createModalWindow() {

                var
                    modal,
                    node =  Y.Node.create( '<div id="divEditTranslations"></div>' ),
                    windowDefinition = {
                        className: 'DCWindow-Resize',
                        bodyContent: node,
                        title: i18n( 'FormEditorMojit.translations_modal.TITLE' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        height: ( $( window ).height() - 50 ),
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize']
                        }
                    };

                modal = new Y.doccirrus.DCWindow( windowDefinition );
                onModalLoaded();

                modal.after( 'visibleChange', onModalVisibleChange );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { modal.centered(); }, 1 );

                function onModalVisibleChange() {
                    if( modal.get( 'visible' ) ) { return; }

                    template.setUserLang( template.userLang, onUpdateLang );

                    function onUpdateLang() {
                        template.render( onRedrawAfterClose );
                    }

                    function onRedrawAfterClose() {
                        Y.log( 'Closed translations modal.', 'debug', NAME );
                        if ( callback ) { return callback(); }
                    }

                }

            }

            createModalWindow();

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-canvas-mini' ]
    }
);