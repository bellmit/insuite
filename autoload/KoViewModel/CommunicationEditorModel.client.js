/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'CommunicationEditorModel', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module CommunicationEditorModel
     */

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        CommunicationModel = KoViewModel.getConstructor( 'CommunicationModel' ),
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' );

    /**
     * @class CommunicationEditorModel
     * @constructor
     * @extends SubEditorModel
     */
    // TODO: [Improvement] MOJ-5545: older viewModel approach conflicts with newer dataModel approach
    function CommunicationEditorModel( config ) {
        CommunicationEditorModel.superclass.constructor.call( this, config );
    }

    Y.extend( CommunicationEditorModel, SubEditorModel, {
        initializer: function CommunicationEditorModel_initializer() {
            var
                self = this;
            self.initCommunicationEditorModel();
        },
        destructor: function CommunicationEditorModel_destructor() {
        },
        initCommunicationEditorModel: function CommunicationEditorModel_initCommunicationEditorModel() {
            var
                self = this;

            self.initEditTypeField();
            self.initEditEmailConfirmation();
        }
    }, {
        NAME: 'CommunicationEditorModel',
        ATTRS: {
            whiteList: {
                value: [
                    'type',
                    'preferred',
                    'value',
                    'confirmed',
                    'confirmNeeded',
                    'note',
                    'signaling'
                ],
                lazyAdd: false
            }
        }
    } );

    CommunicationModel.mixTypeField( CommunicationEditorModel );
    CommunicationModel.mixEmailConfirmation( CommunicationEditorModel );
    CommunicationModel.mixRemoveItem( CommunicationEditorModel );

    KoViewModel.registerConstructor( CommunicationEditorModel );
    
}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'SubEditorModel',
        'CommunicationModel',
        'CommunicationEditorMixin'
    ]
} );
