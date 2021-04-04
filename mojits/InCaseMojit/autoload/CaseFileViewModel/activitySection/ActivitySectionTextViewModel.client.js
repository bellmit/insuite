/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ActivitySectionTextViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' ),
        ignoreDependencies = ko.ignoreDependencies,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap;

    var CASE_FOLDER_TYPE_TO_COUNTRY_MAP = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;

    /**
     * @constructor
     * @class ActivitySectionTextViewModel
     * @extends ActivitySectionViewModel
     */
    function ActivitySectionTextViewModel() {
        ActivitySectionTextViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionTextViewModel, ActivitySectionViewModel, {
        templateName: 'ActivitySectionTextViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;
            self.initCurrentActivityEditor();
        },
        /** @protected */
        destructor: function() {
            var
                self = this,
                currentActivityEditor = peek( self.currentActivityEditor );
            if( currentActivityEditor && currentActivityEditor.destroy ) {
                currentActivityEditor.destroy();
            }
        },
        initCurrentActivityEditor: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig( CASE_FOLDER_TYPE_TO_COUNTRY_MAP[(currentCaseFolder && currentCaseFolder.type)||'ANY'] );

            self.currentActivityEditor = ko.observable( null );
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( self.get( 'binder' ).currentActivity ),
                    actType = unwrap( currentActivity.actType );

                ignoreDependencies( function() {
                    var
                        editorModelName = actTypeConfig[actType].activityEditor,
                        EditorModel = KoViewModel.getConstructor( editorModelName ),
                        currentActivityEditor = peek( self.currentActivityEditor );

                    if( currentActivityEditor && currentActivityEditor.destroy ) {
                        currentActivityEditor.destroy();
                    }
                    self.currentActivityEditor( new EditorModel() );
                } );

            } ) );

        }
    }, {
        NAME: 'ActivitySectionTextViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionTextViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'activity-schema',
        'ActivitySectionViewModel',
        'ActivityEditors'
    ]
} );
