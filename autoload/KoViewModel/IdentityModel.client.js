/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'IdentityModel', function( Y/*, NAME */ ) {
        'use strict';

        /**
         * @module IdentityModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class IdentityModel
         * @constructor
         * @extends KoViewModel
         */
        function IdentityModel( config ) {
            IdentityModel.superclass.constructor.call( this, config );
        }

        IdentityModel.ATTRS = {};

        Y.extend( IdentityModel, KoViewModel.getBase(), {
            initializer: function IdentityModel_initializer() {
                var
                    self = this;

                self.initIdentityModel();

            },
            destructor: function IdentityModel_destructor() {
            },
            initIdentityModel: function IdentityModel_initIdentityModel() {
                var
                    self = this;

                self.usernameDisplay = ko.computed( self.usernameDisplayComputed, self );
            },
            usernameDisplay: null,
            usernameDisplayComputed: function IdentityModel_usernameDisplayComputed() {
                var
                    self = this,
                    username = ko.unwrap( self.username );

                return username || i18n( 'IdentityModel.username.unset' );
            }
        }, {
            schemaName: 'identity',
            NAME: 'IdentityModel'
        } );
        KoViewModel.registerConstructor( IdentityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'identity-schema'
        ]
    }
);