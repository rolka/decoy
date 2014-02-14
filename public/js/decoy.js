// --------------------------------------------------
// Decoy app init and events
// --------------------------------------------------
define(function (require) {
	
	// Dependencies
	var $ = require('jquery'),
		_ = require('underscore'),
		Backbone = require('backbone'),
		manifest = require('decoy/modules/manifest');
	
	// Plugins
	require('decoy/plugins/jquery-migrate'); // To ease migration to jQuery 1.9.x
	require('decoy/plugins/bootstrap');
	
	// Utilities
	require('decoy/modules/utils/csrf'); // Add CSRF token to AJAX requests
	require('decoy/modules/utils/console'); // Make console.log not error
	require('decoy/modules/utils/ajax-error'); // Standard handling of AJAX errors
	
	// Modules that add mojo globally
	require('decoy/modules/datepicker'); // Init datepickers created with HTML::date()
	require('decoy/modules/timepicker'); // Init datepickers created with HTML::time()
	require('decoy/modules/datetimepicker'); // Init datepickers created with HTML::datetime()
	var wysiwyg = require('decoy/modules/wysiwyg'); // CKeditor

	// Private static vars
	var app = _.extend({}, Backbone.Events),
		$body = $('body'),
		$doc = $(document);
	
	// --------------------------------------------------
	// Pre-ready init
	
	// Disable # links because they're not links silly
	$doc.on('click', '[href="#"]', false);
	
	// --------------------------------------------------
	// Configure Backbone
	
	// Massage attribtues of the sync process
	var oldSync = Backbone.sync;
	Backbone.sync = function(method, model, options){

		// If there is a 'whitelist' attribute on the model and it's
		// an array, delete all attributes except for the ones from the
		// whitelist
		if (model.whitelist && _.isArray(model.whitelist)) {
			
			// Add id by default, needed in Backbone 1.1.1
			if (!_.contains(model.whitelist, 'id')) model.whitelist.push('id');

			// Don't operate on the real model.  But, for whatever reason, the
			// collection didn't get brought along on the clone, so do that manually
			var oldModel = model;
			model = oldModel.clone();
			model.collection = oldModel.collection;
			
			// Remove attribtues
			_.each(model.attributes, function(value, key, list) {
				if (!_.contains(oldModel.whitelist, key)) delete model.attributes[key];
			});
		}

		// Finish up with the traditional sync
		return oldSync(method, model, options);
	};
	
	// Find all valid data-js-views and create them.  A data-js-view tag may specify
	// multiple backbone views by seperating them with a space
	app.initalizeViews = function(manifest) {
		_.each($body.find('[data-js-view]'), function (elem) {
			var views = $(elem).attr('data-js-view').split(' ');
			_.each(views, function(identifier) {
				var view = manifest[identifier];
				if (view) new view({ el: elem, app: app });
			});
		});
	};
	
	// --------------------------------------------------
	// DOM ready
	app.on('ready', function () {

		// Initalize views
		app.initalizeViews(manifest);
		
		// Add "Required" icons to file input fields where we're manually applying
		// a required class with Former, which puts it on the input rather than the control group.  We
		// want these fields to look required but not actually be enforced by the browser.
		var required_html = ' <i class="icon-exclamation-sign js-tooltip required" title="Required field"></i>';
		$('input.required').closest('.control-group').find('label').first().append(required_html);
		
		// And "Help" icons
		// Disabled cause I'm not sure we really want this
		// $('.help-block').prepend('<i class="icon-question-sign"></i> ');
		
		// Enable bootstrap tooltips
		$body.find('.js-tooltip').tooltip({ animation: false });
		
		// Turn WYSIWYGs on.
		wysiwyg.replace('textarea.wysiwyg');	
		
		// Enable affix globally
		$('.affixable').each(function() {
			var $el = $(this);
			$el.affix({ offset: $el.offset().top - 65 }); // 65 is the top value in general.scss
		});
		
	});
	
	// Return public module
	return app;
});
