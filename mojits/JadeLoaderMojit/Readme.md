# JadeLoader HowTo


## What it does

The JadeLoader Mojit makes it easy for you to dynamically load jade templates from
your mojit into the browser. You define the Jade template in your mojit's /views folder
as usual, call the jade loader from your mojit's binder code, and finally execute
the jade template code (with any options or parameters you may need) in your binder code.


### 0. Mojit Basic Setup

You can always use the Jade Loader, if your mojit uses the standard DC convention.


### 1. define a jade template

In /views make a Pug Template. Its name must end with ".pug".
You can call it anything you like, in this example, we use the name

   "form.pug"


### 2. load and display template in one step

           /**
             * loadNodeFromTemplate()
             *
             * Calls the callback when the Jade Script is available in the cache.
             *
             * Fetches the jade script from the server if required.
             *
             * @param templatename  name of template file  (without suffix)
             * @param mojitname  full mojit name
             * @param options  options to feed into the template script
             * @param node  the node whose HTML will be replaced with the loaded template HTML
             *              If the node is null or undefined, will not continue and will return
             *              an error in the callback.
             * @param callback  function(err,string) on success err === null, str == 'ok'
             */
            'loadNodeFromTemplate': function( templatename, mojitname, options, node, callback )


(Note: remember you are trading-off fast loading time of your whole page, against
the overhead of accessing the network again at a later point. Generally, small,
independent pieces of HTML should all be loaded at the same time. However HTML
that has dependencies that load large libraries over 200k, and which are not immediately
needed are good candidates for this mechanism.

This mechanism does not play well with shaker, but is well suited to the one page apps
as we are using them. We do not yet have any exact measures of how good or which
parameters decide how and where HTML & code are to be loaded.)


### 3. Additional functions:

See code documetation.
