/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InSight2MojitViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class InSight2MojitViewModel
     */
    function InSight2MojitViewModel() {
        InSight2MojitViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSight2MojitViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: '',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initInSight2MojitViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initInSight2MojitViewModel: function() {
            var
                self = this;

            self.initTemplate();
            self.initIsCurrentView();
        },
        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function(){
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        },
        /**
         * Computes if this is the current displayed view
         * @property isCurrentView
         * @type {ko.computed}
         */
        isCurrentView: null,
        initIsCurrentView: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self.isCurrentView = ko.computed( function() {
                return unwrap( binder.currentView ) === self;
            } );

        }
    }, {
        NAME: 'InSight2MojitViewModel',
        ATTRS: {
            /**
             * Defines template name to look up
             * @attribute templateName
             * @type {String}
             * @default prototype.templateName
             */
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            /**
             * DCBinder
             * @attribute binder
             * @type {doccirrus.DCBinder}
             * @default InCaseMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( InSight2MojitViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel'
    ]
} );
