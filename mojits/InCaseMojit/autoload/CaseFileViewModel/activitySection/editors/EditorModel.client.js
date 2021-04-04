/**
 * User: pi
 * Date: 15/12/15  10:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'EditorModel', function( Y ) {
        /**
         * @module EditorModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * This class is abstract, it has only method. All logic should be into subclasses.
         * @abstract
         * @class EditorModel
         * @constructor
         */
        function EditorModel( config ) {
            EditorModel.superclass.constructor.call( this, config );
        }

        EditorModel.ATTRS = {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                },
                lazyAdd: false
            },
            currentActivity: {
                valueFn: function() {
                    var
                        binder = this.get( 'binder' );
                    return binder.currentActivity;
                },
                lazyAdd: false
            },
            currentPatient: {
                valueFn: function() {
                    var
                        binder = this.get( 'binder' );
                    return binder.currentPatient;
                },
                lazyAdd: false
            },
            /**
             * All specified fields will be subscribed( from data model )
             */
            whiteList: {
                value: [],
                lazyAdd: false
            },
            /**
             * All specified submodels will be subscribed( from data-model ).
             * WARNING: SUB-EDITOR-MODEL SHOULD NOT BE ABLE TO CHANGE SUBMODELS ARRAY OF DATA-MODEL!!!
             * Data model should provide add, remove and etc. methods for sub editor model.
             * Every sub-editor-model can access the submodel of data-model by ATTRS 'dataModelParent'.
             * Sub-editor-model should has ATTRS.whiteList to define which fields should be subscribed from data-model.
             * @example
             *  [{
                        propName: 'setOfSubModels', //fk4235Set
                        editorName: 'blablaEditorModel', //fk4235SetEditor, this model should exist.
             *  }]
             */
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( EditorModel, KoViewModel.getDisposable(), {
                initializer: function EditorModel_initializer() {
                    var
                        self = this;
                    self.initEditorModel();
                },
                destructor: function EditorModel_destructor() {
                    var
                        self = this;

                    self.destroyDefinedSubModels();
                },
                initEditorModel: function EditorModel_initEditorModel() {
                },
                mixWhiteListFromDataModel: function EditorModel_mixWhiteListFromDataModel( dataModel ) {
                    var
                        self = this;
                    /**
                     * Mix properties from "currentActivity" - this is not really considered MVVM, but for now it saves time
                     */
                    Y.mix( self, dataModel, true, self.get( 'whiteList' ) );
                },
                initSubModels: function EditorModel_initSubModels( currentDataModel ) {
                    var
                        self = this,
                        subModelsDesc = self.get( 'subModelsDesc' );

                    if( subModelsDesc && Array.isArray( subModelsDesc ) && subModelsDesc.length ) {

                        subModelsDesc.forEach( function( subModelDesc ) {
                            var
                                propName = subModelDesc.propName,
                                editorName = subModelDesc.editorName,
                                target = ko.observableArray(),
                                source = currentDataModel[propName],
                                lookup = [];

                            target.readOnly = source.readOnly;
                            target.i18n = source.i18n;
                            self[propName] = target;

                            self.addDisposable( ko.computed( function() {
                                var
                                    arr = unwrap( source ) || [];
                                if( arr.length ) {
                                    arr.forEach( function( model, idx ) {
                                        var
                                            EditorModel,
                                            editorModel,
                                            config;
                                        if( -1 === lookup.indexOf( model ) ) {
                                            lookup.push( model );
                                            EditorModel = KoViewModel.getConstructor( editorName );
                                            config = {
                                                dataModelParent: model,
                                                editorModelParent: self
                                            };
                                            if( self.get( 'currentPatient' ) ) {
                                                config.currentPatient = self.get( 'currentPatient' );
                                            }
                                            if( self.get( 'currentActivity' ) ) {
                                                config.currentActivity = self.get( 'currentActivity' );
                                            }
                                            editorModel = new EditorModel( config );

                                            target.splice( idx, 0, editorModel );

                                            model.on( 'destroyedChange', function() {
                                                target.remove( editorModel );
                                                editorModel.destroy();
                                                lookup.splice( lookup.indexOf( model ), 1 );

                                            } );
                                        }
                                    } );
                                }
                            } ) );

                        } );
                    }
                },
                destroyDefinedSubModels: function() {
                    var
                        self = this,
                        subModelsDescriptions = self.get( 'subModelsDesc' );

                    subModelsDescriptions.forEach( function( description ) {
                        var
                            target = peek( self[description.propName] );

                        if( Array.isArray( target ) ) {
                            Y.Array.invoke( target, 'destroy' );
                        }
                    } );
                }
            }, {
                NAME: 'EditorModel',
                getEditorModelHasErrorComputed: function getEditorModelHasErrorComputed( rootModel, rootEditorModelName ) {
                    var getObject = Y.doccirrus.commonutils.getObject;
                    return function() {
                        function hasEditorModelError( model, editorModelName ) {
                            var validStateMap = model._validStateMap().map( function( path ) {
                                    return path.replace( /^[a-zA-Z0-9_]*\./, '' ); // replace leading model cid ("model_782.model_785.insuranceId")
                                } ),
                                EditorModel = KoViewModel.getConstructor( editorModelName ),
                                editorModelWhiteListAttrs = getObject( 'ATTRS.whiteList.value', EditorModel ),
                                sectionViewModelSubModelsDesc = getObject( 'ATTRS.subModelsDesc.value', EditorModel );

                            if( editorModelWhiteListAttrs && 0 < _.intersection( editorModelWhiteListAttrs, validStateMap ).length ) {
                                return true;
                            }

                            return sectionViewModelSubModelsDesc && sectionViewModelSubModelsDesc.some( function( desc ) {
                                var
                                    subModel = unwrap( model[desc.propName] );

                                return (subModel && Array.isArray( subModel )) ?
                                    subModel.some( function( subModelElement ) {
                                        return hasEditorModelError( subModelElement, desc.editorName );
                                    } )
                                    : hasEditorModelError( subModel, desc.editorName );
                            } );
                        }

                        return hasEditorModelError( rootModel, rootEditorModelName );
                    };
                }
    }
        );
        KoViewModel.registerConstructor( EditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dcutils'
        ]
    }
)
;
