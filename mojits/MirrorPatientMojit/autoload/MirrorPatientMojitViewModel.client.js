/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'MirrorPatientMojitViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class MirrorPatientMojitViewModel
     */
    function MirrorPatientMojitViewModel() {
        MirrorPatientMojitViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorPatientMojitViewModel, KoViewModel.getDisposable(), {
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

            self.initMirrorPatientMojitViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initMirrorPatientMojitViewModel: function() {
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
        initTemplate: function() {
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
        NAME: 'MirrorPatientMojitViewModel',
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
             * @default MirrorPatientMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( MirrorPatientMojitViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel'
    ]
} );
