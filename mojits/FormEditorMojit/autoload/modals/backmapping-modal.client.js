/*global YUI, $, async, ko */

'use strict';

YUI.add( 'backmapping-modal', function( Y , NAME ) {
    var
        i18n = Y.doccirrus.i18n;

    /**
     *  Dialog to show progress of loading and printing a KOTable to PDF
     *
     *  @method show
     *  @param  options             {Object}
     *  @param  options.actType     {String}    Activity type
     *  @param  options.userContent {String}    Current default value for userContent of activities of this type
     *  @param  options.onUpdate    {Function}  Called when userContent is edited
     */

    function showBackmappingModal( options ) {

        var
            //self = this,
            actType = options.actType,
            originalUserContent = options.userContent || '',
            actTypeHasForm = false, //  set to true if a form is assigned to this act type
            formRole = '',

            jq = {},
            prefix = 'FormEditorMojit.backmapping_modal.',

            //  textarea selection
            taSelectionStart = originalUserContent.length,
            taSelectionEnd = originalUserContent.length,

            modal,
            model,
            node,

            btnConfirm = {
                name: 'CONFIRM',
                label: i18n( 'FormEditorMojit.datepicker_modal.buttons.SELECT' ),
                isDefault: true,
                action: onConfirmButtonClick
            },

            btnCancel = {
                name: 'CANCEL',
                label: i18n( 'FormEditorMojit.datepicker_modal.buttons.CANCEL' ),
                isDefault: true,
                action: onCancelButtonClick
            },

            modalConfig = {
                className: 'DCWindow-backmappingWizard',
                title: i18n( prefix + 'title' ) + ' / ' + i18n( 'activity-schema.Activity_E.' + actType ),
                bodyContent: null,
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: 1024,
                height: 600,
                minHeight: 150,
                minWidth: 1024,
                centered: true,
                modal: true,
                dragable: true,
                maximizable: false,
                resizeable: true,
                render: document.body,
                buttons: {
                    header: [ 'close' ],
                    footer: [ btnCancel, btnConfirm ]
                }
            },

            formOptions = {
                'patientRegId': '', //  used by PUC proxy, not applicable here
                'canonicalId': '', //  formtemplate with role 'casefile-terminliste',
                'formVersionId': '', //  latest version of this form
                'divId': 'divFormRender', //  div to render into, in modal
                'il8nDict': {}, //  not used at present
                'doRender': false, //  we will call template.render after load
                'mapperName': 'patient', //  type of form mapper driving this form
                'width': 500
            },

            template,
            mapper;

        //  async steps

        async.series(
            [
                loadJadeTemplate,
                createModal,
                addActivitySelect,
                getFormIDFromActType,
                getFormMeta,
                createFormTemplate,
                resizeAndRenderForm
            ],
            onModalReady
        );

        function loadJadeTemplate( itcb ) {
             Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { path: 'FormEditorMojit/views/backmapping_modal' } )
                        .then( onJadeTemplateLoade );

            function onJadeTemplateLoade( response ) {
                node = Y.Node.create( response.data );
                modalConfig.bodyContent = node;
                itcb( null );
            }
        }

        function createModal( itcb ) {
            modal = new Y.doccirrus.DCWindow( modalConfig );

            modal.on( 'visibleChange', function( event ) {
                if( false === event.newVal ) {
                    if( mapper ) {
                        mapper.destroy();
                    }
                    if( template ) {
                        template.destroy();
                    }
                }
            } );

            jq = {
                'taUserContent': $('#taUserContent'),
                'divBackmappingHint': $('#divBackmappingHint'),
                'selActivityFields': $('#selActivityFields'),
                'inpFoldChars': $('#inpFoldChars'),
                'btnAddActivityField': $('#btnAddActivityField'),
                'divFormRender': $('#divFormRender'),
                'divFormMissing': $('#divFormMissing')
            };

            jq.taUserContent.val( originalUserContent );
            jq.taUserContent.off( 'blur.backmapping' ).on( 'blur.backmapping', onTaBlur );
            jq.inpFoldChars.hide();

            function BackMappingVm() {
                var
                    self = this,
                    valid;

                self.embedActivityFieldI18n = i18n('FormEditorMojit.backmapping_modal.labels.EMBED_ACTIVITY_FIELD');
                self.btnAddI18n = i18n('FormEditorMojit.backmapping_modal.labels.BTN_ADD');
                self.labelExplanationsI18n = i18n('FormEditorMojit.backmapping_modal.labels.EXPLANATION');
                self.noFormI18n = i18n('FormEditorMojit.backmapping_modal.labels.NO_FORM');

                self.charsNum = ko.observable( 80 );
                self.charsNum.hasError = ko.observable( false );
                self.charsNum.validationMessages = ko.observableArray( [] );

                self.charsNum.subscribe( function( val ) {
                    valid = Y.doccirrus.validations.common._num( val ) && val !== 0;
                    self.charsNum.hasError( !valid );
                    self.charsNum.validationMessages( valid ? [] : [ i18n( 'validations.message.DECNUMBER_ERR' ) ] );
                    jq.selActivityFields.prop( "disabled", !valid );
                    jq.btnAddActivityField.prop( "disabled", !valid );
                    if( valid) {
                        $('#foldByChars').text( i18n( prefix + 'labels.FOLD_CHARS_MARKER') + ' (...(' + model.charsNum() + '))' );
                    }
                } );
            }

            model = new BackMappingVm();
            ko.applyBindings( model, document.querySelector( '#divBackmappingWizard' ) );

            itcb( null );

            //node.setStyles( {width: 500} );
            //node.setHTML( Y.doccirrus.comctl.getThrobber() );
        }

        function addActivitySelect( itcb ) {
            var
                vSchemaName = Y.doccirrus.schemas.activity.getDiscriminator( actType ),
                vSchema = Y.doccirrus.schemas[ vSchemaName ],
                options = '<option value=""></option>',

                //  these fields do not make sense to backmap from activities
                hideFields = [
                    'attachedMedia',
                    'externalRef',
                    'copyRef',
                    'mirrorActivityId',
                    'activities',
                    'attachments',
                    'formPdf',
                    'formLang',
                    'formGender',
                    'u_extra',
                    'd_extra',
                    'partner_extra',
                    'modifyHomeCat',
                    'deleteEntryHomeCat',
                    'caseFolderId',
                    'autoGenID',
                    'caseFolderDisabled',
                    'ruleStatus',
                    'ruleErrors',
                    'receipts'
                ],
                vSchemaLabel,
                k;

            function addOption( value, label ) {
                options = options + '<option value="' + value + '">' + label + '</option>\n';
            }

            //  YUI issue or not found
            if ( !vSchema ) { return itcb( null ); }

            for ( k in vSchema.schema ) {
                if ( vSchema.schema.hasOwnProperty( k ) && -1 === hideFields.indexOf( k ) ) {
                    //console.log( '(****) property: ' + k + ' / ' + vSchema.schema[k]['-de'] + ' / ' + vSchema.schema[k]['i18n'] );
                    vSchemaLabel = vSchema.schema[k].i18n || i18n( 'activity-schema.Activity_T.' + k + '.i18n' );
                    options = options + '<option value="' + k + '">' + vSchemaLabel + ' (' + k + ')</option>\n';
                }
            }

            //  special options for LABDATA mapping, related to MOJ-9389
            if ( 'LABDATA' === actType ) {
                addOption( 'l_extra.labName', i18n( prefix + 'labels.LAB_NAME' ) + ' (l_extra.labName)' );
                addOption( 'l_extra.recordRequestId', i18n( prefix + 'labels.LAB_ORDER_NUMBER' ) + ' (l_extra.recordRequestId)' );
                addOption( 'l_extra.findingKind', i18n( prefix + 'labels.FINDING_KIND') + ' (l_extra.findingKind)' );
            }

            addOption( 'editor.name', i18n( prefix + 'labels.EDITOR_NAME') + ' (editor.name)' );
            addOption( 'editor.initials', i18n( prefix + 'labels.EDITOR_INITIALS') + ' (editor.initials)' );

            addOption( 'formName',  i18n( prefix + 'labels.FORM_NAME') );
            addOption( '___', i18n( prefix + 'labels.CLEANUP_MARKER') + ' (__)' );
            addOption( '...', i18n( prefix + 'labels.FOLD_MARKER') + ' (...)' );

            options = options + '<option id="foldByChars" value="...N">' + i18n( prefix + 'labels.FOLD_CHARS_MARKER') + ' (...(' + model.charsNum() + '))</option>';

            jq.selActivityFields.html( options );
            jq.selActivityFields.off( 'change' ).on( 'change', onSelectChange );
            jq.btnAddActivityField.off( 'click.backmapping' ).on( 'click.backmapping', onAddActivityFieldClick );

            itcb( null );
        }

        //  (X) look up appointment listing / Termin Liste form
        function getFormIDFromActType( itcb ) {
            formRole = Y.doccirrus.getFormRole( actType );

            if ( formRole ) {
                actTypeHasForm = true;
            }

            //  if activity type has no form role attached to it then there is no form to look up or load
            if ( !actTypeHasForm ) { return itcb( null ); }

            Y.log( 'Querying config for form assigned to ' + actType + ' role: ' + formRole, 'debug', NAME );
            Y.dcforms.getConfigVar( '', formRole, false, onFormLookup );

            function onFormLookup( err, formId ) {
                if( err || '' === formId ) {
                    //  activity type has a form role, but no form is assigned to it
                    //  TODO: notice asking the user to create/assign a form for this activity type
                    //node.setHTML( i18n( prefix + 'NO_FORM' ) ); //---
                    actTypeHasForm = false;
                    return itcb( null );
                }

                formOptions.canonicalId = formId;
                itcb( null );
            }
        }

        //  (X) look up form metadata
        function getFormMeta( itcb ) {
            //  if no form to look up then we can skip this step
            if ( !actTypeHasForm ) { return itcb( null ); }

            Y.dcforms.getFormListing( '', formOptions.canonicalId, onFormMetaLoaded );

            function onFormMetaLoaded( err, formMeta ) {

                if( err ) {
                    //  TODO: translateme
                    //node.setHTML( i18n( prefix + 'NO_FORM' ) );
                    //  TODO: notice asking the user to create/assign a form for this activity type

                    actTypeHasForm = false;
                    return itcb( null );
                }

                formOptions.formVersionId = formMeta.latestVersionId;

                //Y.log( 'Adding form Appointment List form modal: ' + formOptions.canonicalId, 'debug', NAME );
                itcb( null );
            }
        }

        //  (X) instantiate and load the form
        function createFormTemplate( itcb ) {
            //  if no form to look up then we can skip this step
            if ( !actTypeHasForm ) { return itcb( null ); }

            formOptions.callback = onFormTemplateCreated;
            Y.dcforms.createTemplate( formOptions );

            function onFormTemplateCreated( err, newFormTemplate ) {
                if ( !err && !newFormTemplate ) { err = 'Could not create form template'; }
                if ( err ) { return itcb( err ); }

                template = newFormTemplate;
                template.on( 'elementSelected', NAME, onElementSelected );
                template.highlightEditable = true;
                itcb( null );
            }
        }

        //  (X) instantiate the mapper
        function resizeAndRenderForm( itcb ) {
            //  if no form to look up then we can skip this step
            if ( !actTypeHasForm ) { return itcb( null ); }

            template.resize( 500, onResizeComplete );

            function onResizeComplete( err ) {
                if ( err ) { return itcb( err ); }
                $( '#btnPrintCalEntries' ).show();
                template.render( onRedrawComplete );
            }

            function onRedrawComplete() {
                modal.centered();
                template.setSelected( 'fixed', null );
                template.render( itcb );
            }
        }

        //  UTILITIES

        /**
         *  Insert text into the textarea at previous selection, assumes dialog is initialized
         */

        function insertText( txt ) {
            var
                taVal = jq.taUserContent.val(),
                txtBefore, txtAfter;

            if ( '' === taVal ) {
                jq.taUserContent.val( txt );
                taSelectionStart = txt.length;
                taSelectionEnd = txt.length;
                return;
            }

            if ( 0 === taSelectionStart && 0 === taSelectionEnd ) {
                jq.taUserContent.val( txt + taVal );
                return;
            }

            //  replace selected range
            txtBefore = taVal.substr( 0, taSelectionStart );
            txtAfter = taVal.substr( taSelectionEnd );

            if ( taSelectionStart === taSelectionEnd ) {
                //  move selected range to end of new text
                taSelectionEnd = taSelectionStart + txt.length;
                taSelectionStart = taSelectionEnd;
            } else {
                //  update selected range to match new text
                taSelectionEnd = taSelectionStart + txt.length;
            }

            jq.taUserContent.val( txtBefore + txt + txtAfter );
        }

        //  EVENT HANDLERS

        function onModalReady( err ) {
            if( err ) {
                Y.log( 'Could not render calender event list form: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }

            if ( actTypeHasForm ) {
                //  hide message anbout missing form
                jq.divFormRender.show();
                jq.divFormMissing.hide();
            } else {
                //  if no form is available then show message where form would otherwise be
                jq.divFormRender.hide();
                jq.divFormMissing.show();
            }
        }

        function onElementSelected( element ) {
            if ( !element || !element.elemId ) { return; }
            if ( 'subform' === element.elemType ) { return; }

            //  clear element selection, cannot edit content in this dialog
            insertText( '{{form.' + element.elemId + '}}' );
            element.page.form.setSelected( 'fixed', null );
        }

        function onConfirmButtonClick() {
            if ( options.onUpdate ) {
                options.onUpdate( jq.taUserContent.val() );
            }
            modal.close();
        }

        function onCancelButtonClick() {
            modal.close();
        }

        //  Store textarea selection when it loses focus, so that we can insert backmapping embeds at the correct
        //  location in the text

        function onTaBlur( evt ) {
            if ( !evt || !evt.currentTarget ) { return; }
            taSelectionStart = evt.currentTarget.selectionStart;
            taSelectionEnd = evt.currentTarget.selectionEnd;
        }

        function onSelectChange() {
            var currentItem = jq.selActivityFields.val();
            if( '...N' === currentItem ) {
                jq.inpFoldChars.show();
            } else {
                jq.inpFoldChars.hide();
            }
        }

        function onAddActivityFieldClick() {
            var currentItem = jq.selActivityFields.val();
            if ( '' === currentItem ) { return; }

            //  specical case for adding content fold (relates to MOJ-9389)
            if ( '...' === currentItem ) {
                insertText( '{{...}}' );
                jq.selActivityFields.val( '' );
                return;
            }

            if ( '...N' ===  currentItem ) {
                insertText( '{{...(' + model.charsNum() + ')}}' );
                jq.selActivityFields.val( '' );
                jq.inpFoldChars.hide();
                return;
            }

            //  special case for cleaning up empty lines due to lots of conditional etries, MOJ-8968
            if ( '___' === currentItem ) {
                insertText( '{{___}}' );
                jq.selActivityFields.val( '' );
                return;
            }

            //  magic form property for name, MOJ-8968
            if ( 'formName' === currentItem ) {
                insertText( '{{formName}}' );
                jq.selActivityFields.val( '' );
                return;
            }

            insertText( '{{activity.' + currentItem + '}}' );

            jq.selActivityFields.val( '' );
        }

    }

    Y.namespace( 'doccirrus.modals' ).backmapping = {
        show: showBackmappingModal
    };

}, '0.0.1', {
    requires: [
        'node',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCWindow',
        'oop',
        'dc-comctl',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'dccommunication-client',
        'dcforms-utils',
        'dcforms-roles',
        'dcforms-template',
        'ActivityModels'
    ]
} );