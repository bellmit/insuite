REQUIREMENTS
------------

OS X, Inkscape.app installed, pcl6 (in this directory), node v >=0.12
 
HOW TO USE
---------

on start, will recusively search through all subdirectories of the execution env root for files matching the given
suffix. it will then apply the given steps to the resulting list:

* cpl2pdf: convert cpl files to pdf via pcl6.
* pdf2svg: converts existing pdf files of the same name as existing pcl files to svg. (requires previous cpl2pdf step, most likely)
* svgArialFix: reads svg and converts PDF/PCL font "A030"(Arial) to "Arial" while also adding tags for the bold/italics variants

Check config flags depending on need, usually you want all three steps.
fileSuffix should be ".pcl" but can also be extended to full filenames
