'use strict';

// ======== Define new KnockoutJS binding for menu transition animations

// note this requires styles animating, top, bottom and menu-visible

ko.bindingHandlers.menuTransition = {

	update: function(element, valueAccessor) {

		// get current state in true/false for whether menu is open
		var state = ko.unwrap(valueAccessor()),
			transitionEnd = 'transitionend webkitTransitionEnd otransitionend MSTransitionEnd';

		// animate to make the $(element) visible
		if (state === true) {
			$(element).addClass('animating');
			$(element).addClass('top');
			$(element).on(transitionEnd, function() {
				$(element)
				.removeClass('animating top')
				.addClass('menu-visible');
				$(element).off(transitionEnd); // removes event handler
			});
		}

		// animate to remove the $(element)
		else {
			$(element).addClass('animating');
			$(element).addClass('bottom');
			$(element).on(transitionEnd, function() {
				$(element)
				.removeClass('animating bottom')
				.removeClass('menu-visible');
				$(element).off(transitionEnd); // removes event handler
			});
		}
	}
};