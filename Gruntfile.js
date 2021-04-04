/*
 * grunt.js: guter grundz alles mal neu zu machen
 * User: ad
 * Date: 15.02.13  09:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * grunt install  --  creates package.json, can be followed by "npm install".
 *
 * grunt <app>  --  where /app/ is in tasks[].
 *
 *
 * NB:  grunt install   and   grunt <app>
 *      are independant (have separate effects)
 *      and idempotent (can be called repeatedly with the same effect)
 *
 * @param grunt
 */

/* eslint-disable no-console */

module.exports = function( grunt ) {

    var
        i,
        //
        // TASK NAMES ARRAY
        tasks = [
            'vprc',
            'prc',
            'dcprc',
            'puc',
            'isd'
        ],
        minMap = {
            css: {
                'assets/dist/css/Login.min.css': {
                    frame: 'Login'
                },
                'assets/dist/css/DCHTMLFrameMojit.min.css': {
                    frame: 'DCHTMLFrameMojit'
                },
                'assets/dist/css/IntouchFrameMojit.min.css': {
                    frame: 'IntouchFrameMojit'
                },
                'assets/dist/css/KOHTMLFrameMojit.min.css': {
                    frame: 'KOHTMLFrameMojit'
                },
                'assets/dist/css/DynamsoftFrameMojit.min.css': {
                    frame: 'DynamsoftFrameMojit'
                },
                'assets/dist/css/PPHTMLFrameMojit.min.css': {
                    frame: 'PPHTMLFrameMojit'
                }
            },
            js: {
                'assets/dist/js/Login-top.js': {
                    frame: 'Login',
                    place: 'top'
                },
                'assets/dist/js/DCHTMLFrameMojit-top.js': {
                    frame: 'DCHTMLFrameMojit',
                    place: 'top'
                },
                'assets/dist/js/IntouchFrameMojit-top.js': {
                    frame: 'IntouchFrameMojit',
                    place: 'top'
                },
                'assets/dist/js/KOHTMLFrameMojit-top.js': {
                    frame: 'KOHTMLFrameMojit',
                    place: 'top'
                },
                'assets/dist/js/DynamsoftFrameMojit-top.js': {
                    frame: 'DynamsoftFrameMojit',
                    place: 'top'
                },
                'assets/dist/js/PPHTMLFrameMojit-top.js': {
                    frame: 'PPHTMLFrameMojit',
                    place: 'top'
                }
            }
        };

    grunt.initConfig( {
        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['assets/lib/font-awesome/4.7.0/fonts/*'],
                        dest: 'assets/dist/fonts/',
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: ['assets/lib/custom-icons/font/*'],
                        dest: 'assets/dist/fonts/',
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: ['assets/lib/bootstrap/3.1.1/fonts/*'],
                        dest: 'assets/dist/fonts/',
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: ['assets/img/bootstrap//*.png'],
                        dest: 'assets/dist/img/bootstrap/',
                        filter: 'isFile'
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: ['assets/lib/select2/3.5.2/*.png', 'assets/lib/select2/3.5.2/*.gif'],
                        dest: 'assets/dist/css/',
                        filter: 'isFile'
                    }
                ]
            },
            bootstrap: {
                files: [
                    {
                        expand: true,
                        cwd: 'assets/lib/bootstrap/3.1.1/build/dist/',
                        src: '**',
                        dest: 'assets/lib/bootstrap/3.1.1'
                    }
                ]
            }
        },
        cssmin: {
            css: {
                options: {
                    shorthandCompacting: false,
                    roundingPrecision: -1
                },
                files: {
                    'assets/dist/css/Login.min.css': [
                        "assets/lib/bootstrap/3.1.1/css/bootstrap.min.css",
                        "assets/lib/bootstrap/3.1.1/css/bootstrap-theme.min.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "mojits/DocCirrus/assets/css/all.css"
                    ],

                    'assets/dist/css/DCHTMLFrameMojit.min.css': [
                        "mojits/DocCirrus/assets/css/dc.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "assets/lib/select2/3.5.2/select2.css",
                        "assets/lib/fine-uploader/fine-uploader.css",
                        "mojits/DocCirrus/assets/css/all.css"
                    ],

                    'assets/dist/css/IntouchFrameMojit.min.css': [
                        "assets/lib/bootstrap/3.1.1/css/bootstrap.min.css",
                        "assets/lib/bootstrap/3.1.1/css/bootstrap-theme.min.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/css/bootstrap-datetimepicker.min.css",
                        "assets/lib/bootstrap/3.1.1/dc-layout.css",
                        "assets/lib/select2/3.5.2/select2.css",
                        "assets/lib/select2/select2-bootstrap-css-bootstrap3/1.4.6/select2-bootstrap.min.css",
                        "assets/css/koBindings.css",
                        "assets/lib/fine-uploader/fine-uploader.css",
                        "mojits/DocCirrus/assets/css/all.css",
                        "mojits/DocCirrus/assets/css/easyrtc.css",
                        "assets/lib/jquery/dateRangePicker/dc/daterangepicker.css"
                    ],

                    'assets/dist/css/KOHTMLFrameMojit.min.css': [
                        "assets/lib/bootstrap/3.1.1/css/bootstrap.min.css",
                        "assets/lib/bootstrap/3.1.1/css/bootstrap-theme.min.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/css/bootstrap-datetimepicker.min.css",
                        "assets/lib/bootstrap/3.1.1/dc-layout.css",
                        "assets/lib/select2/3.5.2/select2.css",
                        "assets/lib/select2/select2-bootstrap-css-bootstrap3/1.4.6/select2-bootstrap.min.css",
                        "assets/css/koBindings.css",
                        "assets/lib/fine-uploader/fine-uploader.css",
                        "mojits/DocCirrus/assets/css/all.css",
                        "mojits/DocCirrus/assets/css/nvd3min.css",
                        "mojits/DocCirrus/assets/css/predefined-reportings.css",
                        "assets/lib/jquery/dateRangePicker/dc/daterangepicker.css"
                    ],

                    'assets/dist/css/DynamsoftFrameMojit.min.css': [
                        "assets/lib/bootstrap/3.1.1/css/bootstrap.min.css",
                        "assets/lib/bootstrap/3.1.1/css/bootstrap-theme.min.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "mojits/DocCirrus/assets/css/all.css"
                    ],

                    'assets/dist/css/PPHTMLFrameMojit.min.css': [
                        "assets/lib/bootstrap/3.1.1/css/bootstrap.min.css",
                        "assets/lib/bootstrap/3.1.1/css/bootstrap-theme.min.css",
                        "assets/lib/font-awesome/4.7.0/css/font-awesome.min.css",
                        "assets/lib/custom-icons/css/custom-icons.css",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/css/bootstrap-datetimepicker.min.css",
                        "mojits/DocCirrus/assets/css/all.css",
                        "assets/lib/select2/3.5.2/select2.css",
                        "assets/lib/select2/select2-bootstrap-css-bootstrap3/1.4.6/select2-bootstrap.min.css",
                        "assets/css/koBindings.css",
                        "assets/lib/jquery/dateRangePicker/dc/daterangepicker.css"
                    ]
                }
            }
        },
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                files: {

                    'assets/dist/js/Login-top.js': [
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "assets/lib/lodash/3.8.0/lodash.min.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "assets/lib/bootstrap/3.1.1/js/bootstrap.min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js"
                    ],

                    'assets/dist/js/DCHTMLFrameMojit-top.js': [
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "assets/lib/polyfix/webrtc-adapter.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/jquery-jsonrpcclient.js",
                        "mojits/DocCirrus/assets/js/jqueryui1102custom-min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js",
                        "mojits/DocCirrus/assets/js/jaderuntime-min.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "mojits/DocCirrus/assets/js/moment-de.js",
                        "mojits/DocCirrus/assets/js/0spin-min.js",
                        "mojits/DocCirrus/assets/js/jquery-spin.js",
                        "mojits/DocCirrus/assets/js/jquery-ui-touch.js",
                        "assets/lib/select2/3.5.2/select2.js",
                        "assets/lib/select2/3.5.2/select2_locale_de.js",
                        "mojits/DocCirrus/assets/js/socket-io-2-1-0.js",
                        "assets/lib/knockout/3.4.0/knockout.js",
                        "assets/lib/knockout/templates.js",
                        "assets/lib/knockout/switch-case/2.1.0/knockout-switch-case.min.js",
                        "assets/lib/fine-uploader/jquery.fine-uploader.js"
                    ],

                    'assets/dist/js/IntouchFrameMojit-top.js': [
                        "assets/lib/polyfix/webrtc-adapter.js",
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/jquery-jsonrpcclient.js",
                        "mojits/DocCirrus/assets/js/jqueryui1102custom-min.js",
                        "assets/lib/bootstrap/3.1.1/js/bootstrap.min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js",
                        "mojits/DocCirrus/assets/js/jaderuntime-min.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "mojits/DocCirrus/assets/js/moment-de.js",
                        "mojits/DocCirrus/assets/js/0spin-min.js",
                        "mojits/DocCirrus/assets/js/modernizr.js", // TODO: known top file - needed at all?
                        "assets/lib/async/1.5.2/async.min.js",
                        "assets/lib/bluebird/3.1.5/bluebird.min.js",
                        "assets/lib/lodash/3.8.0/lodash.min.js",
                        "assets/lib/knockout/3.4.0/knockout.js",
                        "assets/lib/knockout/templates.js",
                        "assets/lib/knockout/switch-case/2.1.0/knockout-switch-case.min.js",
                        "assets/lib/select2/3.5.2/select2.js",
                        "assets/lib/select2/3.5.2/select2_locale_de.js",
                        "mojits/DocCirrus/assets/js/socket-io-2-1-0.js",
                        "mojits/DocCirrus/assets/js/easyrtc.js",
                        "mojits/DocCirrus/assets/js/easyrtc_ft.js",
                        "assets/lib/recordrtc/RecordRTC.js",
                        "assets/lib/wavesurfer/wavesurfer.min.js",
                        "assets/lib/web-audio-recorder/Mp3LameEncoder.js",
                        "assets/lib/fine-uploader/jquery.fine-uploader.js"
                    ],

                    'assets/dist/js/KOHTMLFrameMojit-top.js': [
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "assets/lib/polyfix/webrtc-adapter.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/jquery-jsonrpcclient.js",
                        "mojits/DocCirrus/assets/js/jqueryui1102custom-min.js",
                        "assets/lib/bootstrap/3.1.1/js/bootstrap.min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js",
                        "mojits/DocCirrus/assets/js/jaderuntime-min.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "mojits/DocCirrus/assets/js/moment-de.js",
                        "mojits/DocCirrus/assets/js/0spin-min.js",
                        "mojits/DocCirrus/assets/js/jquery-spin.js",
                        "mojits/DocCirrus/assets/js/jquery-ui-touch.js",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/js/bootstrap-datetimepicker.min.js",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/js/bootstrap-datetimepicker-defaults.js",
                        "mojits/DocCirrus/assets/js/modernizr.js", // TODO: known top file - needed at all?
                        "assets/lib/async/1.5.2/async.min.js",
                        "assets/lib/bluebird/3.1.5/bluebird.min.js",
                        "assets/lib/lodash/3.8.0/lodash.min.js",
                        "assets/lib/knockout/3.4.0/knockout.js",
                        "assets/lib/knockout/templates.js",
                        "assets/lib/knockout/switch-case/2.1.0/knockout-switch-case.min.js",
                        "assets/lib/select2/3.5.2/select2.js",
                        "assets/lib/select2/3.5.2/select2_locale_de.js",
                        "mojits/DocCirrus/assets/js/socket-io-2-1-0.js",
                        "mojits/DocCirrus/assets/js/d3.min.js",
                        "mojits/DocCirrus/assets/js/nvd3min.js",
                        "assets/lib/fine-uploader/jquery.fine-uploader.js",
                        "assets/lib/jquery/dateRangePicker/dc/jquery-daterangepicker.min.js",
                        "mojits/DocCirrus/assets/js/jquery-inputmask-bundle.min.js",
                        "assets/lib/fabric/fabric.js",
                        "assets/lib/recordrtc/RecordRTC.js",
                        "assets/lib/wavesurfer/wavesurfer.min.js",
                        "assets/lib/web-audio-recorder/Mp3LameEncoder.js"
                    ],

                    'assets/dist/js/DynamsoftFrameMojit-top.js': [
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/jquery-jsonrpcclient.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "assets/lib/bootstrap/3.1.1/js/bootstrap.min.js",
                        "assets/lib/bluebird/3.1.5/bluebird.min.js",
                        "assets/lib/lodash/3.8.0/lodash.min.js",
                        "assets/lib/knockout/3.4.0/knockout.js",
                        "assets/lib/knockout/templates.js",
                        "assets/lib/knockout/switch-case/2.1.0/knockout-switch-case.min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js"
                    ],

                    'assets/dist/js/PPHTMLFrameMojit-top.js': [
                        "assets/lib/polyfix/proxy.min.js",
                        "assets/lib/he/1.2.0/he.js",
                        "assets/lib/rrule/rrule.min.js",
                        "assets/lib/polyfix/Reflect.js",
                        "assets/lib/polyfix/object-assign-auto.min.js",
                        "assets/lib/polyfix/startswith.js",
                        "assets/lib/polyfix/es5-shim.min.js",
                        "assets/lib/polyfix/es5-sham.min.js",
                        "assets/lib/polyfix/es6-shim.min.js",
                        "assets/lib/polyfix/es6-sham.min.js",
                        "mojits/DocCirrus/assets/js/00jquery191-min.js",
                        "mojits/DocCirrus/assets/js/jqueryui1102custom-min.js",
                        "mojits/DocCirrus/assets/js/jquery-jsonrpcclient.js",
                        "assets/lib/bootstrap/3.1.1/js/bootstrap.min.js",
                        "mojits/DocCirrus/assets/js/dc.js",
                        "mojits/DocCirrus/assets/js/sjcl-28d8573235.js",
                        "mojits/DocCirrus/assets/js/tinySHA1.r4.js",
                        "mojits/DocCirrus/assets/js/jaderuntime-min.js",
                        "mojits/DocCirrus/assets/js/moment-min.js",
                        "mojits/DocCirrus/assets/js/moment-de.js",
                        "assets/lib/async/1.5.2/async.min.js",
                        "mojits/DocCirrus/assets/js/0spin-min.js",
                        "mojits/DocCirrus/assets/js/jquery-spin.js",
                        "mojits/DocCirrus/assets/js/jquery-ui-touch.js",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/js/bootstrap-datetimepicker.min.js",
                        "assets/lib/bootstrap/bootstrap-datetimepicker/4.17.45/js/bootstrap-datetimepicker-defaults.js",
                        "assets/lib/bluebird/3.1.5/bluebird.min.js",
                        "assets/lib/lodash/3.8.0/lodash.min.js",
                        "assets/lib/knockout/3.4.0/knockout.js",
                        "assets/lib/knockout/templates.js",
                        "assets/lib/select2/3.5.2/select2.js",
                        "assets/lib/select2/3.5.2/select2_locale_de.js",
                        "assets/lib/knockout/switch-case/2.1.0/knockout-switch-case.min.js",
                        "mojits/DocCirrus/assets/js/modernizr.js", // TODO: known top file - needed at all?,
                        "assets/lib/jquery/dateRangePicker/dc/jquery-daterangepicker.min.js",
                        "mojits/DocCirrus/assets/js/jquery-inputmask-bundle.min.js",
                        "assets/lib/fine-uploader/jquery.fine-uploader.js",
                        "assets/lib/recordrtc/RecordRTC.js",
                        "assets/lib/wavesurfer/wavesurfer.min.js",
                        "assets/lib/web-audio-recorder/Mp3LameEncoder.js"
                    ]

                }
            }
        },
        uglify: {
            options: {
                banner: '/*! Copyright Doc Cirrus GmbH, 2016 - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %> */'
            },
            dist: {
                files: {
                    'assets/dist/js/DCHTMLFrameMojit-top.min.js': ['assets/dist/js/DCHTMLFrameMojit-top.js'],
                    'assets/dist/js/PPHTMLFrameMojit-top.min.js': ['assets/dist/js/PPHTMLFrameMojit-top.js'],
                    'assets/dist/js/IntouchFrameMojit-top.min.js': ['assets/dist/js/IntouchFrameMojit-top.js'],
                    'assets/dist/js/KOHTMLFrameMojit-top.min.js': ['assets/dist/js/KOHTMLFrameMojit-top.js'],
                    'assets/dist/js/DynamsoftFrameMojit-top.min.js': ['assets/dist/js/DynamsoftFrameMojit-top.js'],
                    'assets/dist/js/Login-top.min.js': ['assets/dist/js/Login-top.js']
                }
            }
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint'
        },
        lint: {
            files: ['grunt.js']
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                browser: true
            },
            globals: {
                require: true,
                define: true,
                requirejs: true,
                describe: true,
                expect: true,
                it: true
            }
        },
        less: {
            dist: {
                options: {
                    compress: true,
                    plugins: [
                        new (require( 'less-plugin-autoprefix' ))( {
                            browsers: [
                                'Chrome >= 48',
                                'Firefox >= 38',
                                'Safari >= 6',
                                'iOS >= 6',
                                'Android >= 2.3',
                                'Explorer >= 10',
                                'Edge >= 13',
                                'last 3 Opera versions',
                                'last 3 ExplorerMobile versions',
                                'last 3 BlackBerry versions',
                                'last 3 ChromeAndroid versions',
                                'last 3 FirefoxAndroid versions',
                                'last 3 OperaMobile versions',
                                'last 3 OperaMini versions'
                            ]
                        } )
                    ]
                },
                files: {
                    'mojits/InCaseMojit/assets/css/InCaseMojit.css': 'mojits/InCaseMojit/assets/less/InCaseMojit.less',
                    'mojits/InStockMojit/assets/css/InStockMojit.css': 'mojits/InStockMojit/assets/less/InStockMojit.less',
                    'mojits/DocCirrus/assets/css/all.css': 'mojits/DocCirrus/assets/less/all.less',
                    'mojits/AppTokenMojit/assets/css/solDocumentation.css': 'mojits/AppTokenMojit/assets/css/less/solDocumentation.less'
                }
            }
        },
        obfuscator: {
            options: {
                compact: true
            },
            dist: {
                options: {
                    // options for each sub task
                },
                files: {
                        'autoload/dcauth-obfuscated.client.js': 'client/dcauth.client.js',
                        'autoload/dcauthpub-obfuscated.common.js': 'client/dcauthpub.common.js'
                }
            }
        }
    } );

    // === 0 ===
    // Default task.
    grunt.registerTask( 'default', function() {
        console.log( 'Tasks: "install" + ' + JSON.stringify( tasks ) ); //  jshint ignore:line
    } ); //jshint ignore:line

    // === 1 ===
    // Install task --> used to create package.json, allows npm install
    // included for backward compatibility
    //
    grunt.registerTask( 'install', function() {
    } );

    /**
     * Pre-compile templates (that have no dependencies) to use with knockout
     * @see assets/lib/knockout/templates.js
     * @see autoload/knockout/ko-template.client.js
     */
    grunt.registerTask( 'koTemplates', function() {
        var
            done = this.async(),
            jade = require( 'pug' ),
            async = require( 'async' ),
            templates = {},// 'id': 'pathToJade' map
            // read templates from KoUI include
            koUIstr = grunt.file.read( 'autoload/KoUI/include.pug', 'UTF-8' ),
            koUIincRegEx = /id="(.*?)".*?[\s\S].*?include (.*?)$/gmi,
            koUImatches;

        while( (koUImatches = koUIincRegEx.exec( koUIstr )) !== null ) { // eslint-disable-line no-cond-assign
            if( koUImatches.index === koUIincRegEx.lastIndex ) {
                koUIincRegEx.lastIndex++;
            }
            if( koUImatches[1] && koUImatches[2] ) {
                templates[koUImatches[1]] = 'autoload/KoUI/' + koUImatches[2] + '.pug';
            }
        }

        async.each( Object.keys( templates ), function( key, callback ) {
            jade.renderFile( templates[key], null, function( error, data ) {
                if( error ) {
                    return callback( error );
                }
                templates[key] = data;
                callback();
            } );
        }, function( error ) {
            if( error ) {
                grunt.log.error( error.message );
            }
            else {
                grunt.file.write( 'assets/lib/knockout/templates.js', 'ko.templates = ' + JSON.stringify( templates ) + ';', {encoding: 'UTF-8'} );
            }
            done();
        } );

    } );

    /**
     Task to remove all Y.log and variations with all log level except 'error'
     */
    grunt.registerTask( 'esprima', function() {
        var
            cb = this.async(),
            esprima = require( 'esprima' ),
            estraverse = require( 'estraverse' ),
            escodegen = require( 'escodegen' ),
            path = require( 'path' ),
            async = require( 'async' ),
            fs = require( 'fs' );

        function readDirRecursive( dir, done ) {
            var results = [];
            fs.readdir( dir, function( err, list ) {
                if( err ) {
                    return done( err );
                }

                var pending = list.length;
                if( !pending ) {
                    return done( null, results );
                }
                list.forEach( function( file ) {
                    file = path.resolve( dir, file );
                    fs.stat( file, function( err, stat ) {
                        if( err ) {
                            return done( err );
                        }
                        if( stat && stat.isDirectory() ) {
                            readDirRecursive( file, function( err, res ) {
                                if( err ) {
                                    console.warn( `error reading dir: ${err}` );
                                }
                                results = results.concat( res );
                                if( !--pending ) {
                                    return done( null, results );
                                }
                            } );
                        } else {
                            if( file.endsWith( '-api.server.js' ) ) {
                                results.push( file );
                            }
                            if( !--pending ) {
                                return done( null, results );
                            }
                        }
                    } );
                } );
            } );
        }

        function work( files ) {
            //let testFile = ['mojits/TestingMojit/autoload/test-api.js'];
            async.eachSeries( files, function( file, done ) {

                if( !file ) {
                    return done();
                }
                if( 'hpdf.js' === path.basename( file ) ) {
                    return done();
                }
                if( 'transport.js' === path.basename( file ) ) {
                    return done();
                }

                console.log( "File:", file ); //  jshint ignore:line
                try {
                    fs.readFile( file, 'utf8', function( err, data ) {
                        let
                            AST,
                            isChanged = false;
                        if( err ) {
                            console.warn( `error reading file: ${err}` );
                            return done();
                        }
                        try {
                            AST = esprima.parse( data, {attachComment: false, comment: true, tokens: true, range: true} );
                            escodegen.attachComments( AST, AST.comments, AST.tokens );
                        } catch( e ) {
                            console.warn( "Error while parsing", e ); //  jshint ignore:line
                            return done();
                        }
                        estraverse.replace( AST, {
                            enter: function( node ) {

                                if( node.expression && node.expression.callee &&
                                    'MemberExpression' === node.expression.callee.type &&
                                    ('Y' === node.expression.callee.object.name ||
                                     'YY' === node.expression.callee.object.name || 'globalY' === node.expression.callee.object.name ||
                                     'logger' === node.expression.callee.object.name || 'myY' === node.expression.callee.object.name /*||
                                     'modelLogger' === node.expression.callee.object.name*/ ) &&
                                    'log' === node.expression.callee.property.name &&
                                    ( node.expression.arguments && node.expression.arguments.some( arg => 'Literal' === arg.type &&
                                    'error' === arg.value
                                    ) ) ) {
                                    return node;
                                } else if( node.expression && node.expression.callee &&
                                           'MemberExpression' === node.expression.callee.type &&
                                           ('Y' === node.expression.callee.object.name ||
                                            'YY' === node.expression.callee.object.name || 'globalY' === node.expression.callee.object.name ||
                                            'logger' === node.expression.callee.object.name || 'myY' === node.expression.callee.object.name /*||
                                            'modelLogger' === node.expression.callee.object.name*/ ) &&
                                           'log' === node.expression.callee.property.name ) {
                                    isChanged = true;
                                    return this.remove();
                                } else {
                                    return node;
                                }
                            }
                        } );
                        if( isChanged ) {
                            fs.writeFileSync( file, escodegen.generate( AST, {
                                comment: true
                            } ) );
                        }
                        done();

                    } );
                } catch( e ) {
                    console.warn( "Error while reading file:", e ); //  jshint ignore:line
                    return done();
                }

            }, function( err ) {
                if( err ) {
                    throw err;
                }
                console.log( "DONE" ); //  jshint ignore:line
                cb();
            } );
        }

        readDirRecursive( process.cwd(), function( err, results ) {
            if( err ) {
                throw err;
            }
            work( results );
        } );


    } );

    grunt.registerTask( 'log:api', function() {
        const
            cb = this.async(),
            esprima = require( 'esprima' ),
            estraverse = require( 'estraverse' ),
            escodegen = require( 'escodegen' ),
            path = require( 'path' ),
            async = require( 'async' ),
            fs = require( 'fs' );

        function readDirRecursive( dir, done ) {
            var results = [];
            fs.readdir( dir, function( err, list ) {
                if( err ) {
                    return done( err );
                }

                var pending = list.length;
                if( !pending ) {
                    return done( null, results );
                }
                list.forEach( function( file ) {
                    file = path.resolve( dir, file );
                    fs.stat( file, function( err, stat ) {
                        if( err ) {
                            return done( err );
                        }
                        if( stat && stat.isDirectory() ) {
                            readDirRecursive( file, function( err, res ) {
                                if( err ) {
                                    console.warn( `error reading dir: ${err}` );
                                }
                                results = results.concat( res );
                                if( !--pending ) {
                                    return done( null, results );
                                }
                            } );
                        } else {
                            if( file.endsWith( '-api.server.js' ) ) {
                                results.push( file );
                            }
                            if( !--pending ) {
                                return done( null, results );
                            }
                        }
                    } );
                } );
            } );
        }

        /**
         * Prepare log message Y.log( message, 'info', NAME).
         * It will return property that should be added into main AST
         */
        function prepareLog( message ) {
            const messageSample = {
                    "range": [
                        244,
                        253
                    ],
                    "type": "Literal",
                    "value": "Started",
                    "raw": "'Started'"
                },
                nameExpression = {
                    "type": "Identifier",
                    "name": "NAME",
                    "range": [
                        472,
                        476
                    ]
                },
                logExpression = {
                    "range": [
                        237,
                        270
                    ],
                    "type": "ExpressionStatement",
                    "expression": {
                        "range": [
                            237,
                            269
                        ],
                        "type": "CallExpression",
                        "callee": {
                            "range": [
                                237,
                                242
                            ],
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "range": [
                                    237,
                                    238
                                ],
                                "type": "Identifier",
                                "name": "Y"
                            },
                            "property": {
                                "range": [
                                    239,
                                    242
                                ],
                                "type": "Identifier",
                                "name": "log"
                            }
                        },
                        "arguments": [
                            {
                                "range": [
                                    255,
                                    261
                                ],
                                "type": "Literal",
                                "value": "info",
                                "raw": "'info'"
                            }
                        ]
                    }
                };
            messageSample.value = message;
            messageSample.raw = `'${message}'`;
            logExpression.expression.arguments.unshift( messageSample );
            logExpression.expression.arguments.push( nameExpression );
            return logExpression;
        }

        /**
         * Prepare 'if' statement for AST.
         * This 'if' will contain wrapper for args.callback.
         * Wrapp-function can be found in /server/utils/logWrapping.js.
         * Example:
         * ```
         * if( args.callback) {
         *  args.callback = require(`${process.cwd()}/server/utils/logWrapping.js` )
         *      .wrapAndLogExitAsync(  args.callback,  `message`);
         * }
         * ```
         */
        function prepareCallbackWrapper( message, propName ) {
            const messageSample = {
                    "range": [
                        244,
                        253
                    ],
                    "type": "Literal"
                },
                ifExpression = {
                    "type": "IfStatement",
                    "test": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": "args",
                            "range": [
                                221,
                                225
                            ]
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "callback",
                            "range": [
                                226,
                                234
                            ]
                        },
                        "range": [
                            221,
                            234
                        ]
                    },
                    "consequent": {
                        "type": "BlockStatement",
                        "body": [
                            {
                                "type": "ExpressionStatement",
                                "expression": {
                                    "type": "AssignmentExpression",
                                    "operator": "=",
                                    "left": {
                                        "type": "MemberExpression",
                                        "computed": false,
                                        "object": {
                                            "type": "Identifier",
                                            "name": "args",
                                            "range": [
                                                254,
                                                258
                                            ]
                                        },
                                        "property": {
                                            "type": "Identifier",
                                            "name": "callback",
                                            "range": [
                                                259,
                                                267
                                            ]
                                        },
                                        "range": [
                                            254,
                                            267
                                        ]
                                    },
                                    "right": {
                                        "type": "CallExpression",
                                        "callee": {
                                            "type": "MemberExpression",
                                            "computed": false,
                                            "object": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "type": "Identifier",
                                                        "name": "require",
                                                        "range": [
                                                            270,
                                                            277
                                                        ]
                                                    },
                                                    "arguments": [
                                                        {
                                                            "type": "TemplateLiteral",
                                                            "quasis": [
                                                                {
                                                                    "type": "TemplateElement",
                                                                    "value": {
                                                                        "raw": "",
                                                                        "cooked": ""
                                                                    },
                                                                    "tail": false,
                                                                    "range": [
                                                                        278,
                                                                        281
                                                                    ]
                                                                },
                                                                {
                                                                    "type": "TemplateElement",
                                                                    "value": {
                                                                        "raw": "/server/utils/logWrapping.js",
                                                                        "cooked": "/server/utils/logWrapping.js"
                                                                    },
                                                                    "tail": true,
                                                                    "range": [
                                                                        296,
                                                                        326
                                                                    ]
                                                                }
                                                            ],
                                                            "expressions": [
                                                                {
                                                                    "type": "CallExpression",
                                                                    "callee": {
                                                                        "type": "MemberExpression",
                                                                        "computed": false,
                                                                        "object": {
                                                                            "type": "Identifier",
                                                                            "name": "process",
                                                                            "range": [
                                                                                282,
                                                                                289
                                                                            ]
                                                                        },
                                                                        "property": {
                                                                            "type": "Identifier",
                                                                            "name": "cwd",
                                                                            "range": [
                                                                                290,
                                                                                293
                                                                            ]
                                                                        },
                                                                        "range": [
                                                                            282,
                                                                            293
                                                                        ]
                                                                    },
                                                                    "arguments": [],
                                                                    "range": [
                                                                        282,
                                                                        295
                                                                    ]
                                                                }
                                                            ],
                                                            "range": [
                                                                278,
                                                                326
                                                            ]
                                                        }
                                                    ],
                                                    "range": [
                                                        270,
                                                        327
                                                    ]
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "Y",
                                                        "range": [
                                                            329,
                                                            330
                                                        ]
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "NAME",
                                                        "range": [
                                                            332,
                                                            336
                                                        ]
                                                    }
                                                ],
                                                "range": [
                                                    270,
                                                    338
                                                ]
                                            },
                                            "property": {
                                                "type": "Identifier",
                                                "name": "wrapAndLogExitAsync",
                                                "range": [
                                                    360,
                                                    379
                                                ]
                                            },
                                            "range": [
                                                270,
                                                379
                                            ]
                                        },
                                        "arguments": [
                                            {
                                                "type": "MemberExpression",
                                                "computed": false,
                                                "object": {
                                                    "type": "Identifier",
                                                    "name": "args",
                                                    "range": [
                                                        380,
                                                        384
                                                    ]
                                                },
                                                "property": {
                                                    "type": "Identifier",
                                                    "name": "callback",
                                                    "range": [
                                                        385,
                                                        393
                                                    ]
                                                },
                                                "range": [
                                                    380,
                                                    393
                                                ]
                                            }
                                        ],
                                        "range": [
                                            270,
                                            410
                                        ]
                                    },
                                    "range": [
                                        254,
                                        410
                                    ]
                                },
                                "range": [
                                    254,
                                    411
                                ]
                            }
                        ],
                        "range": [
                            236,
                            425
                        ]
                    },
                    "alternate": null,
                    "range": [
                        217,
                        425
                    ]
                };
            messageSample.value = message;
            messageSample.raw = message;
            ifExpression.consequent.body[ 0 ].expression.right.arguments.push( messageSample );

            let ifExpClone = JSON.parse( JSON.stringify( ifExpression ) );
            if ( propName ) {
                ifExpClone.test.object.name = propName;
                ifExpClone.consequent.body[ 0 ].expression.left.object.name = propName;
                ifExpClone.consequent.body[ 0 ].expression.right.arguments[0].object.name = propName;
            } else {
                ifExpClone = {
                    "type": "IfStatement",
                    "test": {
                        "type": "Identifier",
                        "name": "callback",
                        "range": [
                            24368,
                            24376
                        ]
                    },
                    "consequent": {
                        "type": "BlockStatement",
                        "body": [
                            {
                                "type": "ExpressionStatement",
                                "expression": {
                                    "type": "AssignmentExpression",
                                    "operator": "=",
                                    "left": {
                                        "type": "Identifier",
                                        "name": "callback",
                                        "range": [
                                            24392,
                                            24400
                                        ]
                                    },
                                    "right": {
                                        "type": "CallExpression",
                                        "callee": {
                                            "type": "MemberExpression",
                                            "computed": false,
                                            "object": {
                                                "type": "CallExpression",
                                                "callee": {
                                                    "type": "CallExpression",
                                                    "callee": {
                                                        "type": "Identifier",
                                                        "name": "require",
                                                        "range": [
                                                            24403,
                                                            24410
                                                        ]
                                                    },
                                                    "arguments": [
                                                        {
                                                            "type": "TemplateLiteral",
                                                            "quasis": [
                                                                {
                                                                    "type": "TemplateElement",
                                                                    "value": {
                                                                        "raw": "",
                                                                        "cooked": ""
                                                                    },
                                                                    "tail": false,
                                                                    "range": [
                                                                        24411,
                                                                        24414
                                                                    ]
                                                                },
                                                                {
                                                                    "type": "TemplateElement",
                                                                    "value": {
                                                                        "raw": "/server/utils/logWrapping.js",
                                                                        "cooked": "/server/utils/logWrapping.js"
                                                                    },
                                                                    "tail": true,
                                                                    "range": [
                                                                        24429,
                                                                        24459
                                                                    ]
                                                                }
                                                            ],
                                                            "expressions": [
                                                                {
                                                                    "type": "CallExpression",
                                                                    "callee": {
                                                                        "type": "MemberExpression",
                                                                        "computed": false,
                                                                        "object": {
                                                                            "type": "Identifier",
                                                                            "name": "process",
                                                                            "range": [
                                                                                24415,
                                                                                24422
                                                                            ]
                                                                        },
                                                                        "property": {
                                                                            "type": "Identifier",
                                                                            "name": "cwd",
                                                                            "range": [
                                                                                24423,
                                                                                24426
                                                                            ]
                                                                        },
                                                                        "range": [
                                                                            24415,
                                                                            24426
                                                                        ]
                                                                    },
                                                                    "arguments": [],
                                                                    "range": [
                                                                        24415,
                                                                        24428
                                                                    ]
                                                                }
                                                            ],
                                                            "range": [
                                                                24411,
                                                                24459
                                                            ]
                                                        }
                                                    ],
                                                    "range": [
                                                        24403,
                                                        24460
                                                    ]
                                                },
                                                "arguments": [
                                                    {
                                                        "type": "Identifier",
                                                        "name": "Y",
                                                        "range": [
                                                            24461,
                                                            24462
                                                        ]
                                                    },
                                                    {
                                                        "type": "Identifier",
                                                        "name": "NAME",
                                                        "range": [
                                                            24464,
                                                            24468
                                                        ]
                                                    }
                                                ],
                                                "range": [
                                                    24403,
                                                    24469
                                                ]
                                            },
                                            "property": {
                                                "type": "Identifier",
                                                "name": "wrapAndLogExitAsync",
                                                "range": [
                                                    24470,
                                                    24489
                                                ]
                                            },
                                            "range": [
                                                24403,
                                                24489
                                            ]
                                        },
                                        "arguments": [
                                            {
                                                "type": "Identifier",
                                                "name": "callback",
                                                "range": [
                                                    24490,
                                                    24498
                                                ]
                                            },
                                            {
                                                "type": "Literal",
                                                "value": "Exiting Y.doccirrus.api.budget.calculate",
                                                "raw": "'Exiting Y.doccirrus.api.budget.calculate'",
                                                "range": [
                                                    24500,
                                                    24542
                                                ]
                                            }
                                        ],
                                        "range": [
                                            24403,
                                            24543
                                        ]
                                    },
                                    "range": [
                                        24392,
                                        24543
                                    ]
                                },
                                "range": [
                                    24392,
                                    24544
                                ]
                            }
                        ],
                        "range": [
                            24378,
                            24554
                        ]
                    },
                    "alternate": null,
                    "range": [
                        24364,
                        24554
                    ]
                };
            }
            return ifExpClone;
        }

        /**
         * Checks if log message and wrapper for callback should be added.
         * @param {Array} functionArgs - arguments of the function
         * @returns {boolean}
         */
        function isLogShouldBeAdded( functionArgs ) {
            let shouldBeAdded = true;
            if ( functionArgs.length >= 3 ) {
                let expressionArg = functionArgs[ 0 ];
                let ifStatementArg = functionArgs[ 1 ];

                if ( expressionArg.type === 'ExpressionStatement'
                     && expressionArg.expression
                     && expressionArg.expression.agruments
                     && expressionArg.expression.agruments.length === 3
                     && expressionArg.expression.callee && expressionArg.expression.callee.object
                     && expressionArg.expression.callee.object.name === 'Y' ) {
                    shouldBeAdded = false;
                } else if ( ifStatementArg.type === 'IfStatement' && ifStatementArg.test
                            && ( ( ifStatementArg.test.object && ['args', 'params', 'parameters', 'ac' ].includes(ifStatementArg.test.object.name)
                                   || ( ifStatementArg.test.name && ifStatementArg.test.name === 'callback' ) ) ) ) {
                    shouldBeAdded = false;
                }
            }
            return shouldBeAdded;
        }

        function processFiles( apiFiles ) {
            let failedFiles = [],
                astErrorFiles = [],
                missedNameFiles = [],
                processedFiles = [];
            async.eachSeries( apiFiles, function( file, done ) {
                if( !file ) {
                    return done();
                }
                try {
                    let data = fs.readFileSync( file, 'utf8' ),
                        AST,
                        wasModified = false;

                    // esprima is not able to work with `{ ...args`
                    // for example in models/activity-api.server.js we have `{ ...emailMessage, user }`,
                    // this is simple workaround to parse these files (34 during work)
                    // at the end of this task, script removes es6_ and add ... again
                    // you will be able to see detailed log with modified files in case of any issues
                    // so you will be able to check
                    data = data.replace( /\.\.\./g, 'es6_' ); // TODO: need to create a good regex

                    try {
                        AST = esprima.parse( data, {attachComment: false, comment: true, tokens: true, range: true} );
                        escodegen.attachComments( AST, AST.comments, AST.tokens );
                    } catch ( err ) {
                        astErrorFiles.push( file );
                        console.warn( `Error parsing file content to AST: ${err.message} From file ${file}` ); //  jshint ignore:line
                        return done();
                    }
                    estraverse.replace( AST, { enter: function( node ) {
                        // looking for the YUI.add expression
                        if ( node && node.type && node.type === 'ExpressionStatement'
                             && node.expression && node.expression.type
                             && node.expression.type === 'CallExpression'
                             && node.expression.callee && node.expression.callee.object
                             && node.expression.callee.object.name === 'YUI' ) {

                            // getting function parameter from YUI.add body
                            // this function contains api methods to parse
                            let functionArgument = node.expression.arguments.filter( arg => arg.type === 'FunctionExpression' );
                            if ( functionArgument.length === 1 ) {
                                // some files do not contain NAME parameter, looking for them
                                const isName = functionArgument[ 0 ].params.some( p => p.name === 'NAME' && p.type === 'Identifier');
                                if ( !isName ) {
                                    missedNameFiles.push( file );
                                }

                                let { body } = functionArgument[ 0 ].body;
                                // getting Y.namespace parameter
                                let namespaceArg = body.filter( arg => arg.type === 'ExpressionStatement'
                                                                       && arg.expression && arg.expression.left);
                                // collecting other functions
                                // need this because not all parameters in Y.namespace are functions
                                let functionsArg = body.filter( arg => arg.type === 'FunctionDeclaration' );
                                if ( namespaceArg.length === 1 ) {
                                    let { expression } = namespaceArg[ 0 ];

                                    // preparing log message
                                    // for example Y.doccirrus.api
                                    let name = expression.left.object.callee.object.name;
                                    let arg = expression.left.object.arguments[ 0 ].value;
                                    let prop = expression.left.property.name;
                                    let key = `${name}.${arg}.${prop}`;

                                    // array contains all properties from Y.namespace
                                    let apiExpressions = expression.right.properties;
                                    apiExpressions.forEach( ( apiExpression ) => {
                                        // please, note. Only functions that has args argument will be modified.
                                        // other will be skipped


                                        // first, modify functions
                                        // example: get: function(args) {}
                                        if ( apiExpression.value.params
                                             && apiExpression.value.params.length === 1
                                             && apiExpression.value.params.some( p => ['args', 'parameters', 'params', 'ac'].includes( p.name )
                                                || (p.type === 'ObjectPattern' && p.properties.some( prop => prop.key.name === 'callback')) ) ) {

                                            let propertyName = apiExpression.value.params[0].name,
                                                logToAdd = prepareLog( `Entering ${key}.${apiExpression.key.name}`),
                                                cbWrapperToAdd = prepareCallbackWrapper( `Exiting ${key}.${apiExpression.key.name}`, propertyName );
                                            if ( apiExpression.value.type !== 'Identifier' && isLogShouldBeAdded( apiExpression.value.body.body ) ) {

                                                apiExpression.value.body.body.unshift( cbWrapperToAdd );
                                                apiExpression.value.body.body.unshift( logToAdd );
                                                wasModified = true;
                                            }
                                        } else if ( apiExpression.value.type === 'Identifier'
                                                    && functionsArg.some( fArg => fArg.id.name === apiExpression.key.name
                                                    && fArg.params.length === 1
                                                    && fArg.params.some( p => ['args', 'parameters', 'params', 'ac'].includes( p.name )
                                                                              || (p.type === 'ObjectPattern' && p.properties.some( prop => prop.key.name === 'callback')) ) ) ) {
                                            // if param is not a function. Example may be found in rulelog-api.server
                                            // ...
                                            // addEntries: addEntries,
                                            // ...


                                            // looking in other functions in the file,
                                            // if identifier is present - add changes
                                            functionsArg.forEach( ( fArg ) => {
                                                if ( fArg.id.name === apiExpression.key.name && isLogShouldBeAdded( fArg.body.body ) ) {
                                                    let propName = fArg.params[0].name || undefined;
                                                    let logToAdd = prepareLog( `Entering ${key}.${apiExpression.key.name}`);
                                                    let cbWrapperToAdd = prepareCallbackWrapper( `Exiting ${key}.${apiExpression.key.name}`, propName );
                                                    fArg.body.body.unshift( cbWrapperToAdd );
                                                    fArg.body.body.unshift( logToAdd );
                                                    wasModified = true;
                                                }
                                            } );
                                        }
                                    });
                                }
                            }
                        }
                    }});
                    if ( wasModified ) {
                        // job is done, escodegen will generate AST with modifications
                        // important: escodegen will modify the structure of the code
                        // for example: spaces will be removed, " will be modified to '
                        // also, it may apply addition unexpected changes to the file
                        let modified = escodegen.generate( AST, { comment: true } );
                        modified = modified.replace( /es6_/g, '...' );
                        fs.writeFileSync( file, modified );
                        processedFiles.push( file );
                    }
                    return done();
                } catch ( err ) {
                    failedFiles.push( file );
                    console.warn( `Unexpected error: ${err.message}. From ${file}` ); //  jshint ignore:line
                    return done();
                }
            }, function( err ) {
                if( err ) {
                    throw err;
                }
                let unprocessedFiles = apiFiles.filter( i => ( processedFiles.indexOf( i ) === -1
                                                               && failedFiles.indexOf( i ) === -1
                                                               && astErrorFiles.indexOf( i ) === -1 ) );
                if ( failedFiles.length > 0 ) {
                    console.warn( `The following files (${failedFiles.length}) was not modified due to different unexpected errors` );
                    console.warn( failedFiles );
                }
                if ( astErrorFiles.length > 0 ) {
                    console.warn( `The following files (${astErrorFiles.length}) was not modified due to AST issues` );
                    console.warn( astErrorFiles );
                }
                if ( unprocessedFiles.length > 0 ) {
                    console.warn( `The following files (${unprocessedFiles.length}) was not modified` );
                    console.warn( unprocessedFiles );
                }
                if ( missedNameFiles.length > 0 ) {
                    console.warn( `The following files (${missedNameFiles.length}) have missed NAME argument. Please, fix` );
                    console.warn(missedNameFiles);
                }
                console.log( `Task is finished. Modified ${apiFiles.length - ( failedFiles.length + astErrorFiles.length + unprocessedFiles.length )} files` ); //  jshint ignore:line
                cb();
            } );
        }

        //use this to parse all *-api.server files
        readDirRecursive( process.cwd(), function( err, apiFiles ) {
            if( err ) {
                throw err;
            }
            console.warn( `Total amount of api files is ${apiFiles.length}` );
            processFiles( apiFiles );
        } );

        // TODO: these lines can be used for testing
        // let demoFile = [ '/home/dcdev/doccirrus/dc-insuite/mojits/TestingMojit/autoload/test-api.js'];
        // processFiles( demoFile );
    });

    /**
     * Task to build bootstrap (You might need to npm install building).
     * @see assets/lib/bootstrap/3.1.1/build
     */
    grunt.registerTask( 'bootstrap:build', function() {
        var
            cb = this.async(),
            child = grunt.util.spawn( {
                grunt: true,
                args: ['dist'],
                opts: {
                    cwd: 'assets/lib/bootstrap/3.1.1/build'
                }
            }, function( /*error, result, code*/ ) {
                cb();
            } );

        child.stdout.pipe( process.stdout );
        child.stderr.pipe( process.stderr );
    } );

    /**
     * Task to build bootstrap and move compiled files into the appropriate asset location.
     */
    grunt.registerTask( 'bootstrap', ['bootstrap:build', 'copy:bootstrap'] );

    function fileListHelper( list ) {
        var result = list.reduce( ( v, fileRef ) => {
            var file;
            if( 0 === fileRef.indexOf( 'mojits/' ) ) {
                file = fileRef.replace( /^mojits\//, '/static/' );
            } else {
                file = '/static/dcbaseapp/' + fileRef;
            }
            v += (v ? ',' : '') + '"' + file + '"';
            return v;
        }, '' );
        return result;
    }

    function buildApplicationJSON( app ) {
        var
            devflag = (0 === app.indexOf( 'dev-' )),
            applicationTemplate;

        applicationTemplate = grunt.file.readJSON( 'application.json' );

        if( !devflag ) {
            applicationTemplate[0].staticHandling = applicationTemplate[0].staticHandling || {};
            applicationTemplate[0].staticHandling.cache = true;
        } else {
            if( applicationTemplate[0].staticHandling && applicationTemplate[0].staticHandling.cache ) {
                delete applicationTemplate[0].staticHandling.cache;
            }
        }
        let cssList = grunt.config.get( 'cssmin' ).css.files;
        let jsList = grunt.config.get( 'concat' ).dist.files;
        Object.keys( cssList ).forEach(
            bundleName => {
                bundleName = bundleName.trim();
                let
                    descriptor = minMap.css[bundleName],
                    processed = fileListHelper( cssList[bundleName] );
                if( descriptor ) {
                    if( devflag ) {
                        applicationTemplate[0].specs[descriptor.frame].config.assets.top.css = [...processed.split( ',' ).map( item => item.slice( 1, -1 ) )];
                    } else {
                        applicationTemplate[0].specs[descriptor.frame].config.assets.top.css = ['/static/dcbaseapp/' + bundleName];
                    }

                }
            }
        );
        Object.keys( jsList ).forEach(
            bundleNameForList => {
                bundleNameForList = bundleNameForList.trim();
                let
                    descriptor = minMap.js[bundleNameForList],
                    processed = fileListHelper( jsList[bundleNameForList] );
                if( descriptor ) {
                    if( devflag ) {
                        applicationTemplate[0].specs[descriptor.frame].config.assets[descriptor.place].js = [...processed.split( ',' ).map( item => item.slice( 1, -1 ) )];
                    } else {
                        applicationTemplate[0].specs[descriptor.frame].config.assets[descriptor.place].js = ['/static/dcbaseapp/' + bundleNameForList.replace( '.js', '.min.js' ).trim()];
                    }

                }
            }
        );

        grunt.file.write( 'application.json', Buffer.from( JSON.stringify( applicationTemplate, null, 4 ) ), {encoding: 'UTF-8'} );
    }

    function buildCronJobsJSON( app ) {
        var
            cronjobsTemplate;
        app = getAppName( app ).toLowerCase();
        cronjobsTemplate = grunt.file.readJSON( 'cronjobs-dev.json' );
        grunt.file.write( 'cronjobs.json', Buffer.from( JSON.stringify( cronjobsTemplate[app], null, 4 ) ), {encoding: 'UTF-8'} );
    }

    function buildMojitsJSON( app ) {
        var
            mojitsTemplate;
        app = getAppName( app ).toLowerCase();
        mojitsTemplate = grunt.file.readJSON( 'mojits-dev.json' );
        grunt.file.write( 'mojits.json', Buffer.from( JSON.stringify( mojitsTemplate[app], null, 4 ) ), {encoding: 'UTF-8'} );
    }

    // function buildFriendsJobsJSON( app ) {
    //     var
    //         friendsTemplate,
    //         friendsJson = {};
    //     app = getAppName( app );
    //     app = app.toUpperCase();
    //     friendsTemplate = grunt.file.readJSON( 'friends-dev.json' ).all;
    //     friendsJson[ app ] = friendsTemplate[ app ];
    //     friendsJson[ app ].secretKey = "${" + app + "_secretKey}";
    //     friendsTemplate[ app.toUpperCase() ].connections.forEach( serverType => {
    //         friendsJson[ serverType ] = friendsTemplate[ serverType ];
    //         friendsJson[ serverType ].secretKey = "${" + serverType + "_secretKey}";
    //     } );
    //     grunt.file.write( 'friends.json', JSON.stringify( friendsJson, null, 4 ), 'UTF-8' );
    // }

    function getDevFlag( app ) {
        return (0 === app.indexOf( 'dist-' ) || (0 === app.indexOf( 'dev-' )));
    }

    function getAppName( app ) {
        if( 0 === app.indexOf( 'dist-' ) ) {
            return app.substr( 5 );
        }
        if( 0 === app.indexOf( 'dev-' ) ) {
            return app.substr( 4 );
        }
        return app;
    }

    function removeDevJson() {
        let
            files = [ 'db-dev.json', 'cronjobs-dev.json', 'email-dev.json', 'env-dev.json', 'friends-dev.json', 'ice-dev.json', 'jawbone-dev.json', 'sms-dev.json', 'mojits-dev.json', 'inpacs-dev.json', 'cups-dev.json', 'redis-dev.json', 'nodered-dev.json', 'kvconnect-dev.json' ];

        files.forEach( fileName => {
            grunt.file.delete( fileName );
        } );
    }

    // === 2 ===
    // Create the tasks for app specific
    // settings in application.json and routes.json
    function makeTask( app ) {
        var myApp = app,
            devflag = getDevFlag( app );
        return function() {
            buildApplicationJSON( myApp );

            if( !devflag ) {
                buildCronJobsJSON( myApp );
                //buildFriendsJobsJSON( myApp );
                buildMojitsJSON( myApp );
                removeDevJson();
            }

        };
    }

    // === OPS-399 ===
    // Hack for CentOS 6 and TTF Pango bug.  Remove when appliance uses CentOS 7.
    function rewriteCanvasVersion() {
        var
            pkgJson = grunt.file.readJSON( 'package.json' );
        if( pkgJson.dependencies && pkgJson.dependencies.canvas ) {
            pkgJson.dependencies.canvas = 'git+ssh://git@gitlab.intra.doc-cirrus.com/dev/node-canvas.git#' + pkgJson.dependencies.canvas + 'd';
        }
        console.log( 'Gruntfile.js, creating package.json', pkgJson ); //  jshint ignore:line
        grunt.file.write( 'package.json', Buffer.from( JSON.stringify( pkgJson, null, 2 ) ), {encoding: 'UTF-8'} );
    }

    // load the extra grunt tasks needed for distribution
    grunt.loadNpmTasks('grunt-contrib-obfuscator');
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-less' );

    // register the tasks to prepare distribution
    grunt.registerTask( 'dist', ['less', 'copy:main', 'cssmin', 'concat', 'uglify', 'obfuscator'] );

    grunt.registerTask( 'mk-pkg', rewriteCanvasVersion );

    // register the server individual tasks
    for( i = 0; i < tasks.length; i++ ) {
        grunt.registerTask( tasks[i], makeTask( tasks[i] ) );
        grunt.registerTask( 'dev-' + tasks[i], makeTask( 'dev-' + tasks[i] ) );
        grunt.registerTask( 'dist-' + tasks[i], makeTask( 'dist-' + tasks[i] ) );
    }

};
