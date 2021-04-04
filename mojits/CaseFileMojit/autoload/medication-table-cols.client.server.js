/**
 * User: do
 * Date: 27.11.19  17:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */



YUI.add( 'MedicationTableCols', function( Y/*, NAME */ ) {

        var KoUI = Y.doccirrus.KoUI;

        var cols = {
            phIngr: createPhIngrCol( {
                forPropertyName: 'phIngr',
                label: 'Wirkstoffe',
                title: 'Wirkstoffe',
                width: '10%'
            } ),
            phIngrOther: createPhIngrCol( {
                forPropertyName: 'phIngrOther',
                label: 'Hilfsstoffe',
                title: 'Hilfsstoffe',
                width: '10%',
                visible: false
            } ),
            phForm: {
                forPropertyName: 'phForm',
                label: 'Darreichungsform',
                title: 'Darreichungsform',
                width: '10%'
            },
            phPatPay: {
                forPropertyName: 'phPatPay',
                label: 'ZuZa',
                title: 'Zuzahlung',
                description: 'Zuzahlung (ZuZa)',
                renderer: function rendererZuZu( meta, context ) {
                    var price, elClass = '',
                        phPriceSale = meta.row.phPriceSale,
                        phFixedPay = meta.row.phFixedPay,
                        canBePatPayFree = true,
                        isOTC = meta.row.phOTC,
                        patientAge = context.patient && context.patient.age(),
                        isOver12 = 12 < patientAge,
                        isChild = 18 >= patientAge;

                    if( !meta.value && 0 !== meta.value ) {
                        return '';
                    }

                    // AVP must be less than FIXED less 30% to be free of payment
                    if( phPriceSale && phFixedPay && (phPriceSale > phFixedPay - (phFixedPay / 100 * 30)) ) {
                        canBePatPayFree = false;
                    }

                    // see MedicationEditorModel's setActivityData call for further activity mapping of phPatPay and phPatPayHint

                    if( canBePatPayFree && isOTC && isChild && isOver12 ) {
                        return '';
                    }

                    if( canBePatPayFree && isChild ) {
                        meta.value = 0;
                    }

                    if( 0 >= meta.value ) {
                        meta.value = 0;
                        elClass = 'medication-no-patientpayment';
                    }

                    price = rendererPrice( meta );
                    price = '<span class="' + elClass + '" title="' + (canBePatPayFree && isChild ? 'zuzahlungsfrei' : (meta.row.phPatPayHint || '')) + '">' + price + ' <span class="glyphicon glyphicon-info-sign"></span></span>';

                    return price;
                },
                isSortable: true,
                sortBy: 'number',
                width: '10%'
            },
            discountOrAlternative: {
                forPropertyName: 'discountOrAlternative',
                label: 'R',
                title: 'Rabattierte Produkte',
                description: 'Rabattierte Produkte (R)',
                renderer: function renderdiscount( meta, context ) {
                    var defaultDiscountStr = "Rabattiertes Produkt";
                    if( (meta.row.phDisAgr && true === meta.row.phDisAgr) || meta.row.phDisagrCode ) {
                        if( meta.row.phDisagrCode ) {
                            defaultDiscountStr = getDiscountAgreement( meta.row.phDisagrCode, context );
                        }
                        return '<span title="' + defaultDiscountStr + '" class="medication-discount">R</span>';
                    } else if( meta.row.phDisAgrAlt && true === meta.row.phDisAgrAlt ) {
                        return '<span title="Alternative Produkte mit Rabattvertrag vorhanden" class="medication-alt-discount">R</span>';
                    }
                    return '';
                },
                width: '5%'
            },
            phPriceSale: {
                forPropertyName: 'phPriceSale',
                label: 'AVP',
                title: 'Apothekenverkaufspreis',
                description: 'Apothekenverkaufspreis (AVP)',
                renderer: rendererPrice,
                isSortable: true,
                sortBy: 'number',
                width: '10%'
            },
            phRefundAmount: {
                forPropertyName: 'phRefundAmount',
                label: 'EB',
                title: 'Erstattungsbetrag',
                description: 'Erstattungsbetrag (EB)',
                renderer: rendererPrice,
                isSortable: true,
                sortBy: 'number',
                width: '10%'
            },
            phPriceRecommended: {
                forPropertyName: 'phPriceRecommended',
                label: 'UVP',
                title: 'Unverbindliche Preisempfehlung',
                description: 'Unverbindliche Preisempfehlung (UVP)',
                renderer: rendererPrice,
                width: '10%'
            },
            phFixedPay: {
                forPropertyName: 'phFixedPay',
                label: 'FB',
                title: 'Festbetrag',
                description: 'Festbetrag (FB)',
                renderer: rendererPrice,
                isSortable: true,
                sortBy: 'number',
                width: '10%'
            },
            fbDiff: {
                forPropertyName: 'fbDiff',
                label: 'FB-Diff',
                title: 'FB-Diff',
                description: 'Festbetrag-Differenz (FB-Diff)',
                renderer: rendererFbDiff,
                isSortable: true,
                sortBy: sortFbDiff,
                width: '10%'
            },
            phSalesStatus: {
                forPropertyName: 'phSalesStatus',
                label: 'Vertriebsstatus',
                title: 'Vertriebsstatus',
                renderer: function( meta ) {
                    return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.activity.types.PhSalesStatus_E.list, '-' );
                },
                width: '10%'
            },
            phNormSize: {
                forPropertyName: 'phNormSize',
                label: 'Normgröße',
                title: 'Normgröße',
                renderer: function( meta ) {
                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.activity.types.PhNormSize_E.list, '-' );
                },
                width: '10%'
            }

        };

        function rendererFbDiff( meta ) {
            if( (!meta.row.phPriceSale && 0 !== meta.row.phPriceSale) || (!meta.row.phFixedPay && 0 !== meta.row.phFixedPay) ) {
                return '';
            }
            return Y.doccirrus.comctl.numberToLocalString( Y.doccirrus.comctl.dcSubtraction( meta.row.phPriceSale, meta.row.phFixedPay ) );
        }

        function sortFbDiff( aObject, bObject ) {
            var aValue = 0;
            var bValue = 0;
            if( aObject.phPriceSale && aObject.phFixedPay ) {
                aValue = Y.doccirrus.comctl.dcSubtraction( aObject.phPriceSale, aObject.phFixedPay );
            }
            if( bObject.phPriceSale && bObject.phFixedPay ) {
                bValue = Y.doccirrus.comctl.dcSubtraction( bObject.phPriceSale, bObject.phFixedPay );
            }
            return KoUI.utils.Number.comparators.number( aValue, bValue );
        }

        function getDiscountAgreement( code, context ) {
            var found;
            if( context._defaultMappings && context._defaultMappings.DISCOUNTAGREEMENT && !Array.isArray( context._defaultMappings.DISCOUNTAGREEMENT.CATALOGENTRY ) ) {
                return '';
            }
            context._defaultMappings.DISCOUNTAGREEMENT.CATALOGENTRY.some( function( entry ) {
                if( entry.CODE === code ) {
                    found = entry.NAME;
                    return true;
                }
            } );
            return found || '';
        }

        function rendererPrice( meta ) {
            if( !meta.value && 0 !== meta.value ) {
                return '';
            }
            return Y.doccirrus.comctl.numberToLocalString( meta.value );
        }

        function createPhIngrCol( config ) {
            return Object.assign( config, {
                renderer: function( meta ) {
                    return (meta.value || []).map( function( ingr ) {
                        var name = ingr.shortName || ingr.name,
                            strength = ingr.strength;
                        return [name, strength].filter( Boolean ).join( ' ' );
                    } ).join( ', ' );
                }
            } );
        }

        Y.namespace( 'doccirrus.medicationTableCols' ).get = function( propertyName, options ) {
            var col = cols[propertyName];
            var renderer = col.renderer;
            options = options || {};

            col = JSON.parse( JSON.stringify( col ) );

            if( typeof options.override === 'object' ) {
                Object.assign( col, options.override );
            }

            if( typeof options.preRenderer === 'function' ) {
                col.renderer = function( meta ) {
                    return options.preRenderer.call( this, meta, renderer );
                };
            } else {
                col.renderer = renderer;
            }

            return col;
        };
    },
    '0.0.1', {
        requires: [
            'dcviewmodel',
            'JsonRpcReflection-doccirrus',
            'KoUI-all'
        ]
    }
);
