'use strict';

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'InSightSettingsViewModel', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        InSightRegenerateViewModel = KoViewModel.getConstructor( 'InSightRegenerateViewModel' );

    /**
     * @constructor
     * @class InSightSettingsViewModel
     * @extends InSight2MojitViewModel
     */
    function InSightSettingsViewModel() {
        InSightSettingsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightSettingsViewModel, KoViewModel.getDisposable(), {

            regenerateViewModel: null,
            templateName: 'InSightSettingsViewModel',
            /** @protected */
            initializer: function() {
                this.initTemplate();
                this.initRegenerateViewModel();
            },

            /** @protected */
            destructor: function() {
            },

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

            initRegenerateViewModel: function() {
                this.regenerateViewModel = new InSightRegenerateViewModel();
            }
        },
        {
            NAME: 'InSightSettingsViewModel',
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

                binder: {
                    valueFn: function() {
                        return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                    }
                }
            }
        }
    );

    KoViewModel.registerConstructor( InSightSettingsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InSight2MojitViewModel',
        'InSightRegenerateViewModel'
    ]
} );
