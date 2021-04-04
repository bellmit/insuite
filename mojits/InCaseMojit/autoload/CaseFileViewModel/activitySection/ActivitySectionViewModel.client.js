/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'ActivitySectionViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class ActivitySectionViewModel
     */
    function ActivitySectionViewModel() {
        ActivitySectionViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivitySectionViewModel, KoViewModel.getDisposable(), {
        templateName: 'ActivitySectionViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initActivitySectionViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        template: null,
        initActivitySectionViewModel: function() {
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }
    }, {
        NAME: 'ActivitySectionViewModel',
        ATTRS: {
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ActivitySectionViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcutils'
    ]
} );
