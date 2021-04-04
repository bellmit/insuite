/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';
YUI.add( 'PracticeModel', function( Y/*, NAME  */) {


        /**
         * @module PracticeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            AddressModel = KoViewModel.getConstructor( 'AddressModel' ),
            CommunicationModel = KoViewModel.getConstructor( 'CommunicationModel' );

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class PracticeModel
         * @constructor
         * @extends KoViewModel
         */
        function PracticeModel( config ) {
            PracticeModel.superclass.constructor.call( this, config );
        }

        PracticeModel.ATTRS = {
            getTypeName: {
                /**
                 * see {{#crossLink "KoViewModel/getTypeName:attribute"}}{{/crossLink}}
                 * @attribute getTypeName
                 * @type {Function}
                 * @for PracticeModel
                 */
                value: function( typeName/*, propertyName, schemaFullPath*/ ) {
                    switch( typeName ) {
                        case 'Address_T':
                            return 'PracticeAddressModel';
                        default:
                            return false;
                    }
                },
                lazyAdd: false
            },
            minutesinadvanceList: {
                /**
                 * @attribute minutesinadvanceList
                 * @type {Array}
                 * @default doccirrus.schemas.practice.minutesinadvanceList
                 */
                value: Y.doccirrus.schemas.practice.minutesinadvanceList(),
                lazyAdd: false
            }
        };

        Y.extend( PracticeModel, KoViewModel.getBase(), {
            initializer: function PracticeModel_initializer() {
                var
                    self = this;

                self.initPracticeModel();
            },
            destructor: function PracticeModel_destructor() {
            },
            /**
             * initializes this PracticeModel
             */
            initPracticeModel: function PracticeModel_initPracticeModel() {
                var
                    self = this;

                self.minutesinadvanceList = ko.observableArray( self.get( 'minutesinadvanceList' ) );
            }
        }, {
            schemaName: 'practice',
            NAME: 'PracticeModel'
        } );
        KoViewModel.registerConstructor( PracticeModel );

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class PracticeAddressModel
         * @constructor
         * @extends AddressModel
         */
        function PracticeAddressModel( config ) {
            PracticeAddressModel.superclass.constructor.call( this, config );
        }

        PracticeAddressModel.ATTRS = {
            availableKindList: {
                /**
                 * @attribute availableKindList
                 * @type {Array}
                 * @default ['POSTAL', 'BILLING', 'VISIT', 'BRANCH']
                 * @for PracticeAddressModel
                 */
                value: Y.doccirrus.schemas.person.types.AddressKind_E.list,
                lazyAdd: false
            },

            useSelect2CountryCode: {
                /**
                 * @attribute useSelect2CountryCode
                 * @type {boolean}
                 * @default true
                 * @for PracticeAddressModel
                 */
                value: false,
                lazyAdd: false
            },

            useSelect2Zip: {
                /**
                 * @attribute useSelect2Zip
                 * @type {boolean}
                 * @default true
                 * @for PracticeAddressModel
                 */
                value: false,
                lazyAdd: false
            },

            useSelect2City: {
                /**
                 * @attribute useSelect2City
                 * @type {boolean}
                 * @default true
                 * @for PracticeAddressModel
                 */
                value: false,
                lazyAdd: false
            },

            useUpdateCatalogMap: {
                /**
                 * Determines if "doccirrus.catalogmap" should be updated on "country" change
                 * @attribute useUpdateCatalogMap
                 * @type {boolean}
                 * @default true
                 */
                value: false,
                lazyAdd: false
            }
        };

        Y.extend( PracticeAddressModel, AddressModel, {
            initializer: function PracticeAddressModel_initializer() {
                var
                    self = this;

                self.initPracticeAddressModel();
            },
            destructor: function PracticeAddressModel_destructor() {
            },
            /**
             * initializes this PracticeAddressModel
             */
            initPracticeAddressModel: function PracticeAddressModel_initPracticeAddressModel() {

            }
        }, {
            schemaName: 'practice.addresses',
            NAME: 'PracticeAddressModel'
        } );
        KoViewModel.registerConstructor( PracticeAddressModel );

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class PracticeCommunicationModel
         * @constructor
         * @extends AddressModel
         */
        function PracticeCommunicationModel( config ) {
            PracticeCommunicationModel.superclass.constructor.call( this, config );
        }

        PracticeCommunicationModel.ATTRS = {
            availableKindList: {
                /**
                 * @attribute availableKindList
                 * @type {Array}
                 * @default ['POSTAL', 'BILLING', 'VISIT', 'BRANCH']
                 * @for PracticeCommunicationModel
                 */
                value: Y.doccirrus.schemas.person.types.AddressKind_E.list,
                lazyAdd: false
            }
        };

        Y.extend( PracticeCommunicationModel, CommunicationModel, {
            initializer: function PracticeCommunicationModel_initializer() {
                var
                    self = this;

                self.initPracticeCommunicationModel();
            },
            destructor: function PracticeCommunicationModel_destructor() {
            },
            /**
             * initializes this PracticeCommunicationModel
             */
            initPracticeCommunicationModel: function PracticeCommunicationModel_initPracticeCommunicationModel() {

            }
        }, {
            schemaName: 'practice.communications',
            NAME: 'PracticeCommunicationModel'
        } );
        KoViewModel.registerConstructor( PracticeCommunicationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'practice-schema',
            'AddressModel',
            'CommunicationModel'
        ]
    }
);