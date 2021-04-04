/**
 * User: pi
 * Date: 03.11.17  08:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

const
    path = require( 'path' ),
    // webpack = require('webpack'),
    CleanWebpackPlugin = require('clean-webpack-plugin'),
    paths = {
        assets: path.resolve(__dirname, './assets/js/webpack_dist')
    };

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


module.exports = {
    entry: {
        // InSuiteAdminMojit
        // insuiteAdmin: "./mojits/InSuiteAdminMojit/client/insuiteadmin.js",
        // contactsNav: "./mojits/InSuiteAdminMojit/client/contactsNav.js",
        // IncaseAdminMojit
        masterTab: './mojits/IncaseAdminMojit/client/masterTab.js',
        // IntouchPrivateMojit
        inTouchNav: './mojits/IntouchPrivateMojit/client/intouch_nav.js',
        // AppTokenMojit
        appToken: './mojits/AppTokenMojit/client/appToken.js',
        appAccessManager: './mojits/AppTokenMojit/client/appAccessManager.js',
        appNav: './mojits/AppTokenMojit/client/appNav.js',
        // TaskMojit
        tasksNav: './mojits/TaskMojit/client/tasksNav.js'

    },
    output: {
        path: paths.assets,
        filename: '[name].bundle.js',
        chunkFilename: '[name].bundle.js',
        publicPath: '/static/dcbaseapp/assets/js/webpack_dist/'
    },
    devtool: 'inline-source-map', //todob paveldebug check
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    'babel-loader'
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    plugins: [
        new CleanWebpackPlugin(['./assets/js/webpack_dist'])
        // new BundleAnalyzerPlugin(),
        // new webpack.NamedChunksPlugin(function(chunk) {
        //     // if it have name, and return name
        //     if (chunk.name) {
        //         return chunk.name;
        //     }
        //
        //     for (let m of chunk._modules) {
        //         let
        //             mojitParts = m.request.split('mojits/'),
        //             parts = mojitParts[1] && mojitParts[1].split('/'),
        //             mojitName = parts[0],
        //             fileName = parts[parts.length-1];
        //         fileName = fileName && fileName.replace( '.js', '[chunk]' );
        //
        //         if (mojitName && fileName && mojitName !== fileName) {
        //             // return whatever name you defined
        //             return path.join(mojitName, fileName);
        //         }
        //     }
        //
        //     return null;
        // })
        // new webpack.optimize.CommonsChunkPlugin({ // common for InTouchNav
        //     name: "inTouchNav",
        //     minChunks: 2,
        //     async: true,
        //     children: true,
        //     deepChildren: true
        // })
    ]
};