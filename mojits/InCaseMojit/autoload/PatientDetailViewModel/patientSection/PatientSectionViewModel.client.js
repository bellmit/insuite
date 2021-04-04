/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientSectionViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        EditorModel = KoViewModel.getConstructor( 'EditorModel' );

    /**
     * @constructor
     * @class PatientSectionViewModel
     * @extends EditorModel
     */
    function PatientSectionViewModel() {
        PatientSectionViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionViewModel, EditorModel, {
        templateName: 'PatientSectionViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientSectionViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        template: null,
        initPatientSectionViewModel: function() {
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        },
        /**
         * Returns boolean if current patient is a new one
         * @returns {boolean}
         */
        isNewPatient: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            return currentPatient.isNew();
        }
    }, {
        NAME: 'PatientSectionViewModel',
        ATTRS: {
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            PatientDetailViewModel: {
                value: null
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSectionViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'EditorModel'
    ]
} );
