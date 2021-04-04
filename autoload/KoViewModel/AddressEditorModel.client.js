/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'AddressEditorModel', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module AddressEditorModel
     */

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        AddressModel = KoViewModel.getConstructor( 'AddressModel' ),
        AddressModel_CH = KoViewModel.getConstructor( 'AddressModel_CH' ),
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @class AddressEditorModel
     * @constructor
     * @extends SubEditorModel
     */
    // TODO: [Improvement] MOJ-5545: older viewModel approach conflicts with newer dataModel approach
    function AddressEditorModel( config ) {
        AddressEditorModel.superclass.constructor.call( this, config );
    }

    Y.extend( AddressEditorModel, SubEditorModel, {
        initializer: function AddressEditorModel_initializer() {
            var
                self = this;
            self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
            self.personI18n = i18n( 'person-schema.Address_T.person' );
            self.organizationI18n = i18n( 'person-schema.Address_T.organization' );
            self.initAddressEditorModel();
            self.initSelect2CantonCode( self.get( 'useSelect2CantonCode' ) );
        },
        destructor: function AddressEditorModel_destructor() {
        },
        initAddressEditorModel: function AddressEditorModel_initAddressEditorModel() {
            var
                self = this;

            self.initEditAvailableKindList();
            self.initEditReceiver();
            self.initEditCities();
            self.initEditZip();
            self.initEditCity();
            self.initEditCountry();

        }
    }, {
        NAME: 'AddressEditorModel',
        ATTRS: {
            whiteList: {
                value: [
                    '_isModelReadOnly',
                    'availableKindList',
                    'kind',
                    'receiver',
                    'payerType',
                    'talk',
                    'title',
                    'firstname',
                    'nameaffix',
                    'lastname',
                    'street',
                    'houseno',
                    'zip',
                    'postbox',
                    'city',
                    'addon',
                    'country',
                    'countryCode',
                    'cantonCode'
                ],
                lazyAdd: false
            },
            useSelect2CantonCode: {
                value: true,
                lazyAdd: false
            },
            select2CantonCodeConfig: AddressModel_CH.ATTRS.select2CantonCodeConfig
        }
    } );

    AddressModel.mixAvailableKindList( AddressEditorModel );
    AddressModel.mixDefaultReceiverValue( AddressEditorModel );
    AddressModel.mixCities( AddressEditorModel );
    AddressModel.mixZip( AddressEditorModel );
    AddressModel.mixCity( AddressEditorModel );
    AddressModel.mixCountry( AddressEditorModel );
    AddressModel.mixRemoveItem( AddressEditorModel );
    KoViewModel.registerConstructor( AddressEditorModel );

    Y.mix( AddressEditorModel, AddressModel_CH, false, [
        'select2CantonCode',
        'initSelect2CantonCode',
        'select2CantonCodeComputedRead',
        'select2CantonCodeComputedWrite',
        'select2CantonCodeOnSelect'
    ], 1 );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'SubEditorModel',
        'AddressModel',
        'AddressModel_CH',
        'AddressEditorMixin'
    ]
} );
