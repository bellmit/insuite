/*
 @author: dd
 @date: 2013/02/01
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkericonmodel', function( Y ) {

        function MarkerIconModel( markerIcon ) {
            var
                self = this;
            self._modelName = 'MarkerIconModel';
            Y.doccirrus.uam.ViewModel.call( self );

            /* ---  KO data observation --- */
            self._id = markerIcon._id;

            self.css = ko.observable( markerIcon.css );
            self.text = ko.observable( markerIcon.text );
        }

        Y.namespace( 'doccirrus.uam' ).MarkerIconModel = MarkerIconModel;
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcsubviewmodel'
    ] }
);
