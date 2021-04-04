/*
 @author: rw
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'dccommunicationmodel', function( Y ) {
        'use strict';

        var CommunicationModel;

        CommunicationModel = function CommunicationModel( communication ) {
            var
                self = this;
            self._modelName = 'CommunicationModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, communication );

            self._runBoilerplate( communication );

            /**
             * Computes a linked "value" based on "type"
             * @property _valueLinked
             * @type {ko.computed}
             */
            self._valueLinked = ko.computed( function() {

                return Y.doccirrus.schemas.person.getCommunicationLinkedWithUriScheme( {
                    type: self.type(),
                    value: self.value()
                } );

            } ).extend( {rateLimit: 0} );

        };

        Y.namespace( 'doccirrus.uam' ).CommunicationModel = CommunicationModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);