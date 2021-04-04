/*
 @author: rw
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dccontactmodel', function( Y, NAME ) {

        /**
         * Mutator
         * 
         * Extends the given object and adds the observables that
         * all contacts share.  This is an abstract type and will not
         * change the dataUrl of the parent type.
         * 
         * @class ContactViewModel
         * @param contact
         * @constructor
         */
        
        function ContactModel() {
            var
                self = this;

            Y.log('Extending ' + self._modelName + ' ' + (self._id ? self._id : 'NO ID') + ' with Contact_T', 'info', NAME );

            self.fullname = ko.computed( function() {
                return self.firstname() + ' ' + self.lastname();
            } );

            /***
             * get an address by kind from "addresses" if it exists
             * @method _getAddressByKind
             * @param kind
             * @return {Object|null}
             * @protected
             */
            self._getAddressByKind = function( kind ) {
                var
                    addresses = self.addresses.peek(),
                    result = Y.Array.find( addresses, function( address ) {
                        return kind === ko.utils.peekObservable( address.kind );
                    } );
                return result;
            };

            /**
             * list of possible address kinds to add to "addresses"
             * @type ko.computed
             * @returns {array}
             */
            self._possibleAddressKindList = ko.computed( function() {
                // listen for changes of array and of changes regarding "kind" in items
                Y.each( self.addresses(), function( address ) {
                    ko.unwrap( address.kind );
                } );
                var
                    hasAddressOfficial = Boolean( self._getAddressByKind( 'OFFICIAL' ) ),
                    hasAddressPostbox = Boolean( self._getAddressByKind( 'POSTBOX' ) ),
                    hasAddressMandatory = hasAddressOfficial || hasAddressPostbox,
                    kindList = Y.doccirrus.utils.getObject( 'doccirrus.schemas.patient.schema.addresses.0.kind.list', Y ) || [],
                // (MOJ-1488) remove "BRANCH" from valid items
                    resultList = Y.Array.filter( kindList, function( item ) {
                        return 'BRANCH' !== item.val;
                    } );

                if( hasAddressOfficial ) {
                    // remove "OFFICIAL" from valid items, because only once
                    resultList = Y.Array.filter( resultList, function( item ) {
                        return 'OFFICIAL' !== item.val;
                    } );
                }

                if( hasAddressPostbox ) {
                    // remove "POSTBOX" from valid items, because only once
                    resultList = Y.Array.filter( resultList, function( item ) {
                        return 'POSTBOX' !== item.val;
                    } );
                }

                if( !hasAddressMandatory ) {
                    // force user to add a mandatory item first
                    resultList = Y.Array.filter( resultList, function( item ) {
                        return ['OFFICIAL', 'POSTBOX'].indexOf( item.val ) > -1;
                    } );
                }

                return resultList;
            } );

            /**
             * checks if current addresses may take the provided "kind"
             * @method _isAddressesKindAvailable
             * @param {String} kind
             * @return {Boolean}
             * @protected
             */
             self._isAddressesKindAvailable = function( kind ) {
                return Boolean( Y.Array.find( self._possibleAddressKindList.peek(), function( item ) {
                    return kind === item.val;
                } ) );
            };

            /**
             * return an appropriate template-name for the provided Model
             * @method _addressTemplate
             * @param {Model} address
             * @return {String}
             * @protected
             */
            self._addressTemplate = function( address ) {
                var
                    kind = address.kind();

                switch( kind ) {
                    case 'POSTBOX':
                        return 'template-address_item-POSTBOX';
                    default:
                        return 'template-address_item-default';
                }
            };

        }


        Y.namespace( 'doccirrus.uam' ).ContactModel = ContactModel;
    },
    '0.0.1', {requires: [
        'oop'
    ]}
);