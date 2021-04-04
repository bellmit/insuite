/*jslint anon:true, nomen:true*/
/*global YUI, ko */
'use strict';
YUI.add( 'SupportBaseContactModel', function( Y/*, NAME */ ) {
        /**
         * @module SupportBaseContactModel
         */

        var
            //peek = ko.utils.peekObservable,

            KoViewModel = Y.doccirrus.KoViewModel,
            BaseContactModel = KoViewModel.getConstructor( 'BaseContactModel' );

        /**
         * @class SupportBaseContactModel
         * @constructor
         * @extends BaseContactModel
         */
        function SupportBaseContactModel( config ) {
            SupportBaseContactModel.superclass.constructor.call( this, config );
        }

        Y.extend( SupportBaseContactModel, BaseContactModel, {
            initializer: function SupportBaseContactModel_initializer() {
                var
                    self = this;
                self.initSupportContact();
                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                } );

            },
            destructor: function SupportBaseContactModel_destructor() {
            },
            initSupportContact: function SupportBaseContactModel_initSupportContact(){
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             */
            getTypeName: function() {
                var result = SupportBaseContactModel.superclass.getTypeName.apply( this, arguments );
                switch( result ) {
                    case 'AddressModel':
                        result = 'AddressBaseContactModel';
                        break;
                    case 'CommunicationModel':
                        result = 'CommunicationBaseContactModel';
                        break;
                }
                return result;
            }
        }, {
            schemaName: 'v_supportcontact',
            NAME: 'SupportBaseContactModel',
            ATTRS: {
                useSelect2Talk: {
                    /**
                     * Determines if a select2 for "useSelect2Talk" should be initialised
                     * @attribute useSelect2Talk
                     * @type {boolean}
                     * @default true
                     */
                    value: true,
                    lazyAdd: false
                }
            }
        } );
        KoViewModel.registerConstructor( SupportBaseContactModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'BaseContactModel',
            'v_supportcontact-schema'
        ]
    }
);