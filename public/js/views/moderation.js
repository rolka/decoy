// --------------------------------------------------
// Moderation view
// --------------------------------------------------
define(function (require) {
	
	// dependencies
	var $ = require('jquery'),
		_ = require('underscore'),
		Backbone = require('backbone');
	
	// private static vars
	var app,
		dataId = 'data-model-id';
	
	// public view module
	var ModerateView = Backbone.View.extend({
		
		initialize: function () {
			_.bindAll(this);
			app = this.options.app;

			// Get the path to the controller.  If this is not specified via a
			// data attribtue of "controller-route" then we attempt to infer it from
			// the current URL.
			this.controllerRoute = this.$el.data('controller-route');
			if (!this.controllerRoute) {
				this.controllerRoute = window.location.pathname;
			}
						
			// cache selectors
			this.$items = this.$('['+dataId+']');
			this.$pending_count = this.$('.pending-count');
			this.$approved_count = this.$('.approved-count');
			this.$denied_count = this.$('.denied-count');
			this.$pagination = $('.pagination');
			
			// Create model collections from data in the DOM.  The URL is fetched from
			// the controller-route data attribute of the container.
			this.collection = new Backbone.Collection();
			this.collection.url = this.controllerRoute;
			_.each(this.$items, this.initItem);
			
			// listen for collection changes and render view
			this.collection.on('change', this.render, this);
			
		},
		
		// Initialize a moderation item
		initItem: function (item) {
			
			// Vars
			var $item = $(item);
			
			// Create the model
			var model = new Backbone.Model({
				id: $item.attr(dataId),
				status: this.status($item)
			});
			this.collection.push(model);
			
			// Add the model to the DOM element
			$item.data('model', model);
		},
		
		// Register interaction events
		events: {
			'click .actions .approve': 'approve',
			'click .actions .deny': 'deny'
		},
		
		// Set item to approved
		approve: function (e) {
			var model = this.model(e);
			model.set('status', 'approved');
			this.save(model);
		},
		
		// Set item to denied
		deny: function (e) {
			var model = this.model(e);
			model.set('status', 'denied');
			this.save(model);
		},
		
		// Get the status of an item
		status: function($item) {
			if ($item.hasClass('approved')) return 'approved';
			else if ($item.hasClass('denied')) return 'denied';
			else return 'pending';
		},
		
		// Get them model from an event
		model: function(e) {
			return $(e.target).parents('['+dataId+']').data('model');
		},
		
		// Get the jquery item given a model
		item: function(model) {
			return this.$('['+dataId+'='+model.get('id')+']');
		},
		
		// Save the model
		save: function(model) {
			model.save();
		},
		
		// Increment of decrement one of the counts
		update_count: function($el, change) {
			$el.text(parseInt($el.text(), 10) + change);
		},
		
		// render view from model changes
		render: function (model) {
			
			// We only care to run this logic if there has been an actual change, not
			// after a sync event
			if (!model.hasChanged('status')) return;
			
			// Common vars
			var status = model.get('status'),
				$item = this.item(model),
				old = model.previousAttributes();
						
			// Swap the border color and fade out the element because it's been moved to
			// another tab
			$item.fadeOut(300);
			if (status != 'pending') $item.addClass(status+'-outro');
			
			// Update the counts on the page
			if (status == 'approved') {
				this.update_count(this.$approved_count, 1);
				if (old.status != 'pending') this.update_count(this.$denied_count, -1);
			} else if (status == 'denied') {
				this.update_count(this.$denied_count, 1);
				if (old.status != 'pending') this.update_count(this.$approved_count, -1);
			}
			if (old.status == 'pending') this.update_count(this.$pending_count, -1);
			
			// After any change, replace pagination with the refresh button
			if (this.$pagination.length && this.$pagination.find('li').length > 1) {
				this.$pagination.find('li').remove();
				this.$pagination.find('ul').append('<li><a href="'+window.location.href+'">Reload for more moderation options</a></li>');
			}
		}
	});
	
	return ModerateView;
});