/**
 *  Placehoder - current jadeloaded view of webcam frame capture to be ported here
 *  strix 2016-04-27
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'CameraInputViewModel', function( Y, NAME ) {
    'use strict';

    var
        //unwrap = ko.unwrap,
        //peek = ko.utils.peekObservable,

        //i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class CameraInputViewModel
     */
    function CameraInputViewModel() {
        CameraInputViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( CameraInputViewModel, KoViewModel.getDisposable(), {
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
        initCameraInputViewModel: function() {
            //var
            //    self = this;

            Y.log( 'initCameraInputViewModel', 'debug', NAME );
        },
        destroyCameraInputViewModel: function() {
            //var
            //    self = this;

            Y.log( 'destroytCameraInputViewModel', 'debug', NAME );
        },
        templateReady: function() {
            Y.log( 'CameraInputViewModel.pug reports template is ready', 'debug', NAME );
        }
    }, {
        NAME: 'CameraInputViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MediaMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( CameraInputViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'dcauth'
    ]
} );
