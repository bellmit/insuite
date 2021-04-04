/**
 * User: oliversieweke
 * Date: 24.01.19  15:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

YUI.add( 'LocationEditModel_CH', function( Y/*, NAME */ ) {
        'use strict';
        var KoViewModel = Y.doccirrus.KoViewModel;
        var AddressModel_CH = KoViewModel.getConstructor( 'AddressModel_CH' );
        var i18n = Y.doccirrus.i18n;

        // WARNING: This model is written to have the look and feel of a stand-alone model, it should however only be used as an extension to the base LocationEditModel.

        function LocationEditModel_CH( config ) {
            LocationEditModel_CH.superclass.constructor.call( this, config );
        }

        Y.extend( LocationEditModel_CH, Y.Base, {
                initializer: function LocationEditModel_CH_initializer() {
                    var self = this;

                    self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                    self.glnNumberI18n = i18n( 'location-schema.Location_CH_T.glnNumber.i18n' );
                    self.zsrNumberI18n = i18n( 'location-schema.Location_CH_T.zsrNumber.i18n' );
                    self.vatNumberI18n = i18n( 'location-schema.Location_CH_T.vatNumber.i18n' );
                    self.placeholderCantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );

                    self.initSelect2CantonCode( self.get( 'useSelect2CantonCode' ) );
                },
                destructor: function LocationEditModel_CH_destructor() {}
            },
            {
                NAME: 'LocationEditModel_CH',
                ATTRS: {
                    useSelect2CantonCode: {
                        value: true,
                        lazyAdd: false
                    },
                    select2CantonCodeConfig: AddressModel_CH.ATTRS.select2CantonCodeConfig
                }
            } );

        Y.mix( LocationEditModel_CH, AddressModel_CH, false, [
            'select2CantonCode',
            'initSelect2CantonCode',
            'select2CantonCodeComputedRead',
            'select2CantonCodeComputedWrite',
            'select2CantonCodeOnSelect'
        ], 1 );

        KoViewModel.registerConstructor( LocationEditModel_CH );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'AddressModel_CH'
        ]
    }
);