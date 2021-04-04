/**
 * User: pi
 * Date: 22/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'CommunicationModel', function( Y/*, NAME */ ) {
        /**
         * @module CommunicationModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' );

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class CommunicationModel
         * @constructor
         * @extends KoViewModel
         * @abstract
         */
        function CommunicationModel( config ) {
            CommunicationModel.superclass.constructor.call( this, config );
        }

        CommunicationModel.ATTRS = {
            /**
             * @attribute availableTypes
             * @type {Array}
             * @default Y.doccirrus.schemas.person.types.Communication_E.list
             */
            availableTypes: {
                value: Y.doccirrus.schemas.person.types.Communication_E.list,
                lazyAdd: false
            }
        };

        Y.extend( CommunicationModel, KoViewModel.getBase(), {
            initializer: function CommunicationModel_initializer() {
                var self = this;
                self.initCommunication();
            },
            destructor: function CommunicationModel_destructor() {
            },
            /**
             * @property availableTypes
             * @type {Array}
             */
            availableTypes: null,
            /**
             * type select2 auto complete configuration
             * @property select2Type
             * @type {Object}
             */
            select2Type: null,
            /**
             * @property showDeleteButton
             * @type {ko.observable}
             */
            showDeleteButton: null,
            /**
             * initializes type select2 autocompleter
             * @method initSelect2Type
             */
            initSelect2Type: function CommunicationModel_initSelect2Type() {
                var self = this;
                self.select2Type = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var type = ko.unwrap( self.type );
                            return type;
                        },
                        write: function( $event ) {
                            self.type( $event.val );
                        }
                    } ) ),
                    select2: {
                        placeholder: PLEASE_SELECT,
                        data: function() {
                            return {
                                results: self.availableTypes.map( function( type ) {
                                    return {
                                        id: type.val,
                                        text: type.i18n
                                    };
                                } )
                            };
                        }
                    }
                };

            },
            /**
             * initializes communication model
             */
            initCommunication: function CommunicationModel_initCommunication() {
                var self = this;
                self.buttonDeleteI18n = i18n('general.button.DELETE');
                self.valuePlaceholderI18n = i18n( 'person-schema.Communication_T.value.placeholder' );
                self.availableTypes = self.get( 'availableTypes' );

                self.initSelect2Type();

                self.showDeleteButton = ko.observable( true );
            }
        }, {
            schemaName: 'communications',
            NAME: 'CommunicationModel'
        } );
        KoViewModel.registerConstructor( CommunicationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'person-schema'
        ]
    }
);