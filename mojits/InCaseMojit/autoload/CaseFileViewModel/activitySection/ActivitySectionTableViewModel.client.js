/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
'use strict';
YUI.add( 'ActivitySectionTableViewModel', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        ignoreDependencies = ko.ignoreDependencies,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ActivitySectionViewModel = KoViewModel.getConstructor( 'ActivitySectionViewModel' );

    /**
     * @constructor
     * @class ActivitySectionTableViewModel
     * @extends ActivitySectionViewModel
     */
    function ActivitySectionTableViewModel() {
        ActivitySectionTableViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionTableViewModel, ActivitySectionViewModel, {
        templateName: 'ActivitySectionTableViewModel',
        /** @protected */
        initializer: function() {
            var self = this,
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig();

            self.currentTableEditor = ko.observable( null );
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( self.get( 'binder' ).currentActivity ),
                    actType = unwrap( currentActivity.actType );

                ignoreDependencies( function() {

                    var
                        editorModelName = actTypeConfig[ actType ] && actTypeConfig[ actType ].tableEditor,
                        TableEditorModel = editorModelName && KoViewModel.getConstructor( editorModelName ),
                        currentTableEditor = peek( self.currentTableEditor );
                    if( !TableEditorModel ) {
                        throw new Error( 'could not find table editor model ' + editorModelName );
                    }
                    if( currentTableEditor && currentTableEditor.destroy ) {
                        currentTableEditor.destroy();
                    }

                    self.currentTableEditor( new TableEditorModel() );
                } );

            } ) );
        },
        getActivityDetailsViewModel: function () {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView );

            if ( !caseFileVM || !caseFileVM.activityDetailsViewModel ) { return null; }

            return unwrap( caseFileVM.activityDetailsViewModel );
        },
        /** @protected */
        destructor: function() {
            var self = this,
                currentTableEditor = peek( self.currentTableEditor );

            self.currentTableEditor( null );

            if( currentTableEditor && currentTableEditor.destroy ) {
                currentTableEditor.destroy();
            }
        }
    }, {
        NAME: 'ActivitySectionTableViewModel'
    } );

    KoViewModel.registerConstructor( ActivitySectionTableViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivitySectionViewModel'
    ]
} );
