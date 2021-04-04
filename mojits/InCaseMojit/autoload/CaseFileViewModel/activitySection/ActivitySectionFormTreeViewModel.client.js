/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, async */
YUI.add( 'ActivitySectionFormTreeViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' ),
        FormsTreeViewModel = KoViewModel.getConstructor( 'FormsTreeViewModel' ),
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class ActivitySectionFormTreeViewModel
     * @extends ActivitySectionViewModel
     */
    function ActivitySectionFormTreeViewModel() {
        ActivitySectionFormTreeViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionFormTreeViewModel, ActivitySectionViewModel, {

        templateName: 'ActivitySectionFormTreeViewModel',

        formsTreeUser: null,
        formsTreeDefault: null,

        /** @protected */
        initializer: function() {
            var
                self = this,
                binder = self.get('binder'),
                incaseconfiguration = binder.getInitialData('incaseconfiguration'),
                currentPatient = binder.currentPatient(),
                currentGender = ko.unwrap(currentPatient.gender);

            Y.log('ActivitySectionFormTreeViewModel is waiting for template to be loaded', 'debug', NAME);

            //  initialize language and gender options for this user and patient

            self.langSelector = ko.observable(Y.dcforms.getUserLang());
            self.showTranslationDropDown = ko.observable(incaseconfiguration.useFormTranslation || false);

            if ('de' === self.langSelector() ) {
                if ('FEMALE' === currentGender) {
                    self.langSelector('def');
                } else {
                    self.langSelector('dem');
                }
            }

            //  add two forms trees for user and default forms

            self.formsTreeUser = new FormsTreeViewModel({
                showLockedForms: false,
                showEmptyFolders: false,
                onSelect: function( formMetaObj ) { self.onFormSelected( formMetaObj ); }
            });

            self.formsTreeDefault = new FormsTreeViewModel({
                showLockedForms: true,
                showEmptyFolders: false,
                onSelect: function( formMetaObj ) { self.onFormSelected( formMetaObj ); }
            });

            //  add search/filter for forms

            self.formSearchText = ko.observable( '' );

            self.formSearchListener = self.formSearchText.subscribe( function( query ) {
                self.formsTreeUser.setTextFilter( query );
                self.formsTreeDefault.setTextFilter( query );
            } );

            //  translations

            self.formSearchPlaceholder = i18n('InCaseMojit.casefile_formtree.formSearchPlaceholder');
            self.germanDefaultI18n = i18n('InCaseMojit.casefile_formtree.lang.GERMAN_DEFAULT');
            self.germanFeminineI18n = i18n('InCaseMojit.casefile_formtree.lang.GERMAN_FEMININE');
            self.germanMasculineI18n = i18n('InCaseMojit.casefile_formtree.lang.GERMAN_MASCULINE');
            self.englishDefaultI18n = i18n('InCaseMojit.casefile_formtree.lang.ENGLISH_DEFAULT');
            self.translationsNoteI18n = i18n('InCaseMojit.casefile_formtree.translation_note');
        },

        /**  should be called via notifyBind */
        templateReady: function() {

        },

        /** @protected */
        destructor: function() {
            var self = this;
            self.destroy();
        },

        /**
         *  Raised by the embedded forms tree when the user makes a selection
         *  @param formMetaObj  {Object}    Metadata object describes form _ids
         */

        onFormSelected: function( formMetaObj ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentView = ko.unwrap( binder.currentView ),
                currentActivity = unwrap( binder.currentActivity ),
                currentFormId = unwrap( currentActivity.formId || '' ),
                currentActType = unwrap( currentActivity.actType ),
                newActType;

            if( !currentActivity._isEditable() ) {
                //  activity must be editable to change the form
                Y.log( 'Current activity must be editable to change the form.', 'info', NAME );
                window.location.hash = window.location.hash.replace( 'formtreeform', 'formform' );
                return;
            }

            //  set language and gender to be used in this instantiation of the form
            switch( self.langSelector() ) {
                case 'de':      formMetaObj.lang = 'de';    formMetaObj.gender = 'n';   break;
                case 'def':     formMetaObj.lang = 'de';    formMetaObj.gender = 'f';   break;
                case 'dem':     formMetaObj.lang = 'de';    formMetaObj.gender = 'm';   break;
                case 'en':      formMetaObj.lang = 'en';    formMetaObj.gender = 'n';   break;
            }

            if( formMetaObj.defaultFor && Y.doccirrus.formAssoc.hasOwnProperty( formMetaObj.defaultFor ) ) {
                newActType = Y.doccirrus.formAssoc[formMetaObj.defaultFor];
                if ( currentActType !== newActType) {

                    //  don't bother asking to save if no form is selected
                    if ( !currentFormId || '' === currentFormId ) {
                        Y.log( 'No form, marking unmodified to change type.', 'debug', NAME );
                        currentActivity.setNotModified();
                    }


                    if ( currentView && currentView.activityDetailsViewModel() ) {
                        binder.currentView().activityDetailsViewModel().isFormLoading( true );
                    }

                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: newActType,
                        newActivityConfig: {
                            'formId': formMetaObj.formId,
                            'formVersion': formMetaObj.latestVersionId
                        }
                    } );

                    return;
                }
            }

            //  no change to act type
            self.changeForm( formMetaObj );
        },

        changeForm: function( formMetaObj ) {

            var
                self = this,
                binder = self.get( 'binder' ),
                currentView = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( currentView.activityDetailsViewModel ),
                attachments = activityDetailsVM.attachmentsModel,
                currentActivity = unwrap( binder.currentActivity );

            //activityDetailsView = ko.unwrap( currentView.activityDetailsViewModel ),
            //activityDetailsNav = ko.unwrap( activityDetailsView.activityNav );

            if( !currentActivity._isEditable() ) {
                //  activity must be editable to change the form
                Y.log( 'Current activity must be editable to change the form.', 'info', NAME );
                window.location.hash = window.location.hash.replace( 'formtreeform', 'formform' );
                return;
            }

            Y.log( 'Selected form: ' + formMetaObj._id + ' - ' + formMetaObj.latestVersionId, 'info', NAME );

            //  When changing forms, previous saved form state will no longer apply to current form and it will need
            //  to be remapped

            var formDoc = attachments.findDocument( '_hasFormData' );

            //console.log('formDoc from previous form: ', formDoc);
            if( formDoc ) {
                //  activity previously had a form document, which will need to be remapped to the fields of the
                //  new form.  The 'remap' value will be checked by the mapper in FormEditorMojit
                formDoc.formData( 'remap' );
                //console.log('setting formData: ' + ko.unwrap( formDoc.formData ) + ' id: ' + ko.unwrap(formDoc._id));
                formDoc.formState( {} );
                formDoc.mapData( {} );
                formDoc.usesMedia( [] );
            }

            if( currentActivity.formId && '' !== currentActivity.formId() ) {
                self.changeFormName( currentActivity, currentActivity.formId(), formMetaObj._id );
            }

            //  will load the form when forms tab is shown
            currentActivity.formId( formMetaObj._id );
            currentActivity.formVersion( formMetaObj.latestVersionId );
            currentActivity.formLang( formMetaObj.lang );
            currentActivity.formGender( formMetaObj.gender );

            //  reload the underlying template object
            activityDetailsVM.destroyFormAndMapper();

            activityDetailsVM.initFormAndMapper();

            //  switch to forms tab
            window.location.hash = window.location.hash.replace( 'formtreeform', 'formform' );
        },

        /**
         *  When changing forms we need to replace the form name in the text tab / activity.userContent
         *
         *  @param  currentActivity {Object}
         *  @param  oldFormId       {String}
         *  @param  newFormId       {String}
         */

        changeFormName: function( currentActivity, oldFormId, newFormId ) {
            var
                userLang = Y.dcforms.getUserLang(),
                oldFormName = '', newFormName = '';

            async.series(
                [

                    //  look up title of previous form
                    function getOldName( itcb ) {
                        Y.dcforms.getFormListing( '', oldFormId, function oldListingLoaded( err, listing ) {
                            if( !err && listing && listing.title && listing.title[userLang] ) {
                                oldFormName = listing.title[userLang];
                            }
                            itcb();
                        } );
                    },

                    function getNewName( itcb ) {
                        Y.dcforms.getFormListing( '', newFormId, function newListingLoaded( err, listing ) {
                            if( !err && listing && listing.title && listing.title[userLang] ) {
                                newFormName = listing.title[userLang];
                            }
                            itcb();
                        } );
                    }

                ],

                function onAllDone() {
                    if( '' !== oldFormName && '' !== newFormName ) {
                        currentActivity.userContent( currentActivity.userContent().replace( oldFormName, newFormName ) );
                    }
                }
            );

        }

    }, {
        NAME: 'ActivitySectionFormTreeViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionFormTreeViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivitySectionViewModel',
        'FormsTreeViewModel',
        'dcforms-roles'
    ]
} );
