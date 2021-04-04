/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'RoleModel', function( Y /*, NAME */  ) {
        'use strict';

        /**
         * @module RoleModel
         */

        var
            i18n = Y.doccirrus.i18n, //jshint ignore:line
            peek = ko.utils.peekObservable,//jshint ignore:line
            KoViewModel = Y.doccirrus.KoViewModel;


        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class RoleModel
         * @constructor
         * @extends KoViewModel
         */
        function RoleModel( config ) {
            RoleModel.superclass.constructor.call( this, config );
        }

        RoleModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( RoleModel, KoViewModel.getBase(), {

            initializer: function RoleModel_initializer(config) {
                var
                    self = this;

                self.initRoleModel(config && config.data);
            },
            destructor: function RoleModel_destructor() {
            },

            initRoleModel: function RoleModel_initRoleModel() {
            },

            save: function () {
                var self = this;

                return Y.doccirrus.jsonrpc.api.role.create({
                    data: self.toJSON()
                });
            },

            /**
             * Removes current task
             * @method remove
             */
            remove: function() {
                var
                    self = this,
                    promise;
                promise = Y.doccirrus.jsonrpc.api.role.delete( { query: { _id: self._id() } } );
                return promise;
            }
        }, {
            schemaName: 'role',
            NAME: 'RoleModel'
        } );
    
        KoViewModel.registerConstructor( RoleModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'dcvalidations',
            'KoViewModel',
            'role-schema'
        ]
    }
);