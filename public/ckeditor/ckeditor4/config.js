/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */


var my_styles =  [
	// Block-level styles
	{ name: 'Primary', element: 'span', styles: { 'color': 'var(--primary)' } },
	{ name: 'Secondary' , element: 'span', styles: { 'color': 'var(--secondary)' } },
	{ name: 'Success' , element: 'span', styles: { 'color': 'var(--success)'}},
	{ name: 'Info' , element: 'span', styles: { 'color': 'var(--info)'}},
	{ name: 'Warning' , element: 'span', styles: { 'color': 'var(--warning)'}},
	{ name: 'Danger' , element: 'span', styles: { 'color': 'var(--danger)'}},
	{ name: 'Light' , element: 'span', styles: { 'color': 'var(--light)'}},
	{ name: 'Dark' , element: 'span', styles: { 'color': 'var(--dark)'}}
];

var theme_styles = [{ name: 'Blue' , element: 'span', styles: { 'color': 'var(--blue)'}},
	{ name: 'Indigo' , element: 'span', styles: { 'color': 'var(--indigo)'}},
	{ name: 'Purple' , element: 'span', styles: { 'color': 'var(--purple)'}},
	{ name: 'Pink' , element: 'span', styles: { 'color': 'var(--pink)'}},
	{ name: 'Red' , element: 'span', styles: { 'color': 'var(--red)'}},
	{ name: 'Orange' , element: 'span', styles: { 'color': 'var(--orange)'}},
	{ name: 'Yellow' , element: 'span', styles: { 'color': 'var(--yellow)'}},
	{ name: 'Green' , element: 'span', styles: { 'color': 'var(--green)'}},
	{ name: 'Teal' , element: 'span', styles: { 'color': 'var(--teal)'}},
	{ name: 'Cyan' , element: 'span', styles: { 'color': 'var(--cyan)'}},
	{ name: 'White' , element: 'span', styles: { 'color': 'var(--white)'}},
	{ name: 'Gray' , element: 'span', styles: { 'color': 'var(--gray)'}},
	{ name: 'Dark gray' , element: 'span', styles: { 'color': 'var(--gray-dark)'}}
];

if (window.endPoint === "indications") {
	CKEDITOR.addCss("body {color: white;}");
} else {
	for (var i = 0; i < theme_styles.length; i++) {
		my_styles.push(theme_styles[i]);
	}
}
CKEDITOR.stylesSet.add( 'my_styles', my_styles );
CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here. For example:
	// config.language = 'fr';
	config.uiColor = '#ffffff';
    config.mathJaxClass = 'math-tex';
    config.mathJaxLib = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-AMS_HTML';    
	config.toolbar = 'Basic';
	config.toolbar_Basic =
	[
		{ name: 'styles', items : [  'Styles', 'Format','FontSize' ] },
		{ name: 'colors', items : [ 'TextColor','BGColor' ] },
		{ name: 'snddocument', items : [ 'Source','-' ] },
		{ name: 'clipboard', items : [ 'Undo','Redo' ] },
		{ name: 'editing', items : [ 'Find','Replace','-','SelectAll','-','SpellChecker', 'Scayt' ] },
		{ name: 'tools', items : [ 'Maximize' ] },
		'/',
		{ name: 'basicstyles', items : [ 'Bold','Italic','Underline','Strike','Subscript','Superscript','-','RemoveFormat' ] },
		{ name: 'paragraph', items : [ 'NumberedList','BulletedList','-','Outdent','Indent',
		'-','JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock' /*,'-','BidiLtr','BidiRtl' */] },
		{ name: 'links', items : [ 'Link','Unlink'] },
		{ name: 'insert', items : [ 'Image','Html5video','Youtube','Audio','Table'/*,'HorizontalRule','Smiley','SpecialChar', 'EqnEditor' ,'Iframe' */ ] },
	];
	config.removePlugins = 'elementspath,resize,iframe,image' ;
	config.extraPlugins = 'autogrow,html5video,youtube,widget,widgetselection,clipboard,lineutils';
	config.extraAllowedContent = 'iframe[*]';

	config.autoGrow_minHeight = 200;
	// config.autoGrow_maxHeight = 600;
	// config.autoGrow_bottomSpace = 50;
	config.language = window.lang;
	config.allowedContent = true
	config.stylesSet = 'my_styles';
	config.contentsCss = window.theme;
	// config.colorButton_colors = 'primary,secondary,info,warning,danger';
	// config.colorButton_foreStyle = {
	// 	element: 'span',
	// 	attributes: { 'style': 'var(--#(color))' }
	// };
	config.filebrowserBrowseUrl = '/browser/browse.php';
    config.filebrowserUploadUrl = '/uploader/upload.php';
    config.filebrowserWindowWidth = '640';
    config.filebrowserWindowHeight = '480';
};

CKEDITOR.addCss(`body {font-size: 22px;}`);
CKEDITOR.addCss(`#cke_bottom_detail,.cke_bottom{display:none}`);
CKEDITOR.addCss(`.cke_combo_button{border: 1px solid white !important;}`);
CKEDITOR.addCss(`.cke_editable{padding: 12px;}`);
CKEDITOR.addCss(`.cke_editable video,.cke_editable iframe{max-width: 100%;}`);
CKEDITOR.addCss(`.cke_editable img{ max-width: 100%; height: auto !important;}`);
CKEDITOR.addCss(`.cke_editable * { outline: none !important; }`);
// CKEDITOR.addCss(`*{font-family: Lato, sans-serif;}`);
CKEDITOR.addCss(`input.cke_dialog_ui_input_text:active,input.cke_dialog_ui_input_text:focus,{border-color: var(--primary) !important;}`);
