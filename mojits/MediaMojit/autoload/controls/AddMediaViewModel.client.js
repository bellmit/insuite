/**
 *  Placehoder - current jadeloaded view of media attach control to be reimplemented here
 *  strix 2016-04-27
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'AddMediaViewModel', function( Y, NAME ) {
    'use strict';

    var
        //unwrap = ko.unwrap,
        //peek = ko.utils.peekObservable,

        //i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class AddMediaViewModel
     */
    function AddMediaViewModel() {
        AddMediaViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( AddMediaViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initCameraInputViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyCameraInputViewModel();
        },
        buttons: null,
        initAddMediaViewModel: function() {
            //var
            //    self = this;

            Y.log( 'initAddMediaViewModel', 'debug', NAME );
        },
        destroyAddMediaViewModel: function() {
            //var
            //    self = this;

            Y.log( 'destroyAddMediaViewModel', 'debug', NAME );
        },
        templateReady: function() {
            Y.log( 'AddMediaViewModel.pug reports template is ready', 'debug', NAME );
        }
    }, {
        NAME: 'AddMediaViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MediaMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( AddMediaViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'dcauth',

        'CameraInputViewModel'
    ]
} );
