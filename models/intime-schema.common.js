/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'intime-schema', function( Y, NAME ) {
        /**
         * The DC In-Time Service data schema definition
         *
         * @module DCIn-Time Service
         */

        var
        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            default_image = {
                "widthPx": "",
                "heightPx": "",
                "name": "",
                "descr": "",
                "source": 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAIIAAACMCAYAAACwCXGNAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAB3RJTUUH3QMcCicXa5qF0gAAAD90RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUCBvbiBhIE1hYwooYykgYnkgRG9jIENpcnJ1cyBHbWJILCAyMDEzDnGs1wAAB6hJREFUeNrtnG1IU10Ax/+PTmfbTLEiMcdqCIIvsV6Iwl5GSpSYvYkYK/3iRDKLSAo0P4RFCBFlJCUVDnoRLc0MLIr6UNqbW80+KFagYsuINF9obi73fIhdNN10PsUz3f/36V7Oueflnt89557dc/ZPenq6HcTr8eEtIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQhFIBSBUARCEQihCIQiEIpAfkc0kwuv0+mE44qKCtTX17t1TUZGBg2YbT1CcnIyAgMD2aLeLoJEIkFqaipblO8IwNq1a6FQKNiq3i6Cj48PNBoNW9WbRXj37h0AIDIyEqtXr2bLetOsYTQ3btxAUVERRCIRUlNTodfrMTw8PO30AgICoFarsXLlSoSHh8Nut6O7uxuvXr3Co0eP/lPaFOEvYjKZ8PjxY2zatAnz5s1DUlISampqpv2ukZaWNm4WolQqoVQqkZCQgJKSEnR0dHBo8ESqq6sxMDAAANiyZQtCQkLcTiMuLg5ardblVHT+/PnIz8+HXC6nCJ6I2WxGdXU1AEAsFmP37t1uT0H37NkjnHd3d+Ps2bPIyspCVlYWzp07hy9fvghDR25uLnx8fCiCJ/LkyRN0dnYCAFatWoXIyMgpX7thwwZIJBIAQE9PD4qKivDmzRtYLBZYLBYYDAYUFRWhp6cHALBw4ULExcVRBE/Ebrfj+vXrwrk708no6GjhuK6uDoODg+PiDAwMoK6uTjhfsWIFRfBUWltb8fr1awCAQqGAWq2e0nWLFi0aNx11NVV1pE8RPJibN2/CYrEAAHbu3Ik5c+ZMeo1UKhWOHd3/RIwOk8lkFMGT+fbtG+7fvw8ACAoKwvbt2//cTRv1gmi1WimCp3Pv3j3h6U1ISEBoaKjL+I6pJwCXU8/RYf39/RTB07FaraisrAQAiESiSV8c29vbhePY2Fin8WJiYsZMMSnCDOD58+d4//49AGDp0qUu4xoMBuF469atE47/MpkMSUlJE15DETyca9euYWRkZErSOJ7wkJAQFBYWQqVSwd/fH2KxGMuWLUNhYaEwNHz//h1NTU2z4h6JvEGE9vZ2PHv2DOvXr3cZb2RkBOfPn0dBQQEkEglCQ0Nx6NAhp3GvXr0Ks9nMHmEmUVVVhR8/fkwar6urCydOnMDnz5+dxunr68OZM2dgNBpnzf0ReYsI/f39uHv3LtLS0iaN++nTJxQUFECtVmPNmjUIDw/Hz58/YTKZ8PLlSzQ0NMyansDBP+np6XYQr4f7GghFIBSBUARCEQhFIBSBUATyv4kwetv5bGZ0PadaZ1fx/u/79sdF8Jb/HJht9eTQQAD8hY9OOp1OeFp0Oh3KysqEDz1XrlzB8PAwtFotZDIZSktLhYUdS5YsgUajgVwuh9lsRmVlJRobGwH8WlS6f/9+hIWFoba2FhkZGUIeYrEYWq0WUVFRaGlpQVlZmbBo9Xec5VFcXIzTp0/j69evWLBgAfLy8nD06FGXZRpdz6nk4UAulyM7Oxu9vb24cOHChB+v3KnTjOkRlEol8vLyoNPpsGPHDkRERODIkSMoLS3Fvn37hHharRb19fXIycnB7du3x+xSSklJQVNTk9A4o9m1axdqamqQk5MDo9HocpGqszyam5uF5WfR0dFobm6etEzu5uFg8+bNOH78OB48eICUlJQJ03CnTjNGhJqaGlgsFuj1eixevBgPHz6E1WqFwWCAn5+fEC8/Px96vR42mw0NDQ2YO3euEKZSqdDY2IihoSHcuXNnTPrLly+HyWSC3W6HwWBwueHEWR5Go1EQISYmRhDBVZnczcNBdXU1rFYrWlpaoFKpJkzDnTp57NDwO47dQnb7r6/dzhaHSKVSbNy4EQqFYtymkcDAQAwNDQEAent7x4QFBQWhvLxcOHe1Xd1ZHq2trcjMzISvry8iIiJw8eLFScvkbh4OHOW32WxON9q6U6cZI8JUOXjwID5+/IinT5/i1q1bKC4uFsL6+voglUoxODiI4ODgcaIdPnx4SmsSneVhs9nQ0dEBjUaDrq4u2Gy2Scs0nXoAvxa/9vf3w8/PD319fU4fnqnWadbNGsLDw/HixQu0tbUhMTFxTJher4darYZYLEZycvKYsLdv3yIsLAy+vr5Qq9U4duzYtPIwGo2Ij48fs/zMVfzp5AEA27Ztg7+/P6Kjo50ufHWnTrOuR7h8+TKys7MREBAw7v8Sa2trkZubi/j4eFRUVGDdunVCWFVVFTIzMxEVFYXu7m5cunRpWnk4BBi9r9FV/Onk4XgxPXnyJDo7O1FWVjZhGq7q5Gy28l+ZcUvVpFIpTp06hQMHDnDy720/KJWUlCA2NhYikQiJiYloa2tjy83WocEV5eXl2Lt3L4KDg/HhwwenXSrxoqGBePHQQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQCgCoQiEIhCKQAhFIBSBUARCEQhFIBSBuOZfy8sxX6H4UM8AAAAASUVORK5CYII=',
                "origFilename": "no_image_available.png",
                "mime": "IMAGE_PNG"
            },
            template = {
                "_id": '51C8020EA6B338823D000018',
                "logo": [],
                active: true,
                carousel: [],
                headline: 'Prof. Dr. med. Maja Musterfrau',
                subheadline: 'FÄin für Unfallchirurgie | FÄin für Orthopädie und orthopädische Chirurgie'
            };

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "InTimeConfig_T",
                        "lib": types
                    }
                },
                "InTimeConfig_T": {
                    "base1": {
                        "complex": "ext",
                        "type": "InTimeLogo_T",
                        "lib": types
                    },
                    "base2": {
                        "complex": "ext",
                        "type": "InTimeCarousel_T",
                        "lib": types
                    },
                    "base3": {
                        "complex": "ext",
                        "type": "InTimeHeadline_T",
                        "lib": types
                    }

                },
                "Video_T": {
                    "durationSec": {
                        "type": "Number",
                        "future": "LongInt",
                        i18n: i18n( 'intime-schema.Video_T.durationSec.i18n' ),
                        "-en": "durationSec",
                        "-de": "durationSec"
                    }
                },
                "InTimeLogo_T": {
                    "logo": {
                        "complex": "inc",
                        "type": "Image_T",
                        "lib": "media",
                        i18n: i18n( 'intime-schema.InTimeLogo_T.logo.i18n' ),
                        "-en": "logo",
                        "-de": "logo"
                    }
                },
                "InTimeCarousel_T": {
                    "active": {
                        "type": "Boolean",
                        i18n: i18n( 'intime-schema.InTimeCarousel_T.active.i18n' ),
                        "-en": "active",
                        "-de": "active"
                    },
                    "carousel": {
                        "complex": "inc",
                        "type": "Image_T",
                        "lib": "media",
                        i18n: i18n( 'intime-schema.InTimeCarousel_T.carousel.i18n' ),
                        "-en": "carousel",
                        "-de": "carousel"
                    }
                },
                "InTimeHeadline_T": {
                    "headline": {
                        "type": "String",
                        i18n: i18n( 'intime-schema.InTimeHeadline_T.headline.i18n' ),
                        "-en": "headline",
                        "-de": "headline"
                    },
                    "subheadline": {
                        "type": "String",
                        i18n: i18n( 'intime-schema.InTimeHeadline_T.subheadline.i18n' ),
                        "-en": "subheadline",
                        "-de": "subheadline"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class In-Time Service Schemas -- gathers all the schemas that the In-Time Service Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            defaultItems: template,

            getDefaultImage: function() {
                return default_image;
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'media-schema'
        ]
    }
);
