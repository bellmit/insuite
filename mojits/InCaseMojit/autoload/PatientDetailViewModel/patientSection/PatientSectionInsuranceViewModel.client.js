/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
YUI.add( 'PatientSectionInsuranceViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
    // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' );

    /**
     * @constructor
     * @class PatientSectionInsuranceViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionInsuranceViewModel() {
        PatientSectionInsuranceViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionInsuranceViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionInsuranceViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;
            self.initPatientSectionInsuranceViewModel();
        },
        /** @protected */
        destructor: function() {

        },
        initPatientSectionInsuranceViewModel: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.mixWhiteListFromDataModel( currentPatient );
            self.initSubModels( currentPatient );
            
            self.insuranceStatusTitleI18n = i18n( 'patient-schema.Patient_T.insuranceStatus' );

            if( !peek( self.insuranceStatus ).length ) {
                self.addNewInsuranceStatus();
            }

        },
        _insuranceStatusAfterAdd: function( element ) {
            element.scrollIntoView();
        },
        setNotesSize: function( element ) {
            var
                textarea = $( element ).find( 'textarea' );
            if( textarea && textarea[0] ) {
                $( textarea[0] ).height( textarea[0].scrollHeight + 'px' );
            }
        }
    }, {
        NAME: 'PatientSectionInsuranceViewModel',
        ATTRS: {
            subModelsDesc: {
                value: [
                    {
                        propName: 'insuranceStatus',
                        editorName: 'InsuranceStatusEditorModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    PatientModel.mixAddNewInsuranceStatus( PatientSectionInsuranceViewModel );

    KoViewModel.registerConstructor( PatientSectionInsuranceViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientModel',
        'PatientEditorMixin',
        'InsuranceStatusEditorModel',
        'PatientSectionViewModel',
        'DCSystemMessages',
        'person-schema'
    ]
} );
