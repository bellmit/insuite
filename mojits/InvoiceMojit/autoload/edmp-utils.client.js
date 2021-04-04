/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'edmp-utils', function( Y, NAME ) {

        function mkobj( obj, path, value ) {
            var parts = path.split( '.' ),
                len = parts.length,
                current = null;

            if( 'object' !== typeof obj ) {
                throw TypeError( 'obj must be an object' );
            }

            parts.forEach( function( part, index ) {
                var isLast = index === (len - 1);
                current = obj[part];

                if( 'object' !== typeof current ) {
                    if( current ) {
                        throw Error( 'path already used' );
                    } else if( !isLast ) {
                        obj = obj[part] = {};
                    }
                }
                if( isLast ) {
                    obj[part] = value;
                }
            } );

        }

        var loadTemplateIntoNode = function( config ) {
            return new Promise( function( resolve, reject ) {
                var
                    rootNode = config.node,
                    splitTemplatePath = config.template.split( '.' ),
                    templateName = splitTemplatePath[1],
                    mojitName = splitTemplatePath[0];

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    templateName,
                    mojitName,
                    config.data || {},
                    Y.one( rootNode ),
                    function( err ) {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve();
                        }
                    }
                );
            } );
        };

        function setStyle( el, styles ) {
            Object.keys( styles ).forEach( function( attrName ) {
                el.style[attrName] = styles[attrName];
            } );
            return el;
        }

        function show( el ) {
            return setStyle( el, {display: 'block'} );
        }

        function hide( el ) {
            return setStyle( el, {display: 'none'} );
        }

        function renderAddresseeIk( meta ) {
            var value = meta.value,
                addresseeSchema=Y.doccirrus.schemas.edmpdelivery.getAddresseeSchema(value);

            if( value ) {
                value = addresseeSchema + ': ' + value;
            }

            return value || 'n/a';
        }

        Y.namespace( 'doccirrus' ).edmputils = {

            name: NAME,
            mkobj: mkobj,
            loadTemplateIntoNode: loadTemplateIntoNode,
            setStyle: setStyle,
            hide: hide,
            show: show,
            renderAddresseeIk: renderAddresseeIk
        };
    },
    '0.0.1', {requires: ['edmpdelivery-schema']}
);

