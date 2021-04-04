/**
 * User: Lukasz
 * Validation of date for kbv.
 */


/*global YUI */

YUI.add( 'dckbvdate', function( Y/*, NAME */ ) {
        'use strict';

        var
            getMoment = Y.doccirrus.commonutils.getMoment;

        /**
         * Constructor for ADT validation handler
         * @param inputDate {String}
         * @private
         */

        function KBVDateValidator(inputDate){
            this.inputDate = inputDate || [];
            this._valid = false;
            this._validator = null;

            this.isValid();
        }

        /**
         * It checks validity for the date
         * @method valid
         */

        KBVDateValidator.prototype._checkValidity = function(){
            var dateArray = this.inputDate.split('.'),
                _this = this;

            function areLengthsValid( arr ){
                return (2 === arr[0].length && 2 === arr[1].length && 4 === arr[2].length);
            }

            function checkValidity(){
                if( areLengthsValid( dateArray ) ){
                    _this._validator = new Validator( dateArray );
                    return _this._validator.isValid();
                } else {
                    return false;
                }
            }

            return checkValidity();
        };

        /**
         * You should use this method for checking validity of dob
         * @method isValid
         * @returns {Boolean}
         */

        KBVDateValidator.prototype.isValid = function(){
            this._valid = this._checkValidity();
            return this._valid;
        };


        KBVDateValidator.prototype.getDate = function(){
            this._checkValidity();
            return this._validator.getDate();
        };

        KBVDateValidator.prototype.getISOString = function(){
            var dateString = this._validator.getDate();
            return getMoment()( dateString + ' 10', "DD.MM.YYYY HH" ).toISOString();
        };

        /**
         * Validator constructor with main logic for checking the date
         * @method isValid
         * @returns {Boolean}
         */

        function Validator( dateArray ){
            var
                moment = getMoment();

            this.dateArray = dateArray;
            this.dd = this.dateArray[0];
            this.mm = this.dateArray[1];
            this.yyyy = this.dateArray[2];

            this._valid = false;
            this._diffYears = parseInt( moment( Date.now() ).subtract(139,"years").year(), 10);
        }

        Validator.prototype.getDate = function(){
            var newYear;

            if ( "00" === this.dd ){
                this.dd = "01";
            }

            if ( "00" === this.mm ){
                this.mm = "01";
            }

            if (this._diffYears > parseInt( this.yyyy,10 ) ){
                newYear =  this._diffYears;
                this.yyyy = newYear;
            }

            return [ this.dd, this.mm, this.yyyy ].join(".");
        };

        Validator.prototype.isValidDay = function(){
            return !isNaN(this.dd) && ( this.dd > -1 && this.dd < 32 );
        };

        Validator.prototype.isValidMonth = function(){
            return !isNaN(this.mm) && ( this.mm > -1 && this.mm < 13 );
        };

        Validator.prototype.isValidYear = function(){
            var _match = this.yyyy.match(/\d+$/);

            if( _match && 4 === _match[0].length && _match[0] > this._diffYears || "0000" === _match[0] ) {
                return true;
            } else {
                return false;
            }
        };

        /**
         * Check validity of this validator
         * @method isValid
         * @returns {Boolean}
         */

        Validator.prototype.isValid = function(){
            if ( this.isValidDay() && this.isValidMonth() && this.isValidYear() ){
                this._valid = true;
            } else {
                this._valid = false;
            }

            return this._valid;
        };

        Y.namespace( 'doccirrus' ).KBVDateValidator = KBVDateValidator;

    },
    '0.0.1', {requires: ['dccommonutils']}
);