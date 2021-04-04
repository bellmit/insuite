/*
 @author: dd
 @date: 2013/02/01
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkericonarraymodel', function( Y ) {

        function MarkerIconArrayModel() {

            var
                self = this,
                markerIconList = [];

        self._modelName = 'MarkerIconArrayModel';
            Y.doccirrus.uam.ViewModel.call( self );

            /* ---  KO data observation --- */
            self._data = ko.observableArray();
            self.markerIconList =  ko.observableArray();

            getIconList().forEach( function( icon ) {
                markerIconList.push( new Y.doccirrus.uam.MarkerIconModel( {
                    css: "fa fa-" + icon,
                    _id: "fa fa-" + icon,
                    text: icon
                } ) );
            } );

            self.markerIconList( markerIconList );

            /**
             * get an item by id
             * @param id {String}
             * @returns {null, Y.doccirrus.uam.MarkerIconModel}
             */
            self.getById = function( id ) {
                var result = null;
                self._data().forEach( function( item ) {
                    if( item._id === id ) {
                        result = item;
                        return false;
                    }
                } );
                return result;
            };

            /**
             * get the first item
             * @returns {null, Y.doccirrus.uam.MarkerIconModel}
             */
            self.first = function(){
                var first = null;
                if (self._data().length) {
                    first = self._data()[0];
                }
                return first;
            };

        }

        function getIconList(){
            return [
                "glass", "music", "search", "envelope-o", "heart", "star", "star-o", "user", "film", "th-large",
                "th", "th-list", "check", "remove", "search-plus", "search-minus", "power-off", "signal", "gear",
                "trash-o", "home", "file-o", "clock-o", "road", "download", "arrow-circle-o-down", "arrow-circle-o-up",
                "inbox", "play-circle-o", "rotate-right", "refresh", "list-alt", "lock", "flag", "headphones", "volume-off",
                "volume-down", "volume-up", "qrcode", "barcode", "tag", "tags", "book", "bookmark", "print", "camera", "font",
                "bold", "italic", "text-height", "text-width", "align-left", "align-center", "align-right", "align-justify",
                "list", "dedent", "indent", "video-camera", "photo", "pencil", "map-marker", "adjust", "tint", "edit",
                "share-square-o", "check-square-o", "arrows", "step-backward", "fast-backward", "backward", "play", "pause",
                "stop", "forward", "fast-forward", "step-forward", "eject", "chevron-left", "chevron-right", "plus-circle",
                "minus-circle", "times-circle", "check-circle", "question-circle", "info-circle", "crosshairs", "times-circle-o",
                "check-circle-o", "ban", "arrow-left", "arrow-right", "arrow-up", "arrow-down", "mail-forward", "expand",
                "compress", "plus", "minus", "asterisk", "exclamation-circle", "gift", "leaf", "fire", "eye", "eye-slash",
                "warning", "plane", "calendar", "random", "comment", "magnet", "chevron-up", "chevron-down", "retweet",
                "shopping-cart", "folder", "folder-open", "arrows-v", "arrows-h", "bar-chart-o", "twitter-square",
                "facebook-square", "camera-retro", "key", "gears", "comments", "thumbs-o-up", "thumbs-o-down", "star-half",
                "heart-o", "sign-out", "linkedin-square", "thumb-tack", "external-link", "sign-in", "trophy", "github-square",
                "upload", "lemon-o", "phone", "square-o", "bookmark-o", "phone-square", "twitter", "facebook-f", "github",
                "unlock", "credit-card", "feed", "hdd-o", "bullhorn", "bell", "certificate", "hand-o-right", "hand-o-left",
                "hand-o-up", "hand-o-down", "arrow-circle-left", "arrow-circle-right", "arrow-circle-up", "arrow-circle-down",
                "globe", "wrench", "tasks", "filter", "briefcase", "arrows-alt", "group", "chain", "cloud", "flask", "cut",
                "copy", "paperclip", "save", "square", "navicon", "list-ul", "list-ol", "strikethrough", "underline", "table",
                "magic", "truck", "pinterest", "pinterest-square", "google-plus-square", "google-plus", "money", "caret-down",
                "caret-up", "caret-left", "caret-right", "columns", "unsorted", "sort-down", "sort-up", "envelope", "linkedin",
                "rotate-left", "legal", "dashboard", "comment-o", "comments-o", "flash", "sitemap", "umbrella", "paste",
                "lightbulb-o", "exchange", "cloud-download", "cloud-upload", "user-md", "stethoscope", "suitcase", "bell-o",
                "coffee", "cutlery", "file-text-o", "building-o", "hospital-o", "ambulance", "medkit", "fighter-jet",
                "beer", "h-square", "plus-square", "angle-double-left", "angle-double-right", "angle-double-up",
                "angle-double-down", "angle-left", "angle-right", "angle-up", "angle-down", "desktop", "laptop", "tablet",
                "mobile-phone", "circle-o", "quote-left", "quote-right", "spinner", "circle", "mail-reply", "github-alt",
                "folder-o", "folder-open-o", "smile-o", "frown-o", "meh-o", "gamepad", "keyboard-o", "flag-o", "flag-checkered",
                "terminal", "code", "mail-reply-all", "star-half-empty", "location-arrow", "crop", "code-fork", "unlink",
                "question", "info", "exclamation", "superscript", "subscript", "eraser", "puzzle-piece", "microphone",
                "microphone-slash", "shield", "calendar-o", "fire-extinguisher", "rocket", "maxcdn", "chevron-circle-left",
                "chevron-circle-right", "chevron-circle-up", "chevron-circle-down", "html5", "css3", "anchor", "unlock-alt",
                "bullseye", "ellipsis-h", "ellipsis-v", "rss-square", "play-circle", "ticket", "minus-square", "minus-square-o",
                "level-up", "level-down", "check-square", "pencil-square", "external-link-square", "share-square", "compass",
                "toggle-down", "toggle-up", "toggle-right", "euro", "gbp", "dollar", "rupee", "cny", "ruble", "won", "bitcoin",
                "file", "file-text", "sort-alpha-asc", "sort-alpha-desc", "sort-amount-asc", "sort-amount-desc", "sort-numeric-asc",
                "sort-numeric-desc", "thumbs-up", "thumbs-down", "youtube-square", "youtube", "xing", "xing-square",
                "youtube-play", "dropbox", "stack-overflow", "instagram", "flickr", "adn", "bitbucket", "bitbucket-square",
                "tumblr", "tumblr-square", "long-arrow-down", "long-arrow-up", "long-arrow-left", "long-arrow-right",
                "apple", "windows", "android", "linux", "dribbble", "skype", "foursquare", "trello", "female", "male",
                "gittip", "sun-o", "moon-o", "archive", "bug", "vk", "weibo", "renren", "pagelines", "stack-exchange",
                "arrow-circle-o-right", "arrow-circle-o-left", "toggle-left", "dot-circle-o", "wheelchair", "vimeo-square",
                "turkish-lira", "plus-square-o", "space-shuttle", "slack", "envelope-square", "wordpress", "openid",
                "institution", "mortar-board", "yahoo", "google", "reddit", "reddit-square", "stumbleupon-circle", "stumbleupon",
                "delicious", "digg", "pied-piper-pp", "pied-piper-alt", "drupal", "joomla", "language", "fax", "building",
                "child", "paw", "spoon", "cube", "cubes", "behance", "behance-square", "steam", "steam-square", "recycle",
                "automobile", "cab", "tree", "spotify", "deviantart", "soundcloud", "database", "file-pdf-o", "file-word-o",
                "file-excel-o", "file-powerpoint-o", "file-photo-o", "file-zip-o", "file-sound-o", "file-movie-o", "file-code-o",
                "vine", "codepen", "jsfiddle", "life-bouy", "circle-o-notch", "ra", "ge", "git-square", "git", "y-combinator-square",
                "tencent-weibo", "qq", "wechat", "send", "send-o", "history", "circle-thin", "header", "paragraph", "sliders",
                "share-alt", "share-alt-square", "bomb", "soccer-ball-o", "tty", "binoculars", "plug", "slideshare", "twitch",
                "yelp", "newspaper-o", "wifi", "calculator", "paypal", "google-wallet", "cc-visa", "cc-mastercard",
                "cc-discover", "cc-amex", "cc-paypal", "cc-stripe", "bell-slash", "bell-slash-o", "trash", "copyright",
                "at", "eyedropper", "paint-brush", "birthday-cake", "area-chart", "pie-chart", "line-chart", "lastfm",
                "lastfm-square", "toggle-off", "toggle-on", "bicycle", "bus", "ioxhost", "angellist", "cc", "shekel",
                "meanpath", "buysellads", "connectdevelop", "dashcube", "forumbee", "leanpub", "sellsy", "shirtsinbulk",
                "simplybuilt", "skyatlas", "cart-plus", "cart-arrow-down", "diamond", "ship", "user-secret", "motorcycle",
                "street-view", "heartbeat", "venus", "mars", "mercury", "intersex", "transgender-alt", "venus-double",
                "mars-double", "venus-mars", "mars-stroke", "mars-stroke-v", "mars-stroke-h", "neuter", "genderless",
                "facebook-official", "pinterest-p", "whatsapp", "server", "user-plus", "user-times", "hotel", "viacoin",
                "train", "subway", "medium", "yc", "optin-monster", "opencart", "expeditedssl", "battery-4", "battery-3",
                "battery-2", "battery-1", "battery-0", "mouse-pointer", "i-cursor", "object-group", "object-ungroup",
                "sticky-note", "sticky-note-o", "cc-jcb", "cc-diners-club", "clone", "balance-scale", "hourglass-o",
                "hourglass-1", "hourglass-2", "hourglass-3", "hourglass", "hand-grab-o", "hand-stop-o", "hand-scissors-o",
                "hand-lizard-o", "hand-spock-o", "hand-pointer-o", "hand-peace-o", "trademark", "registered", "creative-commons",
                "gg", "gg-circle", "tripadvisor", "odnoklassniki", "odnoklassniki-square", "get-pocket", "wikipedia-w",
                "safari", "chrome", "firefox", "opera", "internet-explorer", "tv", "contao", "500px", "amazon", "calendar-plus-o",
                "calendar-minus-o", "calendar-times-o", "calendar-check-o", "industry", "map-pin", "map-signs", "map-o",
                "map", "commenting", "commenting-o", "houzz", "vimeo", "black-tie", "fonticons", "reddit-alien", "edge",
                "credit-card-alt", "codiepie", "modx", "fort-awesome", "usb", "product-hunt", "mixcloud", "scribd",
                "pause-circle", "pause-circle-o", "stop-circle", "stop-circle-o", "shopping-bag", "shopping-basket",
                "hashtag", "bluetooth", "bluetooth-b", "percent", "gitlab", "wpbeginner", "wpforms", "envira",
                "universal-access", "wheelchair-alt", "question-circle-o", "blind", "audio-description", "volume-control-phone",
                "braille", "assistive-listening-systems", "asl-interpreting", "deafness", "glide", "glide-g", "signing",
                "low-vision", "viadeo", "viadeo-square", "snapchat", "snapchat-ghost", "snapchat-square", "pied-piper",
                "first-order", "yoast", "themeisle", "google-plus-circle", "fa"
            ];
        }

        Y.namespace( 'doccirrus.uam' ).MarkerIconArrayModel = new MarkerIconArrayModel();
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcmarkermodel',
        'dcmarkericonmodel'
    ] }
);

