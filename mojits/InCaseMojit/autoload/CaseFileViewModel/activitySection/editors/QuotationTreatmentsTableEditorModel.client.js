/*global YUI, ko */
YUI.add( 'QuotationTreatmentsTableEditorModel', function( Y ) {
    'use strict';
    /**
     * @module QuotationTreatmentsTableEditorModel
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @class QuotationTreatmentsTableEditorModel
     * @constructor
     * @extends ActivityEditorModel
     */
    function QuotationTreatmentsTableEditorModel( config ) {
        QuotationTreatmentsTableEditorModel.superclass.constructor.call( this, config );
    }

    Y.extend( QuotationTreatmentsTableEditorModel, KoViewModel.getConstructor( 'ActivityEditorModel' ), {
        /** @protected **/
        templateName: 'QuotationTreatmentsTableEditorModel',
        /** @private **/
        initializer: function() {
            var
                self = this;

            self._initBindMethods();
            self._initQuotationTreatmentsTableEditorModel();
        },
        /** @private **/
        destructor: function() {
        },
        /** @private **/
        _initBindMethods: function() {
            var
                self = this;

            self.changedBillingFactorValue = self.changedBillingFactorValue.bind( self );
            self.changedPrice = self.changedPrice.bind( self );

        },
        /**
         * Get shared "quotationTreatments" from parent editor. If not yet initialized, will initialize it.
         * @returns {object}
         */
        getQuotationTreatments: function() {
            var
                activityDetailsViewModel = KoViewModel.getViewModel( 'ActivityDetailsViewModel' ) || KoViewModel.getViewModel( 'MirrorActivityDetailsViewModel' ),
                quotationTreatments = activityDetailsViewModel.get( 'quotationTreatments' );

            if( !quotationTreatments ) {
                activityDetailsViewModel.initializeQuotationTable();
                quotationTreatments = activityDetailsViewModel.get( 'quotationTreatments' );
            }

            return quotationTreatments;
        },
        /**
         * Determines if total field should be enabled.
         * @type {ko.computed}
         */
        enabledTotal: null,
        /**
         * Determines if total field is considered to be modified by the user.
         * @type {ko.computed}
         */
        modifiedTotal: null,
        /**
         * Computes the total internal number usages to the fields localized string usage.
         * @type {ko.computed}
         */
        totalString: null,
        /**
         * Computes "quotationTreatments" assemblages to rows used by the table.
         * @type {ko.computed}
         */
        rows: null,
        /** @private **/
        _initQuotationTreatmentsTableEditorModel: function() {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                currentTotal = quotationTreatments.total.current;

            self.fieldTotalI18n = i18n( 'QuotationTreatmentsTableEditorModel.fieldTotal.label' );
            self.userContentI18n = i18n( 'QuotationTreatmentsTableEditorModel.table.columns.userContent.label' );
            self.codeI18n = i18n( 'QuotationTreatmentsTableEditorModel.table.columns.code.label' );
            self.priceI18n = i18n( 'QuotationTreatmentsTableEditorModel.table.columns.actualPrice.label' );
            self.billingFactorValueI18n = i18n( 'QuotationTreatmentsTableEditorModel.table.columns.billingFactorValue.label' );
            self.priceLabelI18n = i18n( 'QuotationTreatmentsTableEditorModel.table.columns.price.label' );

            self.enabledTotal = ko.computed( function() {
                return Boolean( unwrap( quotationTreatments.editableAssemblages ).length );
            } ).extend( {rateLimit: 0} );

            self.modifiedTotal = ko.computed( function() {
                return unwrap( quotationTreatments.userModified.total );
            } ).extend( {rateLimit: 0} );

            self.totalString = ko.computed( {
                read: function() {
                    var
                        total = unwrap( currentTotal ) || 0;

                    total = Y.doccirrus.comctl.numberToLocalString( total, {
                        decimals: 2
                    } );

                    return total;
                },
                write: function( value ) {
                    value = value || 0;
                    var
                        valuePrev = peek( currentTotal );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 2 decimal by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 2 decimal transformed as for read is done
                            decimals: 2
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as observable needs it
                    }

                    // value shouldn't be less zero
                    if( value < 0 ) {
                        value = 0;
                    }

                    // total shouldn't be less sum of values that can't be modified
                    if( value < quotationTreatments.total.readOnly ) {
                        value = quotationTreatments.total.readOnly;
                    }

                    currentTotal( value );
                    if( value === valuePrev ) {
                        currentTotal.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );

            self.rows = ko.computed( function() {
                var
                    assemblages = [].concat( unwrap( quotationTreatments.quotationTreatmentAssemblages ) );

                return ignoreDependencies( function() {

                    assemblages.sort( function( a, b ) {
                        a = new Date( a.treatment.timestamp );
                        b = new Date( b.treatment.timestamp );
                        return a - b;
                    } );

                    return assemblages;
                } );
            } ).extend( {rateLimit: 0} );

        },
        /**
         * Converts actual price to localized string presentation value.
         * @param {ko.observable|String|Number} maybeObservable
         * @returns {String}
         */
        toActualPriceText: function( maybeObservable ) {
            return Y.doccirrus.comctl.numberToLocalString( unwrap( maybeObservable ), {
                decimals: 2
            } );
        },
        /**
         * Creates a computed to compute the billingFactorValue internal number usage to the fields localized string usage.
         * To be used by template.
         * @param {ko.observable} observable
         * @returns {ko.computed}
         */
        toBillingFactorValue: function( observable ) {
            var
                self = this;

            return self.addDisposable( ko.computed( {
                read: function() {
                    var
                        total = unwrap( observable ) || 0;

                    total = Y.doccirrus.comctl.factorToLocalString( total );

                    return total;
                },
                write: function( value ) {
                    value = value || 0;
                    var
                        valuePrev = peek( observable );

                    if( Y.Lang.isString( value ) && value ) {
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.factorToLocalString( value );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as observable needs it
                    }

                    // value shouldn't be less zero
                    if( value < 0 ) {
                        value = 0;
                    }

                    observable( value );
                    if( value === valuePrev ) {
                        observable.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} ) );
        },
        /**
         * Creates a computed to compute the price internal number usage to the fields localized string usage.
         * To be used by template.
         * @param {ko.observable} observable
         * @returns {ko.computed}
         */
        toPriceValue: function( observable ) {
            var
                self = this;

            return self.addDisposable( ko.computed( {
                read: function() {
                    var
                        total = unwrap( observable ) || 0;

                    total = Y.doccirrus.comctl.numberToLocalString( total, {
                        decimals: 2
                    } );

                    return total;
                },
                write: function( value ) {
                    value = value || 0;
                    var
                        valuePrev = peek( observable );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 2 decimal by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 2 decimal transformed as for read is done
                            decimals: 2
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as observable needs it
                    }

                    // value shouldn't be less zero
                    if( value < 0 ) {
                        value = 0;
                    }

                    observable( value );
                    if( value === valuePrev ) {
                        observable.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} ) );
        },
        /**
         * Handler of total change listener.
         * @param {QuotationTreatmentsTableEditorModel} self
         * @param {Event} event
         */
        changedTotal: function( self/*, event*/ ) {
            var
                quotationTreatments = self.getQuotationTreatments(),
                total = quotationTreatments.total,
                totalInitial = peek( total.initial ),
                totalCurrent = peek( total.current ),
                totalDifferenceFraction,
                assemblages = unwrap( quotationTreatments.quotationTreatmentAssemblages ),
                differenceAfterCalculate = 0;
            quotationTreatments.userModified.setUserModifiedTotal();

            totalInitial = Y.doccirrus.comctl.dcSubtraction( totalInitial, total.readOnly );
            totalCurrent = Y.doccirrus.comctl.dcSubtraction( totalCurrent, total.readOnly );

            totalDifferenceFraction = Y.doccirrus.comctl.dcDiv( Y.doccirrus.comctl.dcSubtraction( totalInitial, totalCurrent, 6 ), totalInitial, 6 ) || 0;

            assemblages.forEach( function forEachRow( assemblage ) {
                var
                    editorModel = assemblage.editorModel,
                    actualPrice = editorModel.actualPrice,
                    billingFactorValueSubtrahend = Y.doccirrus.comctl.dcMul( editorModel.billingFactorValueInitial, totalDifferenceFraction, 6 ),
                    billingFactorValue = Y.doccirrus.comctl.dcSubtraction( editorModel.billingFactorValueInitial, billingFactorValueSubtrahend, 6 ),
                    price = Y.doccirrus.comctl.dcMul( actualPrice, billingFactorValue );

                // a more precise value was needed to calculate price, now round again for display
                billingFactorValue = Y.doccirrus.comctl.dcMul( 1, billingFactorValue, 4 );

                if( !editorModel.readOnly ) {
                    editorModel.billingFactorValue( billingFactorValue );
                    editorModel.price( price );
                }
                
            } );

            // recalculate the total, because of rounding the original might only be an approximated value
            total.calculate();

            // handle approximated value
            differenceAfterCalculate = Y.doccirrus.comctl.dcSubtraction( totalCurrent, Y.doccirrus.comctl.dcSubtraction( peek( total.current ), total.readOnly ) );
            if( differenceAfterCalculate !== 0 ) {
                assemblages.some( function( assemblage ) {
                    var
                        editorModel = assemblage.editorModel,
                        actualPrice = editorModel.actualPrice,
                        price = peek( editorModel.price ),
                        adjustedPrice = Y.doccirrus.comctl.dcSum( price, differenceAfterCalculate );

                    if( editorModel.readOnly ) {
                        return false;
                    }

                    if( adjustedPrice < 0 ) {
                        return false;
                    }

                    editorModel.billingFactorValue( Y.doccirrus.comctl.dcMul( 1, Y.doccirrus.comctl.dcDiv( adjustedPrice, actualPrice, 6 ), 4 ) );
                    editorModel.price( adjustedPrice );

                    return true;
                } );

                // should now give a correct total
                total.calculate();
            }

        },
        /**
         * Handler of billingFactorValue change listener.
         * @param {object} assemblage
         * @param {Event} event
         */
        changedBillingFactorValue: function( assemblage/*, event*/ ) {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                total = quotationTreatments.total,
                userModified = quotationTreatments.userModified,
                isSwitchFromTotal = unwrap( userModified.total ),
                editorModel = assemblage.editorModel,
                actualPrice = editorModel.actualPrice,
                billingFactorValue = unwrap( editorModel.billingFactorValue ),
                price = Y.doccirrus.comctl.dcSubtraction( actualPrice, Y.doccirrus.comctl.dcSubtraction( actualPrice, Y.doccirrus.comctl.dcMul( actualPrice, billingFactorValue, 6 ), 6 ) );

            // in case of switching from total to table editing
            if( isSwitchFromTotal ) {
                // reset other rows than the edited one
                unwrap( self.rows ).forEach( function( row ) {
                    if( row !== assemblage ) {
                        row.editorModel.reset();
                    }
                } );
            }

            userModified.setUserModifiedTable( assemblage, 'billingFactorValue' );

            editorModel.price( price );

            total.calculate();

        },
        /**
         * Handler of price change listener.
         * @param {object} assemblage
         * @param {Event} event
         */
        changedPrice: function( assemblage/*, event*/ ) {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                total = quotationTreatments.total,
                userModified = quotationTreatments.userModified,
                isSwitchFromTotal = unwrap( userModified.total ),
                editorModel = assemblage.editorModel,
                actualPrice = editorModel.actualPrice,
                price = unwrap( editorModel.price ),
                billingFactorValue = Y.doccirrus.comctl.dcDiv( price, actualPrice, 2 );

            // in case of switching from total to table editing
            if( isSwitchFromTotal ) {
                // reset other rows than the edited one
                unwrap( self.rows ).forEach( function( row ) {
                    if( row !== assemblage ) {
                        row.editorModel.reset();
                    }
                } );
            }

            userModified.setUserModifiedTable( assemblage, 'price' );

            editorModel.billingFactorValue( billingFactorValue );

            total.calculate();

        }
    }, {
        NAME: 'QuotationTreatmentsTableEditorModel',
        ATTRS: {
            whiteList: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( QuotationTreatmentsTableEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'ActivityEditorModel',
        'dc-comctl'
    ]
} );
