/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientSectionAccountDataViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
    //  unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' ),
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' );


    /**
     * @class PatientSectionAddDataAccountsEditorViewModel
     * @constructor
     * @extends SubEditorModel
     */
    function PatientSectionAddDataAccountsEditorViewModel( config ) {
        PatientSectionAddDataAccountsEditorViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( PatientSectionAddDataAccountsEditorViewModel, SubEditorModel, {
        initializer: function PatientSectionAddDataAccountsEditorViewModel_initializer() {
            var
                self = this;
            self.initPatientSectionAddDataAccountsEditorViewModel();
        },
        destructor: function PatientSectionAddDataAccountsEditorViewModel_destructor() {
        },
        initPatientSectionAddDataAccountsEditorViewModel: function PatientSectionAddDataAccountsEditorViewModel_initPatientSectionAddDataAccountsEditorViewModel() {

        },
        removeItem: function() {
            var
                self = this,
                dataModelParent = self.get( 'dataModelParent' ),
                currentPatient = peek( self.get( 'currentPatient' ) );

            currentPatient.accounts.remove( dataModelParent );
        }
    }, {
        NAME: 'PatientSectionAddDataAccountsEditorViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'accountOwner',
                    'bankIBAN',
                    'bankBIC',
                    'bankName'
                ],
                lazyAdd: false
            }
        }
    } );
    KoViewModel.registerConstructor( PatientSectionAddDataAccountsEditorViewModel );

    /**
     * @constructor
     * @class PatientSectionAccountDataViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionAccountDataViewModel() {
        PatientSectionAccountDataViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionAccountDataViewModel, PatientSectionViewModel, {
        templateName: 'PatientSectionAccountDataViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initPatientSectionAccountDataViewModel();

        },
        /** @protected */
        destructor: function() {
        },
        initPatientSectionAccountDataViewModel: function() {
            var
                self = this;

            self.initObservables();

            self.accountsTitleI18n = i18n( 'person-schema.Person_T.accounts' );
            self.accountbuttonDeleteI18n = i18n( 'general.button.DELETE' );
        },
        initObservables: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.mixWhiteListFromDataModel( currentPatient );
            self.initSubModels( currentPatient );

        },
        addAccount: function( account ) {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            currentPatient.accounts.push( account || {} );
        },
        addNewAccount: function() {
            var
                self = this;

            self.addAccount( {} );
        }
    }, {
        NAME: 'PatientSectionAccountDataViewModel',
        ATTRS: {
            subModelsDesc: {
                value: [
                    {
                        propName: 'accounts',
                        editorName: 'PatientSectionAddDataAccountsEditorViewModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSectionAccountDataViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientSectionViewModel'
    ]
} );
