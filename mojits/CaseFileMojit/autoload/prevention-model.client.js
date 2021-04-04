/*
 @author: ts
 @date: 2014/01/19
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcpreventionmodel', function( Y ) {

        var PreventionModel;

        PreventionModel = function PreventionModel( prevention ) {
            var
                self = this;
            self._modelName = 'PreventionModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, prevention );

            /* ---  KO data observation --- */
            self._id = prevention._id;

            self.color = ko.observable( prevention.color );
            self.value = ko.observable( prevention.value );
        };

        Y.namespace( 'doccirrus.uam' ).PreventionModel = PreventionModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);