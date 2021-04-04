/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'dclocationmodel', function( Y ) {

        var LocationModel;

        LocationModel = function LocationModel( location ) {
            this._modelName = 'LocationModel';
            Y.doccirrus.uam.ViewModel.call( this );
            /* ---  Basic data parameters --- */
            // url
            this._dataUrl = '/1/location';

            /* ---  KO data observation --- */
            this._id = location._id;
            this.locname = location.patientId;
        };

        Y.namespace( 'doccirrus.uam' ).LocationModel = LocationModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);