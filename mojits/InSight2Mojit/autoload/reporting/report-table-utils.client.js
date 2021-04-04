/**
 *  Client-side utils to reduce duplication in various KO tables showing reports
 *
 *  @author strix
 *  @date:  2018-05-31
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI */
YUI.add( 'report-table-utils', function( Y, NAME ) {
    'use strict';

    var
        namedRenderers = Y.doccirrus.KoUI.namedRenderers,
        PDF_DATE_FORMAT = 'DD.MM.YYYY HH:mm';

    /**
     *  Convert report column definitions into KO table column definitions
     *
     *  @param  {Object} cols            Array of report fields
     *  @param  {String} currentLang     Current language code for col title translations
     *  @return {*}                      Array of KO columns
     */

    function prepareColsForKo( cols, currentLang ) {

        var res = cols.map( prepareSingleColumn );

        function prepareSingleColumn( col ) {

            var newObj = {
                forPropertyName: col.id,
                visible: ( col.visible === true || col.visible === false ) ? col.visible : true,
                label: col.label ? col.label[currentLang] : col.id,
                isSortable: col.isSortable === undefined ? true : col.isSortable,
                isFilterable: col.isFilterable === undefined ? true : col.isFilterable,
                notVisibleAtSummaryRow: col.notVisibleAtSummaryRow,
                isNumeric: col.type && col.type && 'string' === typeof col.type && 'number' === col.type.toLowerCase(),
                filterField: {
                    componentType: 'KoSchemaValue',
                    componentConfig: {
                        list: col.list ? col.list.filter( function( listItem ) {
                            return !listItem.deprecated;
                        } ) : col.list,
                        fieldType: (col.type === 'DateTime' ? 'DateRangeTime' : col.type),
                        showLabel: false,
                        isOnForm: false,
                        required: false,
                        useIsoDate: true,
                        isSelectMultiple: !!col.list || col.searchAsArrayOfValues
                    }
                }
            };

            if( col.rendererName && namedRenderers[col.rendererName] ) {
                newObj.renderer = namedRenderers[col.rendererName];
            } else if( col.renderLink && col.model ) {
                // closure to pass additional parameter - col definition
                newObj.renderer = function( meta ) {
                    return namedRenderers.detailsLinkByModel( meta, col );
                };
            } else if( 'DateTime' === col.type) {
                newObj.renderer = function( meta ) {
                    return namedRenderers.dateTimeFormat( meta, PDF_DATE_FORMAT );
                };
            } else if( 'Number' === col.type ) {
                newObj.renderer = function( meta ) {
                    return meta.value && meta.value + '';
                };
            } else if( 'Image' === col.type ) {
                newObj.renderer = function( meta ) {
                    if ( !meta.value || '' === meta.value ) { return ''; }
                    meta.value = imageThumbFromId( meta.value );
                    return meta.value;
                };
                newObj.pdfRenderer = function( meta ) {
                    if ( !meta.value || '' === meta.value ) { return ''; }
                    return meta.value;
                };
            } else {
                // closure to pass additional parameter - col definition
                newObj.renderer = function( meta ) {
                    return namedRenderers.basicRenderer( meta, col );
                };
            }


            if( col.searchAsArrayOfValues ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR;
            } else if( 'actType' === col.id ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR;
            } else if( 'Number' === col.type ) {
                newObj.queryFilterType = 'eqNumber';
            } else if( 'Boolean' === col.type ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.EQ_OPERATOR;
            } else if( 'Date' === col.type ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.EQDATE_OPERATOR;
            } else if( 'DateTime' === col.type ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.DATE_RANGE_TIME_INSIGHT_OPERATOR;
            } else if( col.list ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.ENUM_OPERATOR;
            } else {
                newObj.queryFilterType = Y.doccirrus.DCQuery.IREGEX_OPERATOR;
            }

            if( col.direction ) {
                newObj.direction = col.direction;
            }

            if( col.sortInitialIndex !== undefined ) {
                newObj.sortInitialIndex = col.sortInitialIndex;
            }

            //  add actType select2
            if ( 'actType' === col.id || 'activityType' === col.rendererName ) {
                newObj.filterField = {
                    componentType: 'KoFieldSelect2',
                    options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                    optionsText: 'i18n',
                    optionsValue: 'val'
                };
            }

            //  add activity status select2
            if ( 'status' === col.id ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.ENUM_OPERATOR;
                newObj.filterField = {
                    componentType: 'KoFieldSelect2',
                    options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                    optionsText: 'i18n',
                    optionsValue: 'val'
                };
            }

            //  add casefolder type select2
            if ( 'caseFolderType' === col.id || 'caseFolderType' === col.rendererName ) {
                newObj.filterField = {
                    componentType: 'KoFieldSelect2',
                    options: Y.doccirrus.schemaloader.filterEnumByCountryMode( col.list ),
                    optionsText: 'i18n',
                    optionsValue: 'val'
                };
            }

            if( "actualWaitingTime" === col.id ) {
                newObj.renderer = function( meta ) {
                    if( meta.value && meta.value < 0 ) {
                        return '';
                    }
                    return meta.value &&  meta.value + '';
                };
            }

            //  add reporting entry type select2
            if ( 'entityName' === col.id || 'entityName' === col.rendererName ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.ENUM_OPERATOR;
                newObj.filterField = {
                    componentType: 'KoFieldSelect2',
                    options: Y.doccirrus.schemas.syncreporting.types.EntityName_E.list,
                    optionsText: 'i18n',
                    optionsValue: 'val'
                };
            }

            //  add schein scheinTransferType select2
            if ( 'scheinTransferType' === col.id ) {
                newObj.queryFilterType = Y.doccirrus.DCQuery.ENUM_OPERATOR;
                newObj.filterField = {
                    componentType: 'KoFieldSelect2',
                    options: Y.doccirrus.schemas.activity.types.ScheinTransferType_E.list.slice(1),
                    optionsText: 'i18n',
                    optionsValue: 'val'
                };
            }

            return newObj;
        }

        return res;
    }

    /**
     *  Used to render form images in report tables
     *
     *  @param  {String}    mediaId
     *  @return {String}
     */
    function imageThumbFromId( mediaId ) {
        var
            stubObj = { '_id': mediaId, 'mime': 'IMAGE_JPEG' },
            thumbUrl = Y.doccirrus.media.getMediaThumbUrl( stubObj, Y.doccirrus.media.DEFAULT_THUMB_SIZE ),
            fullUrl = Y.doccirrus.media.getMediaUrl( stubObj, 'original' );

        //  as in casefile
        return '' +
            '<a href="' + Y.doccirrus.infras.getPrivateURL( fullUrl ) + '" target="_media' + mediaId + '">' +
            '<img src="' + thumbUrl + '" style="border-radius: 5px;" />' +
            '</a>';
    }

    /**
     *  Convert report column definitions into CSV renderer
     *
     *  @param  {Array}     cols    Array of report column definitions
     *  @return {Array}             CSV rendering configuration matching this report
     */

    function prepareCsvExportConf( cols ) {
        var
            res = [],
            stripHtml = true;

        cols.forEach( function( col ) {
            if( col.rendererName ) {

                if( col.rendererName === 'diagnoseCodeList' ||
                    col.rendererName === 'treatmentCodeList' ) {
                    stripHtml = {
                        stripFn: 'convertTableToString'
                    };
                } else {
                    stripHtml = true;
                }

                res.push( {
                    forPropertyName: col.id,
                    stripHtml: stripHtml
                } );

            }
        } );

        return res;
    }

    /**
     *  @param  {Object}    schema
     *  @param  {Array}     customFields
     *  @param  {String}    currentLang
     *  @return {Array}
     */

    function prepareColsData( schema, customFields, currentLang ) {

        var
            actTypes = Y.doccirrus.schemas.catalog.getDisplayCatalogActTypes(),

            result = [],
            currentSchema = {},
            key,
            text,
            catalogShortList = [],
            useValueType,
            i;

        if( !catalogShortList.length ) {
            actTypes.forEach( function( actType ) {
                var catalogs = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: actType
                } );
                catalogShortList = catalogShortList.concat( catalogs );
            } );
        }

        for( key in schema ) {
            if( schema.hasOwnProperty( key ) ) {
                currentSchema = JSON.parse( JSON.stringify( schema[key] ) );

                if( currentSchema.label ) {
                    text = currentSchema.label[currentLang];

                    if( currentSchema.modelLabel &&
                        currentSchema.modelLabel.de &&
                        ('patient' === currentSchema.model ||
                            'location' === currentSchema.model ||
                            'employee' === currentSchema.model ||
                            'task' === currentSchema.model ||
                            'schedule' === currentSchema.model ||
                            'scheduletype' === currentSchema.model ||
                            'calendar' === currentSchema.model ||
                            'medication' === currentSchema.model ||
                            'syncreporting' === currentSchema.model ||
                            'virtualFields' === currentSchema.model
                        ) ) {
                        text = currentSchema.modelLabel.de + ', ' + text;
                    }

                    if( 'catalogShort' === key ) {
                        currentSchema.list = catalogShortList.filter( function( item ) {
                            return ['EBM', 'GOÄ', 'AMTS', 'UVGOÄ', 'GebüH', 'PHYSIO', 'LOGO', 'ERGO'].includes( item.short );
                        } ).map( function( item ) {
                            return {
                                val: item.short,
                                i18n: item.short
                            };
                        } );
                    }

                    //  check that type is compatible with KO widgets

                    useValueType = currentSchema.type;

                    if ( 'undefined' === typeof useValueType || 'object' === typeof useValueType ) {
                        Y.log( 'Replacing invalid value type ' + key + ': ' + JSON.stringify( currentSchema.type ) + ' with "string"', 'warn', NAME );
                        useValueType = 'String';
                    }

                    result.push( {
                        text: text,
                        id: key,
                        model: currentSchema.model,
                        linkType: currentSchema.linkType,
                        label: currentSchema.label,
                        type: useValueType,
                        list: currentSchema.list,
                        dateFormat: currentSchema.dateFormat,
                        rendererName: currentSchema.rendererName,
                        searchAsArrayOfValues: currentSchema.searchAsArrayOfValues
                    } );

                }
            }
        }

        for ( i = 0; i < customFields.length; i++ ) {

            result.push( {
                text: customFields[i].text || customFields[i].key || customFields[i].keyName,
                id: customFields[i].key || customFields[i].keyName,
                model: customFields[i].model,
                linkType: customFields[i].linkType,
                label: customFields[i].label,
                //  Use date range picker column type for custom date fields, not single date picker MOJ-9914
                type: 'Date' === customFields[i].type ? 'DateTime' : customFields[i].type,
                list: customFields[i].list,
                dateFormat: customFields[i].dateFormat,
                rendererName: customFields[i].rendererName,
                searchAsArrayOfValues: customFields[i].searchAsArrayOfValues
            } );
        }

        return result;
    }


    function prepareInCaseSchema( schema ) {
        var
            res = {},
            key,
            currentField;

        for( key in schema ) {
            if( schema.hasOwnProperty( key ) ) {

                if( schema[key].hasOwnProperty( 'cardioXML' ) && !(
                    Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ||
                    Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ||
                    Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS )) ){
                    continue;
                }

                currentField = schema[key];
                if( currentField.insight2 ) {
                    res[key] = currentField;
                }
            }
        }

        return res;
    }

    Y.namespace( 'doccirrus.insight2' ).tableUtils = {
        'prepareColsForKo': prepareColsForKo,
        'prepareCsvExportConf': prepareCsvExportConf,
        'prepareColsData': prepareColsData,
        'prepareInCaseSchema': prepareInCaseSchema
    };

}, '1.0.0', {
    requires: [
        'syncreporting-schema'
    ]
} );
