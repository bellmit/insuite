/**
 * User: rrrw
 * Date: 29/01/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko*/
YUI.add( 'meddata-api', function( Y/*, NAME*/ ) {
        'use strict';

        var
            COLOR_PATHOLOGICAL = '#FF3333';

        const
            // class linkers, will become ES6 imports later on
            MedDataConfigSchema = Y.doccirrus.schemas.v_meddata.MedDataConfigSchema,
            MedDataColumnSchema = Y.doccirrus.schemas.v_meddata.MedDataColumnSchema;

        /**
         * Client side config.
         * @param {object} props
         * @param {string|undefined} props.subType
         * @param {object} props.columns
         * @param {Array|object} props.columnOrder
         * @param {Array} props.hiddenColumns
         * @param {object} props.widthOverrides
         * @param {object} props.titleOverrides
         * @param {object} props.labelOverrides
         * @param {string|undefined} props.defaultCategoryForNewItems = "BIOMETRICS"
         * @param {boolean} props.isValueReadOnly
         * @param {boolean} props.isTextValueReadOnly
         * @param {number} props.version
         * @param {object} props.defaultValues
         * @constructor
         */
        function MedDataConfigClient( props ) {
            MedDataConfigSchema.call( this, props );
        }

        MedDataConfigClient.prototype = Object.create( MedDataConfigSchema.prototype );
        MedDataConfigClient.prototype.constructor = MedDataConfigClient;
        MedDataConfigClient.prototype._super = MedDataConfigSchema;

        Object.defineProperty( MedDataConfigClient.prototype, 'columnConstructor', {
            /**
             * Returns the constructor class for MedDataColumns
             * @return {function}
             */
            get: function() {
                return MedDataColumnClient;
            }
        } );

        function MedDataColumnClient( prop ) {
            MedDataColumnSchema.call( this, prop );
        }

        MedDataColumnClient.prototype = Object.create( MedDataColumnSchema.prototype );
        MedDataColumnClient.prototype.constructor = MedDataColumnClient;
        MedDataColumnClient.prototype._super = MedDataColumnSchema;

        /**
         * returns an html string to display in the cell a range img and the value (with red color for the pathological ones), and the tooltip with the rest of the data related
         * @param {object} options
         * @param {number} options.formattedValue
         * @param {number} options.numericValue
         * @param {string[]} options.sampleNormalValueText
         * @param {string[]|{label: string, value: string}[]} options.titleData
         * @param {Boolean} options.chartView
         * @returns {string}
         */
        MedDataColumnClient.prototype.renderHTMLValueRangeForMedDataItem = function renderHTMLValueRangeForMedDataItem( options ) {
            var
                formattedValue = options.formattedValue,
                numericValue = options.numericValue,
                sampleNormalValueText = options.sampleNormalValueText,
                titleData = options.titleData,
                chartView = options.chartView,
                additionalDataText = [],
                sampleNormalValueTextSplit = (Array.isArray( sampleNormalValueText ) && sampleNormalValueText.length > 0) ? sampleNormalValueText[0].split( '-' ) : [];

            // return the fallback, if no value range could be determined
            if( sampleNormalValueTextSplit.length < 2 ) {
                return formattedValue;
            }

            // get value range min and max value
            var
                min = parseFloat( sampleNormalValueTextSplit[0] ),
                max = parseFloat( sampleNormalValueTextSplit[1] );

            /**
             * If the titleData is not an empty array
             * it should reduce to a string of title and value for each entry
             */
            if( Array.isArray( titleData ) && titleData.length > 0 ) {
                titleData.forEach( function forEachAdditionalTitleData( dataItem ) {
                    if( typeof dataItem === "object" && dataItem !== null && dataItem.label && dataItem.value ) {
                        additionalDataText.push( dataItem.label + ': ' + dataItem.value );
                    } else if( typeof dataItem === "string" ) {
                        additionalDataText.push( dataItem );
                    }
                } );
            }

            // now lets create an xss-safe html element
            var
                container = document.createElement( "div" ),
                host = document.createElement( "div" ),
                span = document.createElement( "span" ),
                img = document.createElement( "img" );

            host.setAttribute( "ko-hover-id", "" );
            host.setAttribute( "data-toggle", "tooltip" );
            host.setAttribute( "data-placement", "bottom" );
            host.setAttribute( "title", additionalDataText.join( "\n" ) );

            /**
             * Creates a chart of the value range, if the view is enabled.
             */
            if( chartView ) {
                img.setAttribute( "width", "70%" );
                img.setAttribute( "height", "20px" );
                img.setAttribute( "src", Y.doccirrus.labdata.utils.createColorBar2( 500, 40, min, max, numericValue ) );
                host.appendChild( img );
                // add an empty space behind the graph
                host.appendChild( document.createTextNode( " " ) );
            }

            /**
             * Finally, render the formatted value in a safe way.
             */
            if( Y.doccirrus.comctl.isNumeric( min ) && Y.doccirrus.comctl.isNumeric( max ) && !(min < numericValue && max > numericValue) ) {
                // if out of range a.k.a a pathological value, change the value color
                span.style = "color: " + COLOR_PATHOLOGICAL;
            }
            span.appendChild( document.createTextNode( formattedValue || Y.doccirrus.comctl.numberToLocalString( numericValue, { decimals: 2 } ) ) );
            host.appendChild( span );

            // finally, we return the innerHTML of the container, to receive a safe version of the HTML content
            container.appendChild( host );
            return container.innerHTML;
        };

        /**
         * returns a KoTable config object
         * @param {object} configOverrides
         * @return {object}
         */
        MedDataColumnClient.prototype.toKoEditableTableColumnOptions = function( configOverrides ) {
            var
                self = this,
                config = {
                    // properties are stored in the additionalData properties of Tags or MedDataItems
                    forPropertyName: self.key,

                    // label and title become the name of the column
                    label: self.label,
                    title: self.title,
                    visible: self.visible,
                    width: (typeof self.width === "string") ? self.width : "auto",
                    isFilterable: self.isFilterable,
                    isSortable: self.isSortable,

                    // add a custom renderer function to access the sub-property
                    renderer: function( meta ) {
                        var value = ko.unwrap( meta.value );

                        // format the values, depending on their data type
                        switch( typeof value ) {
                            case "number":
                                return Y.doccirrus.comctl.numberToLocalString( value, { decimals: 2 } );
                            case "string":
                                return value;
                            default:
                                return "";
                        }
                    }
                },
                type = self.type;

            // apply overrides
            if( typeof configOverrides === "object" ) {
                config = Object.assign( config, configOverrides );
            }

            // if the type of this column is an array, we create a select2 component
            if( Array.isArray( type ) ) {
                config = Object.assign(
                    config,
                    {
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                valueRoot: self.keyRoot,
                                useSelect2Data: true,
                                select2Read: function( value ) {
                                    return self.type.find( function( el ) {
                                        return value === el.id;
                                    } );
                                },
                                select2Write: function( $event, observable ) {
                                    if( $event.added ) {
                                        observable( $event.added.id );
                                    }
                                },
                                options: type.map( function( value ) {
                                    return {
                                        id: value,
                                        text: value
                                    };
                                } ),
                                optionsText: 'text',
                                optionsValue: 'id',
                                select2Config: {
                                    multiple: false
                                }
                            }
                        }
                    }
                );
            }
            // string column
            else if( type === "string" ) {
                config = Object.assign( config, {
                    inputField: {
                        componentType: 'KoEditableTableInputCell',
                        componentConfig: {
                            valueRoot: self.keyRoot,
                            disabled: self.disabled
                        }
                    }
                } );
            }
            // string column
            else if( type === "text" ) {
                config = Object.assign( config, {
                    inputField: {
                        componentType: 'KoEditableTableTextareaCell',
                        componentConfig: {
                            css: {
                                vresize: true
                            },
                            valueRoot: self.keyRoot,
                            disabled: self.disabled
                        }
                    }
                } );
            }
            // number column
            else if( type === "number" ) {
                config = Object.assign( config, {
                    inputField: {
                        componentType: 'KoEditableTableInputCell',
                        componentConfig: {
                            valueRoot: self.keyRoot,
                            disabled: self.disabled
                        }
                    }
                } );
            }

            return config;
        };

        Y.namespace( 'doccirrus.api' ).meddata = {
            MedDataConfigClient: MedDataConfigClient,
            MedDataColumnClient: MedDataColumnClient
        };
    },
    '0.0.1', {
        requires: [
            'v_meddata-schema',
            'labdata-finding-utils',
            'v_ingredientplan-schema'
        ]
    }
);